// Berlin Life — overstappen tussen de nieuwe lijnen en U2/U8 (Mijlpaal 1, stap U1c).
//
// De U1 ligt in een eigen gebied (z = −2600), dus een overstap is een overgang: je loopt een trapgat in,
// het beeld dooft kort uit en je staat op het perron van de andere lijn. Overstappunten:
//   U1-perron: trapgat bij x = TRANSFER_X (gespiegeld aan de uitgang), zie LineWorld.stationKit.
//   U2-perron (Wittenbergplatz, Nollendorfplatz, Gleisdreieck): het −z-einde van het perron
//              (de Street View-uitgang zit aan het +z-einde).
//   U8-perron (Kottbusser Tor): het westeinde (de uitgang zit aan het oosteinde).
// Op U2/U8 werkt de overstap op positie (perroneinde + duwen), niet via een bewegingswrapper,
// zodat de volgorde van de vele oude wrappers niet uitmaakt.
import * as THREE from 'three';
import { Tick } from '../state/Tick.js';
import { CONFIG } from '../config.js';
import { U8_STOPS, U8_ALEX_INDEX, U8_Z_REL, stopX } from '../systems/U8FullLineVisual.js';
import { transferSignTex } from './LineWorld.js';

const U2_END = -32.5;          // rz waar het overstappunt op een U2-perron begint (beweging klemt op −34)
const U8_END = 22.0;           // afstand tot het stationsmidden (beweging klemt op ±24)
let game = null, api = null, busy = false, fade = null;
const signs = [];
const status = { installed: false, transfers: 0, last: null, signs: 0 };

function fader() {
  if (fade) return fade;
  fade = document.createElement('div');
  fade.id = 'lineTransferFade';
  fade.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .28s ease;z-index:9000';
  document.body.appendChild(fade);
  return fade;
}

/** Overgang met korte fade; `jump` zet de speler op de nieuwe plek. */
async function go(label, jump) {
  if (busy) return false;
  busy = true;
  const f = fader();
  f.style.opacity = '1';
  await Tick.sleep(300, 'transfer.fade');
  try { jump(); } catch (e) { console.error('[Metro] overstap mislukt', e); }
  status.transfers++; status.last = label;
  await Tick.sleep(260, 'transfer.fade');
  f.style.opacity = '0';
  game.ui?.notify?.(`Overgestapt · ${label}`);
  await Tick.sleep(500, 'transfer.fade');
  busy = false;
  return true;
}

function resetU8(p) {
  p.activeTrain = null; p.__u8Active = false; p.__u8Area = false; p.__u8FullStation = null;
  p.__u8LastTrainX = null; p.__u8ActiveTrainId = null; p.__u8LocalX = null; p.__u8LocalZ = null;
  globalThis.__berlinMetroU8Passenger = false;
}

/** Van de U1 naar de U2 (perron, −z-einde, kijkend het perron op). */
function toU2(id) {
  const s = game.stations.find(x => x.id === id); if (!s) return false;
  return go(`U2 ${s.name}`, () => {
    const p = game.player;
    api.detach(); resetU8(p);
    p.position.set(2.7, CONFIG.player.eyeHeight, s.z - 30.4); p.yaw = Math.PI; p.pitch = 0;
    game.world?.update?.(s.z);
  });
}

/** Van de U1 naar de U8 (westeinde van het perron, kijkend naar het oosten). */
function toU8(index) {
  const alex = game.stations.find(s => s.id === 'alexanderplatz'); if (!alex) return false;
  return go(`U8 ${U8_STOPS[index].name}`, () => {
    const p = game.player;
    api.detach(); resetU8(p);
    p.position.set(stopX(index) - U8_END + 4, CONFIG.player.eyeHeight - 4, alex.z + U8_Z_REL);
    p.__u8FullStation = index; p.__u8Area = true; p.yaw = -Math.PI / 2; p.pitch = 0;
    for (const s of U8_STOPS) { if (s.id === U8_ALEX_INDEX) continue; const q = game.scene.getObjectByName(`U8:${s.name}`); if (q) q.visible = s.id === index; }
  });
}

/** Van U2/U8 naar de U1 (bij het overstaptrapgat). */
function toU1(index) {
  return go(`U1 ${api.stations[index].name}`, () => { resetU8(game.player); api.enter(index, { at: 'transfer' }); });
}

/** Vanaf het U1-perron: aangeroepen door U1Line als je het overstaptrapgat inloopt. */
export function fromLine(st) {
  const t = st.transfer; if (!t || busy) return false;
  if (t.line === 'U2') toU2(t.station); else if (t.line === 'U8') toU8(t.station);
  return true;
}

// ── Overstappunten op U2- en U8-perrons ─────────────────────────────────────────────────────────
function points() {
  const out = [];
  const alex = game.stations.find(s => s.id === 'alexanderplatz');
  for (const st of api.stations) {
    const t = st.transfer; if (!t) continue;
    if (t.line === 'U2') {
      const s = game.stations.find(x => x.id === t.station); if (!s) continue;
      out.push({ kind: 'U2', u1: st.index, s, name: s.name });
    } else if (t.line === 'U8' && alex) {
      out.push({ kind: 'U8', u1: st.index, index: t.station, cx: stopX(t.station), zc: alex.z + U8_Z_REL, name: U8_STOPS[t.station].name });
    }
  }
  return out;
}

const U1_SIGN = { line: 'U1', color: '#55a822', towards: 'Uhlandstraße · Warschauer Str.' };
function buildSigns(pts) {
  const sign = new THREE.MeshBasicMaterial({ map: transferSignTex(U1_SIGN), toneMapped: false });
  const floor = new THREE.MeshBasicMaterial({ color: 0x55a822, transparent: true, opacity: 0.55, toneMapped: false });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.5, metalness: 0.5 });
  const plane = new THREE.PlaneGeometry(2.0, 0.5), stripe = new THREE.PlaneGeometry(3.6, 0.5), rod = new THREE.BoxGeometry(0.04, 1.0, 0.04);
  for (const pt of pts) {
    const g = new THREE.Group(); g.name = `Transfer:U1@${pt.kind}:${pt.name}`; g.userData.line = 'U1';
    const a = new THREE.Mesh(plane, sign), b = new THREE.Mesh(stripe, floor), r = new THREE.Mesh(rod, steel);
    a.position.y = 2.45; r.position.y = 3.45; b.rotation.x = -Math.PI / 2; b.position.y = 0.015;
    g.add(a, b, r);
    if (pt.kind === 'U2') { g.position.set(2.7, 0, pt.s.z + U2_END - 0.2); }                 // kijkt naar +z (het perron op)
    else { g.position.set(pt.cx - U8_END - 0.2, -4, pt.zc); g.rotation.y = Math.PI / 2; }
    g.visible = false;
    game.scene.add(g);
    signs.push({ pt, g });
  }
  status.signs = signs.length;
}

let dwell = 0, hinted = null, lastHit = null;
function frame(delta) {
  const p = game.player; if (!p) return;
  const off = p.__line || p.__streetMode || p.activeTrain || p.__u8Active;
  for (const { pt, g } of signs) {
    const near = pt.kind === 'U2' ? !Number.isInteger(p.__u8FullStation) && Math.abs(p.position.z - pt.s.z) < 60 && Math.abs(p.position.y - CONFIG.player.eyeHeight) < 2
      : p.__u8FullStation === pt.index;
    g.visible = !p.__line && !p.__streetMode && near;
  }
  if (off || busy) { dwell = 0; lastHit = null; return; }
  const pushing = Math.hypot(p.input?.moveX || 0, p.input?.moveY || 0) > 0.02;
  let hit = null, close = null;
  for (const { pt } of signs) {
    if (pt.kind === 'U2') {
      if (Number.isInteger(p.__u8FullStation) || p.__u8Area) continue;
      const rz = p.position.z - pt.s.z, x = p.position.x;
      if (Math.abs(p.position.y - CONFIG.player.eyeHeight) > 1.5 || x < 0.3 || x > 5.2) continue;
      if (rz < U2_END && rz > -36) hit = pt; else if (rz < U2_END + 9 && rz > -36) close = pt;
    } else if (p.__u8FullStation === pt.index) {
      const lx = p.position.x - pt.cx, dz = Math.abs(p.position.z - pt.zc);
      if (dz > 3.4) continue;
      if (lx < -U8_END) hit = pt; else if (lx < -U8_END + 9) close = pt;
    }
  }
  if (close && hinted !== close) { hinted = close; game.ui?.notify?.(`Übergang U1 · loop het trapgat in`); }
  if (!close && !hit) hinted = null;
  // Oude bewegingsbewakers zetten de speler soms een frame terug → niet meteen op 0 zetten, langzaam laten zakken.
  if (hit) lastHit = hit;
  dwell = Math.max(0, dwell + (hit && pushing ? delta : -delta * 0.25));
  if (dwell > 0.2 && lastHit) { dwell = 0; toU1(lastHit.u1); }
}

/** Wordt door U1Line aangeroepen zodra de lijn klaar is. */
export function installTransfers(g, lineApi) {
  if (status.installed) return;
  game = g; api = lineApi;
  buildSigns(points());
  let last = performance.now();
  Tick.frame('LineTransfers', { before: () => { const now = performance.now(); frame(Math.min(0.1, (now - last) / 1000)); last = now; } });
  status.installed = true;
}

export const LineTransfers = {
  status: () => ({ ...status, busy, points: signs.map(s => `${s.pt.kind}:${s.pt.name}`) }), toU1, toU2, toU8,
  flags: () => { const p = game.player; return { line: p.__line, street: p.__streetMode, train: !!p.activeTrain, u8a: p.__u8Active, u8area: p.__u8Area, u8: p.__u8FullStation, y: p.position.y, st: p.currentStation?.id }; },
};
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), Transfers: LineTransfers };
