import * as THREE from 'three';
import { U8_STOPS,U8_ALEX_INDEX,stopX } from './U8FullLineVisual.js';

const BOX=new THREE.BoxGeometry(1,1,1), CYL=new THREE.CylinderGeometry(.22,.22,1,12), PLANE=new THREE.PlaneGeometry(1,1);
const MAT=new Map(), TEX=new Map();
const mat=(c,basic=false)=>{const k=`${c}:${basic}`;if(!MAT.has(k))MAT.set(k,basic?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return MAT.get(k)};
const box=(g,s,p,m,r=[0,0,0])=>{const q=new THREE.Mesh(BOX,m);q.scale.set(...s);q.position.set(...p);q.rotation.set(...r);g.add(q);return q};
const cyl=(g,p,h,m)=>{const q=new THREE.Mesh(CYL,m);q.scale.y=h;q.position.set(...p);g.add(q);return q};
const DARK=mat(0x25292c), METAL=mat(0x62696e), SILVER=mat(0xb9bdbe), BLUE=mat(0x315f91), YELLOW=mat(0xf0c51a), LIGHT=mat(0xfff4cf,true);

function canvasMat(key,draw,w=1200,h=320){if(TEX.has(key))return TEX.get(key);const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});TEX.set(key,m);return m}
function stationMat(name){return canvasMat(`station:${name}`,(x,w,h)=>{x.fillStyle='#f2efe6';x.fillRect(0,0,w,h);x.fillStyle='#173b69';x.fillRect(0,0,120,h);x.fillStyle='#fff';x.font='900 70px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('U8',60,h/2);x.fillStyle='#111';x.textAlign='left';x.font=`900 ${name.length>22?52:name.length>16?61:72}px Arial`;x.fillText(name,160,112,w-205);x.font='700 34px Arial';x.fillStyle='#444';x.fillText('Wittenau  ←   Richtung   →  Hermannstraße',160,218,w-205);x.fillStyle='#f0c51a';x.fillRect(160,260,420,12);});}
function departureMat(name){return canvasMat(`dep:${name}`,(x,w,h)=>{x.fillStyle='#151515';x.fillRect(0,0,w,h);x.fillStyle='#fff';x.font='800 46px Arial';x.textAlign='left';x.fillText(name,45,72);x.font='700 35px Arial';x.fillStyle='#f4d34e';x.fillText('U8  Wittenau               2 min',45,150);x.fillText('U8  Hermannstraße          5 min',45,212);x.fillStyle='#aaa';x.font='600 25px Arial';x.fillText('BVG · Echtzeitinformation',45,278);});}
function adMat(seed){const k=seed%4;return canvasMat(`ad:${k}`,(x,w,h)=>{const bg=['#f2c643','#8db8cf','#df8874','#91b58d'][k];x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle='#111';x.textAlign='center';x.font='900 92px Arial';x.fillText(['BERLIN','KULTUR','NACHT','FAHR MIT'][k],w/2,105);x.font='800 42px Arial';x.fillText(['IST DEINS','HEUTE','IN BERLIN','DER BVG'][k],w/2,175);x.fillStyle='rgba(255,255,255,.75)';x.fillRect(165,205,w-330,h-250);},700,460)}
function plane(g,size,pos,m,rotY=0){const q=new THREE.Mesh(PLANE,m);q.scale.set(...size,1);q.position.set(...pos);q.rotation.y=rotY;g.add(q);return q}
function bench(g,x,y,z){box(g,[2.7,.14,.72],[x,y+.48,z],YELLOW);box(g,[2.7,.78,.12],[x,y+.90,z+.31],DARK);for(const dx of[-1.0,1.0])box(g,[.12,.45,.12],[x+dx,y+.23,z],DARK)}
function bin(g,x,y,z){cyl(g,[x,y+.48,z],.9,DARK);box(g,[.60,.08,.60],[x,y+.94,z],SILVER);box(g,[.26,.04,.14],[x,y+.99,z],DARK)}
function machine(g,x,y,z,rot=0){const q=new THREE.Group();q.position.set(x,y,z);q.rotation.y=rot;g.add(q);box(q,[.78,1.75,.72],[0,.88,0],DARK);box(q,[.80,.60,.74],[0,1.38,0],YELLOW);box(q,[.56,.31,.035],[0,1.38,-.38],mat(0x152c39,true));box(q,[.78,.20,.74],[0,.55,0],SILVER)}
function wallAd(g,x,y,z,rot,seed){plane(g,[1.35,1.9],[x,y+1.75,z],adMat(seed),rot)}
function sign(g,name,x,y,z,rot){plane(g,[4.15,1.08],[x,y,z],stationMat(name),rot)}
function departure(g,name,x,y,z,rot){plane(g,[3.4,.92],[x,y,z],departureMat(name),rot)}

function decorateRealU8(group,stop,zc){if(!group||group.getObjectByName('U8DetailV831'))return;const g=new THREE.Group();g.name='U8DetailV831';group.add(g);const x=stopX(stop.id),y=-4,seed=stop.id;
  bench(g,x-11,y,zc-2.35);bench(g,x+8,y,zc+2.35);bin(g,x-4,y,zc+3.25);bin(g,x+14,y,zc-3.25);
  machine(g,x+18,y,zc+3.7,-Math.PI/2);machine(g,x-18,y,zc-3.7,Math.PI/2);
  wallAd(g,x+21,y,zc-11.70,0,seed);wallAd(g,x-20,y,zc+11.70,Math.PI,seed+1);
  sign(g,stop.name,x-10,-1.10,zc-11.73,0);sign(g,stop.name,x+10,-1.10,zc+11.73,Math.PI);
  departure(g,stop.name,x,-.62,zc-5.1,0);departure(g,stop.name,x,-.62,zc+5.1,Math.PI);
  for(let xx=x-21;xx<=x+21;xx+=7){cyl(g,[xx,-2.45,zc-3.75],2.65,METAL);cyl(g,[xx,-2.45,zc+3.75],2.65,METAL);box(g,[.34,.14,8.1],[xx,-.78,zc],DARK)}
  for(const zz of[zc-2.2,zc+2.2])box(g,[44,.07,.10],[x,-.50,zz],LIGHT);
}

function alexU8(game){if(game.scene.getObjectByName('AlexanderDetail:U8'))return;const st=game.stations.find(s=>s.id==='alexanderplatz');if(!st)return;const x=stopX(U8_ALEX_INDEX),zc=st.z+49,y=-4,g=new THREE.Group();g.name='AlexanderDetail:U8';game.scene.add(g);
  for(let xx=x-21;xx<=x+21;xx+=6){cyl(g,[xx,-2.35,zc-3.8],2.75,BLUE);cyl(g,[xx,-2.35,zc+3.8],2.75,BLUE);box(g,[.38,.15,8.2],[xx,-.70,zc],DARK)}
  box(g,[46,.20,.28],[x,-.36,zc-11.70],BLUE);box(g,[46,.20,.28],[x,-.36,zc+11.70],BLUE);
  bench(g,x-11,y,zc-2.3);bench(g,x+8,y,zc+2.3);bin(g,x-3,y,zc+3.2);bin(g,x+14,y,zc-3.2);machine(g,x+18,y,zc+3.6,-Math.PI/2);
  sign(g,'Alexanderplatz',x-10,-1.08,zc-11.72,0);sign(g,'Alexanderplatz',x+10,-1.08,zc+11.72,Math.PI);departure(g,'Alexanderplatz',x,-.60,zc-5.0,0);
  const transfer=canvasMat('alex-transfer-u8',(c,w,h)=>{c.fillStyle='#151515';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='900 54px Arial';c.textAlign='center';c.fillText('↕  U2 · S-Bahn · Ausgang',w/2,105);c.font='700 34px Arial';c.fillStyle='#ddd';c.fillText('Umsteigen Alexanderplatz',w/2,190);});
  plane(g,[4.7,1.25],[x,-.45,zc],transfer,0);game.__alexanderDetailU8=g;
}
function alexU2(game){if(game.scene.getObjectByName('AlexanderDetail:U2'))return;const st=game.stations.find(s=>s.id==='alexanderplatz');if(!st)return;const z=st.z,g=new THREE.Group();g.name='AlexanderDetail:U2';game.scene.add(g);
  const accent=mat(0xb9a56b);for(let dz=-24;dz<=24;dz+=6){cyl(g,[.15,1.58,z+dz],2.85,accent);cyl(g,[5.35,1.58,z+dz],2.85,accent);box(g,[5.7,.15,.34],[2.75,3.20,z+dz],DARK)}
  for(const x of[.8,4.7])box(g,[.10,.08,48],[x,3.48,z],LIGHT);
  bench(g,.8,0,z-10);bench(g,4.5,0,z+10);bin(g,4.45,0,z-5);machine(g,.85,0,z+18,0);
  const m=canvasMat('alex-u2-sign',(c,w,h)=>{c.fillStyle='#f2efe6';c.fillRect(0,0,w,h);c.fillStyle='#f0c51a';c.fillRect(0,0,120,h);c.fillStyle='#111';c.font='900 70px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('U2',60,h/2);c.textAlign='left';c.font='900 70px Arial';c.fillText('Alexanderplatz',160,112);c.font='700 34px Arial';c.fillText('Pankow  ←   Umstieg U8/S-Bahn   →  Ruhleben',160,220,w-200);});
  for(const dz of[-18,0,18])plane(g,[4.2,1.1],[-5.75,2.3,z+dz],m,Math.PI/2);
  const transfer=canvasMat('alex-transfer-u2',(c,w,h)=>{c.fillStyle='#151515';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='900 50px Arial';c.textAlign='center';c.fillText('U8 ↓   S-Bahn ↑   AUSGANG →',w/2,115);c.font='700 31px Arial';c.fillStyle='#ddd';c.fillText('Alexanderplatz · Umsteigen',w/2,205);});
  plane(g,[4.7,1.25],[2.75,3.05,z+23],transfer,Math.PI);game.__alexanderDetailU2=g;
}
function decorateAll(game){const st=game.stations.find(s=>s.id==='alexanderplatz');if(!st)return false;const zc=st.z+49;let count=0;for(const stop of U8_STOPS){if(stop.id===U8_ALEX_INDEX)continue;const group=game.scene.getObjectByName(`U8:${stop.name}`);if(group){decorateRealU8(group,stop,zc);count++}}alexU8(game);alexU2(game);return count>=U8_STOPS.length-1}
function install(game){if(game.__u8DecorationAlexanderV1)return;game.__u8DecorationAlexanderV1=true;decorateAll(game);const base=game.loop;let tick=0;game.loop=function(){const r=base();if((tick++%120)===0)decorateAll(game);if(game.__stationLifeVisualV72?.u8)game.__stationLifeVisualV72.u8.visible=false;if(game.__phase81Architecture?.u8)game.__phase81Architecture.u8.visible=false;return r};game.renderer.setAnimationLoop(game.loop);game.u8DecorationVersion='V8.3.1';game.alexanderDetailVersion='V8.3.1';game.ui?.notify?.('U8 detail V8.3.1 + Alexanderplatz U2/U8 actief');console.info('[Metro] U8 direct station detail + Alexanderplatz V8.3.1 active')}
async function boot(){for(let i=0;i<600;i++){const game=globalThis.__berlinMetroGame;if(game?.scene&&game?.renderer&&game?.stations&&game.stationArchitectureVersion==='V8.3'){install(game);return}await new Promise(r=>setTimeout(r,100))}console.warn('[Metro] U8/Alex detail timed out')}
boot().catch(e=>console.error('[Metro] U8/Alex detail failed',e));
