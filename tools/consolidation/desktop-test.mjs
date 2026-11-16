// Mac/desktop-bediening (16 nov 2026): WASD/pijltjes lopen, muis kijken (pointer lock), E = actie, P = telefoon.
// Usage: node desktop-test.mjs <url> <outDir>
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const [url, outDir, quality = 'midden', hour = '13'] = process.argv.slice(2);
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });   // MacBook Air, muis
await ctx.addInitScript(q => { try { localStorage.setItem('berlinLife.quality', q); } catch {} }, quality);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error' && !/CORS|Failed to load resource/.test(m.text())) errors.push('[console] ' + m.text().slice(0, 300)); });
let pass = 0, fail = 0;
const check = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(ok ? 'OK  ' : 'FOUT', name, info); };
await page.goto(url);
await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
await page.evaluate(() => document.querySelector('#startButton')?.click());
await page.waitForFunction(() => globalThis.__berlinMetroGame?.player, null, { timeout: 200000 });
await page.waitForTimeout(15000);
const shot = async name => { const s = await page.context().newCDPSession(page); const r = await s.send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); await s.detach(); };
const pos = () => page.evaluate(() => { const g = globalThis.__berlinMetroGame, p = g.player; return { x: Math.round(p.position.x * 10) / 10, z: Math.round(p.position.z), line: p.__line, st: p.__lineStation, street: !!p.__streetMode }; });
const P = () => page.evaluate(() => { const p = globalThis.__berlinMetroGame.player; return { x: p.position.x, z: p.position.z, yaw: p.yaw, pitch: p.pitch, mx: p.input.moveX, my: p.input.moveY }; });
const deskKeys = await page.evaluate(() => getComputedStyle(document.querySelector('.desk-keys')).display);
check('Mac-uitleg op het startscherm (muis)', deskKeys === 'block', deskKeys);
check('LOOK-label met muis-uitleg', await page.evaluate(() => /MUIS/.test(document.querySelector('.look-label').textContent)));
await page.mouse.click(5, 5);
// Lopen met W, dan diagonaal W+D, loslaten = stil.
let a = await P();
await page.keyboard.down('KeyW'); await page.waitForTimeout(4000);
let b = await P();
check('W = vooruit', b.my === 1 && Math.hypot(b.x - a.x, b.z - a.z) > 0.3, JSON.stringify({ a, b }));
await page.keyboard.down('KeyD'); await page.waitForTimeout(300);
let c = await P();
check('W+D = diagonaal (genormaliseerd)', Math.abs(c.my - Math.SQRT1_2) < 1e-6 && Math.abs(c.mx - Math.SQRT1_2) < 1e-6, JSON.stringify(c));
await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD'); await page.waitForTimeout(300);
c = await P(); check('loslaten = stil', c.mx === 0 && c.my === 0, JSON.stringify(c));
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(300); c = await P(); await page.keyboard.up('ArrowDown');
check('pijltje omlaag = achteruit', c.my === -1, JSON.stringify(c));
// Muis kijken: klik rechts → pointer lock, beweeg → yaw verandert, Esc → los.
a = await P();
await page.mouse.click(1100, 450);
await page.waitForTimeout(800);
const locked = await page.evaluate(() => document.pointerLockElement?.id || null);
check('klik rechts = muis vast (pointer lock)', locked === 'rightZone', locked);
// Playwright-muis geeft geen movementX → echte MouseEvent met movementX (zoals Safari/Chrome op de Mac).
await page.evaluate(() => { for (let i = 0; i < 8; i++) document.dispatchEvent(new MouseEvent('mousemove', { movementX: 12, movementY: 3, bubbles: true })); }); await page.waitForTimeout(2500);
b = await P();
check('muis bewegen = rondkijken', Math.abs(b.yaw - a.yaw) > 0.05, JSON.stringify({ a: a.yaw, b: b.yaw }));
await page.evaluate(() => document.exitPointerLock()); await page.waitForTimeout(500);
check('Esc/los = muis vrij', await page.evaluate(() => !document.pointerLockElement && !document.body.classList.contains('bl-mouselook')));
// Slepen links met de muis werkt nog (stick).
await page.mouse.move(250, 600); await page.mouse.down(); await page.mouse.move(250, 540, { steps: 5 }); await page.waitForTimeout(300);
c = await P(); await page.mouse.up();
check('muis slepen links = stick', c.my > 0.5, JSON.stringify(c));
// P = telefoon open/dicht.
await page.keyboard.press('KeyP'); await page.waitForTimeout(1200);
const ph1 = await page.evaluate(() => getComputedStyle(document.querySelector('#phoneModalV2')).display);
await shot('desktop_telefoon');
await page.keyboard.press('KeyP'); await page.waitForTimeout(1200);
const ph2 = await page.evaluate(() => getComputedStyle(document.querySelector('#phoneModalV2')).display);
check('P = telefoon open en dicht', ph1 !== 'none' && ph2 === 'none', JSON.stringify({ ph1, ph2 }));
// Typen in een invoerveld beweegt de speler niet.
await page.evaluate(() => { const i = document.createElement('input'); i.id = 'tt'; document.body.appendChild(i); i.focus(); });
await page.keyboard.down('KeyW'); await page.waitForTimeout(200); c = await P(); await page.keyboard.up('KeyW');
check('typen in een veld = niet lopen', c.my === 0, JSON.stringify(c));
await page.evaluate(() => document.querySelector('#tt').remove());
// E = actieknop (als die zichtbaar is).
const eOk = await page.evaluate(() => { const b = document.querySelector('#interactionButton'); let hit = 0; b.classList.remove('hidden'); b.addEventListener('click', () => hit++, { once: true }); document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true })); b.classList.add('hidden'); return hit; });
check('E = actieknop', eOk === 1, eOk);
await shot('desktop_spel');
console.log('resultaat', pass, '/', pass + fail);
console.log('fouten', errors.length, errors.slice(0, 6));
console.log('done');
await browser.close();
