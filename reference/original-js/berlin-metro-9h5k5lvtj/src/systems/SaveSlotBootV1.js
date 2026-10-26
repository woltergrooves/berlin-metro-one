const VERSION='Save Slots v1.0';
const REGISTRY_KEY='berlin-save-slots-v1';
const SAVE_KEYS=['metro-economy-v2','berlinLifeCoreV1','metro-highlight-visits-v2'];

function safeParse(raw,fallback=null){try{return JSON.parse(raw)}catch{return fallback}}
function loadRegistry(){const r=safeParse(localStorage.getItem(REGISTRY_KEY),null);return r&&r.schema===1?r:{schema:1,active:null,slots:{},createdAt:Date.now()};}
function writeRegistry(r){try{localStorage.setItem(REGISTRY_KEY,JSON.stringify(r))}catch{}}
function snapshot(){const data={};for(const key of SAVE_KEYS){const v=localStorage.getItem(key);if(v!=null)data[key]=v;}return data;}
function clearCanonical(){for(const key of SAVE_KEYS)localStorage.removeItem(key);}
function restore(data){clearCanonical();for(const [k,v] of Object.entries(data||{}))localStorage.setItem(k,v);}
function describe(slot){const d=slot?.data||{};const econ=safeParse(d['metro-economy-v2'],{})||{};const life=safeParse(d.berlinLifeCoreV1,{})||{};const day=econ?.home?.day||((life?.clock?.day??0)+1)||1;const cents=Number.isFinite(econ?.balanceCents)?econ.balanceCents:(Number.isFinite(life?.economy?.balanceCents)?life.economy.balanceCents:0);const done=econ?.jobStats?.done||0;return {day,cents,done};}
function euro(c){return `€${((c||0)/100).toFixed(2).replace('.',',')}`;}

const registry=loadRegistry();
const legacy=snapshot();
if(!registry.slots.test&&Object.keys(legacy).length){registry.slots.test={id:'test',label:'Bewaarde testsave',createdAt:Date.now(),updatedAt:Date.now(),data:legacy};writeRegistry(registry);}

function makeStyles(){const s=document.createElement('style');s.textContent=`#saveSlotBoot{position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 12%,#1d2631 0,#090b0e 52%,#050607 100%);color:#fff;display:flex;align-items:center;justify-content:center;padding:18px;font-family:-apple-system,BlinkMacSystemFont,Inter,Arial,sans-serif}#saveSlotBoot .box{width:min(430px,94vw);background:rgba(17,20,25,.96);border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:20px;box-shadow:0 32px 90px rgba(0,0,0,.62)}#saveSlotBoot .k{font-size:10px;font-weight:900;color:#f0cf00;letter-spacing:.14em}#saveSlotBoot h1{font-size:27px;margin:5px 0 4px}#saveSlotBoot p{font-size:12px;color:#aeb5be;line-height:1.45;margin:0 0 15px}.saveChoice{display:block;width:100%;text-align:left;border:1px solid #30343a;background:#191c21;color:#fff;border-radius:15px;padding:13px;margin:9px 0}.saveChoice b{display:block;font-size:14px}.saveChoice span{display:block;font-size:10px;color:#9ca4ad;margin-top:4px;line-height:1.35}.saveChoice.primary{background:#f0cf00;color:#111;border-color:#f0cf00}.saveChoice.primary span{color:#3b3b33}.saveChoice.test{border-color:#59616c}.saveFoot{font-size:9px;color:#737b84;line-height:1.45;margin-top:12px}`;document.head.appendChild(s);}
function button(label,sub,cls,fn){const b=document.createElement('button');b.className='saveChoice '+(cls||'');b.innerHTML=`<b>${label}</b><span>${sub}</span>`;b.onclick=fn;return b;}

await new Promise(resolve=>{
  makeStyles();
  const root=document.createElement('div');root.id='saveSlotBoot';
  const box=document.createElement('div');box.className='box';box.innerHTML='<div class="k">BERLIN LIFE · SAVEGAME</div><h1>Kies je save</h1><p>Je testsave wordt apart bewaard. Een nieuwe game overschrijft die testsave niet.</p>';
  const main=registry.slots.main;
  if(main){const m=describe(main);box.appendChild(button('▶ Doorgaan met normale save',`Dag ${m.day} · ${euro(m.cents)} · ${m.done} koeriersjobs voltooid`,'primary',()=>choose('main')));}
  const test=registry.slots.test;
  if(test){const t=describe(test);box.appendChild(button('🧪 Bewaarde testsave',`Dag ${t.day} · ${euro(t.cents)} · ${t.done} koeriersjobs voltooid · blijft apart van je normale save`,'test',()=>choose('test')));}
  box.appendChild(button('＋ Nieuwe save starten',main?'Start opnieuw met je normale save. Je testsave blijft veilig bewaard.':'Begin opnieuw vanaf dag 1. Je huidige testsave blijft veilig bewaard.','',()=>newGame()));
  const foot=document.createElement('div');foot.className='saveFoot';foot.textContent='Saves staan lokaal op dit apparaat/browserprofiel. Wisselen kan door de game opnieuw te openen.';box.appendChild(foot);root.appendChild(box);document.body.appendChild(root);
  function finish(slot){registry.active=slot;writeRegistry(registry);root.remove();window.BerlinSaveSlots={version:VERSION,active:slot,registry};resolve();}
  function choose(id){const slot=registry.slots[id];if(!slot)return;restore(slot.data);finish(id);}
  function newGame(){clearCanonical();registry.slots.main={id:'main',label:'Normale save',createdAt:Date.now(),updatedAt:Date.now(),data:{}};writeRegistry(registry);finish('main');}
});

function syncActive(){const id=registry.active;if(!id||!registry.slots[id])return;registry.slots[id].data=snapshot();registry.slots[id].updatedAt=Date.now();writeRegistry(registry);}
setInterval(syncActive,1500);
addEventListener('pagehide',syncActive);
addEventListener('beforeunload',syncActive);
document.addEventListener('visibilitychange',()=>{if(document.hidden)syncActive();});
console.info('[Berlin Life] '+VERSION+' loaded · active slot '+registry.active);
