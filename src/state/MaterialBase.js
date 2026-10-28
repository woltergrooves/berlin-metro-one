// Mijlpaal 0 / G3a: één materiaal-basis voor stations en treinen.
//
// Na G2 (RenderBase) is er omgevingslicht, maar dat werkt alleen op PBR-materialen (MeshStandardMaterial).
// Vóór G3a waren ±290 materialen (±4.900 meshes: de hele U8, tunnels, uitgangen, Späti's, U8-wagons) nog
// MeshLambertMaterial: die krijgen geen omgevingslicht en geen glans. De Blender-stations (U2) waren al PBR,
// maar met een vlak grijs plafond zonder textuur, zuilen die als metaal (donker) werden gerekend en
// TL-buizen die niet gloeiden.
//
// Dit bestand is de enige eigenaar van ruwheid/metalness en van de extra stationstexturen:
//   - Lambert → Standard "op hun plek": hetzelfde materiaal-object krijgt het Standard-prototype en -velden.
//     Systemen die een verwijzing bewaren (kleur wisselen, knipperen) blijven dus gewoon werken.
//     Alleen bij kwaliteit midden/hoog; op "laag" blijven ze Lambert (zuinig voor oudere iPhones).
//     Laag → midden zet direct om; midden → laag houdt ze tot herladen (terugzetten kan niet veilig).
//   - Rollen: per materiaal een ruwheid/metalness (tegel, terrazzo, beton, geverfd staal, geborsteld metaal,
//     glas, treinlak, rubber, tunnel) op basis van materiaalnaam, objectnaam en kleur.
//   - Texturen (procedureel, geen externe bestanden): plafondpanelen met voegen en lichte vlekken,
//     ruwheidskaarten uit de tegel- en terrazzotexturen (glanzende tegel, matte voeg), scherpere texturen
//     onder schuine hoek (anisotropie).
//   - TL-buizen en ledstrips gloeien (emissive) zodat ze in de mist en bij omgevingslicht licht blijven.
//
// Werkwijze: één scanronde per 2 s door de scene, verdeeld over frames (max. 1.500 objecten per frame);
// elk materiaal wordt één keer behandeld (WeakSet). Status: BerlinMaterials.status().
import * as THREE from 'three';
import { Tick } from './Tick.js';

const PER_FRAME = 1500, SCAN_MS = 2000;

// ── Rollen ──────────────────────────────────────────────────────────────────────────────────────────────
// r = ruwheid, m = metalness, env = envMapIntensity (vermenigvuldigd met scene.environmentIntensity).
const ROLES = {
  tegel:     { r: 0.24, m: 0.0 },               // geglazuurde wandtegel
  terrazzo:  { r: 0.55, m: 0.0 },
  steen:     { r: 0.86, m: 0.0 },               // noppentegels, natuursteen
  beton:     { r: 0.9,  m: 0.0 },
  plafond:   { r: 0.92, m: 0.0 },
  verf:      { r: 0.45, m: 0.04 },              // geverfd staal: zuilen, balken (verf is geen metaal)
  metaal:    { r: 0.36, m: 0.85 },              // geborsteld rvs: leuningen, banken, automaten
  donkermetaal: { r: 0.5, m: 0.6 },             // rails, roosters
  glas:      { r: 0.06, m: 0.0, env: 1.4 },
  lak:       { r: 0.3,  m: 0.08, env: 1.15 },   // treinlak (BVG-geel)
  rubber:    { r: 0.92, m: 0.0 },
  tunnel:    { r: 0.96, m: 0.0, env: 0.6 },
  hout:      { r: 0.7,  m: 0.0 },
  stof:      { r: 0.9,  m: 0.0 },               // kleding, bekleding
  huid:      { r: 0.62, m: 0.0 },
  grijs:     { r: 0.55, m: 0.25 },              // neutraal grijs zonder naam: apparaten, kasten, randen
  licht:     { r: 0.5,  m: 0.0 },
  standaard: { r: 0.8,  m: 0.0 },
};

// Blender-stations (GLB) en -treinen: op materiaalnaam.
const BY_NAME = {
  Ceramic: 'tegel', IvoryGlaze: 'tegel', BlueGlaze: 'tegel', Terrazzo: 'terrazzo', TactileStone: 'steen',
  TrackBed: 'beton', Ceiling: 'plafond', StationSteel: 'verf', BrushedMetal: 'metaal', BenchTimber: 'hout',
  BVG_Painted_Metal_Atlas: 'lak', Smoked_Safety_Glass: 'glas', WarmFluorescent: 'licht', Warm_LED: 'licht',
};
// Objectnamen (mesh of een voorouder), voor code-gebouwde onderdelen.
const NAME_RULES = [
  [/glass|glas|window|fenster|scheibe/i, 'glas'],
  [/tunnel/i, 'tunnel'],
  [/rail(?!ing)|gleis|track|schiene/i, 'donkermetaal'],
  [/handrail|railing|pole|stange|leuning|metal|steel|chrome|automat|machine|trash|mülleimer/i, 'metaal'],
  [/bench|bank|wood|holz/i, 'hout'],
  [/tile|fliese|kachel|wall/i, 'tegel'],
  [/floor|boden|platform|perron/i, 'terrazzo'],
  [/roof|ceiling|decke|plafond/i, 'plafond'],
  [/column|pillar|stütze|zuil|beam|balk/i, 'verf'],
  [/^(face|head|ear[lr]?|hand|arm|skin)(_\d+)?$/i, 'huid'],
  [/npc|traveler|person|body|shirt|jacket|pants|coat/i, 'stof'],
];
const _hsl = {};
function roleByColor(m) {
  if (m.transparent && m.opacity < 0.7) return 'glas';
  m.color.getHSL(_hsl);
  const { h, s, l } = _hsl;
  if (l < 0.12) return 'rubber';
  if (s > 0.55 && h > 0.11 && h < 0.17 && l > 0.35) return 'lak';      // BVG-geel
  if (s < 0.1 && l > 0.3 && l < 0.62) return 'grijs';                   // neutraal grijs: meestal metaal/apparaat
  if (s < 0.14 && l >= 0.62) return 'tegel';                            // licht neutraal: wand/tegel
  return 'standaard';
}
function roleOf(m, mesh) {
  if (m.name && BY_NAME[m.name]) return BY_NAME[m.name];
  for (let o = mesh, i = 0; o && i < 5; o = o.parent, i++) {
    if (!o.name) continue;
    for (const [re, role] of NAME_RULES) if (re.test(o.name)) return role;
  }
  return roleByColor(m);
}

// ── Lambert → Standard op dezelfde plek ─────────────────────────────────────────────────────────────────
let template = null;
function toStandard(m) {
  template ||= new THREE.MeshStandardMaterial();
  const keep = new Set(['uuid', 'id', 'name', 'type', 'userData']);
  Object.setPrototypeOf(m, THREE.MeshStandardMaterial.prototype);
  for (const k of Object.keys(m)) if (!(k in template) && !k.startsWith('_') && k !== 'version') delete m[k];
  for (const k of Object.keys(template)) {
    if (keep.has(k) || k in m) continue;
    const v = template[k];
    m[k] = v && typeof v === 'object' ? (v.clone ? v.clone() : { ...v }) : v;
  }
  delete m.isMeshLambertMaterial;
  m.isMeshStandardMaterial = true;
  m.type = 'MeshStandardMaterial';
  m.defines = { STANDARD: '' };
  m.userData.__fromLambert = true;
  m.needsUpdate = true;
}

// ── Texturen ────────────────────────────────────────────────────────────────────────────────────────────
let maxAniso = 4, renderer = null;
function noise(ctx, w, h, amount, alpha) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  let seed = 1337;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; d[i + 3] = alpha ?? d[i + 3]; }
  ctx.putImageData(img, 0, 0);
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
// Plafond: gestucte/betonnen panelen van 3 m, donkere voegen, roetzweem en kleine vlekken.
let ceilingTex = null;
function ceiling() {
  return ceilingTex ||= canvasTex(512, 512, (ctx, w) => {
    ctx.fillStyle = '#e4e2da'; ctx.fillRect(0, 0, w, w);
    let seed = 42; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {               // zachte vlekken (vocht, roet van treinen)
      const x = rnd() * w, y = rnd() * w, r = 20 + rnd() * 90, a = 0.015 + rnd() * 0.03;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(70,64,56,${a})`); g.addColorStop(1, 'rgba(70,64,56,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    noise(ctx, w, w, 14);
    // voeg rondom het paneel (één paneel per 3 m), met een lichte rand aan één kant voor wat diepte
    ctx.fillStyle = 'rgba(70,66,60,0.42)'; ctx.fillRect(0, 0, 3, w); ctx.fillRect(0, 0, w, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(3, 0, 1, w); ctx.fillRect(0, 3, w, 1);
  });
}
// Ruwheidskaart uit een bestaande kleurtextuur: donkere voegen ruw, tegelvlak glad (groen kanaal = ruwheid).
const roughCache = new WeakMap();
function roughnessFrom(tex, smooth, rough) {
  if (roughCache.has(tex)) return roughCache.get(tex);
  let out = null;
  try {
    const img = tex.image, w = img?.width, h = img?.height;
    if (w && h && w <= 1024 && h <= 1024) {
      out = canvasTex(w, h, ctx => {
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, w, h), d = id.data;
        let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
        const mean = sum / (d.length / 4);
        for (let i = 0; i < d.length; i += 4) {
          const l = d[i] + d[i + 1] + d[i + 2];
          const t = Math.max(0, Math.min(1, (mean - l) / (mean * 0.18)));   // 18% donkerder dan gemiddeld = voeg
          const v = Math.round(255 * (smooth + (rough - smooth) * t));
          d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
        ctx.putImageData(id, 0, 0);
      }, false);
      out.wrapS = tex.wrapS; out.wrapT = tex.wrapT; out.repeat.copy(tex.repeat); out.offset.copy(tex.offset);
      out.flipY = tex.flipY; out.needsUpdate = true;
    }
  } catch { out = null; }                         // bv. textuur van een ander domein: dan zonder kaart
  roughCache.set(tex, out);
  return out;
}
// Doos-projectie: UV's uit de positie (voor GLB-delen zonder UV, zoals het plafond). size = meters per tegel.
function boxUV(geo, size) {
  if (geo.userData.__boxUV) return;
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  if (!pos || !nrm) return;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = pos.getX(i); v = pos.getZ(i); }
    else if (ax >= az) { u = pos.getZ(i); v = pos.getY(i); }
    else { u = pos.getX(i); v = pos.getY(i); }
    uv[i * 2] = u / size; uv[i * 2 + 1] = v / size;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.userData.__boxUV = true;
}

// ── Toepassen ───────────────────────────────────────────────────────────────────────────────────────────
const done = new WeakSet(), counts = { converted: 0, tuned: 0, emissive: 0, ceilings: 0, roughMaps: 0, scans: 0 };
const byRole = {};
let game = null, quality = () => 'midden';

function applyRole(m, role) {
  const p = ROLES[role] || ROLES.standaard;
  m.roughness = p.r; m.metalness = p.m;
  if (p.env != null) m.envMapIntensity = p.env;
  byRole[role] = (byRole[role] || 0) + 1;
}

function treat(m, mesh) {
  if (done.has(m)) return true;
  if (m.isMeshLambertMaterial) {
    if (quality() === 'laag') return false;      // later opnieuw proberen (na kwaliteitswissel)
    toStandard(m); counts.converted++;
  }
  done.add(m);
  if (m.map && m.map.anisotropy < maxAniso) { m.map.anisotropy = maxAniso; m.map.needsUpdate = true; }
  if (!m.isMeshStandardMaterial || m.isMeshPhysicalMaterial && !m.name) return true;
  const fromGLB = !!BY_NAME[m.name];
  const role = roleOf(m, mesh);
  // Bestaande code-PBR-materialen (GfxV3, Phase125, Blender-props) met eigen waarden alleen bijsturen
  // als ze in een herkende rol vallen; anders laten zoals ze zijn.
  if (m.userData.__fromLambert || fromGLB || role !== 'standaard') { applyRole(m, role); counts.tuned++; }
  if (role === 'tegel' && m.map) { const rm = roughnessFrom(m.map, 0.18, 0.85); if (rm) { m.roughnessMap = rm; m.roughness = 1; counts.roughMaps++; } }
  if (role === 'terrazzo' && m.map) { const rm = roughnessFrom(m.map, 0.45, 0.8); if (rm) { m.roughnessMap = rm; m.roughness = 1; counts.roughMaps++; } }
  if (m.name === 'Ceiling') {
    m.map = ceiling(); m.color.setHex(0xffffff); counts.ceilings++;
  }
  // Lichtbronnen: TL-buizen en ledstrips gloeien.
  if (m.name === 'WarmFluorescent' || m.name === 'Warm_LED') {
    m.emissive.copy(m.color); m.emissiveIntensity = m.name === 'Warm_LED' ? 0.6 : 1.0; counts.emissive++;
  }
  m.needsUpdate = true;
  return true;
}

function treatMesh(o) {
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  for (const m of mats) {
    if (!m || m.isMeshBasicMaterial || m.isSpriteMaterial || m.isShaderMaterial || m.isLineBasicMaterial || m.isPointsMaterial) continue;
    if (m.name === 'Ceiling' && !o.geometry.attributes.uv) boxUV(o.geometry, 3);
    treat(m, o);
  }
}

// Scan verdeeld over frames: eigen stapel, zodat een ronde over meerdere frames kan lopen.
let stack = null, frameId = null;
function startScan() { if (!stack) { stack = [game.scene]; counts.scans++; } }
function step() {
  if (!stack) return;
  let n = 0;
  while (stack.length && n < PER_FRAME) {
    const o = stack.pop(); n++;
    if (o.isMesh && o.material) treatMesh(o);
    const c = o.children; for (let i = 0; i < c.length; i++) stack.push(c[i]);
  }
  if (!stack.length) stack = null;
}

export const MaterialBase = {
  install(g, getQuality) {
    if (game) return;
    game = g; renderer = g.renderer;
    if (getQuality) quality = getQuality;
    maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() || 1);
    frameId = Tick.frame('MaterialBase', { after: step });
    Tick.every('materials.scan', SCAN_MS, startScan);
    startScan();
  },
  /** Na een kwaliteitswissel: direct een nieuwe ronde (laag → midden zet de Lambert-materialen om). */
  rescan() { if (game) startScan(); },
  status() { return { ...counts, byRole: { ...byRole } }; },
  roles: ROLES,
};
globalThis.BerlinMaterials = MaterialBase;
