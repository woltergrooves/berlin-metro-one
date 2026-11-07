// U6: Alt-Mariendorf ⇄ Kurt-Schumacher-Platz. 24 stations, wandbeelden Kochstraße/Platz der Luftbrücke, afgesloten U7,
// overstappen U6 ⇄ U5 (Unter den Linden), U6 ⇄ U2 (Stadtmitte, lila bord), U6 ⇄ U1 (Hallesches Tor), treinen/DFI, meerijden, uitgang.
// Usage: node u6-test.mjs <url> <outDir> [quality] [uur]   (env SKIP=1: stations overslaan, NORIDE=1: stoppen na de overstappen)
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
await page.waitForFunction(() => globalThis.BerlinLines?.U6?.status().installed && globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; return { x: Math.round(p.position.x * 10) / 10, z: Math.round(p.position.z), line: p.__line, st: p.__lineStation, street: !!p.__streetMode }; });
const stand = (yaw, pitch = 0) => page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
const walk = async (ms, yaw = 1.57) => { await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1; }, yaw); await page.waitForTimeout(ms); await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; }); };
// Lopen tot het keuzevenster verschijnt (headless loopt ±10× te traag).
const waitChooser = async () => {
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 1.57; p.input.moveY = 1; });
  const ok = await page.waitForFunction(() => globalThis.BerlinLines.Transfers.status().chooser, null, { timeout: 60000, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  return ok;
};
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);

const SKIP = !!process.env.SKIP;
const L = 'U6';
const N = 24;
// 1. Alle stations, foto langs het perron.
for (let i = 0; i < (SKIP ? 0 : N); i++) {
  await page.evaluate(i => globalThis.BerlinLines.U6.enter(i), i);
  await page.waitForTimeout(3500);
  await stand(-1.57, -0.04); await page.waitForTimeout(1200);
  if (i % 3 === 0 || [7, 9, 10, 11, 12, 23].includes(i)) await shot(`u6_${i}`);
  const p = await pos();
  check(`station ${i}`, p.line === L && p.st === i, JSON.stringify(p));
}
// Wandbeelden: Kochstraße (10) en Platz der Luftbrücke (7).
for (const [i, n] of [[10, 'checkpoint'], [7, 'luftbruecke']]) {
  await page.evaluate(i => globalThis.BerlinLines.U6.enter(i, { dx: -6 }), i);
  await page.waitForTimeout(3000); await stand(-0.35, 0.05); await page.waitForTimeout(1500); await shot(`u6_${i}_${n}`);
}
// 2. Afgesloten trapgat (U7 Mehringdamm).
if (!SKIP) {
  await page.evaluate(() => globalThis.BerlinLines.U6.enter(8, { dx: -13 }));
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u6_8_U7_dicht');
  await walk(30000);
  const p = await pos(), lx = p.x - 8 * 150;
  check('trapgat U7 dicht', p.line === L && p.st === 8 && lx > -16.2 && lx < -15.5, JSON.stringify({ lx }));
}
// Loop het trapgat in tot de lijn wisselt.
const walkUntil = async (cond, yaw = 1.57, ms = 90000) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
// 3. Overstappen.
// 3a. U6 Unter den Linden → U5, en terug.
await page.evaluate(() => globalThis.BerlinLines.U6.enter(12, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u6_12_bord_u5');
let ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U5');
let p = await pos();
check('U6 → U5 Unter den Linden', ok && p.st === 3, JSON.stringify(p));
await page.evaluate(() => globalThis.BerlinLines.U5.enter(3, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u5_3_bord_u6');
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U6');
p = await pos();
check('U5 → U6 Unter den Linden', ok && p.st === 12, JSON.stringify(p));
// 3b. U6 Stadtmitte → U2, terug via het lila bord.
await page.evaluate(() => globalThis.BerlinLines.U6.enter(11, { dx: -13 }));
await page.waitForTimeout(3000);
ok = await walkUntil(() => !globalThis.__berlinMetroGame.player.__line);
p = await pos();
const onU2 = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, s = g.stations.find(s => s.id === 'stadtmitte'); return { rz: Math.round((g.player.position.z - s.z) * 10) / 10, y: g.player.position.y }; });
check('U6 → U2 Stadtmitte', ok && Math.abs(onU2.rz + 30.4) < 2, JSON.stringify({ p, onU2 }));
await stand(0, -0.02); await page.waitForTimeout(1500); await shot('u2_stadtmitte_bord_u6');
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U6', 0);
p = await pos();
check('U2 Stadtmitte → U6 (lila bord)', ok && p.st === 11, JSON.stringify(p));
// 3c. U6 Hallesches Tor → U1 (viaduct), en terug.
await page.evaluate(() => globalThis.BerlinLines.U6.enter(9, { dx: -13 }));
await page.waitForTimeout(3000);
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U1');
p = await pos();
const u1i = await page.evaluate(() => globalThis.BerlinLines.U1.stations.findIndex(s => s.id === 'hallesches-tor'));
check('U6 → U1 Hallesches Tor', ok && p.st === u1i, JSON.stringify({ p, u1i }));
await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u1_hallesches_bord_u6');
await page.evaluate(i => globalThis.BerlinLines.U1.enter(i, { dx: -13 }), u1i);
await page.waitForTimeout(3000);
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U6');
p = await pos();
check('U1 → U6 Hallesches Tor', ok && p.st === 9, JSON.stringify(p));

if (process.env.NORIDE) { console.log('resultaat', pass, '/', pass + fail); console.log('fouten', errors.length, errors.slice(0, 8)); console.log('done'); await browser.close(); process.exit(0); }
// 4. Treinen + DFI + meerijden Kochstraße → Stadtmitte.
await page.evaluate(() => globalThis.BerlinLines.U6.enter(10));
await page.waitForTimeout(8000);
const s6 = await page.evaluate(() => globalThis.BerlinLines.U6.status());
check('U6-treinen + DFI', s6.trains.length === 6 && s6.trains.every(t => t.units > 0) && !!s6.dfi, JSON.stringify({ trains: s6.trains, dfi: s6.dfi }));
await stand(-1.57, 0.12); await page.waitForTimeout(1500); await shot('u6_10_dfi');
await page.evaluate(() => globalThis.BerlinLines.U6.board(10, 1));
const arrived = await page.waitForFunction(() => { const s = globalThis.BerlinLines.U6.status(); return s.riding && s.trains.some(t => t.dir === 1 && t.at === 11 && t.state === 'boarding'); }, null, { timeout: 1200000, polling: 1000 }).then(() => true).catch(() => false);
await shot('u6_rit_stadtmitte');
check('meerijden tot Stadtmitte', arrived, JSON.stringify((await page.evaluate(() => globalThis.BerlinLines.U6.status())).trains));

// 5. Uitgang Platz der Luftbrücke → Street View + buurtpakket.
await page.evaluate(() => globalThis.BerlinLines.U6.enter(7));
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.U6.exit(7));
await page.waitForTimeout(12000);
const sv = await page.evaluate(() => ({ street: !!globalThis.__berlinMetroGame.player.__streetMode, s: globalThis.BerlinStreet?.status?.() }));
await shot('u6_7_street');
check('uitgang → Street View', sv.street, JSON.stringify(sv.s || {}).slice(0, 300));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
