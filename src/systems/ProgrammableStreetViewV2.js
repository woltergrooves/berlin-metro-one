import { Tick } from '../state/Tick.js';
const API_KEY='AIzaSyDEjbaLTPls-DV8a1m5RPuj8vv8gEnV888';
let pano=null,mapsPromise=null,disabled=false,upgradeSeq=0,bridgeAttached=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Fix 8 nov 2026: alleen loopbare straatpanorama's. setPosition() pakt het dichtstbijzijnde panorama van élke bron, ook
// door gebruikers geüploade 360°-foto's (winkels, hallen, binnenplaatsen) zonder pijlen. Daarom eerst via de
// StreetViewService een Google-panorama (bron GOOGLE, buiten) mét looprichtingen zoeken, in steeds grotere straal.
const svStats={lookups:0,rejected:0,fallbacks:0,fixes:0,last:null};
let placing=0;
async function findOutdoor(maps,lat,lng,exclude){
  const svc=new maps.StreetViewService(),SV=maps.StreetViewSource||{},PREF=maps.StreetViewPreference||{};
  for(const radius of [40,80,160,320]){
    svStats.lookups++;
    let r=null;
    try{r=await svc.getPanorama({location:{lat,lng},radius,sources:[SV.GOOGLE||'google'],preference:PREF.NEAREST||'nearest'})}catch{r=null}
    const d=r?.data,id=d?.location?.pano;
    if(!id)continue;
    if(id===exclude||!(d.links?.length)){svStats.rejected++;continue}
    return{id,latLng:d.location.latLng};
  }
  return null;
}
async function placeOutdoor(lat,lng,heading=0,opts={}){
  if(!pano)return false;
  const maps=window.google?.maps;if(!maps)return false;
  const my=++placing,hit=await findOutdoor(maps,lat,lng,opts.exclude||null);
  if(my!==placing)return false;
  if(hit){pano.setPano(hit.id);svStats.last=hit.id}
  else if(!opts.exclude){svStats.fallbacks++;pano.setPosition({lat,lng})}
  pano.setPov({heading:heading||0,pitch:0});
  return !!hit;
}
// Bewaking: belandt het panorama toch op een plek zonder looprichtingen, dan naar de dichtstbijzijnde loopbare straatplek.
function guardLinks(){
  if(!pano||pano.__blGuard)return;pano.__blGuard=true;
  pano.addListener('links_changed',()=>{
    setTimeout(()=>{
      if(!pano||(pano.getLinks?.()||[]).length)return;
      const ll=pano.getPosition?.();if(!ll)return;
      svStats.fixes++;placeOutdoor(ll.lat(),ll.lng(),pano.getPov?.().heading||0,{exclude:pano.getPano?.()});
    },600);
  });
}
function parseFrame(frame){const raw=frame?.getAttribute?.('src')||frame?.src||'';if(!raw||raw==='about:blank')return null;try{const u=new URL(raw,location.href),cbll=u.searchParams.get('cbll'),cbp=u.searchParams.get('cbp');if(!cbll)return null;const [lat,lng]=cbll.split(',').map(Number),heading=Number((cbp||'').split(',')[1]);if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;return{lat,lng,heading:Number.isFinite(heading)?heading:0,url:raw}}catch{return null}}
function loadMaps(){if(window.google?.maps?.StreetViewPanorama)return Promise.resolve(window.google.maps);if(mapsPromise)return mapsPromise;mapsPromise=new Promise((resolve,reject)=>{const cb='__berlinMapsReadyV2';const timer=setTimeout(()=>reject(new Error('Maps JavaScript timeout')),12000);window[cb]=()=>{clearTimeout(timer);delete window[cb];resolve(window.google.maps)};const s=document.createElement('script');s.async=true;s.defer=true;s.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&loading=async&callback=${cb}`;s.onerror=()=>{clearTimeout(timer);reject(new Error('Maps JavaScript kon niet laden'))};document.head.appendChild(s)});return mapsPromise}
function controls(root){const buttons=[...root.querySelectorAll('button')];return{alt:buttons.find(b=>/Andere straatpositie/i.test(b.textContent||'')),back:buttons.find(b=>/U-Bahn/i.test(b.textContent||''))}}
function ensureCanvas(ov){let el=ov.root.querySelector('#berlin-programmable-streetview');if(el)return el;el=document.createElement('div');el.id='berlin-programmable-streetview';el.style.cssText='position:absolute;inset:0;z-index:1;display:none;background:#080808;touch-action:pan-x pan-y;';ov.root.insertBefore(el,ov.root.firstChild);ov.frame.style.zIndex='0';return el}
function useLegacy(game,reason,permanent=false){const ov=game?.__allStreetOverlay;if(ov){const canvas=ov.root.querySelector('#berlin-programmable-streetview');if(canvas)canvas.style.display='none';ov.frame.style.display='block';controls(ov.root).alt?.style.removeProperty('display')}try{pano?.setVisible?.(false)}catch{}if(bridgeAttached){window.BerlinWorldBridge?.detachPanorama?.();bridgeAttached=false}if(permanent)disabled=true;window.BerlinStreetView2.state.mode='legacy-fallback';window.BerlinStreetView2.state.lastError=String(reason||'fallback');console.warn('[Berlin Life] Street View 2.0 fallback',reason)}
async function waitForFrame(ov,seq){for(let i=0;i<100&&seq===upgradeSeq;i++){const p=parseFrame(ov.frame);if(p)return p;await sleep(100)}return null}
// Wens speler 30 okt (19:52): betaalde Maps JavaScript API standaard AAN (speler houdt de loads zelf in de gaten via het GOD-menu).
// Alleen uit met localStorage 'berlin-sv-paid' = '0'. Bij een fout valt hij nog wel terug op de embed, anders zie je niets.
function paidAllowed(){try{return localStorage.getItem('berlin-sv-paid')!=='0'}catch{return true}}
async function activate(game,seq){if(!paidAllowed())return;if(disabled||seq!==upgradeSeq||game?.player?.__streetMode!==true)return;const ov=game.__allStreetOverlay,pos=await waitForFrame(ov,seq);if(!pos||seq!==upgradeSeq)return;let maps;try{maps=await loadMaps()}catch(e){useLegacy(game,e,true);return}if(seq!==upgradeSeq||game.player.__streetMode!==true)return;const canvas=ensureCanvas(ov);try{if(!pano){pano=new maps.StreetViewPanorama(canvas,{position:{lat:pos.lat,lng:pos.lng},pov:{heading:pos.heading||0,pitch:0},zoom:1,visible:true,clickToGo:true,scrollwheel:true,addressControl:false,fullscreenControl:false,motionTracking:false,motionTrackingControl:false});window.BerlinStreetView2.state.panoramaInstances=1;window.BerlinStreetView2.state.paidInstances++;window.BerlinStreetView2.state.createdAt=Date.now()}else{pano.setVisible(true)}guardLinks();placeOutdoor(pos.lat,pos.lng,pos.heading||0);canvas.style.display='block';ov.frame.style.display='none';window.BerlinStreetView2.state.paidLoads++;const c=controls(ov.root);if(c.alt)c.alt.style.display='none';bridgeAttached=!!window.BerlinWorldBridge?.attachPanorama?.(pano);window.BerlinStreetView2.state.mode='programmable';window.BerlinStreetView2.state.lastError=null;window.BerlinStreetView2.state.stationEntryCount++;let settled=false;const settle=()=>{if(settled)return;const id=pano?.getPano?.();if(id){settled=true;window.BerlinStreetView2.state.lastPanoId=id;window.BerlinStreetView2.state.lastSuccessAt=Date.now()}};const h=pano.addListener?.('pano_changed',settle);setTimeout(()=>{settle();try{h?.remove?.()}catch{}if(!settled&&seq===upgradeSeq&&game.player.__streetMode===true)useLegacy(game,'Geen panorama ontvangen voor deze buitenpositie',false)},9000);console.info('[Berlin Life] Street View 2.0 programmable active · panorama instance reused')}catch(e){useLegacy(game,e,false)}}
async function install(){for(let i=0;i<500;i++){const game=globalThis.__berlinMetroGame,ov=game?.__allStreetOverlay;if(game?.player&&ov?.open&&ov?.close&&ov?.root&&ov?.frame){const originalOpen=ov.open.bind(ov),originalClose=ov.close.bind(ov);ov.open=function(ctx){const out=originalOpen(ctx),seq=++upgradeSeq;if(window.BerlinStreetView2)window.BerlinStreetView2.state.opens++;queueMicrotask(()=>activate(game,seq));return out};ov.close=function(){++upgradeSeq;try{pano?.setVisible?.(false)}catch{}const canvas=ov.root.querySelector('#berlin-programmable-streetview');if(canvas)canvas.style.display='none';ov.frame.style.display='block';return originalClose()};window.gm_authFailure=()=>useLegacy(game,'Google Maps authenticatie geweigerd',true);window.BerlinStreetView2={version:2,phase:5,state:{mode:'ready',panoramaInstances:pano?1:0,stationEntryCount:0,lastPanoId:null,lastSuccessAt:null,lastError:null,createdAt:null,opens:0,paidLoads:0,paidInstances:0,sessionStart:Date.now()},getPanorama:()=>pano,placeOutdoor,walkable:()=>({...svStats,links:(pano?.getLinks?.()||[]).length}),getStatus(){return{...this.state,worldBridge:window.BerlinWorldBridge?.snapshot?.()||null}},forceFallback:()=>useLegacy(game,'handmatige fallback',false)};window.BerlinBuildStatus={currentPhase:5,name:'Street View 2.0 / World Bridge',streetView:window.BerlinStreetView2.state};if(game.player.__streetMode===true){const seq=++upgradeSeq;activate(game,seq)}console.info('[Berlin Life] Phase 5 ready · one reusable StreetViewPanorama per session');return}await Tick.sleep(100,'boot.ProgrammableStreetViewV2')}throw new Error('Street View overlay niet gevonden')}
install().catch(e=>console.error('[Berlin Life] Programmable Street View V2 install failed',e));
