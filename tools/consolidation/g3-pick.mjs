// Mijlpaal 0 / G3a: raycast-probe. Schiet stralen vanuit de speler (omhoog, opzij, vooruit) en toont welke materialen plafond, wand, vloer en zuilen hebben. (Afgeleid van g3-census:) Telt alle materialen in de scene per type, kleur, textuur en herkomst
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

const pick = () => page.evaluate(async () => {
  const THREE = await import('three');
  const g = globalThis.__berlinMetroGame, rc = new THREE.Raycaster(), out = [];
  const eye = new THREE.Vector3(g.player.position.x, g.player.position.y + 1.6, g.player.position.z);
  const dirs = { omhoog: [0,1,0], omlaag: [0,-1,0], links: [-1,0.05,0], rechts: [1,0.05,0], vooruit: [0,0.1,-1], achter: [0,0.1,1], zuil: [-0.3,0.2,-1], linksop: [-1,0.6,0] };
  for (const [k, d] of Object.entries(dirs)) {
    rc.set(eye, new THREE.Vector3(...d).normalize()); rc.far = 60; rc.camera = g.camera;
    const meshes = []; g.scene.traverseVisible(o => { if (o.isMesh) meshes.push(o); }); const hits = rc.intersectObjects(meshes, false).filter(h => h.object.visible && h.object.isMesh).slice(0, 3);
    out.push(k + ': ' + hits.map(h => { const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material; const path = []; for (let p = h.object; p && path.length < 4; p = p.parent) path.push(p.name || p.type); return `${h.distance.toFixed(1)}m ${m.type} #${m.color?.getHexString()} map:${m.map ? (m.map.image?.width + 'x' + m.map.image?.height) : '-'} r${m.roughness ?? '-'} m${m.metalness ?? '-'} geo:${h.object.geometry.type} [${path.join('<')}]`; }).join(' || '));
  }
  return { station: g.player.currentStation?.id, pos: g.player.position.toArray().map(v => +v.toFixed(1)), out };
});
async function goTo(id, dz) {
  await page.evaluate(([id, dz]) => { const g = globalThis.__berlinMetroGame, st = g.stations.find(s => s.id === id); g.player.position.set(2.2, g.player.position.y, st.z + dz); }, [id, dz]);
  await page.waitForFunction(id => globalThis.__berlinMetroGame.player.currentStation?.id === id, id, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(6000);
}
const res = [await pick()];
for (const id of ['gleisdreieck', 'stadtmitte', 'klosterstrasse']) { await goTo(id, 8); res.push(await pick()); }
for (const r of res) { console.log('== ' + r.station + ' ' + r.pos); for (const l of r.out) console.log('  ' + l); }
await browser.close();
