import * as THREE from 'three';
const DARK=new THREE.MeshLambertMaterial({color:0x1a1d1f});
const METAL=new THREE.MeshLambertMaterial({color:0x555b5d});
const CABLE=new THREE.MeshLambertMaterial({color:0x25282a});
const RED=new THREE.MeshBasicMaterial({color:0xe13232});
const GREEN=new THREE.MeshBasicMaterial({color:0x48d474});
const AMBER=new THREE.MeshBasicMaterial({color:0xf0b536});
const WHITE=new THREE.MeshBasicMaterial({color:0xe7e0cb});
const box=(p,s,pos,m,ry=0)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(...s),m);q.position.set(...pos);q.rotation.y=ry;p.add(q);return q};
function decorate(seg,i,zc){if(!seg||seg.userData.__u8TunnelDetailV1)return;seg.userData.__u8TunnelDetailV1=true;const cx=seg.userData.centerX;
  for(const side of[-1,1]){box(seg,[52,.10,.18],[cx,-1.05,zc+side*11.55],CABLE);box(seg,[52,.08,.08],[cx,-2.2,zc+side*11.28],METAL)}
  for(const off of[-18,0,18])for(const side of[-1,1]){box(seg,[.45,1.55,.16],[cx+off,-1.9,zc+side*11.62],DARK);box(seg,[.12,.34,.04],[cx+off,-1.65,zc+side*11.48],WHITE)}
  const aspects=i%3===0?[GREEN,RED]:i%3===1?[AMBER,GREEN]:[GREEN,AMBER];
  for(const [z,m] of [[zc-10.25,aspects[0]],[zc+10.25,aspects[1]]]){box(seg,[.11,1.65,.11],[cx+17,-2.65,z],METAL);box(seg,[.36,.52,.18],[cx+17,-1.72,z],DARK);box(seg,[.20,.20,.05],[cx+17,-1.65,z+(z<zc?.1:-.1)],m)}
  box(seg,[7.5,3.8,.22],[cx-12,-1.65,zc-11.45],DARK,.18);box(seg,[7.5,3.8,.22],[cx+12,-1.65,zc+11.45],DARK,-.18);
}
async function install(){for(let i=0;i<600;i++){
  const game=globalThis.__berlinMetroGame;
  const chunk=game?[...game.world.chunks.values()].find(c=>c.station?.id==='alexanderplatz'):null;
  const line=chunk?.structure?.userData?.u8FullLine;
  if(line){line.segments?.forEach((s,i)=>decorate(s,i,line.zc));console.info('[Metro] U8 tunnel detail V1 ready');return}
  await new Promise(r=>setTimeout(r,100));
}}
install().catch(e=>console.error('[Metro] U8 tunnel detail failed',e));
