// S-Bahn Stadtbahn deel a: Westkreuz ⇄ Ostkreuz (14 stations op het boogviaduct). Alle stations via de runtime,
// GOD-menu (lijnchip S5 + teleport), afgesloten overstaptrapgaten (Zoo, Alexanderplatz), uitgang lopend → Street View
// en terug, straatblik op de viaductbogen.
// Usage: node s5-test.mjs <url> <outDir> [quality] [uur]   (env SKIP=1: stations overslaan)
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
let pass = 0, fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinLines?.S5?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; return { x: Math.round(p.position.x * 10) / 10, z: Math.round(p.position.z), line: p.__line, st: p.__lineStation, street: !!p.__streetMode }; });
const stand = (yaw, pitch = 0) => page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
const walkUntil = async (cond, yaw = 1.57, ms = 90000) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);
const SKIP = !!process.env.SKIP, L = 'S5';

const n = await page.evaluate(() => globalThis.BerlinLines.S5.stations.length);
check('14 stations', n === 14, String(n));
// 1. Alle stations (met wereldbouw: station + tussenstukken).
for (let i = 0; i < (SKIP ? 0 : 14); i++) {
  await page.evaluate(i => globalThis.BerlinLines.S5.enter(i), i);
  await page.waitForTimeout(3500);
  await stand(-1.57, -0.02); await page.waitForTimeout(1200);
  if ([0, 1, 3, 6, 7, 8, 9, 10, 12, 13].includes(i)) await shot(`s5_${i}`);
  if ([3, 8].includes(i)) { await stand(0.4, 0.15); await page.waitForTimeout(1000); await shot(`s5_${i}_hal`); }
  const p = await pos(), w = await page.evaluate(() => globalThis.BerlinLines.S5.status().world || null);
  check(`station ${i}`, p.line === L && p.st === i && Math.abs(p.x - (i * 150)) < 40, JSON.stringify({ p, w }));
}
// 2. Straatblik: camera naast het viaduct (bogen, Fernbahn, gevels).
for (const i of [2, 8]) {
  await page.evaluate(i => globalThis.BerlinLines.S5.enter(i), i);
  await page.waitForTimeout(4000);
  await page.evaluate(i => { const g = globalThis.__berlinMetroGame, p = g.player, st = globalThis.BerlinLines.S5.stations[i]; p.position.set(st.x + 60, -st.elev + 1.7, -6800 - 22); p.yaw = -2.4; p.pitch = 0.22; }, i);
  await page.waitForTimeout(1500); await shot(`s5_${i}_straat`);
}
// 3. GOD-menu: lijnchip S5 en teleport.
const god = await page.evaluate(() => { const r = globalThis.BerlinGodTeleport?.teleport?.('S5', 5); const p = globalThis.__berlinMetroGame.player; return { r, line: p.__line, st: p.__lineStation, s: globalThis.BerlinGodTeleport?.status?.() }; });
check('GOD teleport S5 Bellevue', god.line === L && god.st === 5, JSON.stringify(god).slice(0, 300));
// 4. Afgesloten overstaptrapgaten (Zoo → U2/U9, Alexanderplatz → U2/U5/U8).
for (const i of [3, 9]) {
  await page.evaluate(i => globalThis.BerlinLines.S5.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot(`s5_${i}_dicht`);
  await walkUntil(() => false, 1.57, 25000);
  const p = await pos(), lx = p.x - i * 150;
  check(`trapgat ${i} dicht`, p.line === L && p.st === i && lx > -16.2 && lx < -15.5, JSON.stringify({ lx }));
}
// 5. Uitgang lopend: Friedrichstraße, trap in → Street View → terug op het perron.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(7, { dx: 26 }));
await page.waitForTimeout(3000);
let ok = await walkUntil(() => !!globalThis.__berlinMetroGame.player.__streetMode, 1.57, 60000);   // richting −x (trap open aan +x)
await page.waitForTimeout(9000); await shot('s5_7_street');
const sv = await page.evaluate(() => globalThis.BerlinStreet?.status?.() || null);
check('uitgang Friedrichstraße → Street View', ok, JSON.stringify(sv || {}).slice(0, 300));
const back = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /U-Bahn|S-Bahn|←/.test(b.textContent) && b.offsetParent); b?.click(); return b?.textContent || null; });
await page.waitForTimeout(5000);
const pb = await pos();
check('terug op het perron', !pb.street && pb.line === L && pb.st === 7, JSON.stringify({ back, pb }));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
