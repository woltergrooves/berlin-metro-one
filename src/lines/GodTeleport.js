// Berlin Life — GOD-menu: één overzichtelijk teleportblok voor alle lijnen (8 nov 2026, samen met de U9).
//
// Vroeger: bovenaan de tabs U2/U8 en daaronder per nieuwe lijn (U1, U3 … U9) een eigen blok met álle stations als
// knoppen — op iPhone/iPad een lange muur. Nu is dit de enige eigenaar van het teleportdeel van het GOD-menu:
//   • één rij lijnchips U1 … U9 in lijnkleur (met aantal haltes); standaard de lijn waar je nu bent;
//   • de stations van die lijn in een compact raster, met overstaplijnen als kleine badges en je huidige halte gemarkeerd;
//   • zoeken = over álle lijnen tegelijk (resultaten met lijnchip);
//   • daaronder het kopje "Tools" (tijd, geld, tickets, Street View-teller, kwaliteit) — die blokken blijven van hun eigenaar.
// U2/U8 teleporteren zoals InspectorGodV3 (tp2/tp8); vanaf een nieuwe lijn eerst die lijn verlaten.
import { Tick } from '../state/Tick.js';
import { CONFIG } from '../config.js';
import { U8_STOPS, U8_ALEX_INDEX, stopX } from '../systems/U8FullLineVisual.js';

const ORDER = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'];
const COLORS = { U1: '#55a822', U2: '#da421e', U3: '#16683d', U4: '#ffd900', U5: '#7e5330', U6: '#8c6dab', U7: '#528dba', U8: '#224f86', U9: '#f3791d' };
const TEXT = { U4: '#1a1a1a' };
let game = null, sel = null;
const status = { installed: false, renders: 0, teleports: 0 };

const chip = (id, small) => `<span class="tp9c${small ? ' s' : ''}" style="background:${COLORS[id] || '#555'};color:${TEXT[id] || '#fff'}">${id}</span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Alle lijnen die nu in het spel zijn, met hun teleportbare stations. */
function lines() {
  const out = [], BL = globalThis.BerlinLines || {};
  for (const id of ORDER) {
    if (id === 'U2') out.push({ id, stations: game.stations.map((s, i) => ({ name: s.name, i, transfers: [] })) });
    else if (id === 'U8') out.push({ id, stations: U8_STOPS.map((s, i) => ({ name: s.name, i, transfers: [] })) });
    else if (BL[id]?.enter) {
      const st = BL[id].godStations || BL[id].stations.filter(s => !s.shared);
      out.push({ id, stations: st.map(s => ({ name: s.name, i: s.index, transfers: (s.transfers || []).filter(t => /^U\d$/.test(t)) })) });
    }
  }
  return out;
}

/** Waar staat de speler nu? → { id, i } */
function here() {
  const p = game.player;
  if (p.__line) return { id: p.__line, i: p.__lineStation };
  if (Number.isInteger(p.__u8FullStation)) return { id: 'U8', i: p.__u8FullStation };
  const i = game.stations.indexOf(p.currentStation);
  return { id: 'U2', i };
}

function resetU8(p) {
  p.activeTrain = null; p.__u8Active = false; p.__u8Area = false; p.__u8FullStation = null;
  p.__u8LastTrainX = null; p.__u8ActiveTrainId = null; p.__u8LocalX = null; p.__u8LocalZ = null;
  globalThis.__berlinMetroU8Passenger = false;
}

function teleport(id, i) {
  const p = game.player, BL = globalThis.BerlinLines || {};
  status.teleports++;
  if (id !== 'U2' && id !== 'U8') { BL[id].enter(i); return; }
  if (p.__line) BL[p.__line]?.leave?.();   // eerst de nieuwe lijn netjes verlaten (rit, HUD, save-locatie)
  resetU8(p);
  if (id === 'U2') {
    const s = game.stations[i];
    p.position.set(2.75, CONFIG.player.eyeHeight, s.z); p.yaw = p.pitch = 0;
    game.world?.update?.(s.z);
    game.ui?.notify?.(`GOD → U2 ${s.name}`);
  } else {
    const a = game.stations.find(s => s.id === 'alexanderplatz');
    p.position.set(stopX(i), CONFIG.player.eyeHeight - 4, a.z + 49); p.__u8FullStation = i; p.__u8Area = true; p.yaw = p.pitch = 0;
    for (const s of U8_STOPS) { if (s.id === U8_ALEX_INDEX) continue; const q = game.scene.getObjectByName(`U8:${s.name}`); if (q) q.visible = s.id === i; }
    game.ui?.notify?.(`GOD → U8 ${U8_STOPS[i].name}`);
  }
}

function render() {
  const tabs = document.querySelector('#tabs3'), list = document.querySelector('#list3'), q = document.querySelector('#search3'), count = document.querySelector('#count3');
  if (!tabs || !list) return;
  const all = lines(), h = here();
  if (!sel || !all.some(l => l.id === sel)) sel = all.some(l => l.id === h.id) ? h.id : 'U2';
  tabs.innerHTML = all.map(l => `<button data-l="${l.id}" class="${l.id === sel ? 'on' : ''}" style="--c:${COLORS[l.id]}">${chip(l.id)}<small>${l.stations.length}</small></button>`).join('');
  tabs.querySelectorAll('button').forEach(b => { b.onclick = ev => { ev.stopPropagation(); sel = b.dataset.l; if (q) q.value = ''; render(); }; });
  const x = (q?.value || '').trim().toLowerCase();
  const rows = x
    ? all.flatMap(l => l.stations.filter(s => s.name.toLowerCase().includes(x)).map(s => ({ l, s })))
    : (all.find(l => l.id === sel)?.stations || []).map(s => ({ l: all.find(z => z.id === sel), s }));
  const L = all.find(l => l.id === sel);
  if (count) count.textContent = x ? `${rows.length} haltes gevonden op alle lijnen` : `${L.id} · ${L.stations[0]?.name} ⇄ ${L.stations.at(-1)?.name} · ${L.stations.length} haltes`;
  list.innerHTML = rows.map(({ l, s }) => {
    const me = h.id === l.id && h.i === s.i;
    return `<button data-l="${l.id}" data-i="${s.i}" class="tp9s${me ? ' me' : ''}" style="--c:${COLORS[l.id]}">${x ? chip(l.id, true) : ''}<span class="n">${esc(s.name)}</span>`
      + `<span class="t">${me ? '📍' : x ? '' : s.transfers.filter(t => t !== l.id).map(t => chip(t, true)).join('')}</span></button>`;   // zoeken: geen badges, naam krijgt de ruimte
  }).join('') || '<small style="padding:6px;color:#aaa">Geen halte gevonden</small>';
  list.querySelectorAll('button[data-l]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); document.querySelector('#gp3')?.classList.remove('on'); teleport(b.dataset.l, Number(b.dataset.i)); }; });
  status.renders++;
}

function install() {
  const panel = document.querySelector('#gp3'), tabs = document.querySelector('#tabs3'), list = document.querySelector('#list3'),
    q = document.querySelector('#search3'), count = document.querySelector('#count3'), tools = document.querySelector('#tools3'), btn = document.querySelector('#god3');
  if (!panel || !tabs || !list || !q || !count || !tools || !btn) return false;
  const css = document.createElement('style'); css.id = 'godTeleportStyle';
  css.textContent = `#gp3 #tp9{display:block!important;margin:4px 10px 8px;padding:8px 0 4px;border-radius:12px;background:#ffffff0c;border:1px solid #ffffff1c}
#gp3 .tp9h{display:block!important;padding:2px 10px 6px!important;color:#ffd928;font:900 13px Arial}
#gp3 #tabs3{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px!important;padding:0 10px 8px!important}
#gp3 #tabs3 button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px!important;background:#24272c!important;border:2px solid transparent!important;min-height:46px}
#gp3 #tabs3 button.on{border-color:var(--c)!important;background:#33373e!important}
#gp3 #tabs3 small{color:#aaa;font:700 10px Arial}
#gp3 .tp9c{display:inline-block;min-width:26px;padding:2px 5px;border-radius:4px;font:900 12px Arial;text-align:center}
#gp3 .tp9c.s{min-width:20px;padding:1px 3px;font-size:9px;margin-left:2px}
#gp3 #list3{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))!important;gap:5px!important;padding:2px 10px 10px!important;max-height:none}
#gp3 #list3 button.tp9s{display:flex;align-items:center;gap:5px;min-height:38px!important;padding:6px 8px!important;background:#24272c!important;border-left:4px solid var(--c)!important;text-align:left;font:700 12px Arial}
#gp3 #list3 button.tp9s .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#gp3 #list3 button.tp9s .t{flex:none;white-space:nowrap}
#gp3 #list3 button.tp9s.me{background:#3a3520!important;outline:1px solid #ffd92866}
#gp3 #count3{display:block!important;padding:0 12px 6px!important;color:#aaa}
#gp3 .tp9tools{display:block!important;padding:10px 12px 0!important;color:#ffd928;font:900 13px Arial}`;
  document.head.appendChild(css);
  // Teleportblok direct onder de kop: lijnchips, zoeken, aantal, lijst bij elkaar.
  const box = document.createElement('div'); box.id = 'tp9';
  box.innerHTML = '<span class="tp9h">🚇 Teleport</span>';
  panel.insertBefore(box, tabs);
  q.placeholder = 'Zoek een halte op alle lijnen…';
  box.append(tabs, q, count, list);
  const head = document.createElement('div'); head.className = 'tp9tools'; head.textContent = '🛠 Tools';
  box.after(head);
  // Oude per-lijn-blokken (van vóór 8 nov) weghalen, mochten ze er nog staan.
  for (const id of ORDER) document.querySelector(`#${id}God`)?.remove();
  // Openen/zoeken: eigen weergave (de oude handlers van InspectorGodV3 tekenen alleen U2/U8).
  const open = btn.onclick;
  btn.onclick = ev => { open?.call(btn, ev); if (!panel.classList.contains('on')) return; q.value = ''; sel = here().id; render(); list.querySelector('.me')?.scrollIntoView({ block: 'nearest' }); };
  q.oninput = render;
  render();
  status.installed = true;
  return true;
}

(async () => {
  for (let i = 0; i < 600; i++) {
    game = globalThis.__berlinMetroGame;
    if (game?.player && game?.stations && install()) return;
    await Tick.sleep(250, 'boot.GodTeleport');
  }
})().catch(e => console.error('[Metro] GodTeleport failed', e));

export const GodTeleport = { status: () => ({ ...status, sel, lines: game ? lines().map(l => `${l.id}:${l.stations.length}`) : [] }), render, teleport };
globalThis.BerlinGodTeleport = GodTeleport;
