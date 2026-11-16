/* GetGud on a static host (GitHub Pages). The same pages and matching rules as the server version,
   with accounts, answers, and bookings kept in this browser's storage instead of a database. */
(function(){
"use strict";
const G=window.GG, V=window.GGViews, KEY="getgud_site_v1", root=document.getElementById("root");
let db=null; try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}
db=Object.assign({users:[],profiles:{},bookings:[],feedback:[],leads:[],session:null},db||{});
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}};
const rid=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>b.toString(16).padStart(2,"0")).join("");
const now=()=>new Date().toISOString();
async function hash(pw,salt){ // salted SHA-256, so the stored value is not the password itself
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+":"+pw)); return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join(""); }
const me=()=>db.users.find(u=>u.id===db.session)||null;
const prof=u=>{const p=u&&db.profiles[u.id]; return p?{a:G.cleanAnswers(p.answers),w:Object.assign(G.DEFAULT_W(),p.weights||{}),override:p.override||null}:null;};
const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=120;
const todayKey=()=>G.dkey(new Date());
const bookedMap=()=>{const m={}; db.bookings.filter(b=>b.status==="active"&&b.day>=todayKey()).forEach(b=>(m[b.provider_id]=m[b.provider_id]||[]).push(b.day+"|"+b.hour)); return m;};
const top3=p=>p&&G.complete(p.a)?G.runMatch(p.a,p.w,p.override).ranked.slice(0,3):[];
const str=(v,n)=>String(v||"").trim().slice(0,n);

let cur={path:"/",query:new URLSearchParams()};
function go(url){ if(url.startsWith("/#")) url="/?to="+url.slice(2); const h="#"+url; if(location.hash===h) route(); else location.hash=h; }
function show(title,body,opt){
  opt=opt||{}; const html=V.layout(title,body,Object.assign({user:me(),path:cur.path},opt));
  const paint=()=>{
  root.innerHTML=html.slice(html.indexOf("<body>")+6,html.indexOf('<script',html.indexOf("</footer>")));
  document.title=title;
  root.querySelectorAll('a[href^="/"]').forEach(a=>{const h=a.getAttribute("href"); a.setAttribute("href","#"+(h.startsWith("/#")?"/?to="+h.slice(2):h));});
  if(cur.path==="/signup"||cur.path==="/login"){const c=root.querySelector(".auth-card"); if(c) c.insertAdjacentHTML("beforeend",'<p class="small muted">Demo site. Your account is saved in this browser only, so it will not appear on another device.</p>');}
  window.GG_QUERY=cur.query.toString(); window.GGApp.init(opt.boot||{});
  const to=cur.query.get("to"), el=to&&document.getElementById(to);
  if(el) el.scrollIntoView(); else if(!opt.keep) window.scrollTo({top:0,behavior:"instant"});
  };
  if(!document.startViewTransition||opt.keep||matchMedia("(prefers-reduced-motion:reduce)").matches) return paint();
  const t=document.startViewTransition(paint); [t.ready,t.finished,t.updateCallbackDone].forEach(p=>p.catch(()=>{})); // cross-fade between pages
}
const needUser=()=>{ if(me()) return true; go("/login?next="+encodeURIComponent(cur.path)); return false; };
const needProfile=()=>{ if(!needUser()) return false; const p=prof(me()); if(p&&G.complete(p.a)) return true; go("/onboarding"); return false; };
const myBooking=id=>db.bookings.find(b=>b.id===id&&b.user_id===db.session)||null;

/* ---------- pages ---------- */
function GET(path,q){
  const u=me(), p=prof(u); let m;
  if(path==="/") return show("GetGud · Mental health support for esports athletes",V.home(u),{wide:true});
  if(path==="/research") return show("Research · GetGud",V.research(u));
  if(path==="/crisis") return show("Crisis help · GetGud",V.crisis());
  if(path==="/privacy") return show("Privacy · GetGud",V.privacy());
  if(path==="/forgot") return show("Reset password · GetGud",V.forgot());
  if(path==="/teams") return show("For teams and schools · GetGud",V.teams({},q.get("sent")==="1"));
  if(path==="/providers") return show("Find a provider · GetGud",V.providers(p));
  if((m=path.match(/^\/providers\/(\d+)$/))&&G.byId(m[1])){const pr=G.byId(m[1]); return show(pr.name+" · GetGud",V.provider(pr,u,p,new Set(bookedMap()[pr.id]||[])));}
  if(path==="/signup") return u?go("/dashboard"):show("Create your account · GetGud",V.signup({}));
  if(path==="/login") return u?go("/dashboard"):show("Sign in · GetGud",V.login({next:q.get("next")||"",notice:q.get("bye")?"You are signed out.":q.get("deleted")?"Your account and all of its data were deleted.":""}));
  if(path==="/account") return needUser()&&show("Account · GetGud",V.account(u,{ok:q.get("ok")||""}));
  if(path==="/onboarding") return needUser()&&show("Athlete questionnaire · GetGud",V.onboarding(),{boot:{page:"onboarding",a:p?p.a:G.DEFAULT_A(),editing:!!(p&&G.complete(p.a))}});
  if(path==="/matches") return needProfile()&&show("Your matches · GetGud",V.matches(),{boot:{page:"matches",a:p.a,w:p.w,override:p.override,booked:bookedMap(),name:u.name}});
  if((m=path.match(/^\/book\/(\d+)$/))&&G.byId(m[1])){ if(!needProfile()) return; const pr=G.byId(m[1]); const b=q.get("reschedule")&&myBooking(q.get("reschedule"));
    return show("Book with "+pr.name+" · GetGud",V.book(pr),{boot:{page:"book",pid:pr.id,a:p.a,booked:bookedMap()[pr.id]||[],reschedule:b&&b.status==="active"?{id:b.id,day:b.day,hour:b.hour,type:b.type,fmt:b.fmt}:null}}); }
  if(m=path.match(/^\/booking\/(\w+)$/)){ if(!needUser()) return; const b=myBooking(m[1]); if(b) return show("Booking confirmed · GetGud",V.booking(b,u,p,top3(p),{gave:db.feedback.some(f=>f.user_id===u.id),saved:q.get("fb")==="1",fbError:q.get("fb")==="0"})); }
  if(path==="/dashboard") { if(!needUser()) return; const t=top3(p); const all=db.bookings.filter(b=>b.user_id===u.id).sort((a,b)=>a.day.localeCompare(b.day)||a.hour-b.hour);
    return show("Dashboard · GetGud",V.dashboard(u,p,all,t.length?t:null,todayKey(),q.get("cancelled")==="1")); }
  if(path==="/team-log"&&q.get("key")==="getgud-team") return show("Team log · GetGud",V.teamLog(db.feedback.slice().reverse().map(f=>Object.assign({},f.payload,{tester:f.tester,when:f.created})),{users:db.users.length,bookings:db.bookings.length,leads:db.leads.slice().reverse()}));
  show("Not found · GetGud",V.notFound());
}
/* ---------- form posts ---------- */
async function POST(path,b){
  const u=me(), p=prof(u); let m;
  if(path==="/signup"){ const name=str(b.name,40), email=str(b.email,120).toLowerCase(), pw=String(b.password||"");
    const fail=error=>show("Create your account · GetGud",V.signup({name,email,error}));
    if(!name) return fail("Add a name or gamertag.");
    if(!validEmail(email)) return fail("Enter an email address like name@example.com.");
    if(pw.length<8) return fail("Use a password with at least 8 characters.");
    if(b.age!=="on") return fail("GetGud is for players 18 and older. Younger players need a guardian to sign up with them.");
    if(b.terms!=="on") return fail("Please agree to the privacy terms to continue.");
    if(db.users.some(x=>x.email===email)) return fail("An account with that email already exists. Sign in instead.");
    const salt=rid()+rid(), id=rid()+rid(); db.users.push({id,name,email,salt,pass_hash:await hash(pw,salt),created:now()}); db.session=id; save(); return go("/onboarding"); }
  if(path==="/login"){ const email=str(b.email,120).toLowerCase(), x=db.users.find(x=>x.email===email);
    if(!x||x.pass_hash!==await hash(String(b.password||""),x.salt)) return show("Sign in · GetGud",V.login({email,next:b.next||"",error:"That email and password do not match an account."}));
    db.session=x.id; save(); return go(/^\/[a-z]/i.test(b.next||"")?b.next:"/dashboard"); }
  if(path==="/logout"){ db.session=null; save(); return go("/login?bye=1"); }
  if(path==="/teams"){ const f={org:str(b.org,100),contact:str(b.contact,80),email:str(b.email,120),size:str(b.size,20),note:str(b.note,800)};
    if(!f.org||!f.contact||!validEmail(f.email)) return show("For teams and schools · GetGud",V.teams(Object.assign(f,{error:"Add your organization, your name, and a valid email."}),false));
    db.leads.push(f); save(); return go("/teams?sent=1"); }
  if(!u) return go("/login");
  if(path==="/account"){ const name=str(b.name,40), email=str(b.email,120).toLowerCase();
    const fail=error=>show("Account · GetGud",V.account(Object.assign({},u,{name,email}),{error}));
    if(!name) return fail("Add a name or gamertag."); if(!validEmail(email)) return fail("Enter a valid email address.");
    if(db.users.some(x=>x.email===email&&x.id!==u.id)) return fail("Another account already uses that email.");
    u.name=name; u.email=email; save(); return go("/account?ok=profile"); }
  if(path==="/account/password"){ const pw=String(b.password||"");
    if(u.pass_hash!==await hash(String(b.current||""),u.salt)) return show("Account · GetGud",V.account(u,{pwError:"Your current password is not right."}));
    if(pw.length<8) return show("Account · GetGud",V.account(u,{pwError:"Use a new password with at least 8 characters."}));
    u.salt=rid()+rid(); u.pass_hash=await hash(pw,u.salt); save(); return go("/account?ok=password"); }
  if(path==="/account/delete"){
    if(u.pass_hash!==await hash(String(b.current||""),u.salt)) return show("Account · GetGud",V.account(u,{delError:"Enter your password to delete the account."}));
    db.users=db.users.filter(x=>x.id!==u.id); delete db.profiles[u.id]; db.bookings=db.bookings.filter(x=>x.user_id!==u.id); db.session=null; save(); return go("/login?deleted=1"); }
  if(m=path.match(/^\/booking\/(\w+)\/(reminders|cancel)$/)){ const bk=myBooking(m[1]); if(!bk) return go("/dashboard");
    if(m[2]==="cancel"){ if(bk.status==="active") bk.status="cancelled"; save(); return go("/dashboard?cancelled=1"); }
    bk.reminders=["email","sms","discord"].filter(k=>b[k]==="on").join(","); save(); cur.query=new URLSearchParams(); return GET("/booking/"+bk.id,cur.query); }
  if(path==="/feedback"){ const t=top3(p), back="/booking/"+(b.booking||""); if(!t.length) return go("/dashboard");
    const ratings={}; let ok=true; t.forEach(r=>{const v=+b["r"+r.p.id]; if(v>=1&&v<=5) ratings[r.p.id]=v; else ok=false;});
    if(!ok) return go(back+"?fb=0&to=feedback");
    const a=p.a; db.feedback.push({user_id:u.id,tester:u.name,created:now(),payload:{asked:a.concerns.map(c=>G.SHORT[c]).join(", ")+" · "+a.games.map(g=>G.GAMES[g]).join(", ")+" · "+G.STATE_NAME[a.state],top:t.map(r=>({id:r.p.id,name:r.p.name,fit:r.total})),ratings,book:["yes","maybe","no"].includes(b.book)?b.book:"",text:str(b.text,600)}});
    save(); return go(back+"?fb=1&to=feedback"); }
  go("/dashboard");
}
/* ---------- what the interactive screens call instead of a server ---------- */
window.GG_STATIC=true;
window.GG_NAV=go;
window.GG_POST=async (url,body)=>{
  const u=me(), p=prof(u); const fail=m=>{throw new Error(m);};
  if(!u) fail("Sign in first.");
  if(url==="/api/profile"){ const a=G.cleanAnswers(body.a); if(!G.complete(a)) fail("The questionnaire is missing required answers.");
    const old=db.profiles[u.id]||{}; db.profiles[u.id]={answers:a,weights:old.weights||null,override:body.resetCare?null:(old.override||null)}; save(); return {ok:true}; }
  if(url==="/api/prefs"){ if(!db.profiles[u.id]) fail("Finish the questionnaire first.");
    db.profiles[u.id].weights=body.w; db.profiles[u.id].override=["clinical","either","perf"].includes(body.override)?body.override:null; save(); return {ok:true}; }
  if(url==="/api/book"){ if(!p||!G.complete(p.a)) fail("Finish the questionnaire first.");
    const pr=G.byId(body.pid), day=String(body.day||""), hour=+body.hour, type=body.type==="intro"?"intro":"full";
    if(!pr||!G.days().some(d=>G.dkey(d)===day)) fail("Pick a day in the next two weeks.");
    const blocked=G.eligible(pr,p.a,"either"); if(blocked) fail(blocked);
    if(type==="intro"&&!pr.intro) fail("This provider does not offer intro calls.");
    if(!pr.fmt.includes(body.fmt)) fail("Pick how you want to meet.");
    const old=body.reschedule&&myBooking(body.reschedule), taken=new Set(bookedMap()[pr.id]||[]);
    if(old&&old.status==="active"&&old.provider_id===pr.id) taken.delete(old.day+"|"+old.hour);
    const s=G.slotsFor(pr,G.fromKey(day),[],taken).find(x=>x.h===hour);
    if(!s||s.taken) fail("Someone just took that time. Pick another one.");
    if(old&&old.status==="active") old.status="rescheduled";
    const id=rid(); db.bookings.push({id,user_id:u.id,provider_id:pr.id,day,hour,type,fmt:body.fmt,status:"active",reminders:"email",created:now()}); save(); return {ok:true,id}; }
  fail("Something went wrong. Try again.");
};
/* ---------- router ---------- */
function route(){
  const h=location.hash; if(h&&!h.startsWith("#/")) return; // in-page anchors such as #main
  const [path,qs]=(h.slice(1)||"/").split("?"); cur={path:path.replace(/\/$/,"")||"/",query:new URLSearchParams(qs||"")};
  GET(cur.path,cur.query);
}
document.addEventListener("click",e=>{ const a=e.target.closest("a"); if(!a||a.target==="_blank"||e.metaKey||e.ctrlKey) return; const h=a.getAttribute("href")||"";
  if(h.startsWith("/")){ e.preventDefault(); go(h); } });
document.addEventListener("submit",e=>{ const f=e.target, act=f.getAttribute("action")||""; if(!act.startsWith("/")) return; e.preventDefault();
  const b={}; new FormData(f).forEach((v,k)=>{b[k]=v;}); cur.path=act==="/login"||act==="/signup"||act==="/teams"||act.startsWith("/account")?act.replace(/\/(password|delete)$/,""):cur.path;
  POST(act,b).catch(()=>show("Something broke · GetGud",V.oops())); });
window.addEventListener("hashchange",route);
route();
})();
