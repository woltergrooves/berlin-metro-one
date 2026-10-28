import { Tick } from '../state/Tick.js';
import * as THREE from 'three';

const G={
  torso:new THREE.BoxGeometry(.42,.72,.25),
  head:new THREE.BoxGeometry(.32,.34,.3),
  leg:new THREE.BoxGeometry(.14,.62,.14),
  arm:new THREE.BoxGeometry(.12,.58,.12),
  phone:new THREE.BoxGeometry(.11,.2,.025)
};
const MAT=new Map();
const mat=c=>{if(!MAT.has(c))MAT.set(c,new THREE.MeshLambertMaterial({color:c}));return MAT.get(c)};
const SKIN=[0xd7a77d,0xc8926d,0xe6b58b,0xa97054].map(mat);
const PHONE=mat(0x101215);
const TOP=[0x314d63,0x8b3f39,0x596c45,0x6b536f,0xa06a32,0x3d6665].map(mat);
const PANTS=[0x252b31,0x3c4146,0x34343a].map(mat);
const pick=(a,i)=>a[Math.abs(i)%a.length];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function add(g,geo,m,x,y,z){const q=new THREE.Mesh(geo,m);q.position.set(x,y,z);g.add(q);return q}
function person(seed=0){
  const g=new THREE.Group(),top=pick(TOP,seed),pants=pick(PANTS,seed>>1),skin=pick(SKIN,seed>>2);
  const torso=add(g,G.torso,top,0,1.15,0),head=add(g,G.head,skin,0,1.7,0),ll=add(g,G.leg,pants,-.12,.48,0),rl=add(g,G.leg,pants,.12,.48,0),la=add(g,G.arm,top,-.29,1.16,0),ra=add(g,G.arm,top,.29,1.16,0),phone=add(g,G.phone,PHONE,0,1.16,-.3);
  phone.visible=false;g.scale.setScalar(.94+(seed%7)*.018);g.userData.__u8NpcV2=true;
  return {g,torso,head,ll,rl,la,ra,phone,seed,state:'wait',activity:(seed%3===0?'phone':'idle'),phase:seed*.77};
}
function pose(n,type='idle'){
  n.torso.position.y=1.15;n.head.position.y=1.7;n.head.rotation.x=0;
  n.ll.position.set(-.12,.48,0);n.rl.position.set(.12,.48,0);n.ll.rotation.set(0,0,0);n.rl.rotation.set(0,0,0);n.la.rotation.set(0,0,0);n.ra.rotation.set(0,0,0);n.phone.visible=false;
  if(type==='sit'||type==='sitphone'){n.torso.position.y=1.06;n.head.position.y=1.61;n.ll.position.set(-.14,.72,-.18);n.rl.position.set(.14,.72,-.18);n.ll.rotation.x=n.rl.rotation.x=-1.18;}
  if(type.includes('phone')){n.phone.visible=true;n.head.rotation.x=.18;n.la.rotation.x=n.ra.rotation.x=-.95;n.phone.position.y=type==='sitphone'?1.02:1.16;}
}
function removeLegacy(root){
  root.traverse(g=>{
    if(!g.isGroup||g.userData.__u8NpcV2)return;
    const cyl=g.children.some(c=>c.geometry?.type==='CylinderGeometry');
    const sphere=g.children.some(c=>c.geometry?.type==='SphereGeometry');
    if(cyl&&sphere)g.visible=false;
  });
}
function stationGroup(root,index){return root.children.find(g=>g.userData?.u8StationIndex===index)}
function isOpen(t){const d=t.userData.u8;return d&&d.door>.82&&(d.fullPhase==='open'||d.fullPhase==='dwell')}
function doorX(t,slot=0){const ds=t.userData.u8?.doors||[];return ds[slot%Math.max(1,ds.length)]?.dx||0}
const RIDE_SLOTS=[
  [-8.6,-.78,'sit'],[-6.3,-.78,'sit'],[-4.0,-.78,'sit'],[-1.7,-.78,'sit'],[.7,-.78,'sit'],[3.0,-.78,'sit'],[5.3,-.78,'sit'],[7.6,-.78,'sit'],
  [-7.2,.22,'stand'],[-4.8,.28,'stand'],[-2.4,.2,'stand'],[0,.3,'stand'],[2.4,.2,'stand'],[4.8,.28,'stand'],[7.2,.22,'stand'],
  [-6.0,.82,'stand'],[-3.0,.82,'stand'],[3.0,.82,'stand'],[6.0,.82,'stand']
];
function reserveSlot(t,p){
  const used=t.userData.__u8NpcSlots||(t.userData.__u8NpcSlots=new Map());
  let idx=RIDE_SLOTS.findIndex((_,i)=>!used.has(i));if(idx<0)idx=p.seed%RIDE_SLOTS.length;
  used.set(idx,p);p.slotIndex=idx;return idx;
}
function freeSlot(t,p){const m=t?.userData?.__u8NpcSlots;if(!m)return;if(m.get(p.slotIndex)===p)m.delete(p.slotIndex);p.slotIndex=null}
function spawnWaiting(root,zc){
  const pools=new Map();
  for(let i=0;i<24;i++){
    if(i===14)continue;const g=stationGroup(root,i);if(!g)continue;const arr=[];
    for(let j=0;j<3;j++){
      const n=person(i*7+j),p=n.g;n.stationIndex=i;n.baseX=g.userData.centerX-10+j*9;n.baseZ=zc+(j%2?3.5:-3.5);p.position.set(n.baseX,-3.91,n.baseZ);g.add(p);pose(n,n.activity==='phone'?'phone':'idle');arr.push(n);
    }
    pools.set(i,arr);
  }
  return pools;
}
function moveNpc(n,target,dt,speed=1.45){
  const p=n.g,dx=target.x-p.position.x,dz=target.z-p.position.z,d=Math.hypot(dx,dz);if(d<.04)return true;
  const q=Math.min(d,speed*dt);p.position.x+=dx/d*q;p.position.z+=dz/d*q;p.rotation.y=Math.atan2(dx,dz);
  const a=Math.sin(performance.now()*.009+n.phase)*.55;n.ll.rotation.x=a;n.rl.rotation.x=-a;n.la.rotation.x=-a*.7;n.ra.rotation.x=a*.7;return d<.12;
}
function beginBoard(n,t,door){n.state='board';n.train=t;n.door=door;pose(n);}
function attachRider(n,t){
  t.attach(n.g);const idx=reserveSlot(t,n),[x,z,kind]=RIDE_SLOTS[idx];n.g.position.set(x,.12,z);n.state='ride';n.train=t;n.rideStops=1+(n.seed%3);n.activity=n.seed%2?'phone':'idle';pose(n,kind==='sit'?(n.activity==='phone'?'sitphone':'sit'):(n.activity==='phone'?'phone':'idle'));
}
function beginExit(n,t,group){
  freeSlot(t,n);group.attach(n.g);const side=t.userData.u8.platformSide||1;n.state='exit';n.train=null;n.target=new THREE.Vector3(t.position.x+doorX(t,n.door),-3.91,t.position.z+side*4.0);pose(n);
}

(async()=>{
  for(let tries=0;tries<600;tries++){
    const trains=globalThis.__berlinMetroU8Trains;
    if(Array.isArray(trains)&&trains.length>1&&trains[0]?.parent){
      const root=trains[0].parent,zc=(trains[0].position.z+trains[1].position.z)/2;
      removeLegacy(root);
      const pools=spawnWaiting(root,zc),riders=[],lastStop=new Map();let last=performance.now(),lastClean=0;
      function onDwell(t){
        const d=t.userData.u8;if(!isOpen(t)||!Number.isInteger(d.currentIndex))return;
        const key=`${d.fullId}:${d.currentIndex}:${d.direction}`;if(lastStop.get(d.fullId)===key)return;lastStop.set(d.fullId,key);
        const g=stationGroup(root,d.currentIndex);if(!g)return;
        riders.filter(n=>n.train===t&&n.state==='ride').forEach(n=>n.rideStops--);
        riders.filter(n=>n.train===t&&n.state==='ride'&&n.rideStops<0).slice(0,2).forEach(n=>beginExit(n,t,g));
        const waiting=(pools.get(d.currentIndex)||[]).filter(n=>n.state==='wait').slice(0,2);
        waiting.forEach((n,i)=>beginBoard(n,t,i));
      }
      function loop(now){
        const dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;if(now-lastClean>900){removeLegacy(root);lastClean=now}for(const t of trains)onDwell(t);
        for(const arr of pools.values())for(const n of arr){
          const p=n.g;if(!p.visible)continue;
          if(n.state==='wait'){
            pose(n,n.activity==='phone'?'phone':'idle');p.position.x=n.baseX+Math.sin(now*.00035+n.seed)*.65;p.rotation.y=Math.sin(now*.0002+n.seed)*.2;
          }else if(n.state==='board'){
            const t=n.train;if(!t||!isOpen(t)){n.state='wait';n.train=null;continue}
            const side=t.userData.u8.platformSide||1,target=new THREE.Vector3(t.position.x+doorX(t,n.door),-3.91,t.position.z+side*.95);
            if(moveNpc(n,target,dt,1.8)){attachRider(n,t);if(!riders.includes(n))riders.push(n)}
          }else if(n.state==='exit'){
            if(moveNpc(n,n.target,dt,1.6)){n.state='leave';n.target=n.g.position.clone().add(new THREE.Vector3((n.seed%2?1:-1)*8,0,0));}
          }else if(n.state==='leave'){
            if(moveNpc(n,n.target,dt,1.2)){n.state='gone';p.visible=false;}
          }
        }
        for(const n of riders){if(n.state==='ride'&&n.train){const [x,z,kind]=RIDE_SLOTS[n.slotIndex]||RIDE_SLOTS[0];n.g.position.x=x;n.g.position.z=z;n.g.rotation.y=kind==='sit'?(z<0?Math.PI:0):Math.sin(now*.00045+n.seed)*.08;pose(n,kind==='sit'?(n.activity==='phone'?'sitphone':'sit'):(n.activity==='phone'?'phone':'idle'));}}
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);console.info('[Metro] U8 NPC V2 ready · U2 style + reserved slots');return;
    }
    await Tick.sleep(100,'boot.U8PassengerFlowV2');
  }
})().catch(e=>console.error('[Metro] U8 NPC V2 disabled',e));
