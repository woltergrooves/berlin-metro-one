// Berlin Life — LineRuntime: één nieuwe metrolijn spelen (Mijlpaal 1 + 2). Gemaakt voor de U1 (U1a–U1e),
// sinds U3a gedeeld: createLine({ line, stations, … }) geeft per lijn een eigen runtime.
//
// Spelerstoestand: player.__line = lijn-id, player.__lineStation = index. Zolang die staan, negeert de
// oude U2-beweging de speler en bepaalt deze runtime waar je kunt lopen. Meerijden: player.__lineTrain =
// de trein, __lineRide = {ox, oz} (plek in de trein). Instappen = door een open deur de trein in lopen;
// uitstappen = bij een open deur het perron op. Overstappen (U1c): LineTransfers.js. Omgeving (U1d):
// LineSurroundings.js. Uitgangen (U1e): trap → Street View (StreetScreen). Ligging per station: 'tunnel',
// 'viaduct' of 'cutting' (U3: open ingraving, trap omhoog). Zie docs/U1-PLAN.md en docs/U3-PLAN.md.
import * as THREE from 'three';
import { Tick } from '../state/Tick.js';
import { CONFIG } from '../config.js';
import { LineWorld, HALF, EXIT_X, TRANSFER_X, crossSection } from './LineWorld.js';
import { installTransfers, fromLine } from './LineTransfers.js';
import { LineSurroundings } from './LineSurroundings.js';
import { readSection, writeSection } from '../state/Store.js';
import { LineTrain, DepartureBoards, trackZ, platformSide, DOOR_OFFSETS, HALF_LEN, INSIDE_W, ALL_TRAINS, WORLDS, blocked, trackClear } from './LineTrains.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Runtime voor één lijn. stations = de stations van de lijnwereld (LineWorld); godStations = welke het GOD-menu
 * toont (U3: alleen de eigen tak); withTrains/transfers/surroundings schakelen U1b/U1c/U1d-onderdelen in.
 */
export function createLine({ line, stations, godStations = stations.filter(s => !s.shared), withTrains = true, transfers = false, surroundings = false, label = `Nieuw: ${line.id}`,
  route = stations, zones = null, dfiRows = 2, trainsPerDir = 1, guests = [], template = null, decor = null, dirs = [1, -1] }) {
// S-Bahn (Fase 45b): guests = [{ line, perDir }] = andere lijnen met eigen treinen op dit spoor (S3/S7/S9 op de
// Stadtbahn); template = eigen treinmodel (functie → Object3D, bv. BR 481) in plaats van het Blender-HK-model;
// decor = (world, stations) → { update(player, active), status() } (Fernbahnverkeer).
// U3b: route = de haltes van de eigen treinen (U3: 24, ook over het U1-spoor); zones = de lijnwerelden waar ze
// doorheen rijden. Treinen van andere lijnen die door déze wereld rijden ("gasten") stoppen hier ook.
const ID = line.id;
/** Alle treinen die door deze lijnwereld rijden: eigen treinen + gasten (U3-treinen op de U1). */
const relevant = () => ALL_TRAINS.filter(t => t.zones.some(z => z.id === ID));
const isGuest = t => t.line.id !== ID && !line.ring;   // Ring: de S42 is een volwaardige tegenrichting
/** Het station van deze wereld waar de trein nu staat (of null). */
const localStation = t => { const r = t.stations[t.currentIndex]; return stations.find(s => s.id === r?.id && !s.shared) || null; };
let game = null, world = null, trains = [], boards = null, surround = null, deco = null;
const status = { installed: false, enters: 0, leaves: 0, hud: false, god: false, model: withTrains ? 'laden' : 'geen treinen', boardings: 0, alightings: 0 };

const onLine = p => p?.__line === line.id;
const openAir = st => st.kind !== 'tunnel';

function resetOtherLines(p) {
  p.activeTrain = null; p.__u8Active = false; p.__u8Area = false; p.__u8FullStation = null;
  p.__u8LastTrainX = null; p.__u8ActiveTrainId = null; p.__u8LocalX = null; p.__u8LocalZ = null;
  p.__openAirStation = false; globalThis.__berlinMetroU8Passenger = false;
}

/** Zet de speler op het perron van station `index` (GOD-menu; later ook overstappen). */
function enter(index, { side = 1, dx = -10, at = null } = {}) {
  const st = stations[clamp(index | 0, 0, stations.length - 1)], p = game.player;
  resetOtherLines(p);
  const cs = crossSection(st.layout), band = cs.walk.length === 1 ? cs.walk[0] : cs.walk[side > 0 ? 1 : 0];
  p.__line = line.id; p.__lineStation = st.index; p.__lineOpenAir = openAir(st);
  // Na een overstap: naast het overstaptrapgat (het perron op kijkend).
  const ez = at === 'exit' ? transferZ(cs) : null;
  const tz = at === 'transfer' ? transferZ(cs) : at === 'exit' ? ez : (band[0] + band[1]) / 2;
  if (at === 'transfer') dx = TRANSFER_X + 6.5;   // tussen de kapstaanders (−15, −7) en zuilen (−13,5)
  if (at === 'exit') dx = st.kind === 'cutting' ? EXIT_X - 5.2 : EXIT_X + 5.8;   // voorbij de open kant van de trap (tunnel/viaduct: net achter de zuil op 22,5)
  p.position.set(st.x + dx, line.origin.y + CONFIG.player.eyeHeight, line.origin.z + tz);
  p.yaw = at === 'exit' && st.kind === 'cutting' ? Math.PI / 2 : -Math.PI / 2; p.pitch = 0;   // langs het perron, richting het laatste station (rug naar de trap)
  world.prime(st.index);
  stopRide(p);
  // Treinen naar dit station halen, zodat je niet lang hoeft te wachten (eindpunt: alleen de vertrekkende).
  const now = performance.now() / 1000;
  for (const t of relevant()) {
    const ri = t.routeIndex(st.id); if (ri < 0) continue;
    if (!trackClear(t, st.x - t.direction * CONFIG.train.approachDistance, relevant())) continue;
    if (t.timeline.recenterNear(ri, (t.direction > 0 ? 3 : 9) + (isGuest(t) ? 26 : 0))) { t.door = 0; t.lastRecenter = now; t.place(); }
  }
  status.enters++;
  saveLocation(st.index);
  if (!at) game.ui?.notify?.(`${ID} · ${st.name}`);
}
// Midden van het tweede perron (zijperrons) of het middenperron: daar liggen uitgang- en overstaptrap.
const transferZ = cs => (cs.walk.length === 1 ? 0 : (cs.plat[1][0] + cs.plat[1][1]) / 2);

// Stand in de save (Game State 2.0, sectie 'location'): na herladen sta je weer op hetzelfde U1-perron.
// Eén sleutel voor alle lijnen: wisselt de speler van lijn, dan schrijft de nieuwe lijn altijd opnieuw.
function saveLocation(index) {
  const v = Number.isInteger(index) ? index : null, key = v === null ? null : `${ID}:${v}`;
  if (v === null && !String(globalThis.__berlinLineSaved || '').startsWith(ID + ':')) return;   // niet van ons
  if (key === globalThis.__berlinLineSaved) return; globalThis.__berlinLineSaved = key;
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
  for (const t of relevant()) {
    if (!t.boardableAtStation(st)) continue;
    const tz = cs.tracks[t.direction > 0 ? 1 : 0], side = platformSide(st, t.direction);
    // Duw je over de rand richting dit spoor?
    if (!(side > 0 ? nz < lz && tz < lz : nz > lz && tz > lz)) continue;
    const ox = p.position.x - t.x;
    if (Math.abs(ox) > HALF_LEN || !nearDoor(ox)) continue;
    p.__lineTrain = t; t.rider = true; p.__lineRide = { ox, oz: side * (INSIDE_W - 0.05) };
    status.boardings++;
    game.ui?.notify?.(`${t.line.id} richting ${t.timeline.terminusName}`);
    return true;
  }
  return false;
}

let closedHinted = false;
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
  if (st.transfer && Math.abs(nx - TRANSFER_X) < 3.1 && Math.abs(nz - ez) < 1.0) {   // overstaptrap (U1c)
    if (!st.transfer.closed) { fromLine(st); return; }
    if (!closedHinted) { closedHinted = true; game.ui?.notify?.(`Übergang ${st.transfer.label || st.transfer.line} · ${st.transfer.note || 'die lijn komt later in het spel'}`); }
    return;   // U3c: afgesloten (U7/U9/Ring nog niet gebouwd) → hek houdt je tegen
  }
  if (Math.abs(nx - TRANSFER_X) > 5) closedHinted = false;
  if (Math.abs(nx - EXIT_X) < 3.4 && Math.abs(nz - ez) < 1.3) {         // uitgangstrap (U1e)
    // Alleen via de open kant de trap op/af; de leuningen houden je verder tegen.
    // Tunnel/viaduct: trap omlaag, open kant +x. Ingraving (U3): trap omhoog, open kant −x.
    const lx = p.position.x - st.x;
    if (st.kind === 'cutting' ? (lx < EXIT_X - 2.4 && Math.abs(nz - ez) < 0.95 && nx > lx) : (lx > EXIT_X + 2.4 && Math.abs(nz - ez) < 0.95 && nx < lx)) toStreet(st);
    return;
  }
  p.position.x = st.x + nx; p.position.z = line.origin.z + nz; p.position.y = line.origin.y + CONFIG.player.eyeHeight;
}

// Uitgang (U1e): de trap → Street View op de echte haltecoördinaten uit src/data/<lijn>.js.
// Terug ('← U-Bahn') zet je boven aan de trap op het perron, met je rug naar de trap.
function toStreet(st) {
  const ov = game.__allStreetOverlay; if (!ov?.open || game.player.__streetMode) return;
  status.exits = (status.exits || 0) + 1;
  const ex = st.exit, lat = ex?.lat ?? st.lat, lng = ex?.lon ?? st.lon;   // eigen straatpunt (S-Bahn: halte ligt op het viaduct)
  const heading = ex ? (Math.atan2((st.lon - lng) * Math.cos(lat * Math.PI / 180), st.lat - lat) * 180 / Math.PI + 360) % 360 : 0;   // kijk naar het station
  ov.open({ line: line.id, name: st.name, returnKind: 'line', lineId: line.id, stationIndex: st.index, lat, lng, heading,
    onReturn: () => { enter(st.index, { at: 'exit' }); status.returns = (status.returns || 0) + 1; } });
}

// Meerijden: je loopt in de trein (lokale plek ox/oz), de trein neemt je mee. Uitstappen bij een open deur.
function ride(p, delta) {
  const t = p.__lineTrain, r = p.__lineRide, mv = delta > 0 ? inputMove(p, delta) : null;
  if (mv) {
    const nz = r.oz + mv[1];
    const st = localStation(t);
    if (st && Math.abs(nz) > INSIDE_W && t.boardableAtStation(st) && Math.sign(nz) === platformSide(st, t.direction) && nearDoor(r.ox, 0.8)) {
      // Uitstappen: op de perronrand naast deze deur.
      const cs = crossSection(st.layout), tz = cs.tracks[t.direction > 0 ? 1 : 0], side = Math.sign(nz);
      const band = cs.walk.reduce((b, w) => (Math.abs(tz - (side > 0 ? w[0] : w[1])) < Math.abs(tz - (side > 0 ? b[0] : b[1])) ? w : b));
      stopRide(p); status.alightings++;
      p.position.z = line.origin.z + (side > 0 ? band[0] + 0.15 : band[1] - 0.15);
      p.position.x = clamp(p.position.x, st.x - HALF + 0.8, st.x + HALF - 0.8);
      p.__lineStation = st.index; saveLocation(st.index);
      game.ui?.notify?.(`${ID} · ${st.name}`);
      return;
    }
    r.ox = clamp(r.ox + mv[0], -HALF_LEN + 0.7, HALF_LEN - 0.7);
    r.oz = clamp(nz, -INSIDE_W, INSIDE_W);
  }
  // Rijdt de trein een andere lijnwereld in (U3 → U1-spoor bij x = 262 en terug)? Dan neemt die lijn de speler over.
  const zone = t.trackZone(t.x), x = t.x + r.ox, origin = zone.origin || line.origin;
  if (zone.id !== ID && WORLDS[zone.id]?.api) WORLDS[zone.id].api.adopt(p, x);
  if (line.ring && Math.abs(x - p.position.x) > 1000) { world.primeAll(world.indexOf(x)); status.seam = (status.seam || 0) + 1; }   // Ring: rond de naad
  p.position.x = x; p.position.z = origin.z + t.zoneZ(zone, x) + r.oz;
  p.position.y = origin.y + CONFIG.player.eyeHeight;
}

/** Een meerijder komt vanuit een andere lijnwereld deze wereld binnen (U3b). */
function adopt(p, x) {
  const i = world.indexOf(x);
  p.__line = ID; p.__lineStation = i; p.__lineOpenAir = openAir(stations[i]);
  world.prime(i);
  status.adopted = (status.adopted || 0) + 1;
}

// Treinen bewegen in dezelfde stap als de speler (eerst de trein, dan de meerijder → geen schokken).
// Alleen de actieve lijn beweegt treinen (één speler, één lijn tegelijk) → elke trein precies één keer per frame.
function updateTrains(p, delta) {
  const list = relevant();
  for (const t of list) {
    if (p.__lineTrain !== t && blocked(t, list)) { t.place(); continue; }   // wacht op de trein ervoor
    t.update(delta, { rider: p.__lineTrain === t });
  }
  if (!p.__lineTrain) {
    const now = performance.now() / 1000, st = stations[p.__lineStation];
    for (const t of list) t.maintain(t.routeIndex(st?.id), now, isGuest(t) ? { waiting: true, lead: 22, maxEta: 70, others: list } : { waiting: true, others: list });
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
  if (template) { const t = template(); for (const tr of trains) tr.build(t); status.model = t.name || 'eigen'; return; }
  let template_ = null;
  for (let i = 0; i < 80 && !globalThis.BerlinBlenderTrains?.load; i++) await Tick.sleep(250, 'boot.' + ID + 'Trains');
  try { template_ = await globalThis.BerlinBlenderTrains?.load?.('U2'); } catch { template_ = null; }
  for (const t of trains) t.build(template_);
  status.model = template_ ? 'HK (Blender)' : 'reserve';
}

// Geluid: ritgeluid, waarschuwingssignaal bij het sluiten van de deuren (samples uit AudioSystem).
function installAudio() {
  Tick.every(`${ID}.audio`, 1000, () => {
    const a = game.audioSystem, flag = '__lineAudio' + ID; if (!a || a[flag]) return;
    a[flag] = true;
    const base = a.update.bind(a), warned = new Map();
    let lastX = new Map();
    a.update = function () {
      base();
      const p = game.player; if (!this.unlocked || !onLine(p)) return;
      let near = 0, speed = 0;
      for (const t of relevant()) {
        if (!t.visibleIn(ID) && p.__lineTrain !== t) continue;
        const v = Math.min(40, Math.abs(t.x - (lastX.get(t) ?? t.x)) * 60); lastX.set(t, t.x);
        const d = Math.abs((t.drawX ?? t.x) - p.position.x), n = p.__lineTrain === t ? 1 : Math.max(0, 1 - d / 90);
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

// HUD: lijnsymbool in de lijnkleur, stationsnaam, korte uitleg.
function installHud() {
  const hud = game.ui, flag = '__lineHud' + ID; if (!hud?.updatePlayer || hud[flag]) return;
  hud[flag] = true; status.hud = true;
  const base = hud.updatePlayer.bind(hud);
  // game.ui is een doorgeefobject (BootSequence) zonder DOM-velden → elementen zelf opzoeken.
  const q = id => document.querySelector(id);
  const el = { hud: q('#hud'), stationName: q('#stationName'), trainStatus: q('#trainStatus'), hint: q('#hint'), routeProgress: q('#routeProgress'),
    routeProgressFill: q('#routeProgressFill'), routeProgressDot: q('#routeProgressDot'), routeStartLabel: q('#routeStartLabel'), routeEndLabel: q('#routeEndLabel') };
  hud.updatePlayer = function (player, ...args) {
    base(player, ...args);
    if (!onLine(player)) return;
    const st = stations[player.__lineStation];
    const t = player.__lineTrain, L = t ? t.line : line;
    const badge = el.hud?.querySelector?.('.station-chip .u-badge');
    if (badge) { badge.textContent = L.id; badge.style.background = L.color; badge.style.color = L.textColor || '#fff'; }
    el.routeProgress?.classList?.toggle('hidden', !t);
    if (t) {
      // Meerijden: voortgang naar de volgende halte (zelfde balk als bij de U2).
      const tl = t.timeline, end = tl.isTerminal, prog = end ? 1 : clamp(tl.routeProgress || 0, 0, 1), pct = `${prog * 100}%`;
      if (el.routeProgressFill) el.routeProgressFill.style.width = pct;
      if (el.routeProgressDot) el.routeProgressDot.style.left = pct;
      if (el.routeStartLabel) el.routeStartLabel.textContent = tl.originName;
      if (el.routeEndLabel) el.routeEndLabel.textContent = end ? 'Endstation' : tl.destinationName;
      if (el.stationName) el.stationName.textContent = tl.state === 'cruising' ? 'Unterwegs' : tl.originName;
      if (el.trainStatus) el.trainStatus.textContent = `${L.id} richting ${tl.terminusName}`;
      if (el.hint) el.hint.textContent = end ? `${tl.originName} · eindpunt. Stap uit bij een open deur.`
        : tl.state === 'boarding' ? `Deuren open · uitstappen kan nu · volgende halte ${tl.destinationName}.`
        : `Nächster Halt: ${tl.destinationName}.`;
      return;
    }
    if (el.stationName) el.stationName.textContent = st.name;
    const fmt = s => !Number.isFinite(s) ? '—' : s <= 0.9 ? 'nu' : `${Math.floor(Math.ceil(s) / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;
    const here = relevant().map(tr => [tr, tr.routeIndex(st.id)]).filter(([tr, i]) => i >= 0 && (tr.line.ring || (i + tr.direction >= 0 && i + tr.direction < tr.stations.length)));
    const multi = new Set(here.map(([tr]) => tr.line.id)).size > 1;
    const deps = here.sort((a, b) => (line.sbahn ? 0 : b[0].direction - a[0].direction) || a[0].etaToStation(a[1]) - b[0].etaToStation(b[1]))
      .slice(0, 4).map(([tr, i]) => `${multi ? tr.line.id + ' ' : ''}${tr.timeline.terminusName} ${fmt(tr.etaToStation(i))}`);
    if (el.trainStatus) el.trainStatus.textContent = deps.join(' · ') || ID;
    if (el.hint) el.hint.textContent = here.some(([tr]) => tr.boardableAtStation(st))
      ? 'Deuren open · loop naar een deur en stap in.'
      : st.transfer?.closed ? `Übergang ${st.transfer.label || st.transfer.line} (${st.transfer.note || 'nog niet in het spel'}) · wacht op de ${ID} of neem de trap naar buiten.`
      : st.transfer ? `Overstap ${st.transfer.label || st.transfer.line}: trapgat aan de kant van ${st.index > 0 ? stations[st.index - 1].name : line.ring ? stations.at(-1).name : 'het tunneleinde'}.`
      : !withTrains ? `${ID}-treinen volgen binnenkort · neem de trap naar buiten (Ausgang).`
      : st.embank ? `Bovengronds station · wacht op de ${ID} of neem de trap naar buiten (Ausgang).`
      : line.ring ? `Ringbahn · wacht op de S41 ↻ of S42 ↺ of neem de trap ${st.kind === 'cutting' ? 'omhoog' : 'naar beneden'} (Ausgang).`
      : line.sbahn ? `S-Bahn op het Stadtbahnviaduct · wacht op de S-Bahn of neem de trap naar beneden (Ausgang).`
      : st.kind === 'viaduct' ? `Hochbahn boven de straat · wacht op de ${ID} of neem de trap naar buiten (Ausgang).`
      : st.kind === 'cutting' ? `Open ingraving · wacht op de ${ID} of neem de trap omhoog naar buiten (Ausgang).`
      : `Ondergronds station · wacht op de ${ID} of neem de trap naar buiten (Ausgang).`;
  };
}

// GOD-menu: sinds 8 nov één teleportblok voor alle lijnen (src/lines/GodTeleport.js leest godStations).
function installGod() { status.god = true; }

// Hemel boven viaduct/ingraving (dag/nacht uit RenderBase), alleen tijdens het tekenen.
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
    // Door iets anders weggeteleporteerd (GOD → U2/U8/andere lijn, Street View-terugkeer)? Dan zijn we niet meer op deze lijn.
    if (Math.abs(p.position.z - line.origin.z) > 40 || Number.isInteger(p.__u8FullStation) || p.__u8Area || p.activeTrain) clearLine(p);
    else {
      const i = world.indexOf(p.position.x);
      p.__lineStation = i; p.__lineOpenAir = openAir(stations[i]);
      if (!p.__lineTrain) saveLocation(i);
    }
  }
  const active = onLine(p);
  world.update(p.position.x, active);
  surround?.update(p, active, p.position.x);
  if (active) {
    const list = relevant();
    for (const t of list) t.group.visible = t.visibleIn(ID) && Math.abs((t.drawX ?? t.x) - p.position.x) < 260;
    // Meerijden richting een andere lijnwereld: die alvast opbouwen, zodat de overgang naadloos is.
    const rt = p.__lineTrain;
    if (rt) for (const z of rt.zones) {
      if (z.id === ID) continue;
      const edge = Number.isFinite(z.from) ? z.from : z.to;
      if (Math.abs(rt.x - edge) < 170) WORLDS[z.id]?.world?.warm(edge);
    }
    boards?.update(p.__lineTrain ? null : stations[p.__lineStation], list, true);
  } else boards?.update(null, [], false);
  deco?.update(p, active);
}

async function install() {
  for (let i = 0; i < 900; i++) {
    const g = globalThis.__berlinMetroGame;
    if (g?.player && g.scene && g.renderer && Array.isArray(g.u8Trains)) {
      const flag = '__line' + ID; if (g[flag]) return; g[flag] = true; game = g;
      world = new LineWorld(g.scene, line, stations);
      WORLDS[ID] = { world, line, api: { adopt } };
      if (surroundings) surround = new LineSurroundings(world, line, stations);
      if (withTrains) {
        // U5 oost: lange lijn → meer treinen per richting, gelijk verdeeld over de route (blokbeveiliging houdt afstand).
        trains = [];
        for (let k = 0; k < trainsPerDir; k++) {
          const off = Math.round(k * (route.length - 1) / trainsPerDir);
          // Ringbahn: dirs = [1] (S41 rijdt alleen met de klok mee; de S42 is een gast in de tegenrichting).
          if (dirs.includes(1)) trains.push(new LineTrain({ line, stations: route, zones, direction: 1, startIndex: off, delay: 4 + k * 3 }));
          if (dirs.includes(-1)) trains.push(new LineTrain({ line, stations: route, zones, direction: -1, startIndex: route.length - 1 - off, delay: 10 + k * 3 }));
        }
        // Gasten (S3/S7/S9): rijden door deze lijnwereld, verspreid tussen de eigen treinen.
        const own = zones || [{ id: ID, stations, origin: line.origin }];
        guests.forEach((gs, j) => { for (let k = 0; k < (gs.perDir || 1); k++) {
          const off = Number.isInteger(gs.start) ? gs.start : Math.round(((j + 1) / (guests.length + 1) + k / (gs.perDir || 1)) * (route.length - 1)) % (route.length - 1);
          const gd = gs.dirs || [1, -1];
          if (gd.includes(1)) trains.push(new LineTrain({ line: gs.line, stations: route, zones: own, direction: 1, startIndex: off, delay: 6 + j * 5 }));
          if (gd.includes(-1)) trains.push(new LineTrain({ line: gs.line, stations: route, zones: own, direction: -1, startIndex: route.length - 1 - off, delay: 12 + j * 5 }));
        } });
        for (const t of trains) { world.root.add(t.group); ALL_TRAINS.push(t); }
      }
      if (withTrains || dfiRows > 2) boards = new DepartureBoards(line, world.root, dfiRows);
      if (decor) deco = decor(world, stations);
      installMovement(); installHud(); installGod(); installSky(); installAudio();
      if (withTrains) loadTrains();
      for (const t of trains) t.place();
      Tick.frame(ID + 'Line', { before: frame });
      if (transfers) installTransfers(g, { id: ID, stations, enter, sign: typeof transfers === 'object' ? transfers : null, detach: () => { if (onLine(g.player)) clearLine(g.player); } });   // U5: transfers = bord voor U2/U8
      restoreLocation();
      status.installed = true;
      console.info(`[Metro] ${ID} ready`);
      return;
    }
    await Tick.sleep(150, 'boot.' + ID + 'Line');
  }
}

// Na het laden: stond je bij het opslaan op deze lijn, dan zet de save je daar terug (na de gewone startplaatsing).
async function restoreLocation() {
  const loc = readSection('location');
  if (loc?.line !== line.id) return;
  const i = stations.findIndex(s => s.id === loc.station && !s.shared); if (i < 0) return;
  globalThis.__berlinLineSaved = `${ID}:${i}`;
  await Tick.sleep(2500, 'boot.' + ID + 'Restore');
  if (!onLine(game.player) && !game.player.__streetMode) enter(i);
  status.restored = stations[i].id;
}

/** Test/GOD: direct in de trein van richting `dir` (+1 = naar het laatste station) bij station `index` stappen. */
function board(index, dir = 1) {
  enter(index);
  const t = trains.find(x => x.direction === dir), st = stations[game.player.__lineStation];
  if (!t) return false;
  const ri = t.routeIndex(st.id); if (ri < 0) return false;
  t.timeline.resetToApproachAt(ri, 0);
  t.timeline.z = st.x; t.timeline.state = 'boarding'; t.timeline.stateTime = 0; t.timeline.doorsOpen = true; t.door = 1;
  t.openSide = platformSide(st, dir); t.place();
  const p = game.player; p.__lineTrain = t; t.rider = true; p.__lineRide = { ox: -2.7, oz: 0 }; ride(p, 0);
  return true;
}

/** Test/console: `sec` spelseconden treinen vooruitspoelen (headless loopt het spel op ±1 beeld per seconde). */
function simulate(sec = 10) {
  const p = game.player; if (!onLine(p)) return false;
  for (let t = 0; t < sec; t += 0.1) { updateTrains(p, 0.1); if (p.__lineTrain) ride(p, 0); deco?.update(p, true, 0.1); }
  frame(); return true;
}

return {
  line, stations, godStations, enter, leave, board, simulate, exit: i => toStreet(stations[i ?? game.player.__lineStation]), surroundings: () => surround?.status() ?? null,
  get trains() { return trains; }, get world() { return world; }, relevant, adopt,
  status: () => ({
    ...status, onLine: onLine(game?.player), station: game?.player?.__lineStation ?? null, world: world?.status() ?? null,
    riding: game?.player?.__lineTrain?.id ?? null, dfi: boards?.key || null, decor: deco?.status?.() ?? null, line: game?.player?.__line ?? null, surroundings: surround?.status() ?? null,
    trains: relevant().map(t => ({ id: t.id, line: t.line.id, view: t.viewZoneId, track: t.trackZone(t.x).id, dir: t.direction, x: Math.round(t.x), state: t.state, at: t.currentIndex, door: +t.door.toFixed(2), visible: t.group.visible, units: t.units.length })),
  }),
  install: () => install().catch(e => console.error(`[Metro] ${ID} failed`, e)),
};
}
