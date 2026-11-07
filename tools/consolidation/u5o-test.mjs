// U5 oost: Schillingstraße ⇄ Hönow. Stations 7–25, wandschilderingen (Magdalenenstraße, Tierpark), bovengronds op een
// aarden baan met OSM-omgeving (Biesdorf-Süd, Elsterwerdaer Platz, Wuhletal, Hönow), ingravingen met Plattenbau,
// overgangen tunnel → bovengronds en bovengronds → ingraving, eindpunt Hönow, treinen (3 per richting), meerijden
// Tierpark → Biesdorf-Süd, uitgang Hönow → Street View.
// Usage: node u5o-test.mjs <url> <outDir> [quality] [uur]   (env NORIDE=1: zonder meerijden)
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
await page.waitForFunction(() => globalThis.BerlinLines?.U5?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { x: Math.round(p.position.x * 10) / 10, line: p.__line, st: p.__lineStation, open: !!p.__lineOpenAir, street: !!p.__streetMode }; });
const stand = (yaw, pitch = 0) => page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
const SHOTS = { 13: [[-1.2, 0.08, 'wand']], 16: [[-1.2, 0.08, 'wand']], 17: [[-1.0, 0.05, 'omgeving'], [1.57, -0.02, 'naar-tierpark']], 18: [[-1.0, 0.05, 'omgeving']],
  19: [[-1.57, -0.02, 'naar-kaulsdorf']], 21: [[-1.2, 0.25, 'plattenbau']], 25: [[-1.57, -0.02, 'eind'], [-0.9, 0.05, 'omgeving']] };
// 1. Alle oostelijke stations.
for (let i = 7; i < 26; i++) {
  await page.evaluate(i => globalThis.BerlinLines.U5.enter(i), i);
  await page.waitForTimeout(5000);
  await stand(-1.57, -0.04); await page.waitForTimeout(1500);
  await shot(`u5o_${i}`);
  const p = await pos();
  check(`station ${i}`, p.line === 'U5' && p.st === i, JSON.stringify(p));
  for (const [y, pt, n] of SHOTS[i] || []) { await page.waitForTimeout(3000); await stand(y, pt); await page.waitForTimeout(1500); await shot(`u5o_${i}_${n}`); }
  if ([17, 18, 19, 25].includes(i)) {
    const ok = await page.waitForFunction(i => { const s = globalThis.BerlinLines.U5.surroundings(); return s?.visible === globalThis.BerlinLines.U5.stations[i].id; }, i, { timeout: 60000, polling: 500 }).then(() => true).catch(() => false);
    check(`OSM-omgeving ${i}`, ok, JSON.stringify(await page.evaluate(() => globalThis.BerlinLines.U5.surroundings())));
    await shot(`u5o_${i}_osm`);
  }
}
// 2. Treinen + DFI.
const s5 = await page.evaluate(() => globalThis.BerlinLines.U5.status());
check('U5-treinen (3 per richting) + DFI', s5.trains.length === 6 && s5.trains.every(t => t.units > 0) && !!s5.dfi, JSON.stringify(s5.trains.map(t => [t.id, t.x, t.state])));
if (!process.env.NORIDE) {
  await page.evaluate(() => globalThis.BerlinLines.U5.enter(16));
  await page.waitForTimeout(3000);
  await page.evaluate(() => globalThis.BerlinLines.U5.board(16, 1));
  const tid = await page.evaluate(() => globalThis.BerlinLines.U5.status().riding);
  let mid = false;
  for (let k = 0; k < 600 && !mid; k++) { await page.waitForTimeout(1000); const s = await page.evaluate(() => globalThis.BerlinLines.U5.status()); const t = s.trains.find(t => t.id === s.riding); if (t && t.x > 16 * 150 + 60) { mid = true; await shot('u5o_rit_tunnelmond'); } }
  const arrived = await page.waitForFunction(id => { const s = globalThis.BerlinLines.U5.status(); const t = s.trains.find(t => t.id === id); return s.riding === id && t && t.at === 17 && t.state === 'boarding'; }, tid, { timeout: 900000, polling: 1000 }).then(() => true).catch(() => false);
  await shot('u5o_rit_biesdorf');
  check('meerijden Tierpark → Biesdorf-Süd', arrived, tid);
}
// 3. Uitgang Hönow → Street View.
await page.evaluate(() => globalThis.BerlinLines.U5.enter(25));
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.U5.exit(25));
await page.waitForTimeout(12000);
const sv = await page.evaluate(() => ({ street: !!globalThis.__berlinMetroGame.player.__streetMode, s: globalThis.BerlinStreet?.status?.() }));
await shot('u5o_25_street');
check('uitgang Hönow → Street View', sv.street, JSON.stringify(sv.s || {}).slice(0, 300));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
