// Berlin Life — U1 (Mijlpaal 1, stappen U1a + U1b): de lijn betreden, over de perrons lopen en meerijden.
//
// Spelerstoestand: player.__line = 'U1', player.__lineStation = index. Zolang die staan, negeert de
// oude U2-beweging de speler (die zou hem anders naar Pankow trekken) en bepaalt dit bestand waar je
// kunt lopen. Meerijden: player.__lineTrain = de trein, __lineRide = {ox, oz} (plek in de trein).
// Instappen = door een open deur de trein in lopen; uitstappen = bij een open deur het perron op.
// Overstappen (U1c): src/lines/LineTransfers.js. Echte omgeving
// (U1d) en uitgangen/Street View (U1e) volgen; zie docs/U1-PLAN.md.
import * as THREE from 'three';
import { Tick } from '../state/Tick.js';
import { CONFIG } from '../config.js';
import { U1_LINE, U1_STATIONS } from '../data/u1.js';
import { LineWorld, HALF, EXIT_X, TRANSFER_X, crossSection } from './LineWorld.js';
import { installTransfers, fromLine } from './LineTransfers.js';
import { LineSurroundings } from './LineSurroundings.js';
import { readSection, writeSection } from '../state/Store.js';
import { LineTrain, DepartureBoards, trackZ, platformSide, DOOR_OFFSETS, HALF_LEN, INSIDE_W } from './LineTrains.js';

const line = U1_LINE, stations = U1_STATIONS;
let game = null, world = null, trains = [], boards = null, surround = null;
const status = { installed: false, enters: 0, leaves: 0, hud: false, god: false, model: 'laden', boardings: 0, alightings: 0 };

const onLine = p => p?.__line === line.id;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function resetOtherLines(p) {
  p.activeTrain = null; p.__u8Active = false; p.__u8Area = false; p.__u8FullStation = null;
  p.__u8LastTrainX = null; p.__u8ActiveTrainId = null; p.__u8LocalX = null; p.__u8LocalZ = null;
  p.__openAirStation = false; globalThis.__berlinMetroU8Passenger = false;
}

/** Zet de speler op het perron van U1-station `index` (GOD-menu; later ook overstappen). */
function enter(index, { side = 1, dx = -10, at = null } = {}) {
  const st = stations[clamp(index | 0, 0, stations.length - 1)], p = game.player;
  resetOtherLines(p);
  const cs = crossSection(st.layout), band = cs.walk.length === 1 ? cs.walk[0] : cs.walk[side > 0 ? 1 : 0];
  p.__line = line.id; p.__lineStation = st.index; p.__lineOpenAir = st.kind === 'viaduct';
  // Na een overstap: naast het overstaptrapgat (het perron op kijkend).
  const tz = at === 'transfer' ? transferZ(cs) : (band[0] + band[1]) / 2;
  if (at === 'transfer') dx = TRANSFER_X + 6.5;   // tussen de kapstaanders (−15, −7) en zuilen (−13,5)
  p.position.set(st.x + dx, line.origin.y + CONFIG.player.eyeHeight, line.origin.z + tz);
  p.yaw = -Math.PI / 2; p.pitch = 0;                     // kijkt langs het perron, richting Warschauer Straße
  world.prime(st.index);
  stopRide(p);
  // Treinen naar dit station halen, zodat je niet lang hoeft te wachten (eindpunt: alleen de vertrekkende).
  const now = performance.now() / 1000;
  for (const t of trains) if (t.timeline.recenterNear(st.index, t.direction > 0 ? 3 : 9)) { t.door = 0; t.lastRecenter = now; t.place(); }
  status.enters++;
  saveLocation(st.index);
  if (at !== 'transfer') game.ui?.notify?.(`U1 · ${st.name}`);
}
// Midden van het tweede perron (zijperrons) of het middenperron: daar liggen uitgang- en overstaptrap.
const transferZ = cs => (cs.walk.length === 1 ? 0 : (cs.plat[1][0] + cs.plat[1][1]) / 2);

// Stand in de save (Game State 2.0, sectie 'location'): na herladen sta je weer op hetzelfde U1-perron.
let savedAt = undefined;
function saveLocation(index) {
  const v = Number.isInteger(index) ? index : null;
  if (v === savedAt) return; savedAt = v;
  writeSection('location', v === null ? null : { line: line.id, station: stations[v].id });
}

/** Verlaat de U1 en zet de speler terug op de U2 (standaard Wittenbergplatz, de overstap). */
function leave(u2Id = 'wittenbergplatz') {
  const p = game.player;
  clearLine(p);
  const s = game.stations.find(x => x.id === u2Id) || game.stations[0];
  p.position.set(2.75, CONFIG.player.eyeHeight, s.z); p.yaw = p.pitch = 0;
  game.world?.update?.(s.z);
  game.ui?.notify?.(`U2 · ${s.name}`);
}
function clearLine(p) { stopRide(p); p.__line = null; p.__lineStation = null; p.__lineOpenAir = false; status.leaves++; saveLocation(null); }
function stopRide(p) { if (p.__lineTrain) p.__lineTrain.rider = false; p.__lineTrain = null; p.__lineRide = null; }

// Bewegingsvector uit de joystick (zelfde formule als de rest van het spel).
function inputMove(p, delta) {
  const f = p.input.moveY, s = p.input.moveX;
  if (Math.hypot(f, s) < 0.02) return null;
  const k = CONFIG.player.speed * delta / Math.max(1, Math.hypot(f, s));
  return [(s * Math.cos(p.yaw) - f * Math.sin(p.yaw)) * k, (-s * Math.sin(p.yaw) - f * Math.cos(p.yaw)) * k];
}
const nearDoor = (ox, w = 0.75) => DOOR_OFFSETS.some(d => Math.abs(ox - d) < w);

// Instappen: vanaf de perronrand richting spoor lopen, terwijl daar een trein met open deuren staat.
function tryBoard(p, st, lz, nz) {
  const cs = crossSection(st.layout);
  for (const t of trains) {
    if (!t.boardableAt(st.index)) continue;
    const tz = cs.tracks[t.direction > 0 ? 1 : 0], side = platformSide(st, t.direction);
    // Duw je over de rand richting dit spoor?
    if (!(side > 0 ? nz < lz && tz < lz : nz > lz && tz > lz)) continue;
    const ox = p.position.x - t.x;
    if (Math.abs(ox) > HALF_LEN || !nearDoor(ox)) continue;
    p.__lineTrain = t; t.rider = true; p.__lineRide = { ox, oz: side * (INSIDE_W - 0.05) };
    status.boardings++;
    game.ui?.notify?.(`U1 richting ${t.timeline.terminusName}`);
    return true;
  }
  return false;
}

// Lopen: binnen het perron van het huidige station; sporen niet oversteken; trapgat ontwijken.
function move(p, delta) {
  const mv = inputMove(p, delta); if (!mv) return;
  const [mx, mz] = mv;
  const st = stations[p.__lineStation], cs = crossSection(st.layout);
  const lz = p.position.z - line.origin.z;
  const band = cs.walk.reduce((b, w) => (Math.abs(lz - (w[0] + w[1]) / 2) < Math.abs(lz - (b[0] + b[1]) / 2) ? w : b));
  if ((lz + mz < band[0] || lz + mz > band[1]) && tryBoard(p, st, lz, lz + mz)) return ride(p, 0);
  const nx = clamp(p.position.x - st.x + mx, -HALF + 0.8, HALF - 0.8), nz = clamp(lz + mz, band[0], band[1]);
  const ez = transferZ(cs);
  if (st.transfer && Math.abs(nx - TRANSFER_X) < 3 && Math.abs(nz - ez) < 1.0) { fromLine(st); return; }   // overstaptrap (U1c)
  if (Math.abs(nx - EXIT_X) < 3.4 && Math.abs(nz - ez) < 1.3) return;   // trapgat (uitgang, U1e)
  p.position.x = st.x + nx; p.position.z = line.origin.z + nz; p.position.y = line.origin.y + CONFIG.player.eyeHeight;
}

// Meerijden: je loopt in de trein (lokale plek ox/oz), de trein neemt je mee. Uitstappen bij een open deur.
function ride(p, delta) {
  const t = p.__lineTrain, r = p.__lineRide, mv = delta > 0 ? inputMove(p, delta) : null;
  if (mv) {
    const nz = r.oz + mv[1];
    const st = stations[t.currentIndex];
    if (Math.abs(nz) > INSIDE_W && t.boardableAt(st.index) && Math.sign(nz) === platformSide(st, t.direction) && nearDoor(r.ox, 0.8)) {
      // Uitstappen: op de perronrand naast deze deur.
      const cs = crossSection(st.layout), tz = cs.tracks[t.direction > 0 ? 1 : 0], side = Math.sign(nz);
      const band = cs.walk.reduce((b, w) => (Math.abs(tz - (side > 0 ? w[0] : w[1])) < Math.abs(tz - (side > 0 ? b[0] : b[1])) ? w : b));
      stopRide(p); status.alightings++;
      p.position.z = line.origin.z + (side > 0 ? band[0] + 0.15 : band[1] - 0.15);
      p.position.x = clamp(p.position.x, st.x - HALF + 0.8, st.x + HALF - 0.8);
      p.__lineStation = st.index; saveLocation(st.index);
      game.ui?.notify?.(`U1 · ${st.name}`);
      return;
    }
    r.ox = clamp(r.ox + mv[0], -HALF_LEN + 0.7, HALF_LEN - 0.7);
    r.oz = clamp(nz, -INSIDE_W, INSIDE_W);
  }
  const x = t.x + r.ox;
  p.position.x = x; p.position.z = line.origin.z + trackZ(stations, x, t.direction) + r.oz;
  p.position.y = line.origin.y + CONFIG.player.eyeHeight;
}

// Treinen bewegen in dezelfde stap als de speler (eerst de trein, dan de meerijder → geen schokken).
function updateTrains(p, delta) {
  for (const t of trains) t.update(delta, { rider: p.__lineTrain === t });
  if (!p.__lineTrain) {
    const now = performance.now() / 1000;
    for (const t of trains) t.maintain(p.__lineStation, now, { waiting: true });
  }
}

function installMovement() {
  const p = game.player, base = p.updateMovement;
  p.updateMovement = function (delta) {
    if (onLine(this) && !this.activeTrain && !this.__streetMode) {
      updateTrains(this, delta);
      return this.__lineTrain ? ride(this, delta) : move(this, delta);
    }
    return base.call(this, delta);
  };
}

// Treinmodel: het HK-model van de U2 (BlenderTrainsV1), anders een eenvoudige gele trein.
async function loadTrains() {
  let template = null;
  for (let i = 0; i < 80 && !globalThis.BerlinBlenderTrains?.load; i++) await Tick.sleep(250, 'boot.U1Trains');
  try { template = await globalThis.BerlinBlenderTrains?.load?.('U2'); } catch { template = null; }
  for (const t of trains) t.build(template);
  status.model = template ? 'HK (Blender)' : 'reserve';
}

// Geluid: ritgeluid, waarschuwingssignaal bij het sluiten van de deuren (samples uit AudioSystem).
function installAudio() {
  Tick.every('u1.audio', 1000, () => {
    const a = game.audioSystem; if (!a || a.__u1Audio) return;
    a.__u1Audio = true;
    const base = a.update.bind(a), warned = new Map();
    let lastX = new Map();
    a.update = function () {
      base();
      const p = game.player; if (!this.unlocked || !onLine(p)) return;
      let near = 0, speed = 0;
      for (const t of trains) {
        const v = Math.abs(t.x - (lastX.get(t) ?? t.x)) * 60; lastX.set(t, t.x);
        const d = Math.abs(t.x - p.position.x), n = p.__lineTrain === t ? 1 : Math.max(0, 1 - d / 90);
        if (n > near) { near = n; speed = v; }
        // Kort voor vertrek: het BVG-waarschuwingssignaal.
        const left = (t.timeline.isTerminal ? CONFIG.train.terminalDwellSeconds : CONFIG.train.doorOpenSeconds) - t.timeline.stateTime;
        const key = `${t.currentIndex}`;
        if (t.state === 'boarding' && !t.timeline.isTerminal && left < 0.72 && d < 48 && warned.get(t) !== key) { warned.set(t, key); this.playSample(this.warning, 0.72); }
      }
      const moving = Math.min(1, speed / 18), target = near * (0.005 + 0.125 * moving);
      this.ride.volume = clamp(this.ride.volume + (target - this.ride.volume) * 0.2, 0, 1);
      this.ride.playbackRate = 0.94 + 0.12 * moving;
    };
  });
}

// HUD: lijnsymbool U1 (groen), stationsnaam, korte uitleg.
function installHud() {
  const hud = game.ui; if (!hud?.updatePlayer || hud.__u1Hud) return;
  hud.__u1Hud = true; status.hud = true;
  const base = hud.updatePlayer.bind(hud);
  // game.ui is een doorgeefobject (BootSequence) zonder DOM-velden → elementen zelf opzoeken.
  const q = id => document.querySelector(id);
  const el = { hud: q('#hud'), stationName: q('#stationName'), trainStatus: q('#trainStatus'), hint: q('#hint'), routeProgress: q('#routeProgress'),
    routeProgressFill: q('#routeProgressFill'), routeProgressDot: q('#routeProgressDot'), routeStartLabel: q('#routeStartLabel'), routeEndLabel: q('#routeEndLabel') };
  hud.updatePlayer = function (player, ...args) {
    base(player, ...args);
    if (!onLine(player)) return;
    const st = stations[player.__lineStation];
    const badge = el.hud?.querySelector?.('.station-chip .u-badge');
    if (badge) { badge.textContent = line.id; badge.style.background = line.color; }
    const t = player.__lineTrain;
    el.routeProgress?.classList?.toggle('hidden', !t);
    if (t) {
      // Meerijden: voortgang naar de volgende halte (zelfde balk als bij de U2).
      const tl = t.timeline, end = tl.isTerminal, prog = end ? 1 : clamp(tl.routeProgress || 0, 0, 1), pct = `${prog * 100}%`;
      if (el.routeProgressFill) el.routeProgressFill.style.width = pct;
      if (el.routeProgressDot) el.routeProgressDot.style.left = pct;
      if (el.routeStartLabel) el.routeStartLabel.textContent = tl.originName;
      if (el.routeEndLabel) el.routeEndLabel.textContent = end ? 'Endstation' : tl.destinationName;
      if (el.stationName) el.stationName.textContent = tl.state === 'cruising' ? 'Unterwegs' : tl.originName;
      if (el.trainStatus) el.trainStatus.textContent = `U1 richting ${tl.terminusName}`;
      if (el.hint) el.hint.textContent = end ? `${tl.originName} · eindpunt. Stap uit bij een open deur.`
        : tl.state === 'boarding' ? `Deuren open · uitstappen kan nu · volgende halte ${tl.destinationName}.`
        : `Nächster Halt: ${tl.destinationName}.`;
      return;
    }
    if (el.stationName) el.stationName.textContent = st.name;
    const fmt = s => !Number.isFinite(s) ? '—' : s <= 0.9 ? 'nu' : `${Math.floor(Math.ceil(s) / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;
    const deps = trains.filter(tr => st.index + tr.direction >= 0 && st.index + tr.direction < stations.length)
      .map(tr => `${tr.timeline.terminusName} ${fmt(tr.etaToStation(st.index))}`);
    if (el.trainStatus) el.trainStatus.textContent = deps.join(' · ') || 'U1';
    if (el.hint) el.hint.textContent = trains.some(tr => tr.boardableAt(st.index))
      ? 'Deuren open · loop naar een deur en stap in.'
      : st.transfer ? `Overstap ${st.transfer.line}: trapgat aan de kant van ${stations[Math.max(0, st.index - 1)].name}.`
      : st.kind === 'viaduct' ? 'Hochbahn boven de straat · wacht op de U1.' : 'Ondergronds station · wacht op de U1.';
  };
}

// GOD-menu: blok met alle U1-stations + terug naar de U2.
function installGod() {
  Tick.every('god.u1', 400, () => {
    const panel = document.querySelector('#gp3'), tools = document.querySelector('#tools3');
    if (!panel || !tools || document.querySelector('#u1God')) return;
    const d = document.createElement('div'); d.id = 'u1God';
    d.style.cssText = 'margin:6px 10px;padding:8px 10px;border-radius:10px;background:#ffffff12;border:1px solid #ffffff22;color:#fff;font:700 12px Arial;line-height:1.45;display:block;text-align:left';
    d.innerHTML = `<div style="display:block"><span style="background:${line.color};color:#fff;border-radius:4px;padding:1px 6px;margin-right:6px">U1</span>Nieuw: U1 met treinen</div>` +
      `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">${stations.map(s => `<button data-u1="${s.index}" style="min-height:34px;padding:4px 8px;border-radius:8px;border:1px solid #ffffff33;background:#ffffff18;color:#fff;font:700 11px Arial">${s.name}</button>`).join('')}` +
      `<button data-u1="back" style="min-height:34px;padding:4px 8px;border-radius:8px;border:1px solid #ffffff33;background:#d43131;color:#fff;font:700 11px Arial">↩ U2 Wittenbergplatz</button></div>`;
    d.querySelectorAll('button[data-u1]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); if (b.dataset.u1 === 'back') leave(); else enter(Number(b.dataset.u1)); panel.classList.remove('on'); }; });
    tools.parentNode.insertBefore(d, tools);
    status.god = true;
  });
}

// Hemel boven het viaduct (dag/nacht uit RenderBase), alleen tijdens het tekenen.
function installSky() {
  const r = game.renderer, render = r.render;
  const sky = new THREE.Color();
  r.render = function (scene, camera) {
    const p = game.player;
    if (scene !== game.scene || !onLine(p) || !p.__lineOpenAir || p.__streetMode) return render.call(this, scene, camera);
    const bg = scene.background;
    sky.copy(globalThis.BerlinRender?.sky || sky.setHex(0x9db7c5)); scene.background = sky;
    try { return render.call(this, scene, camera); } finally { scene.background = bg; }
  };
}

function frame() {
  const p = game.player;
  if (onLine(p)) {
    // Door iets anders weggeteleporteerd (GOD → U2/U8, Street View-terugkeer)? Dan zijn we niet meer op de U1.
    if (Math.abs(p.position.z - line.origin.z) > 40 || Number.isInteger(p.__u8FullStation) || p.__u8Area || p.activeTrain) clearLine(p);
    else {
      const i = world.indexOf(p.position.x);
      p.__lineStation = i; p.__lineOpenAir = stations[i].kind === 'viaduct';
      if (!p.__lineTrain) saveLocation(i);
    }
  }
  const active = onLine(p);
  world.update(p.position.x, active);
  surround?.update(p, active, p.position.x);
  for (const t of trains) t.group.visible = active && Math.abs(t.x - p.position.x) < 260;
  boards?.update(active && !p.__lineTrain ? p.__lineStation : -1, trains, active);
}

async function install() {
  for (let i = 0; i < 900; i++) {
    const g = globalThis.__berlinMetroGame;
    if (g?.player && g.scene && g.renderer && Array.isArray(g.u8Trains)) {
      if (g.__u1Line) return; g.__u1Line = true; game = g;
      world = new LineWorld(g.scene, line, stations);
      surround = new LineSurroundings(world, line, stations);
      trains = [
        new LineTrain({ line, stations, direction: 1, startIndex: 0, delay: 4 }),
        new LineTrain({ line, stations, direction: -1, startIndex: stations.length - 1, delay: 10 }),
      ];
      for (const t of trains) world.root.add(t.group);
      boards = new DepartureBoards(line, stations, world.root);
      installMovement(); installHud(); installGod(); installSky(); installAudio();
      loadTrains();
      Tick.frame('U1Line', { before: frame });
      installTransfers(g, { stations, enter, detach: () => { if (onLine(g.player)) clearLine(g.player); } });
      restoreLocation();
      status.installed = true;
      console.info('[Metro] U1 ready (U1b: stations + treinen)');
      return;
    }
    await Tick.sleep(150, 'boot.U1Line');
  }
}

// Na het laden: stond je bij het opslaan op de U1, dan zet de save je daar terug (na de gewone startplaatsing).
async function restoreLocation() {
  const loc = readSection('location');
  if (loc?.line !== line.id) return;
  const i = stations.findIndex(s => s.id === loc.station); if (i < 0) return;
  savedAt = i;
  await Tick.sleep(2500, 'boot.U1Restore');
  if (!onLine(game.player) && !game.player.__streetMode) enter(i);
  status.restored = stations[i].id;
}

/** Test/GOD: direct in de trein van richting `dir` (+1 = Warschauer Straße) bij station `index` stappen. */
function board(index, dir = 1) {
  enter(index);
  const t = trains.find(x => x.direction === dir), st = stations[game.player.__lineStation];
  if (!t) return false;
  t.timeline.resetToApproachAt(st.index, 0);
  t.timeline.z = st.x; t.timeline.state = 'boarding'; t.timeline.stateTime = 0; t.timeline.doorsOpen = true; t.door = 1;
  t.openSide = platformSide(st, dir); t.place();
  const p = game.player; p.__lineTrain = t; t.rider = true; p.__lineRide = { ox: -2.7, oz: 0 }; ride(p, 0);
  return true;
}

export const U1 = {
  line, stations, enter, leave, board, surroundings: () => surround?.status() ?? null,
  get trains() { return trains; },
  status: () => ({
    ...status, onLine: onLine(game?.player), station: game?.player?.__lineStation ?? null, world: world?.status() ?? null,
    riding: game?.player?.__lineTrain?.id ?? null, surroundings: surround?.status() ?? null,
    trains: trains.map(t => ({ id: t.id, dir: t.direction, x: Math.round(t.x), state: t.state, at: t.currentIndex, door: +t.door.toFixed(2), visible: t.group.visible, units: t.units.length })),
  }),
};
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U1 };
install().catch(e => console.error('[Metro] U1 failed', e));
