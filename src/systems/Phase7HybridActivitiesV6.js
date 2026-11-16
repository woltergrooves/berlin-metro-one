import { Tick } from '../state/Tick.js';
(function phase7HybridV6() {
  "use strict";
  const SHOP_ID = "alexanderplatz:spaeti";
  const CLOCK_ID = "alexanderplatz:weltzeituhr";
  const SQUARE_ID = "stadtmitte:gendarmen";
  const WALL_ID = "bernauer-strasse:wall";
  const ITEMS = [
    {id:"wasser",name:"Mineralwasser",price:150,emoji:"💧",note:"+8 energy",effect:8,container:false},
    {id:"mate",name:"Club-Mate",price:260,emoji:"🧉",note:"+14 energy · bottle with Pfand",effect:14,container:true},
    {id:"boerek",name:"Börek",price:320,emoji:"🥐",note:"+22 energy",effect:22,container:false}
  ];
  const money=c=>`€${(Number(c||0)/100).toFixed(2)}`;
  const st=()=>window.BerlinLife?.state;
  const econ=()=>window.BerlinLife?.economy||window.BerlinLife?.game?.economy;
  const disc=()=>window.BerlinPhase34?.discovery;
  const slot=()=>window.BerlinSaveSlots?.active||"normal";
  const city=()=>window.BerlinCityDiscovery;
  const station=()=>city()?.where?.();
  let root=null,card=null,mode=null,msg="",wired=false,activeActivity=null;
  function ensure(){
    const s=st();if(!s)return null;
    if(!s.phase7Hybrid)s.phase7Hybrid={schema:1,visited:[],inventory:{},energy:60,spent:0,returns:0,quizSolved:false,quizAttempts:0};
    s.phase7Hybrid.visited=s.phase7Hybrid.visited||[];s.phase7Hybrid.historicSolved=s.phase7Hybrid.historicSolved||{};s.phase7Hybrid.historicAttempts=s.phase7Hybrid.historicAttempts||{};
    s.phase7Hybrid.activitySolved=s.phase7Hybrid.activitySolved||{};
    s.phase7Hybrid.activityAttempts=s.phase7Hybrid.activityAttempts||{};
    s.phase7Hybrid.courierShifts=s.phase7Hybrid.courierShifts||{};
    s.phase7Hybrid.socialContacts=s.phase7Hybrid.socialContacts||{};
    return s.phase7Hybrid;
  }
  function store(){
    const data=ensure();if(!data)return;
    window.BerlinLife?.save?.();
    const d=disc();if(d)try{localStorage.setItem("berlin-discovery-v4@"+slot(),JSON.stringify(d))}catch{}
    window.dispatchEvent(new CustomEvent("berlin:discovery-updated"));
  }
  function message(text){msg=text;draw()}
  function stamp(id,name,{knowledge=false}={}){
    const data=ensure(),s=st();if(!data||!s)return;
    const first=!data.visited.includes(id);
    if(first)data.visited.push(id);
    const d=disc();
    if(d){
      d.discovered=d.discovered||{};d.visited=d.visited||{};
      d.discovered[id]=true;d.visited[id]=(d.visited[id]||0)+1;
    }
    const j=s.berlinJournal||(s.berlinJournal={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}});
    j.stamps=j.stamps||[];j.entries=j.entries||[];
    if(!j.stamps.includes(id))j.stamps.push(id);
    if(knowledge&&first)j.knowledge=(j.knowledge||0)+1;
    j.entries.unshift({id,name,kind:"phase7",station:station()?.id||"alexanderplatz",text:knowledge?name+"job completed.":"Späti interior visited.",day:s.clock?.day??0,minute:Math.round(s.clock?.minute||0)});
    j.entries=j.entries.slice(0,80);
    store();
  }
  const styles=`
#berlin-phase7{position:fixed;inset:0;z-index:43000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.78);backdrop-filter:blur(9px);font-family:-apple-system,BlinkMacSystemFont,Inter,Arial,sans-serif;color:#fff;overscroll-behavior:contain;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);box-sizing:border-box}
#berlin-phase7.open{display:flex}
#berlin-phase7 .p7-shell{width:min(590px,100vw);max-height:min(94dvh,850px);display:flex;flex-direction:column;overflow:hidden;background:#10161d;border:1px solid #ffffff31;border-radius:22px;box-shadow:0 18px 60px #000b}
#berlin-phase7 .p7-bar{display:flex;align-items:center;gap:12px;justify-content:space-between;background:#10151c;border-bottom:1px solid #ffffff1b;padding:13px 15px;flex-shrink:0}
#berlin-phase7 .p7-bar strong{font-weight:900;font-size:17px}
#berlin-phase7 .p7-bar small{color:#a8b4c0;font-size:10px;display:block;margin-top:3px}
#berlin-phase7 button{font-family:inherit;touch-action:manipulation;cursor:pointer}
#berlin-phase7 button:focus-visible{outline:3px solid #fff1a4;outline-offset:2px}
#berlin-phase7 .p7-x{width:38px;height:38px;flex-shrink:0;border-radius:11px;border:1px solid #ffffff26;background:#28313d;color:#fff;font-size:22px}
#berlin-phase7 .p7-scroll{padding:0 13px 18px;overflow:auto;overscroll-behavior:contain;flex:1;min-height:0}
#berlin-phase7 .p7-scene{height:185px;position:relative;border-radius:0 0 17px 17px;overflow:hidden;margin:0 -13px 14px;background:linear-gradient(0deg,#3c4346 0 24%,#937a53 24% 29%,#2a4842 29% 100%)}
#berlin-phase7 .p7-store-sign{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:#eed21b;color:#1a1a1a;padding:8px 22px;border-radius:5px;font-weight:1000;letter-spacing:.16em;box-shadow:0 5px 0 #987c0b;white-space:nowrap}
#berlin-phase7 .p7-shelf{position:absolute;left:8%;right:8%;top:64px;height:63px;border-bottom:7px solid #222;display:flex;justify-content:space-around;align-items:flex-end;font-size:35px;background:linear-gradient(#2a3137aa,#42585a22);border-radius:8px}
#berlin-phase7 .p7-counter{position:absolute;left:4%;right:4%;bottom:4px;height:46px;background:linear-gradient(#9b8566 0 17%,#4b3931 17%);border-radius:6px 6px 0 0;box-shadow:0 -6px 19px #0005}
#berlin-phase7 .p7-person{position:absolute;right:16%;bottom:41px;font-size:58px;filter:drop-shadow(0 3px 3px #0009)}
#berlin-phase7 .p7-clock-scene{height:175px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 52% 40%,#373a43,#141d29 76%);position:relative;margin:0 -13px 14px;border-radius:0 0 16px 16px;overflow:hidden}
#berlin-phase7 .p7-clock-scene:before{content:"";position:absolute;width:190px;height:190px;border:7px dashed #dbbb51;transform:rotate(14deg);border-radius:50%;opacity:.6}
#berlin-phase7 .p7-clock-icon{z-index:1;font-size:92px;filter:drop-shadow(0 4px 14px #000c)}
#berlin-phase7 .p7-intro{font-size:12px;line-height:1.5;color:#afbdca;margin:0 0 10px}
#berlin-phase7 .p7-row{display:flex;gap:8px;align-items:stretch;background:#1d2731;border:1px solid #ffffff1b;border-radius:13px;padding:11px;margin-bottom:8px}
#berlin-phase7 .p7-icon{font-size:25px;width:33px;flex-shrink:0}
#berlin-phase7 .p7-desc{flex:1;min-width:0}
#berlin-phase7 .p7-desc strong{font-size:13px;display:block}
#berlin-phase7 .p7-desc small{color:#9daab7;font-size:10px;line-height:1.4;display:block;margin-top:3px}
#berlin-phase7 .p7-cost{font-size:11px;font-weight:900;color:#eed21b;display:block;margin-top:5px}
#berlin-phase7 .p7-action{background:#f0c827;color:#181818;border:0;border-radius:10px;padding:11px 13px;font-weight:900;font-size:11px;align-self:center;min-width:70px}
#berlin-phase7 .p7-action:disabled{opacity:.4;cursor:default}
#berlin-phase7 .p7-section{font-size:10px;letter-spacing:.13em;color:#8295a6;font-weight:900;margin:15px 0 8px}
#berlin-phase7 .p7-grid{display:flex;gap:7px;flex-wrap:wrap;padding:7px 0}
#berlin-phase7 .p7-stat{background:#1e2c37;border-radius:11px;padding:10px 12px;min-width:75px;flex:1}
#berlin-phase7 .p7-stat b{display:block;font-size:16px}
#berlin-phase7 .p7-stat small{display:block;color:#9babba;font-size:10px;margin-top:3px}
#berlin-phase7 .p7-alert{padding:11px;border-radius:12px;background:#203c35;border:1px solid #3f8b70;color:#dff7e6;line-height:1.4;font-size:12px;margin:12px 0}
#berlin-phase7 .p7-option{width:100%;text-align:left;background:#222e3b;color:#fff;border:1px solid #ffffff25;border-radius:12px;padding:15px 12px;margin:6px 0;font-size:13px;font-weight:700}
#berlin-phase7 .p7-option[disabled]{opacity:.6}
#berlin-phase7 .p7-finish{width:100%;background:#f0c827;color:#181818;border:0;border-radius:12px;padding:14px;margin:14px 0 4px;font-size:13px;font-weight:900}
@media(max-width:600px){#berlin-phase7{align-items:flex-end}#berlin-phase7 .p7-shell{max-height:91dvh;border-radius:22px 22px 0 0;border-bottom:none}#berlin-phase7 .p7-scene{height:150px}}
`;
  function mount(){
    if(root)return;
    const css=document.createElement("style");css.id="berlin-phase7-style";css.textContent=styles;document.head.appendChild(css);
    root=document.createElement("div");root.id="berlin-phase7";
    root.innerHTML='<section class="p7-shell" role="dialog" aria-modal="true" aria-label="Activity"><header class="p7-bar"><div><strong id="p7-title">Activity</strong><small id="p7-sub">Berlin Life · Phase 7</small></div><button class="p7-x" type="button" data-p7="close" aria-label="Close activity">✕</button></header><div class="p7-scroll"></div></section>';
    document.body.appendChild(root);card=root.querySelector(".p7-scroll");
    root.addEventListener("click",e=>{if(e.target===root){close();return}const b=e.target.closest("button[data-p7]");if(!b)return;const action=b.dataset.p7;
      if(action==="close")close();
      else if(action==="buy")buy(b.dataset.item);
      else if(action==="consume")consume(b.dataset.item);
      else if(action==="return")returnBottle();
      else if(action==="answer")answer(Number(b.dataset.answer));
      else if(action==="city-choice")cityChoice(Number(b.dataset.choice));
      else if(action==="answer-historic")answerHistoric(Number(b.dataset.answer));
      else if(action==="reset"){msg="";draw()}
    });
    window.addEventListener("keydown",e=>{if(e.key==="Escape"&&root?.classList.contains("open"))close()});
  }
  function open(type,id=null){
    const stn=station(),player=window.__berlinMetroGame?.player;
    if(!stn||!player?.__streetMode)return false;
    if(type==="clock"&&!city()?.atClock?.())return false;
    if(type==="square"&&!city()?.atLocation?.(SQUARE_ID))return false;
    if(type==="wall"&&!city()?.atLocation?.(WALL_ID))return false;
    if(type==="sight"&&!city()?.atLocation?.(id))return false;
    if(type==="shop"&&!["alexanderplatz","kottbusser-tor","hermannplatz"].includes(stn.id))return false;
    if(!["shop","clock","square","wall","sight","social","courier","explore"].includes(type))return false;
    if(!ensure())return false;
    mount();mode=type;activeActivity=id||("city:"+stn.id);activeChallenge=selectChallenge(type,activeActivity);msg="";
    if(type==="shop")stamp(stn.id+":spaeti","Späti · "+stn.name);
    root.classList.add("open");city()?.close?.();draw();return true;
  }
  function close(){root?.classList.remove("open");mode=null;msg="";activeActivity=null;activeChallenge=null}
  function purchase(id){
    const item=ITEMS.find(i=>i.id===id);return item||null;
  }
  function buy(id){
    const p=ensure(),item=purchase(id),economy=econ();
    if(!p||!item)return;
    if(!economy?.spend){message("The economy isn't loaded yet.");return}
    const result=economy.spend(item.price,"Späti · "+item.name);
    if(result?.success===false){message("You don't have enough money for "+item.name+".");return}
    p.inventory[item.id]=(p.inventory[item.id]||0)+1;
    p.spent=(p.spent||0)+item.price;store();
    message("Bought: "+item.name+". It's in your supplies now.");
  }
  function consume(id){
    const p=ensure(),item=purchase(id);if(!p||!item)return;
    if(!(p.inventory[item.id]>0)){message("You don't have this product in your supplies.");return}
    p.inventory[item.id]--;
    p.energy=Math.min(100,Math.max(0,p.energy||0)+item.effect);
    if(item.container)p.emptyBottles=(p.emptyBottles||0)+1;
    store();message(item.name+" used. Energy +"+item.effect+(item.container?" · You have an empty Pfand bottle.":"")+".");
  }
  function returnBottle(){
    const p=ensure(),e=econ();if(!p||!e?.earn)return;
    if(!(p.emptyBottles>0)){message("You don't have any empty Pfand bottles.");return}
    p.emptyBottles--;e.earn(25,"Pfand · Späti");
    p.returns=(p.returns||0)+1;store();message("Pfand returned: +€0.25 to your account.");
  }

  // City decisions deliberately avoid obvious wrong answers and a fixed B-key.
  // Accurate history: Weltzeituhr (1969), Schinkel's Schauspielhaus,
  // and the preserved Bernauer Straße border installations.
  const CHALLENGES={
    clock:[
      {prompt:"The Weltzeituhr was unveiled on 30 September 1969. Which political and urban planning context does that date fit?",
       options:["As part of the redesign around the GDR's twentieth anniversary.","For the European Capital of Culture campaign after reunification.","To mark the first through S-Bahn connection to West Berlin."],correct:0,
       hint:"Think about the political meaning of Alexanderplatz in the late sixties.",explain:"The clock was unveiled on 30 September 1969 during the redesign of Alexanderplatz around the twentieth anniversary of the GDR."},
      {prompt:"Which description of the Weltzeituhr's mechanism is the most accurate?",
       options:["The outer ring turns once a day and moves the city names.","A central time scale turns past the city names and time zones.","The clock only shows the Berlin hour; the other times are fixed."],correct:1,
       hint:"Pay attention to which part lets time pass and which part holds the place names.",explain:"A rotating time scale in the middle lets you read the local times at the places and time zones."},
      {prompt:"What does the planetary model on top of the Weltzeituhr primarily represent?",
       options:["The universe as a reference for measuring and dividing time.","The historic planetary map of the Berlin observatory.","The orbits of satellites the clock receives radio time from."],correct:0,
       hint:"It's about the idea behind timekeeping, not the power supply.",explain:"The rotating planetary model symbolically refers to the movement of celestial bodies as the basis of timekeeping."}
    ],
    square:[
      {prompt:"There's an architectural trap with the two 'Dome' on the Gendarmenmarkt. Which explanation is correct?",
       options:["They were originally royal palace chapels that were converted into cathedrals.","The names refer to imposing domed towers next to separate church buildings.","Both buildings were national museums with no religious function from the start."],correct:1,
       hint:"The name 'Dom' here doesn't simply refer to the function of the whole structure.",explain:"The Deutscher Dom and Französischer Dom take their names from the domed towers, next to the original church buildings."},
      {prompt:"The Konzerthaus was once a Schauspielhaus. Who designed the rebuild after the fire of 1817?",
       options:["Carl Gotthard Langhans, known for the Brandenburger Tor.","Karl Friedrich Schinkel, who designed the theatre in 1818–1821.","Peter Joseph Lenné, who mainly designed the square and its gardens."],correct:1,
       hint:"The architect became a defining figure of Prussian classicism.",explain:"Karl Friedrich Schinkel designed the Schauspielhaus, built between 1818 and 1821."},
      {prompt:"The name 'Gendarmenmarkt' wasn't invented for a Christmas market. Where does it come from?",
       options:["From the Prussian cuirassier regiment Gens d'armes that had stables here.","From the gendarmerie post built between the two churches after 1871.","From the French embassy, which managed the square when the city was divided."],correct:0,
       hint:"The historical trail leads to a regiment, not to a later event venue.",explain:"The name refers to the Gens d'armes, a cuirassier regiment that had its stables here."}
    ],
    wall:[
      {prompt:"Why were escapes from houses on Bernauer Straße possible in August 1961?",
       options:["Their back gardens formed a shared access path without border guards.","The houses were in East Berlin, but the pavement in front was already in West Berlin.","The nearby metro station was still a freely accessible border crossing back then."],correct:1,
       hint:"Look at the border between facade and pavement, not at the tracks.",explain:"The houses were in the Soviet sector, while the pavement in front belonged to the French sector. People jumped out of windows into West Berlin."},
      {prompt:"The Kapelle der Versöhnung stands on a loaded site. What happened to the earlier church?",
       options:["The GDR had the church blown up in 1985 because it stood in the border area.","The building was destroyed in 1945 and only rediscovered archaeologically after 1989.","The city sold the church in 1961 to build a border station."],correct:0,
       hint:"The church survived the war, but not the later border security.",explain:"The Versöhnungskirche ended up in the border strip and was blown up by the GDR in 1985."},
      {prompt:"What makes the memorial on Bernauer Straße special as historical evidence?",
       options:["A re-erected piece of wall without the original border installations.","A preserved part of the border system with several layers and the former border strip.","The original Checkpoint Charlie post and the first GDR border gate."],correct:1,
       hint:"The site shows more than a single concrete wall.",explain:"Parts of the border installations and the former border strip have been preserved, so the structure is visible."}
    ],
    courier:[
      {prompt:"You're at the right house number. The name on the doorbell is missing and the customer doesn't answer. The instructions say 'hand over in person'. What do you do?",
       options:["Ask for confirmation via the delivery app and otherwise follow the failed delivery procedure.","Ask the caretaker to take the parcel and write down his name, even without authorisation.","Take a delivery photo of the locked parcel box and report it as delivered, even though there's no permission for that."],correct:0,
       hint:"The right building isn't the same as a confirmed recipient.",explain:"With in-person delivery, the identity or receipt has to be confirmed. Without that you follow the failed delivery procedure."},
      {prompt:"A resident asks you to drop a parcel for no. 18 at no. 18A, 'because it's the same building'. What's best?",
       options:["First call the number the resident gives and deliver at 18A once that person confirms the change.","First check the address and recipient in the job and ask for a confirmed change if needed.","Ask the resident to put his name on the receipt; that seems a sufficient address change."],correct:1,
       hint:"A verbal change from someone else isn't a verified delivery instruction.",explain:"You stick to the registered address and recipient until an address change has been reliably confirmed."},
      {prompt:"You have two parcels for the same street, but different house numbers. The scan for the first one fails. Which action prevents a mistake?",
       options:["Record both deliveries together with one manual route confirmation and separate photos.","Write down both parcel numbers with one route code and only update the scans afterwards.","Check the parcel label and drop-off point separately and don't register a delivery you didn't make."],correct:2,
       hint:"A scan confirms one shipment, not a street or route.",explain:"Each shipment has its own delivery record; you may not use the scan of another parcel."}
    ],
    social:[
      {prompt:"Miro says: 'We sometimes look for people for the door, but most disappear after one night.' How do you respond to get a real chance?",
       options:["Ask which hours you can fill in, what the expectations are and how you can show you're reliable.","Suggest you first shadow one busy shift without talking about regular availability.","Ask for a regular shift right away and only then discuss how flexible you can be."],correct:0,
       hint:"His remark is mainly about trust and showing up.",explain:"A focused question about expectations and commitment builds a working relationship without demanding anything right away."},
      {prompt:"Deniz knows someone who organises music nights, but doesn't want to make empty promises. What's the smartest follow-up question?",
       options:["Whether you can send him a mix, without first asking what kind of night it will be.","Whether there's a concrete problem where you can help in a small way first or show experience.","Whether Deniz can introduce you to the organisation first and then hear what help would be useful."],correct:1,
       hint:"A useful first contribution works better than pushing for a commitment.",explain:"By proposing a concrete contribution, a casual introduction becomes a credible chance."},
      {prompt:"An acquaintance says there's temporary work, but only knows a first name. Which response keeps the contact and helps you further?",
       options:["Ask for a reliable contact channel and a description of the work before you commit.","Ask about the working hours and commit already, even if the exact tasks stay unknown.","Ask for an introduction to his contact person, but only ask about the work after the first shift."],correct:0,
       hint:"Showing interest doesn't have to mean a commitment right away.",explain:"You ask enough information to take a next step seriously and safely."}
    ],
    explore:[
      {prompt:"You see a renovated facade opposite an older station building. What can you conclude from that with the most certainty?",
       options:["That the whole district was almost completely rebuilt after 1990.","That different construction and renovation periods can be visible side by side.","That the older building must automatically date from the nineteenth century."],correct:1,
       hint:"A visible difference proves a difference, not an exact date right away.",explain:"Different building layers exist side by side; for precise dating you need to look for additional clues."},
      {prompt:"An information board mentions a former street name. Which conclusion is best supported?",
       options:["The name change can say something about shifts in power, remembrance or urban development.","The former name proves that the street was closed during the GDR.","The current name is always chosen to hide the former street layout."],correct:0,
       hint:"Street names are sources about how places are seen, but don't tell the whole story on their own.",explain:"Name changes can be politically or culturally meaningful, without you automatically deriving traffic or border history from them."},
      {prompt:"Two historical photos show the same square from different angles. How do you compare them carefully?",
       options:["Look only at the central monument; photographic perspective doesn't matter.","Treat every difference in width as proof that the square was enlarged.","Look for fixed landmarks and check the perspective and date taken before you point out changes."],correct:2,
       hint:"Distance and angle change the apparent size.",explain:"You avoid wrong conclusions by setting perspective and dates against fixed landmarks."}
    ],
    sight:[
      {prompt:"A monument carries an older construction date and a modern restoration plaque. Which reading is the most careful?",
       options:["The restoration date replaces the historical construction date.","Both dates can be right: they refer to different phases of the same structure.","The original date was probably made up for tourists."],correct:1,
       hint:"Construction, damage and restoration are separate phases.",explain:"A monument can be old and later heavily restored."},
      {prompt:"At the site you see a monument and an explanation of what used to stand in the same place. Which interpretation holds up?",
       options:["The current layout doesn't automatically tell the complete historical story of the location.","The oldest building is always the most important for the meaning of the place.","A new monument proves there was no other use before."],correct:0,
       hint:"A place often has several historical layers.",explain:"You combine visible elements with historical information to understand the meaning of the location."},
      {prompt:"A historic building has changed function. What's the strongest clue to understand that development?",
       options:["Only the current name on the facade.","The popularity of the location among visitors.","A combination of the original function, alterations and the current use."],correct:2,
       hint:"With conversions, changes over time are essential.",explain:"The historical and current functions and the alterations in between explain the building's development."}
    ]
  };
  const questSeed=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  let activeChallenge=null;
  function selectChallenge(type,id){
    const list=CHALLENGES[type]||CHALLENGES.explore;
    const day=Math.floor(Number(st()?.clock?.totalMinutes||0)/1440);
    const seed=questSeed(type+":"+id+":"+day);
    const q=list[seed%list.length];
    const order=q.options.map((_,i)=>i);
    // Deterministic shuffle across locations, so the right answer is not always B.
    let state=seed||1;
    for(let i=order.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[order[i],order[j]]=[order[j],order[i]]}
    return{...q,options:order.map(i=>q.options[i]),correctIndex:order.indexOf(q.correct),answered:false};
  }
  function questionUI(action){
    const q=activeChallenge;if(!q)return "";
    return '<div class="p7-section">'+q.prompt+'</div>'+
      q.options.map((answer,i)=>'<button class="p7-option" data-p7="'+action+'" data-answer="'+i+'" data-choice="'+i+'" type="button">'+
      String.fromCharCode(65+i)+'. '+answer+'</button>').join('');
  }
  function verifyChoice(index){
    const q=activeChallenge;return!!q&&Number.isInteger(index)&&index>=0&&index<q.options.length&&index===q.correctIndex;
  }
  function incorrect(kind){
    const q=activeChallenge;
    store();
    message((kind==='courier'?'The delivery procedure isn\'t right yet. ':'Not quite. ')+(q?.hint||'Reread the situation and try again.'));
  }

  function answer(n){
    const p=ensure();if(!p||mode!=="clock")return;
    p.quizAttempts=(p.quizAttempts||0)+1;
    if(!verifyChoice(n)){incorrect("clock");return}
    if(!p.quizSolved){
      p.quizSolved=true;
      stamp(CLOCK_ID,"Weltzeituhr",{knowledge:true});
      message("Well researched. "+activeChallenge.explain+" +1 Berlin Knowledge and a City Stamp.");
    }else{store();message("Well argued. "+activeChallenge.explain+" You've already received the reward earlier.")}
  }
  function answerHistoric(n){
    if(mode!=="square"&&mode!=="wall")return;
    const data=ensure();if(!data)return;
    const id=mode==="square"?SQUARE_ID:WALL_ID;
    data.historicAttempts[id]=(data.historicAttempts[id]||0)+1;
    if(!verifyChoice(n)){incorrect("history");return}
    if(!data.historicSolved[id]){
      data.historicSolved[id]=true;
      stamp(id,mode==="square"?"Gendarmenmarkt":"Gedenkstätte Berliner Mauer",{knowledge:true});
      message("Well researched. "+activeChallenge.explain+" +1 Berlin Knowledge and a City Stamp.");
    }else{store();message("Well researched. "+activeChallenge.explain+" The reward is one-time only.")}
  }
  function cityChoice(choice){
    if(!["explore","social","courier","sight"].includes(mode))return;
    const s=ensure(),stn=station(),id=activeActivity||("city:"+(stn?.id||"berlin"));
    if(!s||!stn)return;
    s.activityAttempts[id]=(s.activityAttempts[id]||0)+1;
    const isCourier=mode==="courier",isSocial=mode==="social";
    if(!verifyChoice(choice)){incorrect(mode);return}
    const note=activeChallenge.explain;
    if(isCourier){
      const minutes=Number(st()?.clock?.totalMinutes||0);
      const dayKey=Math.floor(minutes/1440);
      const key=stn.id+":"+dayKey;
      if(s.courierShifts[key]){store();message("This courier shift has already been paid today. You can get back to work tomorrow.");return}
      const economy=econ();if(typeof economy?.earn!=="function"){message("The economy isn't available yet.");return}
      const payment=850;
      s.courierShifts[key]=true;
      economy.earn(payment,"Courier service · "+stn.name);
      stamp(id,"Courier job at "+stn.name);
      message("Job completed. "+note+" +"+money(payment)+" earned. Another shift tomorrow.");
      return;
    }
    if(isSocial){
      const contact=stn.id==="alexanderplatz"?"Miro":"Deniz";
      if(s.socialContacts[contact]){store();message("You already have "+contact+" in your contacts. "+note);return}
      s.socialContacts[contact]=true;
      stamp(id,"Conversation with "+contact);
      const j=st()?.berlinJournal;
      if(j){j.contacts=j.contacts||{};j.contacts[contact]=true;j.leads=j.leads||{};j.leads[contact.toLowerCase()+"-lead"]=true}
      store();message(note+" "+contact+" has been added to your contacts. You have a new work lead.");
      return;
    }
    if(s.activitySolved[id]){store();message("You've already investigated this place. "+note+" The reward is one-time only.");return}
    s.activitySolved[id]=true;
    stamp(id,mode==="sight"?"Visit to "+(city()?.activities?.()?.find(a=>a.id===id)?.name||stn.name):"Neighbourhood walk "+stn.name,{knowledge:true});
    message(note+" +1 Berlin Knowledge and a new City Stamp.");
  }

  function balance(){
    try{return econ()?.snapshot?.().balanceCents}catch{return null}
  }
  function draw(){
    if(!card||!root?.classList.contains("open"))return;
    const p=ensure(),total=balance();
    if(!p)return;
    if(mode==="shop"){
      root.querySelector("#p7-title").textContent="🥤 Späti · "+(station()?.name||"Berlin");
      root.querySelector("#p7-sub").textContent=(station()?.name||"Berlin")+" · interactive 2D shop";
      card.innerHTML=`
        <div class="p7-scene" aria-label="2D Späti with shelves and counter"><div class="p7-store-sign">SPÄTI · BERLIN</div><div class="p7-shelf"><span>🥤</span><span>🥨</span><span>🧃</span><span>🍫</span></div><div class="p7-person">🧑‍💼</div><div class="p7-counter"></div></div>
        <p class="p7-intro">“Na, wat soll's sein?” Pick something from the shelf. You pay with the same money as in the rest of Berlin Life.</p>
        <div class="p7-grid"><div class="p7-stat"><b>${total==null?"—":money(total)}</b><small>Available</small></div><div class="p7-stat"><b>${p.energy||0}/100</b><small>Energy</small></div><div class="p7-stat"><b>${money(p.spent)}</b><small>Spent here</small></div></div>
        <div class="p7-section">IN THE SHOP</div>
        ${ITEMS.map(i=>`<div class="p7-row"><span class="p7-icon">${i.emoji}</span><div class="p7-desc"><strong>${i.name}</strong><small>${i.note}</small><span class="p7-cost">${money(i.price)}</span></div><button class="p7-action" data-p7="buy" data-item="${i.id}" ${total==null||total<i.price?"disabled":""}>BUY</button></div>`).join("")}
        <div class="p7-section">YOUR SUPPLIES</div>
        ${ITEMS.map(i=>`<div class="p7-row"><span class="p7-icon">${i.emoji}</span><div class="p7-desc"><strong>${i.name}</strong><small>Owned: ${p.inventory[i.id]||0}</small></div><button class="p7-action" data-p7="consume" data-item="${i.id}" ${(p.inventory[i.id]||0)<1?"disabled":""}>${i.id==="boerek"?"EAT":"DRINK"}</button></div>`).join("")}
        <div class="p7-row"><span class="p7-icon">♻️</span><div class="p7-desc"><strong>Return Pfand</strong><small>${p.emptyBottles||0} empty bottles · €0.25 per bottle</small></div><button class="p7-action" data-p7="return" ${(p.emptyBottles||0)<1?"disabled":""}>LEVER IN</button></div>
        ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
        <button class="p7-finish" data-p7="close">LEAVE THE SPÄTI</button>`;
    }else if(mode==="clock"){
      root.querySelector("#p7-title").textContent="🕒 Weltzeituhr";
      root.querySelector("#p7-sub").textContent="Alexanderplatz · interactive discovery";
      card.innerHTML=`
        <div class="p7-clock-scene" aria-label="World clock at Alexanderplatz"><span class="p7-clock-icon">🌐</span></div>
        <p class="p7-intro">You're at the Weltzeituhr. Look at the place and explain the historical and technical details; a wrong guess gives no reward.</p>
        ${questionUI("answer")}
        <div class="p7-grid"><div class="p7-stat"><b>${p.quizSolved?"✓":"—"}</b><small>Puzzle solved</small></div><div class="p7-stat"><b>${p.quizSolved?"+1":"0"}</b><small>Berlin Knowledge</small></div><div class="p7-stat"><b>${p.quizAttempts||0}</b><small>Answers</small></div></div>
        ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
        <button class="p7-finish" data-p7="close">BACK TO ALEXANDERPLATZ</button>`;
    }else if(mode==="square"||mode==="wall"){
      const square=mode==="square",id=square?SQUARE_ID:WALL_ID,solved=!!p.historicSolved[id],attempts=p.historicAttempts[id]||0;
      root.querySelector("#p7-title").textContent=square?"🏛️ Gendarmenmarkt":"🧱 Gedenkstätte Berliner Mauer";
      root.querySelector("#p7-sub").textContent=(square?"Stadtmitte":"Bernauer Straße")+" · city discovery";
      card.innerHTML=`
        <div class="p7-clock-scene" aria-label="${square?"Monumental square with cathedrals":"Gedenkstätte Berliner Mauer"}"><span class="p7-clock-icon">${square?"🏛️":"🧱"}</span></div>
        <p class="p7-intro">${square?"You're at the Gendarmenmarkt, one of the best-known squares in Berlin.":"You're at the memorial on Bernauer Straße, where the Berlin Wall once ran through the city."}</p>
        ${questionUI("answer-historic")}
        <div class="p7-grid"><div class="p7-stat"><b>${solved?"✓":"—"}</b><small>Investigated</small></div><div class="p7-stat"><b>${solved?"+1":"0"}</b><small>Berlin Knowledge</small></div><div class="p7-stat"><b>${attempts}</b><small>Attempts</small></div></div>
        ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
        <button class="p7-finish" data-p7="close">BACK TO STREET VIEW</button>`;
    }else if(["explore","sight","social","courier"].includes(mode)){
      const stn=station(),id=activeActivity||"city:"+stn.id;
      const solved=!!p.activitySolved[id],dayKey=stn.id+":"+Math.floor(Number(st()?.clock?.totalMinutes||0)/1440);
      const paid=!!p.courierShifts[dayKey];
      const person=stn.id==="alexanderplatz"?"Miro":"Deniz";
      const title=mode==="social"?"💬 Conversation with "+person:mode==="courier"?"🚲 Courier job":mode==="sight"?"📍 Visit destination":"🧭 Neighbourhood walk";
      root.querySelector("#p7-title").textContent=title;
      root.querySelector("#p7-sub").textContent=stn.name+" · Berlin";
      const intro=mode==="social"?person+" tells you something about work. How do you respond?":mode==="courier"?"A courier service gives you a situation you need to solve carefully.":mode==="sight"?"Investigate this place and its different historical layers.":"You explore the neighbourhood at "+stn.name+". Choose the best-supported interpretation.";
      card.innerHTML=`
       <div class="p7-clock-scene"><span class="p7-clock-icon">${mode==="courier"?"🚲":mode==="social"?"💬":mode==="sight"?"🏛️":"🧭"}</span></div>
       <p class="p7-intro">${intro}</p><div class="p7-section">${mode==="courier"?"DELIVERY JOB":mode==="social"?"CONVERSATION CHOICE":"DISCOVER THE PLACE"}</div>
       ${questionUI("city-choice")}
       <div class="p7-grid"><div class="p7-stat"><b>${mode==="courier"?(paid?"✓":"€8.50"):(solved?"✓":"—")}</b><small>${mode==="courier"?"Shift today":"Discovered"}</small></div><div class="p7-stat"><b>${p.activityAttempts[id]||0}</b><small>Choices</small></div></div>
       ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
       <button class="p7-finish" data-p7="close">BACK TO STREET VIEW</button>`;
    }
  }
  function isOpen(){return !!root?.classList.contains("open")}
  function identifyDetail(){
    const el=document.querySelector("#sv-discovery-modal .svd-panel h2");
    if(!el)return null;
    const title=el.textContent||"";
    if(/Späti am Alex/i.test(title))return "shop";
    // Discovery is for directions; actual Play is only a Street View action.
    // Historic activities are intentionally not opened from this sheet.
    return null;
  }
  function decorateDiscovery(){
    const registry=window.BerlinDiscoveryV2?.data;
    for(const [sid,title] of [["alexanderplatz","Späti am Alex"],["kottbusser-tor","Späti am Kotti"],["hermannplatz","Späti am Hermannplatz"]]){
      const list=registry?.[sid],id=sid+":spaeti";
      if(Array.isArray(list)&&!list.some(a=>a.id===id))list.unshift({id,station:sid,icon:"🥤",name:title,dist:70,detail:"Interior · snacks, drinks and Pfand",obvious:true});
    }
    const panel=document.querySelector("#sv-discovery-modal .svd-panel");
    if(!panel)return;
    for(const b of panel.querySelectorAll(`button.svd-go[data-p7-entry="shop"],button.svd-go[data-open$=":spaeti"],button.svd-go[data-berlin-nav$=":spaeti"]`)){
      b.removeAttribute("data-open");b.removeAttribute("data-berlin-nav");
      b.dataset.p7Entry="shop";b.textContent="INSIDE";
    }
    const detail=identifyDetail();
    if(!detail)return;
    if(detail==="clock"&&!city()?.atClock?.())return;
    const action=panel.querySelector("button[data-action='perform']");
    if(action){
      action.dataset.p7Entry=detail;
      action.textContent=detail==="shop"?"ENTER THE SPÄTI":"PLAY WELTZEITUHR";
      action.disabled=false;
    }
    if(!panel.querySelector("button[data-p7-entry]")&&detail){
      const back=panel.querySelector("button[data-action='back']");
      if(back){
        const b=document.createElement("button");b.className="svd-wide";b.type="button";b.dataset.p7Entry=detail;
        b.textContent=detail==="shop"?"ENTER THE SPÄTI":"PLAY WELTZEITUHR";back.before(b);
      }
    }
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest?.("[data-p7-entry]");
    if(!b||!document.querySelector("#sv-discovery-modal")?.contains(b))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    open(b.dataset.p7Entry);
  },true);
  // Some old modules rebuild Discovery asynchronously. Decorate only the current nodes.
  const timer=Tick.every('phase7.discovery-decorate',550,()=>{
    decorateDiscovery();
    if(!wired&&window.BerlinCityDiscovery&&window.BerlinDiscoveryV2?.data){
      wired=true;
      console.info("[Berlin Life] Phase 7 activity registry connected");
    }
  });
  window.BerlinPhase7={version:6,openCityActivity:(type,id)=>open(type,id),openShop:()=>open("shop"),openWeltzeituhr:()=>open("clock"),openGendarmenmarkt:()=>open("square"),openBerlinerMauer:()=>open("wall"),close,
    snapshot:()=>{const p=ensure();return p?JSON.parse(JSON.stringify(p)):null},isOpen,shopItemIds:ITEMS.map(x=>x.id),get discovered(){return !!window.BerlinDiscoveryV2?.data?.alexanderplatz?.some(a=>a.id===SHOP_ID)}};
  console.info("[Berlin Life] Phase 7 V6 – scenario questions, variable keys and reasoned answers ready");
})();