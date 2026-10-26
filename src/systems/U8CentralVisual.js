import * as THREE from 'three';
const S={
'Bernauer Straße':[0xd8cfb8,0xc7bda4,0x171717,0x8e765d,'Gedenkstätte · Ausgang'],
'Rosenthaler Platz':[0xc87436,0xb65b27,0x71351f,0xf0d0ad,'Ausgang Rosenthaler Platz'],
'Weinmeisterstraße':[0x7596b4,0x617f9d,0x415a73,0xd8e4ee,'Ausgang Weinmeisterstraße'],
'Jannowitzbrücke':[0x8ea7ae,0x748e97,0x48636e,0xd9e4e6,'S-Bahn · Ausgang'],
'Heinrich-Heine-Straße':[0xb3aa94,0x9b917c,0x625d51,0xe5dfcf,'Ausgang Heinrich-Heine-Straße'],
'Moritzplatz':[0x91a68d,0x748d72,0x536a54,0xdce5d7,'Ausgang Moritzplatz'],
'Kottbusser Tor':[0x72a295,0x56897d,0x315e55,0xd9eee8,'U1 · U3 · Umsteigen'],
'Schönleinstraße':[0x688a78,0x4e705f,0x2f5143,0xd7e4da,'Ausgang Schönleinstraße'],
'Hermannplatz':[0xa69a64,0x8c8150,0x554e32,0xe8e1bd,'U7 · Umsteigen']};
const M=new Map(),mat=(c,b=0)=>{const k=b+'-'+c;if(!M.has(k))M.set(k,b?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return M.get(k)},box=(p,s,a,m)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(...s),m);q.position.set(...a);p.add(q);return q};
function sign(text){const c=document.createElement('canvas');c.width=1024;c.height=180;const x=c.getContext('2d');x.fillStyle='#f2efe6';x.fillRect(0,0,1024,180);x.fillStyle='#173b69';x.fillRect(0,0,130,180);x.fillStyle='#fff';x.font='900 58px Arial';x.textAlign='center';x.fillText('U8',65,112);x.fillStyle='#111';x.textAlign='left';x.font='800 42px Arial';x.fillText(text,160,105,830);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});return new THREE.Mesh(new THREE.PlaneGeometry(7.8,1.35),m)}
function hideWalls(g,zc){g.traverse(o=>{const p=o.geometry?.parameters;if(o.isMesh&&p&&(p.width||0)>48&&(p.height||0)>4.4&&(p.depth||9)<.5&&Math.abs(Math.abs(o.position.z-zc)-12)<.7)o.visible=false})}
function deco(g,name,a,zc){if(g.userData.__cv)return;g.userData.__cv=1;const [w1,w2,col,acc,label]=a,cx=g.userData.centerX;hideWalls(g,zc);box(g,[52,5,.22],[cx,-1.52,zc-11.92],mat(w1));box(g,[52,5,.22],[cx,-1.52,zc+11.92],mat(w2));for(const side of[-1,1]){const z=zc+side*11.76;for(let x=cx-22;x<=cx+22;x+=8)box(g,[.1,4.5,.03],[x,-1.55,z],mat(acc,1));for(const y of[-3.05,-1.85,-.65])box(g,[49,.04,.035],[cx,y,z],mat(acc,1))}for(let x=cx-21.6;x<=cx+21.6;x+=7.2)box(g,[.72,4.1,.72],[x,-1.95,zc],mat(col));const a1=sign(label);a1.position.set(cx,-.7,zc+3.7);g.add(a1);const a2=sign(label);a2.position.set(cx,-.7,zc-3.7);a2.rotation.y=Math.PI;g.add(a2);if(name==='Rosenthaler Platz')for(const side of[-1,1])for(let x=cx-20;x<=cx+20;x+=5.2)box(g,[3.6,1.5,.05],[x,-2.1,zc+side*11.66],mat(0xe0a069,1));if(name==='Bernauer Straße')for(const x of[cx-18,cx-6,cx+6,cx+18])box(g,[1.15,4,1.15],[x,-1.95,zc],mat(0x111111))}
(async()=>{for(let i=0;i<600;i++){const t=globalThis.__berlinMetroU8Trains;if(Array.isArray(t)&&t.length>1&&t[0]?.parent){const r=t[0].parent,zc=(t[0].position.z+t[1].position.z)/2;for(const [n,a] of Object.entries(S)){const g=r.children.find(c=>c.name===`U8:${n}`);if(g)deco(g,n,a,zc)}console.info('[Metro] central U8 visuals ready');return}await new Promise(r=>setTimeout(r,100))}})().catch(e=>console.error('[Metro] central visuals failed',e));
