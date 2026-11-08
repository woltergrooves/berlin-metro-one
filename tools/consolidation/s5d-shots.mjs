// S-Bahn Stadtbahn deel d: echte omgeving (OSM-pakketten) en Spreebruggen. Laadt per station het pakket, maakt een
// perronblik en een straatblik, en controleert dat elk van de 14 pakketten bouwt zonder fouten.
// Usage: node s5d-shots.mjs <url> <outDir> [quality] [uur]   (env ONLY=3,6,9: alleen deze stations)
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', hour = '14'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if ((m.type() === 'error' || /overgeslagen|niet geladen/.test(m.text())) && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
let pass = 0, fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.S5?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(8000);
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const list = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : [...Array(14).keys()];
for (const i of list) {
  await page.evaluate(i => globalThis.BerlinLines.S5.enter(i), i);
  const id = await page.evaluate(i => globalThis.BerlinLines.S5.stations[i].id, i);
  const ok = await page.waitForFunction(id => globalThis.BerlinLines.S5.surroundings()?.visible === id, id, { timeout: 90000, polling: 500 }).then(() => true).catch(() => false);
  check(`omgeving ${i} ${id}`, ok, JSON.stringify(await page.evaluate(() => globalThis.BerlinLines.S5.surroundings())).slice(0, 200));
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.position.x += 30; p.yaw = 2.4; p.pitch = 0.05; });
  await page.waitForTimeout(2500); await shot(`d_${i}_perron`);
  await page.evaluate(i => { const p = globalThis.__berlinMetroGame.player, st = globalThis.BerlinLines.S5.stations[i]; p.position.set(st.x + 70, -st.elev + 1.7, -6800 - 30); p.yaw = -2.3; p.pitch = 0.25; }, i);
  await page.waitForTimeout(2500); await shot(`d_${i}_straat`);
}
// Spreebruggen: blik vanaf de kade.
for (const [i, name] of [[5, 'bellevue'], [6, 'hbf']]) {
  await page.evaluate(i => globalThis.BerlinLines.S5.enter(i), i);
  await page.waitForTimeout(6000);
  await page.evaluate(i => { const p = globalThis.__berlinMetroGame.player, st = globalThis.BerlinLines.S5.stations[i]; p.position.set(st.x + 75, -st.elev - 1, -6800 - 38); p.yaw = 2.6; p.pitch = 0.22; }, i);
  await page.waitForTimeout(3000); await shot(`d_brug_${name}`);
}
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
