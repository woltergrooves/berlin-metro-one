import {busOptions,busRoute,planBusRide,departBus,completeBus} from './SurfaceModel.js';
import {save} from './ConversationModelV1.js';
import {busTransition} from './BusTransition.js';
let context=null,timer=null,finishing=false;
let stopTransition=null;
const game=()=>globalThis.__berlinMetroGame;
function close(){clearTimeout(timer);timer=null;stopTransition?.();stopTransition=null;document.querySelector('#surfaceTravelV1')?.remove();}
function modal(title){
  close();const root=document.createElement('div');root.id='surfaceTravelV1';root.style.cssText='position:fixed;inset:0;z-index:23000;background:#080e17df;color:#fff;display:flex;align-items:center;justify-content:center;padding:18px;font-family:Arial';
  const card=document.createElement('div');card.style.cssText='width:min(470px,94vw);max-height:86vh;overflow:auto;padding:18px;border:2px solid #e9bd22;border-radius:18px;background:#121b27';
  const heading=document.createElement('h2');heading.textContent=title;heading.style.marginTop='0';card.appendChild(heading);root.appendChild(card);document.body.appendChild(root);return card;
}
function button(card,text,action){const b=document.createElement('button');b.textContent=text;b.style.cssText='display:block;width:100%;margin:8px 0;border:0;border-radius:10px;padding:13px;background:#e9bd22;color:#111;font:800 13px Arial;touch-action:manipulation';b.onclick=action;card.appendChild(b);return b;}
function picker(){
  const g=game();if(!g?.player.__streetMode || !context)return;
  const card=modal('🚌 Bus 200'),text=document.createElement('p');
  text.textContent=`Halte ${context.name} · kies waar je uitstapt. Een geldig ticket is nodig.`;card.appendChild(text);
  const status=document.createElement('p');status.style.cssText='color:#ffb28e;line-height:1.4';status.setAttribute('role','status');card.appendChild(status);
  for(const stop of busOptions(context.name)){
    const route=busRoute(context.name,stop.name);
    button(card,`${stop.name} · richting ${route.direction}`,()=>{
      const result=planBusRide(g.metroEconomy,context.name,stop.name);
      if(!result.ok){status.textContent=result.reason;return;}
      save(g.metroEconomy,g);resume();
    });
  }
  button(card,'Ticket kopen',()=>{close();const source=[...g.world.chunks.values()].find(c=>c.gameplay?.ticketMachine)?.gameplay.ticketMachine;source?.userData.interaction?.action?.();const tickets=document.querySelector('#econModal');if(tickets)tickets.style.zIndex='24000';});
  button(card,'Terug naar de halte',close);
}
async function resume(){
  const g=game(),s=g?.metroEconomy,ride=s?.surfaceTravel;
  if(!ride || !['waiting','riding'].includes(ride.status) || finishing)return;
  clearTimeout(timer);
  const now=Date.now();
  if(ride.status==='waiting' && now>=ride.departAt){
    if(!departBus(s)){save(s,g);close();g.ui?.notify?.('Je ticket is niet meer geldig. Koop eerst een nieuw ticket.');return;}
    save(s,g);
  }
  if(ride.status==='riding' && now>=ride.arriveAt){
    const station=g.stations.find(st=>st.name===ride.to);
    if(!station){ride.status='cancelled';save(s,g);close();return;}
    finishing=true;
    try{
      await g.__allStreetOverlay.open({line:'U2',name:station.name,returnKind:station.id==='alexanderplatz'?'alex':'u2',stationId:station.id});
      completeBus(s);save(s,g);close();
      g.__allStreetOverlay.root?.animate?.([{opacity:0},{opacity:1}],{duration:400,fill:'forwards'});
      document.dispatchEvent(new CustomEvent('metro-surface-arrived',{detail:{id:ride.id,from:ride.from,to:ride.to,line:'200'}}));
      g.ui?.notify?.(`🚌 Bus 200 · aangekomen bij ${station.name}`);
    }catch(error){console.error('[Metro] Bus arrival failed',error);g.ui?.notify?.('Aankomst kon niet laden. Probeer de rit opnieuw te openen.');}
    finally{finishing=false;}
    return;
  }
  const waiting=ride.status==='waiting',end=waiting?ride.departAt:ride.arriveAt;
  const card=modal(waiting?'🚌 Bus 200 nadert':`🚌 Bus 200 → ${ride.to}`);
  const text=document.createElement('p');text.textContent=waiting?`${ride.from} · richting ${ride.direction}`:`Je rijdt van ${ride.from} naar ${ride.to}. Bij aankomst stap je buiten uit.`;text.style.lineHeight='1.5';card.appendChild(text);
  stopTransition=busTransition(document,card,ride,{waiting,duration:Math.max(1,end-now)});
  button(card,waiting?'Annuleren':'Uitstappen bij de vertrekhalte',()=>{ride.status='cancelled';save(s,g);close();});
  timer=setTimeout(resume,Math.max(1,end-now));
}
document.addEventListener('metro-street-cell',event=>{
  context=event.detail?.ctx||null;
  const root=document.querySelector('#reliableStreetUi');if(!root)return;
  let b=document.querySelector('#surfaceBusButtonV1');
  if(!b){b=document.createElement('button');b.id='surfaceBusButtonV1';b.textContent='🚌 BUS 200';b.style.cssText='width:100%;margin-top:8px;border:1px solid #e9bd2266;border-radius:10px;padding:11px;background:#151e2af2;color:#f2cd45;font-weight:900;pointer-events:auto;touch-action:manipulation';b.onclick=picker;root.appendChild(b);}
  b.style.display=context && busOptions(context.name).length?'block':'none';
  if(['waiting','riding'].includes(game()?.metroEconomy?.surfaceTravel?.status))resume();
});
