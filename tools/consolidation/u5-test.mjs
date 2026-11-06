// U5 west: Hauptbahnhof ⇄ Alexanderplatz. Stations, sterrenhemel Museumsinsel, foto's Brandenburger Tor, afgesloten S/U6,
// keuze-overstap Alexanderplatz (U5 → U2, U2 → U5 via het bruine bord, U5 → U8), treinen/DFI, meerijden, uitgang.
// Usage: node u5-test.mjs <url> <outDir> [quality] [uur]
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
await page.waitForFunction(() => globalThis.BerlinLines?.U5?.status().installed && globalThis.BerlinLines?.Transfers?.status().installed, null, { timeout: 200000 });
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
const L = 'U5';
// 1. Alle zeven stations, foto langs het perron.
for (let i = 0; i < (SKIP ? 0 : 7); i++) {
  await page.evaluate(i => globalThis.BerlinLines.U5.enter(i), i);
  await page.waitForTimeout(4000);
  await stand(-1.57, -0.04); await page.waitForTimeout(1500);
  await shot(`u5_${i}`);
  const p = await pos();
  check(`station ${i}`, p.line === L && p.st === i, JSON.stringify(p));
}
// Museumsinsel: omhoog naar de sterrenhemel. Brandenburger Tor: naar de fotowand.
await page.evaluate(() => globalThis.BerlinLines.U5.enter(4));
await page.waitForTimeout(3000); await stand(-1.2, 0.6); await page.waitForTimeout(1500); await shot('u5_4_sterren');
await page.evaluate(() => globalThis.BerlinLines.U5.enter(2, { dx: -4 }));
await page.waitForTimeout(3000); await stand(-0.4, 0.05); await page.waitForTimeout(1500); await shot('u5_2_fotos');

// 2. Afgesloten trapgaten (S Hauptbahnhof, S Brandenburger Tor, U6 Unter den Linden).
for (const [i, label] of SKIP ? [] : [[0, 'S'], [3, 'U6']]) {
  await page.evaluate(i => globalThis.BerlinLines.U5.enter(i, { dx: -13 }), i);
  await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot(`u5_${i}_${label}_dicht`);
  await walk(30000);
  const p = await pos(), lx = p.x - i * 150;
  check(`trapgat ${label} dicht`, p.line === L && p.st === i && lx > -16.2 && lx < -15.5, JSON.stringify({ lx }));
}

// 3. Keuze-overstap Alexanderplatz: U5 → U2, U2 → U5 (bruin bord), U5 → U8.
await page.evaluate(() => globalThis.BerlinLines.U5.enter(6, { dx: -13 }));
await page.waitForTimeout(3000); await stand(1.57, -0.05); await page.waitForTimeout(1200); await shot('u5_6_overstapbord');
let ok = await waitChooser(); await shot('u5_6_keuze');
check('U5 Alexanderplatz: keuzevenster', ok);
await page.evaluate(() => globalThis.BerlinLines.Transfers.pick(0));
await page.waitForTimeout(3500);
let p = await pos();
const onU2 = await page.evaluate(() => { const g = globalThis.__berlinMetroGame, s = g.stations.find(s => s.id === 'alexanderplatz'); return { rz: Math.round((g.player.position.z - s.z) * 10) / 10, y: g.player.position.y }; });
check('U5 → U2 Alexanderplatz', !p.line && Math.abs(onU2.rz + 30.4) < 2, JSON.stringify({ p, onU2 }));
await stand(0, -0.02); await page.waitForTimeout(1500); await shot('u2_alex_bord_u5');
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 0; p.input.moveY = 1; });
ok = await page.waitForFunction(() => globalThis.__berlinMetroGame.player.__line === 'U5', null, { timeout: 90000, polling: 250 }).then(() => true).catch(() => false);
await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
await page.waitForTimeout(2000);
p = await pos();
check('U2 Alexanderplatz → U5 (bruin bord)', ok && p.line === L && p.st === 6, JSON.stringify(p));
await page.evaluate(() => globalThis.BerlinLines.U5.enter(6, { at: 'transfer' }));
await page.waitForTimeout(2500);
ok = await waitChooser();
await page.evaluate(() => globalThis.BerlinLines.Transfers.pick(1));
await page.waitForTimeout(3500);
p = await pos();
const u8 = await page.evaluate(() => globalThis.__berlinMetroGame.player.__u8FullStation);
check('U5 → U8 Alexanderplatz (keuze)', ok && !p.line && u8 === 14, JSON.stringify({ p, u8 }));
await stand(-1.57, -0.02); await page.waitForTimeout(1500); await shot('u8_alex_na_overstap');

// 4. Treinen + DFI + meerijden Museumsinsel → Rotes Rathaus.
await page.evaluate(() => globalThis.BerlinLines.U5.enter(4));
await page.waitForTimeout(8000);
const s5 = await page.evaluate(() => globalThis.BerlinLines.U5.status());
check('U5-treinen + DFI', s5.trains.length === 2 && s5.trains.every(t => t.units > 0) && !!s5.dfi, JSON.stringify({ trains: s5.trains, dfi: s5.dfi }));
await stand(-1.57, 0.12); await page.waitForTimeout(1500); await shot('u5_4_dfi');
await page.evaluate(() => globalThis.BerlinLines.U5.board(4, 1));
const arrived = await page.waitForFunction(() => { const s = globalThis.BerlinLines.U5.status(); const t = s.trains.find(t => t.dir === 1); return s.riding && t && t.at === 5 && t.state === 'boarding'; }, null, { timeout: 1200000, polling: 1000 }).then(() => true).catch(() => false);
await shot('u5_rit_rotes_rathaus');
check('meerijden tot Rotes Rathaus', arrived, JSON.stringify((await page.evaluate(() => globalThis.BerlinLines.U5.status())).trains));

// 5. Uitgang Brandenburger Tor → Street View + buurtpakket.
await page.evaluate(() => globalThis.BerlinLines.U5.enter(2));
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.U5.exit(2));
await page.waitForTimeout(12000);
const sv = await page.evaluate(() => ({ street: !!globalThis.__berlinMetroGame.player.__streetMode, s: globalThis.BerlinStreet?.status?.() }));
await shot('u5_2_street');
check('uitgang → Street View', sv.street, JSON.stringify(sv.s || {}).slice(0, 300));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
