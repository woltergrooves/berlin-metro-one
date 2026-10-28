// Mijlpaal 0 / G2 (rendering-basis): vóór/na-screenshots plus een dump van de rendering-toestand.
// Plekken: A = startperron U2 Alexanderplatz (twee kijkrichtingen), B = open-air perron U2 Gleisdreieck,
// C = U2 Stadtmitte (ondergronds). Dumpt per plek tone mapping, belichting, mist en kwaliteitsprofiel.
// Usage: node g2-shots.mjs <url> <outDir> [quality]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
if (quality) await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
// Wachten tot de systemen stil staan (versievlaggen veranderen niet meer).
const flags = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame || {}; const o = {}; for (const k of Object.keys(g)) { const v = g[k]; if (/version/i.test(k) && v != null && typeof v !== 'function') o[k] = String(v); } return o; });
let last = '', stable = 0; const t0 = Date.now();
while (Date.now() - t0 < 100000 && stable < 4) { await page.waitForTimeout(2000); const f = JSON.stringify(await flags()); stable = f === last ? stable + 1 : 0; last = f; }
// Overlays/HUD verbergen zodat de 3D-wereld zichtbaar is.
await page.addStyleTag({ content: 'body > *:not(#app):not(canvas){visibility:hidden!important} #app > *:not(canvas){visibility:hidden!important}' }).catch(() => {});
const dump = () => page.evaluate(() => {
  const g = globalThis.__berlinMetroGame, r = g.renderer, lights = [];
  g.scene.traverse(o => { if (o.isLight) lights.push(`${o.type}${o.name ? ':' + o.name : ''} ${o.visible ? '' : '(uit) '}${o.intensity.toFixed(2)}${o.castShadow ? ' schaduw' : ''}`); });
  return { toneMapping: r.toneMapping, exposure: r.toneMappingExposure, colorSpace: r.outputColorSpace, pixelRatio: r.getPixelRatio(), shadows: r.shadowMap.enabled,
    env: !!g.scene.environment, envIntensity: g.scene.environmentIntensity, fog: g.scene.fog && { near: g.scene.fog.near, far: g.scene.fog.far, color: g.scene.fog.color.getHexString() },
    lights, render: globalThis.BerlinRender?.status?.() || null, station: g.player.currentStation?.id };
});
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
async function shot(name) { await settle(1500); await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 240000 }); return { name, ...(await dump()) }; }
async function goTo(id, dz, yaw) {
  await page.evaluate(([id, dz, yaw]) => { const g = globalThis.__berlinMetroGame, st = g.stations.find(s => s.id === id); g.player.position.set(2.2, g.player.position.y, st.z + dz); g.player.yaw = yaw; g.player.pitch = 0; }, [id, dz, yaw]);
  await page.waitForFunction(id => globalThis.__berlinMetroGame.player.currentStation?.id === id, id, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(6000);
  // G3a: wacht tot de materiaalscan twee rondes verder is (nieuw geladen station omgezet).
  const sc = await page.evaluate(() => globalThis.BerlinMaterials?.status().scans ?? -1);
  if (sc >= 0) await page.waitForFunction(n => globalThis.BerlinMaterials.status().scans >= n + 2, sc, { timeout: 240000 }).catch(() => {});
}
const res = { shots: [] };
res.shots.push(await shot('A1-alexanderplatz'));
await page.evaluate(() => { globalThis.__berlinMetroGame.player.yaw = Math.PI; });
res.shots.push(await shot('A2-alexanderplatz-andersom'));
await goTo('gleisdreieck', 8, 0.6);
res.shots.push(await shot('B-gleisdreieck-openair'));
await goTo('stadtmitte', 8, -0.5);
res.shots.push(await shot('C-stadtmitte'));
res.errors = errors;
await fs.writeFile(`${outDir}/state.json`, JSON.stringify(res, null, 1));
for (const s of res.shots) console.log(s.name, s.station, '| tm', s.toneMapping, s.exposure, '| env', s.env, '| fog', JSON.stringify(s.fog), '| lichten', s.lights.length);
console.log('lichten (laatste plek):', res.shots.at(-1).lights.join(' · '));
console.log('fouten', errors.length, errors.slice(0, 5));
await browser.close();
