// U4: Nollendorfplatz ⇄ Innsbrucker Platz. Stations, park-ramen Rathaus Schöneberg, afgesloten U7/Ring, keuze-overstap
// Nollendorfplatz (U4 → U1/U3, U1 → U4, U1 → U2), treinen/DFI, meerijden, uitgang naar Street View.
// Usage: node u4-test.mjs <url> <outDir> [quality] [uur]
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
await page.waitForFunction(() => globalThis.BerlinLines?.U4?.status().installed && globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
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
// 1. Alle vijf stations, foto langs het perron.
for (let i = 0; i < (SKIP ? 0 : 5); i++) {
  await page.evaluate(i => globalThis.BerlinLines.U4.enter(i), i);
  await page.waitForTimeout(4000);
  await stand(-1.57, -0.04); await page.waitForTimeout(1500);
  await shot(`u4_${i}`);
  const p = await pos();
  check(`station ${i}`, p.line === 'U4' && p.st === i, JSON.stringify(p));
}
// Rathaus Schöneberg: naar de parkramen kijken.
await page.evaluate(() => globalThis.BerlinLines.U4.enter(3, { dx: -4 }));
await page.waitForTimeout(3000); await stand(-0.5, 0.05); await page.waitForTimeout(1500); await shot('u4_3_park');
const w = await page.evaluate(() => globalThis.BerlinLines.U4.status().world);
console.log('wereld', JSON.stringify(w).slice(0, 300));

// 2. Afgesloten trapgaten (U7 Bayerischer Platz, Ring Innsbrucker Platz): je loopt er niet in.
for (const [i, label] of SKIP ? [] : [[2, 'U7'], [4, 'S']]) {
  await page.evaluate(i => globalThis.BerlinLines.U4.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot(`u4_${i}_${label}_dicht`);
  await walk(30000);
  const p = await pos(), lx = p.x - i * 150;
  check(`trapgat ${label} dicht`, p.line === 'U4' && p.st === i && lx > -16.2 && lx < -15.5, JSON.stringify({ lx }));
}

// 3. Keuze-overstap Nollendorfplatz.
await page.evaluate(() => globalThis.BerlinLines.U4.enter(0, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u4_0_overstapbord');
let ok = await waitChooser(); await shot('u4_0_keuze');
check('U4 Nollendorfplatz: keuzevenster', ok);
await page.evaluate(() => globalThis.BerlinLines.Transfers.pick(0));
await page.waitForTimeout(3000);
let p = await pos();
check('U4 → U1/U3-perron Nollendorfplatz', p.line === 'U1' && p.st === 3, JSON.stringify(p));
await page.waitForTimeout(1500); await stand(1.57, -0.05); await page.waitForTimeout(1500); await shot('u1_3_bord_u2_u4');
ok = await waitChooser();
check('U1 Nollendorfplatz: keuzevenster', ok);
await page.evaluate(() => globalThis.BerlinLines.Transfers.pick(1));
await page.waitForTimeout(3000);
p = await pos();
check('U1 → U4 Nollendorfplatz', p.line === 'U4' && p.st === 0, JSON.stringify(p));
await page.evaluate(() => globalThis.BerlinLines.U1.enter(3, { at: 'transfer' }));
await page.waitForTimeout(2500);
ok = await waitChooser();
await page.evaluate(() => globalThis.BerlinLines.Transfers.pick(0));
await page.waitForTimeout(3000);
p = await pos();
check('U1 → U2 Nollendorfplatz (keuze)', ok && !p.line, JSON.stringify(p));

// 4. Treinen + DFI + meerijden Rathaus Schöneberg → Innsbrucker Platz.
await page.evaluate(() => globalThis.BerlinLines.U4.enter(1));
await page.waitForTimeout(8000);
const s4 = await page.evaluate(() => globalThis.BerlinLines.U4.status());
check('U4-treinen + DFI', s4.trains.length === 2 && s4.trains.every(t => t.units > 0) && !!s4.dfi, JSON.stringify({ trains: s4.trains, dfi: s4.dfi, model: s4.model }));
await stand(-1.57, 0.12); await page.waitForTimeout(1500); await shot('u4_1_dfi');
await page.evaluate(() => globalThis.BerlinLines.U4.board(3, 1));
const arrived = await page.waitForFunction(() => { const s = globalThis.BerlinLines.U4.status(); const t = s.trains.find(t => t.dir === 1); return s.riding && t && t.at === 4 && t.state === 'boarding'; }, null, { timeout: 900000, polling: 1000 }).then(() => true).catch(() => false);
await shot('u4_rit_innsbrucker');
check('meerijden tot Innsbrucker Platz', arrived, JSON.stringify((await page.evaluate(() => globalThis.BerlinLines.U4.status())).trains));

// 5. Uitgang Viktoria-Luise-Platz → Street View + buurtpakket.
await page.evaluate(() => globalThis.BerlinLines.U4.enter(1));
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.U4.exit(1));
await page.waitForTimeout(12000);
const sv = await page.evaluate(() => ({ street: !!globalThis.__berlinMetroGame.player.__streetMode, s: globalThis.BerlinStreet?.status?.() }));
check('uitgang → Street View', sv.street, JSON.stringify(sv.s || {}).slice(0, 300));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
