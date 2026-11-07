// U7a: Rudow ⇄ Möckernbrücke. 17 stations, hoge hal Hermannplatz, afgesloten S-Ring Neukölln,
// overstappen U7 ⇄ U8 (Hermannplatz, blauw bord), U7 ⇄ U6 (Mehringdamm), U7 ⇄ U1 (Möckernbrücke), treinen/DFI, meerijden, uitgang.
// Usage: node u7-test.mjs <url> <outDir> [quality] [uur]   (env SKIP=1: stations overslaan, NORIDE=1: stoppen na de overstappen)
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
await page.waitForFunction(() => globalThis.BerlinLines?.U7?.status().installed && globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
await page.waitForTimeout(15000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; return { x: Math.round(p.position.x * 10) / 10, z: Math.round(p.position.z), line: p.__line, st: p.__lineStation, street: !!p.__streetMode }; });
const stand = (yaw, pitch = 0) => page.evaluate(([y, pt]) => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = pt; }, [yaw, pitch]);
const walk = async (ms, yaw = 1.57) => { await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1; }, yaw); await page.waitForTimeout(ms); await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; }); };
// Lopen tot het keuzevenster verschijnt (headless loopt ±10× te traag).
const waitChooser = async () => {
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 1.57; p.input.moveY = 1; });
  const ok = await page.waitForFunction(() => globalThis.BerlinLines.Transfers.status().chooser, null, { timeout: 60000, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  return ok;
};
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);

const SKIP = !!process.env.SKIP;
const L = 'U7';
const N = 17;
// 1. Alle stations.
for (let i = 0; i < (SKIP ? 0 : N); i++) {
  await page.evaluate(i => globalThis.BerlinLines.U7.enter(i), i);
  await page.waitForTimeout(3500);
  await stand(-1.57, -0.04); await page.waitForTimeout(1200);
  if (i % 4 === 0 || [9, 12, 15, 16].includes(i)) await shot(`u7_${i}`);
  const p = await pos();
  check(`station ${i}`, p.line === L && p.st === i, JSON.stringify(p));
}
// 2. Afgesloten trapgat (S-Ring Neukölln).
if (!SKIP) {
  await page.evaluate(() => globalThis.BerlinLines.U7.enter(9, { dx: -13 }));
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u7_9_S_dicht');
  await walk(30000);
  const p = await pos(), lx = p.x - 9 * 150;
  check('trapgat S Neukölln dicht', p.line === L && p.st === 9 && lx > -16.2 && lx < -15.5, JSON.stringify({ lx }));
}
const walkUntil = async (cond, yaw = 1.57, ms = 90000) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
// 3a. U7 Mehringdamm → U6, en terug.
await page.evaluate(() => globalThis.BerlinLines.U7.enter(15, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u7_15_bord_u6');
let ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U6');
let p = await pos();
check('U7 → U6 Mehringdamm', ok && p.st === 8, JSON.stringify(p));
await page.evaluate(() => globalThis.BerlinLines.U6.enter(8, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u6_8_bord_u7');
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U7');
p = await pos();
check('U6 → U7 Mehringdamm', ok && p.st === 15, JSON.stringify(p));
// 3b. U7 Möckernbrücke → U1 (viaduct), en terug.
await page.evaluate(() => globalThis.BerlinLines.U7.enter(16, { dx: -13 }));
await page.waitForTimeout(3000);
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U1');
p = await pos();
const u1i = await page.evaluate(() => globalThis.BerlinLines.U1.stations.findIndex(s => s.id === 'moeckernbruecke'));
check('U7 → U1 Möckernbrücke', ok && p.st === u1i, JSON.stringify({ p, u1i }));
await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u1_moeckern_bord_u7');
await page.evaluate(i => globalThis.BerlinLines.U1.enter(i, { dx: -13 }), u1i);
await page.waitForTimeout(3000);
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U7');
p = await pos();
check('U1 → U7 Möckernbrücke', ok && p.st === 16, JSON.stringify(p));
// 3c. U7 Hermannplatz → U8 (westeinde), terug via het blauwe U7-bord.
await page.evaluate(() => globalThis.BerlinLines.U7.enter(12, { dx: -13 }));
await page.waitForTimeout(3000);
ok = await walkUntil(() => !globalThis.__berlinMetroGame.player.__line);
const u8 = await page.evaluate(() => globalThis.BerlinLines.Transfers.flags());
check('U7 → U8 Hermannplatz', ok && u8.u8 === 20, JSON.stringify(u8));
await stand(1.57, 0); await page.waitForTimeout(1500); await shot('u8_hermannplatz_bord_u7');
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U7', -1.57);
p = await pos();
check('U8 Hermannplatz → U7 (blauw bord)', ok && p.st === 12, JSON.stringify(p));

if (process.env.NORIDE) { console.log('resultaat', pass, '/', pass + fail); console.log('fouten', errors.length, errors.slice(0, 8)); console.log('done'); await browser.close(); process.exit(0); }
// 4. Treinen + DFI + meerijden Rathaus Neukölln → Hermannplatz.
await page.evaluate(() => globalThis.BerlinLines.U7.enter(11));
await page.waitForTimeout(8000);
const s7 = await page.evaluate(() => globalThis.BerlinLines.U7.status());
check('U7-treinen + DFI', s7.trains.length === 6 && s7.trains.every(t => t.units > 0) && !!s7.dfi, JSON.stringify({ trains: s7.trains, dfi: s7.dfi }));
await stand(-1.57, 0.12); await page.waitForTimeout(1500); await shot('u7_11_dfi');
await page.evaluate(() => globalThis.BerlinLines.U7.board(11, 1));
const arrived = await page.waitForFunction(() => { const s = globalThis.BerlinLines.U7.status(); return s.riding && s.trains.some(t => t.dir === 1 && t.at === 12 && t.state === 'boarding'); }, null, { timeout: 1200000, polling: 1000 }).then(() => true).catch(() => false);
await shot('u7_rit_hermannplatz');
check('meerijden tot Hermannplatz', arrived, JSON.stringify((await page.evaluate(() => globalThis.BerlinLines.U7.status())).trains));
// 5. Uitgang Rathaus Neukölln → Street View.
await page.evaluate(() => globalThis.BerlinLines.U7.enter(11));
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.U7.exit(11));
await page.waitForTimeout(12000);
const sv = await page.evaluate(() => ({ street: !!globalThis.__berlinMetroGame.player.__streetMode, s: globalThis.BerlinStreet?.status?.() }));
await shot('u7_11_street');
check('uitgang → Street View', sv.street, JSON.stringify(sv.s || {}).slice(0, 300));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
