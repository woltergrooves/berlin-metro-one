// Ringbahn deel a (9 nov 2026): 27 stations S41/S42 rond het centrum (ingravingen + dijken), rondlopend spoor (naad
// Wedding → Gesundbrunnen), GOD-menu (lijnchip S41 + teleport), dichte overstappen, uitgang → Street View en terug.
// Daarnaast de routeaanwijzing in de HUD (RouteHud): bestemming kiezen → balkje met lijn/richting/haltes, ook rijdend,
// × = stoppen; routeplanner rond de Ring (met een tijdelijk "rijdende" Ring).
// Usage: node s41-test.mjs <url> <outDir> [quality] [uur]   (env SKIP=1: stations overslaan)
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
const walkUntil = async (cond, yaw = 1.57, ms = 90000) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; if (y != null) p.yaw = y; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
const hud = () => page.evaluate(() => { const e = document.querySelector('#routeHudV1'); globalThis.BerlinRouteHud.update(); return { shown: !!e && e.style.display === 'flex', text: e?.textContent || '', cls: e?.className || '' }; });
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const SKIP = !!process.env.SKIP, L = 'S41';

const n = await page.evaluate(() => globalThis.BerlinLines.S41.stations.length);
check('27 stations', n === 27, String(n));
// 1. Alle stations (met wereldbouw: station + tussenstukken).
for (let i = 0; i < (SKIP ? 0 : 27); i++) {
  await page.evaluate(i => globalThis.BerlinLines.S41.enter(i), i);
  await page.waitForTimeout(3000);
  await stand(-1.57, -0.02); await page.waitForTimeout(1000);
  if ([0, 1, 6, 7, 8, 11, 13, 17, 20, 26].includes(i)) await shot(`s41_${i}`);
  const p = await pos(), w = await page.evaluate(() => globalThis.BerlinLines.S41.status().world || null);
  check(`station ${i}`, p.line === L && p.st === i && Math.abs(p.x - (i * 150)) < 40, JSON.stringify({ p, w }));
}
// 2. Naad van de Ring: bij Gesundbrunnen en Wedding ook het tussenstuk Wedding → Gesundbrunnen.
for (const i of [0, 26]) {
  await page.evaluate(i => globalThis.BerlinLines.S41.enter(i), i);
  for (let k = 0; k < 8; k++) await page.waitForTimeout(1500);
  const seg = await page.evaluate(() => [...globalThis.BerlinLines.S41.world.segmentGroups.keys()]);
  check(`naad bij ${i}`, seg.includes(i === 0 ? -1 : 26), JSON.stringify(seg));
  await stand(i === 0 ? 1.57 : -1.57, -0.02); await page.waitForTimeout(1000); await shot(`s41_${i}_naad`);
}
// 3. Straatblik: ingraving (Schönhauser Allee) en dijk (Treptower Park).
for (const [i, y] of [[1, 1.5], [8, -6]]) {
  await page.evaluate(i => globalThis.BerlinLines.S41.enter(i), i);
  await page.waitForTimeout(4000);
  await page.evaluate(([i, y]) => { const p = globalThis.__berlinMetroGame.player, st = globalThis.BerlinLines.S41.stations[i]; p.position.set(st.x + 55, y + 1.7, -7400 - 24); p.yaw = -2.4; p.pitch = 0.1; }, [i, y]);
  await page.waitForTimeout(1500); await shot(`s41_${i}_straat`);
}
// 4. GOD-menu: lijnchip S41 en teleport.
const god = await page.evaluate(() => { const r = globalThis.BerlinGodTeleport?.teleport?.('S41', 12); const p = globalThis.__berlinMetroGame.player; return { r, line: p.__line, st: p.__lineStation }; });
check('GOD teleport S41 Tempelhof', god.line === L && god.st === 12, JSON.stringify(god).slice(0, 300));
// 5. Dicht overstaptrapgat (Schönhauser Allee → U2).
await page.evaluate(() => globalThis.BerlinLines.S41.enter(1, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('s41_1_dicht');
await walkUntil(() => false, 1.57, 25000);
{ const p = await pos(), lx = p.x - 150; check('trapgat Schönhauser Allee dicht', p.line === L && p.st === 1 && lx > -16.5 && lx < -15, JSON.stringify({ lx })); }
// 6. Uitgang lopend: Prenzlauer Allee (ingraving, trap omhoog) → Street View → terug.
await page.evaluate(() => globalThis.BerlinLines.S41.enter(2, { at: 'exit' }));
await page.waitForTimeout(3000);
let ok = await walkUntil(() => !!globalThis.__berlinMetroGame.player.__streetMode, -1.57, 60000);   // ingraving: trap omhoog aan de +x-kant
await page.waitForTimeout(9000); await shot('s41_2_street');
check('uitgang Prenzlauer Allee → Street View', ok, JSON.stringify(await pos()));
const back = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /S-Bahn|←/.test(b.textContent) && b.offsetParent); b?.click(); return b?.textContent || null; });
await page.waitForTimeout(5000);
{ const pb = await pos(); check('terug op het perron', !pb.street && pb.line === L && pb.st === 2, JSON.stringify({ back, pb })); }

// 7. Routeaanwijzing in de HUD.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(6));   // Hauptbahnhof (Stadtbahn)
await page.waitForTimeout(3000);
let h = await hud();
check('HUD: geen route = niets', !h.shown, JSON.stringify(h));
await page.evaluate(() => globalThis.BerlinPhoneNetz.setDest('Jannowitzbrücke'));
h = await hud(); await shot('route_hud_perron');
check('HUD: neem de S richting Ostkreuz', h.shown && /Neem de/.test(h.text) && /Ostkreuz/.test(h.text) && /4 haltes/.test(h.text), JSON.stringify(h));
await page.evaluate(() => globalThis.BerlinPhoneNetz.setDest('Mehringdamm'));   // via U6 (Friedrichstraße)
h = await hud();
check('HUD: met overstap', h.shown && /dan/.test(h.text) && /U6/.test(h.text), JSON.stringify(h));
// Rijdend in de S-Bahn richting Ostkreuz.
await page.evaluate(() => globalThis.BerlinPhoneNetz.setDest('Jannowitzbrücke'));
const rode = await page.evaluate(() => { try { globalThis.BerlinLines.S5.board(6, 1); } catch (e) { return String(e); } return !!globalThis.__berlinMetroGame.player.__lineTrain; });
await page.waitForTimeout(2000);
h = await hud(); await shot('route_hud_rit');
check('HUD rijdend: blijf zitten / stap uit', rode === true && h.shown && /(Blijf zitten|Stap)/.test(h.text), JSON.stringify({ rode, h }));
await page.evaluate(() => globalThis.BerlinLines.S5.leave?.());
// Aangekomen + × stoppen.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(10));
await page.waitForTimeout(2500);
h = await hud();
check('HUD: aangekomen', h.shown && /Aangekomen/.test(h.text), JSON.stringify(h));
await page.evaluate(() => { globalThis.BerlinPhoneNetz.setDest('Zoologischer Garten'); globalThis.BerlinRouteHud.update(); document.querySelector('#routeHudV1 .rh-x').click(); });
h = await hud();
check('HUD: × stopt de route', !h.shown && !(await page.evaluate(() => globalThis.BerlinPhoneNetz.dest)), JSON.stringify(h));
// Ring: zonder treinen niet in de planner; met (tijdelijk) rijdende Ring rond de naad.
let r = await page.evaluate(() => globalThis.BerlinPhoneNetz.plan('Hauptbahnhof', 'Prenzlauer Allee'));
check('Ring (deel a) nog niet in de planner', r === null, JSON.stringify(r));
r = await page.evaluate(() => { const S = globalThis.BerlinLines.S41, o = S.relevant; S.relevant = () => [1]; try { return [globalThis.BerlinPhoneNetz.plan('Gesundbrunnen', 'Wedding'), globalThis.BerlinPhoneNetz.plan('Westkreuz', 'Wedding'), globalThis.BerlinPhoneNetz.plan('Hauptbahnhof', 'Prenzlauer Allee')]; } finally { S.relevant = o; } });
check('Ring: Gesundbrunnen → Wedding = S42 1 halte', r[0]?.legs.length === 1 && r[0].legs[0].chip === 'S42' && r[0].legs[0].stops === 1, JSON.stringify(r[0]));
check('Ring: Westkreuz → Wedding = S41 6 haltes', r[1]?.legs.length === 1 && r[1].legs[0].chip === 'S41' && r[1].legs[0].stops === 6, JSON.stringify(r[1]));
check('Ring: Hbf → Prenzlauer Allee via de Ring', !!r[2] && r[2].legs.some(g => /S4/.test(g.chip)), JSON.stringify(r[2]).slice(0, 300));

console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
