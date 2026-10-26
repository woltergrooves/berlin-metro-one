import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createStationChunk, disposeStationChunk } from './Station.js';
import { createPlatformGameplay } from './GameplayObjects.js';
import { DepartureBoard } from './DepartureBoard.js';

export class WorldStreamer {
  constructor(scene, stations, trains, {
    radius = CONFIG.render.stationStreamRadius,
    collectedIds = new Set(),
    onLoadGameplay = null,
    onUnloadGameplay = null,
  } = {}) {
    this.scene = scene;
    this.stations = stations;
    this.trains = trains;
    this.radius = radius;
    this.collectedIds = collectedIds;
    this.onLoadGameplay = onLoadGameplay;
    this.onUnloadGameplay = onUnloadGameplay;
    this.chunks = new Map();
    this.anchorIndex = -1;
  }

  nearestIndex(z) {
    const spacing = CONFIG.train.stationSpacing;
    const raw = Math.round((z - this.stations[0].z) / spacing);
    return Math.max(0, Math.min(this.stations.length - 1, raw));
  }

  load(index) {
    if (this.chunks.has(index)) return;
    const station = this.stations[index];
    const prevStation = this.stations[index - 1] || null;
    const nextStation = this.stations[index + 1] || null;
    const structure = createStationChunk(this.scene, { station, prevStation, nextStation });

    const gameplayRoot = new THREE.Group();
    gameplayRoot.position.z = station.z;
    structure.add(gameplayRoot);
    const gameplay = createPlatformGameplay(gameplayRoot, station, this.collectedIds);

    const boards = [];
    const ruhlebenTrain = this.trains.find((train) => train.direction > 0);
    const pankowTrain = this.trains.find((train) => train.direction < 0);
    if (index < this.stations.length - 1 && ruhlebenTrain) {
      boards.push(new DepartureBoard(structure, {
        x: 0.25,
        z: station.z - 11,
        facing: 1,
        station,
        train: ruhlebenTrain,
      }));
    }
    if (index > 0 && pankowTrain) {
      boards.push(new DepartureBoard(structure, {
        x: 5.25,
        z: station.z + 11,
        facing: -1,
        station,
        train: pankowTrain,
      }));
    }

    const chunk = { station, structure, gameplay, boards };
    this.chunks.set(index, chunk);
    this.onLoadGameplay?.(chunk);
  }

  unload(index) {
    const chunk = this.chunks.get(index);
    if (!chunk) return;
    this.onUnloadGameplay?.(chunk);
    chunk.boards.forEach((board) => board.dispose());
    disposeStationChunk(chunk.structure);
    this.chunks.delete(index);
  }

  update(anchorZ) {
    const nextAnchor = this.nearestIndex(anchorZ);
    this.anchorIndex = nextAnchor;
    const wanted = new Set();
    for (let offset = -this.radius; offset <= this.radius; offset += 1) {
      const index = nextAnchor + offset;
      if (index >= 0 && index < this.stations.length) wanted.add(index);
    }

    for (const index of wanted) this.load(index);
    for (const index of [...this.chunks.keys()]) {
      if (!wanted.has(index)) this.unload(index);
    }
    for (const chunk of this.chunks.values()) chunk.boards.forEach((board) => board.update());
    return nextAnchor;
  }
}
