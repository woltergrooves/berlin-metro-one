import { Tick } from '../state/Tick.js';
(function phase7HybridV6() {
  "use strict";
  const SHOP_ID = "alexanderplatz:spaeti";
  const CLOCK_ID = "alexanderplatz:weltzeituhr";
  const SQUARE_ID = "stadtmitte:gendarmen";
  const WALL_ID = "bernauer-strasse:wall";
  const ITEMS = [
    {id:"wasser",name:"Mineralwasser",price:150,emoji:"💧",note:"+8 energie",effect:8,container:false},
    {id:"mate",name:"Club-Mate",price:260,emoji:"🧉",note:"+14 energie · fles met Pfand",effect:14,container:true},
    {id:"boerek",name:"Börek",price:320,emoji:"🥐",note:"+22 energie",effect:22,container:false}
  ];
  const money=c=>`€${(Number(c||0)/100).toFixed(2).replace(".",",")}`;
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
    j.entries.unshift({id,name,kind:"phase7",station:station()?.id||"alexanderplatz",text:knowledge?name+"-opdracht voltooid.":"Späti-interieur bezocht.",day:s.clock?.day??0,minute:Math.round(s.clock?.minute||0)});
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
    root.innerHTML='<section class="p7-shell" role="dialog" aria-modal="true" aria-label="Activiteit"><header class="p7-bar"><div><strong id="p7-title">Activiteit</strong><small id="p7-sub">Berlin Life · Fase 7</small></div><button class="p7-x" type="button" data-p7="close" aria-label="Sluit activiteit">✕</button></header><div class="p7-scroll"></div></section>';
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
    if(!economy?.spend){message("De economie is nog niet geladen.");return}
    const result=economy.spend(item.price,"Späti · "+item.name);
    if(result?.success===false){message("Je hebt niet genoeg geld voor "+item.name+".");return}
    p.inventory[item.id]=(p.inventory[item.id]||0)+1;
    p.spent=(p.spent||0)+item.price;store();
    message("Gekocht: "+item.name+". Het staat nu in je voorraad.");
  }
  function consume(id){
    const p=ensure(),item=purchase(id);if(!p||!item)return;
    if(!(p.inventory[item.id]>0)){message("Je hebt dit product niet in je voorraad.");return}
    p.inventory[item.id]--;
    p.energy=Math.min(100,Math.max(0,p.energy||0)+item.effect);
    if(item.container)p.emptyBottles=(p.emptyBottles||0)+1;
    store();message(item.name+" gebruikt. Energie +"+item.effect+(item.container?" · Je hebt een lege Pfandfles.":"")+".");
  }
  function returnBottle(){
    const p=ensure(),e=econ();if(!p||!e?.earn)return;
    if(!(p.emptyBottles>0)){message("Je hebt geen lege Pfandflessen.");return}
    p.emptyBottles--;e.earn(25,"Pfand · Späti");
    p.returns=(p.returns||0)+1;store();message("Pfand ingeleverd: +€0,25 op je rekening.");
  }

  // City decisions deliberately avoid obvious wrong answers and a fixed B-key.
  // Accurate history: Weltzeituhr (1969), Schinkel's Schauspielhaus,
  // and the preserved Bernauer Straße border installations.
  const CHALLENGES={
    clock:[
      {prompt:"De Weltzeituhr werd op 30 september 1969 onthuld. In welke politieke en stedenbouwkundige context past die datum?",
       options:["Als onderdeel van de herinrichting rond het twintigjarig DDR-jubileum.","Voor de Europese cultuurhoofdstadcampagne na de hereniging.","Ter gelegenheid van de eerste doorgaande S-Bahn-verbinding naar West-Berlijn."],correct:0,
       hint:"Denk aan de politieke betekenis van Alexanderplatz eind jaren zestig.",explain:"De klok werd op 30 september 1969 onthuld tijdens de herinrichting van Alexanderplatz rond het twintigjarige bestaan van de DDR."},
      {prompt:"Welke beschrijving van het mechanisme van de Weltzeituhr is het nauwkeurigst?",
       options:["De buitenste ring draait eenmaal per dag en verplaatst de stadsnamen.","Een centrale tijdschaal draait langs de stadsnamen en tijdzones.","De klok toont alleen het uur van Berlijn; de andere tijden zijn vast."],correct:1,
       hint:"Let op welk onderdeel tijd laat verstrijken en welk onderdeel plaatsnamen bevat.",explain:"Een draaiende tijdschaal in het midden laat de lokale tijden bij de plaatsen en tijdzones aflezen."},
      {prompt:"Wat verbeeldt het planetenmodel boven op de Weltzeituhr in de eerste plaats?",
       options:["Het heelal als referentie voor de meting en indeling van tijd.","De historische planetenkaart van de Berlijnse sterrenwacht.","De banen van satellieten waarmee de klok radiotijd ontvangt."],correct:0,
       hint:"Het gaat om de gedachte achter tijdmeting, niet om de stroomvoorziening.",explain:"Het roterende planetenmodel verwijst symbolisch naar de beweging van hemellichamen als basis van tijdmeting."}
    ],
    square:[
      {prompt:"Bij de twee 'Dome' aan de Gendarmenmarkt zit een architectonische valkuil. Welke uitleg klopt?",
       options:["Het zijn oorspronkelijk koninklijke paleiskapellen die tot kathedralen zijn omgebouwd.","De namen slaan op imposante koepeltorens bij afzonderlijke kerkgebouwen.","Beide gebouwen waren vanaf het begin nationale musea zonder religieuze functie."],correct:1,
       hint:"De naam 'Dom' verwijst hier niet simpelweg naar de functie van de hele constructie.",explain:"De Deutscher Dom en Französischer Dom ontlenen hun naam aan de koepeltorens, naast de oorspronkelijke kerkgebouwen."},
      {prompt:"Het Konzerthaus was ooit een Schauspielhaus. Wie ontwierp de herbouw na de brand van 1817?",
       options:["Carl Gotthard Langhans, bekend van de Brandenburger Tor.","Karl Friedrich Schinkel, die het theater in 1818–1821 vormgaf.","Peter Joseph Lenné, die vooral het plein en zijn tuinen ontwierp."],correct:1,
       hint:"De architect werd een bepalende figuur van het Pruisische classicisme.",explain:"Karl Friedrich Schinkel ontwierp het Schauspielhaus, gebouwd tussen 1818 en 1821."},
      {prompt:"De naam 'Gendarmenmarkt' is niet bedacht voor een kerstmarkt. Waar komt hij vandaan?",
       options:["Van het Pruisische kurassiersregiment Gens d'armes dat hier stallingen had.","Van de gendarmeriepost die na 1871 tussen beide kerken werd gebouwd.","Van de Franse ambassade, die het plein bij de deling van de stad beheerde."],correct:0,
       hint:"Het historische spoor leidt naar een regiment, niet naar een latere evenementenlocatie.",explain:"De naam verwijst naar de Gens d'armes, een kurassiersregiment dat hier zijn stallen had."}
    ],
    wall:[
      {prompt:"Waarom waren ontsnappingen vanuit huizen aan de Bernauer Straße in augustus 1961 mogelijk?",
       options:["Hun achtertuinen vormden een gemeenschappelijk toegangspad zonder grenswachten.","De huizen stonden in Oost-Berlijn, maar het trottoir ervoor lag al in West-Berlijn.","Het nabijgelegen metrostation was toen nog een vrij toegankelijke grensovergang."],correct:1,
       hint:"Kijk naar de grens tussen gevel en stoep, niet naar het spoor.",explain:"De huizen lagen in de Sovjetsector, terwijl de stoep ervoor bij de Franse sector hoorde. Mensen sprongen uit ramen naar West-Berlijn."},
      {prompt:"De Kapelle der Versöhnung staat op een beladen locatie. Wat gebeurde er met de eerdere kerk?",
       options:["De DDR liet de kerk in 1985 opblazen omdat die in het grensgebied stond.","Het gebouw werd in 1945 verwoest en pas na 1989 archeologisch teruggevonden.","De gemeente verkocht de kerk in 1961 voor de aanleg van een grensstation."],correct:0,
       hint:"De kerk overleefde de oorlog, maar niet de latere grensbeveiliging.",explain:"De Versöhnungskirche kwam in de grensstrook te liggen en werd in 1985 door de DDR opgeblazen."},
      {prompt:"Wat maakt de gedenkplaats aan de Bernauer Straße bijzonder als historisch bewijs?",
       options:["Een teruggeplaatst stuk muur zonder oorspronkelijke grensvoorzieningen.","Een bewaard deel van het grenssysteem met meerdere lagen en de voormalige grensstrook.","De oorspronkelijke Checkpoint Charlie-post en de eerste DDR-grenspoort."],correct:1,
       hint:"Het terrein toont meer dan één enkele betonnen wand.",explain:"Er zijn delen van de grensinstallaties en de voormalige grensstrook bewaard, waardoor de opbouw zichtbaar is."}
    ],
    courier:[
      {prompt:"Je staat op het juiste huisnummer. De naam op de bel ontbreekt en de klant neemt niet op. In de instructies staat 'persoonlijk afgeven'. Wat doe je?",
       options:["Vraag via de bezorgapp om bevestiging en volg anders de procedure voor mislukte bezorging.","Vraag de conciërge het pakket in ontvangst te nemen en noteer zijn naam, ook zonder machtiging.","Maak een afleverfoto van de afgesloten pakketkast en meld het als bezorgd, hoewel daarvoor geen toestemming is."],correct:0,
       hint:"Het juiste gebouw is nog niet hetzelfde als een bevestigde ontvanger.",explain:"Bij persoonlijke aflevering moet de identiteit of ontvangst bevestigd zijn. Zonder dat volg je de mislukte-bezorgprocedure."},
      {prompt:"Een bewoner vraagt je een pakket voor nr. 18 af te geven bij nr. 18A, 'want dat is hetzelfde gebouw'. Wat is het beste?",
       options:["Bel eerst het nummer dat de bewoner geeft en lever op 18A af wanneer die persoon de wijziging bevestigt.","Controleer eerst adres en ontvanger in de opdracht en vraag zo nodig een bevestigde wijziging.","Vraag de bewoner zijn naam op de bon te zetten; dat lijkt een voldoende adreswijziging."],correct:1,
       hint:"Een mondelinge wijziging van iemand anders is geen geverifieerde afleverinstructie.",explain:"Je houdt het geregistreerde adres en de ontvanger aan totdat een adreswijziging betrouwbaar is bevestigd."},
      {prompt:"Je hebt twee pakketten voor dezelfde straat, maar verschillende huisnummers. De scan voor het eerste lukt niet. Welke handeling voorkomt een fout?",
       options:["Leg de twee bezorgingen samen vast met één handmatige routebevestiging en aparte foto’s.","Noteer beide pakketnummers met één routecode en werk de scans pas achteraf bij.","Controleer pakketlabel en afleverpunt apart en registreer geen aflevering die je niet hebt uitgevoerd."],correct:2,
       hint:"Een scan bevestigt één zending, geen straat of route.",explain:"Elke zending heeft een afzonderlijke afleverregistratie; je mag niet de scan van een ander pakket gebruiken."}
    ],
    social:[
      {prompt:"Miro zegt: 'We zoeken soms mensen voor de deur, maar de meeste verdwijnen na één nacht.' Hoe reageer je om een echte kans te krijgen?",
       options:["Vraag op welke uren je kunt invallen, wat de verwachtingen zijn en hoe je betrouwbaarheid kunt aantonen.","Stel voor dat je eerst één drukke dienst meeloopt zonder over vaste beschikbaarheid te praten.","Vraag direct om een vaste dienst en bespreek pas daarna hoe flexibel je kunt zijn."],correct:0,
       hint:"Zijn opmerking gaat vooral over vertrouwen en aanwezigheid.",explain:"Een gerichte vraag naar verwachtingen en inzet bouwt een werkrelatie op zonder direct iets te eisen."},
      {prompt:"Deniz kent iemand die muziekavonden organiseert, maar wil geen loze beloften doen. Wat is de slimste vervolgvraag?",
       options:["Of je hem een mix kunt sturen, zonder eerst te vragen wat voor soort avond het wordt.","Of er een concreet probleem is waarbij je eerst klein kunt helpen of ervaring kunt tonen.","Of Deniz je eerst kan introduceren bij de organisatie en je daarna hoort welke hulp nuttig is."],correct:1,
       hint:"Een nuttige eerste bijdrage werkt beter dan druk zetten op een toezegging.",explain:"Door een concrete bijdrage voor te stellen, wordt een vrijblijvende introductie een geloofwaardige kans."},
      {prompt:"Een kennis zegt dat er tijdelijk werk is, maar kent alleen een voornaam. Welke reactie bewaart het contact én helpt je verder?",
       options:["Vraag om een betrouwbaar contactkanaal en een beschrijving van het werk voordat je toezegt.","Vraag naar de werktijden en zeg alvast toe, ook als de precieze werkzaamheden onbekend blijven.","Vraag om een introductie bij zijn contactpersoon, maar stel vragen over het werk pas na de eerste dienst."],correct:0,
       hint:"Interesse tonen hoeft niet gelijk een verplichting te zijn.",explain:"Je vraagt voldoende informatie om serieus en veilig een volgende stap te zetten."}
    ],
    explore:[
      {prompt:"Je ziet een vernieuwde gevel tegenover een ouder stationsgebouw. Wat kun je daaruit met de meeste zekerheid afleiden?",
       options:["Dat de hele wijk na 1990 vrijwel volledig opnieuw is gebouwd.","Dat verschillende bouw- en renovatieperioden naast elkaar zichtbaar kunnen zijn.","Dat het oudere gebouw vanzelf uit de negentiende eeuw moet stammen."],correct:1,
       hint:"Een zichtbaar verschil bewijst een verschil, niet meteen een exacte datum.",explain:"Verschillende bouwlagen bestaan naast elkaar; voor precieze datering moet je aanvullende aanwijzingen zoeken."},
      {prompt:"Op een informatiebord wordt een vroegere straatnaam genoemd. Welke conclusie is het beste onderbouwd?",
       options:["De naamsverandering kan iets zeggen over machtswisselingen, herinnering of stadsontwikkeling.","De vroegere naam bewijst dat de straat tijdens de DDR afgesloten was.","De huidige naam wordt altijd gekozen om het vroegere straatverloop te verhullen."],correct:0,
       hint:"Straatnamen zijn bronnen over beeldvorming, maar vertellen niet zelfstandig het hele verhaal.",explain:"Naamsveranderingen kunnen politiek of cultureel betekenisvol zijn, zonder dat je er automatisch verkeers- of grensgeschiedenis uit kunt afleiden."},
      {prompt:"Twee historische foto's laten hetzelfde plein vanuit verschillende hoeken zien. Hoe vergelijk je ze zorgvuldig?",
       options:["Let uitsluitend op het centrale monument; fotografisch perspectief is onbelangrijk.","Behandel elk verschil in breedte als bewijs dat het plein is vergroot.","Zoek vaste herkenningspunten en controleer perspectief en opnamedatum voordat je veranderingen aanwijst."],correct:2,
       hint:"Afstand en hoek veranderen de schijnbare afmetingen.",explain:"Je voorkomt verkeerde conclusies door perspectief en dateringen naast vaste herkenningspunten te leggen."}
    ],
    sight:[
      {prompt:"Een monument draagt een oudere bouwdatum en een moderne restauratieplaquette. Welke lezing is het meest zorgvuldig?",
       options:["De restauratiedatum vervangt de historische bouwdatum.","Beide dateringen kunnen kloppen: ze verwijzen naar verschillende fasen van hetzelfde bouwwerk.","De oorspronkelijke datering is waarschijnlijk verzonnen voor toeristen."],correct:1,
       hint:"Bouw, schade en herstel zijn afzonderlijke fasen.",explain:"Een monument kan oud zijn en later ingrijpend zijn hersteld."},
      {prompt:"Op de plek zie je een monument en een uitleg over wat vroeger op dezelfde plaats stond. Welke interpretatie houdt stand?",
       options:["De huidige inrichting vertelt niet automatisch het complete historische verhaal van de locatie.","Het oudste gebouw is altijd het belangrijkste voor de betekenis van de plek.","Een nieuw monument bewijst dat er voordien geen ander gebruik was."],correct:0,
       hint:"Een plek heeft vaak meerdere historische lagen.",explain:"Je combineert zichtbare elementen met historische informatie om de betekenis van de locatie te begrijpen."},
      {prompt:"Een historisch gebouw is veranderd van functie. Wat is de sterkste aanwijzing om die ontwikkeling te begrijpen?",
       options:["Alleen de huidige naam op de gevel.","De populariteit van de locatie onder bezoekers.","Een combinatie van oorspronkelijke functie, verbouwingen en het huidige gebruik."],correct:2,
       hint:"Bij herbestemming zijn veranderingen door de tijd essentieel.",explain:"De historische en huidige functies én de tussenliggende verbouwingen verklaren de ontwikkeling van het gebouw."}
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
    message((kind==='courier'?'De afleverprocedure is nog niet juist. ':'Niet helemaal. ')+(q?.hint||'Herlees de situatie en probeer opnieuw.'));
  }

  function answer(n){
    const p=ensure();if(!p||mode!=="clock")return;
    p.quizAttempts=(p.quizAttempts||0)+1;
    if(!verifyChoice(n)){incorrect("clock");return}
    if(!p.quizSolved){
      p.quizSolved=true;
      stamp(CLOCK_ID,"Weltzeituhr",{knowledge:true});
      message("Goed onderzocht. "+activeChallenge.explain+" +1 Berlin Knowledge en een City Stamp.");
    }else{store();message("Goed beargumenteerd. "+activeChallenge.explain+" De beloning heb je eerder al ontvangen.")}
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
      message("Goed onderzocht. "+activeChallenge.explain+" +1 Berlin Knowledge en een City Stamp.");
    }else{store();message("Goed onderzocht. "+activeChallenge.explain+" De beloning is eenmalig.")}
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
      if(s.courierShifts[key]){store();message("Deze koeriersdienst is vandaag al betaald. Morgen kan je weer aan de slag.");return}
      const economy=econ();if(typeof economy?.earn!=="function"){message("De economie is nog niet beschikbaar.");return}
      const payment=850;
      s.courierShifts[key]=true;
      economy.earn(payment,"Koerierdienst · "+stn.name);
      stamp(id,"Koeriersklus bij "+stn.name);
      message("Opdracht voltooid. "+note+" +"+money(payment)+" verdiend. Morgen weer een dienst.");
      return;
    }
    if(isSocial){
      const contact=stn.id==="alexanderplatz"?"Miro":"Deniz";
      if(s.socialContacts[contact]){store();message("Je hebt "+contact+" al in je contacten. "+note);return}
      s.socialContacts[contact]=true;
      stamp(id,"Gesprek met "+contact);
      const j=st()?.berlinJournal;
      if(j){j.contacts=j.contacts||{};j.contacts[contact]=true;j.leads=j.leads||{};j.leads[contact.toLowerCase()+"-lead"]=true}
      store();message(note+" "+contact+" is toegevoegd aan je contacten. Je hebt een nieuwe werk-lead.");
      return;
    }
    if(s.activitySolved[id]){store();message("Deze plek heb je eerder onderzocht. "+note+" De beloning is eenmalig.");return}
    s.activitySolved[id]=true;
    stamp(id,mode==="sight"?"Bezoek aan "+(city()?.activities?.()?.find(a=>a.id===id)?.name||stn.name):"Buurtverkenning "+stn.name,{knowledge:true});
    message(note+" +1 Berlin Knowledge en een nieuwe City Stamp.");
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
      root.querySelector("#p7-sub").textContent=(station()?.name||"Berlin")+" · interactieve 2D-winkel";
      card.innerHTML=`
        <div class="p7-scene" aria-label="2D Späti met schappen en toonbank"><div class="p7-store-sign">SPÄTI · BERLIN</div><div class="p7-shelf"><span>🥤</span><span>🥨</span><span>🧃</span><span>🍫</span></div><div class="p7-person">🧑‍💼</div><div class="p7-counter"></div></div>
        <p class="p7-intro">“Na, wat soll's sein?” Kies iets uit het schap. Je betaalt met hetzelfde geld als in de rest van Berlin Life.</p>
        <div class="p7-grid"><div class="p7-stat"><b>${total==null?"—":money(total)}</b><small>Beschikbaar</small></div><div class="p7-stat"><b>${p.energy||0}/100</b><small>Energie</small></div><div class="p7-stat"><b>${money(p.spent)}</b><small>Uitgegeven hier</small></div></div>
        <div class="p7-section">IN DE WINKEL</div>
        ${ITEMS.map(i=>`<div class="p7-row"><span class="p7-icon">${i.emoji}</span><div class="p7-desc"><strong>${i.name}</strong><small>${i.note}</small><span class="p7-cost">${money(i.price)}</span></div><button class="p7-action" data-p7="buy" data-item="${i.id}" ${total==null||total<i.price?"disabled":""}>KOOP</button></div>`).join("")}
        <div class="p7-section">JOUW VOORRAAD</div>
        ${ITEMS.map(i=>`<div class="p7-row"><span class="p7-icon">${i.emoji}</span><div class="p7-desc"><strong>${i.name}</strong><small>In bezit: ${p.inventory[i.id]||0}</small></div><button class="p7-action" data-p7="consume" data-item="${i.id}" ${(p.inventory[i.id]||0)<1?"disabled":""}>${i.id==="boerek"?"EET":"DRINK"}</button></div>`).join("")}
        <div class="p7-row"><span class="p7-icon">♻️</span><div class="p7-desc"><strong>Pfand inleveren</strong><small>${p.emptyBottles||0} lege flessen · €0,25 per fles</small></div><button class="p7-action" data-p7="return" ${(p.emptyBottles||0)<1?"disabled":""}>LEVER IN</button></div>
        ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
        <button class="p7-finish" data-p7="close">VERLAAT DE SPÄTI</button>`;
    }else if(mode==="clock"){
      root.querySelector("#p7-title").textContent="🕒 Weltzeituhr";
      root.querySelector("#p7-sub").textContent="Alexanderplatz · interactieve ontdekking";
      card.innerHTML=`
        <div class="p7-clock-scene" aria-label="Wereldklok bij Alexanderplatz"><span class="p7-clock-icon">🌐</span></div>
        <p class="p7-intro">Je staat bij de Weltzeituhr. Bekijk de plaats en leg de historische en technische details uit; een verkeerde gok levert geen beloning op.</p>
        ${questionUI("answer")}
        <div class="p7-grid"><div class="p7-stat"><b>${p.quizSolved?"✓":"—"}</b><small>Puzzel opgelost</small></div><div class="p7-stat"><b>${p.quizSolved?"+1":"0"}</b><small>Berlin Knowledge</small></div><div class="p7-stat"><b>${p.quizAttempts||0}</b><small>Antwoorden</small></div></div>
        ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
        <button class="p7-finish" data-p7="close">TERUG NAAR ALEXANDERPLATZ</button>`;
    }else if(mode==="square"||mode==="wall"){
      const square=mode==="square",id=square?SQUARE_ID:WALL_ID,solved=!!p.historicSolved[id],attempts=p.historicAttempts[id]||0;
      root.querySelector("#p7-title").textContent=square?"🏛️ Gendarmenmarkt":"🧱 Gedenkstätte Berliner Mauer";
      root.querySelector("#p7-sub").textContent=(square?"Stadtmitte":"Bernauer Straße")+" · stadsontdekking";
      card.innerHTML=`
        <div class="p7-clock-scene" aria-label="${square?"Monumentaal plein met kathedralen":"Gedenkstätte Berliner Mauer"}"><span class="p7-clock-icon">${square?"🏛️":"🧱"}</span></div>
        <p class="p7-intro">${square?"Je staat aan het Gendarmenmarkt, een van de bekendste pleinen van Berlijn.":"Je staat bij de herdenkingsplek aan de Bernauer Straße, waar de Berlijnse Muur ooit door de stad liep."}</p>
        ${questionUI("answer-historic")}
        <div class="p7-grid"><div class="p7-stat"><b>${solved?"✓":"—"}</b><small>Onderzocht</small></div><div class="p7-stat"><b>${solved?"+1":"0"}</b><small>Berlin Knowledge</small></div><div class="p7-stat"><b>${attempts}</b><small>Pogingen</small></div></div>
        ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
        <button class="p7-finish" data-p7="close">TERUG NAAR STREET VIEW</button>`;
    }else if(["explore","sight","social","courier"].includes(mode)){
      const stn=station(),id=activeActivity||"city:"+stn.id;
      const solved=!!p.activitySolved[id],dayKey=stn.id+":"+Math.floor(Number(st()?.clock?.totalMinutes||0)/1440);
      const paid=!!p.courierShifts[dayKey];
      const person=stn.id==="alexanderplatz"?"Miro":"Deniz";
      const title=mode==="social"?"💬 Gesprek met "+person:mode==="courier"?"🚲 Koeriersklus":mode==="sight"?"📍 Bestemming bezoeken":"🧭 Buurtverkenning";
      root.querySelector("#p7-title").textContent=title;
      root.querySelector("#p7-sub").textContent=stn.name+" · Berlijn";
      const intro=mode==="social"?person+" vertelt je iets over werk. Hoe reageer je?":mode==="courier"?"Een koeriersdienst geeft je een situatie die je zorgvuldig moet oplossen.":mode==="sight"?"Onderzoek deze plek en de verschillende historische lagen.":"Je verkent de buurt bij "+stn.name+". Kies de best onderbouwde interpretatie.";
      card.innerHTML=`
       <div class="p7-clock-scene"><span class="p7-clock-icon">${mode==="courier"?"🚲":mode==="social"?"💬":mode==="sight"?"🏛️":"🧭"}</span></div>
       <p class="p7-intro">${intro}</p><div class="p7-section">${mode==="courier"?"BEZORGOPDRACHT":mode==="social"?"GESPREKSKEUZE":"ONTDEK DE PLEK"}</div>
       ${questionUI("city-choice")}
       <div class="p7-grid"><div class="p7-stat"><b>${mode==="courier"?(paid?"✓":"€8,50"):(solved?"✓":"—")}</b><small>${mode==="courier"?"Dienst vandaag":"Ontdekt"}</small></div><div class="p7-stat"><b>${p.activityAttempts[id]||0}</b><small>Keuzes</small></div></div>
       ${msg?`<div class="p7-alert" role="status">${msg}</div>`:""}
       <button class="p7-finish" data-p7="close">TERUG NAAR STREET VIEW</button>`;
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
      if(Array.isArray(list)&&!list.some(a=>a.id===id))list.unshift({id,station:sid,icon:"🥤",name:title,dist:70,detail:"Interieur · snacks, drinken en Pfand",obvious:true});
    }
    const panel=document.querySelector("#sv-discovery-modal .svd-panel");
    if(!panel)return;
    for(const b of panel.querySelectorAll(`button.svd-go[data-p7-entry="shop"],button.svd-go[data-open$=":spaeti"],button.svd-go[data-berlin-nav$=":spaeti"]`)){
      b.removeAttribute("data-open");b.removeAttribute("data-berlin-nav");
      b.dataset.p7Entry="shop";b.textContent="BINNEN";
    }
    const detail=identifyDetail();
    if(!detail)return;
    if(detail==="clock"&&!city()?.atClock?.())return;
    const action=panel.querySelector("button[data-action='perform']");
    if(action){
      action.dataset.p7Entry=detail;
      action.textContent=detail==="shop"?"BETREED DE SPÄTI":"SPEEL WELTZEITUHR";
      action.disabled=false;
    }
    if(!panel.querySelector("button[data-p7-entry]")&&detail){
      const back=panel.querySelector("button[data-action='back']");
      if(back){
        const b=document.createElement("button");b.className="svd-wide";b.type="button";b.dataset.p7Entry=detail;
        b.textContent=detail==="shop"?"BETREED DE SPÄTI":"SPEEL WELTZEITUHR";back.before(b);
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
      console.info("[Berlin Life] Fase 7 activity registry connected");
    }
  });
  window.BerlinPhase7={version:6,openCityActivity:(type,id)=>open(type,id),openShop:()=>open("shop"),openWeltzeituhr:()=>open("clock"),openGendarmenmarkt:()=>open("square"),openBerlinerMauer:()=>open("wall"),close,
    snapshot:()=>{const p=ensure();return p?JSON.parse(JSON.stringify(p)):null},isOpen,shopItemIds:ITEMS.map(x=>x.id),get discovered(){return !!window.BerlinDiscoveryV2?.data?.alexanderplatz?.some(a=>a.id===SHOP_ID)}};
  console.info("[Berlin Life] Fase 7 V6 – scenario questions, variable keys and reasoned answers ready");
})();