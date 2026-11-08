import { chromium } from 'playwright';
import { S5_STATIONS } from '../../src/data/s5.js';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('https://berlin-metro-one.vercel.app/robots.txt').catch(()=>{});
const r = await p.evaluate(async pts => {
  await new Promise((res) => { window.__cb = res; const s = document.createElement('script'); s.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDEjbaLTPls-DV8a1m5RPuj8vv8gEnV888&callback=__cb&v=weekly'; document.head.appendChild(s); });
  const g = google.maps, svc = new g.StreetViewService(), out = [];
  for (const [n, lat, lng] of pts) { try { const r = await svc.getPanorama({ location: { lat, lng }, radius: 40, sources: [g.StreetViewSource.GOOGLE], preference: g.StreetViewPreference.NEAREST }); out.push([n, r.data.location.description, r.data.links.length, /,/.test(r.data.location.description) && r.data.links.length > 0 ? 'OK' : 'FOUT']); } catch (e) { out.push([n, 'ERR ' + e.code, 0, 'FOUT']); } }
  return out;
}, S5_STATIONS.map(s => [s.name, s.exit.lat, s.exit.lon]));
for (const x of r) console.log(x.join(' | ')); console.log('OK', r.filter(x => x[3] === 'OK').length, '/', r.length); await b.close();
