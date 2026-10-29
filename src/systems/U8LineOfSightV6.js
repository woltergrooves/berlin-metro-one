import { Tick } from '../state/Tick.js';
const ALEX=14;
const U8_MIN_Z=40.2,U8_MAX_Z=57.8;
function activeTrain(game){const p=game.player;if(!p?.__u8Active)return null;return game.u8Trains?.find(t=>t.userData?.u8?.fullId===p.__u8ActiveTrainId)||null}
function platformIndex(game){const p=game.player;if(Number.isInteger(p?.__u8FullStation))return p.__u8FullStation;if(p?.currentStation?.id==='alexanderplatz'){const rel=p.position.z-p.currentStation.z;if(p.position.x>=37&&p.position.x<=85&&rel>=U8_MIN_Z&&rel<=U8_MAX_Z)return ALEX}return null}
function setGroup(g,on){if(g)g.visible=!!on}
// Op een U8-perron zie je alleen je eigen station en de donkere tunnel (plafond + bodem) ernaast —
// geen buurstations in de verte (wens speler 29 okt). Rijdend: het volgende station verschijnt pas
// vlak voor aankomst. Het Blender-model van Alexanderplatz hangt niet in line.groups → apart meegeschakeld.
function apply(game,line,root){
  const t=activeTrain(game),p=game.player;
  let focus=null,next=null,progress=0,travelling=false;
  if(t){const d=t.userData.u8;focus=d.currentIndex;next=d.nextIndex;progress=d.progress||0;travelling=d.fullPhase==='travel'}else focus=platformIndex(game);
  const w=root?.userData?.blenderU8AlexParent;
  if(focus==null){if(w)w.visible=true;return}
  const groups=line.groups||[],segs=line.segments||[],on=new Set();
  for(const g of groups)if(g)setGroup(g,false);
  for(const s of segs)if(s)setGroup(s,false);
  if(!travelling){on.add(focus);setGroup(segs[focus-1],true);setGroup(segs[focus],true)}
  else{setGroup(segs[Math.min(focus,next)],true);if(progress<.16)on.add(focus);if(progress>.78)on.add(next)}
  for(const i of on)setGroup(groups[i],true);
  if(w)w.visible=on.has(ALEX);
  for(const tr of game.u8Trains||[]){if(tr===t){tr.visible=true;continue}const dx=Math.abs(tr.position.x-(t?.position.x??p.position.x));tr.visible=dx<145}
}
async function install(){for(let i=0;i<600;i++){
  const game=globalThis.__berlinMetroGame;
  const chunk=game?[...game.world.chunks.values()].find(c=>c.station?.id==='alexanderplatz'):null;
  const line=chunk?.structure?.userData?.u8FullLine;
  if(game&&line&&Array.isArray(game.u8Trains)){
    if(game.__u8SightlineV6)return;game.__u8SightlineV6=true;
    Tick.frame('U8LineOfSightV6',{after(){apply(game,line,chunk.structure);}});
    apply(game,line,chunk.structure);console.info('[Metro] U8 sightline V6 ready');return;
  }
  await Tick.sleep(100,'boot.U8LineOfSightV6');
}}
install().catch(e=>console.error('[Metro] U8 sightline V6 failed',e));
