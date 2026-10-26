import * as THREE from 'three';
import {Game} from '../core/Game.js';

const done=new WeakSet(), matCache=new Map();
function texture(kind,renderer){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle=kind==='floor'?'#d8d7d1':'#f0eee8';x.fillRect(0,0,128,128);
  if(kind==='wall'){x.strokeStyle='rgba(60,60,55,.16)';x.lineWidth=2;for(let p=0;p<=128;p+=32){x.beginPath();x.moveTo(p,0);x.lineTo(p,128);x.stroke();x.beginPath();x.moveTo(0,p);x.lineTo(128,p);x.stroke();}}
  else {for(let i=0;i<150;i++){const a=.02+Math.random()*.05;x.fillStyle=`rgba(30,30,30,${a})`;x.fillRect(Math.random()*128,Math.random()*128,1,1);}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='wall'?3:5,kind==='wall'?9:5);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
}
function type(mesh){const p=mesh.geometry?.parameters;if(mesh.geometry?.type!=='BoxGeometry'||!p)return null;const w=+p.width||0,h=+p.height||0,d=+p.depth||0;if(w>8&&h<.7&&d>40)return'floor';if(w<.65&&h>3&&d>40)return'wall';if(w>12&&h<.7&&d>40)return'ceiling';return null;}
function addDetails(chunk){
  if(!chunk?.structure||chunk.structure.userData.__polish3)return;chunk.structure.userData.__polish3=true;
  const root=new THREE.Group(),z=chunk.station.z,g=new THREE.BoxGeometry(1,1,1);chunk.structure.add(root);
  const dark=new THREE.MeshLambertMaterial({color:0x252a2e}),seat=new THREE.MeshLambertMaterial({color:0x465b64}),metal=new THREE.MeshLambertMaterial({color:0x858c90});
  const box=(m,p,s)=>{const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...s);root.add(o);return o};
  for(const [x,zz,r] of [[1.05,z-13,0],[4.05,z+14,Math.PI]]){const b=new THREE.Group();b.position.set(x,0,zz);b.rotation.y=r;root.add(b);const q=(m,p,s)=>{const o=new THREE.Mesh(g,m);o.position.set(...p);o.scale.set(...s);b.add(o)};q(seat,[0,.43,0],[1.9,.12,.5]);q(seat,[0,.76,.22],[1.9,.56,.09]);for(const sx of[-.7,.7])for(const sz of[-.16,.16])q(metal,[sx,.2,sz],[.08,.4,.08]);}
  for(const [x,zz] of [[4.75,z-21],[.35,z+22]]){box(dark,[x,.42,zz],[.42,.8,.42]);box(metal,[x,.84,zz],[.46,.06,.46]);}
  chunk.structure.userData.disposables?.push(()=>{root.parent?.remove(root);g.dispose();dark.dispose();seat.dispose();metal.dispose();});
}
function install(game){
  if(game.__visualPolishV3)return;game.__visualPolishV3=true;
  game.renderer.toneMapping=THREE.ACESFilmicToneMapping;game.renderer.toneMappingExposure=1.07;
  const warm=new THREE.DirectionalLight(0xfff1dc,.34);warm.position.set(-6,9,4);game.scene.add(warm);const cool=new THREE.DirectionalLight(0xc4dcff,.13);cool.position.set(8,5,-10);game.scene.add(cool);
  const tex={floor:texture('floor',game.renderer),wall:texture('wall',game.renderer),ceiling:texture('ceiling',game.renderer)};
  const polish=m=>{if(!m?.isMesh||done.has(m))return;done.add(m);const mats=Array.isArray(m.material)?m.material:[m.material];for(const a of mats)if(a?.isMeshBasicMaterial){a.toneMapped=false;a.needsUpdate=true;}const k=type(m);if(!k)return;const next=mats.map(a=>{if(!a||a.map||a.transparent||a.isMeshBasicMaterial)return a;const key=a.uuid+':'+k;if(!matCache.has(key)){const n=a.clone();n.map=tex[k];n.needsUpdate=true;matCache.set(key,n);}return matCache.get(key)});m.material=Array.isArray(m.material)?next:next[0];};
  const scan=()=>game.scene.traverse(polish);scan();for(const c of game.world?.chunks?.values?.()||[])addDetails(c);
  if(game.world&&!game.world.__polishLoad){game.world.__polishLoad=true;const load=game.world.load.bind(game.world);game.world.load=i=>{load(i);const c=game.world.chunks.get(i);if(c){addDetails(c);c.structure.traverse(polish);}};}
  const vignette=document.createElement('div');vignette.style.cssText='position:fixed;inset:0;z-index:9000;pointer-events:none;background:radial-gradient(circle at 50% 45%,transparent 52%,rgba(0,0,0,.14));';document.body.appendChild(vignette);
  let last=0;const loop=game.loop;game.loop=function(){const now=performance.now();if(now-last>1800){last=now;scan();}vignette.style.display=game.player?.__streetMode?'none':'';return loop();};game.renderer.setAnimationLoop(game.loop);game.visualPolishVersion='V3-modern-lite';
}
const start=Game.prototype.start;Game.prototype.start=function(){const r=start.call(this);install(this);return r;};
