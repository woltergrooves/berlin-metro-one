(function(){
"use strict";
if(window.BerlinCityEpisodes)return;
const LIVE_MS=8*60*1000, DEST="hermannplatz", HOME="alexanderplatz";
const options=[
{note:"Order H-47 · addressee Meier · hand over at the small kiosk on the south side, not at the stop.",choices:[
{label:"Person at the kiosk who can confirm 'Meier, H-47'",ok:true},
{label:"Person on the platform with a parcel of the same colour",ok:false},
{label:"Person next to a delivery van who says they work for the building",ok:false}
]},
{note:"Order D-19 · for Frau Nguyen · she waits at the flower stall and gives the order number.",choices:[
{label:"Man at the metro gate who knows the street name",ok:false},
{label:"Customer at the flower stall who confirms 'Nguyen, D-19'",ok:true},
{label:"Worker in a green jacket who wants to sign without a check",ok:false}
]},
{note:"Order F-62 · pickup confirmation in the name Yilmaz · the handover is at the bike racks.",choices:[
{label:"Customer in front of the döner shop who wants the same bag",ok:false},
{label:"Person under the U8 sign who claims to be in a hurry",ok:false},
{label:"Recipient at the bike racks who can confirm 'Yilmaz, F-62'",ok:true}
]}
];
const life=()=>window.BerlinLife;
const city=()=>window.BerlinCityDiscovery;
const zone=()=>city()?.where?.()?.id||null;
const currentDay=()=>{
 const st=life()?.state||{};
 const serial=st.phase16Diary?.number;
 return Number.isFinite(serial)?serial:Math.floor((st.clock?.totalMinutes||0)/1440)+1;
};
function data(){
 const st=life()?.state;
 if(!st)return null;
 if(!st.cityEpisodesV1||st.cityEpisodesV1.schema!==1)st.cityEpisodesV1={schema:1,shift:null,deliveries:0,lastDeliveryDay:-1,miroLastDay:-1,denizLastDay:-1,miroTrust:0,denizTrust:0,civic:null,history:[]};
 return st.cityEpisodesV1;
}
const save=()=>life()?.save?.();
const rep=(field,amount)=>{const s=life()?.state;if(!s)return;s.reputation??={};s.reputation[field]=(Number(s.reputation[field])||0)+amount};
function event(message,kind="episode"){
 const d=data(),s=life()?.state;if(!d||!s)return;
 d.history.unshift({message,day:currentDay(),at:Date.now(),kind});d.history=d.history.slice(0,35);
 s.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};
 const j=s.berlinJournal;j.entries??=[];j.entries.unshift({id:"city-episodes:"+kind,name:"City life",kind,station:zone(),text:message,day:s.clock?.day,minute:Math.floor(s.clock?.minute||0)});j.entries=j.entries.slice(0,80);
 save();
}
function remaining(d=data()){return d?.shift?Math.max(0,LIVE_MS-(Date.now()-d.shift.startedAt)):0}
const fmt=t=>{const s=Math.ceil(Math.max(0,t)/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const opt=(id,label,detail="")=>({id,label,detail});
const view=(title,text,actions=[],extras=[])=>({title,text,actions,extras});
const has=id=>["alexanderplatz:vacatures","hermannplatz:delivery","alexanderplatz:miro","kottbusser-tor:deniz","spittelmarkt:architecture"].includes(id);
let staged=null,flash="";
function ensureLocation(id){
 const expected=id.split(":")[0];
 return zone()===expected&&window.__berlinMetroGame?.player?.__streetMode===true;
}
function available(id){
 const a=city()?.activities?.().find(x=>x.id===id),m=life()?.state?.clock?.minute||0,c=life()?.state?.clock?.day;
 if(!a||a.from==null)return true;
 if(a.days&&!a.days.includes(c))return false;
 const to=a.to??1440;
 return a.from<=to?m>=a.from&&m<=to:m>=a.from||m<=to;
}
function viewId(id){
 const d=data();if(!d)return view("City life","Load your savegame first.");
 if(!ensureLocation(id))return view("Not at this location","First go to the right stop and get out of the U-Bahn onto the street.");
 if(id==="alexanderplatz:vacatures"){
  if(d.shift){
   if(remaining(d)>0)return view("Job board · courier",
    "You've already accepted a delivery. Destination: Hermannplatz (U8). "+options[d.shift.variant].note,
    [opt("shift-info","Read the delivery instructions"),opt("shift-cancel","Cancel this run")],
    ["Time left: "+fmt(remaining(d)), "Reward after correct delivery: €15, possibly a €2 tip"]);
   return view("Courier job expired","The eight-minute delivery time is over. You didn't get paid.",
     [opt("shift-reset","View a new available run")]);
  }
  if(d.lastDeliveryDay===currentDay())return view("Job board","You've already completed a delivery today. A new short shift appears tomorrow.",[],["Completed runs: "+d.deliveries]);
  return view("Job board · Späti delivery",
   "A small courier is looking for someone for a rush order from Alexanderplatz to Hermannplatz. You have to travel yourself and find the right recipient there. It isn't money earned automatically.",
   [opt("shift-details","Check the conditions first","No fine if you're late, but no pay either."),
    opt("shift-accept","Accept the run · €15","Time limit: 8 real minutes from accepting.")],
   ["Destination: Hermannplatz · U8",flash]);
 }
 if(id==="hermannplatz:delivery"){
  if(!d.shift)return view("Delivery pickup · Hermannplatz","There's no active order for you here. Check the job board at Alexanderplatz to take one.");
  if(remaining(d)<=0)return view("Delivery pickup","The time limit is over. Go back to the job board at Alexanderplatz to start again.",[],["No money charged and no pay given."]);
  const p=options[d.shift.variant];
  return view("Hermannplatz · aflevercontrole",
   "You're at the drop-off point. Dispatch gave you this instruction: "+p.note+" Choose who you hand the order to.",
   p.choices.map((c,i)=>opt("recipient-"+i,c.label)),
   ["Time left: "+fmt(remaining(d)),flash]);
 }
 if(id==="alexanderplatz:miro"){
  if(!available(id))return view("Miro isn't here","You can usually find Miro around Alexanderplatz between 18:00 and 23:00. Come back during his evening hours.");
  if(staged?.id===id&&staged.phase==="miro-follow")return view("Miro · the introduction",
   "Miro: 'An organiser is looking for someone for busy nights. Money isn't the only thing to think about. What matters to you before I introduce you?'",
   [opt("miro-safety","Who is responsible for safety and breaks?"),
    opt("miro-speed","Can you send me the contact details right away?"),
    opt("miro-rules","How does this organisation treat its staff?")],
   ["There is no perfect choice: your priorities affect how much Miro trusts you."]);
  return view("Miro · nightlife-contact",
   d.miroLastDay===currentDay()?"Miro: 'We already talked about that organiser today. Come back tomorrow if anything changes.'":
   "Miro knows an organiser and wants to know if you're reliable. An introduction can later give access to a new employer.",
   d.miroLastDay===currentDay()?[]:[opt("miro-intro","Calmly ask about the client"),opt("miro-direct","Ask for an introduction right away")],
   ["Trust with Miro: "+d.miroTrust,flash]);
 }
 if(id==="kottbusser-tor:deniz"){
  if(staged?.id===id&&staged.phase==="deniz-follow")return view("Deniz · Courier in Kreuzberg",
   "Deniz: 'You arrive at a locked door. The customer doesn't answer, but someone on the street is willing to take the parcel. What do you do?'",
   [opt("deniz-check","Call the client and verify the handover"),
    opt("deniz-leave","Leave the parcel at the door and take a photo"),
    opt("deniz-stranger","Give the parcel to the volunteer and write down his name")],
   ["Speed and reliability aren't always on the same side."]);
  return view("Deniz · Kottbusser Tor",
   d.denizLastDay===currentDay()?"Deniz: 'We already discussed the route problems today. New jobs will follow later.'":
   "Deniz has experience with delivery work in Kreuzberg. He asks what you would do if a job gets unexpectedly complicated.",
   d.denizLastDay===currentDay()?[]:[opt("deniz-intro","Discuss a tricky delivery situation")],
   ["Trust with Deniz: "+d.denizTrust,flash]);
 }
 if(id==="spittelmarkt:architecture"){
  if(d.civic)return view("Spittelmarkt · DDR-stadslaag",
   "You've already given the participation advice: "+d.civic.summary,
   [],["Berlin Knowledge is already registered for this scenario.",flash]);
  if(staged?.id===id&&staged.phase==="civic-follow")return view("Spittelmarkt · residents",
   "Your proposal has been submitted. The city has little time. How do you organise public consultation without sidelining the residents involved?",
   [opt("civic-open","Organise consultation before the decision, despite the delay"),
    opt("civic-fast","Put one worked-out plan on public display right away"),
    opt("civic-council","Let a citizens' council chosen by lot help shape the advice")],
   ["Earlier choice: "+(staged?.choiceName||"—")]);
  return view("Spittelmarkt · urban dilemma",
   "A GDR housing block is outdated. Residents fear rising rents, heritage experts argue for keeping the facade and the city is looking for extra homes. You give advice.",
   [opt("civic-preserve","Keep the whole block, even if it gives fewer homes"),
    opt("civic-build","Redevelop the block completely for more homes"),
    opt("civic-mixed","Keep the street facade and build affordable homes in the courtyard")],
   ["Afterwards you also have to choose how the decision-making goes.",flash]);
 }
 return view("Unknown activity","This activity isn't available yet.");
}
function choose(id,choice){
 if(!has(id)||!ensureLocation(id))return viewId(id);
 const d=data();if(!d)return viewId(id);
 flash="";
 if(id==="alexanderplatz:vacatures"){
  if(choice==="shift-details"){flash="The eight minutes only start counting once you accept. A handover without a verified recipient doesn't count.";return viewId(id)}
  if(choice==="shift-cancel"&&d.shift){d.shift=null;event("Courier run cancelled voluntarily","courier");return viewId(id)}
  if(choice==="shift-reset"&&d.shift&&remaining(d)<=0){d.shift=null;event("Expired courier run ended","courier");return viewId(id)}
  if(choice==="shift-info")return viewId(id);
  if(choice==="shift-accept"&&!d.shift&&d.lastDeliveryDay!==currentDay()){
   const variant=(d.deliveries||0)%options.length;
   d.shift={startedAt:Date.now(),variant,from:HOME,to:DEST};event("Courier run accepted, destination Hermannplatz · "+options[variant].note,"courier");
   return viewId(id);
  }
 }
 if(id==="hermannplatz:delivery"&&/^recipient-[0-2]$/.test(choice)&&d.shift){
  if(remaining(d)<=0)return viewId(id);
  const n=Number(choice.slice(-1));const info=options[d.shift.variant];
  if(!info.choices[n]?.ok){flash="This person can't confirm all the details. You keep the parcel and try again.";return viewId(id)}
  const money=window.BerlinLife?.economy||window.BerlinLife?.game?.economy;
  if(!money?.earn){flash="The money system isn't available. The delivery stays active, so you don't lose your pay.";return viewId(id)}
  const tip=remaining(d)>=120000?200:0;
  const pay=1500+tip;
  try{money.earn(pay,"Courier Alexanderplatz → Hermannplatz"+(tip?" + tip":""))}catch(e){flash="Payment could not be processed. Try again.";return viewId(id)}
  d.shift=null;d.deliveries++;d.lastDeliveryDay=currentDay();
  const st=life()?.state;if(st){st.career??={};st.career.courierDeliveries=(st.career.courierDeliveries||0)+1;st.reputation??={};st.reputation.hospitality=(st.reputation.hospitality||0)+2}
  event("Run delivered at Hermannplatz. Pay €15"+(tip?" and a €2 tip":"")+".","courier");
  flash="Parcel delivered after checking. "+(tip?"€17 including tip":"€15")+" earned.";
  return view("Hermannplatz · job completed",flash,[],["Runs: "+d.deliveries,"Hospitality reputation +2"]);
 }
 if(id==="alexanderplatz:miro"&&available(id)){
  if((choice==="miro-intro"||choice==="miro-direct")&&d.miroLastDay!==currentDay()){
   if(choice==="miro-direct"){staged={id,phase:"miro-follow",pushy:true};return viewId(id)}
   staged={id,phase:"miro-follow",pushy:false};return viewId(id);
  }
  const results={"miro-safety":[2,"You ask about safety and breaks. Miro feels you take responsibility seriously."],
    "miro-speed":[-1,"You want a quick introduction. Miro wonders whether you should understand the context first."],
    "miro-rules":[1,"You ask how staff are treated. Miro sees that you look beyond the rate."]};
  if(staged?.id===id&&results[choice]){
   const [gain,message]=results[choice];d.miroTrust+=gain;d.miroLastDay=currentDay();
   const st=life()?.state;if(st){st.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};st.berlinJournal.contacts??={};st.berlinJournal.contacts.miro=true;st.reputation??={};st.reputation.nightlife=(st.reputation.nightlife||0)+Math.max(0,gain)}
   staged=null;event(message,"contact");return view("Miro · conversation finished",message,[],["Miro trust: "+d.miroTrust,"Nightlife reputation: "+(st?.reputation?.nightlife||0)]);
  }
 }
 if(id==="kottbusser-tor:deniz"){
  if(choice==="deniz-intro"&&d.denizLastDay!==currentDay()){staged={id,phase:"deniz-follow"};return viewId(id)}
  const outcomes={"deniz-check":[2,"Deniz appreciates that you check the handover before you let go of the parcel."],
   "deniz-leave":[-1,"Deniz: 'Then nobody knows for sure whether the order really arrived.'"],
   "deniz-stranger":[0,"Deniz: 'A name on paper says nothing about the authorised recipient either.'"]};
  if(staged?.id===id&&outcomes[choice]){
   const [delta,message]=outcomes[choice];d.denizTrust+=delta;d.denizLastDay=currentDay();staged=null;
   const st=life()?.state;if(st){st.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};st.berlinJournal.contacts??={};st.berlinJournal.contacts.deniz=true;st.reputation??={};st.reputation.hospitality=(st.reputation.hospitality||0)+Math.max(0,delta)}
   event(message,"contact");return view("Deniz · conversation finished",message,[],["Deniz trust: "+d.denizTrust,"Tip: check the job openings at Alexanderplatz for a real courier job"]);
  }
 }
 if(id==="spittelmarkt:architecture"){
  const plans={"civic-preserve":"full preservation of the GDR buildings","civic-build":"full redevelopment for extra homes","civic-mixed":"keeping the street facade with affordable new build"};
  if(plans[choice]&&!d.civic){staged={id,phase:"civic-follow",choice,choiceName:plans[choice]};return viewId(id)}
  const stages={"civic-open":"broad consultation up front, with extra lead time","civic-fast":"quick formal public display, with a risk of less support","civic-council":"a citizens' council chosen by lot for additional advice"};
  if(staged?.id===id&&stages[choice]&&!d.civic){
   d.civic={plan:staged.choice,participation:choice,summary:staged.choiceName+" and "+stages[choice]};staged=null;
   const s=life()?.state;if(s){s.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};s.berlinJournal.knowledge=(s.berlinJournal.knowledge||0)+1;s.reputation??={};s.reputation.bvg=(s.reputation.bvg||0)+(choice==="civic-council"?2:1)}
   event("Urban planning advice: "+d.civic.summary,"civic");return view("Spittelmarkt · advice submitted","Your advice has been recorded: "+d.civic.summary+". There's no ready-made solution; your choice sets different priorities.",[],["Berlin Knowledge +1","Civic/BVG reputation: "+(s?.reputation?.bvg||0)]);
  }
 }
 return viewId(id);
}
window.BerlinCityEpisodes={version:1,has,view:viewId,choose,open:id=>viewId(id),get state(){return data()},get activeShift(){return data()?.shift},remaining:()=>remaining()};
console.info("[Berlin Life] City episodes: courier route, Miro and Deniz dialogue, Spittelmarkt planning");
})();
