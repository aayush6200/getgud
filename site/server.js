// GetGud web app: Express + SQLite. Real accounts, sessions, saved questionnaires, and bookings.
process.removeAllListeners("warning"); // node:sqlite prints an experimental notice on Node 22
const express = require("express");
const crypto = require("crypto");
const path = require("path");
const GG = require("./shared/gg.js");
const V = require("./views.js");
const store = require("./store.js");

const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === "production";
const TEAM_KEY = process.env.TEAM_KEY || "getgud-team";
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); // async route wrapper

/* ---------- auth helpers ---------- */
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const newSalt = () => crypto.randomBytes(16).toString("hex");
function checkPassword(u, pw) { const a = Buffer.from(hash(pw, u.salt), "hex"), b = Buffer.from(u.pass_hash, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); }
const COOKIE = "gg_sid", cookieFlags = `Path=/; HttpOnly; SameSite=Lax${PROD ? "; Secure" : ""}`;
async function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex"), ttl = 30 * 24 * 3600 * 1000;
  await store.createSession(token, userId, Date.now() + ttl);
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; ${cookieFlags}; Max-Age=${ttl / 1000}`);
}
const clearCookie = res => res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieFlags}; Max-Age=0`);
const cookie = (req, name) => { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? m[1] : null; };
const attempts = new Map(); // small in-memory sign-in throttle
function throttled(key) { const t = Date.now(), a = (attempts.get(key) || []).filter(x => t - x < 15 * 60e3); attempts.set(key, a); return a.length >= 8; }
const strike = key => attempts.get(key).push(Date.now());
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120;

const app = express();
app.disable("x-powered-by");
if (PROD) app.set("trust proxy", true);
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(express.json({ limit: "50kb" }));
const assets = { maxAge: PROD ? "1h" : 0 };
app.use("/css", express.static(path.join(__dirname, "public/css"), assets));
app.get("/js/gg.js", (req, res) => res.sendFile(path.join(__dirname, "shared/gg.js"), assets));
app.use("/js", express.static(path.join(__dirname, "public/js"), assets));
app.use(h(async (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("X-Frame-Options", "DENY"); res.setHeader("Referrer-Policy", "same-origin"); res.setHeader("Cache-Control", "no-store");
  // block cross-site form posts
  if (req.method === "POST" && req.headers.origin) { let ok = false; try { ok = new URL(req.headers.origin).host === req.headers.host; } catch (e) {} if (!ok) return res.status(403).send("Cross-site request blocked."); }
  const tok = cookie(req, COOKIE);
  if (tok && /^[0-9a-f]{64}$/.test(tok)) { const u = await store.sessionUser(tok); if (u) { req.user = u; req.token = tok; } }
  if (req.user) {
    const p = await store.getProfile(req.user.id);
    if (p) req.profile = { a: GG.cleanAnswers(p.answers), w: Object.assign(GG.DEFAULT_W(), p.weights || {}), override: p.care_override || null };
  }
  next();
}));
const needUser = (req, res, next) => req.user ? next() : (req.path.startsWith("/api/") ? res.status(401).json({ error: "Sign in first." }) : res.redirect("/login?next=" + encodeURIComponent(req.originalUrl)));
const needProfile = (req, res, next) => (req.profile && GG.complete(req.profile.a)) ? next() : res.redirect("/onboarding");
const todayKey = () => GG.dkey(new Date());
async function bookedMap() { const m = {}; (await store.takenSlots(todayKey())).forEach(b => (m[b.provider_id] = m[b.provider_id] || []).push(b.day + "|" + b.hour)); return m; }
const html = (req, title, body, opt) => V.layout(title, body, Object.assign({ user: req.user, path: req.path }, opt || {}));
const page = (req, res, title, body, opt) => res.send(html(req, title, body, opt));

/* ---------- public pages ---------- */
app.get("/", (req, res) => page(req, res, "GetGud · Mental health support for esports athletes", V.home(req.user), { wide: true }));
app.get("/research", (req, res) => page(req, res, "Research · GetGud", V.research(req.user)));
app.get("/crisis", (req, res) => page(req, res, "Crisis help · GetGud", V.crisis()));
app.get("/privacy", (req, res) => page(req, res, "Privacy · GetGud", V.privacy()));
app.get("/teams", (req, res) => page(req, res, "For teams and schools · GetGud", V.teams({}, req.query.sent === "1")));
app.post("/teams", h(async (req, res) => {
  const b = req.body, f = { org: String(b.org || "").trim().slice(0, 100), contact: String(b.contact || "").trim().slice(0, 80), email: String(b.email || "").trim().slice(0, 120), size: String(b.size || "").slice(0, 20), note: String(b.note || "").slice(0, 800) };
  if (!f.org || !f.contact || !validEmail(f.email)) return res.status(400).send(html(req, "For teams and schools · GetGud", V.teams(Object.assign(f, { error: "Add your organization, your name, and a valid email." }), false)));
  await store.addLead(f);
  res.redirect("/teams?sent=1");
}));
app.get("/providers", (req, res) => page(req, res, "Find a provider · GetGud", V.providers(req.profile)));
app.get("/providers/:id", h(async (req, res, next) => {
  const p = GG.byId(req.params.id); if (!p) return next();
  page(req, res, p.name + " · GetGud", V.provider(p, req.user, req.profile, new Set((await bookedMap())[p.id] || [])));
}));

/* ---------- accounts ---------- */
app.get("/signup", (req, res) => req.user ? res.redirect("/dashboard") : page(req, res, "Create your account · GetGud", V.signup({})));
app.post("/signup", h(async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 40), email = String(req.body.email || "").trim().toLowerCase(), pw = String(req.body.password || "");
  const fail = error => res.status(400).send(html(req, "Create your account · GetGud", V.signup({ name, email, error })));
  if (!name) return fail("Add a name or gamertag.");
  if (!validEmail(email)) return fail("Enter an email address like name@example.com.");
  if (pw.length < 8) return fail("Use a password with at least 8 characters.");
  if (pw.length > 200) return fail("That password is too long.");
  if (req.body.age !== "on") return fail("GetGud is for players 18 and older. Younger players need a guardian to sign up with them.");
  if (req.body.terms !== "on") return fail("Please agree to the privacy terms to continue.");
  const salt = newSalt(), id = await store.createUser({ name, email, pass_hash: hash(pw, salt), salt });
  if (!id) return fail("An account with that email already exists. Sign in instead.");
  await startSession(res, id);
  res.redirect("/onboarding");
}));
app.get("/login", (req, res) => req.user ? res.redirect("/dashboard") : page(req, res, "Sign in · GetGud", V.login({ next: req.query.next || "", notice: req.query.bye ? "You are signed out." : req.query.deleted ? "Your account and all of its data were deleted." : "" })));
app.post("/login", h(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase(), pw = String(req.body.password || ""), next = String(req.body.next || "");
  const key = req.ip + "|" + email;
  const fail = msg => res.status(400).send(html(req, "Sign in · GetGud", V.login({ email, next, error: msg })));
  if (throttled(key)) return fail("Too many attempts. Wait 15 minutes and try again.");
  const u = validEmail(email) ? await store.userByEmail(email) : null;
  if (!u || !checkPassword(u, pw)) { strike(key); return fail("That email and password do not match an account."); }
  await startSession(res, u.id);
  res.redirect(/^\/[a-z]/i.test(next) ? next : "/dashboard");
}));
app.post("/logout", h(async (req, res) => { if (req.token) await store.deleteSession(req.token); clearCookie(res); res.redirect("/login?bye=1"); }));
app.get("/forgot", (req, res) => page(req, res, "Reset password · GetGud", V.forgot()));

app.get("/account", needUser, (req, res) => page(req, res, "Account · GetGud", V.account(req.user, { ok: req.query.ok || "" })));
app.post("/account", needUser, h(async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 40), email = String(req.body.email || "").trim().toLowerCase();
  const fail = error => res.status(400).send(html(req, "Account · GetGud", V.account(Object.assign({}, req.user, { name, email }), { error })));
  if (!name) return fail("Add a name or gamertag.");
  if (!validEmail(email)) return fail("Enter a valid email address.");
  if (!(await store.updateUser(req.user.id, name, email))) return fail("Another account already uses that email.");
  res.redirect("/account?ok=profile");
}));
app.post("/account/password", needUser, h(async (req, res) => {
  const cur = String(req.body.current || ""), pw = String(req.body.password || "");
  const fail = pwError => res.status(400).send(html(req, "Account · GetGud", V.account(req.user, { pwError })));
  if (!checkPassword(req.user, cur)) return fail("Your current password is not right.");
  if (pw.length < 8 || pw.length > 200) return fail("Use a new password with at least 8 characters.");
  const salt = newSalt(); await store.setPass(req.user.id, hash(pw, salt), salt);
  await store.deleteOtherSessions(req.user.id, req.token); // sign out other devices
  res.redirect("/account?ok=password");
}));
app.post("/account/delete", needUser, h(async (req, res) => {
  if (!checkPassword(req.user, String(req.body.current || ""))) return res.status(400).send(html(req, "Account · GetGud", V.account(req.user, { delError: "Enter your password to delete the account." })));
  await store.deleteUser(req.user.id); clearCookie(res); res.redirect("/login?deleted=1");
}));

/* ---------- questionnaire and matches ---------- */
app.get("/onboarding", needUser, (req, res) => page(req, res, "Athlete questionnaire · GetGud", V.onboarding(), { boot: { page: "onboarding", a: req.profile ? req.profile.a : GG.DEFAULT_A(), editing: !!(req.profile && GG.complete(req.profile.a)) } }));
app.post("/api/profile", needUser, h(async (req, res) => {
  const a = GG.cleanAnswers(req.body.a);
  if (!GG.complete(a)) return res.status(400).json({ error: "The questionnaire is missing required answers." });
  await store.saveAnswers(req.user.id, a, !!req.body.resetCare);
  res.json({ ok: true });
}));
app.post("/api/prefs", needUser, h(async (req, res) => {
  if (!req.profile) return res.status(400).json({ error: "Finish the questionnaire first." });
  const w = {}, d = GG.DEFAULT_W(); Object.keys(d).forEach(k => { const v = Math.round(+((req.body.w || {})[k])); w[k] = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : d[k]; });
  const ov = ["clinical", "either", "perf"].includes(req.body.override) ? req.body.override : null;
  await store.savePrefs(req.user.id, w, ov);
  res.json({ ok: true });
}));
app.get("/matches", needUser, needProfile, h(async (req, res) => page(req, res, "Your matches · GetGud", V.matches(), { boot: { page: "matches", a: req.profile.a, w: req.profile.w, override: req.profile.override, booked: await bookedMap(), name: req.user.name } })));

/* ---------- booking ---------- */
app.get("/book/:id", needUser, needProfile, h(async (req, res, next) => {
  const p = GG.byId(req.params.id); if (!p) return next();
  let re = null;
  if (req.query.reschedule) { const b = await store.getBooking(req.user.id, String(req.query.reschedule)); if (b && b.status === "active") re = { id: b.id, day: b.day, hour: b.hour, type: b.type, fmt: b.fmt }; }
  page(req, res, "Book with " + p.name + " · GetGud", V.book(p), { boot: { page: "book", pid: p.id, a: req.profile.a, booked: (await bookedMap())[p.id] || [], reschedule: re } });
}));
app.post("/api/book", needUser, h(async (req, res) => {
  if (!req.profile || !GG.complete(req.profile.a)) return res.status(400).json({ error: "Finish the questionnaire first." });
  const p = GG.byId(req.body.pid), day = String(req.body.day || ""), hour = +req.body.hour, a = req.profile.a;
  const type = req.body.type === "intro" ? "intro" : "full", fmt = String(req.body.fmt || "");
  if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: "That booking request is not valid." });
  const blocked = GG.eligible(p, a, "either"); if (blocked) return res.status(400).json({ error: blocked });
  if (type === "intro" && !p.intro) return res.status(400).json({ error: "This provider does not offer intro calls." });
  if (!p.fmt.includes(fmt)) return res.status(400).json({ error: "Pick how you want to meet." });
  // accept a day either side of the server's window so players in other time zones are not rejected
  const t = GG.fromKey(day), lo = new Date(), hi = new Date(); lo.setDate(lo.getDate() - 1); hi.setDate(hi.getDate() + 16);
  if (!(t > lo && t < hi)) return res.status(400).json({ error: "Pick a day in the next two weeks." });
  const booked = new Set((await bookedMap())[p.id] || []);
  const slot = GG.slotsFor(p, t, [], booked).find(s => s.h === hour);
  if (!slot || slot.taken) return res.status(409).json({ error: "Someone just took that time. Pick another one." });
  const id = await store.createBooking(req.user.id, { provider_id: p.id, day, hour, type, fmt }, req.body.reschedule ? String(req.body.reschedule) : null);
  if (!id) return res.status(409).json({ error: "Someone just took that time. Pick another one." });
  res.json({ ok: true, id });
}));
const ownBooking = h(async (req, res, next) => { const b = await store.getBooking(req.user.id, String(req.params.id)); if (!b) return next("route"); req.booking = b; next(); });
const topThree = req => req.profile && GG.complete(req.profile.a) ? GG.runMatch(req.profile.a, req.profile.w, req.profile.override).ranked.slice(0, 3) : [];
app.get("/booking/:id", needUser, ownBooking, h(async (req, res) => {
  page(req, res, "Booking confirmed · GetGud", V.booking(req.booking, req.user, req.profile, topThree(req), { gave: await store.hasFeedback(req.user.id), saved: req.query.fb === "1", fbError: req.query.fb === "0" }));
}));
app.post("/booking/:id/reminders", needUser, ownBooking, h(async (req, res) => {
  await store.setReminders(req.user.id, req.booking.id, ["email", "sms", "discord"].filter(k => req.body[k] === "on").join(","));
  res.redirect("/booking/" + req.booking.id + "#reminders");
}));
app.post("/booking/:id/cancel", needUser, ownBooking, h(async (req, res) => { await store.cancelBooking(req.user.id, req.booking.id); res.redirect("/dashboard?cancelled=1"); }));
app.post("/feedback", needUser, h(async (req, res) => {
  const back = "/booking/" + encodeURIComponent(String(req.body.booking || "")), top = topThree(req);
  if (!top.length) return res.redirect("/dashboard");
  const ratings = {}; let ok = true;
  top.forEach(r => { const v = +req.body["r" + r.p.id]; if (v >= 1 && v <= 5) ratings[r.p.id] = v; else ok = false; });
  if (!ok) return res.redirect(back + "?fb=0#feedback");
  const a = req.profile.a;
  await store.addFeedback(req.user.id, req.user.name, { asked: a.concerns.map(c => GG.SHORT[c]).join(", ") + " · " + a.games.map(g => GG.GAMES[g]).join(", ") + " · " + GG.STATE_NAME[a.state], top: top.map(r => ({ id: r.p.id, name: r.p.name, fit: r.total })), ratings, book: ["yes", "maybe", "no"].includes(req.body.book) ? req.body.book : "", text: String(req.body.text || "").slice(0, 600) });
  res.redirect(back + "?fb=1#feedback");
}));
app.get("/dashboard", needUser, h(async (req, res) => {
  const top = topThree(req);
  page(req, res, "Dashboard · GetGud", V.dashboard(req.user, req.profile, await store.userBookings(req.user.id), top.length ? top : null, todayKey(), req.query.cancelled === "1"));
}));

/* ---------- team view of test results ---------- */
app.get("/team-log", h(async (req, res, next) => {
  if (req.query.key !== TEAM_KEY) return next();
  const c = await store.counts();
  page(req, res, "Team log · GetGud", V.teamLog(await store.listFeedback(), { users: c.users, bookings: c.bookings, leads: await store.listLeads() }));
}));

app.use((req, res) => res.status(404).send(html(req, "Not found · GetGud", V.notFound())));
app.use((err, req, res, next) => { if (err && err.status === 400) return res.status(400).json({ error: "That request could not be read." }); console.error(err); res.status(500).send(html(req, "Something broke · GetGud", V.oops())); });

if (require.main === module) app.listen(PORT, () => console.log(`GetGud running at http://localhost:${PORT}  (team log: /team-log?key=${TEAM_KEY})`));
module.exports = app;
