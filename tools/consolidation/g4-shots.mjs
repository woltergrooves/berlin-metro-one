// Mijlpaal 0 / G4 (omgeving buitenstations): per station meerdere blikken vanaf het perron, op een gekozen uur.
// Usage: node g4-shots.mjs <url> <outDir> <quality> <station,...> <yaw,yaw,...> [pitch] [uur] [x]
// yaw 1.57 = dwars naar links/rechts, 0 = langs het spoor. Meet ook draw calls en driehoeken.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', list = 'gleisdreieck', yawArg = '1.57,-1.57', pitchArg = '0.05', hourArg = '13', xArg = '2.2', dzArg = '6'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
const flags = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame || {}; const o = {}; for (const k of Object.keys(g)) { const v = g[k]; if (/version/i.test(k) && v != null && typeof v !== 'function') o[k] = String(v); } return o; });
let last = '', stable = 0; const t0 = Date.now();
while (Date.now() - t0 < 100000 && stable < 4) { await page.waitForTimeout(2000); const f = JSON.stringify(await flags()); stable = f === last ? stable + 1 : 0; last = f; }
await page.addStyleTag({ content: 'body > *:not(#app):not(canvas){visibility:hidden!important} #app > *:not(canvas){visibility:hidden!important}' }).catch(() => {});
const pitch = Number(pitchArg), yaws = yawArg.split(',').map(Number);
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hourArg);
for (const id of list.split(',')) {
  const ok = await page.evaluate(([id, x, dz]) => { const g = globalThis.__berlinMetroGame, p = g.player, st = g.stations.find(s => s.id === id); if (!st) return false;
    p.__u8Area = false; p.__u8FullStation = null; p.position.set(Number(x), p.position.y < -1 ? p.position.y + 4 : p.position.y, st.z + Number(dz)); p.yaw = 1.57; p.pitch = 0; return true; }, [id, xArg, dzArg]);
  if (!ok) { console.log('onbekend station', id); continue; }
  await page.waitForFunction(id => (globalThis.BerlinSurroundings?.status().loaded || []).includes(id), id, { timeout: 120000 }).catch(() => console.log('G4 niet geladen', id));
  await page.waitForTimeout(5000);
  for (const yaw of yaws) {
    await page.evaluate(([y, pt, h]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; globalThis.BerlinClock?.setHour?.(Number(h)); }, [yaw, pitch, hourArg]);
    await settle(1200);
    await page.screenshot({ path: `${outDir}/${id}_y${yaw}_h${hourArg}_dz${dzArg}.png`, timeout: 240000 });
    const info = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, i = g.renderer.info.render; return { calls: i.calls, tris: i.triangles, g4: globalThis.BerlinSurroundings?.status(), open: g.player.__openAirStation }; });
    console.log('shot', id, yaw, JSON.stringify(info));
  }
}
console.log('fouten', errors.length, errors.slice(0, 6));
await browser.close();
