// Nord-Süd-Bahn (16 Nov 2026): 10 stations Gesundbrunnen ⇄ Südkreuz, trains S2 + guests S25/S26, departure board,
// riding, transfers both ways (Ring, U8, Stadtbahn, U6, U5, U2, U7), route planner. Usage: node s2-test.mjs <url> <outDir>
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
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FAIL', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /new save/i.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /new save/i.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.S2?.status().installed && globalThis.BerlinRouteHud, null, { timeout: 200000 });
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
const L = 'S2', S = (fn, arg) => page.evaluate(fn, arg);
const st = () => S(() => globalThis.BerlinLines.S2.status());

// 1. Stations and trains.
await S(() => globalThis.BerlinLines.S2.enter(6));
await page.waitForTimeout(3000);
let s = await st();
const n = id => s.trains.filter(t => t.line === id).length;
check('10 stations, trains S2 4 / S25 2 / S26 2', globalThis && s.trains.length === 8 && n('S2') === 4 && n('S25') === 2 && n('S26') === 2, JSON.stringify({ n: s.trains.map(t => t.line + t.dir), model: s.model }));
check('10 stations', (await S(() => globalThis.BerlinLines.S2.stations.length)) === 10);
await S(() => globalThis.BerlinLines.S2.simulate(60));
s = await st();
check('departure board Potsdamer Platz: S2 + S25/S26', /S2/.test(s.dfi || '') && /S2[56]/.test(s.dfi || ''), s.dfi);
const hint = await S(() => document.querySelector('#hint, .hint')?.textContent || '');
await stand(-1.57, -0.02); await page.waitForTimeout(1500); await shot('s2_potsdamer_platz');
await stand(0, -0.02); await page.waitForTimeout(1000); await shot('s2_potsdamer_platz_wall');
for (const [i, nm, yaw] of [[2, 'nordbahnhof', 0], [0, 'gesundbrunnen', -1.57], [8, 'yorckstrasse', -1.57], [9, 'suedkreuz', -1.57], [4, 'friedrichstrasse', -1.57]]) {
  await S(i => globalThis.BerlinLines.S2.enter(i), i); await page.waitForTimeout(3500); await stand(yaw, -0.02); await page.waitForTimeout(1200); await shot('s2_' + nm);
}

// 2. Ride S2 Friedrichstraße → Brandenburger Tor (southbound, +1).
await S(() => globalThis.BerlinLines.S2.board(4, 1));
await page.waitForTimeout(1500);
for (let k = 0; k < 40; k++) {
  await S(() => globalThis.BerlinLines.S2.simulate(1));
  const q = await S(() => { const t = globalThis.__berlinMetroGame.player.__lineTrain; return { at: t?.currentIndex, state: t?.state }; });
  if (k === 5) { await stand(-1.57, -0.02); await shot('s2_ride'); }
  if (q.at === 5 && /boarding|opening/.test(q.state)) break;
}
{ const p = await pos(); check('ride Friedrichstraße → Brandenburger Tor', p.line === L && Math.abs(p.x - 750) < 30, JSON.stringify(p)); }

// 3. Transfers from the Nord-Süd-Bahn (walking into the stairwell).
const pick = async k => { const ok = await page.waitForFunction(() => !!document.querySelector('#lineTransferChooser'), null, { timeout: 8000 }).then(() => true).catch(() => false); if (ok) await S(k => globalThis.BerlinLines.Transfers.pick(k), k); return ok; };
const viaStair = async (i, cond, name, choice = null) => {
  await S(i => globalThis.BerlinLines.S2.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(2500);
  let ok;
  if (choice != null) { ok = await walkUntil(() => !!document.querySelector('#lineTransferChooser'), 1.57, 40000); if (ok) await pick(choice); ok = ok && await page.waitForFunction(cond, null, { timeout: 15000 }).then(() => true).catch(() => false); }
  else ok = await walkUntil(cond, 1.57, 40000);
  await page.waitForTimeout(2000); await shot('s2_over_' + i);
  check(name, ok, JSON.stringify(await pos()));
};
await viaStair(5, () => globalThis.__berlinMetroGame.player.__line === 'U5', 'S2 Brandenburger Tor → U5');
await viaStair(6, () => { const g = globalThis.__berlinMetroGame, p = g.player; return !p.__line && Math.abs(p.position.z - (g.stations.find(s => s.id === 'potsdamer-platz')?.z ?? 1e9)) < 40; }, 'S2 Potsdamer Platz → U2');
await viaStair(8, () => globalThis.__berlinMetroGame.player.__line === 'U7', 'S2 Yorckstraße → U7');
await viaStair(9, () => globalThis.__berlinMetroGame.player.__line === 'S41', 'S2 Südkreuz → Ring');
await viaStair(4, () => globalThis.__berlinMetroGame.player.__line === 'S5', 'S2 Friedrichstraße → choice → Stadtbahn', 0);
await viaStair(4, () => globalThis.__berlinMetroGame.player.__line === 'U6', 'S2 Friedrichstraße → choice → U6', 1);
await viaStair(0, () => globalThis.__berlinMetroGame.player.__u8FullStation === 9, 'S2 Gesundbrunnen → choice → U8', 1);
await viaStair(0, () => globalThis.__berlinMetroGame.player.__line === 'S41', 'S2 Gesundbrunnen → choice → Ring', 0);

// 4. Back to the Nord-Süd-Bahn.
const back = async (lineId, sid, nsIdx, name, choice = null) => {
  const i = await S(([l, f]) => globalThis.BerlinLines[l].stations.findIndex(s => s.id === f && !s.shared), [lineId, sid]);
  await S(([l, i]) => globalThis.BerlinLines[l].enter(i, { dx: -13 }), [lineId, i]);
  await page.waitForTimeout(2500);
  const cond = r => { const p = globalThis.__berlinMetroGame.player; return p.__line === 'S2' && p.__lineStation === r; };
  let ok;
  if (choice != null) { ok = await walkUntil(() => !!document.querySelector('#lineTransferChooser'), 1.57, 40000); if (ok) await pick(choice); }
  else ok = await walkUntil(cond, 1.57, 40000, nsIdx).catch(() => false);
  const okr = await page.waitForFunction(cond, nsIdx, { timeout: 8000 }).then(() => true).catch(() => false);
  check(name, okr, JSON.stringify(await pos()));
};
await back('U5', 'brandenburger-tor', 5, 'U5 Brandenburger Tor → S2');
await back('U7', 'yorckstrasse', 8, 'U7 Yorckstraße → S2');
await back('S41', 'suedkreuz', 9, 'Ring Südkreuz → S2');
await back('S41', 'gesundbrunnen', 0, 'Ring Gesundbrunnen → choice → S2', 1);
await back('S5', 'friedrichstrasse', 4, 'Stadtbahn Friedrichstraße → choice → S2', 1);
await back('U6', 'friedrichstrasse', 4, 'U6 Friedrichstraße → choice → S2', 1);
const pts = await S(() => globalThis.BerlinLines.Transfers.status().points);
check('signs on U2 Potsdamer Platz and U8 Gesundbrunnen', ['U2:Potsdamer Platz', 'U8:Gesundbrunnen'].every(k => pts.includes(k)), JSON.stringify(pts.filter(p => /Potsdam|Gesund/.test(p))));
await S(() => globalThis.BerlinLines.Transfers.toS2(6));
await page.waitForTimeout(2500);
{ const p = await pos(); check('toS2(6) → Potsdamer Platz', p.line === L && p.st === 6, JSON.stringify(p)); }

// 5. Route planner + GOD.
const r = await S(() => [globalThis.BerlinPhoneNetz.plan('Gesundbrunnen', 'Potsdamer Platz'), globalThis.BerlinPhoneNetz.plan('Alexanderplatz', 'Anhalter Bahnhof')]);
check('planner: Gesundbrunnen → Potsdamer Platz = S2', /S2/.test(r[0]?.legs?.[0]?.chip || ''), JSON.stringify(r[0]).slice(0, 200));
check('planner: Alexanderplatz → Anhalter Bahnhof', !!r[1] && r[1].legs.some(g => /S2/.test(g.chip)), JSON.stringify(r[1]).slice(0, 300));
const god = await S(() => globalThis.BerlinGodTeleport?.status?.());
check('GOD menu knows S2', JSON.stringify(god || {}).includes('S2'), JSON.stringify(god).slice(0, 200));

console.log('result', pass, '/', pass + fail);
console.log('errors', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
