// Berlin Life — routeaanwijzing in de HUD (9 nov 2026). Enige eigenaar van #routeHudV1.
//
// Kies je in de BVG-app (telefoon → lijnenplan/routeplanner) een bestemming, dan blijft de route in beeld zonder de
// telefoon steeds te openen: een balkje bovenin met de lijn die je nu moet nemen, de richting, het aantal haltes en waar
// je uitstapt of overstapt. Rijdend: "nog 3 haltes", "stap uit bij de volgende halte", waarschuwing bij de verkeerde
// richting. Aangekomen: ✓ en na een paar seconden weg. Tik = BVG-app openen, × = route stoppen.
// Rekent met PhoneNetz (zelfde routeplanner, zelfde bestemming: BerlinPhoneNetz.dest).
import { Tick } from '../state/Tick.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const status = { updates: 0, shown: false, text: '', arrived: 0 };
let el = null, arrivedAt = 0, arrivedFor = null;

const CSS = `
#routeHudV1{position:fixed;z-index:30;left:50%;top:max(58px,calc(env(safe-area-inset-top) + 48px));transform:translateX(-50%);width:min(460px,64vw);
  display:none;align-items:center;gap:9px;box-sizing:border-box;padding:6px 6px 6px 9px;border-radius:13px;border:1px solid rgba(255,255,255,.14);
  background:rgba(8,8,8,.66);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font:13px -apple-system,system-ui,Arial,sans-serif;pointer-events:auto}
#routeHudV1.warn{border-color:#ff9f0a;background:rgba(60,30,0,.72)}
#routeHudV1.done{border-color:#30d158}
#routeHudV1 .rh-c{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 6px;border-radius:5px;font:800 13px Arial;box-sizing:border-box}
#routeHudV1 .rh-t{flex:1;min-width:0;line-height:1.25}
#routeHudV1 .rh-t b{font-weight:700}
#routeHudV1 .rh-t small{display:block;color:#b8b8bf;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#routeHudV1 .rh-x{flex:none;width:30px;height:30px;border:0;border-radius:9px;background:#ffffff1c;color:#fff;font:600 16px Arial;padding:0}
`;

function ensure() {
  if (el && el.isConnected) return el;
  const host = document.querySelector('#hud') || document.body;
  if (!document.querySelector('#routeHudCss')) { const st = document.createElement('style'); st.id = 'routeHudCss'; st.textContent = CSS; document.head.appendChild(st); }
  el = document.createElement('div'); el.id = 'routeHudV1'; el.setAttribute('role', 'status');
  el.innerHTML = '<span class="rh-c"></span><div class="rh-t"></div><button class="rh-x" aria-label="Route stoppen">×</button>';
  el.querySelector('.rh-x').addEventListener('click', e => { e.stopPropagation(); stop(); });
  el.addEventListener('click', openPlanner);
  // Geen joystick/kijken starten als je op het balkje tikt.
  for (const ev of ['touchstart', 'pointerdown', 'mousedown']) el.addEventListener(ev, e => e.stopPropagation(), { passive: true });
  host.appendChild(el);
  return el;
}

// Plek bepalen (9 nov, melding speler: het balkje viel onder het halte-overzicht linksboven): alle zichtbare
// HUD-elementen bovenin die horizontaal overlappen met het balkje → het balkje komt eronder (8 px ruimte).
function layout(e) {
  const W = innerWidth, H = innerHeight, bw = e.offsetWidth || Math.min(460, W * 0.64), x0 = (W - bw) / 2, x1 = x0 + bw;
  const safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0;
  let top = Math.max(10, safe + 8);
  const cands = [...document.querySelectorAll('#hud .topbar, #hud .topbar *, #hud > *, body > *')];
  const rects = [];
  for (const c of cands) {
    if (c === e || c.contains(e) || e.contains(c) || c.id === 'leftZone' || c.id === 'rightZone' || c.id === 'hint' || c.id === 'toast') continue;
    const r = c.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.width > W * 0.8 || r.height > H * 0.5 || r.top > H * 0.45 || r.bottom < 0) continue;
    const cs = getComputedStyle(c);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    rects.push(r);
  }
  // Herhalen: onder het ene element kan het volgende staan (stationsvak → ritbalk).
  for (let k = 0; k < 6; k++) {
    let moved = false;
    for (const r of rects) if (r.left < x1 && r.right > x0 && r.bottom > top && r.top < top + (e.offsetHeight || 44)) { top = r.bottom + 8; moved = true; }
    if (!moved) break;
  }
  const px = Math.round(top) + 'px';
  if (e.style.top !== px) e.style.top = px;
  status.top = Math.round(top);
}
addEventListener('resize', () => { if (el && status.shown) layout(el); });

function openPlanner() {
  document.querySelector('#phoneBtnV2')?.click();
  setTimeout(() => globalThis.BerlinPhoneSkin?.openApp?.('map'), 60);
}
function stop() { globalThis.BerlinPhoneNetz?.setDest(null); arrivedFor = null; hide(); }
function hide() { if (el) el.style.display = 'none'; status.shown = false; }

/** Op welke lijn(wereld) sta of rijd je nu? */
function currentLine(p) {
  if (p.__line) return p.__line;
  if (Number.isInteger(p.__u8FullStation) || p.__u8Area) return 'U8';
  if (p.activeTrain) return p.activeTrain.line || 'U2';
  return p.currentStation ? 'U2' : null;
}
/** Rijdend: { tl, dir } van de trein waarin je zit (nieuwe lijnen of U2), anders null. */
function ride(p) {
  if (p.__lineTrain) return { tl: p.__lineTrain.timeline, dir: p.__lineTrain.direction, line: p.__line };
  if (p.activeTrain) return { tl: p.activeTrain.timeline || p.activeTrain, dir: p.activeTrain.direction, line: 'U2' };
  return null;
}

function show(chipId, html, cls = '') {
  const N = globalThis.BerlinPhoneNetz, e = ensure(), c = e.querySelector('.rh-c');
  if (chipId) { c.style.display = ''; c.textContent = N.label?.[chipId] || chipId; c.style.background = N.colors?.[chipId] || '#555'; c.style.color = N.text?.[chipId] || '#fff'; }
  else { c.style.display = 'none'; }
  const t = e.querySelector('.rh-t'); if (t.innerHTML !== html) t.innerHTML = html;
  e.className = cls;
  e.style.display = 'flex';
  layout(e);
  status.shown = true; status.text = t.textContent;
}

const haltes = n => `${n} ${n === 1 ? 'halte' : 'haltes'}`;
const then = (r, k) => r.legs[k] ? ` · dan <b>${esc(r.legs[k].chip || r.legs[k].line)}</b> richting ${esc(r.legs[k].dir)}` : '';

function update(game) {
  status.updates++;
  const N = globalThis.BerlinPhoneNetz, p = game?.player;
  const dest = N?.dest;
  if (!N || !p || !dest) { arrivedFor = null; return hide(); }
  const rd = ride(p), tl = rd?.tl;
  const moving = tl && tl.state === 'cruising';
  const from = tl ? (moving ? tl.destinationName : tl.originName) : N.here(game);
  if (!from) return hide();
  const r = N.plan(from, dest);
  if (!r) return show(null, `🧭 Geen route naar <b>${esc(dest)}</b><small>Deze halte is nog niet met de trein bereikbaar · tik voor de BVG-app</small>`);

  // Aangekomen (of bijna).
  if (!r.legs.length) {
    if (rd && moving) return show(rd.line, `Stap uit bij de volgende halte: <b>${esc(dest)}</b><small>🧭 bestemming</small>`);
    if (rd) return show(rd.line, `<b>Stap nu uit</b> · ${esc(dest)} ✓<small>🧭 bestemming bereikt</small>`, 'done');
    if (arrivedFor !== dest) { arrivedFor = dest; arrivedAt = performance.now(); status.arrived++; }
    if (performance.now() - arrivedAt > 8000) { stop(); return; }
    return show(null, `✓ Aangekomen in <b>${esc(dest)}</b><small>Route afgerond</small>`, 'done');
  }
  arrivedFor = null;
  const leg = r.legs[0], here = currentLine(p), mins = `±${Math.max(1, r.minutes)} min`;

  if (rd) {
    // In de trein. Andere lijn nodig → hier (of bij de volgende halte) overstappen.
    if (leg.line !== rd.line) {
      const what = `overstappen op <b>${esc(leg.chip || leg.line)}</b> richting ${esc(leg.dir)}`;
      return show(leg.chip || leg.line, moving ? `Stap uit bij de volgende halte: <b>${esc(from)}</b><small>daar ${what} · ${mins}</small>` : `<b>Stap nu uit</b> · ${what}<small>${esc(from)} → ${esc(leg.to)} · ${haltes(leg.stops)} · ${mins}</small>`);
    }
    // Verkeerde richting? (alleen waar de haltevolgorde van de planner gelijk is aan die van de lijnwereld)
    if (rd.dir && leg.sign && rd.line !== 'U3' && rd.line !== 'U2' && rd.dir !== leg.sign) {
      return show(leg.chip || leg.line, `⚠ <b>Verkeerde richting</b> · stap uit ${moving ? 'bij ' + esc(from) : 'nu'}<small>neem de ${esc(leg.chip || leg.line)} richting ${esc(leg.dir)} · ${esc(dest)}</small>`, 'warn');
    }
    const left = leg.stops + (moving ? 1 : 0);
    if (moving && leg.stops === 0) return show(leg.chip || leg.line, `Stap uit bij de volgende halte: <b>${esc(leg.to)}</b><small>${r.legs[1] ? `daar overstappen op ${esc(r.legs[1].chip || r.legs[1].line)} richting ${esc(r.legs[1].dir)}` : '🧭 bestemming'} · ${mins}</small>`);
    return show(leg.chip || leg.line, `Blijf zitten · nog <b>${haltes(left)}</b> tot ${esc(leg.to)}<small>${r.legs[1] ? `daar overstappen op ${esc(r.legs[1].chip || r.legs[1].line)}` : '🧭 ' + esc(dest)} · ${mins}</small>`);
  }
  // In de oude U8-trein (eigen systeem, geen tijdlijn hier): alleen haltes tellen.
  if (globalThis.__berlinMetroU8Passenger && here === 'U8') {
    if (leg.line !== 'U8') return show(leg.chip || leg.line, `<b>Stap uit</b> in ${esc(from)} · overstappen op <b>${esc(leg.chip || leg.line)}</b><small>richting ${esc(leg.dir)} · ${mins}</small>`);
    return show('U8', leg.stops <= 1 ? `Stap uit bij <b>${esc(leg.to)}</b><small>${r.legs[1] ? `daar overstappen op ${esc(r.legs[1].chip || r.legs[1].line)}` : '🧭 bestemming'} · ${mins}</small>`
      : `In de U8 · nog <b>${haltes(leg.stops)}</b> tot ${esc(leg.to)}<small>${r.legs[1] ? `daar overstappen op ${esc(r.legs[1].chip || r.legs[1].line)}` : '🧭 ' + esc(dest)} · ${mins}</small>`);
  }
  // Op het perron / in de hal.
  const verb = here && here !== leg.line ? 'Overstappen: neem' : 'Neem';
  return show(leg.chip || leg.line, `${verb} de <b>${esc(leg.chip || leg.line)}</b> richting <b>${esc(leg.dir)}</b><small>${haltes(leg.stops)} · uitstappen ${esc(leg.to)}${then(r, 1)} · ${mins}</small>`);
}

function install() {
  const game = globalThis.__berlinMetroGame;
  if (!game?.player || !globalThis.BerlinPhoneNetz) return false;
  Tick.every('route.hud', 700, () => { try { update(game); } catch (e) { status.error = String(e); } });
  globalThis.BerlinRouteHud = { status: () => ({ ...status }), update: () => update(game), stop, open: openPlanner };
  return true;
}
Tick.until('route.hud.install', 500, install, 120000);
