// U1-stap / U8-zichtlijn: teleporteer naar U8-stations (zoals GOD → U8) en kijk langs de tunnel.
// Usage: node u8-sight.mjs <url> <outDir> <quality> <index,...> [yaw,...] [dx] [uur]
// Index = U8_STOPS-index (14 = Alexanderplatz). yaw ±1.57 = langs de U8 (lijn ligt op de x-as).
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', list = '13,15,18', yawArg = '1.57,-1.57', dxArg = '0', hourArg = '13'] = process.argv.slice(2);
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
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
await page.evaluate(async () => { const T = await import('three'); globalThis.BerlinRaycaster = T.Raycaster; });
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hourArg);
for (const idx of list.split(',').map(Number)) {
  // Zelfde als GOD → U8 (InspectorGodV3 tp8), plus een optionele verschuiving langs het perron.
  await page.evaluate(([i, dx, dz]) => { const g = globalThis.__berlinMetroGame, p = g.player, a = g.stations.find(s => s.id === 'alexanderplatz');
    p.activeTrain = null; p.__u8Active = false; p.__u8LastTrainX = null; p.__u8ActiveTrainId = null; p.__streetMode = false;
    p.position.set(61 + (i - 14) * 84 + Number(dx), p.position.y < 0 ? p.position.y : 1.7 - 4, a.z + 49); p.position.y = 1.7 - 4;
    p.__u8FullStation = i; p.__u8Area = true; p.yaw = 1.57; p.pitch = 0; p.position.z += Number(dz); }, [idx, dxArg, process.env.DZ || 0]);
  await page.waitForTimeout(9000);
  for (const yaw of yawArg.split(',').map(Number)) {
    await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = 0.02; }, yaw);
    await settle(1500);
    await page.screenshot({ path: `${outDir}/u8_${idx}_y${yaw}.png`, timeout: 240000 });
    const info = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, i = g.renderer.info.render, p = g.player, a0z = g.stations.find(s => s.id === 'alexanderplatz').z;
      // Welke U8-stationsmodellen/groepen zijn zichtbaar (hele keten), en hoe ver weg?
      const vis = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
      const seen = [];
      // Alle zichtbare meshes verder dan 45 m langs de U8 (binnen ±30 m dwars), gegroepeerd per herkomst.
      const by = new Map(), V = p.position.constructor;
      g.scene.traverse(o => { if (!o.isMesh || !vis(o) || !o.geometry) return; if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld), dx = Math.abs(c.x - p.position.x), dz = Math.abs(c.z - (a0z + 49));
        if (dx < 45 || dx > 220 || dz > 30) return;
        const chain = []; for (let n = o; n && n !== g.scene; n = n.parent) if (n.name) chain.push(n.name.slice(0, 28));
        const key = chain.slice(-2).reverse().join(' > ') + ' | ' + (o.name || '').slice(0, 20) + '/' + (o.material?.name || '').slice(0, 14);
        const e = by.get(key) || { n: 0, d: 999 }; e.n++; e.d = Math.min(e.d, Math.round(dx)); by.set(key, e); });
      for (const [k, e] of [...by].sort((a, b) => a[1].d - b[1].d).slice(0, 40)) seen.push(`${k} ×${e.n} @${e.d}`);
      // Stralen langs het spoor (perronhoogte en sporen): eerste zichtbare treffer.
      const T = g.camera.constructor ? null : null; const THREE = globalThis.__THREE__;
      const rays = [];
      try {
        const Ray = g.scene.constructor; // dummy
        const rc = new (globalThis.BerlinRaycaster)(); rc.camera = g.camera;
        for (const dir of [-1, 1]) for (const dz of [0, -9.1, 9.1]) {
          rc.set(new p.position.constructor(p.position.x, p.position.y - 0.6, a0z + 49 + dz), new p.position.constructor(dir, 0, 0)); rc.far = 200;
          const hit = rc.intersectObjects(g.scene.children, true).find(h => vis(h.object) && h.object.material && h.object.material.visible !== false);
          rays.push(`${dir > 0 ? '+' : '-'}x dz${dz}: ${hit ? (hit.object.name || hit.object.parent?.name || '?').slice(0, 34) + '/' + (hit.object.material.name || '').slice(0, 16) + '@' + hit.distance.toFixed(0) : 'niets'}`);
        }
      } catch (e) { rays.push('fout ' + e.message); }
      const line = [...g.world.chunks.values()].find(c => c.structure.userData?.u8FullLine)?.structure.userData.u8FullLine;
      const gv = (line?.groups || []).map((x, k) => x?.visible ? k : null).filter(k => k != null).join(',');
      const sv = (line?.segments || []).map((x, k) => x?.visible ? k : null).filter(k => k != null).join(',');
      return { seen, rays, groupsVisible: gv, segsVisible: sv, bg: g.scene.background?.getHexString?.(), fog: [g.scene.fog?.near, g.scene.fog?.far], calls: i.calls, tris: i.triangles, x: Math.round(p.position.x), z: Math.round(p.position.z - g.stations.find(s => s.id === "alexanderplatz").z), y: p.position.y.toFixed(1), st: p.__u8FullStation, far: [...new Set(seen)].slice(0, 12) }; });
    console.log('shot', idx, yaw, JSON.stringify(info));
  }
}
console.log('fouten', errors.length, errors.slice(0, 6));
console.log('done');
await browser.close();
