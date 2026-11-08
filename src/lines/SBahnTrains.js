// Berlin Life — S-Bahn Stadtbahn deel b (Fase 45, 8 nov 2026): eigen treinmodel BR 481 en Fernbahn-decor.
//
// sbahnTemplate(): één eenheid (wagen) van een BR 481 in Berliner S-Bahnkleuren (onder karminrood, boven oker,
// zwarte raamband, grijs dak), gebouwd uit eenvoudige vormen en per materiaal samengevoegd. Zelfde opbouw als het
// HK-model dat LineTrains verwacht: lange as = x (±12,2 m), vloer op y = 0, deuren als groepen Door_[pn]_[0-3]_[LR]
// op de deurposities van LineTrains (−8, −2,7, 2,7, 8). Cabines op beide uiteinden ('Cab+'/'Cab-') en een
// overloop ('Gang+'/'Gang-'): LineTrain.build laat aan de binnenkant van het treinstel de overloop zien.
// Interieur (lichte wanden, blauwe zitjes, gele stangen) en doorzichtige ramen, zodat je tijdens het meerijden
// naar buiten kijkt.
//
// FernbahnTraffic: af en toe een ICE (rijdt door) of een RE (stopt aan het regionale perron) op de Fernbahnsporen
// (z 10,4 / 17,4) naast de S-Bahn. Alleen decor; alleen zichtbaar en actief als de speler op de Stadtbahn is.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';

const W = 1.815;                                 // halve breedte vóór de 0,85-schaal van LineTrains
const L = 12.2;                                  // halve wagenlengte
const DOORS = [-8, -2.7, 2.7, 8], DOOR_HALF = 0.66;

// Prestaties (iPhone): drie gedeelde materialen (ondoorzichtig met vertexkleuren, glas, licht); per wagen ±17 meshes.
// Een "kleur" hieronder = { k: materiaalsoort, c: kleur }.
const C = (c, k = 'solid') => ({ k, c: new THREE.Color(c) });
let MATS = null;
function mats() {
  return MATS ||= {
    red: C('#a3231b'), ochre: C('#e2a72a'), roof: C('#8b9194'), under: C('#24272a'), black: C('#141618'),
    inner: C('#dcd6c8'), floor: C('#55595d'), seat: C('#30508a'), pole: C('#e8b82a'),
    glass: C('#203039', 'glass'), lamp: C('#fff6e0', 'emit'), head: C('#ffffff', 'emit'),
  };
}
let SHARED = null;
const shared = () => SHARED ||= {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 }),
  glass: new THREE.MeshStandardMaterial({ color: '#203039', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
  emit: new THREE.MeshStandardMaterial({ color: '#fff8e8', emissive: '#fff8e8', emissiveIntensity: 1.6 }),
};

/** Verzamelt dozen per materiaalsoort (met vertexkleur) en voegt ze samen tot één mesh per soort. */
class Batch {
  constructor() { this.parts = new Map(); }
  box(col, sx, sy, sz, x, y, z, ry = 0, rz = 0) {
    let g = new THREE.BoxGeometry(sx, sy, sz);
    if (rz) g.rotateZ(rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    g = g.toNonIndexed(); g.deleteAttribute('uv');
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = col.c.r; a[i * 3 + 1] = col.c.g; a[i * 3 + 2] = col.c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    (this.parts.get(col.k) || this.parts.set(col.k, []).get(col.k)).push(g);
  }
  into(group, name = '') {
    for (const [k, list] of this.parts) {
      const geo = mergeGeometries(list); list.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, shared()[k]); mesh.name = name; group.add(mesh);
    }
    this.parts.clear(); return group;
  }
}

// Wandstukken tussen de deuren (lokale x-intervallen).
function wallSpans() {
  const out = []; let a = -L;
  for (const c of DOORS) { out.push([a, c - DOOR_HALF]); a = c + DOOR_HALF; }
  out.push([a, L]); return out;
}

function cab(end) {
  const m = mats(), b = new Batch(), x = end * L, s = end;
  b.box(m.red, 0.28, 1.6, W * 2 - 0.1, x + s * 0.14, 0.25, 0);               // onderfront
  b.box(m.black, 0.2, 1.15, W * 2 - 0.5, x + s * 0.1, 1.62, 0, 0, s * 0.18); // voorruit (licht hellend)
  b.box(m.ochre, 0.18, 0.6, W * 2 - 0.1, x + s * 0.05, 2.47, 0);            // bovenfront (doelfilm komt ervoor)
  b.box(m.black, 0.06, 0.26, 1.7, x + s * 0.16, 2.67, 0);                    // vlak achter de richtingfilm
  for (const z of [-1.2, 1.2]) b.box(m.head, 0.05, 0.16, 0.34, x + s * 0.3, 0.45, z);   // koplampen
  b.box(m.head, 0.05, 0.12, 0.3, x + s * 0.16, 2.9, 0);                     // derde sein boven
  b.box(m.black, 0.36, 0.3, 0.5, x + s * 0.32, -0.3, 0);                    // koppeling
  const g = b.into(new THREE.Group()); g.name = end > 0 ? 'Cab+' : 'Cab-';
  return g;
}
function gangway(end) {
  const m = mats(), b = new Batch(), x = end * (L + 0.22);
  for (const z of [-0.85, 0.85]) b.box(m.black, 0.46, 2.2, 0.08, x, 1.1, z);
  b.box(m.black, 0.46, 0.08, 1.78, x, 2.2, 0);
  const g = b.into(new THREE.Group()); g.name = end > 0 ? 'Gang+' : 'Gang-'; g.visible = false;
  return g;
}
// Alle deurbladen van één kant die dezelfde kant op schuiven bewegen samen → één groep (Door_p_0_L enz.).
function doorLeaves(side, lr) {
  const m = mats(), b = new Batch(), w = DOOR_HALF - 0.02, z = side * (W + 0.02);
  for (const c of DOORS) {
    const x = c + (lr === 'L' ? -1 : 1) * w / 2;
    b.box(m.red, w, 1.05, 0.06, x, 0.42, z);
    b.box(m.glass, w - 0.14, 0.92, 0.03, x, 1.43, z);
    b.box(m.red, w, 0.1, 0.06, x, 1.94, z);
    for (const e of [-1, 1]) b.box(m.red, 0.07, 0.95, 0.06, x + e * (w / 2 - 0.035), 1.43, z);
    b.box(m.ochre, w, 0.6, 0.06, x, 2.3, z);
  }
  const g = b.into(new THREE.Group());
  g.name = `Door_${side > 0 ? 'p' : 'n'}_0_${lr}`;
  return g;
}

let TEMPLATE = null;
/** Eén wagen BR 481 (template; LineTrains kloont hem per eenheid). */
export function sbahnTemplate() {
  if (TEMPLATE) return TEMPLATE;
  const m = mats(), b = new Batch(), root = new THREE.Group(); root.name = 'BR481';
  // Wagenbak: per wandstuk onder rood, raamband (glas + okerkleurige stijlen), boven oker; dak grijs.
  for (const [a, c] of wallSpans()) {
    const len = c - a, mx = (a + c) / 2;
    for (const s of [-1, 1]) {
      const z = s * W;
      b.box(m.red, len, 1.62, 0.07, mx, 0.23, z);
      b.box(m.ochre, len, 0.72, 0.07, mx, 2.39, z);
      b.box(m.glass, len, 0.97, 0.02, mx, 1.525, z);
      for (let px = a; px <= c + 0.01; px += Math.max(0.3, len / Math.max(1, Math.round(len / 1.6)))) b.box(m.ochre, 0.1, 0.97, 0.08, Math.min(c - 0.05, Math.max(a + 0.05, px)), 1.525, z);
      b.box(m.inner, len, 1.0, 0.03, mx, 0.5, z - s * 0.06);                 // binnenwand
    }
  }
  b.box(m.ochre, 2 * L, 0.08, 2 * W + 0.02, 0, 2.76, 0);                     // dakrand
  b.box(m.roof, 2 * L - 0.4, 0.22, 2 * W - 0.3, 0, 2.9, 0);
  b.box(m.roof, 2 * L - 2, 0.14, 2 * W - 1.3, 0, 3.07, 0);
  b.box(m.roof, 3.2, 0.32, 1.2, 4, 3.2, 0);                                  // dakopbouw (klimaat)
  b.box(m.under, 2 * L - 1, 0.5, 2 * W - 0.4, 0, -0.33, 0);                  // onderbak
  for (const bx of [-8.6, 8.6]) {                                            // draaistellen
    b.box(m.under, 2.6, 0.45, 2.2, bx, -0.78, 0);
    for (const wx of [-0.9, 0.9]) for (const wz of [-0.72, 0.72]) b.box(m.black, 0.84, 0.84, 0.12, bx + wx, -0.62, wz);
  }
  // Interieur: vloer, plafond met lichtband, dwarszitjes tussen de deuren, gele stangen bij de deuren.
  b.box(m.floor, 2 * L - 0.2, 0.06, 2 * W - 0.2, 0, -0.03, 0);
  b.box(m.inner, 2 * L - 0.2, 0.04, 2 * W - 0.2, 0, 2.62, 0);
  b.box(m.lamp, 2 * L - 2, 0.04, 0.22, 0, 2.59, -0.75); b.box(m.lamp, 2 * L - 2, 0.04, 0.22, 0, 2.59, 0.75);
  for (const [a, c] of wallSpans()) {
    for (let x = a + 0.75; x < c - 0.6; x += 1.7) for (const z of [-1.15, 1.15]) {
      b.box(m.seat, 0.5, 0.12, 0.95, x, 0.46, z);
      b.box(m.seat, 0.1, 0.62, 0.95, x + (Math.round((x - a) / 1.7) % 2 ? 0.22 : -0.22), 0.8, z);
    }
  }
  for (const c of DOORS) for (const dz of [-0.6, 0.6]) b.box(m.pole, 0.05, 2.6, 0.05, c, 1.3, dz);
  b.box(m.pole, 2 * L - 2, 0.04, 0.04, 0, 1.95, 0);
  b.into(root, 'BR481Body');
  for (const e of [-1, 1]) { root.add(cab(e)); root.add(gangway(e)); }
  for (const side of [-1, 1]) for (const lr of ['L', 'R']) root.add(doorLeaves(side, lr));
  root.userData.destX = L + 0.24;           // richtingfilm vóór de cabine
  root.userData.destY = 2.67;
  root.userData.cabs = true;
  return (TEMPLATE = root);
}

// ── Fernbahn-decor: ICE en RE op de buitensporen ─────────────────────────────────────────────────
const FERN_Z = { 1: 10.4, [-1]: 17.4 };
function fernModel(kind) {
  const b = new Batch(), g = new THREE.Group(); g.name = 'Fern:' + kind;
  const ice = kind === 'ICE';
  const body = C(ice ? '#f1f1ee' : '#c4121f'), stripe = C(ice ? '#e0001a' : '#e9e9e6');
  const win = C('#1e262b'), under = mats().under, wheel = mats().black;
  const cars = ice ? 7 : 5, cl = ice ? 26 : 26.8, hw = 1.45, top = ice ? 2.75 : 3.2, bot = -0.65;
  const total = cars * cl;
  for (let i = 0; i < cars; i++) {
    const cx = -total / 2 + cl * (i + 0.5), end = i === 0 ? -1 : i === cars - 1 ? 1 : 0;
    const len = cl - 0.5 - (end ? 2.4 : 0), x = cx - end * 1.2;
    b.box(body, len, top - bot, hw * 2, x, (top + bot) / 2, 0);
    b.box(under, len - 1, 0.35, hw * 2 - 0.3, x, bot - 0.15, 0);
    for (const bx of [-cl / 2 + 3, cl / 2 - 3]) for (const wz of [-0.72, 0.72]) b.box(wheel, 2.4, 0.8, 0.14, cx + bx, -0.65, wz);
    if (ice) {
      b.box(win, len - 2, 0.75, hw * 2 + 0.02, x, 1.45, 0);
      b.box(stripe, len, 0.22, hw * 2 + 0.03, x, 0.55, 0);
    } else {
      for (const wy of [0.25, 2.05]) b.box(win, len - 3, 0.7, hw * 2 + 0.02, x, wy, 0);
      b.box(stripe, len, 0.12, hw * 2 + 0.03, x, 1.2, 0);
    }
    if (end) {                                                        // kop: drie traps smaller (stroomlijn)
      for (let k = 0; k < 3; k++) {
        const kl = 0.8, kx = cx + end * (cl / 2 - 2.4 + kl * (k + 0.5) - 0.25), kh = (top - bot) * (1 - 0.18 * (k + 1));
        b.box(body, kl, kh, hw * 2 - k * 0.25, kx, bot + kh / 2, 0);
      }
      b.box(win, 0.9, 0.6, hw * 2 - 0.6, cx + end * (cl / 2 - 2.1), top - 0.85, 0, 0, end * 0.5);
      for (const z of [-0.9, 0.9]) b.box(mats().head, 0.05, 0.14, 0.3, cx + end * (cl / 2 - 0.05), 0.15, z);
    }
  }
  b.into(g); g.userData.len = total;
  return g;
}

export class FernbahnTraffic {
  constructor(world, stations) {
    this.world = world; this.stations = stations; this.stops = stations.filter(s => s.fern).map(s => s.x);
    this.models = { ICE: fernModel('ICE'), RE: fernModel('RE') };
    for (const g of Object.values(this.models)) { g.visible = false; world.root.add(g); }
    this.active = null; this.next = 25; this.last = performance.now(); this.count = 0; this.turn = 0;
  }
  /** Eén stap; p = speler, on = speler staat op de Stadtbahn. */
  update(p, on, step = null) {
    const t = performance.now(), dt = step ?? Math.min(0.1, (t - this.last) / 1000); this.last = t;
    if (!on || p.__streetMode) { this.hide(); return; }
    const a = this.active;
    if (!a) {
      if ((this.next -= dt) > 0) return;
      const kind = this.turn++ % 3 === 2 ? 'ICE' : 'RE', dir = this.turn % 2 ? 1 : -1, px = p.position.x;
      // Stop: het eerstvolgende regionale perron in rijrichting vlak bij de speler (RE); ICE rijdt door.
      const stop = kind === 'RE' ? this.stops.filter(x => dir * (x - px) > -80).sort((u, v) => dir * (u - v))[0] ?? null : null;
      const g = this.models[kind];
      this.active = { kind, dir, x: px - dir * 520, v: kind === 'ICE' ? 24 : 17, vmax: kind === 'ICE' ? 24 : 17, stop, dwell: 0, g };
      g.position.set(this.active.x, 0, FERN_Z[dir]); g.rotation.y = dir > 0 ? 0 : Math.PI; g.visible = true; this.count++;
      return;
    }
    const acc = 0.9;
    if (a.stop != null && a.dwell >= 0) {
      const d = a.dir * (a.stop - a.x);
      if (d > 0.05) { a.v = Math.min(a.vmax, Math.sqrt(2 * acc * d), a.v + acc * dt * 3); a.x += a.dir * Math.min(a.v * dt, d); }
      else { a.x = a.stop; a.v = 0; a.dwell += dt; if (a.dwell > 22) a.dwell = -1; }
    } else { a.v = Math.min(a.vmax, a.v + acc * dt); a.x += a.dir * a.v * dt; }
    a.g.position.x = a.x;
    if (a.dir * (a.x - p.position.x) > 620 || a.x < -700 || a.x > this.stations.at(-1).x + 700) { a.g.visible = false; this.active = null; this.next = 50 + Math.random() * 60; }
  }
  hide() { if (this.active) { this.active.g.visible = false; this.active = null; this.next = 20; } }
  status() { return { active: this.active ? { kind: this.active.kind, dir: this.active.dir, x: Math.round(this.active.x), stop: this.active.stop } : null, count: this.count, next: +this.next.toFixed(1) }; }
}
