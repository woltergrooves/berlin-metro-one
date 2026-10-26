// Wallet/savegame probe (Game State 2.0 stap 2+3). Usage: node wallet-probe.mjs <url> [full|short]
// Verwacht na stap 3: 85 + 10 - 2 + 5 = €98,00 in elke bron, ook na herladen; nieuwe save = €85 en v4cash 0.
// reload + continue, slot switch. Prints every money source after each step.
import { chromium, devices } from 'playwright';
const [url, mode = 'full'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
const logs = [];
const cerr = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') cerr.push(m.text().slice(0, 300)); if (/Save|State|wallet|Wallet|save/i.test(m.text())) logs.push(m.text().slice(0, 200)); });

async function boot(choice) {
  await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
  const labels = await page.locator('button.saveChoice:visible').allInnerTexts();
  await page.locator('button.saveChoice:visible').filter({ hasText: choice }).first().tap();
  await page.waitForSelector('#startButton:not([disabled])', { timeout: 180000 });
  await page.tap('#startButton');
  await page.waitForFunction(() => globalThis.__berlinMetroGame?.metroEconomy && globalThis.BerlinPhase34?.economy, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  return labels.map(l => l.replace(/\n/g, ' | '));
}
const read = (label) => page.evaluate((label) => {
  const g = globalThis.__berlinMetroGame, E = globalThis.BerlinPhase34?.economy;
  const j = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const slot = globalThis.BerlinSaveSlots?.active;
  return {
    step: label, v2home: j('metro-economy-v2')?.home?.day ?? null, v2keys: Object.keys(j('metro-economy-v2') || {}).length,
    hud: document.querySelector('#balance')?.textContent,
    game: g?.economy?.balanceCents, v2obj: g?.metroEconomy?.balanceCents,
    v2store: j('metro-economy-v2')?.balanceCents, lifeStore: j('berlinLifeCoreV1')?.economy?.balanceCents,
    v4: E ? (E.cash || 0) + (E.bank || 0) : null, v4cash: E?.cash, v4store: (() => { const x = j(`berlin-economy-v4@${slot}`); return x ? (x.cash || 0) + (x.bank || 0) : null; })(),
    wallet: globalThis.BerlinState?.wallet?.cents ?? null, slot,
  };
}, label);

const rows = [];
await page.goto(url, { waitUntil: 'load' });
rows.push({ labels: await boot(/Nieuwe/) });
rows.push(await read('1 nieuwe save'));
await page.evaluate(() => globalThis.__berlinMetroGame.economy.earn(1000, 'Shift loon'));
rows.push(await read('2 earn €10 via EconomySystem'));
await page.evaluate(() => { const g = globalThis.__berlinMetroGame, s = g.metroEconomy; s.balanceCents -= 200; localStorage.setItem('metro-economy-v2', JSON.stringify(s)); g.economy.balanceCents = s.balanceCents; g.ui?.updateEconomy?.({ balanceCents: s.balanceCents }); });
rows.push(await read('3 spend €2 via v2-object (winkel-patroon)'));
await page.evaluate(() => globalThis.__berlinMetroGame.economy.earn(500, 'Fooi'));
rows.push(await read('4 earn €5 fooi'));
await page.waitForTimeout(2500);
await page.reload({ waitUntil: 'load' });
rows.push({ labels: await boot(/Doorgaan/) });
rows.push(await read('5 na herladen + doorgaan'));
if (mode === 'full') {
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'load' });
  rows.push({ labels: await boot(/Nieuwe/) });
  rows.push(await read('6 opnieuw nieuwe save'));
}
console.log(JSON.stringify({ rows, errors: [...new Set(errors)].slice(0, 15), logs: logs.slice(-15), consoleErrors: [...new Set(cerr)] }, null, 1));
await browser.close();
