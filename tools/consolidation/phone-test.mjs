// Telefoon als smartphone (PhoneSkin, 8 nov 2026): openen → beginscherm, apps openen, terug, sluiten. Screenshots.
// Usage: node phone-test.mjs <url> <outDir> [toestel]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, dev = 'iPad Pro 11 landscape'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ ...devices[dev] })).newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
let pass = 0, fail = 0; const check = (n, ok, i = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', n, i); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinPhoneSkin, null, { timeout: 200000 });
await page.waitForTimeout(6000);
const tag = dev.replace(/\W+/g, '_');
const shot = n => page.screenshot({ path: `${outDir}/${tag}_${n}.png` });
await page.evaluate(() => document.querySelector('#phoneBtnV2').click()); await page.waitForTimeout(1200); await shot('0_beginscherm');
let s = await page.evaluate(() => BerlinPhoneSkin.status()); check('open op beginscherm', s.open && !s.inApp, JSON.stringify(s));
for (const app of ['jobs', 'map', 'contacts', 'home', 'places', 'city']) {
  const has = await page.evaluate(a => !!document.querySelector(`#phoneModalV2 .bl-grid .bl-ic[data-app="${a}"], #phoneModalV2 .bl-dock .bl-ic[data-app="${a}"]`), app);
  if (!has) { console.log('(geen app', app, ')'); continue; }
  await page.evaluate(a => document.querySelector(`#phoneModalV2 .bl-ic[data-app="${a}"]`).click(), app); await page.waitForTimeout(900);
  const r = await page.evaluate(() => { const b = document.querySelector('#phoneBodyV2'), c = document.querySelector('#phoneCityV3'); const vis = c && c.style.display === 'block' ? c : b; return { inApp: BerlinPhoneSkin.status().inApp, len: (vis.textContent || '').trim().length }; });
  check(`app ${app}`, r.inApp && r.len > 10, JSON.stringify(r)); await shot('app_' + app);
  await page.evaluate(() => document.querySelector('#phoneModalV2 .bl-back').click()); await page.waitForTimeout(500);
  s = await page.evaluate(() => BerlinPhoneSkin.status()); check(`terug van ${app}`, s.open && !s.inApp);
}
await page.evaluate(() => document.querySelector('#phoneModalV2 .bl-homehit').click()); await page.waitForTimeout(500);
s = await page.evaluate(() => BerlinPhoneSkin.status()); check('home-balk sluit', !s.open);
console.log('resultaat', pass, '/', pass + fail); console.log('fouten', errors.length, errors.slice(0, 5)); console.log('done');
await browser.close();
