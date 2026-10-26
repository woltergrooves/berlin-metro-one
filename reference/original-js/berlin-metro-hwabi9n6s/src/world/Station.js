import * as THREE from 'three';
import { createStationChunk as createBase, disposeStationChunk as disposeBase } from './StationBaseOld.js';

const OPEN=new Set(['schoenhauser-allee','eberswalder-strasse','mendelssohn-bartholdy-park','gleisdreieck','buelowstrasse','nollendorfplatz','olympia-stadion','ruhleben']);
const SPECIAL={
 alexanderplatz:{wall:0xe8e4dc,accent:0x8e3027,column:0x8e3027,ceiling:0xddd9d0,platform:0x5f605f,type:'alex'},
 klosterstrasse:{wall:0xc9a37c,accent:0x67453a,column:0x5b3d33,ceiling:0xc9aa7d,platform:0x625d57,type:'kloster'},
 stadtmitte:{wall:0xd9dfd9,accent:0x46776e,column:0x315b54,ceiling:0xd4d9d5,platform:0x606563,type:'stadt'},
 'potsdamer-platz':{wall:0xd8dde1,accent:0x607f94,column:0x435967,ceiling:0xcfd4d8,platform:0x606569,type:'modern'},
 wittenbergplatz:{wall:0xeee9df,accent:0x315d48,column:0x234b3a,ceiling:0xdfdcd4,platform:0x63635f,type:'wittenberg'},
 'zoologischer-garten':{wall:0xe2ded2,accent:0x648797,column:0x425f6c,ceiling:0xd7d4ca,platform:0x64635f,type:'zoo'}
};
const PALETTE=[0x7896a2,0x859d72,0xa46a59,0xc1a34c,0x719694,0x718997,0x98765b,0x769069,0x6788a5,0xa16b54];
const CACHE=new Map();
const GEO_CACHE=new Map();
function geo(s){const k=s.join('x');if(!GEO_CACHE.has(k))GEO_CACHE.set(k,new THREE.BoxGeometry(...s));return GEO_CACHE.get(k)}
function mat(c,b=false){const k=(b?'b':'l')+c;if(!CACHE.has(k))CACHE.set(k,b?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return CACHE.get(k)}
function box(g,s,p,m){const x=new THREE.Mesh(geo(s),m);x.position.set(...p);g.add(x);return x}
function profile(st){if(SPECIAL[st.id])return SPECIAL[st.id];const a=PALETTE[st.index%PALETTE.length];return{wall:0xdedbd2,accent:a,column:a,ceiling:0xd5d2ca,platform:0x646462,type:OPEN.has(st.id)?'open':'generic'}}
function dims(m){const p=m.geometry?.parameters;return p?[p.width,p.height,p.depth]:null}
function eq(a,b,e=.015){return Math.abs(a-b)<e}
function recolorBase(g,st,p){for(const m of g.children){if(!m.isMesh)continue;const gp=m.geometry?.parameters;if(m.geometry?.type==='PlaneGeometry'&&gp&&eq(gp.width,7.3)&&eq(gp.height,1.28)){m.visible=false;continue}const d=dims(m);if(!d)continue;const[w,h,l]=d;
  if(eq(w,9.4)&&eq(h,.45)&&eq(l,68))m.material=mat(p.platform);
  else if(eq(w,.28)&&eq(h,4.4)&&eq(l,68)){m.material=mat(p.wall);if(p.type==='open')m.visible=false}
  else if(eq(w,18)&&eq(h,.35)&&eq(l,68)){m.material=mat(p.ceiling);if(p.type==='open')m.visible=false}
  else if(eq(w,.48)&&eq(h,4)&&eq(l,.48))m.material=mat(p.column);
  else if(eq(w,3)&&eq(h,.12)&&eq(l,.38))m.material=mat(p.accent);
  else if(eq(w,.35)&&eq(h,.08)&&eq(l,68))m.material=mat(0xe7dfc8,true);
}}
function sign(g,st,p,pos,rot=0){const c=document.createElement('canvas');c.width=768;c.height=128;const x=c.getContext('2d');x.fillStyle='#17375f';x.fillRect(0,0,768,128);x.fillStyle='#f4d21f';x.fillRect(17,18,90,92);x.fillStyle='#111';x.font='900 42px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('U2',62,64);x.fillStyle='#fff';x.font='800 42px Arial';x.textAlign='left';x.fillText(st.name,130,64,610);x.fillStyle='#'+p.accent.toString(16).padStart(6,'0');x.fillRect(0,118,768,10);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;const mm=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});const q=new THREE.Mesh(new THREE.PlaneGeometry(7.4,1.23),mm);q.position.set(...pos);q.rotation.y=rot;g.add(q);g.userData.disposables.push(()=>{t.dispose();mm.dispose();q.geometry.dispose()})}
function signs(g,st,p){const z=st.z;if(p.type==='open'){sign(g,st,p,[2.55,2.35,z-16],0);sign(g,st,p,[2.55,2.35,z+16],Math.PI)}else{sign(g,st,p,[11.48,2.35,z],-Math.PI/2);sign(g,st,p,[-5.98,2.35,z],Math.PI/2)}}
function alex(g,st,p){const z=st.z,r=mat(p.accent);for(let o=-27;o<=27;o+=9){box(g,[.58,3.65,.58],[2.55,1.86,z+o],r);box(g,[8.8,.35,.5],[2.55,3.55,z+o],r)}for(const side of[-1,1]){const x=side<0?-5.88:11.38;for(let o=-28;o<=28;o+=7)box(g,[.06,2.55,.15],[x,1.8,z+o],r)}}
function kloster(g,st){const z=st.z,f=mat(0x5b4036),paper=mat(0xd9c5a4);for(const side of[-1,1]){const x=side<0?-5.86:11.36;for(let o=-24;o<=24;o+=12){box(g,[.08,2.15,5],[x,1.72,z+o],f);box(g,[.09,1.7,4.55],[x-side*.025,1.72,z+o],paper)}}}
function stadt(g,st,p){const z=st.z,a=mat(p.accent);for(const side of[-1,1]){const x=side<0?-5.87:11.37;box(g,[.07,.28,61],[x,2.9,z],a);box(g,[.07,.18,61],[x,.7,z],a)}}
function wittenberg(g,st,p){const z=st.z,gr=mat(p.column);for(let o=-27;o<=27;o+=9){box(g,[.58,3.7,.58],[2.55,1.87,z+o],gr);box(g,[8.5,.3,.46],[2.55,3.5,z+o],gr)}}
function openAir(g,st,p){const z=st.z,s=mat(p.column),roof=mat(p.ceiling),sky=mat(0xabc6d7,true),city=mat(0x535a5d);box(g,[8.7,.22,52],[2.55,4,z],roof);for(let o=-25;o<=25;o+=10){box(g,[.42,3.7,.42],[2.55,1.85,z+o],s);box(g,[8.7,.22,.38],[2.55,3.65,z+o],s)}box(g,[.18,12,82],[-17,4.3,z],sky);box(g,[.18,12,82],[22.2,4.3,z],sky);for(let o=-30;o<=30;o+=15){box(g,[1.1,3.5,9],[-14.8,.4,z+o],city);box(g,[1.1,4.3,9],[20,.8,z-o],city)}}
function decorate(g,st){const p=profile(st);recolorBase(g,st,p);if(p.type==='alex')alex(g,st,p);if(p.type==='kloster')kloster(g,st);if(p.type==='stadt')stadt(g,st,p);if(p.type==='wittenberg')wittenberg(g,st,p);if(p.type==='open')openAir(g,st,p);signs(g,st,p)}
export function createStationChunk(scene,args){const g=createBase(scene,args);decorate(g,args.station);return g}
export function disposeStationChunk(g){disposeBase(g)}
