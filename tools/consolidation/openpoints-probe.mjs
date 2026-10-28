// Fase 1 open punten: oud vs. nieuw.
// Start een nieuwe save en meet: welke opstart-wachtlussen na 30 s en 75 s nog lopen, streetOutdoorVersion,
// stations.consistency, Hinterhof-validatie, relevante console-regels en fouten.
// Usage: node openpoints-probe.mjs <url> <out.json>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const errors = [], lines = [];
const t0 = Date.now(), T = () => +((Date.now() - t0) / 1000).toFixed(1);
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') errors.push('[console] ' + t.slice(0, 200));
  if (/timed out|8\.4|8\.5|consistency|station refs|Hinterhof|Universal exits/i.test(t)) lines.push(`${T()} [${m.type()}] ${t.slice(0, 160)}`);
});
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
const tSave = Date.now();
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
const snap = () => page.evaluate(() => {
  const g = globalThis.__berlinMetroGame || {};
  const tasks = globalThis.BerlinTick?.list?.() ?? [];
  return {
    sinceSaveS: null,
    streetOutdoorVersion: g.streetOutdoorVersion ?? null,
    stationArchitectureVersion: g.stationArchitectureVersion ?? null,
    bootWaits: [...new Set(tasks.filter(t => /^boot\./.test(t.name)).map(t => t.name))].sort(),
    untilTasks: tasks.filter(t => t.kind === 'until').map(t => t.name),
    consistency: globalThis.BerlinStationConsistency ?? null,
    hinterhof: globalThis.BerlinHinterhofLocation?.validate?.() ?? null,
    hooks: globalThis.BerlinTick?.frames?.().length ?? null,
  };
});
const at = async s => { const w = tSave + s * 1000 - Date.now(); if (w > 0) await page.waitForTimeout(w); const r = await snap(); r.sinceSaveS = s; return r; };
const s30 = await at(30), s75 = await at(75);
const res = { s30, s75, lines, errors };
await fs.writeFile(out, JSON.stringify(res, null, 1));
console.log(out, '| street', s75.streetOutdoorVersion, '| bootwachters@30s', s30.bootWaits.length, '@75s', s75.bootWaits.length,
  '| consistency', s75.consistency ? (s75.consistency.skipped ? 'overgeslagen' : `bad=${s75.consistency.bad?.length}`) : 'geen',
  '| hinterhof ok', s75.hinterhof?.ok, '| fouten', errors.length);
await browser.close();
