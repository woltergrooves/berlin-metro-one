// Mijlpaal 0 / G1 (prestaties): kosten per frame-hook meten, oud vs. nieuw.
// Start een nieuwe save, wacht tot de systemen stil staan en meet daarna over een venster:
// gemiddelde ms per frame voor elke hook (verschil van twee BerlinTick.frames()-snapshots), frames, fouten.
// Fase A: speler op het startstation (U2). Fase B: speler in de U8-hal (Alexanderplatz), als dat lukt.
// Usage: node g1-probe.mjs <url> <out.json> [vensterMs=20000]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out, win = '20000'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
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
while (Date.now() - t0 < 100000 && stable < 5) { await page.waitForTimeout(2000); const f = JSON.stringify(await flags()); stable = f === last ? stable + 1 : 0; last = f; }
const snap = () => page.evaluate(() => ({ t: performance.now(), frame: globalThis.__berlinMetroGame.renderer.info.render.frame,
  hooks: globalThis.BerlinTick.frames().map(h => ({ name: h.name, runs: h.runs, busy: h.avgMs * h.runs, errors: h.errors })),
  scene: (() => { let n = 0; globalThis.__berlinMetroGame.scene.traverse(() => n++); return n; })() }));
async function measure(label) {
  const a = await snap(); await page.waitForTimeout(+win); const b = await snap();
  const prev = new Map(a.hooks.map(h => [h.name, h]));
  const hooks = b.hooks.map(h => { const p = prev.get(h.name) || { runs: 0, busy: 0, errors: 0 }; const runs = h.runs - p.runs;
    return { name: h.name, runs, avgMs: runs ? +((h.busy - p.busy) / runs).toFixed(3) : 0, newErrors: h.errors - p.errors }; })
    .sort((x, y) => y.avgMs - x.avgMs);
  const total = +hooks.reduce((s, h) => s + h.avgMs, 0).toFixed(3);
  return { label, frames: b.frame - a.frame, fps: +((b.frame - a.frame) / ((b.t - a.t) / 1000)).toFixed(2), sceneObjects: b.scene, hookMsPerFrame: total, top: hooks.slice(0, 12), hookErrors: hooks.filter(h => h.newErrors) };
}
const res = { waitedMs: Date.now() - t0, phases: [] };
res.phases.push(await measure('A: start (U2)'));
// Fase B: naar de U8-hal bij Alexanderplatz via de God Mode/teleport-functie als die er is.
const moved = await page.evaluate(() => {
  const g = globalThis.__berlinMetroGame, alex = g?.stations?.find(s => s.id === 'alexanderplatz');
  const tp = globalThis.BerlinGod?.teleport || g?.teleportToStation || g?.godMode?.teleport;
  try { if (tp && alex) { tp.call(g.godMode || g, alex.id); } else if (alex) { g.player.currentStation = alex; g.player.position?.set?.(2.7, 1.7, alex.z); } } catch (e) { return 'fout: ' + e.message; }
  try { g.player.__u8Area = true; } catch {}
  return g.player.currentStation?.id || null;
});
await page.waitForTimeout(3000);
res.phases.push({ moved, ...(await measure('B: U8-hal Alexanderplatz')) });
// Controle: zijn alle decoraties er nog (aantal objecten per naam/prefix) en wat is er zichtbaar?
res.census = await page.evaluate(() => {
  const g = globalThis.__berlinMetroGame, c = {}, pre = ['P910Map', 'P910U2Map', 'P9U8Crowd', 'P10U8', 'GfxV3Small', 'GfxV3U2', 'Phase125TextureV2', 'Phase125AlexTextureV2', 'Phase125U2TextureV2', 'EconU8:', 'U8Return:', 'PfandReturn:', 'Phase125Shell', 'Phase125U2', 'U8:'];
  let meshes = 0, basicNoTone = 0;
  g.scene.traverse(o => { if (o.isMesh) { meshes++; const m = o.material; if (m?.isMeshBasicMaterial && m.toneMapped === false) basicNoTone++; }
    for (const p of pre) if (o.name && o.name.startsWith(p)) { const k = p + (o.visible ? '' : '(verborgen)'); c[k] = (c[k] || 0) + 1; } });
  return { counts: c, meshes, basicNoTone, chip: document.querySelector('#econV2')?.textContent, clock: document.querySelector('#phase12clock')?.textContent };
});
res.errors = errors;
await fs.writeFile(out, JSON.stringify(res, null, 1));
for (const p of res.phases) console.log(p.label, '| fps', p.fps, '| hooks ms/frame', p.hookMsPerFrame, '| top:', p.top.slice(0, 6).map(h => `${h.name} ${h.avgMs}`).join(', '));
console.log('fouten', errors.length);
await browser.close();
