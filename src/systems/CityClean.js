(function(){
"use strict";
const places={
"alexanderplatz:fernsehturm":[52.520803,13.40945],"alexanderplatz:weltzeituhr":[52.521172,13.41332],
"eberswalder-strasse:mauerpark":[52.542778,13.402171],"bernauer-strasse:wall":[52.535286,13.389943],
"olympia-stadion:tour":[52.514628,13.239624],"wittenbergplatz:kadewe":[52.50159,13.34095],
"gleisdreieck:park":[52.49865,13.37128],"maerkisches-museum:park":[52.5131,13.41415],
"hausvogteiplatz:gendarmen":[52.51333,13.39306],"stadtmitte:gendarmen":[52.51333,13.39306]};
const modes={"alexanderplatz:weltzeituhr":"clock","stadtmitte:gendarmen":"square","bernauer-strasse:wall":"wall","olympia-stadion:tour":"sight","eberswalder-strasse:mauerpark":"sight","wittenbergplatz:kadewe":"sight","gleisdreieck:park":"sight","maerkisches-museum:park":"sight","hausvogteiplatz:gendarmen":"sight"};
const where=()=>{const r=window.BerlinStationRegistry,c=window.BerlinWorldBridge?.snapshot?.();return r?.resolve?.(c?.stationId)||r?.resolve?.(c?.stationName)||r?.current?.()};
const activities=()=>{const data=window.BerlinDiscoveryV2;const sid=where()?.id;return[...(data?.data?.[sid]||[]),...(data?.jobs?.[sid]?[{...data.jobs[sid],__job:true}]:[])]};
const geoPoint=a=>a&&places[a.id]?{lat:places[a.id][0],lng:places[a.id][1]}:null;
const virtual=()=>{const v=window.BerlinWorldBridge?.snapshot?.()?.streetView;return v?.open&&v.source==="programmable"&&v.positionMode==="live-virtual-position"&&Number.isFinite(v.lat)&&Number.isFinite(v.lng)?{lat:v.lat,lng:v.lng}:null};
const distance=(a,b)=>{let rad=Math.PI/180,p=(b.lat-a.lat)*rad,q=(b.lng-a.lng)*rad,r=Math.sin(p/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(q/2)**2;return Math.round(12742000*Math.atan2(Math.sqrt(r),Math.sqrt(1-r)))};
const proximity=()=>{let p=virtual();return p?activities().filter(a=>geoPoint(a)).map(a=>({...a,distance:distance(p,geoPoint(a))})).sort((a,b)=>a.distance-b.distance):[]};
function readyActivity(){if(!window.__berlinMetroGame?.player?.__streetMode)return null;let near=proximity();for(const a of activities()){if(!modes[a.id])continue;if(near.some(x=>x.id===a.id&&x.distance<=85))return{...a,mode:modes[a.id]};let t=window.BerlinProximity?.lastTravel;if(!virtual()&&t?.id===a.id&&t?.stationId===where()?.id&&Date.now()-t.at<25*60000)return{...a,mode:modes[a.id]}}return null}
function save(){const d=window.BerlinPhase34?.discovery;try{if(d)localStorage.setItem("berlin-discovery-v4@"+(window.BerlinSaveSlots?.active||"normal"),JSON.stringify(d))}catch{}window.BerlinLife?.save?.()}
function perform(id){const a=activities().find(a=>a.id===id);if(!a)return false;const p=window.BerlinPhase7,phase=window.BerlinPhase34?.discovery;
if(id.endsWith(":spaeti")&&p?.openShop){return p.openShop()!==false}
if(modes[id]&&p?.openCityActivity){return p.openCityActivity(modes[id],id)===true}
if(a.cost){const e=window.BerlinLife?.economy||window.BerlinLife?.game?.economy;const paid=e?.spend?.(a.cost,a.name);if(!paid||paid.success===false)return false}
if(phase){phase.discovered??={};phase.visited??={};phase.discovered[id]=true;phase.visited[id]=(phase.visited[id]||0)+1}save();window.__berlinMetroGame?.ui?.notify?.(a.name+" bezocht");return true}
function context(g){const p=g.player,s=where();if(p.__u8Area&&Number.isInteger(p.__u8FullStation))return{line:"U8",name:s?.name||"Alexanderplatz",returnKind:"u8",index:p.__u8FullStation};if(p.currentStation?.id==="alexanderplatz")return{line:"U2/U8",name:"Alexanderplatz",returnKind:"alex"};return{line:"U2",name:s?.name||p.currentStation?.name||"Berlin",stationId:p.currentStation?.id||s?.id,returnKind:"u2"}}
let busy=false;
async function travelTo(a){const pos=geoPoint(a),g=window.__berlinMetroGame,o=g?.__allStreetOverlay;if(!pos||!o||!g.player||g.player.activeTrain||g.player.__u8Active||busy)return false;busy=true;try{
if(!g.player.__streetMode)await o.open(context(g));if(!g.player.__streetMode)return false;
const api=window.BerlinStreetView2;let used=false;
for(let i=0;i<80;i++){const pano=api?.getPanorama?.();if(api?.state?.mode==="programmable"&&pano?.setPosition){pano.setPosition(pos);used=true;break}if(api?.state?.mode==="legacy-fallback")break;await new Promise(r=>setTimeout(r,90))}
if(!used){api?.forceFallback?.();const u=new URL("https://maps.google.com/maps");u.searchParams.set("layer","c");u.searchParams.set("cbll",pos.lat+","+pos.lng);u.searchParams.set("cbp","12,0,,0,0");u.searchParams.set("source","embed");u.searchParams.set("output","svembed");o.frame.style.display="block";o.frame.src=u.href;const canvas=o.root.querySelector("#berlin-programmable-streetview");if(canvas)canvas.style.display="none"}
window.BerlinProximity.lastTravel={id:a.id,name:a.name,stationId:where()?.id,mode:used?"api":"fallback",at:Date.now()};return true
}catch(e){console.warn("[Berlin] travel",e);return false}finally{busy=false}}
window.BerlinProximity={radius:85,version:"clean",nearby:()=>proximity().filter(x=>x.distance<=85),distanceTo:id=>{const a=activities().find(x=>x.id===id),v=virtual();return a&&v&&geoPoint(a)?distance(v,geoPoint(a)):null},lastTravel:null};
window.BerlinCityDiscovery={version:"clean-v2",where,activities,geoPoint,proximity,readyActivity,atClock:()=>readyActivity()?.id==="alexanderplatz:weltzeituhr",atLocation:id=>readyActivity()?.id===id,travelTo,perform,state:()=>window.BerlinPhase34?.discovery,open:()=>window.BerlinCleanStreet?.openActivities(),close:()=>window.BerlinCleanStreet?.closeActivities()};
})();
