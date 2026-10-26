import * as THREE from 'three';
import { WorldStreamer } from './WorldStreamer.js';

const baseLoad = WorldStreamer.prototype.load;
const GEO = new Map();
const MAT = new Map();
const geo = (s) => { const k = s.join('x'); if (!GEO.has(k)) GEO.set(k, new THREE.BoxGeometry(...s)); return GEO.get(k); };
const mat = (c) => { const k = String(c); if (!MAT.has(k)) MAT.set(k, new THREE.MeshLambertMaterial({ color: c })); return MAT.get(k); };
const box = (parent, size, pos, material) => { const m = new THREE.Mesh(geo(size), material); m.position.set(...pos); parent.add(m); return m; };
const FLOOR = mat(0x5b5d5e), WALL = mat(0xd7d3ca), DARK = mat(0x232527), METAL = mat(0x8a8f91);
const INNER = mat(0xc9c8c2), SEAT = mat(0x7b3f36), POLE = mat(0x9da3a4);

function hideOldTransition(root, station) {
  const z0 = station.z;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry?.parameters;
    if (!p) return;
    const rz = o.position.z - z0;
    if (Math.abs(p.depth - 1.03) < 0.03 && rz > 9.8 && rz < 28.2 && ((Math.abs(p.width - 3.1) < 0.04 && Math.abs(o.position.x - 2.55) < 0.06) || (Math.abs(p.width - 0.09) < 0.03 && (Math.abs(o.position.x - 0.95) < 0.06 || Math.abs(o.position.x - 4.15) < 0.06)))) o.visible = false;
    const oldRoof = Math.abs(p.height - 0.35) < 0.03 && ((Math.abs(p.width - 18) < 0.05 && Math.abs(p.depth - 44) < 0.08 && Math.abs(rz + 12) < 0.08) || (Math.abs(p.width - 18) < 0.05 && Math.abs(p.depth - 4) < 0.08 && Math.abs(rz - 32) < 0.08) || (Math.abs(p.width - 6.45) < 0.05 && Math.abs(p.depth - 20) < 0.08 && Math.abs(rz - 20) < 0.08) || (Math.abs(p.width - 6.75) < 0.05 && Math.abs(p.depth - 20) < 0.08 && Math.abs(rz - 20) < 0.08));
    if (oldRoof) o.visible = false;
    if (Math.abs(p.width - 8.2) < 0.05 && Math.abs(p.height - 0.32) < 0.03 && Math.abs(p.depth - 33) < 0.06 && Math.abs(rz - 44.5) < 0.08) o.visible = false;
    if (Math.abs(p.width - 0.22) < 0.03 && Math.abs(p.height - 3.8) < 0.04 && Math.abs(p.depth - 33) < 0.06 && Math.abs(o.position.x - 6.65) < 0.08) o.visible = false;
    const center = Math.abs(o.position.x - 2.55) < 0.08;
    const pillar = Math.abs(p.width - 0.68) < 0.03 && Math.abs(p.height - 3.58) < 0.04 && Math.abs(p.depth - 0.68) < 0.03;
    const cap = Math.abs(p.width - 1.12) < 0.04 && Math.abs(p.height - 0.18) < 0.03 && Math.abs(p.depth - 0.84) < 0.04;
    const beam = Math.abs(p.width - 8) < 0.05 && Math.abs(p.height - 0.16) < 0.03 && Math.abs(p.depth - 0.42) < 0.04;
    if ((center && (pillar || cap) && rz > 23 && rz < 46) || (beam && rz > 23 && rz < 46)) o.visible = false;
  });
}

function addCorrectedTransition(root, station) {
  if (root.userData.__transitionFixV4) return;
  root.userData.__transitionFixV4 = true;
  const z = station.z;
  hideOldTransition(root, station);
  box(root, [18, 0.35, 60], [2.75, 4.2, z - 4], DARK);
  box(root, [6.45, 0.35, 8], [-3.025, 4.2, z + 30], DARK);
  box(root, [6.75, 0.35, 8], [8.375, 4.2, z + 30], DARK);
  for (let i = 0; i < 18; i++) {
    const h = 4.2 * (i + 1) / 18;
    const zz = z + 26 + i + 0.5;
    box(root, [3.1, h, 1.03], [2.55, h / 2, zz], FLOOR);
    box(root, [0.09, 1, 1.03], [0.95, h + 0.5, zz], METAL);
    box(root, [0.09, 1, 1.03], [4.15, h + 0.5, zz], METAL);
  }
  box(root, [2.5, 0.32, 16], [-0.3, 4.2, z + 36], FLOOR);
  box(root, [2.5, 0.32, 16], [5.4, 4.2, z + 36], FLOOR);
  box(root, [8.2, 0.32, 17], [2.55, 4.2, z + 52.5], FLOOR);
  box(root, [0.22, 3.8, 16.6], [6.65, 6.05, z + 36.3], WALL);
  box(root, [0.22, 3.8, 7.5], [6.65, 6.05, z + 57.25], WALL);
  const train = root.userData.u8Train;
  if (train && !train.userData.__interiorV1) {
    train.userData.__interiorV1 = true;
    box(train, [22.4, 0.08, 2.75], [0, 0.29, 0], INNER);
    box(train, [22.4, 0.08, 2.75], [0, 2.88, 0], INNER);
    for (let x = -9; x <= 9; x += 4.5) {
      box(train, [2.35, 0.34, 0.48], [x, 0.55, -1.12], SEAT);
      box(train, [2.35, 0.34, 0.48], [x, 0.55, 1.12], SEAT);
    }
    for (let x = -8; x <= 8; x += 4) box(train, [0.07, 2.3, 0.07], [x, 1.48, 0], POLE);
  }
}

WorldStreamer.prototype.load = function transitionFixLoad(index) {
  const existed = this.chunks.has(index);
  const result = baseLoad.call(this, index);
  if (existed) return result;
  const chunk = this.chunks.get(index);
  if (chunk?.station?.id === 'alexanderplatz') addCorrectedTransition(chunk.structure, chunk.station);
  return result;
};
