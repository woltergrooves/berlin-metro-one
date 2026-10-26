import * as THREE from 'three';

function box(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function formatEta(seconds) {
  if (!Number.isFinite(seconds)) return '--';
  if (seconds <= 0.9) return 'JETZT';
  const whole = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(whole / 60);
  const secs = String(whole % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export class DepartureBoard {
  constructor(parent, { x, y = 3.0, z, facing = 1, station, train }) {
    this.train = train;
    this.station = station;
    this.lastKey = '';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 260;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;

    this.frameMaterial = new THREE.MeshLambertMaterial({ color: 0x111315 });
    this.displayMaterial = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });

    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    parent.add(this.group);

    box(this.group, [4.9, 1.48, 0.16], [0, 0, 0], this.frameMaterial);
    this.display = new THREE.Mesh(new THREE.PlaneGeometry(4.58, 1.18), this.displayMaterial);
    this.display.position.z = 0.09 * facing;
    if (facing < 0) this.display.rotation.y = Math.PI;
    this.group.add(this.display);
    box(this.group, [0.08, 1.35, 0.08], [-1.9, 1.38, 0], this.frameMaterial);
    box(this.group, [0.08, 1.35, 0.08], [1.9, 1.38, 0], this.frameMaterial);

    this.update(true);
  }

  update(force = false) {
    const firstEta = formatEta(this.train.etaToStation(this.station.index));
    const key = `${firstEta}|${this.train.currentStationIndex}|${this.train.state}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050607';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#f2c900';
    ctx.fillRect(0, 0, w, 48);
    ctx.fillStyle = '#111';
    ctx.font = '900 25px -apple-system, BlinkMacSystemFont, Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.station.name, 18, 24, 600);

    ctx.fillStyle = '#f2c900';
    ctx.font = '900 31px -apple-system, BlinkMacSystemFont, Arial';
    ctx.fillText('U2', 22, 108);

    ctx.fillStyle = '#f5d650';
    ctx.font = '800 33px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(this.train.terminusName, 88, 108, 350);
    ctx.textAlign = 'right';
    ctx.font = '900 39px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(firstEta, 616, 108);

    ctx.strokeStyle = '#4c431e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 152);
    ctx.lineTo(622, 152);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#b9a848';
    ctx.font = '700 21px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`Richtung ${this.train.terminusName}`, 22, 194);
    ctx.fillStyle = '#756d3e';
    ctx.font = '650 17px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('Testbetrieb · Countdown gekoppeld aan trein', 22, 230);

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.texture.dispose();
    this.displayMaterial.dispose();
    this.frameMaterial.dispose();
    this.display.geometry.dispose();
    this.group.traverse((child) => {
      if (child.isMesh && child !== this.display) child.geometry?.dispose?.();
    });
  }
}
