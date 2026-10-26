export class InputController {
  constructor({ leftZone, rightZone, stickBase, stickKnob }) {
    this.leftZone = leftZone;
    this.rightZone = rightZone;
    this.stickBase = stickBase;
    this.stickKnob = stickKnob;

    this.moveX = 0;
    this.moveY = 0;
    this.lookX = 0;
    this.lookY = 0;

    this.leftPointerId = null;
    this.rightPointerId = null;
    this.leftStart = { x: 0, y: 0 };
    this.rightLast = { x: 0, y: 0 };
    this.maxStickRadius = 42;

    this.bind();
  }

  bind() {
    const prevent = (event) => event.preventDefault();
    document.addEventListener('contextmenu', prevent, { passive: false });
    document.addEventListener('gesturestart', prevent, { passive: false });

    this.leftZone.addEventListener('pointerdown', (event) => this.onLeftDown(event));
    this.leftZone.addEventListener('pointermove', (event) => this.onLeftMove(event));
    this.leftZone.addEventListener('pointerup', (event) => this.onLeftUp(event));
    this.leftZone.addEventListener('pointercancel', (event) => this.onLeftUp(event));

    this.rightZone.addEventListener('pointerdown', (event) => this.onRightDown(event));
    this.rightZone.addEventListener('pointermove', (event) => this.onRightMove(event));
    this.rightZone.addEventListener('pointerup', (event) => this.onRightUp(event));
    this.rightZone.addEventListener('pointercancel', (event) => this.onRightUp(event));
  }

  onLeftDown(event) {
    if (this.leftPointerId !== null) return;
    this.leftPointerId = event.pointerId;
    this.leftZone.setPointerCapture(event.pointerId);
    this.leftStart.x = event.clientX;
    this.leftStart.y = event.clientY;
    this.positionStick(event.clientX, event.clientY);
  }

  onLeftMove(event) {
    if (event.pointerId !== this.leftPointerId) return;
    const dx = event.clientX - this.leftStart.x;
    const dy = event.clientY - this.leftStart.y;
    const length = Math.hypot(dx, dy) || 1;
    const limited = Math.min(length, this.maxStickRadius);
    const nx = dx / length;
    const ny = dy / length;
    const px = nx * limited;
    const py = ny * limited;

    this.moveX = px / this.maxStickRadius;
    this.moveY = -py / this.maxStickRadius;
    this.stickKnob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
  }

  onLeftUp(event) {
    if (event.pointerId !== this.leftPointerId) return;
    this.leftPointerId = null;
    this.moveX = 0;
    this.moveY = 0;
    this.stickKnob.style.transform = 'translate(-50%, -50%)';
  }

  onRightDown(event) {
    if (this.rightPointerId !== null) return;
    this.rightPointerId = event.pointerId;
    this.rightZone.setPointerCapture(event.pointerId);
    this.rightLast.x = event.clientX;
    this.rightLast.y = event.clientY;
  }

  onRightMove(event) {
    if (event.pointerId !== this.rightPointerId) return;
    this.lookX += event.clientX - this.rightLast.x;
    this.lookY += event.clientY - this.rightLast.y;
    this.rightLast.x = event.clientX;
    this.rightLast.y = event.clientY;
  }

  onRightUp(event) {
    if (event.pointerId !== this.rightPointerId) return;
    this.rightPointerId = null;
  }

  consumeLook() {
    const result = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return result;
  }

  positionStick(clientX, clientY) {
    const rect = this.leftZone.getBoundingClientRect();
    const x = Math.max(76, Math.min(clientX - rect.left, rect.width - 76));
    const y = Math.max(76, Math.min(clientY - rect.top, rect.height - 76));
    this.stickBase.style.left = `${x - 58}px`;
    this.stickBase.style.top = `${y - 58}px`;
    this.stickBase.style.bottom = 'auto';
  }
}
