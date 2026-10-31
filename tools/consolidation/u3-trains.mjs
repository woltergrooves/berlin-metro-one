// Mijlpaal 2 / U3b: U3-treinen — eigen tak, overgang naar het U1-spoor bij x = 262, gedeelde stations (DFI U1 + U3).
// Usage: node u3-trains.mjs <url> <outDir> [kwaliteit] [uur]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', hour = '13'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [], results = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
const ok = (name, cond, info = '') => { results.push([name, !!cond]); console.log(cond ? 'OK  ' : 'FOUT', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.U3?.status().installed && globalThis.BerlinLines?.U1?.status().installed, null, { timeout: 200000 });
await page.waitForFunction(() => globalThis.BerlinLines.U3.status().model !== 'laden', null, { timeout: 120000 }).catch(() => console.log('model laadt niet'));
await page.waitForTimeout(6000);
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const st = l => page.evaluate(l => globalThis.BerlinLines[l].status(), l);
const P = () => page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { line: p.__line, st: p.__lineStation, x: +p.position.x.toFixed(1), z: +p.position.z.toFixed(1), riding: p.__lineTrain?.id ?? null }; });
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 300000 }); await page.waitForTimeout(ms); }
async function shot(name, yaw, pitch = 0.02, hideHud = true) {
  await page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
  if (hideHud) await page.evaluate(() => document.body.classList.add('__shot')); else await page.evaluate(() => document.body.classList.remove('__shot'));
  await settle(500);
  await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 240000 });
  const info = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, r = g.renderer.info.render; return { calls: r.calls, tris: r.triangles, hud: [document.querySelector('#stationName')?.textContent, document.querySelector('#trainStatus')?.textContent, document.querySelector('#hint')?.textContent] }; });
  console.log('shot', name, JSON.stringify(info));
}
// Speltijd vooruitspoelen via updateMovement (beweegt de treinen van de actieve lijn + de meerijder, incl. overgang).
const ff = (cond, sec = 240) => page.evaluate(([cond, sec]) => { const p = globalThis.__berlinMetroGame.player, f = new Function('L', 'p', 'return ' + cond);
  for (let k = 0; k < sec * 10; k++) { if (f(globalThis.BerlinLines, p)) return true; p.updateMovement(0.1); } return f(globalThis.BerlinLines, p); }, [cond, sec]);
const walk = (yaw, ms) => page.evaluate(([y, ms]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1;
  for (let t = 0; t < ms; t += 50) p.updateMovement(0.05); p.input.moveY = 0; return { x: +p.position.x.toFixed(2), z: +p.position.z.toFixed(2), riding: p.__lineTrain?.id ?? null, line: p.__line }; }, [yaw, ms]);

// 1. Dahlem-Dorf (ingraving, middenperron): U3-trein richting Warschauer Straße komt binnen, instappen door een deur.
await page.evaluate(() => globalThis.BerlinLines.U3.enter(4, { dx: -6 }));
await page.waitForTimeout(2500);
ok('dahlem: trein komt', await ff(`L.U3.trains.some(t => t.direction === 1 && t.boardableAt(4))`), JSON.stringify((await st('U3')).trains));
await shot('a_dahlem_train', -1.9);
const s0 = await st('U3'); ok('dahlem: DFI U3', /U3Warschauer/.test(s0.dfi || '') && /U3Krumme/.test(s0.dfi || ''), s0.dfi);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player, t = globalThis.BerlinLines.U3.trains.find(t => t.direction === 1); p.position.x = t.x + 12.5 - 2.7; p.position.z = -3200 + 2.6; });
const w1 = await walk(Math.PI, 1500); ok('dahlem: instappen', w1.riding, JSON.stringify(w1));
await shot('b_dahlem_inside', -1.57, -0.02, false);
// Uitstappen bij Podbielskiallee (index 5, middenperron: perron aan −z voor richting +1).
ok('podbielski: aankomst', await ff(`L.U3.trains.find(t => t.direction === 1).boardableAt(5)`));
const w2 = await walk(0, 1500); ok('podbielski: uitstappen', !w2.riding && w2.line === 'U3', JSON.stringify(w2));
const pp = await P(); ok('podbielski: station 5', pp.st === 5, JSON.stringify(pp));

// 2. Augsburger Straße → Wittenbergplatz: overgang naar het U1-spoor.
await page.evaluate(() => globalThis.BerlinLines.U3.board(12, 1));
await page.waitForTimeout(1500);
await shot('c_augsburger_inside', -1.57, -0.02);
const zBefore = await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player, t = p.__lineTrain; return +(p.position.z - (-3200)).toFixed(2); });
ok('rit: in U3-wereld vóór de overgang', (await P()).line === 'U3');
ok('rit: overgang naar U1', await ff(`p.__line === 'U1'`, 60), JSON.stringify(await P()));
const zAfter = await page.evaluate(() => +(globalThis.__berlinMetroGame.player.position.z - (-2600)).toFixed(2));
ok('rit: naadloos (zelfde dwarspositie)', Math.abs(zAfter - zBefore) < 0.05, `${zBefore} → ${zAfter}`);
await page.waitForTimeout(1500);
await shot('d_split_tunnel', -1.57, -0.02);
ok('rit: aankomst Wittenbergplatz (U1)', await ff(`p.__lineTrain && p.__lineTrain.boardableAt(13)`, 60), JSON.stringify(await P()));
await page.waitForTimeout(1500);
await shot('e_witt_arrive_inside', Math.PI / 2 + 0.5, -0.02, false);
await page.evaluate(() => { globalThis.__berlinMetroGame.player.__lineRide.ox = -10.2; });   // naar een deur (board() zet je tussen de deuren)
const w3 = await walk(0, 1500);
const pw = await P(); ok('witt: uitstappen op het U1-perron', !w3.riding && pw.line === 'U1' && pw.st === 2, JSON.stringify(pw));
// 3. Op het U1-perron Wittenbergplatz: DFI met U1 én U3, U3-trein richting Krumme Lanke komt (gast-trein).
await settle(1500);
const s1 = await st('U1'); ok('witt: DFI U1 + U3', /U1/.test(s1.dfi || '') && /U3/.test(s1.dfi || ''), s1.dfi);
ok('witt: U3 richting Krumme Lanke stopt', await ff(`L.U3.trains.some(t => t.direction === -1 && t.boardableAt(13))`), JSON.stringify((await st('U1')).trains));
await page.waitForTimeout(1500);
await shot('f_witt_u3_train', 0.9);
const vis = await page.evaluate(() => globalThis.BerlinLines.U3.trains.find(t => t.direction === -1).group.visible);
ok('witt: U3-trein zichtbaar in U1-wereld', vis);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player, t = globalThis.BerlinLines.U3.trains.find(t => t.direction === -1); p.position.x = t.x - 12.5 + 2.7; p.position.z = -2600 - 2.6; });
const w4 = await walk(0, 1500); ok('witt: instappen U3', w4.riding && /U3/.test(w4.riding), JSON.stringify(w4));
ok('terug: overgang naar U3', await ff(`p.__line === 'U3'`, 60), JSON.stringify(await P()));
ok('terug: aankomst Augsburger Straße', await ff(`p.__lineTrain && p.__lineTrain.boardableAt(12)`, 60), JSON.stringify(await P()));
await page.waitForTimeout(1500);
await shot('g_augsburger_back', -Math.PI / 2, -0.02, false);
// 4. U1 werkt nog: Kottbusser Tor, U1-trein, en U3 ook daar.
await page.evaluate(() => globalThis.BerlinLines.U1.enter(9, { dx: -6 }));
await page.waitForTimeout(2500);
ok('kotti: U1-trein', await ff(`L.U1.trains.some(t => t.direction === 1 && t.boardableAt(9))`));
ok('kotti: U3-trein', await ff(`L.U3.trains.some(t => t.direction === 1 && t.boardableAt(20))`));
await page.waitForTimeout(1500);
await shot('h_kotti_u3', -1.3);
const s2 = await st('U1'); console.log('kotti', s2.dfi, JSON.stringify(s2.trains));
// Geen overlap op gedeeld spoor: treinen in dezelfde richting nooit dichter dan één treinlengte.
const gap = await page.evaluate(() => { const L = globalThis.BerlinLines, p = globalThis.__berlinMetroGame.player; let min = Infinity;
  for (let k = 0; k < 3000; k++) { p.updateMovement(0.1); for (const d of [1, -1]) { const a = L.U1.trains.find(t => t.direction === d), b = L.U3.trains.find(t => t.direction === d); if (a.trackZone(a.x).id === b.trackZone(b.x).id && a.state !== 'waiting-to-approach' && b.state !== 'waiting-to-approach') min = Math.min(min, Math.abs(a.x - b.x)); } } return +min.toFixed(1); });
ok('geen overlap U1/U3 (min. afstand ≥ 50 m)', gap >= 50, String(gap));
await page.evaluate(() => globalThis.BerlinLines.U1.leave());
await page.waitForTimeout(1500);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done', results.filter(r => r[1]).length + '/' + results.length);
await browser.close();
