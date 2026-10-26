// Gameplay probe: boots the game on an emulated iPad (touch), starts a new save, enters the world,
// walks with the left thumb-stick, looks with the right zone, then visits the main UI surfaces
// (phone, Street View, activities, back to U-Bahn) and records what is visible after each step.
// Run against the live reference and the consolidated build; compare the step logs.
// Usage: node probe3.mjs <url> <outDir>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const [url, out = './probe3'] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const t0 = Date.now(), T = () => +((Date.now() - t0) / 1000).toFixed(1);
const log = [], errors = [], failed = [], steps = [];
page.on('console', m => log.push(`${T()} [${m.type()}] ${m.text()}`.slice(0, 300)));
page.on('pageerror', e => errors.push(`${T()} ${String(e.message || e).slice(0, 300)}`));
page.on('requestfailed', r => failed.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

const state = () => page.isClosed() ? Promise.resolve({ closed: true }) : page.evaluate(() => {
  const vis = el => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && !el.classList.contains('hidden') && r.width > 0 && r.height > 0; };
  const btns = [...document.querySelectorAll('button,[role=button]')].filter(vis).map(b => { const r = b.getBoundingClientRect(); return { id: b.id || b.className.toString().split(' ')[0], text: b.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), dis: !!b.disabled, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  // overlapping visible buttons (regression guard for the Street View UI)
  const overlaps = [];
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i], b = btns[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(`${a.text}|${b.text}`); }
  const iframes = [...document.querySelectorAll('iframe')].filter(vis).map(f => (f.src || '').replace(/[?#].*/, '').slice(0, 80));
  return {
    hud: vis(document.querySelector('#hud')), boot: vis(document.querySelector('#boot')), canvases: [...document.querySelectorAll('canvas')].filter(vis).length,
    station: document.querySelector('#stationName')?.textContent, status: document.querySelector('#trainStatus')?.textContent,
    hint: document.querySelector('#hint')?.textContent, balance: document.querySelector('#balance')?.textContent,
    buttons: btns.map(b => `${b.id}${b.dis ? '(dis)' : ''}:${b.text}@${b.x},${b.y}`), overlaps, iframes,
    saveKeys: Object.keys(localStorage).filter(k => !k.startsWith('metro-street-v41:')).sort(),
  };
});
const shot = async name => { const buf = await page.screenshot({ path: `${out}/${String(steps.length).padStart(2, '0')}-${name}.png` }); return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10); };
const step = async (name, fn) => {
  let ok = true, note = '';
  try { note = (await fn()) || ''; } catch (e) { ok = false; note = e.message.split('\n')[0].slice(0, 200); }
  await page.waitForTimeout(2500);
  steps.push({ name, t: T(), ok, note, shot: await shot(name), ...(await state()) });
  console.log(`${T()} ${ok ? 'OK ' : 'ERR'} ${name} ${note}`);
};
const tapText = async (re, opts = {}) => {
  const loc = page.locator('button:visible,[role=button]:visible').filter({ hasText: re }).first();
  if (!(await loc.count())) return `no button matching ${re}`;
  const txt = ((await loc.textContent()) || '').trim().slice(0, 30); await loc.tap({ timeout: 5000, ...opts }); return `tapped "${txt}"`;
};
// touch drag via CDP so that real touch events (touchstart/move/end) reach the game
const cdp = await ctx.newCDPSession(page);
const drag = async (sel, dx, dy, ms = 1500) => {
  const box = await page.locator(sel).boundingBox(); if (!box) return `no ${sel}`;
  const x = box.x + box.width / 2, y = box.y + box.height / 2, n = 15;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / n, y: y + dy * i / n }] }); await page.waitForTimeout(ms / n); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  return `dragged ${sel} by ${dx},${dy}`;
};

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await step('boot', async () => {});
await step('ready', async () => { await page.waitForSelector('button.saveChoice:visible, #startButton:not([disabled])', { timeout: 300000 }); });
await step('new-save', async () => tapText(/Nieuwe save/));
await step('start-again', async () => { await page.waitForSelector('#startButton:not([disabled]):visible', { timeout: 120000 }).catch(() => {}); if (await page.locator('#startButton:visible').count()) { await page.tap('#startButton'); return 'tapped Start'; } return 'no start button'; });
await step('in-world', async () => { await page.waitForTimeout(8000); });
const before = steps.at(-1).shot;
await step('walk-forward', async () => drag('#leftZone', 0, -90, 2500));
await step('look-right', async () => drag('#rightZone', 160, 0, 1200));
steps.at(-1).note += ` | view changed vs before walking: ${steps.at(-1).shot !== before}`;
await step('phone', async () => tapText(/📱|telefoon|phone/i));
await step('phone-close', async () => tapText(/sluit|close|✕|×|terug/i));
await step('street-view', async () => tapText(/street|buiten|naar buiten|🌍|📍/i));
await step('activities', async () => tapText(/activiteit/i));
await step('activities-close', async () => tapText(/sluit|close|✕|×/i));
await step('back-to-ubahn', async () => tapText(/U-Bahn/i));
await step('save-check', async () => {});
await browser.close();

const report = { url, steps, errors, failed: [...new Set(failed)], log };
await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log('ERRORS', errors.length, 'FAILED', report.failed.length);
