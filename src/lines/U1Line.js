// Berlin Life — U1 (Mijlpaal 1, stap U1a): de lijn betreden en over de perrons lopen.
//
// Spelerstoestand: player.__line = 'U1', player.__lineStation = index. Zolang die staan, negeert de
// oude U2-beweging de speler (die zou hem anders naar Pankow trekken) en bepaalt dit bestand waar je
// kunt lopen. Treinen (U1b), overstappen bij Wittenbergplatz/Kottbusser Tor (U1c), echte omgeving
// (U1d) en uitgangen/Street View (U1e) volgen; zie docs/U1-PLAN.md.
import * as THREE from 'three';
import { Tick } from '../state/Tick.js';
import { CONFIG } from '../config.js';
import { U1_LINE, U1_STATIONS } from '../data/u1.js';
import { LineWorld, HALF, EXIT_X, crossSection } from './LineWorld.js';

const line = U1_LINE, stations = U1_STATIONS;
let game = null, world = null;
const status = { installed: false, enters: 0, leaves: 0, hud: false, god: false };

const onLine = p => p?.__line === line.id;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function resetOtherLines(p) {
  p.activeTrain = null; p.__u8Active = false; p.__u8Area = false; p.__u8FullStation = null;
  p.__u8LastTrainX = null; p.__u8ActiveTrainId = null; p.__u8LocalX = null; p.__u8LocalZ = null;
  p.__openAirStation = false; globalThis.__berlinMetroU8Passenger = false;
}

/** Zet de speler op het perron van U1-station `index` (GOD-menu; later ook overstappen). */
function enter(index, { side = 1, dx = -10 } = {}) {
  const st = stations[clamp(index | 0, 0, stations.length - 1)], p = game.player;
  resetOtherLines(p);
  const cs = crossSection(st.layout), band = cs.walk.length === 1 ? cs.walk[0] : cs.walk[side > 0 ? 1 : 0];
  p.__line = line.id; p.__lineStation = st.index; p.__lineOpenAir = st.kind === 'viaduct';
  p.position.set(st.x + dx, line.origin.y + CONFIG.player.eyeHeight, line.origin.z + (band[0] + band[1]) / 2);
  p.yaw = -Math.PI / 2; p.pitch = 0;                     // kijkt langs het perron, richting Warschauer Straße
  world.prime(st.index);
  status.enters++;
  game.ui?.notify?.(`U1 · ${st.name}`);
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
function clearLine(p) { p.__line = null; p.__lineStation = null; p.__lineOpenAir = false; status.leaves++; }

// Lopen: binnen het perron van het huidige station; sporen niet oversteken; trapgat ontwijken.
function move(p, delta) {
  const f = p.input.moveY, s = p.input.moveX;
  if (Math.hypot(f, s) < 0.02) return;
  const k = CONFIG.player.speed * delta / Math.max(1, Math.hypot(f, s));
  const mx = (s * Math.cos(p.yaw) - f * Math.sin(p.yaw)) * k, mz = (-s * Math.sin(p.yaw) - f * Math.cos(p.yaw)) * k;
  const st = stations[p.__lineStation], cs = crossSection(st.layout);
  const lz = p.position.z - line.origin.z;
  const band = cs.walk.reduce((b, w) => (Math.abs(lz - (w[0] + w[1]) / 2) < Math.abs(lz - (b[0] + b[1]) / 2) ? w : b));
  const nx = clamp(p.position.x - st.x + mx, -HALF + 0.8, HALF - 0.8), nz = clamp(lz + mz, band[0], band[1]);
  const ez = cs.walk.length === 1 ? 0 : (cs.plat[1][0] + cs.plat[1][1]) / 2;
  if (Math.abs(nx - EXIT_X) < 3.4 && Math.abs(nz - ez) < 1.3) return;   // trapgat (uitgang, U1e)
  p.position.x = st.x + nx; p.position.z = line.origin.z + nz; p.position.y = line.origin.y + CONFIG.player.eyeHeight;
}

function installMovement() {
  const p = game.player, base = p.updateMovement;
  p.updateMovement = function (delta) {
    if (onLine(this) && !this.activeTrain && !this.__streetMode) return move(this, delta);
    return base.call(this, delta);
  };
}

// HUD: lijnsymbool U1 (groen), stationsnaam, korte uitleg.
function installHud() {
  const hud = game.ui; if (!hud?.updatePlayer || hud.__u1Hud) return;
  hud.__u1Hud = true; status.hud = true;
  const base = hud.updatePlayer.bind(hud);
  hud.updatePlayer = function (player, ...args) {
    base(player, ...args);
    if (!onLine(player)) return;
    const st = stations[player.__lineStation];
    const badge = this.hud?.querySelector?.('.station-chip .u-badge');
    if (badge) { badge.textContent = line.id; badge.style.background = line.color; }
    this.routeProgress?.classList?.add('hidden');
    if (this.stationName) this.stationName.textContent = st.name;
    if (this.trainStatus) this.trainStatus.textContent = `U1 · Uhlandstraße ⇄ Warschauer Straße`;
    if (this.hint) this.hint.textContent = st.kind === 'viaduct'
      ? 'Hochbahn boven de straat. De U1-treinen rijden vanaf de volgende update.'
      : 'Ondergronds station van de U1. De U1-treinen rijden vanaf de volgende update.';
  };
}

// GOD-menu: blok met alle U1-stations + terug naar de U2.
function installGod() {
  Tick.every('god.u1', 400, () => {
    const panel = document.querySelector('#gp3'), tools = document.querySelector('#tools3');
    if (!panel || !tools || document.querySelector('#u1God')) return;
    const d = document.createElement('div'); d.id = 'u1God';
    d.style.cssText = 'margin:6px 10px;padding:8px 10px;border-radius:10px;background:#ffffff12;border:1px solid #ffffff22;color:#fff;font:700 12px Arial;line-height:1.45;display:block;text-align:left';
    d.innerHTML = `<div style="display:block"><span style="background:${line.color};color:#fff;border-radius:4px;padding:1px 6px;margin-right:6px">U1</span>Nieuw (U1a): stations bekijken</div>` +
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
    }
  }
  world.update(p.position.x, onLine(p));
}

async function install() {
  for (let i = 0; i < 900; i++) {
    const g = globalThis.__berlinMetroGame;
    if (g?.player && g.scene && g.renderer && Array.isArray(g.u8Trains)) {
      if (g.__u1Line) return; g.__u1Line = true; game = g;
      world = new LineWorld(g.scene, line, stations);
      installMovement(); installHud(); installGod(); installSky();
      Tick.frame('U1Line', { before: frame });
      status.installed = true;
      console.info('[Metro] U1 ready (U1a: stations)');
      return;
    }
    await Tick.sleep(150, 'boot.U1Line');
  }
}

export const U1 = {
  line, stations, enter, leave,
  status: () => ({ ...status, onLine: onLine(game?.player), station: game?.player?.__lineStation ?? null, world: world?.status() ?? null }),
};
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U1 };
install().catch(e => console.error('[Metro] U1 failed', e));
