import {CITY_MISSIONS,acceptCityMission,recordMissionVisit,recordMissionBus,cityMissionReady,claimCityMission} from './CityMissionModel.js';
import {save,euro} from './ConversationModelV1.js';
let station=null;
const game=()=>globalThis.__berlinMetroGame;
function close(){document.querySelector('#cityMissionsV1')?.remove();}
function open(){
  const g=game(),s=g?.metroEconomy;if(!s)return;
  close();const root=document.createElement('div');root.id='cityMissionsV1';root.style.cssText='position:fixed;inset:0;z-index:23500;background:#000b;color:#fff;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Arial';
  const card=document.createElement('div');card.style.cssText='width:min(470px,96vw);max-height:86vh;overflow:auto;border-radius:18px;padding:18px;background:#151e2a;border:1px solid #ffffff33';
  const title=document.createElement('h2');title.textContent='📋 Berlijn ontdekken';card.appendChild(title);
  function button(parent,text,action){const b=document.createElement('button');b.textContent=text;b.style.cssText='width:100%;border:0;border-radius:10px;padding:12px;background:#e5bf31;color:#111;font-weight:800;margin-top:10px';b.onclick=action;parent.appendChild(b);}
  const active=s.cityMissions?.active;
  for(const mission of CITY_MISSIONS){
    const section=document.createElement('section');section.style.cssText='padding:12px;margin-bottom:12px;background:#ffffff08;border-radius:12px';
    const heading=document.createElement('b');heading.textContent=`${mission.title} · ${euro(mission.reward)}`;section.appendChild(heading);
    const text=document.createElement('p');text.style.cssText='font-size:13px;line-height:1.5;white-space:pre-line';
    const done=s.cityMissions?.completed?.includes(mission.id);
    text.textContent=done?'✓ Afgerond':active?.id===mission.id?mission.stops.map(stop=>`${active.visited.includes(stop)?'✓':'○'} ${stop}`).join('\n')+(mission.busTrips?`\n${active.busIds.length?'✓':'○'} Rit met bus 200`:''):mission.description;
    section.appendChild(text);
    if(!done && !active)button(section,'Opdracht aannemen',()=>{acceptCityMission(s,mission.id,g.player.__streetMode?station:null);save(s,g);open();});
    if(active?.id===mission.id && cityMissionReady(s))button(section,'Beloning ophalen',()=>{const result=claimCityMission(s);if(result.ok){save(s,g);g.ui?.notify?.(`Opdracht afgerond · +${euro(result.reward)}`);}open();});
    card.appendChild(section);
  }
  button(card,'Sluiten',close);root.onclick=event=>{if(event.target===root)close()};root.appendChild(card);document.body.appendChild(root);
}
document.addEventListener('metro-missions-open',open);
document.addEventListener('metro-street-cell',event=>{
  station=event.detail?.ctx?.name||null;
  const g=game();if(g?.metroEconomy && recordMissionVisit(g.metroEconomy,station)){save(g.metroEconomy,g);if(document.querySelector('#cityMissionsV1'))open();}
  const parent=document.querySelector('#reliableStreetUi');if(!parent || document.querySelector('#cityMissionButtonV1'))return;
  const button=document.createElement('button');button.id='cityMissionButtonV1';button.textContent='📋 OPDRACHTEN';button.style.cssText='width:100%;margin-top:7px;padding:10px;border:1px solid #ffffff22;border-radius:10px;background:#1c293bea;color:#fff;font-weight:800';button.onclick=open;parent.appendChild(button);
});
document.addEventListener('metro-surface-arrived',event=>{const g=game();if(g?.metroEconomy && recordMissionBus(g.metroEconomy,event.detail)){save(g.metroEconomy,g);if(document.querySelector('#cityMissionsV1'))open();}});
