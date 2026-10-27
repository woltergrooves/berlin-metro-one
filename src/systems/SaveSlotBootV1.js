import { Tick } from '../state/Tick.js';
// Savegame-keuze bij het opstarten. Sinds Game State 2.0 stap 2 bewaart elk slot een volledige save
// in één formaat (zie src/state/SaveFormat.js). Het keuzescherm zelf is ongewijzigd.
import {
  REGISTRY_KEY, BACKUP_KEY, FORMAT, LEGACY_CANONICAL_KEYS, CANONICAL_KEYS, slotKeys,
  safeParse, emptyRegistry, migrateRegistry, migrateSlot, capture, describe, exportSlot,
} from '../state/SaveFormat.js';

const VERSION = 'Save Slots v2.0 (formaat 2)';
const getItem = k => { try { return localStorage.getItem(k); } catch { return null; } };
const setItem = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn('[Berlin Life] Opslaan mislukt', k, e?.name || e); return false; } };
const removeItem = k => { try { localStorage.removeItem(k); } catch {} };

function loadRegistry() {
  const raw = getItem(REGISTRY_KEY);
  const r = safeParse(raw, null);
  if (!r || r.schema !== 1) return emptyRegistry();
  const { registry, changed } = migrateRegistry(r, getItem);
  if (changed) {
    // Eénmalige reservekopie van het register zoals het was vóór formaat 2.
    if (raw && getItem(BACKUP_KEY) == null) setItem(BACKUP_KEY, raw);
    writeRegistry(registry);
    console.info('[Berlin Life] Saves omgezet naar formaat', FORMAT, '·', Object.keys(registry.slots).join(', ') || 'geen slots');
  }
  return registry;
}
function writeRegistry(r) { return setItem(REGISTRY_KEY, JSON.stringify(r)); }
function clearCanonical() { for (const key of CANONICAL_KEYS) removeItem(key); }
function restore(id, data) { clearCanonical(); for (const [k, v] of Object.entries(data || {})) setItem(k, v); }
function euro(c) { return `€${((c || 0) / 100).toFixed(2).replace('.', ',')}`; }

const registry = loadRegistry();

// Oude saves van vóór de slots: bewaar ze één keer als testsave (ongewijzigd gedrag).
const legacy = {};
for (const k of LEGACY_CANONICAL_KEYS) { const v = getItem(k); if (v != null) legacy[k] = v; }
if (!registry.slots.test && Object.keys(legacy).length) {
  registry.slots.test = migrateSlot({ id: 'test', label: 'Bewaarde testsave', createdAt: Date.now(), updatedAt: Date.now(), data: legacy }, 'test', getItem).slot;
  writeRegistry(registry);
}

function makeStyles(){const s=document.createElement('style');s.textContent=`#saveSlotBoot{position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 12%,#1d2631 0,#090b0e 52%,#050607 100%);color:#fff;display:flex;align-items:center;justify-content:center;padding:18px;font-family:-apple-system,BlinkMacSystemFont,Inter,Arial,sans-serif}#saveSlotBoot .box{width:min(430px,94vw);background:rgba(17,20,25,.96);border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:20px;box-shadow:0 32px 90px rgba(0,0,0,.62)}#saveSlotBoot .k{font-size:10px;font-weight:900;color:#f0cf00;letter-spacing:.14em}#saveSlotBoot h1{font-size:27px;margin:5px 0 4px}#saveSlotBoot p{font-size:12px;color:#aeb5be;line-height:1.45;margin:0 0 15px}.saveChoice{display:block;width:100%;text-align:left;border:1px solid #30343a;background:#191c21;color:#fff;border-radius:15px;padding:13px;margin:9px 0}.saveChoice b{display:block;font-size:14px}.saveChoice span{display:block;font-size:10px;color:#9ca4ad;margin-top:4px;line-height:1.35}.saveChoice.primary{background:#f0cf00;color:#111;border-color:#f0cf00}.saveChoice.primary span{color:#3b3b33}.saveChoice.test{border-color:#59616c}.saveFoot{font-size:9px;color:#737b84;line-height:1.45;margin-top:12px}`;document.head.appendChild(s);}
function button(label,sub,cls,fn){const b=document.createElement('button');b.className='saveChoice '+(cls||'');b.innerHTML=`<b>${label}</b><span>${sub}</span>`;b.onclick=fn;return b;}

function syncActive() {
  const id = registry.active, slot = id && registry.slots[id];
  if (!slot) return;
  slot.data = capture(id, getItem);
  slot.format = FORMAT;
  slot.updatedAt = slot.savedAt = Date.now();
  writeRegistry(registry);
}

const api = {
  version: VERSION,
  format: FORMAT,
  active: null,
  registry,
  /** Overzicht van alle saves. */
  list: () => Object.entries(registry.slots).map(([id, s]) => ({ id, label: s.label, active: id === registry.active, savedAt: s.savedAt || s.updatedAt, ...describe(s) })),
  /** Sla de actieve save nu meteen op. */
  saveNow: () => { syncActive(); return true; },
  /** Volledige save van een slot als object (voor export of controle). */
  exportSlot: (id = registry.active) => (registry.slots[id] ? exportSlot(registry.slots[id], id) : null),
};

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
  function finish(id){registry.active=id;writeRegistry(registry);root.remove();api.active=id;window.BerlinSaveSlots=api;resolve();}
  function choose(id){const slot=registry.slots[id];if(!slot)return;restore(id,slot.data);finish(id);}
  function newGame(){
    // Een nieuwe normale save begint echt leeg: ook de economie en ontdekkingen van de vorige
    // normale save (sleutels met '@main') gaan weg. Voorheen bleven die per ongeluk staan.
    clearCanonical();
    for(const k of slotKeys('main'))removeItem(k);
    registry.slots.main={id:'main',label:'Normale save',format:FORMAT,createdAt:Date.now(),updatedAt:Date.now(),savedAt:Date.now(),data:{}};
    writeRegistry(registry);finish('main');
  }
});

Tick.every('saves.sync-active',1500,syncActive);
addEventListener('pagehide',syncActive);
addEventListener('beforeunload',syncActive);
document.addEventListener('visibilitychange',()=>{if(document.hidden)syncActive();});
console.info('[Berlin Life] '+VERSION+' loaded · active slot '+registry.active);
