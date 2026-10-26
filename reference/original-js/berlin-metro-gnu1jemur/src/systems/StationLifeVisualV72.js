import * as THREE from 'three';
import { U8_STOPS,U8_ALEX_INDEX,stopX } from 'https://berlin-metro-8fg359ibe-wolter1.vercel.app/src/systems/U8FullLineVisual.js';

const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'');
const BOX=new THREE.BoxGeometry(1,1,1), CYL=new THREE.CylinderGeometry(.28,.28,1,10), PLANE=new THREE.PlaneGeometry(1,1);
const MAT=new Map(),SIGNS=new Map(),ADS=new Map();
const mat=(c,em=false)=>{const k=`${c}:${em}`;if(!MAT.has(k))MAT.set(k,em?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return MAT.get(k)};
const box=(p,s,pos,m)=>{const q=new THREE.Mesh(BOX,m);q.scale.set(...s);q.position.set(...pos);p.add(q);return q};
const cyl=(p,pos,m)=>{const q=new THREE.Mesh(CYL,m);q.position.set(...pos);p.add(q);return q};
const PALETTES=[[0xd5c27a,0x6b5731],[0x9bb7aa,0x405b50],[0xc38f78,0x68473b],[0xa6b8cf,0x405976],[0xd0b26d,0x705b2d],[0xb6a3c9,0x5c486f],[0x8eafb8,0x335c67],[0xc39a9f,0x70464b]];
const SPECIAL={pankow:[0xd7cfad,0x4b625a],senefelderplatz:[0xddc35f,0x735b25],rosaluxemburgplatz:[0xe0bf57,0x775c23],klosterstrasse:[0xb7795f,0x603e31],maerkischesmuseum:[0xc7c4b7,0x5f5b52],spittelmarkt:[0x87a4ad,0x395963],hausvogteiplatz:[0xcbb187,0x5c4e38],stadtmitte:[0xa8b8ad,0x42574c],potsdamerplatz:[0xb8afa0,0x514940],wittenbergplatz:[0xc8b076,0x654f2e],zoologischergarten:[0xc0a566,0x58482c],olympiastadion:[0xa7b8cd,0x36506c],wittenau:[0xb6a17c,0x5a4831],gesundbrunnen:[0xa6b4a5,0x405345],bernauerstrasse:[0xb9a48a,0x5a4736],weinmeisterstrasse:[0xc9aa87,0x684933],jannowitzbrucke:[0x9cafb9,0x395766],kottbussertor:[0xc3a66e,0x66502b],hermannplatz:[0xb99a87,0x674738],hermannstrasse:[0x9ead9e,0x405343]};
function theme(name,line){const k=norm(name);if(SPECIAL[k])return SPECIAL[k];const h=[...`${line}${k}`].reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),17);return PALETTES[h%PALETTES.length]}
function hash(name){return [...norm(name)].reduce((a,c)=>((a*33+c.charCodeAt(0))>>>0),5381)}
function signMat(name,line,accent){const key=`${line}:${name}:${accent}`;if(SIGNS.has(key))return SIGNS.get(key);const c=document.createElement('canvas');c.width=1200;c.height=210;const x=c.getContext('2d');x.fillStyle='#f5f2e9';x.fillRect(0,0,1200,210);x.fillStyle=`#${accent.toString(16).padStart(6,'0')}`;x.fillRect(0,0,40,210);x.fillStyle='#111';x.font=`800 ${name.length>23?48:name.length>17?56:67}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(name,585,105,960);x.fillStyle=line==='U8'?'#173b69':'#f0c51a';x.fillRect(1040,52,106,106);x.fillStyle=line==='U8'?'#fff':'#111';x.font='900 42px Arial';x.fillText(line,1093,106);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});SIGNS.set(key,m);return m}
function adMat(seed){const k=seed%5;if(ADS.has(k))return ADS.get(k);const c=document.createElement('canvas');c.width=640;c.height=900;const x=c.getContext('2d'),bg=['#f5c642','#68a7c9','#e77f67','#8dbb8a','#c39ad8'][k];x.fillStyle=bg;x.fillRect(0,0,640,900);x.fillStyle='#111';x.font='900 78px Arial';x.textAlign='center';x.fillText(['BERLIN','KULTUR','MORGEN','FAHR MIT','STADT'][k],320,210);x.font='700 39px Arial';x.fillText(['IST DEINS','HEUTE ABEND','NEU IN BERLIN','U-BAHN','ENTDECKEN'][k],320,285);x.fillStyle='rgba(255,255,255,.75)';x.fillRect(80,390,480,330);x.fillStyle='#111';x.font='900 112px Arial';x.fillText(['29','U','B','BVG','24'][k],320,590);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});ADS.set(k,m);return m}
function clear(g){for(const c of [...g.children])g.remove(c)}
function benchZ(g,x,z,D,A){box(g,[.72,.14,2.45],[x,.48,z],A);box(g,[.12,.82,2.45],[x-.30,.88,z],D);for(const dz of[-.95,.95])box(g,[.12,.48,.12],[x,.24,z+dz],D)}
function bin(g,x,z,D,A){const q=cyl(g,[x,.48,z],D);q.scale.y=.9;box(g,[.60,.09,.60],[x,.95,z],A);box(g,[.28,.04,.16],[x,1.01,z],D)}
function machine(g,x,z,D,A,axis='z'){const s=axis==='z'?[.72,1.76,.84]:[.84,1.76,.72];box(g,s,[x,.88,z],D);const s2=axis==='z'?[.75,.62,.87]:[.87,.62,.75];box(g,s2,[x,1.35,z],A);box(g,axis==='z'?[.77,.34,.89]:[.89,.34,.77],[x,.68,z],mat(0xd6d6d6))}
function wallAd(g,x,z,rot,seed){const p=new THREE.Mesh(PLANE,adMat(seed));p.scale.set(1.28,1.8,1);p.position.set(x,1.72,z);p.rotation.y=rot;g.add(p)}
function wallSign(g,name,line,accent,x,z,rot){const p=new THREE.Mesh(PLANE,signMat(name,line,accent));p.scale.set(3.7,.66,1);p.position.set(x,2.25,z);p.rotation.y=rot;g.add(p)}
function buildU2(g,st){clear(g);const [accent,dark]=theme(st.name,'U2'),A=mat(accent),D=mat(dark),h=hash(st.name),style=h%4;g.position.set(0,0,st.z);
 // Real U2 base walls are centered at x=-5.98 and x=11.48. Inner wall faces are about -5.84 / 11.34.
 box(g,[.035,.52,58],[-5.82,2.05,0],A);box(g,[.035,.52,58],[11.32,2.05,0],A);
 if(style===0){for(let z=-27;z<=27;z+=6){box(g,[.04,1.55,.22],[-5.80,1.32,z],D);box(g,[.04,1.55,.22],[11.30,1.32,z],D)}}
 if(style===1){for(let z=-27;z<=27;z+=7){box(g,[17.0,.12,.22],[2.75,3.55,z],D)}}
 if(style===2){for(let z=-25;z<=25;z+=10){box(g,[.06,.75,4.0],[-5.79,.98,z],A);box(g,[.06,.75,4.0],[11.29,.98,z],A)}}
 if(style===3){for(let z=-25;z<=25;z+=10){box(g,[.05,2.0,.12],[-5.79,1.5,z],D);box(g,[.05,2.0,.12],[11.29,1.5,z],D)}}
 for(const z of[-18,0,18]){wallSign(g,st.name,'U2',accent,-5.78,z,Math.PI/2);wallSign(g,st.name,'U2',accent,11.28,z,-Math.PI/2)}
 // Furniture is deliberately inboard: platform edges are about x=-2.15 / 7.25.
 benchZ(g,.70,-10,D,A);benchZ(g,4.40,9,D,A);bin(g,4.35,-5,D,A);bin(g,.78,15,D,A);machine(g,4.35,18,D,A);machine(g,.78,-20,D,A);
 wallAd(g,-5.76,24,Math.PI/2,h);wallAd(g,11.26,-24,-Math.PI/2,h+1);
 // Small centre signage, no giant opaque wall planes.
 for(const z of[-26,26]){box(g,[1.8,.18,.38],[2.55,3.28,z],A);box(g,[.16,.68,.16],[1.75,2.87,z],D);box(g,[.16,.68,.16],[3.35,2.87,z],D)}
}
function benchX(g,x,z,D,A){box(g,[2.45,.14,.72],[x,.48,z],A);box(g,[2.45,.82,.12],[x,.88,z+(z<0?-.30:.30)],D);for(const dx of[-.95,.95])box(g,[.12,.48,.12],[x+dx,.24,z],D)}
function wallAdU8(g,x,z,rot,seed){const p=new THREE.Mesh(PLANE,adMat(seed));p.scale.set(1.28,1.8,1);p.position.set(x,1.72,z);p.rotation.y=rot;g.add(p)}
function wallSignU8(g,name,accent,x,z,rot){const p=new THREE.Mesh(PLANE,signMat(name,'U8',accent));p.scale.set(3.7,.66,1);p.position.set(x,2.25,z);p.rotation.y=rot;g.add(p)}
function buildU8(g,stop,game){clear(g);const [accent,dark]=theme(stop.name,'U8'),A=mat(accent),D=mat(dark),h=hash(stop.name),style=h%4;const alex=game.stations.find(s=>s.id==='alexanderplatz'),zc=alex.z+49,cx=stopX(stop.id);g.position.set(cx,-4,zc);
 // Real U8 walls are at z=±12. Inner faces are about z=±11.84; platform itself is only z=±7.
 box(g,[50,.52,.035],[0,2.05,-11.82],A);box(g,[50,.52,.035],[0,2.05,11.82],A);
 if(style===0){for(let x=-23;x<=23;x+=6){box(g,[.22,1.55,.04],[x,1.32,-11.80],D);box(g,[.22,1.55,.04],[x,1.32,11.80],D)}}
 if(style===1){for(let x=-23;x<=23;x+=7)box(g,[.22,.12,23.4],[x,3.55,0],D)}
 if(style===2){for(let x=-21;x<=21;x+=10){box(g,[4.0,.75,.06],[x,.98,-11.79],A);box(g,[4.0,.75,.06],[x,.98,11.79],A)}}
 if(style===3){for(let x=-22;x<=22;x+=9){box(g,[.14,2.0,.05],[x,1.50,-11.79],D);box(g,[.14,2.0,.05],[x,1.50,11.79],D)}}
 for(const x of[-15,0,15]){wallSignU8(g,stop.name,accent,x,-11.76,0);wallSignU8(g,stop.name,accent,x,11.76,Math.PI)}
 // U8 track beds are at z≈±9.1. Everything below stays around the middle of the 14m platform.
 benchX(g,-10,-2.4,D,A);benchX(g,9,2.4,D,A);bin(g,-4,3.2,D,A);bin(g,13,-3.2,D,A);machine(g,18,3.6,D,A,'x');machine(g,-18,-3.6,D,A,'x');
 wallAdU8(g,22,-11.74,0,h);wallAdU8(g,-22,11.74,Math.PI,h+1);
}
function install(game){if(game.__stationLifeVisualV72)return;const u2=new THREE.Group(),u8=new THREE.Group();u2.name='StationLifeV72:U2';u8.name='StationLifeV72:U8';game.scene.add(u2,u8);let key2='',key8='';const base=game.loop;
 game.loop=function(){const p=game.player,street=!!p.__streetMode,idx=Number.isInteger(p.__u8FullStation)?p.__u8FullStation:null;const st=p.currentStation;
  const show2=!street&&!p.__u8Active&&idx===null&&st&&st.id!=='alexanderplatz';if(show2){const k=st.id||st.name;if(k!==key2){buildU2(u2,st);key2=k}u2.visible=true}else u2.visible=false;
  const show8=!street&&!p.__u8Active&&idx!==null&&idx!==U8_ALEX_INDEX&&U8_STOPS[idx];if(show8){if(String(idx)!==key8){buildU8(u8,U8_STOPS[idx],game);key8=String(idx)}u8.visible=true}else u8.visible=false;return base()};
 game.renderer.setAnimationLoop(game.loop);game.__stationLifeVisualV72={u2,u8};game.stationDetailVersion='V7.2';game.ui?.notify?.('Stations V7.2: inrichting van spoor af + zicht vanuit trein hersteld');console.info('[Metro] Station Life V7.2 active — real wall faces, inboard furniture');
}
async function boot(){for(let i=0;i<600;i++){const game=globalThis.__berlinMetroGame;if(game?.player&&game?.scene&&game?.renderer&&game?.exitGuaranteeVersion==='UniversalStationExitV5'){install(game);return}await new Promise(r=>setTimeout(r,100))}console.warn('[Metro] Station Life V7.2 timed out')}
boot().catch(e=>console.error('[Metro] Station Life V7.2 failed',e));
