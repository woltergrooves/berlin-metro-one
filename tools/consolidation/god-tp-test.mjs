// GOD-menu teleport (8 nov 2026): lijnchips U1…U9, lijst per lijn, zoeken over alle lijnen, teleport tussen lijnen.
// Usage: node god-tp-test.mjs <url> <outDir> [toestel]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, dev = 'iPad Pro 11 landscape'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices[dev] });
await ctx.addInitScript(() => { try { localStorage.setItem('berlinLife.quality', 'laag'); } catch {} });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
let pass = 0, fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinGodTeleport?.status().installed && globalThis.BerlinLines?.U9?.status().installed, null, { timeout: 300000 });
await page.waitForTimeout(8000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const open = () => page.evaluate(() => document.querySelector('#god3').click());
const where = () => page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { line: p.__line, st: p.__lineStation, u8: p.__u8FullStation, cur: p.currentStation?.id, z: Math.round(p.position.z) }; });
const st = await page.evaluate(() => globalThis.BerlinGodTeleport.status());
check('9 lijnen', st.lines.length === 9, JSON.stringify(st.lines));
check('geen oude per-lijn-blokken', await page.evaluate(() => !document.querySelector('#U7God,#U1God,#U9God')));
await open(); await page.waitForTimeout(800); await shot('god_open');
await page.evaluate(() => document.querySelector('#tabs3 button[data-l="U9"]').click()); await page.waitForTimeout(500); await shot('god_u9');
check('U9-lijst 18', await page.evaluate(() => document.querySelectorAll('#list3 button[data-l="U9"]').length) === 18);
await page.evaluate(() => { const q = document.querySelector('#search3'); q.value = 'platz'; q.dispatchEvent(new Event('input')); }); await page.waitForTimeout(500); await shot('god_zoek');
const lines = await page.evaluate(() => new Set([...document.querySelectorAll('#list3 button[data-l]')].map(b => b.dataset.l)).size);
check('zoeken over meerdere lijnen', lines >= 5, String(lines));
// teleport naar U9 Hansaplatz
await page.evaluate(() => { const q = document.querySelector('#search3'); q.value = ''; q.dispatchEvent(new Event('input')); document.querySelector('#tabs3 button[data-l="U9"]').click(); document.querySelector('#list3 button[data-l="U9"][data-i="7"]').click(); });
await page.waitForTimeout(4000); let w = await where();
check('→ U9 Hansaplatz', w.line === 'U9' && w.st === 7, JSON.stringify(w));
await open(); await page.waitForTimeout(800); await shot('god_op_u9');
check('opent op huidige lijn U9', await page.evaluate(() => document.querySelector('#tabs3 button.on')?.dataset.l) === 'U9');
// U9 → U2 Zoologischer Garten
await page.evaluate(() => { document.querySelector('#tabs3 button[data-l="U2"]').click(); const b = [...document.querySelectorAll('#list3 button')].find(b => /Zoologischer/.test(b.textContent)); b.click(); });
await page.waitForTimeout(4000); w = await where();
check('U9 → U2 Zoo (lijn verlaten)', !w.line && w.cur === 'zoologischer-garten', JSON.stringify(w));
// U2 → U8 Osloer Straße
await open(); await page.waitForTimeout(500);
await page.evaluate(() => { document.querySelector('#tabs3 button[data-l="U8"]').click(); [...document.querySelectorAll('#list3 button')].find(b => /Osloer/.test(b.textContent)).click(); });
await page.waitForTimeout(4000); w = await where();
check('→ U8 Osloer Straße', w.u8 === 7 && !w.line, JSON.stringify(w));
// U8 → U7 Rathaus Spandau
await open(); await page.waitForTimeout(500);
await page.evaluate(() => { document.querySelector('#tabs3 button[data-l="U7"]').click(); document.querySelector('#list3 button[data-l="U7"][data-i="39"]').click(); });
await page.waitForTimeout(4000); w = await where();
check('U8 → U7 Rathaus Spandau', w.line === 'U7' && w.st === 39 && !Number.isInteger(w.u8), JSON.stringify(w));
await open(); await page.waitForTimeout(800); await shot('god_op_u7');
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
