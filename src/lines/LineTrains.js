// Berlin Life — LineTrains: treinen voor nieuwe metrolijnen (Mijlpaal 1, U1b).
//
// Dienstregeling = dezelfde TrainTimeline als de U2 en U8 (naderen, deuren, vertrekken, keren).
// Uiterlijk = het Blender-model uit BlenderTrainsV1 (HK voor Kleinprofil), twee gekoppelde eenheden.
// Elke eenheid volgt zelf het spoor, ook in de S-bocht waar een middenperron overgaat in zijperrons.
//
// Assen zoals LineWorld: x langs de lijn, z dwars (in de ruimte van de lijnwereld), y = 0 = perronvloer.
// Richting +1 (naar het laatste station) rijdt rechts (z > 0), richting −1 links.
import * as THREE from 'three';
import { TrainTimeline } from '../systems/TrainTimeline.js';
import { CONFIG } from '../config.js';
import { crossSection, HALF } from './LineWorld.js';

export const UNIT_GAP = 25.0;                    // afstand tussen de middens van de twee eenheden
export const HALF_LEN = UNIT_GAP;                // halve treinlengte (2 × 24,9 m)
const WIDTH = 0.85;                              // model iets smaller: past tussen perronrand en tweede spoor
export const HALF_W = 1.815 * WIDTH;             // halve breedte van de bak
export const INSIDE_W = HALF_W - 0.38;           // waar je binnen kunt staan
const DOOR_CENTERS = [-8, -2.7, 2.7, 8];         // per eenheid (lokaal x)
const UNITS = [-UNIT_GAP / 2, UNIT_GAP / 2];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Spoorligging z voor richting `dir` op lijnpositie x (zelfde S-bocht als segmentKit in LineWorld). */
export function trackZ(stations, x, dir) {
  const k = dir > 0 ? 1 : 0, n = stations.length, sp = n > 1 ? stations[1].x - stations[0].x : 1;
  const i = clamp(Math.floor((x - stations[0].x) / sp), 0, n - 2);
  const a = stations[i], b = stations[i + 1];
  const za = crossSection(a.layout).tracks[k], zb = crossSection(b.layout).tracks[k];
  if (za === zb) return za;
  const mid = (a.x + b.x) / 2, t = clamp((x - (mid - 12)) / 24, 0, 1);
  return za + (zb - za) * t;
}

/** Aan welke kant van het spoor ligt het perron van station `st` voor richting `dir`? (+1 = +z) */
export function platformSide(st, dir) {
  const cs = crossSection(st.layout), tz = cs.tracks[dir > 0 ? 1 : 0];
  return cs.plat.length === 1 ? -Math.sign(tz) : Math.sign(tz);
}

/** Wereld-x van alle deuren (relatief aan het treinmidden). */
// ── Gedeelde registers (U3b) ─────────────────────────────────────────────────────────────────────
// ALL_TRAINS = alle treinen van alle nieuwe lijnen; WORLDS[lijn] = { world, line, api } per lijnwereld.
// Een trein kan door meer dan één lijnwereld rijden (U3: eigen gebied tot x = 262, daarna het U1-gebied).
export const ALL_TRAINS = [];
export const WORLDS = {};
export const isMoving = s => s === 'approaching' || s === 'cruising';
/** Is het spoor rond lijnpositie `x` (richting `dir`, spoor van `t`) vrij van andere treinen? Voor terugzetten. */
export function trackClear(t, x, trains) {
  const key = t.trackZone(x).id;
  return !trains.some(o => o !== t && o.direction === t.direction && Math.abs(o.x - x) < 2 * HALF_LEN + 8 && o.trackZone(o.x).id === key);
}
/**
 * Blokbeveiliging op gedeeld spoor: staat er vóór deze trein (zelfde richting, zelfde spoor) een andere
 * trein binnen één treinlengte + marge? Dan wacht hij (de U3 rijdt niet in een U1-trein en andersom).
 */
export function blocked(t, trains) {
  if (!isMoving(t.state)) return false;
  const dir = t.direction, front = t.x + dir * (HALF_LEN + 6), key = t.trackZone(front).id;
  for (const o of trains) {
    if (o === t || o.direction !== dir) continue;
    const ahead = dir * (o.x - t.x);
    if (ahead <= 0 || ahead > 2 * HALF_LEN + 6) continue;
    if (o.trackZone(o.x - dir * HALF_LEN).id === key) return true;
  }
  return false;
}

export const DOOR_OFFSETS = UNITS.flatMap(u => DOOR_CENTERS.map(d => u + d));

function destinationBoard(text, color, fg = '#fff') {
  const c = document.createElement('canvas'); c.width = 768; c.height = 100;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#080b0b'; ctx.fillRect(0, 0, 768, 100);
  ctx.fillStyle = color; ctx.fillRect(14, 16, 96, 68);
  ctx.fillStyle = fg; ctx.font = '800 54px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text.split(' ')[0], 62, 52);
  ctx.fillStyle = '#ffd05b'; ctx.textAlign = 'left'; ctx.font = '600 60px monospace'; ctx.fillText(text.split(' ').slice(1).join(' '), 128, 54, 620);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}

// Reserve-uiterlijk als het Blender-model niet laadt: gele bak met donkere ramen.
const FALLBACK = { body: new THREE.MeshStandardMaterial({ color: 0xf2c400, roughness: 0.5 }), win: new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.2, metalness: 0.4 }) };
function fallbackUnit() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(24.6, 3.2, HALF_W * 2), FALLBACK.body); body.position.y = 1.5; g.add(body);
  const win = new THREE.Mesh(new THREE.BoxGeometry(22, 0.9, HALF_W * 2 + 0.04), FALLBACK.win); win.position.y = 2.0; g.add(win);
  return { group: g, doors: { p: [], n: [] } };
}

function modelUnit(template) {
  const root = template.clone(true); root.scale.z = WIDTH;
  const doors = { p: [], n: [] };
  root.traverse(o => { const m = /^Door_([pn])_(\d)_([LR])$/.exec(o.name); if (m) doors[m[1]].push({ mesh: o, rest: o.position.x, dir: m[3] === 'L' ? -1 : 1 }); });
  return { group: root, doors };
}

let serial = 0;
export class LineTrain {
  constructor({ line, stations, direction, startIndex, delay = 0, zones = null }) {
    this.line = line; this.stations = stations;
    // Lijnwerelden waar deze trein doorheen rijdt: {id, stations, origin, from, to (rijden), viewMin, viewMax (zien)}.
    this.zones = (zones || [{ id: line.id, stations, origin: line.origin }]).map(z => ({ from: -Infinity, to: Infinity, viewMin: -Infinity, viewMax: Infinity, ...z }));
    this.viewZoneId = null; this.id = `${line.id}-${direction > 0 ? 'A' : 'B'}-${++serial}`;
    const route = stations.map(s => ({ id: s.id, name: s.name, index: s.index, z: s.x }));
    this.timeline = new TrainTimeline({ id: this.id, line: line.id, stations: route, direction, startStationIndex: startIndex, initialDelaySeconds: delay });
    this.door = 0; this.lastRecenter = -Infinity; this.rider = false;
    this.group = new THREE.Group(); this.group.name = `LineTrain:${this.id}`; this.group.userData.line = line.id;
    this.units = []; this.openSide = 1;
  }
  get x() { return this.timeline.z; }
  get direction() { return this.timeline.direction; }
  get currentIndex() { return this.timeline.currentStationIndex; }
  get state() { return this.timeline.state; }
  get canUseDoors() { return this.timeline.doorsOpen && this.timeline.state === 'boarding' && this.door > 0.82; }
  /** Staat de trein stil aan het perron van station `index`, deuren open? */
  /** Index van een station (id) in de route van deze trein, of −1. */
  routeIndex(id) { return this.stations.findIndex(s => s.id === id); }
  /** Staat de trein met open deuren aan het perron van dit station (object uit een lijnwereld)? */
  boardableAtStation(st) { const i = this.routeIndex(st.id); return i >= 0 && this.boardableAt(i) && Math.abs(this.x - st.x) < 0.5; }
  /** Op welk spoor (lijnwereld) rijdt de trein op lijnpositie x? */
  trackZone(x) { return this.zones.find(z => x >= z.from && x < z.to) || this.zones[0]; }
  /** Spoorligging z (lokaal in de lijnwereld van `zone`). */
  zoneZ(zone, x, dir = this.direction) { return trackZ(zone.stations, x, dir); }
  /** Wordt de trein nu getekend in lijnwereld `id`? */
  visibleIn(id) { return this.viewZoneId === id; }
  boardableAt(index) { return this.canUseDoors && this.currentIndex === index && Math.abs(this.x - this.stations[index].x) < 0.5; }
  etaToStation(index) { return this.timeline.etaToStation(index); }

  /** Visuals bouwen (template = Blender-HK, of null → reserve-uiterlijk). */
  build(template) {
    if (this.units.length) return;
    for (const off of UNITS) {
      const u = template ? modelUnit(template) : fallbackUnit();
      u.offset = off; this.group.add(u.group); this.units.push(u);
    }
    const term = this.timeline.terminusName.replace('straße', 'str.').replace('Straße', 'Str.');
    const mat = destinationBoard(`${this.line.id} ${term}`, this.line.color, this.line.textColor), geo = new THREE.PlaneGeometry(1.62, 0.215);
    // Richtingfilm voorop en achterop (boven de cabineruit).
    for (const end of [-1, 1]) {
      const u = this.units[end < 0 ? 0 : 1], mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'LineDestination'; mesh.position.set(end * (12.147 - 2.675 * 0.23), 2.675, 0); mesh.rotation.y = end * Math.PI / 2;
      u.group.add(mesh);
    }
    this.place();
  }

  update(delta, { rider = false } = {}) {
    const before = this.timeline.state;
    this.timeline.update(delta, { allowRecycle: !rider });
    // Deurkant vastleggen zodra de trein bij een station stopt.
    if (before !== this.timeline.state && /opening/.test(this.timeline.state)) this.openSide = platformSide(this.stations[this.currentIndex], this.direction);
    const target = this.timeline.doorsOpen ? 1 : 0, step = delta / (target > this.door ? 0.72 : 0.86);
    this.door = target > this.door ? Math.min(target, this.door + step) : Math.max(target, this.door - step);
    this.place();
  }

  /** Lokale dienst rond een wachtende speler (zelfde regels als U8Service.maintain). */
  // lead/maxEta: een tweede lijn op hetzelfde perron (U3 op de U1) komt later, niet tegelijk met de eigen trein.
  maintain(index, now, { waiting = false, lead = 1.5, maxEta = 24, others = null } = {}) {
    if (this.rider || !waiting || !Number.isInteger(index) || index < 0) return false;
    if (index + this.direction < 0 || index + this.direction >= this.stations.length) return false;
    // Niet terugzetten op een plek waar al een andere trein staat of rijdt (gedeeld spoor U1/U3).
    if (others && !trackClear(this, this.stations[index].x - this.direction * CONFIG.train.approachDistance, others)) return false;
    if (this.timeline.stopsUntilStation(index) > CONFIG.train.maxLocalStopsAway) { this.timeline.recenterNear(index, Math.max(lead, CONFIG.train.localLoopDelaySeconds)); this.door = 0; }
    if (this.etaToStation(index) > maxEta && now - this.lastRecenter > 14) { this.timeline.recenterNear(index, lead); this.door = 0; this.lastRecenter = now; return true; }
    return false;
  }

  place() {
    const dir = this.direction, x = this.x, side = this.openSide > 0 ? 'p' : 'n';
    // In welke lijnwereld tekenen? Die van de speler als de trein daar te zien is, anders die van het spoor.
    const view = globalThis.__berlinMetroGame?.player?.__line;
    const vz = this.zones.find(z => z.id === view && x >= z.viewMin && x <= z.viewMax) || null;
    const zone = vz || this.trackZone(x), S = zone.stations, first = S[0].x, last = S.at(-1).x;
    this.viewZoneId = vz?.id ?? null;
    const root = WORLDS[zone.id]?.world?.root;
    if (root && this.group.parent !== root) root.add(this.group);
    for (const u of this.units) {
      const ux = x + u.offset, z = trackZ(S, ux, dir);
      const dz = trackZ(S, ux + 6, dir) - trackZ(S, ux - 6, dir);
      u.group.position.set(ux, 0, z); u.group.rotation.y = -Math.atan2(dz, 12);
      // Voorbij het eindpunt is er geen tunnel/viaduct: eenheid daar niet tekenen.
      u.group.visible = ux > first - HALF + 10 && ux < last + HALF - 10;
      for (const k of ['p', 'n']) for (const d of u.doors[k]) d.mesh.position.x = d.rest + d.dir * 1.05 * (k === side ? this.door : 0);
    }
  }
}

// ── Vertrekbord (DFI) boven het perron: alle lijnen en richtingen met minuten (U3b: U1 én U3) ────
export class DepartureBoards {
  constructor(line, root, rows = 2) {
    this.line = line; this.key = ''; this.at = null; this.rows = rows;
    const H = 64 * rows;
    const c = this.canvas = document.createElement('canvas'); c.width = 512; c.height = H;
    this.ctx = c.getContext('2d');
    this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    const face = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false });
    const box = new THREE.MeshStandardMaterial({ color: 0x1d2226, roughness: 0.5, metalness: 0.6 });
    this.group = new THREE.Group(); this.group.name = `${line.id}:DFI`; this.group.userData.line = line.id; root.add(this.group);
    this.boards = [];
    const fh = 2.16 * H / 512;
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Group();
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.16, fh + 0.08, 2.3), box); b.add(housing);
      for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.16, fh), face); f.position.x = s * 0.085; f.rotation.y = s * Math.PI / 2; b.add(f); }
      for (const s of [-1, 1]) { const rod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), box); rod.position.set(0, fh / 2 + 0.29, s * 0.9); b.add(rod); }
      this.group.add(b); this.boards.push(b);
    }
    this.y = 3.27 - fh / 2;
  }
  /** Bord bij station `st` hangen en de vertrektijden van alle treinen die hier stoppen tekenen. */
  update(st, trains, visible) {
    this.group.visible = !!(visible && st);
    if (!this.group.visible) return;
    if (st !== this.at) {
      this.at = st;
      const cs = crossSection(st.layout), zs = cs.plat.length === 1 ? [0] : cs.plat.map(p => (p[0] + p[1]) / 2);
      this.boards.forEach((b, i) => { b.visible = i < zs.length; b.position.set(st.x - 4, this.y, zs[i] ?? 0); });
    }
    const best = new Map();
    for (const t of trains) {
      const i = t.routeIndex(st.id), dir = t.direction;
      if (i < 0 || i + dir < 0 || i + dir >= t.stations.length) continue;
      const s = t.etaToStation(i), here = t.currentIndex === i && Math.abs(t.x - st.x) < 1 && t.state !== 'cruising';
      const k = `${t.line.id}${dir}`, v = { line: t.line, dir, term: t.timeline.terminusName, s: here ? -1 : s };
      if (!best.has(k) || v.s < best.get(k).s) best.set(k, v);
    }
    const rows = [...best.values()].sort((a, b) => b.dir - a.dir || a.s - b.s).slice(0, this.rows)
      .map(r => [r.line, r.term, r.s < 0 ? 'sofort' : !Number.isFinite(r.s) ? '—' : r.s < 50 ? '1 min' : `${Math.round(r.s / 60)} min`]);
    const key = rows.map(r => r[0].id + r[1] + r[2]).join('/');
    if (key === this.key) return;
    this.key = key;
    const { ctx } = this;
    ctx.fillStyle = '#0a0c0d'; ctx.fillRect(0, 0, 512, this.canvas.height);
    rows.forEach(([line, term, time], i) => {
      const y = 34 + i * 62;
      ctx.fillStyle = line.color; ctx.fillRect(12, y - 21, 52, 40);
      ctx.fillStyle = line.textColor || '#fff'; ctx.font = '800 28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(line.id, 38, y);
      ctx.fillStyle = '#ffb627'; ctx.font = '600 30px monospace'; ctx.textAlign = 'left'; ctx.fillText(term, 76, y, 300);
      ctx.textAlign = 'right'; ctx.fillText(time, 500, y);
    });
    this.tex.needsUpdate = true;
  }
}
