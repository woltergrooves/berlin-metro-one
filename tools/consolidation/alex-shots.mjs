// Alexanderplatz: blikken langs de route U2-perron → trap → hal → gang → trap omlaag → U8-perron → uitgang.
// Usage: node alex-shots.mjs <url> <outDir> [kwaliteit] [uur] [views]
// views = komma-lijst van namen uit VIEWS (standaard alle). yaw π = +z (richting uitgang), −π/2 = +x (richting U8).
// Daarna een loopproef: U2-perron → trap op → hal → gang → trap af → U8, en hal → uitgang (Street View moet openen).
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', hourArg = '13', only = ''] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const PI = Math.PI;
// [naam, x, vloer, rz, yaw, pitch]
const VIEWS = [
  ['perron', 2.6, 0, 14, PI, 0.08],
  ['trapvoet', 2.6, 0, 24, PI, 0.18],
  ['trap', 2.6, 2.4, 34, PI, 0.12],
  ['trapkop', 2.6, 4.2, 47, 0, -0.25],
  ['hal', 2.6, 4.2, 46, PI, 0.02],
  ['hal-u8', 1.0, 4.2, 49, -PI / 2, 0.02],
  ['gang', 10, 4.2, 49, -PI / 2, 0.02],
  ['gang-terug', 22, 4.2, 49, PI / 2, 0.02],
  ['trap-af', 25, 4.2, 49, -PI / 2, -0.12],
  ['u8-trap', 47, -4, 49, PI / 2, 0.1],
  ['uitgang', 2.6, 4.2, 55, PI, 0.05],
  ['uitgang-dicht', 2.6, 4.2, 61.5, PI, 0.15],
];
const views = only ? VIEWS.filter(v => only.split(',').includes(v[0])) : VIEWS;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); if (/Alex|AlexanderHub/.test(m.text())) console.log('log', m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.Transfers && globalThis.__berlinMetroGame?.streetModeVersion, null, { timeout: 240000 });
await page.waitForTimeout(15000);
await page.evaluate(() => globalThis.BerlinLines.Transfers.toU2('alexanderplatz'));
await page.waitForTimeout(6000);
await page.addStyleTag({ content: 'body > *:not(#app):not(canvas){visibility:hidden!important} #app > *:not(canvas){visibility:hidden!important}' }).catch(() => {});
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
const place = (v) => page.evaluate(([n, x, fl, rz, yaw, pitch, h]) => {
  const g = globalThis.__berlinMetroGame, p = g.player, st = g.stations.find(s => s.id === 'alexanderplatz');
  p.currentStation = st; p.activeTrain = null; p.__u8Active = false;
  p.__u8Area = x > 5.8; p.__u8FullStation = x > 40 ? 14 : null;
  p.position.set(x, 1.7 + fl, st.z + rz); p.yaw = yaw; p.pitch = pitch;
  globalThis.BerlinClock?.setHour?.(Number(h));
}, [...v, hourArg]);
for (const v of views) {
  await place(v);
  await settle(1500);
  await place(v);
  await settle(500);
  await page.screenshot({ path: `${outDir}/alex_${v[0]}_h${hourArg}.png`, timeout: 240000 });
  const info = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, r = g.renderer.info.render, p = g.player;
    return { calls: r.calls, tris: r.triangles, pos: [p.position.x, p.position.y, p.position.z - p.currentStation.z].map(v => Math.round(v * 10) / 10), hub: globalThis.BerlinAlexHub?.status?.() }; });
  console.log('shot', v[0], JSON.stringify(info));
}
if (!only) {
  // Loopproef. Elke etappe: kijkrichting zetten, vooruit lopen tot doel of time-out.
  const walk = async (label, yaw, test, ms) => {
    await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = 0; p.input.moveY = 1; }, yaw);
    const ok = await page.waitForFunction(t => { const g = globalThis.__berlinMetroGame, p = g.player, rz = p.position.z - (p.currentStation?.z ?? 0); return new Function('p', 'rz', 'return ' + t)(p, rz); }, test, { timeout: ms, polling: 200 }).then(() => true).catch(() => false);
    const s = await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.input.moveY = 0; return { x: +p.position.x.toFixed(2), y: +p.position.y.toFixed(2), rz: +(p.position.z - (p.currentStation?.z ?? 0)).toFixed(2), st: p.currentStation?.id, street: !!p.__streetMode }; });
    console.log('walk', label, ok ? 'OK' : 'FAIL', JSON.stringify(s));
  };
  await place(['start', 2.6, 0, 16, PI, 0]);
  await settle(300);
  await walk('trap-op', PI, 'rz > 45 && p.position.y > 5.7', 90000);
  await walk('naar-gang', -PI / 2, 'p.position.x > 12', 90000);
  await walk('trap-af', -PI / 2, 'p.position.x > 44 && p.position.y < -2', 120000);
  await walk('terug-boven', PI / 2, 'p.position.x < 10 && p.position.y > 5.7', 150000);
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.position.x = 2.6; });
  await walk('naar-uitgang', PI, 'p.__streetMode || !!document.querySelector("[data-street-overlay],.street-overlay,#streetOverlay")', 90000);
}
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
