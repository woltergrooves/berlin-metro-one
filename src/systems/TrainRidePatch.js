import { CONFIG } from '../config.js';
import { TrainTimeline } from './TrainTimeline.js';
import { TrainSystem } from '../world/Train.js';
import { NpcSystem } from './NpcSystem.js';

// Ride polish is deliberately a patch layer: the stable train/timeline core stays untouched.
const oldTimelineUpdate = TrainTimeline.prototype.update;
const oldPaintNextStop = TrainSystem.prototype.paintNextStop;
const oldBoarders = NpcSystem.prototype.boarders;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function finishArrival(timeline, targetIndex) {
  timeline.z = timeline.route[targetIndex].z;
  timeline.currentStationIndex = targetIndex;
  timeline.state = 'opening-arrival';
  timeline.stateTime = 0;
  timeline.instantSpeed = 0;
  timeline.__rideKey = null;
  timeline.setStatus(`${timeline.originName} · trein staat stil · deuren openen`);
}

TrainTimeline.prototype.update = function ridePolishedUpdate(delta, options = {}) {
  // Initial entry into a station: progressive braking instead of constant speed + hard stop.
  if (this.state === 'approaching') {
    const key = `${this.currentStationIndex}|${this.direction}|${this.originStation.z}`;
    if (this.__approachKey !== key) {
      this.__approachKey = key;
      this.__approachFrom = this.z;
      const distance = Math.abs(this.originStation.z - this.z);
      this.__approachDuration = Math.max(2.4, distance / Math.max(1, CONFIG.train.approachSpeed) * 1.08);
      this.stateTime = 0;
    }

    this.stateTime += delta;
    const t = clamp01(this.stateTime / this.__approachDuration);
    // Ease-out: visible braking as the train enters the platform.
    const eased = 1 - Math.pow(1 - t, 2.35);
    const from = this.__approachFrom;
    const to = this.originStation.z;
    this.z = from + (to - from) * eased;
    this.instantSpeed = Math.abs(to - from) * 2.35 * Math.pow(1 - t, 1.35) / this.__approachDuration;

    if (t >= 1) {
      this.z = to;
      this.instantSpeed = 0;
      this.__approachKey = null;
      this.state = 'opening-first';
      this.stateTime = 0;
      this.setStatus(`${this.originName} · trein staat stil · deuren openen`);
    }
    return;
  }

  // Between stations: acceleration -> short cruise -> progressive braking.
  if (this.state === 'cruising' && this.segmentDestinationIndex != null) {
    const key = `${this.segmentOriginIndex}|${this.segmentDestinationIndex}|${this.direction}`;
    const from = this.route[this.segmentOriginIndex].z;
    const to = this.route[this.segmentDestinationIndex].z;
    const distance = Math.abs(to - from);

    if (this.__rideKey !== key) {
      this.__rideKey = key;
      this.stateTime = 0;
      this.__rideAccel = Math.min(1.55, Math.max(1.05, distance / 130));
      this.__rideDuration = Math.max(6.8, distance / Math.max(1, CONFIG.train.cruiseSpeed) + this.__rideAccel);
      this.__rideVmax = distance / Math.max(0.2, this.__rideDuration - this.__rideAccel);
    }

    this.stateTime += delta;
    const total = this.__rideDuration;
    const ramp = this.__rideAccel;
    const time = Math.min(total, this.stateTime);
    const vmax = this.__rideVmax;
    const accel = vmax / ramp;
    let travelled;
    let speed;

    if (time < ramp) {
      travelled = 0.5 * accel * time * time;
      speed = accel * time;
    } else if (time <= total - ramp) {
      travelled = 0.5 * vmax * ramp + vmax * (time - ramp);
      speed = vmax;
    } else {
      const remainingTime = Math.max(0, total - time);
      travelled = distance - 0.5 * accel * remainingTime * remainingTime;
      speed = accel * remainingTime;
    }

    const sign = Math.sign(to - from) || this.direction;
    this.z = from + sign * Math.min(distance, travelled);
    this.instantSpeed = speed;

    if (time >= total || Math.abs(to - this.z) < 0.03) finishArrival(this, this.segmentDestinationIndex);
    return;
  }

  this.instantSpeed = 0;
  return oldTimelineUpdate.call(this, delta, options);
};

// Make the onboard display behave like a passenger information screen.
TrainSystem.prototype.paintNextStop = function polishedNextStop() {
  const { ctx, canvas, texture } = this.stopCanvas;
  if (!ctx || !canvas || !texture) return oldPaintNextStop.call(this);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f4cf22';
  ctx.font = '800 42px -apple-system, BlinkMacSystemFont, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let text;
  if (this.timeline.isTerminal && ['opening-first', 'opening-arrival', 'boarding'].includes(this.state)) {
    text = `${this.originName} · Endstation`;
  } else if (['opening-first', 'opening-arrival', 'boarding'].includes(this.state)) {
    text = `${this.originName} · Richtung ${this.terminusName}`;
  } else {
    text = `Nächster Halt: ${this.destinationName}`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 30);
  texture.needsUpdate = true;
};

// Let exiting passengers clear the doorway before new passengers start boarding.
NpcSystem.prototype.boarders = function orderlyBoarding(train) {
  const gateKey = `${train.id}:${train.currentStationIndex}`;
  this.__boardingTimers ||= new Map();
  if (this.__boardingTimers.has(gateKey)) return;

  const timer = setTimeout(() => {
    this.__boardingTimers.delete(gateKey);
    if (train.doorsOpen && train.timeline?.state === 'boarding') oldBoarders.call(this, train);
  }, 760);
  this.__boardingTimers.set(gateKey, timer);
};

// A fraction more time after the doors close makes departure feel mechanical rather than instant.
CONFIG.train.departDelaySeconds = Math.max(CONFIG.train.departDelaySeconds, 0.9);
