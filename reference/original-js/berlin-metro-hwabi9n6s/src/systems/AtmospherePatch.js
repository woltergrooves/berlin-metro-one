import { AudioSystem } from './AudioSystem.js';

const oldResume = AudioSystem.prototype.resume;
const oldUpdate = AudioSystem.prototype.update;

const TRANSFERS = {
  'alexanderplatz': 'Übergang zur U5, U8 und S-Bahn.',
  'stadtmitte': 'Übergang zur U6.',
  'potsdamer-platz': 'Übergang zur S-Bahn.',
  'wittenbergplatz': 'Übergang zur U1 und U3.',
  'nollendorfplatz': 'Übergang zur U1, U3 und U4.',
  'gleisdreieck': 'Übergang zur U1 und U3.',
  'zoologischer-garten': 'Übergang zur U9 und S-Bahn.',
  'schoenhauser-allee': 'Übergang zur S-Bahn.',
  'pankow': 'Übergang zur S-Bahn.'
};

function initSynth(system) {
  if (system.__atmosphere) return system.__atmosphere;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.72;
  master.connect(ctx.destination);

  const tractionOsc = ctx.createOscillator();
  tractionOsc.type = 'sawtooth';
  const tractionFilter = ctx.createBiquadFilter();
  tractionFilter.type = 'lowpass';
  tractionFilter.frequency.value = 290;
  const tractionGain = ctx.createGain();
  tractionGain.gain.value = 0;
  tractionOsc.connect(tractionFilter).connect(tractionGain).connect(master);
  tractionOsc.start();

  const brakeOsc = ctx.createOscillator();
  brakeOsc.type = 'triangle';
  const brakeFilter = ctx.createBiquadFilter();
  brakeFilter.type = 'bandpass';
  brakeFilter.frequency.value = 520;
  brakeFilter.Q.value = 2.2;
  const brakeGain = ctx.createGain();
  brakeGain.gain.value = 0;
  brakeOsc.connect(brakeFilter).connect(brakeGain).connect(master);
  brakeOsc.start();

  system.__atmosphere = {
    ctx, master, tractionOsc, tractionFilter, tractionGain,
    brakeOsc, brakeFilter, brakeGain,
    lastTime: performance.now(), previousSpeed: 0,
    announcedKey: null, speechTimer: null
  };
  return system.__atmosphere;
}

function ramp(param, value, ctx, seconds = 0.08) {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, seconds);
}

function chime(atm) {
  const { ctx, master } = atm;
  const now = ctx.currentTime;
  for (const [offset, hz] of [[0, 659.25], [.19, 783.99]]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.045, now + offset + .025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + .17);
    osc.connect(gain).connect(master);
    osc.start(now + offset);
    osc.stop(now + offset + .2);
  }
}

function speakNextStop(system, train) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  const station = train.timeline?.destinationStation;
  if (!station) return;
  const terminal = train.timeline.destinationIndex === 0 || train.timeline.destinationIndex === train.spec.stations.length - 1;
  let text = `Nächster Halt: ${station.name}.`;
  if (terminal) text += ' Endstation. Bitte alle aussteigen.';
  else if (TRANSFERS[station.id]) text += ` ${TRANSFERS[station.id]}`;

  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = .92;
    u.pitch = .93;
    u.volume = .52;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const german = voices.find(v => /^de(-|_)/i.test(v.lang)) || voices.find(v => /german|deutsch/i.test(v.name));
    if (german) u.voice = german;
    window.speechSynthesis.speak(u);
  } catch {}
}

AudioSystem.prototype.resume = function atmosphereResume() {
  const result = oldResume.call(this);
  const atm = initSynth(this);
  atm?.ctx.resume?.().catch?.(() => {});
  return result;
};

AudioSystem.prototype.update = function atmosphereUpdate() {
  const result = oldUpdate.call(this);
  const atm = this.__atmosphere || (this.unlocked ? initSynth(this) : null);
  if (!atm) return result;

  const now = performance.now();
  const dt = Math.max(.016, Math.min(.12, (now - atm.lastTime) / 1000));
  atm.lastTime = now;
  const train = this.game.player?.activeTrain || null;

  if (!train) {
    ramp(atm.tractionGain.gain, 0, atm.ctx, .12);
    ramp(atm.brakeGain.gain, 0, atm.ctx, .12);
    atm.previousSpeed = 0;
    return result;
  }

  const speed = Math.max(0, train.timeline?.instantSpeed || 0);
  const acceleration = (speed - atm.previousSpeed) / dt;
  atm.previousSpeed = speed;
  const moving = train.state === 'cruising';

  const traction = moving && acceleration > .18 ? Math.min(.030, .006 + acceleration * .0018) : 0;
  const braking = moving && acceleration < -.24 && speed > 1.2 ? Math.min(.026, .006 + Math.abs(acceleration) * .00135) : 0;
  ramp(atm.tractionGain.gain, traction, atm.ctx, .07);
  ramp(atm.brakeGain.gain, braking, atm.ctx, .055);

  atm.tractionOsc.frequency.setTargetAtTime(54 + speed * 4.2, atm.ctx.currentTime, .06);
  atm.tractionFilter.frequency.setTargetAtTime(220 + speed * 9, atm.ctx.currentTime, .08);
  atm.brakeOsc.frequency.setTargetAtTime(340 + speed * 7.5, atm.ctx.currentTime, .05);
  atm.brakeFilter.frequency.setTargetAtTime(470 + speed * 7, atm.ctx.currentTime, .06);

  if (moving && train.timeline?.segmentDestinationIndex != null && train.timeline.routeProgress > .24) {
    const key = `${train.id}:${train.timeline.segmentOriginIndex}:${train.timeline.segmentDestinationIndex}`;
    if (atm.announcedKey !== key) {
      atm.announcedKey = key;
      chime(atm);
      clearTimeout(atm.speechTimer);
      atm.speechTimer = setTimeout(() => {
        if (this.game.player?.activeTrain === train && train.state === 'cruising') speakNextStop(this, train);
      }, 430);
    }
  }

  return result;
};
