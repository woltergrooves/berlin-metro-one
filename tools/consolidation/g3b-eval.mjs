// Mijlpaal 0 / G3a: eval-probe: start de game, gaat naar een station en voert een stukje JS uit (bestand als 3e argument). Was: raycast-probe. Schiet stralen vanuit de speler (omhoog, opzij, vooruit) en toont welke materialen plafond, wand, vloer en zuilen hebben. (Afgeleid van g3-census:) Telt alle materialen in de scene per type, kleur, textuur en herkomst
// (eerste benoemde voorouder), zodat duidelijk is welke materialen omgezet worden en welke rol ze krijgen.
// Usage: node g3-census.mjs <url> <out.json> [quality]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, station, snippet, quality] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality || 'laag');
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
const flags = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame || {}; const o = {}; for (const k of Object.keys(g)) { const v = g[k]; if (/version/i.test(k) && v != null && typeof v !== 'function') o[k] = String(v); } return o; });
let last = '', stable = 0; const t0 = Date.now();
while (Date.now() - t0 < 100000 && stable < 4) { await page.waitForTimeout(2000); const f = JSON.stringify(await flags()); stable = f === last ? stable + 1 : 0; last = f; }
await page.waitForTimeout(8000);


if (station && station.startsWith("u8:")) { await page.evaluate(id => { const g = globalThis.__berlinMetroGame, p = g.player, alex = g.stations.find(s => s.id === "alexanderplatz"); const idx = globalThis.BerlinStationProfiles.get("U8", id).index; p.__u8Active=false;p.__u8FullStation=idx;p.__u8Area=true;p.position.set(61+(idx-14)*84+14, p.position.y-4, alex.z+49.5); }, station.slice(3)); await page.waitForTimeout(12000); } else if (station && station !== "-") {
  await page.evaluate(id => { const g = globalThis.__berlinMetroGame, st = g.stations.find(s => s.id === id); g.player.position.set(2.2, g.player.position.y, st.z + 8); }, station);
  await page.waitForFunction(id => globalThis.__berlinMetroGame.player.currentStation?.id === id, station, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(6000);
}
const code = await fs.readFile(snippet, 'utf8');
console.log(await page.evaluate(`(async () => { const THREE = await import('three'); const g = globalThis.__berlinMetroGame; ${code} })()`));
console.log('fouten (pageerror)', errors.length, errors.slice(0, 3));
await browser.close();
