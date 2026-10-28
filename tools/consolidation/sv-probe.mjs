// G1: Street View-teller in het GOD-menu. Usage: node sv-probe.mjs <url> <shot.png>
import { chromium, devices } from 'playwright';
const [url, shot] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => document.querySelector('#svCounterGod') && window.BerlinStreetView2, null, { timeout: 200000 });
const a = await page.evaluate(() => document.querySelector('#svCounterGod').innerText);
// Street View openen via de overlay (zoals een stationsuitgang doet) en weer sluiten.
const r = await page.evaluate(async () => { const g = globalThis.__berlinMetroGame, ov = g.__allStreetOverlay; g.player.__streetMode = true;
  try { ov.open({ station: g.player.currentStation, line: 'U2', name: g.player.currentStation?.name }); } catch (e) { return 'open-fout ' + e.message; }
  await new Promise(r => setTimeout(r, 15000)); const s = { ...window.BerlinStreetView2.state }; return s; });
await page.evaluate(() => { document.querySelector('#gp3')?.classList.add('on'); });
await page.waitForTimeout(2500);
const b = await page.evaluate(() => document.querySelector('#svCounterGod').innerText);
await page.screenshot({ path: shot });
console.log('vooraf:', a.replace(/\n/g, ' | ')); console.log('state:', JSON.stringify(r)); console.log('na open:', b.replace(/\n/g, ' | '));
await browser.close();
