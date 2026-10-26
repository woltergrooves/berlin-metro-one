// Fase 1 stap 6: vergelijkt de opstart (geladen modules, console-meldingen, BuildStatus, globals).
// Usage: node boot-probe.mjs <url> <out.json>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const t0 = Date.now(); const T = () => +((Date.now() - t0) / 1000).toFixed(1);
const logs = [], errors = [], modules = [], failed = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`.slice(0, 200)));
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/src/') && u.pathname.endsWith('.js')) modules.push(u.pathname); });
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
const saveChoiceAt = T();
await page.evaluate(() => [...document.querySelectorAll('button.saveChoice, button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
const coreReadyAt = T();
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => document.querySelector('#hud') && !document.querySelector('#hud').classList.contains('hidden'), null, { timeout: 60000 }).catch(() => {});
await page.waitForFunction(() => window.BerlinBuildStatus?.hybridActivities === 6 && !!(window.BerlinGameState || window.GameState || window.Berlin?.state), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(4000);
const snap = await page.evaluate(() => ({
  build: window.BerlinBuildStatus,
  hudVisible: !document.querySelector('#hud')?.classList.contains('hidden'), station: document.querySelector('#stationName')?.textContent, balance: document.querySelector('#balance')?.textContent,
  start: { text: document.querySelector('#startButton')?.textContent, disabled: document.querySelector('#startButton')?.disabled, coreReady: document.querySelector('#startButton')?.dataset.coreReady },
  globals: Object.keys(window).filter(k => /^(Berlin|Metro|Game|game|phase|Phase)/i.test(k)).sort(),
}));
await fs.writeFile(out, JSON.stringify({ saveChoiceAt, coreReadyAt, snap, errors, failed, logs: logs.filter(l => !l.includes('THREE')), modules: [...new Set(modules)] }, null, 1));
console.log(out, 'coreReady', coreReadyAt, 's; modules', new Set(modules).size, '; errors', errors.length);
await browser.close();
