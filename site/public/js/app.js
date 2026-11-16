/* GetGud client. Small page behaviours plus the three interactive screens: questionnaire, matches, booking. */
(function(){
"use strict";
const G=window.GG, $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nav=u=>window.GG_NAV?window.GG_NAV(u):(location.href=u);
const post=(url,body)=>window.GG_POST?window.GG_POST(url,body):fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(async r=>{const j=await r.json().catch(()=>({})); if(!r.ok) throw new Error(j.error||"Something went wrong. Try again."); return j;});
const debounce=(fn,ms)=>{let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a),ms);};};
const ava=(p,lg)=>`<div class="ava ${lg?"lg":""}" aria-hidden="true">${G.initials(p.name)}</div>`;
const kindTag=p=>p.kind==="perf"?'<span class="tag">Performance coach</span>':p.meds?'<span class="tag good">Psychiatrist · can prescribe</span>':p.kind==="both"?'<span class="tag good">Licensed + CMPC</span>':'<span class="tag good">Licensed clinician</span>';

/* ---- motion helpers ---- */
const reduced=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion:reduce)").matches);
const SPRING="cubic-bezier(.32,.72,0,1)", OUT="cubic-bezier(.16,1,.3,1)", BOUNCE="cubic-bezier(.34,1.56,.64,1)";
const pop=el=>{if(el&&!reduced&&el.animate) el.animate([{transform:"scale(.9)"},{transform:"scale(1)"}],{duration:450,easing:BOUNCE});};
const buzz=()=>{try{if(navigator.vibrate) navigator.vibrate(8);}catch(e){}};
const paintRanges=()=>document.querySelectorAll("input[type=range]").forEach(r=>r.style.setProperty("--p",(r.value-r.min)/((r.max-r.min)||1)));
function count(b){const m=b.textContent.match(/^(\d+(?:\.\d+)?)(\D*)$/); if(!m) return; const to=+m[1], dp=(m[1].split(".")[1]||"").length, t0=performance.now();
  const f=t=>{const k=Math.min(1,Math.max(0,(t-t0)/1200)); b.textContent=(to*(1-Math.pow(1-k,4))).toFixed(dp)+m[2]; if(k<1) requestAnimationFrame(f);}; requestAnimationFrame(f);}
function reveal(){ if(reduced||!("IntersectionObserver" in window)) return; // sections ease in as they scroll into view
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting) return; const el=e.target; io.unobserve(el); el.classList.add("in");
    const b=el.matches(".stat")&&el.querySelector("b"); if(b) count(b); setTimeout(()=>el.classList.remove("rv","in"),1500);}),{rootMargin:"0px 0px -6% 0px"});
  document.querySelectorAll(".band .stat,.how>li,.help,.band .big,.two-col .card").forEach(el=>{el.style.setProperty("--d",Array.prototype.indexOf.call(el.parentNode.children,el)%4); el.classList.add("rv"); io.observe(el);}); }
function tilt(){const c=$(".hero-card"); if(!c||reduced||!matchMedia("(hover:hover)").matches) return; const h=c.parentNode, cl=v=>Math.max(-.5,Math.min(.5,v));
  h.addEventListener("pointermove",e=>{const r=c.getBoundingClientRect(); c.style.transform=`perspective(1200px) rotateY(${cl((e.clientX-r.left)/r.width-.5)*5}deg) rotateX(${-cl((e.clientY-r.top)/r.height-.5)*5}deg)`;});
  h.addEventListener("pointerleave",()=>{c.style.transform="";});}
function flip(fn){ // match cards glide to their new rank instead of jumping
  const old=new Map(); if(!reduced) document.querySelectorAll("#results .match").forEach(m=>old.set(m.dataset.id,{top:m.getBoundingClientRect().top,w:Array.from(m.querySelectorAll(".hp i"),i=>i.style.width)}));
  fn(); if(reduced||!document.body.animate) return;
  document.querySelectorAll("#results .match").forEach(m=>{const o=old.get(m.dataset.id);
    if(!o){ if(old.size) m.animate([{opacity:0,transform:"scale(.96)"},{opacity:1,transform:"none"}],{duration:380,easing:OUT}); return; }
    const dy=o.top-m.getBoundingClientRect().top; if(Math.abs(dy)>1) m.animate([{transform:`translateY(${dy}px)`},{transform:"none"}],{duration:520,easing:SPRING});
    m.querySelectorAll(".hp i").forEach((i,k)=>{const a=o.w[k], b=i.style.width; if(a&&a!==b) i.animate([{width:a},{width:b}],{duration:420,easing:OUT});}); }); }

let wired=false;
function init(boot){
const app=document.getElementById("app");
/* ---- site-wide ---- */
const burger=$(".burger"); if(burger) burger.addEventListener("click",()=>{const open=burger.getAttribute("aria-expanded")!=="true"; burger.setAttribute("aria-expanded",open); $("#nav").classList.toggle("open",open); document.documentElement.classList.toggle("lock",open);});
if(!wired) document.addEventListener("click",e=>{const b=e.target.closest("[data-showpw]"); if(!b) return; const i=document.getElementById(b.dataset.showpw); const show=i.type==="password"; i.type=show?"text":"password"; b.textContent=show?"Hide":"Show";});
const barf=()=>{const bar=$(".bar"); if(bar) bar.classList.toggle("scrolled",window.scrollY>8);}; barf(); if(!wired) window.addEventListener("scroll",barf,{passive:true});
if(!wired){
  new MutationObserver(paintRanges).observe(document.body,{childList:true,subtree:true});
  document.addEventListener("input",e=>{if(e.target.type==="range") paintRanges();});
  document.addEventListener("click",e=>{if(e.target.closest(".chip,.slot,.day,.opt,.seg button,.persona,.tabs a")) buzz();});
}
document.documentElement.classList.remove("lock"); paintRanges(); reveal(); tilt();
wired=true;

/* ---- provider directory filters ---- */
const grid=$("#pgrid");
if(grid){
  const fc=$("#f-concern"),fg=$("#f-game"),fk=$("#f-kind"),fp=$("#f-price"), qs=new URLSearchParams(window.GG_QUERY!=null?window.GG_QUERY:location.search);
  if(qs.get("concern")&&G.CONCERNS[qs.get("concern")]) fc.value=qs.get("concern");
  const run=()=>{let n=0; $("#f-price-o").textContent="$"+fp.value;
    grid.querySelectorAll(".pcard").forEach(c=>{const d=c.dataset;
      const ok=(!fc.value||d.spec.split(" ").includes(fc.value))&&(!fg.value||d.games.split(" ").includes(fg.value)||d.games==="")&&(!fk.value||(fk.value==="licensed"&&d.kind!=="perf")||(fk.value==="perf"&&d.kind!=="clinical")||(fk.value==="meds"&&d.meds==="1"))&&(+d.price<=+fp.value);
      c.hidden=!ok; if(ok) n++;});
    $("#count").textContent=n+" provider"+(n===1?"":"s"); $("#empty").hidden=n>0;};
  [fc,fg,fk].forEach(el=>el.addEventListener("change",run)); fp.addEventListener("input",run); run();
}

/* ---- shared chip renderer ---- */
let A=boot.a;
const chips=(field,opts,multi,cls)=>'<div class="chips" role="group">'+Object.entries(opts).map(([k,v])=>{
  const on=multi?A[field].includes(k):A[field]===k;
  return `<button type="button" class="chip ${cls||""}" data-act="chip" data-field="${field}" data-val="${k}" data-multi="${multi?1:0}" aria-pressed="${on}">${esc(v)}</button>`}).join("")+"</div>";
function toggleChip(t){const f=t.dataset.field,val=t.dataset.val;
  if(t.dataset.multi==="1"){const arr=A[f],i=arr.indexOf(val); if(i>=0) arr.splice(i,1); else arr.push(val); if(f==="concerns"&&!arr.includes(A.top)) A.top=arr[0]||"";} else A[f]=val;}

/* =========================== QUESTIONNAIRE =========================== */
if(boot.page==="onboarding"){
  let step=0, err="", busy=false, dir="";
  const view=()=>{const a=A,s=step; let body="";
   if(s===0) body=`
    <h2>Where you are and how you want to talk</h2>
    <div class="two">
     <label class="f" for="in-state">Where do you live?<span class="h">Therapists can only see clients in places where they hold a license.</span>
      <select id="in-state" data-bind="state"><option value="">Choose a state</option>${G.STATES.map(([c,n])=>`<option value="${c}" ${a.state===c?"selected":""}>${n}</option>`).join("")}<option value="INTL" ${a.state==="INTL"?"selected":""}>Outside the US</option></select></label>
     <label class="f" for="in-lang">Session language<span class="h">The language you want to speak in sessions.</span>
      <select id="in-lang" data-bind="lang">${Object.entries(G.LANGS).map(([k,v])=>`<option value="${k}" ${a.lang===k?"selected":""}>${v}</option>`).join("")}</select></label>
    </div>
    <div class="q"><p class="ql">How do you want to meet?</p><p class="qh">Pick every option you are comfortable with.</p>${chips("formats",G.FORMATS,true)}</div>`;
   if(s===1) body=`
    <h2>Your competitive life</h2>
    <div class="q"><p class="ql">Where are you competing right now?</p>${chips("level",G.LEVELS,false)}</div>
    <div class="q"><p class="ql">Which games?</p><p class="qh">Pick all that apply. Providers who know your title rank higher.</p>${chips("games",G.GAMES,true)}</div>
    <div class="two">
     <label class="f" for="in-role">Role or main, if you have one<span class="h">Optional. For example IGL, support, jungle.</span><input type="text" id="in-role" data-bind="role" value="${esc(a.role)}" maxlength="40"></label>
     <label class="f" for="in-hours"><span class="lr">Practice and play per week <output id="o-hours">${a.hours} hrs</output></span><input type="range" id="in-hours" data-bind="hours" data-out="o-hours" data-suffix=" hrs" min="0" max="90" step="1" value="${a.hours}"></label>
    </div>`;
   if(s===2) body=`
    <h2>What is going on</h2>
    <div class="q"><p class="ql">What do you want help with?</p><p class="qh">Pick all that apply.</p>${chips("concerns",G.CONCERNS,true)}</div>
    ${a.concerns.length>1?`<div class="q"><p class="ql">Which one matters most right now?</p><p class="qh">It counts double when we rank providers.</p>${chips("top",Object.fromEntries(a.concerns.map(c=>[c,G.CONCERNS[c]])),false,"top")}</div>`:""}
    <div class="q"><p class="ql">How long has this been going on?</p>${chips("duration",{weeks:"A few weeks",months:"A few months",year:"A year or more"},false)}</div>
    <div class="two">
     <label class="f" for="in-ip"><span class="lr">How much is it hurting your play? <output id="o-ip">${a.impactPlay} of 5</output></span><input type="range" id="in-ip" data-bind="impactPlay" data-out="o-ip" data-suffix=" of 5" min="1" max="5" value="${a.impactPlay}"></label>
     <label class="f" for="in-il"><span class="lr">And life outside the game? <output id="o-il">${a.impactLife} of 5</output></span><input type="range" id="in-il" data-bind="impactLife" data-out="o-il" data-suffix=" of 5" min="1" max="5" value="${a.impactLife}"></label>
    </div>
    <div class="q"><p class="ql">Right now, are you in crisis or thinking about hurting yourself?</p>${chips("crisis",{no:"No",yes:"Yes"},false)}
     ${a.crisis==="yes"?`<div class="note safe"><b>Please reach out now. You do not have to wait for an appointment.</b> Call or text <b>988</b> in the US, or text <b>HOME to 741741</b>. Outside the US, <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> lists local lines. You can still continue here, and we will only show licensed clinicians.</div>`:""}</div>
    <div class="q"><p class="ql">What kind of help are you looking for?</p>
     ${chips("care",{therapy:"Therapy with a licensed clinician",coaching:"Mental performance coaching",unsure:"Not sure, help me choose"},false)}
     <p class="qh">Therapy treats things like depression, anxiety, and insomnia. Coaching trains skills like focus and composure and cannot treat a mental health condition.</p></div>
    <label class="check" for="in-meds"><input type="checkbox" id="in-meds" data-bindc="meds" ${a.meds?"checked":""}><span>I want to talk to someone who can prescribe medication.</span></label>`;
   if(s===3) body=`
    <h2>What works for you</h2>
    <div class="q"><p class="ql">When can you do sessions?</p><p class="qh">Pick all that work. Times that fit are marked on the booking calendar.</p>${chips("times",G.TIMES,true)}</div>
    <div class="two">
     <label class="f" for="in-budget"><span class="lr">Most you can pay per session <output id="o-budget">$${a.budget}</output></span><input type="range" id="in-budget" data-bind="budget" data-out="o-budget" data-prefix="$" min="40" max="300" step="5" value="${a.budget}"><span class="h">Typical self-pay therapy in the US runs about $100 to $200 a session.</span></label>
     <label class="f" for="in-code">Team or school program code<span class="h">If your organization partners with GetGud, sessions are covered. Try <span class="mono">${G.CODE}</span>.</span><input type="text" id="in-code" data-bind="code" value="${esc(a.code)}" maxlength="24" autocapitalize="characters"></label>
    </div>
    <div class="q"><p class="ql">Do you have a preference for who you talk to?</p>${chips("gender",{any:"No preference",woman:"A woman",man:"A man",nonbinary:"A nonbinary provider"},false)}</div>
    <div class="q"><p class="ql">What style suits you?</p>${chips("style",{any:"No preference",structured:"Structured, with drills and homework",talk:"Open conversation"},false)}</div>`;
   return `<div class="stack-lg">
    <div class="stack" style="gap:10px"><p class="eyebrow">Athlete questionnaire · part ${s+1} of 4</p><div class="steps" aria-hidden="true">${[0,1,2,3].map(i=>`<span class="${i<=s?"on":""}"></span>`).join("")}</div></div>
    <div class="card stack-lg qcard ${dir}">${body}
     ${err?`<p class="err" role="alert">${esc(err)}</p>`:""}
     <div class="row spread">${s===0?(boot.editing?`<a class="btn" href="/matches">Cancel</a>`:`<span></span>`):`<button class="btn" data-act="back">Back</button>`}<button class="btn primary" data-act="next" ${busy?"disabled":""}>${s===3?(busy?"Saving…":"Show my matches"):"Continue"}</button></div>
    </div>
    ${s===0&&!boot.editing?`<details class="samples"><summary>Just exploring? Fill it in with a sample athlete</summary><div class="personas">${G.PERSONAS.map((x,i)=>`<button class="persona" data-act="persona" data-i="${i}"><span class="ava" aria-hidden="true">${x.acct.name[0]}</span><span><b>${esc(x.label)}</b><br><span class="muted small">${esc(x.sub)}</span></span></button>`).join("")}</div></details>`:""}
   </div>`;};
  const render=keep=>{app.innerHTML=view(); dir=""; if(!keep) window.scrollTo({top:0,behavior:"instant"});};
  const validate=()=>{const a=A;
    if(step===0){ if(!a.state) return "Choose where you live so we can check licensing."; if(!a.formats.length) return "Pick at least one way to meet."; }
    if(step===1){ if(!a.level) return "Pick where you are competing right now."; if(!a.games.length) return "Pick at least one game."; }
    if(step===2){ if(!a.concerns.length) return "Pick at least one thing you want help with."; if(!a.top||!a.concerns.includes(a.top)) a.top=a.concerns[0]; }
    return "";};
  const finish=()=>{busy=true; err=""; render(true); post("/api/profile",{a:A,resetCare:true}).then(()=>{nav("/matches");}).catch(e=>{busy=false; err=e.message; render(true);});};
  app.addEventListener("click",e=>{const t=e.target.closest("[data-act]"); if(!t) return;
    switch(t.dataset.act){
      case "chip": { toggleChip(t); const f=t.dataset.field, sel=c=>t.dataset.multi==="1"?A[f].includes(c.dataset.val):A[f]===c.dataset.val;
        if(err||f==="concerns"||f==="crisis"){ err=""; render(true); pop(app.querySelector('.chip[data-field="'+f+'"][data-val="'+t.dataset.val+'"]')); } // these change what is on the page
        else t.parentNode.querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",sel(c)));
        break; }
      case "back": err=""; step--; dir="bwd"; render(); break;
      case "next": err=validate(); if(err){render(true); break;} if(step<3){step++; dir="fwd"; render();} else finish(); break;
      case "persona": A=G.cleanAnswers(G.PERSONAS[+t.dataset.i].a); step=3; finish(); break;
    }});
  app.addEventListener("input",e=>{const t=e.target; if(!t.dataset.bind) return; A[t.dataset.bind]=t.type==="range"?+t.value:t.value; if(t.dataset.out) document.getElementById(t.dataset.out).textContent=(t.dataset.prefix||"")+t.value+(t.dataset.suffix||"");});
  app.addEventListener("change",e=>{const t=e.target; if(t.dataset.bindc) A[t.dataset.bindc]=t.checked;});
  render();
}

/* =========================== MATCHES =========================== */
if(boot.page==="matches"){
  let W=boot.w, override=boot.override, compare=[], showEx=false;
  const booked=id=>new Set(boot.booked[id]||[]);
  const savePrefs=debounce(()=>post("/api/prefs",{w:W,override}).catch(()=>{}),500);
  const saveAnswers=debounce(()=>post("/api/profile",{a:A}).catch(()=>{}),600);
  const results=()=>{const {cm,ranked,excluded}=G.runMatch(A,W,override); let h="";
   if(compare.length===2){const [x,y]=compare.map(id=>ranked.find(r=>r.p.id===id)).filter(Boolean);
    if(x&&y){const row=(l,f)=>`<tr><th scope="row">${l}</th><td>${f(x)}</td><td>${f(y)}</td></tr>`;
    h+=`<div class="card stack compare"><div class="row spread"><h3>Side by side</h3><button class="btn ghost" data-act="clearcmp">Clear</button></div><div class="scroll"><table>
     <thead><tr><th></th><th>${esc(x.p.name)}</th><th>${esc(y.p.name)}</th></tr></thead><tbody>
     ${row("Fit",r=>`<b>${r.total}%</b>`)}${row("Credentials",r=>esc(r.p.cred))}${row("Cost",r=>G.priceLine(r.p,A))}
     ${row("Specialties",r=>r.p.spec.map(c=>A.concerns.includes(c)?`<b>${G.SHORT[c]}</b>`:G.SHORT[c]).join(", "))}
     ${row("Games",r=>r.p.games.length?r.p.games.map(g=>G.GAMES[g]).join(", "):"General esports")}
     ${row("Approach",r=>r.p.mods.join(", "))}${row("Next opening",r=>G.nextOpen(r.p,booked(r.p.id)))}
     ${row("",r=>`<a class="btn sm primary" href="/book/${r.p.id}">Book</a>`)}
     </tbody></table></div><p class="muted small">Specialties in bold are ones you asked for.</p></div>`;}}
   if(!ranked.length) h+=`<div class="card stack"><h3>No one fits these settings yet</h3><p class="muted">${A.state==="INTL"?"Our sample clinicians are licensed in the US only. Performance coaches can work with you anywhere.":"Every sample provider was ruled out by licensing, language, or session format."}</p>
     <div class="row">${cm.mode==="clinical"?`<button class="btn" data-act="care" data-val="either">Include performance coaches</button>`:""}<a class="btn" href="/onboarding">Change my answers</a></div>
     <p class="small muted">If you need to talk to someone today, the <a href="/crisis">crisis page</a> lists free lines.</p></div>`;
   h+=ranked.map((r,i)=>`<article class="match ${i===0?"first":""}" data-id="${r.p.id}">
     ${ava(r.p)}
     <div class="grow"><p class="rank">${i===0?'<span class="best">Best fit</span>':"#"+(i+1)}</p>
      <h3><a href="/providers/${r.p.id}">${esc(r.p.name)}</a> <span class="pro">${r.p.pro}</span></h3>
      <p class="small muted">${esc(r.p.cred)}</p>
      <div class="row tags">${kindTag(r.p)}<span class="tag">${G.priceLine(r.p,A)}</span><span class="tag demo">Sample</span></div>
      <ul class="why">${r.why.slice(0,4).map(w=>`<li>${esc(w)}</li>`).join("")}${r.minus.slice(0,2).map(w=>`<li class="minus">${esc(w)}</li>`).join("")}</ul>
     </div>
     <div class="fit"><div><b>${r.total}%</b><span>fit</span></div><div class="hp"><i style="width:${r.total}%"></i></div></div>
     <div class="parts">${Object.keys(G.PART_LABEL).map(k=>`<div class="part">${G.PART_LABEL[k]}<div class="hp"><i style="width:${Math.round(r.parts[k]*100)}%"></i></div></div>`).join("")}</div>
     <div class="acts"><a class="btn sm primary" href="/book/${r.p.id}">Book</a><a class="btn sm" href="/providers/${r.p.id}">View profile</a>
      <label class="check small cmp" for="cmp-${r.p.id}"><input type="checkbox" id="cmp-${r.p.id}" data-cmp="${r.p.id}" ${compare.includes(r.p.id)?"checked":""}>Compare</label>
      <span class="small muted next">Next: ${G.nextOpen(r.p,booked(r.p.id))}</span></div>
    </article>`).join("");
   if(excluded.length) h+=`<div class="panel stack" style="gap:6px"><div class="row spread"><b>${excluded.length} provider${excluded.length>1?"s":""} ruled out</b><button class="btn ghost" data-act="toggleEx">${showEx?"Hide":"Show why"}</button></div>
     ${showEx?excluded.map(e=>`<div class="ex"><span><b>${esc(e.p.name)}</b> <span class="muted">${esc(e.p.cred)}</span></span><span class="muted">${esc(e.reason)}</span></div>`).join(""):`<p class="small muted">Ruled out by licensing, language, format, or the type of care you need. These are hard rules and never trade off against the score.</p>`}</div>`;
   return {html:h,cm,n:ranked.length};};
  const view=()=>{const r=results(),cm=r.cm, auto=G.careMode(A,null).mode;
   return `<div class="stack-lg">
   <div class="stack" style="gap:8px"><p class="eyebrow">Your matches</p><h1 id="headline">${esc(boot.name)}, ${r.n===1?"1 provider fits":r.n+" providers fit"}.</h1>
    <p class="muted">Ranked for ${A.concerns.map(c=>G.SHORT[c]).join(", ")} · ${A.games.map(g=>G.GAMES[g]).join(", ")} · ${G.LEVELS[A.level]} · ${G.STATE_NAME[A.state]}. <a href="/onboarding">Change my answers</a></p></div>
   <div class="mgrid">
    <aside class="side stack">
     <div class="card stack">
      <div><h3>Type of care</h3><p class="small muted">${esc(cm.why)}</p></div>
      <div class="seg" role="group" aria-label="Type of care"><i class="thumb" style="--i:${["clinical","either","perf"].indexOf(cm.mode)}"></i>${[["clinical","Licensed"],["either","Both"],["perf","Coaching"]].map(([k,l])=>`<button data-act="care" data-val="${k}" aria-pressed="${cm.mode===k}">${l}</button>`).join("")}</div>
      ${override&&override!==auto?`<button class="btn ghost" data-act="care" data-val="">Use GetGud's recommendation</button>`:""}
     </div>
     <div class="card stack">
      <div><h3>What matters most</h3><p class="small muted">Drag a slider and the list re-ranks as you move.</p></div>
      ${Object.keys(G.PART_LABEL).map(k=>`<div class="wrow"><label for="w-${k}">${G.PART_LABEL[k]}</label><output id="wo-${k}" class="mono">${W[k]}</output><input type="range" id="w-${k}" data-w="${k}" min="0" max="100" step="5" value="${W[k]}"></div>`).join("")}
      <button class="btn ghost" data-act="resetw">Reset to default</button>
     </div>
     <div class="card stack">
      <h3>Quick changes</h3>
      <label class="f" for="q-budget"><span class="lr">Budget per session <output id="qo-budget">$${A.budget}</output></span><input type="range" id="q-budget" data-quick="budget" min="40" max="300" step="5" value="${A.budget}"></label>
      <div class="q"><p class="ql small">Times</p>${chips("times",G.TIMES,true)}</div>
      <label class="check small" for="q-meds"><input type="checkbox" id="q-meds" data-bindc="meds" ${A.meds?"checked":""}><span>Needs to prescribe medication</span></label>
     </div>
    </aside>
    <section class="stack" id="results" aria-live="polite">${r.html}</section>
   </div></div>`;};
  const render=()=>flip(()=>{app.innerHTML=view();});
  const refresh=()=>flip(()=>{const r=results(); $("#results").innerHTML=r.html; $("#headline").textContent=boot.name+", "+(r.n===1?"1 provider fits":r.n+" providers fit")+".";});
  app.addEventListener("click",e=>{const t=e.target.closest("[data-act]"); if(!t) return;
    switch(t.dataset.act){
      case "chip": toggleChip(t); t.setAttribute("aria-pressed",A.times.includes(t.dataset.val)); refresh(); saveAnswers(); break;
      case "care": { const th=$(".seg .thumb"), was=th?th.style.getPropertyValue("--i"):null; override=t.dataset.val||null; render(); savePrefs();
        const nt=$(".seg .thumb"); if(nt&&was!=null){const to=nt.style.getPropertyValue("--i"); nt.style.transition="none"; nt.style.setProperty("--i",was); nt.offsetWidth; nt.style.transition=""; nt.style.setProperty("--i",to);} // slide from the old choice
        break; }
      case "resetw": W=G.DEFAULT_W(); render(); savePrefs(); break;
      case "toggleEx": showEx=!showEx; refresh(); break;
      case "clearcmp": compare=[]; refresh(); break;
    }});
  app.addEventListener("input",e=>{const t=e.target;
    if(t.dataset.w){W[t.dataset.w]=+t.value; document.getElementById("wo-"+t.dataset.w).textContent=t.value; refresh(); savePrefs();}
    if(t.dataset.quick){A.budget=+t.value; $("#qo-budget").textContent="$"+t.value; refresh(); saveAnswers();}});
  app.addEventListener("change",e=>{const t=e.target;
    if(t.dataset.bindc){A[t.dataset.bindc]=t.checked; render(); saveAnswers();}
    if(t.dataset.cmp){const id=+t.dataset.cmp; if(t.checked){compare.push(id); if(compare.length>2) compare.shift();} else compare=compare.filter(x=>x!==id); refresh();}});
  render();
}

/* =========================== BOOKING =========================== */
if(boot.page==="book"){
  const p=G.byId(boot.pid), taken=new Set(boot.booked), ds=G.days(), re=boot.reschedule;
  if(re) taken.delete(re.day+"|"+re.hour); // your own slot is free again when you move it
  const pk={type:re?re.type:(p.intro?"intro":"full"),day:null,slot:null,fmt:re?re.fmt:null}; let err="", busy=false;
  const TZ=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g," ")}catch(e){return "your local time"}})();
  const slots=d=>G.slotsFor(p,d,A.times,taken);
  const view=()=>{
   if(!p.intro&&pk.type==="intro") pk.type="full";
   if(!pk.day){const f=ds.find(d=>slots(d).some(s=>!s.taken)); pk.day=G.dkey(f||ds[0]);}
   const day=ds.find(d=>G.dkey(d)===pk.day), sl=slots(day);
   let fmts=p.fmt.filter(f=>A.formats.includes(f)); if(!fmts.length) fmts=p.fmt; if(!fmts.includes(pk.fmt)) pk.fmt=fmts[0];
   const price=pk.type==="intro"?"Free":G.covered(A)?"Covered by "+G.CODE:"$"+p.price;
   return `<div class="stack-lg">
    <a class="btn ghost back" href="/providers/${p.id}">← ${esc(p.name)}</a>
    ${re?`<div class="note info"><b>Rescheduling.</b> Your current session is ${G.fmtD(G.fromKey(re.day))} at ${G.fmtH(re.hour)}. It stays booked until you confirm a new time.</div>`:""}
    <div class="bgrid">
     <aside class="card stack">
      <div class="row" style="flex-wrap:nowrap">${ava(p)}<div class="grow"><h3>${esc(p.name)}</h3><p class="small muted">${esc(p.cred)}</p></div></div>
      <div class="q"><p class="ql">Session type</p><div class="stack" style="gap:8px">
        ${p.intro?`<button class="opt" data-act="stype" data-val="intro" aria-pressed="${pk.type==="intro"}"><span><b>Intro call</b><span class="muted small">15 minutes. See if you click before paying.</span></span><span class="optp">Free</span></button>`:""}
        <button class="opt" data-act="stype" data-val="full" aria-pressed="${pk.type==="full"}"><span><b>Full session</b><span class="muted small">50 minutes. ${p.intro?"Skip the intro and get started.":"This provider starts with a full session."}</span></span><span class="optp">${G.covered(A)?"Covered":"$"+p.price}</span></button></div></div>
      <div class="q"><p class="ql">Meet by</p><div class="chips">${fmts.map(f=>`<button class="chip" data-act="sfmt" data-val="${f}" aria-pressed="${pk.fmt===f}">${G.FORMATS[f]}</button>`).join("")}</div></div>
     </aside>
     <section class="card stack">
      <div><h2>Pick a time</h2><p class="small muted">Times shown in ${esc(TZ)}.${A.times.length?" A gold dot marks times you said work for you.":""}</p></div>
      <div class="days" role="group" aria-label="Day">${ds.map(d=>{const open=slots(d).filter(s=>!s.taken).length; return `<button class="day" data-act="day" data-val="${G.dkey(d)}" aria-pressed="${G.dkey(d)===pk.day}" ${open?"":"disabled"}><small>${d.toLocaleDateString("en-US",{weekday:"short"})}</small><b>${d.getDate()}</b><em>${open?open+" open":"none"}</em></button>`}).join("")}</div>
      <h3>${G.fmtD(day)}</h3>
      ${sl.length?`<div class="slots">${sl.map(s=>`<button class="slot ${s.pref&&!s.taken?"pref":""}" data-act="slot" data-val="${s.h}" aria-pressed="${pk.slot===s.h}" ${s.taken?'disabled aria-label="'+G.fmtH(s.h)+', taken"':""}>${G.fmtH(s.h)}</button>`).join("")}</div>`:`<p class="muted">No sessions this day.</p>`}
      ${err?`<p class="err" role="alert">${esc(err)}</p>`:""}
      <div class="summary">
       <p>${pk.slot!=null?`<b>${pk.type==="intro"?"Intro call":"Full session"}</b> by ${G.FORMATS[pk.fmt].toLowerCase()}<br>${G.fmtD(day)} at ${G.fmtH(pk.slot)} · <b>${price}</b>`:"Choose a time to continue."}</p>
       <button class="btn primary lg" data-act="confirm" ${pk.slot==null||busy?"disabled":""}>${busy?"Booking…":re?"Confirm new time":"Confirm booking"}</button>
      </div>
      <p class="small muted">Prototype: no payment is taken and no real appointment is made.</p>
     </section>
    </div></div>`;};
  const render=()=>{const d=$(".days"), x=d?d.scrollLeft:null; app.innerHTML=view(); const n=$(".days"); if(!n) return;
    if(x!=null) n.scrollLeft=x; else {const on=n.querySelector('[aria-pressed="true"]'); if(on) n.scrollLeft=on.offsetLeft-n.offsetLeft-12;}}; // keep the day strip where the player left it
  app.addEventListener("click",e=>{const t=e.target.closest("[data-act]"); if(!t) return; const val=t.dataset.val, act=t.dataset.act; err="";
    switch(t.dataset.act){
      case "stype": pk.type=val; break;
      case "sfmt": pk.fmt=val; break;
      case "day": pk.day=val; pk.slot=null; break;
      case "slot": pk.slot=+val; break;
      case "confirm": if(pk.slot==null||busy) return; busy=true; render();
        post("/api/book",{pid:p.id,day:pk.day,hour:pk.slot,type:pk.type,fmt:pk.fmt,reschedule:re?re.id:null}).then(j=>{nav("/booking/"+j.id);}).catch(x=>{busy=false; err=x.message; if(/took that time/.test(err)){taken.add(pk.day+"|"+pk.slot); pk.slot=null;} render();}); return;
    } render(); pop(app.querySelector('[data-act="'+act+'"][data-val="'+val+'"]'));
    if(act==="day"){const g=$(".slots"); if(g) g.classList.add("stag");} if(act==="slot") $(".summary").classList.add("ping");});
  render();
}
}
window.GGApp={init};
if(!window.GG_STATIC){const el=document.getElementById("boot"); let b={}; try{b=el?JSON.parse(el.textContent):{}}catch(e){} init(b);}
})();
