import { Tick } from '../state/Tick.js';
import { U8_STOPS,U8_ALEX_INDEX,stopX } from './U8FullLineVisual.js';

const KEY='metro-economy-v2';
const U2_COORDS={
'Pankow':[52.567281,13.412283],'Vinetastraße':[52.559515,13.413766],'Schönhauser Allee':[52.549339,13.415142],'Eberswalder Straße':[52.541024,13.412157],'Senefelderplatz':[52.532619,13.412625],'Rosa-Luxemburg-Platz':[52.528529,13.41009],'Alexanderplatz':[52.521606,13.411768],'Klosterstraße':[52.517229,13.412454],'Märkisches Museum':[52.512007,13.408768],'Spittelmarkt':[52.511413,13.402027],'Hausvogteiplatz':[52.51302,13.39664],'Stadtmitte':[52.511494,13.38972],'Anton-Wilhelm-Amo-Straße':[52.511521,13.383796],'Potsdamer Platz':[52.509355,13.376551],'Mendelssohn-Bartholdy-Park':[52.503188,13.374681],'Gleisdreieck':[52.499583,13.374295],'Bülowstraße':[52.497624,13.362456],'Nollendorfplatz':[52.499646,13.353826],'Wittenbergplatz':[52.502109,13.342563],'Zoologischer Garten':[52.506919,13.332711],'Ernst-Reuter-Platz':[52.511584,13.32258],'Deutsche Oper':[52.511827,13.30942],'Bismarckstraße':[52.511539,13.305339],'Sophie-Charlotte-Platz':[52.510973,13.297464],'Kaiserdamm':[52.509984,13.281697],'Theodor-Heuss-Platz':[52.509795,13.272977],'Neu-Westend':[52.516411,13.259907],'Olympia-Stadion':[52.51705,13.250504],'Ruhleben':[52.525589,13.241902]
};
const U8_COORDS={
'Wittenau':[52.596451,13.335524],'Rathaus Reinickendorf':[52.588217,13.325564],'Karl-Bonhoeffer-Nervenklinik':[52.578167,13.332917],'Lindauer Allee':[52.57539,13.339039],'Paracelsus-Bad':[52.574428,13.3473],'Residenzstraße':[52.570841,13.360631],'Franz-Neumann-Platz':[52.563856,13.364281],'Osloer Straße':[52.557105,13.373279],'Pankstraße':[52.552278,13.381441],'Gesundbrunnen':[52.548638,13.388372],'Voltastraße':[52.541932,13.393154],'Bernauer Straße':[52.537994,13.396229],'Rosenthaler Platz':[52.529778,13.401397],'Weinmeisterstraße':[52.525374,13.405308],'Alexanderplatz':[52.521606,13.411768],'Jannowitzbrücke':[52.515503,13.418027],'Heinrich-Heine-Straße':[52.510559,13.416122],'Moritzplatz':[52.503737,13.410944],'Kottbusser Tor':[52.499044,13.417749],'Schönleinstraße':[52.493345,13.421911],'Hermannplatz':[52.486954,13.424724],'Boddinstraße':[52.479744,13.425785],'Leinestraße':[52.472877,13.428401],'Hermannstraße':[52.467546,13.431295]
};
const CONTACTS={
'Alexanderplatz':{id:'miro',emoji:'🧔',name:'Miro',role:'Kiez Späti',intro:'Chef van Kiez Späti en jouw vaste koeriercontact.',lines:['Morgen. Als je wilt rijden, ik heb bestellingen liggen.','Netjes bezorgd. Mensen beginnen je te kennen.','Rustig blijven rijden. Snel is goed, heel aankomen is beter.']},
'Rosa-Luxemburg-Platz':{id:'lea',emoji:'👩',name:'Lea',role:'Buurvrouw',intro:'Woont in dezelfde Altbau en houdt een oogje op het huis.',lines:['Hey buur. Alles goed?','Als je laat thuiskomt: de voordeur klemt een beetje.','Je kamer begint er zowaar bewoond uit te zien.']},
'Kottbusser Tor':{id:'deniz',emoji:'🧢',name:'Deniz',role:'Kotti contact',intro:'Kent mensen in Kreuzberg en het nachtleven.',lines:['Kotti slaapt nooit. Kom later nog eens langs.','Je kent de stad inmiddels beter dan sommige chauffeurs.','Na tienen gebeurt er ander werk. Nog niet voor iedereen.']}
};
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'');
let currentStreet=null,opening=false,lastOpenAt=0;

function read(game){if(game.metroEconomy)return game.metroEconomy;try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function persist(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{};document.dispatchEvent(new CustomEvent('metro-contacts-changed'));document.dispatchEvent(new CustomEvent('metro-economy-changed'))}
function ensureContact(s,id){s.contacts??={};s.messages??=[];s.contacts[id]??={met:false,relationship:0,lastTalkDay:0,unlocked:false};return s.contacts[id]}
function addMessage(s,id,text,day){const mid=`${id}:${day}:${text}`;if(s.messages.some(m=>m.id===mid))return;s.messages.unshift({id:mid,from:id,text,day,read:false,at:Date.now()});s.messages=s.messages.slice(0,30)}
function talk(game,station){const c=CONTACTS[station],s=read(game);if(!c||!s)return;const st=ensureContact(s,c.id),day=s.home?.day||1;if(!st.met){st.met=true;st.unlocked=true;addMessage(s,c.id,c.intro,day)}const idx=Math.min(c.lines.length-1,Math.floor((st.relationship||0)/2)),line=c.lines[idx];if(st.lastTalkDay!==day){st.relationship=(st.relationship||0)+1;st.lastTalkDay=day}addMessage(s,c.id,line,day);persist(s);game.ui?.notify?.(`${c.emoji} ${c.name}: “${line}”`)}

function prefillStreetCache(){for(const [line,map] of [['U2',U2_COORDS],['U8',U8_COORDS]])for(const [name,[lat,lng]] of Object.entries(map)){const key=`metro-street-v41:${norm(`${line}:${name}`)}`;try{localStorage.setItem(key,JSON.stringify({lat,lng,heading:name==='Alexanderplatz'?180:0,name,outdoor:true}))}catch{}}}

function cleanupStreetUI(game){
  const o=game.__allStreetOverlay;if(!o)return;
  document.querySelector('#streetReturnOnlyV1')?.remove();
  for(const el of document.querySelectorAll('#contactTalkV1,#contactTalkV2'))el.remove();
  for(const el of document.querySelectorAll('div')){
    const txt=(el.textContent||'').trim();
    if(el.style?.position==='fixed'&&txt.includes('PHASE 16 · BOVENGRONDS')){el.dataset.phase16Legacy='1';el.style.setProperty('display','none','important')}
  }
  const buttons=[...o.root.querySelectorAll('button')];
  for(const b of buttons){const t=(b.textContent||'').trim();if(/Andere straatpositie|Open in Google/i.test(t)){b.dataset.streetLegacyControl='1';b.style.setProperty('display','none','important')}}
  const back=buttons.find(b=>/U-Bahn/i.test((b.textContent||''))&&!/Andere/i.test((b.textContent||'')));
  if(back){back.textContent='↓ TERUG NAAR U-BAHN';back.style.setProperty('display','block','important');back.style.setProperty('left','12px');back.style.setProperty('right','auto');back.style.setProperty('top','auto');back.style.setProperty('bottom','max(12px,env(safe-area-inset-bottom))');back.style.setProperty('z-index','15500');}
}

function addTalkButton(game){
  const ui=document.querySelector('#stationLifeV5');if(!ui||!currentStreet)return;
  ui.querySelector('#contactInlineV2')?.remove();
  const c=CONTACTS[currentStreet.name];if(!c||!game.player.__streetMode)return;
  const b=document.createElement('button');b.id='contactInlineV2';b.style.cssText='width:100%;margin-top:7px;border:0;border-radius:9px;padding:10px;background:#20252bea;color:#fff;font:900 12px Arial;box-shadow:0 5px 18px #0007;pointer-events:auto';b.textContent=`${c.emoji} PRAAT MET ${c.name.toUpperCase()}`;
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();talk(game,currentStreet.name)});
  ui.appendChild(b);
}

async function openStreet(game,next){if(opening||game.player.__streetMode||Date.now()-lastOpenAt<800)return;const o=game.__allStreetOverlay;if(!o)return;opening=true;lastOpenAt=Date.now();try{await o.open(next)}catch(e){console.error('[Metro] forced Street View open failed',e)}finally{opening=false}}
function failSafeExits(game){
  const p=game.player;if(!p||p.__streetMode||p.activeTrain||p.__u8Active||opening)return;
  if(Number.isInteger(p.__u8FullStation)&&p.__u8FullStation!==U8_ALEX_INDEX){
    const idx=p.__u8FullStation,stop=U8_STOPS[idx],alex=game.stations.find(s=>s.id==='alexanderplatz');if(stop&&alex){const cx=stopX(idx),zc=alex.z+49;if(p.position.x>cx+21.0&&p.position.x<cx+48&&Math.abs(p.position.z-zc)<6.3){openStreet(game,{line:'U8',name:stop.name,returnKind:'u8',index:idx});return}}
  }
  if(!Number.isInteger(p.__u8FullStation)){
    const st=p.currentStation;if(st&&st.id!=='alexanderplatz'){const rz=p.position.z-st.z;if(rz>31.1&&rz<55&&p.position.x>1.8&&p.position.x<8.2){openStreet(game,{line:'U2',name:st.name,returnKind:'u2',stationId:st.id});return}}
  }
}

function install(game){if(game.__phase16StabilityV2)return;game.__phase16StabilityV2=true;prefillStreetCache();
  const style=document.createElement('style');style.id='phase16StabilityV2Css';style.textContent='[data-phase16-legacy="1"],[data-street-legacy-control="1"],#contactTalkV1,#contactTalkV2,#streetReturnOnlyV1{display:none!important}';document.head.appendChild(style);
  document.addEventListener('metro-street-cell',e=>{currentStreet=e.detail?.ctx||null;setTimeout(()=>{cleanupStreetUI(game);addTalkButton(game)},0)});
  Tick.every('phase16.street-stability',90,()=>{cleanupStreetUI(game);failSafeExits(game);if(game.player.__streetMode)addTalkButton(game)});
  game.phase16StabilityVersion='V2-streetview-all-stations-talk-inline';game.ui?.notify?.('Phase 16 stabiliteit · Street View + praten gefixt');
}
(async()=>{for(let i=0;i<700;i++){const g=globalThis.__berlinMetroGame;if(g?.player&&g?.stations&&g?.__allStreetOverlay){install(g);return}await new Promise(r=>setTimeout(r,100))}})().catch(e=>console.error('[Metro] Phase16 stability V2 failed',e));
