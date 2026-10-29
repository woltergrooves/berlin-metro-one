import { Tick } from '../state/Tick.js';
const ALEX=14;
const U8_MIN_Z=40.2,U8_MAX_Z=57.8;
function activeTrain(game){const p=game.player;if(!p?.__u8Active)return null;return game.u8Trains?.find(t=>t.userData?.u8?.fullId===p.__u8ActiveTrainId)||null}
function platformIndex(game){const p=game.player;if(Number.isInteger(p?.__u8FullStation))return p.__u8FullStation;if(p?.currentStation?.id==='alexanderplatz'){const rel=p.position.z-p.currentStation.z;if(p.position.x>=37&&p.position.x<=85&&rel>=U8_MIN_Z&&rel<=U8_MAX_Z)return ALEX}return null}
function setGroup(g,on){if(g)g.visible=!!on}
// U1-stap (29 okt): op een U8-perron zie je de buurstations (±NEAR) verderop in de tunnel, met de
// tunnelstukken ertussen. Rijdend: beide stations van het huidige traject plus hun buren.
// Het Blender-model van Alexanderplatz hangt niet in line.groups → hier apart meegeschakeld.
const NEAR=1;
function apply(game,line,root){
  const t=activeTrain(game),p=game.player;
  let focus=null,next=null,travelling=false;
  if(t){const d=t.userData.u8;focus=d.currentIndex;next=d.nextIndex;travelling=d.fullPhase==='travel'}else focus=platformIndex(game);
  if(focus==null){const w=root?.userData?.blenderU8AlexParent;if(w)w.visible=true;return}
  const lo=Math.min(focus,travelling&&next!=null?next:focus)-NEAR,hi=Math.max(focus,travelling&&next!=null?next:focus)+NEAR;
  const groups=line.groups||[],segs=line.segments||[];
  for(let i=0;i<groups.length;i++)setGroup(groups[i],i>=lo&&i<=hi);
  // segment i ligt tussen station i en i+1
  for(let i=0;i<segs.length;i++)setGroup(segs[i],i>=lo-1&&i<=hi);
  const w=root?.userData?.blenderU8AlexParent;if(w)w.visible=ALEX>=lo&&ALEX<=hi;
  for(const tr of game.u8Trains||[]){if(tr===t){tr.visible=true;continue}const dx=Math.abs(tr.position.x-(t?.position.x??p.position.x));tr.visible=dx<190}
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
