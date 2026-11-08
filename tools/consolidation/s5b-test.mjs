// S-Bahn Stadtbahn deel b: treinen BR 481 (S5 eigen, S3/S7/S9 als gasten), echte eindpunten, vertrekbord (4 regels),
// instappen + meerijden naar de volgende halte, gasttrein stopt aan het perron, Fernbahn-decor (ICE/RE).
// Usage: node s5b-test.mjs <url> <outDir> [quality] [uur]
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
await page.waitForTimeout(12000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const S = () => page.evaluate(() => globalThis.BerlinLines.S5.status());
// Spel vooruitspoelen tot `cond` waar is (headless ±1 fps): per stap 2 spelseconden.
const until = async (cond, maxSec = 400) => { for (let t = 0; t < maxSec; t += 2) { if (await page.evaluate(cond)) return true; await page.evaluate(() => globalThis.BerlinLines.S5.simulate(2)); } return page.evaluate(cond); };
await page.evaluate(h => globalThis.BerlinClock?.setHour?.(Number(h)), hour);

// 1. Treinen: 10 stuks (S5 2×2, S3/S7/S9 1×2), eigen model.
let st = await S();
const lines = [...new Set(st.trains.map(t => t.line))].sort().join(',');
check('10 treinen S3/S5/S7/S9', st.trains.length === 10 && lines === 'S3,S5,S7,S9', `${st.trains.length} ${lines}`);
check('model BR481', st.model === 'BR481' && st.trains.every(t => t.units === 2), st.model);
const dest = await page.evaluate(() => globalThis.BerlinLines.S5.trains.map(t => `${t.line.id}:${t.timeline.terminusName}`).sort().join(' | '));
check('echte eindpunten', /S3:Erkner/.test(dest) && /S9:Flughafen BER/.test(dest) && /S7:Potsdam Hbf/.test(dest) && /S5:Strausberg Nord/.test(dest), dest);

// 2. Perron Hackescher Markt: trein komt binnen, vertrekbord met meerdere lijnen.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(8));
const arrived = await until(() => globalThis.BerlinLines.S5.status().trains.some(t => t.at === 8 && t.state === 'boarding' && t.visible));
check('trein stopt aan het perron (Hackescher Markt)', arrived);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = -1.2; p.pitch = 0.02; });
await page.waitForTimeout(1500); await shot('s5b_perron');
await page.evaluate(() => globalThis.BerlinLines.S5.simulate(20)); await page.waitForTimeout(2000);
st = await S();
const dfiLines = new Set((st.dfi || '').match(/S[3579]/g) || []);
check('vertrekbord ≥ 3 regels / ≥ 2 lijnen', (st.dfi || '').split('/').length >= 3 && dfiLines.size >= 2, st.dfi);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.position.x -= 9; p.yaw = -Math.PI / 2; p.pitch = 0.12; });
await page.waitForTimeout(1500); await shot('s5b_dfi');

// 3. Gasttrein (S3/S7/S9) stopt hier ook.
const guest = await until(() => globalThis.BerlinLines.S5.status().trains.some(t => t.line !== 'S5' && t.at === 8 && t.state === 'boarding'), 600);
await page.waitForTimeout(1500);
check('gasttrein stopt (S3/S7/S9)', guest);
await shot('s5b_gast');

// 4. Instappen lopend: naar een open deur, het spoor op.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(5));
const ready = await until(() => { const S5 = globalThis.BerlinLines.S5, st = S5.stations[5]; return S5.relevant().some(t => t.boardableAtStation(st) && t.timeline.stateTime < 8); });
let walked = false;
if (ready) {
  await page.evaluate(() => {
    const S5 = globalThis.BerlinLines.S5, st = S5.stations[5], p = globalThis.__berlinMetroGame.player;
    const t = S5.relevant().find(t => t.boardableAtStation(st)); const tz = t.direction > 0 ? 5.15 : -5.15;
    p.position.x = t.x - 4.5; p.position.z = -6800 + Math.sign(tz) * 3.0; p.yaw = tz > 0 ? Math.PI : 0; p.pitch = 0; p.input.moveY = 1;
  });
  walked = await page.waitForFunction(() => !!globalThis.__berlinMetroGame.player.__lineTrain, null, { timeout: 25000, polling: 100 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
}
check('lopend instappen (Bellevue)', walked);
if (walked) {
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = Math.PI / 2; p.pitch = 0; });
  await page.waitForTimeout(1500); await shot('s5b_binnen');
  const moved = await until(() => { const p = globalThis.__berlinMetroGame.player; return p.__lineTrain && p.__lineTrain.state === 'boarding' && p.__lineStation !== 5; }, 200);
  const p = await page.evaluate(() => ({ st: globalThis.__berlinMetroGame.player.__lineStation, t: globalThis.__berlinMetroGame.player.__lineTrain?.id }));
  check('meegereden naar volgende halte', moved && (p.st === 4 || p.st === 6), JSON.stringify(p));
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = Math.PI / 2 + 0.6; });
  await page.waitForTimeout(1200); await shot('s5b_rit_aankomst');
}

// 5. Fernbahn-decor: een ICE of RE op de buitensporen.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(9));
const fern = await until(() => { const d = globalThis.BerlinLines.S5.status().decor, p = globalThis.__berlinMetroGame.player; return d?.active && Math.abs(d.active.x - p.position.x) < 90; }, 300);
st = await S();
check('Fernbahn ICE/RE rijdt langs', fern, JSON.stringify(st.decor));
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = Math.PI; p.pitch = 0.05; });
await page.waitForTimeout(800); await shot('s5b_fern');

// 6. Buitenblik op een trein op het viaduct.
await page.evaluate(() => globalThis.BerlinLines.S5.enter(2));
await until(() => globalThis.BerlinLines.S5.status().trains.some(t => t.at === 2 && t.state === 'boarding'));
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player, st = globalThis.BerlinLines.S5.stations[2]; p.position.set(st.x + 45, -st.elev + 1.7, -6800 - 24); p.yaw = -2.5; p.pitch = 0.3; });
await page.waitForTimeout(1500); await shot('s5b_straat');
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
