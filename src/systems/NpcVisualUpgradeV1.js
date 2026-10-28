import { Tick } from '../state/Tick.js';
import { byName } from '../state/SceneCache.js';
import * as THREE from 'three';
import {NpcSystem} from './NpcSystem.js';

const FACE_GEO=new THREE.PlaneGeometry(.27,.29),HAIR_GEO=new THREE.BoxGeometry(.34,.105,.31),DETAIL_GEO=new THREE.PlaneGeometry(.24,.27);
const ARCH=[
 {skin:'#e4b58e',hair:'#2a1c17',eyes:'#4d352a',top:0x30495d,detail:'zip',beard:false,glasses:false},
 {skin:'#c98e68',hair:'#171515',eyes:'#3c271e',top:0x6a3c42,detail:'hood',beard:true,glasses:false},
 {skin:'#f0c4a3',hair:'#a37549',eyes:'#465a66',top:0x455d42,detail:'scarf',beard:false,glasses:true},
 {skin:'#9f6748',hair:'#17120f',eyes:'#221915',top:0x5c4d68,detail:'zip',beard:true,glasses:false},
 {skin:'#d5a17c',hair:'#473126',eyes:'#3a2c25',top:0x8a5b32,detail:'hood',beard:false,glasses:false},
 {skin:'#7f4e36',hair:'#0f0d0c',eyes:'#201712',top:0x365b5c,detail:'scarf',beard:false,glasses:true},
 {skin:'#ecc0a0',hair:'#d2b170',eyes:'#5e4935',top:0x333941,detail:'zip',beard:true,glasses:false},
 {skin:'#b97b58',hair:'#241815',eyes:'#2f2019',top:0x6c5b45,detail:'hood',beard:false,glasses:false}
];
const cache=ARCH.map((a,i)=>makeLook(a,i));let seq=0;
function makeLook(a,i){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);x.fillStyle=a.skin;x.beginPath();x.roundRect(13,8,102,112,22);x.fill();
 x.fillStyle=a.hair;x.fillRect(17,8,94,25);if(i%3===0){x.fillRect(14,20,15,44);x.fillRect(99,20,15,44)}if(i%3===1){for(let k=0;k<6;k++){x.beginPath();x.arc(23+k*16,22+(k%2)*5,13,0,Math.PI*2);x.fill()}}
 x.fillStyle='#4c372f';x.fillRect(31,47,25,5);x.fillRect(72,47,25,5);x.fillStyle='#fff';x.fillRect(34,55,20,11);x.fillRect(74,55,20,11);x.fillStyle=a.eyes;x.beginPath();x.arc(44,60,4.5,0,Math.PI*2);x.arc(84,60,4.5,0,Math.PI*2);x.fill();
 x.strokeStyle='#a8755b';x.lineWidth=4;x.beginPath();x.moveTo(64,59);x.lineTo(60,78);x.lineTo(68,78);x.stroke();x.strokeStyle='#8d5b58';x.lineWidth=4;x.beginPath();x.moveTo(48,92);x.quadraticCurveTo(64,99,80,92);x.stroke();
 if(a.beard){x.fillStyle=a.hair+'bb';x.beginPath();x.moveTo(28,80);x.quadraticCurveTo(64,124,100,80);x.lineTo(91,111);x.quadraticCurveTo(64,125,37,111);x.closePath();x.fill()}
 if(a.glasses){x.strokeStyle='#222';x.lineWidth=5;x.strokeRect(27,51,33,20);x.strokeRect(68,51,33,20);x.beginPath();x.moveTo(60,59);x.lineTo(68,59);x.stroke()}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;const face=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,toneMapped:false});
 const skin=new THREE.MeshLambertMaterial({color:new THREE.Color(a.skin)}),hair=new THREE.MeshLambertMaterial({color:new THREE.Color(a.hair)}),top=new THREE.MeshLambertMaterial({color:a.top});
 const d=document.createElement('canvas');d.width=d.height=128;const z=d.getContext('2d');z.clearRect(0,0,128,128);if(a.detail==='zip'){z.strokeStyle='#c7cbd0';z.lineWidth=6;z.beginPath();z.moveTo(64,5);z.lineTo(64,120);z.stroke();z.fillStyle='#aaa';z.fillRect(58,42,12,18)}else if(a.detail==='hood'){z.strokeStyle='#ddd';z.lineWidth=5;z.beginPath();z.moveTo(47,12);z.lineTo(53,66);z.moveTo(81,12);z.lineTo(75,66);z.stroke();z.fillStyle='#ddd';z.beginPath();z.arc(53,70,5,0,Math.PI*2);z.arc(75,70,5,0,Math.PI*2);z.fill()}else{z.fillStyle='#b9a88e';z.fillRect(22,8,84,24);z.fillStyle='#84725d';z.fillRect(51,8,26,90)}const dt=new THREE.CanvasTexture(d);dt.colorSpace=THREE.SRGBColorSpace;dt.minFilter=THREE.LinearFilter;const detail=new THREE.MeshBasicMaterial({map:dt,transparent:true,side:THREE.DoubleSide,toneMapped:false});return{...a,face,skin,hair,top,detail};
}
function enhance(n){if(!n?.g||n.g.userData.__detailedNpc)return;n.g.userData.__detailedNpc=true;const a=cache[(seq++)%cache.length];n.head.material=a.skin;n.torso.material=n.la.material=n.ra.material=a.top;n.head.scale.set(1.02,1.04,.96);
 const front=new THREE.Mesh(FACE_GEO,a.face);front.position.set(0,0,.156);n.head.add(front);const back=front.clone();back.position.z=-.156;back.rotation.y=Math.PI;n.head.add(back);
 const hair=new THREE.Mesh(HAIR_GEO,a.hair);hair.position.set(0,.2,-.005);hair.scale.set(iScale(a.hair,0),1,iScale(a.hair,1));n.head.add(hair);
 const chest=new THREE.Mesh(DETAIL_GEO,a.detail);chest.position.set(0,.02,.131);n.torso.add(chest);n.g.userData.appearance='detailed-v1';
}
function iScale(mat,axis){const h=mat.color.getHex()%7;return axis?(.94+(h%3)*.035):(1+(h%2)*.05)}
const oldMake=NpcSystem.prototype.make;NpcSystem.prototype.make=function(...args){const n=oldMake.apply(this,args);enhance(n);return n};

const HOFF_IMG='https://commons.wikimedia.org/wiki/Special:Redirect/file/David_Hasselhoff_2013.jpg?width=256';
function upgradeHoff(npc){if(!npc||npc.userData.__realFaceV1)return;npc.userData.__realFaceV1=true;const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');loader.load(HOFF_IMG,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;tex.repeat.set(.54,.38);tex.offset.set(.23,.56);const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false});const face=new THREE.Mesh(new THREE.PlaneGeometry(.31,.35),mat);face.name='HasselhoffRealFace';face.position.set(0,1.89,.174);npc.add(face);npc.userData.faceTextureCredit='David Hasselhoff portrait: Georges Biard / Wikimedia Commons, CC BY-SA 3.0';},undefined,()=>{npc.userData.faceTextureFailed=true});
 const hairMat=new THREE.MeshLambertMaterial({color:0x3a261d});const crown=new THREE.Mesh(new THREE.BoxGeometry(.37,.09,.31),hairMat);crown.position.set(0,2.075,-.005);crown.rotation.z=-.03;npc.add(crown);
}
function addCredit(sheet){if(!sheet||sheet.querySelector('.hoffPhotoCredit'))return;const d=document.createElement('div');d.className='hoffPhotoCredit';d.textContent='Portrettexture: Georges Biard / Wikimedia Commons · CC BY-SA 3.0';d.style.cssText='font:9px Arial;color:#6f7884;margin-top:7px;opacity:.8';sheet.querySelector('div')?.appendChild(d)}
const obs=new MutationObserver(()=>{const g=globalThis.__berlinMetroGame,npc=byName(g?.scene,'DavidHasselhoff');if(npc)upgradeHoff(npc);addCredit(document.querySelector('#hoffConversationV2'));addCredit(document.querySelector('#hoffConversation'));});obs.observe(document.documentElement,{childList:true,subtree:true});
(async()=>{for(let i=0;i<800;i++){const g=globalThis.__berlinMetroGame;if(g?.npcSystem){g.npcSystem.n?.forEach(enhance)}const npc=byName(g?.scene,'DavidHasselhoff');if(npc){upgradeHoff(npc);g.npcVisualVersion='V1-detailed';break}await Tick.sleep(50,'boot.NpcVisualUpgradeV1')}})();
