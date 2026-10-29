// Berlin Life — Alexanderplatz: trap U2 → Verteilerebene, de hal zelf, de gang naar de U8, de trap omlaag
// naar de U8 en de uitgang naar buiten. Enige eigenaar van het uiterlijk van dit gebied (29 okt 2026).
//
// Vroeger lagen hier vier lagen losse patches over elkaar (AlexanderConcourse, AlexanderplatzUpgrade,
// U8Alexanderplatz, AlexanderTransitionFix, AlexanderTransferOverlay), elk met eigen dozen en borden
// midden in de doorgang. Die blijven geladen (lopen, treinen en de U8-hal hangen er nog aan), maar alles
// wat ze in de gebieden hieronder neerzetten wordt verborgen en hier opnieuw gebouwd:
//   - één BVG-bordenset (één textuur-atlas): hoog onder het plafond, nooit op ooghoogte;
//   - tegels, terrazzo, plafondpanelen en TL-lijnen via MaterialBase (U2-kant crème met rood, U8-kant groen,
//     zoals de echte stations; zelfde kleuren als StationProfiles);
//   - een echte uitgangstrap met daglicht en de Fernsehturm boven aan de trap; daarna Street View zoals nu.
// Loopcode blijft bij PlayerConcoursePatch (gebieden en hoogtes ongewijzigd, trappen nu lineair = gelijk
// met de treden). Alles per materiaal samengevoegd (Kit uit LineWorld) → ±15 draw calls voor het hele gebied.
//
// Coördinaten: x absoluut (U2-perron rond x = 2,55), rz = z − station.z, y = 0 U2-perronvloer.
// Console: BerlinAlexHub.status(), .showOld(true|false).
import * as THREE from 'three';
import { WorldStreamer } from './WorldStreamer.js';
import { Kit } from '../lines/LineWorld.js';
import { MaterialBase } from '../state/MaterialBase.js';
import { Tick } from '../state/Tick.js';

const HALL_Y = 4.2, HALL_CEIL = 7.8, GANG_CEIL = 7.5, U8_Y = -4;
const ZC = 49;                                  // as van de gang en het U8-perron (rz)
const GANG_HALF = 4.05;                         // binnenkant gangwanden (rz = 49 ± 4,05)
const HALL_X0 = -1.55, HALL_X1 = 6.65;          // binnenkant halwanden
const HALL_RZ0 = 26, HALL_RZ1 = 66;             // achterwand boven de trapvoet … eindwand met uitgang
const STAIR_X0 = 0.6, STAIR_X1 = 4.5;           // U2-trap (loopbaan 0,72–4,38)
const DOWN_X0 = 24, DOWN_X1 = 40.5;             // trap naar de U8
const EXIT_X0 = 0.3, EXIT_X1 = 4.8, EXIT_TOP_RZ = 76.8, STREET_Y = 9.6;

// Gebieden waarin oude geometrie verborgen wordt (middelpunt van de mesh; x, y, rz).
const CLEAR = [
  { x: [0.35, 4.8], y: [-0.5, 4.5], rz: [24.5, 44.6] },     // trapkoker U2 (+ oude glazen lift aan de trapvoet)
  { x: [-2.2, 7.2], y: [3.7, 8.8], rz: [25.8, 68.5] },      // Verteilerebene + oude uitgang
  { x: [6, 24.2], y: [3.7, 8.6], rz: [43.5, 54.5] },        // gang naar de U8
  { x: [23.5, 41.6], y: [-4.6, 8.6], rz: [43.5, 54.5] },    // trap naar de U8
];

// ── Materialen (één set, gedeeld) ───────────────────────────────────────────────────────────────────
let M = null;
function std(name, color, opts = {}) { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts }); m.name = name; return m; }
function wrap(t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function materials() {
  if (M) return M;
  const S = MaterialBase.station;
  const floorTex = wrap(S.wall({ t: 'large', c: '#bdb7ac', g: '#8f8a82', W: 2.4, H: 2.4, y0: 1, jit: 0.07 }).clone()); floorTex.needsUpdate = true;
  const treadTex = wrap(S.wall({ t: 'large', c: '#8f8b85', g: '#6c6964', W: 1.2, H: 1.2, y0: 1, jit: 0.05 }).clone()); treadTex.needsUpdate = true;
  const cream = S.wall({ c: '#e6e3dc', t: 'rect', W: 3, H: 4.4, y0: -0.2, dado: { c: '#5a544e', h: 0.16 }, bands: [['#a8352d', 2.62, 0.09], ['#a8352d', 0.95, 0.05]] });
  const green = S.wall({ c: '#5e9c88', t: 'rect', W: 3, H: 4.4, y0: -0.2, dado: { c: '#2f4d44', h: 0.5 }, bands: [['#e8e4d8', 2.62, 0.06]] });
  const ceil = wrap(S.ceiling({ t: 'panel', c: '#d8d9d4' }));
  M = {
    floor: std('Terrazzo', 0xffffff, { map: floorTex }),
    tread: std('TactileStone', 0xffffff, { map: treadTex }),
    cream: std('Ceramic', 0xffffff, { map: wrap(cream) }),
    green: std('Ceramic', 0xffffff, { map: wrap(green) }),
    ceil: std('HubCeiling', 0xffffff, { map: ceil }),
    steel: std('BrushedMetal', 0xb8bcbe, { roughness: 0.36, metalness: 0.85 }),
    frame: std('StationSteel', 0x33373a, { roughness: 0.5 }),
    red: std('StationSteel', 0x8e2a25, { roughness: 0.45 }),
    darkgreen: std('StationSteel', 0x2f4a42, { roughness: 0.45 }),
    glass: std('Smoked_Safety_Glass', 0x9fb3b8, { transparent: true, opacity: 0.22, roughness: 0.06, depthWrite: false }),
    yellow: std('BVG_Painted_Metal_Atlas', 0xf0c51a, { roughness: 0.3 }),
    tactile: std('TactileStone', 0xdcd8ce, { roughness: 0.86 }),
    pave: std('HubPavement', 0x8e8c87, { roughness: 0.9 }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff3d6 }),
    atlas: new THREE.MeshBasicMaterial({ map: atlasTex(), toneMapped: false, color: 0xeeeeee }),
    shops: new THREE.MeshBasicMaterial({ map: shopTex(), toneMapped: false, color: 0xe6e6e6 }),
    sky: new THREE.MeshBasicMaterial({ map: skyTex(), toneMapped: false, fog: false }),
  };
  M.ceil.userData.g3b = 'alexHub';
  M.light.name = 'HubLight';
  return M;
}

// ── Borden: één atlas 2048 × 1024 ───────────────────────────────────────────────────────────────────
const BLUE = '#1b4d9b';
const LINES = { U2: '#da421e', U5: '#7e5330', U8: '#224f86', S: '#008d4f' };
const SLOTS = {
  hallA:   [0, 0, 2048, 192],      // hal, voor wie van de U2-trap komt (kijkt +z)
  hallB:   [0, 192, 2048, 192],    // hal, voor wie van de uitgang komt (kijkt −z)
  stair:   [0, 384, 1024, 192],    // U2-perron, boven de trapvoet
  toU8:    [1024, 384, 1024, 192], // gang, richting U8
  fromU8:  [0, 576, 1024, 192],    // gang, terug van de U8
  exit:    [1024, 576, 1024, 192], // lichtbak boven de uitgang
  nameU2:  [0, 768, 1024, 128],
  nameU8:  [1024, 768, 1024, 128],
  ubahn:   [0, 896, 128, 128],
};
function badge(x, cx, cy, s, label) {
  const col = LINES[label];
  x.save();
  if (label === 'S') {
    x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, s / 2 + 5, 0, Math.PI * 2); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(cx, cy, s / 2, 0, Math.PI * 2); x.fill();
  } else {
    x.fillStyle = '#fff'; x.fillRect(cx - s / 2 - 5, cy - s / 2 - 5, s + 10, s + 10);
    x.fillStyle = col; x.fillRect(cx - s / 2, cy - s / 2, s, s);
  }
  x.fillStyle = '#fff'; x.font = `700 ${Math.round(s * 0.56)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(label, cx, cy + 2);
  x.restore();
  return cx + s / 2 + 22;
}
// Eén regel: [badges…] tekst [pijl]. Geeft x na de tekst terug.
function run(x, x0, cy, s, badges, text, font, arrow) {
  let cx = x0;
  for (const b of badges) cx = badge(x, cx + s / 2, cy, s, b) - s / 2 + 4;
  if (badges.length) cx += s / 2 - 4;
  x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = font;
  if (arrow === '←') { x.font = `700 ${s}px Arial`; x.fillText('←', x0, cy + 2); }
  x.font = font; x.fillText(text, cx, cy + 3);
  cx += x.measureText(text).width + 24;
  if (arrow && arrow !== '←') { x.font = `700 ${s}px Arial`; x.fillText(arrow, cx, cy + 2); cx += s; }
  return cx;
}
function panel(x, [px, py, w, h], bg = BLUE) {
  x.fillStyle = bg; x.fillRect(px, py, w, h);
  x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(px, py, w, 4);
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(px, py + h - 5, w, 5);
}
function atlasTex() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#222'; x.fillRect(0, 0, 2048, 1024);
  const F1 = '700 76px Arial', F2 = '700 62px Arial';
  // hal A: ← U8 links (gang), rechtdoor U5/S/uitgang
  panel(x, SLOTS.hallA);
  x.font = '700 120px Arial'; x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText('←', 40, 96);
  let e = run(x, 190, 96, 120, ['U8'], 'Wittenau · Hermannstraße', F1);
  x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(Math.max(e + 10, 1090), 30, 4, 132);
  run(x, Math.max(e + 50, 1130), 96, 120, ['U5', 'S'], 'Ausgang', F1, '↑');
  // hal B: U2 trap rechtdoor omlaag, U8 rechts
  panel(x, [0, 192, 2048, 192]);
  e = run(x, 40, 288, 120, ['U2'], 'Pankow · Ruhleben', F1, '↓');
  x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(1010, 222, 4, 132);
  run(x, 1060, 288, 120, ['U8'], 'Wittenau · Hermannstraße', F1, '→');
  // U2-perron boven de trapvoet
  panel(x, SLOTS.stair);
  run(x, 36, 480, 116, ['U8', 'U5', 'S'], 'Ausgang', F1, '↑');
  // gang
  panel(x, SLOTS.toU8);
  run(x, 1060, 480, 116, ['U8'], 'Wittenau · Hermannstraße', F2, '↓');
  panel(x, SLOTS.fromU8);
  run(x, 36, 672, 116, ['U2', 'U5', 'S'], 'Ausgang', F1, '↑');
  // lichtbak uitgang (wit, BVG-blauw, zoals de grote bakken in de Verteilerebene)
  {
    const [px, py, w, h] = SLOTS.exit;
    x.fillStyle = '#f7f6f1'; x.fillRect(px, py, w, h);
    x.fillStyle = BLUE; x.fillRect(px, py, 22, h); x.fillRect(px + w - 22, py, 22, h);
    x.fillStyle = BLUE; x.font = '700 92px Arial'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText('Ausgang', px + 60, py + 66);
    const ww = x.measureText('Ausgang').width; x.font = '700 92px Arial'; x.fillText('↑', px + 80 + ww, py + 66);
    x.fillStyle = '#1d1d1d'; x.font = '700 40px Arial'; x.fillText('Alexanderplatz · Weltzeituhr · Fernsehturm', px + 60, py + 148, w - 110);
  }
  // stationsnaam: zwart emaille, rand in lijnkleur
  for (const [k, col] of [['nameU2', '#a8352d'], ['nameU8', '#224f86']]) {
    const [px, py, w, h] = SLOTS[k];
    x.fillStyle = col; x.fillRect(px, py, w, h); x.fillStyle = '#16181a'; x.fillRect(px + 9, py + 9, w - 18, h - 18);
    x.fillStyle = '#f4f2ea'; x.font = '700 80px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Alexanderplatz', px + w / 2, py + h / 2 + 3, w - 60);
  }
  // U-Bahn-teken
  { const [px, py, w, h] = SLOTS.ubahn; x.fillStyle = BLUE; x.fillRect(px, py, w, h); x.fillStyle = '#fff'; x.fillRect(px + 6, py + 6, w - 12, 3); x.font = '700 104px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('U', px + w / 2, py + h / 2 + 6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// Twee winkelpuien (Backshop, Presse) in één textuur 1024 × 512.
function shopTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const shops = [['Backshop · Kaffee', '#7a4a26', '#f3d79a'], ['Presse · Tabak · Lotto', '#21324a', '#d8e4ef']];
  shops.forEach(([name, head, glow], i) => {
    const y0 = i * 256;
    x.fillStyle = '#3a3a3a'; x.fillRect(0, y0, 1024, 256);
    x.fillStyle = head; x.fillRect(0, y0, 1024, 52);
    x.fillStyle = '#fff'; x.font = '700 36px Arial'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(name, 26, y0 + 28);
    const g = x.createLinearGradient(0, y0 + 60, 0, y0 + 250); g.addColorStop(0, glow); g.addColorStop(1, '#8c8170');
    x.fillStyle = g; x.fillRect(20, y0 + 62, 620, 186);
    x.fillStyle = 'rgba(40,30,20,0.55)';
    for (let r = 0; r < 3; r++) x.fillRect(30, y0 + 110 + r * 46, 600, 6);                       // planken
    for (let k = 0; k < 40; k++) { x.fillStyle = `hsla(${(k * 47 + i * 90) % 360},45%,${45 + (k % 3) * 8}%,0.9)`; x.fillRect(36 + (k % 20) * 30, y0 + 80 + Math.floor(k / 20) * 46 + (k % 2) * 46, 20, 28); }
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(20, y0 + 62, 620, 10);
    x.fillStyle = '#2a2a2a'; x.fillRect(660, y0 + 62, 8, 186);                                    // deur
    const d = x.createLinearGradient(0, y0 + 62, 0, y0 + 250); d.addColorStop(0, glow); d.addColorStop(1, '#6d6558');
    x.fillStyle = d; x.fillRect(680, y0 + 62, 320, 186);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(838, y0 + 62, 4, 186);
    x.fillStyle = '#c9c9c9'; x.fillRect(0, y0 + 248, 1024, 8);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// Lucht boven de uitgang: Alexanderplatz met hotel (hoog blok) en de Fernsehturm. Getint naar dag/nacht.
function skyTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d'), H = 512;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6f9dc2'); g.addColorStop(0.75, '#c9d9e2'); g.addColorStop(1, '#e3e6e2');
  x.fillStyle = g; x.fillRect(0, 0, 1024, H);
  const sil = '#6c7680', sil2 = '#848d95';
  // hoog hotelblok links, lagere DDR-blokken
  x.fillStyle = sil2; x.fillRect(40, H - 250, 170, 250);
  x.fillStyle = 'rgba(255,255,255,0.12)'; for (let r = 0; r < 24; r++) x.fillRect(48, H - 244 + r * 10, 154, 3);
  x.fillStyle = sil2; x.fillRect(240, H - 120, 220, 120); x.fillRect(720, H - 140, 260, 140); x.fillRect(470, H - 70, 230, 70);
  // Fernsehturm
  const tx = 590;
  x.fillStyle = sil;
  x.beginPath(); x.moveTo(tx - 16, H); x.lineTo(tx - 8, H - 300); x.lineTo(tx + 8, H - 300); x.lineTo(tx + 16, H); x.fill();
  x.beginPath(); x.arc(tx, H - 318, 38, 0, Math.PI * 2); x.fill();
  x.fillRect(tx - 40, H - 322, 80, 8);
  x.fillRect(tx - 5, H - 400, 10, 50); x.fillRect(tx - 3, H - 470, 6, 72);
  x.fillStyle = '#c9473b'; for (let k = 0; k < 5; k++) x.fillRect(tx - 3, H - 470 + k * 14, 6, 6);
  x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(tx - 34, H - 330, 68, 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── Geometrie-hulpjes ───────────────────────────────────────────────────────────────────────────────
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
// Vierhoek a-b-c-d met uv's; draait om als de normaal niet naar `want` wijst.
function quad(kit, mat, pts, uvs, want) {
  let P = pts.map(p => new THREE.Vector3(...p)), U = uvs;
  _a.subVectors(P[1], P[0]); _b.subVectors(P[3], P[0]); _n.crossVectors(_a, _b);
  if (_n.dot(new THREE.Vector3(...want)) < 0) { P = [P[0], P[3], P[2], P[1]]; U = [U[0], U[3], U[2], U[1]]; }
  const pos = [], uv = [];
  for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(P[i].x, P[i].y, P[i].z); uv.push(...U[i]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  kit.add(mat, g);
}
// Wand langs x (vast z) of langs z (vast x), tegeltextuur: u = s / W, v = (y − Y0) / H.
function wall(kit, mat, axis, fixed, s0, s1, y0, y1, facing, Y0, W = 3, H = 4.4) {
  const v0 = (y0 - Y0) / H, v1 = (y1 - Y0) / H, u0 = s0 / W, u1 = s1 / W;
  const pts = axis === 'x'
    ? [[s0, y0, fixed], [s1, y0, fixed], [s1, y1, fixed], [s0, y1, fixed]]
    : [[fixed, y0, s0], [fixed, y0, s1], [fixed, y1, s1], [fixed, y1, s0]];
  const want = axis === 'x' ? [0, 0, facing] : [facing, 0, 0];
  quad(kit, mat, pts, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], want);
}
function flat(kit, mat, x0, x1, z0, z1, y, up = true, tile = 3) {
  quad(kit, mat, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]],
    [[x0 / tile, z0 / tile], [x1 / tile, z0 / tile], [x1 / tile, z1 / tile], [x0 / tile, z1 / tile]], [0, up ? 1 : -1, 0]);
}
// Schuine staaf (leuning) van p0 naar p1.
function bar(kit, mat, p0, p1, t = 0.05) {
  const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(t, t, len);
  const m = new THREE.Matrix4().lookAt(b, a, new THREE.Vector3(0, 1, 0));
  g.applyMatrix4(m); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  kit.add(mat, g);
}
// Bord uit de atlas: vlak w × h op (x, y, z) met normaal `facing` ('+z', '-z', '+x', '-x').
const ROT = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
function sign(kit, mat, slot, w, h, x, y, z, facing, texW = 2048, texH = 1024) {
  const [px, py, sw, sh] = slot;
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * sw) / texW, 1 - (py + (1 - uv.getY(i)) * sh) / texH);
  g.rotateY(ROT[facing]); g.translate(x, y, z);
  kit.add(mat, g);
}
// Hangbord met kader en twee stangen naar het plafond; voor- en achterkant (achter = slotB of dicht).
function hangSign(kit, m, slotA, slotB, w, h, x, y, z, facing, ceilY) {
  const alongX = facing === '+z' || facing === '-z';
  const d = { '+z': [0, 0, 1], '-z': [0, 0, -1], '+x': [1, 0, 0], '-x': [-1, 0, 0] }[facing];
  kit.box(m.frame, alongX ? w + 0.1 : 0.09, h + 0.1, alongX ? 0.09 : w + 0.1, x, y, z);
  sign(kit, m.atlas, slotA, w, h, x + d[0] * 0.05, y, z + d[2] * 0.05, facing);
  if (slotB) {
    const back = { '+z': '-z', '-z': '+z', '+x': '-x', '-x': '+x' }[facing];
    sign(kit, m.atlas, slotB, w, h, x - d[0] * 0.05, y, z - d[2] * 0.05, back);
  }
  for (const s of [-0.35, 0.35]) {
    const ox = alongX ? s * w : 0, oz = alongX ? 0 : s * w;
    kit.box(m.steel, 0.03, ceilY - (y + h / 2), 0.03, x + ox, (ceilY + y + h / 2) / 2, z + oz);
  }
}
// Rechte trap: treden + stootborden + aluminium neusprofiel. axis 'z' (U2/uitgang, stijgend naar +z) of 'x'
// (naar de U8, dalend naar +x). a0/a1 = begin/eind langs de as, c0/c1 = breedte dwars, y0 → y1, n treden.
function stairs(kit, m, axis, a0, a1, c0, c1, y0, y1, n) {
  const run = (a1 - a0) / n, rise = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const s0 = a0 + i * run, s1 = s0 + run;
    const yT = axis === 'z' ? y0 + (i + 1) * rise : y0 + (i + 1) * rise;   // bovenkant tree i
    const yR = axis === 'z' ? y0 + i * rise : y0 + i * rise;
    if (axis === 'z') {
      flat(kit, m.tread, c0, c1, s0, s1, yT, true, 1.2);
      wall(kit, m.tread, 'x', s0, c0, c1, yR, yT, -1, 0, 1.2, 1.2);
      kit.box(m.steel, c1 - c0, 0.02, 0.06, (c0 + c1) / 2, yT + 0.008, s0 + 0.03);
    } else {
      // dalend: tree i ligt op y0 + (i+1)·rise (rise < 0), stootbord kijkt naar +x (omhoog kijkend zichtbaar)
      flat(kit, m.tread, s0, s1, c0, c1, yT, true, 1.2);
      wall(kit, m.tread, 'z', s0, c0, c1, yT, yR, 1, 0, 1.2, 1.2);
      kit.box(m.steel, 0.06, 0.02, c1 - c0, s0 + 0.03, yT + 0.008, (c0 + c1) / 2);
    }
  }
}

// ── Bouwen ──────────────────────────────────────────────────────────────────────────────────────────
function build(root, st) {
  const m = materials(), Z = st.z, k = new Kit();
  const z = rz => Z + rz;
  const hy = HALL_Y, Y0h = hy - 0.2;

  // 1. Trap U2-perron → hal (rz 26 → 44, y 0 → 4,2), 24 treden; koker met crème tegels.
  stairs(k, m, 'z', z(26), z(44), STAIR_X0, STAIR_X1, 0, hy, 24);
  wall(k, m.cream, 'z', STAIR_X0, z(26), z(44), -0.05, hy, 1, -0.2);
  wall(k, m.cream, 'z', STAIR_X1, z(26), z(44), -0.05, hy, -1, -0.2);
  wall(k, m.cream, 'z', 0.4, z(26), z(34), 0, 3.95, -1, -0.2);            // buitenkant, vanaf het perron
  wall(k, m.cream, 'z', 4.7, z(26), z(34), 0, 3.95, 1, -0.2);
  k.box(m.frame, 0.3, 0.3, 4.3, 2.55, 3.95, z(25.85));                    // latei boven de trapvoet
  const ang = Math.atan2(hy, 18);
  for (const x of [STAIR_X0 + 0.07, STAIR_X1 - 0.07]) {
    bar(k, m.steel, [x, 0.9, z(25.6)], [x, 0.9, z(26)]);
    bar(k, m.steel, [x, 0.9, z(26)], [x, hy + 0.9, z(44)]);
    for (let s = 27; s < 44; s += 3) k.box(m.frame, 0.03, 0.12, 0.03, x + (x < 2 ? -0.04 : 0.04), 0.84 + (s - 26) * Math.tan(ang), z(s));
  }
  hangSign(k, m, SLOTS.stair, null, 3.2, 0.6, 2.55, 3.35, z(25.6), '-z', 3.8);

  // 2. Verteilerebene (rz 26 → 66, y 4,2), crème tegels, rood als de U2.
  flat(k, m.floor, HALL_X0, HALL_X1, z(44), z(HALL_RZ1), hy, true, 2.4);
  flat(k, m.floor, HALL_X0, STAIR_X0, z(26), z(44), hy, true, 2.4);
  flat(k, m.floor, STAIR_X1, HALL_X1, z(26), z(44), hy, true, 2.4);
  k.box(m.tactile, 0.3, 0.012, HALL_RZ1 - 44.6, 2.55, hy + 0.006, z((44.6 + HALL_RZ1) / 2));        // geleidelijn
  flat(k, m.ceil, HALL_X0, HALL_X1, z(HALL_RZ0), z(HALL_RZ1), HALL_CEIL, false, 3);
  wall(k, m.cream, 'z', HALL_X0, z(HALL_RZ0), z(HALL_RZ1), hy, HALL_CEIL, 1, Y0h);
  wall(k, m.cream, 'z', HALL_X1, z(HALL_RZ0), z(ZC - GANG_HALF), hy, HALL_CEIL, -1, Y0h);
  wall(k, m.cream, 'z', HALL_X1, z(ZC + GANG_HALF), z(HALL_RZ1), hy, HALL_CEIL, -1, Y0h);
  wall(k, m.cream, 'x', z(HALL_RZ0), HALL_X0, HALL_X1, 3.9, HALL_CEIL, 1, Y0h);                     // achterwand
  wall(k, m.cream, 'x', z(HALL_RZ1), HALL_X0, EXIT_X0, hy, HALL_CEIL, -1, Y0h);                     // eindwand
  wall(k, m.cream, 'x', z(HALL_RZ1), EXIT_X1, HALL_X1, hy, HALL_CEIL, -1, Y0h);
  wall(k, m.cream, 'x', z(HALL_RZ1), EXIT_X0, EXIT_X1, 6.6, HALL_CEIL, -1, Y0h);
  wall(k, m.cream, 'z', HALL_X1 + 0.001, z(ZC - GANG_HALF), z(ZC + GANG_HALF), GANG_CEIL, HALL_CEIL, -1, Y0h);   // boven de gangopening
  // balustrade (glas + rvs) rond het trapgat
  for (const x of [STAIR_X0 - 0.04, STAIR_X1 + 0.04]) {
    k.box(m.frame, 0.1, 0.12, 18, x, hy + 0.06, z(35));
    k.box(m.glass, 0.02, 0.95, 18, x, hy + 0.6, z(35));
    k.box(m.steel, 0.07, 0.05, 18, x, hy + 1.1, z(35));
    for (let s = 26.5; s <= 44; s += 2.5) k.box(m.frame, 0.05, 1.05, 0.05, x, hy + 0.55, z(s));
  }
  // rode pilasters en de rode omlijsting van de gangopening
  for (const s of [30, 36, 42, 56, 62]) { k.box(m.red, 0.16, HALL_CEIL - hy, 0.36, HALL_X0 + 0.08, (hy + HALL_CEIL) / 2, z(s)); }
  for (const s of [30, 36, 59, 64]) { k.box(m.red, 0.16, HALL_CEIL - hy, 0.36, HALL_X1 - 0.08, (hy + HALL_CEIL) / 2, z(s)); }
  for (const s of [ZC - GANG_HALF, ZC + GANG_HALF]) k.box(m.red, 0.3, GANG_CEIL - hy, 0.3, HALL_X1, (hy + GANG_CEIL) / 2, z(s));
  k.box(m.red, 0.3, 0.3, 2 * GANG_HALF + 0.3, HALL_X1, GANG_CEIL + 0.15, z(ZC));
  k.box(m.red, HALL_X1 - HALL_X0, 0.08, 0.08, (HALL_X0 + HALL_X1) / 2, HALL_CEIL - 0.04, z(HALL_RZ0 + 0.05));
  // TL-lijnen
  for (const x of [0.4, 4.7]) for (let s = HALL_RZ0 + 1; s < HALL_RZ1 - 1; s += 2.1) k.box(m.light, 0.12, 0.04, 1.6, x, HALL_CEIL - 0.03, z(s + 0.8));
  // winkels (links, tegenover de gang) en kaartautomaten (rechts, bij de uitgang)
  sign(k, m.shops, [0, 0, 1024, 256], 6, 3, HALL_X0 + 0.02, hy + 1.5, z(50), '+x', 1024, 512);
  sign(k, m.shops, [0, 256, 1024, 256], 6, 3, HALL_X0 + 0.02, hy + 1.5, z(57.5), '+x', 1024, 512);
  for (const s of [60.6, 61.6]) {
    k.box(m.frame, 0.72, 1.75, 0.78, HALL_X1 - 0.38, hy + 0.875, z(s));
    k.box(m.yellow, 0.74, 0.6, 0.8, HALL_X1 - 0.38, hy + 1.38, z(s));
    k.box(m.light, 0.02, 0.3, 0.5, HALL_X1 - 0.76, hy + 1.38, z(s));
  }
  // borden
  sign(k, m.atlas, SLOTS.nameU2, 3.2, 0.4, HALL_X0 + 0.02, hy + 2.35, z(33), '+x');
  sign(k, m.atlas, SLOTS.nameU2, 3.2, 0.4, HALL_X1 - 0.02, hy + 2.35, z(33), '-x');
  sign(k, m.atlas, SLOTS.nameU2, 3.2, 0.4, HALL_X1 - 0.02, hy + 2.35, z(56.5), '-x');
  hangSign(k, m, SLOTS.hallA, SLOTS.hallB, 6.4, 0.6, 2.55, HALL_CEIL - 0.62, z(46.2), '-z', HALL_CEIL);
  sign(k, m.atlas, SLOTS.exit, 3.6, 0.675, 2.55, 7.2, z(HALL_RZ1 - 0.02), '-z');

  // 3. Gang naar de U8 (x 6,65 → 24), groene U8-tegels.
  const g0 = z(ZC - GANG_HALF), g1 = z(ZC + GANG_HALF);
  flat(k, m.floor, HALL_X1, DOWN_X0, g0, g1, hy, true, 2.4);
  k.box(m.tactile, DOWN_X0 - HALL_X1 - 0.6, 0.012, 0.3, (HALL_X1 + DOWN_X0 - 0.6) / 2, hy + 0.006, z(ZC));
  flat(k, m.ceil, HALL_X1, DOWN_X0 + 0.3, g0, g1, GANG_CEIL, false, 3);
  wall(k, m.green, 'x', g0, HALL_X1, DOWN_X0, hy, GANG_CEIL, 1, Y0h);
  wall(k, m.green, 'x', g1, HALL_X1, DOWN_X0, hy, GANG_CEIL, -1, Y0h);
  for (const x of [12, 18]) for (const [zz, d] of [[g0, 1], [g1, -1]]) k.box(m.darkgreen, 0.36, GANG_CEIL - hy, 0.16, x, (hy + GANG_CEIL) / 2, zz + d * 0.08);
  for (const dz of [-2, 2]) for (let x = HALL_X1 + 0.8; x < DOWN_X0 - 1; x += 2.1) k.box(m.light, 1.6, 0.04, 0.12, x + 0.8, GANG_CEIL - 0.03, z(ZC + dz));
  sign(k, m.atlas, SLOTS.nameU8, 3.2, 0.4, 15, hy + 2.35, g0 + 0.02, '+z');
  sign(k, m.atlas, SLOTS.nameU8, 3.2, 0.4, 15, hy + 2.35, g1 - 0.02, '-z');
  hangSign(k, m, SLOTS.toU8, SLOTS.fromU8, 3.2, 0.6, 21.5, GANG_CEIL - 0.6, z(ZC), '-x', GANG_CEIL);

  // 4. Trap naar de U8 (x 24 → 40,5, y 4,2 → −4), 46 treden, schuin plafond tot onder het U8-hallendak.
  stairs(k, m, 'x', DOWN_X0, DOWN_X1, g0, g1, hy, U8_Y, 46);
  const fl = x => hy + (U8_Y - hy) * (x - DOWN_X0) / (DOWN_X1 - DOWN_X0);
  const cx0 = DOWN_X0 + 0.3, cx1 = 38.7;
  quad(k, m.ceil, [[DOWN_X0 + 0.3, GANG_CEIL, g0], [cx0, GANG_CEIL, g1], [cx1, fl(cx1) + 3.4, g1], [cx1, fl(cx1) + 3.4, g0]],
    [[0, 0], [2.7, 0], [2.7, 5.6], [0, 5.6]], [0, -1, 0]);
  for (const [zz, f] of [[g0, 1], [g1, -1]]) {
    // wand: boven trapniveau tot plafond (trapezium), tegels doorlopend
    const pts = [[DOWN_X0, hy - 0.3, zz], [41.2, U8_Y - 0.1, zz], [41.2, 0.4, zz], [DOWN_X0, GANG_CEIL, zz]];
    quad(k, m.green, pts, [[DOWN_X0 / 3, -0.1 / 4.4], [41.2 / 3, -0.1 / 4.4], [41.2 / 3, 4.5 / 4.4], [DOWN_X0 / 3, 1.0]], [0, 0, f]);
    wall(k, m.green, 'x', zz - f * 0.2, 38.2, 41.2, U8_Y, 0.4, -f, U8_Y - 0.2);        // buitenkant in de U8-hal
    bar(k, m.steel, [DOWN_X0 - 0.4, hy + 0.9, zz + f * 0.12], [DOWN_X0, hy + 0.9, zz + f * 0.12]);
    bar(k, m.steel, [DOWN_X0, hy + 0.9, zz + f * 0.12], [DOWN_X1, U8_Y + 0.9, zz + f * 0.12]);
  }
  bar(k, m.steel, [DOWN_X0, hy + 0.9, z(ZC)], [DOWN_X1, U8_Y + 0.9, z(ZC)], 0.05);       // middenleuning
  for (let x = DOWN_X0 + 1; x < DOWN_X1; x += 2.5) k.box(m.frame, 0.04, 0.9, 0.04, x, fl(x) + 0.45, z(ZC));
  for (let x = DOWN_X0 + 1.5; x < cx1 - 1; x += 2.6) k.box(m.light, 1.4, 0.04, 0.12, x, fl(x) + 3.34, z(ZC));

  // 5. Uitgang: trap omhoog naar het plein (rz 66 → 76,8, y 4,2 → 9,6), daglicht en Fernsehturm.
  const er0 = HALL_RZ1, er1 = EXIT_TOP_RZ, ef = rz => hy + (STREET_Y - hy) * (rz - er0) / (er1 - er0);
  stairs(k, m, 'z', z(er0), z(er1), EXIT_X0, EXIT_X1, hy, STREET_Y, 30);
  const cEnd = 72;                                                                    // overdekt tot hier
  quad(k, m.ceil, [[EXIT_X0, 6.6, z(er0)], [EXIT_X1, 6.6, z(er0)], [EXIT_X1, STREET_Y - 0.25, z(cEnd)], [EXIT_X0, STREET_Y - 0.25, z(cEnd)]],
    [[0, 0], [1.5, 0], [1.5, 2.3], [0, 2.3]], [0, -1, 0]);
  k.box(m.frame, EXIT_X1 - EXIT_X0, 0.35, 0.3, 2.55, STREET_Y - 0.1, z(cEnd));
  for (const [x, f] of [[EXIT_X0, 1], [EXIT_X1, -1]]) {
    wall(k, m.cream, 'z', x, z(er0), z(er1 + 0.2), hy - 0.05, STREET_Y + 0.3, f, Y0h);
    bar(k, m.steel, [x + f * 0.08, ef(er0) + 0.9, z(er0)], [x + f * 0.08, STREET_Y + 0.9, z(er1)]);
    for (let s = cEnd; s <= er1; s += 1.3) k.box(m.frame, 0.05, 1.0, 0.05, x - f * 0.05, STREET_Y + 0.8, z(s));
    k.box(m.frame, 0.06, 0.06, er1 - cEnd, x - f * 0.05, STREET_Y + 1.3, z((cEnd + er1) / 2));
    k.box(m.frame, 0.06, 0.06, er1 - cEnd, x - f * 0.05, STREET_Y + 0.75, z((cEnd + er1) / 2));
    k.box(m.cream, 0.25, 0.3, er1 - er0 + 0.2, x - f * 0.12, STREET_Y + 0.15, z((er0 + er1) / 2));
  }
  k.box(m.frame, EXIT_X1 - EXIT_X0, 0.06, 0.06, 2.55, STREET_Y + 1.3, z(cEnd));
  // plein (bestrating) en lucht
  flat(k, m.pave, -20, EXIT_X0 - 0.25, z(cEnd - 6), z(96), STREET_Y, true, 2);
  flat(k, m.pave, EXIT_X1 + 0.25, 25, z(cEnd - 6), z(96), STREET_Y, true, 2);
  flat(k, m.pave, EXIT_X0 - 0.25, EXIT_X1 + 0.25, z(er1 + 0.2), z(96), STREET_Y, true, 2);
  quad(k, m.sky, [[-34, STREET_Y - 0.5, z(96)], [39, STREET_Y - 0.5, z(96)], [39, 46, z(96)], [-34, 46, z(96)]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, -1]);
  // U-Bahn-paal aan de trapkop
  k.box(m.frame, 0.12, 3.0, 0.12, EXIT_X1 + 0.9, STREET_Y + 1.5, z(er1 + 0.6));
  k.box(m.frame, 1.0, 1.0, 0.08, EXIT_X1 + 0.9, STREET_Y + 3.45, z(er1 + 0.6));
  sign(k, m.atlas, SLOTS.ubahn, 0.92, 0.92, EXIT_X1 + 0.9, STREET_Y + 3.45, z(er1 + 0.55), '-z');
  sign(k, m.atlas, SLOTS.ubahn, 0.92, 0.92, EXIT_X1 + 0.9, STREET_Y + 3.45, z(er1 + 0.65), '+z');

  const group = k.build('AlexanderHub');
  group.userData.alexHub = true; group.userData.g3b = 'alexHub';
  group.traverse(o => { o.userData.alexHub = true; if (o.isMesh) o.frustumCulled = true; });
  return group;
}

// ── Oude geometrie verbergen, nieuwe hangen, dag/nacht ──────────────────────────────────────────────
const state = { built: 0, hidden: [], showOld: false, root: null, station: null, group: null };
const _m = new THREE.Matrix4(), _p = new THREE.Vector3();
function inClear(x, y, rz) { return CLEAR.some(c => x >= c.x[0] && x <= c.x[1] && y >= c.y[0] && y <= c.y[1] && rz >= c.rz[0] && rz <= c.rz[1]); }
function hideOld(root, st) {
  root.updateMatrixWorld(true);
  _m.copy(root.matrixWorld).invert();
  const out = [];
  root.traverse(o => {
    if (!o.isMesh || o.userData.alexHub) return;
    for (let q = o; q && q !== root; q = q.parent) if (q.userData?.alexHub || q.userData?.u8 || q === root.userData.u8Train) return;
    _p.setFromMatrixPosition(o.matrixWorld).applyMatrix4(_m);
    if (inClear(_p.x, _p.y, _p.z - st.z)) out.push(o);
  });
  for (const o of out) o.visible = false;
  return out;
}
function install(root, st) {
  if (!root || !st || root.userData.__alexHub) return;
  root.userData.__alexHub = true;
  const hidden = hideOld(root, st);
  const group = build(root, st);
  root.add(group);
  Object.assign(state, { built: state.built + 1, hidden, root, station: st, group });
  console.info(`[Metro] AlexanderHub: ${hidden.length} oude onderdelen verborgen, ${group.children.length} draw calls`);
}
// Platformbord van U8AlexanderDetailV1 ("U8 ↓ S-Bahn ↑ AUSGANG →") hangt pal voor de trapvoet: weg.
function hideDetailSign(game) {
  const g = game.scene.getObjectByName('AlexanderDetail:U2'), st = state.station;
  if (!g || !st) return;
  for (const o of g.children) if (o.geometry?.type === 'PlaneGeometry' && Math.abs(o.position.z - (st.z + 23)) < 0.2 && Math.abs(o.position.x - 2.75) < 0.2) o.visible = false;
}
function tick() {
  const game = globalThis.__berlinMetroGame;
  if (!game) return;
  const chunks = game.world?.chunks;
  if (chunks?.values) for (const c of chunks.values()) if (c?.station?.id === 'alexanderplatz' && c.structure && !c.structure.userData.__alexHub) install(c.structure, c.station);
  if (state.group && !state.group.parent) state.group = null;            // chunk ontladen
  if (!state.showOld) for (const o of state.hidden) if (o.visible) o.visible = false;
  hideDetailSign(game);
  if (M) {                                                                 // dag/nacht boven de uitgang
    const d = globalThis.BerlinRender?.daylight ?? 1;
    M.sky.color.setRGB(0.12 + 0.88 * d, 0.14 + 0.86 * d, 0.22 + 0.78 * d);
    M.pave.color.setHex(0x8e8c87).multiplyScalar(0.25 + 0.75 * d);
  }
}

const baseLoad = WorldStreamer.prototype.load;
WorldStreamer.prototype.load = function alexanderHubLoad(index) {
  const existed = this.chunks.has(index);
  const result = baseLoad.call(this, index);
  if (!existed) {
    const c = this.chunks.get(index);
    if (c?.station?.id === 'alexanderplatz') { try { install(c.structure, c.station); } catch (e) { console.error('[Metro] AlexanderHub', e); } }
  }
  return result;
};
Tick.every('alexHub', 1500, tick);

globalThis.BerlinAlexHub = {
  status() { return { built: state.built, hidden: state.hidden.length, drawCalls: state.group?.children.length ?? 0, attached: !!state.group?.parent, showOld: state.showOld }; },
  /** Vergelijken: oude geometrie weer tonen (true) of verbergen (false). */
  showOld(on = true) { state.showOld = !!on; for (const o of state.hidden) o.visible = !!on; if (state.group) state.group.visible = !on; return this.status(); },
};
