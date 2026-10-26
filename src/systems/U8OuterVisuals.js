import * as THREE from 'three';

const PROFILES={
'Wittenau':[0x7c9cac,0x5f7b89,0xdbe4e7,0x3e5967,'S-Bahn · Ausgang Wilhelmsruher Damm'],
'Rathaus Reinickendorf':[0x7f978e,0x647c73,0xe5e0d2,0x465e55,'Rathaus Reinickendorf · Bus'],
'Karl-Bonhoeffer-Nervenklinik':[0xb6ad88,0x918861,0xf0e7c9,0x665d3e,'S-Bahn · Karl-Bonhoeffer-Nervenklinik'],
'Lindauer Allee':[0x987b6c,0x765c50,0xe7d5c9,0x5d4339,'Ausgang Lindauer Allee'],
'Paracelsus-Bad':[0x72a5a0,0x54847f,0xd7ebe9,0x37645f,'Paracelsus-Bad · Roedernallee'],
'Residenzstraße':[0x9b8a77,0x7a6958,0xeadfd2,0x5f4d3e,'Residenzstraße · Ausgang'],
'Franz-Neumann-Platz':[0x6d8777,0x52695a,0xdce8df,0x354c3f,'Am Schäfersee · Ausgang'],
'Osloer Straße':[0x7295b5,0x56748f,0xdce8f0,0x395873,'U9 · Umsteigen'],
'Pankstraße':[0x899b8a,0x697a69,0xe1e7dd,0x4a5b4b,'Pankstraße · Ausgang'],
'Gesundbrunnen':[0x758c7a,0x59705f,0xdde8df,0x3c5541,'S-Bahn · Fernbahn · Ausgang'],
'Voltastraße':[0x8597a5,0x687784,0xe0e6eb,0x4b5c68,'Voltastraße · Ausgang'],
'Boddinstraße':[0x8f7d70,0x725f54,0xeadbd2,0x58453b,'Boddinstraße · Ausgang'],
'Leinestraße':[0x748f8a,0x586f6b,0xdce9e7,0x3b5752,'Leinestraße · Ausgang'],
'Hermannstraße':[0x75877a,0x596b5d,0xe0e8df,0x3d5142,'S-Bahn · Ringbahn · Ausgang']
};
const M=new Map();
const mat=(c,b=0)=>{const k=`${b}:${c}`;if(!M.has(k))M.set(k,b?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return M.get(k)};
const box=(p,s,pos,m)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(...s),m);q.position.set(...pos);p.add(q);return q};
function sign(text,accent='#173b69'){
 const c=document.createElement('canvas');c.width=1100;c.height=190;const x=c.getContext('2d');x.fillStyle='#f1eee5';x.fillRect(0,0,c.width,c.height);x.fillStyle=accent;x.fillRect(0,0,145,c.height);x.fillStyle='#fff';x.font='900 62px Arial';x.textAlign='center';x.fillText('U8',72,118);x.fillStyle='#111';x.textAlign='left';x.font='800 42px Arial';x.fillText(text,180,112,880);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mm=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});const q=new THREE.Mesh(new THREE.PlaneGeometry(8.2,1.42),mm);q.userData.dispose=()=>{t.dispose();mm.dispose();q.geometry.dispose()};return q;
}
function hideGeneric(g,zc){g.traverse(o=>{const p=o.geometry?.parameters;if(!o.isMesh||!p)return;if((p.width||0)>48&&(p.height||0)>4.4&&(p.depth||9)<.5&&Math.abs(Math.abs(o.position.z-zc)-12)<.7)o.visible=false;if((p.width||0)<.8&&(p.height||0)>3.8&&(p.depth||0)<.8&&Math.abs(o.position.z-zc)<1)o.visible=false})}
function decorate(g,name,a,zc){if(g.userData.__outerPolish)return;g.userData.__outerPolish=1;const [w1,w2,cream,col,label]=a,cx=g.userData.centerX;hideGeneric(g,zc);box(g,[52,5,.22],[cx,-1.52,zc-11.92],mat(w1));box(g,[52,5,.22],[cx,-1.52,zc+11.92],mat(w2));for(const side of[-1,1]){const z=zc+side*11.76;for(let x=cx-22;x<=cx+22;x+=6.6)box(g,[.11,4.5,.035],[x,-1.55,z],mat(cream,1));for(const y of[-3.05,-1.9,-.75])box(g,[49,.04,.035],[cx,y,z],mat(cream,1))}for(let x=cx-21.6;x<=cx+21.6;x+=7.2){const wide=name==='Osloer Straße'||name==='Gesundbrunnen'?1.0:.72;box(g,[wide,4.1,wide],[x,-1.95,zc],mat(col));}
 const b1=sign(label);b1.position.set(cx,-.7,zc+3.7);g.add(b1);const b2=sign(label);b2.position.set(cx,-.7,zc-3.7);b2.rotation.y=Math.PI;g.add(b2);
 if(name==='Osloer Straße'||name==='Gesundbrunnen'||name==='Hermannstraße'){const tr=sign(name==='Osloer Straße'?'Umsteigen U9':name==='Gesundbrunnen'?'S-Bahn · Regionalbahn':'S-Bahn · Ringbahn','#1973b9');tr.position.set(cx+12,-.76,zc);tr.rotation.y=Math.PI/2;g.add(tr)}
 if(name==='Karl-Bonhoeffer-Nervenklinik'||name==='Hermannstraße'){for(const x of[cx-17,cx+17]){box(g,[6,.25,2.8],[x,-4.02,zc+4.5],mat(0x505456));box(g,[.22,2.7,2.8],[x-2.85,-2.65,zc+4.5],mat(col))}}
}
(async()=>{for(let i=0;i<600;i++){const t=globalThis.__berlinMetroU8Trains;if(Array.isArray(t)&&t.length>1&&t[0]?.parent){const root=t[0].parent,zc=(t[0].position.z+t[1].position.z)/2;for(const [name,a] of Object.entries(PROFILES)){const g=root.children.find(c=>c.name===`U8:${name}`);if(g)decorate(g,name,a,zc)}console.info('[Metro] outer U8 visuals ready');return}await new Promise(r=>setTimeout(r,100))}})().catch(e=>console.error('[Metro] outer visuals disabled',e));
