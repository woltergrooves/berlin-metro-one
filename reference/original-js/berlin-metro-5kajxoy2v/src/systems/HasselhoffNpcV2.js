import * as THREE from 'three';
import {Game} from 'https://berlin-metro-hwabi9n6s-wolter1.vercel.app/src/core/Game.js';
import {createHoffPatrol,stepHoffPatrol} from 'https://berlin-metro-1pqe1mlbu-wolter1.vercel.app/src/systems/HoffPatrol.js';

export function buildHasselhoff(){
  const root=new THREE.Group();root.name='DavidHasselhoff';
  const boxGeometry=new THREE.BoxGeometry(1,1,1),curlGeometry=new THREE.IcosahedronGeometry(.115,0);
  const materials={skin:new THREE.MeshLambertMaterial({color:0xd4a17e}),jacket:new THREE.MeshLambertMaterial({color:0x191b20}),shirt:new THREE.MeshLambertMaterial({color:0x991c2c}),jeans:new THREE.MeshLambertMaterial({color:0x344d6b}),hair:new THREE.MeshLambertMaterial({color:0x332017}),black:new THREE.MeshLambertMaterial({color:0x111316}),white:new THREE.MeshLambertMaterial({color:0xf3e8d8})};
  function box(parent,size,position,material){const mesh=new THREE.Mesh(boxGeometry,material);mesh.scale.set(...size);mesh.position.set(...position);parent.add(mesh);return mesh;}
  box(root,[.54,.7,.29],[0,1.25,0],materials.jacket);box(root,[.18,.53,.025],[0,1.27,.16],materials.shirt);
  for(const side of[-1,1]){const lapel=box(root,[.07,.32,.03],[side*.13,1.48,.18],materials.jacket);lapel.rotation.z=side*.22;}
  box(root,[.16,.14,.16],[0,1.66,0],materials.skin);box(root,[.34,.4,.3],[0,1.87,.015],materials.skin);
  for(const side of[-1,1]){box(root,[.047,.045,.015],[side*.083,1.9,.173],materials.white);box(root,[.021,.029,.015],[side*.083,1.9,.185],materials.black);box(root,[.076,.026,.02],[side*.084,1.96,.174],materials.hair);box(root,[.05,.13,.09],[side*.185,1.87,.01],materials.skin);}
  box(root,[.045,.065,.04],[0,1.85,.185],materials.skin);box(root,[.105,.018,.019],[0,1.765,.172],materials.shirt);box(root,[.36,.13,.31],[0,2.06,.005],materials.hair);
  for(const [x,y,z] of [[-.15,2.05,.08],[0,2.13,.03],[.15,2.05,.08],[-.15,2,-.08],[.15,2,-.08],[-.05,2.12,-.09],[.08,2.12,-.09]]){const curl=new THREE.Mesh(curlGeometry,materials.hair);curl.position.set(x,y,z);root.add(curl);}
  const legs=[],arms=[];for(const side of[-1,1]){const leg=new THREE.Group();leg.position.set(side*.14,.94,0);root.add(leg);box(leg,[.21,.75,.22],[0,-.36,0],materials.jeans);box(leg,[.22,.15,.34],[0,-.79,.05],materials.black);legs.push(leg);const arm=new THREE.Group();arm.position.set(side*.36,1.53,0);root.add(arm);box(arm,[.16,.6,.21],[0,-.25,0],materials.jacket);box(arm,[.14,.16,.16],[0,-.62,0],materials.skin);arms.push(arm);}
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const context=canvas.getContext('2d');context.fillStyle='#111b';context.fillRect(0,0,512,96);context.fillStyle='#f1d26a';context.font='800 42px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText('David Hasselhoff',256,48);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true}));label.scale.set(2.25,.42,1);label.position.y=2.48;root.add(label);return{root,legs,arms};
}
function install(game){
  if(game.__hoffNpc)return;game.__hoffNpc=true;const alex=game.stations.find(st=>st.id==='alexanderplatz');if(!alex)return;
  const npc=buildHasselhoff(),patrol=createHoffPatrol();npc.root.visible=false;npc.root.position.set(patrol.x,0,alex.z+patrol.z);npc.root.userData.pausePatrol=false;npc.root.userData.__patrol=patrol;game.scene.add(npc.root);
  let sheet=null,visible=false;
  function close(){sheet?.remove();sheet=null;npc.root.userData.pausePatrol=false;}
  function talk(){if(!visible||sheet)return;npc.root.userData.pausePatrol=true;sheet=document.createElement('div');sheet.id='hoffConversation';sheet.style.cssText='position:fixed;inset:0;z-index:22000;display:flex;align-items:flex-end;justify-content:center;background:#0007;color:#fff;font-family:Arial';const card=document.createElement('div');card.style.cssText='width:min(480px,100vw);padding:20px 20px max(20px,env(safe-area-inset-bottom));border-radius:20px 20px 0 0;background:#171c25;border-top:2px solid #e9bd22';card.innerHTML='<h2>David Hasselhoff</h2><p>Berlin has always been special to me.</p>';const button=document.createElement('button');button.textContent='Sluiten';button.style.cssText='display:block;width:100%;padding:13px;border:0;border-radius:10px;background:#303a49;color:#fff;font-weight:800';button.onclick=close;card.appendChild(button);sheet.onclick=e=>{if(e.target===sheet)close()};sheet.appendChild(card);document.body.appendChild(sheet);}
  npc.root.userData.interaction={kind:'npc',id:'david-hasselhoff',label:'Praat met David Hasselhoff',action:talk};
  const focus=game.ui.onInteractionFocus;game.ui.onInteractionFocus=function(interaction){if(interaction?.id==='david-hasselhoff'){const b=this.interactButton;b.textContent='PRAAT MET DAVID';b.classList.remove('hidden');return;}return focus.call(this,interaction);};
  const base=game.loop;let last=performance.now();game.loop=function(){const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;const p=game.player,next=p.currentStation?.id==='alexanderplatz'&&!p.activeTrain&&!p.__u8Active&&!p.__u8Area&&!Number.isInteger(p.__u8FullStation)&&!p.__streetMode;if(next!==visible){visible=next;npc.root.visible=visible;if(visible)game.interaction.add(npc.root);else{game.interaction.remove(npc.root);close();}}
    if(visible){patrol.paused=!!npc.root.userData.pausePatrol;stepHoffPatrol(patrol,dt);npc.root.position.set(patrol.x,0,alex.z+patrol.z);npc.root.rotation.y=patrol.yaw;const swing=patrol.moving&&!patrol.paused?Math.sin(patrol.walkTime*8)*.4:0;npc.legs[0].rotation.x=swing;npc.legs[1].rotation.x=-swing;npc.arms[0].rotation.x=-swing*.65;npc.arms[1].rotation.x=swing*.65;}
    return base();};game.renderer.setAnimationLoop(game.loop);game.hasselhoffNpcVersion='V2-pauseable';
}
const start=Game.prototype.start;Game.prototype.start=function(){const r=start.call(this);install(this);return r;};
