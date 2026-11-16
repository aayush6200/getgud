window.GGViews=(function(){var module={exports:{}},exports=module.exports;var require=function(){return window.GG};
// Server-rendered pages. Interactive screens (questionnaire, matches, booking) mount client code from /js/app.js.
const GG = require("./shared/gg.js");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ava = (p, lg) => `<div class="ava ${lg ? "lg" : ""}" aria-hidden="true">${GG.initials(p.name)}</div>`;
const kindTag = p => p.kind === "perf" ? '<span class="tag">Performance coach</span>' : p.meds ? '<span class="tag good">Psychiatrist · can prescribe</span>' : p.kind === "both" ? '<span class="tag good">Licensed + CMPC</span>' : '<span class="tag good">Licensed clinician</span>';
const first = p => p.name.replace(/^Dr\. /, "").split(" ")[0];
const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
function licLine(p, a) {
  if (p.kind === "perf") return "Coaching is not state-licensed, so location does not limit it.";
  const home = p.states.map(s => GG.STATE_NAME[s]).join(", ");
  if (a && a.state) {
    if (p.states.includes(a.state)) return "Licensed in " + GG.STATE_NAME[a.state] + ".";
    if (p.psy && GG.PSYPACT.has(a.state)) return "Home license in " + home + ". Can see clients in " + GG.STATE_NAME[a.state] + " through the PSYPACT compact.";
  }
  return "Licensed in " + home + (p.psy ? ", plus states in the PSYPACT compact." : ".");
}

exports.layout = (title, body, o = {}) => {
  const u = o.user, at = p => o.path === p ? ' aria-current="page"' : "";
  const nav = u
    ? `<a href="/dashboard"${at("/dashboard")}>Dashboard</a><a href="/matches"${at("/matches")}>My matches</a><a href="/providers"${at("/providers")}>Providers</a><a href="/research"${at("/research")}>Research</a>`
    : `<a href="/#how">How it works</a><a href="/providers"${at("/providers")}>Find a provider</a><a href="/teams"${at("/teams")}>For teams</a><a href="/research"${at("/research")}>Research</a>`;
  const right = u
    ? `<a class="btn ghost" href="/account"${at("/account")}><span class="ava xs" aria-hidden="true">${esc(u.name[0].toUpperCase())}</span>${esc(u.name)}</a><form method="post" action="/logout"><button class="btn sm">Sign out</button></form>`
    : `<a class="btn ghost" href="/login">Sign in</a><a class="btn primary sm" href="/signup">Get started</a>`;
  const tab = (href, label, d) => `<a href="${href}"${at(href)}><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>${label}</a>`;
  const tabs = u ? `<nav class="tabs" aria-label="Quick navigation">${tab("/dashboard", "Home", '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>')}${tab("/matches", "Matches", '<path d="M5 20V11M12 20V4M19 20v-6"/>')}${tab("/providers", "Providers", '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>')}${tab("/account", "Account", '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5"/>')}</nav>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme:light)"><meta name="theme-color" content="#000000" media="(prefers-color-scheme:dark)">
<title>${esc(title)}</title>
<meta name="description" content="GetGud matches esports athletes with therapists and mental performance coaches who understand competitive play.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&display=swap">
<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B7D72'/%3E%3Crect x='6' y='12' width='20' height='8' rx='4' fill='%23fff'/%3E%3Crect x='6' y='12' width='13' height='8' rx='4' fill='%23F2BE55'/%3E%3C/svg%3E">
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar"><div class="wrap">
  <a class="logo" href="${u ? "/dashboard" : "/"}"><i></i>GetGud</a>
  <button class="burger" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span><span></span><span></span></button>
  <nav id="nav" class="nav"><div class="nav-links">${nav}</div><div class="nav-right">${right}<a class="btn sm crisis" href="/crisis">Need help now?</a></div></nav>
</div></header>
<main id="main" class="${o.wide ? "" : "wrap"}">${body}</main>
<footer class="foot"><div class="wrap foot-grid">
  <div class="stack" style="gap:8px"><a class="logo" href="/"><i></i>GetGud</a><p class="small muted">Mental health support built for competitive players.</p><p class="small muted">A class project.</p></div>
  <div><h4>Players</h4><a href="/signup">Get started</a><a href="/providers">Find a provider</a><a href="/#how">How it works</a><a href="/login">Sign in</a></div>
  <div><h4>Organizations</h4><a href="/teams">For teams and schools</a><a href="/research">The research</a></div>
  <div><h4>Safety</h4><a href="/crisis">Crisis help</a><a href="/privacy">Privacy</a></div>
</div><div class="wrap"><p class="small muted fine">Prototype. Every provider shown is a fictional sample, and no real sessions or payments take place. GetGud is not an emergency service. In the US, call or text 988 any time.</p></div></footer>${tabs}
${o.boot ? `<script id="boot" type="application/json">${JSON.stringify(o.boot).replace(/</g, "\\u003c")}</script>` : ""}
<script src="/js/gg.js"></script><script src="/js/app.js"></script>
</body></html>`;
};

/* ---------- landing ---------- */
exports.home = (user) => {
  const kai = GG.cleanAnswers(GG.PERSONAS[0].a), top = GG.runMatch(kai).ranked.slice(0, 2);
  const cta = user ? `<a class="btn primary lg" href="/dashboard">Go to your dashboard</a>` : `<a class="btn primary lg" href="/signup">Find my match</a><a class="btn lg" href="/providers">Browse providers</a>`;
  const helps = [["tilt", "Tilt that ruins the next three maps"], ["perf", "Freezing when the match is on the line"], ["burnout", "Burnout after months of grinding"], ["sleep", "Sleep wrecked by late scrims"], ["team", "A roster that stopped talking"], ["toxicity", "Harassment in chat and voice"], ["transition", "Life after competitive play"], ["mood", "Feeling low and not knowing why"]];
  return `
<section class="band hero-band"><div class="wrap hero">
  <div class="stack" style="gap:20px">
    <p class="eyebrow">Mental health support for esports athletes</p>
    <h1>Talk to someone who gets the game.</h1>
    <p class="lede">GetGud matches competitive players with licensed therapists and certified mental performance coaches who understand scrims, ranked anxiety, and roster drama. Answer a few questions, see who fits and why, and book a first session.</p>
    <div class="row">${cta}</div>
    <p class="small muted">Free to sign up. Most providers offer a free 15-minute intro call.</p>
  </div>
  <div class="hero-card" aria-label="Example of a match result">
    <p class="eyebrow">Example: Kai, collegiate Valorant IGL</p>
    ${top.map((r, i) => `<div class="mini ${i === 0 ? "first" : ""}">${ava(r.p)}<div class="grow"><b>${esc(r.p.name)}</b><br><span class="small muted">${esc(r.p.cred)}</span><ul class="why">${r.why.slice(0, 2).map(w => `<li>${esc(w)}</li>`).join("")}</ul></div><div class="fit"><div><b>${r.total}%</b><span>fit</span></div></div></div>`).join("")}
    <p class="small muted">Sample providers. Your own ranking is built from your answers.</p>
  </div>
</div></section>

<section class="band"><div class="wrap stats">
  <div class="stat"><b>78.7%</b><p>of 72 professional FPS players showed signs of anxiety or depression on a standard screening questionnaire.</p>${ext("https://eprints.chi.ac.uk/id/eprint/7278/", "Birch et al., 2022")}</div>
  <div class="stat"><b>3–10 hrs</b><p>of practice a day among collegiate players. More than half reported eye fatigue, and a third wrist pain.</p>${ext("https://doi.org/10.1136/bmjsem-2018-000467", "DiFrancisco-Donoghue et al., 2019")}</div>
  <div class="stat"><b>260+</b><p>schools field collegiate esports programs in North America. Team psychologists are mostly found at the top professional organizations.</p>${ext("https://en.wikipedia.org/wiki/National_Association_of_Collegiate_Esports", "NACE, 2024")}</div>
</div></section>

<section class="band alt" id="how"><div class="wrap stack-lg">
  <div class="stack" style="gap:8px"><p class="eyebrow">How it works</p><h2 class="big">From struggling to a booked session in about five minutes.</h2></div>
  <ol class="how">
    <li><b>Create an account</b>Your answers are saved to your account so you can come back, change them, and rebook.</li>
    <li><b>Tell us how you play</b>Game, level, schedule, budget, and what is getting in the way.</li>
    <li><b>See ranked matches</b>Every provider shows a fit score and the reasons behind it. Change what matters and the list re-ranks.</li>
    <li><b>Book a session</b>Pick a time that fits around practice. Reschedule or cancel from your dashboard.</li>
  </ol>
</div></section>

<section class="band"><div class="wrap stack-lg">
  <div class="stack" style="gap:8px"><p class="eyebrow">What players come for</p><h2 class="big">Problems a coach alone cannot fix.</h2></div>
  <div class="helps">${helps.map(([k, t]) => `<a class="help" href="/providers?concern=${k}"><b>${esc(t)}</b><span class="small muted">See who works with ${GG.SHORT[k]}</span></a>`).join("")}</div>
</div></section>

<section class="band alt"><div class="wrap two-col">
  <div class="stack"><p class="eyebrow">Two kinds of help</p><h2 class="big">We send you to the right kind of professional.</h2>
    <p class="muted">Depression, anxiety, and insomnia need a licensed clinician. Composure and focus can be trained by a certified coach. GetGud reads your answers and routes you, and tells you why.</p></div>
  <div class="stack">
    <div class="card"><h3>Licensed clinicians</h3><p class="muted">Psychologists, counselors, clinical social workers, and psychiatrists. They can diagnose and treat mental health conditions. We only show ones licensed where you live.</p></div>
    <div class="card"><h3>Mental performance coaches</h3><p class="muted">Certified Mental Performance Consultants. They train skills like reset routines and focus under pressure. They cannot treat a mental health condition.</p></div>
  </div>
</div></section>

<section class="band"><div class="wrap two-col">
  <div class="stack"><p class="eyebrow">Privacy</p><h2 class="big">Your team never finds out.</h2>
    <p class="muted">A provider sees your answers only after you book with them. When a team or school pays through a program code, it receives a count of sessions used and no names. We do not share questionnaire answers with advertisers.</p>
    <p><a href="/privacy">Read the privacy page</a></p></div>
  <div class="card stack"><p class="eyebrow">For teams, schools, and communities</p><h3>Cover your players' sessions</h3><p class="muted">Partner organizations get a program code. Their players book at no cost and providers are paid a full rate.</p><div><a class="btn" href="/teams">See how partnering works</a></div></div>
</div></section>

<section class="band cta-band"><div class="wrap stack" style="align-items:flex-start"><h2 class="big">Ready when you are.</h2><p>It takes about five minutes, and you can stop and come back.</p><div class="row">${cta}</div></div></section>`;
};

/* ---------- auth ---------- */
const authShell = (inner, side) => `<div class="auth"><div class="auth-card card stack">${inner}</div><aside class="auth-side stack">${side}</aside></div>`;
const authSide = `<p class="eyebrow">Why an account</p><h2>Your answers and bookings stay with you.</h2><ul class="ticks"><li>Come back and pick up where you left off</li><li>Reschedule or cancel sessions from your dashboard</li><li>Change your answers and watch your matches update</li><li>Delete your account and everything in it at any time</li></ul>`;
exports.signup = f => authShell(`
  <div><h1 class="h-auth">Create your account</h1><p class="muted">Already have one? <a href="/login">Sign in</a></p></div>
  ${f.error ? `<p class="err" role="alert">${esc(f.error)}</p>` : ""}
  <form method="post" action="/signup" class="stack" novalidate>
    <label class="f" for="name">Name or gamertag<input type="text" id="name" name="name" autocomplete="nickname" maxlength="40" value="${esc(f.name || "")}" required></label>
    <label class="f" for="email">Email<input type="email" id="email" name="email" autocomplete="email" maxlength="120" value="${esc(f.email || "")}" required></label>
    <label class="f" for="password">Password<span class="h">At least 8 characters.</span><span class="pw"><input type="password" id="password" name="password" autocomplete="new-password" minlength="8" required><button type="button" class="btn ghost" data-showpw="password">Show</button></span></label>
    <label class="check" for="age"><input type="checkbox" id="age" name="age"><span>I am 18 or older.</span></label>
    <label class="check" for="terms"><input type="checkbox" id="terms" name="terms"><span>I agree to how GetGud handles my information, described on the <a href="/privacy" target="_blank">privacy page</a>.</span></label>
    <button class="btn primary lg" type="submit">Create account</button>
  </form>`, authSide);
exports.login = f => authShell(`
  <div><h1 class="h-auth">Sign in</h1><p class="muted">New here? <a href="/signup">Create an account</a></p></div>
  ${f.notice ? `<p class="okmsg" role="status">${esc(f.notice)}</p>` : ""}${f.error ? `<p class="err" role="alert">${esc(f.error)}</p>` : ""}
  <form method="post" action="/login" class="stack" novalidate>
    <input type="hidden" name="next" value="${esc(f.next || "")}">
    <label class="f" for="email">Email<input type="email" id="email" name="email" autocomplete="email" value="${esc(f.email || "")}" required></label>
    <label class="f" for="password">Password<span class="pw"><input type="password" id="password" name="password" autocomplete="current-password" required><button type="button" class="btn ghost" data-showpw="password">Show</button></span></label>
    <button class="btn primary lg" type="submit">Sign in</button>
    <p class="small"><a href="/forgot">Forgot your password?</a></p>
  </form>`, authSide);
exports.forgot = () => `<div class="narrow stack-lg"><div class="card stack"><h1 class="h-auth">Reset your password</h1><p>Password reset by email is not connected in this prototype, because the site does not send email yet.</p><p class="muted">If you are signed in on another device, you can change your password from the Account page. Otherwise, create a new account with a different email.</p><div class="row"><a class="btn primary" href="/login">Back to sign in</a><a class="btn" href="/signup">Create an account</a></div></div></div>`;

exports.account = (u, m) => `<div class="narrow stack-lg">
  <div><p class="eyebrow">Account</p><h1>Your account</h1><p class="muted">Member since ${new Date(u.created).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.</p></div>
  <form method="post" action="/account" class="card stack"><h2>Profile</h2>
    ${m.ok === "profile" ? `<p class="okmsg" role="status">Profile saved.</p>` : ""}${m.error ? `<p class="err" role="alert">${esc(m.error)}</p>` : ""}
    <label class="f" for="name">Name or gamertag<input type="text" id="name" name="name" maxlength="40" value="${esc(u.name)}"></label>
    <label class="f" for="email">Email<input type="email" id="email" name="email" maxlength="120" value="${esc(u.email)}"></label>
    <div><button class="btn primary">Save profile</button></div></form>
  <form method="post" action="/account/password" class="card stack"><h2>Password</h2>
    ${m.ok === "password" ? `<p class="okmsg" role="status">Password changed. Other devices were signed out.</p>` : ""}${m.pwError ? `<p class="err" role="alert">${esc(m.pwError)}</p>` : ""}
    <label class="f" for="current">Current password<input type="password" id="current" name="current" autocomplete="current-password"></label>
    <label class="f" for="password">New password<span class="h">At least 8 characters.</span><input type="password" id="password" name="password" autocomplete="new-password" minlength="8"></label>
    <div><button class="btn primary">Change password</button></div></form>
  <div class="card stack"><h2>Your answers</h2><p class="muted">Your questionnaire decides who you are matched with. You can change it any time.</p><div><a class="btn" href="/onboarding">Edit my questionnaire</a></div></div>
  <form method="post" action="/account/delete" class="card stack danger-zone"><h2>Delete account</h2><p class="muted">This removes your account, your questionnaire answers, and your bookings. It cannot be undone.</p>
    ${m.delError ? `<p class="err" role="alert">${esc(m.delError)}</p>` : ""}
    <label class="f" for="delpw">Enter your password to confirm<input type="password" id="delpw" name="current" autocomplete="current-password"></label>
    <div><button class="btn crisis">Delete my account</button></div></form>
</div>`;

/* ---------- app screens (client-mounted) ---------- */
exports.onboarding = () => `<div id="app" class="narrow"><p class="muted">Loading the questionnaire…</p></div><noscript><p class="wrap">The questionnaire needs JavaScript turned on.</p></noscript>`;
exports.matches = () => `<div id="app"><p class="muted">Finding your matches…</p></div>`;
exports.book = (p) => `<div id="app"><p class="muted">Loading ${esc(p.name)}'s calendar…</p></div>`;

/* ---------- providers ---------- */
exports.providers = (profile) => {
  const a = profile && GG.complete(profile.a) ? profile.a : null;
  const fit = a ? Object.fromEntries(GG.runMatch(a, profile.w, profile.override).ranked.map(r => [r.p.id, r.total])) : {};
  const opt = (o) => Object.entries(o).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  return `<div class="stack-lg">
  <div class="stack" style="gap:8px"><p class="eyebrow">Provider directory</p><h1>Find a provider</h1>
   <p class="muted" style="max-width:65ch">Everyone here works with competitive players. ${a ? "Fit scores come from your questionnaire." : `<a href="/signup">Create an account</a> and answer the questionnaire to see who fits you best and who is licensed where you live.`}</p></div>
  <form class="filters card" id="filters" onsubmit="return false">
   <label class="f" for="f-concern">Helps with<select id="f-concern"><option value="">Anything</option>${opt(GG.CONCERNS)}</select></label>
   <label class="f" for="f-game">Knows<select id="f-game"><option value="">Any game</option>${opt(GG.GAMES)}</select></label>
   <label class="f" for="f-kind">Type<select id="f-kind"><option value="">Any type</option><option value="licensed">Licensed clinician</option><option value="perf">Performance coach</option><option value="meds">Can prescribe medication</option></select></label>
   <label class="f" for="f-price">Up to <output id="f-price-o">$300</output><input type="range" id="f-price" min="60" max="300" step="10" value="300"></label>
  </form>
  <p class="small muted" id="count" role="status"></p>
  <div class="pgrid" id="pgrid">${GG.P.map(p => `<a class="pcard" href="/providers/${p.id}" data-spec="${p.spec.join(" ")}" data-games="${p.games.join(" ")}" data-kind="${p.kind}" data-meds="${p.meds ? 1 : 0}" data-price="${p.price}">
    <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${ava(p)}<div class="grow"><h3>${esc(p.name)}</h3><p class="small muted">${esc(p.cred)}</p></div>${fit[p.id] != null ? `<span class="fitpill">${fit[p.id]}% fit</span>` : ""}</div>
    <p class="small">${esc(p.bio)}</p>
    <div class="row" style="gap:6px">${kindTag(p)}<span class="tag">$${p.price}${p.slide ? " · sliding scale" : ""}</span><span class="tag demo">Sample</span></div>
    <p class="small muted">${p.spec.map(c => GG.SHORT[c]).join(" · ")}</p></a>`).join("")}</div>
  <div class="panel" id="empty" hidden><p><b>No providers match those filters.</b> Try a higher price limit or clear one of the filters.</p></div>
 </div>`;
};
exports.provider = (p, user, profile, booked) => {
  const a = profile && GG.complete(profile.a) ? profile.a : null;
  let r = null, why = "";
  if (a) { const cm = GG.careMode(a, profile.override); why = GG.eligible(p, a, cm.mode); if (!why) r = GG.score(p, a, cm.mode, profile.w); }
  const action = !user ? `<a class="btn primary" href="/signup">Sign up to book with ${esc(first(p))}</a><a class="btn" href="/login?next=/providers/${p.id}">Sign in</a>`
    : !a ? `<a class="btn primary" href="/onboarding">Answer the questionnaire to book</a>`
    : why && GG.eligible(p, a, "either") ? `<a class="btn" href="/matches">See providers who can work with you</a>`
    : `<a class="btn primary" href="/book/${p.id}">Book with ${esc(first(p))}</a><a class="btn" href="/matches">Back to my matches</a>`;
  return `<div class="narrow wide stack-lg">
  <a class="btn ghost back" href="${a ? "/matches" : "/providers"}">← ${a ? "Back to my matches" : "All providers"}</a>
  <div class="card stack-lg">
   <div class="row" style="align-items:flex-start;gap:18px">${ava(p, true)}
    <div class="grow stack" style="gap:6px"><p><span class="tag demo">Sample provider · fictional</span></p><h1 class="h-prof">${esc(p.name)}</h1><p class="muted">${esc(p.cred)} · ${p.pro} · ${p.yrs} years in practice</p><div class="row" style="gap:6px">${kindTag(p)}</div></div>
    ${r ? `<div class="fit"><div><b>${r.total}%</b><span>fit for you</span></div><div class="hp"><i style="width:${r.total}%"></i></div></div>` : ""}
   </div>
   <p class="bio">${esc(p.bio)}</p>
   ${why ? `<div class="note"><b>Not available to you right now.</b> ${esc(why)}</div>` : ""}
   <div class="two">
    ${r ? `<div class="stack" style="gap:8px"><h3>Why they match you</h3><ul class="why">${r.why.map(w => `<li>${esc(w)}</li>`).join("")}${r.minus.map(w => `<li class="minus">${esc(w)}</li>`).join("")}</ul></div>`
      : `<div class="stack" style="gap:8px"><h3>Works with</h3><ul class="why">${p.spec.map(c => `<li>${esc(GG.CONCERNS[c])}</li>`).join("")}</ul></div>`}
    <div class="stack" style="gap:8px"><h3>Details</h3><dl class="kv">
      <dt>Cost</dt><dd>${GG.priceLine(p, a)}</dd><dt>Intro call</dt><dd>${p.intro ? "Free, 15 minutes" : "Not offered"}</dd>
      <dt>Meets by</dt><dd>${p.fmt.map(f => GG.FORMATS[f]).join(", ")}</dd><dt>Languages</dt><dd>${p.langs.map(l => GG.LANGS[l]).join(", ")}</dd>
      <dt>Open</dt><dd>${p.hrs.map(t => GG.TIMES[t]).join(", ")}</dd><dt>Games</dt><dd>${p.games.length ? p.games.map(g => GG.GAMES[g]).join(", ") : "General esports"}</dd>
      <dt>Next opening</dt><dd>${GG.nextOpen(p, booked)}</dd></dl></div>
   </div>
   <div class="stack" style="gap:8px"><h3>How they work</h3>${p.mods.map(m => `<p class="small"><b>${m}.</b> ${GG.MODS[m].replace(/^[^.]*\. /, "")}</p>`).join("")}</div>
   <div class="note info"><b>Licensing.</b> ${licLine(p, a)} ${p.kind === "perf" ? "A performance coach cannot diagnose or treat a mental health condition." : ""}</div>
   <div class="row">${action}</div>
  </div></div>`;
};

/* ---------- booking confirmation and dashboard ---------- */
const when = b => GG.fmtD(GG.fromKey(b.day)) + " at " + GG.fmtH(b.hour);
const cost = (b, p, a) => b.type === "intro" ? "Free" : a && GG.covered(a) ? "Covered by " + GG.CODE : "$" + p.price;
exports.booking = (b, user, profile, top, m) => {
  const p = GG.byId(b.provider_id), a = profile ? profile.a : null, rem = b.reminders.split(","), active = b.status === "active";
  const PREP = ["Find a private spot and headphones. A parked car works.", "Write down the last time this hit you mid-match. One example is enough.", "Think about what a good result would look like in a month.", "List any medication or past counseling, if you are comfortable sharing."];
  const REM = { email: "Email to " + user.email, sms: "Text message", discord: "Discord DM" };
  return `<div class="narrow wide stack-lg">
  <div class="card stack-lg ${active ? "confirmed" : ""}">
   <div class="stack" style="gap:6px">${active ? '<svg class="tick" viewBox="0 0 56 56" aria-hidden="true" style="margin-bottom:10px"><circle cx="28" cy="28" r="28"/><path d="M17 29l8 8 15-17"/></svg>' : ""}<p class="eyebrow">${active ? "Booking confirmed" : "Booking " + esc(b.status)}</p><h1>${active ? `GG, ${esc(user.name)}. You are booked.` : "This session is no longer on your calendar."}</h1>${active ? `<p class="muted">Reaching out is the hard part. That is done.</p>` : ""}</div>
   <div class="row" style="gap:18px;align-items:flex-start">${ava(p, true)}
    <dl class="kv grow"><dt>With</dt><dd><a href="/providers/${p.id}">${esc(p.name)}</a>, ${esc(p.cred)}</dd><dt>When</dt><dd>${when(b)}</dd>
     <dt>Session</dt><dd>${b.type === "intro" ? "Intro call, 15 minutes" : "Full session, 50 minutes"} by ${GG.FORMATS[b.fmt].toLowerCase()}</dd><dt>Cost</dt><dd>${cost(b, p, a)}</dd>
     <dt>Booking code</dt><dd class="mono">GG-${esc(String(b.id).toUpperCase())}</dd></dl></div>
   ${active ? `<div class="two">
    <form method="post" action="/booking/${b.id}/reminders" class="stack" style="gap:8px" id="reminders"><h3>Remind me by</h3>${Object.entries(REM).map(([k, l]) => `<label class="check" for="rem-${k}"><input type="checkbox" id="rem-${k}" name="${k}" ${rem.includes(k) ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}
     <div><button class="btn sm">Save reminders</button></div><p class="small muted">Reminders go out 24 hours and 1 hour before. Prototype: nothing is actually sent.</p></form>
    <div class="stack" style="gap:8px"><h3>Before your session</h3>${PREP.map((t, i) => `<label class="check" for="prep-${i}"><input type="checkbox" id="prep-${i}"><span>${t}</span></label>`).join("")}</div>
   </div>
   <div class="note info"><b>Who knows about this?</b> You and ${esc(p.name)}. ${a && GG.covered(a) ? "Your program pays through its code, but it only receives a count of sessions used. No names." : "Nobody on your team or at your school is told."}</div>
   <div class="row"><a class="btn primary" href="/dashboard">Go to dashboard</a><a class="btn" href="/book/${p.id}?reschedule=${b.id}">Reschedule</a>
    <details class="inline-confirm"><summary class="btn ghost">Cancel session</summary><form method="post" action="/booking/${b.id}/cancel" class="row"><span class="small">Cancel this session?</span><button class="btn sm crisis">Yes, cancel it</button></form></details></div>`
   : `<div class="row"><a class="btn primary" href="/matches">Back to my matches</a><a class="btn" href="/dashboard">Dashboard</a></div>`}
  </div>
  ${active && top.length ? `<form method="post" action="/feedback" class="card stack" id="feedback">
   <input type="hidden" name="booking" value="${b.id}">
   <div><p class="eyebrow">Help us test this · 1 minute</p><h2>Did your top matches fit what you need?</h2><p class="muted small">Rate each from 1, wrong for me, to 5, exactly right.</p></div>
   ${m.saved ? `<p class="okmsg" role="status">Saved. Thank you.</p>` : ""}${m.fbError ? `<p class="err" role="alert">Rate each of the three matches first.</p>` : ""}${m.gave && !m.saved ? `<p class="small muted">You already sent feedback once. You can send another round if your matches changed.</p>` : ""}
   ${top.map(r => `<fieldset class="rate-row"><legend><b>${esc(r.p.name)}</b> <span class="muted small">${r.total}% fit</span></legend><span class="rate">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="r${r.p.id}" value="${n}"><span>${n}</span></label>`).join("")}</span></fieldset>`).join("")}
   <fieldset class="rate-row"><legend><b>If this were real, would you have booked?</b></legend><span class="rate wide">${[["yes", "Yes"], ["maybe", "Maybe"], ["no", "No"]].map(([k, l]) => `<label><input type="radio" name="book" value="${k}"><span>${l}</span></label>`).join("")}</span></fieldset>
   <label class="f" for="fb-text">What was missing or wrong?<textarea id="fb-text" name="text" rows="3" maxlength="600"></textarea></label>
   <div><button class="btn primary">Send feedback</button></div></form>` : ""}
 </div>`;
};
exports.dashboard = (user, profile, all, top, today, cancelled) => {
  const up = all.filter(b => b.status === "active" && b.day >= today), past = all.filter(b => !(b.status === "active" && b.day >= today)).reverse();
  const a = profile ? profile.a : null, done = !!top;
  const card = b => { const p = GG.byId(b.provider_id); return `<div class="sess">${ava(p)}<div class="grow"><b>${when(b)}</b><br><span class="small muted">${b.type === "intro" ? "Intro call" : "Full session"} by ${GG.FORMATS[b.fmt].toLowerCase()} with <a href="/providers/${p.id}">${esc(p.name)}</a> · ${cost(b, p, a)}</span></div><div class="row"><a class="btn sm" href="/booking/${b.id}">Details</a><a class="btn sm" href="/book/${p.id}?reschedule=${b.id}">Reschedule</a></div></div>`; };
  return `<div class="stack-lg">
  <div class="stack" style="gap:6px"><p class="eyebrow">Dashboard</p><h1>Hey, ${esc(user.name)}.</h1>
   <p class="muted">${up.length ? `Your next session is ${when(up[0])}.` : done ? "You have no sessions booked yet. Your matches are ready." : "Answer the questionnaire and we will find providers who fit."}</p></div>
  ${cancelled ? `<p class="okmsg" role="status">Session cancelled. The time is open again for other players.</p>` : ""}
  ${a && a.crisis === "yes" ? `<div class="note safe"><b>You told us you are in crisis.</b> Please do not wait for an appointment. Call or text 988 in the US, or see the <a href="/crisis">crisis page</a>.</div>` : ""}
  <div class="dash">
   <section class="stack">
    <div class="card stack"><div class="row spread"><h2>Upcoming sessions</h2>${done ? `<a class="btn sm primary" href="/matches">Book a session</a>` : ""}</div>
     ${up.length ? up.map(card).join("") : `<p class="muted">Nothing booked. ${done ? `Pick someone from <a href="/matches">your matches</a> to book a first session.` : ""}</p>`}</div>
    ${done ? `<div class="card stack"><div class="row spread"><h2>Your top matches</h2><a class="btn ghost" href="/matches">See all and adjust</a></div>
     ${top.map(r => `<div class="sess">${ava(r.p)}<div class="grow"><b>${esc(r.p.name)}</b> <span class="fitpill">${r.total}% fit</span><br><span class="small muted">${esc(r.why[0] || r.p.cred)}</span></div><div class="row"><a class="btn sm" href="/providers/${r.p.id}">Profile</a><a class="btn sm primary" href="/book/${r.p.id}">Book</a></div></div>`).join("")}</div>`
    : `<div class="card stack first-run"><h2>Start with the questionnaire</h2><p class="muted">Four short parts about how you play and what is going on. It takes about five minutes and you can change your answers later.</p><div><a class="btn primary lg" href="/onboarding">${profile ? "Finish the questionnaire" : "Start the questionnaire"}</a></div></div>`}
    ${past.length ? `<div class="card stack"><h2>History</h2>${past.map(b => { const p = GG.byId(b.provider_id); return `<div class="sess dim"><div class="grow"><b>${when(b)}</b> with ${esc(p.name)}<br><span class="small muted">${b.status === "active" ? "Completed" : b.status[0].toUpperCase() + b.status.slice(1)}</span></div><a class="btn sm" href="/book/${p.id}">Book again</a></div>`; }).join("")}</div>` : ""}
   </section>
   <aside class="stack">
    ${done ? `<div class="card stack"><h3>What you told us</h3><dl class="kv small-kv"><dt>Help with</dt><dd>${a.concerns.map(c => GG.SHORT[c]).join(", ")}</dd><dt>Top concern</dt><dd>${GG.SHORT[a.top]}</dd><dt>Games</dt><dd>${a.games.map(g => GG.GAMES[g]).join(", ")}</dd><dt>Level</dt><dd>${GG.LEVELS[a.level]}</dd><dt>Location</dt><dd>${GG.STATE_NAME[a.state]}</dd><dt>Budget</dt><dd>${GG.covered(a) ? "Covered by " + GG.CODE : "$" + a.budget + " a session"}</dd></dl><div><a class="btn sm" href="/onboarding">Edit my answers</a></div></div>` : ""}
    <div class="card stack"><h3>Need help right now?</h3><p class="small muted">GetGud is not a crisis service. In the US, call or text 988 any time.</p><div><a class="btn sm crisis" href="/crisis">Crisis resources</a></div></div>
    <div class="card stack"><h3>Privacy</h3><p class="small muted">Your team or school is never told you use GetGud. You can delete your account and data from the <a href="/account">Account page</a>.</p></div>
   </aside>
  </div></div>`;
};

/* ---------- content pages ---------- */
exports.teams = (f, sent) => `<div class="stack-lg">
 <div class="stack" style="gap:8px;max-width:70ch"><p class="eyebrow">For teams, schools, and communities</p><h1>Give your players someone to talk to.</h1><p class="lede">Most esports organizations cannot hire a psychologist. A GetGud program code gives every player on your roster access to one, and you only pay for sessions that happen.</p></div>
 <div class="two-col">
  <div class="stack">
   <ol class="how col"><li><b>Get a program code</b>We set up a code for your organization and agree a number of covered sessions per player.</li><li><b>Players book privately</b>They enter the code in their questionnaire. Sessions show as covered and no card is needed.</li><li><b>You see usage, never names</b>Your report shows how many sessions were used. It never shows who booked or why.</li></ol>
   <div class="note info"><b>Try it.</b> Create a player account and enter <span class="mono">${GG.CODE}</span> as the program code. Prices switch to covered and cost stops affecting the ranking.</div>
  </div>
  ${sent ? `<div class="card stack"><h2>Thanks. We have your details.</h2><p class="muted">In a live product, someone from GetGud would reply within two working days. This prototype stores your request and does not send email.</p><div><a class="btn" href="/">Back to home</a></div></div>`
  : `<form method="post" action="/teams" class="card stack"><h2>Ask about partnering</h2>${f.error ? `<p class="err" role="alert">${esc(f.error)}</p>` : ""}
   <label class="f" for="org">Organization<input type="text" id="org" name="org" maxlength="100" value="${esc(f.org || "")}"></label>
   <div class="two"><label class="f" for="contact">Your name<input type="text" id="contact" name="contact" maxlength="80" value="${esc(f.contact || "")}"></label><label class="f" for="temail">Email<input type="email" id="temail" name="email" maxlength="120" value="${esc(f.email || "")}"></label></div>
   <label class="f" for="size">Players<select id="size" name="size"><option>Under 10</option><option>10 to 30</option><option>30 to 100</option><option>More than 100</option></select></label>
   <label class="f" for="note">Anything we should know?<textarea id="note" name="note" rows="3" maxlength="800">${esc(f.note || "")}</textarea></label>
   <div><button class="btn primary">Send request</button></div></form>`}
 </div></div>`;
exports.crisis = () => `<div class="narrow stack-lg"><div class="stack" style="gap:8px"><p class="eyebrow">Crisis help</p><h1>If you are in danger or thinking about hurting yourself, reach a person now.</h1><p class="muted">GetGud books appointments. It is not a crisis service, and you should not wait for a session.</p></div>
 <div class="card stack"><h2>United States</h2><p><b>988 Suicide and Crisis Lifeline.</b> Call or text <b class="mono big-num">988</b>, any time. ${ext("https://988lifeline.org", "988lifeline.org")}</p><p><b>Crisis Text Line.</b> Text <b class="mono">HOME</b> to <b class="mono big-num">741741</b>. ${ext("https://www.crisistextline.org", "crisistextline.org")}</p></div>
 <div class="card stack"><h2>Everywhere else</h2><p>${ext("https://findahelpline.com", "findahelpline.com")} lists free, confidential lines in more than 175 countries.</p><p>In an emergency, call your local emergency number.</p></div></div>`;
exports.privacy = () => `<div class="narrow stack-lg prose"><div class="stack" style="gap:8px"><p class="eyebrow">Privacy</p><h1>What GetGud does with your information</h1><p class="muted">Written for players. This describes how the product is designed to work.</p></div>
 <div class="card stack"><h2>What we store</h2><p>Your name, email, a scrambled version of your password that cannot be read back, your questionnaire answers, and your bookings.</p>
 <h2>Who sees it</h2><p>A provider sees your answers only after you book with them. Your team, coach, or school never sees that you have an account, even when their program code pays. They receive a count of sessions used.</p>
 <h2>What we will not do</h2><p>We do not share or sell questionnaire answers to advertisers. In 2023 the US Federal Trade Commission ordered BetterHelp to pay $7.8 million for doing that. ${ext("https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising", "Read the FTC order")}.</p>
 <h2>Deleting your data</h2><p>The Account page has a delete button. It removes your account, answers, and bookings immediately.</p>
 <h2>Prototype limits</h2><p>This is a class project. Providers are fictional, no sessions take place, and no email or text messages are sent. Do not enter information you would not want stored on a student project server.</p></div></div>`;
exports.research = (user) => `<div class="narrow wide stack-lg">
 <div class="stack" style="gap:8px"><p class="eyebrow">The case for GetGud</p><h1>Players are struggling, and the help that exists was not built for them.</h1>
  <p class="muted" style="max-width:65ch">These figures come from published studies and public reporting. Samples in esports research are still small, so read them as signals. Each one links to its source.</p></div>
 <div class="stats">
  <div class="card stat"><b>78.7%</b><p>of 72 professional FPS players showed signs of anxiety or depression on a standard screening questionnaire.</p>${ext("https://eprints.chi.ac.uk/id/eprint/7278/", "Birch et al., 2022")}</div>
  <div class="card stat"><b>23.6%</b><p>of the same players reported moderately severe to severe depression symptoms.</p>${ext("https://eprints.chi.ac.uk/id/eprint/7278/", "Birch et al., 2022")}</div>
  <div class="card stat"><b>3–10 hrs</b><p>of daily practice among collegiate players. 56% reported eye fatigue and 36% wrist pain.</p>${ext("https://doi.org/10.1136/bmjsem-2018-000467", "DiFrancisco-Donoghue et al., 2019")}</div>
  <div class="card stat"><b>260+</b><p>schools in the National Association of Collegiate Esports.</p>${ext("https://en.wikipedia.org/wiki/National_Association_of_Collegiate_Esports", "NACE, 2024")}</div>
 </div>
 <div class="card stack"><h2>What the research says stresses players</h2>
  <p>In a study of 313 student competitors, esports stressors predicted worse sleep, burnout, and social anxiety, and each of those predicted worse mental health. Reviews find that losing and pressure to perform are the most common stressors, with team communication close behind. Our questionnaire asks about these directly.</p>
  <p class="src">${ext("https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9027719/", "Smith et al., 2022")} · ${ext("https://eprints.chi.ac.uk/id/eprint/4862/", "Smith, Birch &amp; Bright, 2019")} · ${ext("https://eprints.chi.ac.uk/id/eprint/7811/", "Leis et al., 2024")} · ${ext("https://www.frontiersin.org/articles/10.3389/fpsyg.2020.00628/pdf", "Poulus et al., 2020")}</p>
  <p>Players have also said so in public. Overwatch pro EFFECT retired in 2019 citing mental health, and League of Legends pro Danny stepped away before the 2022 LCS finals.</p>
  <p class="src">${ext("https://africa.espn.com/esports/story/_/id/26458054/citing-mental-health-fuel-effect-retires-overwatch", "ESPN, 2019")} · ${ext("https://sportsnaut.com/evil-geniuses-danny-taking-mental-health-break/", "Sportsnaut, 2022")}</p></div>
 <div class="card stack"><h2>What exists today, and the gap</h2>
  <div class="scroll"><table><thead><tr><th>Option</th><th>What it does</th><th>What is missing for players</th></tr></thead><tbody>
   <tr><td><b>BetterHelp, Talkspace</b></td><td>Licensed therapy by subscription, roughly $70 to $100 a week.</td><td>No way to find a therapist who understands competitive gaming.</td></tr>
   <tr><td><b>Healthy Gamer</b></td><td>Coaching for gamers, $35 to $75 a session.</td><td>Coaching only. It says itself that coaching is not a substitute for therapy.</td></tr>
   <tr><td><b>Take This, CheckPoint</b></td><td>Education, advocacy, and community resources.</td><td>They do not provide treatment.</td></tr>
   <tr><td><b>Rise Above The Disorder</b></td><td>Nonprofit that funds therapy for gamers.</td><td>Not focused on competitors or on esports-specific fit.</td></tr>
   <tr><td><b>Team psychologists</b></td><td>Staff at top organizations such as Tundra and Natus Vincere.</td><td>Only for players on those rosters.</td></tr>
   <tr><td><b>GetGud</b></td><td>Matches players to licensed clinicians and certified coaches who know esports.</td><td>Prototype stage. Sample providers only.</td></tr>
  </tbody></table></div>
  <p class="src">${ext("https://www.betterhelp.com/advice/general/betterhelp-insurance-tips-and-betterhelp-benefits/", "BetterHelp")} · ${ext("https://www.talkspace.com/blog/blog-how-much-talkspace-costs/", "Talkspace")} · ${ext("https://healthygamer.gg/products-services", "Healthy Gamer")} · ${ext("https://takethis.org/about", "Take This")} · ${ext("https://esports-news.co.uk/2022/11/07/sport-psychologist-tundra-coaching", "Tundra")}</p></div>
 <div class="card stack"><h2>Why the matching works the way it does</h2>
  <p><b>Fit matters.</b> Across 53 studies and more than 16,000 clients, people whose preferences were accommodated dropped out less and did better. A separate analysis of 295 studies found the client-therapist relationship is one of the most reliable predictors of outcome.</p>
  <p class="src">${ext("https://pubmed.ncbi.nlm.nih.gov/30091140/", "Swift et al., 2018")} · ${ext("https://www.societyforpsychotherapy.org/wp-content/uploads/2018/10/Fluckiger-et-al-2018.pdf", "Flückiger et al., 2018")}</p>
  <p><b>Some rules never bend.</b> A therapist can only see clients where they are licensed, though psychologists in the PSYPACT compact can work across member states. A Certified Mental Performance Consultant can train focus and composure and is not allowed to diagnose or treat a mental health condition. So licensing, language, format, and type of care are filters. Everything else is a weighted score the player can adjust.</p>
  <p class="src">${ext("https://appliedsportpsych.org/site/assets/files/30025/3-24_cmpccandidatehandbook_web.pdf", "AASP on the CMPC credential")} · ${ext("https://psypact.gov", "PSYPACT")}</p></div>
 <div class="row"><a class="btn primary" href="${user ? "/matches" : "/signup"}">${user ? "Back to my matches" : "Try GetGud"}</a></div></div>`;
exports.teamLog = (fb, s) => {
  const all = fb.flatMap(x => Object.values(x.ratings)), avg = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : "–", yes = fb.filter(x => x.book === "yes").length;
  return `<div class="stack-lg"><div class="stack" style="gap:8px"><p class="eyebrow">Team only</p><h1>Test results</h1><p class="muted">Our open question is whether matching gives useful results. Every tester who books is asked to rate their top three matches.</p></div>
  <div class="stats"><div class="card stat"><b>${s.users}</b><p>accounts created</p></div><div class="card stat"><b>${s.bookings}</b><p>bookings made</p></div><div class="card stat"><b>${avg}</b><p>average fit rating out of 5, from ${fb.length} tester${fb.length === 1 ? "" : "s"}</p></div><div class="card stat"><b>${fb.length ? Math.round(yes / fb.length * 100) + "%" : "–"}</b><p>said they would have booked</p></div></div>
  <div class="card stack"><h2>Feedback</h2>${fb.length ? `<div class="scroll"><table><thead><tr><th>Tester</th><th>Asked for</th><th>Top matches and ratings</th><th>Would book</th><th>Comment</th></tr></thead><tbody>${fb.map(x => `<tr><td>${esc(x.tester)}<br><span class="muted small">${new Date(x.when).toLocaleString("en-US")}</span></td><td>${esc(x.asked)}</td><td>${x.top.map(t => `${esc(t.name)} (${t.fit}%): <b>${x.ratings[t.id] ?? "–"}</b>`).join("<br>")}</td><td>${esc(x.book || "–")}</td><td>${esc(x.text || "")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">No feedback yet. It appears here after a tester books a session and fills in the short form on the confirmation page.</p>`}</div>
  <div class="card stack"><h2>Partner requests</h2>${s.leads.length ? `<div class="scroll"><table><thead><tr><th>Organization</th><th>Contact</th><th>Players</th><th>Note</th></tr></thead><tbody>${s.leads.map(l => `<tr><td>${esc(l.org)}</td><td>${esc(l.contact)}<br><span class="muted small">${esc(l.email)}</span></td><td>${esc(l.size)}</td><td>${esc(l.note)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">None yet.</p>`}</div></div>`;
};
exports.notFound = () => `<div class="narrow stack-lg"><div class="card stack"><p class="eyebrow">404</p><h1>That page is not here.</h1><p class="muted">The link may be old, or the page may need you to sign in.</p><div class="row"><a class="btn primary" href="/">Home</a><a class="btn" href="/providers">Find a provider</a></div></div></div>`;
exports.oops = () => `<div class="narrow stack-lg"><div class="card stack"><h1>Something broke on our side.</h1><p class="muted">Your account and bookings are safe. Go back and try again.</p><div><a class="btn primary" href="/">Home</a></div></div></div>`;
return module.exports;})();
