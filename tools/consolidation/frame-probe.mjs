// Fase 1 stap 7 (deel 3): één frame-update, oud vs. nieuw.
// Start een nieuwe save, wacht tot alle systemen geïnstalleerd zijn en vergelijkt daarna:
// game-vlaggen, zichtbare scene-objecten, frames en spelklok over 20 s, fouten en (nieuw) de frame-hooks.
// Usage: node frame-probe.mjs <url> <out.json>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out] = process.argv.slice(2);
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
// Wachten tot de set vlaggen 10 s niet meer verandert (max 100 s).
let last = '', stable = 0; const t0 = Date.now();
while (Date.now() - t0 < 100000 && stable < 5) { await page.waitForTimeout(2000); const f = JSON.stringify(await flags()); stable = f === last ? stable + 1 : 0; last = f; }
const snap = () => page.evaluate(() => {
  const g = globalThis.__berlinMetroGame, vis = [];
  g.scene.traverse(o => { if (o.name && /[:A-Z]/.test(o.name) && o.visible && o.parent?.visible !== false && o.parent === g.scene) vis.push(o.name); });
  return { frame: g.renderer.info.render.frame, clock: globalThis.BerlinState?.clock?.now?.() ?? g.phase12State?.minutes ?? null, visible: [...new Set(vis)].sort(),
    hooks: globalThis.BerlinTick?.frames?.() ?? null, tick: globalThis.BerlinTick?.stats ?? null, station: g.player?.currentStation?.id ?? null };
});
const a = await snap(); await page.waitForTimeout(20000); const b = await snap();
const res = { waitedMs: Date.now() - t0, flags: JSON.parse(last), frames20s: b.frame - a.frame, clockA: a.clock, clockB: b.clock, station: b.station,
  visible: b.visible, hooks: b.hooks, tick: b.tick, errors };
await fs.writeFile(out, JSON.stringify(res, null, 1));
console.log(out, '| frames/20s', res.frames20s, '| vlaggen', Object.keys(res.flags).length, '| zichtbaar', res.visible.length, '| hooks', b.hooks?.length ?? '-', 'fouten-in-hooks', b.hooks?.reduce((s, h) => s + h.errors, 0) ?? '-', '| fouten', errors.length);
await browser.close();
