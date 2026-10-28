// Fase 1 stap 7 (deel 2): opstart-wachtlussen, oud vs. nieuw.
// Telt setTimeout-wekbeurten tijdens het opstarten, welke systemen "klaar"/"time-out" melden,
// welke game-vlaggen gezet worden en welke slapers (Tick.sleep) nog wachten.
// Usage: node bootwait-probe.mjs <url> <out.json>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(() => {
  let timeouts = 0, t100 = 0; const st = window.setTimeout;
  window.setTimeout = function (fn, ms, ...a) { const m = Number(ms) || 0; return st.call(this, (...x) => { timeouts++; if (m >= 25 && m <= 100) t100++; return typeof fn === 'function' ? fn(...x) : undefined; }, ms, ...a); };
  window.__bw = () => ({ timeouts, t100 });
});
const page = await ctx.newPage();
const errors = [], msgs = new Set();
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => { const t = m.text(); if (/ready|timed out|failed|klaar|disabled/i.test(t)) msgs.add(`[${m.type()}] ${t.replace(/\d+(\.\d+)?/g, '#')}`.slice(0, 160)); });
const T0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
// Bij de save-keuze wachten de meeste opstartlussen nog: 5 s stil meten.
const m0 = await page.evaluate(() => ({ ...window.__bw(), w: window.BerlinTick?.stats?.wakeups ?? null, n: window.BerlinTick?.list?.().filter(t => t.kind === 'once').length ?? null }));
await page.waitForTimeout(5000);
const m1 = await page.evaluate(() => ({ ...window.__bw(), w: window.BerlinTick?.stats?.wakeups ?? null, n: window.BerlinTick?.list?.().filter(t => t.kind === 'once').length ?? null }));
const atSaveMenu5s = { setTimeoutCallbacks: m1.timeouts - m0.timeouts, short: m1.t100 - m0.t100, tickWakeups: m1.w == null ? null : m1.w - m0.w, sleepers: m1.n };
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
const tStart = Date.now();
const sample = () => page.evaluate(() => ({ ...window.__bw(), sleepers: window.BerlinTick?.list?.().filter(t => t.kind === 'once').map(t => t.name) ?? null, wakeups: window.BerlinTick?.stats?.wakeups ?? null }));
const flags = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame || {}; const o = {}; for (const k of Object.keys(g)) { const v = g[k]; if (/version|^__/i.test(k) && v != null && typeof v !== 'function') o[k] = typeof v === 'object' ? 'obj' : String(v); } return o; });
const s0 = await sample(); await page.waitForTimeout(10000); const s10 = await sample();
await page.waitForTimeout(Math.max(0, 70000 - (Date.now() - tStart))); const s70 = await sample();
await page.waitForTimeout(10000); const s80 = await sample();
const res = {
  bootMs: tStart - T0, atSaveMenu5s,
  first10s: { setTimeoutCallbacks: s10.timeouts - s0.timeouts, short: s10.t100 - s0.t100, tickWakeups: s10.wakeups == null ? null : s10.wakeups - s0.wakeups },
  idle10sAfter70s: { setTimeoutCallbacks: s80.timeouts - s70.timeouts, short: s80.t100 - s70.t100 },
  sleepersAtStart: s0.sleepers, sleepersAt10s: s10.sleepers, sleepersAt70s: s70.sleepers,
  flags: await flags(), messages: [...msgs].sort(), errors,
};
await fs.writeFile(out, JSON.stringify(res, null, 1));
console.log(out, '| save-menu 5 s', JSON.stringify(atSaveMenu5s), '| boot', res.bootMs, 'ms | eerste 10 s', JSON.stringify(res.first10s), '| na 70 s', JSON.stringify(res.idle10sAfter70s), '| slapers 0/10/70 s', s0.sleepers?.length, s10.sleepers?.length, s70.sleepers?.length, '| errors', errors.length);
await browser.close();
