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

    // Mac/desktop (16 nov 2026): toetsenbord + muis naast de aanraakbediening.
    this.keys = new Set();
    this.mouseLook = false;

    this.bind();
    this.bindDesktop();
  }

  /** WASD/pijltjes = lopen, klik rechts (muis) = muis-kijken (Esc = los), E/Enter/spatie = actie, P = telefoon. */
  bindDesktop() {
    const MOVE = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
    const typing = (e) => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
    const street = () => !!globalThis.__berlinMetroGame?.player?.__streetMode;
    const visible = (el) => el && !el.classList.contains('hidden') && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
    document.addEventListener('keydown', (e) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (MOVE[e.code]) {
        if (street()) return;                     // Street View: Google loopt zelf met de pijltjes
        this.keys.add(MOVE[e.code]); this.applyKeys(); e.preventDefault(); return;
      }
      if (e.repeat) return;
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        const b = document.querySelector('#interactionButton');
        if (visible(b)) { b.click(); e.preventDefault(); }
      } else if (e.code === 'KeyP') {
        const m = document.querySelector('#phoneModalV2'), open = m && getComputedStyle(m).display !== 'none';
        const b = document.querySelector(open ? '#phoneCloseV2' : '#phoneBtnV2');
        if (b) { if (document.pointerLockElement) document.exitPointerLock?.(); b.click(); e.preventDefault(); }
      }
    });
    document.addEventListener('keyup', (e) => { if (MOVE[e.code]) { this.keys.delete(MOVE[e.code]); this.applyKeys(); } });
    addEventListener('blur', () => { this.keys.clear(); this.applyKeys(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.keys.clear(); this.applyKeys(); } });

    // Muis-kijken met pointer lock (alleen bij een echte muis/trackpad; aanraken blijft zoals het was).
    document.addEventListener('pointerlockchange', () => {
      this.mouseLook = document.pointerLockElement === this.rightZone;
      document.body.classList.toggle('bl-mouselook', this.mouseLook);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.mouseLook) return;
      this.lookX += e.movementX || 0;
      this.lookY += e.movementY || 0;
    });
    if (matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
      document.body.classList.add('bl-desktop');
      const label = this.rightZone.querySelector('.look-label');
      if (label) label.textContent = 'CLICK = MOUSE LOOK';
    }
  }

  /** Toetsen → bewegingsvector (de stick gaat voor zolang je die vasthoudt). */
  applyKeys() {
    if (this.leftPointerId !== null) return;
    const k = this.keys;
    const y = (k.has('f') ? 1 : 0) - (k.has('b') ? 1 : 0), x = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0);
    const n = Math.hypot(x, y) || 1;
    this.moveX = x / n; this.moveY = y / n;
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
    this.applyKeys();
  }

  onRightDown(event) {
    if (event.pointerType === 'mouse' && !this.mouseLook && event.button === 0 && this.rightZone.requestPointerLock) {
      try { const r = this.rightZone.requestPointerLock(); r?.catch?.(() => {}); } catch {}
      return;
    }
    if (this.mouseLook) return;
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
