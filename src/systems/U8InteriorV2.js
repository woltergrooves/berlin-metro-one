import { Tick } from '../state/Tick.js';
import * as THREE from 'three';
const GEO=new Map(),MAT=new Map();
const geo=s=>{const k=s.join('x');if(!GEO.has(k))GEO.set(k,new THREE.BoxGeometry(...s));return GEO.get(k)};
const mat=(c,b=0)=>{const k=`${b}:${c}`;if(!MAT.has(k))MAT.set(k,b?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return MAT.get(k)};
const box=(p,s,pos,m)=>{const q=new THREE.Mesh(geo(s),m);q.position.set(...pos);p.add(q);return q};
const FLOOR=mat(0x51575a),CEIL=mat(0xd7d8d4),SEAT=mat(0x6b493e),POLE=mat(0xb8bcbc),LIGHT=mat(0xfff1c9,1),DARK=mat(0x272a2c),YELLOW=mat(0xe4b51b);
function decorate(train){if(train.userData.__u8InteriorV3)return;train.userData.__u8InteriorV3=true;box(train,[21.8,.12,2.62],[0,.32,0],FLOOR);box(train,[21.6,.12,2.62],[0,2.86,0],CEIL);for(const side of[-1,1]){for(const x of[-8.2,-5.9,-3.6,-1.3,1,3.3,5.6,7.9])box(train,[1.72,.38,.46],[x,.62,side*1.18],SEAT);box(train,[20.5,.1,.1],[0,2.43,side*1.21],POLE)}for(const x of[-8,-4,0,4,8]){box(train,[.09,2.12,.09],[x,1.55,0],POLE);box(train,[1.15,.07,.07],[x,2.36,0],POLE)}for(const x of[-8,-4,0,4,8])box(train,[2.7,.04,.18],[x,2.72,0],LIGHT);for(const dx of[-7.5,-2.5,2.5,7.5]){box(train,[2.5,.05,.07],[dx,2.58,-1.42],YELLOW);box(train,[2.5,.05,.07],[dx,2.58,1.42],YELLOW)}for(const x of[-9.82,9.82])box(train,[.22,2.28,2.48],[x,1.45,0],DARK)}
(async()=>{for(let i=0;i<600;i++){const ts=globalThis.__berlinMetroU8Trains;if(Array.isArray(ts)&&ts.length>1){ts.forEach(decorate);console.info('[Metro] U8 interior V3 ready');return}await Tick.sleep(100,'boot.U8InteriorV2')}})().catch(e=>console.error('[Metro] U8 interior V3 disabled',e));
