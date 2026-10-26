(function(){
"use strict";
if(window.BerlinCityEpisodes)return;
const LIVE_MS=8*60*1000, DEST="hermannplatz", HOME="alexanderplatz";
const options=[
{note:"Order H-47 · geadresseerde Meier · afgeven bij de kleine kiosk aan de zuidzijde, niet bij de halte.",choices:[
{label:"Persoon bij de kiosk die 'Meier, H-47' kan bevestigen",ok:true},
{label:"Persoon op het perron met een pakket met dezelfde kleur",ok:false},
{label:"Persoon naast een bestelbus die zegt voor het gebouw te werken",ok:false}
]},
{note:"Order D-19 · voor Frau Nguyen · zij wacht bij de bloemenkraam en noemt het bestelnummer.",choices:[
{label:"Man bij de metropoort die de straatnaam kent",ok:false},
{label:"Klant bij de bloemenkraam die 'Nguyen, D-19' bevestigt",ok:true},
{label:"Medewerker in een groene jas die zonder controle wil tekenen",ok:false}
]},
{note:"Order F-62 · afhaalbevestiging op naam Yilmaz · de overdracht is bij de fietsenrekken.",choices:[
{label:"Klant voor de dönerzaak die dezelfde tas wil",ok:false},
{label:"Persoon onder het U8-bord die beweert haast te hebben",ok:false},
{label:"Ontvanger bij de fietsenrekken die 'Yilmaz, F-62' kan bevestigen",ok:true}
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
 const j=s.berlinJournal;j.entries??=[];j.entries.unshift({id:"city-episodes:"+kind,name:"Stadsleven",kind,station:zone(),text:message,day:s.clock?.day,minute:Math.floor(s.clock?.minute||0)});j.entries=j.entries.slice(0,80);
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
 const d=data();if(!d)return view("Stadsleven","Laad eerst je savegame.");
 if(!ensureLocation(id))return view("Niet op deze locatie","Ga eerst naar de juiste halte en stap buiten uit de U-Bahn.");
 if(id==="alexanderplatz:vacatures"){
  if(d.shift){
   if(remaining(d)>0)return view("Vacaturebord · koerier",
    "Je hebt al een bezorging aangenomen. Bestemming: Hermannplatz (U8). "+options[d.shift.variant].note,
    [opt("shift-info","Lees de leveringsinstructies"),opt("shift-cancel","Annuleer deze rit")],
    ["Tijd over: "+fmt(remaining(d)), "Beloning na correcte aflevering: €15, mogelijk €2 fooi"]);
   return view("Koeriersklus verlopen","De bezorgtijd van acht minuten is voorbij. Je hebt geen loon ontvangen.",
     [opt("shift-reset","Bekijk een nieuwe beschikbare rit")]);
  }
  if(d.lastDeliveryDay===currentDay())return view("Vacaturebord","Vandaag heb je al een bezorging afgerond. Morgen verschijnt een nieuwe korte shift.",[],["Afgeronde ritten: "+d.deliveries]);
  return view("Vacaturebord · Späti-bezorging",
   "Een kleine koerier zoekt iemand voor een spoedbestelling van Alexanderplatz naar Hermannplatz. Je moet zelf reizen en daar de juiste ontvanger vinden. Het is geen automatisch verdiend geld.",
   [opt("shift-details","Bekijk eerst de voorwaarden","Geen boete als je te laat bent, maar ook geen loon."),
    opt("shift-accept","Neem de rit aan · €15","Tijdslimiet: 8 echte minuten vanaf acceptatie.")],
   ["Bestemming: Hermannplatz · U8",flash]);
 }
 if(id==="hermannplatz:delivery"){
  if(!d.shift)return view("Delivery pickup · Hermannplatz","Er is hier geen actieve bestelling voor jou. Bekijk het vacaturebord bij Alexanderplatz om er één aan te nemen.");
  if(remaining(d)<=0)return view("Delivery pickup","De tijdslimiet is voorbij. Ga terug naar het vacaturebord bij Alexanderplatz om opnieuw te beginnen.",[],["Geen geld afgeschreven en geen loon uitgekeerd."]);
  const p=options[d.shift.variant];
  return view("Hermannplatz · aflevercontrole",
   "Je bent bij het afleverpunt. Dispatch gaf deze instructie mee: "+p.note+" Kies aan wie je de bestelling overhandigt.",
   p.choices.map((c,i)=>opt("recipient-"+i,c.label)),
   ["Tijd over: "+fmt(remaining(d)),flash]);
 }
 if(id==="alexanderplatz:miro"){
  if(!available(id))return view("Miro is er niet","Je kunt Miro doorgaans tussen 18:00 en 23:00 rond Alexanderplatz treffen. Kom tijdens zijn avonduren terug.");
  if(staged?.id===id&&staged.phase==="miro-follow")return view("Miro · de introductie",
   "Miro: 'Een organisator zoekt iemand voor drukke avonden. Geld is niet het enige waar je aan moet denken. Wat vind jij belangrijk voordat ik je voorstel?'",
   [opt("miro-safety","Wie draagt de verantwoordelijkheid voor veiligheid en pauzes?"),
    opt("miro-speed","Kun je mij direct de contactgegevens sturen?"),
    opt("miro-rules","Hoe gaat deze organisatie met personeel om?")],
   ["Er is geen foutloze keuze: je prioriteiten beïnvloeden hoeveel vertrouwen Miro in je stelt."]);
  return view("Miro · nightlife-contact",
   d.miroLastDay===currentDay()?"Miro: 'We hebben het vandaag al over die organisator gehad. Kom morgen terug als er iets verandert.'":
   "Miro kent een organisator en wil weten of je betrouwbaar bent. Een introductie kan later toegang geven tot een nieuwe werkgever.",
   d.miroLastDay===currentDay()?[]:[opt("miro-intro","Vraag rustig naar de opdrachtgever"),opt("miro-direct","Vraag meteen om een introductie")],
   ["Vertrouwen bij Miro: "+d.miroTrust,flash]);
 }
 if(id==="kottbusser-tor:deniz"){
  if(staged?.id===id&&staged.phase==="deniz-follow")return view("Deniz · Koerier in Kreuzberg",
   "Deniz: 'Je komt bij een gesloten deur. De klant antwoordt niet, maar iemand op straat wil het pakket wel aannemen. Wat doe je?'",
   [opt("deniz-check","Bel de opdrachtgever en verifieer de overdracht"),
    opt("deniz-leave","Leg het pakket bij de deur en maak een foto"),
    opt("deniz-stranger","Geef het pakket aan de vrijwilliger en noteer zijn naam")],
   ["Snelheid en betrouwbaarheid staan niet altijd aan dezelfde kant."]);
  return view("Deniz · Kottbusser Tor",
   d.denizLastDay===currentDay()?"Deniz: 'We hebben de routeproblemen vandaag al besproken. Nieuwe opdrachten volgen later.'":
   "Deniz heeft ervaring met bezorgwerk in Kreuzberg. Hij vraagt wat jij zou doen als een opdracht onverwacht ingewikkeld wordt.",
   d.denizLastDay===currentDay()?[]:[opt("deniz-intro","Bespreek een lastige bezorgsituatie")],
   ["Vertrouwen bij Deniz: "+d.denizTrust,flash]);
 }
 if(id==="spittelmarkt:architecture"){
  if(d.civic)return view("Spittelmarkt · DDR-stadslaag",
   "Je hebt het participatieadvies al uitgebracht: "+d.civic.summary,
   [],["Berlin Knowledge is voor dit scenario al geregistreerd.",flash]);
  if(staged?.id===id&&staged.phase==="civic-follow")return view("Spittelmarkt · bewoners",
   "Je voorstel is ingediend. De gemeente heeft weinig tijd. Hoe organiseer je de inspraak zonder de betrokken bewoners buitenspel te zetten?",
   [opt("civic-open","Organiseer inspraak vóór de keuze, ondanks vertraging"),
    opt("civic-fast","Leg één uitgewerkt plan direct ter inzage"),
    opt("civic-council","Laat een gelote bewonersraad het advies mede bepalen")],
   ["Eerdere keuze: "+(staged?.choiceName||"—")]);
  return view("Spittelmarkt · stedelijk dilemma",
   "Een DDR-bouwblok is verouderd. Bewoners vrezen stijgende huren, erfgoeddeskundigen pleiten voor behoud van de gevel en de stad zoekt extra woningen. Je brengt een advies uit.",
   [opt("civic-preserve","Behoud het hele bouwblok, ook als het minder woningen oplevert"),
    opt("civic-build","Herontwikkel het blok volledig voor meer woningen"),
    opt("civic-mixed","Behoud de straatgevel en bouw betaalbare woningen op het binnenterrein")],
   ["Je moet daarna ook kiezen hoe de besluitvorming verloopt.",flash]);
 }
 return view("Onbekende activiteit","Deze activiteit is nog niet beschikbaar.");
}
function choose(id,choice){
 if(!has(id)||!ensureLocation(id))return viewId(id);
 const d=data();if(!d)return viewId(id);
 flash="";
 if(id==="alexanderplatz:vacatures"){
  if(choice==="shift-details"){flash="De acht minuten tellen pas vanaf het accepteren. Overdracht zonder gecontroleerde ontvanger telt niet.";return viewId(id)}
  if(choice==="shift-cancel"&&d.shift){d.shift=null;event("Koeriersrit vrijwillig geannuleerd","courier");return viewId(id)}
  if(choice==="shift-reset"&&d.shift&&remaining(d)<=0){d.shift=null;event("Verlopen koeriersrit beëindigd","courier");return viewId(id)}
  if(choice==="shift-info")return viewId(id);
  if(choice==="shift-accept"&&!d.shift&&d.lastDeliveryDay!==currentDay()){
   const variant=(d.deliveries||0)%options.length;
   d.shift={startedAt:Date.now(),variant,from:HOME,to:DEST};event("Koeriersrit geaccepteerd, bestemming Hermannplatz · "+options[variant].note,"courier");
   return viewId(id);
  }
 }
 if(id==="hermannplatz:delivery"&&/^recipient-[0-2]$/.test(choice)&&d.shift){
  if(remaining(d)<=0)return viewId(id);
  const n=Number(choice.slice(-1));const info=options[d.shift.variant];
  if(!info.choices[n]?.ok){flash="Deze persoon kan niet alle gegevens bevestigen. Je houdt het pakket bij je en probeert opnieuw.";return viewId(id)}
  const money=window.BerlinLife?.economy||window.BerlinLife?.game?.economy;
  if(!money?.earn){flash="Het geldsysteem is niet beschikbaar. De bezorging blijft actief, zodat je geen loon verliest.";return viewId(id)}
  const tip=remaining(d)>=120000?200:0;
  const pay=1500+tip;
  try{money.earn(pay,"Koerier Alexanderplatz → Hermannplatz"+(tip?" + fooi":""))}catch(e){flash="Betaling kon niet worden verwerkt. Probeer opnieuw.";return viewId(id)}
  d.shift=null;d.deliveries++;d.lastDeliveryDay=currentDay();
  const st=life()?.state;if(st){st.career??={};st.career.courierDeliveries=(st.career.courierDeliveries||0)+1;st.reputation??={};st.reputation.hospitality=(st.reputation.hospitality||0)+2}
  event("Rit afgeleverd bij Hermannplatz. Loon €15"+(tip?" en €2 fooi":"")+".","courier");
  flash="Pakket gecontroleerd afgeleverd. "+(tip?"€17 inclusief fooi":"€15")+" verdiend.";
  return view("Hermannplatz · opdracht voltooid",flash,[],["Ritten: "+d.deliveries,"Hospitality-reputatie +2"]);
 }
 if(id==="alexanderplatz:miro"&&available(id)){
  if((choice==="miro-intro"||choice==="miro-direct")&&d.miroLastDay!==currentDay()){
   if(choice==="miro-direct"){staged={id,phase:"miro-follow",pushy:true};return viewId(id)}
   staged={id,phase:"miro-follow",pushy:false};return viewId(id);
  }
  const results={"miro-safety":[2,"Je vraagt naar veiligheid en pauzes. Miro vindt dat je verantwoordelijkheid serieus neemt."],
    "miro-speed":[-1,"Je wilt snel een introductie. Miro twijfelt of je eerst de context moet begrijpen."],
    "miro-rules":[1,"Je vraagt naar omgang met personeel. Miro ziet dat je verder kijkt dan het tarief."]};
  if(staged?.id===id&&results[choice]){
   const [gain,message]=results[choice];d.miroTrust+=gain;d.miroLastDay=currentDay();
   const st=life()?.state;if(st){st.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};st.berlinJournal.contacts??={};st.berlinJournal.contacts.miro=true;st.reputation??={};st.reputation.nightlife=(st.reputation.nightlife||0)+Math.max(0,gain)}
   staged=null;event(message,"contact");return view("Miro · gesprek afgerond",message,[],["Miro vertrouwen: "+d.miroTrust,"Nightlife-reputatie: "+(st?.reputation?.nightlife||0)]);
  }
 }
 if(id==="kottbusser-tor:deniz"){
  if(choice==="deniz-intro"&&d.denizLastDay!==currentDay()){staged={id,phase:"deniz-follow"};return viewId(id)}
  const outcomes={"deniz-check":[2,"Deniz waardeert dat je de overdracht controleert voordat je het pakket uit handen geeft."],
   "deniz-leave":[-1,"Deniz: 'Dan weet niemand zeker of de bestelling echt is aangekomen.'"],
   "deniz-stranger":[0,"Deniz: 'Ook een naam op papier zegt niets over de bevoegde ontvanger.'"]};
  if(staged?.id===id&&outcomes[choice]){
   const [delta,message]=outcomes[choice];d.denizTrust+=delta;d.denizLastDay=currentDay();staged=null;
   const st=life()?.state;if(st){st.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};st.berlinJournal.contacts??={};st.berlinJournal.contacts.deniz=true;st.reputation??={};st.reputation.hospitality=(st.reputation.hospitality||0)+Math.max(0,delta)}
   event(message,"contact");return view("Deniz · gesprek afgerond",message,[],["Deniz vertrouwen: "+d.denizTrust,"Tip: check de vacatures bij Alexanderplatz voor een echte koeriersklus"]);
  }
 }
 if(id==="spittelmarkt:architecture"){
  const plans={"civic-preserve":"volledig behoud van de DDR-bebouwing","civic-build":"volledige herontwikkeling voor extra woningen","civic-mixed":"behoud van de straatgevel met betaalbare nieuwbouw"};
  if(plans[choice]&&!d.civic){staged={id,phase:"civic-follow",choice,choiceName:plans[choice]};return viewId(id)}
  const stages={"civic-open":"brede inspraak vooraf, met extra doorlooptijd","civic-fast":"snelle formele terinzagelegging, met kans op minder draagvlak","civic-council":"een gelote bewonersraad voor aanvullend advies"};
  if(staged?.id===id&&stages[choice]&&!d.civic){
   d.civic={plan:staged.choice,participation:choice,summary:staged.choiceName+" en "+stages[choice]};staged=null;
   const s=life()?.state;if(s){s.berlinJournal??={stamps:[],entries:[],knowledge:0,contacts:{},leads:{}};s.berlinJournal.knowledge=(s.berlinJournal.knowledge||0)+1;s.reputation??={};s.reputation.bvg=(s.reputation.bvg||0)+(choice==="civic-council"?2:1)}
   event("Stedenbouwkundig advies: "+d.civic.summary,"civic");return view("Spittelmarkt · advies ingediend","Je advies is vastgelegd: "+d.civic.summary+". Er is geen pasklare oplossing; je keuze legt andere accenten.",[],["Berlin Knowledge +1","Civic/BVG-reputatie: "+(s?.reputation?.bvg||0)]);
  }
 }
 return viewId(id);
}
window.BerlinCityEpisodes={version:1,has,view:viewId,choose,open:id=>viewId(id),get state(){return data()},get activeShift(){return data()?.shift},remaining:()=>remaining()};
console.info("[Berlin Life] City episodes: courier route, Miro and Deniz dialogue, Spittelmarkt planning");
})();
