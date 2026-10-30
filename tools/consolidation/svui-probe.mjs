// Street View-overlay inventaris: opent Street View bij een U2-station en dumpt alle zichtbare elementen.
// Usage: node svui-probe.mjs <url> <outprefix> [stationId]
import { chromium, devices } from 'playwright';
const [url, out, sid = 'wittenbergplatz'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.__berlinMetroGame?.__allStreetOverlay && window.BerlinStreetView2, null, { timeout: 300000 });
await page.waitForTimeout(8000);
await page.evaluate(async (sid) => { const g = globalThis.__berlinMetroGame, st = g.stations.find(s => s.id === sid);
  await g.__allStreetOverlay.open({ line: 'U2', name: st.name, returnKind: 'u2', stationId: st.id }); }, sid);
await page.waitForTimeout(12000);
const dump = await page.evaluate(() => {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05; };
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue; const z = +getComputedStyle(el).zIndex || 0;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (el.tagName === 'BUTTON' || el.tagName === 'IFRAME' || own) { const r = el.getBoundingClientRect();
      rows.push(`${el.tagName}#${el.id || ''}.${(el.className || '').toString().slice(0, 30)} z${z} [${r.x | 0},${r.y | 0} ${r.width | 0}x${r.height | 0}] ${(own || el.textContent || el.src || '').replace(/\s+/g, ' ').slice(0, 90)}`); }
  }
  return rows;
});
console.log(dump.join('\n')); console.log('ERR', errs.slice(0, 5));
await page.screenshot({ path: out + '.png' });
await browser.close(); console.log('done');
