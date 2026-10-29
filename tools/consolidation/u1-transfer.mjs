// Mijlpaal 1 / U1c: overstappen U1 ⇄ U2 (Wittenbergplatz, Nollendorfplatz, Gleisdreieck) en U1 ⇄ U8 (Kottbusser Tor),
// door echt te lopen (joystick), plus de stand in de save ('berlin-state-v2' → location).
// Usage: node u1-transfer.mjs <url> <outDir> [kwaliteit] [uur]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', hour = '13'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const where = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player;
  return { line: p.__line || (Number.isInteger(p.__u8FullStation) ? 'U8' : 'U2'), u1: p.__lineStation, u8: p.__u8FullStation ?? null, u2: p.currentStation?.id,
    pos: [p.position.x, p.position.y, p.position.z].map(v => Math.round(v * 10) / 10), loc: JSON.parse(localStorage.getItem('berlin-state-v2') || '{}').location ?? null,
    xfer: globalThis.BerlinLines.Transfers.status(), calls: g.renderer.info.render.calls }; });
async function settle(ms) { const f0 = await page.evaluate(() => globalThis.__berlinMetroGame.renderer.info.render.frame); await page.waitForFunction(n => globalThis.__berlinMetroGame.renderer.info.render.frame > n, f0 + 4, { timeout: 120000 }); await page.waitForTimeout(ms); }
// Lopen met de joystick in richting `yaw` tot de lijn/het station wisselt (of tijd om is).
async function walk(yaw, ms, until) {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = 0; p.input.moveY = 1; p.input.moveX = 0; }, yaw);
  const t0 = Date.now(); let w;
  while (Date.now() - t0 < ms) { await page.waitForTimeout(500); w = await where(); if (process.env.TRACE) console.log('  .', w.line, w.pos.join(',')); if (until(w)) break; }
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(1500);
  return where();
}
async function shot(name, yaw, pitch = 0.02) {
  await page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
  await settle(1500);
  await page.screenshot({ path: `${outDir}/${name}.png`, timeout: 240000 });
}
const results = [];
const check = (name, ok, w) => { results.push([name, ok]); console.log(ok ? 'OK  ' : 'FOUT', name, JSON.stringify(w)); };

const ONLY = (process.env.ONLY || '2,3,5,9').split(',').map(Number);
for (const [u1, kind, target] of [[2, 'U2', 'wittenbergplatz'], [3, 'U2', 'nollendorfplatz'], [5, 'U2', 'gleisdreieck'], [9, 'U8', 18]].filter(r => ONLY.includes(r[0]))) {
  // 1. Op het U1-perron, een eind van het overstaptrapgat; daarheen lopen (richting Uhlandstraße = yaw +1,57).
  await page.evaluate(i => globalThis.BerlinLines.U1.enter(i, { at: 'transfer' }), u1);
  await page.waitForTimeout(3000);
  await shot(`u1_${u1}_trapgat`, 1.57, -0.12);
  let w = await walk(1.57, 90000, w => w.line !== 'U1');
  const there = kind === 'U2' ? w.line === 'U2' && w.u2 === target : w.line === 'U8' && w.u8 === target;
  check(`U1 #${u1} → ${kind} ${target}`, there, w);
  await page.waitForTimeout(2000);
  // 2. Bord aan het perroneinde bekijken (achter je).
  await shot(`${kind}_${target}_bord`, kind === 'U2' ? 0 : 1.57, 0.08);
  // 3. Terug: naar het perroneinde lopen (U2: −z = yaw 0; U8: west = yaw +1,57).
  w = await walk(kind === 'U2' ? 0 : 1.57, 90000, w => w.line === 'U1');
  check(`${kind} ${target} → U1 #${u1}`, w.line === 'U1' && w.u1 === u1 && w.loc?.station, w);
}
// Save-stand: na herladen weer op de U1 (zelfde slot)?
const before = await where();
console.log('loc voor herladen', JSON.stringify(before.loc));
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('samenvatting', results.filter(r => r[1]).length + '/' + results.length);
console.log('done');
await browser.close();
