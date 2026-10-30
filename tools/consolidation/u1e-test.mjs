// U1e + StreetScreen: U1-uitgangstrap → Street View → buurt/plek/kopen → terug op het perron; U2-uitgang → terug op de U2.
// Usage: node u1e-test.mjs <url> <outdir> [kwaliteit] [u1-index]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const [url, out, quality = 'laag', idxArg = '9'] = process.argv.slice(2);
const IDX = +idxArg;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, info = '') => { results.push(`${ok ? 'OK  ' : 'FOUT'} ${name} ${info}`); console.log(results.at(-1)); };
for (const dev of ['iPad Pro 11 landscape', 'iPhone 13']) {
  const ctx = await browser.newContext({ ...devices[dev] });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(q => { try { localStorage.setItem('berlin-quality', q); } catch {} }, quality);
  await page.goto(url);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Nieuwe save/.test(b.textContent)), null, { timeout: 300000 });
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nieuwe save/.test(b.textContent))?.click());
  await page.waitForFunction(() => window.BerlinCoreReady === true, null, { timeout: 300000 });
  await page.evaluate(() => document.querySelector('#startButton')?.click());
  await page.waitForFunction(() => globalThis.BerlinStreet?.status().installed && globalThis.BerlinLines?.U1?.status().installed, null, { timeout: 300000 });
  await page.waitForTimeout(4000);
  const tag = dev.startsWith('iPad') ? 'ipad' : 'iphone';
  // 1. U1: naar het perron, naast de open kant van de uitgangstrap, de trap in lopen.
  await page.evaluate(i => { const U1 = globalThis.BerlinLines.U1; U1.enter(i, { at: 'exit' }); const p = globalThis.__berlinMetroGame.player; p.yaw = Math.PI / 2; p.input.moveY = 1; p.input.moveX = 0; }, IDX);
  try { await page.waitForFunction(() => globalThis.__berlinMetroGame.player.__streetMode === true, null, { timeout: 90000 }); } catch {}
  await page.evaluate(() => { globalThis.__berlinMetroGame.player.input.moveY = 0; });
  const s1 = await page.evaluate(() => ({ street: globalThis.__berlinMetroGame.player.__streetMode, ctx: globalThis.__berlinMetroGame.__allStreetOverlay.context, frame: globalThis.__berlinMetroGame.__allStreetOverlay.frame.src }));
  check(`${tag}: trap op → Street View`, s1.street === true, `${s1.ctx?.name} ${s1.frame.slice(0, 80)}`);
  check(`${tag}: echte coördinaten`, /cbll=52\.49/.test(s1.frame), '');
  await page.waitForFunction(() => globalThis.BerlinStreet.status().places > 0, null, { timeout: 30000 }).catch(() => {});
  const st = await page.evaluate(() => globalThis.BerlinStreet.status());
  check(`${tag}: buurtpakket`, st.places > 5, `plekken ${st.places}`);
  const hud = await page.evaluate(() => { const r = document.querySelector('#bls'); return { on: r.classList.contains('on'), txt: r.innerText.replace(/\s+/g, ' ') }; });
  check(`${tag}: HUD zichtbaar`, hud.on && /€/.test(hud.txt), hud.txt.slice(0, 90));
  await page.screenshot({ path: `${out}/${tag}-1-hud.png` });
  // 2. Buurt openen
  await page.click('#bls .buurt'); await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${tag}-2-buurt.png` });
  // 3. Eerste Späti/bakker/imbiss: erheen lopen en iets kopen.
  const buy = await page.evaluate(async () => {
    const B = globalThis.BerlinStreet, p = B.pack(), i = p.places.findIndex(x => ['spati', 'bakery', 'imbiss', 'cafe', 'super'].includes(x.kind));
    const before = globalThis.BerlinState.clock.hhmm; B.go(i); await new Promise(r => setTimeout(r, 400));
    const m0 = globalThis.__berlinMetroGame.metroEconomy?.balanceCents;
    const btn = document.querySelector('#bls-sheet [data-buy]'); btn?.click(); await new Promise(r => setTimeout(r, 300));
    return { i, name: p.places[i]?.name, kind: p.places[i]?.kind, before, after: globalThis.BerlinState.clock.hhmm, m0, m1: globalThis.__berlinMetroGame.metroEconomy?.balanceCents, frame: globalThis.__berlinMetroGame.__allStreetOverlay.frame.src.slice(0, 80), hasBtn: !!btn };
  });
  check(`${tag}: erheen + kopen`, buy.hasBtn && buy.m1 < buy.m0, JSON.stringify(buy));
  await page.screenshot({ path: `${out}/${tag}-3-plek.png` });
  // 4. Bezienswaardigheid → stempel
  const stamp = await page.evaluate(async () => {
    const B = globalThis.BerlinStreet, p = B.pack(), i = p.places.findIndex(x => x.kind === 'sight'); if (i < 0) return { none: true };
    B.go(i); await new Promise(r => setTimeout(r, 300)); document.querySelector('#bls-sheet [data-act="stamp"]')?.click(); await new Promise(r => setTimeout(r, 300));
    return { name: p.places[i].name, stamps: B.status().stamps };
  });
  check(`${tag}: Berlin Stamp`, stamp.none || stamp.stamps > 0, JSON.stringify(stamp));
  await page.evaluate(() => globalThis.BerlinStreet.bag()); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${tag}-4-tas.png` });
  // 5. Terug naar de U-Bahn → op het U1-perron bij de uitgang.
  await page.click('#bls .back'); await page.waitForTimeout(1500);
  const back = await page.evaluate(() => { const p = globalThis.__berlinMetroGame.player, U1 = globalThis.BerlinLines.U1; return { street: p.__streetMode, line: p.__line, st: p.__lineStation, x: Math.round(p.position.x - U1.stations[p.__lineStation ?? 0].x), hud: document.querySelector('#bls').classList.contains('on') }; });
  check(`${tag}: terug op U1-perron`, !back.street && back.line === 'U1' && back.st === IDX && !back.hud, JSON.stringify(back));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${tag}-5-terug.png` });
  // 6. U2-uitgang (Wittenbergplatz) → StreetScreen → terug op de U2.
  if (tag === 'ipad') {
    const u2 = await page.evaluate(async () => {
      globalThis.BerlinLines.U1.leave('wittenbergplatz'); await new Promise(r => setTimeout(r, 1500));
      const g = globalThis.__berlinMetroGame, st = g.stations.find(s => s.id === 'wittenbergplatz');
      await g.__allStreetOverlay.open({ line: 'U2', name: st.name, returnKind: 'u2', stationId: st.id });
      for (let i = 0; i < 40 && !(globalThis.BerlinStreet.status().places > 0); i++) await new Promise(r => setTimeout(r, 250));
      const s = globalThis.BerlinStreet.status(); document.querySelector('#bls .back').click(); await new Promise(r => setTimeout(r, 1200));
      return { places: s.places, station: s.station, street: g.player.__streetMode, line: g.player.__line ?? null, z: Math.round(g.player.position.z - st.z) };
    });
    check('ipad: U2 Wittenbergplatz buurt + terug', u2.places > 5 && !u2.street && !u2.line, JSON.stringify(u2));
  }
  const sv = await page.evaluate(() => window.BerlinStreetView2?.state?.paidLoads ?? null);
  check(`${tag}: geen betaalde Street View`, !sv, `paidLoads ${sv}`);
  check(`${tag}: geen paginafouten`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
fs.writeFileSync(`${out}/results.txt`, results.join('\n') + '\n');
await browser.close();
console.log('done');
