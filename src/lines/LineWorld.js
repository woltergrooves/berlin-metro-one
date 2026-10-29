// Berlin Life — LineWorld: generieke bouwer voor nieuwe metrolijnen (Mijlpaal 1, U1a).
//
// Eén lijn = een eigen gebied in de wereld, ver van U2/U8, zodat stations van verschillende lijnen
// elkaar nooit per ongeluk zien. Assen (zoals Surroundings.js): x langs het spoor (+ = richting het
// laatste station), z dwars (+ = rechts bij rijrichting +x), y = 0 = perronvloer.
//
// Gestreamd: alleen het station van de speler ±1 en de stukken ertussen bestaan (max. één bouwstap
// per frame). Alle statische delen worden per materiaal samengevoegd → weinig draw calls (iPad).
// Nieuwe groepen krijgen userData.line, zodat oude systemen (removeLegacy e.d.) ze herkennen.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { MaterialBase } from '../state/MaterialBase.js';

export const HALF = 36;                 // halve perronlengte (m)
export const EXIT_X = 18;               // uitgangstrap (lokaal x)
const RAIL_Y = -1.05;                   // spoorbed onder de perronvloer
const TUNNEL_TOP = 3.8;

// ── Materialen (gedeeld, per lijn één set) ─────────────────────────────────────────────────────
const MATS = new Map();
function std(name, color, opts = {}) {
  const k = name + color + JSON.stringify(Object.keys(opts));
  if (!MATS.has(k)) { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts }); m.name = name; MATS.set(k, m); }
  return MATS.get(k);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const TEX = new Map();
function tex(key, make) { if (!TEX.has(key)) TEX.set(key, make()); return TEX.get(key); }

// BVG-hangbord (zelfde stijl als StationProfiles): wit paneel, lijnsymbool, naam zwart.
function signTex(name, line, color) {
  return tex('sign:' + line + name, () => canvasTex(1024, 176, (x) => {
    x.fillStyle = '#f6f5f0'; x.fillRect(0, 0, 1024, 176); x.fillStyle = '#c9c7c0'; x.fillRect(0, 168, 1024, 8);
    x.fillStyle = color; x.fillRect(24, 34, 108, 108);
    x.fillStyle = '#fff'; x.font = '700 60px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(line, 78, 90);
    x.fillStyle = '#121212'; x.textAlign = 'left'; x.font = `700 ${name.length > 18 ? 60 : 72}px Arial`; x.fillText(name, 160, 92, 840);
  }));
}
// Wandbord: zwart emaille met witte letters (klassiek Berlijns), lijnkleur als rand.
function wallSignTex(name, color) {
  return tex('wall:' + name, () => canvasTex(1024, 200, (x) => {
    x.fillStyle = color; x.fillRect(0, 0, 1024, 200); x.fillStyle = '#16181a'; x.fillRect(10, 10, 1004, 180);
    x.fillStyle = '#f4f2ea'; x.font = `700 ${name.length > 18 ? 74 : 88}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 512, 104, 960);
  }));
}
function exitSignTex() {
  return tex('exit', () => canvasTex(512, 128, (x) => {
    x.fillStyle = '#1b4d9b'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#fff'; x.font = '700 56px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Ausgang  ↑', 256, 66);
  }));
}
function platformTex() {
  return tex('platform', () => canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8e8b84'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 110 + Math.random() * 60 | 0; x.fillStyle = `rgba(${v},${v - 3},${v - 8},0.35)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    x.strokeStyle = 'rgba(40,40,40,0.25)'; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); }
  }));
}
function concreteTex() {
  return tex('concrete', () => canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#5c5b57'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { const v = 70 + Math.random() * 40 | 0; x.fillStyle = `rgba(${v},${v},${v - 4},0.4)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(30,25,20,0.12)'; x.fillRect(0, Math.random() * h, w, 10 + Math.random() * 20); }
  }));
}
// Gevel (Altbau of jaren-70) voor de tijdelijke stadsbebouwing langs het viaduct (U1d: OSM).
function facadeTex(seed) {
  return tex('facade' + seed, () => canvasTex(256, 512, (x, w, h) => {
    const cols = ['#d8c9a8', '#c9b48c', '#b9a38a', '#d3cdbf', '#a99c8a', '#c6a37f', '#e0d6c0', '#9b8f84'];
    x.fillStyle = cols[seed % cols.length]; x.fillRect(0, 0, w, h);
    const modern = seed % 5 === 3, fl = modern ? 8 : 6, rowH = h / fl, nx = modern ? 6 : 4;
    for (let r = 0; r < fl; r++) for (let c = 0; c < nx; c++) {
      const cw = w / nx, ww = modern ? cw * 0.8 : cw * 0.44, wh = modern ? rowH * 0.45 : rowH * 0.55;
      x.fillStyle = r === fl - 1 && !modern ? 'rgba(40,36,30,0.7)' : 'rgba(34,42,52,0.85)';
      x.fillRect(c * cw + (cw - ww) / 2, r * rowH + rowH * 0.22, ww, wh);
      if (!modern) { x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(c * cw + (cw - ww) / 2 - 3, r * rowH + rowH * 0.22 - 4, ww + 6, 4); }
    }
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 0, w, 10);
  }));
}

// ── Bouwset: verzamelt geometrie per materiaal en voegt die samen ──────────────────────────────────
class Kit {
  constructor() { this.parts = new Map(); }
  add(mat, geo) { if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(geo); }
  box(mat, sx, sy, sz, x, y, z, uvScale = 0, ry = 0) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    if (uvScale) MaterialBase.station.boxUV(g, uvScale);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z); this.add(mat, g); return g;
  }
  // Verticale wand langs x op dwarspositie z, met de goede kant naar het spoor/perron.
  wallX(mat, x0, x1, y0, y1, z, facing, W = 3, H = 4.4, Y0 = -0.2) {
    const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, (x0 + u * (x1 - x0)) / W, (y0 + v * (y1 - y0) - Y0) / H); }
    if (facing < 0) g.rotateY(Math.PI);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, z); this.add(mat, g);
  }
  // Horizontaal vlak (vloer naar boven, plafond naar beneden).
  flat(mat, x0, x1, z0, z1, y, up = true, tile = 4) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0)) / tile, (z0 + uv.getY(i) * (z1 - z0)) / tile);
    g.rotateX(up ? -Math.PI / 2 : Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); this.add(mat, g);
  }
  plane(mat, w, h, matrix) { const g = new THREE.PlaneGeometry(w, h); g.applyMatrix4(matrix); this.add(mat, g); }
  build(name) {
    const group = new THREE.Group(); group.name = name;
    for (const [mat, geos] of this.parts) {
      const clean = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; });
      const merged = mergeGeometries(clean, false); clean.forEach(g => g.dispose()); geos.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat); mesh.name = name + ':' + mat.name; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.receiveShadow = true; group.add(mesh);
    }
    return group;
  }
}
const M4 = (x, y, z, ry = 0) => new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);

// ── Dwarsprofiel per perronvorm ──────────────────────────────────────────────────────────────────
export function crossSection(layout) {
  return layout === 'island'
    ? { tracks: [-5.0, 5.0], plat: [[-3.55, 3.55]], wall: 7.1, walk: [[-3.2, 3.2]] }
    : { tracks: [-1.75, 1.75], plat: [[-7.1, -3.35], [3.35, 7.1]], wall: 7.5, walk: [[-6.85, -3.6], [3.6, 6.85]] };
}

function mats(line) {
  return {
    platform: std('LinePlatform', '#ffffff', { map: platformTex(), roughness: 0.75 }),
    edge: std('LineEdgeWhite', '#e9e6dc', { roughness: 0.6 }),
    tactile: std('LineTactile', '#cfc8b0', { roughness: 0.9 }),
    bed: std('LineTrackBed', '#3b3632', { roughness: 0.95 }),
    rail: std('LineRail', '#9aa0a2', { roughness: 0.35, metalness: 0.85 }),
    sleeper: std('LineSleeper', '#4a3f36', { roughness: 0.95 }),
    concrete: std('LineConcrete', '#ffffff', { map: concreteTex(), roughness: 0.9 }),
    steel: std('LineSteel', line.steel || '#3f5a4a', { roughness: 0.55, metalness: 0.45 }),
    dark: std('LineDark', '#1e2124', { roughness: 0.9 }),
    lamp: std('WarmFluorescent', '#fff1d0', { emissive: '#fff1d0', emissiveIntensity: 1 }),
    glass: std('LineGlass', '#a9c3cf', { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 }),
    bench: std('LineBench', '#8a5a34', { roughness: 0.7 }),
    asphalt: std('LineAsphalt', '#3d3e40', { roughness: 0.95 }),
    pavement: std('LinePavement', '#8d8a83', { map: platformTex(), roughness: 0.9 }),
    tree: std('LineTree', '#4f6f3a', { roughness: 0.9 }),
    trunk: std('LineTrunk', '#4b3a2b', { roughness: 0.95 }),
  };
}

// ── Sporen (stations en tussenstukken) ───────────────────────────────────────────────────────────
function tracks(kit, m, cs, x0, x1) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  for (const tz of cs.tracks) {
    kit.box(m.bed, len, 0.3, 3.0, cx, RAIL_Y - 0.15, tz);
    for (const s of [-0.72, 0.72]) kit.box(m.rail, len, 0.12, 0.07, cx, RAIL_Y + 0.12, tz + s);
    kit.box(m.rail, len, 0.1, 0.12, cx, RAIL_Y + 0.1, tz + Math.sign(tz || 1) * 1.28);   // stroomrail aan de buitenkant
    for (let x = x0 + 0.35; x < x1; x += 0.75) kit.box(m.sleeper, 0.24, 0.08, 2.1, x, RAIL_Y + 0.02, tz);
  }
}

// ── Station ──────────────────────────────────────────────────────────────────────────────────────
function stationKit(line, st, m) {
  const kit = new Kit(), cs = crossSection(st.layout), H = HALF, viaduct = st.kind === 'viaduct';
  tracks(kit, m, cs, -H, H);
  // Perrons met witte veiligheidslijn en geleidestrook.
  for (const [z0, z1] of cs.plat) {
    kit.box(m.platform, H * 2, 1.05, z1 - z0, 0, -0.525, (z0 + z1) / 2, 2);
    kit.flat(m.platform, -H, H, z0, z1, 0.001, true, 4);
    for (const ze of [z0, z1]) {
      const edgeToTrack = cs.tracks.some(t => Math.abs(t - ze) < 3.6);
      if (!edgeToTrack) continue;
      const inward = ze === z0 ? 1 : -1;
      kit.box(m.edge, H * 2, 0.012, 0.1, 0, 0.006, ze + inward * 0.42);
      kit.box(m.tactile, H * 2, 0.014, 0.3, 0, 0.007, ze + inward * 0.75);
    }
  }
  // Banken.
  for (const [z0, z1] of cs.plat) {
    const zc = cs.plat.length === 1 ? 0 : (z0 + z1) / 2 + Math.sign(z0) * 0.9;
    for (const x of [-27, -9, 9, 27]) { kit.box(m.bench, 2.1, 0.08, 0.5, x, 0.45, zc); kit.box(m.steel, 0.1, 0.45, 0.4, x - 0.9, 0.22, zc); kit.box(m.steel, 0.1, 0.45, 0.4, x + 0.9, 0.22, zc); }
  }
  // Hang- en wandborden.
  const sign = std('Line_Sign_' + st.id, '#ffffff', { map: signTex(st.name, line.id, line.color), roughness: 0.6 });
  const signY = viaduct ? 2.75 : 3.0;
  for (const [z0, z1] of cs.plat) {
    const zc = cs.plat.length === 1 ? 0 : (z0 + z1) / 2;
    for (const x of [-26, -9, 9, 26]) {
      kit.plane(sign, 3.2, 0.55, M4(x, signY, zc + 0.03)); kit.plane(sign, 3.2, 0.55, M4(x, signY, zc - 0.03, Math.PI));
      for (const dx of [-1.3, 1.3]) kit.box(m.steel, 0.04, (viaduct ? 3.45 : TUNNEL_TOP) - signY - 0.27, 0.04, x + dx, (signY + 0.27 + (viaduct ? 3.45 : TUNNEL_TOP)) / 2, zc);
    }
  }
  // Uitgang (trap) — U1e maakt hem begaanbaar met Street View.
  const exitMat = std('Line_Exit', '#ffffff', { map: exitSignTex(), roughness: 0.6 });
  const ez = cs.plat.length === 1 ? 0 : (cs.plat[1][0] + cs.plat[1][1]) / 2;
  // x = 18: tussen de zuilen (raster 9 m vanaf −31,5) van een middenperron.
  kit.box(m.dark, 6, 0.02, 1.9, EXIT_X, 0.02, ez); // trapgat
  for (const s of [-1, 1]) kit.box(m.steel, 6, 1.05, 0.06, EXIT_X, 0.52, ez + s * 1.0);
  kit.box(m.steel, 0.06, 1.05, 2.0, EXIT_X - 3, 0.52, ez);
  kit.plane(exitMat, 1.6, 0.4, M4(EXIT_X - 3.1, 2.3, ez, -Math.PI / 2));

  if (!viaduct) tunnelShell(kit, m, st, cs, -H, H, true);
  else viaductShell(kit, m, st, cs, -H, H, true);
  return kit;
}

function tunnelShell(kit, m, st, cs, x0, x1, isStation) {
  const W = cs.wall;
  if (isStation) {
    const spec = { W: 3, H: 4.4, y0: -0.2, c: st.wall, t: 'square', dado: { c: st.accent, h: 0.7 }, bands: [[st.accent, 2.15, 0.07]] };
    const wall = std('Line_Wall_' + st.id, '#ffffff', { map: MaterialBase.station.wall(spec), roughness: 0.35 });
    for (const s of [-1, 1]) kit.wallX(wall, x0, x1, RAIL_Y - 0.3, TUNNEL_TOP, s * W, -s);
    const ceil = std('Ceiling', '#ffffff', { map: MaterialBase.station.ceiling({ t: 'flat', c: '#e9e6dc' }), roughness: 0.9 });
    ceil.userData.g3b = 'ceiling';
    kit.flat(ceil, x0, x1, -W, W, TUNNEL_TOP, false, 3);
    // Wandborden met de naam, naar het spoor (eilandperron) of achter het perron (zijperrons).
    const ws = std('Line_WallSign_' + st.id, '#ffffff', { map: wallSignTex(st.name, st.accent), roughness: 0.4 });
    for (const x of [-24, 0, 24]) for (const s of [-1, 1]) kit.plane(ws, 4.2, 0.82, M4(x, 1.85, s * (W - 0.02), s > 0 ? Math.PI : 0));
    // Zuilen (eilandperron: middenrij), geklonken staal in accentkleur.
    if (cs.plat.length === 1) { const col = std('Line_Col_' + st.id, st.accent, { roughness: 0.5, metalness: 0.4 }); for (let x = -HALF + 4.5; x < HALF; x += 9) { kit.box(col, 0.42, TUNNEL_TOP, 0.42, x, TUNNEL_TOP / 2, 0); kit.box(col, 0.9, 0.28, 0.5, x, TUNNEL_TOP - 0.14, 0); } }
    // TL-buizen.
    for (let x = x0 + 2; x < x1; x += 4) for (const z of cs.plat.length === 1 ? [-1.8, 1.8] : [-5.2, 5.2]) kit.box(m.lamp, 1.5, 0.06, 0.12, x, TUNNEL_TOP - 0.06, z);
  } else {
    for (const s of [-1, 1]) kit.wallX(m.concrete, x0, x1, RAIL_Y - 0.3, TUNNEL_TOP, s * W, -s, 4, 4, 0);
    kit.flat(m.concrete, x0, x1, -W, W, TUNNEL_TOP, false, 4);
    kit.flat(m.dark, x0, x1, -W, W, RAIL_Y - 0.29, true, 4);
    for (let x = x0 + 6; x < x1; x += 12) for (const s of [-1, 1]) kit.box(m.lamp, 0.25, 0.12, 0.08, x, 2.6, s * (W - 0.05));
  }
}

// Viaduct: dek, stalen liggers, kolommen tot de straat, leuningen; bij een station perronkappen.
function viaductShell(kit, m, st, cs, x0, x1, isStation, elev0 = st.elev, elev1 = st.elev, withStreet = true) {
  const len = x1 - x0, cx = (x0 + x1) / 2, deckW = isStation ? cs.wall * 2 : 9.4;
  kit.box(m.steel, len, 0.9, deckW, cx, RAIL_Y - 0.75, 0);                    // dek + hoofdliggers
  for (const s of [-1, 1]) kit.box(m.steel, len, 0.5, 0.3, cx, RAIL_Y - 1.4, s * (deckW / 2 - 0.4));
  for (let x = x0 + 6; x < x1; x += 12) {
    const t = (x - x0) / len, g = -(elev0 + (elev1 - elev0) * t);              // straathoogte hier
    const h = RAIL_Y - 1.2 - g;
    if (h > 0.5) for (const s of [-1, 1]) kit.box(m.steel, 0.5, h, 0.5, x, g + h / 2, s * 3.6);
    if (h > 0.5) kit.box(m.steel, 0.4, 0.5, 8.2, x, RAIL_Y - 1.45, 0);
  }
  if (!isStation) { for (const s of [-1, 1]) { kit.box(m.steel, len, 0.06, 0.06, cx, 0.1, s * 4.6); kit.box(m.steel, len, 0.5, 0.05, cx, -0.15, s * 4.6); } }
  if (isStation) {
    // Perronkappen: staanders + licht hellend dak per perron; buitenleuning met glas.
    const roof = std('Line_Roof_' + st.id, st.accent, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
    for (const [z0, z1] of cs.plat) {
      const zc = (z0 + z1) / 2, wz = z1 - z0 + 0.8;
      kit.box(roof, x1 - x0 - 6, 0.12, wz, cx, 3.5, zc);
      kit.box(m.steel, x1 - x0 - 6, 0.3, 0.2, cx, 3.3, zc);
      const postZ = cs.plat.length === 1 ? 0 : zc + Math.sign(zc) * 1.2;
      for (let x = x0 + 5; x < x1 - 4; x += 8) kit.box(m.steel, 0.22, 3.4, 0.22, x, 1.7, postZ);
      for (let x = x0 + 5; x < x1 - 4; x += 8) kit.box(m.lamp, 1.4, 0.06, 0.12, x + 4, 3.36, zc);
    }
    for (const s of [-1, 1]) {
      const outer = cs.plat.length === 1 ? cs.wall : cs.plat[s > 0 ? 1 : 0][s > 0 ? 1 : 0];
      if (cs.plat.length === 1) continue;  // eilandperron: buitenkant is spoor
      kit.box(m.steel, x1 - x0, 0.06, 0.06, cx, 1.1, outer + s * 0.05);
      kit.box(m.glass, x1 - x0, 1.0, 0.03, cx, 0.55, outer + s * 0.05);
    }
  }
  if (withStreet) street(kit, m, st, x0, x1, elev0, elev1);
}

// Straat onder het viaduct + tijdelijke bebouwing en bomen (U1d vervangt dit door OSM-pakketten).
function street(kit, m, st, x0, x1, elev0, elev1) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  const geoGround = (mat, z0, z1, lift) => {
    const g = new THREE.PlaneGeometry(len, z1 - z0); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = (p.getX(i) + len / 2) / len; p.setY(i, -(elev0 + (elev1 - elev0) * t) + lift); }
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * len) / 4, (z0 + uv.getY(i) * (z1 - z0)) / 4);
    g.computeVertexNormals(); g.translate(cx, 0, (z0 + z1) / 2); kit.add(mat, g);
  };
  geoGround(m.asphalt, -18, 18, 0);                 // middenberm + rijbanen
  geoGround(m.pavement, -26, -18, 0.15); geoGround(m.pavement, 18, 26, 0.15);
  geoGround(m.asphalt, -130, -26, 0.05); geoGround(m.asphalt, 26, 130, 0.05);   // achter de gevels (zijstraten, binnenplaatsen)
  // Gevels aan beide kanten (straatblokken, af en toe een gat voor een zijstraat).
  const seed = st.index * 31;
  for (const s of [-1, 1]) {
    let x = x0 + ((seed * 7) % 9);
    let k = 0;
    while (x < x1 - 4) {
      const w = 14 + ((seed + k * 13) % 9), hgt = 17 + ((seed + k * 7) % 6) + (k % 4 === 3 ? 6 : 0);
      if ((seed + k) % 7 === 5) { x += 16; k++; continue; }  // zijstraat
      const ww = Math.min(w, x1 - x); if (ww < 4) break;
      const t = (x + ww / 2 - x0) / len, g = -(elev0 + (elev1 - elev0) * t);
      const f = std('Line_Facade_' + ((seed + k) % 8), '#ffffff', { map: facadeTex((seed + k) % 8), roughness: 0.9 });
      const b = kit.box(f, ww, hgt, 12, x + ww / 2, g + hgt / 2, s * 32);
      // UV per gevel: hele textuur over de voorkant, herhaald per ±14 m.
      const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ww / 14, uv.getY(i));
      kit.box(m.dark, ww, 0.6, 12.4, x + ww / 2, g + hgt + 0.3, s * 32);
      x += ww; k++;
    }
    // Straatbomen op de stoep.
    for (let tx = x0 + 5 + (seed % 5); tx < x1; tx += 11) {
      const t = (tx - x0) / len, g = -(elev0 + (elev1 - elev0) * t);
      kit.box(m.trunk, 0.35, 3.2, 0.35, tx, g + 1.6, s * 21);
      const crown = new THREE.IcosahedronGeometry(2.6, 1); crown.scale(1, 1.15, 1); crown.translate(tx, g + 5.4, s * 21); kit.add(m.tree, crown);
    }
  }
}

// ── Tussenstukken ────────────────────────────────────────────────────────────────────────────────
function segmentKit(line, a, b, m) {
  const kit = new Kit(), x0 = HALF, x1 = b.x - a.x - HALF;      // in de ruimte van station a
  const csA = crossSection(a.layout), csB = crossSection(b.layout);
  const cs = { ...csA, tracks: csA.tracks, wall: Math.max(csA.wall, csB.wall) };
  // Sporen: lopen recht door; bij wisselende perronvorm buigen ze in het midden (eenvoudige S-bocht).
  if (csA.tracks[1] === csB.tracks[1]) tracks(kit, m, cs, x0, x1);
  else {
    const mid = (x0 + x1) / 2;
    tracks(kit, m, csA, x0, mid - 12); tracks(kit, m, csB, mid + 12, x1);
    for (let i = 0; i < 2; i++) {
      const za = csA.tracks[i], zb = csB.tracks[i], ang = Math.atan2(zb - za, 24), len = Math.hypot(24, zb - za);
      for (const s of [-0.72, 0.72]) kit.box(m.rail, len, 0.12, 0.07, mid, RAIL_Y + 0.12, (za + zb) / 2 + s, 0, -ang);
      kit.box(m.bed, len, 0.3, 3.0, mid, RAIL_Y - 0.15, (za + zb) / 2, 0, -ang);
    }
  }
  if (a.kind === 'tunnel' && b.kind === 'tunnel') tunnelShell(kit, m, a, cs, x0, x1, false);
  else if (a.kind === 'viaduct' && b.kind === 'viaduct') viaductShell(kit, m, a, cs, x0, x1, false, a.elev, b.elev);
  else {
    // Tunnelmond: eerst tunnel, dan een open helling (keerwanden), dan het viaduct.
    const tunnelFirst = a.kind === 'tunnel', len = x1 - x0;
    const tA = tunnelFirst ? x0 : x1 - len * 0.38, tB = tunnelFirst ? x0 + len * 0.38 : x1;
    tunnelShell(kit, m, a, cs, tA, tB, false);
    const rA = tunnelFirst ? tB : x0 + len * 0.3, rB = tunnelFirst ? x0 + len * 0.62 : tA;
    const ramp = rB - rA;
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {               // keerwanden die aflopen
      const xs = rA + (i + 0.5) * ramp / 6, f = tunnelFirst ? 1 - (i + 0.5) / 6 : (i + 0.5) / 6;
      const h = (TUNNEL_TOP - RAIL_Y) * f + 0.4;
      kit.box(m.concrete, ramp / 6, h, 0.5, xs, RAIL_Y + h / 2 - 0.3, s * cs.wall, 2);
    }
    const vA = tunnelFirst ? rB : x0, vB = tunnelFirst ? x1 : rA;
    const el = tunnelFirst ? b.elev : a.elev, vst = tunnelFirst ? b : a;
    // Maaiveld: op tunnelhoogte (+3,8) bij de helling, aflopend naar de straat onder het viaduct (talud).
    const sA = tunnelFirst ? rA : x0, sB = tunnelFirst ? x1 : rB;
    const e0 = tunnelFirst ? -TUNNEL_TOP : el, e1 = tunnelFirst ? el : -TUNNEL_TOP;
    const eAt = x => e0 + (e1 - e0) * (x - sA) / (sB - sA);
    viaductShell(kit, m, vst, { ...cs }, vA, vB, false, eAt(vA), eAt(vB), false);
    street(kit, m, vst, sA, sB, e0, e1);
  }
  return kit;
}

// ── Lijnwereld met streaming ─────────────────────────────────────────────────────────────────────
export class LineWorld {
  constructor(scene, line, stations) {
    this.scene = scene; this.line = line; this.stations = stations;
    this.root = new THREE.Group(); this.root.name = 'Line:' + line.id; this.root.userData.line = line.id;
    this.root.position.set(0, line.origin.y, line.origin.z);
    scene.add(this.root);
    this.m = mats(line);
    this.stationGroups = new Map(); this.segmentGroups = new Map();
    this.queue = []; this.built = 0;
  }
  indexOf(x) { return Math.max(0, Math.min(this.stations.length - 1, Math.round((x - this.stations[0].x) / this.line.spacing))); }
  wanted(index) {
    const st = new Set(), seg = new Set();
    for (let i = index - 1; i <= index + 1; i++) if (i >= 0 && i < this.stations.length) st.add(i);
    for (let i = index - 2; i <= index + 1; i++) if (i >= 0 && i < this.stations.length - 1) seg.add(i);
    return { st, seg };
  }
  /** Bouwt/verwijdert stations rond de speler. active=false → alles verbergen (speler is niet op deze lijn). */
  update(x, active) {
    this.root.visible = active;
    if (!active) { if (performance.now() - (this.lastActive || 0) > 20000) this.clear(); return; }
    this.lastActive = performance.now();
    const idx = this.indexOf(x), w = this.wanted(idx);
    for (const [i, g] of this.stationGroups) if (!w.st.has(i)) { this.dispose(g); this.stationGroups.delete(i); }
    for (const [i, g] of this.segmentGroups) if (!w.seg.has(i)) { this.dispose(g); this.segmentGroups.delete(i); }
    // Eerst het eigen station, dan de rest op afstand.
    const todo = [...[...w.st].map(i => ['st', i]), ...[...w.seg].map(i => ['seg', i])]
      .filter(([k, i]) => !(k === 'st' ? this.stationGroups : this.segmentGroups).has(i))
      .sort((a, b) => Math.abs(a[1] + (a[0] === 'seg' ? 0.5 : 0) - idx) - Math.abs(b[1] + (b[0] === 'seg' ? 0.5 : 0) - idx));
    if (todo.length) this.buildOne(...todo[0]);
    return idx;
  }
  /** Synchroon alles om index heen bouwen (bij teleport, zodat je niet in het niets staat). */
  prime(index) { const w = this.wanted(index); for (const i of [index, ...w.st]) if (!this.stationGroups.has(i)) this.buildOne('st', i); }
  buildOne(kind, i) {
    const a = this.stations[i];
    const kit = kind === 'st' ? stationKit(this.line, a, this.m) : segmentKit(this.line, a, this.stations[i + 1], this.m);
    const g = kit.build(`${this.line.id}:${kind}:${a.id}`);
    g.position.x = a.x; g.userData.line = this.line.id; g.userData.lineStation = i;
    this.root.add(g); this.built++;
    (kind === 'st' ? this.stationGroups : this.segmentGroups).set(i, g);
  }
  dispose(g) { g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); g.parent?.remove(g); }
  clear() { for (const g of this.stationGroups.values()) this.dispose(g); for (const g of this.segmentGroups.values()) this.dispose(g); this.stationGroups.clear(); this.segmentGroups.clear(); }
  status() { return { stations: [...this.stationGroups.keys()].map(i => this.stations[i].id), segments: this.segmentGroups.size, built: this.built }; }
}
