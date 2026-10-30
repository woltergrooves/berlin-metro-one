// Mijlpaal 0 / G4: 3D-omgeving rond de buitenstations (Gleisdreieck, Bülowstraße, Nollendorfplatz,
// Schönhauser Allee, Eberswalder Straße, Olympia-Stadion, Ruhleben).
//
// Per station één klein pakket (public/assets/surroundings/<slug>.json, gemaakt met tools/g4/osm2pack.py uit
// OpenStreetMap — © OpenStreetMap-bijdragers, ODbL). Het pakket laadt pas als je in de buurt bent en verdwijnt
// weer als je ver weg bent. Alles staat in het assenstelsel van het Blender-sjabloon (x langs het spoor richting
// het volgende station, z dwars, y=0 perronvloer) en hangt aan het geïnstalleerde station (BlenderStationsV1).
//
// Wat er gebouwd wordt (± 12 draw calls per station):
//   - grond, groen, water, wegen, sporen (samengevoegd per soort);
//   - gebouwen uit OSM met Berlijnse gevels (Altbau-ramenraster / moderne bandramen), 's avonds verlichte ramen;
//   - bomen (OSM-bomen + parken/bos);
//   - het eigen U2-viaduct of talud onder het perron, verder dan het station;
//   - herkenningspunten met de hand: U1-viaduct en bovenhal Gleisdreieck, stalen viaduct Schönhauser Allee /
//     Eberswalder Straße / Bülowstraße, koepel Nollendorfplatz, Fernsehturm en Olympiastadion in de verte.
// Niet: Google Photorealistic 3D Tiles (betaald). Licht/mist blijven bij RenderBase.js.
//
// Status: BerlinSurroundings.status().
import * as THREE from 'three';
import { Tick } from './Tick.js';

const VERSION = 1;
const BASE = new URL('/assets/surroundings/', location.href);
const SLUGS = ['gleisdreieck', 'buelowstrasse', 'nollendorfplatz', 'schoenhauser-allee', 'eberswalder-strasse', 'olympia-stadion', 'ruhleben'];
const NEAR = 300, FAR = 460;                       // m (langs het spoor): laden / weggooien
const LEVEL = 3.4, BAY = 3.0;                      // verdieping en raamtravee (m)
const TILE_U = 8 * BAY, TILE_V = 8 * LEVEL;        // gevelstextuur: 8 traveeën × 8 verdiepingen
const FAR_MARKS = {                                // herkenningspunten in de verte (echte positie, ingekorte afstand)
  fernsehturm: { lat: 52.520833, lon: 13.409444, line: ['U1'], at: ['gleisdreieck', 'schoenhauser-allee', 'eberswalder-strasse', 'nollendorfplatz', 'buelowstrasse'] },
  olympiastadion: { lat: 52.514722, lon: 13.239444, at: ['olympia-stadion', 'ruhleben'] },
};
const OWN = {                                       // eigen viaduct: stijl per station
  gleisdreieck: 'girder', buelowstrasse: 'steel', nollendorfplatz: 'girder', 'schoenhauser-allee': 'steel', 'eberswalder-strasse': 'steel',
  'olympia-stadion': 'bank', ruhleben: 'bank',
};

const entries = new Map();                          // root → entry
const packs = new Map();                            // slug → Promise<pack>
const counts = { built: 0, disposed: 0, failed: 0, buildings: 0, trees: 0 };
let game = null, tickId = null, credit = null;

// ── Hulpjes ─────────────────────────────────────────────────────────────────────────────────────────────
const C = c => new THREE.Color(c);
function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function std(name, extra = {}) { const m = new THREE.MeshStandardMaterial({ name, roughness: 0.92, metalness: 0, ...extra }); m.userData.g4 = VERSION; return m; }
function unpack(arr, from, s) { const pts = []; for (let i = from; i + 1 < arr.length; i += 2) pts.push([arr[i] / s, arr[i + 1] / s]); return pts; }
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, z1] = p[i === 0 ? p.length - 1 : i - 1], [x2, z2] = p[i]; a += x1 * z2 - x2 * z1; } return a / 2; }

// Eén samengevoegde geometrie per soort: posities, normalen, kleuren en (optioneel) uv.
class Batch {
  constructor(uv = false) { this.p = []; this.n = []; this.c = []; this.uv = uv ? [] : null; }
  tri(a, b, c, col, uva, uvb, uvc, up = null) {
    // Driehoek zo leggen dat de voorkant naar `up` (gewenste normaal) wijst.
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const n = ab.cross(ac); if (n.lengthSq() < 1e-10) return;
    n.normalize(); if (up && n.dot(up) < 0) { [b, c] = [c, b]; [uvb, uvc] = [uvc, uvb]; n.negate(); }
    for (const [v, t] of [[a, uva], [b, uvb], [c, uvc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n.x, n.y, n.z); this.c.push(col.r, col.g, col.b); if (this.uv) this.uv.push(t ? t[0] : 0, t ? t[1] : 0); }
  }
  quad(a, b, c, d, col, uv, up) { this.tri(a, b, c, col, uv?.[0], uv?.[1], uv?.[2], up); this.tri(a, c, d, col, uv?.[0], uv?.[2], uv?.[3], up); }
  flat(poly, y, col, uvScale = 0) {
    const tris = THREE.ShapeUtils.triangulateShape(poly.map(([x, z]) => new THREE.Vector2(x, z)), []);
    const UP = new THREE.Vector3(0, 1, 0);
    for (const [i, j, k] of tris) {
      const P = q => [poly[q][0], y, poly[q][1]], U = q => [poly[q][0] * uvScale, poly[q][1] * uvScale];
      this.tri(P(i), P(j), P(k), col, U(i), U(j), U(k), UP);
    }
  }
  box(cx, cy, cz, sx, sy, sz, col, ry = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry), V = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, f = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const [ax, ay, az] of f) {
      const up = new THREE.Vector3(ax * cs + az * sn, ay, -ax * sn + az * cs);
      let q;
      if (ax) q = [[ax * hx, -hy, -hz], [ax * hx, hy, -hz], [ax * hx, hy, hz], [ax * hx, -hy, hz]];
      else if (ay) q = [[-hx, ay * hy, -hz], [hx, ay * hy, -hz], [hx, ay * hy, hz], [-hx, ay * hy, hz]];
      else q = [[-hx, -hy, az * hz], [hx, -hy, az * hz], [hx, hy, az * hz], [-hx, hy, az * hz]];
      this.quad(V(...q[0]), V(...q[1]), V(...q[2]), V(...q[3]), col, null, up);
    }
  }
  // Balk van punt a naar punt b (bovenaanzicht), breedte w, van y0 tot y1.
  beam(a, b, y0, y1, w, col) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.01) return;
    this.box((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2, L, y1 - y0, w, col, -Math.atan2(dz, dx));
  }
  // Driehoeken langs x opknippen (≤ maxDX), zodat een verschuiving in y per x (lijnpakketten) de grond volgt.
  splitX(maxDX) {
    const P = this.p, N = this.n, Cc = this.c, U = this.uv, out = { p: [], n: [], c: [], uv: U ? [] : null };
    const V = i => ({ p: P.slice(i * 3, i * 3 + 3), n: N.slice(i * 3, i * 3 + 3), c: Cc.slice(i * 3, i * 3 + 3), u: U ? U.slice(i * 2, i * 2 + 2) : null });
    const mid = (a, b) => ({ p: a.p.map((v, k) => (v + b.p[k]) / 2), n: a.n, c: a.c, u: a.u ? a.u.map((v, k) => (v + b.u[k]) / 2) : null });
    const emit = t => { for (const v of t) { out.p.push(...v.p); out.n.push(...v.n); out.c.push(...v.c); if (out.uv) out.uv.push(...v.u); } };
    const rec = (a, b, c, d) => {
      const e = [[a, b, c], [b, c, a], [c, a, b]].map(([x, y, z]) => [Math.abs(x.p[0] - y.p[0]), x, y, z]).sort((u, v) => v[0] - u[0])[0];
      if (e[0] <= maxDX || d > 14) return emit([a, b, c]);
      const [, x, y, z] = e, m = mid(x, y); rec(x, m, z, d + 1); rec(m, y, z, d + 1);
    };
    for (let i = 0; i < P.length / 3; i += 3) rec(V(i), V(i + 1), V(i + 2), 0);
    this.p = out.p; this.n = out.n; this.c = out.c; this.uv = out.uv; return this;
  }
  mesh(mat, name) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = m.receiveShadow = false; m.userData.g4 = VERSION; m.matrixAutoUpdate = false; m.updateMatrix();
    return m;
  }
}

// ── Gevels: procedurele textuur (één keer gemaakt, gedeeld door alle stations) ─────────────────────────
const tex = {};
function facadeTextures(kind) {
  if (tex[kind]) return tex[kind];
  const S = 512, cw = S / 8, ch = S / 8, r = rng('facade' + kind);
  const base = document.createElement('canvas'); base.width = base.height = S;
  const glow = document.createElement('canvas'); glow.width = glow.height = S;
  const b = base.getContext('2d'), e = glow.getContext('2d');
  b.fillStyle = '#ffffff'; b.fillRect(0, 0, S, S); e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  for (let fy = 0; fy < 8; fy++) {
    const y0 = S - (fy + 1) * ch;                                   // v=0 onderaan = begane grond
    if (kind === 'altbau') {
      b.fillStyle = '#e6e3de'; b.fillRect(0, y0 + ch - 5, S, 5);   // lijst tussen verdiepingen
      if (fy === 0) { b.fillStyle = '#cfcac2'; b.fillRect(0, y0, S, ch); }
    } else { b.fillStyle = '#d9dcdc'; b.fillRect(0, y0 + ch - 9, S, 9); }
    for (let bx = 0; bx < 8; bx++) {
      let x, y, w, h;
      if (kind === 'altbau') {
        w = cw * 0.42; h = ch * (fy === 0 ? 0.62 : 0.56); x = bx * cw + (cw - w) / 2; y = y0 + ch * (fy === 0 ? 0.22 : 0.2);
        b.fillStyle = '#efece6'; b.fillRect(x - 4, y - 7, w + 8, h + 11);     // kozijn + sierlijst
      } else { w = cw - 6; h = ch * 0.52; x = bx * cw + 3; y = y0 + ch * 0.2; }
      const g = b.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#3a4650'); g.addColorStop(1, '#232a30');
      b.fillStyle = g; b.fillRect(x, y, w, h);
      b.fillStyle = kind === 'altbau' ? '#f2efe9' : '#b9bec2';
      b.fillRect(x + w / 2 - 1.5, y, 3, h); if (kind === 'altbau') b.fillRect(x, y + h * 0.3, w, 3);
      const lit = r() < (fy === 0 ? 0.55 : 0.36);
      if (lit) { e.fillStyle = ['#ffd38a', '#ffe2b0', '#ffc977', '#e8ecff', '#ffe9c4'][Math.floor(r() * 5)]; e.globalAlpha = 0.65 + r() * 0.35; e.fillRect(x, y, w, h); e.globalAlpha = 1; }
    }
  }
  const mk = c => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.userData.g4 = 'facade'; return t; };
  const map = mk(base), emissiveMap = mk(glow); map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return (tex[kind] = { map, emissiveMap });
}

// ── Lokale coördinaten voor punten buiten het pakket (verre herkenningspunten) ─────────────────────────
function localOf(pack, lat, lon) {
  const [lat0, lon0] = pack.origin, b = pack.bearing * Math.PI / 180, te = Math.sin(b), tn = Math.cos(b);
  const e = (lon - lon0) * Math.cos(lat0 * Math.PI / 180) * 111320, n = (lat - lat0) * 110574;
  return [e * te + n * tn, e * tn - n * te];
}

// ── Bouwen ──────────────────────────────────────────────────────────────────────────────────────────────
const PAL = {
  altbau: ['#d8c9ac', '#cbb393', '#e2dacb', '#c8a685', '#b9b2a5', '#d4bd96', '#aaa59a', '#cec5b4', '#c1ad8b', '#bf9f88', '#d9d1bf', '#b7a48d'],
  modern: ['#9ea6aa', '#bcbeb9', '#8f959a', '#c8c4ba', '#a9b2b6'],
  small: ['#7d756c', '#8a8378', '#6f6c66', '#9b9182'],
};

// opts (U1d, lijnpakketten — zie src/lines/LineSurroundings.js):
//   line   — lijn-id: geen eigen U2-viaduct/bovenhal, andere viaducten ten opzichte van pack.ownLayer;
//   ground — x → straathoogte (y) in pakket-x; de hele omgeving wordt daarlangs verschoven (helling naar de tunnel);
//   clear  — [[x0, x1], …]: hier niets bouwen (rivier onder de Oberbaumbrücke, die bouwt LineWorld zelf);
//   sunkWater — water 1,6 m lager met kademuren (Landwehrkanaal).
export function buildPack(pack, opts = {}) { return build(null, pack, opts); }

function build(entry, pack, opts = {}) {
  const s = pack.scale || 10, R = pack.radius || 260, elev = pack.elev, r = rng(pack.slug), q = globalThis.BerlinRender?.quality || 'midden';
  const line = opts.line || null, zones = opts.clear || [];
  const inZone = x => zones.some(([a, b]) => x > a && x < b);
  const group = new THREE.Group(); group.name = line ? 'G4_LineSurroundings' : 'G4_Surroundings'; group.userData.g4 = VERSION; group.position.y = line ? 0 : -elev;
  if (line) group.userData.line = line;
  const mats = [], geos = [];
  const slope = !!opts.ground && (() => { const g0 = opts.ground(0); for (let x = -R - 61; x <= R + 61; x += 10) if (Math.abs(opts.ground(x) - g0) > 0.05) return true; return false; })();
  const add = (batch, mat, name) => { if (slope) batch.splitX(8); const m = batch.mesh(mat, name); if (m) { group.add(m); geos.push(m.geometry); } if (!mats.includes(mat)) mats.push(mat); return m; };
  const steelCol = C(opts.steel || globalThis.BerlinStationProfiles?.get?.('U2', pack.slug)?.open?.steel || '#4d5a55');

  // Grond + groen + water + wegen + sporen
  const ground = new Batch(), green = new Batch(), water = new Batch(), roads = new Batch(), rails = new Batch(), quays = new Batch();
  const GROUND = C('#8d8a82'), WATER = C('#40606c');
  const sunk = !!(opts.sunkWater && !zones.length), WY = sunk ? -1.6 : 0.05;
  if (!line) {
    const disc = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; disc.push([Math.cos(a) * (R + 60), Math.sin(a) * (R + 60)]); }
    ground.flat(disc, 0, GROUND);
  } else {
    // Vierkant (ruim), opgeknipt bij de vrije zones; verzonken water als gaten in de grond.
    const E = R + 61, cuts = [-E, ...zones.flat().map(v => Math.max(-E, Math.min(E, v))), E];
    for (let i = 0; i + 1 < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.5) continue;
      const rect = [[a, -E], [b, -E], [b, E], [a, E]];
      const holes = sunk ? pack.w.map(w => unpack(w, 0, s)).filter(p => p.length >= 3) : [];
      try {
        const tris = THREE.ShapeUtils.triangulateShape(rect.map(([x, z]) => new THREE.Vector2(x, z)), holes.map(h => h.map(([x, z]) => new THREE.Vector2(x, z))));
        const all = rect.concat(...holes), UP = new THREE.Vector3(0, 1, 0);
        for (const [i0, j, k] of tris) ground.tri([all[i0][0], 0, all[i0][1]], [all[j][0], 0, all[j][1]], [all[k][0], 0, all[k][1]], GROUND, null, null, null, UP);
      } catch (err) { ground.flat(rect, 0, GROUND); }
    }
  }
  const GREEN = [C('#6c8648'), C('#55703d'), C('#6f9550')];
  const centerX = p => p.reduce((a, [x]) => a + x, 0) / p.length;
  for (const g of pack.g) { const p = unpack(g, 1, s); if (p.length >= 3 && !inZone(centerX(p))) green.flat(p, 0.08, GREEN[g[0]] || GREEN[0]); }
  for (const w of pack.w) {
    const p = unpack(w, 0, s); if (p.length < 3) continue;
    water.flat(p, WY, WATER);
    if (sunk) {
      const edge = R + 59.5, QUAY = C('#8a8274');
      for (let i = 0; i < p.length; i++) {
        const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
        if ((Math.abs(x1) > edge && Math.abs(x2) > edge) || (Math.abs(z1) > edge && Math.abs(z2) > edge)) continue;   // knip aan de rand
        quays.quad([x1, WY - 0.2, z1], [x2, WY - 0.2, z2], [x2, 0.02, z2], [x1, 0.02, z1], QUAY);
      }
    }
  }
  const ASPH = C('#4b4c4e'), WALK = C('#9b958b'), RAIL = C('#6a6158'), TRAM = C('#3d3a37');
  const ribbon = (batch, pts, w, y, col) => {
    for (let i = 1; i < pts.length; i++) {
      const [x1, z1] = pts[i - 1], [x2, z2] = pts[i], L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.05) continue;
      const nx = -(z2 - z1) / L * w / 2, nz = (x2 - x1) / L * w / 2, ex = (x2 - x1) / L * w * 0.25, ez = (z2 - z1) / L * w * 0.25; // licht verlengd: naden dicht
      batch.quad([x1 - ex + nx, y, z1 - ez + nz], [x2 + ex + nx, y, z2 + ez + nz], [x2 + ex - nx, y, z2 + ez - nz], [x1 - ex - nx, y, z1 - ez - nz], col, null, new THREE.Vector3(0, 1, 0));
    }
  };
  // Lijnen knippen in de vrije zones (stukje per segment: middelpunt in een zone → weg).
  const cut = pts => {
    if (!zones.length) return [pts];
    const out = []; let cur = [];
    for (let i = 0; i < pts.length; i++) {
      if (i && inZone((pts[i - 1][0] + pts[i][0]) / 2)) { if (cur.length > 1) out.push(cur); cur = [pts[i]]; continue; }
      cur.push(pts[i]);
    }
    if (cur.length > 1) out.push(cur); return out;
  };
  for (const rd of pack.r) {
    const w = rd[0] / s;
    for (const pts of cut(unpack(rd, 1, s))) {
      if (w < 0) { if (!sunk) ribbon(water, pts, -w, 0.05, WATER); }      // verzonken: het watervlak is er al
      else ribbon(roads, pts, w, w < 3 ? 0.14 : 0.18, w < 3 ? WALK : ASPH);
    }
  }
  for (const rl of pack.rail) for (const pts of cut(unpack(rl, 1, s))) ribbon(rails, pts, rl[0] ? 1.6 : 3.2, rl[0] ? 0.21 : 0.12, rl[0] ? TRAM : RAIL);
  const off = (f, u) => ({ polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: u });
  add(ground, std('G4_Ground', { vertexColors: true }), 'G4_Ground');
  add(green, std('G4_Green', { vertexColors: true, ...off(-1, -2) }), 'G4_Green');
  add(water, std('G4_Water', { vertexColors: true, roughness: 0.18, metalness: 0.1, ...off(-1, -3) }), 'G4_Water');
  add(quays, std('G4_Quays', { vertexColors: true, side: THREE.DoubleSide }), 'G4_Quays');
  add(rails, std('G4_Rails', { vertexColors: true, ...off(-2, -4) }), 'G4_Rails');
  add(roads, std('G4_Roads', { vertexColors: true, roughness: 0.85, ...off(-3, -6) }), 'G4_Roads');

  // Gebouwen
  const walls = { altbau: new Batch(true), modern: new Batch(true) }, roofs = new Batch(), smalls = new Batch();
  for (const b of pack.b) {
    const h = b[0], mh = b[1], k = b[2]; let p = unpack(b, 3, s); if (p.length < 3) continue;
    if (zones.length && p.some(([x]) => inZone(x))) continue;
    if (signedArea(p) < 0) p = p.reverse();
    const kind = k === 1 ? 'modern' : 'altbau', small = k === 2 || h < 4.5;
    const pal = small ? PAL.small : PAL[kind], col = C(pal[Math.floor(r() * pal.length)]);
    col.offsetHSL(0, 0, (r() - 0.5) * 0.05);
    const target = small ? smalls : walls[kind];
    // Lage gebouwen beginnen een rij ramen hoger in de textuur (geen half-verdiepingen); u-verschuiving voor variatie.
    let u = Math.floor(r() * 8) * BAY; const v0 = Math.floor(r() * 3) * LEVEL;
    let cx = 0, cz = 0; for (const [x, z] of p) { cx += x; cz += z; } cx /= p.length; cz /= p.length;
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.05) continue;
      const out = new THREE.Vector3((z2 - z1), 0, -(x2 - x1)).normalize();
      // Naar buiten = weg van het zwaartepunt (werkt ook bij licht holle veelhoeken).
      if (out.x * ((x1 + x2) / 2 - cx) + out.z * ((z1 + z2) / 2 - cz) < 0) out.negate();
      const uv = small ? null : [[u / TILE_U, (mh + v0) / TILE_V], [(u + L) / TILE_U, (mh + v0) / TILE_V], [(u + L) / TILE_U, (h + v0) / TILE_V], [u / TILE_U, (h + v0) / TILE_V]];
      target.quad([x1, mh, z1], [x2, mh, z2], [x2, h, z2], [x1, h, z1], col, uv, out);
      u += L;
    }
    const roofCol = small ? C('#5d5a55') : C(kind === 'modern' ? '#6f7274' : (r() < 0.6 ? '#5a504a' : '#6a6460'));
    roofs.flat(p, h, roofCol);
    counts.buildings++;
  }
  const fa = facadeTextures('altbau'), fm = facadeTextures('modern');
  const wallMat = { altbau: std('G4_Facade_Altbau', { vertexColors: true, map: fa.map, emissiveMap: fa.emissiveMap, emissive: C('#ffffff'), emissiveIntensity: 0 }),
    modern: std('G4_Facade_Modern', { vertexColors: true, map: fm.map, emissiveMap: fm.emissiveMap, emissive: C('#ffffff'), emissiveIntensity: 0, roughness: 0.6, metalness: 0.05 }) };
  add(walls.altbau, wallMat.altbau, 'G4_Buildings_Altbau');
  add(walls.modern, wallMat.modern, 'G4_Buildings_Modern');
  add(smalls, std('G4_Buildings_Small', { vertexColors: true }), 'G4_Buildings_Small');
  add(roofs, std('G4_Roofs', { vertexColors: true, roughness: 0.8 }), 'G4_Roofs');

  // Bomen: OSM-bomen + verspreid in parken/bos (niet in de spoorstrook, niet op gebouwen ongeveer).
  const trees = [];
  for (const t of pack.trees) if (!inZone(t[0] / s)) trees.push([t[0] / s, t[1] / s]);
  for (const g of pack.g) {
    if (g[0] === 2) continue;
    const p = unpack(g, 1, s); if (p.length < 3) continue;
    const a = Math.abs(signedArea(p)), n = Math.min(160, Math.floor(a / (g[0] === 1 ? 70 : 260)));
    let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; for (const [x, z] of p) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
      const x = minX + r() * (maxX - minX), z = minZ + r() * (maxZ - minZ);
      if (Math.abs(z) < 13 || Math.hypot(x, z) > R || inZone(x)) continue;
      let inside = false; for (let j = 0, k2 = p.length - 1; j < p.length; k2 = j++) { const [xi, zi] = p[j], [xj, zj] = p[k2]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside; }
      if (inside) { trees.push([x, z]); i++; }
    }
  }
  const cap = q === 'laag' ? 260 : 700; while (trees.length > cap) trees.splice(Math.floor(r() * trees.length), 1);
  if (trees.length) {
    const trunkG = new THREE.CylinderGeometry(0.16, 0.24, 3.4, 6); trunkG.translate(0, 1.7, 0);
    const crownG = new THREE.IcosahedronGeometry(1, 0); crownG.translate(0, 0, 0);
    const trunkM = std('G4_TreeTrunk', { color: C('#4a3b2f') }), crownM = std('G4_TreeCrown', { color: C('#ffffff'), flatShading: true });
    const trunks = new THREE.InstancedMesh(trunkG, trunkM, trees.length), crowns = new THREE.InstancedMesh(crownG, crownM, trees.length);
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), cc = new THREE.Color();
    trees.forEach(([x, z], i) => {
      const k = 0.8 + r() * 0.6, rad = (2.2 + r() * 1.6) * k;
      m4.compose(ps.set(x, 0, z), qn, sc.set(k, k * (0.9 + r() * 0.4), k)); trunks.setMatrixAt(i, m4);
      m4.compose(ps.set(x, 3.0 * k + rad * 0.75, z), qn.setFromEuler(new THREE.Euler(0, r() * 6.28, 0)), sc.set(rad, rad * (1.05 + r() * 0.3), rad)); crowns.setMatrixAt(i, m4);
      crowns.setColorAt(i, cc.setHSL(0.24 + r() * 0.07, 0.32 + r() * 0.15, 0.24 + r() * 0.09));
      qn.identity();
    });
    for (const m of [trunks, crowns]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.castShadow = m.receiveShadow = false; m.userData.g4 = VERSION; group.add(m); geos.push(m.geometry); }
    trunks.name = 'G4_TreeTrunks'; crowns.name = 'G4_TreeCrowns'; crowns.instanceColor.needsUpdate = true;
    mats.push(trunkM, crownM); counts.trees += trees.length;
  }

  // Eigen U2-viaduct / talud (recht, zoals het spoor in het spel), over de hele lengte, ook onder het station.
  const own = new Batch(), style = OWN[pack.slug] || 'girder', top = elev - 0.45;
  if (line) { /* eigen spoor: LineWorld */ } else if (style === 'bank') {
    const w0 = 21, w1 = 21 + elev * 3;
    const bankCol = C('#7b7a6c'), grassCol = C('#6a8044');
    for (const sgn of [-1, 1]) own.quad([-R, 0, sgn * w1 / 2], [R, 0, sgn * w1 / 2], [R, top, sgn * w0 / 2], [-R, top, sgn * w0 / 2], grassCol, null, new THREE.Vector3(0, 1, sgn));
    own.quad([-R, top, -w0 / 2], [R, top, -w0 / 2], [R, top, w0 / 2], [-R, top, w0 / 2], bankCol, null, new THREE.Vector3(0, 1, 0));
  } else {
    const gCol = steelCol.clone(), dark = steelCol.clone().multiplyScalar(0.7), stone = C('#8b8378');
    const span = style === 'steel' ? 12 : 15;
    for (const sgn of [-1, 1]) own.box(0, top - 0.85, sgn * 5.6, R * 2, 1.7, 0.35, gCol);           // hoofdliggers
    own.box(0, top - 0.12, 0, R * 2, 0.24, 17.4, dark);                                              // dek
    for (let x = -R; x <= R; x += span / 2) own.box(x, top - 0.9, 0, 0.3, 0.9, 11.2, dark);          // dwarsdragers
    for (let x = -R + span / 2; x <= R; x += span) {
      if (style === 'steel') {                                                                       // Magistratsschirm: één rij jukken met schoren
        for (const zz of [-3.2, 3.2]) own.box(x, (top - 1.7) / 2, zz, 0.55, top - 1.7, 0.55, gCol);
        own.box(x, top - 1.9, 0, 0.6, 0.45, 12.2, gCol);
        own.box(x, 0.5, -3.2, 1.0, 1.0, 1.0, stone); own.box(x, 0.5, 3.2, 1.0, 1.0, 1.0, stone);
      } else {
        for (const zz of [-5.6, 5.6]) { own.box(x, (top - 1.7) / 2, zz, 0.7, top - 1.7, 0.7, gCol); own.box(x, 0.6, zz, 1.3, 1.2, 1.3, stone); }
      }
    }
  }
  add(own, std('G4_OwnViaduct', { vertexColors: true, roughness: 0.6, metalness: 0.35 }), 'G4_OwnViaduct');

  // Andere metro-viaducten uit OSM (Gleisdreieck: U1/U3 boven de U2).
  const via = new Batch();
  for (const v of pack.via) {
    const layer = v[0], w = v[1] / s, pts = unpack(v, 2, s);
    const deck = line ? Math.max(4.5, elev - Math.max(0, (pack.ownLayer || 2) - layer) * 7.6) : elev + Math.max(0, layer - 1) * 7.6;
    for (let i = 1; i < pts.length; i++) {
      via.beam(pts[i - 1], pts[i], deck - 1.6, deck - 0.2, w, steelCol);
      via.beam(pts[i - 1], pts[i], deck - 0.2, deck, w + 0.4, C('#4c4f50'));
      for (const sgn of [-1, 1]) {                                                                  // leuning
        const [x1, z1] = pts[i - 1], [x2, z2] = pts[i], L = Math.hypot(x2 - x1, z2 - z1) || 1, nx = -(z2 - z1) / L * w / 2 * sgn, nz = (x2 - x1) / L * w / 2 * sgn;
        via.beam([x1 + nx, z1 + nz], [x2 + nx, z2 + nz], deck, deck + 1.1, 0.12, steelCol);
      }
    }
    // Pijlers om de ±14 m, nooit in de spoorstrook van het spel.
    let acc = 7;
    for (let i = 1; i < pts.length; i++) {
      const [x1, z1] = pts[i - 1], [x2, z2] = pts[i], L = Math.hypot(x2 - x1, z2 - z1);
      while (acc < L) { const t = acc / L, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t; if (Math.abs(z) > 11) via.box(x, (deck - 1.6) / 2, z, 0.8, deck - 1.6, 0.8, steelCol); acc += 14; }
      acc -= L;
    }
  }
  if (pack.slug === 'gleisdreieck' && !line) gleisdreieckHall(via, pack, elev, steelCol);
  add(via, std('G4_Viaducts', { vertexColors: true, roughness: 0.55, metalness: 0.35 }), 'G4_Viaducts');

  if (pack.slug === 'nollendorfplatz' && !line) { const d = dome(elev, steelCol); group.add(d.mesh); geos.push(d.mesh.geometry); mats.push(d.mat); }

  // Verre herkenningspunten: echte richting, afstand ingekort tot net binnen het zicht, nevelig ingekleurd.
  const far = [];
  for (const [id, f] of Object.entries(FAR_MARKS)) {
    if (!(line ? f.line?.includes(line) : f.at.includes(pack.slug))) continue;
    const [x, z] = localOf(pack, f.lat, f.lon), d = Math.hypot(x, z), D = Math.min(d, 360), k = D / d;
    const b = new Batch(), col = C('#5f6870');
    if (id === 'fernsehturm') {
      const H = 368 * k, r0 = 16 * k, r1 = 4.5 * k, segs = 10;
      for (let i = 0; i < segs; i++) { const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
        b.quad([Math.cos(a0) * r0, 0, Math.sin(a0) * r0], [Math.cos(a1) * r0, 0, Math.sin(a1) * r0], [Math.cos(a1) * r1, 250 * k, Math.sin(a1) * r1], [Math.cos(a0) * r1, 250 * k, Math.sin(a0) * r1], col, null, new THREE.Vector3(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2))); }
      const ball = new THREE.SphereGeometry(16 * k, 16, 10).toNonIndexed(), p = ball.attributes.position;
      for (let i = 0; i < p.count; i += 3) b.tri([p.getX(i), p.getY(i) + 212 * k, p.getZ(i)], [p.getX(i + 1), p.getY(i + 1) + 212 * k, p.getZ(i + 1)], [p.getX(i + 2), p.getY(i + 2) + 212 * k, p.getZ(i + 2)], C('#7c858c'), null, null, null, new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
      ball.dispose();
      b.box(0, 232 * k, 0, 9 * k, 12 * k, 9 * k, col); b.box(0, 300 * k, 0, 3 * k, 136 * k, 3 * k, C('#8a8f93'));
    } else {
      const RX = 150 * k, RZ = 115 * k, H = 26 * k, segs = 28;
      for (let i = 0; i < segs; i++) { const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2, P = (a, rr, y) => [Math.cos(a) * RX * rr, y, Math.sin(a) * RZ * rr];
        b.quad(P(a0, 1, 0), P(a1, 1, 0), P(a1, 1, H), P(a0, 1, H), col, null, new THREE.Vector3(Math.cos(a0), 0, Math.sin(a0)));
        b.quad(P(a0, 1, H), P(a1, 1, H), P(a1, 0.72, H + 6 * k), P(a0, 0.72, H + 6 * k), C('#a9adae'), null, new THREE.Vector3(0, 1, 0)); }
    }
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.85, depthWrite: false }); mat.name = 'G4_FarMark'; mat.userData.g4 = VERSION;
    const m = b.mesh(mat, 'G4_Far_' + id); if (!m) continue;
    m.position.set(x * k, 0, z * k); m.updateMatrix(); m.renderOrder = -1; m.userData.base = null; m.userData.haze = Math.min(0.62, 0.3 + d / 9000);
    group.add(m); geos.push(m.geometry); mats.push(mat); far.push(m);
  }
  // Lijnpakket: alles op de straathoogte van de lijn zetten (helling bij Gleisdreieck / tunnelmond).
  if (opts.ground) {
    const gy = opts.ground, m4 = new THREE.Matrix4();
    for (const m of group.children) {
      if (far.includes(m)) { m.position.y = gy(m.position.x); m.updateMatrix(); continue; }
      if (m.isInstancedMesh) {
        for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, m4); m4.elements[13] += gy(m4.elements[12]); m.setMatrixAt(i, m4); }
        m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); continue;
      }
      const P = m.geometry?.attributes?.position; if (!P) continue;
      for (let i = 0; i < P.count; i++) P.setY(i, P.getY(i) + gy(P.getX(i)));
      P.needsUpdate = true; m.geometry.computeBoundingSphere();
    }
  }
  return { group, mats, geos, walls: [wallMat.altbau, wallMat.modern], far };
}

// Gleisdreieck: bovenhal van de U1/U3 dwars boven de U2 (overkapping, zuilen, borden).
function gleisdreieckHall(b, pack, elev, steel) {
  const s = pack.scale || 10; let best = null;
  for (const v of pack.via) { const pts = unpack(v, 2, s); for (let i = 1; i < pts.length; i++) { const [x1, z1] = pts[i - 1], [x2, z2] = pts[i];
    const L2 = (x2 - x1) ** 2 + (z2 - z1) ** 2 || 1, t = Math.max(0, Math.min(1, -(x1 * (x2 - x1) + z1 * (z2 - z1)) / L2)), x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t, d = Math.hypot(x, z);
    if (v[0] >= 2 && (!best || d < best.d)) best = { d, x, z, dir: Math.atan2(z2 - z1, x2 - x1) }; } }
  if (!best || best.d > 60) return;
  const deck = elev + 7.6, ry = -best.dir, roofC = C('#58745f'), cx = best.x, cz = best.z;
  const R = (lx, lz) => [cx + lx * Math.cos(best.dir) - lz * Math.sin(best.dir), cz + lx * Math.sin(best.dir) + lz * Math.cos(best.dir)];
  b.box(cx, deck - 0.1, cz, 110, 0.3, 15, C('#5d5d5a'), ry);                                         // perronvloer boven
  b.box(cx, deck + 4.6, cz, 112, 0.35, 17, roofC, ry);                                                 // dak
  for (let lx = -50; lx <= 50; lx += 10) for (const lz of [-7, 0, 7]) { const [x, z] = R(lx, lz); b.box(x, deck + 2.3, z, 0.35, 4.6, 0.35, steel); }
  for (let lx = -50; lx <= 50; lx += 20) for (const lz of [-7.6, 7.6]) { const [x, z] = R(lx, lz); if (Math.abs(z) > 11) b.box(x, (deck - 1.6) / 2, z, 1.0, deck - 1.6, 1.0, steel); }
  for (const lz of [-8.4, 8.4]) { const [x, z] = R(0, lz); b.box(x, deck + 1.8, z, 110, 3.4, 0.12, C('#7f9c88'), ry); }      // glazen zijwanden
}

// Nollendorfplatz: de stalen koepel (herbouwd 1999) boven de oostkant van het station.
function dome(elev, steel) {
  const b = new Batch(), R = 9.5, cx = -26, cy = 4.6, col = steel.clone().multiplyScalar(0.85), seg = 18, ribs = 16;
  const P = (az, el, rr = R) => [cx + Math.cos(az) * Math.cos(el) * rr, cy + Math.sin(el) * rr, Math.sin(az) * Math.cos(el) * rr];
  for (let i = 0; i < ribs; i++) {                                                                     // meridianen
    const az = i / ribs * Math.PI * 2;
    for (let j = 0; j < seg; j++) { 
      const e0 = j / seg * Math.PI / 2, e1 = (j + 1) / seg * Math.PI / 2, w = 0.16;
      const o = (el) => new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
      const t = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az)).multiplyScalar(w);
      const A = P(az, e0), B = P(az, e1);
      b.quad([A[0] - t.x, A[1], A[2] - t.z], [A[0] + t.x, A[1], A[2] + t.z], [B[0] + t.x, B[1], B[2] + t.z], [B[0] - t.x, B[1], B[2] - t.z], col, null, o((e0 + e1) / 2)); }
  }
  for (const el of [0.28, 0.6, 0.95, 1.25]) {                                                          // parallellen
    for (let i = 0; i < 48; i++) { const a0 = i / 48 * Math.PI * 2, a1 = (i + 1) / 48 * Math.PI * 2, A = P(a0, el), B = P(a1, el), up = Math.sin(el) * 0.16;
      b.quad([A[0], A[1] - 0.12, A[2]], [B[0], B[1] - 0.12, B[2]], [B[0], B[1] + 0.12, B[2]], [A[0], A[1] + 0.12, A[2]], col, null, new THREE.Vector3(Math.cos(a0), up, Math.sin(a0))); }
  }
  b.box(cx, cy - 0.2, 0, 2 * R + 1, 0.4, 2 * R + 1, col);                                              // voetring
  b.box(cx, cy + R + 0.6, 0, 0.5, 1.4, 0.5, col);                                                      // top
  const mat = std('G4_Dome', { vertexColors: true, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
  const mesh = b.mesh(mat, 'G4_NollendorfDome'); mesh.position.y = elev; mesh.updateMatrix();
  return { mesh, mat };
}

// ── Oude lagen die het uitzicht blokkeren (Station.js openAir: lucht- en "stad"-blokken) ────────────────
function legacyBlockers(parent) {
  const out = [];
  parent.traverse(o => {
    if (!o.isMesh || o.geometry?.type !== 'BoxGeometry' || o.userData?.g4) return;
    const p = o.geometry.parameters, eq = (a, b) => Math.abs(a - b) < 0.02;
    if ((eq(p.width, 0.18) && eq(p.height, 12) && eq(p.depth, 82)) || (eq(p.width, 1.1) && (eq(p.height, 3.5) || eq(p.height, 4.3)) && eq(p.depth, 9))) out.push(o);
  });
  return out;
}

// ── Beheer ──────────────────────────────────────────────────────────────────────────────────────────────
function loadPack(slug) {
  if (!packs.has(slug)) packs.set(slug, fetch(new URL(slug + '.json', BASE)).then(r => { if (!r.ok) throw new Error('G4-pakket ' + r.status); return r.json(); })
    .catch(e => { packs.delete(slug); throw e; }));
  return packs.get(slug);
}
function dispose(entry) {
  if (!entry.built) return;
  entry.built.group.removeFromParent();
  for (const g of entry.built.geos) g.dispose();
  for (const m of entry.built.mats) m.dispose();
  for (const [o, v] of entry.hidden) o.visible = v;
  entry.hidden.clear(); entry.built = null; counts.disposed++;
}
function ensureCredit() {
  if (credit || typeof document === 'undefined') return credit;
  credit = document.createElement('div'); credit.id = 'g4OsmCredit'; credit.textContent = '© OpenStreetMap-bijdragers';
  credit.style.cssText = 'position:fixed;left:calc(env(safe-area-inset-left,0px) + 6px);bottom:calc(env(safe-area-inset-bottom,0px) + 3px);z-index:5;font:600 9px Arial;color:#fff;opacity:.55;text-shadow:0 1px 2px #000;pointer-events:none;display:none';
  document.body.appendChild(credit); return credit;
}
let lastNight = -1;
function update() {
  if (!game) return;
  const p = game.player, z = p?.position?.z ?? 0, show = !!(p && !p.__streetMode && (p.__openAirStation || p.activeTrain));
  let anyVisible = false, nearest = null;
  // Alleen het dichtstbijzijnde station bouwen en tonen: de pakketten liggen elk in hun eigen (echte) assenstelsel
  // en zouden elkaar anders overlappen, want de stations liggen in het spel dichter bij elkaar dan in het echt.
  for (const e of entries.values()) if (e.root.parent && (!nearest || Math.abs(z - e.station.z) < Math.abs(z - nearest.station.z))) nearest = e;
  for (const e of entries.values()) {
    if (!e.root.parent) { dispose(e); entries.delete(e.root); continue; }
    const d = Math.abs(z - e.station.z);
    if (d < NEAR && e === nearest && !e.built && !e.loading) {
      e.loading = true;
      loadPack(e.slug).then(pack => {
        e.loading = false; if (!e.root.parent || e.built) return;
        try {
          e.built = build(e, pack); e.root.add(e.built.group); counts.built++;
          for (const o of legacyBlockers(e.parent)) { e.hidden.set(o, o.visible); o.visible = false; }
          lastNight = -1;
        } catch (err) { counts.failed++; console.warn('[Berlin Life] G4-omgeving overgeslagen', e.slug, err); }
      }).catch(err => { e.loading = false; e.failedAt = performance.now(); counts.failed++; console.warn('[Berlin Life] G4-pakket niet geladen', e.slug, err); });
    } else if ((d > FAR || (e !== nearest && d > NEAR * 0.6)) && e.built) dispose(e);
    if (e.built) {
      const vis = show && d < NEAR && e === nearest; e.built.group.visible = vis; anyVisible ||= vis;
      for (const [o] of e.hidden) if (o.visible) o.visible = false;   // oude patches zetten zichtbaarheid terug
    }
  }
  // 's Avonds verlichte ramen, verre herkenningspunten in de nevel van de lucht.
  const d = globalThis.BerlinRender?.daylight ?? 1, night = Math.round(Math.max(0, Math.min(1, (0.5 - d) * 2.4)) * 50) / 50;
  const sky = game.scene?.fog?.color;
  for (const e of entries.values()) {
    if (!e.built) continue;
    if (night !== lastNight) for (const m of e.built.walls) m.emissiveIntensity = night * 1.15;
    for (const m of e.built.far) {
      if (!m.material.userData.base) { m.material.userData.base = true; }
      m.material.color.setRGB(1, 1, 1);
      if (sky) m.material.color.lerp(sky, m.userData.haze).multiplyScalar(0.9 + 0.1 * d);
    }
  }
  lastNight = night;
  const c = ensureCredit(); if (c) c.style.display = (anyVisible || globalThis.__lineOsmVisible) ? 'block' : 'none';
}

/** Avondramen + nevel voor een los gebouwd pakket (LineSurroundings). */
export function tintPack(built, night, sky, daylight) {
  for (const m of built.walls) m.emissiveIntensity = night * 1.15;
  for (const m of built.far) { m.material.color.setRGB(1, 1, 1); if (sky) m.material.color.lerp(sky, m.userData.haze).multiplyScalar(0.9 + 0.1 * daylight); }
}
export function osmCredit() { return ensureCredit(); }
export function disposePack(built) { built.group.removeFromParent(); for (const g of built.geos) g.dispose(); for (const m of built.mats) m.dispose(); }

export const Surroundings = {
  version: VERSION,
  slugs: SLUGS,
  has(line, id) { return line === 'U2' && SLUGS.includes(id); },
  /** BlenderStationsV1.install: geïnstalleerd sjabloon (root) in de stationschunk (parent). */
  register(g, root, parent, station, profile) {
    if (!this.has(profile.line || 'U2', profile.id)) return false;
    game = game || g;
    entries.set(root, { root, parent, station, slug: profile.id, built: null, loading: false, hidden: new Map() });
    if (!tickId) tickId = Tick.every('g4.surroundings', 600, update);
    update();
    return true;
  },
  /** BlenderStationsV1.drop */
  unregister(root) { const e = entries.get(root); if (e) { dispose(e); entries.delete(root); } },
  status() {
    return { version: VERSION, packs: SLUGS.length, registered: entries.size, loaded: [...entries.values()].filter(e => e.built).map(e => e.slug),
      visible: [...entries.values()].filter(e => e.built?.group.visible).map(e => e.slug), ...counts, attribution: '© OpenStreetMap-bijdragers' };
  },
};
globalThis.BerlinSurroundings = Surroundings;
