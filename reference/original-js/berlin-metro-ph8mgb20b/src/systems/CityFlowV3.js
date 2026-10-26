(function(){
"use strict";
if(window.BerlinCityFlowV3)return;
const city=()=>window.BerlinCityDiscovery,bl=()=>window.BerlinLife,old=window.BerlinCityEpisodes;
if(!old||!city()){console.warn("[Berlin] CityFlow missing dependencies");return}
const now=()=>Date.now(),station=()=>city()?.where?.()?.id||null,asId=s=>String(s||"").split(":")[0];
const currentDay=()=>bl()?.state?.phase16Diary?.number||Math.floor((bl()?.state?.clock?.totalMinutes||0)/1440)+1;
const deadline=18*60*1000;
const sectors={
"alexanderplatz":[{id:"alexanderplatz:express-courier",name:"Spoedkoerier · stadsroute",icon:"🚲",detail:"Drie haltes met controles, keuzevrijheid en een echt tijdvenster",episodeLabel:"OPDRACHT"},
{id:"alexanderplatz:miro-referral",name:"Miro · vervolgcontact",icon:"💬",detail:"Bouw een langdurige band op en ontgrendel een werkgever",episodeLabel:"PRAAT"},
{id:"alexanderplatz:tower-operations",name:"Fernsehturm · bezoekersstroom",icon:"🗼",detail:"Organiseer een drukke avond zonder bezoekers achter te laten",episodeLabel:"SPEEL"}],
"rosenthaler-platz":[{id:"rosenthaler-platz:parcel-check",name:"Pakketcontrole · Rosenthaler Platz",icon:"📦",detail:"Controleer het verzegelde pakket voor je het doorbrengt",episodeLabel:"AFHALEN"}],
"bernauer-strasse":[{id:"bernauer-strasse:route-handoff",name:"Koerierscheckpoint · Bernauer Straße",icon:"🚲",detail:"Bepaal hoe je veilig verdergaat naar de laatste halte",episodeLabel:"CHECKPOINT"},
{id:"bernauer-strasse:wall-investigation",name:"Muurarchief · Bernauer Straße",icon:"🧱",detail:"Reconstrueer een historisch dossier zonder bronnen te verdraaien",episodeLabel:"ONDERZOEK"}],
"eberswalder-strasse":[{id:"eberswalder-strasse:delivery-final",name:"Afleverpunt · Eberswalder Straße",icon:"📦",detail:"Controleer de ontvanger en voltooi de U8–U2-koeriersrit",episodeLabel:"AFLEVEREN"}],
"kottbusser-tor":[{id:"kottbusser-tor:deniz-route",name:"Deniz · routes en vertrouwen",icon:"🧢",detail:"Een nieuwe professionele keuze die je volgende opdrachten beïnvloedt",episodeLabel:"PRAAT"}],
"olympia-stadion":[{id:"olympia-stadion:stadium-shift",name:"Olympiastadion · crowd control",icon:"🏟️",detail:"Los een stadionincident in drie stappen op",episodeLabel:"SPEEL"}]
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
{station:"rosenthaler-platz",name:"Rosenthaler Platz",id:"rosenthaler-platz:parcel-check",hint:"Het label begint met R en de controlesticker vermeldt 41"},
{station:"bernauer-strasse",name:"Bernauer Straße",id:"bernauer-strasse:route-handoff",hint:"Kies een route langs de gedenkplaats of door het drukke overstappunt"},
{station:"eberswalder-strasse",name:"Eberswalder Straße",id:"eberswalder-strasse:delivery-final",hint:"Ontvanger Hartmann · order EX-24 · afgesproken bij de fietsenstalling"}];
function careerRank(p){
 const j=journal(),t=(p.missionsComplete||0)+(old?.state?.deliveries||0);
 const trust=(old?.state?.miroTrust||0)+(old?.state?.denizTrust||0)+(p.contactTasks.miro?.trust||0)+(p.contactTasks.deniz?.trust||0);
 return p.careerRank=t>=6&&trust>=5?"Ervaren bezorger":t>=3?"Stadskoerier":t>=1?"Junior koerier":"Starter";
}
function missionInfo(p){
 const m=p?.mission;if(!m)return [];
 return ["Bestemming: "+missionSteps[m.step]?.name,"Tijd over: "+fmt(elapsed(m)),"Beloning bij correcte aflevering: €24 + mogelijke fooi",
  "Route U8 → U2; eerdere beslissingen tellen mee"];
}
function missionView(id){
 const p=state(),m=p?.mission,step=missionSteps.findIndex(x=>x.id===id);
 if(id==="alexanderplatz:express-courier"){
  if(m&&elapsed(m)>0)return page("Spoedkoerier · rit loopt","Deze bestelling is nog onderweg. "+missionSteps[m.step]?.hint,[choice("route","Bekijk de route"),choice("cancel","Annuleer de rit")],missionInfo(p));
  if(m&&elapsed(m)<=0)return page("Spoedkoerier · verlopen","De deadline is voorbij. Je kunt dit pakket niet meer succesvol afleveren.",[choice("clear","Registreer de gemiste deadline")]);
  if(p.missionLastDay===currentDay())return page("Spoedkoerier · vandaag afgerond","Vandaag is je route al voltooid. Morgen is er weer een contract beschikbaar.",[],["Koeriersniveau: "+careerRank(p)]);
  if(old?.state?.shift)return page("Spoedkoerier","Je hebt nog een korte bezorging naar Hermannplatz openstaan. Rond die eerst af.");
  const ref=journal()?.leads?.courierNetwork;
  return page("Spoedkoerier · drie haltes",
    "Dispatch zoekt iemand voor een route met een verzegelcontrole, een routebeslissing en een gecontroleerde aflevering. Neem de U8 naar Rosenthaler Platz, reis daarna via Bernauer Straße en stap over richting Eberswalder Straße (U2).",
    [choice("accept","Accepteer de 18-minutenrit"),choice("route","Bekijk alle controles")],
    ["Basisloon €24 · maximaal €3 fooi"+(ref?" · netwerkbonus €2":""),"Je verdient pas geld na de correcte aflevering"]);
 }
 if(!m)return page("Geen lopende rit","Er is geen actieve lange koeriersrit. Kijk bij de koeriersdesk op Alexanderplatz.",[],["Je bestaande korte koeriersritten worden niet aangepast."]);
 if(elapsed(m)<=0)return page("Bezorging verlopen","De 18 minuten zijn voorbij. Er wordt niets uitbetaald.",[choice("clear","Rit beëindigen")]);
 if(step!==m.step)return page("Koeriersroute","Je bent bij een checkpoint dat nog niet aan de beurt is.",[],missionInfo(p));
 if(m.step===0)return page("Rosenthaler Platz · verzegelcontrole",
   "Dispatch: 'Laat het pakket alleen door als de code overeenkomt met de vrachtbrief. De routecode begint met R. Op de verzegeling staan de cijfers 41.' Het pakket is klaar voor transport.",
   [choice("seal-r14","Controlekaart R-14"),choice("seal-r41","Verzegeling R-41"),choice("seal-41r","Handgeschreven 41-R")],missionInfo(p));
 if(m.step===1)return page("Bernauer Straße · routekeuze",
   "Het is druk rond de gedenkplaats. Dispatch biedt drie routes. Je hoeft geen ja/nee-quiz op te lossen: snelheid, veiligheid en contact met de buurt hebben andere gevolgen.",
   [choice("safe","Langs de rustige straat, met tijd voor voetgangers"),
    choice("fast","Steek rechtstreeks door de drukke groep voor de ingang"),
    choice("helper","Vraag een lokale medewerker om een veilige doorgang")],missionInfo(p));
 return page("Eberswalder Straße · aflevering",
   "Je bereikt het afleverpunt. De ontvanger heet Hartmann, de order is EX-24 en de overdracht is afgesproken bij de fietsenstalling. Controleer de informatie voordat je het pakket afgeeft.",
   [choice("handoff-correct","Persoon bij de fietsenstalling noemt 'Hartmann' en EX-24"),
    choice("handoff-kiosk","Kioskmedewerker noemt EX-42 en biedt aan het pakket te bewaren"),
    choice("handoff-corner","Persoon bij de tram zegt alleen dat het pakket voor hem is")],missionInfo(p));
}
function missionChoose(id,key){
 const p=state();if(!p)return page("Geen save","Start eerst een spel om voortgang vast te leggen.");
 if(!approve(id))return page("Andere locatie","Deze opdracht moet buiten bij de juiste halte worden uitgevoerd.");
 let m=p.mission;
 if(key==="route")return page("Koeriersroute · checklist",
 "De rit start op Alexanderplatz en stopt achtereenvolgens bij drie U-Bahn-haltes. De echte timer blijft lopen terwijl je door de metro reist.",
 [choice("back","Terug naar opdracht")],missionInfo(p).concat(missionSteps.map((x,i)=>(i+1)+". "+x.name+" · "+x.hint)));
 if(key==="back")return missionView(id);
 if(key==="clear"&&m&&elapsed(m)<=0){p.mission=null;log("Deadline verlopen · geen betaling","courier");return missionView(id)}
 if(key==="cancel"&&m){p.mission=null;log("Koeriersroute geannuleerd · geen betaling","courier");return missionView(id)}
 if(key==="accept"&&id==="alexanderplatz:express-courier"&&!m&&p.missionLastDay!==currentDay()&&!old?.state?.shift){
  p.mission={startedAt:now(),step:0,misses:0,safe:0,helper:0,choices:[],reward:2400};
  log("Driehaltesrit aangenomen: Rosenthaler Platz → Bernauer Straße → Eberswalder Straße","courier");
  return missionView(id);
 }
 if(!m||elapsed(m)<=0)return missionView(id);
 if(id!==missionSteps[m.step].id)return missionView(id);
 if(key==="retry")return missionView(id);
 if(m.step===0){
  if(key!=="seal-r41"){m.misses++;log("Controlecode niet overeenkomend bij Rosenthaler Platz","courier");return page("Verzegeling niet geaccepteerd","De vrachtbrief en sticker komen niet overeen. Je houdt het pakket vast en controleert opnieuw.",[choice("retry","Controle opnieuw uitvoeren")],missionInfo(p))}
  if(key==="seal-r41"){m.step=1;m.choices.push("Seal R-41 gecontroleerd");log("Verzegelcontrole geslaagd. Volgende halte: Bernauer Straße","courier");return page("Pakket gecontroleerd","De route is vrijgegeven. Reis met de U8 door naar Bernauer Straße.",[],missionInfo(p))}
 }
 if(m.step===1&&["safe","fast","helper"].includes(key)){
  m.choices.push(key);m.safe=key==="safe"?1:0;m.helper=key==="helper"?1:0;
  if(key==="fast"){m.misses++;rep("hospitality",-1)}
  if(key==="safe")rep("hospitality",1);
  if(key==="helper")rep("hospitality",2);
  m.step=2;log("Bernauer Straße-route gekozen: "+({safe:"rustige route",fast:"snelle route",helper:"lokale hulp"}[key]),"courier");
  return page("Routebeslissing opgeslagen","Je rijdt nu via Alexanderplatz naar de U2 richting Eberswalder Straße. "+(key==="fast"?"Je won wat tijd, maar de haast telt tegen je betrouwbaarheid.":"De route werd zonder gedrang afgelegd."),[],missionInfo(p));
 }
 if(m.step===2&&key.startsWith("handoff-")){
  if(key!=="handoff-correct"){m.misses++;log("Ontvanger kon code niet bevestigen","courier");return page("Ontvanger niet geverifieerd","Deze persoon heeft niet de juiste gegevens. Je geeft het pakket niet af en kunt verder controleren.",[choice("retry","Probeer opnieuw")],missionInfo(p))}
  const tip=m.misses===0&&elapsed(m)>=3*60*1000?300:0,network=journal()?.leads?.courierNetwork?200:0;
  const cents=m.reward+tip+network;
  if(!canPay())return page("Betaling nog niet beschikbaar","Het geldsysteem is niet geladen. De bezorging blijft open en wordt niet als betaald geregistreerd.",[choice("retry","Probeer opnieuw")]);
  if(!grant(cents,"Loon koeriersrit Rosenthaler → Eberswalder"+(tip?" + fooi":"")))return page("Betaling mislukt","Er is nog niets als afgeleverd gemarkeerd. Probeer opnieuw.",[choice("retry","Probeer betaling opnieuw")]);
  const copied={...m};p.mission=null;p.missionsComplete++;p.missionLastDay=currentDay();
  const st=bl()?.state;if(st){st.career??={};st.career.courierDeliveries=(st.career.courierDeliveries||0)+1}
  rep("hospitality",2);stamp("berlin:long-route","Koeriersroute Alexanderplatz–Eberswalder Straße");
  log("Driehaltesrit afgerond voor €"+(cents/100).toFixed(2).replace(".",",")+".","courier");
  return page("Aflevering geslaagd","Hartmann bevestigt EX-24. Het pakket is overgedragen en je beloning is op je rekening gezet.",[],
  ["Basisloon: €24"+(tip?" · fooi: €3":"")+(network?" · netwerkbonus: €2":""),"Reputatie +2 · totaal voltooide lange ritten: "+p.missionsComplete,"Koeriersniveau: "+careerRank(p),"Gemaakte keuzes: "+copied.choices.join(", ")]);
 }
 return missionView(id);
}
const who={miro:{location:"alexanderplatz:miro-referral",name:"Miro",min:2},deniz:{location:"kottbusser-tor:deniz-route",name:"Deniz",min:2}};
function contactView(id){
 const p=state(),q=id.endsWith("miro-referral")?"miro":"deniz",person=who[q],baseline=old?.state?.[q+"Trust"]||0,t=p.contactTasks[q]||null;
 if(t?.done)return page(person.name+" · vertrouwensband",t.summary,[],["Vertrouwensniveau: "+baseline+" + "+(t.trust||0),"Contact in je telefoon: ja"]);
 if(baseline<person.min)return page(person.name+" · vervolgcontact","Je kent "+person.name+" nog niet goed genoeg. Ga eerst met hem in gesprek en bouw vertrouwen op.",[],["Benodigd vertrouwen: "+person.min,"Huidig vertrouwen: "+baseline]);
 if(q==="miro")return page("Miro · een echte introductie",
 "Miro: 'Ik kan je aan een organisator voorstellen. Wat zet jij op papier voordat je toezegt?'",
 [choice("miro-contract","Ik wil taken, werktijden en betaling zwart-op-wit"),
 choice("miro-cash","Als ik contant betaald krijg is een contract niet nodig"),
 choice("miro-trial","Laat me één dienst proefdraaien en dan praten we verder")],
 ["Een goede introductie is geen automatische baan. Je antwoord verandert het aanbod."]);
 return page("Deniz · samenwerken op Kotti",
  "Deniz: 'Een koerier is een levering kwijt. Dispatch is al boos en de klant wacht. Wat leg jij nu vast om beide kanten verder te helpen?'",
  [choice("deniz-proof","Tijdlijn, aflevercode en contactpogingen vastleggen"),
   choice("deniz-guess","Snel een willekeurig aflevermoment invullen zodat het ticket dicht kan"),
   choice("deniz-help","De klant bellen én bewijs aan dispatch sturen")],
  ["Je keuze kan later een bonus of nieuwe opdracht vrijspelen."]);
}
function contactChoose(id,key){
 if(!approve(id))return page("Andere locatie","Praat met dit contact buiten bij de juiste halte.");
 const p=state(),q=id.endsWith("miro-referral")?"miro":"deniz",oldTrust=old?.state?.[q+"Trust"]||0;
 if(oldTrust<2)return contactView(id);
 if(p.contactTasks[q]?.done)return contactView(id);
 const pool=q==="miro"?{
 "miro-contract":[2,"Miro waardeert je voorbereiding. Hij bewaart je naam voor een officiële kennismaking.",true],
 "miro-cash":[-1,"Miro: 'Zonder afspraken sta je straks met lege handen. Eerst iets vastleggen.'",false],
 "miro-trial":[1,"Miro kan je bij een kennismakingsdienst introduceren, mits de voorwaarden helder zijn.",true]
 }:{
 "deniz-proof":[2,"Deniz vindt je werkwijze precies en controleerbaar.",true],
 "deniz-guess":[-2,"Deniz wil niet samenwerken als bewijs wordt verzonnen.",false],
 "deniz-help":[2,"Deniz waardeert dat je klant en dispatch betrokken houdt.",true]
 };
 if(!pool[key])return contactView(id);
 const [gain,summary,lead]=pool[key];
 p.contactTasks[q]={done:true,choice:key,trust:gain,summary,day:currentDay()};
 if(lead){const j=journal();j.leads[q==="miro"?"nightlifeIntroduction":"courierNetwork"]=true;j.contacts[q]=true}
 rep(q==="miro"?"nightlife":"hospitality",gain);
 log(personLabel(q)+": "+summary,"contact");
 return page(personLabel(q)+" · beslissing genomen",summary,[],["Vertrouwen "+(gain>=0?"+":"")+gain,"Vervolgcontact opgeslagen"+(lead?" · nieuw carrièrepad beschikbaar":"")]);
}
const personLabel=q=>q==="miro"?"Miro":"Deniz";
const SCRIPTS={
"alexanderplatz:tower-operations":{name:"Fernsehturm · bezoekersstroom",intro:"De avondvoorstelling zit bijna vol. Een rolstoelgebruiker heeft een tijdslot geboekt; tegelijk dringen wachtenden zonder reservering voor. Je coördineert de toegang.",steps:[
{question:"De rij loopt op. Wat regel je eerst?",actions:[
["tower-access","Aparte toegankelijke rij openen zonder de reservering te negeren",2],
["tower-quota","Alle wachtenden toelaten om de rij snel te laten verdwijnen",-2],
["tower-announce","Uitleg geven en de reserveringslijst per tijdslot controleren",1]]},
{question:"Een lift valt kort uit. Een groep wil meteen naar boven.",actions:[
["tower-elevator","De lift tijdelijk uit dienst melden en beschikbare alternatieven uitleggen",2],
["tower-stairs","Iedereen via de trap sturen, ook bezoekers die dat niet kunnen",-2],
["tower-delay","Wachten op een technische controle en de tijdsloten herplannen",1]]}
],reward:600,rep:"hospitality"},
"olympia-stadion:stadium-shift":{name:"Olympiastadion · crowd control",intro:"Voor een stadionactiviteit is de westelijke uitgang drukker dan verwacht. Je krijgt een portofoon, maar je hebt geen onbeperkte mensen tot je beschikking.",steps:[
{question:"De druk verplaatst zich richting een smal hek. Wat doe je?",actions:[
["stadium-relief","Extra stewards inzetten bij het knelpunt en een tweede uitlooproute openen",2],
["stadium-lock","De tweede route dichtzetten om het publiek bij elkaar te houden",-2],
["stadium-info","Via omroep en duidelijke borden de bezoekers spreiden",1]]},
{question:"Een bezoeker meldt dat iemand onwel wordt in de mensenmassa.",actions:[
["stadium-medical","EHBO oproepen en ruimte vrijhouden voor hulpverleners",2],
["stadium-continue","De bestaande stroom aanhouden en pas later ingrijpen",-2],
["stadium-pause","De instroom tijdelijk afremmen en hulpverleners de locatie doorgeven",1]]}
],reward:800,rep:"hospitality"},
"bernauer-strasse:wall-investigation":{name:"Muurarchief · getuigenis",intro:"In een klein archief liggen een getuigenverklaring, een kaart uit dezelfde periode en een later krantenartikel. Je maakt een korte reconstructie van gebeurtenissen rond de Berlijnse Muur.",steps:[
{question:"Een getuige dateert de gebeurtenis anders dan een archiefstuk. Hoe ga je om met dit verschil?",actions:[
["wall-sources","Beide versies naast elkaar zetten en dateringen verifiëren",2],
["wall-memory","De persoonlijkste verklaring automatisch als vaststaand feit opnemen",-1],
["wall-archive","De verklaring weggooien omdat het archiefstuk officieel is",-1]]},
{question:"Een foto is zonder bijschrift teruggevonden. Een collega wil een precieze locatie toevoegen.",actions:[
["wall-mark","De locatie als voorlopig markeren en aanvullend onderzoek noemen",2],
["wall-guess","De meest aansprekende plek als definitief bijschrift gebruiken",-2],
["wall-ignore","De foto bewaren, maar het ontbrekende bijschrift expliciet melden",1]]}
],reward:0,rep:"bvg"}
};
function scenarioView(id){
 const p=state(),def=SCRIPTS[id],work=p.landmarks[id]||null;
 if(!def)return page("Geen activiteit","Deze locatie is nog niet uitgewerkt.");
 if(work?.done)return page(def.name,work.summary,[],["Berlin Stamp geregistreerd","Hoogste score: "+work.score,"Berlin Knowledge: "+(journal()?.knowledge||0)]);
 if(!work)return page(def.name,def.intro,[choice("scenario-start","Begin de opdracht")],["Een activiteit met eigen beslissingen en gevolgen, geen algemene kennisquiz"]);
 const step=def.steps[work.step];return page(def.name+" · deel "+(work.step+1),step.question,
 step.actions.map(a=>choice(a[0],a[1])),["Je eerdere keuzes blijven opgeslagen","Tussenscore: "+work.score]);
}
function scenarioChoose(id,key){
 const p=state(),def=SCRIPTS[id];if(!approve(id))return page("Andere locatie","Je kunt dit alleen buiten bij deze halte uitvoeren.");
 if(!def)return page("Niet beschikbaar","Deze activiteit bestaat niet.");
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
 if(reward&&!grant(reward,def.name+" · loon")){
  work.step=def.steps.length-1;work.score-=selection[2];work.choices.pop();
  return page("Betaling niet beschikbaar","Het financiële systeem is nog niet klaar; je voortgang blijft op de laatste keuze staan.",[choice(key,"Probeer de laatste beslissing opnieuw")]);
 }
 work.done=true;work.summary=pass?"Je team verwerkt je keuzes als een werkbaar, onderbouwd plan.":"Je plan is vastgelegd, maar de risico's wegen zwaarder dan de voordelen. Een herkansing kan op een volgende activiteit.";
 rep(def.rep,pass?2:0);
 stamp(id,def.name,pass?1:0);
 log(def.name+" afgerond: score "+work.score+(reward?", loon €"+(reward/100):""),"location");
 return page(def.name+" · afgerond",work.summary,[],
 ["Score: "+work.score,pass?"Berlin Knowledge +1 · reputatie +2":"Geen reputatiebonus",reward?"Uitbetaald: €"+(reward/100):"Geen financiële beloning"]);
}
function foundation(){
 const c=bl()?.state?.clock,eco=window.BerlinPhase34?.economy,save=window.BerlinSaveGuard?.validate?.()||{},d=window.BerlinDiscoveryV2,sv=window.BerlinStreetView2,
 api=window.BerlinCityDiscovery,ov=window.__berlinMetroGame?.__allStreetOverlay;
 return [
 ["Game State & save",!!bl()?.state&&!!window.BerlinSaveSlots&&save.storageAvailable!==false],
 ["Spelklok & kalender",Number.isFinite(c?.minute)&&Number.isInteger(c?.day)&&!!bl()?.state?.phase16Diary],
 ["Geld & transacties",Number.isFinite(eco?.cash)&&(eco.bank===null||Number.isFinite(eco?.bank))&&Array.isArray(eco?.tx)],
 ["Discovery & registraties",!!d?.registry&&d.validate?.().ok===true],
 ["Street View (één interface)",!!ov?.root&&!!window.BerlinCleanStreet&&window.BerlinCleanStreet.inspect?.().oldPresent?.length===0],
 ["Virtuele nabijheid",typeof api?.proximity==="function"&&typeof sv?.getPanorama==="function"]
 ];
}
function statusView(){
 const p=state(),m=p?.mission,j=journal(),checks=foundation(),s=bl()?.state;
 return page("Stadsstatus · voortgang",
 "Je voortgang is gekoppeld aan de actieve savegame. Werkgevers, contacten, Berlin Stamps, kalender en het geldsysteem worden afzonderlijk gecontroleerd.",
 [choice("status-route","Koerierroute"),choice("status-relations","Relaties & carrière"),choice("status-journal","Berlin Stamps & dagboek"),choice("status-save","Save-informatie"),choice("status-system","Technische status 1–6")],
 ["Koeriersniveau: "+careerRank(p),"Lange koeriersritten: "+(p?.missionsComplete||0)+(old?.state?.deliveries?" · korte ritten: "+old.state.deliveries:""),
 "Berlin Stamps: "+(j?.stamps?.length||0)+" · Knowledge: "+(j?.knowledge||0),
 "Speldag: "+currentDay()+(m?" · rit actief bij "+missionSteps[m.step].name:""),
 "Fases 1–6: "+checks.filter(x=>x[1]).length+"/"+checks.length+" basiscontroles gevonden"]);
}
function statusChoose(key){
 const p=state(),j=journal(),m=p?.mission;
 if(key==="status-journal")return page("Berlin Stamps · reisdagboek",
 "Dit overzicht is gekoppeld aan de actieve savegame. Voltooide opdrachten en gesprekken blijven bij je volgende speelsessie beschikbaar.",
 [choice("status-back","Terug naar overzicht")],
 ["Berlin Stamps: "+(j?.stamps?.length||0),"Berlin Knowledge: "+(j?.knowledge||0),
 "Lange koerierritten voltooid: "+(p?.missionsComplete||0),
 ...((j?.entries||[]).slice(0,8).map(x=>"• "+(x.name||"Berlijn")+(x.text?": "+x.text:"")))]);
 if(key==="status-save")return page("Savebeheer",
 "Je spel wordt lokaal opgeslagen in de browser. Verschillende Vercel-testlinks delen die opslag niet automatisch.",
 [choice("status-back","Terug naar overzicht")],
 ["Exporteer een kopie via Telefoon → Stad & planning → Save.",
 "Gebruik voorlopig dezelfde testlink om op dezelfde save door te spelen.",
 "De automatische overdracht tussen testlinks is nog niet ingeschakeld."]);
 if(key==="status-route")return page("Koerierroutes",m?"Actieve lange route: "+missionSteps[m.step]?.name+".":"Geen lange route actief.",[choice("status-back","Terug naar overzicht")],
 [...(m?missionInfo(p):["Volgende meerhaltesroute: Alexanderplatz → Rosenthaler Platz → Bernauer Straße → Eberswalder Straße"]),
 "Afgeronde lange routes: "+(p.missionsComplete||0),"Afgeronde korte routes: "+(old?.state?.deliveries||0)]);
 if(key==="status-relations")return page("Relaties en carrière",
 "Contacten en werkgevers onthouden je keuzes. Introducerende gesprekken kun je op Alexanderplatz (Miro) of Kottbusser Tor (Deniz) voeren.",
 [choice("status-back","Terug naar overzicht")],
 ["Miro vertrouwen: "+(old?.state?.miroTrust||0)+" + "+(p.contactTasks.miro?.trust||0),
 "Deniz vertrouwen: "+(old?.state?.denizTrust||0)+" + "+(p.contactTasks.deniz?.trust||0),
 "Nightlife introductie: "+(j?.leads?.nightlifeIntroduction?"ja":"nog niet"),
 "Koeriernetwerk: "+(j?.leads?.courierNetwork?"ja":"nog niet"),
 "Nightlife reputatie: "+(bl()?.state?.reputation?.nightlife||0),"Hospitality reputatie: "+(bl()?.state?.reputation?.hospitality||0),
 "Huidige carrièrerang: "+careerRank(p)]);
 if(key==="status-system")return page("Fundament 1–6 · verificatie",
 "Dit zijn basiscontroles op geladen subsystemen. Een succesvolle controle vervangt geen mobiele test van treinritten, Street View en saveherstel.",
 [choice("status-back","Terug naar overzicht")],foundation().map(([name,ok])=>(ok?"✓ ":"⚠ ")+name));
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
  return page("Eerst je rit afmaken","Je hebt al een lange koeriersroute. Rond deze af voordat je een tweede rit accepteert.");
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
   return list.some(x=>x.id===id)?list:list.concat([{id,station:s.id,name:"Stadsstatus & voortgang",icon:"📓",detail:"Koerier, contacten, Berlin Stamps en zes basiscontroles",episodeLabel:"OVERZICHT",dist:0}]);
  };
 }
 return true;
}
const combined=Object.create(old);
Object.assign(combined,{version:3,has:id=>known.has(id)||id.endsWith(":city-status")||old.has(id),view,choose,open:view});
window.BerlinCityEpisodes=combined;
window.BerlinCityFlowV3={version:3,register:install,inspect:foundation,view,choose,remainingFor:id=>id==="alexanderplatz:express-courier"||missionSteps.some(x=>x.id===id)?elapsed(state()?.mission):null,get current(){return state()}};
const timer=setInterval(()=>{if(install())clearInterval(timer)},750);setTimeout(()=>clearInterval(timer),20000);install();
console.info("[Berlin Life] Phase 7.1–7.4: 3-stop courier, relations, distinctive locations, persistent progression");
})();
