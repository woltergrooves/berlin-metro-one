import * as THREE from 'three';
(function trainPolish(THREE){
 const made=new WeakSet(),geoCache=new Map();
 const MAT={body:new THREE.MeshLambertMaterial({color:0xe0d9c9}),edge:new THREE.MeshLambertMaterial({color:0x34383c}),door:new THREE.MeshLambertMaterial({color:0xf0c421}),blue:new THREE.MeshLambertMaterial({color:0x163d68}),glass:new THREE.MeshLambertMaterial({color:0x657f8b}),seat:new THREE.MeshLambertMaterial({color:0x586269}),metal:new THREE.MeshLambertMaterial({color:0xb5bab9}),light:new THREE.MeshBasicMaterial({color:0xfff3ce})};
 const g=size=>{const k=size.join(",");if(!geoCache.has(k))geoCache.set(k,new THREE.BoxGeometry(...size));return geoCache.get(k)};
 function box(parent,size,pos,material){const mesh=new THREE.Mesh(g(size),material);mesh.position.set(...pos);parent.add(mesh);return mesh}
 function same(v,w){return Math.abs(v-w)<.025}
 function install(train){const d=train?.userData?.u8;if(!d||!d.__fullLine||made.has(train))return false;made.add(train);
  const keepDoors=new Set(d.doors.flatMap(x=>[x.a,x.b]));
  for(const ch of [...train.children]){
   if(keepDoors.has(ch))continue;
   const p=ch.geometry?.parameters||{},w=p.width,h=p.height,z=p.depth;
   if(ch.isMesh&&ch.geometry?.type==="BoxGeometry"&&((same(w,24)&&same(h,3.15)&&same(z,3.3))||(same(w,24)&&(same(h,.22)||same(h,.25))&&same(z,3.34))||(same(w,2.4)&&same(h,1.15)&&same(z,.08))))train.remove(ch);
  }
  const root=new THREE.Group();root.name="U8CarriageVisualV3";train.add(root);
  box(root,[24,.22,3.32],[0,.1,0],MAT.edge);box(root,[24,.2,3.32],[0,3.1,0],MAT.body);
  box(root,[24,.10,3.40],[0,2.96,0],MAT.blue);
  for(const side of [-1,1]){
    const z=side*1.68;
    box(root,[24,.55,.13],[0,.37,z],MAT.body);
    box(root,[24,.57,.13],[0,2.70,z],MAT.body);
    for(const x of(side===d.platformSide?[-11.83,-10.8,-4.98,0,4.98,10.8,11.83]:[-11.83,-8.9,-5.45,-2,2,5.45,8.9,11.83]))box(root,[.18,2.2,.17],[x,1.53,z],MAT.body);
    for(const x of(side===d.platformSide?[-10.4,-5.05,0,5.05,10.4]:[-10.2,-6.8,-.1,6.8,10.2]))box(root,[1.48,1.12,.07],[x,1.72,side*1.757],MAT.glass);
    box(root,[24,.07,.15],[0,2.96,side*1.69],MAT.blue);
  }
  for(const {a,b} of d.doors){for(const door of[a,b]){door.material=MAT.door;const side=d.platformSide<0?-1:1;box(door,[.64,.88,.035],[0,.28,side*.07],MAT.glass)}}
  for(const x of[-9,-5,-1,3,7]){box(root,[1.7,.33,.73],[x,.56,-1.1],MAT.seat);box(root,[1.7,.33,.73],[x,.56,1.1],MAT.seat)}
  for(const x of[-8,-2.5,3,8])box(root,[.06,2.35,.06],[x,1.69,0],MAT.metal);
  for(const x of[-10,-5,0,5,10])box(root,[2.4,.05,.38],[x,2.93,0],MAT.light);
  for(const x of[-11.96,11.96])box(root,[.10,3.06,3.30],[x,1.56,0],MAT.body);
  const c=document.createElement("canvas");c.width=512;c.height=128;const ctx=c.getContext("2d");ctx.fillStyle="#f0c421";ctx.fillRect(0,0,512,128);ctx.fillStyle="#173b69";ctx.fillRect(8,8,140,112);ctx.fillStyle="white";ctx.font="900 69px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("U8",78,64);ctx.textAlign="left";ctx.fillStyle="#111";ctx.font="700 32px Arial";ctx.fillText(d.direction<0?"Wittenau":"Hermannstraße",168,68,320);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;const mt=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
  for(const side of[-1,1]){const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.43),mt);sign.position.set(side*12.07,2.53,0);sign.rotation.y=side*Math.PI/2;root.add(sign)}
  train.userData.u8CarriagePolish={version:3,interior:true,exterior:true,doorsPreserved:d.doors.length,side:d.platformSide};
  return true
 }
 function tick(){const trains=window.__berlinMetroU8Trains||window.BerlinLife?.game?.u8Trains||[];if(Array.isArray(trains))for(const t of trains)install(t)}
 window.BerlinU8CarriagePolish={version:3,check:()=>{tick();return(window.__berlinMetroU8Trains||[]).map(t=>t.userData.u8CarriagePolish||null)}};
 tick();setInterval(tick,1200);console.info("[Berlin Life] U8 modular U2-style carriage, doors & service preserved");
})(THREE);