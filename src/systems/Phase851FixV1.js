import { Tick } from '../state/Tick.js';
import { CONFIG } from '../config.js';
import { computeMoveDelta } from '../core/motion.js';

const smooth=t=>t*t*(3-2*t);
const floorAt=rz=>{
  if(rz<=26) return 0;
  if(rz>=43.7) return 4.2;
  return 4.2*smooth((rz-26)/(43.7-26));
};

function installAlexanderHardBypass(game){
  const p=game.player;
  if(p.__alexHardBypassV4)return;
  p.__alexHardBypassV4=true;
  const previous=p.updateMovement.bind(p);
  p.updateMovement=function(delta){
    const st=this.currentStation;
    if(!this.__streetMode&&!this.activeTrain&&st?.id==='alexanderplatz'){
      const z0=st.z;
      const rz=this.position.z-z0;
      const x=this.position.x;
      const forward=this.input.moveY, strafe=this.input.moveX;
      if(Math.hypot(forward,strafe)>=.012){
        const m=computeMoveDelta({yaw:this.yaw,strafe,forward,speed:CONFIG.player.speed,delta});
        const rawNextRz=rz+m.z;
        const rawNextX=x+m.x;
        const currentInLane=x>=.15&&x<=4.95&&rz>=22.6&&rz<=44.9;
        const nextInLane=rawNextX>=.15&&rawNextX<=4.95&&rawNextRz>=22.6&&rawNextRz<=44.9;
        const descendingFromHall=rz>=43.0&&rz<=45.3&&rawNextRz<rz&&rawNextX>=.15&&rawNextX<=4.95;
        const crossingOldSeam=rz>=25.4&&rz<=26.8&&rawNextRz<26.05&&rawNextX>=.15&&rawNextX<=4.95;
        const usingStair=(currentInLane||nextInLane||descendingFromHall||crossingOldSeam) && (rz<43.95||rawNextRz<rz||Math.abs(m.z)>=Math.abs(m.x)*.45);
        if(usingStair){
          const nr=Math.max(22.55,Math.min(44.35,rawNextRz));
          const nx=Math.max(.55,Math.min(4.55,rawNextX));
          this.position.x=nx;
          this.position.z=z0+nr;
          this.position.y=CONFIG.player.eyeHeight+floorAt(nr);
          if(nr<26.15){
            this.__u8Area=false;
            this.__u8FullStation=null;
            this.__u8Active=false;
            this.__u8ActiveTrainId=null;
            this.__u8LastTrainX=null;
            globalThis.__berlinMetroU8Passenger=false;
          }
          return;
        }
      }
    }
    return previous(delta);
  };
  game.stairReturnFixVersion='AlexanderHardBypassV4';
  console.info('[Metro] Alexander hard stair bypass V4 active');
}

function installPankowFrequency(game){
  if(game.__pankowFrequencyV1)return;
  const train=(game.trains||[]).find(t=>t?.id==='u2-pankow'||t?.direction<0&&t?.line==='U2');
  if(!train)return;
  game.__pankowFrequencyV1=true;
  const originalRecenter=train.recenterNear?.bind(train);
  if(originalRecenter){
    train.recenterNear=function(stationIndex,delaySeconds){
      return originalRecenter(stationIndex,Math.min(Number.isFinite(delaySeconds)?delaySeconds:1.1,1.1));
    };
  }
  if(train.timeline?.state==='waiting-to-approach'){
    train.timeline.waitSeconds=Math.min(train.timeline.waitSeconds||0,1.2);
  }
  let last=0;
  const serviceTick=()=>{
    const now=performance.now();
    if(now-last<650)return;
    last=now;
    const p=game.player;
    if(!p||p.__streetMode||p.activeTrain===train||p.__u8Active||Number.isInteger(p.__u8FullStation))return;
    const idx=p.nearestStationIndex?.();
    if(!Number.isInteger(idx)||idx<=0)return;
    const eta=train.etaToStation?.(idx);
    if(Number.isFinite(eta)&&eta>12.5){
      train.recenterNear(idx,1.0);
      game.ui?.notify?.('U2 richting Pankow volgt snel');
    }
  };
  const loop2=game.loop;
  game.loop=function(){
    const r=loop2();
    serviceTick();
    return r;
  };
  game.renderer.setAnimationLoop(game.loop);
  game.pankowServiceVersion='FastLocalV1';
  console.info('[Metro] Pankow local service frequency boosted');
}

async function boot(){
  for(let i=0;i<600;i++){
    const game=globalThis.__berlinMetroGame;
    if(game?.player&&game?.renderer&&game?.trains&&game.stationArchitectureVersion==='V8.5'){
      installAlexanderHardBypass(game);
      installPankowFrequency(game);
      game.ui?.notify?.('Alexander trap V4 + vaker U2 richting Pankow');
      return;
    }
    await Tick.sleep(100,'boot.Phase851FixV1');
  }
  console.warn('[Metro] Phase 8.5.1 fix timed out');
}
boot().catch(e=>console.error('[Metro] Phase 8.5.1 fix failed',e));
