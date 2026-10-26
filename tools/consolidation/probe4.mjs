// Street View, God Mode/economy and savegame round-trip probe (emulated iPad, touch).
// Usage: node probe4.mjs <url> <outDir>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const [url, out = './probe4'] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const t0 = Date.now(), T = () => +((Date.now() - t0) / 1000).toFixed(1);
const errors = [], steps = [];
page.on('pageerror', e => errors.push(`${T()} ${String(e.message || e).slice(0, 300)}`));
const cdp = await ctx.newCDPSession(page);

const ui = () => page.evaluate(() => {
  const vis = el => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && !el.classList.contains('hidden') && r.width > 0 && r.height > 0; };
  const btns = [...document.querySelectorAll('button')].filter(vis).map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().replace(/\s+/g, ' ').slice(0, 28), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  const overlaps = [];
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i], b = btns[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(`${a.t}|${b.t}`); }
  const g = globalThis.__berlinMetroGame, p = g?.player;
  return {
    balance: document.querySelector('#balance')?.textContent, station: document.querySelector('#stationName')?.textContent,
    street: globalThis.BerlinCleanStreet?.inspect?.() ?? null,
    iframes: [...document.querySelectorAll('iframe')].filter(vis).map(f => (f.src || '').replace(/[?#].*/, '')),
    buttons: btns.map(b => `${b.t}@${b.x},${b.y}`), overlaps,
    player: p ? { x: +p.position.x.toFixed(2), z: +(p.position.z - (p.currentStation?.z || 0)).toFixed(2), st: p.currentStation?.name } : null,
  };
});
const step = async (name, fn) => {
  let ok = true, note = '';
  try { note = (await fn()) || ''; } catch (e) { ok = false; note = e.message.split('\n')[0].slice(0, 160); }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/${String(steps.length).padStart(2, '0')}-${name}.png` });
  steps.push({ name, t: T(), ok, note, ...(page.isClosed() ? {} : await ui()) });
  console.log(`${T()} ${ok ? 'OK ' : 'ERR'} ${name} ${note}`);
};
const tapText = async re => {
  const loc = page.locator('button:visible').filter({ hasText: re }).first();
  if (!(await loc.count())) return `NO BUTTON ${re}`;
  const txt = ((await loc.textContent()) || '').trim().slice(0, 28); await loc.tap({ timeout: 5000 }); return `tapped "${txt}"`;
};
const drag = async (sel, dx, dy, ms) => {
  const box = await page.locator(sel).boundingBox(); const x = box.x + box.width / 2, y = box.y + box.height / 2, n = 12;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / n, y: y + dy * i / n }] }); await page.waitForTimeout(ms / n); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const enter = async (choiceRe) => {
  await page.waitForSelector('button.saveChoice:visible, #startButton:not([disabled])', { timeout: 300000 });
  const c = page.locator('button.saveChoice:visible').filter({ hasText: choiceRe }).first();
  let note = '';
  if (await c.count()) { note = `save: "${((await c.textContent()) || '').trim().slice(0, 40)}"`; await c.tap(); }
  await page.waitForSelector('#startButton:not([disabled])', { timeout: 120000 });
  await page.tap('#startButton'); await page.waitForTimeout(8000); return note;
};

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await step('enter-new-save', () => enter(/Nieuwe save/));
await step('god-open', () => tapText(/GOD/));
await step('god-plus-50', () => tapText(/\+€50/));
await step('god-close', () => tapText(/GOD|✕|sluit/i));
const beforeReload = steps.at(-1).balance;
await step('to-exit', async () => {
  // place the player just before the Alexanderplatz exit, then push the stick in all four directions
  await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; p.position.x = 2.6; p.position.z = p.currentStation.z + 65.0; });
  for (const [dx, dy] of [[0, -90], [0, 90], [90, 0], [-90, 0]]) { await drag('#leftZone', dx, dy, 1500); const s = await ui(); if (s.street?.active || s.iframes.length) return `street view opened (stick ${dx},${dy})`; }
  return 'street view did not open';
});
await page.waitForTimeout(4000);
await step('street-view', async () => '');
await step('sv-activities', () => tapText(/Activiteiten/));
await step('sv-activities-close', () => tapText(/✕|sluit|close|terug/i));
await step('sv-back-to-ubahn', () => tapText(/U-Bahn/));
const ls = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => !k.startsWith('metro-street-v41:')).map(k => [k, localStorage.getItem(k).length])));
await page.reload({ waitUntil: 'load' });
await step('reload-continue-save', () => enter(/^(?!.*Nieuwe)/));
const afterReload = steps.at(-1).balance;
await browser.close();
const report = { url, steps, errors, savegame: { beforeReload, afterReload, restored: beforeReload === afterReload, keys: ls } };
await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log('SAVE', JSON.stringify(report.savegame).slice(0, 400));
console.log('ERRORS', errors.length);
