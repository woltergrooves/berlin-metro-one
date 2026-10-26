const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const nearDoor=(train,x)=>train.userData.u8.doors.some(door=>Math.abs(x-train.position.x-door.dx)<1.25);
function movement(player,delta,config){
  const forward=player.input.moveY,strafe=player.input.moveX;
  const scale=config.player.speed*delta/Math.max(1,Math.hypot(forward,strafe));
  return {x:(strafe*Math.cos(player.yaw)-forward*Math.sin(player.yaw))*scale,z:(-strafe*Math.sin(player.yaw)-forward*Math.cos(player.yaw))*scale};
}
export function moveU8Player(player,delta,trains,{config,z0,stopX,alexIndex=14,minZ=42.35,maxZ=55.65}){
  if(player.__streetMode || player.activeTrain)return false;
  const m=movement(player,delta,config),eye=config.player.eyeHeight-4;
  if(player.__u8Active){
    const train=trains.find(t=>t.userData.u8.fullId===player.__u8ActiveTrainId);
    if(!train)return false;
    const d=train.userData.u8,side=d.platformSide;
    const lx=clamp((player.__u8LocalX??player.position.x-train.position.x)+m.x,-10.7,10.7);
    const gate=d.service.canUseDoors && nearDoor(train,train.position.x+lx);
    const lz=clamp((player.__u8LocalZ??player.position.z-train.position.z)+m.z,gate&&side<0?-3.3:-1.28,gate&&side>0?3.3:1.28);
    player.position.x=train.position.x+lx;player.position.z=train.position.z+lz;player.position.y=eye;
    if(gate && lz*side>2.6){
      player.__u8Active=false;player.__u8ActiveTrainId=null;player.__u8FullStation=d.currentIndex;player.__u8Area=true;
      player.__u8LocalX=null;player.__u8LocalZ=null;
    }else{player.__u8LocalX=lx;player.__u8LocalZ=lz;}
    return true;
  }
  const rz=player.position.z-z0;
  let index=Number.isInteger(player.__u8FullStation)?player.__u8FullStation:null;
  if(index===null && player.currentStation?.id==='alexanderplatz' && player.position.x>=41 && player.position.x<=85 && rz>=40.2 && rz<=57.8)index=alexIndex;
  if(index===null)return false;
  // Let the original concourse code handle the overlapping stair entrance.
  if(index===alexIndex && player.position.x<=43 && player.position.x+m.x<=43 && rz>=44.3 && rz<=53.7){player.__u8FullStation=null;return false;}
  const center=stopX(index),nx=clamp(player.position.x+m.x,center-24,center+24);
  let lower=minZ,upper=maxZ;
  const gates=trains.filter(t=>t.userData.u8.currentIndex===index && t.userData.u8.service.canUseDoors && nearDoor(t,nx));
  for(const train of gates){const d=train.userData.u8;if(d.platformSide>0)lower=train.position.z-z0-1.28;else upper=train.position.z-z0+1.28;}
  player.position.x=nx;player.position.z=z0+clamp(rz+m.z,lower,upper);player.position.y=eye;
  player.__u8FullStation=index;player.__u8Area=true;
  for(const train of gates){
    const lx=nx-train.position.x,lz=player.position.z-train.position.z;
    if(Math.abs(lx)<=10.7 && Math.abs(lz)<1.65){
      player.__u8Active=true;player.__u8ActiveTrainId=train.userData.u8.fullId;player.__u8FullStation=null;
      player.__u8LocalX=lx;player.__u8LocalZ=lz;break;
    }
  }
  return true;
}
