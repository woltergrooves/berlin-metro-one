// Probe fase 1 stap 5 deel 1 (Contacts/Guide/Phone). Usage: node contacts-probe.mjs <url>
// Nieuwe save → telefoonknoppen tellen → telefoon + tabbladen → Miro ontmoeten → slapen
// → dagbericht + badge → herladen. Telt ook setInterval-aanroepen en opstartfouten.
import { chromium, devices } from 'playwright';
const [url] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
await ctx.addInitScript(() => { const si = window.setInterval; window.__intervals = 0; window.setInterval = (...a) => { window.__intervals++; return si(...a); }; });
const page = await ctx.newPage();
const errors = [], metro = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { const t = m.text(); if (/\[Metro\].*(disabled|failed)/i.test(t)) metro.push(t); });

async function boot(choice) {
  await page.waitForSelector('button.saveChoice:visible', { timeout: 300000 });
  await page.locator('button.saveChoice:visible').filter({ hasText: choice }).first().tap();
  await page.waitForSelector('#startButton:not([disabled])', { timeout: 180000 });
  await page.tap('#startButton');
  await page.waitForFunction(() => globalThis.__berlinMetroGame?.metroEconomy?.home && document.querySelector('#phoneBtnV2'), null, { timeout: 180000 });
  await page.waitForTimeout(4000);
}
const state = step => page.evaluate(step => {
  const g = globalThis.__berlinMetroGame, s = g.metroEconomy, vis = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).display !== 'none' : null; };
  return { step, day: s.home?.day, intervals: window.__intervals,
    knoppen: { phoneV2: vis('#phoneBtnV2'), phoneV1: vis('#phoneBtnV1'), guideV1: vis('#guideBtnV1'), talkV1: !!document.querySelector('#contactTalkV1'), talkV2: !!document.querySelector('#contactTalkV2') },
    versies: { contacts: g.contactsVersion, phone: g.phoneVersion, guide: g.guideVersion ?? null },
    badge: document.querySelector('#phoneBadgeV2')?.textContent || '',
    miro: s.contacts?.miro, berichten: (s.messages || []).filter(m => m.from === 'miro').map(m => `${m.day}:${m.read ? '' : '●'}${m.text}`) };
}, step);
const phoneTab = async tab => { await page.tap('#phoneBtnV2'); await page.tap(`#phoneNavV2 button[data-tab="${tab}"]`); const t = (await page.innerText('#phoneBodyV2')).replace(/\s+/g, ' ').slice(0, 160); await page.tap('#phoneCloseV2'); return t; };

const rows = [];
await page.goto(url, { waitUntil: 'load' });
await boot(/Nieuwe/);
rows.push(await state('1 nieuwe save'));
const tabs = {};
for (const t of ['home', 'jobs', 'map', 'contacts', 'places']) tabs[t] = await phoneTab(t);
rows.push({ tabs });
await page.evaluate(() => { const s = globalThis.__berlinMetroGame.metroEconomy; s.contacts ??= {}; s.contacts.miro ??= {}; Object.assign(s.contacts.miro, { met: true, relationship: 1, lastTalkDay: s.home.day }); localStorage.setItem('metro-economy-v2', JSON.stringify(s)); document.dispatchEvent(new CustomEvent('metro-contacts-changed')); });
rows.push(await state('2 Miro ontmoet'));
await page.evaluate(() => globalThis.BerlinClock.nextMorning(8));
await page.waitForTimeout(2500);
rows.push(await state('3 geslapen'));
rows.push({ chats: await phoneTab('contacts') });
rows.push(await state('4 chats gelezen'));
await page.waitForTimeout(2500);
await page.reload({ waitUntil: 'load' });
await boot(/Doorgaan/);
rows.push(await state('5 na herladen'));
for (const r of rows) console.log(JSON.stringify(r));
console.log('metro-meldingen', metro);
console.log('errors', errors);
await browser.close();
