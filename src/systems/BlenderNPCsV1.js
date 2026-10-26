import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {NpcSystem} from './NpcSystem.js';
import {Game} from '../core/Game.js';
const status={version:5,loaded:false,converted:0,hoffLoaded:false,errors:[]};
let templates=null;const converted=new WeakSet();let current=null;
const parts={Torso:'torso',Head:'head',LegL:'ll',LegR:'rl',ArmL:'la',ArmR:'ra',Phone:'phone'};
const models=['NPC_Traveler','NPC_Local','NPC_Staff','NPC_Clubber'];
const loader=new GLTFLoader();
const ready=loader.loadAsync(new URL('/assets/actors/metro-npcs.glb', location.href).href).then(g=>{
 templates=new Map(models.map(name=>[name,g.scene.getObjectByName(name)]));
 if([...templates.values()].some(v=>!v))throw Error('Incomplete NPC GLB');
 status.loaded=true;return templates;
}).catch(e=>{status.errors.push(String(e.message||e));console.error('[Berlin Life] NPC GLB unavailable',e);return null});
function convert(n){
 if(!templates||converted.has(n)||!n?.g)return;
 const key=models[(Math.abs(Math.floor((n.phase||0)*12)))%models.length];
 const model=templates.get(key).clone(true);model.name='BlenderNPC_'+key;model.rotation.y=Math.PI; // GLB face is -Z; navigation faces +Z
 const bones={};for(const name of Object.keys(parts)){
 // GLTFLoader suffixes repeated part names across the 4 character variants.
 model.traverse(child=>{
  if(bones[name])return;
  if(child.name===name||child.name.startsWith(name+'_'))bones[name]=child;
 });
}
 if(Object.values(bones).some(x=>!x))return;
 n.g.add(model);n.__blenderActor={model,bones};
 for(const field of Object.values(parts))if(n[field])n[field].visible=false;
 converted.add(n);status.converted++;
}

let hoffReplacement=null;
function swapHoff(game){
 if(!templates||!game?.scene)return;
 const hoff=game.scene.getObjectByName('DavidHasselhoff');
 if(!hoff)return;
 if(!hoffReplacement){
  const template=templates.get('NPC_Clubber');if(!template)return;
  const model=template.clone(true);
  model.name='BlenderHoff';model.rotation.y=Math.PI;
  model.scale.setScalar(1.12);
  const palette={Jacket:0x1a1c20,Sleeve:0x1a1c20,Shirt:0xa02437,Trouser:0x344d6b,Hair:0x302018,Sneaker:0x17191c};
  model.traverse(node=>{
   if(!node.isMesh)return;
   const prefix=Object.keys(palette).find(key=>node.name===key||node.name.startsWith(key+'_'));
   if(prefix&&node.material){
    node.material=node.material.clone();
    node.material.color.setHex(palette[prefix]);
   }
  });
  const part=name=>{let match=null;model.traverse(node=>{if(!match&&(node.name===name||node.name.startsWith(name+'_')))match=node});return match};
  hoff.add(model);
  const limbGroups=hoff.children.filter(child=>child.isGroup&&child!==model);
  hoffReplacement={hoff,model,legs:[part('LegL'),part('LegR')],arms:[part('ArmL'),part('ArmR')],
   sourcesLegs:limbGroups.filter(child=>Math.abs(child.position.y-.94)<.07),
   sourcesArms:limbGroups.filter(child=>Math.abs(child.position.y-1.53)<.07)};
  status.hoffLoaded=true;
 }
 if(hoffReplacement?.hoff!==hoff)return;
 for(const child of hoff.children){
  if(child===hoffReplacement.model||child.isSprite)continue;
  child.traverse(node=>{if(node.isMesh&&node.visible)node.visible=false});
 }
 for(let i=0;i<2;i++){
  if(hoffReplacement.legs[i]&&hoffReplacement.sourcesLegs[i])
   hoffReplacement.legs[i].rotation.copy(hoffReplacement.sourcesLegs[i].rotation);
  if(hoffReplacement.arms[i]&&hoffReplacement.sourcesArms[i])
   hoffReplacement.arms[i].rotation.copy(hoffReplacement.sourcesArms[i].rotation);
 }
}

function syncEveryVisibleActor(system){
 if(!templates)return;
 swapHoff(system?.game||window.BerlinLife?.game||window.__berlinMetroGame);
 if(!system?.n)return;
 current=system;
 for(const n of system.n){
  try{
   convert(n);
   if(!n.__blenderActor)continue;
   for(const [label,source]of Object.entries(parts)){
    const bone=n.__blenderActor.bones[label],original=n[source];
    if(!bone||!original)continue;
    const shouldDisplay=(label==='Phone'&&original.visible);
    bone.position.copy(original.position);
    bone.rotation.copy(original.rotation);
    if(label==='Phone')bone.visible=shouldDisplay;
    // Never allow legacy NPC geometry to be drawn, even if other pose systems
    // re-enable old limbs every frame.
    original.visible=false;
   }
  }catch(e){if(status.errors.length<10)status.errors.push('actor sync: '+String(e.message||e))}
 }
}
const make=NpcSystem.prototype.make;
NpcSystem.prototype.make=function(...args){const n=make.apply(this,args);convert(n);return n};
const update=NpcSystem.prototype.update;
NpcSystem.prototype.update=function(...args){
 const result=update.apply(this,args);current=this;
 syncEveryVisibleActor(this);
 return result;
};
// Integrate AFTER every legacy NPC pose update: the renderer hook is independent
// of later patches that replace NpcSystem.update during legacy boot.
const previousStart=Game.prototype.start;
Game.prototype.start=function(...args){
 const result=previousStart.apply(this,args);
 if(!this.__berlinBlenderNpcRendererPatched&&this.renderer){
  this.__berlinBlenderNpcRendererPatched=true;
  const game=this,render=this.renderer.render;
  this.renderer.render=function(...renderArgs){
   syncEveryVisibleActor(game.npcSystem);
   return render.apply(this,renderArgs);
  };
 }
 return result;
};

// The legacy game patches start/update more than once. Observe the LIVE
// renderer instead of assuming that our prototype wrapper remains last.
setInterval(()=>{
 const game=window.BerlinLife?.game||window.__berlinMetroGame||window.__berlinGame;
 if(!game?.renderer||!game?.npcSystem)return;
 const original=game.renderer.render;
 if(original.__berlinNPCGLBLastPass)return;
 const finalRender=function(...args){
  syncEveryVisibleActor(game.npcSystem);
  return original.apply(this,args);
 };
 finalRender.__berlinNPCGLBLastPass=true;
 game.renderer.render=finalRender;
},500);
void ready;
window.BerlinBlenderActors={get status(){return {...status,active:current?.n?.length||0}},check:()=>({...status,active:current?.n?.length||0})};
