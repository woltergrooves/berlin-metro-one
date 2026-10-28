import { Tick } from '../state/Tick.js';
import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {Game} from '../core/Game.js';

// A visual layer only. The existing floor boundaries, service, interactions and exits remain authoritative.
const BASE = new URL('/assets/stations/', location.href);
const loader = new GLTFLoader(), assets = new Map(), records = new Map(), pending = new Map();
const queue = []; let busy = 0, game = null, nextScan = 0;
const SIGN_GEOMETRY = new THREE.PlaneGeometry(6.2,.76);
const status = {version:8,total:53,installed:0,loads:0,errors:[],byLine:{U2:0,U8:0}};
let profiles = new Map();
const manifestReady = fetch(new URL('stations.json',BASE)).then(r=>{if(!r.ok)throw new Error('Station manifest '+r.status);return r.json()}).then(m=>{
 if(m.stations?.length!==53)throw new Error('Incomplete station manifest');
 profiles=new Map(m.stations.map(p=>[`${p.line}:${p.id}`,p]));return m;
}).catch(e=>{status.errors.push(String(e.message));console.warn('[Berlin Life] Station models unavailable; original stations retained',e);return null});
const connected = parent => {for(let p=parent;p;p=p.parent)if(p.isScene)return true;return false};

function pump(){
 while(busy<2&&queue.length){const task=queue.shift();busy++;
  (async()=>{
   const response=await fetch(new URL(task.profile.file,BASE));if(!response.ok)throw new Error('Station asset '+response.status);
   const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   const gltf=await loader.parseAsync(bytes,BASE.href);
   if(!gltf.scene.getObjectByName('Station_Floor')||!gltf.scene.getObjectByName('Station_Accent'))throw new Error('Invalid station mesh');
   gltf.scene.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=false;n.geometry.computeBoundingSphere();for(const m of(Array.isArray(n.material)?n.material:[n.material]))if(m?.transparent)m.forceSinglePass=true;}});
   task.template=gltf.scene;task.state='ready';task.last=performance.now();status.loads++;task.resolve(task.template);
  })().catch(e=>{task.state='failed';task.failedAt=performance.now();status.errors.push(`${task.key}: ${e.message}`);console.warn('[Berlin Life] Original station retained',task.key,e);task.resolve(null)}).finally(()=>{busy--;pump();});
 }
}
function load(profile){
 const key=`${profile.line}:${profile.id}`;let task=assets.get(key);
 if(task&&task.state==='failed'&&performance.now()-task.failedAt>15000){assets.delete(key);task=null;}
 if(task){task.last=performance.now();return task.promise;}
 task={key,profile,state:'queued',last:performance.now(),refs:0};task.promise=new Promise(resolve=>task.resolve=resolve);assets.set(key,task);queue.push(task);pump();return task.promise;
}
function trim(){
 const unused=[...assets.values()].filter(a=>a.state==='ready'&&!a.refs).sort((a,b)=>a.last-b.last);
 while(assets.size>14&&unused.length){const a=unused.shift();assets.delete(a.key);const geometries=new Set(),materials=new Set(),textures=new Set();a.template.traverse(n=>{if(!n.isMesh)return;geometries.add(n.geometry);for(const m of(Array.isArray(n.material)?n.material:[n.material])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}
}
function signage(root,profile){
 const c=document.createElement('canvas');c.width=1024;c.height=144;const x=c.getContext('2d');if(!x)throw new Error('Station sign canvas unavailable');
 x.fillStyle=profile.line==='U8'?'#171d1b':'#e9e5dc';x.fillRect(0,0,1024,144);x.fillStyle='#'+profile.accent;x.fillRect(0,0,1024,7);x.fillRect(0,137,1024,7);
 x.fillStyle=profile.line==='U8'?'#f6f2e7':'#172124';x.font=`700 ${profile.name.length>25?39:profile.name.length>19?45:56}px Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(profile.name,512,76,960);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});const signs=new THREE.InstancedMesh(SIGN_GEOMETRY,material,6);signs.name='BlenderStationNames';
 const dummy=new THREE.Object3D(),ys=profile.line==='U2'?[-8.8,9.2]:[-12,12],xs=profile.line==='U2'?[-18,0,18]:[-15,0,15];let i=0;
 for(const y of ys)for(const along of xs){dummy.position.set(along,2.30,-y+Math.sign(y)*.17);dummy.rotation.set(0,y>0?0:Math.PI,0);dummy.updateMatrix();signs.setMatrixAt(i++,dummy.matrix)}
 signs.instanceMatrix.needsUpdate=true;signs.computeBoundingSphere();root.add(signs);return{material,texture,signs};
}
function dims(node){const p=node.geometry?.parameters;if(!p)return null;return[(p.width||0)*node.scale.x,(p.height||0)*node.scale.y,(p.depth||0)*node.scale.z];}
function cosmeticGroup(node){
 return node.isGroup&&!node.name&&node.children.length===6&&node.children.filter(n=>n.isGroup).length===2&&node.children.filter(n=>n.isMesh&&n.geometry?.parameters?.width===1).length===4;
}
function oldPart(node,record){
 if(node===record.root||record.keep.has(node)||node.userData?.interaction)return false;
 if(cosmeticGroup(node))return true;
 if(!node.isMesh)return false;
 const p=node.geometry?.parameters,position=node.position;
 if(record.line==='U2'){
  if(node.isInstancedMesh)return node.count===29;
  const dz=position.z-record.station.z;
  if(Math.abs(dz)>34.6||position.x< -7||position.x>12.5||position.y<-.65||position.y>4.7)return false;
  if(record.station.id==='alexanderplatz'&&dz>=25.5&&p&&p.depth<=1.10&&p.width<=3.2&&Math.abs(position.x-2.55)<1.9)return false;
  if(node.geometry?.type==='PlaneGeometry')return position.x< -5.6||position.x>11.1||[7.3,7.4,6.6,3.7].some(w=>Math.abs(p?.width-w)<.03);
  return node.geometry?.type==='BoxGeometry'||node.geometry?.type==='CylinderGeometry';
 }
 // U8 station roots use world coordinates in their old children.
 if(record.mixed){
  const dx=position.x-record.cx,dz=position.z-record.zc;if(Math.abs(dx)>26.2||Math.abs(dz)>12.6)return false;
  if(p&&p.width<1.2&&p.depth>=6.5)return false; // Physical Alexanderplatz stair treads / handrails.
  if(position.y>-.78&&!(p?.width>35&&p?.height<.6&&p?.depth>10))return false;
 }
 if(node.geometry?.type==='PlaneGeometry'){
  if(node.userData?.u8DepartureBoard||node.userData?.u8InfoV3)return false;
  return Math.abs(p?.width-7.8)<.1||Math.abs(p?.width-6.3)<.1;
 }
 return node.geometry?.type==='BoxGeometry'||node.geometry?.type==='CylinderGeometry';
}
function hide(record){
 // Only remove the old RENDERED geometry; collisions, exits, boards and interaction objects remain functional.
 const source=record.visualSource;
 source.updateWorldMatrix(true,true);
 const pWorld=new THREE.Vector3(),keepAncestor=(node)=>{
  for(let x=node;x&&x!==source;x=x.parent){
   if(x===record.root||x.name?.startsWith('Blender')||x.name?.startsWith('NPC_')||x.name?.startsWith('Prop_')||x.userData?.interaction||record.keep.has(x)||(record.line==='U2'&&x.userData?.u8FullLine)||x.userData?.blenderTrain)return true;
   if(x.userData?.u8?.doors||x.userData?.u8InfoV3||x.userData?.u8DepartureBoard)return true;
  }return false;
 };
 source.traverse(node=>{
  // Legacy life/visual mods create additional named scene groups inside the
  // existing station root, not only at top-level scene.children.
  if(node!==source&&node.isGroup&&LEGACY_SCENE_VISUAL.test(node.name||'')){
   if(!keepAncestor(node)){
    disableVisualGroup(node);
   }
   return;
  }
  if(!node.isMesh&&!node.isInstancedMesh)return;
  if(keepAncestor(node))return;
  // Keep through-tunnels outside platform bounds intact.
  node.getWorldPosition(pWorld);
  if(record.line==='U2'){
   const dz=Math.abs(pWorld.z-record.station.z);
   if(dz>34.6||pWorld.x< -7.8||pWorld.x>12.8||pWorld.y<-.7||pWorld.y>8.5)return;
  }else {
   const cx=record.cx,zc=record.zc;
   if(Math.abs(pWorld.x-cx)>33||Math.abs(pWorld.z-zc)>18||pWorld.y< -7||pWorld.y>8)return;
  }
  if(!record.hidden.has(node))record.hidden.set(node,node.visible);
  node.visible=false;
 });
}
function install(parent,line,station,profile,template,mixed=false){
 if(records.has(parent)||!connected(parent))return;
 const root=template.clone(true);root.name=`BlenderStation:${line}:${profile.id}`;
 const alex=game.stations.find(s=>s.id==='alexanderplatz');const cx=line==='U8'?61+(profile.index-14)*84:0,zc=(alex?.z||0)+49;
 if(line==='U2'){root.position.set(2.55,0,station.z);root.rotation.y=-Math.PI/2}else root.position.set(cx,-4,zc);
 const signs=signage(root,profile);const keep=new Set();
 if(line==='U2')for(const board of game.world.chunks.get(station.index)?.boards||[])keep.add(board.group);
 const record={parent,visualSource:mixed?parent.parent:parent,line,station,profile,root,mixed,cx,zc,hidden:new Map(),keep,signs,asset:assets.get(`${line}:${profile.id}`)};
 parent.add(root);records.set(parent,record);record.asset.refs++;
 // BVG departure boards are functional, not legacy station shells. Lower them
 // below the new Blender beams to avoid depth fighting with station roofs.
 if(line==='U2'){
  for(const board of game.world.chunks.get(station.index)?.boards||[]){
   if(board.group&&board.group.position.y>2.5)board.group.position.y=2.42;
  }
 }
 hide(record);refreshStatus();
 parent.userData.blenderStation={version:2,id:profile.id,line,name:profile.name,family:profile.family,provenance:profile.provenance,layoutAdapted:profile.layoutAdapted};
}
function drop(record){
 for(const[node,visible]of record.hidden)node.visible=visible;record.root.removeFromParent();record.signs.signs.dispose();record.signs.material.dispose();record.signs.texture.dispose();record.asset.refs=Math.max(0,record.asset.refs-1);records.delete(record.parent);delete record.parent.userData.blenderStation;
}
function refreshStatus(){status.installed=records.size;status.byLine={U2:0,U8:0};for(const r of records.values())status.byLine[r.line]++;}
function request(parent,line,station,mixed=false){
 if(records.has(parent)||pending.has(parent))return;const profile=profiles.get(`${line}:${station.id}`);if(!profile)return;
 const key=Symbol();pending.set(parent,key);
 load(profile).then(template=>{if(pending.get(parent)!==key)return;pending.delete(parent);if(!template||!connected(parent))return;try{install(parent,line,station,profile,template,mixed)}catch(e){status.errors.push(`${line}:${station.id}: ${e.message}`);console.warn('[Berlin Life] Station visual layer skipped',e)}});
}
function stationRoots(){
 const chunks=[...game.world.chunks.values()],alex=game.stations.find(s=>s.id==='alexanderplatz');let lineRoot=null;
 for(const chunk of chunks)if(chunk.structure.userData?.u8FullLine){lineRoot=chunk.structure;break}
 return{chunks,alex,lineRoot,line:lineRoot?.userData?.u8FullLine};
}
function scan(){
 if(!game||!profiles.size)return;const p=game.player,{chunks,alex,lineRoot,line}=stationRoots();
 for(const r of [...records.values()])if(!connected(r.parent))drop(r);
 for(const c of chunks.sort((a,b)=>Math.abs(a.station.z-p.position.z)-Math.abs(b.station.z-p.position.z)))request(c.structure,'U2',c.station);
 const inU8=!!p.__u8Active||Number.isInteger(p.__u8FullStation)||!!p.__u8Area||!!(alex&&p.position.z>alex.z+39&&Math.abs(p.position.z-alex.z-49)<16);
 // Alexanderplatz shares one structural root with U2, so its U8 visual wrapper is separate.
 if(lineRoot&&inU8){
  let wrapper=lineRoot.userData.blenderU8AlexParent;
  if(!wrapper){wrapper=new THREE.Group();wrapper.name='BlenderU8AlexWrapper';lineRoot.add(wrapper);lineRoot.userData.blenderU8AlexParent=wrapper;}
  const center=61+((Number.isInteger(p.__u8FullStation)?p.__u8FullStation:14)-14)*84,anchor=p.__u8Active?p.position.x:center;
  const candidates=[{index:14,parent:wrapper,mixed:true},...(line?.groups||[]).flatMap((g,i)=>g?[{index:i,parent:g,mixed:false}]:[])];
  for(const c of candidates.sort((a,b)=>Math.abs((61+(a.index-14)*84)-anchor)-Math.abs((61+(b.index-14)*84)-anchor))){
   const dist=Math.abs(61+(c.index-14)*84-anchor);
   if(dist<=190){request(c.parent,'U8',{id:c.index,index:c.index},c.mixed);}
   else if(dist>275&&records.has(c.parent))drop(records.get(c.parent));
  }
  // The shared root's old U8 platform pieces are hidden only after its model has loaded.
  const alexRecord=records.get(wrapper);if(alexRecord)hide(alexRecord);
 }
 refreshStatus();trim();
}
// Disable the orphaned legacy decoration layers that live directly in the scene,
// outside the streamed station roots. They are not interaction / collision objects.
const LEGACY_SCENE_VISUAL=/^(?:AlexanderDetail:U[28]|Phase[0-9]+(?:U[28]|Alex)(?:TextureV[0-9]+)?|GfxV[0-9]+U[28]|P[0-9]+U[28](?:Map)?|StationVisual:U[28])/;
const disabledVisualRoots=new Set();
let nextLegacySweep=0;
// Visual-only groups from former rendering phases are continually re-enabled
// by the old runtime. Lock *only* those groups to invisible; never touch
// functional collision meshes, station portals, UI or train/NPC roots.
function disableVisualGroup(node){
 if(!node||node.userData?.interaction||!LEGACY_SCENE_VISUAL.test(node.name||''))return;
 if(disabledVisualRoots.has(node))return;
 node.visible=false;
 Object.defineProperty(node,'visible',{
  configurable:true,enumerable:true,get(){return false},set(_ignored){}
 });
 disabledVisualRoots.add(node);
}
function hideSceneVisualLayers(){
 if(!game||!records.size)return;
 // Legacy U8 decoration may be nested two or more levels below the scene.
 game.scene.traverse(child=>{
  if(child.isGroup&&LEGACY_SCENE_VISUAL.test(child.name||''))disableVisualGroup(child);
 });
}
function keepLateDecorHidden(){
 if(!game)return;
 const now=performance.now(),p=game.player;
 if(now>nextLegacySweep){
  nextLegacySweep=now+400;
  for(const record of records.values())if(connected(record.parent))hide(record);
  hideSceneVisualLayers();
 }
 // Old life-patches can restore .visible every game tick: enforce cached
 // visibility without traversing thousands of meshes each animation frame.
 for(const record of records.values()){
  for(const node of record.hidden.keys())if(node.visible)node.visible=false;
 }
 for(const child of disabledVisualRoots)if(child.visible)child.visible=false;
 const v=game.__stationLifeVisualV72;
 if(v){
  if([...records.values()].some(r=>r.line==='U2'&&r.station.id===p.currentStation?.id))v.u2.visible=false;
  const index=Number.isInteger(p.__u8FullStation)?p.__u8FullStation:14;
  if([...records.values()].some(r=>r.line==='U8'&&r.profile.index===index))v.u8.visible=false;
 }
}
function attach(value){
 if(value.__blenderStationsV1)return;value.__blenderStationsV1=true;game=value;
 // The U8 network lives below Alexanderplatz's streamed U2 chunk. Retain that
 // one transfer root so a distant U2 visit cannot dispose the existing U8 service.
 const unload=value.world.unload.bind(value.world);
 value.world.unload=function(index){const chunk=this.chunks.get(index);if(chunk?.station?.id==='alexanderplatz'&&chunk.structure.userData?.u8FullLine)return;return unload(index)};
 value.world.__blenderTransferPinned=true;
 const render=value.renderer.render,daySky=new THREE.Color(0x9db7c5);
 value.renderer.render=function(scene,camera){
  const now=performance.now();if(now>=nextScan){nextScan=now+500;scan()}keepLateDecorHidden();
  const p=value.player,st=p.currentStation;
  const outside=!p.__streetMode&&!p.__u8Active&&!Number.isInteger(p.__u8FullStation)&&st&&Math.abs(p.position.z-st.z)<45&&[...records.values()].some(r=>r.line==='U2'&&r.station.id===st.id&&r.profile.openAir);
  p.__openAirStation=!!outside;
  const background=scene.background,oldFog=outside&&scene.fog?.color.clone();
  if(outside){scene.background=daySky;if(scene.fog)scene.fog.color.copy(daySky);}
  try{return render.call(this,scene,camera)}finally{scene.background=background;if(oldFog&&scene.fog)scene.fog.color.copy(oldFog);}
 };
 void manifestReady.then(()=>scan());
}
const start=Game.prototype.start;Game.prototype.start=function(...args){const result=start.apply(this,args);attach(this);return result};
const discovery=Tick.every('stations.glb-discover',700,()=>{if(game){Tick.cancel(discovery);return}const candidate=window.__berlinMetroGame||window.BerlinLife?.game;if(candidate?.renderer&&candidate?.world)attach(candidate)});
window.BerlinBlenderStations={version:2,get status(){return JSON.parse(JSON.stringify(status))},check:()=>({ ...JSON.parse(JSON.stringify(status)),queued:queue.length,loading:busy,cached:assets.size,disabledLegacyLayers:disabledVisualRoots.size,stations:[...records.values()].map(r=>({line:r.line,id:r.profile.id,name:r.profile.name,family:r.profile.family,visible:r.parent.visible,connected:connected(r.parent)}))})};
console.info('[Berlin Life] 53-platform Blender station pipeline ready');
