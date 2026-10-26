// Klokprobe (Game State 2.0 stap 4). Usage: node clock-probe.mjs <url>
// Nieuwe save → alle tijdbronnen lezen → 10 s laten lopen → over middernacht → slapen → herladen.
// Verwacht na stap 4: overal dezelfde tijd en dag; nieuwe save om 08:15 op dag 1; tijd blijft na herladen.
import { chromium, devices } from 'playwright';
const [url] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ ...devices['iPad Pro 11 landscape'] })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

async function boot(choice) {
  await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
  const labels = await page.locator('button.saveChoice:visible').allInnerTexts();
  await page.locator('button.saveChoice:visible').filter({ hasText: choice }).first().tap();
  await page.waitForSelector('#startButton:not([disabled])', { timeout: 180000 });
  await page.tap('#startButton');
  await page.waitForFunction(() => globalThis.__berlinMetroGame?.phase12State && globalThis.BerlinLife?.state && globalThis.__berlinMetroGame?.metroEconomy?.home, null, { timeout: 180000 });
  await page.waitForTimeout(3000);
  return labels.map(l => l.replace(/\n/g, ' | ')).filter(l => /Doorgaan/.test(l));
}
const read = step => page.evaluate(step => {
  const g = globalThis.__berlinMetroGame, L = globalThis.BerlinLife?.state?.clock, C = globalThis.BerlinClock;
  const hm = m => m == null ? null : `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  const store = (() => { try { return JSON.parse(localStorage.getItem('metro-economy-v2'))?.home?.day; } catch { return null; } })();
  return { step, clock: C ? `dag ${C.dayNumber} ${C.weekdayName} ${C.hhmm}` : null,
    zichtbaar: document.querySelector('#phase12clock')?.textContent ?? null, hud: document.querySelector('#hudClockV1')?.textContent ?? null,
    metroTime: hm(globalThis.__berlinMetroTime?.minutes), berlinLife: L ? `wd ${L.day} ${hm(L.minute)}` : null,
    woningdag: g?.metroEconomy?.home?.day ?? null, woningdagOpslag: store ?? null, saldo: g?.economy?.balanceCents };
}, step);

const rows = [];
await page.goto(url, { waitUntil: 'load' });
await boot(/Nieuwe/);
rows.push(await read('1 nieuwe save'));
await page.waitForTimeout(10000);
rows.push(await read('2 na 10 s'));
await page.evaluate(() => { const T = globalThis.__berlinMetroTime; T.setHour(23); });
await page.waitForTimeout(500);
rows.push(await read('3 debug: 23:00'));
await page.evaluate(() => globalThis.__berlinMetroTime.addMinutes(90));
await page.waitForTimeout(2500);
rows.push(await read('4 +90 min (over middernacht)'));
await page.evaluate(() => globalThis.BerlinClock?.nextMorning?.(8));
await page.waitForTimeout(2500);
rows.push(await read('5 slapen (BerlinClock.nextMorning)'));
await page.waitForTimeout(2500);
await page.reload({ waitUntil: 'load' });
rows.push({ labels: await boot(/Doorgaan/) });
rows.push(await read('6 na herladen'));
for (const r of rows) console.log(JSON.stringify(r));
console.log('errors', errors);
await browser.close();
