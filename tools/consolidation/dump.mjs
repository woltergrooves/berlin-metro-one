// Starts a new save and dumps the shape of the main runtime state objects.
import { chromium, devices } from 'playwright';
const [url] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ ...devices['iPad Pro 11 landscape'] })).newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
await page.locator('button.saveChoice:visible').filter({ hasText: /Nieuwe/ }).first().tap();
await page.waitForSelector('#startButton:not([disabled])', { timeout: 120000 });
await page.tap('#startButton');
await page.waitForTimeout(12000);
const out = await page.evaluate(() => {
  const shape = (o, d = 0) => { if (o === null || typeof o !== 'object') return typeof o === 'function' ? 'fn' : JSON.stringify(o)?.slice(0, 40); if (d > 2) return Array.isArray(o) ? `[${o.length}]` : '{…}'; if (Array.isArray(o)) return `[${o.length}] ` + (o.length ? JSON.stringify(shape(o[0], d + 1)).slice(0, 120) : ''); return Object.fromEntries(Object.keys(o).slice(0, 40).map(k => [k, shape(o[k], d + 1)])); };
  const g = globalThis.__berlinMetroGame;
  const ls = Object.fromEntries(Object.keys(localStorage).filter(k => !k.startsWith('metro-street-v41:')).map(k => { let v = localStorage.getItem(k); try { v = shape(JSON.parse(v)); } catch { v = v.slice(0, 60); } return [k, v]; }));
  return {
    phase34Economy: shape(globalThis.BerlinPhase34?.economy), lifeState: shape(globalThis.BerlinLife?.state), time: globalThis.__berlinMetroTime?.minutes,
    saveSlots: shape(globalThis.BerlinSaveSlots), gameKeys: g ? Object.keys(g).slice(0, 80) : null,
    station: g?.player?.currentStation ? { name: g.player.currentStation.name, line: g.player.currentStation.line, id: g.player.currentStation.id } : null,
    economySystem: shape(g?.economy || g?.economySystem), localStorage: ls,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
