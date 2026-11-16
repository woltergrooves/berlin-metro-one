// EN-1 smoke test: boot, save choice, HUD, phone apps, Street View screen — collects visible text and page errors.
import { chromium, devices } from 'playwright';
const url = process.argv[2] || 'http://localhost:4180/', out = process.argv[3] || '/tmp/en';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource|RefererNotAllowed/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /new save/i.test(b.textContent)), null, { timeout: 300000 });
await page.screenshot({ path: out + '_1_saves.png' });
console.log('SAVES:', await page.evaluate(() => document.body.innerText.slice(0, 600)));
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /new save/i.test(b.textContent))?.click());
await page.waitForSelector('#startButton:not([disabled])', { timeout: 300000 }).catch(() => {});
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForTimeout(15000);
await page.screenshot({ path: out + '_2_world.png' });
console.log('HUD:', await page.evaluate(() => document.querySelector('#hud')?.innerText.replace(/\s+/g, ' ').slice(0, 500)));
console.log('MIG:', JSON.stringify(await page.evaluate(() => globalThis.BerlinEnglishMigration?.status())));
await page.evaluate(() => document.querySelector('#phoneBtnV2')?.click()); await page.waitForTimeout(1500);
await page.screenshot({ path: out + '_3_phone.png' });
console.log('PHONE:', await page.evaluate(() => document.querySelector('#phoneModalV2')?.innerText.replace(/\s+/g, ' ').slice(0, 400)));
for (const app of ['map', 'jobs', 'home', 'city', 'contacts', 'places']) {
  await page.evaluate(a => globalThis.BerlinPhoneSkin?.openApp?.(a), app); await page.waitForTimeout(900);
  console.log('APP', app + ':', await page.evaluate(() => document.querySelector('#phoneModalV2')?.innerText.replace(/\s+/g, ' ').slice(0, 300)));
}
await page.screenshot({ path: out + '_4_app.png' });
await page.evaluate(() => globalThis.BerlinPhoneSkin?.goHome?.()); await page.evaluate(() => document.querySelector('#phoneBtnV2')?.click()); await page.waitForTimeout(800);
await page.evaluate(() => globalThis.BerlinLines?.U9?.enter?.(7)); await page.waitForTimeout(6000);
console.log('U9:', await page.evaluate(() => document.querySelector('#hud')?.innerText.replace(/\s+/g, ' ').slice(0, 400)));
await page.screenshot({ path: out + '_5_u9.png' });
await page.evaluate(() => globalThis.BerlinLines?.U9?.exit?.(7)); await page.waitForTimeout(9000);
await page.screenshot({ path: out + '_6_street.png' });
console.log('STREET:', await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 500)));
console.log('errors', errors.length, errors.slice(0, 8)); console.log('done');
await browser.close();
