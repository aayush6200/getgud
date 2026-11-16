/* GetGud shared data and matching engine. Runs in the browser (window.GG) and on the server (require). */
(function(root){
"use strict";
/* ---------- reference data ---------- */
const STATES="AL Alabama,AK Alaska,AZ Arizona,AR Arkansas,CA California,CO Colorado,CT Connecticut,DE Delaware,DC District of Columbia,FL Florida,GA Georgia,HI Hawaii,ID Idaho,IL Illinois,IN Indiana,IA Iowa,KS Kansas,KY Kentucky,LA Louisiana,ME Maine,MD Maryland,MA Massachusetts,MI Michigan,MN Minnesota,MS Mississippi,MO Missouri,MT Montana,NE Nebraska,NV Nevada,NH New Hampshire,NJ New Jersey,NM New Mexico,NY New York,NC North Carolina,ND North Dakota,OH Ohio,OK Oklahoma,OR Oregon,PA Pennsylvania,RI Rhode Island,SC South Carolina,SD South Dakota,TN Tennessee,TX Texas,UT Utah,VT Vermont,VA Virginia,WA Washington,WV West Virginia,WI Wisconsin,WY Wyoming".split(",").map(s=>[s.slice(0,2),s.slice(3)]);
const STATE_NAME=Object.fromEntries(STATES); STATE_NAME.INTL="outside the US";
// Approximate PSYPACT membership for the prototype. A real build would read the official map.
const PSYPACT=new Set("AL AZ AR CO CT DE DC FL GA ID IL IN KS KY ME MD MI MN MS MO NE NV NH NJ NC ND OH OK PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));
const CONCERNS={perf:"Performance anxiety or choking",tilt:"Tilt and anger after losses",burnout:"Burnout, no motivation",sleep:"Sleep problems",team:"Team conflict or communication",spotlight:"Stage, audience, or media pressure",toxicity:"Online harassment and toxicity",pain:"Wrist, neck, or eye pain and the stress around it",transition:"Retiring or leaving competitive play",balance:"Balancing school, work, and practice",mood:"Feeling down or hopeless",money:"Contract or money stress"};
const SHORT={perf:"performance anxiety",tilt:"tilt",burnout:"burnout",sleep:"sleep",team:"team conflict",spotlight:"stage pressure",toxicity:"online harassment",pain:"pain-related stress",transition:"career transition",balance:"life balance",mood:"low mood",money:"money stress"};
const GAMES={lol:"League of Legends",valorant:"Valorant",cs2:"Counter-Strike 2",dota2:"Dota 2",ow2:"Overwatch 2",r6:"Rainbow Six Siege",cod:"Call of Duty",rl:"Rocket League",apex:"Apex Legends",fortnite:"Fortnite",eafc:"EA FC",smash:"Smash Bros.",fgc:"Fighting games",tft:"Teamfight Tactics",other:"Other"};
const LEVELS={pro:"Professional",semipro:"Semi-pro",varsity:"Collegiate varsity",club:"Collegiate club",hs:"High school",ranked:"Ranked, aiming higher",streamer:"Streamer or creator",coach:"Coach or analyst",retired:"Retired or transitioning"};
const TIMES={morning:"Mornings",afternoon:"Afternoons",evening:"Evenings",late:"Late night, after scrims",weekend:"Weekends"};
const HOURS={morning:[9,10,11],afternoon:[13,14,15,16],evening:[18,19,20],late:[21,22,23]};
const FORMATS={video:"Video",phone:"Phone",chat:"Text chat"};
const LANGS={en:"English",es:"Spanish",ko:"Korean",hi:"Hindi",de:"German",ru:"Russian",it:"Italian"};
const MODS={CBT:"Cognitive behavioral therapy. Works on the thoughts that feed anxiety and tilt.",ACT:"Acceptance and commitment therapy. Learn to play well with nerves present.",Mindfulness:"Attention control and reset routines between rounds.",DBT:"DBT skills. Emotion regulation and distress tolerance.",Biofeedback:"Heart-rate training to steady your body under pressure.","CBT-I":"The standard first treatment for insomnia. Useful with late scrim schedules."};
const CODE="DEMO-TEAM";
/* Fictional sample providers. kind: clinical = licensed, both = licensed + CMPC, perf = mental performance coach only */
const P=[
{id:1,name:"Dr. Maya Okafor",pro:"she/her",g:"woman",cred:"PhD, Licensed Psychologist, CMPC",kind:"both",states:["TX"],psy:true,spec:["perf","tilt","spotlight","burnout"],games:["valorant","cs2","ow2"],levels:["pro","semipro","varsity"],mods:["CBT","ACT"],fmt:["video","phone"],price:165,slide:false,langs:["en"],hrs:["evening","late"],style:"structured",intro:true,yrs:11,bio:"Coached a collegiate Overwatch roster before her doctorate. Works with in-game leaders and players who freeze on stage."},
{id:2,name:"Daniel Reyes",pro:"he/him",g:"man",cred:"MA, Licensed Professional Counselor",kind:"clinical",states:["TX","FL"],psy:false,spec:["mood","burnout","balance","sleep"],games:["lol","tft"],levels:["varsity","club","hs","ranked"],mods:["CBT","CBT-I"],fmt:["video","chat"],price:110,slide:true,langs:["en","es"],hrs:["afternoon","evening","weekend"],style:"talk",intro:true,yrs:7,bio:"Sees a lot of student players juggling scholarships, classes, and ranked grind. Diamond in League, so you can skip the glossary."},
{id:3,name:"Dr. Priya Raman",pro:"she/her",g:"woman",cred:"MD, Psychiatrist",kind:"clinical",meds:true,states:["CA","TX","NY"],psy:false,spec:["mood","sleep","perf"],games:[],levels:["pro","semipro","varsity","streamer"],mods:["CBT"],fmt:["video"],price:240,slide:false,langs:["en","hi"],hrs:["morning","afternoon"],style:"structured",intro:false,yrs:14,bio:"Medication evaluation and follow-up for depression, anxiety, and sleep. Coordinates with your therapist or team staff only if you say so."},
{id:4,name:"Jordan Ellis",pro:"they/them",g:"nonbinary",cred:"MS, CMPC",kind:"perf",states:[],psy:false,spec:["tilt","perf","team","spotlight"],games:["lol","dota2","valorant"],levels:["pro","semipro","ranked"],mods:["Mindfulness","Biofeedback"],fmt:["video","chat"],price:95,slide:false,langs:["en"],hrs:["evening","late","weekend"],style:"structured",intro:true,yrs:6,bio:"Former Dota 2 analyst. Builds between-map reset routines and comms rules for teams that tilt together."},
{id:5,name:"Dr. Hye-jin Park",pro:"she/her",g:"woman",cred:"PsyD, Licensed Psychologist",kind:"clinical",states:["WA"],psy:true,spec:["transition","burnout","mood","money"],games:["lol","ow2"],levels:["pro","retired","semipro"],mods:["ACT"],fmt:["video","phone"],price:180,slide:false,langs:["en","ko"],hrs:["evening","weekend"],style:"talk",intro:true,yrs:12,bio:"Focuses on players ending a career in their early twenties. Identity after the roster, contract stress, and what comes next."},
{id:6,name:"Marcus Bell",pro:"he/him",g:"man",cred:"LCSW",kind:"clinical",states:["NY","NJ","CA"],psy:false,spec:["toxicity","mood","team","balance"],games:["fgc","smash","cod"],levels:["streamer","ranked","semipro"],mods:["DBT"],fmt:["video","chat","phone"],price:120,slide:true,langs:["en"],hrs:["late","weekend"],style:"talk",intro:true,yrs:9,bio:"Grew up in the fighting game community. Works with players and streamers dealing with harassment, chat abuse, and dogpiles."},
{id:7,name:"Sofia Marchetti",pro:"she/her",g:"woman",cred:"LMFT",kind:"clinical",states:["CA","TX"],psy:false,spec:["team","balance","transition"],games:[],levels:["varsity","club","coach","retired"],mods:["ACT"],fmt:["video"],price:130,slide:false,langs:["en","it"],hrs:["afternoon","evening"],style:"talk",intro:true,yrs:10,bio:"Relationship and family therapist. Helps with roster conflict, parents who do not get esports, and partners who feel second to scrims."},
{id:8,name:"Dr. Tomás Villanueva",pro:"he/him",g:"man",cred:"PhD, Licensed Psychologist",kind:"clinical",states:["IL"],psy:true,spec:["sleep","pain","burnout"],games:["cs2","r6","cod"],levels:["pro","semipro","varsity"],mods:["CBT-I","Biofeedback"],fmt:["video"],price:170,slide:false,langs:["en","es"],hrs:["morning","evening"],style:"structured",intro:false,yrs:15,bio:"Health psychologist. Insomnia from late blocks, and the fear and frustration that come with wrist and neck injuries."},
{id:9,name:"Aisha Rahman",pro:"she/her",g:"woman",cred:"LMHC",kind:"clinical",states:["NY","FL","WA"],psy:false,spec:["toxicity","spotlight","mood","perf"],games:["valorant","apex","fortnite"],levels:["streamer","varsity","club","ranked"],mods:["CBT","Mindfulness"],fmt:["chat","video"],price:105,slide:true,langs:["en"],hrs:["late","weekend"],style:"structured",intro:true,yrs:5,bio:"Works with women and marginalized players in voice-chat-heavy titles. Practical plans for harassment, plus the anxiety it leaves behind."},
{id:10,name:"Lena Fischer",pro:"she/her",g:"woman",cred:"MA, CMPC",kind:"perf",states:[],psy:false,spec:["burnout","balance","perf","pain"],games:["rl","fortnite","eafc"],levels:["hs","club","varsity","ranked"],mods:["Mindfulness"],fmt:["video","phone"],price:80,slide:false,langs:["en","de"],hrs:["afternoon","weekend"],style:"structured",intro:true,yrs:4,bio:"Works with younger players and their coaches on practice plans that leave room for school, sleep, and breaks for hands and eyes."},
{id:11,name:"Dr. Kwame Mensah",pro:"he/him",g:"man",cred:"PhD, Licensed Psychologist, CMPC",kind:"both",states:["GA"],psy:true,spec:["team","tilt","spotlight","transition"],games:["cod","r6","rl"],levels:["pro","varsity","coach"],mods:["CBT","Mindfulness"],fmt:["video","phone"],price:175,slide:false,langs:["en"],hrs:["evening","weekend"],style:"structured",intro:true,yrs:13,bio:"Sport psychologist who moved from college football to esports rosters. Team dynamics, LAN nerves, and leadership for captains and coaches."},
{id:12,name:"Riley Nakamura",pro:"they/them",g:"nonbinary",cred:"LPC",kind:"clinical",states:["TX","CO"],psy:false,spec:["sleep","tilt","mood","money"],games:["smash","fgc","tft"],levels:["ranked","streamer","club"],mods:["DBT","CBT-I"],fmt:["chat","video"],price:95,slide:true,langs:["en"],hrs:["late","evening"],style:"talk",intro:true,yrs:5,bio:"Night-owl schedule on purpose. Good fit if your day ends at 2 a.m. and you want someone who has been to a local bracket."},
{id:13,name:"Dr. Elena Sokolova",pro:"she/her",g:"woman",cred:"MD, Psychiatrist",kind:"clinical",meds:true,states:["TX","FL","IL"],psy:false,spec:["mood","sleep","burnout"],games:[],levels:["pro","semipro","varsity","streamer","retired"],mods:["CBT-I"],fmt:["video","phone"],price:260,slide:false,langs:["en","ru"],hrs:["afternoon","evening"],style:"structured",intro:false,yrs:18,bio:"Psychiatrist with a sleep medicine background. Medication management alongside therapy, with attention to reaction time and practice schedules."},
{id:14,name:"Sam Whitaker",pro:"he/him",g:"man",cred:"MEd, CMPC",kind:"perf",states:[],psy:false,spec:["team","spotlight","tilt","balance"],games:["lol","valorant","cs2"],levels:["coach","varsity","semipro"],mods:["Mindfulness","ACT"],fmt:["video"],price:90,slide:false,langs:["en"],hrs:["morning","afternoon"],style:"talk",intro:true,yrs:8,bio:"Works mostly with coaches and analysts. Running reviews without blame, and handling pressure from management and fans."}
];
const PERSONAS=[
{label:"Kai, collegiate Valorant IGL",sub:"Tilt and choking in playoffs. Texas. Late nights only.",acct:{name:"Kai",email:"kai@example.edu"},a:{state:"TX",lang:"en",formats:["video","chat"],level:"varsity",games:["valorant","cs2"],role:"IGL",hours:28,concerns:["tilt","perf","team"],top:"tilt",duration:"months",impactPlay:4,impactLife:2,crisis:"no",care:"unsure",meds:false,budget:120,code:"",times:["evening","late"],gender:"any",style:"structured"}},
{label:"Mina, LoL pro thinking about retiring",sub:"Burnout and what comes after. Washington. Wants therapy.",acct:{name:"Mina",email:"mina@example.com"},a:{state:"WA",lang:"en",formats:["video"],level:"pro",games:["lol"],role:"Support",hours:60,concerns:["burnout","transition","mood","money"],top:"transition",duration:"year",impactPlay:4,impactLife:4,crisis:"no",care:"therapy",meds:false,budget:200,code:"",times:["evening","weekend"],gender:"woman",style:"talk"}},
{label:"Dre, fighting game streamer",sub:"Chat harassment and wrecked sleep. New York. Tight budget.",acct:{name:"Dre",email:"dre@example.com"},a:{state:"NY",lang:"en",formats:["chat","video"],level:"streamer",games:["fgc","smash"],role:"",hours:45,concerns:["toxicity","sleep","mood"],top:"toxicity",duration:"months",impactPlay:3,impactLife:4,crisis:"no",care:"unsure",meds:false,budget:100,code:"",times:["late","weekend"],gender:"any",style:"any"}}
];
const DEFAULT_A=()=>({state:"",lang:"en",formats:["video"],level:"",games:[],role:"",hours:25,concerns:[],top:"",duration:"",impactPlay:3,impactLife:2,crisis:"no",care:"unsure",meds:false,budget:120,code:"",times:[],gender:"any",style:"any"});
const DEFAULT_W=()=>({concerns:40,scene:20,schedule:15,budget:15,prefs:10});
const PART_LABEL={concerns:"Your concerns",scene:"Knows your scene",schedule:"Schedule",budget:"Cost",prefs:"Preferences"};
const byId=id=>P.find(p=>p.id===+id);
const covered=a=>String(a.code||"").trim().toUpperCase()===CODE;
function careMode(a,override){
  if(override) return {mode:override,why:"You set this yourself.",auto:false};
  if(a.crisis==="yes") return {mode:"clinical",why:"You said you are in crisis or thinking about hurting yourself. A coach is the wrong tool for that, so only licensed clinicians are shown.",auto:true};
  if(a.concerns.includes("mood")) return {mode:"clinical",why:"You picked feeling down or hopeless. That is a clinical concern, so only licensed clinicians are shown.",auto:true};
  if(a.impactLife>=4) return {mode:"clinical",why:"You said this is hitting your life outside the game hard. Licensed clinicians are trained for that.",auto:true};
  if(a.care==="therapy") return {mode:"clinical",why:"You asked for therapy with a licensed clinician.",auto:false};
  if(a.care==="coaching") return {mode:"perf",why:"You asked for mental performance coaching. Certified coaches are ranked first.",auto:false};
  return {mode:"either",why:"Your answers fit either route, so licensed clinicians and certified performance coaches are both shown.",auto:false};
}
function eligible(p,a,mode){
  const licensed=p.kind!=="perf";
  if(mode==="clinical"&&!licensed) return "Performance coach. Cannot treat clinical concerns.";
  if(licensed){
    if(a.state==="INTL") return "Licensed in the US only.";
    const ok=p.states.includes(a.state)||(p.psy&&PSYPACT.has(a.state));
    if(!ok) return "Not licensed to see clients in "+STATE_NAME[a.state]+".";
  }
  if(!p.langs.includes(a.lang)) return "Does not offer sessions in "+LANGS[a.lang]+".";
  if(!p.fmt.some(f=>a.formats.includes(f))) return "Does not offer "+a.formats.map(f=>FORMATS[f].toLowerCase()).join(" or ")+" sessions.";
  return "";
}
function score(p,a,mode,W){
  const why=[],minus=[]; W=W||DEFAULT_W();
  let tot=0,hit=0; const hits=[];
  a.concerns.forEach(c=>{const w=c===a.top?2:1; tot+=w; if(p.spec.includes(c)){hit+=w; hits.push(c);}});
  const concerns=tot?hit/tot:0;
  if(hits.length) why.push("Works with "+hits.map(c=>SHORT[c]).join(", "));
  if(a.top&&!p.spec.includes(a.top)) minus.push("Your top concern, "+SHORT[a.top]+", is not a listed specialty");
  const gm=a.games.filter(g=>p.games.includes(g)); const lv=p.levels.includes(a.level);
  const scene=(gm.length?0.6:(p.games.length?0.1:0.25))+(lv?0.4:0);
  if(gm.length) why.push("Knows "+gm.map(g=>GAMES[g]).join(", "));
  if(lv) why.push("Has worked with "+LEVELS[a.level].toLowerCase()+" players");
  const ov=a.times.filter(t=>p.hrs.includes(t)); const schedule=a.times.length?ov.length/a.times.length:1;
  if(a.times.length&&ov.length) why.push("Open "+ov.map(t=>TIMES[t].toLowerCase()).join(" and "));
  if(a.times.length&&!ov.length) minus.push("No openings in the times you picked");
  let budget=1;
  if(covered(a)) why.push("Covered by your program code");
  else if(p.price<=a.budget) why.push("Within your $"+a.budget+" budget");
  else{ budget=Math.max(0,1-((p.price-a.budget)/a.budget)*2); if(p.slide) budget=Math.min(1,budget+0.25);
        minus.push("$"+(p.price-a.budget)+" over your budget"+(p.slide?", but offers a sliding scale":"")); }
  const pr=[];
  if(a.gender!=="any"){pr.push(p.g===a.gender?1:0); if(p.g===a.gender) why.push("Matches your provider preference");}
  if(a.style!=="any"){pr.push(p.style===a.style?1:0.3);}
  if(a.meds){pr.push(p.meds?1:0); if(p.meds) why.push("Can prescribe medication"); else minus.push("Cannot prescribe medication");}
  if(mode==="perf"){pr.push(p.kind!=="clinical"?1:0.4); if(p.kind!=="clinical") why.push("Certified mental performance consultant");}
  const prefs=pr.length?pr.reduce((x,y)=>x+y,0)/pr.length:1;
  const parts={concerns,scene,schedule,budget,prefs};
  const sum=Object.keys(parts).reduce((t,k)=>t+(+W[k]||0),0)||1;
  const total=Object.keys(parts).reduce((t,k)=>t+parts[k]*(+W[k]||0),0)/sum;
  return {p,parts,total:Math.round(total*100),why,minus};
}
function runMatch(a,W,override){
  const cm=careMode(a,override), ranked=[], excluded=[];
  P.forEach(p=>{const r=eligible(p,a,cm.mode); if(r) excluded.push({p,reason:r}); else ranked.push(score(p,a,cm.mode,W));});
  ranked.sort((x,y)=>y.total-x.total||x.p.price-y.p.price);
  return {cm,ranked,excluded};
}
/* calendar */
function days(){const out=[],t=new Date(); t.setHours(0,0,0,0); for(let i=1;i<=14;i++){const d=new Date(t); d.setDate(t.getDate()+i); out.push(d);} return out;}
const dkey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const fromKey=k=>{const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d);};
// booked: Set of "YYYY-MM-DD|hour" strings already taken by real bookings
function slotsFor(p,d,times,booked){
  const wk=d.getDay()===0||d.getDay()===6; times=times||[];
  if(wk&&!p.hrs.includes("weekend")) return [];
  let buckets=p.hrs.filter(h=>h!=="weekend"); if(!buckets.length) buckets=wk?["afternoon"]:[];
  const out=[];
  buckets.forEach(b=>HOURS[b].forEach(h=>{
    const taken=((p.id*31+d.getDate()*7+d.getMonth()*3+h*13)%5)<2||!!(booked&&booked.has(dkey(d)+"|"+h));
    out.push({h,b,taken,pref:times.includes(b)||(wk&&times.includes("weekend"))});
  }));
  return out.sort((x,y)=>x.h-y.h);
}
const fmtH=h=>{const ap=h>=12?"PM":"AM"; const x=h%12||12; return x+":00 "+ap;};
const fmtD=d=>d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
function nextOpen(p,booked){for(const d of days()){const s=slotsFor(p,d,[],booked).find(x=>!x.taken); if(s) return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})+", "+fmtH(s.h);} return "No openings in the next two weeks";}
const priceLine=(p,a)=>a&&covered(a)?"Covered by "+CODE:"$"+p.price+" per 50 min"+(p.slide?" · sliding scale":"");
const initials=n=>n.replace(/^Dr\. /,"").split(" ").map(x=>x[0]).join("").slice(0,2);
function cleanAnswers(x){ // validate anything coming from a client
  const d=DEFAULT_A(), a={}; x=x||{};
  const pick=(v,set,def)=>Object.prototype.hasOwnProperty.call(set,v)?v:def;
  const many=(v,set)=>Array.isArray(v)?[...new Set(v.filter(k=>Object.prototype.hasOwnProperty.call(set,k)))]:[];
  const num=(v,lo,hi,def)=>{v=Math.round(+v); return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):def;};
  a.state=(x.state==="INTL"||STATE_NAME[x.state])?x.state:""; a.lang=pick(x.lang,LANGS,"en");
  a.formats=many(x.formats,FORMATS); a.level=pick(x.level,LEVELS,""); a.games=many(x.games,GAMES);
  a.role=String(x.role||"").slice(0,40); a.hours=num(x.hours,0,90,d.hours);
  a.concerns=many(x.concerns,CONCERNS); a.top=a.concerns.includes(x.top)?x.top:(a.concerns[0]||"");
  a.duration=pick(x.duration,{weeks:1,months:1,year:1},""); a.impactPlay=num(x.impactPlay,1,5,3); a.impactLife=num(x.impactLife,1,5,2);
  a.crisis=x.crisis==="yes"?"yes":"no"; a.care=pick(x.care,{therapy:1,coaching:1,unsure:1},"unsure"); a.meds=!!x.meds;
  a.budget=num(x.budget,40,300,120); a.code=String(x.code||"").slice(0,24); a.times=many(x.times,TIMES);
  a.gender=pick(x.gender,{any:1,woman:1,man:1,nonbinary:1},"any"); a.style=pick(x.style,{any:1,structured:1,talk:1},"any");
  return a;
}
const complete=a=>!!(a&&a.state&&a.formats.length&&a.level&&a.games.length&&a.concerns.length);
Object.assign(root,{STATES,STATE_NAME,PSYPACT,CONCERNS,SHORT,GAMES,LEVELS,TIMES,HOURS,FORMATS,LANGS,MODS,CODE,P,PERSONAS,DEFAULT_A,DEFAULT_W,PART_LABEL,byId,covered,careMode,eligible,score,runMatch,days,dkey,fromKey,slotsFor,fmtH,fmtD,nextOpen,priceLine,initials,cleanAnswers,complete});
})(typeof module!=="undefined"&&module.exports?module.exports:(window.GG={}));
