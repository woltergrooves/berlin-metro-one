// Mijlpaal 0 / G3a: materiaal-telling. Telt alle materialen in de scene per type, kleur, textuur en herkomst
// (eerste benoemde voorouder), zodat duidelijk is welke materialen omgezet worden en welke rol ze krijgen.
// Usage: node g3-census.mjs <url> <out.json> [quality]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out, quality] = process.argv.slice(2);
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
const census = await page.evaluate(() => {
  const g = globalThis.__berlinMetroGame, seen = new Map(), byType = {};
  const owner = o => { const path = []; for (let p = o; p && path.length < 4; p = p.parent) if (p.name) path.push(p.name); return path.join(' < ') || '(naamloos)'; };
  g.scene.traverse(o => {
    if (!o.material) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      let e = seen.get(m);
      if (!e) { e = { type: m.type, color: m.color?.getHexString?.(), map: !!m.map, mapName: m.map?.name || m.map?.image?.src?.split('/').pop()?.slice(0, 40) || (m.map?.image ? 'canvas' : ''), transparent: m.transparent, opacity: m.opacity, emissive: m.emissive?.getHexString?.(), name: m.name, owners: new Set(), meshes: 0, ud: Object.keys(m.userData || {}).join(',') }; seen.set(m, e); }
      e.meshes++; if (e.owners.size < 3) e.owners.add(owner(o));
      byType[m.type] = (byType[m.type] || 0) + 1;
    }
  });
  const list = [...seen.values()].map(e => ({ ...e, owners: [...e.owners] }));
  const matsByType = {}; for (const e of list) matsByType[e.type] = (matsByType[e.type] || 0) + 1;
  // Groepeer niet-Basic materialen op type+kleur+map om de grootste families te zien.
  const fam = {};
  for (const e of list) { const k = `${e.type}|${e.color}|${e.map ? 'map:' + e.mapName : ''}|${e.transparent ? 't' + e.opacity.toFixed(2) : ''}`; const f = fam[k] ||= { k, mats: 0, meshes: 0, owners: new Set() }; f.mats++; f.meshes += e.meshes; for (const ow of e.owners) if (f.owners.size < 4) f.owners.add(ow); }
  const fams = Object.values(fam).map(f => ({ ...f, owners: [...f.owners] })).sort((a, b) => b.meshes - a.meshes);
  return { meshMatsByType: byType, uniqueMatsByType: matsByType, uniqueMats: list.length, families: fams.slice(0, 160) };
});
await fs.writeFile(out, JSON.stringify({ census, errors }, null, 1));
console.log(JSON.stringify({ byType: census.meshMatsByType, unique: census.uniqueMatsByType, n: census.uniqueMats, errors: errors.length }));
await browser.close();
