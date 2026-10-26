import * as THREE from 'three';

export class InteractionSystem {
  constructor(camera, { maxDistance = 2.8, onFocus = null } = {}) {
    this.camera = camera;
    this.maxDistance = maxDistance;
    this.onFocus = onFocus;
    this.targets = [];
    this.focused = null;
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
  }

  add(target) {
    if (!this.targets.includes(target)) this.targets.push(target);
  }

  remove(target) {
    this.targets = this.targets.filter((item) => item !== target);
    if (this.focused === target) this.setFocused(null);
  }

  findRoot(object) {
    let current = object;
    while (current) {
      if (current.userData?.interaction) return current;
      current = current.parent;
    }
    return null;
  }

  update() {
    this.raycaster.setFromCamera(this.center, this.camera);
    this.raycaster.far = this.maxDistance;
    const hits = this.raycaster.intersectObjects(this.targets, true);
    const next = hits.length ? this.findRoot(hits[0].object) : null;
    this.setFocused(next);
  }

  setFocused(target) {
    if (target === this.focused) return;
    this.focused = target;
    if (this.onFocus) this.onFocus(target?.userData?.interaction || null);
  }

  interact() {
    const interaction = this.focused?.userData?.interaction;
    if (!interaction?.action) return false;
    interaction.action(this.focused);
    return true;
  }
}
