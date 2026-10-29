import * as THREE from 'three';

export const U8_STOPS = [
  ['Wittenau','Wittenau',0x90a9b7],
  ['Rathaus Reinickendorf','Rathaus Reinickendorf',0x7b9a93],
  ['Karl-Bonhoeffer-Nervenklinik','Karl-Bonhoeffer-Nervenklinik',0xb7b28a],
  ['Lindauer Allee','Lindauer Allee',0x9b7d6a],
  ['Paracelsus-Bad','Paracelsus-Bad',0x76a7a1],
  ['Residenzstraße','Residenzstraße',0x9b8b79],
  ['Franz-Neumann-Platz','Franz-Neumann-Platz',0x6e8677],
  ['Osloer Straße','Osloer Straße',0x7897b6],
  ['Pankstraße','Pankstraße',0x8e9c8d],
  ['Gesundbrunnen','Gesundbrunnen',0x788c7a],
  ['Voltastraße','Voltastraße',0x8797a3],
  ['Bernauer Straße','Bernauer Straße',0xd8cfb8],
  ['Rosenthaler Platz','Rosenthaler Platz',0xc77435],
  ['Weinmeisterstraße','Weinmeisterstraße',0x7395ad],
  ['Alexanderplatz','Alexanderplatz',0x86b9ae],
  ['Jannowitzbrücke','Jannowitzbrücke',0x93a9af],
  ['Heinrich-Heine-Straße','Heinrich-Heine-Straße',0xa38b73],
  ['Moritzplatz','Moritzplatz',0x8e9b78],
  ['Kottbusser Tor','Kottbusser Tor',0x6f9e8e],
  ['Schönleinstraße','Schönleinstraße',0x7a9c88],
  ['Hermannplatz','Hermannplatz',0xa89c67],
  ['Boddinstraße','Boddinstraße',0x8f7f73],
  ['Leinestraße','Leinestraße',0x78918d],
  ['Hermannstraße','Hermannstraße',0x7f8b75],
].map((s,i)=>({id:i,name:s[0],display:s[1],color:s[2]}));

export const U8_ALEX_INDEX = 14;
export const U8_SPACING = 84;
export const U8_Z_REL = 49;
export const U8_PLATFORM_MIN_Z = 42.35;
export const U8_PLATFORM_MAX_Z = 55.65;
export const stopX = (i) => 61 + (i - U8_ALEX_INDEX) * U8_SPACING;

const GEO=new Map(), MAT=new Map();
const geo=s=>{const k=s.join('x');if(!GEO.has(k))GEO.set(k,new THREE.BoxGeometry(...s));return GEO.get(k)};
const mat=(c,b=false)=>{const k=`${b?'b':'l'}:${c}`;if(!MAT.has(k))MAT.set(k,b?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));return MAT.get(k)};
const box=(p,s,pos,m)=>{const q=new THREE.Mesh(geo(s),m);q.position.set(...pos);p.add(q);return q};
const FLOOR=mat(0x5c5f60), DARK=mat(0x242729), METAL=mat(0x858b8d), RAIL=mat(0x969c9d), SLEEPER=mat(0x423a34), BLACK=mat(0x101112), LIGHT=mat(0xfff3cf,true), CREAM=mat(0xd9d4c8), SEAT=mat(0x57433d);

function sign(root,text,pos,rot=0,bg='#111',fg='#fff',ww=7.8){
  const c=document.createElement('canvas');c.width=1250;c.height=190;const x=c.getContext('2d');
  x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.fillStyle=fg;x.font='800 66px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,c.width/2,c.height/2+2,c.width-44);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;
  const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});const q=new THREE.Mesh(new THREE.PlaneGeometry(ww,1.15),m);q.position.set(...pos);q.rotation.y=rot;root.add(q);
  root.userData.disposables?.push(()=>{t.dispose();m.dispose();q.geometry.dispose()});return q;
}

function directionSign(root,dir,next,pos,rot=0){
  const c=document.createElement('canvas');c.width=1300;c.height=220;const x=c.getContext('2d');
  x.fillStyle='#f2f0e9';x.fillRect(0,0,c.width,c.height);x.fillStyle='#173b69';x.fillRect(24,26,145,168);x.fillStyle='#fff';x.font='900 64px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('U8',96,110);
  x.fillStyle='#111';x.textAlign='left';x.font='800 46px Arial';x.fillText(dir,205,82);x.font='600 31px Arial';x.fillText(`Nächster Halt: ${next}`,205,150);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});const q=new THREE.Mesh(new THREE.PlaneGeometry(8.6,1.45),m);q.position.set(...pos);q.rotation.y=rot;root.add(q);root.userData.disposables?.push(()=>{t.dispose();m.dispose();q.geometry.dispose()});
}

function trackSegment(group,zc,x1,x2,y=-4){
  const len=x2-x1,c=(x1+x2)/2;
  box(group,[len,.18,3.6],[c,y-.38,zc-9.1],BLACK);box(group,[len,.11,.12],[c,y-.16,zc-9.78],RAIL);box(group,[len,.11,.12],[c,y-.16,zc-8.42],RAIL);
  box(group,[len,.18,3.6],[c,y-.38,zc+9.1],BLACK);box(group,[len,.11,.12],[c,y-.16,zc+8.42],RAIL);box(group,[len,.11,.12],[c,y-.16,zc+9.78],RAIL);
  for(let x=x1+1;x<x2-1;x+=3.1){box(group,[.22,.08,2.12],[x,y-.29,zc-9.1],SLEEPER);box(group,[.22,.08,2.12],[x,y-.29,zc+9.1],SLEEPER)}
}

function stationGroup(root,station,zc){
  const g=new THREE.Group();g.name=`U8:${station.name}`;g.userData.u8StationIndex=station.id;g.userData.centerX=stopX(station.id);root.add(g);
  const x=stopX(station.id), py=-4, col=mat(station.color), col2=mat(new THREE.Color(station.color).multiplyScalar(.84).getHex());
  box(g,[50,.36,14],[x,py-.18,zc],FLOOR);
  box(g,[52,5,.28],[x,-1.52,zc-12],col);box(g,[52,5,.28],[x,-1.52,zc+12],col2);box(g,[52,.38,24.2],[x,.55,zc],CREAM);
  for(let xx=x-22;xx<=x+22;xx+=7.2){box(g,[.54,4.12,.54],[xx,py+2.05,zc],station.id===11?BLACK:col2);box(g,[2.9,.16,.72],[xx,py+4.02,zc],METAL)}
  for(let xx=x-21;xx<=x+21;xx+=6.2){box(g,[3.1,.06,.22],[xx,.28,zc-5.15],LIGHT);box(g,[3.1,.06,.22],[xx,.28,zc+5.15],LIGHT)}
  for(const dx of[-14,0,14]) box(g,[3,.42,.72],[x+dx,py+.42,zc+1.9],SEAT);
  sign(g,station.name,[x-10,-1.13,zc-11.82]);sign(g,station.name,[x+10,-1.13,zc+11.82],Math.PI);
  const prev=U8_STOPS[Math.max(0,station.id-1)]?.name||'Wittenau'; const next=U8_STOPS[Math.min(U8_STOPS.length-1,station.id+1)]?.name||'Hermannstraße';
  directionSign(g,'Richtung Wittenau',prev,[x-15,-.62,zc-5.82],0);directionSign(g,'Richtung Hermannstraße',next,[x+15,-.62,zc+5.82],Math.PI);
  if([0,9,14,15,19,20,23].includes(station.id)){box(g,[6.8,.28,3.1],[x-20,py+.05,zc+3.8],FLOOR);box(g,[.24,3.2,3.1],[x-23.25,py+1.6,zc+3.8],col2)}
  return g;
}

export function addFullU8Visual(root,station){
  if(root.userData.__u8FullVisualV1)return root.userData.u8FullLine;
  root.userData.__u8FullVisualV1=true;const zc=station.z+U8_Z_REL;
  const groups=[];const segments=[];
  for(const s of U8_STOPS){if(s.id===U8_ALEX_INDEX)continue;groups[s.id]=stationGroup(root,s,zc)}
  for(let i=0;i<U8_STOPS.length-1;i++){
    const a=stopX(i),b=stopX(i+1),g=new THREE.Group();g.name=`U8:tunnel:${i}`;g.userData.centerX=(a+b)/2;root.add(g);trackSegment(g,zc,Math.min(a,b)+24,Math.max(a,b)-24);
    box(g,[Math.abs(b-a)-48,4.8,.22],[(a+b)/2,-1.6,zc-12],DARK);box(g,[Math.abs(b-a)-48,4.8,.22],[(a+b)/2,-1.6,zc+12],DARK);
    for(let x=Math.min(a,b)+30;x<Math.max(a,b)-30;x+=18) box(g,[3,.05,.18],[x,.12,zc-11.72],LIGHT);
    // U1-stap: tunnel dicht (plafond + bodem), zodat je vanaf het perron door de tunnel het buurstation ziet i.p.v. de lucht.
    box(g,[Math.abs(b-a)-48,.3,24.2],[(a+b)/2,.6,zc],DARK);box(g,[Math.abs(b-a)-48,.12,24],[(a+b)/2,-4.62,zc],DARK);
    segments[i]=g;
  }
  root.userData.u8FullLine={groups,segments,zc};return root.userData.u8FullLine;
}

export function addFullRouteMap(train){
  if(train.userData.__u8FullRouteMap)return train.userData.u8FullRouteMap;
  const c=document.createElement('canvas');c.width=1500;c.height=280;const x=c.getContext('2d');
  const draw=(index,direction)=>{
    x.fillStyle='#f3f1e9';x.fillRect(0,0,c.width,c.height);x.fillStyle='#173b69';x.fillRect(20,24,150,232);x.fillStyle='#fff';x.font='900 72px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText('U8',95,140);
    const from=Math.max(0,Math.min(U8_STOPS.length-7,index-3));const shown=U8_STOPS.slice(from,from+7);const xs=[250,440,630,820,1010,1200,1390];
    x.strokeStyle='#173b69';x.lineWidth=15;x.beginPath();x.moveTo(xs[0],125);x.lineTo(xs[xs.length-1],125);x.stroke();
    shown.forEach((s,i)=>{x.beginPath();x.fillStyle=s.id===index?'#f0c419':'#fff';x.strokeStyle='#173b69';x.lineWidth=8;x.arc(xs[i],125,22,0,Math.PI*2);x.fill();x.stroke();x.fillStyle='#111';x.font='600 21px Arial';x.textAlign='center';x.fillText(s.name,xs[i],190,170)});
    x.fillStyle='#111';x.font='700 29px Arial';x.textAlign='left';x.fillText(`→ ${direction<0?'Wittenau':'Hermannstraße'}`,205,48);
  };
  draw(U8_ALEX_INDEX,-1);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;const m=new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});const q=new THREE.Mesh(new THREE.PlaneGeometry(8.2,1.52),m);q.position.set(0,2.52,-1.58);train.add(q);train.userData.u8FullRouteMap={canvas:c,ctx:x,texture:t,material:m,mesh:q,draw};return train.userData.u8FullRouteMap;
}
