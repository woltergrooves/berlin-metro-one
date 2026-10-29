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
// G3b: ook de stationsprofiel-texturen (wand, plafond, zuil, glaswand) worden hier gemaakt: MaterialBase.station.
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
  // G3b (StationProfiles.js): eigen onderdelen per stationsprofiel
  G3b_Tile: 'tegel', G3b_Paint: 'verf', G3b_Stone: 'steen', G3b_Polished: 'tegel', G3b_Glass: 'glas', G3b_Plaster: 'plafond',
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

// ── G3b: stationstexturen per stationsprofiel (StationProfiles.js levert de beschrijving) ──────────────
// Alles procedureel (canvas), geen foto's. Elke textuur wordt per beschrijving één keer gemaakt (cache op
// JSON-sleutel) en hoort bij het station-sjabloon: BlenderStationsV1.trim() ruimt ze mee op.
const stationTexCache = new Map();
function cached(kind, spec, make) {
  const key = kind + JSON.stringify(spec);
  let t = stationTexCache.get(key);
  if (t && t.image) return t;
  t = make(); t.userData.g3b = kind;
  t.addEventListener?.('dispose', () => stationTexCache.delete(key));
  stationTexCache.set(key, t);
  return t;
}
function rngOf(seed) { let s = (seed >>> 0) % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function seedOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
function rgbOf(hex) { const n = parseInt(String(hex).replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function css(hex, f = 1, a = 1) { const [r, g, b] = rgbOf(hex).map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`; }

// Tegelvlak tekenen in een rechthoek (px). pattern bepaalt maat en verband; m2px = pixels per meter.
const TILE = { square: [0.15, 0.15], rect: [0.24, 0.12], vrect: [0.12, 0.24], large: [0.6, 0.3], brick: [0.25, 0.065],
  mosaic: [0.05, 0.05], panel: [1.2, 0.8], marble: [1.0, 1.25], diagonal: [0.2, 0.2], relief: [0.4, 0.4], plain: [0, 0] };
function tileField(ctx, x0, y0, w, h, sx, sy, spec, rnd) {
  const pat = spec.t || 'square', base = spec.c, g = spec.g || null;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = css(base); ctx.fillRect(x0, y0, w, h);
  if (pat === 'plain') { ctx.restore(); return; }
  const [tw, th] = TILE[pat] || TILE.square, pw = tw * sx, ph = th * sy;
  const jit = spec.jit ?? (pat === 'brick' ? 0.16 : pat === 'mosaic' ? 0.1 : 0.05);
  const grout = g ? css(g) : css(base, pat === 'brick' ? 0.55 : 0.78);
  const gp = pat === 'brick' ? 2 : pat === 'panel' || pat === 'large' || pat === 'marble' ? 2 : 1;
  if (pat === 'diagonal') {
    ctx.translate(x0 + w / 2, y0 + h / 2); ctx.rotate(Math.PI / 4);
    const R = Math.hypot(w, h) / 2 + pw;
    for (let y = -R; y < R; y += ph) for (let x = -R; x < R; x += pw) {
      ctx.fillStyle = grout; ctx.fillRect(x, y, pw, ph);
      const f = 1 + (rnd() - 0.5) * 2 * jit; ctx.fillStyle = css(spec.c2 && rnd() < 0.18 ? spec.c2 : base, f); ctx.fillRect(x + gp, y + gp, pw - gp, ph - gp);
    }
    ctx.restore(); return;
  }
  let row = 0;
  for (let y = y0 + h; y > y0 - ph; y -= ph, row++) {          // van onder naar boven: hele tegels op vloerhoogte
    const off = (pat === 'brick' || pat === 'rect' && spec.bond) && row % 2 ? pw / 2 : 0;
    for (let x = x0 - off; x < x0 + w; x += pw) {
      ctx.fillStyle = grout; ctx.fillRect(x, y - ph, pw, ph);
      let col = base;
      if (spec.c2 && pat === 'mosaic' && rnd() < (spec.mix ?? 0.25)) col = spec.c2;
      const f = 1 + (rnd() - 0.5) * 2 * jit;
      ctx.fillStyle = css(col, f); ctx.fillRect(x + gp, y - ph + gp, pw - gp, ph - gp);
      if (pat !== 'brick' && pat !== 'mosaic' && pw > 6) {      // glazuur: lichte bovenrand
        ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x + gp, y - ph + gp, pw - gp, Math.max(1, ph * 0.12));
      }
      if (pat === 'relief') {                                   // reliëftegels (Pankstraße): schaduw rechtsonder
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + pw * 0.55, y - ph * 0.45, pw * 0.35, ph * 0.35);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + pw * 0.15, y - ph * 0.85, pw * 0.35, ph * 0.35);
      }
    }
  }
  if (pat === 'marble') {                                        // aders
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = css(spec.c2 || base, 1.35, 0.35 + rnd() * 0.3); ctx.beginPath();
      let px = x0 + rnd() * w, py = y0 + rnd() * h; ctx.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += (rnd() - 0.3) * 60; py += (rnd() - 0.5) * 40; ctx.lineTo(px, py); }
      ctx.stroke();
    }
  }
  ctx.restore();
}
// Wand: W meter breed (herhaalt langs het spoor), van y0 tot y0+H hoog (canvas boven = plafond).
function wallTexture(spec) {
  return cached('wall', spec, () => canvasTex(512, 512, (ctx, w, h) => {
    const W = spec.W || 3, H = spec.H || 4.4, Y0 = spec.y0 ?? -0.2, sx = w / W, sy = h / H;
    const py = y => h - (y - Y0) * sy, rnd = rngOf(seedOf(JSON.stringify(spec)));
    tileField(ctx, 0, 0, w, h, sx, sy, spec, rnd);
    if (spec.dado) tileField(ctx, 0, py(spec.dado.h), w, h - py(spec.dado.h), sx, sy, { t: spec.t, ...spec.dado }, rnd);
    for (const [c, y, bh] of spec.bands || []) { ctx.fillStyle = css(c); ctx.fillRect(0, py(y + bh / 2), w, bh * sy); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, py(y + bh / 2), w, 1); }
    const m = spec.motif;
    if (spec.frames) {                                          // gekleurde kaders (Alexanderplatz U2)
      const f = spec.frames, lw = (f.lw || 0.07) * sx;
      ctx.strokeStyle = css(f.c); ctx.lineWidth = lw;
      ctx.strokeRect(0.3 * sx + lw / 2, py(f.y1) + lw / 2, w - 0.6 * sx - lw, (f.y1 - f.y0) * sy - lw);
    }
    if (m?.k === 'gallery') {                                   // ingelijste historische 'foto' (procedureel, sepia)
      const fx = w / 2 - 0.9 * sx, fy = py(2.45), fw = 1.8 * sx, fh = 1.25 * sy;
      ctx.fillStyle = css(m.frame || '#3b2f25'); ctx.fillRect(fx - 6, fy - 6, fw + 12, fh + 12);
      const gr = ctx.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, '#d8c9a8'); gr.addColorStop(0.6, '#b9a582'); gr.addColorStop(1, '#8a7558');
      ctx.fillStyle = gr; ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = 'rgba(70,52,36,0.75)';
      for (let x = fx; x < fx + fw - 8;) { const bw = 8 + rnd() * 26, bh = fh * (0.2 + rnd() * 0.45); ctx.fillRect(x, fy + fh - bh, bw - 2, bh); x += bw; }
      ctx.fillStyle = 'rgba(40,30,22,0.5)'; ctx.fillRect(fx, fy + fh * 0.86, fw, fh * 0.14);
    }
    if (m?.k === 'window') {                                    // lichtvensters met blauw kader (Spittelmarkt)
      const fx = w / 2 - 0.85 * sx, fy = py(3.35), fw = 1.7 * sx, fh = 2.2 * sy;
      ctx.fillStyle = css(m.c); ctx.fillRect(fx - 0.18 * sx, fy - 0.18 * sy, fw + 0.36 * sx, fh + 0.36 * sy);
      const gr = ctx.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, '#f4f8fb'); gr.addColorStop(1, '#c9d9e6');
      ctx.fillStyle = gr; ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = css(m.c, 0.8); for (let i = 1; i < 3; i++) ctx.fillRect(fx + fw * i / 3 - 2, fy, 4, fh);
    }
    if (m?.k === 'trees') {                                     // mozaïekboom (Franz-Neumann-Platz)
      const cx = w / 2, top = py(3.4), trunkTop = py(2.2), bottom = py(spec.dado?.h ?? 0.3);
      ctx.fillStyle = css(m.c, 0.75); ctx.fillRect(cx - 4, trunkTop, 8, bottom - trunkTop);
      const ts = 0.05 * sx;
      for (let a = -1.1; a <= 1.1; a += 0.09) for (let r = 0.2; r < 1.25; r += 0.07) {
        const x = cx + Math.sin(a) * r * sx * 0.95, y = trunkTop - Math.cos(a) * r * sy * 0.95;
        if (y < top) continue;
        ctx.fillStyle = css(rnd() < 0.15 && m.c2 ? m.c2 : m.c, 0.85 + rnd() * 0.3); ctx.fillRect(x, y, ts, ts);
      }
    }
    if (m?.k === 'flags') {                                     // Noorse vlaggen (Osloer Straße)
      const fw = 1.9 * sx, fh = 1.3 * sy, fx = w / 2 - fw / 2, fy = py(2.6);
      ctx.fillStyle = '#ba0c2f'; ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(fx + fw * 0.28, fy, fw * 0.16, fh); ctx.fillRect(fx, fy + fh * 0.4, fw, fh * 0.2);
      ctx.fillStyle = '#00205b'; ctx.fillRect(fx + fw * 0.31, fy, fw * 0.1, fh); ctx.fillRect(fx, fy + fh * 0.44, fw, fh * 0.12);
    }
    if (m?.k === 'diamonds') {                                  // ruitband in de tegels (Karl-Bonhoeffer)
      ctx.fillStyle = css(m.c);
      for (let x = 0.15 * sx; x < w; x += 0.6 * sx) { const y = py(2.9); ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.fill(); }
      ctx.fillRect(w / 2 - 3, py(3.3), 6, (3.3 - 0.8) * sy);
    }
    // vuil: donkerder onderaan (remstof van de treinen), lichte ruis
    const gr = ctx.createLinearGradient(0, py(0.8), 0, h); gr.addColorStop(0, 'rgba(30,26,22,0)'); gr.addColorStop(1, 'rgba(30,26,22,0.28)');
    ctx.fillStyle = gr; ctx.fillRect(0, py(0.8), w, h - py(0.8));
    noise(ctx, w, h, 9);
  }));
}
// Plafond: één tegel = 3 × 3 m (zelfde maat als de doos-UV). Types: flat, kappen (gewelfjes tussen
// balken), coffered (cassette), slats (latten), panel (metalen panelen), steel/wood/concrete (open-air).
function ceilingTexture(spec) {
  return cached('ceil', spec, () => canvasTex(256, 256, (ctx, w) => {
    const c = spec.c || '#e4e2da', t = spec.t || 'flat', rnd = rngOf(seedOf(t + c));
    ctx.fillStyle = css(c); ctx.fillRect(0, 0, w, w);
    if (t === 'kappen') {                                       // licht in het midden van elk gewelfje, donker bij de balken
      const gr = ctx.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, css(c, 0.5)); gr.addColorStop(0.15, css(c, 0.82)); gr.addColorStop(0.5, css(c, 1.08)); gr.addColorStop(0.85, css(c, 0.82)); gr.addColorStop(1, css(c, 0.5));
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, w);
    } else if (t === 'coffered') {
      const n = 2, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const gr = ctx.createRadialGradient(i * s + s / 2, j * s + s / 2, 4, i * s + s / 2, j * s + s / 2, s * 0.7);
        gr.addColorStop(0, css(c, 1.08)); gr.addColorStop(1, css(c, 0.78)); ctx.fillStyle = gr; ctx.fillRect(i * s + 8, j * s + 8, s - 16, s - 16);
        ctx.fillStyle = css(c, 0.6); ctx.fillRect(i * s, j * s, s, 8); ctx.fillRect(i * s, j * s, 8, s);
      }
    } else if (t === 'slats') {
      for (let y = 0; y < w; y += 12) { ctx.fillStyle = css(c, 0.85 + rnd() * 0.3); ctx.fillRect(0, y, w, 10); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y + 10, w, 2); }
    } else if (t === 'panel') {
      ctx.fillStyle = css(c, 0.72); for (let x = 0; x < w; x += w / 5) ctx.fillRect(x, 0, 3, w); ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, w / 2, w, 3);
    } else if (t === 'steel') {                                 // gegolfd plaatstaal / glasroeden (open-air)
      for (let y = 0; y < w; y += 16) { ctx.fillStyle = css(c, 1.12); ctx.fillRect(0, y, w, 4); ctx.fillStyle = css(c, 0.82); ctx.fillRect(0, y + 10, w, 3); }
    } else if (t === 'wood') {
      for (let y = 0; y < w; y += 9) { ctx.fillStyle = css(c, 0.8 + rnd() * 0.35); ctx.fillRect(0, y, w, 8); }
      ctx.fillStyle = css(c, 0.5); ctx.fillRect(0, 0, 6, w);
    } else {
      for (let i = 0; i < 40; i++) {
        const x = rnd() * w, y = rnd() * w, r = 12 + rnd() * 50, gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(70,64,56,${0.015 + rnd() * 0.03})`); gr.addColorStop(1, 'rgba(70,64,56,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.fillStyle = 'rgba(70,66,60,0.35)'; ctx.fillRect(0, 0, 2, w); ctx.fillRect(0, 0, w, 2);
    }
    noise(ctx, w, w, 10);
  }));
}
// Zuilen: één textuur per zijvlak (BoxGeometry/Cylinder-UV 0..1). Types: paint (geklonken staal),
// tiles, marble, granite, polished (zwart graniet), brick, mosaic (ornament), plain.
function columnTexture(spec) {
  return cached('col', spec, () => canvasTex(128, 512, (ctx, w, h) => {
    const c = spec.c, t = spec.t || 'paint', rnd = rngOf(seedOf(t + c));
    ctx.fillStyle = css(c); ctx.fillRect(0, 0, w, h);
    if (t === 'paint') {                                        // klinknagels langs de randen en naadbanden
      for (let y = 6; y < h; y += 14) for (const x of [9, w - 11]) { ctx.fillStyle = css(c, 1.35); ctx.fillRect(x, y, 3, 3); ctx.fillStyle = css(c, 0.6); ctx.fillRect(x + 2, y + 2, 2, 2); }
      for (let y = 96; y < h; y += 128) { ctx.fillStyle = css(c, 0.75); ctx.fillRect(0, y, w, 3); for (let x = 6; x < w; x += 12) { ctx.fillStyle = css(c, 1.3); ctx.fillRect(x, y - 6, 3, 3); } }
      ctx.fillStyle = css(c, 0.85); ctx.fillRect(w / 2 - 1, 0, 2, h);
    } else if (t === 'tiles' || t === 'brick') {
      tileField(ctx, 0, 0, w, h, w / 0.6, h / 3.8, { t: t === 'brick' ? 'brick' : 'square', c, g: spec.g }, rnd);
      if (spec.corner) { ctx.fillStyle = css(spec.corner); ctx.fillRect(0, 0, 10, h); ctx.fillRect(w - 10, 0, 10, h); }
      if (spec.cap) { ctx.fillStyle = css(spec.cap); ctx.fillRect(0, 0, w, 26); ctx.fillRect(0, h - 22, w, 22); }
    } else if (t === 'marble' || t === 'granite' || t === 'polished') {
      const d = ctx.getImageData(0, 0, w, h), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const n = (rnd() - 0.5) * (t === 'granite' ? 60 : t === 'marble' ? 8 : 14); p[i] += n; p[i + 1] += n; p[i + 2] += n; }
      ctx.putImageData(d, 0, 0);
      if (t === 'marble') { ctx.lineWidth = 1.3; for (let i = 0; i < 12; i++) { ctx.strokeStyle = css(c, 1.5, 0.45); ctx.beginPath(); let x = rnd() * w, y = rnd() * h; ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 40; y += rnd() * 60; ctx.lineTo(x, y); } ctx.stroke(); } }
      if (t === 'polished') { const gr = ctx.createLinearGradient(0, 0, w, 0); gr.addColorStop(0.2, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); }
    } else if (t === 'mosaic') {                                // ornamentpaneel met boog (Residenzstraße)
      tileField(ctx, 0, 0, w, h, w / 0.6, h / 3.8, { t: 'mosaic', c, c2: spec.c2, mix: 0.2 }, rnd);
      ctx.fillStyle = css(spec.c3 || '#e8dcb4'); ctx.beginPath(); ctx.moveTo(18, h - 40); ctx.lineTo(18, 150); ctx.arc(w / 2, 150, w / 2 - 18, Math.PI, 0); ctx.lineTo(w - 18, h - 40); ctx.fill();
      for (let y = 150; y < h - 50; y += 18) for (let x = 26; x < w - 26; x += 12) { ctx.fillStyle = css((x + y) % 3 ? spec.c2 || c : c, 0.8 + rnd() * 0.4); ctx.fillRect(x, y, 8, 8); }
    }
    noise(ctx, w, h, 8);
  }));
}
// Zijwanden van open-air stations: onderaan dicht (paneel), daarboven ramen. RGBA: glas half doorzichtig.
// Eén tegel = 6 m breed × 3,9 m hoog.
function sidePanelTexture(spec) {
  return cached('side', spec, () => canvasTex(512, 384, (ctx, w, h) => {
    const sx = w / 6, sy = h / 3.9, low = spec.low ?? 1.2, frame = css(spec.c);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = frame; ctx.fillRect(0, h - low * sy, w, low * sy);
    ctx.fillStyle = css(spec.c, 0.8); for (let x = 0; x < w; x += 1.5 * sx) ctx.fillRect(x, h - low * sy, 3, low * sy);
    const top = h - 3.5 * sy, bottom = h - (low + 0.15) * sy;
    ctx.fillStyle = frame; ctx.fillRect(0, top - 0.25 * sy, w, 0.25 * sy); ctx.fillRect(0, bottom, w, 0.15 * sy);
    for (let i = 0; i < 4; i++) {
      const x = i * 1.5 * sx + 0.14 * sx, ww = 1.22 * sx;
      ctx.fillStyle = frame; ctx.fillRect(x - 0.14 * sx, top, 0.14 * sx, bottom - top);          // stijl tussen de ramen
      ctx.beginPath();
      if (spec.win === 'arched') { ctx.moveTo(x, bottom); ctx.lineTo(x, top + ww / 2); ctx.arc(x + ww / 2, top + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(x + ww, bottom); ctx.closePath(); }
      else ctx.rect(x, top, ww, bottom - top);
      ctx.fillStyle = 'rgba(160,190,204,0.5)'; ctx.fill();
      ctx.lineWidth = 7; ctx.strokeStyle = frame; ctx.stroke();
      if (spec.win === 'arched') { ctx.fillStyle = frame; ctx.fillRect(x, top, 7, ww / 2); ctx.fillRect(x + ww - 7, top, 7, ww / 2); }
      ctx.fillStyle = frame; ctx.fillRect(x + ww / 2 - 4, top + (spec.win === 'arched' ? ww / 2 : 0), 8, bottom - top); // roeden
      for (const f of [0.33, 0.66]) ctx.fillRect(x, top + (bottom - top) * f, ww, 6);
    }
  }));
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
  if (m.name === 'Ceiling' && !m.userData.g3b) {            // G3b-plafonds hebben een eigen stationstextuur
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
  status() { return { ...counts, byRole: { ...byRole }, stationTextures: stationTexCache.size }; },
  /** G3b: stationstexturen per profiel (aangeroepen door StationProfiles.js). */
  station: {
    wall(spec) { const t = wallTexture(spec); t.wrapT = THREE.ClampToEdgeWrapping; return t; },
    ceiling: ceilingTexture,
    column(spec) { const t = columnTexture(spec); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; },
    side(spec) { const t = sidePanelTexture(spec); t.wrapT = THREE.ClampToEdgeWrapping; return t; },
    boxUV,
  },
  roles: ROLES,
};
globalThis.BerlinMaterials = MaterialBase;
