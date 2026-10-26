// Test for Game State 2.0 step 1: BerlinState must mirror what the game shows and must not change gameplay.
// Usage: node probe5.mjs <url> <outJson>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outJson] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ ...devices['iPad Pro 11 landscape'] })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
const euro = s => s ? Math.round(parseFloat(s.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) * 100) : null;
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
await page.locator('button.saveChoice:visible').filter({ hasText: /Nieuwe/ }).first().tap();
await page.waitForSelector('#startButton:not([disabled])', { timeout: 120000 });
await page.tap('#startButton');
await page.waitForTimeout(10000);
const read = () => page.evaluate(() => ({ hud: document.querySelector('#balance')?.textContent, station: document.querySelector('#stationName')?.textContent, snap: globalThis.BerlinState?.snapshot(), issues: globalThis.BerlinState?.consistency() }));
const a = await read();
await page.locator('button:visible').filter({ hasText: /GOD/ }).first().tap(); await page.waitForTimeout(1500);
await page.locator('button:visible').filter({ hasText: /\+€50/ }).first().tap(); await page.waitForTimeout(2500);
const b = await read();
const subCount = await page.evaluate(() => new Promise(res => { let n = 0; const off = globalThis.BerlinState.subscribe(() => n++); setTimeout(() => { off(); res(n); }, 3500); }));
await browser.close();
const checks = {
  stateAvailable: !!a.snap,
  moneyMatchesHud: euro(a.hud) === a.snap?.money.cents && euro(b.hud) === b.snap?.money.cents,
  moneyAfterGodPlus50: (b.snap?.money.cents ?? 0) - (a.snap?.money.cents ?? 0) === 5000,
  stationMatchesHud: a.station === a.snap?.location.station,
  timeReadable: typeof a.snap?.time.clock === 'string',
  subscribeFires: subCount >= 1,
  noPageErrors: errors.length === 0,
};
const report = { url, checks, passed: Object.values(checks).every(Boolean), before: a, after: b, errors };
await fs.writeFile(outJson, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, checks, money: [a.snap?.money, b.snap?.money.cents], time: a.snap?.time, issues: a.issues }, null, 1));
