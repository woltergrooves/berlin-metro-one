// BVG-app (PhoneNetz, 9 nov 2026): lijnchips, haltelijst, routeplanner met zoeken. Usage: node phone-netz-test.mjs <url> <map> [toestel]
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, dev = 'iPhone 13'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ ...devices[dev] })).newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
let pass = 0, fail = 0; const check = (n, ok, i = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', n, i); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.BerlinPhoneSkin && globalThis.BerlinPhoneNetz && globalThis.BerlinLines?.S5 && globalThis.BerlinLines?.U9, null, { timeout: 200000 });
await page.waitForTimeout(6000);
const shot = n => page.screenshot({ path: `${outDir}/${n}.png` });
// Routes (logica)
for (const [a, b, want] of [['Alexanderplatz', 'Rudow', ['U8', 'U7']], ['Pankow', 'Krumme Lanke', null], ['Ruhleben', 'Hönow', null], ['Westkreuz', 'Hermannplatz', null], ['Osloer Straße', 'Rathaus Steglitz', ['U9']]]) {
  const r = await page.evaluate(([a, b]) => BerlinPhoneNetz.plan(a, b), [a, b]);
  const lines = r?.legs.map(g => g.line);
  check(`route ${a} → ${b}`, r && r.legs.length && (!want || JSON.stringify(lines) === JSON.stringify(want)), JSON.stringify(r?.legs.map(g => `${g.line}:${g.from}>${g.to}`)) + ' ' + r?.minutes + 'min');
}
// UI
await page.evaluate(() => { document.querySelector('#phoneBtnV2').click(); });
await page.waitForTimeout(800);
await page.evaluate(() => BerlinPhoneSkin.openApp('map')); await page.waitForTimeout(1500);
const ui = await page.evaluate(() => ({ chips: document.querySelectorAll('#phoneBodyV2 .bnz-chips button').length, stops: document.querySelectorAll('#phoneBodyV2 .bnz-stop').length, here: document.querySelector('#phoneBodyV2 .bnz-from b')?.textContent }));
check('BVG-app: lijnchips en haltes', ui.chips >= 10 && ui.stops > 5, JSON.stringify(ui));
await shot('1_bvg');
await page.locator('#phoneBodyV2 .bnz-in').fill('rud'); await page.waitForTimeout(1200);
const sug = await page.evaluate(() => [...document.querySelectorAll('#phoneBodyV2 .bnz-sug button')].map(b => b.textContent.trim()));
check('zoeken "rud" (blijft staan na verversen)', sug.some(t => /Rudow/.test(t)), JSON.stringify(sug));
await shot('2_zoeken');
await page.evaluate(() => [...document.querySelectorAll('#phoneBodyV2 .bnz-sug button')].find(b => /Rudow/.test(b.textContent)).click()); await page.waitForTimeout(1000);
const res = await page.evaluate(() => ({ legs: document.querySelectorAll('#phoneBodyV2 .bnz-leg').length, sum: document.querySelector('#phoneBodyV2 .bnz-sum')?.textContent }));
check('route in de app', res.legs >= 1 && /min/.test(res.sum || ''), JSON.stringify(res));
await shot('3_route');
await page.evaluate(() => document.querySelector('#phoneBodyV2 [data-line="S5"]').click()); await page.waitForTimeout(800);
const s5 = await page.evaluate(() => ({ stops: document.querySelectorAll('#phoneBodyV2 .bnz-stop').length, badges: document.querySelectorAll('#phoneBodyV2 .bnz-stop .bnz-chip').length }));
check('S-Bahnlijn met overstapbadges', s5.stops === 14 && s5.badges > 5, JSON.stringify(s5));
await page.evaluate(() => { document.querySelector('#phoneBodyV2').scrollTop = 0; }); await shot('4_sbahn');
await page.evaluate(() => [...document.querySelectorAll('#phoneBodyV2 .bnz-stop')].find(b => /Hauptbahnhof/.test(b.textContent)).click()); await page.waitForTimeout(800);
const r2 = await page.evaluate(() => document.querySelector('#phoneBodyV2 .bnz-from:nth-of-type(2)')?.textContent || document.querySelectorAll('#phoneBodyV2 .bnz-from')[1]?.textContent);
check('tik op halte = bestemming', /Hauptbahnhof/.test(r2 || ''), r2);
await page.waitForTimeout(2000);
const still = await page.evaluate(() => BerlinPhoneNetz.status());
check('geen onnodig herbouwen', still.builds < 15, JSON.stringify(still));
console.log('resultaat', pass, '/', pass + fail); console.log('fouten', errors.length, errors.slice(0, 5)); console.log('done');
await browser.close();
