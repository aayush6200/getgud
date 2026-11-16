// Data layer with two backends behind one async interface.
//   local:  SQLite file (default)            ->  node server.js
//   AWS:    DynamoDB single table (STORE=dynamo, TABLE=<name>)  ->  Lambda
const crypto = require("crypto");
const now = () => new Date().toISOString();
const rid = (n = 6) => crypto.randomBytes(n).toString("hex");

function sqliteStore() {
  const path = require("path"), fs = require("fs");
  const { DatabaseSync } = require("node:sqlite");
  const dir = process.env.DATA_DIR || path.join(__dirname, "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "getgud.db"));
  db.exec(`
  PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL, salt TEXT NOT NULL, created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, answers TEXT NOT NULL, weights TEXT, care_override TEXT, updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider_id INTEGER NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, type TEXT NOT NULL, fmt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', reminders TEXT NOT NULL DEFAULT 'email', created TEXT NOT NULL);
  CREATE UNIQUE INDEX IF NOT EXISTS one_per_slot ON bookings(provider_id, day, hour) WHERE status='active';
  CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY, user_id TEXT, tester TEXT, payload TEXT NOT NULL, created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY, org TEXT, contact TEXT, email TEXT, size TEXT, note TEXT, created TEXT NOT NULL);`);
  const q = s => db.prepare(s);
  return {
    async createUser(u) { if (q("SELECT 1 FROM users WHERE email=?").get(u.email)) return null; const id = rid(8); q("INSERT INTO users VALUES(?,?,?,?,?,?)").run(id, u.name, u.email, u.pass_hash, u.salt, now()); return id; },
    async userByEmail(email) { return q("SELECT * FROM users WHERE email=?").get(email) || null; },
    async updateUser(id, name, email) { if (q("SELECT 1 FROM users WHERE email=? AND id<>?").get(email, id)) return false; q("UPDATE users SET name=?, email=? WHERE id=?").run(name, email, id); return true; },
    async setPass(id, h, salt) { q("UPDATE users SET pass_hash=?, salt=? WHERE id=?").run(h, salt, id); },
    async deleteUser(id) { q("DELETE FROM users WHERE id=?").run(id); },
    async createSession(token, uid, expires) { q("INSERT INTO sessions VALUES(?,?,?)").run(token, uid, expires); },
    async sessionUser(token) { const s = q("SELECT u.*, s.expires FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?").get(token); return s && s.expires > Date.now() ? s : null; },
    async deleteSession(token) { q("DELETE FROM sessions WHERE token=?").run(token); },
    async deleteOtherSessions(uid, keep) { q("DELETE FROM sessions WHERE user_id=? AND token<>?").run(uid, keep); },
    async getProfile(uid) { const p = q("SELECT * FROM profiles WHERE user_id=?").get(uid); return p ? { answers: JSON.parse(p.answers), weights: p.weights ? JSON.parse(p.weights) : null, care_override: p.care_override || null } : null; },
    async saveAnswers(uid, a, resetCare) { const p = q("SELECT care_override FROM profiles WHERE user_id=?").get(uid); q("INSERT INTO profiles(user_id,answers,care_override,updated) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET answers=excluded.answers, care_override=excluded.care_override, updated=excluded.updated").run(uid, JSON.stringify(a), resetCare ? null : (p ? p.care_override : null), now()); },
    async savePrefs(uid, w, ov) { q("UPDATE profiles SET weights=?, care_override=? WHERE user_id=?").run(JSON.stringify(w), ov, uid); },
    async takenSlots(fromDay) { return q("SELECT provider_id,day,hour FROM bookings WHERE status='active' AND day>=?").all(fromDay); },
    async userBookings(uid) { return q("SELECT * FROM bookings WHERE user_id=? ORDER BY day, hour").all(uid); },
    async getBooking(uid, id) { return q("SELECT * FROM bookings WHERE id=? AND user_id=?").get(id, uid) || null; },
    async createBooking(uid, b, rescheduleId) {
      const id = rid(4);
      try { db.exec("BEGIN");
        if (rescheduleId) q("UPDATE bookings SET status='rescheduled' WHERE id=? AND user_id=? AND status='active'").run(rescheduleId, uid);
        q("INSERT INTO bookings(id,user_id,provider_id,day,hour,type,fmt,created) VALUES(?,?,?,?,?,?,?,?)").run(id, uid, b.provider_id, b.day, b.hour, b.type, b.fmt, now());
        db.exec("COMMIT"); return id;
      } catch (e) { try { db.exec("ROLLBACK"); } catch (x) {} return null; }
    },
    async cancelBooking(uid, id) { q("UPDATE bookings SET status='cancelled' WHERE id=? AND user_id=? AND status='active'").run(id, uid); },
    async setReminders(uid, id, r) { q("UPDATE bookings SET reminders=? WHERE id=? AND user_id=?").run(r, id, uid); },
    async addFeedback(uid, tester, payload) { q("INSERT INTO feedback VALUES(?,?,?,?,?)").run(rid(), uid, tester, JSON.stringify(payload), now()); },
    async hasFeedback(uid) { return !!q("SELECT 1 FROM feedback WHERE user_id=?").get(uid); },
    async listFeedback() { return q("SELECT * FROM feedback ORDER BY created DESC").all().map(f => Object.assign(JSON.parse(f.payload), { tester: f.tester, when: f.created })); },
    async addLead(f) { q("INSERT INTO leads VALUES(?,?,?,?,?,?,?)").run(rid(), f.org, f.contact, f.email, f.size, f.note, now()); },
    async listLeads() { return q("SELECT * FROM leads ORDER BY created DESC").all(); },
    async counts() { return { users: q("SELECT COUNT(*) n FROM users").get().n, bookings: q("SELECT COUNT(*) n FROM bookings").get().n }; },
  };
}

function dynamoStore() {
  // The AWS SDK v3 ships inside the Lambda Node.js runtime, so it is not a package dependency.
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand, ScanCommand, TransactWriteCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
  const T = process.env.TABLE, ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
  const get = async (pk, sk) => (await ddb.send(new GetCommand({ TableName: T, Key: { pk, sk } }))).Item || null;
  const put = Item => ddb.send(new PutCommand({ TableName: T, Item }));
  const del = (pk, sk) => ddb.send(new DeleteCommand({ TableName: T, Key: { pk, sk } }));
  async function query(pk, prefix, forward = true) {
    const out = []; let k;
    do { const r = await ddb.send(new QueryCommand({ TableName: T, KeyConditionExpression: prefix ? "pk=:p AND begins_with(sk,:s)" : "pk=:p", ExpressionAttributeValues: prefix ? { ":p": pk, ":s": prefix } : { ":p": pk }, ScanIndexForward: forward, ExclusiveStartKey: k })); out.push(...r.Items); k = r.LastEvaluatedKey; } while (k);
    return out;
  }
  const U = id => "USER#" + id, slotKey = b => b.provider_id + "#" + b.day + "#" + b.hour;
  const asUser = u => u && { id: u.id, name: u.name, email: u.email, pass_hash: u.pass_hash, salt: u.salt, created: u.created };
  const asBooking = b => ({ id: b.id, user_id: b.user_id, provider_id: b.provider_id, day: b.day, hour: b.hour, type: b.type, fmt: b.fmt, status: b.status, reminders: b.reminders, created: b.created });
  const tx = async items => { try { await ddb.send(new TransactWriteCommand({ TransactItems: items })); return true; } catch (e) { if (e.name === "TransactionCanceledException") return false; throw e; } };
  return {
    async createUser(u) { const id = rid(8);
      const ok = await tx([{ Put: { TableName: T, Item: { pk: "EMAIL#" + u.email, sk: "META", userId: id }, ConditionExpression: "attribute_not_exists(pk)" } },
                           { Put: { TableName: T, Item: { pk: U(id), sk: "META", id, name: u.name, email: u.email, pass_hash: u.pass_hash, salt: u.salt, created: now() } } }]);
      return ok ? id : null; },
    async userByEmail(email) { const e = await get("EMAIL#" + email, "META"); return e ? asUser(await get(U(e.userId), "META")) : null; },
    async updateUser(id, name, email) { const u = await get(U(id), "META"); if (!u) return false;
      const upd = { Update: { TableName: T, Key: { pk: U(id), sk: "META" }, UpdateExpression: "SET #n=:n, email=:e", ExpressionAttributeNames: { "#n": "name" }, ExpressionAttributeValues: { ":n": name, ":e": email } } };
      if (u.email === email) return tx([upd]);
      return tx([{ Put: { TableName: T, Item: { pk: "EMAIL#" + email, sk: "META", userId: id }, ConditionExpression: "attribute_not_exists(pk)" } }, { Delete: { TableName: T, Key: { pk: "EMAIL#" + u.email, sk: "META" } } }, upd]); },
    async setPass(id, h, salt) { await ddb.send(new UpdateCommand({ TableName: T, Key: { pk: U(id), sk: "META" }, UpdateExpression: "SET pass_hash=:h, salt=:s", ExpressionAttributeValues: { ":h": h, ":s": salt } })); },
    async deleteUser(id) { const items = await query(U(id)); const keys = [];
      for (const it of items) { keys.push({ pk: it.pk, sk: it.sk });
        if (it.sk === "META") keys.push({ pk: "EMAIL#" + it.email, sk: "META" });
        if (it.sk.startsWith("SESS#")) keys.push({ pk: it.sk, sk: "META" });
        if (it.sk.startsWith("BOOK#") && it.status === "active") keys.push({ pk: "SLOTS", sk: slotKey(it) }); }
      for (let i = 0; i < keys.length; i += 25) await ddb.send(new BatchWriteCommand({ RequestItems: { [T]: keys.slice(i, i + 25).map(Key => ({ DeleteRequest: { Key } })) } })); },
    async createSession(token, uid, expires) { const ttl = Math.floor(expires / 1000); await put({ pk: "SESS#" + token, sk: "META", userId: uid, expires, ttl }); await put({ pk: U(uid), sk: "SESS#" + token, ttl }); },
    async sessionUser(token) { const s = await get("SESS#" + token, "META"); if (!s || s.expires <= Date.now()) return null; return asUser(await get(U(s.userId), "META")); },
    async deleteSession(token) { const s = await get("SESS#" + token, "META"); if (s) { await del("SESS#" + token, "META"); await del(U(s.userId), "SESS#" + token); } },
    async deleteOtherSessions(uid, keep) { for (const it of await query(U(uid), "SESS#")) if (it.sk !== "SESS#" + keep) { await del(it.sk, "META"); await del(it.pk, it.sk); } },
    async getProfile(uid) { const p = await get(U(uid), "PROFILE"); return p ? { answers: p.answers, weights: p.weights || null, care_override: p.care_override || null } : null; },
    async saveAnswers(uid, a, resetCare) { const p = await get(U(uid), "PROFILE"); await put({ pk: U(uid), sk: "PROFILE", answers: a, weights: p ? p.weights : undefined, care_override: resetCare || !p ? undefined : p.care_override, updated: now() }); },
    async savePrefs(uid, w, ov) { const p = await get(U(uid), "PROFILE"); if (p) await put(Object.assign(p, { weights: w, care_override: ov || undefined })); },
    async takenSlots(fromDay) { return (await query("SLOTS")).filter(s => s.day >= fromDay).map(s => ({ provider_id: s.provider_id, day: s.day, hour: s.hour })); },
    async userBookings(uid) { return (await query(U(uid), "BOOK#")).map(asBooking).sort((a, b) => a.day.localeCompare(b.day) || a.hour - b.hour); },
    async getBooking(uid, id) { const b = await get(U(uid), "BOOK#" + id); return b ? asBooking(b) : null; },
    async createBooking(uid, b, rescheduleId) { const id = rid(4);
      const items = [{ Put: { TableName: T, Item: { pk: "SLOTS", sk: slotKey(b), provider_id: b.provider_id, day: b.day, hour: b.hour, bookingId: id }, ConditionExpression: "attribute_not_exists(pk)" } },
                     { Put: { TableName: T, Item: Object.assign({ pk: U(uid), sk: "BOOK#" + id, id, user_id: uid, status: "active", reminders: "email", created: now() }, b) } }];
      if (rescheduleId) { const old = await get(U(uid), "BOOK#" + rescheduleId);
        if (old && old.status === "active") items.push({ Update: { TableName: T, Key: { pk: U(uid), sk: "BOOK#" + rescheduleId }, UpdateExpression: "SET #s=:s", ExpressionAttributeNames: { "#s": "status" }, ExpressionAttributeValues: { ":s": "rescheduled" } } }, { Delete: { TableName: T, Key: { pk: "SLOTS", sk: slotKey(old) } } }); }
      return (await tx(items)) ? id : null; },
    async cancelBooking(uid, id) { const b = await get(U(uid), "BOOK#" + id); if (!b || b.status !== "active") return;
      await tx([{ Update: { TableName: T, Key: { pk: U(uid), sk: "BOOK#" + id }, UpdateExpression: "SET #s=:s", ExpressionAttributeNames: { "#s": "status" }, ExpressionAttributeValues: { ":s": "cancelled" } } }, { Delete: { TableName: T, Key: { pk: "SLOTS", sk: slotKey(b) } } }]); },
    async setReminders(uid, id, r) { await ddb.send(new UpdateCommand({ TableName: T, Key: { pk: U(uid), sk: "BOOK#" + id }, UpdateExpression: "SET reminders=:r", ConditionExpression: "attribute_exists(pk)", ExpressionAttributeValues: { ":r": r } })); },
    async addFeedback(uid, tester, payload) { await put({ pk: "FEEDBACK", sk: now() + "#" + rid(3), tester, payload }); await put({ pk: U(uid), sk: "GAVEFEEDBACK" }); },
    async hasFeedback(uid) { return !!(await get(U(uid), "GAVEFEEDBACK")); },
    async listFeedback() { return (await query("FEEDBACK", null, false)).map(f => Object.assign({}, f.payload, { tester: f.tester, when: f.sk.split("#")[0] })); },
    async addLead(f) { await put(Object.assign({ pk: "LEAD", sk: now() + "#" + rid(3), created: now() }, f)); },
    async listLeads() { return query("LEAD", null, false); },
    async counts() { let users = 0, bookings = 0, k;
      do { const r = await ddb.send(new ScanCommand({ TableName: T, ProjectionExpression: "pk, sk", ExclusiveStartKey: k })); r.Items.forEach(i => { if (i.pk.startsWith("USER#") && i.sk === "META") users++; if (i.sk.startsWith("BOOK#")) bookings++; }); k = r.LastEvaluatedKey; } while (k);
      return { users, bookings }; },
  };
}
module.exports = process.env.STORE === "dynamo" ? dynamoStore() : sqliteStore();
