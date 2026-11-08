// S-Bahn Stadtbahn deel c: overstappen. S-kant: Hauptbahnhof → U5, Zoo → keuze U2/U9, Friedrichstraße → U6,
// Jannowitzbrücke → U8, Ostkreuz dicht. Terug: U5/U6/U7/U1 (oude S-hekken) → S5, U9 Zoo keuze → S, U2-perron Zoo
// (U9 + S → keuze), U8-perron Jannowitzbrücke → S5.
// Usage: node s5c-test.mjs <url> <outDir> [quality]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'laag'] = process.argv.slice(2);
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
await page.waitForFunction(() => ['S5', 'U1', 'U5', 'U6', 'U7', 'U9'].every(l => globalThis.BerlinLines?.[l]?.status().installed), null, { timeout: 300000 });
await page.waitForTimeout(10000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const where = () => page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { line: p.__line, st: p.__lineStation, u8: p.__u8FullStation, z: Math.round(p.position.z), x: Math.round(p.position.x) }; });
const walk = async (yaw, cond, ms = 70000) => {
  await page.evaluate(y => { const p = globalThis.__berlinMetroGame.player; p.yaw = y; p.pitch = 0; p.input.moveY = 1; }, yaw);
  const ok = await page.waitForFunction(cond, null, { timeout: ms, polling: 200 }).then(() => true).catch(() => false);
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  await page.waitForTimeout(2500);
  return ok;
};
const chooser = () => page.waitForFunction(() => !!document.querySelector('#lineTransferChooser'), null, { timeout: 60000, polling: 200 }).then(() => true).catch(() => false);
const pick = label => page.evaluate(l => { const b = [...document.querySelectorAll('#lineTransferChooser button')].find(b => b.textContent.includes(l)); b?.click(); return !!b; }, label);
// Van een nieuwe lijn het overstaptrapgat in lopen (x −19, open kant naar −x vanaf −13).
const toStair = async (L, i) => { await page.evaluate(([L, i]) => globalThis.BerlinLines[L].enter(i, { dx: -13 }), [L, i]); await page.waitForTimeout(3500); };
const on = (L, i) => `(() => { const p = globalThis.__berlinMetroGame.player; return p.__line === '${L}' && p.__lineStation === ${i}; })()`;

// 1. S5 Hauptbahnhof → U5 Hauptbahnhof (index 0).
await toStair('S5', 6); await shot('c_hbf_trap');
check('S5 Hbf → U5', await walk(1.57, on('U5', 0)), JSON.stringify(await where()));
// 2. U5 Hauptbahnhof (vroeger S-hek) → S5 Hauptbahnhof.
await toStair('U5', 0);
check('U5 Hbf → S5', await walk(1.57, on('S5', 6)), JSON.stringify(await where()));
await shot('c_terug_s5');
// 3. S5 Zoo → keuze → U9.
await toStair('S5', 3);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 1.57; p.input.moveY = 1; });
let ch = await chooser(); await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; }); await shot('c_zoo_keuze');
const u9i = await page.evaluate(() => globalThis.BerlinLines.U9.stations.findIndex(s => s.id === 'zoologischer-garten'));
check('S5 Zoo → keuzevenster → U9', ch && await pick('U9') && await page.waitForFunction(new Function(`return ${on('U9', u9i)}`), null, { timeout: 30000 }).then(() => true).catch(() => false), JSON.stringify(await where()));
// 4. U9 Zoo → keuze → S-Bahn.
await page.waitForTimeout(2000); await toStair('U9', u9i);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 1.57; p.input.moveY = 1; });
ch = await chooser(); await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
check('U9 Zoo → keuze → S5', ch && await pick('S-Bahn') && await page.waitForFunction(new Function(`return ${on('S5', 3)}`), null, { timeout: 30000 }).then(() => true).catch(() => false), JSON.stringify(await where()));
// 5. U2-perron Zoo: −z-einde → keuze (U9 + S-Bahn) → S-Bahn.
await page.waitForTimeout(2000);
await page.evaluate(() => globalThis.BerlinLines.Transfers.toU2('zoologischer-garten')); await page.waitForTimeout(5000);
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 0; p.pitch = 0.05; }); await page.waitForTimeout(1500); await shot('c_u2_zoo_borden');
await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.yaw = 0; p.input.moveY = 1; });
ch = await chooser(); await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; }); await shot('c_u2_zoo_keuze');
const opts = await page.evaluate(() => [...document.querySelectorAll('#lineTransferChooser button')].map(b => b.textContent.trim().slice(0, 20)).join(' | '));
check('U2 Zoo → keuze U9/S → S5', ch && /U9/.test(opts) && /S-Bahn/.test(opts) && await pick('S-Bahn') && await page.waitForFunction(new Function(`return ${on('S5', 3)}`), null, { timeout: 30000 }).then(() => true).catch(() => false), opts);
// 6. S5 Jannowitzbrücke → U8 (15) en terug vanaf het westeinde van het U8-perron.
await toStair('S5', 10);
check('S5 Jannowitzbrücke → U8', await walk(1.57, '(() => globalThis.__berlinMetroGame.player.__u8FullStation === 15)()'), JSON.stringify(await where()));
await page.waitForTimeout(3000);
check('U8 Jannowitzbrücke → S5', await walk(Math.PI / 2, on('S5', 10), 90000), JSON.stringify(await where()));
// 7. U6 Friedrichstraße, U7 Wilmersdorfer Straße, U1 Warschauer Straße → S5.
for (const [L, id, si] of [['U6', 'friedrichstrasse', 7], ['U7', 'wilmersdorfer-strasse', 1], ['U1', 'warschauer-strasse', 12]]) {
  const i = await page.evaluate(([L, id]) => globalThis.BerlinLines[L].stations.findIndex(s => s.id === id && !s.shared), [L, id]);
  await toStair(L, i);
  check(`${L} ${id} → S5`, await walk(1.57, on('S5', si)), JSON.stringify(await where()));
}
// 8. S5 Friedrichstraße → U6, Ostkreuz blijft dicht.
await toStair('S5', 7);
const u6i = await page.evaluate(() => globalThis.BerlinLines.U6.stations.findIndex(s => s.id === 'friedrichstrasse'));
check('S5 Friedrichstraße → U6', await walk(1.57, on('U6', u6i)), JSON.stringify(await where()));
await toStair('S5', 13);
await walk(1.57, () => false, 20000);
const p = await where();
check('Ostkreuz (Ring) dicht', p.line === 'S5' && p.st === 13, JSON.stringify(p));
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 8));
console.log('done');
await browser.close();
