import * as THREE from 'three';
import {CONFIG} from '../config.js';
import {TrainTimeline} from './TrainTimeline.js';
import {U8_STOPS,U8_ALEX_INDEX,stopX,addFullRouteMap} from './U8FullLineVisual.js';
import {U8Service} from './U8Service.js';
import {moveU8Player} from './U8Movement.js';

function cloneTrain(source){
  const clone=source.clone(true),before=[],after=[];
  source.traverse(n=>before.push(n));clone.traverse(n=>after.push(n));
  const copies=new Map(before.map((n,i)=>[n,after[i]]));
  clone.userData={u8:{doors:source.userData.u8.doors.map(({a,b,dx})=>({a:copies.get(a),b:copies.get(b),dx}))}};
  clone.name='U8TrainB';source.parent.add(clone);return clone;
}
function configure(train,id,direction,line){
  const d=train.userData.u8;
  Object.assign(d,{fullId:id,__fullLine:true,platformSide:direction<0?1:-1});
  const service=new U8Service({Timeline:TrainTimeline,config:CONFIG,stops:U8_STOPS,id,direction,startIndex:U8_ALEX_INDEX,delay:direction<0?.8:1.6});
  d.service=service;service.mirror(d);
  train.position.set(service.projectedX(stopX,U8_ALEX_INDEX),-4,line.zc+(direction<0?-9.1:9.1));
  for(const {a,b} of d.doors){a.position.z=b.position.z=d.platformSide*1.73;}
  const geometry=new THREE.BoxGeometry(1.35,.035,.34),material=new THREE.MeshLambertMaterial({color:0xb9aa76});
  for(const {dx} of d.doors){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(dx,.405,d.platformSide*1.30);train.add(mesh);}
  addFullRouteMap(train);
  train.visible=true;
}
function syncTrain(train){
  const d=train.userData.u8,service=d.service;
  service.mirror(d);train.position.x=service.projectedX(stopX,U8_ALEX_INDEX);
  const slide=.58*(d.door*d.door*(3-2*d.door));
  for(const {a,b,dx} of d.doors){a.position.x=dx-.58-slide;b.position.x=dx+.58+slide;}
  const key=`${d.currentIndex}:${d.direction}`;
  if(train.userData.__parityRouteKey!==key){
    train.userData.__parityRouteKey=key;
    const map=train.userData.u8FullRouteMap;if(map){map.draw(d.currentIndex,d.direction);map.texture.needsUpdate=true;}
  }
}
function stationIndex(player){
  if(Number.isInteger(player.__u8FullStation))return player.__u8FullStation;
  if(player.__u8Area || (player.currentStation?.id==='alexanderplatz' && player.position.x>=23 && player.position.z-player.currentStation.z>=40))return U8_ALEX_INDEX;
  return null;
}
function installMovement(game,trains,line){
  const player=game.player,base=player.updateMovement;
  const z0=line.zc-49;
  player.updateMovement=function(delta){
    const handled=moveU8Player(this,delta,trains,{config:CONFIG,z0,stopX});
    globalThis.__berlinMetroU8Passenger=!!this.__u8Active;
    if(!handled)return base.call(this,delta);
  };
}
const etaText=seconds=>!Number.isFinite(seconds)?'—':seconds<1?'nu':`${Math.floor(Math.ceil(seconds)/60)}:${String(Math.ceil(seconds)%60).padStart(2,'0')}`;
function installHud(game,hud,trains){
  const base=hud.updatePlayer.bind(hud);
  hud.updatePlayer=function(player,...args){
    base(player,...args);
    const active=player.__u8Active?trains.find(t=>t.userData.u8.fullId===player.__u8ActiveTrainId):null;
    const index=active?active.userData.u8.currentIndex:stationIndex(player);
    const badge=this.hud?.querySelector('.station-chip .u-badge');
    if(!active && index===null){if(badge){badge.textContent='U2';badge.style.background='#d43131';}return;}
    if(badge){badge.textContent='U8';badge.style.background='#173b69';}
    this.routeProgress.classList.toggle('hidden',!active);
    if(active){
      const t=active.userData.u8.service.timeline,pct=(t.isTerminal?1:t.routeProgress)*100;
      this.routeProgressFill.style.width=this.routeProgressDot.style.left=`${pct}%`;
      this.routeStartLabel.textContent=t.originName;this.routeEndLabel.textContent=t.isTerminal?'Endstation':t.destinationName;
      this.stationName.textContent=t.state==='cruising'?'Unterwegs':t.originName;
      this.trainStatus.textContent=`U8 richting ${t.terminusName}`;
      this.hint.textContent=t.isTerminal?`${t.originName} · eindpunt. Stap uit om de treinloop door te laten gaan.`:t.state==='boarding'?`Deuren open · volgende halte ${t.destinationName}.`:`Volgende halte ${t.destinationName}.`;
    }else{
      this.stationName.textContent=U8_STOPS[index].name;
      this.trainStatus.textContent=trains.filter(t=>index+t.userData.u8.direction>=0 && index+t.userData.u8.direction<U8_STOPS.length).map(t=>`${t.userData.u8.service.timeline.terminusName} ${etaText(t.userData.u8.service.etaToStation(index))}`).join(' · ');
      this.hint.textContent='Kies richting Wittenau of Hermannstraße. Stap in bij een open deur.';
    }
  };
}
function ticketMachine(game,line){
  const group=new THREE.Group(),material=new THREE.MeshLambertMaterial({color:0xe5bd26}),dark=new THREE.MeshLambertMaterial({color:0x17202b});
  const body=new THREE.Mesh(new THREE.BoxGeometry(.85,1.85,.55),material);body.position.y=.925;group.add(body);
  const screen=new THREE.Mesh(new THREE.BoxGeometry(.54,.5,.06),dark);screen.position.set(0,1.3,.31);group.add(screen);
  const slot=new THREE.Mesh(new THREE.BoxGeometry(.4,.12,.07),dark);slot.position.set(0,.6,.32);group.add(slot);
  group.name='U8TicketMachine';game.scene.add(group);group.visible=false;
  group.userData.interaction={kind:'ticket-machine',label:'BVG-ticket kopen',action:()=>{
    const source=[...game.world.chunks.values()].find(c=>c.gameplay?.ticketMachine)?.gameplay.ticketMachine;
    source?.userData.interaction?.action?.();
  }};
  let shown=false;
  return index=>{
    const next=index!==null && !game.player.__u8Active && !game.player.__streetMode;
    if(next!==shown){shown=next;group.visible=next;if(next)game.interaction.add(group);else game.interaction.remove(group);}
    if(next)group.position.set(stopX(index)+18,-4,line.zc+3.7);
  };
}
export function installU8FullRuntime(game,hud,train,line){
  if(game.__u8Parity)return;
  const originalData={...train.userData,u8:{...train.userData.u8}},originalPosition=train.position.clone(),children=new Set(train.children);
  const second=cloneTrain(train),trains=[train,second];
  try{configure(train,'A',-1,line);configure(second,'B',1,line);}
  catch(error){second.removeFromParent();for(const child of [...train.children])if(!children.has(child))train.remove(child);train.userData=originalData;train.position.copy(originalPosition);throw error;}
  installMovement(game,trains,line);installHud(game,hud,trains);
  const updateMachine=ticketMachine(game,line);
  game.u8Trains=trains;
  globalThis.__berlinMetroU8Trains=trains;globalThis.__berlinMetroU8Train=train;
  const base=game.loop;let last=performance.now(),serviceTime=0;
  game.loop=function(){
    const now=performance.now(),delta=Math.min(.05,Math.max(0,(now-last)/1000));last=now;serviceTime+=delta;
    const p=game.player,index=stationIndex(p);
    updateMachine(index);
    for(const t of trains){
      const d=t.userData.u8,rider=!!p.__u8Active && p.__u8ActiveTrainId===d.fullId;
      if(serviceTime>=.5)d.service.maintain(index,now/1000,{rider,waiting:index!==null && !p.__u8Active && !p.activeTrain && !p.__streetMode});
      d.service.update(delta,{rider});syncTrain(t);
    }
    if(serviceTime>=.5)serviceTime=0;
    const selected=trains.find(t=>p.__u8Active && t.userData.u8.fullId===p.__u8ActiveTrainId)||trains.find(t=>t.userData.u8.currentIndex===index && t.userData.u8.service.canUseDoors)||train;
    globalThis.__berlinMetroU8Train=selected;globalThis.__berlinMetroU8Network=selected.userData.u8;
    const anchors=[p.position.x,...trains.map(t=>t.position.x)];
    for(const group of line.groups){if(group)group.visible=anchors.some(x=>Math.abs(group.userData.centerX-x)<190);}
    for(const group of line.segments){if(group)group.visible=anchors.some(x=>Math.abs(group.userData.centerX-x)<150);}
    return base();
  };
  game.renderer.setAnimationLoop(game.loop);
  game.u8ServiceVersion='U2-shared-timeline-v1';
  game.__u8Parity=true;
}
