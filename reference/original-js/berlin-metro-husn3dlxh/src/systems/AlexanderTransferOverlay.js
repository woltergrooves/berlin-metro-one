import * as THREE from 'three';
import { WorldStreamer } from 'https://berlin-metro-hwabi9n6s-wolter1.vercel.app/src/world/WorldStreamer.js';

const GEO = new Map();
const MAT = new Map();
const geo = (s) => { const k=s.join('x'); if(!GEO.has(k)) GEO.set(k,new THREE.BoxGeometry(...s)); return GEO.get(k); };
const mat = (c,b=false) => { const k=`${b?'b':'l'}:${c}`; if(!MAT.has(k)) MAT.set(k,b?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c})); return MAT.get(k); };
const box = (p,s,pos,m) => { const q=new THREE.Mesh(geo(s),m); q.position.set(...pos); p.add(q); return q; };

const TILE = mat(0x91b8ad);
const TILE2 = mat(0xb7cec6);
const WALL = mat(0xd9d7d0);
const FLOOR2 = mat(0xa6a7a5);
const DARK = mat(0x2c2f31);
const STEEL = mat(0x899294);
const GREEN = mat(0x547f72);
const LIGHT = mat(0xfff7de,true);

function canvasSign(root,{text,pos,rot=0,mode='u8',sub=''}) {
  const c=document.createElement('canvas'); c.width=1280; c.height=240;
  const x=c.getContext('2d');
  x.fillStyle='#f1efe8'; x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#111'; x.fillRect(0,0,c.width,10);
  const badgeColor=mode==='u2'?'#d13a2f':mode==='u5'?'#8a3d24':'#173b69';
  x.fillStyle=badgeColor; x.fillRect(28,34,150,170);
  x.fillStyle='#fff'; x.font='900 70px Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(mode.toUpperCase(),103,119);
  x.fillStyle='#111'; x.textAlign='left'; x.font='800 54px Arial'; x.fillText(text,215,92);
  x.font='600 34px Arial'; x.fillText(sub,215,156);
  x.fillStyle='#e0c51b'; x.fillRect(0,220,c.width,20);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.minFilter=THREE.LinearFilter;
  const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
  const q=new THREE.Mesh(new THREE.PlaneGeometry(8.8,1.65),m); q.position.set(...pos); q.rotation.y=rot; root.add(q);
  root.userData.disposables?.push(()=>{t.dispose();m.dispose();q.geometry.dispose();});
  return q;
}

function lineBoard(root,pos,rot=0){
  const c=document.createElement('canvas'); c.width=1400; c.height=250; const x=c.getContext('2d');
  x.fillStyle='#efede6'; x.fillRect(0,0,c.width,c.height);
  const badges=[['U2','#d13a2f'],['U5','#8a3d24'],['U8','#173b69']];
  let bx=38;
  for(const [txt,col] of badges){x.fillStyle=col;x.fillRect(bx,35,170,175);x.fillStyle='#fff';x.font='900 72px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,bx+85,122);bx+=195;}
  x.fillStyle='#111';x.textAlign='left';x.font='800 54px Arial';x.fillText('Alexanderplatz',650,102);x.font='600 34px Arial';x.fillText('Umsteigen / Transfer',650,160);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;
  const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});
  const q=new THREE.Mesh(new THREE.PlaneGeometry(9.3,1.68),m);q.position.set(...pos);q.rotation.y=rot;root.add(q);
  root.userData.disposables?.push(()=>{t.dispose();m.dispose();q.geometry.dispose();});
}

function hidePrototypePieces(root,station){
  const z0=station.z;
  root.traverse((o)=>{
    if(!o.isMesh || o.userData?.keepTransferPolish) return;
    const p=o.geometry?.parameters;
    if(!p) return;
    const rz=o.position.z-z0;
    if(rz>9.7 && rz<28.4 && (((Math.abs(p.width-3.1)<.05)&&(Math.abs(p.depth-1.03)<.05)) || ((Math.abs(p.width-.09)<.04)&&(Math.abs(p.depth-1.03)<.05)))) o.visible=false;
    if(rz>26 && rz<61 && p.height>2.8 && p.width<.5 && Math.abs(o.position.x-6.65)<.25) o.visible=false;
  });
}

function markedBox(root,size,pos,material){const q=box(root,size,pos,material);q.userData.keepTransferPolish=true;return q;}

export function polishAlexanderTransfer(root,station){
  if(!root || !station || root.userData.__alexTransferPolishV1) return;
  root.userData.__alexTransferPolishV1=true;
  hidePrototypePieces(root,station);
  const z=station.z;
  markedBox(root,[.30,3.35,18.8],[0.48,1.72,z+35.2],TILE);
  markedBox(root,[.30,3.35,18.8],[4.62,1.72,z+35.2],TILE2);
  markedBox(root,[4.45,.24,18.8],[2.55,4.55,z+35.2],DARK);
  for(let rz=27.2;rz<=43.3;rz+=3.8) markedBox(root,[3.25,.055,.18],[2.55,4.27,z+rz],LIGHT);
  markedBox(root,[.10,.10,18.2],[0.84,2.95,z+35.2],STEEL);
  markedBox(root,[.10,.10,18.2],[4.26,2.95,z+35.2],STEEL);
  markedBox(root,[8.05,.08,20.5],[2.55,4.39,z+54.0],FLOOR2);
  markedBox(root,[.22,3.0,20.5],[-1.46,5.92,z+54.0],TILE2);
  markedBox(root,[.22,3.0,6.4],[6.56,5.92,z+47.0],TILE);
  markedBox(root,[.22,3.0,6.4],[6.56,5.92,z+61.0],TILE);
  markedBox(root,[8.25,.24,20.5],[2.55,7.53,z+54.0],WALL);
  for(let rz=46;rz<=62;rz+=4) markedBox(root,[6.8,.055,.25],[2.55,7.37,z+rz],LIGHT);
  for(const rz of [47.5,54,60.5]) for(const x of [0.15,4.95]){markedBox(root,[.38,3.1,.38],[x,5.93,z+rz],GREEN);markedBox(root,[.72,.16,.72],[x,7.36,z+rz],STEEL);}
  const zc=z+49;
  markedBox(root,[18.8,.08,8.1],[15.25,4.39,zc],FLOOR2);
  markedBox(root,[18.8,3.0,.22],[15.25,5.92,zc-4.05],TILE2);
  markedBox(root,[18.8,3.0,.22],[15.25,5.92,zc+4.05],TILE);
  markedBox(root,[18.8,.22,8.3],[15.25,7.53,zc],WALL);
  for(let x=7.4;x<=23.2;x+=4.0) markedBox(root,[.32,3.05,.32],[x,5.92,zc],GREEN);
  for(let x=8.5;x<=22;x+=4.5){markedBox(root,[3.0,.05,.20],[x,7.36,zc-2.9],LIGHT);markedBox(root,[3.0,.05,.20],[x,7.36,zc+2.9],LIGHT);}
  markedBox(root,[17.4,4.2,.22],[32.7,2.1,zc-4.0],TILE);
  markedBox(root,[17.4,4.2,.22],[32.7,2.1,zc+4.0],TILE2);
  markedBox(root,[17.4,.10,.10],[32.7,3.05,zc-3.58],STEEL);
  markedBox(root,[17.4,.10,.10],[32.7,3.05,zc+3.58],STEEL);
  canvasSign(root,{mode:'u8',text:'Richtung U8',sub:'Wittenau · Hermannstraße  →',pos:[2.55,6.65,z+58.5],rot:Math.PI});
  canvasSign(root,{mode:'u2',text:'Zurück zur U2',sub:'Pankow · Ruhleben  ←',pos:[15.4,6.7,zc+3.91],rot:Math.PI});
  lineBoard(root,[15.2,6.85,zc-3.91],0);
  markedBox(root,[.34,3.1,.34],[.50,5.82,z+44.0],GREEN);
  markedBox(root,[.34,3.1,.34],[4.60,5.82,z+44.0],GREEN);
  markedBox(root,[4.45,.28,.34],[2.55,7.30,z+44.0],GREEN);
}

const baseLoad = WorldStreamer.prototype.load;
WorldStreamer.prototype.load = function alexTransferVisualOverlay(index) {
  const existed = this.chunks.has(index);
  const result = baseLoad.call(this,index);
  if (!existed) {
    const chunk = this.chunks.get(index);
    if (chunk?.station?.id === 'alexanderplatz') polishAlexanderTransfer(chunk.structure,chunk.station);
  }
  return result;
};
