import { PlayerController } from '../core/PlayerController.js';
import { CONFIG } from '../config.js';
import { computeMoveDelta } from '../core/motion.js';

const baseMove = PlayerController.prototype.updateMovement;
const baseUpdate = PlayerController.prototype.update;
const smooth = (t) => t * t * (3 - 2 * t);
const inBox = (x, z, a, b, c, d) => x >= a && x <= b && z >= c && z <= d;
CONFIG.player.speed = Math.max(CONFIG.player.speed, 5.2);

function regionAt(x, z) {
  if (inBox(x, z, 41, 81, 42.4, 55.6)) return { id: 'u8', minX: 41, maxX: 81, minZ: 42.4, maxZ: 55.6 };
  if (inBox(x, z, 23, 42, 44.3, 53.7)) return { id: 'down', minX: 23, maxX: 42, minZ: 44.3, maxZ: 53.7 };
  if (inBox(x, z, 5.8, 25.5, 44, 54)) return { id: 'connector', minX: 5.8, maxX: 25.5, minZ: 44, maxZ: 54 };
  if (inBox(x, z, 0.72, 4.38, 26, 44.2)) return { id: 'up', minX: 0.72, maxX: 4.38, minZ: 26, maxZ: 44.2 };
  if (inBox(x, z, -1.35, 6.45, 28, 67.5)) return { id: 'concourse', minX: -1.35, maxX: 6.45, minZ: 28, maxZ: 67.5 };
  return null;
}

function floorFor(r, x, z) {
  if (!r) return 0;
  if (r.id === 'up') {
    if (z <= 26) return 0;
    if (z >= 43.7) return 4.2;
    return 4.2 * smooth((z - 26) / 17.7);
  }
  if (r.id === 'down') {
    if (x <= 24) return 4.2;
    if (x >= 40.5) return -4;
    return 4.2 - 8.2 * smooth((x - 24) / 16.5);
  }
  if (r.id === 'u8') return -4;
  return 4.2;
}

const u8Train = () => globalThis.__berlinMetroU8Train || null;
function u8DoorOpen(train) {
  const d = train?.userData?.u8;
  return Boolean(d && d.door > 0.82 && (d.state === 'open' || d.state === 'dwell'));
}
function nearDoorX(localX, train) {
  return (train?.userData?.u8?.doors || []).some(({ dx }) => Math.abs(localX - dx) < 1.25);
}

function moveInsideU8(player, delta) {
  const train = u8Train();
  if (!train) {
    player.__u8Active = false;
    globalThis.__berlinMetroU8Passenger = false;
    return;
  }
  const forward = player.input.moveY, strafe = player.input.moveX;
  if (Math.hypot(forward, strafe) < 0.02) return;
  const movement = computeMoveDelta({ yaw: player.yaw, strafe, forward, speed: CONFIG.player.speed, delta });
  let localX = player.position.x + movement.x - train.position.x;
  let localZ = player.position.z + movement.z - train.position.z;
  localX = Math.max(-10.7, Math.min(10.7, localX));
  const canUseDoor = u8DoorOpen(train) && nearDoorX(localX, train);
  localZ = Math.max(-1.25, Math.min(canUseDoor ? 3 : 1.25, localZ));
  if (canUseDoor && localZ > 1.8) {
    player.__u8Active = false;
    globalThis.__berlinMetroU8Passenger = false;
    player.position.x = train.position.x + localX;
    player.position.z = train.position.z + 2.62;
    player.position.y = CONFIG.player.eyeHeight - 4;
    player.__u8LastTrainX = null;
    return;
  }
  player.position.x = train.position.x + localX;
  player.position.z = train.position.z + localZ;
  player.position.y = CONFIG.player.eyeHeight - 4;
}

PlayerController.prototype.update = function u8AwareUpdate(delta) {
  const train = u8Train();
  if (this.__u8Active && train) {
    const previous = this.__u8LastTrainX ?? train.position.x;
    this.position.x += train.position.x - previous;
    this.__u8LastTrainX = train.position.x;
  }
  const result = baseUpdate.call(this, delta);
  const z0 = this.currentStation?.id === 'alexanderplatz' ? this.currentStation.z : 0;
  const region = this.currentStation?.id === 'alexanderplatz' ? regionAt(this.position.x, this.position.z - z0) : null;
  this.__u8Area = this.__u8Active || ['connector', 'down', 'u8'].includes(region?.id);
  if (this.__u8Active && train) this.__u8LastTrainX = train.position.x;
  return result;
};

PlayerController.prototype.updateMovement = function concourseAndU8Movement(delta) {
  if (this.__u8Active) return moveInsideU8(this, delta);
  if (this.activeTrain || this.currentStation?.id !== 'alexanderplatz') return baseMove.call(this, delta);

  const z0 = this.currentStation.z;
  const current = regionAt(this.position.x, this.position.z - z0);
  if (!current) {
    const result = baseMove.call(this, delta);
    if ((this.position.z - z0) < 25.9) this.position.y = CONFIG.player.eyeHeight;
    return result;
  }

  const forward = this.input.moveY, strafe = this.input.moveX;
  if (Math.hypot(forward, strafe) < 0.02) return;
  const movement = computeMoveDelta({ yaw: this.yaw, strafe, forward, speed: CONFIG.player.speed, delta });
  let nx = this.position.x + movement.x;
  let nr = this.position.z + movement.z - z0;

  if (current.id === 'u8' && nr < current.minZ) {
    const train = u8Train();
    if (train && u8DoorOpen(train)) {
      const localX = nx - train.position.x;
      if (nearDoorX(localX, train)) {
        this.__u8Active = true;
        globalThis.__berlinMetroU8Passenger = true;
        this.__u8LastTrainX = train.position.x;
        this.position.x = nx;
        this.position.z = train.position.z + 1.18;
        this.position.y = CONFIG.player.eyeHeight - 4;
        return;
      }
    }
  }

  let next = regionAt(nx, nr);
  if (!next) {
    nx = Math.max(current.minX, Math.min(current.maxX, nx));
    nr = Math.max(current.minZ, Math.min(current.maxZ, nr));
    next = current;
  }
  this.position.x = nx;
  this.position.z = z0 + nr;
  this.position.y = CONFIG.player.eyeHeight + floorFor(next, nx, nr);
};
