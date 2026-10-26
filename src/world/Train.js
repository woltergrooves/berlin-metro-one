import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { TrainTimeline } from '../systems/TrainTimeline.js';
import { mats } from './materials.js';

const BODY = new THREE.MeshLambertMaterial({ color: 0xd7d2c7 });
const TRIM = new THREE.MeshLambertMaterial({ color: 0x313438 });
const DOOR = new THREE.MeshLambertMaterial({ color: 0xe6c51d });
const TRAIN_GEO = new Map();

function geometry(size) {
  const key = size.join('x');
  if (!TRAIN_GEO.has(key)) TRAIN_GEO.set(key, new THREE.BoxGeometry(...size));
  return TRAIN_GEO.get(key);
}

function box(parent, size, position, material) {
  const mesh = new THREE.Mesh(geometry(size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function createCanvasTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

export class TrainSystem {
  constructor(scene, spec, onStatus = null) {
    this.scene = scene;
    this.spec = spec;
    this.id = spec.id;
    this.line = spec.line;
    this.trackX = spec.trackX;
    this.doorSide = spec.doorSide;
    this.onStatus = onStatus;

    this.group = new THREE.Group();
    this.group.position.set(this.trackX, 0, 0);
    scene.add(this.group);

    this.doorMeshes = [];
    this.routeCanvas = createCanvasTexture(1024, 260);
    this.stopCanvas = createCanvasTexture(720, 160);
    this.lastDisplayKey = '';

    this.timeline = new TrainTimeline(spec, (text) => this.setStatus(text));
    this.group.position.z = this.timeline.z;
    this.buildTrain();
    this.updateDisplays(true);
  }

  get state() { return this.timeline.state; }
  get doorsOpen() { return this.timeline.doorsOpen; }
  get routeProgress() { return this.timeline.routeProgress; }
  get originName() { return this.timeline.originName; }
  get destinationName() { return this.timeline.destinationName; }
  get terminusName() { return this.timeline.terminusName; }
  get currentStationIndex() { return this.timeline.currentStationIndex; }
  get direction() { return this.timeline.direction; }

  buildTrain() {
    box(this.group, [3.35, 0.22, 24], [0, 0.08, 0], TRIM);
    box(this.group, [3.35, 0.2, 24], [0, 3.08, 0], BODY);

    for (const side of [-1, 1]) {
      const x = side * 1.67;
      box(this.group, [0.16, 0.6, 24], [x, 0.38, 0], BODY);
      box(this.group, [0.16, 0.72, 24], [x, 2.73, 0], BODY);
      for (const z of [-11.85, -8.8, -5.2, -1.8, 1.8, 5.2, 8.8, 11.85]) {
        box(this.group, [0.18, 2.35, 0.20], [x, 1.55, z], BODY);
      }
      for (const z of [-10.2, -6.9, -0.1, 6.9, 10.2]) {
        box(this.group, [0.09, 1.22, 1.5], [side * 1.675, 1.72, z], mats.glass);
      }
    }

    const doorX = this.doorSide * 1.78;
    for (const doorZ of [-8, -2.7, 2.7, 8]) {
      box(this.group, [0.21, 2.5, 0.16], [this.doorSide * 1.65, 1.48, doorZ - 1.53], TRIM);
      box(this.group, [0.21, 2.5, 0.16], [this.doorSide * 1.65, 1.48, doorZ + 1.53], TRIM);
      const left = box(this.group, [0.13, 2.32, 1.32], [doorX, 1.45, doorZ - 0.72], DOOR);
      const right = box(this.group, [0.13, 2.32, 1.32], [doorX, 1.45, doorZ + 0.72], DOOR);
      box(left, [0.04, 0.88, 0.72], [this.doorSide * 0.08, 0.32, 0], mats.glass);
      box(right, [0.04, 0.88, 0.72], [this.doorSide * 0.08, 0.32, 0], mats.glass);
      this.doorMeshes.push({ left, right, doorZ });
    }

    for (const z of [-9, -5, -1, 3, 7]) {
      box(this.group, [0.72, 0.35, 1.7], [-1.1, 0.55, z], mats.seat);
      box(this.group, [0.72, 0.35, 1.7], [1.1, 0.55, z], mats.seat);
    }
    for (const z of [-8, -2.5, 3, 8]) box(this.group, [0.06, 2.35, 0.06], [0, 1.7, z], mats.metal);

    box(this.group, [3.3, 3.0, 0.18], [0, 1.55, -12], BODY);
    box(this.group, [3.3, 3.0, 0.18], [0, 1.55, 12], BODY);

    const routeMaterial = new THREE.MeshBasicMaterial({ map: this.routeCanvas.texture, side: THREE.DoubleSide });
    this.routeBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.55), routeMaterial);
    this.routeBoard.position.set(-this.doorSide * 1.575, 2.28, 1.0);
    this.routeBoard.rotation.y = this.doorSide > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.group.add(this.routeBoard);

    const stopMaterial = new THREE.MeshBasicMaterial({ map: this.stopCanvas.texture, side: THREE.DoubleSide });
    this.nextStopBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.64), stopMaterial);
    this.nextStopBoard.position.set(0, 2.45, this.direction > 0 ? -11.86 : 11.86);
    if (this.direction < 0) this.nextStopBoard.rotation.y = Math.PI;
    this.group.add(this.nextStopBoard);
  }

  paintRouteBoard() {
    const { ctx, canvas, texture } = this.routeCanvas;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f5f1e7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#161616';
    ctx.font = '800 38px -apple-system, BlinkMacSystemFont, Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${this.line}  Richtung ${this.terminusName}`, 38, 52);

    const route = this.spec.stations;
    const center = this.currentStationIndex;
    const indices = [];
    for (let offset = -2; offset <= 4; offset += 1) {
      const index = center + offset * this.direction;
      if (index >= 0 && index < route.length) indices.push(index);
    }
    if (indices.length < 2) indices.push(Math.max(0, Math.min(route.length - 1, center + this.direction)));

    const xs = indices.map((_, i) => 85 + i * ((w - 170) / Math.max(1, indices.length - 1)));
    const y = 132;
    ctx.strokeStyle = '#f2c900';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(xs[0], y);
    ctx.lineTo(xs.at(-1), y);
    ctx.stroke();

    indices.forEach((index, i) => {
      const active = index === this.timeline.destinationIndex;
      ctx.beginPath();
      ctx.arc(xs[i], y, active ? 17 : 13, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#f2c900' : '#fff';
      ctx.fill();
      ctx.strokeStyle = '#181818';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = '#151515';
      ctx.font = active ? '800 18px -apple-system, Arial' : '650 16px -apple-system, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(route[index].name, xs[i], 205, 140);
    });
    texture.needsUpdate = true;
  }

  paintNextStop() {
    const { ctx, canvas, texture } = this.stopCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f4cf22';
    ctx.font = '800 43px -apple-system, BlinkMacSystemFont, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = this.timeline.isTerminal
      ? `${this.originName} · Endstation`
      : `Nächster Halt: ${this.destinationName}`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 30);
    texture.needsUpdate = true;
  }

  updateDisplays(force = false) {
    const key = `${this.currentStationIndex}|${this.timeline.destinationIndex}|${this.state}`;
    if (!force && key === this.lastDisplayKey) return;
    this.lastDisplayKey = key;
    this.paintRouteBoard();
    this.paintNextStop();
  }

  setStatus(text) {
    if (this.timeline) this.updateDisplays();
    if (this.onStatus) this.onStatus(this, text);
  }

  etaToStation(stationIndex) {
    return this.timeline.etaToStation(stationIndex);
  }

  isAtStation(stationZ) {
    return Math.abs(this.timeline.z - stationZ) < 0.7;
  }

  isDoorCorridor(worldZ) {
    const relZ = worldZ - this.group.position.z;
    return this.doorMeshes.some((door) => Math.abs(relZ - door.doorZ) < 1.15);
  }

  setDoors(open) {
    for (const { left, right, doorZ } of this.doorMeshes) {
      const offset = open ? 1.05 : 0;
      left.position.z = doorZ - 0.72 - offset;
      right.position.z = doorZ + 0.72 + offset;
    }
  }

  recenterNear(stationIndex, delaySeconds) {
    const changed = this.timeline.recenterNear(stationIndex, delaySeconds);
    if (changed) {
      this.group.position.z = this.timeline.z;
      this.setDoors(false);
      this.updateDisplays(true);
    }
    return changed;
  }

  setVisibleNear(anchorZ, forceVisible = false) {
    this.group.visible = forceVisible || Math.abs(this.group.position.z - anchorZ) < CONFIG.train.stationSpacing * 2.4;
  }

  update(delta, { allowRecycle = true } = {}) {
    const wasOpen = this.timeline.doorsOpen;
    const previousIndex = this.timeline.currentStationIndex;
    this.timeline.update(delta, { allowRecycle });
    this.group.position.z = this.timeline.z;
    if (wasOpen !== this.timeline.doorsOpen) this.setDoors(this.timeline.doorsOpen);
    if (previousIndex !== this.timeline.currentStationIndex) this.updateDisplays(true);
  }
}
