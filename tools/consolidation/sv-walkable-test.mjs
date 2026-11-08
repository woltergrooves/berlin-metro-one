// Street View loopbaar (fix 8 nov 2026): naar buiten bij een paar stations + 'Ander standpunt' → elk panorama moet een
// Google-straatpanorama mét looprichtingen zijn. Alleen zinvol op de hoofdlink (Maps API weigert localhost).
// Usage: node sv-walkable-test.mjs <url> <outDir>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ ...devices['iPad Pro 11 landscape'] })).newPage();
let pass = 0, fail = 0;
const check = (n, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', n, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.S5?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(8000);
const shot = async n => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${n}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const sv = () => page.evaluate(() => { const S = globalThis.BerlinStreetView2, p = S?.getPanorama?.(); return { mode: S?.state?.mode, pano: p?.getPano?.() || null, links: (p?.getLinks?.() || []).length, w: S?.walkable?.() }; });
for (const [line, i] of [['S5', 8], ['S5', 6], ['S5', 3], ['U9', 2], ['U1', 4]]) {
  await page.evaluate(([l, i]) => globalThis.BerlinLines[l].exit(i), [line, i]);
  await page.waitForTimeout(12000);
  let s = await sv(); const seen = new Set([s.pano]);
  check(`${line}#${i} naar buiten`, s.mode === 'programmable' && s.links > 0, JSON.stringify(s));
  await shot(`${line}_${i}_0`);
  for (let k = 1; k <= 2; k++) {
    await page.evaluate(() => document.querySelector('#bls .move')?.click());
    await page.waitForTimeout(6000);
    s = await sv();
    check(`${line}#${i} ander standpunt ${k}`, s.links > 0 && !seen.has(s.pano), JSON.stringify(s)); seen.add(s.pano);
  }
  await page.evaluate(() => document.querySelector('#bls .back')?.click());
  await page.waitForTimeout(4000);
}
console.log('resultaat', pass, '/', pass + fail);
console.log('done');
await browser.close();
