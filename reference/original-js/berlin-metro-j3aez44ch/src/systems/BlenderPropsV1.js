import * as THREE from 'three';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {WorldStreamer} from 'https://berlin-metro-hwabi9n6s-wolter1.vercel.app/src/world/WorldStreamer.js';
const status={version:1,loaded:false,replaced:0,bins:0,errors:[]};
let templates=null;const worlds=new Set(),done=new WeakSet();
const ready=new GLTFLoader().loadAsync(new URL('../../assets/props/metro-props.glb',import.meta.url).href).then(g=>{
 templates={};for(const name of ['Bench','TicketMachine','Can','Bottle','Bin']){templates[name]=g.scene.getObjectByName('Prop_'+name);if(!templates[name])throw Error('Missing prop '+name)}
 status.loaded=true;for(const w of worlds)for(const chunk of w.chunks.values())install(chunk);return templates;
}).catch(e=>{status.errors.push(String(e.message||e));console.error('[Berlin Life] Prop GLB unavailable',e);return null});
function replace(group,name){
 if(!group||done.has(group)||!templates?.[name])return;
 const model=templates[name].clone(true);model.name='BlenderProp_'+name;
 for(const child of group.children){child.traverse(o=>{if(o.isMesh)o.visible=false})}
 group.add(model);done.add(group);status.replaced++;
}
function install(chunk){
 if(!templates||!chunk?.gameplay)return;
 const ticket=chunk.gameplay.ticketMachine, items=chunk.gameplay.items||[],parent=ticket?.parent;
 if(!parent)return;
 for(const bench of parent.children.filter(n=>n.isGroup&&!n.userData?.interaction).slice(0,2))replace(bench,'Bench');
 replace(ticket,'TicketMachine');
 for(const item of items){const type=item.children.some(x=>x.isMesh&&x.geometry?.type==='CylinderGeometry'&&x.geometry?.parameters?.height>.34)?'Bottle':(item.children.length>1?'Bottle':'Can');replace(item,type)}
 if(!chunk.structure.userData.blenderBins){
  chunk.structure.userData.blenderBins=true;
  for(const zOffset of [-23,23]){
   const model=templates.Bin.clone(true);model.name='BlenderProp_Bin';model.position.set(5.95,0,chunk.station.z+zOffset);
   chunk.structure.add(model);status.bins++;
  }
 }
}
const orig=WorldStreamer.prototype.load;
WorldStreamer.prototype.load=function(index,...args){const existed=this.chunks.has(index),result=orig.call(this,index,...args);worlds.add(this);if(!existed)install(this.chunks.get(index));return result};
void ready;
window.BerlinBlenderProps={get status(){return {...status}},check:()=>({...status})};
