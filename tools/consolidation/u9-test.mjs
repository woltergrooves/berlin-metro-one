// U9: Osloer Straße ⇄ Rathaus Steglitz (18 stations). Stations, afgesloten S Westhafen en S Bundesplatz,
// overstappen U9 ⇄ U6 (Leopoldplatz), U1 (Kurfürstendamm), U3 (Spichernstraße), U7 (Berliner Straße) heen en terug,
// U9 ⇄ U2 (Zoologischer Garten, oranje bord op het U2-perron), U9 ⇄ U8 (Osloer Straße, oranje bord op het U8-perron),
// 6 treinen + DFI met eindpunt Rathaus Steglitz, meerijden Schloßstraße → Rathaus Steglitz, uitgang Rathaus Steglitz.
// Usage: node u9-test.mjs <url> <outDir> [quality] [uur]   (env SKIP=1: stations overslaan, NORIDE=1: stoppen na de overstappen)
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
await page.waitForFunction(() => globalThis.BerlinLines?.U9?.status().installed && globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
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
const L = 'U9';
const walkUntil = async (cond, yaw = 1.57, ms = 90000) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
const n = await page.evaluate(() => globalThis.BerlinLines.U9.stations.length);
check('18 stations', n === 18, String(n));
// 1. Alle stations.
for (let i = 0; i < (SKIP ? 0 : 18); i++) {
  await page.evaluate(i => globalThis.BerlinLines.U9.enter(i), i);
  await page.waitForTimeout(3500);
  await stand(-1.57, -0.04); await page.waitForTimeout(1200);
  if ([0, 4, 6, 7, 8, 16, 17].includes(i)) await shot(`u9_${i}`);
  const p = await pos();
  check(`station ${i}`, p.line === L && p.st === i && Math.abs(p.x - (i * 150)) < 40, JSON.stringify(p));
}
// 2. Afgesloten trapgaten (S Westhafen, S Bundesplatz).
for (const i of SKIP ? [] : [4, 13]) {
  await page.evaluate(i => globalThis.BerlinLines.U9.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot(`u9_${i}_dicht`);
  await walkUntil(() => false, 1.57, 25000);
  const p = await pos(), lx = p.x - i * 150;
  check(`trapgat ${i} dicht`, p.line === L && p.st === i && lx > -16.2 && lx < -15.5, JSON.stringify({ lx }));
}
// 3. Overstappen U6, U1, U3, U7 (heen en terug via de lijnperrons).
for (const [i, other, id] of [[2, 'U6', 'leopoldplatz'], [9, 'U1', 'kurfuerstendamm'], [10, 'U3', 'spichernstrasse'], [12, 'U7', 'berliner-strasse']]) {
  await page.evaluate(i => globalThis.BerlinLines.U9.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot(`u9_${i}_bord_${other}`);
  let ok = await walkUntil(`globalThis.__berlinMetroGame.player.__line === '${other}'`);
  let p = await pos();
  const oi = await page.evaluate(([o, id]) => globalThis.BerlinLines[o].stations.findIndex(s => s.id === id && !s.shared), [other, id]);
  check(`U9 → ${other} ${id}`, ok && p.st === oi, JSON.stringify({ p, oi }));
  await page.evaluate(([o, j]) => globalThis.BerlinLines[o].enter(j, { dx: -13 }), [other, oi]);
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot(`${other}_${id}_bord_u9`);
  ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U9');
  p = await pos();
  check(`${other} → U9 ${id}`, ok && p.st === i, JSON.stringify(p));
}
// 3b. U9 Zoologischer Garten → U2, terug via het oranje U9-bord op het U2-perron.
await page.evaluate(() => globalThis.BerlinLines.U9.enter(8, { dx: -13 }));
await page.waitForTimeout(3000);
let ok = await walkUntil(() => !globalThis.__berlinMetroGame.player.__line);
let p = await pos();
const onU2 = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, s = g.stations.find(s => s.id === 'zoologischer-garten'); return { rz: Math.round((g.player.position.z - s.z) * 10) / 10, y: g.player.position.y, st: g.player.currentStation?.id }; });
check('U9 → U2 Zoologischer Garten', ok && Math.abs(onU2.rz + 30.4) < 2, JSON.stringify({ p, onU2 }));
await stand(0, -0.02); await page.waitForTimeout(2500); await shot('u2_zoo_bord_u9');
const pts = await page.evaluate(() => globalThis.BerlinLines.Transfers.status().points);
check('U9-borden op U2 Zoo + U8 Osloer Straße', pts.includes('U2:Zoologischer Garten') && pts.includes('U8:Osloer Straße'), JSON.stringify(pts));
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U9', 0);
p = await pos();
check('U2 Zoologischer Garten → U9 (oranje bord)', ok && p.st === 8, JSON.stringify(p));
// 3c. U9 Osloer Straße → U8 (westeinde), terug via het oranje U9-bord.
await page.evaluate(() => globalThis.BerlinLines.U9.enter(0, { dx: -13 }));
await page.waitForTimeout(3000);
ok = await walkUntil(() => !globalThis.__berlinMetroGame.player.__line);
const u8 = await page.evaluate(() => globalThis.BerlinLines.Transfers.flags());
check('U9 → U8 Osloer Straße', ok && u8.u8 === 7, JSON.stringify(u8));
await stand(1.57, 0); await page.waitForTimeout(1500); await shot('u8_osloer_bord_u9');
ok = await walkUntil(() => globalThis.__berlinMetroGame.player.__line === 'U9', 1.57);   // westeinde = +yaw
p = await pos();
check('U8 Osloer Straße → U9 (oranje bord)', ok && p.st === 0, JSON.stringify(p));
// 3d. Controle: U7 Bismarckstraße → U2 werkt nog.
await page.evaluate(() => globalThis.BerlinLines.U7.enter(27, { dx: -13 }));
await page.waitForTimeout(3000);
ok = await walkUntil(() => !globalThis.__berlinMetroGame.player.__line);
check('U7 → U2 Bismarckstraße (controle)', ok, JSON.stringify(await pos()));

if (process.env.NORIDE) { console.log('resultaat', pass, '/', pass + fail); console.log('fouten', errors.length, errors.slice(0, 8)); console.log('done'); await browser.close(); process.exit(0); }
// 4. Treinen + DFI + meerijden Schloßstraße → Rathaus Steglitz.
await page.evaluate(() => globalThis.BerlinLines.U9.enter(16));
await page.waitForTimeout(8000);
const s9 = await page.evaluate(() => globalThis.BerlinLines.U9.status());
check('U9-treinen + DFI', s9.trains.length === 6 && s9.trains.every(t => t.units > 0) && !!s9.dfi, JSON.stringify({ n: s9.trains.length, dfi: s9.dfi }));
check('DFI eindpunt Rathaus Steglitz', JSON.stringify(s9.dfi).includes('Rathaus Steglitz'), JSON.stringify(s9.dfi).slice(0, 300));
await stand(-1.57, 0.12); await page.waitForTimeout(1500); await shot('u9_16_dfi');
await page.evaluate(() => globalThis.BerlinLines.U9.board(16, 1));
const arrived = await page.waitForFunction(() => { const s = globalThis.BerlinLines.U9.status(); return s.riding && s.trains.some(t => t.dir === 1 && t.at === 17 && t.state === 'boarding'); }, null, { timeout: 1200000, polling: 1000 }).then(() => true).catch(() => false);
await shot('u9_rit_steglitz');
check('meerijden tot Rathaus Steglitz', arrived, JSON.stringify((await page.evaluate(() => globalThis.BerlinLines.U9.status())).trains).slice(0, 400));
// 5. Uitgang Rathaus Steglitz → Street View.
await page.evaluate(() => globalThis.BerlinLines.U9.enter(17));
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.U9.exit(17));
await page.waitForTimeout(12000);
const sv = await page.evaluate(() => ({ street: !!globalThis.__berlinMetroGame.player.__streetMode, s: globalThis.BerlinStreet?.status?.() }));
await shot('u9_17_street');
check('uitgang → Street View', sv.street, JSON.stringify(sv.s || {}).slice(0, 300));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
