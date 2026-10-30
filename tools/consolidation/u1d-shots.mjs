// Mijlpaal 1 / U1d: U1-viaductstations met de OSM-omgeving (wacht tot het pakket staat). Zelfde argumenten als u1-shots.mjs.
// Usage: node u1-shots.mjs <url> <outDir> <quality> <index,...> [yaw,...] [uur] [dx] [pitch]
// yaw −1.57 = langs het perron richting Warschauer Straße, 1.57 = richting Uhlandstraße, 0/3.14 = dwars.
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', list = '0,5,9,12', yawArg = '-1.57,1.57,0', hourArg = '13', dxArg = '-10', pitchArg = '0.03'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); if (/U1/.test(m.text())) console.log('log', m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.U1?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
await page.addStyleTag({ content: 'body > *:not(#app):not(canvas){visibility:hidden!important} #app > *:not(canvas){visibility:hidden!important}' }).catch(() => {});
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hourArg);
for (const i of list.split(',').map(Number)) {
  await page.evaluate(([i, dx]) => globalThis.BerlinLines.U1.enter(i, { dx: Number(dx) }), [i, dxArg]);
  await page.waitForFunction(() => { const s = globalThis.BerlinLines.U1.status(); return s.world && s.world.stations.length >= 2 && s.world.segments >= 2; }, null, { timeout: 60000 }).catch(() => console.log('wereld niet compleet', i));
  await page.waitForFunction(i => { const u = globalThis.BerlinLines.U1, st = u.stations[i]; return !st.surroundings || u.surroundings()?.visible === st.id; }, i, { timeout: 120000 }).catch(() => console.log('omgeving niet zichtbaar', i));
  await page.waitForTimeout(3000);
  for (const yaw of yawArg.split(',').map(Number)) {
    await page.evaluate(([y, pt, h]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = Number(pt); globalThis.BerlinClock?.setHour?.(Number(h)); }, [yaw, pitchArg, hourArg]);
    await settle(1200);
    await page.screenshot({ path: `${outDir}/u1d_${i}_y${yaw}_h${hourArg}.png`, timeout: 240000 });
    const info = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, r = g.renderer.info.render, p = g.player;
      return { calls: r.calls, tris: r.triangles, env: globalThis.BerlinRender?.status?.().environment, u1: globalThis.BerlinLines.U1.status(), pos: [p.position.x, p.position.y, p.position.z].map(v => Math.round(v * 10) / 10) }; });
    console.log('shot', i, yaw, JSON.stringify(info));
  }
}
// Lopen: 3 s vooruit, positie moet op het perron blijven.
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = -1.57; p.input.moveY = 1; });
await page.waitForTimeout(3000);
console.log('walk', JSON.stringify(await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.input.moveY = 0; return { x: p.position.x, z: p.position.z, y: p.position.y, line: p.__line, st: p.__lineStation }; })));
await page.evaluate(() => globalThis.BerlinLines.U1.leave());
await page.waitForTimeout(3000);
console.log('leave', JSON.stringify(await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { z: p.position.z, line: p.__line, station: p.currentStation?.id }; })));
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
