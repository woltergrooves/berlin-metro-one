import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { mats } from './materials.js';

const BOX_CACHE = new Map();
const SLEEPER_GEOMETRY = new THREE.BoxGeometry(2.25, 0.08, 0.18);
const SLEEPER_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x453d35 });
const RAIL_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8d9397 });
function geometry(size) {
  const key = size.join('x');
  if (!BOX_CACHE.has(key)) BOX_CACHE.set(key, new THREE.BoxGeometry(...size));
  return BOX_CACHE.get(key);
}

function box(parent, size, position, material) {
  const mesh = new THREE.Mesh(geometry(size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function stationSign(parent, root, name, x, z, rotationY) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3d326';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#151515';
  ctx.font = '900 46px -apple-system, BlinkMacSystemFont, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 320, 56, 600);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 1.28), material);
  sign.position.set(x, 2.3, z);
  sign.rotation.y = rotationY;
  parent.add(sign);
  root.userData.disposables.push(() => { texture.dispose(); material.dispose(); sign.geometry.dispose(); });
}


function createSleepers(parent, x, startZ, endZ, step = 2.25) {
  const count = Math.max(1, Math.floor((endZ - startZ) / step));
  const sleepers = new THREE.InstancedMesh(SLEEPER_GEOMETRY, SLEEPER_MATERIAL, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(x, -0.34, startZ + i * step);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  sleepers.instanceMatrix.needsUpdate = true;
  parent.add(sleepers);
}

function createTrack(parent, x, startZ, endZ) {
  const length = endZ - startZ;
  const centerZ = (startZ + endZ) / 2;
  box(parent, [3.6, 0.20, length], [x, -0.43, centerZ], mats.black);
  box(parent, [0.12, 0.13, length], [x - 0.68, -0.22, centerZ], RAIL_MATERIAL);
  box(parent, [0.12, 0.13, length], [x + 0.68, -0.22, centerZ], RAIL_MATERIAL);
  createSleepers(parent, x, startZ + 1, endZ - 1);
}

function createTunnelHalf(parent, station, neighbor, side) {
  if (!neighbor) return;
  const platformHalf = 34;
  const startZ = side < 0 ? (neighbor.z + station.z) / 2 : station.z + platformHalf;
  const endZ = side < 0 ? station.z - platformHalf : (neighbor.z + station.z) / 2;
  const length = endZ - startZ;
  if (length <= 1) return;
  const centerZ = (startZ + endZ) / 2;

  for (const x of [CONFIG.train.tracks.ruhleben, CONFIG.train.tracks.pankow]) {
    box(parent, [0.25, 4.0, length], [x - 2.05, 1.5, centerZ], mats.darkConcrete);
    box(parent, [0.25, 4.0, length], [x + 2.05, 1.5, centerZ], mats.darkConcrete);
    box(parent, [4.4, 0.25, length], [x, 3.9, centerZ], mats.darkConcrete);
    createTrack(parent, x, startZ, endZ);
  }

  for (let z = startZ + 7; z < endZ - 4; z += 20) {
    box(parent, [0.7, 0.05, 1.8], [2.6, 3.75, z], mats.lightPanel);
  }
}

export function createStationChunk(scene, { station, prevStation = null, nextStation = null }) {
  const group = new THREE.Group();
  group.userData.disposables = [];
  scene.add(group);

  const z = station.z;
  const platformLength = 68;
  box(group, [9.4, 0.45, platformLength], [2.55, -0.22, z], mats.concrete);
  box(group, [0.28, 4.4, platformLength], [-6.25, 2.0, z], mats.darkConcrete);
  box(group, [0.28, 4.4, platformLength], [11.75, 2.0, z], mats.darkConcrete);
  box(group, [0.35, 0.08, platformLength], [-1.72, 0.06, z], mats.yellow);
  box(group, [0.35, 0.08, platformLength], [6.82, 0.06, z], mats.yellow);
  box(group, [18.0, 0.35, platformLength], [2.75, 4.2, z], mats.darkConcrete);

  createTrack(group, CONFIG.train.tracks.ruhleben, z - 34, z + 34);
  createTrack(group, CONFIG.train.tracks.pankow, z - 34, z + 34);

  for (let localZ = -27; localZ <= 27; localZ += 9) {
    box(group, [0.48, 4.0, 0.48], [2.55, 1.95, z + localZ], mats.darkConcrete);
    box(group, [3.0, 0.12, 0.38], [2.55, 3.0, z + localZ], mats.yellow);
  }

  for (let localZ = -28; localZ <= 28; localZ += 8) {
    box(group, [3.5, 0.05, 0.22], [0.1, 3.78, z + localZ], mats.lightPanel);
    box(group, [3.5, 0.05, 0.22], [5.0, 3.78, z + localZ], mats.lightPanel);
  }

  stationSign(group, group, station.name, 11.52, z - 18, -Math.PI / 2);
  stationSign(group, group, station.name, -6.02, z + 18, Math.PI / 2);

  createTunnelHalf(group, station, prevStation, -1);
  createTunnelHalf(group, station, nextStation, 1);

  return group;
}

export function disposeStationChunk(group) {
  for (const dispose of group.userData?.disposables || []) dispose();
  group.parent?.remove(group);
}
