// Ringbahn deel b–d (9 nov 2026): treinen S41 ↻ / S42 ↺ rond de naad, vertrekbord, overstappen beide kanten op,
// OSM-omgeving (ook in de ingravingen), routebalk niet onder het stationsvak. Usage: node s41b-test.mjs <url> <outDir>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', hour = '13'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
let pass = 0, fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.S41?.status().installed && globalThis.BerlinRouteHud, null, { timeout: 200000 });
await page.waitForTimeout(15000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; return { x: Math.round(p.position.x * 10) / 10, z: Math.round(p.position.z), line: p.__line, st: p.__lineStation, street: !!p.__streetMode }; });
const stand = (yaw, pitch = 0) => page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
const walkUntil = async (cond, yaw = 1.57, ms = 90000, arg = null) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; if (y != null) p.yaw = y; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, arg, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const L = 'S41', S = (fn, arg) => page.evaluate(fn, arg);
const st = () => S(() => globalThis.BerlinLines.S41.status());

// 1. Treinen: 4× S41 (+1) en 4× S42 (−1), model BR 481.
await S(() => globalThis.BerlinLines.S41.enter(7));
await page.waitForTimeout(3000);
let s = await st();
const n41 = s.trains.filter(t => t.line === 'S41' && t.dir === 1).length, n42 = s.trains.filter(t => t.line === 'S42' && t.dir === -1).length;
check('treinen S41 ↻ 4 / S42 ↺ 4', n41 === 4 && n42 === 4 && s.trains.length === 8, JSON.stringify({ n41, n42, model: s.model }));
await S(() => globalThis.BerlinLines.S41.simulate(40));
s = await st();
check('vertrekbord Ostkreuz: S41 Ring ↻ en S42 Ring ↺', /S41Ring ↻/.test(s.dfi || '') && /S42Ring ↺/.test(s.dfi || ''), s.dfi);
const ts = await S(() => document.querySelector('#trainStatus')?.textContent || '');
check('HUD vertrekken Ring', /Ring ↻/.test(ts) && /Ring ↺/.test(ts), ts);
await stand(-1.57, -0.02); await page.waitForTimeout(1500); await shot('s41b_ostkreuz_trein');

// 2. Meerijden S41 van Wedding over de naad naar Gesundbrunnen.
await S(() => globalThis.BerlinLines.S41.board(26, 1));
await page.waitForTimeout(1500);
let seen = [];
for (let k = 0; k < 40; k++) {
  await S(() => globalThis.BerlinLines.S41.simulate(1));
  const q = await S(() => { const p = globalThis.__berlinMetroGame.player, t = p.__lineTrain; return { x: Math.round(p.position.x), at: t?.currentIndex, state: t?.state, line: t?.line.id, st: p.__lineStation }; });
  seen.push(q.x);
  if (k === 6) { await stand(-1.57, -0.02); await shot('s41b_naad_rit'); }
  if (q.at === 0 && /boarding|opening/.test(q.state)) break;
}
s = await st();
{ const p = await pos(); check('S41 rijdt Wedding → Gesundbrunnen (rond de naad)', p.line === L && Math.abs(p.x) < 30 && s.seam >= 1 && (s.world?.stations || []).includes('gesundbrunnen'), JSON.stringify({ p, seam: s.seam, xs: seen.slice(-8), world: s.world })); }
await stand(-1.57, -0.02); await page.waitForTimeout(1500); await shot('s41b_gesundbrunnen_aankomst');
// en verder: de trein keert niet, volgende halte Schönhauser Allee.
const nxt = await S(() => globalThis.__berlinMetroGame.player.__lineTrain?.timeline.destinationName);
check('S41 rijdt door (geen eindpunt)', nxt === 'Schönhauser Allee', nxt);

// 3. S42 de andere kant op: Gesundbrunnen → Wedding.
await S(() => globalThis.BerlinLines.S41.board(0, -1));
for (let k = 0; k < 40; k++) {
  await S(() => globalThis.BerlinLines.S41.simulate(1));
  const q = await S(() => { const t = globalThis.__berlinMetroGame.player.__lineTrain; return { at: t?.currentIndex, state: t?.state }; });
  if (q.at === 26 && /boarding|opening/.test(q.state)) break;
}
{ const p = await pos(), ln = await S(() => globalThis.__berlinMetroGame.player.__lineTrain?.line.id); check('S42 rijdt Gesundbrunnen → Wedding', p.line === L && Math.abs(p.x - 3900) < 30 && ln === 'S42', JSON.stringify({ p, ln })); }

// 4. Overstappen vanaf de Ring (lopend het trapgat in).
const viaStair = async (i, cond, name) => {
  await S(i => globalThis.BerlinLines.S41.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(2500);
  const ok = await walkUntil(cond, 1.57, 40000);
  await page.waitForTimeout(2000); await shot('s41b_over_' + i);
  check(name, ok, JSON.stringify(await pos()));
};
await viaStair(6, () => globalThis.__berlinMetroGame.player.__line === 'U5', 'Ring Frankfurter Allee → U5');
await viaStair(1, () => { const p = globalThis.__berlinMetroGame.player; return !p.__line && p.currentStation?.id === 'schoenhauser-allee' || (!p.__line && Math.abs(p.position.z - (globalThis.__berlinMetroGame.stations.find(s => s.id === 'schoenhauser-allee')?.z ?? 1e9)) < 40); }, 'Ring Schönhauser Allee → U2');
await viaStair(0, () => globalThis.__berlinMetroGame.player.__u8FullStation === 9, 'Ring Gesundbrunnen → U8');
await viaStair(7, () => globalThis.__berlinMetroGame.player.__line === 'S5', 'Ring Ostkreuz → Stadtbahn');
await viaStair(13, () => false, 'Südkreuz dicht (Nord-Süd later)').catch(() => {});
{ const p = await pos(); check('Südkreuz: hek houdt tegen', p.line === L && p.st === 13, JSON.stringify(p)); }

// 5. Terug naar de Ring vanaf U5, Stadtbahn, U9 (lopend) en via de borden op U2/U8.
const back = async (lineId, idxFn, ringIdx, name) => {
  const i = await S(([l, f]) => globalThis.BerlinLines[l].stations.findIndex(s => s.id === f && !s.shared), [lineId, idxFn]);
  await S(([l, i]) => globalThis.BerlinLines[l].enter(i, { dx: -13 }), [lineId, i]);
  await page.waitForTimeout(2500);
  const ok = await walkUntil(r => { const p = globalThis.__berlinMetroGame.player; return p.__line === 'S41' && p.__lineStation === r; }, 1.57, 40000, ringIdx).catch(() => false);
  const okr = ok || await page.waitForFunction(r => { const p = globalThis.__berlinMetroGame.player; return p.__line === 'S41' && p.__lineStation === r; }, ringIdx, { timeout: 3000 }).then(() => true).catch(() => false);
  check(name, okr, JSON.stringify(await pos()));
};
await back('U5', 'frankfurter-allee', 6, 'U5 Frankfurter Allee → Ring');
await back('S5', 'ostkreuz', 7, 'Stadtbahn Ostkreuz → Ring');
await back('U9', 'westhafen', 25, 'U9 Westhafen → Ring');
await back('U3', 'heidelberger-platz', 17, 'U3 Heidelberger Platz → Ring');
const pts = await S(() => globalThis.BerlinLines.Transfers.status().points);
check('borden op U2/U8: Schönhauser Allee, Gesundbrunnen, Hermannstraße', ['U2:Schönhauser Allee', 'U8:Gesundbrunnen', 'U8:Hermannstraße'].every(k => pts.includes(k)), JSON.stringify(pts.filter(p => /Schönh|Gesund|Hermannstr/.test(p))));
await S(() => globalThis.BerlinLines.Transfers.toS41(10));
await page.waitForTimeout(2500);
{ const p = await pos(); check('toS41(10) → Neukölln', p.line === L && p.st === 10, JSON.stringify(p)); }

// 6. OSM-omgeving: ingraving (Schönhauser Allee, Bundesplatz) en dijk (Treptower Park).
for (const [i, id, y] of [[1, 'schoenhauser-allee', 7.0], [16, 'bundesplatz', 7.0], [8, 'treptower-park', -4]]) {
  await S(i => globalThis.BerlinLines.S41.enter(i), i);
  const ok = await page.waitForFunction(id => (globalThis.BerlinLines.S41.surroundings()?.built || []).includes?.(id) || JSON.stringify(globalThis.BerlinLines.S41.surroundings() || {}).includes(id), id, { timeout: 60000, polling: 1000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(3000);
  await stand(-1.57, -0.02); await page.waitForTimeout(1200); await shot(`s41b_omg_${i}_perron`);
  await S(([i, y]) => { const p = globalThis.__berlinMetroGame.player, s = globalThis.BerlinLines.S41.stations[i]; p.position.set(s.x + 60, y + 1.7, -7400 - 30); p.yaw = -2.4; p.pitch = -0.05; }, [i, y]);
  await page.waitForTimeout(1500); await shot(`s41b_omg_${i}_straat`);
  check(`omgeving ${id}`, ok, JSON.stringify(await S(() => globalThis.BerlinLines.S41.surroundings())).slice(0, 200));
}

// 7. Routebalk: niet onder het stationsvak linksboven; Ring nu in de planner.
await S(() => globalThis.BerlinLines.S41.enter(0));
await page.waitForTimeout(2500);
await S(() => globalThis.BerlinPhoneNetz.setDest('Ostkreuz'));
const lay = await S(() => { globalThis.BerlinRouteHud.update(); const e = document.querySelector('#routeHudV1').getBoundingClientRect(); const over = [...document.querySelectorAll('#hud .topbar > *, #hud .topbar-left > *')].map(c => c.getBoundingClientRect()).filter(r => r.width && r.left < e.right && r.right > e.left && r.top < e.bottom && r.bottom > e.top); return { top: e.top, over: over.length, text: document.querySelector('#routeHudV1').textContent }; });
await shot('s41b_routebalk');
check('routebalk vrij van het stationsvak', lay.over === 0 && /S4/.test(lay.text), JSON.stringify(lay));
const r = await S(() => [globalThis.BerlinPhoneNetz.plan('Gesundbrunnen', 'Wedding'), globalThis.BerlinPhoneNetz.plan('Hauptbahnhof', 'Prenzlauer Allee')]);
check('planner: Gesundbrunnen → Wedding = S42', r[0]?.legs?.[0]?.chip === 'S42', JSON.stringify(r[0]).slice(0, 200));
check('planner: Hbf → Prenzlauer Allee via de Ring', !!r[1] && r[1].legs.some(g => /S4/.test(g.chip)), JSON.stringify(r[1]).slice(0, 300));
await S(() => globalThis.BerlinPhoneNetz.setDest(null));

console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
