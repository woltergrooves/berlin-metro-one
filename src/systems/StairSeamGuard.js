const smooth=t=>t*t*(3-2*t);

export function moveAcrossStairFoot(player,delta,config) {
  if(player.__streetMode || player.activeTrain || player.__u8Active || player.currentStation?.id!=='alexanderplatz')return false;
  // Other U8 stations share Alexanderplatz's coordinate origin.
  if(Number.isInteger(player.__u8FullStation) && player.__u8FullStation!==14)return false;
  const p=player.position,z0=player.currentStation.z,rz=p.z-z0;
  if(p.x<.45 || p.x>4.65 || rz<22 || rz>32.5)return false;
  const forward=player.input.moveY,strafe=player.input.moveX;
  const magnitude=Math.hypot(forward,strafe);
  if(magnitude<.02)return false;
  const scale=config.player.speed*delta/Math.max(1,magnitude);
  const sin=Math.sin(player.yaw),cos=Math.cos(player.yaw);
  let nx=p.x+(strafe*cos-forward*sin)*scale;
  const nr=rz+(-strafe*sin-forward*cos)*scale;
  // Keep the stair side rails, then release into the open platform at its foot.
  if(nr>=26)nx=Math.max(.72,Math.min(4.38,nx));
  p.x=nx;
  p.z=z0+nr;
  const t=Math.max(0,Math.min(1,(nr-26)/18));
  p.y=config.player.eyeHeight+4.2*t;
  if(nr<26){
    player.__u8Area=false;
    player.__u8FullStation=null;
    player.__u8ActiveTrainId=null;
    player.__u8LastTrainX=null;
  }
  return true;
}

export function installStairSeamGuard(PlayerController,config) {
  const prototype=PlayerController.prototype;
  if(prototype.__continuousStairFoot)return;
  const update=prototype.update;
  prototype.update=function(delta){
    const rz=this.position.z-(this.currentStation?.z??0);
    if(this.__streetMode || this.activeTrain || this.__u8Active || this.currentStation?.id!=='alexanderplatz' || rz<22 || rz>32.5 || this.position.x<.45 || this.position.x>4.65)return update.call(this,delta);
    // Resolve the latest movement handler each frame: deferred legacy modules
    // may replace it. Restore it afterward; do not wrap the renderer/game loop.
    const hadOwn=Object.hasOwn(this,'updateMovement'),movement=this.updateMovement;
    this.updateMovement=function(dt){
      if(!moveAcrossStairFoot(this,dt,config))return movement.call(this,dt);
    };
    try{return update.call(this,delta)}
    finally{if(hadOwn)this.updateMovement=movement;else delete this.updateMovement;}
  };
  prototype.__continuousStairFoot=true;
}
