import * as THREE from 'three';
const GREEN=0x48d474, AMBER=0xf2b632, RED=0xb73732, OFF=0x242729;
function lamp(train,dx,side){
  const m=new THREE.MeshBasicMaterial({color:OFF});
  const q=new THREE.Mesh(new THREE.BoxGeometry(.34,.16,.07),m);
  q.position.set(dx,2.15,side*1.49); q.userData.u8DoorLamp=true; train.add(q);
  return {q,m,side};
}
function label(train,side){
  const c=document.createElement('canvas');c.width=620;c.height=120;const x=c.getContext('2d');
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;
  const m=new THREE.MeshBasicMaterial({map:t,side:THREE.FrontSide});
  const q=new THREE.Mesh(new THREE.PlaneGeometry(3.45,.67),m);q.position.set(0,1.86,side*1.505);q.rotation.y=side>0?Math.PI:0;train.add(q);
  return {c,x,t,q,last:''};
}
function drawLabel(o,d,side){
  const platform=d.platformSide||1;let text='Türen geschlossen',bg='#2b2d2e',fg='#e8e8e8';
  if((d.fullPhase==='open'||d.fullPhase==='dwell')&&d.door>.72){
    if(side===platform){text='Ausstieg · Türen offen';bg='#176b3a';fg='#fff'}else{text='Andere Seite';bg='#522525';fg='#eee'}
  }else if(d.fullPhase==='close'){text='Türen schließen';bg='#8b5b12';fg='#fff'}
  const key=`${text}|${bg}`;if(key===o.last)return;o.last=key;const x=o.x,c=o.c;x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.fillStyle=fg;x.font='800 38px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,c.width/2,c.height/2);o.t.needsUpdate=true;
}
(async()=>{for(let i=0;i<600;i++){
  const ts=globalThis.__berlinMetroU8Trains;
  if(Array.isArray(ts)&&ts.length>1){
    for(const t of ts){if(t.userData.__doorFlowPolish)continue;const d=t.userData.u8;t.userData.__doorFlowPolish={lamps:[],labels:[label(t,-1),label(t,1)]};for(const door of d.doors||[])for(const side of[-1,1])t.userData.__doorFlowPolish.lamps.push(lamp(t,door.dx,side));}
    function loop(){for(const t of ts){const d=t.userData.u8,p=t.userData.__doorFlowPolish;if(!d||!p)continue;const platform=d.platformSide||1;for(const L of p.lamps){let c=OFF;if(d.fullPhase==='close')c=L.side===platform?AMBER:RED;else if((d.fullPhase==='open'||d.fullPhase==='dwell')&&d.door>.72)c=L.side===platform?GREEN:RED;L.m.color.setHex(c)}drawLabel(p.labels[0],d,-1);drawLabel(p.labels[1],d,1)}requestAnimationFrame(loop)}loop();console.info('[Metro] U8 door flow polish ready');return;
  }
  await new Promise(r=>setTimeout(r,100));
}})().catch(e=>console.error('[Metro] door flow polish disabled',e));
