export const HOFF_PATH=[{x:1.3,z:-10},{x:3.5,z:-10},{x:3.5,z:14},{x:1.3,z:14}];
export function createHoffPatrol(){return {x:1.3,z:-10,yaw:Math.PI/2,target:1,wait:0,walkTime:0,moving:false,paused:false};}
export function stepHoffPatrol(state,delta){
  state.moving=false;if(state.paused)return state;
  const dt=Math.max(0,Math.min(.05,delta));
  if(state.wait>0){state.wait=Math.max(0,state.wait-dt);return state;}
  const target=HOFF_PATH[state.target],dx=target.x-state.x,dz=target.z-state.z,distance=Math.hypot(dx,dz);
  if(distance<.03){state.x=target.x;state.z=target.z;state.target=(state.target+1)%HOFF_PATH.length;state.wait=1.8;return state;}
  const step=Math.min(distance,.72*dt);state.x+=dx/distance*step;state.z+=dz/distance*step;state.yaw=Math.atan2(dx,dz);state.walkTime+=dt;state.moving=true;return state;
}
