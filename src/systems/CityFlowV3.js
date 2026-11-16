import { Tick } from '../state/Tick.js';
(function(){
"use strict";
if(window.BerlinCityFlowV3)return;
const city=()=>window.BerlinCityDiscovery,bl=()=>window.BerlinLife,old=window.BerlinCityEpisodes;
if(!old||!city()){console.warn("[Berlin] CityFlow missing dependencies");return}
const now=()=>Date.now(),station=()=>city()?.where?.()?.id||null,asId=s=>String(s||"").split(":")[0];
const currentDay=()=>bl()?.state?.phase16Diary?.number||Math.floor((bl()?.state?.clock?.totalMinutes||0)/1440)+1;
const deadline=18*60*1000;
const sectors={
"alexanderplatz":[{id:"alexanderplatz:express-courier",name:"Rush courier · city route",icon:"🚲",detail:"Three stops with checks, freedom of choice and a real time window",episodeLabel:"JOB"},
{id:"alexanderplatz:miro-referral",name:"Miro · vervolgcontact",icon:"💬",detail:"Build a long-term relationship and unlock an employer",episodeLabel:"TALK"},
{id:"alexanderplatz:tower-operations",name:"Fernsehturm · visitor flow",icon:"🗼",detail:"Run a busy night without leaving visitors behind",episodeLabel:"PLAY"}],
"rosenthaler-platz":[{id:"rosenthaler-platz:parcel-check",name:"Pakketcontrole · Rosenthaler Platz",icon:"📦",detail:"Check the sealed parcel before you pass it on",episodeLabel:"PICK UP"}],
"bernauer-strasse":[{id:"bernauer-strasse:route-handoff",name:"Courier checkpoint · Bernauer Straße",icon:"🚲",detail:"Decide how to continue safely to the last stop",episodeLabel:"CHECKPOINT"},
{id:"bernauer-strasse:wall-investigation",name:"Wall archive · Bernauer Straße",icon:"🧱",detail:"Reconstruct a historical file without twisting the sources",episodeLabel:"INVESTIGATE"}],
"eberswalder-strasse":[{id:"eberswalder-strasse:delivery-final",name:"Drop-off point · Eberswalder Straße",icon:"📦",detail:"Check the recipient and complete the U8–U2 courier run",episodeLabel:"DELIVER"}],
"kottbusser-tor":[{id:"kottbusser-tor:deniz-route",name:"Deniz · routes and trust",icon:"🧢",detail:"A new professional choice that affects your next jobs",episodeLabel:"TALK"}],
"olympia-stadion":[{id:"olympia-stadion:stadium-shift",name:"Olympiastadion · crowd control",icon:"🏟️",detail:"Resolve a stadium incident in three steps",episodeLabel:"PLAY"}]
};
const known=new Set(Object.values(sectors).flat().map(a=>a.id));
let lastHudDay=0;
function state(){
 const game=bl()?.state;if(!game)return null;
 if(!game.cityFlowV2||game.cityFlowV2.schema!==2)
  game.cityFlowV2={schema:2,mission:null,missionsComplete:0,missionLastDay:0,contactTasks:{},landmarks:{},history:[],notes:[],careerRank:"Starter"};
 return game.cityFlowV2;
}
function journal(){
 const s=bl()?.state;if(!s)return null;
 s.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};
 const j=s.berlinJournal;j.stamps??=[];j.entries??=[];j.contacts??={};j.leads??={};return j;
}
function save(){try{bl()?.save?.()}catch(e){console.warn("[Berlin] gameplay save",e)}}
function log(message,kind="city"){
 const p=state(),j=journal(),s=bl()?.state;
 if(!p||!j)return;
 p.history.unshift({kind,message,day:currentDay(),at:now(),station:station()});p.history=p.history.slice(0,65);
 j.entries.unshift({id:"flow2:"+now(),name:"Berlin Life",kind,text:message,station:station(),day:s?.clock?.day,minute:s?.clock?.minute});j.entries=j.entries.slice(0,100);
 save();
}
function stamp(id,name,knowledge=0){
 const j=journal(),p=state(),d=window.BerlinPhase34?.discovery;
 if(!j||!p)return;
 const fresh=!j.stamps.includes(id);
 if(fresh){j.stamps.push(id);j.knowledge=(j.knowledge||0)+knowledge}
 if(d){d.discovered??={};d.visited??={};d.discovered[id]=true;d.visited[id]=(d.visited[id]||0)+1;
  try{localStorage.setItem("berlin-discovery-v4@"+(window.BerlinSaveSlots?.active||"normal"),JSON.stringify(d))}catch{}}
 save();
}
function rep(type,delta){
 const s=bl()?.state;if(!s)return;
 s.reputation??={};s.reputation[type]=Math.max(0,(Number(s.reputation[type])||0)+delta);
}
function canPay(){const e=bl()?.economy||bl()?.game?.economy;return typeof e?.earn==="function"?e:null}
function grant(cents,label){const eco=canPay();if(!eco)return false;try{const result=eco.earn(cents,label);return result?.success!==false}catch(e){console.warn("[Berlin] payout error",e);return false}}
function approve(id){return asId(id)===station()&&!!window.__berlinMetroGame?.player?.__streetMode}
const choice=(id,label,detail="")=>({id,label,detail});
const page=(title,text,actions=[],extras=[])=>({title,text,actions,extras});
const fmt=m=>{const s=Math.ceil(Math.max(0,m)/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const elapsed=m=>m?Math.max(0,deadline-(now()-m.startedAt)):0;
const missionSteps=[
{station:"rosenthaler-platz",name:"Rosenthaler Platz",id:"rosenthaler-platz:parcel-check",hint:"The label starts with R and the check sticker says 41"},
{station:"bernauer-strasse",name:"Bernauer Straße",id:"bernauer-strasse:route-handoff",hint:"Choose a route past the memorial or through the busy transfer point"},
{station:"eberswalder-strasse",name:"Eberswalder Straße",id:"eberswalder-strasse:delivery-final",hint:"Recipient Hartmann · order EX-24 · arranged at the bike shelter"}];
function careerRank(p){
 const j=journal(),t=(p.missionsComplete||0)+(old?.state?.deliveries||0);
 const trust=(old?.state?.miroTrust||0)+(old?.state?.denizTrust||0)+(p.contactTasks.miro?.trust||0)+(p.contactTasks.deniz?.trust||0);
 return p.careerRank=t>=6&&trust>=5?"Experienced courier":t>=3?"City courier":t>=1?"Junior courier":"Starter";
}
function missionInfo(p){
 const m=p?.mission;if(!m)return [];
 return ["Destination: "+missionSteps[m.step]?.name,"Time left: "+fmt(elapsed(m)),"Reward for correct delivery: €24 + possible tip",
  "Route U8 → U2; earlier decisions count"];
}
function missionView(id){
 const p=state(),m=p?.mission,step=missionSteps.findIndex(x=>x.id===id);
 if(id==="alexanderplatz:express-courier"){
  if(m&&elapsed(m)>0)return page("Rush courier · run in progress","This order is still on its way. "+missionSteps[m.step]?.hint,[choice("route","View the route"),choice("cancel","Cancel the run")],missionInfo(p));
  if(m&&elapsed(m)<=0)return page("Rush courier · expired","The deadline has passed. You can no longer deliver this parcel successfully.",[choice("clear","Register the missed deadline")]);
  if(p.missionLastDay===currentDay())return page("Rush courier · completed today","Your route is already done today. Another contract will be available tomorrow.",[],["Courier level: "+careerRank(p)]);
  if(old?.state?.shift)return page("Rush courier","You still have a short delivery to Hermannplatz open. Finish that first.");
  const ref=journal()?.leads?.courierNetwork;
  return page("Rush courier · three stops",
    "Dispatch is looking for someone for a route with a seal check, a route decision and a verified delivery. Take the U8 to Rosenthaler Platz, then travel via Bernauer Straße and transfer towards Eberswalder Straße (U2).",
    [choice("accept","Accept the 18-minute run"),choice("route","View all checks")],
    ["Base pay €24 · up to €3 tip"+(ref?" · netwerkbonus €2":""),"You only earn money after the correct delivery"]);
 }
 if(!m)return page("No run in progress","There's no active long courier run. Check the courier desk at Alexanderplatz.",[],["Your existing short courier runs are not changed."]);
 if(elapsed(m)<=0)return page("Delivery expired","The 18 minutes are over. Nothing is paid out.",[choice("clear","End run")]);
 if(step!==m.step)return page("Courier route","You're at a checkpoint that isn't up yet.",[],missionInfo(p));
 if(m.step===0)return page("Rosenthaler Platz · verzegelcontrole",
   "Dispatch: 'Only pass the parcel on if the code matches the waybill. The route code starts with R. The seal shows the digits 41.' The parcel is ready for transport.",
   [choice("seal-r14","Check card R-14"),choice("seal-r41","Seal R-41"),choice("seal-41r","Handwritten 41-R")],missionInfo(p));
 if(m.step===1)return page("Bernauer Straße · route choice",
   "It's busy around the memorial. Dispatch offers three routes. You don't have to solve a yes/no quiz: speed, safety and contact with the neighbourhood have different consequences.",
   [choice("safe","Along the quiet street, with time for pedestrians"),
    choice("fast","Cut straight through the busy group in front of the entrance"),
    choice("helper","Ask a local worker for a safe way through")],missionInfo(p));
 return page("Eberswalder Straße · delivery",
   "You reach the drop-off point. The recipient is Hartmann, the order is EX-24 and the handover was arranged at the bike shelter. Check the information before you hand over the parcel.",
   [choice("handoff-correct","Person at the bike shelter says 'Hartmann' and EX-24"),
    choice("handoff-kiosk","Kiosk worker says EX-42 and offers to keep the parcel"),
    choice("handoff-corner","Person at the tram only says the parcel is for him")],missionInfo(p));
}
function missionChoose(id,key){
 const p=state();if(!p)return page("No save","Start a game first to record progress.");
 if(!approve(id))return page("Other location","This job has to be done outside at the right stop.");
 let m=p.mission;
 if(key==="route")return page("Courier route · checklist",
 "The run starts at Alexanderplatz and stops at three U-Bahn stops in turn. The real timer keeps running while you travel through the metro.",
 [choice("back","Back to job")],missionInfo(p).concat(missionSteps.map((x,i)=>(i+1)+". "+x.name+" · "+x.hint)));
 if(key==="back")return missionView(id);
 if(key==="clear"&&m&&elapsed(m)<=0){p.mission=null;log("Deadline expired · no payment","courier");return missionView(id)}
 if(key==="cancel"&&m){p.mission=null;log("Courier route cancelled · no payment","courier");return missionView(id)}
 if(key==="accept"&&id==="alexanderplatz:express-courier"&&!m&&p.missionLastDay!==currentDay()&&!old?.state?.shift){
  p.mission={startedAt:now(),step:0,misses:0,safe:0,helper:0,choices:[],reward:2400};
  log("Three-stop run accepted: Rosenthaler Platz → Bernauer Straße → Eberswalder Straße","courier");
  return missionView(id);
 }
 if(!m||elapsed(m)<=0)return missionView(id);
 if(id!==missionSteps[m.step].id)return missionView(id);
 if(key==="retry")return missionView(id);
 if(m.step===0){
  if(key!=="seal-r41"){m.misses++;log("Check code doesn't match at Rosenthaler Platz","courier");return page("Seal not accepted","The waybill and sticker don't match. You keep the parcel and check again.",[choice("retry","Run the check again")],missionInfo(p))}
  if(key==="seal-r41"){m.step=1;m.choices.push("Seal R-41 checked");log("Seal check passed. Next stop: Bernauer Straße","courier");return page("Parcel checked","The route is cleared. Ride the U8 on to Bernauer Straße.",[],missionInfo(p))}
 }
 if(m.step===1&&["safe","fast","helper"].includes(key)){
  m.choices.push(key);m.safe=key==="safe"?1:0;m.helper=key==="helper"?1:0;
  if(key==="fast"){m.misses++;rep("hospitality",-1)}
  if(key==="safe")rep("hospitality",1);
  if(key==="helper")rep("hospitality",2);
  m.step=2;log("Bernauer Straße route chosen: "+({safe:"quiet route",fast:"fast route",helper:"local help"}[key]),"courier");
  return page("Route decision saved","You're now riding via Alexanderplatz to the U2 towards Eberswalder Straße. "+(key==="fast"?"You gained some time, but the rush counts against your reliability.":"The route was covered without pushing."),[],missionInfo(p));
 }
 if(m.step===2&&key.startsWith("handoff-")){
  if(key!=="handoff-correct"){m.misses++;log("Recipient couldn't confirm the code","courier");return page("Recipient not verified","This person doesn't have the right details. You don't hand over the parcel and can keep checking.",[choice("retry","Try again")],missionInfo(p))}
  const tip=m.misses===0&&elapsed(m)>=3*60*1000?300:0,network=journal()?.leads?.courierNetwork?200:0;
  const cents=m.reward+tip+network;
  if(!canPay())return page("Payment not available yet","The money system isn't loaded. The delivery stays open and isn't recorded as paid.",[choice("retry","Try again")]);
  if(!grant(cents,"Courier run pay Rosenthaler → Eberswalder"+(tip?" + tip":"")))return page("Payment failed","Nothing has been marked as delivered yet. Try again.",[choice("retry","Retry payment")]);
  const copied={...m};p.mission=null;p.missionsComplete++;p.missionLastDay=currentDay();
  const st=bl()?.state;if(st){st.career??={};st.career.courierDeliveries=(st.career.courierDeliveries||0)+1}
  rep("hospitality",2);stamp("berlin:long-route","Courier route Alexanderplatz–Eberswalder Straße");
  log("Three-stop run completed for €"+(cents/100).toFixed(2)+".","courier");
  return page("Delivery successful","Hartmann confirms EX-24. The parcel has been handed over and your reward has been added to your account.",[],
  ["Base pay: €24"+(tip?" · tip: €3":"")+(network?" · netwerkbonus: €2":""),"Reputation +2 · total long runs completed: "+p.missionsComplete,"Courier level: "+careerRank(p),"Choices made: "+copied.choices.join(", ")]);
 }
 return missionView(id);
}
const who={miro:{location:"alexanderplatz:miro-referral",name:"Miro",min:2},deniz:{location:"kottbusser-tor:deniz-route",name:"Deniz",min:2}};
function contactView(id){
 const p=state(),q=id.endsWith("miro-referral")?"miro":"deniz",person=who[q],baseline=old?.state?.[q+"Trust"]||0,t=p.contactTasks[q]||null;
 if(t?.done)return page(person.name+" · trust bond",t.summary,[],["Trust level: "+baseline+" + "+(t.trust||0),"Contact in your phone: yes"]);
 if(baseline<person.min)return page(person.name+" · vervolgcontact","You don't know "+person.name+" well enough yet. Talk to him first and build trust.",[],["Trust needed: "+person.min,"Current trust: "+baseline]);
 if(q==="miro")return page("Miro · a real introduction",
 "Miro: 'I can introduce you to an organiser. What do you put on paper before you commit?'",
 [choice("miro-contract","I want tasks, working hours and pay in black and white"),
 choice("miro-cash","If I get paid in cash I don't need a contract"),
 choice("miro-trial","Let me do one trial shift and then we'll talk further")],
 ["A good introduction isn't an automatic job. Your answer changes the offer."]);
 return page("Deniz · working together at Kotti",
  "Deniz: 'A courier has lost a delivery. Dispatch is already angry and the customer is waiting. What do you record now to help both sides?'",
  [choice("deniz-proof","Record the timeline, delivery code and contact attempts"),
   choice("deniz-guess","Quickly fill in a random delivery time so the ticket can be closed"),
   choice("deniz-help","Call the customer and send proof to dispatch")],
  ["Your choice can unlock a bonus or a new job later."]);
}
function contactChoose(id,key){
 if(!approve(id))return page("Other location","Talk to this contact outside at the right stop.");
 const p=state(),q=id.endsWith("miro-referral")?"miro":"deniz",oldTrust=old?.state?.[q+"Trust"]||0;
 if(oldTrust<2)return contactView(id);
 if(p.contactTasks[q]?.done)return contactView(id);
 const pool=q==="miro"?{
 "miro-contract":[2,"Miro appreciates your preparation. He keeps your name for an official introduction.",true],
 "miro-cash":[-1,"Miro: 'Without agreements you'll end up empty-handed. Get something on paper first.'",false],
 "miro-trial":[1,"Miro can introduce you for an introductory shift, as long as the conditions are clear.",true]
 }:{
 "deniz-proof":[2,"Deniz finds your way of working precise and verifiable.",true],
 "deniz-guess":[-2,"Deniz won't work with you if evidence gets made up.",false],
 "deniz-help":[2,"Deniz appreciates that you keep the customer and dispatch involved.",true]
 };
 if(!pool[key])return contactView(id);
 const [gain,summary,lead]=pool[key];
 p.contactTasks[q]={done:true,choice:key,trust:gain,summary,day:currentDay()};
 if(lead){const j=journal();j.leads[q==="miro"?"nightlifeIntroduction":"courierNetwork"]=true;j.contacts[q]=true}
 rep(q==="miro"?"nightlife":"hospitality",gain);
 log(personLabel(q)+": "+summary,"contact");
 return page(personLabel(q)+" · decision made",summary,[],["Trust "+(gain>=0?"+":"")+gain,"Follow-up contact saved"+(lead?" · new career path available":"")]);
}
const personLabel=q=>q==="miro"?"Miro":"Deniz";
const SCRIPTS={
"alexanderplatz:tower-operations":{name:"Fernsehturm · visitor flow",intro:"The evening show is almost full. A wheelchair user has booked a time slot; at the same time people without a booking are pushing in. You coordinate access.",steps:[
{question:"The queue is growing. What do you sort out first?",actions:[
["tower-access","Open a separate accessible queue without ignoring the booking",2],
["tower-quota","Let everyone waiting in so the queue disappears quickly",-2],
["tower-announce","Explain and check the booking list per time slot",1]]},
{question:"A lift briefly breaks down. A group wants to go up right away.",actions:[
["tower-elevator","Report the lift temporarily out of service and explain the available alternatives",2],
["tower-stairs","Send everyone up the stairs, including visitors who can't use them",-2],
["tower-delay","Wait for a technical check and reschedule the time slots",1]]}
],reward:600,rep:"hospitality"},
"olympia-stadion:stadium-shift":{name:"Olympiastadion · crowd control",intro:"For a stadium event the west exit is busier than expected. You get a radio, but you don't have unlimited people available.",steps:[
{question:"The pressure is shifting towards a narrow gate. What do you do?",actions:[
["stadium-relief","Deploy extra stewards at the bottleneck and open a second exit route",2],
["stadium-lock","Close the second route to keep the crowd together",-2],
["stadium-info","Spread visitors out with announcements and clear signs",1]]},
{question:"A visitor reports that someone is feeling unwell in the crowd.",actions:[
["stadium-medical","Call first aid and keep space clear for responders",2],
["stadium-continue","Keep the current flow going and only step in later",-2],
["stadium-pause","Temporarily slow the inflow and give responders the location",1]]}
],reward:800,rep:"hospitality"},
"bernauer-strasse:wall-investigation":{name:"Wall archive · testimony",intro:"A small archive holds a witness statement, a map from the same period and a later newspaper article. You make a short reconstruction of events around the Berlin Wall.",steps:[
{question:"A witness dates the event differently from an archive document. How do you handle the difference?",actions:[
["wall-sources","Put both versions side by side and verify the dates",2],
["wall-memory","Automatically record the most personal statement as established fact",-1],
["wall-archive","Throw away the statement because the archive document is official",-1]]},
{question:"A photo has been found without a caption. A colleague wants to add an exact location.",actions:[
["wall-mark","Mark the location as provisional and mention further research",2],
["wall-guess","Use the most appealing place as the final caption",-2],
["wall-ignore","Keep the photo, but explicitly report the missing caption",1]]}
],reward:0,rep:"bvg"}
};
function scenarioView(id){
 const p=state(),def=SCRIPTS[id],work=p.landmarks[id]||null;
 if(!def)return page("No activity","This location hasn't been worked out yet.");
 if(work?.done)return page(def.name,work.summary,[],["Berlin Stamp registered","High score: "+work.score,"Berlin Knowledge: "+(journal()?.knowledge||0)]);
 if(!work)return page(def.name,def.intro,[choice("scenario-start","Start the job")],["An activity with its own decisions and consequences, not a general knowledge quiz"]);
 const step=def.steps[work.step];return page(def.name+" · part "+(work.step+1),step.question,
 step.actions.map(a=>choice(a[0],a[1])),["Your earlier choices stay saved","Interim score: "+work.score]);
}
function scenarioChoose(id,key){
 const p=state(),def=SCRIPTS[id];if(!approve(id))return page("Other location","You can only do this outside at this stop.");
 if(!def)return page("Not available","This activity doesn't exist.");
 if(p.landmarks[id]?.done)return scenarioView(id);
 if(key==="scenario-start"&&!p.landmarks[id]){p.landmarks[id]={step:0,score:0,startedAt:now(),choices:[]};save();return scenarioView(id)}
 const work=p.landmarks[id];if(!work)return scenarioView(id);
 const selection=def.steps[work.step]?.actions.find(x=>x[0]===key);
 if(!selection)return scenarioView(id);
 work.choices.push({step:work.step,choice:key,delta:selection[2]});
 work.score+=selection[2];work.step++;
 if(work.step<def.steps.length){save();return scenarioView(id)}
 const pass=work.score>=1,reward=pass?def.reward:0;
 // A passed paid shift cannot be considered done until its payout succeeded.
 if(reward&&!grant(reward,def.name+" · pay")){
  work.step=def.steps.length-1;work.score-=selection[2];work.choices.pop();
  return page("Payment not available","The money system isn't ready yet; your progress stays at the last choice.",[choice(key,"Retry the last decision")]);
 }
 work.done=true;work.summary=pass?"Your team turns your choices into a workable, well-founded plan.":"Your plan has been recorded, but the risks outweigh the benefits. You can try again on a next activity.";
 rep(def.rep,pass?2:0);
 stamp(id,def.name,pass?1:0);
 log(def.name+" completed: score "+work.score+(reward?", pay €"+(reward/100):""),"location");
 return page(def.name+" · completed",work.summary,[],
 ["Score: "+work.score,pass?"Berlin Knowledge +1 · reputation +2":"No reputation bonus",reward?"Paid out: €"+(reward/100):"No financial reward"]);
}
function foundation(){
 const c=bl()?.state?.clock,eco=window.BerlinPhase34?.economy,save=window.BerlinSaveGuard?.validate?.()||{},d=window.BerlinDiscoveryV2,sv=window.BerlinStreetView2,
 api=window.BerlinCityDiscovery,ov=window.__berlinMetroGame?.__allStreetOverlay;
 return [
 ["Game State & save",!!bl()?.state&&!!window.BerlinSaveSlots&&save.storageAvailable!==false],
 ["Spelklok & kalender",Number.isFinite(c?.minute)&&Number.isInteger(c?.day)&&!!bl()?.state?.phase16Diary],
 ["Money & transactions",Number.isFinite(eco?.cash)&&(eco.bank===null||Number.isFinite(eco?.bank))&&Array.isArray(eco?.tx)],
 ["Discovery & registrations",!!d?.registry&&d.validate?.().ok===true],
 ["Street View (one interface)",!!ov?.root&&!!window.BerlinCleanStreet&&window.BerlinCleanStreet.inspect?.().oldPresent?.length===0],
 ["Virtual proximity",typeof api?.proximity==="function"&&typeof sv?.getPanorama==="function"]
 ];
}
function statusView(){
 const p=state(),m=p?.mission,j=journal(),checks=foundation(),s=bl()?.state;
 return page("City status · progress",
 "Your progress is linked to the active savegame. Employers, contacts, Berlin Stamps, calendar and the money system are checked separately.",
 [choice("status-route","Courier route"),choice("status-relations","Relationships & career"),choice("status-journal","Berlin Stamps & diary"),choice("status-save","Save information"),choice("status-system","Technische status 1–6")],
 ["Courier level: "+careerRank(p),"Long courier runs: "+(p?.missionsComplete||0)+(old?.state?.deliveries?" · short runs: "+old.state.deliveries:""),
 "Berlin Stamps: "+(j?.stamps?.length||0)+" · Knowledge: "+(j?.knowledge||0),
 "Game day: "+currentDay()+(m?" · run active at "+missionSteps[m.step].name:""),
 "Phases 1–6: "+checks.filter(x=>x[1]).length+"/"+checks.length+" basic checks found"]);
}
function statusChoose(key){
 const p=state(),j=journal(),m=p?.mission;
 if(key==="status-journal")return page("Berlin Stamps · travel diary",
 "This overview is linked to the active savegame. Completed jobs and conversations stay available in your next play session.",
 [choice("status-back","Back to overview")],
 ["Berlin Stamps: "+(j?.stamps?.length||0),"Berlin Knowledge: "+(j?.knowledge||0),
 "Long courier runs completed: "+(p?.missionsComplete||0),
 ...((j?.entries||[]).slice(0,8).map(x=>"• "+(x.name||"Berlin")+(x.text?": "+x.text:"")))]);
 if(key==="status-save")return page("Save management",
 "Your game is saved locally in the browser. Different Vercel test links don't share that storage automatically.",
 [choice("status-back","Back to overview")],
 ["Export a copy via Phone → City & planning → Save.",
 "For now, use the same test link to keep playing on the same save.",
 "Automatic transfer between test links isn't enabled yet."]);
 if(key==="status-route")return page("Courier routes",m?"Active long route: "+missionSteps[m.step]?.name+".":"No long route active.",[choice("status-back","Back to overview")],
 [...(m?missionInfo(p):["Next multi-stop route: Alexanderplatz → Rosenthaler Platz → Bernauer Straße → Eberswalder Straße"]),
 "Completed long routes: "+(p.missionsComplete||0),"Completed short routes: "+(old?.state?.deliveries||0)]);
 if(key==="status-relations")return page("Relationships and career",
 "Contacts and employers remember your choices. You can have introductory conversations at Alexanderplatz (Miro) or Kottbusser Tor (Deniz).",
 [choice("status-back","Back to overview")],
 ["Miro trust: "+(old?.state?.miroTrust||0)+" + "+(p.contactTasks.miro?.trust||0),
 "Deniz trust: "+(old?.state?.denizTrust||0)+" + "+(p.contactTasks.deniz?.trust||0),
 "Nightlife introduction: "+(j?.leads?.nightlifeIntroduction?"ja":"not yet"),
 "Courier network: "+(j?.leads?.courierNetwork?"ja":"not yet"),
 "Nightlife reputation: "+(bl()?.state?.reputation?.nightlife||0),"Hospitality reputation: "+(bl()?.state?.reputation?.hospitality||0),
 "Current career rank: "+careerRank(p)]);
 if(key==="status-system")return page("Foundation 1–6 · verification",
 "These are basic checks on loaded subsystems. A passing check doesn't replace a mobile test of train rides, Street View and save recovery.",
 [choice("status-back","Back to overview")],foundation().map(([name,ok])=>(ok?"✓ ":"⚠ ")+name));
 return statusView();
}
function view(id){
 if(id.endsWith(":city-status"))return statusView();
 if(id==="alexanderplatz:express-courier"||missionSteps.some(x=>x.id===id))return missionView(id);
 if(id==="alexanderplatz:miro-referral"||id==="kottbusser-tor:deniz-route")return contactView(id);
 if(SCRIPTS[id])return scenarioView(id);
 return old.view(id);
}
function choose(id,key){
 if(id.endsWith(":city-status"))return statusChoose(key);
 if(id==="alexanderplatz:express-courier"||missionSteps.some(x=>x.id===id))return missionChoose(id,key);
 if(id==="alexanderplatz:miro-referral"||id==="kottbusser-tor:deniz-route")return contactChoose(id,key);
 if(SCRIPTS[id])return scenarioChoose(id,key);
 if(id==="alexanderplatz:vacatures"&&key==="shift-accept"&&state()?.mission)
  return page("Finish your run first","You already have a long courier route. Finish it before you accept a second run.");
 return old.choose(id,key);
}
let originalActivities=null;
function install(){
 const d=window.BerlinDiscoveryV2,c=city();if(!d?.data||!c?.activities)return false;
 for(const [sid,list] of Object.entries(sectors)){
  const target=d.data[sid];if(!Array.isArray(target))continue;
  for(const item of list)if(!target.some(a=>a.id===item.id))target.push({...item,station:sid,dist:90,obvious:true});
 }
 if(!originalActivities){
  originalActivities=c.activities.bind(c);
  c.activities=function(){
   const list=originalActivities(),s=c.where?.();
   if(!s?.id)return list;
   const id=s.id+":city-status";
   return list.some(x=>x.id===id)?list:list.concat([{id,station:s.id,name:"City status & progress",icon:"📓",detail:"Courier, contacts, Berlin Stamps and six basic checks",episodeLabel:"OVERVIEW",dist:0}]);
  };
 }
 return true;
}
const combined=Object.create(old);
Object.assign(combined,{version:3,has:id=>known.has(id)||id.endsWith(":city-status")||old.has(id),view,choose,open:view});
window.BerlinCityEpisodes=combined;
window.BerlinCityFlowV3={version:3,register:install,inspect:foundation,view,choose,remainingFor:id=>id==="alexanderplatz:express-courier"||missionSteps.some(x=>x.id===id)?elapsed(state()?.mission):null,get current(){return state()}};
Tick.until('cityflow.install',750,install,20000);install();
console.info("[Berlin Life] Phase 7.1–7.4: 3-stop courier, relations, distinctive locations, persistent progression");
})();
