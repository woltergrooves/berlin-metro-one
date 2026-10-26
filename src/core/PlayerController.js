import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { computeLook, computeMoveDelta } from './motion.js';

export class PlayerController {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.position = new THREE.Vector3(2.2, CONFIG.player.eyeHeight, 8);
    this.yaw = 0;
    this.pitch = 0;
    this.trains = [];
    this.route = [];
    this.activeTrain = null;
    this.lastTrainPositions = new Map();
  }

  get inTrain() { return Boolean(this.activeTrain); }
  get train() { return this.activeTrain; }

  attachRoute(stations) {
    this.route = stations;
  }

  attachTrains(trainSystems) {
    this.trains = trainSystems;
    this.lastTrainPositions.clear();
    trainSystems.forEach((train) => this.lastTrainPositions.set(train.id, train.group.position.z));
  }

  nearestStationIndex(z = this.position.z) {
    if (!this.route.length) return 0;
    const raw = Math.round((z - this.route[0].z) / CONFIG.train.stationSpacing);
    return Math.max(0, Math.min(this.route.length - 1, raw));
  }

  get currentStation() {
    return this.route[this.nearestStationIndex()] || null;
  }

  update(delta) {
    this.applyTrainMotion();
    this.updateView();
    this.updateMovement(delta);
    this.updateBoardingState();
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  applyTrainMotion() {
    for (const train of this.trains) {
      const currentZ = train.group.position.z;
      const previousZ = this.lastTrainPositions.get(train.id) ?? currentZ;
      if (this.activeTrain === train) this.position.z += currentZ - previousZ;
      this.lastTrainPositions.set(train.id, currentZ);
    }
  }

  updateView() {
    const look = this.input.consumeLook();
    const next = computeLook({
      yaw: this.yaw,
      pitch: this.pitch,
      lookX: look.x,
      lookY: look.y,
      sensitivity: CONFIG.player.lookSensitivity,
      maxPitch: CONFIG.player.maxPitch,
    });
    this.yaw = next.yaw;
    this.pitch = next.pitch;
  }

  updateMovement(delta) {
    const forward = this.input.moveY;
    const strafe = this.input.moveX;
    if (Math.hypot(forward, strafe) < 0.02) return;

    const movement = computeMoveDelta({
      yaw: this.yaw,
      strafe,
      forward,
      speed: CONFIG.player.speed,
      delta,
    });
    const nextX = this.position.x + movement.x;
    const nextZ = this.position.z + movement.z;

    if (this.activeTrain) {
      const train = this.activeTrain;
      const relativeZ = nextZ - train.group.position.z;
      const localNextX = nextX - train.trackX;
      const canUseDoor = train.doorsOpen && train.isDoorCorridor(nextZ);

      let minLocalX = -1.4;
      let maxLocalX = 1.4;
      if (canUseDoor && train.doorSide > 0) maxLocalX = 11.3;
      if (canUseDoor && train.doorSide < 0) minLocalX = -11.3;

      const clampedLocalX = Math.max(minLocalX, Math.min(maxLocalX, localNextX));
      this.position.x = train.trackX + clampedLocalX;
      this.position.z = train.group.position.z + Math.max(-11.2, Math.min(11.2, relativeZ));
      if (canUseDoor && clampedLocalX * train.doorSide > 2.0) this.activeTrain = null;
      return;
    }

    if (!this.route.length) return;
    const stationIndex = this.nearestStationIndex(nextZ);
    const station = this.route[stationIndex];
    const relZ = nextZ - station.z;
    if (Math.abs(relZ) > 35.5) return;

    let minX = -1.85;
    let maxX = 7.2;
    for (const train of this.trains) {
      const atOpenDoor = train.doorsOpen && train.state === 'boarding' && train.isAtStation(station.z) && train.isDoorCorridor(nextZ);
      if (!atOpenDoor) continue;
      if (train.doorSide > 0) minX = Math.min(minX, train.trackX - 1.4);
      if (train.doorSide < 0) maxX = Math.max(maxX, train.trackX + 1.4);
    }

    this.position.x = Math.max(minX, Math.min(maxX, nextX));
    this.position.z = station.z + Math.max(-34, Math.min(34, relZ));
  }

  updateBoardingState() {
    if (this.activeTrain) {
      const train = this.activeTrain;
      const relZ = this.position.z - train.group.position.z;
      const localX = this.position.x - train.trackX;
      if (train.doorsOpen && (localX * train.doorSide) > 1.65 && Math.abs(relZ) < 11.7) this.activeTrain = null;
      return;
    }

    for (const train of this.trains) {
      if (!train.doorsOpen || train.state !== 'boarding') continue;
      const relZ = this.position.z - train.group.position.z;
      const localX = this.position.x - train.trackX;
      const insideBounds = Math.abs(localX) < 1.65 && Math.abs(relZ) < 11.7;
      if (insideBounds) {
        this.activeTrain = train;
        return;
      }
    }
  }
}
