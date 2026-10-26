import { CONFIG } from '../config.js';
import { computeMoveDelta } from '../core/motion.js';

const smooth=t=>t*t*(3-2*t);
const floorAt=rz=>rz<=26?0:4.2*smooth(Math.max(0,Math.min(1,(rz-26)/17.7)));

function install(game){
  const p=game.player;
  if(p.__alexStairSeamFixV2)return;
  p.__alexStairSeamFixV2=true;
  const base=p.updateMovement.bind(p);
  p.updateMovement=function(delta){
    if(!this.__streetMode&&!this.activeTrain&&!this.__u8Active&&this.currentStation?.id==='alexanderplatz'){
      const st=this.currentStation;
      const rz=this.position.z-st.z;
      const x=this.position.x;
      const f=this.input.moveY,s=this.input.moveX;
      if(Math.hypot(f,s)>=.02){
        const m=computeMoveDelta({yaw:this.yaw,strafe:s,forward:f,speed:CONFIG.player.speed,delta});
        const nr=rz+m.z;
        const nx=x+m.x;
        const inLowerCorridor=x>=0.45&&x<=4.65&&rz>=25.45&&rz<=32.4;
        const enteringFromPlatform=rz<26&&rz>=24.5&&nr>=25.85&&nx>=0.45&&nx<=4.65;
        if(inLowerCorridor||enteringFromPlatform){
          if(rz<26&&nr<26&&!enteringFromPlatform)return base(delta);
          this.position.x=Math.max(0.72,Math.min(4.38,nx));
          this.position.z=st.z+Math.max(24.4,Math.min(33,nr));
          const outRz=this.position.z-st.z;
          this.position.y=CONFIG.player.eyeHeight+floorAt(outRz);
          if(outRz<26){
            this.__u8Area=false;
            this.__u8FullStation=null;
          }
          return;
        }
      }
    }
    return base(delta);
  };
  game.stairReturnFixVersion='AlexanderStairSeamFixV2';
  game.ui?.notify?.('Alexanderplatz trap-overgang V2 actief');
  console.info('[Metro] Alexander stair seam V2 installed after U8 + Street View');
}

async function boot(){
  for(let i=0;i<600;i++){
    const game=globalThis.__berlinMetroGame;
    if(game?.player&&game?.stations&&Array.isArray(game.u8Trains)&&game.streetModeVersion==='AllStationStreetViewV4'){
      await new Promise(r=>setTimeout(r,80));
      install(game);
      return;
    }
    await new Promise(r=>setTimeout(r,100));
  }
  console.warn('[Metro] Alexander stair seam V2 timed out');
}
boot().catch(e=>console.error('[Metro] Alexander stair seam V2 failed',e));
