import * as THREE from 'three';
import { U8_STOPS,U8_ALEX_INDEX,stopX } from './U8FullLineVisual.js';

const GEO=new THREE.BoxGeometry(1,1,1);
const MAT=new Map();
const std=(key,color,rough=.78,metal=.05,emissive=0x000000,ei=0)=>{if(!MAT.has(key))MAT.set(key,new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive,emissiveIntensity:ei}));return MAT.get(key)};
const concrete=std('concrete',0x74787a,.92,.02), floor=std('floor',0x8b8f91,.82,.03), edge=std('edge',0xe2ddd0,.72,.02), tactile=std('tactile',0xd6b640,.72,.02), dark=std('dark',0x24282b,.86,.08), metal=std('metal',0x7d858a,.42,.68), white=std('white',0xd8d6cf,.78,.02), rail=std('rail',0x90989c,.34,.82), sleeper=std('sleeper',0x4b433b,.9,.03), lightMat=std('light',0xffffff,.35,.05,0xfff3d2,1.7);
const box=(g,s,p,m)=>{const q=new THREE.Mesh(GEO,m);q.scale.set(...s);q.position.set(...p);g.add(q);return q};
const accentMat=c=>std(`accent:${c}`,c,.65,.04);

function ensureNeutralLight(game){
  const old=game.scene.getObjectByName('Phase12UndergroundAmbient');
  if(old) old.intensity=.62;
  let hemi=game.scene.getObjectByName('Phase125Hemi');
  if(!hemi){hemi=new THREE.HemisphereLight(0xf5f1e8,0x45494d,.78);hemi.name='Phase125Hemi';game.scene.add(hemi)}
  let p=game.scene.getObjectByName('Phase125LocalLight');
  if(!p){p=new THREE.PointLight(0xfff4dc,1.45,42,1.7);p.name='Phase125LocalLight';game.scene.add(p)}
  return p;
}

function addU8Shell(game,stop){
  if(stop.id===U8_ALEX_INDEX)return;
  const parent=game.scene.getObjectByName(`U8:${stop.name}`); if(!parent)return;
  let g=parent.getObjectByName('Phase125Shell'); if(g)return g;
  const alex=game.stations.find(s=>s.id==='alexanderplatz'); if(!alex)return;
  const x=stopX(stop.id),z=alex.z+49,a=accentMat(stop.color);
  g=new THREE.Group();g.name='Phase125Shell';parent.add(g);
  box(g,[49.2,.16,13.35],[x,-4.02,z],floor);
  box(g,[49.2,.045,.55],[x,-3.915,z-6.37],edge);
  box(g,[49.2,.045,.55],[x,-3.915,z+6.37],edge);
  box(g,[49.2,.055,.20],[x,-3.88,z-5.98],tactile);
  box(g,[49.2,.055,.20],[x,-3.88,z+5.98],tactile);
  box(g,[50.6,4.55,.12],[x,-1.58,z-11.84],white);
  box(g,[50.6,4.55,.12],[x,-1.58,z+11.84],white);
  box(g,[50.6,.28,.145],[x,-.52,z-11.75],a);
  box(g,[50.6,.28,.145],[x,-.52,z+11.75],a);
  box(g,[50.6,.24,24.0],[x,.47,z],dark);
  for(let xx=x-21;xx<=x+21;xx+=7){box(g,[.38,4.0,.38],[xx,-1.98,z],metal);box(g,[2.8,.12,.48],[xx,.18,z],lightMat)}
  for(const tz of[z-9.1,z+9.1]){
    box(g,[50,.11,.10],[x,-4.11,tz-.69],rail);box(g,[50,.11,.10],[x,-4.11,tz+.69],rail);
    for(let xx=x-23;xx<x+23;xx+=2.4)box(g,[.18,.07,2.05],[xx,-4.18,tz],sleeper);
  }
  return g;
}

function u8Visibility(game){
  const p=game.player;let idx=null;
  if(Number.isInteger(p.__u8FullStation))idx=p.__u8FullStation;
  else if(p.__u8Active){const d=globalThis.__berlinMetroU8Train?.userData?.u8;if(Number.isInteger(d?.currentIndex))idx=d.currentIndex}
  else if(p.__u8Area&&p.currentStation?.id==='alexanderplatz')idx=U8_ALEX_INDEX;
  if(idx==null)return null;
  for(const s of U8_STOPS){if(s.id===U8_ALEX_INDEX)continue;const g=game.scene.getObjectByName(`U8:${s.name}`);if(g)g.visible=Math.abs(s.id-idx)<=1}
  for(let i=0;i<U8_STOPS.length-1;i++){const g=game.scene.getObjectByName(`U8:tunnel:${i}`);if(g)g.visible=i>=idx-1&&i<=idx}
  return idx;
}

function makeU2Floor(game,st){
  let g=game.scene.getObjectByName('Phase125U2');if(!g){g=new THREE.Group();g.name='Phase125U2';game.scene.add(g)}
  if(g.userData.key===st.id)return g;g.clear();g.userData.key=st.id;
  box(g,[5.45,.075,55],[2.72,.025,st.z],floor);
  box(g,[.18,.055,55],[-.02,.08,st.z],tactile);
  box(g,[.18,.055,55],[5.46,.08,st.z],tactile);
  for(let zz=st.z-24;zz<=st.z+24;zz+=8){box(g,[1.8,.10,.32],[2.72,3.7,zz],lightMat)}
  return g;
}

function install(game){
  if(game.__phase125)return;game.__phase125=true;
  const local=ensureNeutralLight(game),base=game.loop;let n=0;
  game.loop=function(){
    const r=base();
    const idx=u8Visibility(game);
    if((n++%40)===0)for(const s of U8_STOPS)addU8Shell(game,s);
    const p=game.player;
    if(idx!=null){
      const alex=game.stations.find(s=>s.id==='alexanderplatz');
      const x=stopX(idx),z=alex?.z+49??p.position.z;local.position.set(x,-.5,z);local.intensity=1.55;
      const u2=game.scene.getObjectByName('Phase125U2');if(u2)u2.visible=false;
    }else if(!p.__streetMode&&p.currentStation){
      const g=makeU2Floor(game,p.currentStation);g.visible=true;local.position.set(2.7,3.4,p.currentStation.z);local.intensity=1.05;
    }else local.intensity=.45;
    return r;
  };
  game.renderer.setAnimationLoop(game.loop);
  game.graphicsFoundationVersion='12.5-V1';
  game.u8PlatformFixVersion='V3';
  game.ui?.notify?.('Graphics 12.5 · PBR perrons + neutrale U8-materialen actief');
}
async function boot(){for(let i=0;i<700;i++){const g=globalThis.__berlinMetroGame;if(g?.scene&&g?.renderer&&g?.player&&g?.stations){install(g);return}await new Promise(r=>setTimeout(r,100))}}boot().catch(e=>console.error('[Metro] Phase 12.5 failed',e));
