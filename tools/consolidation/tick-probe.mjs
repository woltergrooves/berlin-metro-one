// Fase 1 stap 7 (deel 1): telt losse timers en wekbeurten bij een nieuwe save, oud vs. nieuw.
// Usage: node tick-probe.mjs <url> <out.json>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(() => {
  // Elke setInterval tellen (aangemaakt, gestopt, aantal keer afgegaan) en elke timer-wekbeurt.
  const live = new Map(); let fired = 0, timeouts = 0;
  const si = window.setInterval, ci = window.clearInterval, st = window.setTimeout;
  window.setInterval = function (fn, ms, ...a) {
    const where = (new Error().stack.split('\n')[2] || '').replace(/.*\/src\//, '').replace(/\)$/, '');
    const id = si.call(this, (...x) => { fired++; return typeof fn === 'function' ? fn(...x) : undefined; }, ms, ...a);
    live.set(id, { ms, where }); return id;
  };
  window.clearInterval = function (id) { live.delete(id); return ci.call(this, id); };
  window.setTimeout = function (fn, ms, ...a) { return st.call(this, (...x) => { timeouts++; return typeof fn === 'function' ? fn(...x) : undefined; }, ms, ...a); };
  window.__timerProbe = () => ({ liveIntervals: [...live.values()], fired, timeouts });
});
const page = await ctx.newPage();
const errors = [], logs = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error' || /Berlin Tick|timed out/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`.slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => window.BerlinBuildStatus?.hybridActivities === 6, null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(8000);

const sample = async () => page.evaluate(() => ({ ...window.__timerProbe(), tick: window.BerlinTick ? { ...window.BerlinTick.stats, list: window.BerlinTick.list() } : null }));
const ui = () => page.evaluate(() => ({
  chip: document.querySelector('#bl-chip')?.textContent, clock: window.BerlinState?.clock?.label ?? window.BerlinState?.snapshot?.().time,
  hud: ['#bl-chip', '#phoneButtonV2', '#bc-invite', '#metroHighlightPin', '#highlightRouteHudV2'].map(s => [s, !!document.querySelector(s)]),
}));
const a = await sample(), uiA = await ui();
await page.waitForTimeout(10000);
const b = await sample(), uiB = await ui();
// Tabblad verbergen: herhalende taken horen te pauzeren.
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
const h0 = await sample(); await page.waitForTimeout(5000); const h1 = await sample();
await page.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(3000); const v = await sample();

const res = {
  liveIntervals: b.liveIntervals.length, intervalList: b.liveIntervals,
  per10s: { intervalCallbacks: b.fired - a.fired, setTimeoutCallbacks: b.timeouts - a.timeouts, tickWakeups: b.tick ? b.tick.wakeups - a.tick.wakeups : null },
  hidden5s: { intervalCallbacks: h1.fired - h0.fired, tickWakeups: h1.tick ? h1.tick.wakeups - h0.tick.wakeups : null },
  afterVisible3s: { tickWakeups: v.tick ? v.tick.wakeups - h1.tick.wakeups : null, intervalCallbacks: v.fired - h1.fired },
  tickTasks: b.tick?.list ?? null, ui: [uiA, uiB], errors, logs,
};
await fs.writeFile(out, JSON.stringify(res, null, 1));
console.log(out, 'intervals', res.liveIntervals, '| per 10 s', JSON.stringify(res.per10s), '| verborgen 5 s', JSON.stringify(res.hidden5s), '| tick-taken', res.tickTasks?.length ?? '-', '| errors', errors.length);
await browser.close();
