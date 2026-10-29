// Mijlpaal 0 / G2: één rendering-basis (tone mapping, kleurruimte, belichting, omgevingslicht, schaduw, mist,
// kwaliteit). Voorheen zetten drie systemen elk hun eigen tone mapping (1.07/1.08/1.12), stonden er zes lampen
// los van elkaar in de scene (samen ±3,5× "plat" licht: daardoor oogde alles vaal en zonder diepte) en schreven
// drie systemen om beurten de mist (24–70 m, 42–190 m, 34–132 m), waardoor die verspringt.
//
// Nu is dit de enige eigenaar:
//   - renderer: Khronos PBR Neutral tone mapping (houdt BVG-geel, U2-rood en U8-blauw verzadigd), sRGB-uitvoer;
//   - omgevingslicht: een kleine RoomEnvironment (PMREM) als scene.environment, zodat metaal, tegels en
//     lak echte reflecties en zachte schaduwkanten krijgen (de goedkope vervanger van ambient occlusion);
//   - één lichtset: hemisfeer + zwak ambient + "plafond"-lamp (DirectionalLight, volgt de speler);
//   - mist per omgeving: ondergronds, in de trein, open-air station (met dag/nacht), Street View;
//   - kwaliteit: laag / midden / hoog (pixelratio, schaduw), automatisch gekozen, te wijzigen in het GOD-menu.
//
// Andere systemen zetten deze dingen niet meer. Omgeving lezen: BerlinRender.status().
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Tick } from './Tick.js';
import { clock } from './Clock.js';

const STORE_KEY = 'berlinLife.quality';
export const PROFILES = {
  laag:   { label: 'Laag',   pixelRatio: 1.0,  shadows: false, env: false, envIntensity: 0 },
  midden: { label: 'Midden', pixelRatio: 1.2,  shadows: false, env: true,  envIntensity: 1.0 },
  hoog:   { label: 'Hoog',   pixelRatio: 1.5,  shadows: true,  env: true,  envIntensity: 1.0, shadowSize: 1024 },
};

const isMobile = () => (globalThis.matchMedia?.('(pointer: coarse)').matches) || /iPad|iPhone|iPod/i.test(navigator.userAgent);

function storedQuality() {
  try { const q = localStorage.getItem(STORE_KEY); if (q && PROFILES[q]) return q; } catch {}
  return null;
}
// Standaard "midden": dezelfde pixelratio als vóór G2 op iPhone/iPad (geen extra GPU-last), zonder schaduw.
function autoQuality() { return isMobile() ? 'midden' : 'hoog'; }

// Per omgeving: mist, lampen en omgevingslicht. Ondergronds = warm TL-licht van boven, donkere tunnel.
const ENV = {
  ondergronds: { fog: 0x14171a, near: 30, far: 105, hemiSky: 0xfff4e4, hemiGround: 0x4a443c, hemi: 0.95, amb: 0.22, key: 1.55, keyColor: 0xfff2dc, env: 0.55 },
  // U8-perron: zelfde mist als ondergronds; de tunnel verdwijnt in het donker (geen buurstations in de verte).
  u8:          { fog: 0x14171a, near: 30, far: 105, hemiSky: 0xfff4e4, hemiGround: 0x4a443c, hemi: 0.95, amb: 0.22, key: 1.55, keyColor: 0xfff2dc, env: 0.55 },
  trein:       { fog: 0x0e1012, near: 34, far: 115, hemiSky: 0xfff4e4, hemiGround: 0x3c3832, hemi: 0.9,  amb: 0.22, key: 1.3,  keyColor: 0xfff2dc, env: 0.5 },
};
const _c = new THREE.Color(), _sky = new THREE.Color();
const clamp01 = v => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => a + (b - a) * t;

function daylight() {
  const h = clock.minute / 60;
  return clamp01(Math.sin((h - 6) / 12 * Math.PI));
}

function environmentOf(game) {
  const p = game.player || {};
  if (p.__streetMode) return 'street';
  if (p.activeTrain || p.__u8Active) return 'trein';
  if (p.__line) return p.__lineOpenAir ? 'openair' : 'ondergronds';   // nieuwe lijnen (src/lines/)
  if (p.__openAirStation) return 'openair';
  if (Number.isInteger(p.__u8FullStation) || (p.__u8Area && p.position?.y < -1)) return 'u8';
  return 'ondergronds';
}

let game = null, quality = 'midden', current = '', envTex = null, frameId = null, casterTask = null;
const rig = {};
const counts = { casters: 0, receivers: 0, scans: 0 };

function applyQuality() {
  const r = game.renderer, prof = PROFILES[quality];
  r.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, prof.pixelRatio));
  r.setSize(globalThis.innerWidth, globalThis.innerHeight, false);
  const wantShadows = !!prof.shadows, wantEnv = prof.env ? envTex : null;
  let recompile = false;
  if (r.shadowMap.enabled !== wantShadows) {
    r.shadowMap.enabled = wantShadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    rig.key.castShadow = wantShadows;
    recompile = true;
  }
  // Omgevingslicht kost per pixel een paar textuurlookups: op "laag" uit (zuinigste stand voor oudere iPhones).
  if (game.scene.environment !== wantEnv) { game.scene.environment = wantEnv; recompile = true; }
  // Materialen moeten opnieuw compileren als schaduw of omgevingslicht aan/uit gaat.
  if (recompile) game.scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); });
  if (wantShadows) {
    const s = prof.shadowSize || 1024;
    if (rig.key.shadow.mapSize.x !== s) { rig.key.shadow.mapSize.set(s, s); rig.key.shadow.map?.dispose(); rig.key.shadow.map = null; }
    if (!casterTask) casterTask = Tick.every('render.shadow-casters', 2500, markShadows);
    markShadows();
  } else if (casterTask) { Tick.cancel(casterTask); casterTask = null; }
}

// Schaduw (alleen "hoog"): treinen en reizigers werpen, perrons/vloeren van geladen stations ontvangen.
// Eén lichte ronde per 2,5 s; reeds gemarkeerde objecten worden overgeslagen.
function markShadows() {
  counts.scans++;
  const cast = root => root?.traverse?.(o => { if (o.isMesh && !o.castShadow) { o.castShadow = true; counts.casters++; } });
  for (const t of game.trains || []) cast(t.group);
  for (const t of game.u8Trains || []) cast(t.group || t);
  // Reizigers hangen genest in stationsgroepen: één naamronde door de scene (±10k objecten, 1× per 2,5 s).
  const people = [];
  game.scene.traverse(o => { if (o.name && /^(BlenderNPC_|BlenderHoff|DavidHasselhoff)/.test(o.name)) people.push(o); });
  for (const o of people) cast(o);
  for (const chunk of game.world?.chunks?.values?.() || []) {
    const root = chunk.structure; if (!root || root.userData.__renderReceive) continue;
    root.userData.__renderReceive = true;
    root.traverse(o => { if (o.isMesh) { o.receiveShadow = true; counts.receivers++; } });
  }
}

function buildRig() {
  const scene = game.scene;
  rig.hemi = new THREE.HemisphereLight(0xfff4e4, 0x4a443c, 1); rig.hemi.name = 'RenderHemi';
  rig.amb = new THREE.AmbientLight(0xffffff, 0.2); rig.amb.name = 'RenderAmbient';
  rig.key = new THREE.DirectionalLight(0xfff2dc, 1.5); rig.key.name = 'RenderKey';
  const sc = rig.key.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 0.5; sc.far = 40;
  rig.key.shadow.bias = -0.0006; rig.key.shadow.normalBias = 0.03;
  scene.add(rig.hemi, rig.amb, rig.key, rig.key.target);
  // Omgevingslicht: klein (lage resolutie volstaat voor ruwe materialen), één keer gemaakt.
  const pmrem = new THREE.PMREMGenerator(game.renderer);
  const room = new RoomEnvironment();
  envTex = pmrem.fromScene(room, 0.04).texture;
  room.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  pmrem.dispose();
}

function applyEnvironment() {
  const scene = game.scene, fog = scene.fog, p = game.player, kind = environmentOf(game);
  const prof = PROFILES[quality];
  let e;
  if (kind === 'openair' || kind === 'street') {
    // Open-air station: dag/nacht uit de spelklok. Hemel = scene.background (Phase12FixV2 / BlenderStations).
    const d = daylight();
    _sky.setHex(0x9db7c5).lerp(_c.setHex(0x0b1018), 1 - d);
    e = { near: mix(40, 60, d), far: mix(140, 220, d), hemi: mix(0.35, 1.25, d), amb: mix(0.12, 0.2, d), key: mix(0.15, 2.1, d), env: mix(0.25, 0.9, d) };
    if (fog) fog.color.copy(_sky);
    rig.hemi.color.setHex(0xdfeeff); rig.hemi.groundColor.setHex(0x5a5650);
    rig.key.color.setHex(d > 0.2 ? 0xfff0d8 : 0x9fb4ff);
  } else {
    e = ENV[kind];
    if (fog) fog.color.setHex(e.fog);
    // Volledig ondergronds (U8, U1-tunnel): geen hemel door tunnelgaten → achtergrond = mistkleur.
    // (Phase12FixV2 zet de achtergrond elke frame op de hemel; dit `before`-deel loopt daarna.)
    // U2 blijft ongemoeid (daglicht bij trappen naar de straat).
    if (scene.background?.isColor && (kind === 'u8' || (kind === 'trein' && p?.__u8Active) || (kind === 'ondergronds' && p?.__line))) scene.background.setHex(e.fog);
    rig.hemi.color.setHex(e.hemiSky); rig.hemi.groundColor.setHex(e.hemiGround); rig.key.color.setHex(e.keyColor);
  }
  if (fog) { fog.near = e.near; fog.far = e.far; }
  rig.hemi.intensity = e.hemi; rig.amb.intensity = e.amb; rig.key.intensity = e.key;
  scene.environmentIntensity = e.env * prof.envIntensity;
  // Lamp volgt de speler: bijna loodrecht van boven (zoals plafondverlichting), schaduw valt onder treinen/mensen.
  const pos = p?.position;
  if (pos) {
    const ox = kind === 'openair' ? 9 : 2.5, oz = kind === 'openair' ? 6 : 3.5;
    rig.key.position.set(pos.x + ox, pos.y + 16, pos.z + oz);
    rig.key.target.position.set(pos.x, pos.y - 2, pos.z);
  }
  current = kind;
}

export const RenderBase = {
  install(g) {
    if (game) return;
    game = g;
    quality = storedQuality() || autoQuality();
    const r = g.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    buildRig();
    applyQuality();
    applyEnvironment();
    // Als eerste geregistreerd: dit `before`-deel loopt als laatste vóór de render en heeft dus het laatste woord.
    frameId = Tick.frame('RenderBase', { before: applyEnvironment });
  },
  get quality() { return quality; },
  /** Daglicht 0 (nacht) … 1 (middag) uit de spelklok; hemelkleur buiten (G4: verlichte ramen, verre silhouetten). */
  get daylight() { return daylight(); },
  get sky() { return _sky.setHex(0x9db7c5).lerp(_c.setHex(0x0b1018), 1 - daylight()); },
  setQuality(q) {
    if (!PROFILES[q] || !game) return false;
    quality = q;
    try { localStorage.setItem(STORE_KEY, q); } catch {}
    applyQuality();
    globalThis.BerlinMaterials?.rescan?.();   // G3a: laag → midden zet Lambert-materialen direct om
    return true;
  },
  status() {
    const r = game?.renderer;
    return { quality, auto: !storedQuality(), environment: current, toneMapping: 'Neutral', exposure: r?.toneMappingExposure,
      pixelRatio: r?.getPixelRatio(), shadows: !!r?.shadowMap.enabled, ...counts,
      materials: globalThis.BerlinMaterials?.status?.() && (({ converted, tuned }) => ({ converted, tuned }))(globalThis.BerlinMaterials.status()),
      stationProfiles: globalThis.BerlinStationProfiles?.status?.().templates ?? null };
  },
  // GOD-menu: kwaliteitskeuze onder de Street View-teller.
  mountGod(panel, tools) {
    if (document.querySelector('#renderQualityGod')) return;
    const d = document.createElement('div');
    d.id = 'renderQualityGod';
    d.style.cssText = 'margin:6px 10px;padding:8px 10px;border-radius:10px;background:#ffffff12;border:1px solid #ffffff22;color:#fff;font:700 12px Arial;line-height:1.45;display:block;text-align:left';
    const draw = () => {
      const s = RenderBase.status();
      d.innerHTML = `<div style="display:block">🎨 Grafische kwaliteit${s.auto ? ' (automatisch)' : ''}</div>` +
        `<div style="display:flex;gap:6px;margin-top:6px">${Object.entries(PROFILES).map(([k, v]) =>
          `<button data-q="${k}" style="flex:1;min-height:36px;border-radius:8px;border:1px solid #ffffff33;font:700 12px Arial;background:${k === s.quality ? '#ffcf5c' : '#ffffff18'};color:${k === s.quality ? '#111' : '#fff'}">${v.label}</button>`).join('')}</div>` +
        `<div style="display:block;font-weight:400;opacity:.8;margin-top:4px">Pixelratio ${s.pixelRatio?.toFixed(2)} · schaduw ${s.shadows ? 'aan' : 'uit'} · omgeving: ${s.environment}</div>` +
        `<div style="display:block;font-weight:400;opacity:.8">Materialen (G3a): ${s.materials ? `${s.materials.converted} omgezet naar PBR, ${s.materials.tuned} afgesteld${s.quality === 'laag' ? ' · laag: Lambert blijft' : ''}` : '—'}</div>` +
        `<div style="display:block;font-weight:400;opacity:.8">Stationsprofielen (G3b): ${(() => { const p = globalThis.BerlinStationProfiles?.status?.(); return p ? `${p.profiles} stations · ${p.templates} geladen${p.failed ? ` · ${p.failed} overgeslagen` : ''}` : '—'; })()}</div>` +
        `<div style="display:block;font-weight:400;opacity:.8">Omgeving buitenstations (G4): ${(() => { const g = globalThis.BerlinSurroundings?.status?.(); return g ? `${g.packs} pakketten · geladen: ${g.loaded.join(', ') || 'geen'}${g.failed ? ` · ${g.failed} fouten` : ''} · © OpenStreetMap-bijdragers` : '—'; })()}</div>`;
      d.querySelectorAll('button[data-q]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); RenderBase.setQuality(b.dataset.q); draw(); game.ui?.notify?.(`Grafische kwaliteit: ${PROFILES[b.dataset.q].label}`); }; });
    };
    tools.parentNode.insertBefore(d, tools);
    draw();
    let last = '';
    Tick.every('god.render-quality', 1500, () => { if (!panel.classList.contains('on')) return; const k = JSON.stringify(RenderBase.status()); if (k !== last) { last = k; draw(); } });
  },
};
globalThis.BerlinRender = RenderBase;
