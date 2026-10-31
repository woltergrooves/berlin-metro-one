// Mijlpaal 2 / U3c: overstapborden en afgesloten trapgaten op de U3-tak (U7/U9/Ring), U1+U3-bord op het U2-perron,
// overstap U2 Wittenbergplatz → U1/U3-perron (U3 komt daar langs).
// Usage: node u3c-test.mjs <url> <outDir> [quality] [uur]
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
await page.waitForFunction(() => globalThis.BerlinLines?.U3?.status().installed && globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; return { x: p.position.x, z: p.position.z, line: p.__line, st: p.__lineStation, u8: p.__u8FullStation, hint: document.querySelector('#hint, .hint')?.textContent || '' }; });
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);

// 1. Afgesloten trapgaten: zichtbaar, en je loopt er niet in.
for (const [i, label] of [[8, 'S'], [9, 'U7'], [11, 'U9']]) {
  await page.evaluate(i => globalThis.BerlinLines.U3.enter(i, { dx: -13 }), i);
  await page.waitForFunction(() => { const s = globalThis.BerlinLines.U3.status(); return s.world && s.world.stations.length >= 2; }, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 1.57; p.pitch = -0.05; });
  await page.waitForTimeout(1500);
  await shot(`u3c_${i}_${label}`);
  const st = await page.evaluate(i => globalThis.BerlinLines.U3.status(), i);
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 1.57; p.input.moveY = 1; });
  await page.waitForTimeout(9000);
  const p = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; p.input.moveY = 0; return { x: p.position.x, line: p.__line, st: p.__lineStation, n: [...document.querySelectorAll('*')].map(e => e.childElementCount === 0 ? e.textContent : '').join(' ').match(/Übergang[^·]*· die lijn komt later/)?.[0] || null }; });
  const lx = p.x - (-1650 + i * 150);
  check(`trapgat ${label} dicht (${i})`, p.line === 'U3' && p.st === i && lx > -16.2, JSON.stringify({ lx: Math.round(lx * 10) / 10, hint: p.n }));
}
// 2. U2 Wittenbergplatz: overstapbord U1+U3, overstap naar het U1-perron, U3 op de DFI/HUD.
const xs = await page.evaluate(() => globalThis.BerlinLines.Transfers.status());
check('overstappunten U2/U8', xs.points.length === 4, xs.points.join(','));
await page.evaluate(() => globalThis.BerlinLines.U1.leave?.());
await page.waitForTimeout(1500);
await page.evaluate(() => { const g = globalThis.__berlinMetroGame, s = g.stations.find(x => x.id === 'wittenbergplatz'), p = g.player; p.position.set(2.7, 1.7, s.z - 22); p.yaw = Math.PI; p.pitch = 0.08; g.world?.update?.(s.z); });
await page.waitForTimeout(3000);
await shot('u3c_u2_wittenbergplatz_bord');
await page.evaluate(() => globalThis.BerlinLines.Transfers.toU2('wittenbergplatz'));
await page.waitForTimeout(2500);
await page.evaluate(() => globalThis.BerlinLines.Transfers.toU1(2));
await page.waitForTimeout(3000);
const a = await pos();
check('U2 → U1/U3-perron Wittenbergplatz', a.line === 'U1' && a.st === 2, JSON.stringify(a));
await page.waitForTimeout(8000);
const hud = await page.evaluate(() => document.body.innerText.match(/U3 [^\n]*/)?.[0] || '');
check('U3 op HUD Wittenbergplatz', /U3/.test(hud), hud.slice(0, 120));
// 3. Open overstap blijft werken: U1 Wittenbergplatz → U2.
await page.evaluate(() => globalThis.BerlinLines.Transfers.toU2('wittenbergplatz'));
await page.waitForTimeout(3000);
const b = await pos();
check('U1 → U2 terug', !b.line, JSON.stringify(b));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
