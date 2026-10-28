import { Tick } from '../state/Tick.js';
import { byName,stopTracker } from '../state/SceneCache.js';
import * as THREE from 'three';
import { U8_STOPS,U8_ALEX_INDEX,stopX } from './U8FullLineVisual.js';

const BOX=new THREE.BoxGeometry(1,1,1), PLANE=new THREE.PlaneGeometry(1,1);
const mobile=matchMedia?.('(pointer: coarse)').matches||/iPhone|iPad|iPod/i.test(navigator.userAgent);
const mats=new Map(), textures=new Map();
function tex(key,paint,repeat=[1,1],game){
  if(textures.has(key))return textures.get(key);
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');paint(x,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=Math.min(mobile?4:8,game.renderer.capabilities.getMaxAnisotropy?.()||4);textures.set(key,t);return t;
}
function noise(x,n,alpha=.12){for(let i=0;i<n;i++){const v=80+Math.random()*120|0;x.fillStyle=`rgba(${v},${v},${v},${Math.random()*alpha})`;x.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*2,1+Math.random()*2)}}
function floorTex(game){return tex('floor',(x)=>{x.fillStyle='#777b7d';x.fillRect(0,0,256,256);noise(x,180,.18);x.strokeStyle='rgba(30,32,34,.22)';x.lineWidth=2;for(let i=0;i<=256;i+=64){x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.stroke()}for(let j=0;j<=256;j+=64){x.beginPath();x.moveTo(0,j);x.lineTo(256,j);x.stroke()}},[12,4],game)}
function tilesTex(game){return tex('tiles',(x)=>{x.fillStyle='#dedbd2';x.fillRect(0,0,256,256);for(let y=0;y<256;y+=32){for(let z=0;z<256;z+=64){const off=(y/32)%2?32:0;x.fillStyle=`rgb(${218+(Math.random()*10|0)},${216+(Math.random()*9|0)},${208+(Math.random()*8|0)})`;x.fillRect(z+off,y,62,30)}}x.strokeStyle='rgba(80,82,82,.28)';x.lineWidth=2;for(let y=0;y<=256;y+=32){x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke()}for(let y=0;y<256;y+=32){const off=(y/32)%2?32:0;for(let z=-64;z<=256;z+=64){x.beginPath();x.moveTo(z+off,y);x.lineTo(z+off,y+32);x.stroke()}}noise(x,80,.06)},[14,4],game)}
function concreteTex(game){return tex('concrete',(x)=>{x.fillStyle='#5e6264';x.fillRect(0,0,256,256);noise(x,420,.15);for(let i=0;i<16;i++){x.fillStyle='rgba(25,25,25,.035)';x.beginPath();x.arc(Math.random()*256,Math.random()*256,4+Math.random()*18,0,Math.PI*2);x.fill()}},[10,4],game)}
function metalTex(game){return tex('metal',(x)=>{const g=x.createLinearGradient(0,0,256,0);g.addColorStop(0,'#70777b');g.addColorStop(.5,'#a3aaad');g.addColorStop(1,'#6b7276');x.fillStyle=g;x.fillRect(0,0,256,256);for(let y=0;y<256;y+=3){x.fillStyle=`rgba(255,255,255,${Math.random()*.045})`;x.fillRect(0,y,256,1)}},[2,6],game)}
function grimeTex(game){return tex('grime',(x)=>{x.clearRect(0,0,256,256);for(let i=0;i<45;i++){const r=8+Math.random()*32,g=x.createRadialGradient(128,128,0,128,128,r);g.addColorStop(0,'rgba(25,22,18,.10)');g.addColorStop(1,'rgba(25,22,18,0)');x.save();x.translate(Math.random()*256,Math.random()*256);x.fillStyle=g;x.fillRect(-r,-r,r*2,r*2);x.restore()}},[2,1],game)}
function std(key,opts){if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial(opts));return mats.get(key)}
function box(g,s,p,m){const q=new THREE.Mesh(BOX,m);q.scale.set(...s);q.position.set(...p);g.add(q);return q}
function plane(g,s,p,m,ry=0){const q=new THREE.Mesh(PLANE,m);q.scale.set(...s,1);q.position.set(...p);q.rotation.y=ry;g.add(q);return q}
function materials(game){return {
  floor:std('tx-floor',{map:floorTex(game),color:0xaeb1b2,roughness:.82,metalness:.03}),
  tile:std('tx-tile',{map:tilesTex(game),color:0xffffff,roughness:.7,metalness:.01}),
  concrete:std('tx-concrete',{map:concreteTex(game),color:0xa4a7a8,roughness:.96,metalness:.01}),
  metal:std('tx-metal',{map:metalTex(game),color:0xb6bec1,roughness:.38,metalness:.72}),
  edge:std('tx-edge',{color:0xe7e2d7,roughness:.68,metalness:.01}),
  tactile:std('tx-tactile',{color:0xd7b62e,roughness:.7,metalness:.01}),
  grime:new THREE.MeshBasicMaterial({map:grimeTex(game),transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}),
  glow:std('tx-glow',{color:0xffffff,emissive:0xfff0cc,emissiveIntensity:1.25,roughness:.25})
}}
function enhanceU8(game,stop,ms){if(stop.id===U8_ALEX_INDEX)return true;const parent=byName(game.scene,`U8:${stop.name}`);if(!parent)return false;if(parent.getObjectByName('Phase125TextureV2'))return true;const alex=game.stations.find(s=>s.id==='alexanderplatz');if(!alex)return false;const x=stopX(stop.id),z=alex.z+49,g=new THREE.Group();g.name='Phase125TextureV2';parent.add(g);
  box(g,[48.8,.035,13.05],[x,-3.82,z],ms.floor);
  box(g,[48.8,.035,.42],[x,-3.79,z-6.18],ms.edge);box(g,[48.8,.035,.42],[x,-3.79,z+6.18],ms.edge);
  box(g,[48.8,.04,.17],[x,-3.755,z-5.82],ms.tactile);box(g,[48.8,.04,.17],[x,-3.755,z+5.82],ms.tactile);
  box(g,[50,.06,4.2],[x,-1.55,z-11.91],ms.tile);box(g,[50,.06,4.2],[x,-1.55,z+11.91],ms.tile);
  box(g,[50,.05,24],[x,.39,z],ms.concrete);
  for(let xx=x-21;xx<=x+21;xx+=7){box(g,[.43,3.9,.43],[xx,-1.92,z],ms.metal)}
  plane(g,[8.2,1.55],[x-13,-2.1,z-11.84],ms.grime,0);plane(g,[7.4,1.45],[x+12,-2.35,z+11.84],ms.grime,Math.PI);
  for(let xx=x-19;xx<=x+19;xx+=8)box(g,[3.8,.035,.28],[xx,.18,z-5.1],ms.glow);
  return true;
}
let alexDone=false;function enhanceAlexU8(game,ms){if(alexDone)return;const st=game.stations.find(s=>s.id==='alexanderplatz');if(!st)return;alexDone=true;if(game.scene.getObjectByName('Phase125AlexTextureV2'))return;const x=stopX(U8_ALEX_INDEX),z=st.z+49,g=new THREE.Group();g.name='Phase125AlexTextureV2';game.scene.add(g);box(g,[39,.035,13],[x,-3.82,z],ms.floor);box(g,[39,.04,.18],[x,-3.76,z-5.82],ms.tactile);box(g,[39,.04,.18],[x,-3.76,z+5.82],ms.tactile);for(let xx=x-16;xx<=x+16;xx+=8)box(g,[.44,3.9,.44],[xx,-1.9,z],ms.metal)}
let u2g=null;function enhanceU2(game,st,ms){let g=u2g?.parent===game.scene?u2g:null;if(!g){g=new THREE.Group();g.name='Phase125U2TextureV2';game.scene.add(g);u2g=g}if(g.userData.key===st.id)return g;g.clear();g.userData.key=st.id;box(g,[5.28,.03,54],[2.72,.11,st.z],ms.floor);box(g,[.16,.04,54],[-.01,.15,st.z],ms.tactile);box(g,[.16,.04,54],[5.45,.15,st.z],ms.tactile);plane(g,[12,2.25],[-5.87,1.55,st.z],ms.tile,Math.PI/2);plane(g,[12,2.25],[11.37,1.55,st.z],ms.tile,-Math.PI/2);box(g,[17,.04,20],[2.72,4.08,st.z],ms.concrete);plane(g,[5.5,1.25],[-5.82,1.2,st.z-10],ms.grime,Math.PI/2);plane(g,[5.5,1.25],[11.32,1.2,st.z+12],ms.grime,-Math.PI/2);return g}
function install(game){if(game.__phase125textures2)return;game.__phase125textures2=true;const ms=materials(game);game.renderer.toneMapping=THREE.ACESFilmicToneMapping;game.renderer.toneMappingExposure=1.08;game.renderer.outputColorSpace=THREE.SRGBColorSpace;let n=0;const u8s=stopTracker(U8_STOPS);Tick.frame('Phase125TexturesV2',{after(){if(!(u8s.complete&&alexDone)&&(n++%40)===0){u8s.run(s=>enhanceU8(game,s,ms));enhanceAlexU8(game,ms)}const p=game.player;if(!p.__streetMode&&!p.__u8Active&&!Number.isInteger(p.__u8FullStation)&&p.currentStation){enhanceU2(game,p.currentStation,ms).visible=true}else if(u2g)u2g.visible=false;}});game.graphicsFoundationVersion='12.5-V2-textured';game.ui?.notify?.('Graphics 12.5 V2 · tegels, beton, metaal & slijtage actief')}
async function boot(){for(let i=0;i<700;i++){const g=globalThis.__berlinMetroGame;if(g?.scene&&g?.renderer&&g?.player){install(g);return}await Tick.sleep(100,'boot.Phase125TexturesV2')}}boot().catch(e=>console.error('[Metro] texture graphics failed',e));
