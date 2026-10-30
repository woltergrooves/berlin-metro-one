// Berlin Life — StreetScreen: het scherm boven Street View (enige eigenaar van de bediening buiten).
//
// Street View zelf (iframe, gratis embed) blijft van StreetCoreClean (`game.__allStreetOverlay`). Dit bestand
// tekent alles eromheen: HUD (lijn, halte, klok, geld, Pfand, kaartje, tas), de knop terug naar de U-Bahn,
// "Buurt" met een kaartje en echte plekken uit OpenStreetMap (public/assets/places/<halte>.json, gemaakt met
// tools/places/osm2places.py), en per plek iets wat je echt kunt doen: kopen, eten, Pfand inleveren, uitgaan,
// bezienswaardigheden bekijken (Berlin Stamp), pauze in het park, werk en verhalen (BerlinCityEpisodes).
//
// "Loop erheen" kost speltijd (≈ 80 m per minuut) en zet Street View op de plek zelf; handelingen kunnen pas
// als je er bent. Oude buitenknoppen (UiClean, Phase16-hotspots, CleanHud) worden in Street View verborgen.
// Stand (stempels, bezoeken, Pfand gezocht) in de save: Store-sectie `street`.
// Console: BerlinStreet.status(), .open(), .go(index), .pack().
import { Tick } from '../state/Tick.js';
import { readSection, writeSection } from '../state/Store.js';

const ECON_KEY = 'metro-economy-v2';
const WALK_M_PER_MIN = 80;
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '');
const euro = c => `€${((c || 0) / 100).toFixed(2).replace('.', ',')}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const LINE_COLORS = { U1: '#55a822', U2: '#da421e', U3: '#16683d', U4: '#f0d722', U5: '#7e5330', U6: '#8c6dab', U7: '#528dba', U8: '#224f86', U9: '#f3791d' };

// ── Soorten plekken: uiterlijk, openingstijden (uren, eind mag > 24) en wat je er kunt doen ──────────
// items: [id, naam, prijs in centen, emoji, minuten]. Gegeten/gedronken spullen gaan in de tas.
const KINDS = {
  spati:  { label: 'Späti', emoji: '🏪', color: '#f2c230', group: 'eten', hours: [6, 26], pfand: true, items: [
    ['mate', 'Club-Mate', 220, '🧉'], ['sterni', 'Sternburg', 130, '🍺'], ['wasser', 'Wasser', 120, '💧'], ['cola', 'Cola', 180, '🥤'], ['chips', 'Chips', 250, '🥔'], ['kaugummi', 'Kaugummi', 100, '🟢']] },
  super:  { label: 'Supermarkt', emoji: '🛒', color: '#f2c230', group: 'eten', hours: [7, 22], pfand: true, items: [
    ['broetchen', 'Brötchen', 45, '🥖'], ['banane', 'Banane', 35, '🍌'], ['wasser', 'Wasser', 50, '💧'], ['pasta', 'Pasta', 129, '🍝'], ['kaese', 'Käse', 249, '🧀']] },
  bakery: { label: 'Bäckerei', emoji: '🥐', color: '#e8a54b', group: 'eten', hours: [6, 18], items: [
    ['kaffee', 'Kaffee', 280, '☕'], ['brezel', 'Brezel', 160, '🥨'], ['croissant', 'Croissant', 220, '🥐'], ['franzbroetchen', 'Franzbrötchen', 240, '🥯']] },
  cafe:   { label: 'Café', emoji: '☕', color: '#c98a5a', group: 'eten', hours: [8, 19], sit: 20, items: [
    ['cappuccino', 'Cappuccino', 340, '☕'], ['flatwhite', 'Flat White', 380, '☕'], ['kuchen', 'Kuchen', 390, '🍰']] },
  imbiss: { label: 'Imbiss', emoji: '🥙', color: '#e07b39', group: 'eten', hours: [10, 28], items: [
    ['doener', 'Döner', 700, '🥙'], ['duerum', 'Dürüm', 780, '🌯'], ['currywurst', 'Currywurst', 450, '🌭'], ['pommes', 'Pommes', 350, '🍟'], ['ayran', 'Ayran', 180, '🥛']] },
  restaurant: { label: 'Restaurant', emoji: '🍽️', color: '#d9694a', group: 'eten', hours: [12, 23], meal: { cost: 1450, minutes: 60 } },
  bar:    { label: 'Bar', emoji: '🍻', color: '#b0569c', group: 'uit', hours: [17, 27], sit: 30, items: [
    ['bier', 'Bier', 450, '🍺'], ['radler', 'Radler', 420, '🍋'], ['mate', 'Club-Mate', 350, '🧉']] },
  club:   { label: 'Club', emoji: '🎧', color: '#7c4dbd', group: 'uit', hours: [23, 31], club: { cost: 1500, minutes: 180 } },
  mall:   { label: 'Warenhuis', emoji: '🏬', color: '#4f8fd6', group: 'winkel', hours: [10, 20], sit: 30, items: [
    ['parfum', 'Parfum', 3900, '🧴'], ['pralinen', 'Pralinen', 1290, '🍫'], ['schal', 'Schal', 2900, '🧣'], ['jacket', 'Jacke', 8900, '🧥']] },
  clothes:{ label: 'Kleding', emoji: '👕', color: '#4f8fd6', group: 'winkel', hours: [11, 20], items: [
    ['shirt', 'Vintage Shirt', 1800, '👕'], ['cap', 'Cap', 1400, '🧢'], ['tote', 'Tote Bag', 900, '👜'], ['jacket', 'Jacke', 4500, '🧥']] },
  books:  { label: 'Boeken & platen', emoji: '📚', color: '#4f8fd6', group: 'winkel', hours: [10, 20], items: [
    ['buch', 'Buch', 1200, '📕'], ['platte', 'Schallplatte', 2200, '💿'], ['postkarte', 'Postkarte', 150, '💌']] },
  culture:{ label: 'Cultuur', emoji: '🎭', color: '#3fa7a0', group: 'zien', hours: [10, 23], ticket: { cost: 1200, minutes: 90 } },
  sight:  { label: 'Bezienswaardigheid', emoji: '📸', color: '#2fa36b', group: 'zien', hours: null, stamp: true },
  park:   { label: 'Park', emoji: '🌳', color: '#3b9a4a', group: 'zien', hours: null, rest: 30 },
  market: { label: 'Markt', emoji: '🧺', color: '#c9a23a', group: 'winkel', hours: [9, 18], items: [
    ['obst', 'Obst', 300, '🍎'], ['gemuese', 'Gemüse', 350, '🥕'], ['blumen', 'Blumen', 600, '💐']] },
};
const GROUPS = [['alles', 'Alles'], ['eten', 'Eten & drinken'], ['winkel', 'Winkels'], ['uit', 'Uitgaan'], ['zien', 'Zien'], ['werk', 'Werk & verhalen']];
// Weergavenamen voor spullen uit oudere systemen (zelfde tas).
const OLD_ITEMS = { mate: ['Club-Mate', '🧉'], wasser: ['Wasser', '💧'], cola: ['Cola', '🥤'], chips: ['Chips', '🥔'], riegel: ['Schokoriegel', '🍫'], kaugummi: ['Kaugummi', '🟢'], delivery_package: ['Pakket (levering)', '📦'] };
const ITEM_NAMES = { ...OLD_ITEMS };
for (const k of Object.values(KINDS)) for (const [id, n, , e] of k.items || []) ITEM_NAMES[id] ??= [n, e];

let game = null, ov = null, ui = null;
let ctx = null, pack = null, packKey = '', here = null, filter = 'alles', sheetOpen = false, cardIndex = -1, cardEpisode = null;
const status = { installed: false, opens: 0, packs: 0, packMiss: 0, walks: 0, buys: 0, stamps: 0, lastError: null };
const packCache = new Map();

// ── Opslag ─────────────────────────────────────────────────────────────────────────────────────
const street = () => { const s = readSection('street') || {}; s.stamps ??= {}; s.visits ??= {}; s.pfandSearched ??= {}; s.clubs ??= {}; return s; };
const saveStreet = s => writeSection('street', s);
function econ() {
  let s = game?.metroEconomy;
  if (!s) { try { s = JSON.parse(localStorage.getItem(ECON_KEY) || 'null'); } catch { s = null; } }
  if (!s) return null;
  s.surfaceItems ??= {}; s.pfand ??= 0;
  return s;
}
function saveEcon(s) {
  if (!s) return;
  try { localStorage.setItem(ECON_KEY, JSON.stringify(s)); } catch {}
  if (game.economy) { game.economy.balanceCents = s.balanceCents || 0; game.economy.collectedPfand = s.pfand || 0; game.economy.hasTicket = !!s.ticket; }
  game.ui?.updateEconomy?.({ balanceCents: s.balanceCents || 0, hasTicket: !!s.ticket, collectedPfand: s.pfand || 0, ticketCents: 400 });
  document.dispatchEvent(new CustomEvent('metro-economy-changed'));
  globalThis.BerlinLife?.save?.();
}
function pay(cents, what) {
  const s = econ(); if (!s) { notify('Portemonnee niet beschikbaar'); return false; }
  if ((s.balanceCents || 0) < cents) { notify(`Nog ${euro(cents - (s.balanceCents || 0))} nodig voor ${what}`); return false; }
  s.balanceCents -= cents; saveEcon(s); return true;
}
const clock = () => globalThis.BerlinState?.clock;
const minuteOfDay = () => { const c = clock(); return Number.isFinite(c?.minute) ? c.minute : 720; };
const passTime = min => { try { clock()?.advance?.(min); } catch {} };
const dayNumber = () => clock()?.dayNumber || 1;
const notify = msg => game?.ui?.notify?.(msg);

function isOpen(kind) {
  const k = KINDS[kind]; if (!k?.hours) return true;
  const [a, b] = k.hours, m = minuteOfDay() / 60;
  return (m >= a && m < b) || (m + 24 >= a && m + 24 < b);
}
const hoursText = kind => { const h = KINDS[kind]?.hours; if (!h) return 'altijd open'; const f = v => `${String(v % 24).padStart(2, '0')}:00`; return `${f(h[0])}–${f(h[1])}`; };

// ── Buurtpakket ────────────────────────────────────────────────────────────────────────────────
async function loadPack(name) {
  const key = norm(name);
  if (packCache.has(key)) return packCache.get(key);
  let p = null;
  try { const r = await fetch(`assets/places/${key}.json`); if (r.ok) p = await r.json(); } catch (e) { status.lastError = String(e); }
  if (p) status.packs++; else status.packMiss++;
  packCache.set(key, p);
  return p;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const walkMin = d => Math.max(1, Math.round(d / WALK_M_PER_MIN));
const atPlace = i => here && here.place === i;

// ── Street View verplaatsen (gratis embed) ────────────────────────────────────────────────────
function svUrl(lat, lng, heading = 0) { return `https://maps.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=12,${Math.round(heading)},,0,0&source=embed&output=svembed`; }
function showAt(lat, lng, heading) {
  if (!ov?.frame) return;
  // Betaalde Street View actief? Dan het bestaande panorama verplaatsen (geen nieuwe instantie, geen iframe).
  const sv = globalThis.BerlinStreetView2, pano = sv?.getPanorama?.();
  if (sv?.state?.mode === 'programmable' && pano?.setPosition) {
    try { pano.setPosition({ lat, lng }); pano.setPov?.({ heading: heading || 0, pitch: 0 }); sv.state.paidLoads = (sv.state.paidLoads || 0) + 1; return; } catch {}
  }
  const canvas = ov.root.querySelector('#berlin-programmable-streetview'); if (canvas) canvas.style.display = 'none';
  ov.frame.style.display = 'block'; ov.frame.src = svUrl(lat, lng, heading);
}
const bearing = (from, to) => (Math.atan2(to.x - from.x, to.y - from.y) * 180 / Math.PI + 360) % 360;

// ── DOM ───────────────────────────────────────────────────────────────────────────────────────
const CSS = `
html.bl-street #street-clean-ui,html.bl-street #street-clean-menu,html.bl-street #cleanHudV1,html.bl-street #streetCommerceV4,
html.bl-street #stationLifeV5,html.bl-street #streetHotspotV3,html.bl-street #bl-nearby,html.bl-street #bl-chip{display:none!important}
#bls{position:fixed;inset:0;z-index:11900;pointer-events:none;display:none;color:#fff;font:600 13px/1.3 system-ui,-apple-system,Arial,sans-serif;-webkit-user-select:none;user-select:none}
#bls.on{display:block}
#bls button{font:800 13px system-ui,-apple-system,Arial;border:0;border-radius:12px;color:#fff;min-height:44px;padding:0 14px;pointer-events:auto;touch-action:manipulation;cursor:pointer}
#bls .bar{position:absolute;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
#bls .pill{background:#0d141ce6;border:1px solid #ffffff22;border-radius:13px;padding:7px 10px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 6px 20px #0007}
#bls .where{display:flex;align-items:center;gap:8px;min-width:0;max-width:52%}
#bls .where .t{min-width:0}#bls .where b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bls .where small{display:block;color:#b9c6d3;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bls .badge{display:inline-block;border-radius:5px;padding:2px 6px;font:900 12px Arial;margin-right:3px}
#bls .stats{display:flex;align-items:center;gap:10px;pointer-events:auto;font-variant-numeric:tabular-nums;white-space:nowrap}
#bls .stats button{min-height:32px;padding:0 8px;background:#ffffff1c;border-radius:9px}
#bls .bottom{position:absolute;left:max(10px,env(safe-area-inset-left));right:max(124px,calc(env(safe-area-inset-right) + 124px));bottom:max(12px,env(safe-area-inset-bottom));display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
#bls .back{background:#1467b4}#bls .buurt{background:#f2c230;color:#111}#bls .move{background:#ffffff26}
#bls .here{background:#0d141ce6;border:1px solid #ffffff30}
#bls-sheet{position:fixed;z-index:11950;display:none;pointer-events:auto;color:#fff;font:600 13px/1.35 system-ui,-apple-system,Arial;background:#121a24f5;
  box-shadow:0 10px 40px #000a;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden;flex-direction:column}
#bls-sheet.on{display:flex}
@media (min-width:700px){#bls-sheet{right:max(10px,env(safe-area-inset-right));top:max(70px,calc(env(safe-area-inset-top) + 64px));bottom:max(126px,calc(env(safe-area-inset-bottom) + 118px));width:min(420px,46vw);border-radius:18px}}
@media (max-width:699px){#bls-sheet{left:0;right:0;bottom:0;max-height:80dvh;border-radius:18px 18px 0 0}
  html.bl-street.bl-sheet #bls .bottom,html.bl-street.bl-sheet #phoneBtnV2,html.bl-street.bl-sheet #god3{display:none!important}
  #bls .where{max-width:none;flex:1 1 120px}#bls .stats{gap:7px;font-size:12px;padding:6px 8px}#bls .stats .tk{display:none}#bls .where b{font-size:14px}}
#bls-sheet header{display:flex;align-items:center;gap:8px;padding:12px 12px 8px}
#bls-sheet header b{font-size:16px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bls-sheet button{font:800 13px system-ui,-apple-system,Arial;border:0;border-radius:11px;color:#fff;background:#2a3a4d;min-height:42px;padding:0 13px;touch-action:manipulation;cursor:pointer}
#bls-sheet .x{background:#33465c;min-width:42px;padding:0}
#bls-sheet .scroll{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 12px calc(14px + env(safe-area-inset-bottom));min-height:0;flex:1}
#bls-sheet canvas{width:100%;aspect-ratio:1/1;max-height:38dvh;border-radius:14px;background:#e9e6df;display:block;margin:0 auto 8px;touch-action:manipulation}
#bls-sheet .chips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}
#bls-sheet .chips button{min-height:34px;padding:0 11px;border-radius:17px;background:#243243;white-space:nowrap;font-size:12px}
#bls-sheet .chips button.on{background:#f2c230;color:#111}
#bls-sheet .row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#1c2836;border-radius:12px;padding:9px 11px;margin:6px 0;min-height:52px}
#bls-sheet .row .e{font-size:22px;width:28px;text-align:center}
#bls-sheet .row .n{flex:1;min-width:0}#bls-sheet .row .n b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#bls-sheet .row small,#bls-sheet .muted{color:#a9b7c6;font-weight:600}
#bls-sheet .row .d{color:#cfd8e2;font-size:12px;white-space:nowrap}
#bls-sheet .row.here{outline:2px solid #f2c230}
#bls-sheet .dot{display:inline-block;width:8px;height:8px;border-radius:4px;margin-right:4px;vertical-align:1px}
#bls-sheet .card{background:#1c2836;border-radius:14px;padding:12px;margin:6px 0}
#bls-sheet .card p{margin:6px 0;color:#e6ecf2;font-weight:500}
#bls-sheet .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
#bls-sheet .grid button,#bls-sheet .wide{background:#2b3c50;display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left;min-height:48px}
#bls-sheet .wide{width:100%;margin-top:8px}
#bls-sheet .go{background:#1467b4;justify-content:center}#bls-sheet .yes{background:#158a5c}#bls-sheet .gold{background:#f2c230;color:#111}
#bls-sheet .stamp{display:inline-block;border:2px dashed #f2c230;color:#f2c230;border-radius:10px;padding:4px 9px;margin-top:6px;font-weight:900}
#bls-sheet h4{margin:14px 0 4px;font-size:12px;color:#a9b7c6;text-transform:uppercase;letter-spacing:.05em}
#bls-sheet .credit{color:#7f8d9b;font-size:10px;text-align:right;margin:-4px 2px 6px}
`;

function buildUi() {
  const st = document.createElement('style'); st.id = 'blsCss'; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'bls';
  root.innerHTML = `
    <div class="bar">
      <div class="where pill"><span class="badges"></span><span class="t"><b class="name">Berlijn</b><small class="sub">Street View</small></span></div>
      <div class="stats pill"><span class="clk">--:--</span><span class="money">€0,00</span><span class="pf">♻ 0</span><span class="tk">🎫 —</span><button class="bag" aria-label="Tas">🎒</button></div>
    </div>
    <div class="bottom">
      <button class="back">← U-Bahn</button>
      <button class="buurt">🗺 Buurt</button>
      <button class="move" title="Ander standpunt in de buurt">🔄</button>
      <button class="here" style="display:none"></button>
    </div>`;
  document.body.appendChild(root);
  const sheet = document.createElement('div'); sheet.id = 'bls-sheet';
  sheet.innerHTML = `<header><button class="x back2" aria-label="Terug">‹</button><b class="title">Buurt</b><button class="x close" aria-label="Sluiten">✕</button></header><div class="scroll"></div>`;
  document.body.appendChild(sheet);
  const q = s => root.querySelector(s);
  ui = { root, sheet, q, body: sheet.querySelector('.scroll'), title: sheet.querySelector('.title'), back2: sheet.querySelector('.back2') };
  q('.back').onclick = () => { closeSheet(); ov?.close?.(); };
  q('.buurt').onclick = () => (sheetOpen ? closeSheet() : openList());
  q('.move').onclick = () => nudge();
  q('.bag').onclick = () => openBag();
  q('.here').onclick = () => { if (here?.place >= 0) openPlace(here.place); };
  sheet.querySelector('.close').onclick = closeSheet;
  ui.back2.onclick = () => openList();
  // Tikken op het spel/Street View sluit niets; alleen de knoppen.
}

// ── HUD ─────────────────────────────────────────────────────────────────────────────────────────
let lastHud = '';
function renderHud() {
  const s = econ(), c = clock();
  const lines = (pack?.lines?.length ? pack.lines : [ctx?.line || 'U']).flatMap(l => String(l).split('/'));
  const placeName = here && here.place >= 0 ? pack.places[here.place].name : null;
  const tk = !s?.ticket ? '🎫 —' : s.ticket.type === 'AB' ? `🎫 ${Math.max(0, Math.ceil(s.ticket.remainingMinutes || 0))}m` : `🎫 ${Math.max(0, s.ticket.remainingStops || 0)}`;
  const key = [lines.join(), ctx?.name, placeName, c?.hhmm, c?.weekdayName, s?.balanceCents, s?.pfand, tk].join('|');
  if (key === lastHud) return; lastHud = key;
  ui.q('.badges').innerHTML = [...new Set(lines)].map(l => `<span class="badge" style="background:${LINE_COLORS[l] || '#555'}">${esc(l)}</span>`).join('');
  ui.q('.name').textContent = ctx?.name || 'Berlijn';
  ui.q('.sub').textContent = placeName ? `📍 bij ${placeName}` : 'Buiten bij de halte';
  ui.q('.clk').textContent = `${c?.weekdayName ? c.weekdayName.slice(0, 2) + ' ' : ''}${c?.hhmm || '--:--'}`;
  ui.q('.money').textContent = `💶 ${euro(s?.balanceCents)}`;
  ui.q('.pf').textContent = `♻ ${s?.pfand || 0}`;
  ui.q('.tk').textContent = tk;
  const hb = ui.q('.here');
  if (placeName) { const k = KINDS[pack.places[here.place].kind]; hb.textContent = `${k.emoji} ${placeName}`; hb.style.display = ''; }
  else hb.style.display = 'none';
}

// ── Lijst + kaart ───────────────────────────────────────────────────────────────────────────────
function episodes() {
  const d = globalThis.BerlinCityDiscovery, ep = globalThis.BerlinCityEpisodes;
  let list = [];
  try { list = d?.activities?.() || []; } catch {}
  // Alleen wat bij deze halte hoort en waar echt iets te doen is (verhaal/klus).
  const sid = norm(ctx?.name);
  return list.filter(a => ep?.has?.(a.id) && (!a.id.includes(':') || norm(a.id.split(':')[0]) === sid || norm(d?.where?.()?.name) === sid));
}
function openList() {
  sheetOpen = true; cardIndex = -1; cardEpisode = null;
  showSheet(); ui.back2.style.visibility = 'hidden';
  ui.title.textContent = `${ctx?.name || 'Buurt'} · buurt`;
  const places = pack?.places || [], eps = episodes();
  const chips = GROUPS.filter(([g]) => g === 'alles' || (g === 'werk' ? eps.length : places.some(p => KINDS[p.kind]?.group === g)))
    .map(([g, n]) => `<button data-g="${g}" class="${g === filter ? 'on' : ''}">${n}</button>`).join('');
  const from = here || { x: 0, y: 0 };
  const rows = places.map((p, i) => ({ p, i, d: dist(from, p) }))
    .filter(r => filter === 'alles' || KINDS[r.p.kind]?.group === filter)
    .sort((a, b) => a.d - b.d)
    .map(({ p, i, d }) => {
      const k = KINDS[p.kind], open = isOpen(p.kind), stamp = k.stamp && street().stamps[stampKey(p)];
      return `<button class="row${atPlace(i) ? ' here' : ''}" data-i="${i}"><span class="e">${k.emoji}</span><span class="n"><b>${esc(p.name)}</b>` +
        `<small><span class="dot" style="background:${open ? '#3ccf7a' : '#e05a4f'}"></span>${k.label}${k.hours ? (open ? ' · open' : ' · dicht') : ''}${stamp ? ' · ✅ stempel' : ''}</small></span>` +
        `<span class="d">${atPlace(i) ? 'hier' : `${Math.round(d)} m · ${walkMin(d)} min`}</span></button>`;
    }).join('');
  const work = (filter === 'alles' || filter === 'werk') && eps.length
    ? `<h4>Werk & verhalen</h4>` + eps.map(a => `<button class="row" data-ep="${esc(a.id)}"><span class="e">${a.icon || '💼'}</span><span class="n"><b>${esc(a.name)}</b><small>${esc(a.detail || 'Verhaal')}</small></span><span class="d">›</span></button>`).join('')
    : '';
  const pfandKey = `${norm(ctx?.name)}:${here?.place ?? -1}:${dayNumber()}`;
  ui.body.innerHTML = `<canvas width="640" height="640"></canvas><div class="credit">${esc(pack?.credit || '')}</div>` +
    `<div class="chips">${chips}</div>` +
    (here?.place >= 0 ? `<button class="wide go" data-home="1">🚇 Terug naar de ingang van ${esc(ctx?.name || 'de halte')} (${walkMin(dist(here, { x: 0, y: 0 }))} min)</button>` : '') +
    (street().pfandSearched[pfandKey] ? '' : `<button class="wide" data-pfand="1"><span>♻ Zoek Pfand in de buurt</span><small class="muted">5 min</small></button>`) +
    (places.length ? (rows || '<p class="muted">Niets in deze categorie.</p>') : `<p class="muted">Voor deze halte zijn nog geen plekken geladen.</p>`) + work;
  ui.body.querySelectorAll('.chips button').forEach(b => { b.onclick = () => { filter = b.dataset.g; openList(); }; });
  ui.body.querySelectorAll('button[data-i]').forEach(b => { b.onclick = () => openPlace(+b.dataset.i); });
  ui.body.querySelectorAll('button[data-ep]').forEach(b => { b.onclick = () => openEpisode(b.dataset.ep); });
  ui.body.querySelector('[data-home]')?.addEventListener('click', () => goHome());
  ui.body.querySelector('[data-pfand]')?.addEventListener('click', () => searchPfand(pfandKey));
  drawMap(ui.body.querySelector('canvas'));
}
function showSheet() { ui.sheet.classList.add('on'); document.documentElement.classList.add('bl-sheet'); ui.body.scrollTop = 0; }
function closeSheet() { sheetOpen = false; cardIndex = -1; cardEpisode = null; ui?.sheet.classList.remove('on'); document.documentElement.classList.remove('bl-sheet'); }

function drawMap(cv) {
  if (!cv) return;
  const x = cv.getContext('2d'), W = cv.width, R = pack?.r || 230, s = (W / 2 - 18) / R;
  const P = (px, py) => [W / 2 + px * s, W / 2 - py * s];
  x.fillStyle = '#ece8e0'; x.fillRect(0, 0, W, W);
  const poly = (pts, close) => { x.beginPath(); pts.forEach(([a, b], i) => { const [u, v] = P(a, b); i ? x.lineTo(u, v) : x.moveTo(u, v); }); if (close) x.closePath(); };
  x.fillStyle = '#bfdcae'; for (const g of pack?.green || []) { poly(g, true); x.fill(); }
  for (const w of pack?.water || []) { poly(w.p, !w.line); if (w.line) { x.strokeStyle = '#8fc0e6'; x.lineWidth = 9; x.stroke(); } else { x.fillStyle = '#9ecbee'; x.fill(); } }
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (const pass of [0, 1]) for (const r of pack?.roads || []) {
    poly(r.p, false); x.strokeStyle = pass ? (r.w >= 3 ? '#ffffff' : '#fbfaf7') : '#c9c3b8';
    x.lineWidth = (r.w >= 4 ? 13 : r.w === 3 ? 10 : r.w === 2 ? 6 : 2.5) * (W / 640) + (pass ? 0 : 2.5); x.stroke();
  }
  x.font = `700 ${Math.round(W / 46)}px system-ui,Arial`; x.fillStyle = '#6b6457'; x.textAlign = 'center';
  const named = new Set();
  for (const r of pack?.roads || []) if (r.n && !named.has(r.n) && r.p.length > 1) {
    named.add(r.n); const m = r.p[Math.floor(r.p.length / 2)], [u, v] = P(m[0], m[1]);
    if (u > 40 && u < W - 40 && v > 20 && v < W - 20) x.fillText(r.n, u, v - 8);
  }
  // Halte
  const [sx, sy] = P(0, 0);
  x.fillStyle = '#1e5aa8'; x.beginPath(); x.roundRect?.(sx - 15, sy - 15, 30, 30, 6) ?? x.rect(sx - 15, sy - 15, 30, 30); x.fill();
  x.fillStyle = '#fff'; x.font = `900 ${Math.round(W / 30)}px Arial`; x.textBaseline = 'middle'; x.fillText('U', sx, sy + 1);
  // Plekken
  x.font = `${Math.round(W / 26)}px system-ui`;
  (pack?.places || []).forEach((p, i) => {
    if (filter !== 'alles' && KINDS[p.kind]?.group !== filter) return;
    const [u, v] = P(p.x, p.y), k = KINDS[p.kind];
    x.fillStyle = atPlace(i) ? '#f2c230' : '#ffffff'; x.strokeStyle = k.color; x.lineWidth = 4;
    x.beginPath(); x.arc(u, v, W / 34, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#000'; x.fillText(k.emoji, u, v + 1);
  });
  // Jij
  const me = here || { x: 0, y: 0 }, [mx, my] = P(me.x, me.y);
  x.fillStyle = '#e8432f'; x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(mx, my + (here?.place >= 0 ? -W / 22 : 0), 10, 0, Math.PI * 2); x.fill(); x.stroke();
  x.textBaseline = 'alphabetic';
  cv.onclick = ev => {
    const b = cv.getBoundingClientRect(), u = (ev.clientX - b.left) * W / b.width, v = (ev.clientY - b.top) * W / b.height;
    let best = -1, bd = (W / 18) ** 2;
    (pack?.places || []).forEach((p, i) => { if (filter !== 'alles' && KINDS[p.kind]?.group !== filter) return; const [a, c] = P(p.x, p.y), d = (a - u) ** 2 + (c - v) ** 2; if (d < bd) { bd = d; best = i; } });
    if (best >= 0) openPlace(best);
  };
}

// ── Plek ───────────────────────────────────────────────────────────────────────────────────────
const stampKey = p => `${norm(p.name)}@${Math.round(p.lat * 1e4)},${Math.round(p.lon * 1e4)}`;
function facts(p) {
  const f = [];
  if (p.start_date) f.push(`Sinds ${p.start_date}`);
  if (p.architect) f.push(`Architect: ${p.architect}`);
  if (p.artist_name) f.push(`Kunstenaar: ${p.artist_name}`);
  if (p.historic) f.push(({ memorial: 'Gedenkteken', monument: 'Monument', building: 'Historisch gebouw', church: 'Kerk', bridge: 'Historische brug', city_gate: 'Stadspoort', wayside_cross: 'Wegkruis', memorial_plaque: 'Gedenkplaat', stolperstein: 'Stolperstein' })[p.historic] || 'Historische plek');
  if (p.memorial === 'stolperstein' && !p.historic) f.push('Stolperstein');
  if (p.cuisine) f.push(p.cuisine.replace(/_/g, ' ').replace(/;/g, ', '));
  if (p.opening_hours) f.push(`Openingstijden (OSM): ${p.opening_hours}`);
  return f;
}
function wikiUrl(p) {
  if (p.wikipedia) { const [lang, ...t] = p.wikipedia.split(':'); return `https://${lang.length <= 3 ? lang : 'de'}.wikipedia.org/wiki/${encodeURIComponent(t.join(':') || lang)}`; }
  if (p.wikidata) return `https://www.wikidata.org/wiki/${p.wikidata}`;
  return null;
}
function openPlace(i) {
  const p = pack?.places?.[i]; if (!p) return;
  sheetOpen = true; cardIndex = i; cardEpisode = null;
  showSheet(); ui.back2.style.visibility = 'visible';
  const k = KINDS[p.kind], at = atPlace(i), open = isOpen(p.kind), from = here || { x: 0, y: 0 }, d = dist(from, p);
  ui.title.textContent = `${k.emoji} ${p.name}`;
  const st = street(), stamped = st.stamps[stampKey(p)], visits = st.visits[stampKey(p)] || 0, s = econ();
  const info = facts(p).map(t => `<div class="muted">${esc(t)}</div>`).join('');
  const wiki = wikiUrl(p);
  let actions = '';
  if (!at) {
    actions = `<button class="wide go" data-act="walk">🚶 Loop erheen · ${Math.round(d)} m · ${walkMin(d)} min</button>`;
  } else if (k.hours && !open) {
    actions = `<p>🔒 Nu dicht. Open ${hoursText(p.kind)}.</p>`;
  } else {
    if (k.items) actions += `<h4>Kopen · je hebt ${euro(s?.balanceCents)}</h4><div class="grid">` + k.items.map(([id, n, c, e]) => `<button data-buy="${id}"><span>${e} ${esc(n)}</span><b>${euro(c)}</b></button>`).join('') + `</div>`;
    if (k.pfand) actions += `<button class="wide yes" data-act="pfand"><span>♻ Pfand inleveren (${s?.pfand || 0} × €0,25)</span><b>${euro((s?.pfand || 0) * 25)}</b></button>`;
    if (k.sit) actions += `<button class="wide" data-act="sit"><span>🪑 Even zitten</span><small class="muted">${k.sit} min</small></button>`;
    if (k.meal) actions += `<button class="wide" data-act="meal"><span>🍽️ Uit eten</span><b>${euro(k.meal.cost)} · ${k.meal.minutes} min</b></button>`;
    if (k.ticket) actions += `<button class="wide" data-act="ticket"><span>🎟️ Kaartje kopen en naar binnen</span><b>${euro(k.ticket.cost)} · ${k.ticket.minutes} min</b></button>`;
    if (k.club) actions += `<button class="wide gold" data-act="club"><span>🎧 In de rij voor de deur</span><b>${euro(k.club.cost)}</b></button>`;
    if (k.rest) actions += `<button class="wide" data-act="rest"><span>🌳 Pauze in het groen</span><small class="muted">${k.rest} min</small></button>`;
    if (k.stamp) actions += stamped ? `<div class="stamp">✅ Berlin Stamp verzameld</div>` : `<button class="wide gold" data-act="stamp"><span>📸 Bekijk en verzamel de Berlin Stamp</span><small>10 min</small></button>`;
    actions += `<button class="wide" data-act="look"><span>👀 Kijk rond in Street View</span><small class="muted">sluit dit venster</small></button>`;
  }
  ui.body.innerHTML = `<div class="card"><div class="muted">${k.label}${k.hours ? ` · ${open ? 'open' : 'dicht'} · ${hoursText(p.kind)}` : ''} · ${at ? 'je bent hier' : `${Math.round(d)} m`}${visits ? ` · ${visits}× bezocht` : ''}</div>${info}` +
    (wiki ? `<button class="wide" data-act="wiki"><span>📖 Meer lezen</span><small class="muted">Wikipedia</small></button>` : '') + `</div>` + actions +
    `<button class="wide" data-act="list" style="margin-top:12px">‹ Terug naar de buurt</button>`;
  ui.body.querySelectorAll('[data-buy]').forEach(b => { b.onclick = () => buy(p, b.dataset.buy); });
  ui.body.querySelectorAll('[data-act]').forEach(b => { b.onclick = () => act(p, i, b.dataset.act, wiki); });
}

function walkTo(i) {
  const p = pack.places[i], from = here || { x: 0, y: 0 }, d = dist(from, p), min = walkMin(d);
  passTime(min); status.walks++;
  here = { x: p.x, y: p.y, place: i };
  showAt(p.lat, p.lon, bearing(from, p));
  notify(`${min} min gelopen · ${p.name}`);
  renderHud();
}
function goHome() {
  if (!here || !pack) return;
  const min = walkMin(dist(here, { x: 0, y: 0 })); passTime(min);
  here = { x: 0, y: 0, place: -1 };
  showAt(pack.lat, pack.lon, 0);
  notify(`Terug bij de ingang van ${ctx?.name}`); renderHud(); openList();
}
function nudge() {
  // Ander standpunt: kleine stap rond de huidige plek (Google kiest het dichtstbijzijnde panorama).
  const base = here?.place >= 0 ? pack.places[here.place] : pack ? { lat: pack.lat, lon: pack.lon } : null;
  if (!base) return;
  const n = (nudge.n = ((nudge.n || 0) + 1) % 6), a = n * Math.PI / 3, r = 28;
  showAt(base.lat + Math.cos(a) * r / 111320, base.lon + Math.sin(a) * r / (111320 * Math.cos(base.lat * Math.PI / 180)), (n * 60) % 360);
  notify('Ander standpunt');
}
function visit(p) { const s = street(), k = stampKey(p); s.visits[k] = (s.visits[k] || 0) + 1; saveStreet(s); }
function buy(p, id) {
  const it = KINDS[p.kind].items.find(x => x[0] === id); if (!it) return;
  if (!pay(it[2], it[1])) return;
  const s = econ(); s.surfaceItems[id] = (s.surfaceItems[id] || 0) + 1; saveEcon(s);
  status.buys++; visit(p); passTime(2);
  notify(`${it[3]} ${it[1]} gekocht · ${euro(it[2])}`);
  openPlace(cardIndex);
}
function act(p, i, a, wiki) {
  const k = KINDS[p.kind];
  if (a === 'list') return openList();
  if (a === 'walk') { walkTo(i); return openPlace(i); }
  if (a === 'look') return closeSheet();
  if (a === 'wiki' && wiki) { window.open(wiki, '_blank', 'noopener'); return; }
  if (a === 'pfand') {
    const s = econ(), n = s?.pfand || 0; if (!n) return notify('Je hebt geen Pfand bij je.');
    s.pfand = 0; s.balanceCents = (s.balanceCents || 0) + n * 25; saveEcon(s); passTime(3); visit(p);
    notify(`♻ ${n} flessen ingeleverd · +${euro(n * 25)}`);
  } else if (a === 'sit') { passTime(k.sit); visit(p); notify(`${k.sit} minuten bij ${p.name}`); }
  else if (a === 'rest') { passTime(k.rest); visit(p); notify(`Pauze in ${p.name}`); }
  else if (a === 'meal') { if (!pay(k.meal.cost, 'eten')) return; passTime(k.meal.minutes); visit(p); notify(`Gegeten bij ${p.name} · ${euro(k.meal.cost)}`); }
  else if (a === 'ticket') { if (!pay(k.ticket.cost, 'een kaartje')) return; passTime(k.ticket.minutes); visit(p); notify(`${p.name} bezocht`); }
  else if (a === 'club') return clubDoor(p);
  else if (a === 'stamp') {
    const s = street(), key = stampKey(p);
    if (!s.stamps[key]) { s.stamps[key] = { name: p.name, station: ctx?.name, day: dayNumber() }; saveStreet(s); status.stamps++; }
    visit(p); passTime(10);
    // Ook in de oude ontdekkingsgeschiedenis, zodat telefoon/stempelboek het zien.
    try { const d = globalThis.BerlinPhase34?.discovery; if (d) { d.discovered ??= {}; d.visited ??= {}; d.discovered['street:' + key] = true; d.visited['street:' + key] = (d.visited['street:' + key] || 0) + 1; } } catch {}
    globalThis.BerlinLife?.save?.();
    notify(`📸 Berlin Stamp: ${p.name}`);
  }
  openPlace(i);
}
// Clubdeur: kans hangt af van de avond (vroeg = makkelijker), je kleding (tas) en een vaste dobbelsteen per nacht.
function clubDoor(p) {
  const s = street(), key = `${stampKey(p)}:${dayNumber()}`;
  if (s.clubs[key] === 'no') { notify('De portier herkent je nog van eerder vannacht. Vandaag niet.'); return; }
  const e = econ(), dressed = (e?.surfaceItems?.jacket || 0) + (e?.surfaceItems?.shirt || 0) > 0;
  const h = minuteOfDay() / 60, late = (h >= 23 ? h - 23 : h + 1) / 8;     // 0 om 23:00 … 1 om 07:00
  const roll = (hash(key) % 100) / 100, chance = 0.55 + (dressed ? 0.2 : 0) - late * 0.25;
  passTime(25);
  if (roll > chance) { s.clubs[key] = 'no'; saveStreet(s); notify('Portier: „Heute nicht.“ Je mag er vannacht niet in.'); return openPlace(cardIndex); }
  if (!pay(KINDS.club.club.cost, 'de entree')) return;
  s.clubs[key] = 'in'; saveStreet(s); passTime(KINDS.club.club.minutes); visit(p);
  notify(`🎧 Binnen bij ${p.name}! Drie uur later sta je weer buiten.`);
  openPlace(cardIndex);
}
function searchPfand(key) {
  const s = street(); if (s.pfandSearched[key]) return;
  s.pfandSearched[key] = true; saveStreet(s); passTime(5);
  const e = econ(), r = hash(key) % 100, n = r < 30 ? 0 : r < 75 ? 1 : r < 93 ? 2 : 3;
  if (e && n) { e.pfand = (e.pfand || 0) + n; saveEcon(e); }
  notify(n ? `♻ ${n} lege fles${n > 1 ? 'sen' : ''} gevonden` : 'Niets gevonden. Iemand was je voor.');
  openList();
}

// ── Werk & verhalen (bestaande episodes) ───────────────────────────────────────────────────────
function openEpisode(id, view) {
  const ep = globalThis.BerlinCityEpisodes; const v = view || ep?.view?.(id); if (!v) return;
  sheetOpen = true; cardEpisode = id; cardIndex = -1;
  showSheet(); ui.back2.style.visibility = 'visible';
  ui.title.textContent = v.title || 'Verhaal';
  ui.body.innerHTML = `<div class="card"><p>${esc(v.text || '')}</p>${(v.extras || []).filter(Boolean).map(t => `<div class="muted">${esc(t)}</div>`).join('')}</div>` +
    (v.actions || []).map(o => `<button class="wide" data-o="${esc(o.id)}"><span>${esc(o.label)}</span>${o.detail ? `<small class="muted">${esc(o.detail)}</small>` : ''}</button>`).join('') +
    `<button class="wide" data-act="list" style="margin-top:12px">‹ Terug naar de buurt</button>`;
  ui.body.querySelectorAll('[data-o]').forEach(b => { b.onclick = () => { let next = null; try { next = ep.choose(id, b.dataset.o); } catch (e) { console.error(e); } openEpisode(id, next || undefined); }; });
  ui.body.querySelector('[data-act="list"]').onclick = openList;
}

// ── Tas ────────────────────────────────────────────────────────────────────────────────────────
function openBag() {
  const s = econ(), items = Object.entries(s?.surfaceItems || {}).filter(([, n]) => n > 0);
  sheetOpen = true; cardIndex = -1; cardEpisode = null;
  showSheet(); ui.back2.style.visibility = 'visible'; ui.title.textContent = '🎒 Tas';
  const st = street(), stamps = Object.values(st.stamps);
  ui.body.innerHTML = `<div class="card"><div>💶 ${euro(s?.balanceCents)} · ♻ ${s?.pfand || 0} Pfand</div></div>` +
    (items.length ? items.map(([id, n]) => { const [name, e] = ITEM_NAMES[id] || [id, '📦']; return `<div class="row"><span class="e">${e}</span><span class="n"><b>${esc(name)}</b></span><span class="d">×${n}</span></div>`; }).join('') : '<p class="muted">Je tas is leeg.</p>') +
    `<h4>Berlin Stamps (${stamps.length})</h4>` + (stamps.length ? stamps.slice(-30).reverse().map(x => `<div class="row"><span class="e">📸</span><span class="n"><b>${esc(x.name)}</b><small>${esc(x.station || '')} · dag ${x.day}</small></span></div>`).join('') : '<p class="muted">Nog geen stempels. Bekijk bezienswaardigheden in de buurt.</p>') +
    `<button class="wide" data-act="list" style="margin-top:12px">‹ Terug naar de buurt</button>`;
  ui.body.querySelector('[data-act="list"]').onclick = openList;
}

// ── Openen / sluiten ───────────────────────────────────────────────────────────────────────────
async function onOpen(next) {
  ctx = next || ov.context || null; status.opens++;
  here = { x: 0, y: 0, place: -1 }; filter = 'alles'; closeSheet(); lastHud = '';
  document.documentElement.classList.add('bl-street'); ui.root.classList.add('on');
  const key = norm(ctx?.name);
  if (key !== packKey) { pack = null; packKey = key; }
  renderHud();
  const p = await loadPack(ctx?.name);
  if (norm(ctx?.name) === key) { pack = p; lastHud = ''; renderHud(); }
}
function onClose() {
  ctx = null; here = null; closeSheet();
  document.documentElement.classList.remove('bl-street'); ui?.root.classList.remove('on');
}
function hook() {
  const open = ov.open, close = ov.close;
  ov.open = function (next) { const r = open.call(this, next); onOpen(next).catch(e => { status.lastError = String(e); console.error('[StreetScreen]', e); }); return r; };
  ov.close = function (...a) { onClose(); return close.apply(this, a); };
}

async function install() {
  for (let i = 0; i < 900; i++) {
    const g = globalThis.__berlinMetroGame;
    if (g?.player && g.__allStreetOverlay?.open && g.__phase823Street) {
      game = g; ov = g.__allStreetOverlay;
      buildUi(); hook();
      // Oude API's laten naar dit scherm wijzen.
      globalThis.BerlinCleanStreet = { version: 2, openActivities: () => openList(), closeActivities: closeSheet, inspect: () => ({ active: ui.root.classList.contains('on') }) };
      Tick.every('street.screen', 500, () => {
        const on = !!game.player.__streetMode && ov.root.style.display !== 'none';
        if (!on && ui.root.classList.contains('on')) onClose();
        if (on) { if (!ui.root.classList.contains('on')) onOpen(ov.context); renderHud(); }
      });
      status.installed = true;
      console.info('[Berlin Life] StreetScreen: één Street View-scherm (HUD, buurt, plekken)');
      return;
    }
    await Tick.sleep(150, 'boot.StreetScreen');
  }
}

export const BerlinStreet = {
  status: () => ({ ...status, open: !!ctx, station: ctx?.name ?? null, places: pack?.places?.length ?? null, here: here ? { ...here } : null, sheet: sheetOpen, card: cardIndex }),
  pack: () => pack, open: () => openList(), go: i => { walkTo(i); openPlace(i); }, place: i => openPlace(i), bag: () => openBag(), home: () => goHome(),
};
globalThis.BerlinStreet = BerlinStreet;
install().catch(e => console.error('[Berlin Life] StreetScreen failed', e));
