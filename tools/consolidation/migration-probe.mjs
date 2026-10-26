// Migratietest stap 2+3: speel op de OUDE versie tot de geldbronnen uit elkaar lopen, neem de
// volledige localStorage mee naar de NIEUWE versie en kies "Doorgaan".
// Usage: node migration-probe.mjs <oude-url> <nieuwe-url>
// Verwacht: nieuwe versie toont hetzelfde saldo als de oude na herladen (oude regel: metro-economy-v2 wint),
// alle bronnen gelijk, en een reservekopie van het oude register.
import { chromium, devices } from 'playwright';
const [oldUrl, newUrl] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function boot(page, choice) {
  await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
  const labels = await page.locator('button.saveChoice:visible').allInnerTexts();
  await page.locator('button.saveChoice:visible').filter({ hasText: choice }).first().tap();
  await page.waitForSelector('#startButton:not([disabled])', { timeout: 180000 });
  await page.tap('#startButton');
  await page.waitForFunction(() => globalThis.__berlinMetroGame?.metroEconomy && globalThis.BerlinPhase34?.economy, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  return labels.map(l => l.replace(/\n/g, ' | '));
}
const money = page => page.evaluate(() => {
  const g = globalThis.__berlinMetroGame, E = globalThis.BerlinPhase34?.economy, j = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  return { hud: document.querySelector('#hudMoneyV1')?.textContent || document.querySelector('#balance')?.textContent, game: g.economy.balanceCents, v2: g.metroEconomy.balanceCents, v4: (E.cash || 0) + (E.bank || 0), wallet: globalThis.BerlinState?.wallet?.cents ?? null, klok: globalThis.BerlinClock ? globalThis.BerlinClock.dayNumber+' '+globalThis.BerlinClock.weekdayName+' '+globalThis.BerlinClock.hhmm+' ('+globalThis.BerlinClock.source+')' : 'life '+JSON.stringify(globalThis.BerlinLife?.state?.clock),
    registryFormat: j('berlin-save-slots-v1')?.format ?? null, backup: !!localStorage.getItem('berlin-save-slots-v1.before-format-2'), consistency: globalThis.BerlinState?.consistency?.() };
});

// 1. oude versie
const ctxA = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const a = await ctxA.newPage();
await a.goto(oldUrl, { waitUntil: 'load' });
await boot(a, /Nieuwe/);
await a.evaluate(() => { const g = globalThis.__berlinMetroGame; g.economy.earn(1000, 'Shift loon'); const s = g.metroEconomy; s.balanceCents -= 200; localStorage.setItem('metro-economy-v2', JSON.stringify(s)); g.economy.balanceCents = s.balanceCents; g.economy.earn(500, 'Fooi'); });
await a.waitForTimeout(2500);
const before = await money(a);
await a.reload({ waitUntil: 'load' });
const oldLabels = await boot(a, /Doorgaan/);
const oldAfter = await money(a);
await a.waitForTimeout(2500);
const storage = await a.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
await ctxA.close();

// 2. nieuwe versie met dezelfde opslag
const ctxB = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctxB.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, storage);
const b = await ctxB.newPage();
const errors = [];
b.on('pageerror', e => errors.push(e.message));
await b.goto(newUrl, { waitUntil: 'load' });
const newLabels = await boot(b, /Doorgaan/);
const newAfter = await money(b);
await b.reload({ waitUntil: 'load' });
await boot(b, /Doorgaan/);
const newAgain = await money(b);
console.log(JSON.stringify({ before, oldLabels, oldAfter, newLabels, newAfter, newAgain, errors }, null, 1));
await browser.close();
