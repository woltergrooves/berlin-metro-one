// Probe fase 1 stap 5 deel 2 (Jobs, GodMenu, Phase16). Usage: node jobs-god-probe.mjs <url>
// Nieuwe save → GOD-knoppen tellen, menu openen, teleport, tijdknop → bezorgjob aannemen en
// afleveren → tweede job laten verlopen → straatoverlay openen (bezoekteller, zichtbare panelen).
import { chromium, devices } from 'playwright';
const [url] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(() => { const si = window.setInterval; window.__intervals = 0; window.setInterval = (...a) => { window.__intervals++; return si(...a); }; });
const page = await ctx.newPage();
const errors = [], metro = [], notes = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { const t = m.text(); if (/\[Metro\].*(disabled|failed)/i.test(t)) metro.push(t); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
await page.locator('button.saveChoice:visible').filter({ hasText: /Nieuwe/ }).first().tap();
await page.waitForSelector('#startButton:not([disabled])', { timeout: 180000 });
await page.tap('#startButton');
await page.waitForFunction(() => globalThis.__berlinMetroGame?.metroEconomy?.home && document.querySelector("#god3"), null, { timeout: 400000 });
await page.waitForTimeout(5000);
await page.evaluate(() => { const g = globalThis.__berlinMetroGame, n = g.ui.notify.bind(g.ui); window.__notes = []; g.ui.notify = (t, ...a) => { window.__notes.push(String(t)); return n(t, ...a); }; });

const vis = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length, sel);
const out = {};
out.start = await page.evaluate(() => ({ intervals: window.__intervals, godVersion: globalThis.__berlinMetroGame.godMenuVersion,
  ids: ['god', 'gp', 'god2', 'gp2', 'god3', 'gp3', 'jobAction161', 'deliveryHud161', 'jobActionV2', 'surfaceGameplayV2'].filter(id => document.getElementById(id)) }));
out.start.godButtonsVisible = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => /GOD/.test(b.textContent) && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0).map(b => b.id));

// GOD-menu
await page.tap('#god3');
out.god = { open: await page.evaluate(() => document.querySelector('#gp3')?.classList.contains('on')), tools: await page.evaluate(() => [...document.querySelectorAll('#tools3 button')].map(b => b.textContent.trim())) };
const t0 = await page.evaluate(() => globalThis.__berlinMetroTime?.minutes ?? globalThis.BerlinClock?.minuteOfDay?.());
await page.locator('#tools3 button').nth(1).tap();
out.god.timeAfterPlus1h = await page.evaluate(() => globalThis.__berlinMetroTime?.minutes ?? globalThis.BerlinClock?.minuteOfDay?.());
out.god.timeBefore = t0;
await page.locator('#list3 button').nth(3).tap();
await page.waitForTimeout(800);
out.god.afterTeleport = await page.evaluate(() => ({ panelOpen: document.querySelector('#gp3')?.classList.contains('on'), z: Math.round(globalThis.__berlinMetroGame.player.position.z) }));

// Bezorgjob
const street = name => page.evaluate(name => { const g = globalThis.__berlinMetroGame; g.player.__streetMode = true; document.dispatchEvent(new CustomEvent('metro-street-cell', { detail: { ctx: { name, line: 'U2' } } })); }, name);
const job = () => page.evaluate(() => { const s = globalThis.__berlinMetroGame.metroEconomy; return { status: s.activeDelivery?.status ?? null, to: s.activeDelivery?.to ?? null, stats: { ...s.jobStats }, cents: s.balanceCents, pkg: s.surfaceItems?.delivery_package ?? 0 }; });
await street('Alexanderplatz');
await page.waitForTimeout(1500);
out.jobs = { panelsAtAlex: { v2: await vis('#jobActionV2'), v1: await vis('#jobAction161') } };
const before = await job();
await page.evaluate(() => document.querySelector('#acceptJobV2')?.click());
await page.waitForTimeout(500);
const accepted = await job();
await street(accepted.to);
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('#deliverJobV2')?.click());
await page.waitForTimeout(500);
const delivered = await job();
out.jobs.flow = { before, accepted, delivered, paid: delivered.cents - before.cents, walletSame: await page.evaluate(() => globalThis.BerlinState?.wallet?.cents ?? globalThis.BerlinState?.snapshot?.().money?.cents ?? null) };
await street('Alexanderplatz');
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('#acceptJobV2')?.click());
await page.evaluate(() => { globalThis.__berlinMetroGame.metroEconomy.activeDelivery.expiresAt = Date.now() - 1000; });
const t1 = Date.now();
await page.waitForFunction(() => globalThis.__berlinMetroGame.metroEconomy.activeDelivery?.status !== 'active', null, { timeout: 60000 }).catch(() => {});
out.jobs.expiryMs = Date.now() - t1;
out.jobs.expired = await job();
await page.evaluate(() => { globalThis.__berlinMetroGame.player.__streetMode = false; document.dispatchEvent(new CustomEvent('metro-street-cell', { detail: { ctx: null } })); });

// Straatoverlay
const visits = () => page.evaluate(() => globalThis.__berlinMetroGame.metroEconomy.surfaceVisited?.['U2:Senefelderplatz'] ?? 0);
const v0 = await visits();
await page.evaluate(() => globalThis.__berlinMetroGame.__allStreetOverlay?.open({ line: 'U2', name: 'Senefelderplatz', id: 'senefelderplatz' }).catch(e => e.message));
await page.waitForTimeout(2500);
out.street = { hasOverlay: await page.evaluate(() => !!globalThis.__berlinMetroGame.__allStreetOverlay), visitsAdded: (await visits()) - v0,
  surfacePanels: { v2: await vis('#surfaceGameplayV2'), returnBtn: await vis('#streetReturnOnlyV1') },
  phase16Version: await page.evaluate(() => globalThis.__berlinMetroGame.phase16Version) };
await page.evaluate(() => globalThis.__berlinMetroGame.__allStreetOverlay?.close());
await page.waitForTimeout(1000);
out.end = await page.evaluate(() => ({ intervals: window.__intervals, notes: window.__notes }));
for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v));
console.log('metro-meldingen', metro);
console.log('errors', errors);
await browser.close();
