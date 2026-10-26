import { CONFIG } from '../config.js';

const OPEN = () => CONFIG.train.openDelaySeconds;
const DWELL = () => CONFIG.train.doorOpenSeconds;
const DEPART = () => CONFIG.train.departDelaySeconds;
const RIDE = () => CONFIG.train.estimatedRideSeconds;

export class TrainTimeline {
  constructor(spec, onStatus = null) {
    this.spec = spec;
    this.route = spec.stations;
    this.direction = spec.direction;
    this.onStatus = onStatus;
    this.initialDelay = Math.max(0, spec.initialDelaySeconds || 0);
    this.resetToApproachAt(spec.startStationIndex, this.initialDelay);
    this.setStatus(this.initialDelay > 0
      ? `${spec.line} richting ${this.terminusName} volgt`
      : `${spec.line} richting ${this.terminusName} nadert ${this.originName}`);
  }

  get line() { return this.spec.line; }
  get terminusName() { return this.direction > 0 ? this.route.at(-1).name : this.route[0].name; }
  get originStation() { return this.route[this.currentStationIndex]; }
  get originName() { return this.originStation.name; }
  get destinationIndex() {
    const next = this.currentStationIndex + this.direction;
    return next >= 0 && next < this.route.length ? next : null;
  }
  get destinationStation() { return this.destinationIndex == null ? null : this.route[this.destinationIndex]; }
  get destinationName() { return this.destinationStation?.name || this.terminusName; }
  get isTerminal() { return this.destinationIndex == null; }

  resetToApproachAt(stationIndex, delaySeconds = 0) {
    this.currentStationIndex = Math.max(0, Math.min(this.route.length - 1, stationIndex));
    this.segmentOriginIndex = this.currentStationIndex;
    this.segmentDestinationIndex = this.destinationIndex;
    this.state = delaySeconds > 0 ? 'waiting-to-approach' : 'approaching';
    this.stateTime = 0;
    this.waitSeconds = Math.max(0, delaySeconds);
    this.z = this.originStation.z - this.direction * CONFIG.train.approachDistance;
    this.doorsOpen = false;
  }

  recenterNear(stationIndex, delaySeconds = CONFIG.train.localLoopDelaySeconds) {
    const index = Math.max(0, Math.min(this.route.length - 1, stationIndex));
    const hasDeparture = index + this.direction >= 0 && index + this.direction < this.route.length;
    if (!hasDeparture) return false;
    this.resetToApproachAt(index, delaySeconds);
    this.setStatus(`${this.line} richting ${this.terminusName} volgt`);
    return true;
  }

  setStatus(text) {
    this.status = text;
    if (this.onStatus) this.onStatus(text);
  }

  moveToward(targetZ, speed, delta) {
    const diff = targetZ - this.z;
    if (Math.abs(diff) <= 0.04) return true;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * delta);
    this.z += step;
    return Math.abs(targetZ - this.z) <= 0.04;
  }

  get routeProgress() {
    if (this.state === 'cruising' && this.segmentDestinationIndex != null) {
      const from = this.route[this.segmentOriginIndex].z;
      const to = this.route[this.segmentDestinationIndex].z;
      const length = to - from;
      if (Math.abs(length) < 0.001) return 1;
      return Math.max(0, Math.min(1, (this.z - from) / length));
    }
    if (this.state === 'opening-arrival') return 1;
    return 0;
  }

  get approachSeconds() {
    return CONFIG.train.approachDistance / CONFIG.train.approachSpeed;
  }

  get secondsUntilCurrentArrival() {
    if (this.state === 'waiting-to-approach') {
      return Math.max(0, this.waitSeconds - this.stateTime) + this.approachSeconds;
    }
    if (this.state === 'approaching') {
      return Math.abs(this.originStation.z - this.z) / CONFIG.train.approachSpeed;
    }
    return 0;
  }

  timeUntilDepartureFromCurrent() {
    if (this.state === 'waiting-to-approach' || this.state === 'approaching') {
      return this.secondsUntilCurrentArrival + OPEN() + DWELL() + DEPART();
    }
    if (this.state === 'opening-first' || this.state === 'opening-arrival') {
      return Math.max(0, OPEN() - this.stateTime) + DWELL() + DEPART();
    }
    if (this.state === 'boarding') {
      const dwell = this.isTerminal ? CONFIG.train.terminalDwellSeconds : DWELL();
      return Math.max(0, dwell - this.stateTime) + (this.isTerminal ? 0 : DEPART());
    }
    if (this.state === 'depart-delay') return Math.max(0, DEPART() - this.stateTime);
    return 0;
  }

  etaToStation(targetIndex) {
    if (targetIndex < 0 || targetIndex >= this.route.length) return Infinity;

    // Train is currently travelling between two stations.
    if (this.state === 'cruising' && this.segmentDestinationIndex != null) {
      const nextIndex = this.segmentDestinationIndex;
      let t = Math.max(0.3, (1 - this.routeProgress) * RIDE());
      if (targetIndex === nextIndex) return t;
      let idx = nextIndex;
      let guard = 0;
      while (guard++ < this.route.length + 2) {
        if (idx === (this.direction > 0 ? this.route.length - 1 : 0)) {
          t += OPEN() + CONFIG.train.terminalDwellSeconds + CONFIG.train.recycleDelaySeconds + this.approachSeconds;
          idx = this.direction > 0 ? 0 : this.route.length - 1;
          if (targetIndex === idx) return t;
        }
        const next = idx + this.direction;
        if (next < 0 || next >= this.route.length) break;
        t += OPEN() + DWELL() + DEPART() + RIDE();
        idx = next;
        if (targetIndex === idx) return t;
      }
      return Infinity;
    }

    // Approaching or standing at the current station.
    const current = this.currentStationIndex;
    const arrivalCurrent = this.secondsUntilCurrentArrival;
    if (targetIndex === current) return arrivalCurrent;

    let t = this.timeUntilDepartureFromCurrent();
    let idx = current;
    let guard = 0;
    while (guard++ < this.route.length + 2) {
      if (idx === (this.direction > 0 ? this.route.length - 1 : 0)) {
        t += CONFIG.train.recycleDelaySeconds + this.approachSeconds;
        idx = this.direction > 0 ? 0 : this.route.length - 1;
        if (targetIndex === idx) return t;
        t += OPEN() + DWELL() + DEPART();
      }
      const next = idx + this.direction;
      if (next < 0 || next >= this.route.length) continue;
      t += RIDE();
      idx = next;
      if (targetIndex === idx) return t;
      t += OPEN() + DWELL() + DEPART();
    }
    return Infinity;
  }

  stopsUntilStation(targetIndex) {
    const n = this.route.length;
    if (this.direction > 0) return (targetIndex - this.currentStationIndex + n) % n;
    return (this.currentStationIndex - targetIndex + n) % n;
  }

  update(delta, { allowRecycle = true } = {}) {
    this.stateTime += delta;

    if (this.state === 'waiting-to-approach') {
      if (this.stateTime >= this.waitSeconds) {
        this.state = 'approaching';
        this.stateTime = 0;
        this.setStatus(`${this.line} richting ${this.terminusName} nadert ${this.originName}`);
      }
      return;
    }

    if (this.state === 'approaching') {
      if (this.moveToward(this.originStation.z, CONFIG.train.approachSpeed, delta)) {
        this.z = this.originStation.z;
        this.state = 'opening-first';
        this.stateTime = 0;
        this.setStatus(`${this.originName} · deuren openen`);
      }
      return;
    }

    if ((this.state === 'opening-first' || this.state === 'opening-arrival') && this.stateTime >= OPEN()) {
      this.doorsOpen = true;
      this.state = 'boarding';
      this.stateTime = 0;
      this.setStatus(`${this.originName} · ${this.line} richting ${this.terminusName}`);
      return;
    }

    if (this.state === 'boarding') {
      if (this.isTerminal) {
        if (!allowRecycle) {
          this.stateTime = Math.min(this.stateTime, CONFIG.train.terminalDwellSeconds);
          return;
        }
        if (this.stateTime >= CONFIG.train.terminalDwellSeconds) {
          this.doorsOpen = false;
          this.state = 'recycling';
          this.stateTime = 0;
          this.setStatus(`Volgende ${this.line} richting ${this.terminusName} volgt`);
        }
        return;
      }

      if (this.stateTime >= DWELL()) {
        this.doorsOpen = false;
        this.state = 'depart-delay';
        this.stateTime = 0;
        this.segmentOriginIndex = this.currentStationIndex;
        this.segmentDestinationIndex = this.destinationIndex;
        this.setStatus(`Deuren dicht · volgende: ${this.destinationName}`);
      }
      return;
    }

    if (this.state === 'depart-delay' && this.stateTime >= DEPART()) {
      this.state = 'cruising';
      this.stateTime = 0;
      this.setStatus(`${this.line} → ${this.destinationName}`);
      return;
    }

    if (this.state === 'cruising') {
      const targetIndex = this.segmentDestinationIndex;
      const targetZ = this.route[targetIndex].z;
      const remaining = Math.abs(targetZ - this.z);
      const brakingDistance = 22;
      const speedFactor = Math.max(0.22, Math.min(1, remaining / brakingDistance));
      if (this.moveToward(targetZ, CONFIG.train.cruiseSpeed * speedFactor, delta)) {
        this.z = targetZ;
        this.currentStationIndex = targetIndex;
        this.state = 'opening-arrival';
        this.stateTime = 0;
        this.setStatus(`${this.originName} · deuren openen`);
      }
      return;
    }

    if (this.state === 'recycling' && this.stateTime >= CONFIG.train.recycleDelaySeconds) {
      const startIndex = this.direction > 0 ? 0 : this.route.length - 1;
      this.resetToApproachAt(startIndex, 0);
      this.setStatus(`${this.line} richting ${this.terminusName} nadert ${this.originName}`);
    }
  }
}
