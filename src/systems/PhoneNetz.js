// Berlin Life — BVG-app in de telefoon: lijnenplan + routeplanner voor het hele netwerk (9 nov 2026).
// Enige eigenaar van de inhoud van de tab "map" (BVG). Phone.js roept `BerlinPhoneNetz.render(s, body, game)` aan;
// lukt dat niet, dan valt Phone.js terug op het oude U2/U8-plan.
//
// • Lijnchips U1–U9 + S-Bahn in lijnkleur; per lijn de haltes als verticale lijn met overstapbadges,
//   📍 waar je nu bent, 🏠 thuis, 📦 bestemming van je bezorging. Tik op een halte = route ernaartoe.
// • Routeplanner: van je huidige halte naar elke halte, met overstappen (Dijkstra over alle lijnen;
//   overstap = zelfde stationsnaam op een andere lijn). Bij een actieve bezorging staat de bestemming al klaar.
// • Leest de lijnen live uit het spel (BerlinLines), dus nieuwe lijnen en geopende overstappen komen er vanzelf bij.
import { U8_STOPS } from './U8FullLineVisual.js';
import { U3_ROUTE } from '../data/u3.js';

const ORDER = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'S5', 'S41'];
const COLORS = { U1: '#55a822', U2: '#da421e', U3: '#16683d', U4: '#ffd900', U5: '#7e5330', U6: '#8c6dab', U7: '#528dba', U8: '#224f86', U9: '#f3791d', S5: '#eb7405', S41: '#ad5937', S42: '#cb6418' };
const TEXT = { U4: '#1a1a1a' };
const LABEL = { S5: 'S' };   // de Stadtbahnwereld: S3 · S5 · S7 · S9
const SUB = { S5: 'S3 · S5 · S7 · S9', S41: 'Ring · S41 ↻ · S42 ↺' };
const RING = { S41: { cw: 'S41', ccw: 'S42' } };   // rondlopende lijnen: buren lopen rond, richting = met/tegen de klok
const HOME = 'Rosa-Luxemburg-Platz';
const MIN_STOP = 2, MIN_TRANSFER = 5;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/ß/g, 'ss').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, ' ').trim();
const chip = (id, small) => `<span class="bnz-chip${small ? ' s' : ''}" style="background:${COLORS[id] || '#555'};color:${TEXT[id] || '#fff'}">${LABEL[id] || id}</span>`;

let ui = { sel: null, dest: null, q: '' };
const status = { renders: 0, builds: 0, routes: 0 };

/** Alle lijnen die nu in het spel zijn, met hun volledige haltelijst. */
function network(game) {
  const BL = globalThis.BerlinLines || {}, lines = [];
  for (const id of ORDER) {
    let names = null;
    if (id === 'U2') names = (game?.stations || []).map(s => s.name);
    else if (id === 'U8') names = U8_STOPS.map(s => s.name);
    else if (id === 'U3' && BL.U3) names = U3_ROUTE.map(s => s.name);
    else if (BL[id]?.stations) names = BL[id].stations.filter(s => !s.shared).map(s => s.name);
    // ride = er rijden treinen (Ringbahn deel a: nog niet) → alleen dan telt de lijn mee in de routeplanner.
    if (names?.length) lines.push({ id, names, ring: !!RING[id], ride: !BL[id]?.relevant || BL[id].relevant().length > 0 });
  }
  // Overstappen = dezelfde (genormaliseerde) naam op meerdere lijnen.
  const byName = new Map();
  for (const l of lines) l.names.forEach((n, i) => { const k = norm(n); if (!byName.has(k)) byName.set(k, []); byName.get(k).push({ line: l.id, i }); });
  return { lines, byName };
}

function hereName(game) {
  const p = game?.player, BL = globalThis.BerlinLines || {};
  if (!p) return null;
  if (p.__line) return BL[p.__line]?.stations?.find(s => s.index === p.__lineStation)?.name || BL[p.__line]?.stations?.[p.__lineStation]?.name || null;
  if (Number.isInteger(p.__u8FullStation)) return U8_STOPS[p.__u8FullStation]?.name || null;
  return p.currentStation?.name || null;
}

/** Snelste route (minuten) van halte A naar halte B over alle lijnen. */
function plan(net, from, to) {
  const byName = new Map([...net.byName].map(([k, v]) => [k, v.filter(n => net.lines.find(l => l.id === n.line)?.ride)]));
  const A = byName.get(norm(from)), B = byName.get(norm(to));
  if (!A?.length || !B?.length) return null;
  if (norm(from) === norm(to)) return { legs: [], minutes: 0 };
  const L = Object.fromEntries(net.lines.map(l => [l.id, l])), key = n => n.line + '|' + n.i;
  const dist = new Map(), prev = new Map(), todo = [];
  for (const n of A) { dist.set(key(n), 0); todo.push(n); }
  const goal = new Set(B.map(key));
  while (todo.length) {
    todo.sort((a, b) => dist.get(key(a)) - dist.get(key(b)));
    const n = todo.shift(), d = dist.get(key(n));
    if (goal.has(key(n))) { status.routes++; return build(n, d); }
    const nb = [];
    const len = L[n.line].names.length;
    for (let j of [n.i - 1, n.i + 1]) { if (L[n.line].ring) j = (j + len) % len; if (j >= 0 && j < len) nb.push([{ line: n.line, i: j }, MIN_STOP]); }
    for (const m of byName.get(norm(L[n.line].names[n.i])) || []) if (m.line !== n.line) nb.push([m, MIN_TRANSFER]);
    for (const [m, c] of nb) {
      const k = key(m), nd = d + c;
      if (nd < (dist.get(k) ?? Infinity)) { dist.set(k, nd); prev.set(k, n); todo.push(m); }
    }
  }
  return null;
  function build(end, minutes) {
    const path = [end]; let k = key(end);
    while (prev.has(k)) { const p = prev.get(k); path.unshift(p); k = key(p); }
    const legs = [];
    for (let s = 0; s < path.length - 1; s++) {
      const a = path[s], b = path[s + 1];
      if (a.line !== b.line) continue;
      const len = L[a.line].names.length, sign = L[a.line].ring ? ((b.i - a.i + len) % len === 1 ? 1 : -1) : Math.sign(b.i - a.i);
      const last = legs[legs.length - 1];
      if (last && last.line === a.line && last.to === a.i && last.sign === sign) { last.to = b.i; last.stops++; continue; }
      legs.push({ line: a.line, from: a.i, to: b.i, stops: 1, sign });
    }
    return {
      minutes, legs: legs.map(g => {
        const names = L[g.line].names, R = RING[g.line];
        return { line: g.line, chip: R ? (g.sign > 0 ? R.cw : R.ccw) : g.line, sign: g.sign, from: names[g.from], to: names[g.to], stops: g.stops,
          dir: R ? (g.sign > 0 ? 'Ring ↻' : 'Ring ↺') : g.sign > 0 ? names[names.length - 1] : names[0] };
      }),
    };
  }
}

const CSS = `
#phoneBodyV2 .bnz{font-family:-apple-system,system-ui,Arial,sans-serif}
#phoneBodyV2 .bnz-chip{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 6px;border-radius:5px;font:800 13px Arial;box-sizing:border-box}
#phoneBodyV2 .bnz-chip.s{min-width:24px;height:16px;font-size:10px;padding:0 4px;border-radius:3px}
#phoneBodyV2 .bnz-card{background:#1c1c1e;border-radius:16px;padding:12px;margin-bottom:12px}
#phoneBodyV2 .bnz-card h4{margin:0 0 8px;font:650 15px -apple-system,system-ui,Arial}
#phoneBodyV2 .bnz-from{font-size:12px;color:#98989f;margin-bottom:6px}
#phoneBodyV2 .bnz-from b{color:#fff}
#phoneBodyV2 .bnz-in{width:100%;box-sizing:border-box;border:0;border-radius:10px;background:#2c2c2e;color:#fff;padding:10px 12px;font:16px -apple-system,system-ui,Arial;outline:none}
#phoneBodyV2 .bnz-sug{margin-top:6px;display:flex;flex-direction:column;gap:2px}
#phoneBodyV2 .bnz-sug button{display:flex;align-items:center;gap:6px;border:0;background:#2c2c2e;color:#fff;padding:9px 10px;border-radius:9px;text-align:left;font:14px -apple-system,system-ui,Arial}
#phoneBodyV2 .bnz-res{margin-top:10px}
#phoneBodyV2 .bnz-leg{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:start;padding:8px 0;border-top:1px solid #ffffff12}
#phoneBodyV2 .bnz-leg:first-child{border-top:0}
#phoneBodyV2 .bnz-leg small{display:block;color:#98989f;font-size:12px;margin-top:2px}
#phoneBodyV2 .bnz-xfer{font-size:12px;color:#ffd60a;padding:4px 0 4px 44px}
#phoneBodyV2 .bnz-sum{display:flex;justify-content:space-between;align-items:center;font:600 14px -apple-system,system-ui,Arial;margin-top:4px}
#phoneBodyV2 .bnz-sum span{color:#98989f;font-weight:500;font-size:12px}
#phoneBodyV2 .bnz-x{border:0;background:none;color:#0a84ff;font:15px -apple-system,system-ui,Arial;padding:4px 0}
#phoneBodyV2 .bnz-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
#phoneBodyV2 .bnz-chips button{border:0;padding:0;background:none;border-radius:6px;opacity:.55}
#phoneBodyV2 .bnz-chips button.on{opacity:1;box-shadow:0 0 0 2px #fff}
#phoneBodyV2 .bnz-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
#phoneBodyV2 .bnz-head span{font-size:12px;color:#98989f}
#phoneBodyV2 .bnz-stops{position:relative;margin-left:8px}
#phoneBodyV2 .bnz-stops:before{content:'';position:absolute;left:5px;top:10px;bottom:10px;width:4px;border-radius:2px;background:var(--c)}
#phoneBodyV2 .bnz-stop{position:relative;display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;color:#fff;padding:7px 0 7px 24px;text-align:left;font:14px -apple-system,system-ui,Arial;min-height:34px}
#phoneBodyV2 .bnz-stop:before{content:'';position:absolute;left:1px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:#1c1c1e;border:3px solid var(--c);box-sizing:border-box}
#phoneBodyV2 .bnz-stop.x:before{background:#fff}
#phoneBodyV2 .bnz-stop.here{font-weight:700}
#phoneBodyV2 .bnz-stop.here:before{background:#0a84ff;border-color:#fff;width:16px;height:16px;margin-top:-8px;left:-1px}
#phoneBodyV2 .bnz-stop.dest{color:#ffd60a;font-weight:700}
#phoneBodyV2 .bnz-stop .n{flex:1}
#phoneBodyV2 .bnz-stop .b{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;max-width:45%}
`;

function routeHtml(r, from, to) {
  if (!r) return `<div class="bnz-res" style="color:#98989f;font-size:13px">Geen route gevonden van ${esc(from)} naar ${esc(to)}.</div>`;
  if (!r.legs.length) return `<div class="bnz-res" style="color:#98989f;font-size:13px">Je bent er al 🙂</div>`;
  let h = '<div class="bnz-res">';
  r.legs.forEach((g, k) => {
    if (k) h += `<div class="bnz-xfer">⇄ overstappen in ${esc(g.from)}</div>`;
    h += `<div class="bnz-leg">${chip(g.chip || g.line)}<div><b>${esc(g.from)} → ${esc(g.to)}</b><small>richting ${esc(g.dir)} · ${g.stops} ${g.stops === 1 ? 'halte' : 'haltes'}</small></div></div>`;
  });
  const x = r.legs.length - 1;
  return h + `<div class="bnz-sum">± ${Math.max(1, r.minutes)} min <span>${x ? `${x} ${x === 1 ? 'overstap' : 'overstappen'}` : 'geen overstap'}</span></div></div>`;
}

/** Korte tekst voor andere apps (Jobs): "U8 richting Hermannstraße → U7 richting Rudow · ±14 min". */
function summary(to, game = globalThis.__berlinMetroGame) {
  const net = network(game), from = hereName(game), r = from && plan(net, from, to);
  if (!r || !r.legs.length) return null;
  return r.legs.map(g => `<b style="color:${COLORS[g.chip || g.line]}">${LABEL[g.chip || g.line] || g.chip || g.line}</b> richting <b>${esc(g.dir)}</b>`).join(' → ') + ` · ±${r.minutes} min`;
}

function render(s, body, game) {
  status.renders++;
  if (!document.querySelector('#bnzCss')) { const st = document.createElement('style'); st.id = 'bnzCss'; st.textContent = CSS; document.head.appendChild(st); }
  const net = network(game), from = hereName(game), job = s?.activeDelivery?.status === 'active' ? s.activeDelivery.to : null;
  if (!ui.dest && job) ui.dest = job;
  if (!ui.sel || !net.lines.some(l => l.id === ui.sel)) {
    const p = game?.player;
    ui.sel = p?.__line || (Number.isInteger(p?.__u8FullStation) ? 'U8' : 'U2');
  }
  const sig = [from, ui.dest, ui.sel, job, net.lines.map(l => l.id + l.names.length + (l.ride ? '' : '-')).join()].join('|');
  const root = body.querySelector(':scope > .bnz');
  if (root && root.__sig === sig) return true;          // niets veranderd: niet opnieuw opbouwen (scroll/invoer blijven)
  if (root && root.contains(document.activeElement)) return true;   // tijdens typen niets weggooien
  status.builds++;
  const scroll = body.scrollTop;
  const line = net.lines.find(l => l.id === ui.sel);
  const others = n => (net.byName.get(norm(n)) || []).map(m => m.line).filter((id, k, a) => id !== line.id && a.indexOf(id) === k);
  const r = ui.dest && from ? plan(net, from, ui.dest) : null;
  body.innerHTML = `<div class="bnz">
    <div class="bnz-card"><h4>🧭 Route plannen</h4>
      <div class="bnz-from">Van: <b>${esc(from || 'onbekend')}</b> 📍</div>
      ${ui.dest ? `<div style="display:flex;justify-content:space-between;align-items:center"><div class="bnz-from" style="margin:0">Naar: <b>${esc(ui.dest)}</b>${ui.dest === job ? ' 📦' : ''}</div><button class="bnz-x" data-act="clear">Wijzig</button></div>${routeHtml(r, from, ui.dest)}`
      : `<input class="bnz-in" placeholder="Naar welke halte?" value="${esc(ui.q)}" autocomplete="off" autocorrect="off" spellcheck="false"><div class="bnz-sug"></div>`}
    </div>
    <div class="bnz-chips">${net.lines.map(l => `<button data-line="${l.id}" class="${l.id === ui.sel ? 'on' : ''}">${chip(l.id)}</button>`).join('')}</div>
    <div class="bnz-card" style="--c:${COLORS[line.id]}">
      <div class="bnz-head">${chip(line.id)}<span>${line.ring ? 'Rondlijn' : `${esc(line.names[0])} ⇄ ${esc(line.names[line.names.length - 1])}`}${SUB[line.id] ? ' · ' + SUB[line.id] : ''} · ${line.names.length} haltes${line.ride ? '' : ' · treinen volgen binnenkort'}</span></div>
      <div class="bnz-stops">${line.names.map(n => {
        const o = others(n), isHere = from && norm(n) === norm(from), isDest = ui.dest && norm(n) === norm(ui.dest);
        return `<button class="bnz-stop${o.length ? ' x' : ''}${isHere ? ' here' : ''}${isDest ? ' dest' : ''}" data-stop="${esc(n)}"><span class="n">${esc(n)}${isHere ? ' 📍' : ''}${norm(n) === norm(HOME) ? ' 🏠' : ''}${job && norm(n) === norm(job) ? ' 📦' : ''}</span><span class="b">${o.map(id => chip(id, true)).join('')}</span></button>`;
      }).join('')}</div>
    </div></div>`;
  const nr = body.querySelector(':scope > .bnz'); nr.__sig = sig;
  body.scrollTop = scroll;
  nr.querySelectorAll('[data-line]').forEach(b => b.onclick = () => { ui.sel = b.dataset.line; nr.__sig = ''; render(s, body, game); body.scrollTop = 0; });
  nr.querySelectorAll('[data-stop]').forEach(b => b.onclick = () => { ui.dest = b.dataset.stop; ui.q = ''; nr.__sig = ''; render(s, body, game); body.scrollTop = 0; });
  nr.querySelector('[data-act="clear"]')?.addEventListener('click', () => { ui.dest = null; ui.q = ''; nr.__sig = ''; render(s, body, game); body.querySelector('.bnz-in')?.focus(); });
  const inp = nr.querySelector('.bnz-in');
  if (inp) {
    const all = [...new Map(net.lines.flatMap(l => l.names.map(n => [norm(n), { n, lines: net.byName.get(norm(n)).map(m => m.line).filter((x, k, a) => a.indexOf(x) === k) }]))).values()];
    const sug = nr.querySelector('.bnz-sug');
    const show = () => {
      ui.q = inp.value; const q = norm(inp.value);
      if (!q) { sug.innerHTML = ''; return; }
      const hits = all.filter(x => norm(x.n).includes(q)).sort((a, b) => norm(a.n).indexOf(q) - norm(b.n).indexOf(q)).slice(0, 6);
      sug.innerHTML = hits.map(x => `<button data-pick="${esc(x.n)}">${x.lines.map(id => chip(id, true)).join('')} ${esc(x.n)}</button>`).join('') || '<div style="color:#98989f;font-size:13px;padding:6px 2px">Geen halte gevonden</div>';
      sug.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { ui.dest = b.dataset.pick; ui.q = ''; inp.blur(); nr.__sig = ''; render(s, body, game); });
    };
    inp.oninput = show; if (ui.q) show();
  }
  return true;
}

export const PhoneNetz = { render, plan: (a, b) => plan(network(globalThis.__berlinMetroGame), a, b), summary, here: (game = globalThis.__berlinMetroGame) => hereName(game), norm,
  get dest() { return ui.dest; }, colors: COLORS, text: TEXT, label: LABEL, status: () => ({ ...status, ...ui }), setDest: d => { ui.dest = d; } };
globalThis.BerlinPhoneNetz = PhoneNetz;
