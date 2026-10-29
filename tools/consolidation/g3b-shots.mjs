// Mijlpaal 0 / G3b (stationsprofielen): screenshots van een lijst stations, één schuine blik per station
// (wand + zuilen + plafond + naambord in beeld). U2: id; U8: "u8:<slug>".
// Usage: node g3b-shots.mjs <url> <outDir> <quality> <station,station,...> [yaw] [pitch]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', list = 'alexanderplatz', yawArg = '0.55', pitchArg = '0.12'] = process.argv.slice(2);
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
const yaw = Number(yawArg), pitch = Number(pitchArg);
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
for (const raw of list.split(',')) {
  const u8 = raw.startsWith('u8:'), id = u8 ? raw.slice(3) : raw;
  const ok = await page.evaluate(([u8, id, yaw, pitch]) => {
    const g = globalThis.__berlinMetroGame, p = g.player, alex = g.stations.find(s => s.id === 'alexanderplatz');
    if (u8) {
      const prof = globalThis.BerlinStationProfiles?.get?.('U8', id);
      const idx = prof?.index ?? -1; if (idx < 0) return false;
      const cx = 61 + (idx - 14) * 84;
      p.__u8Active = false; p.__u8ActiveTrainId = null; p.__u8FullStation = idx; p.__u8Area = true;
      p.position.set(cx + 14, p.position.y > -1 ? p.position.y - 4 : p.position.y, alex.z + 49 + 0.5);
    } else {
      const st = g.stations.find(s => s.id === id); if (!st) return false;
      p.__u8Area = false; p.__u8FullStation = null;
      p.position.set(2.2, p.position.y < -1 ? p.position.y + 4 : p.position.y, st.z + 14);
    }
    p.yaw = yaw; p.pitch = pitch; return true;
  }, [u8, id, yaw, pitch]);
  if (!ok) { console.log('onbekend station', raw); continue; }
  await page.waitForTimeout(7000);
  const sc = await page.evaluate(() => globalThis.BerlinMaterials?.status().scans ?? -1);
  if (sc >= 0) await page.waitForFunction(n => globalThis.BerlinMaterials.status().scans >= n + 2, sc, { timeout: 240000 }).catch(() => {});
  await settle(1500);
  await page.screenshot({ path: `${outDir}/${raw.replace(':', '-')}.png`, timeout: 240000 });
  const info = await page.evaluate(() => ({ st: globalThis.__berlinMetroGame.player.currentStation?.id, prof: globalThis.BerlinStationProfiles?.status?.() }));
  console.log('shot', raw, JSON.stringify(info));
}
console.log('fouten', errors.length, errors.slice(0, 6));
await browser.close();
