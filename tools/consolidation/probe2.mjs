import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const [url, out = './probe', waitMs = '20000'] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const t0 = Date.now(), T = () => ((Date.now() - t0) / 1000).toFixed(1);
const log = [], requests = [], errors = [];
page.on('requestfinished', async r => { const res = await r.response(); requests.push({ t: T(), url: r.url(), status: res?.status(), type: r.resourceType() }); });
page.on('requestfailed', r => requests.push({ t: T(), url: r.url(), status: 'FAILED ' + r.failure()?.errorText }));
page.on('console', m => log.push(`${T()} [${m.type()}] ${m.text()}`.slice(0, 300)));
page.on('pageerror', e => errors.push(`${T()} ${String(e.stack || e).slice(0, 600)}`));
const snap = async name => {
  await page.screenshot({ path: `${out}/${name}.png` });
  return page.evaluate(() => {
    const vis = el => { if (!el) return false; const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && !el.classList.contains('hidden') && el.getClientRects().length > 0; };
    return {
      buttons: [...document.querySelectorAll('button')].filter(vis).map(b => `${b.id || b.className.split(' ')[0]}${b.disabled ? '(dis)' : ''}:${b.textContent.trim().replace(/\s+/g, ' ').slice(0, 25)}`),
      canvases: document.querySelectorAll('canvas').length, hud: vis(document.querySelector('#hud')), boot: vis(document.querySelector('#boot')),
      station: document.querySelector('#stationName')?.textContent, status: document.querySelector('#trainStatus')?.textContent, hint: document.querySelector('#hint')?.textContent,
      balance: document.querySelector('#balance')?.textContent, ls: Object.keys(localStorage),
    };
  });
};
const steps = {};
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
steps.boot = { t: T(), ...(await snap('01-boot')) };
try { await page.waitForSelector('#startButton:not([disabled])', { timeout: 120000 }); steps.ready = T(); } catch { steps.ready = 'TIMEOUT'; }
steps.beforeStart = { t: T(), ...(await snap('02-ready')) };
try { await page.tap('#startButton', { timeout: 5000 }); } catch (e) { errors.push('START ' + e.message.slice(0, 200)); }
await page.waitForTimeout(3000);
steps.afterStart = { t: T(), ...(await snap('03-after-start')) };
const choice = page.locator('button.saveChoice, button:has-text("Nieuwe save")').first();
if (await choice.count()) { try { await choice.tap({ timeout: 5000 }); steps.saveChoice = T(); } catch (e) { errors.push('SAVE ' + e.message.slice(0, 200)); } }
await page.waitForTimeout(Number(waitMs));
steps.ingame = { t: T(), ...(await snap('04-ingame')) };
await browser.close();
const byHost = {};
for (const r of requests) { try { const h = new URL(r.url).host.replace('-wolter1.vercel.app', ''); byHost[h] = (byHost[h] || 0) + 1; } catch {} }
const report = { url, steps, byHost, failed: requests.filter(r => !(r.status >= 200 && r.status < 400)), errors, log, requests };
await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ steps, nreq: requests.length, failed: report.failed.length, errors: errors.length }));
