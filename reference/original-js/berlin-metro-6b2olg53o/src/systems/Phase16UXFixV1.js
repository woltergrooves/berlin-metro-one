const RETURN_RE=/terug\s+naar\s+u[ -]?bahn|↓\s*u[ -]?bahn|u-bahn/i;
const SURFACE_RE=/ausgang\s*a|ausgang\s*b|andere\s+straatpositie|volgende\s+positie|open\s+in\s+google|buitenpositie/i;
let originalReturn=null;

function visible(el){const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&el.getBoundingClientRect().width>0;}
function findSurfacePanel(){
  const els=[...document.querySelectorAll('div,section,aside')];
  return els.find(el=>{
    if(el.id==='streetReturnOnlyV1') return false;
    const t=(el.innerText||'').trim();
    if(!t||t.length>900) return false;
    const hits=['Ausgang A','Ausgang B','Andere straatpositie','Open in Google','Volgende positie','Buitenpositie'].filter(x=>t.toLowerCase().includes(x.toLowerCase())).length;
    return hits>=2;
  })||null;
}
function captureReturn(panel){
  if(!panel) return;
  const btn=[...panel.querySelectorAll('button,a,[role="button"]')].find(x=>RETURN_RE.test((x.innerText||x.textContent||'').trim()));
  if(btn) originalReturn=btn;
}
function returnButton(){
  let b=document.querySelector('#streetReturnOnlyV1');
  if(b) return b;
  b=document.createElement('button');
  b.id='streetReturnOnlyV1';
  b.textContent='↓ TERUG NAAR U-BAHN';
  b.style.cssText='display:none;position:fixed;left:12px;bottom:max(14px,env(safe-area-inset-bottom));z-index:15100;border:1px solid #ffffff38;border-radius:11px;padding:11px 14px;background:#10151bea;color:#fff;font:900 12px Arial;box-shadow:0 9px 30px #000a;backdrop-filter:blur(10px);pointer-events:auto';
  b.onclick=()=>{
    if(originalReturn&&document.contains(originalReturn)){ try{originalReturn.click();return;}catch{} }
    const candidates=[...document.querySelectorAll('button,a,[role="button"]')].filter(x=>x!==b);
    const hit=candidates.find(x=>RETURN_RE.test((x.innerText||x.textContent||'').trim()));
    if(hit){try{hit.click();return;}catch{}}
    const game=globalThis.__berlinMetroGame;
    if(game?.ui?.notify) game.ui.notify('Gebruik de stationuitgang om terug te keren.');
  };
  document.body.appendChild(b);
  return b;
}
function cleanupLegacy(){
  for(const sel of ['#guideBtnV1','#guidePanelV1','#guideModalV1','#guideV2','#guideBtnV2','#surfaceGameplayV2','#surfacePanelV1','#phase16SurfacePanel']){
    for(const el of document.querySelectorAll(sel)) el.style.setProperty('display','none','important');
  }
  // Extra safety: any fixed GIDS button from older overlays.
  for(const el of document.querySelectorAll('button')){
    const t=(el.innerText||'').trim();
    if(/^📖?\s*gids$/i.test(t)||/^gids$/i.test(t)) el.style.setProperty('display','none','important');
  }
}
function apply(game){
  cleanupLegacy();
  const b=returnButton();
  const panel=findSurfacePanel();
  if(panel){
    captureReturn(panel);
    panel.style.setProperty('display','none','important');
  }
  b.style.display=game?.player?.__streetMode?'block':'none';
}
function install(game){
  if(game.__phase16UXFixV1) return;
  game.__phase16UXFixV1=true;
  const style=document.createElement('style');
  style.id='phase16UXFixStyles';
  style.textContent='#guideBtnV1,#guidePanelV1,#guideModalV1,#guideBtnV2{display:none!important}';
  document.head.appendChild(style);
  setInterval(()=>apply(game),350);
  document.addEventListener('metro-street-cell',()=>setTimeout(()=>apply(game),0));
  game.phase16UXFixVersion='V1';
}
(async()=>{for(let i=0;i<500;i++){const g=globalThis.__berlinMetroGame;if(g?.player){install(g);return}await new Promise(r=>setTimeout(r,100))}})().catch(e=>console.error('[Metro] Phase16 UX fix failed',e));
