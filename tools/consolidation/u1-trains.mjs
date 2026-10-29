// Mijlpaal 1 / U1b: U1-treinen — wachten op een trein, instappen door een deur, meerijden, uitstappen.
// Usage: node u1-trains.mjs <url> <outDir> [kwaliteit] [uur]
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
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); if (/U1/.test(m.text())) console.log('log', m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.U1?.status().installed, null, { timeout: 200000 });
await page.waitForFunction(() => globalThis.BerlinLines.U1.status().model !== 'laden', null, { timeout: 120000 }).catch(() => console.log('model laadt niet'));
await page.waitForTimeout(8000);
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const st = () => page.evaluate(() => globalThis.BerlinLines.U1.status());
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
async function shot(name, yaw, pitch = 0.02, hideHud = true) {
  await page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
  if (hideHud) await page.evaluate(() => document.body.classList.add('__shot'));
  await settle(400);
  await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 240000 });
  const info = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, r = g.renderer.info.render, p = g.player; return { calls: r.calls, tris: r.triangles, pos: [p.position.x, p.position.z].map(v => Math.round(v * 10) / 10), hud: [document.querySelector('#stationName')?.textContent, document.querySelector('#trainStatus')?.textContent, document.querySelector('#hint')?.textContent] }; });
  console.log('shot', name, JSON.stringify(info));
}
// Headless loopt het spel ±10× te traag → treintijd vooruitspoelen tot de voorwaarde klopt (max. `sec` speltijd).
const ff = (cond, sec = 120) => page.evaluate(([cond, sec]) => { const U1 = globalThis.BerlinLines.U1, p = globalThis.__berlinMetroGame.player, f = new Function('U1', 'return ' + cond);
  for (let k = 0; k < sec * 10; k++) { if (f(U1)) return true; for (const t of U1.trains) { t.update(0.1, { rider: p.__lineTrain === t }); if (!p.__lineTrain) t.maintain(p.__lineStation, performance.now() / 1000 + k / 10, { waiting: true }); } } return f(U1); }, [cond, sec]);
const waitTrain = (i, dir) => ff(`U1.trains.some(t => t.direction === ${dir} && t.boardableAt(${i}))`);
// Lopen met gesimuleerde frames (headless is te traag voor echte tijd): `ms` = speltijd in ms.
const walk = async (yaw, ms) => console.log('walk', JSON.stringify(await page.evaluate(([y, ms]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1;
  for (let t = 0; t < ms; t += 50) p.updateMovement(0.05); p.input.moveY = 0; return { x: +p.position.x.toFixed(2), z: +p.position.z.toFixed(2), riding: p.__lineTrain?.id ?? null }; }, [yaw, ms])));

// 1. Kottbusser Tor (viaduct, middenperron): trein richting Warschauer Straße komt binnen.
await page.evaluate(() => globalThis.BerlinLines.U1.enter(9, { dx: -6 }));
console.log('na enter', JSON.stringify(await st()));
await page.waitForTimeout(2500);
console.log('nadert', await ff(`U1.trains.find(t => t.direction === 1).x > 1300`));
await shot('a_kotti_arrive', -1.2);
console.log('trein kotti', await waitTrain(9, 1), JSON.stringify(await st()));
await page.waitForTimeout(800);
await shot('b_kotti_doors', -1.9);
// Naar een deur lopen en instappen (spoor +1 ligt aan +z → yaw π).
await page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player, t = globalThis.BerlinLines.U1.trains.find(t => t.direction === 1); p.position.x = t.x + 12.5 - 2.7; p.position.z = -2600 + 2.6; });
await walk(Math.PI, 1500);
const s1 = await st(); console.log('instappen', s1.riding, s1.boardings);
await shot('c_inside', -1.57, -0.02);
console.log('vertrek', await ff(`U1.trains.find(t => t.direction === 1).timeline.routeProgress > 0.4`));
await page.waitForTimeout(1500);
await shot('d_ride_window', Math.PI, -0.05, false);
console.log('rijden', JSON.stringify(await st()));
// Bij Görlitzer Bahnhof (zijperron rechts, +z) uitstappen.
console.log('aankomst', await waitTrain(10, 1));
await walk(Math.PI, 1500);
const s2 = await st(); console.log('uitstappen', JSON.stringify({ riding: s2.riding, alight: s2.alightings, station: s2.station }));
await shot('e_goerli_platform', -1.57);
// 2. Wittenbergplatz (tunnel, middenperron): trein richting Uhlandstraße (spoor −z).
await page.evaluate(() => globalThis.BerlinLines.U1.enter(2, { dx: 8 }));
await page.waitForTimeout(2500);
console.log('trein witt', await waitTrain(2, -1), JSON.stringify(await st()));
await page.waitForTimeout(800);
await shot('f_witt_train', 0.9);
// 3. Meerijden door de tunnelmond (board-hulp) Kurfürstenstraße → Gleisdreieck.
await page.evaluate(() => globalThis.BerlinLines.U1.board(4, 1));
console.log('rit', await ff(`U1.trains.find(t => t.direction === 1).timeline.routeProgress > 0.45`));
await page.waitForTimeout(1500);
await shot('g_ride_portal', -1.57, -0.02);
console.log('portal', JSON.stringify(await st()));
// 4. Lopen op het perron blijft werken; verlaten.
await page.evaluate(() => globalThis.BerlinLines.U1.leave());
await page.waitForTimeout(2000);
console.log('leave', JSON.stringify(await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { z: p.position.z, line: p.__line, train: !!p.__lineTrain, station: p.currentStation?.id }; })));
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
