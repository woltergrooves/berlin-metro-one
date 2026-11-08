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
export const TRANSFER_X = -19;          // overstaptrap (U1c), gespiegeld aan de uitgang; tussen zuilen/kapstaanders
const RAIL_Y = -1.05;                   // spoorbed onder de perronvloer
const TUNNEL_TOP = 3.8;
export const CUT_TOP = 5.2;               // maaiveld boven een open ingraving (U3: Dahlem/Zehlendorf)

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
function signTex(name, line, color, sbahn = false) {
  if (sbahn) return tex('ssign:' + name, () => canvasTex(1024, 176, (x) => {   // S-Bahn Berlin: donkergroen bord, wit S-logo, witte naam
    x.fillStyle = '#0b6a3a'; x.fillRect(0, 0, 1024, 176); x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, 1024, 6); x.fillRect(0, 170, 1024, 6);
    x.fillStyle = '#f2f2ee'; x.beginPath(); x.arc(84, 88, 56, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#0b6a3a'; x.font = '700 80px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('S', 84, 93);
    x.fillStyle = '#f6f5f0'; x.textAlign = 'left'; x.font = `700 ${name.length > 18 ? 60 : 72}px Arial`; x.fillText(name, 170, 92, 830);
  }));
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
// Overstapbord (U1c): lijnsymbool van de doellijn + "Übergang" + eindpunten.
// U3c: `also` = extra lijnsymbolen (U2/U8-perron: U1 + U3); `closed` = lijn nog niet in het spel (gesloten trapgat).
export function transferSignTex(t) {
  const badges = [t, ...(t.also || [])];
  return tex('xfer:' + badges.map(b => b.line).join('+') + t.towards + (t.closed ? ':closed' : ''), () => canvasTex(768, 192, (x) => {
    x.fillStyle = '#1b4d9b'; x.fillRect(0, 0, 768, 192);
    const bw = badges.length > 1 ? 104 : 132;
    badges.forEach((b, i) => {
      const bx = 22 + i * (bw + 12), by = 30 + (132 - bw) / 2;
      x.fillStyle = b.color; x.fillRect(bx, by, bw, bw);
      if (b.line === 'S') { x.fillStyle = '#fff'; x.beginPath(); x.arc(bx + bw / 2, by + bw / 2, bw * 0.4, 0, Math.PI * 2); x.fill(); x.fillStyle = b.color; }
      else x.fillStyle = b.text || '#fff';
      x.font = `700 ${bw > 110 ? 72 : 58}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(b.line, bx + bw / 2, by + bw / 2 + 4);
    });
    const tx = 22 + badges.length * (bw + 12) + 16;
    x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = '700 64px Arial'; x.fillText('Übergang  ↓', tx, 66, 746 - tx);
    x.font = '700 40px Arial'; x.fillText(t.towards, tx, 140, 750 - tx);
    if (t.closed) { x.fillStyle = '#c8102e'; x.fillRect(0, 176, 768, 16); }
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

function brickTex() {
  return tex('brick', () => canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#7a3b2e'; x.fillRect(0, 0, w, h);
    const bh = 16, bw = 42;
    for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
      const o = r % 2 ? bw / 2 : 0, v = Math.random();
      x.fillStyle = `rgb(${150 + v * 40 | 0},${62 + v * 22 | 0},${44 + v * 14 | 0})`;
      x.fillRect(c * bw + o + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
  }));
}
function waterTex() {
  return tex('water', () => canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#3d5a63'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${150 + Math.random() * 80 | 0},${180 + Math.random() * 60 | 0},200,0.10)`; x.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 18, 1.5); }
  }));
}

// ── Bouwset: verzamelt geometrie per materiaal en voegt die samen ──────────────────────────────────
export class Kit {
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
    ? { tracks: [-5.15, 5.15], plat: [[-3.55, 3.55]], wall: 7.1, walk: [[-3.2, 3.2]] }
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
    brick: std('LineBrick', '#ffffff', { map: brickTex(), roughness: 0.92 }),
    stone: std('LineStone', '#a39b8c', { map: concreteTex(), roughness: 0.9 }),
    water: std('LineWater', '#ffffff', { map: waterTex(), roughness: 0.15, metalness: 0.15 }),
    copper: std('LineCopper', '#5e8f7d', { roughness: 0.6, metalness: 0.3 }),
    grass: std('LineGrass', '#5d7a43', { roughness: 1 }),
    villa: std('LineVilla', '#e6dccb', { roughness: 0.85 }),
    tiles: std('LineRoofTiles', '#8e3f2c', { roughness: 0.8 }),
    ballast: std('LineBallast', '#6b655c', { roughness: 1 }),
  };
}

// ── Sporen (stations en tussenstukken) ───────────────────────────────────────────────────────────
function tracks(kit, m, cs, x0, x1) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  for (const tz of cs.tracks) {
    kit.box(m.bed, len, 0.3, 3.0, cx, RAIL_Y - 0.15, tz);
    for (const s of [-0.72, 0.72]) kit.box(m.rail, len, 0.12, 0.07, cx, RAIL_Y + 0.12, tz + s);
    if (!cs.noThird) kit.box(m.rail, len, 0.1, 0.12, cx, RAIL_Y + 0.1, tz + Math.sign(tz || 1) * 1.28);   // stroomrail aan de buitenkant (Fernbahn: geen)
    for (let x = x0 + 0.35; x < x1; x += 0.75) kit.box(m.sleeper, 0.24, 0.08, 2.1, x, RAIL_Y + 0.02, tz);
  }
}

// ── Station ──────────────────────────────────────────────────────────────────────────────────────
function stationKit(line, st, m) {
  const kit = new Kit(), city = new Kit(), cs = crossSection(st.layout), H = HALF, viaduct = st.kind !== 'tunnel';   // viaduct én ingraving: perronkappen
  const rodTop = isVault(st) ? 6.6 : viaduct ? 3.45 : TUNNEL_TOP;
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
  const sign = std('Line_Sign_' + st.id, '#ffffff', { map: signTex(st.name, line.id, line.color, line.sbahn), roughness: 0.6 });
  const signY = viaduct ? 2.75 : 3.0;
  for (const [z0, z1] of cs.plat) {
    const zc = cs.plat.length === 1 ? 0 : (z0 + z1) / 2;
    for (const x of [-26, -9, 9, 26]) {
      kit.plane(sign, 3.2, 0.55, M4(x, signY, zc + 0.03)); kit.plane(sign, 3.2, 0.55, M4(x, signY, zc - 0.03, Math.PI));
      for (const dx of [-1.3, 1.3]) kit.box(m.steel, 0.04, rodTop - signY - 0.27, 0.04, x + dx, (signY + 0.27 + rodTop) / 2, zc);
    }
  }
  // Uitgang (trap) — U1e maakt hem begaanbaar met Street View.
  const exitMat = std('Line_Exit', '#ffffff', { map: exitSignTex(), roughness: 0.6 });
  const ez = cs.plat.length === 1 ? 0 : (cs.plat[1][0] + cs.plat[1][1]) / 2;
  // x = 18: tussen de zuilen (raster 9 m vanaf −31,5) van een middenperron.
  if (st.kind === 'cutting') exitUp(kit, m, st, cs, ez, exitMat);   // ingraving: trap omhoog naar de straatbrug
  else {
    kit.box(m.dark, 6, 0.02, 1.9, EXIT_X, 0.02, ez); // trapgat
    for (const s of [-1, 1]) kit.box(m.steel, 6, 1.05, 0.06, EXIT_X, 0.52, ez + s * 1.0);
    kit.box(m.steel, 0.06, 1.05, 2.0, EXIT_X - 3, 0.52, ez);
    kit.plane(exitMat, 1.6, 0.4, M4(EXIT_X - 3.1, 2.3, ez, -Math.PI / 2));
  }
  // Overstap (U1c): trapgat aan de andere kant, borden aan beide uiteinden. Erin lopen = overstappen.
  if (st.transfer) {
    const xm = std('Line_Transfer_' + st.line + '_' + st.id, '#ffffff', { map: transferSignTex(st.transfer), roughness: 0.6 });
    kit.box(m.dark, 6, 0.02, 1.9, TRANSFER_X, 0.021, ez);
    for (const s of [-1, 1]) kit.box(m.steel, 6, 1.05, 0.06, TRANSFER_X, 0.52, ez + s * 1.0);
    for (const s of [-1, 1]) {
      kit.plane(xm, 1.9, 0.475, M4(TRANSFER_X + s * 3.1, 2.25, ez, s * Math.PI / 2));
      kit.box(m.steel, 0.04, 1.2, 0.04, TRANSFER_X + s * 3.12, 3.1, ez);
    }
    kit.box(m.steel, 0.06, 1.05, 2.0, TRANSFER_X - 3, 0.52, ez);   // open naar het stationsmidden
    if (st.transfer.closed) {   // U3c: lijn nog niet in het spel → rood-wit hek over de open kant
      const red = std('Line_Barrier_Red', '#c8102e', { roughness: 0.5 }), white = std('Line_Barrier_White', '#f2f2ee', { roughness: 0.5 });
      for (let i = 0; i < 6; i++) kit.box(i % 2 ? white : red, 0.08, 0.16, 0.32, TRANSFER_X + 3, 0.95, ez - 0.8 + i * 0.32);
      for (const s of [-1, 1]) kit.box(m.steel, 0.06, 1.0, 0.06, TRANSFER_X + 3, 0.5, ez + s * 0.92);
      kit.box(m.steel, 0.04, 0.04, 1.9, TRANSFER_X + 3, 0.45, ez);
    }
  }

  if (st.kind === 'tunnel') tunnelShell(kit, m, st, cs, -H, H, true);
  else if (st.kind === 'cutting') cuttingShell(kit, m, st, cs, -H, H, true, city);
  else viaductShell(kit, m, st, cs, -H, H, true, st.elev, st.elev, true, city);
  if (st.end) {   // U5 Hönow: bovengronds eindpunt — kopsporen voorbij het perron (keren + aanrijden, CONFIG.train.approachDistance 58 m), stootjukken
    tracks(kit, m, cs, H, H + 96);
    if (st.embank) embankment(kit, m, H, H + 98, cs.wall * 2, st.elev, st.elev);
    const red = std('Line_Barrier_Red', '#c8102e', { roughness: 0.5 });
    for (const tz of cs.tracks) { kit.box(m.steel, 0.5, 1.1, 2.4, H + 95.5, RAIL_Y + 0.55, tz); kit.box(red, 0.12, 0.4, 2.0, H + 95.2, RAIL_Y + 0.95, tz); }
    street(city, m, st, H, H + 110, st.elev, st.elev);
  }
  return { kit, city };
}

function tunnelShell(kit, m, st, cs, x0, x1, isStation) {
  const W = cs.wall;
  if (isStation) {
    const spec = { W: 3, H: 4.4, y0: -0.2, c: st.wall, t: 'square', dado: { c: st.accent, h: 0.7 }, bands: [[st.accent, 2.15, 0.07]] };
    const wall = std('Line_Wall_' + st.id, '#ffffff', { map: MaterialBase.station.wall(spec), roughness: 0.35 });
    for (const s of [-1, 1]) kit.wallX(wall, x0, x1, RAIL_Y - 0.3, TUNNEL_TOP, s * W, -s);
    const ceil = std('Ceiling', '#ffffff', { map: MaterialBase.station.ceiling({ t: 'flat', c: '#e9e6dc' }), roughness: 0.9 });
    ceil.userData.g3b = 'ceiling';
    if (isVault(st)) vault(kit, m, st, W, x0, x1); else kit.flat(ceil, x0, x1, -W, W, TUNNEL_TOP, false, 3);
    if (st.profile?.kind === 'park') {   // U4 Rathaus Schöneberg: grote ramen naar het park, aan beide kanten
      const win = std('Line_ParkWindow', '#ffffff', { map: parkWindowTex(), emissive: '#ffffff', emissiveMap: parkWindowTex(), emissiveIntensity: 0.55, roughness: 0.25 });
      for (let x = x0 + 4; x + 6 <= x1 - 4; x += 7) for (const s of [-1, 1]) kit.plane(win, 6.2, 2.5, M4(x + 3, 2.25, s * (W - 0.04), s > 0 ? Math.PI : 0));
    }
    if (st.profile?.kind === 'photos') {   // U5 Brandenburger Tor: historische foto's (sepia) tussen de naamborden
      const ph = std('Line_Photos', '#ffffff', { map: photoWallTex(), roughness: 0.5 });
      for (const x of [-36, -12, 12, 36]) for (const s of [-1, 1]) kit.plane(ph, 14, 1.9, M4(x, 2.55, s * (W - 0.03), s > 0 ? Math.PI : 0));
    }
    if (st.profile?.kind === 'murals') {   // U5 Magdalenenstraße / Tierpark: wandschilderingen tussen de naamborden
      const mu = std('Line_Mural_' + st.profile.style, '#ffffff', { map: muralTex(st.profile.style), roughness: 0.6 });
      for (const x of [-36, -12, 12, 36]) for (const s of [-1, 1]) kit.plane(mu, 14, 2.2, M4(x, 2.6, s * (W - 0.03), s > 0 ? Math.PI : 0));
    }
    // Wandborden met de naam, naar het spoor (eilandperron) of achter het perron (zijperrons).
    const ws = std('Line_WallSign_' + st.id, '#ffffff', { map: wallSignTex(st.name, st.accent), roughness: 0.4 });
    for (const x of [-24, 0, 24]) for (const s of [-1, 1]) kit.plane(ws, 4.2, 0.82, M4(x, 1.85, s * (W - 0.02), s > 0 ? Math.PI : 0));
    // Zuilen (eilandperron: middenrij), geklonken staal in accentkleur.
    if (cs.plat.length === 1 && !isVault(st)) { const col = std('Line_Col_' + st.id, st.accent, { roughness: 0.5, metalness: 0.4 }); for (let x = -HALF + 4.5; x < HALF; x += 9) { kit.box(col, 0.42, TUNNEL_TOP, 0.42, x, TUNNEL_TOP / 2, 0); kit.box(col, 0.9, 0.28, 0.5, x, TUNNEL_TOP - 0.14, 0); } }
    // TL-buizen.
    for (let x = x0 + 2; x < x1; x += 4) for (const z of cs.plat.length === 1 ? [-1.8, 1.8] : [-5.2, 5.2]) kit.box(m.lamp, 1.5, 0.06, 0.12, x, TUNNEL_TOP - 0.06, z);
  } else {
    for (const s of [-1, 1]) kit.wallX(m.concrete, x0, x1, RAIL_Y - 0.3, TUNNEL_TOP, s * W, -s, 4, 4, 0);
    kit.flat(m.concrete, x0, x1, -W, W, TUNNEL_TOP, false, 4);
    kit.flat(m.dark, x0, x1, -W, W, RAIL_Y - 0.29, true, 4);
    for (let x = x0 + 6; x < x1; x += 12) for (const s of [-1, 1]) kit.box(m.lamp, 0.25, 0.12, 0.08, x, 2.6, s * (W - 0.05));
  }
}

// ── U3: open ingraving (cutting) — perron onder straatniveau, keerwanden, open lucht, villawijk erboven ──
// Keerwanden staan iets buiten het tunnelprofiel; bovenop gras, bomen en villa's (tijdelijk, in `city`).
const cutW = cs => cs.wall + 0.6;
const LOW = 1.4, SLOPE = 5.4;            // lage keerwand tot 1,4 m, daarboven een grastalud (±35°) tot het maaiveld
const cutTop = (st) => st.profile?.kind === 'ladenstrasse' ? 0 : SLOPE;   // breedte talud (Ladenstraße: rechte wand)
// U4 Rathaus Schöneberg: raamstroken naar het Rudolph-Wilde-Park (gras, bomen, vijver, lucht), groene stalen roeden.
function parkWindowTex() {
  return tex('parkwin', () => canvasTex(512, 256, (x, w, h) => {
    const sky = x.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#9fc3dc'); sky.addColorStop(1, '#d9e6ea');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {   // boomkruinen
      const cx = Math.random() * w, cy = h * (0.28 + Math.random() * 0.22), r = 22 + Math.random() * 38, g = 70 + Math.random() * 50 | 0;
      x.fillStyle = `rgb(${g - 30},${g + 30},${g - 40})`; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#6f9a4e'; x.fillRect(0, h * 0.58, w, h * 0.42);           // gazon
    x.fillStyle = '#4f7f8c'; x.beginPath(); x.ellipse(w * 0.55, h * 0.8, w * 0.32, h * 0.09, 0, 0, Math.PI * 2); x.fill();   // vijver
    x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 40; i++) x.fillRect(w * 0.3 + Math.random() * w * 0.5, h * 0.76 + Math.random() * h * 0.08, 10, 1.5);
    x.fillStyle = '#2f4a3a';                                                   // roeden + kozijn
    for (let i = 0; i <= 4; i++) x.fillRect(i * w / 4 - 5, 0, 10, h);
    x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10); x.fillRect(0, h * 0.4, w, 6);
  }));
}
function vakwerkTex() {
  return tex('vakwerk', () => canvasTex(256, 256, (c) => {
    c.fillStyle = '#efe7d6'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#4a3020'; c.lineWidth = 12;
    for (const x of [6, 128, 250]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); }
    for (const y of [6, 128, 250]) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    c.lineWidth = 9; c.beginPath(); c.moveTo(6, 128); c.lineTo(128, 6); c.moveTo(128, 6); c.lineTo(250, 128); c.stroke();
    c.fillStyle = '#2c3a40'; c.fillRect(40, 160, 48, 60); c.fillRect(168, 160, 48, 60);
    c.fillStyle = '#e9e1cc'; c.fillRect(62, 160, 4, 60); c.fillRect(190, 160, 4, 60);
  }));
}
function shopTex() {
  return tex('ladenstrasse', () => canvasTex(1024, 128, (c) => {
    const shops = [['Bäckerei', '#c9853a'], ['Blumen', '#3f7a4a'], ['Apotheke', '#b8323a'], ['Zeitschriften', '#2f5a8a'], ['Schuhe', '#6a4a7a'], ['Imbiss', '#c95a2a'], ['Optik', '#3a6a7a'], ['Reinigung', '#5a5a5a']];
    shops.forEach(([n, col], i) => {
      const x = i * 128; c.fillStyle = '#2a2d30'; c.fillRect(x, 0, 128, 128);
      c.fillStyle = col; c.fillRect(x + 4, 6, 120, 26);
      c.fillStyle = '#fff'; c.font = '700 17px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, x + 64, 19, 112);
      c.fillStyle = '#e9d9a8'; c.fillRect(x + 10, 42, 70, 80); c.fillStyle = '#b7c7cf'; c.fillRect(x + 86, 42, 34, 86);
      c.fillStyle = '#00000022'; c.fillRect(x + 10, 42, 70, 6);
    });
  }));
}
function gableRoof(kit, mat, cx, cz, len, wid, y, h, alongX = true) {
  // Zadeldak als twee schuine platen (lengte langs x of z).
  const slope = Math.hypot(wid / 2, h), ang = Math.atan2(h, wid / 2);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(alongX ? len : 0.25, 0.25, alongX ? slope + 0.6 : slope + 0.6);
    if (!alongX) { g.rotateY(Math.PI / 2); }
    const off = (wid / 4) * s;
    if (alongX) { g.rotateX(s * ang); g.translate(cx, y + h / 2, cz + off); }
    else { g.rotateZ(-s * ang); g.translate(cx + off, y + h / 2, cz); }
    kit.add(mat, g);
  }
}
function villa(kit, m, x, z, seed) {
  const w = 10 + (seed % 4), d = 9 + (seed % 3), h = 7 + (seed % 2) * 2.5;
  kit.box(m.villa, w, h, d, x, CUT_TOP + h / 2, z, 4);
  gableRoof(kit, m.tiles, x, z, w + 0.6, d + 0.6, CUT_TOP + h, 3.6, true);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) kit.box(m.dark, 1.1, 1.4, 0.05, x - w / 3 + i * w / 3, CUT_TOP + h * 0.62, z + s * (d / 2 + 0.03));
}
function cuttingShell(kit, m, st, cs, x0, x1, isStation, city = kit) {
  const W = cutW(cs), len = x1 - x0, cx = (x0 + x1) / 2, sl = isStation ? cutTop(st) : SLOPE, T = W + sl;   // T = bovenrand
  kit.flat(m.ballast, x0, x1, -W, W, RAIL_Y - 0.29, true, 3);
  const wallMat = std('LineCutWall', '#c9bea8', { map: concreteTex(), roughness: 0.9 });
  // Lage keerwand (of, bij de Ladenstraße, een rechte wand tot het maaiveld); daarboven een grastalud; hek bovenaan.
  for (const s of [-1, 1]) {
    kit.wallX(wallMat, x0, x1, RAIL_Y - 0.3, sl ? LOW : CUT_TOP, s * W, -s, 4, 4, 0);
    if (sl) {
      kit.box(m.concrete, len, 0.2, 0.5, cx, LOW + 0.1, s * (W + 0.2));
      const g = new THREE.PlaneGeometry(len, Math.hypot(sl, CUT_TOP - LOW)); g.rotateX(-Math.PI / 2);
      g.rotateX(-s * Math.atan2(CUT_TOP - LOW, sl)); g.translate(cx, (LOW + CUT_TOP) / 2, s * (W + sl / 2));
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 6, uv.getY(i));
      kit.add(m.grass, g);
      for (let x = x0 + 4 + ((st.index * 5) % 7); x < x1 - 2; x += 7 + ((x * 3) % 5)) {      // struiken op het talud
        const f = 0.35 + ((x * 7) % 5) / 10, bz = s * (W + sl * f), by = LOW + (CUT_TOP - LOW) * f;
        const b = new THREE.IcosahedronGeometry(1.3 + ((x * 11) % 3) * 0.3, 0); b.scale(1.3, 0.8, 1); b.translate(x, by + 0.6, bz); city.add(m.tree, b);
      }
    }
    kit.box(m.concrete, len, 0.3, 0.8, cx, CUT_TOP + 0.15, s * (T + 0.3));
    kit.box(m.steel, len, 0.06, 0.06, cx, CUT_TOP + 1.25, s * (T + 0.15));
    kit.box(m.steel, len, 0.04, 0.04, cx, CUT_TOP + 0.75, s * (T + 0.15));
    for (let x = x0 + 1.5; x < x1; x += 3) kit.box(m.steel, 0.05, 1.0, 0.05, x, CUT_TOP + 0.8, s * (T + 0.15));
    // Maaiveld met gras en bomen, villa's verder weg.
    city.flat(m.grass, x0, x1, s > 0 ? T + 0.7 : -T - 60, s > 0 ? T + 60 : -T - 0.7, CUT_TOP, true, 6);
    const seed = st.index * 17 + (isStation ? 3 : 7) + (s > 0 ? 5 : 0);
    for (let tx = x0 + 3 + (seed % 6); tx < x1; tx += 9 + (seed % 4)) {
      const tz = s * (T + 3 + ((tx * 7 + seed) % 9)), hh = 4 + ((tx + seed) % 3);
      city.box(m.trunk, 0.4, hh, 0.4, tx, CUT_TOP + hh / 2, tz);
      const crown = new THREE.IcosahedronGeometry(3.1, 1); crown.scale(1, 1.25, 1); crown.translate(tx, CUT_TOP + hh + 2.6, tz); city.add(m.tree, crown);
    }
    if (st.profile?.city === 'platte') for (let vx = x0 + 16 + (seed % 9); vx < x1 - 6; vx += 44 + (seed % 9)) plattenbau(city, m, vx, s * (T + 26 + (vx % 9)), seed + Math.round(vx), ((seed + vx) | 0) % 3 !== 0);
    else for (let vx = x0 + 12 + (seed % 9); vx < x1 - 6; vx += 26 + (seed % 7)) villa(city, m, vx, s * (T + 20 + (vx % 7)), seed + Math.round(vx));
  }
  if (!isStation) return;
  // Perronkappen (lichte staalconstructie, dak in accentkleur) + lampen.
  const roof = std('Line_Roof_' + st.id, st.accent, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  for (const [z0, z1] of cs.plat) {
    const zc = (z0 + z1) / 2, wz = z1 - z0 + 0.8;
    const rx0 = x0 + 3, rx1 = EXIT_X - 4.5;     // tot vóór de trap omhoog
    kit.box(roof, rx1 - rx0, 0.14, wz, (rx0 + rx1) / 2, 3.5, zc);
    kit.box(m.steel, rx1 - rx0, 0.3, 0.2, (rx0 + rx1) / 2, 3.3, zc);
    const postZ = cs.plat.length === 1 ? 0 : zc + Math.sign(zc) * 1.2;
    for (let x = rx0 + 2; x < rx1; x += 8) kit.box(m.steel, 0.22, 3.4, 0.22, x, 1.7, postZ);
    for (let x = rx0 + 2; x < rx1 - 3; x += 8) kit.box(m.lamp, 1.4, 0.06, 0.12, x + 4, 3.36, zc);
  }
  // Zijperrons: perronvloer tot aan de keerwand.
  if (cs.plat.length > 1) for (const [z0, z1] of cs.plat) { const zo = z0 < 0 ? z0 : z1, s = Math.sign(zo); kit.box(m.platform, len, 1.05, W - Math.abs(zo), cx, -0.525, s * (Math.abs(zo) + W) / 2, 2); }
  // Straatbrug over de ingraving aan de uitgangskant (de trap komt erop uit).
  const bx = EXIT_X + 12, bw = 12;
  kit.box(m.concrete, bw, 0.9, 2 * T + 2, bx, CUT_TOP - 0.45, 0, 3);
  kit.box(m.asphalt, bw - 0.6, 0.06, 2 * T + 2, bx, CUT_TOP + 0.03, 0);
  for (const s of [-1, 1]) kit.box(wallMat, 0.5, 1.0, 2 * T + 2, bx + s * (bw / 2 - 0.25), CUT_TOP + 0.5, 0, 2);
  for (const s of [-1, 1]) kit.box(wallMat, bw, CUT_TOP - RAIL_Y, 0.8, bx, (CUT_TOP + RAIL_Y) / 2 - 0.5, s * (W + 0.4), 3);   // landhoofden
  city.flat(m.asphalt, bx - bw / 2, bx + bw / 2, -T - 60, -T - 0.7, CUT_TOP + 0.02, true, 4);
  city.flat(m.asphalt, bx - bw / 2, bx + bw / 2, T + 0.7, T + 60, CUT_TOP + 0.02, true, 4);
  const kind = st.profile?.kind;
  if (kind === 'thatch') {
    // Dahlem-Dorf: vakwerkgebouw met rieten dak naast de brug.
    const vw = std('Line_Vakwerk', '#ffffff', { map: vakwerkTex(), roughness: 0.9 });
    const thatch = std('Line_Thatch', '#8f7748', { roughness: 1 });
    const hx = bx - 2, hz = T + 5.5, hw = 15, hd = 8;
    const b = kit.box(vw, hw, 4.6, hd, hx, CUT_TOP + 2.3, hz);
    const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * hw / 4.5, uv.getY(i));
    gableRoof(kit, thatch, hx, hz, hw + 1.6, hd + 2.2, CUT_TOP + 4.6, 5.2, true);
    kit.box(thatch, hw + 1.6, 0.6, 1.2, hx, CUT_TOP + 9.7, hz);    // nok
  } else if (kind === 'terminus') {
    // Krumme Lanke: stationsgebouw dwars over het einde van de ingraving + stootjukken.
    kit.box(m.brick, 14, 4.2, 2 * T + 4, x0 - 4, CUT_TOP + 0.6, 0, 3);
    kit.box(m.tiles, 15, 0.4, 2 * T + 5, x0 - 4, CUT_TOP + 2.9, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) kit.box(m.dark, 1.6, 1.6, 0.05, x0 - 9 + i * 3.2, CUT_TOP + 1.2, s * (T + 2.03));
    kit.box(wallMat, 1.2, CUT_TOP - RAIL_Y + 0.3, 2 * T, x0 - 3.4, (CUT_TOP + RAIL_Y - 0.3) / 2, 0, 3);   // eindwand
    for (const tz of cs.tracks) { kit.box(m.steel, 0.4, 1.0, 2.2, x0 - 2.2, RAIL_Y + 0.5, tz); kit.box(roof, 0.12, 0.35, 1.8, x0 - 2.0, RAIL_Y + 0.8, tz); }
  } else if (kind === 'ladenstrasse') {
    // Onkel Toms Hütte: winkelpuien langs de achterkant van beide zijperrons, met een luifel.
    const shop = std('Line_Shops', '#ffffff', { map: shopTex(), roughness: 0.6 });
    for (const s of [-1, 1]) {
      for (let x = x0 + 6; x < x1 - 16; x += 16) kit.plane(shop, 16, 3.1, M4(x + 8, 1.55, s * (W - 0.04), s > 0 ? Math.PI : 0));
      kit.box(roof, len - 22, 0.1, 1.6, cx - 5, 3.15, s * (W - 0.8));
      for (const xe of [x0, x1]) kit.box(wallMat, 0.6, CUT_TOP - LOW, SLOPE, xe, (CUT_TOP + LOW) / 2, s * (W + SLOPE / 2), 2);   // kopwand naar het talud
    }
  }
}
// U3: uitgangstrap omhoog naar de straatbrug (open kant naar het stationsmidden, −x).
function exitUp(kit, m, st, cs, ez, exitMat) {
  const n = 14, run = 9, rise = CUT_TOP - 0.02, w = 1.9;
  for (let i = 0; i < n; i++) {
    const x = EXIT_X - 3 + (i + 0.5) * run / n, y = (i + 1) * rise / n;
    kit.box(m.concrete, run / n + 0.02, y, w, x, y / 2, ez, 2);
    kit.box(m.edge, 0.06, 0.02, w, x - run / n / 2 + 0.05, y + 0.01, ez);
  }
  for (const s of [-1, 1]) {
    const ang = Math.atan2(rise, run), lenR = Math.hypot(run, rise);
    const h = new THREE.BoxGeometry(lenR, 0.06, 0.06); h.rotateZ(ang); h.translate(EXIT_X - 3 + run / 2, rise / 2 + 1.0, ez + s * (w / 2 + 0.05)); kit.add(m.steel, h);
    const g = new THREE.BoxGeometry(lenR, 0.9, 0.05); g.rotateZ(ang); g.translate(EXIT_X - 3 + run / 2, rise / 2 + 0.5, ez + s * (w / 2 + 0.05)); kit.add(m.glass, g);
  }
  kit.plane(exitMat, 1.6, 0.4, M4(EXIT_X - 3.6, 2.6, ez, -Math.PI / 2));
}
const isVault = st => st.profile?.kind === 'vault' || st.profile?.kind === 'stars';
// U5 Museumsinsel: donkerblauw gewelf met ±6000 lichtpunten (Schinkels sterrenhemel uit 'Die Zauberflöte').
function starTex() {
  return tex('stars', () => { const t = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#0b1a44'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) { const r = Math.random() < 0.08 ? 2.4 : 1.2 + Math.random(); c.fillStyle = `rgba(255,${235 + Math.random() * 20 | 0},${190 + Math.random() * 50 | 0},${0.6 + Math.random() * 0.4})`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); c.fill(); }
  }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 8); return t; });   // u = rond het gewelf (±20 m), v = langs het perron (±84 m) → ronde sterren
}
// U5 Brandenburger Tor: fotostrook met sepia-beelden (Tor, Linden, Mauer, 1989) — geschilderd, herkenbaar.
function photoWallTex() {
  return tex('photos', () => canvasTex(1024, 140, (c, w, h) => {
    c.fillStyle = '#2b2620'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const x0 = 10 + i * 169, pw = 155, ph = h - 20, y0 = 10;
      const g = c.createLinearGradient(0, y0, 0, y0 + ph); g.addColorStop(0, '#d9c9a8'); g.addColorStop(1, '#8a7656'); c.fillStyle = g; c.fillRect(x0, y0, pw, ph);
      c.fillStyle = '#4a3c2a';
      if (i % 3 === 0) { for (let k = 0; k < 6; k++) c.fillRect(x0 + 20 + k * 22, y0 + 40, 9, ph - 45); c.fillRect(x0 + 12, y0 + 30, pw - 24, 12); c.fillRect(x0 + 60, y0 + 14, 34, 16); }   // het Tor
      else if (i % 3 === 1) { c.fillRect(x0, y0 + ph - 38, pw, 38); for (let k = 0; k < 9; k++) c.fillRect(x0 + 6 + k * 17, y0 + ph - 58 - (k % 3) * 6, 8, 22); }   // menigte 1989
      else { for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x0 + 18 + k * 30, y0 + 50, 16, 0, Math.PI * 2); c.fill(); c.fillRect(x0 + 15 + k * 30, y0 + 60, 6, ph - 60); } }   // Linden
      c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(x0, y0, pw, 4);
    }
  }));
}
// U3: Heidelberger Platz — hoog tongewelf boven het perron, ribben, kroonluchters.
function vault(kit, m, st, W, x0, x1) {
  const stars = st.profile?.kind === 'stars';
  const vmat = stars ? std('Line_Stars', '#ffffff', { map: starTex(), emissive: '#ffffff', emissiveMap: starTex(), emissiveIntensity: 0.9, roughness: 0.9, side: THREE.DoubleSide })
    : std('Line_Vault_' + st.id, '#e4d8c0', { map: concreteTex(), roughness: 0.85, side: THREE.DoubleSide });
  const rib = std('Line_VaultRib_' + st.id, st.accent, { roughness: 0.7 });
  const SY = 0.62, len = x1 - x0, cx = (x0 + x1) / 2;
  const g = new THREE.CylinderGeometry(W, W, len, 24, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2); g.scale(1, SY, 1); g.translate(cx, TUNNEL_TOP, 0); kit.add(vmat, g);
  if (stars) {   // geen ribben/kroonluchters; lichtlijnen langs de voet van het gewelf
    for (const s of [-1, 1]) kit.box(m.lamp, len - 2, 0.08, 0.1, cx, TUNNEL_TOP + 0.05, s * (W - 0.25));
    for (const xe of [x0, x1]) { const c = new THREE.CircleGeometry(W, 24, 0, Math.PI); c.scale(1, SY, 1); c.rotateY(xe === x0 ? Math.PI / 2 : -Math.PI / 2); c.translate(xe, TUNNEL_TOP, 0); kit.add(vmat, c); }
    return;
  }
  for (let x = x0 + 4.5; x < x1; x += 9) { const t = new THREE.TorusGeometry(W - 0.05, 0.16, 6, 20, Math.PI); t.rotateY(Math.PI / 2); t.scale(1, SY, 1); t.translate(x, TUNNEL_TOP, 0); kit.add(rib, t); }
  for (const xe of [x0, x1]) { const c = new THREE.CircleGeometry(W, 24, 0, Math.PI); c.scale(1, SY, 1); c.rotateY(xe === x0 ? Math.PI / 2 : -Math.PI / 2); c.translate(xe, TUNNEL_TOP, 0); kit.add(vmat, c); }
  for (const x of [-18, 0, 18]) {
    kit.box(m.steel, 0.04, 2.2, 0.04, x, TUNNEL_TOP + W * SY - 1.2, 0);
    const ring = new THREE.TorusGeometry(0.7, 0.05, 6, 16); ring.rotateX(Math.PI / 2); ring.translate(x, TUNNEL_TOP + W * SY - 2.3, 0); kit.add(m.steel, ring);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, b = new THREE.SphereGeometry(0.13, 8, 6); b.translate(x + Math.cos(a) * 0.7, TUNNEL_TOP + W * SY - 2.15, Math.sin(a) * 0.7); kit.add(m.lamp, b); }
  }
}

// Viaduct: dek, stalen liggers, kolommen tot de straat, leuningen; bij een station perronkappen.
function viaductShell(kit, m, st, cs, x0, x1, isStation, elev0 = st.elev, elev1 = st.elev, withStreet = true, city = kit) {
  if (st.arches) return archShell(kit, m, st, cs, x0, x1, isStation, elev0, elev1, withStreet, city);   // S-Bahn Stadtbahn
  const len = x1 - x0, cx = (x0 + x1) / 2, deckW = isStation || cs.wide ? cs.wall * 2 : 9.4;   // breed naast een middenperron
  if (st.embank) embankment(kit, m, x0, x1, deckW, elev0, elev1);   // U5 oost: bovengronds op een (lage) aarden baan
  else {
  kit.box(m.steel, len, 0.9, deckW, cx, RAIL_Y - 0.75, 0);                    // dek + hoofdliggers
  for (const s of [-1, 1]) kit.box(m.steel, len, 0.5, 0.3, cx, RAIL_Y - 1.4, s * (deckW / 2 - 0.4));
  for (let x = x0 + 6; x < x1; x += 12) {
    const t = (x - x0) / len, g = -(elev0 + (elev1 - elev0) * t);              // straathoogte hier
    const h = RAIL_Y - 1.2 - g;
    if (h > 0.5) for (const s of [-1, 1]) kit.box(m.steel, 0.5, h, 0.5, x, g + h / 2, s * 3.6);
    if (h > 0.5) kit.box(m.steel, 0.4, 0.5, 8.2, x, RAIL_Y - 1.45, 0);
  }
  }
  if (!isStation && st.embank) { const rz = deckW / 2 + 0.3; for (const s of [-1, 1]) { kit.box(m.steel, len, 0.05, 0.05, cx, RAIL_Y + 1.1, s * rz); for (let x = x0 + 1.5; x < x1; x += 3) kit.box(m.steel, 0.05, 1.2, 0.05, x, RAIL_Y + 0.5, s * rz); } }
  else if (!isStation) { const rz = deckW / 2 - 0.1; for (const s of [-1, 1]) { kit.box(m.steel, len, 0.06, 0.06, cx, 0.1, s * rz); kit.box(m.steel, len, 0.5, 0.05, cx, -0.15, s * rz); } }
  if (isStation && st.profile?.hall) stationHall(kit, m, st, cs, x0, x1);
  else if (isStation) {
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
  if (withStreet) street(city, m, st, x0, x1, elev0, elev1);
}

// ── U5 oost: aarden baan (Biesdorf, Elsterwerdaer Platz, Wuhletal, Hönow) — ballastbed, grastaluds tot de straat ──
function embankment(kit, m, x0, x1, w, elev0, elev1) {
  const top = RAIL_Y - 0.3, len = x1 - x0;
  kit.flat(m.ballast, x0, x1, -w / 2, w / 2, RAIL_Y - 0.29, true, 3);
  for (let x = x0; x < x1 - 0.01; x += 12) {
    const xe = Math.min(x1, x + 12), t = ((x + xe) / 2 - x0) / len, g = -(elev0 + (elev1 - elev0) * t), h = top - g;
    for (const s of [-1, 1]) {
      kit.box(m.concrete, xe - x, 0.35, 0.3, (x + xe) / 2, top + 0.05, s * (w / 2 + 0.15));      // randbalk
      if (h > 0.15) slab(kit, m.grass, x, xe, s * (w / 2 + 0.3), top, s * (w / 2 + 0.3 + Math.max(1, h * 1.6)), g - 0.05, 0.12);
    }
  }
}
// U5 oost: Plattenbau (WBS 70, Hellersdorf/Kaulsdorf) boven de ingraving — lange schijven met panelen en balkons.
function plattenTex(v) {
  return tex('platte' + v, () => canvasTex(512, 512, (c, w, h) => {
    const base = ['#d9d2c3', '#cfd6d6', '#e3d7bf', '#d6cfd9'][v % 4], acc = ['#c4683a', '#4f7fa6', '#6f9a4e', '#b8913a'][v % 4];
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 4; fx++) {
      const x = fx * 128, y = fy * 64;
      c.strokeStyle = 'rgba(60,60,60,0.35)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, 126, 62);   // paneelvoegen
      c.fillStyle = '#3a4248'; c.fillRect(x + 22, y + 16, 40, 32);                                     // raam
      c.fillStyle = 'rgba(200,220,235,0.35)'; c.fillRect(x + 24, y + 18, 18, 28);
      if (fx % 2) { c.fillStyle = acc; c.fillRect(x + 72, y + 34, 48, 26); c.fillStyle = '#2d3236'; c.fillRect(x + 76, y + 14, 22, 20); }   // loggia
    }
  }));
}
function plattenbau(kit, m, x, z, seed, alongX = true) {
  const floors = [5, 6, 11, 6][seed % 4], hgt = floors * 2.8, len = 24 + (seed % 3) * 12, dep = 12;
  const f = std('Line_Platte_' + (seed % 4), '#ffffff', { map: plattenTex(seed % 4), roughness: 0.85 });
  const b = kit.box(f, alongX ? len : dep, hgt, alongX ? dep : len, x, CUT_TOP + hgt / 2, z);
  const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 12, uv.getY(i) * floors / 8);
  kit.box(m.dark, (alongX ? len : dep) + 0.4, 0.5, (alongX ? dep : len) + 0.4, x, CUT_TOP + hgt + 0.25, z);
}
// U5: wandschilderingen (Magdalenenstraße: geschiedenis van Lichtenberg; Tierpark: dieren) — gestileerd, geen kopie.
function muralTex(style) {
  return tex('mural:' + style, () => canvasTex(1024, 160, (c, w, h) => {
    if (style === 'tierpark') {
      c.fillStyle = '#e7dcc0'; c.fillRect(0, 0, w, h);
      const ani = ['🦒', '🐘', '🦓', '🐻', '🦩', '🐪', '🦁', '🐧'];
      c.font = '92px serif'; c.textBaseline = 'middle'; c.textAlign = 'center';
      ani.forEach((a, i) => { c.fillStyle = ['#c48a3a', '#7d8a6a', '#3a3a3a', '#7a5230'][i % 4]; c.fillRect(i * 128 + 8, 132, 112, 10); c.fillText(a, i * 128 + 64, 78); });
      return;
    }
    if (style === 'checkpoint') {   // U6 Kochstraße: grensovergang Checkpoint Charlie — zwart-wit panelen, sectorbord, muur
      c.fillStyle = '#1d1d1b'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const x0 = 8 + i * 254, pw = 240, y0 = 8, ph = h - 16;
        c.fillStyle = '#d8d6cf'; c.fillRect(x0, y0, pw, ph);
        c.fillStyle = '#3a3a38';
        if (i % 2 === 0) {   // wachthuisje met zandzakken en het grote sectorbord
          c.fillRect(x0 + 90, y0 + 70, 60, 60); c.fillStyle = '#d8d6cf'; c.fillRect(x0 + 100, y0 + 82, 40, 22);
          c.fillStyle = '#3a3a38'; c.fillRect(x0 + 84, y0 + 62, 72, 10); for (let k = 0; k < 6; k++) c.fillRect(x0 + 80 + k * 14, y0 + 128, 12, 8);
          c.fillStyle = '#f2f0e8'; c.fillRect(x0 + 12, y0 + 10, pw - 24, 44); c.strokeStyle = '#3a3a38'; c.lineWidth = 3; c.strokeRect(x0 + 12, y0 + 10, pw - 24, 44);
          c.fillStyle = '#1d1d1b'; c.font = '700 13px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('YOU ARE LEAVING', x0 + pw / 2, y0 + 23); c.fillText('THE AMERICAN SECTOR', x0 + pw / 2, y0 + 41);
        } else {             // de muur met wachttoren en prikkeldraad
          c.fillRect(x0, y0 + ph - 60, pw, 60); c.fillStyle = '#8a8a86'; for (let k = 0; k < 8; k++) c.fillRect(x0 + k * 30, y0 + ph - 58, 2, 56);
          c.fillStyle = '#3a3a38'; c.fillRect(x0 + 170, y0 + 18, 14, ph - 78); c.fillRect(x0 + 158, y0 + 10, 38, 22);
          c.strokeStyle = '#3a3a38'; c.lineWidth = 1.5; c.beginPath(); for (let k = 0; k < 24; k++) { c.moveTo(x0 + k * 10, y0 + ph - 66); c.lineTo(x0 + k * 10 + 6, y0 + ph - 60); } c.stroke();
        }
      }
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, w, 6);
      return;
    }
    if (style === 'siemens') {   // U7 Siemensdamm/Rohrdamm: Siemensstadt — fabriekshallen, schoorstenen en tandwielen
      c.fillStyle = '#d9dee3'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#7d4a36';
      for (let i = 0; i < 5; i++) { const x = 20 + i * 205; c.fillRect(x, 70, 150, 80); for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(x + k * 25, 70); c.lineTo(x + k * 25 + 25, 50); c.lineTo(x + k * 25 + 25, 70); c.fill(); } c.fillRect(x + 120, 18, 14, 52); }
      c.fillStyle = '#e8d9a8'; for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++) c.fillRect(30 + i * 205 + k * 26, 92, 14, 22);
      c.strokeStyle = '#1f5f8a'; c.lineWidth = 7;
      for (let i = 0; i < 5; i++) { const cx = 190 + i * 205, cy = 38, r = 20; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.lineTo(cx + Math.cos(a) * (r + 9), cy + Math.sin(a) * (r + 9)); c.stroke(); } }
      c.fillStyle = '#3a4048'; c.fillRect(0, h - 10, w, 10);
      return;
    }
    if (style === 'paulstern') {   // U7 Paulsternstraße: bloemenweide onder een sterrenhemel
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d2a4a'); g.addColorStop(0.55, '#3a5a6a'); g.addColorStop(0.56, '#4f7a3a'); g.addColorStop(1, '#2f5a2a');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f5e9a8'; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc((i * 97) % w, 8 + (i * 53) % 70, 1.5 + (i % 3), 0, Math.PI * 2); c.fill(); }
      for (let i = 0; i < 70; i++) {
        const x = (i * 61) % w + 6, y = 100 + (i * 29) % 50;
        c.strokeStyle = '#2a4a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, h); c.stroke();
        c.fillStyle = ['#e04a3a', '#f0c23a', '#ffffff', '#8a5ad0', '#f08ab0'][i % 5]; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
      }
      return;
    }
    if (style === 'zitadelle') {   // U7 Zitadelle: de Zitadelle Spandau met de Juliusturm, bakstenen gewelven
      c.fillStyle = '#a8603e'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(60,30,20,0.45)'; c.lineWidth = 1;
      for (let y = 0; y < h; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 12) % 2 ? 0 : 14; x < w; x += 28) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 12); c.stroke(); } }
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 260;
        c.fillStyle = '#d8cfbd'; c.fillRect(x, 60, 170, 90); c.fillRect(x + 60, 14, 50, 60);
        for (let k = 0; k < 5; k++) c.fillRect(x + 58 + k * 11, 6, 7, 10);
        for (let k = 0; k < 9; k++) c.fillRect(x + k * 20, 50, 12, 12);
        c.fillStyle = '#3a2a22'; c.beginPath(); c.arc(x + 85, 150, 22, Math.PI, 0); c.fill(); c.fillRect(x + 78, 30, 14, 20);
      }
      return;
    }
    if (style === 'westhafen') {   // U9 Westhafen: de haven met kranen, pakhuis en vrachtschepen
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fb9cf'); g.addColorStop(0.62, '#d6e2ea'); g.addColorStop(0.63, '#3d5f7a'); g.addColorStop(1, '#22394d');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#8a4a32'; c.fillRect(380, 40, 300, 60); for (let k = 0; k < 14; k++) { c.fillStyle = '#e6d39a'; c.fillRect(392 + k * 20, 52, 10, 14); c.fillRect(392 + k * 20, 76, 10, 14); }
      c.fillStyle = '#5a3424'; c.fillRect(500, 18, 60, 24);                                            // klokkentoren pakhuis
      c.strokeStyle = '#1f3a5a'; c.lineWidth = 6;
      for (const x of [80, 240, 760, 920]) { c.beginPath(); c.moveTo(x, 100); c.lineTo(x, 22); c.lineTo(x + 70, 22); c.moveTo(x, 40); c.lineTo(x + 46, 22); c.stroke(); c.fillStyle = '#1f3a5a'; c.fillRect(x + 64, 22, 4, 30); }
      for (let i = 0; i < 3; i++) { const x = 40 + i * 340; c.fillStyle = ['#b8473a', '#2f5a3a', '#3a3a3a'][i]; c.fillRect(x, 108, 230, 22); c.fillStyle = '#e8e2d0'; c.fillRect(x + 170, 92, 40, 16); }
      c.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 30; i++) c.fillRect((i * 71) % w, 136 + (i * 13) % 18, 26, 2);
      return;
    }
    if (style === 'hansa') {   // U9 Hansaplatz: Hansaviertel / Interbau 1957 — kleurige mozaïekvlakken en hoogbouw
      c.fillStyle = '#ece6d6'; c.fillRect(0, 0, w, h);
      const col = ['#d8432f', '#f2b52a', '#2b6cb0', '#2f8a5a', '#1d1d1b', '#e8e2d0'];
      for (let y = 0; y < h; y += 20) for (let x = 0; x < w; x += 20) { const k = ((x * 7 + y * 13) / 20 | 0) % 11; if (k < 6) { c.fillStyle = col[k]; c.fillRect(x + 1, y + 1, 18, 18); } }
      for (let i = 0; i < 6; i++) { const x = 30 + i * 170; c.fillStyle = '#f5f2ea'; c.fillRect(x, 20, 70, 120); c.fillStyle = '#5a6a7a'; for (let r = 0; r < 9; r++) for (let k = 0; k < 4; k++) c.fillRect(x + 6 + k * 16, 26 + r * 12, 10, 7); }
      return;
    }
    if (style === 'zoo') {   // U9 Zoologischer Garten: het Elefantentor en dieren
      c.fillStyle = '#e9dfc6'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++) {
        const x = 120 + i * 560;
        c.fillStyle = '#b8473a'; c.beginPath(); c.moveTo(x - 20, 40); c.lineTo(x + 100, 8); c.lineTo(x + 220, 40); c.fill();   // pagodedak
        c.fillStyle = '#2f5a3a'; c.fillRect(x - 6, 40, 212, 10);
        c.fillStyle = '#c9b08a'; c.fillRect(x + 20, 50, 30, 80); c.fillRect(x + 150, 50, 30, 80);                              // pijlers
        c.fillStyle = '#3a2a22'; c.fillRect(x + 60, 70, 80, 60);
        c.fillStyle = '#9a9a92';                                                                                                // stenen olifanten
        for (const ex of [x - 30, x + 190]) { c.fillRect(ex, 104, 54, 30); c.fillRect(ex + (ex < x ? 44 : -10), 92, 20, 22); c.fillRect(ex + (ex < x ? 58 : -16), 104, 6, 26); for (let k = 0; k < 4; k++) c.fillRect(ex + 4 + k * 13, 134, 8, 14); }
      }
      c.font = '64px serif'; c.textBaseline = 'middle'; c.textAlign = 'center';
      ['🐼', '🦍', '🦛', '🦒'].forEach((a, i) => c.fillText(a, [430, 520, 960, 1010][i] - (i > 1 ? 40 : 0), 92));
      c.fillStyle = '#2f5a3a'; c.fillRect(0, h - 10, w, 10);
      return;
    }
    if (style === 'luftbruecke') {   // U6 Platz der Luftbrücke: "Rosinenbomber" boven Tempelhof (1948/49)
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f97b8'); g.addColorStop(1, '#c9d9e3'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#7a7f84'; c.fillRect(0, h - 26, w, 26);                                   // het vliegveld
      c.fillStyle = '#5a5e62'; c.fillRect(260, h - 50, 500, 26); for (let k = 0; k < 20; k++) c.fillRect(270 + k * 25, h - 58, 12, 8);   // het hangargebouw
      c.fillStyle = '#2d3135';
      for (let i = 0; i < 7; i++) {   // vliegtuigen in een rij, in landing
        const x = 60 + i * 140, y = 34 + (i % 3) * 14 + i * 4;
        c.fillRect(x, y, 70, 9); c.fillRect(x + 26, y - 14, 12, 37); c.fillRect(x - 2, y - 7, 8, 14);
        for (const dz of [-9, 9]) c.fillRect(x + 22, y + 4 + dz, 6, 4);
      }
      return;
    }
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#2f4a6a'); g.addColorStop(0.5, '#7a4a3a'); g.addColorStop(1, '#3f6a4a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {   // figuren en gebouwen in vlakken, zoals de wandbeelden van 1986
      const x = i * 58 + 10, hh = 40 + (i * 37) % 70;
      c.fillStyle = ['#d9b98a', '#b8473a', '#e3e0d4', '#5a7a9a', '#c9a23a'][i % 5]; c.fillRect(x, h - hh - 10, 34, hh);
      c.beginPath(); c.arc(x + 17, h - hh - 24, 12, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 0, w, 18);
  }));
}

// ── U1d: stationsprofielen (hal / kappen) ───────────────────────────────────────────────────────────
// Schuine plaat langs x tussen (z0, y0) en (z1, y1) in het dwarsprofiel.
function slab(kit, mat, x0, x1, z0, y0, z1, y1, th = 0.1) {
  const g = new THREE.BoxGeometry(x1 - x0, th, Math.hypot(z1 - z0, y1 - y0));
  g.rotateX(-Math.atan2(y1 - y0, z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); kit.add(mat, g);
}
function stationHall(kit, m, st, cs, x0, x1) {
  const P = st.profile, len = x1 - x0, cx = (x0 + x1) / 2;
  if (P.hall === 'hall-stadtbahn') return stadtbahnHall(kit, m, st, x0, x1);
  const steel = std('Line_HallSteel_' + st.id, P.steel, { roughness: 0.5, metalness: 0.4 });
  const roof = std('Line_HallRoof_' + st.id, P.roof, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const glass = std('Line_HallGlass', '#b9d0d6', { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
  if (P.hall === 'canopy-glass') {
    // Prinzenstraße: per zijperron een glazen kap op lichte staanders aan de buitenkant, aflopend naar het spoor.
    for (const [z0, z1] of cs.plat) {
      const s = Math.sign(z0 + z1), zo = s * 7.25, zi = s * 3.05;
      for (let x = x0 + 4; x <= x1 - 4; x += 7.5) {
        kit.box(steel, 0.2, 3.95, 0.2, x, 1.97, s * 6.95);
        slab(kit, steel, x - 0.08, x + 0.08, zo, 4.0, zi, 3.4, 0.22);                      // spant
      }
      slab(kit, glass, x0 + 3, x1 - 3, zo, 4.06, zi, 3.46, 0.04);
      for (const [z, y] of [[zo, 4.0], [zi, 3.4]]) kit.box(steel, len - 6, 0.16, 0.14, cx, y, z);
      for (let x = x0 + 6; x < x1 - 4; x += 6) kit.box(m.lamp, 1.4, 0.06, 0.12, x, 3.45, s * 5.4);
      kit.box(m.steel, len, 0.06, 0.06, cx, 1.1, s * 7.15); kit.box(m.glass, len, 1.0, 0.03, cx, 0.55, s * 7.15);
    }
    return;
  }
  const W = cs.wall + (P.hall === 'hall-green' ? 0.35 : 0.1);
  const top = P.hall === 'hall-green' ? 4.8 : 4.0, mull = P.hall === 'hall-green' ? 2.25 : 3;
  for (const s of [-1, 1]) {
    const z = s * W;
    kit.box(steel, len, 1.0, 0.16, cx, 0.5, z);                                              // borstwering
    kit.box(glass, len, top - 1.0, 0.03, cx, (top + 1.0) / 2, z);                           // glazen wand
    kit.box(steel, len, 0.3, 0.3, cx, top + 0.1, z);                                         // bovenregel
    if (P.hall === 'hall-green') kit.box(steel, len, 0.1, 0.12, cx, 2.9, z);                 // kampfer
    for (let x = x0 + 0.5; x <= x1 - 0.5; x += mull) kit.box(steel, 0.12, top - 1.0, 0.16, x, (top + 1.0) / 2, z);
  }
  if (P.hall === 'hall-barrel') {
    // Görlitzer Bahnhof: tongewelf met lichtstraat in de nok, spanten om de 6 m.
    const n = 12, rise = 2.6, Wr = W + 0.15, y0 = top + 0.2;
    const pt = i => { const t = Math.PI - i / n * Math.PI; return [Math.cos(t) * Wr, y0 + Math.sin(t) * rise]; };
    for (let i = 0; i < n; i++) {
      const [za, ya] = pt(i), [zb, yb] = pt(i + 1), sky = i >= 4 && i < 8;
      slab(kit, sky ? glass : roof, x0, x1, za, ya, zb, yb, sky ? 0.04 : 0.1);
      for (let x = x0 + 0.5; x <= x1 - 0.5; x += 6) slab(kit, steel, x - 0.1, x + 0.1, za, ya - 0.16, zb, yb - 0.16, 0.26);
    }
    for (const [z0, z1] of cs.plat) for (let x = x0 + 4; x < x1 - 2; x += 6) kit.box(m.lamp, 1.4, 0.06, 0.12, x, 3.7, (z0 + z1) / 2);
  } else {
    // Kottbusser Tor: groene hal, flauw zadeldak met lichtband, middenrij zuilen op het perron.
    const ridge = 6.1, eave = top + 0.15;
    for (const s of [-1, 1]) {
      slab(kit, roof, x0, x1, s * (W + 0.3), eave, s * 1.6, ridge - 0.25, 0.12);
      slab(kit, glass, x0, x1, s * 1.6, ridge - 0.25, 0, ridge, 0.04);
      for (let x = x0 + 0.5; x <= x1 - 0.5; x += 4.5) slab(kit, steel, x - 0.09, x + 0.09, s * W, eave - 0.2, 0, ridge - 0.2, 0.28);
    }
    for (const x of [-31.5, -24, -12, 2.5, 12, 23.5, 31.5]) { kit.box(steel, 0.36, ridge - 0.2, 0.36, x, (ridge - 0.2) / 2, 0); kit.box(steel, 1.2, 0.3, 0.6, x, 3.2, 0); }
    for (let x = x0 + 4; x < x1 - 2; x += 4.5) for (const z of [-1.9, 1.9]) kit.box(m.lamp, 1.4, 0.06, 0.12, x, 3.55, z);
  }
}

// ── U1d: Oberbaumbrücke (baksteengotiek, twee torens, onderdek voor de weg) over de Spree ─────────────
// x in de ruimte van het station vóór de brug; rivier tussen rv0 en rv1, straat op −elev.
function riverBridge(kit, m, st, cs, x0, x1, rv0, rv1) {
  const g = -st.elev, deckY = RAIL_Y - 0.3, WY = g - 4.6, b0 = rv0 - 2, b1 = rv1 + 2, L = b1 - b0, cx = (b0 + b1) / 2;
  // Rivier + kades (ver dwars door, zodat je de Spree ziet lopen).
  kit.flat(m.water, rv0, rv1, -420, 420, WY, true, 9);
  for (const xq of [rv0, rv1]) kit.box(m.stone, 0.8, g - WY + 0.4, 840, xq + (xq === rv0 ? -0.4 : 0.4), (g + WY) / 2 - 0.2, 0, 2);
  // Brugkern: dek van de weg (−z) en de arcade onder het U-Bahn-dek, op pijlers in de rivier.
  const zr0 = -19.5, zr1 = 5.1;
  kit.box(m.brick, L, 1.2, zr1 - zr0, cx, g - 0.6, (zr0 + zr1) / 2, 3);                       // brugdek
  kit.box(m.asphalt, L, 0.04, 13.4, cx, g + 0.02, -12.1);                                      // rijbaan
  kit.box(m.stone, L, 0.2, 3.4, cx, g + 0.1, -17.5);                                           // stoep
  const piers = []; for (let i = 0; i <= 4; i++) piers.push(rv0 + (rv1 - rv0) * i / 4);
  for (const px of piers) {
    kit.box(m.brick, 2.6, g - 1.2 - WY + 0.5, zr1 - zr0, px, (g - 1.2 + WY - 0.5) / 2, (zr0 + zr1) / 2, 3);
    for (const [w, y0, y1] of [[4.0, g - 2.6, g - 1.2], [3.2, g - 3.5, g - 2.6]]) kit.box(m.brick, w, y1 - y0, zr1 - zr0, px, (y0 + y1) / 2, (zr0 + zr1) / 2, 3);   // aanzet van de bogen
    for (const s of [-1, 1]) { const ze = s > 0 ? zr1 : zr0; const c = new THREE.BoxGeometry(1.84, g - 2.6 - WY + 0.5, 1.84); c.rotateY(Math.PI / 4); c.translate(px, (g - 2.6 + WY - 0.5) / 2, ze); kit.add(m.stone, c); } // ijsbrekers
  }
  // Borstwering aan de wegkant met kantelen.
  kit.box(m.brick, L, 1.0, 0.6, cx, g + 0.5, zr0 + 0.3, 3);
  for (let x = b0 + 1; x < b1; x += 2.4) kit.box(m.brick, 1.1, 0.45, 0.62, x, g + 1.22, zr0 + 0.3, 3);
  for (let x = b0 + 6; x < b1; x += 14) { kit.box(m.dark, 0.14, 4.6, 0.14, x, g + 2.3, zr0 + 1.0); kit.box(m.lamp, 0.5, 0.25, 0.5, x, g + 4.7, zr0 + 1.0); }
  // Arcade (Bogengang) onder het U-Bahn-dek: pijlers met spitsbogen aan beide kanten.
  const AZ = 4.7, bayW = 3.6;
  for (const s of [-1, 1]) {
    const z = s * AZ;
    kit.box(m.brick, L, deckY - 0.9 - (g + 3.6), 0.8, cx, (deckY - 0.9 + g + 3.6) / 2, z, 3);       // band boven de bogen
    for (let x = b0; x <= b1 + 0.01; x += bayW) {
      kit.box(m.brick, 1.0, 3.6, 0.8, x, g + 1.8, z, 3);
      if (x + bayW <= b1 + 0.01) {                                                                  // spitsboog: twee treden
        kit.box(m.brick, 0.7, 0.45, 0.8, x + 0.85, g + 3.0, z, 3); kit.box(m.brick, 0.7, 0.45, 0.8, x + bayW - 0.85, g + 3.0, z, 3);
        kit.box(m.brick, 0.75, 0.4, 0.8, x + 1.2, g + 3.4, z, 3); kit.box(m.brick, 0.75, 0.4, 0.8, x + bayW - 1.2, g + 3.4, z, 3);
      }
    }
  }
  kit.box(m.stone, L, 0.04, AZ * 2, cx, g + 0.02, 0);                                           // looppad in de arcade
  kit.box(m.brick, L, 0.9, AZ * 2 + 0.8, cx, deckY - 0.45, 0, 3);                                // U-Bahn-dek
  for (const s of [-1, 1]) {                                                                     // borstwering bovendek
    kit.box(m.brick, L, 0.85, 0.5, cx, deckY + 0.42, s * (AZ + 0.15), 3);
    for (let x = b0 + 1; x < b1; x += 2.4) kit.box(m.brick, 1.0, 0.4, 0.52, x, deckY + 1.05, s * (AZ + 0.15), 3);
  }
  // Twee torens (voorbeeld: Mitteltorturm Prenzlau) over het spoor, aan weerszijden van het stalen middendeel.
  const mid = (rv0 + rv1) / 2;
  for (const tx of [mid - 8, mid + 8]) {
    const TW = 5.2, TZ = 10.6, base = deckY + 4.6, body = 10.4, crown = base + body;
    for (const s of [-1, 1]) kit.box(m.brick, TW, base - deckY, 1.4, tx, (base + deckY) / 2, s * (TZ / 2 - 0.7), 3);       // poortpijlers
    kit.box(m.brick, TW, 1.0, TZ, tx, base - 0.5, 0, 3);                                         // poortboog
    kit.box(m.brick, TW, body, TZ, tx, base + body / 2, 0, 3);
    for (const s of [-1, 1]) for (const yy of [base + 2.6, base + 6.4]) kit.box(m.dark, 0.06, 2.4, 0.9, tx + s * (TW / 2 + 0.02), yy, 0);   // spitsboogvensters
    for (const s of [-1, 1]) for (const yy of [base + 2.6, base + 6.4]) for (const zz of [-2.4, 2.4]) kit.box(m.dark, 0.9, 2.4, 0.06, tx, yy, zz + s * 0, 0);
    kit.box(m.stone, TW + 0.6, 0.5, TZ + 0.6, tx, crown + 0.25, 0);                               // lijst
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {                                       // kantelen
      kit.box(m.brick, 0.6, 0.8, 0.5, tx - TW / 2 + 0.4 + i * (TW - 0.8) / 5, crown + 0.9, s * (TZ / 2 + 0.05), 3);
      kit.box(m.brick, 0.5, 0.8, 0.6, tx + s * (TW / 2 + 0.05), crown + 0.9, -TZ / 2 + 0.4 + i * (TZ - 0.8) / 5, 3);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                                        // hoektorentjes
      const qx = tx + sx * (TW / 2 - 0.2), qz = sz * (TZ / 2 - 0.2);
      kit.box(m.brick, 1.2, 4.2, 1.2, qx, crown + 2.1, qz, 3);
      const c = new THREE.ConeGeometry(0.95, 2.4, 4); c.rotateY(Math.PI / 4); c.translate(qx, crown + 5.4, qz); kit.add(m.copper, c);
    }
    kit.box(m.brick, TW - 1.8, 3.0, TZ - 3.4, tx, crown + 1.5, 0, 3);
    const sp = new THREE.ConeGeometry(Math.min(TW, TZ) * 0.55, 7.2, 4); sp.rotateY(Math.PI / 4); sp.scale(1, 1, (TZ - 3.4) / (TW - 1.8)); sp.translate(tx, crown + 6.6, 0); kit.add(m.copper, sp);
  }
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
  const A = st.arches, facZ = A ? [-34, 46] : [-32, 32], treeZ = A ? [-15, 27] : [-21, 21];
  if (A) {   // Stadtbahn: straat langs beide kanten van het gemetselde viaduct (z −7,6 … 19,6)
    geoGround(m.pavement, -12, -7.6, 0.15); geoGround(m.asphalt, -26, -12, 0); geoGround(m.pavement, -28, -26, 0.15);
    geoGround(m.pavement, 19.6, 24, 0.15); geoGround(m.asphalt, 24, 38, 0); geoGround(m.pavement, 38, 40, 0.15);
    geoGround(m.asphalt, -130, -28, 0.05); geoGround(m.asphalt, 40, 130, 0.05);
  }
  else if (st.embank) { geoGround(m.grass, -15, 15, -0.02); geoGround(m.asphalt, -24, -15, 0); geoGround(m.asphalt, 15, 24, 0); geoGround(m.pavement, -26, -24, 0.15); geoGround(m.pavement, 24, 26, 0.15); }
  else geoGround(m.asphalt, -18, 18, 0);                 // middenberm + rijbanen
  if (!st.embank && !A) { geoGround(m.pavement, -26, -18, 0.15); geoGround(m.pavement, 18, 26, 0.15); }
  if (!A) geoGround(m.asphalt, -130, -26, 0.05), geoGround(m.asphalt, 26, 130, 0.05);   // achter de gevels (zijstraten, binnenplaatsen)
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
      const b = kit.box(f, ww, hgt, 12, x + ww / 2, g + hgt / 2, facZ[s > 0 ? 1 : 0]);
      // UV per gevel: hele textuur over de voorkant, herhaald per ±14 m.
      const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ww / 14, uv.getY(i));
      kit.box(m.dark, ww, 0.6, 12.4, x + ww / 2, g + hgt + 0.3, facZ[s > 0 ? 1 : 0]);
      x += ww; k++;
    }
    // Straatbomen op de stoep.
    for (let tx = x0 + 5 + (seed % 5); tx < x1; tx += 11) {
      const t = (tx - x0) / len, g = -(elev0 + (elev1 - elev0) * t);
      kit.box(m.trunk, 0.35, 3.2, 0.35, tx, g + 1.6, treeZ[s > 0 ? 1 : 0]);
      const crown = new THREE.IcosahedronGeometry(2.6, 1); crown.scale(1, 1.15, 1); crown.translate(tx, g + 5.4, treeZ[s > 0 ? 1 : 0]); kit.add(m.tree, crown);
    }
  }
}

// ── S-Bahn Stadtbahn (Fase 45): gemetseld boogviaduct met vier sporen ─────────────────────────────
// Dwarsprofiel: S-Bahn-middenperron (sporen ±5,15) aan de −z-kant, Fernbahn (10,4 / 17,4, bovenleiding) aan +z.
export const ARCH_Z = [-7.6, 19.6];
const FERN = { tracks: [10.4, 17.4], noThird: true };
const BAY = 15;                            // één viaductboog per 15 m
function brickFill(x, w, h, base = [150, 62, 44], seed = 1) {
  x.fillStyle = '#6a3226'; x.fillRect(0, 0, w, h);
  let r0 = seed * 9301; const rnd = () => ((r0 = (r0 * 9301 + 49297) % 233280) / 233280);
  for (let r = 0; r < h / 12; r++) for (let c = -1; c < w / 30 + 1; c++) {
    const o = r % 2 ? 15 : 0, v = rnd();
    x.fillStyle = `rgb(${base[0] + v * 40 | 0},${base[1] + v * 22 | 0},${base[2] + v * 14 | 0})`; x.fillRect(c * 30 + o + 1, r * 12 + 1, 28, 10);
  }
}
// Eén boog: pilasters, kroonlijst, en in de boog een winkelpui (0), café met luifel (1) of dichtgemetseld met deur (2).
function archTex(v) {
  return tex('arch' + v, () => canvasTex(512, 512, (x, w, h) => {
    brickFill(x, w, h, [150, 62, 44], v + 3);
    x.fillStyle = 'rgba(40,14,8,0.28)'; x.fillRect(0, 0, 34, h); x.fillRect(w - 34, 0, 34, h);          // pilasters
    x.fillStyle = '#b9ad98'; x.fillRect(0, 0, w, 30); x.fillStyle = '#8f8372'; x.fillRect(0, 30, w, 8);     // kroonlijst
    const ax0 = 62, ax1 = w - 62, sy = 230, rx = (ax1 - ax0) / 2, ry = 160, cx = w / 2;
    const path = () => { x.beginPath(); x.moveTo(ax0, h); x.lineTo(ax0, sy); x.ellipse(cx, sy, rx, ry, 0, Math.PI, 0); x.lineTo(ax1, h); x.closePath(); };
    x.strokeStyle = '#c9bba2'; x.lineWidth = 22; path(); x.stroke();                                       // boogstenen
    x.save(); path(); x.clip();
    if (v === 2) {
      brickFill(x, w, h, [128, 54, 40], 11);
      x.fillStyle = '#2a2e30'; x.fillRect(cx - 50, h - 190, 100, 190);                                       // deur
      for (const wx of [ax0 + 40, ax1 - 130]) { x.fillStyle = '#3a4a52'; x.fillRect(wx, sy - 30, 90, 110); }
    } else {
      const g = x.createLinearGradient(0, sy - ry, 0, h); g.addColorStop(0, v ? '#5a3a22' : '#3c4a50'); g.addColorStop(1, v ? '#d9a35a' : '#e9c98a');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#23272a'; for (let mx = ax0; mx <= ax1; mx += (ax1 - ax0) / 4) x.fillRect(mx - 5, sy - ry, 10, h);   // stijlen
      x.fillRect(ax0, sy - 10, ax1 - ax0, 14); x.fillRect(ax0, h - 60, ax1 - ax0, 60);                       // kalf + borstwering
      if (v === 1) { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f2efe6' : '#8a2a22'; x.fillRect(ax0 + i * (ax1 - ax0) / 8, sy + 20, (ax1 - ax0) / 8, 46); } }
      else { x.fillStyle = '#1b2a33'; x.fillRect(ax0 + 30, sy + 24, ax1 - ax0 - 60, 40); x.fillStyle = '#f2d36b'; x.font = '700 30px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(v === 3 ? 'Bäckerei' : 'Späti', cx, sy + 45); }
    }
    x.restore();
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, h - 10, w, 10);
  }));
}
// Hackescher Markt: bakstenen hallenwand met hoge boogramen (per 7,5 m).
function hallWindowTex() {
  return tex('hallwin', () => canvasTex(256, 512, (x, w, h) => {
    brickFill(x, w, h, [160, 70, 48], 5);
    x.fillStyle = '#e2d8c4'; x.fillRect(0, 0, w, 24); x.fillRect(0, h - 70, w, 14);
    x.fillStyle = '#d8ccb4'; x.beginPath(); x.moveTo(52, h - 70); x.lineTo(52, 170); x.arc(w / 2, 170, w / 2 - 52, Math.PI, 0); x.lineTo(w - 52, h - 70); x.fill();
    x.fillStyle = '#9fb7c2'; x.beginPath(); x.moveTo(64, h - 80); x.lineTo(64, 172); x.arc(w / 2, 172, w / 2 - 64, Math.PI, 0); x.lineTo(w - 64, h - 80); x.fill();
    x.fillStyle = '#3a3a36'; for (let yy = 190; yy < h - 80; yy += 48) x.fillRect(64, yy, w - 128, 5); x.fillRect(w / 2 - 3, 100, 6, h - 180);
  }));
}
function archShell(kit, m, st, cs, x0, x1, isStation, elev0, elev1, withStreet, city) {
  const len = x1 - x0, cx = (x0 + x1) / 2, top = RAIL_Y - 0.3, [Z0, Z1] = ARCH_Z;
  const gAt = x => -(elev0 + (elev1 - elev0) * (x - x0) / len);
  tracks(kit, m, FERN, x0, x1);
  kit.box(m.ballast, len, 0.4, Z1 - Z0, cx, top - 0.2, (Z0 + Z1) / 2);                       // dek (ballast)
  // Boogwanden aan beide kanten, per boog een eigen pui; de bogen liggen vast in de wereld (station-x = 10 bogen).
  for (let a = Math.floor(x0 / BAY) * BAY; a < x1; a += BAY) {
    const b0 = Math.max(a, x0), b1 = Math.min(a + BAY, x1); if (b1 - b0 < 0.05) continue;
    const g = Math.min(gAt(b0), gAt(b1)) - 0.3, k = Math.abs(Math.round((st.x + a) / BAY));
    for (const [z, f, o] of [[Z0, -1, 0], [Z1, 1, 1]]) {
      const v = (k * 7 + o * 3 + st.index) % 5 % 4, mat = std('Line_Arch' + v, '#ffffff', { map: archTex(v), roughness: 0.9 });
      kit.wallX(mat, b0, b1, g, top, z, f, BAY, top - g, g);
    }
  }
  // Borstwering (baksteen + deksteen) aan beide randen.
  for (const [z, s] of [[Z0, 1], [Z1, -1]]) {
    kit.box(m.brick, len, 1.35, 0.45, cx, top + 0.67, z + s * 0.22, 2);
    kit.box(m.stone, len, 0.12, 0.62, cx, top + 1.4, z + s * 0.22);
  }
  // Bovenleiding Fernbahn: masten aan de +z-rand, rijdraad boven beide sporen (S-Bahn: stroomrail).
  const hall = isStation && st.profile?.hall === 'hall-stadtbahn';
  for (const tz of FERN.tracks) kit.box(m.dark, len, 0.03, 0.03, cx, RAIL_Y + 5.5, tz);
  if (!hall) for (let x = Math.ceil(x0 / 30) * 30; x < x1; x += 30) {
    kit.box(m.steel, 0.3, 7.6, 0.3, x, top + 3.8, Z1 - 0.7);
    kit.box(m.steel, 0.12, 0.12, Z1 - FERN.tracks[0], x, RAIL_Y + 6.3, (Z1 + FERN.tracks[0]) / 2 - 0.4);
  }
  if (isStation) {
    // Regionaal/Fernbahn-perron (niet begaanbaar) tussen de Fernbahnsporen.
    if (st.fern) {
      const f0 = 12.0, f1 = 15.8, fc = (f0 + f1) / 2;
      kit.box(m.platform, len, 1.05, f1 - f0, cx, -0.525, fc, 2); kit.flat(m.platform, x0, x1, f0, f1, 0.001, true, 4);
      for (const ze of [f0 + 0.42, f1 - 0.42]) kit.box(m.edge, len, 0.012, 0.1, cx, 0.006, ze);
      const sign = std('Line_Sign_' + st.id, '#ffffff', { map: signTex(st.name, st.line, '#0b6a3a', true), roughness: 0.6 });
      for (const x of [-18, 18]) { kit.plane(sign, 3.2, 0.55, M4(x, 2.75, fc + 0.03)); kit.plane(sign, 3.2, 0.55, M4(x, 2.75, fc - 0.03, Math.PI)); }
      if (!hall) {
        const roof = std('Line_Roof_' + st.id, st.accent, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
        kit.box(roof, len - 10, 0.12, f1 - f0 + 0.8, cx, 3.5, fc);
        for (let x = x0 + 9; x < x1 - 4; x += 9) kit.box(m.steel, 0.22, 3.4, 0.22, x, 1.7, fc);
      }
    }
    if (st.profile?.hall) stationHall(kit, m, st, cs, x0, x1);
    else {
      // Vlinderdak op het middenperron (zuilen om de 9 m, vrij van uitgang en overstaptrap).
      const roof = std('Line_Roof_' + st.id, st.accent, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
      for (const s of [-1, 1]) slab(kit, roof, x0 + 3, x1 - 3, s * 4.1, 3.95, 0, 3.55, 0.12);
      kit.box(m.steel, len - 6, 0.22, 0.3, cx, 3.45, 0);
      for (let x = -31.5; x <= 31.5; x += 9) kit.box(m.steel, 0.26, 3.5, 0.26, x, 1.75, 0);
      for (let x = x0 + 6; x < x1 - 4; x += 6) for (const z of [-2.2, 2.2]) kit.box(m.lamp, 1.4, 0.06, 0.12, x, 3.62, z);
    }
  }
  if (withStreet) street(city, m, st, x0, x1, elev0, elev1);
}
// Grote stationshal over alle vier sporen (Zoo, Hauptbahnhof, Friedrichstraße, Hackescher Markt, Alexanderplatz, Ostbahnhof).
function stadtbahnHall(kit, m, st, x0, x1) {
  const P = st.profile, len = x1 - x0, cx = (x0 + x1) / 2, top = RAIL_Y - 0.3, [Z0, Z1] = ARCH_Z;
  const steel = std('Line_HallSteel_' + st.id, P.steel, { roughness: 0.5, metalness: 0.4 });
  const roof = std('Line_HallRoof_' + st.id, P.roof, { roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide });
  const glass = std('Line_HallGlass', '#b9d0d6', { roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
  const zc = (Z0 + Z1) / 2, Wr = (Z1 - Z0) / 2 + 0.3, y0 = 5.2, rise = P.glassAll ? 7.5 : 8.5;
  // Zijwanden tot de aanzet van het gewelf.
  for (const [z, s] of [[Z0 - 0.3, -1], [Z1 + 0.3, 1]]) {
    if (P.brick) {
      const wm = std('Line_HallWindows', '#ffffff', { map: hallWindowTex(), roughness: 0.85 });
      kit.wallX(wm, x0, x1, top, y0, z - s * 0.05, -s, 7.5, y0 - top, top); kit.wallX(wm, x0, x1, top, y0, z + s * 0.05, s, 7.5, y0 - top, top);
    } else {
      kit.box(steel, len, 1.2, 0.2, cx, top + 1.95, z);
      kit.box(glass, len, y0 - top - 2.5, 0.04, cx, (y0 + top + 2.5) / 2, z);
      for (let x = x0; x <= x1 + 0.01; x += 6) kit.box(steel, 0.2, y0 - top, 0.3, x, (y0 + top) / 2, z);
    }
    kit.box(steel, len, 0.4, 0.5, cx, y0, z);
  }
  // Tongewelf: glazen lichtstraat (Hauptbahnhof: helemaal glas), stalen spanten.
  const n = 16, pt = i => { const t = Math.PI - i / n * Math.PI; return [zc + Math.cos(t) * Wr, y0 + Math.sin(t) * rise]; };
  const ribStep = P.glassAll ? 3.6 : 7.2;
  for (let i = 0; i < n; i++) {
    const [za, ya] = pt(i), [zb, yb] = pt(i + 1), sky = P.glassAll || (i >= 4 && i < 12);
    slab(kit, sky ? glass : roof, x0, x1, za, ya, zb, yb, sky ? 0.04 : 0.12);
    for (let x = x0; x <= x1 + 0.01; x += ribStep) slab(kit, steel, x - 0.1, x + 0.1, za, ya - 0.2, zb, yb - 0.2, 0.32);
    if (P.glassAll) for (const x of [x0, x1]) slab(kit, steel, x - 0.25, x + 0.25, za, ya - 0.25, zb, yb - 0.25, 0.5);
    else slab(kit, steel, x0, x1, za, ya - 0.24, zb, yb - 0.24, 0.06);   // langsregels
  }
  for (const x of [x0 + 0.3, x1 - 0.3]) for (let i = 0; i < n; i++) { const [za, ya] = pt(i), [zb, yb] = pt(i + 1); slab(kit, steel, x - 0.3, x + 0.3, za, ya - 0.4, zb, yb - 0.4, 0.6); }   // eindspanten
  // Lichtbalk boven het middenperron (draagt ook de hangborden) en lampen boven het Fernbahnperron.
  kit.box(steel, len - 4, 0.22, 0.3, cx, 3.5, 0);
  for (let x = x0 + 5; x < x1 - 3; x += 6) for (const z of [-1.9, 1.9]) kit.box(m.lamp, 1.4, 0.06, 0.12, x, 3.42, z);
  if (st.fern) for (let x = x0 + 5; x < x1 - 3; x += 6) kit.box(m.lamp, 1.4, 0.06, 0.12, x, 3.6, 13.9);
}

// ── Tussenstukken ────────────────────────────────────────────────────────────────────────────────
function segmentKit(line, a, b, m) {
  const kit = new Kit(), city = new Kit(), x0 = HALF, x1 = b.x - a.x - HALF;      // in de ruimte van station a
  const csA = crossSection(a.layout), csB = crossSection(b.layout);
  const cs = { ...csA, tracks: csA.tracks, wall: Math.max(csA.wall, csB.wall), wide: csA.plat.length === 1 || csB.plat.length === 1 };
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
  shells(kit, city, m, a, b, cs, x0, x1);
  return { kit, city };
}
function shells(kit, city, m, a, b, cs, x0, x1) {
  const open = k => k === 'viaduct';
  if ((a.kind === 'cutting' && open(b.kind)) || (open(a.kind) && b.kind === 'cutting')) {
    // U5 oost (Wuhletal ⇄ Kaulsdorf-Nord, Louis-Lewin-Straße ⇄ Hönow): korte tunnel onder de straat in het midden.
    const mid = (x0 + x1) / 2, T = { ...(a.kind === 'cutting' ? b : a), kind: 'tunnel', profile: null, embank: false };
    shells(kit, city, m, a, T, cs, x0, mid); shells(kit, city, m, T, b, cs, mid, x1); return;
  }
  if (a.kind === 'tunnel' && b.kind === 'tunnel') tunnelShell(kit, m, a, cs, x0, x1, false);
  else if (a.kind === 'cutting' && b.kind === 'cutting') cuttingShell(kit, m, a, cs, x0, x1, false, city);
  else if (a.kind === 'cutting' || b.kind === 'cutting') {
    // Tunnelportaal (U3): het tunneldeel aan de kant van het tunnelstation, dan de open ingraving.
    const tunnelFirst = a.kind === 'tunnel', len = x1 - x0, xp = tunnelFirst ? x0 + len * 0.45 : x1 - len * 0.45;
    tunnelShell(kit, m, a, cs, tunnelFirst ? x0 : xp, tunnelFirst ? xp : x1, false);
    cuttingShell(kit, m, tunnelFirst ? b : a, cs, tunnelFirst ? xp : x0, tunnelFirst ? x1 : xp, false, city);
    const W = cutW(cs), T = W + SLOPE, hp = CUT_TOP + 0.9 - TUNNEL_TOP, d = tunnelFirst ? 0.5 : -0.5;
    kit.box(m.concrete, 1.0, hp, 2 * T + 1.6, xp + d, TUNNEL_TOP + hp / 2, 0, 2);               // portaalwand boven de opening
    for (const s of [-1, 1]) kit.box(m.concrete, 1.0, TUNNEL_TOP - RAIL_Y + 0.3, T - cs.wall + 0.8, xp + d, (TUNNEL_TOP + RAIL_Y - 0.3) / 2, s * (cs.wall + T) / 2, 2);
    kit.box(m.stone, 1.2, 0.35, 2 * T + 2, xp + d, CUT_TOP + 1.05, 0, 2);                     // deksteen
    // Maaiveld boven de tunnel (gras), aansluitend op het talud van de ingraving.
    const t0 = tunnelFirst ? x0 : xp + 1, t1 = tunnelFirst ? xp - 1 : x1;
    city.flat(m.grass, t0, t1, -T - 60, T + 60, CUT_TOP, true, 6);
  }
  else if (a.arches && b.arches && a.bridge) {
    // S-Bahn deel d: Spreebrug in het Stadtbahnviaduct — bogen tot de kade, daarna een stalen vakwerkbrug.
    const [rv0, rv1] = riverOf(a, x0, x1);
    viaductShell(kit, m, a, cs, x0, rv0 - 3, false, a.elev, a.elev, true, city);
    viaductShell(kit, m, a, cs, rv1 + 3, x1, false, b.elev, b.elev, true, city);
    stadtbahnBridge(kit, m, a, rv0, rv1);
  }
  else if (a.kind === 'viaduct' && b.kind === 'viaduct' && a.bridge) {
    // Brug (U1d): staal tot de oever, dan de brug; geen straat boven de rivier.
    const [rv0, rv1] = riverOf(a, x0, x1);
    viaductShell(kit, m, a, cs, x0, rv0 - 2, false, a.elev, a.elev, true, city);
    viaductShell(kit, m, a, cs, rv1 + 2, x1, false, b.elev, b.elev, true, city);
    // Tussen de torens: stalen middendeel (zoals de Calatrava-overspanning), verder de bakstenen brug.
    riverBridge(kit, m, a, cs, x0, x1, rv0, rv1);
    const mid = (rv0 + rv1) / 2;
    kit.box(m.steel, 11, 0.5, 9.4, mid, RAIL_Y - 0.55, 0);
  }
  else if (a.kind === 'viaduct' && b.kind === 'viaduct') viaductShell(kit, m, a, cs, x0, x1, false, a.elev, b.elev, true, city);
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
    street(city, m, vst, sA, sB, e0, e1);
  }
}
// Stalen vakwerkbrug over vier sporen (Stadtbahn over de Spree / Humboldthafen): water met kades, ligger aan beide
// kanten (boven- en onderrand, stijlen, diagonalen), dek met Fernbahnsporen, pijler in het water bij een brede rivier.
function stadtbahnBridge(kit, m, st, rv0, rv1) {
  const g = -st.elev, WY = g - 3.2, b0 = rv0 - 3, b1 = rv1 + 3, L = b1 - b0, cx = (b0 + b1) / 2, top = RAIL_Y - 0.3, [Z0, Z1] = ARCH_Z;
  kit.flat(m.water, rv0, rv1, -420, 420, WY, true, 9);
  for (const xq of [rv0, rv1]) kit.box(m.stone, 0.8, g - WY + 0.4, 840, xq + (xq === rv0 ? -0.4 : 0.4), (g + WY) / 2 - 0.2, 0, 2);
  for (const xa of [b0 + 1.5, b1 - 1.5]) kit.box(m.brick, 3, top - g + 0.2, Z1 - Z0 + 1, xa, (top + g) / 2, (Z0 + Z1) / 2, 2);   // landhoofden
  tracks(kit, m, FERN, b0, b1);
  kit.box(m.steel, L, 0.7, Z1 - Z0, cx, top - 0.35, (Z0 + Z1) / 2);                                    // dek
  for (let x = b0 + 2; x < b1; x += 4) kit.box(m.dark, 0.25, 0.9, Z1 - Z0 - 0.4, x, top - 1.1, (Z0 + Z1) / 2); // dwarsdragers
  const H = 5.2;
  for (const z of [Z0 + 0.3, Z1 - 0.3]) {
    kit.box(m.steel, L, 0.6, 0.5, cx, top - 0.6, z); kit.box(m.steel, L - 4, 0.5, 0.5, cx, top + H, z);       // onder- en bovenrand
    const n = Math.max(4, Math.round(L / 6)), d = L / n;
    for (let i = 0; i <= n; i++) {
      const x = b0 + i * d; kit.box(m.steel, 0.35, H, 0.4, x, top + H / 2, z);
      if (i < n) { const ang = Math.atan2(H, d) * (i % 2 ? 1 : -1); kit.box(m.steel, Math.hypot(H, d), 0.22, 0.3, x + d / 2, top + H / 2, z, 0, ang); }
    }
  }
  for (const tz of FERN.tracks) kit.box(m.dark, L, 0.03, 0.03, cx, RAIL_Y + 5.5, tz);
  if (rv1 - rv0 > 36) kit.box(m.stone, 4, top - 0.7 - WY + 0.5, Z1 - Z0, (rv0 + rv1) / 2, (top - 0.7 + WY - 0.5) / 2, (Z0 + Z1) / 2, 2);   // pijler
}
// Rivier van een brug in het tussenstuk (lokale x van station a).
function riverOf(a, x0, x1) { const c = (x0 + x1) / 2, h = (a.bridge?.width || 52) / 2; return [c - h, c + h]; }

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
    // Ringbahn (S41/S42): ook het stuk Wedding → Gesundbrunnen, aan beide kanten (−1 = vóór het eerste station, n−1 = na het laatste).
    const lo = this.line.ring ? -1 : 0, hi = this.line.ring ? this.stations.length - 1 : this.stations.length - 2;
    for (let i = index - 2; i <= index + 1; i++) if (i >= lo && i <= hi) seg.add(i);
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
  /** Vooruit bouwen terwijl de lijn nog niet actief is (U3b: meerijder komt zo uit een andere lijnwereld). Eén stap per aanroep. */
  warm(x) {
    this.lastActive = performance.now();
    const idx = this.indexOf(x), w = this.wanted(idx);
    const todo = [...[...w.st].filter(i => !this.stationGroups.has(i)).map(i => ['st', i]), ...[...w.seg].filter(i => !this.segmentGroups.has(i)).map(i => ['seg', i])];
    if (todo.length) this.buildOne(...todo[0]);
    return todo.length;
  }
  /** Synchroon alles om index heen bouwen (bij teleport, zodat je niet in het niets staat). */
  prime(index) { const w = this.wanted(index); for (const i of [index, ...w.st]) if (!this.stationGroups.has(i)) this.buildOne('st', i); }
  buildOne(kind, i) {
    const S = this.stations, n = S.length, sp = this.line.spacing;
    // Ring: het tussenstuk rond de "naad" verbindt het laatste en het eerste station (kopie op de andere kant).
    const a = kind === 'seg' && i < 0 ? { ...S[n - 1], x: S[0].x - sp } : S[i];
    const b = kind === 'seg' ? (i >= n - 1 ? { ...S[0], x: S[n - 1].x + sp } : S[i + 1]) : null;
    const { kit, city } = kind === 'st' ? stationKit(this.line, a, this.m) : segmentKit(this.line, a, b, this.m);
    const g = kit.build(`${this.line.id}:${kind}:${a.id}`);
    // Tijdelijke stadsbebouwing (straat, gevels, bomen) apart: verborgen zodra de OSM-omgeving (U1d) er staat.
    const c = city.build(`${this.line.id}:${kind}:${a.id}:city`); c.userData.lineCity = true; c.visible = this.cityVisible !== false;
    if (c.children.length) g.add(c);
    g.position.x = a.x; g.userData.line = this.line.id; g.userData.lineStation = i;
    this.root.add(g); this.built++;
    (kind === 'st' ? this.stationGroups : this.segmentGroups).set(i, g);
  }
  /** Toon of verberg de tijdelijke stadsbebouwing (U1d: de OSM-omgeving neemt het over). */
  setCity(visible) {
    if (this.cityVisible === visible) return; this.cityVisible = visible;
    for (const map of [this.stationGroups, this.segmentGroups]) for (const g of map.values()) for (const c of g.children) if (c.userData.lineCity) c.visible = visible;
  }
  /** Straathoogte (y) langs de lijn op lijn-x — dezelfde hoogtes als viaduct en straat hierboven. */
  groundAt(x) {
    if (!this.profile) {
      const pts = [], S = this.stations;
      for (let i = 0; i < S.length; i++) {
        const st = S[i], y = st.kind === 'viaduct' ? -st.elev : st.kind === 'cutting' ? CUT_TOP : TUNNEL_TOP;
        pts.push([st.x - HALF, y], [st.x + HALF, y]);
        const b = S[i + 1];
        if (b && st.kind !== b.kind) {     // tunnelmond: maaiveld op tunnelhoogte tot het begin van de helling
          const len = b.x - st.x - 2 * HALF;
          if (st.kind === 'tunnel') pts.push([st.x + HALF + len * 0.38, TUNNEL_TOP]);
          else pts.push([st.x + HALF + len * 0.62, TUNNEL_TOP]);
        }
      }
      this.profile = pts;
    }
    const P = this.profile;
    if (x <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [xa, ya] = P[i - 1], [xb, yb] = P[i]; return xb - xa < 1e-6 ? yb : ya + (yb - ya) * (x - xa) / (xb - xa); }
    return P[P.length - 1][1];
  }
  /** Lijn-x-intervallen waar de omgeving niets mag bouwen (rivieren onder bruggen). */
  clearZones() {
    const out = [];
    for (let i = 0; i + 1 < this.stations.length; i++) {
      const a = this.stations[i]; if (!a.bridge) continue;
      const [r0, r1] = riverOf(a, HALF, this.stations[i + 1].x - a.x - HALF); out.push([a.x + r0, a.x + r1]);
    }
    return out;
  }
  dispose(g) { g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); g.parent?.remove(g); }
  clear() { for (const g of this.stationGroups.values()) this.dispose(g); for (const g of this.segmentGroups.values()) this.dispose(g); this.stationGroups.clear(); this.segmentGroups.clear(); }
  status() { return { stations: [...this.stationGroups.keys()].map(i => this.stations[i].id), segments: this.segmentGroups.size, built: this.built }; }
}
