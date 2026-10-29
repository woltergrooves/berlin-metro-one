// Mijlpaal 0 / G3b: stationsprofielen — elk U2- en U8-station krijgt zijn herkenbare kenmerken.
//
// De 53 Blender-stations (public/assets/stations, G-reeks oktober 2026) delen één opbouw: wand, zuilen,
// plafond, lampen. Tot G3b zagen ze er daardoor bijna hetzelfde uit (alleen wand- en accentkleur
// verschilden). Dit bestand beschrijft per station wat je in het echt herkent — niet 1-op-1, wel direct
// herkenbaar — en past dat één keer toe op het geladen sjabloon (dus niet per frame):
//   - wand: tegelkleur en -verband (vierkant, liggend, groot, baksteen, mozaïek, marmer, diagonaal, reliëf,
//     panelen), sokkel, kleurbanden, kaders en motieven (bomen, vlaggen, vensters, ingelijste foto's);
//   - zuilen: vorm en afwerking (geklonken staal, betegeld, marmer, graniet, gepolijst zwart, baksteen,
//     ornament, glad), met kapiteel en voet;
//   - plafond: vlak, kappen (balken met gewelfjes), cassette, latten, panelen, gewelf, voute;
//   - lampen: TL-buizen, bollampen of schijven;
//   - naamborden: BVG-hangborden boven het perron + wandbordstijl (zwart emaille, wit, blauw, reliëf);
//   - open-air: kleur van het staal, het dak en zijwanden met ramen.
//
// Bronnen (alleen als referentie, niets overgenomen): referentiefoto's uit stations.json
// (berliner-untergrundbahn.de, Wikimedia Commons). Alle texturen zijn procedureel en worden gemaakt in
// MaterialBase.js (eigenaar van stationstexturen). Licht, tone mapping en mist blijven bij RenderBase.js.
//
// Status: BerlinStationProfiles.status(); per station: BerlinStationProfiles.get('U2', 'stadtmitte').
import * as THREE from 'three';
import { MaterialBase } from './MaterialBase.js';

const VERSION = 1;
const LINE_COLOR = { U2: '#da421e', U8: '#224f86' };

// ── Profielen ───────────────────────────────────────────────────────────────────────────────────────────
// wall: c kleur, t verband, g voeg, c2 tweede kleur, dado {c,h,t} sokkel, bands [[kleur, hoogte, dikte]],
//       frames {c,y0,y1,lw}, motif {k:gallery|window|trees|flags|diamonds}, W herhaalbreedte (m)
// col:  s vorm (riveted|iron|tiled|marble|granite|polished|brick|mosaic|doric|plain|none), c kleur, cap
// ceil: t type (flat|kappen|beams|coffered|slats|panel|vault|coved), c kleur, beam balkkleur, every (m)
// lamps: tubes|globe|disc · sign: black|white|blue|relief|red · floor: tint voor de terrazzovloer
// open: {steel, roof, rt (steel|wood|concrete), panels {c, win: rect|arched}}
const P = {
  // ── U2 (Pankow → Ruhleben) ──
  'U2:pankow': { wall: { c: '#eef0ec', t: 'large', dado: { c: '#2b3f7a', h: 1.1 }, bands: [['#2b3f7a', 3.95, 0.22]] }, col: { s: 'tiled', c: '#f1f1ec', cap: '#2b3f7a' }, ceil: { t: 'flat', c: '#ece9e0' }, lamps: 'tubes', sign: 'white' },
  'U2:vinetastrasse': { wall: { c: '#e2d2a2', t: 'square', dado: { c: '#3c3a36', h: 0.75 }, bands: [['#a8352c', 2.05, 0.06]] }, col: { s: 'riveted', c: '#b3342b' }, ceil: { t: 'flat', c: '#e9e6dc' }, lamps: 'tubes', sign: 'black' },
  'U2:schoenhauser-allee': { open: { steel: '#3f5c4c', roof: '#41574b', rt: 'steel', panels: { c: '#4c6a58', win: 'rect' } }, lamps: 'tubes', sign: 'white' },
  'U2:eberswalder-strasse': { open: { steel: '#2f4a3e', roof: '#30463b', rt: 'steel', panels: { c: '#3e6650', win: 'arched' } }, lamps: 'tubes', sign: 'white' },
  'U2:senefelderplatz': { wall: { c: '#5e6974', t: 'diagonal', g: '#3a434c', c2: '#8c99a6', dado: { c: '#3d454d', h: 0.7, t: 'rect' } }, col: { s: 'iron', c: '#1f2b48' }, ceil: { t: 'kappen', c: '#d9d8d2', beam: '#2a3550' }, lamps: 'tubes', sign: 'black' },
  'U2:rosa-luxemburg-platz': { wall: { c: '#e6c13f', t: 'square', dado: { c: '#3a3832', h: 0.7 }, bands: [['#2b2b2b', 3.9, 0.08]] }, col: { s: 'riveted', c: '#1c1e21' }, ceil: { t: 'kappen', c: '#e2dfd5', beam: '#26282b' }, lamps: 'tubes', sign: 'black' },
  'U2:alexanderplatz': { wall: { c: '#e4e2db', t: 'rect', W: 3, frames: { c: '#a8352d', y0: 0.55, y1: 3.2, lw: 0.07 }, bands: [['#a8352d', 3.75, 0.1]] }, col: { s: 'riveted', c: '#8e2a25' }, ceil: { t: 'kappen', c: '#e6e0d2', beam: '#8e2a25' }, lamps: 'tubes', sign: 'red' },
  'U2:klosterstrasse': { wall: { c: '#e3d6a4', t: 'square', W: 6, dado: { c: '#7a6a45', h: 0.5 }, bands: [['#2f5aa0', 3.62, 0.12], ['#d9a93a', 3.47, 0.06]], motif: { k: 'gallery' } }, col: { s: 'tiled', c: '#dcc681', cap: '#b0904a' }, ceil: { t: 'kappen', c: '#ece5cc', beam: '#c7b17a' }, lamps: 'tubes', sign: 'black' },
  'U2:maerkisches-museum': { wall: { c: '#ebe8de', t: 'rect', W: 7, bands: [['#486b45', 0.6, 0.08]], motif: { k: 'gallery', frame: '#2f2a24' } }, col: { s: 'none' }, ceil: { t: 'flat', c: '#ebe8de' }, lamps: 'tubes', sign: 'black' },
  'U2:spittelmarkt': { wall: { c: '#f1f1ec', t: 'rect', W: 4.5, dado: { c: '#43464a', h: 0.6, t: 'brick' }, motif: { k: 'window', c: '#2f57a6' } }, col: { s: 'riveted', c: '#24387e' }, ceil: { t: 'kappen', c: '#eeeeea', beam: '#d8d8d2' }, lamps: 'tubes', sign: 'blue' },
  'U2:hausvogteiplatz': { wall: { c: '#b8b9b3', t: 'square', dado: { c: '#5a5b57', h: 0.7 }, bands: [['#d5b72e', 2.1, 0.07]] }, col: { s: 'riveted', c: '#3c4541' }, ceil: { t: 'kappen', c: '#c9c8c0', beam: '#3c4541' }, lamps: 'tubes', sign: 'black' },
  'U2:stadtmitte': { wall: { c: '#e7d59c', t: 'square', dado: { c: '#5c5240', h: 0.6 }, bands: [['#b0302a', 2.0, 0.06]] }, col: { s: 'riveted', c: '#b0302a' }, ceil: { t: 'kappen', c: '#efe7cf', beam: '#b0302a' }, lamps: 'tubes', sign: 'black' },
  'U2:anton-wilhelm-amo-strasse': { wall: { c: '#7b3b33', t: 'marble', c2: '#a86a5c' }, col: { s: 'marble', c: '#6f342d' }, ceil: { t: 'flat', c: '#d9d3c8' }, floor: '#b0786a', lamps: 'tubes', sign: 'black' },
  'U2:potsdamer-platz': { wall: { c: '#ecece5', t: 'rect', bands: [['#3d7250', 0.55, 0.08], ['#3d7250', 3.3, 0.08]] }, col: { s: 'none' }, ceil: { t: 'vault', c: '#e6e5df' }, lamps: 'tubes', sign: 'white' },
  'U2:mendelssohn-bartholdy-park': { open: { steel: '#2e3436', roof: '#3a4043', rt: 'steel', panels: { c: '#3b4144', win: 'rect' } }, lamps: 'tubes', sign: 'white' },
  'U2:gleisdreieck': { open: { steel: '#4d6b56', roof: '#58745f', rt: 'steel', panels: { c: '#56735f', win: 'rect', low: 1.4 } }, lamps: 'tubes', sign: 'white' },
  'U2:buelowstrasse': { open: { steel: '#3c4944', roof: '#46524c', rt: 'steel', panels: { c: '#5d5850', win: 'arched' } }, lamps: 'globe', sign: 'white' },
  'U2:nollendorfplatz': { open: { steel: '#3a3430', roof: '#6b553f', rt: 'wood', panels: { c: '#4a4440', win: 'rect' } }, lamps: 'globe', sign: 'white' },
  'U2:wittenbergplatz': { wall: { c: '#dde4da', t: 'rect', dado: { c: '#2f5d48', h: 0.65 }, bands: [['#2f5d48', 3.7, 0.15]] }, col: { s: 'riveted', c: '#24493a' }, ceil: { t: 'kappen', c: '#e7e6df', beam: '#24493a' }, lamps: 'globe', sign: 'black' },
  'U2:zoologischer-garten': { wall: { c: '#e8cd5b', t: 'large', dado: { c: '#5a5a52', h: 0.6 } }, col: { s: 'tiled', c: '#cfc8b0' }, ceil: { t: 'coffered', c: '#cfcac0' }, lamps: 'disc', sign: 'white' },
  'U2:ernst-reuter-platz': { wall: { c: '#dfe9f0', t: 'mosaic', c2: '#5d93bd', mix: 0.14, jit: 0.04, bands: [['#44718e', 1.0, 0.12], ['#44718e', 2.6, 0.12]] }, col: { s: 'iron', c: '#2a2e33' }, ceil: { t: 'flat', c: '#e8eaea' }, lamps: 'tubes', sign: 'white' },
  'U2:deutsche-oper': { wall: { c: '#e9e6dc', t: 'rect', W: 4, dado: { c: '#555049', h: 0.5 }, frames: { c: '#2b2b2b', y0: 0.7, y1: 2.9, lw: 0.05 } }, col: { s: 'tiled', c: '#2f6f78' }, ceil: { t: 'beams', c: '#ebe5d4', beam: '#ddd5c0' }, lamps: 'tubes', sign: 'white' },
  'U2:bismarckstrasse': { wall: { c: '#e9e3a5', t: 'panel' }, col: { s: 'plain', c: '#e6dd9a' }, ceil: { t: 'panel', c: '#8fae3c' }, lamps: 'tubes', sign: 'white' },
  'U2:sophie-charlotte-platz': { wall: { c: '#eceae2', t: 'rect', W: 6, motif: { k: 'gallery' } }, col: { s: 'iron', c: '#3a3530' }, ceil: { t: 'kappen', c: '#d8d4c8', beam: '#3a3530' }, lamps: 'tubes', sign: 'black' },
  'U2:kaiserdamm': { wall: { c: '#e9e9e3', t: 'rect', dado: { c: '#776146', h: 0.4 } }, col: { s: 'iron', c: '#24382d' }, ceil: { t: 'kappen', c: '#d5d3cb', beam: '#2b3a30' }, lamps: 'tubes', sign: 'black' },
  'U2:theodor-heuss-platz': { wall: { c: '#e5ddc9', t: 'square', dado: { c: '#8d4140', h: 0.6 } }, col: { s: 'riveted', c: '#5d5a55' }, ceil: { t: 'coffered', c: '#7a4433' }, lamps: 'globe', sign: 'black' },
  'U2:neu-westend': { wall: { c: '#5f8a6c', t: 'rect', g: '#2f4a38' }, col: { s: 'iron', c: '#1e3528' }, ceil: { t: 'kappen', c: '#cfd0c8', beam: '#1e3528' }, lamps: 'tubes', sign: 'black' },
  'U2:olympia-stadion': { open: { steel: '#2e4f44', roof: '#6a5240', rt: 'wood', panels: null }, lamps: 'tubes', sign: 'white' },
  'U2:ruhleben': { open: { steel: '#bdb9b0', roof: '#e2e0da', rt: 'concrete', panels: null }, lamps: 'tubes', sign: 'white' },
  // ── U8 (Wittenau → Hermannstraße) ──
  'U8:wittenau': { wall: { c: '#3f8c5c', t: 'square', dado: { c: '#e0b23a', h: 0.15 }, bands: [['#e3b53b', 3.85, 0.18]] }, col: { s: 'tiled', c: '#3f8c5c', cap: '#e3b53b' }, ceil: { t: 'coffered', c: '#efe3b8', beam: '#d8aa36' }, lamps: 'globe', sign: 'white' },
  'U8:rathaus-reinickendorf': { wall: { c: '#9d4a3a', t: 'brick' }, col: { s: 'brick', c: '#94473a' }, ceil: { t: 'flat', c: '#e6dfcf' }, floor: '#c48a74', lamps: 'globe', sign: 'black' },
  'U8:karl-bonhoeffer-nervenklinik': { wall: { c: '#c9a24a', t: 'brick', motif: { k: 'diamonds', c: '#3a3a36' } }, col: { s: 'brick', c: '#c29a44', cap: '#3a3a36' }, ceil: { t: 'beams', c: '#ecebe4', beam: '#e0ddd2' }, lamps: 'tubes', sign: 'white' },
  'U8:lindauer-allee': { wall: { c: '#a9c9b6', t: 'square' }, col: { s: 'none' }, ceil: { t: 'flat', c: '#d6e4da' }, lamps: 'globe', sign: 'black' },
  'U8:paracelsus-bad': { wall: { c: '#f2f0e8', t: 'square', bands: [['#1d1d1d', 3.55, 0.14], ['#1d1d1d', 0.7, 0.08]] }, col: { s: 'tiled', c: '#f0eee6', cap: '#1d1d1d', corner: '#1d1d1d' }, ceil: { t: 'coffered', c: '#e2d9a6', beam: '#cdbf7c' }, lamps: 'globe', sign: 'black' },
  'U8:residenzstrasse': { wall: { c: '#b8c79e', t: 'rect' }, col: { s: 'mosaic', c: '#c97a3a', c2: '#4f8a3c' }, ceil: { t: 'coffered', c: '#dfe2c8', beam: '#c9cfaa' }, lamps: 'globe', sign: 'black' },
  'U8:franz-neumann-platz': { wall: { c: '#eef0ea', t: 'square', W: 4, dado: { c: '#2f5a3f', h: 0.25 } }, /* bomen: zitten al in het Blender-model */ col: { s: 'tiled', c: '#d9b53a', cap: '#1f2420' }, ceil: { t: 'coved', c: '#eceee8' }, lamps: 'globe', sign: 'black' },
  'U8:osloer-strasse': { wall: { c: '#c7322b', t: 'large', W: 3.2 }, /* vlaggen: zitten al in het Blender-model */ col: { s: 'plain', c: '#f0efe9' }, ceil: { t: 'flat', c: '#f2f1ec' }, lamps: 'tubes', sign: 'white' },
  'U8:pankstrasse': { wall: { c: '#4a4440', t: 'relief' }, col: { s: 'plain', c: '#5a524c' }, ceil: { t: 'slats', c: '#6b4a36' }, lamps: 'tubes', sign: 'relief' },
  'U8:gesundbrunnen': { wall: { c: '#6aa58e', t: 'square' }, col: { s: 'riveted', c: '#4f9a76' }, ceil: { t: 'beams', c: '#e9ece6', beam: '#4f9a76' }, lamps: 'disc', sign: 'black' },
  'U8:voltastrasse': { wall: { c: '#bdd7b5', t: 'rect' }, col: { s: 'doric', c: '#8d8f87' }, ceil: { t: 'flat', c: '#e2e6dc' }, lamps: 'globe', sign: 'black' },
  'U8:bernauer-strasse': { wall: { c: '#ecece6', t: 'rect', dado: { c: '#3a3a38', h: 0.5 } }, col: { s: 'polished', c: '#121416' }, ceil: { t: 'flat', c: '#ecebe5' }, lamps: 'tubes', sign: 'black' },
  'U8:rosenthaler-platz': { wall: { c: '#d77a26', t: 'rect', dado: { c: '#2f3546', h: 0.55 } }, col: { s: 'tiled', c: '#d27a2a' }, ceil: { t: 'coved', c: '#e4e3dc' }, lamps: 'globe', sign: 'black' },
  'U8:weinmeisterstrasse': { wall: { c: '#7f98b8', t: 'square' }, col: { s: 'tiled', c: '#cfd5dc' }, ceil: { t: 'coved', c: '#e6e6e2' }, lamps: 'globe', sign: 'black' },
  'U8:alexanderplatz': { wall: { c: '#5e9c88', t: 'rect', dado: { c: '#2f4d44', h: 0.5 } }, col: { s: 'riveted', c: '#2f4a42' }, ceil: { t: 'flat', c: '#e8e9e4' }, lamps: 'globe', sign: 'black' },
  'U8:jannowitzbrucke': { wall: { c: '#dcc540', t: 'rect' }, col: { s: 'riveted', c: '#d6b42a' }, ceil: { t: 'flat', c: '#ecebe3' }, lamps: 'globe', sign: 'white' },
  'U8:heinrich-heine-strasse': { wall: { c: '#d8d2cc', t: 'rect', bands: [['#6e4a63', 0.6, 0.1], ['#6e4a63', 3.4, 0.1]] }, col: { s: 'riveted', c: '#6e4a63' }, ceil: { t: 'coved', c: '#e5e2de' }, lamps: 'tubes', sign: 'black' },
  'U8:moritzplatz': { wall: { c: '#c9d8cd', t: 'rect' }, col: { s: 'tiled', c: '#eef0ea' }, ceil: { t: 'coved', c: '#e6e6df' }, lamps: 'tubes', sign: 'black' },
  'U8:kottbusser-tor': { wall: { c: '#dddcd5', t: 'rect', dado: { c: '#3d4043', h: 0.7 } }, col: { s: 'tiled', c: '#e4e3dd' }, ceil: { t: 'coved', c: '#e6e4dc' }, lamps: 'tubes', sign: 'black' },
  'U8:schonleinstrasse': { wall: { c: '#a9c4a6', t: 'rect' }, col: { s: 'tiled', c: '#6f9b7c' }, ceil: { t: 'coved', c: '#e3e6dc' }, lamps: 'tubes', sign: 'black' },
  'U8:hermannplatz': { wall: { c: '#dcdcd6', t: 'rect', dado: { c: '#55554f', h: 0.5 }, bands: [['#d9b52a', 3.2, 0.2]] }, col: { s: 'tiled', c: '#d9b52a', w: 0.95 }, ceil: { t: 'flat', c: '#efeee8' }, lamps: 'globe', sign: 'black' },
  'U8:boddinstrasse': { wall: { c: '#eaecea', t: 'rect', dado: { c: '#3d4146', h: 0.75 }, bands: [['#2152ad', 0.85, 0.14]] }, col: { s: 'tiled', c: '#e8e8e4' }, ceil: { t: 'coved', c: '#e6e4dc' }, lamps: 'tubes', sign: 'black' },
  'U8:leinestrasse': { wall: { c: '#a9d3bd', t: 'rect', dado: { c: '#2a3340', h: 0.55 } }, col: { s: 'tiled', c: '#93cbb0' }, ceil: { t: 'coved', c: '#e7ebe6' }, lamps: 'tubes', sign: 'black' },
  'U8:hermannstrasse': { wall: { c: '#86c7bb', t: 'large', dado: { c: '#3b4446', h: 0.6 } }, col: { s: 'tiled', c: '#8ac9bd' }, ceil: { t: 'coved', c: '#ecefeb' }, lamps: 'disc', sign: 'white' },
};

// Maatvoering van de Blender-sjablonen (gemeten uit de GLB's, oktober 2026).
const FRAME = {
  U2: { half: 34, wallZ: [-9.1, 8.7], roofY: 4.1, colTop: 3.78, colXs: [-27, -18, -9, 0, 9, 18, 27], lampZ: 2.2, lampStep: 7.5, signZ: 4.15, signXs: [-22.5, 4.5, 22.5], step: 3 },
  U8: { half: 25, wallZ: [-11.9, 11.9], roofY: 4.4, colTop: 4.11, colXs: [-16, -8, 0, 8, 16], lampZ: 5.0, lampStep: 7, signZ: 6.45, signXs: [-12, 12], step: 3 },
};

// ── Hulpjes ─────────────────────────────────────────────────────────────────────────────────────────────
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const counts = { templates: 0, columns: 0, beams: 0, lamps: 0, signs: 0, failed: 0 };
const applied = new Map();
const hex = c => new THREE.Color(c);
function std(name, color, extra = {}) { return new THREE.MeshStandardMaterial({ name, color: hex(color), roughness: 0.6, metalness: 0, ...extra }); }
function inst(geo, mat, mats, name) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length); m.name = name;
  mats.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  m.castShadow = false; m.receiveShadow = false; m.frustumCulled = true; return m;
}
const M4 = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
function meshByName(root, name) { let r = null; root.traverse(o => { if (!r && o.isMesh && o.name === name) r = o; }); return r; }
function matOf(mesh, name) { if (!mesh) return null; const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material]; return name ? ms.find(m => m?.name === name) || null : ms[0]; }
let colCache = null;
function columnsOf(root) {
  if (colCache?.root === root) return colCache.out;
  // Zuilposities uit de GLB zelf: hoge, smalle delen (alle sjablonen staan op een vast raster).
  const out = [];
  root.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position || !/Station_(Accent|Wall|White|Green|Stone|Dark|Metal)/.test(o.name)) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    if (!idx || pos.count > 20000) return;
    // Driehoeken groeperen per (x,z)-cel van 0,5 m; een zuil is een cel met hoogte > 2,4 m en voetafdruk < 1,3 m.
    const cells = new Map();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = Math.round(x * 2) + ':' + Math.round(z * 2);
      let c = cells.get(k); if (!c) cells.set(k, c = { x0: x, x1: x, y0: y, y1: y, z0: z, z1: z });
      c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); c.y0 = Math.min(c.y0, y); c.y1 = Math.max(c.y1, y); c.z0 = Math.min(c.z0, z); c.z1 = Math.max(c.z1, z);
    }
    for (const c of cells.values()) if (c.y1 - c.y0 > 2.4 && c.y0 > -0.3 && c.y0 < 0.3 && c.x1 - c.x0 < 1.3 && c.z1 - c.z0 < 1.3) { out.push({ x: (c.x0 + c.x1) / 2, z: c.z0, mesh: o.name }); out.push({ x: (c.x0 + c.x1) / 2, z: c.z1, mesh: o.name }); }
  });
  colCache = { root, out };
  return out;
}

// ── Onderdelen ──────────────────────────────────────────────────────────────────────────────────────────
function styleWall(root, prof, F) {
  const wall = meshByName(root, 'Station_Wall'), m = matOf(wall, 'Ceramic');
  if (!wall || !m || !prof.wall) return;
  const spec = { W: 3, H: 4.4, y0: -0.2, ...prof.wall };
  m.map = MaterialBase.station.wall(spec); m.color.setHex(0xffffff); m.userData.g3b = 'wall'; m.needsUpdate = true;
  // UV: langs het spoor u = x / W, omhoog v = (y - y0) / H. Zijvlakken (zuilen in de wandmesh) op z.
  const g = wall.geometry, pos = g.attributes.position, nrm = g.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
    const u = ax > az && ax >= ay ? pos.getZ(i) : pos.getX(i), v = ay > ax && ay > az ? pos.getZ(i) / spec.W : (pos.getY(i) - spec.y0) / spec.H;
    uv[i * 2] = u / spec.W; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const COL_TEX = { riveted: 'paint', iron: 'paint', tiled: 'tiles', marble: 'marble', granite: 'granite', polished: 'polished', brick: 'brick', mosaic: 'mosaic', doric: 'granite', plain: 'plain' };
const COL_MAT = { riveted: 'G3b_Paint', iron: 'G3b_Paint', tiled: 'G3b_Tile', marble: 'G3b_Polished', granite: 'G3b_Stone', polished: 'G3b_Polished', brick: 'G3b_Stone', mosaic: 'G3b_Tile', doric: 'G3b_Stone', plain: 'G3b_Plaster' };
function styleColumns(root, group, prof, F, line) {
  const col = prof.col; if (!col || col.s === 'none') return;
  const accent = matOf(meshByName(root, 'Station_Accent'), 'StationSteel');
  // Accent = de T-balken boven de zuilen en wandlijnen: geverfd staal in balkkleur (of zuilkleur bij staal).
  if (accent) { accent.color.set(col.s === 'riveted' || col.s === 'iron' ? col.c : prof.ceil?.beam || col.cap || col.c); accent.userData.g3b = 'accent'; }
  // Posities: uit de GLB (met het vaste raster als controle).
  const pts = [];
  for (const gx of F.colXs) {
    const cs = columnsOf(root).filter(p => Math.abs(p.z) < 6 && Math.abs(p.x - gx) < 0.6).sort((a, b) => a.z - b.z);
    let cl = null;
    for (const c of cs) { if (cl && c.z - cl.z1 < 0.9) cl.z1 = c.z; else { cl && pts.push({ x: gx, z: (cl.z0 + cl.z1) / 2 }); cl = { z0: c.z, z1: c.z }; } }
    cl && pts.push({ x: gx, z: (cl.z0 + cl.z1) / 2 });
  }
  if (!pts.length) return;
  const h = F.colTop, round = col.s === 'doric' || col.s === 'polished';
  const w = col.w || ({ riveted: 0.46, iron: 0.42, tiled: 0.78, marble: 0.76, polished: 0.78, brick: 0.8, mosaic: 0.78, doric: 0.8, granite: 0.78, plain: 0.78 }[col.s] || 0.7);
  const texSpec = { t: COL_TEX[col.s] || 'paint', c: col.c, c2: col.c2, cap: col.cap, corner: col.corner };
  const tex = texSpec.t === 'plain' ? null : MaterialBase.station.column(texSpec);
  const mat = std(COL_MAT[col.s] || 'G3b_Paint', tex ? '#ffffff' : col.c, tex ? { map: tex } : {});
  const shaft = round ? new THREE.CylinderGeometry(w / 2, w / 2, h, 20, 1, true) : new THREE.BoxGeometry(w, h, w);
  group.add(inst(shaft, mat, pts.map(p => M4(p.x, h / 2, p.z)), 'G3b_Columns'));
  // Kapiteel en voet (niet bij gladde moderne zuilen en zwart graniet).
  if (col.s !== 'plain' && col.s !== 'polished') {
    const capMat = std(col.s === 'riveted' || col.s === 'iron' ? 'G3b_Paint' : 'G3b_Stone', col.cap || col.c);
    // Kapiteel + voet in één InstancedMesh (eenheidsblok, geschaald): één draw call minder per station.
    const ms = []; for (const p of pts) { ms.push(M4(p.x, h - 0.1, p.z, 0, w + 0.22, 0.2, w + 0.22)); ms.push(M4(p.x, 0.11, p.z, 0, w + 0.12, 0.22, w + 0.12)); }
    group.add(inst(UNIT_BOX, capMat, ms, 'G3b_ColumnCapsBases'));
  }
  counts.columns += pts.length;
  return pts;
}

function styleCeiling(root, group, prof, F) {
  const c = prof.ceil; if (!c) return;
  const roof = meshByName(root, 'Station_Roof'), rm = matOf(roof, 'Ceiling');
  if (rm) {
    const tt = c.t === 'vault' || c.t === 'coved' || c.t === 'beams' ? 'flat' : c.t;
    rm.map = MaterialBase.station.ceiling({ t: tt, c: c.c }); rm.color.setHex(0xffffff); rm.userData.g3b = 'ceiling'; rm.needsUpdate = true;
    if (!roof.geometry.attributes.uv) MaterialBase.station.boxUV(roof.geometry, 3);
  }
  const [zA, zB] = F.wallZ, span = zB - zA, zc = (zA + zB) / 2, y = F.roofY;
  if (c.t === 'kappen' || c.t === 'beams' || c.t === 'coffered') {
    // Dwarsbalken van wand tot wand op elke 3 m (kappen = de klassieke Berlijnse 'Kappendecke').
    const ms = [], every = c.every || F.step;
    for (let x = -Math.floor((F.half - 0.5) / every) * every; x < F.half - 0.5; x += every) ms.push(M4(x, y - 0.14, zc));
    const beamMat = std('G3b_Paint', c.beam || c.c);
    group.add(inst(new THREE.BoxGeometry(c.t === 'beams' ? 0.3 : 0.22, 0.28, span), beamMat, ms, 'G3b_CeilingBeams'));
    counts.beams += ms.length;
    if (c.t === 'coffered') {                                   // langsbalken: cassettes
      const ls = []; for (let z = zA + span / 6; z < zB - 0.5; z += span / 6) ls.push(M4(0, y - 0.12, z));
      group.add(inst(new THREE.BoxGeometry(F.half * 2, 0.22, 0.18), beamMat, ls, 'G3b_CeilingRibs'));
    }
  }
  if (c.t === 'coved' && roof) {
    // Voute langs beide wanden, tenzij het sjabloon er al één heeft (laagste punt van het dak < plafond).
    roof.geometry.computeBoundingBox();
    if (roof.geometry.boundingBox.min.y > y - 0.4) {
      const cove = std('G3b_Plaster', c.c), g = new THREE.PlaneGeometry(F.half * 2, 1.25);
      for (const [z, s] of [[zA, 1], [zB, -1]]) {
        const m = new THREE.Mesh(g, cove); m.name = 'G3b_Cove';
        m.position.set(0, y - 0.45, z + s * 0.45); m.rotation.x = s > 0 ? Math.PI / 4 : -Math.PI / 4;
        m.material.side = THREE.DoubleSide; group.add(m);
      }
    }
  }
  if (c.t === 'vault') {
    // Eén ondiep gewelf over de hele hal (Potsdamer Platz): het vlakke dak en de zuil-T's verdwijnen.
    const rise = 2.2, R = (span * span / 4 + rise * rise) / (2 * rise), a = Math.asin(span / 2 / R);
    const g = new THREE.CylinderGeometry(R, R, F.half * 2, 40, 1, true, -a, 2 * a);
    g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2);
    MaterialBase.station.boxUV(g, 3);
    const vm = std('G3b_Plaster', '#ffffff', { map: MaterialBase.station.ceiling({ t: 'flat', c: c.c }), side: THREE.DoubleSide });
    vm.userData.g3b = 'vault';
    const m = new THREE.Mesh(g, vm); m.name = 'G3b_Vault'; m.position.set(0, y + rise - R, zc); group.add(m);
    if (roof) roof.visible = false;
    const acc = meshByName(root, 'Station_Accent'); if (acc) acc.visible = false;
  }
}

function styleLamps(root, group, prof, F, rods) {
  if (!prof.lamps || prof.lamps === 'tubes') return;
  const light = meshByName(root, 'Station_Light'); if (light) light.visible = false;
  const mat = std('WarmFluorescent', '#fff1d0');
  const geo = prof.lamps === 'disc' ? new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24) : new THREE.SphereGeometry(0.22, 16, 10);
  const yy = prof.lamps === 'disc' ? F.roofY - 0.04 : F.roofY - 0.5;
  const ms = [];
  for (let x = -F.half + F.lampStep / 2; x < F.half; x += F.lampStep) for (const z of [-F.lampZ, F.lampZ]) ms.push(M4(x, yy, z));
  group.add(inst(geo, mat, ms, 'G3b_Lamps'));
  if (prof.lamps === 'globe') for (const m of ms) rods.push(new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().makeTranslation(0, 0.36, 0), m).scale(new THREE.Vector3(1, 0.3, 1))); // pendel
  counts.lamps += ms.length;
}

// BVG-hangbord: wit paneel, lijnsymbool in lijnkleur, stationsnaam zwart.
function hangSignTexture(name, line) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 176; const x = c.getContext('2d');
  x.fillStyle = '#f6f5f0'; x.fillRect(0, 0, 1024, 176);
  x.fillStyle = '#c9c7c0'; x.fillRect(0, 168, 1024, 8);
  x.fillStyle = LINE_COLOR[line] || '#444'; x.fillRect(24, 34, 108, 108);
  x.fillStyle = '#fff'; x.font = '700 60px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(line, 78, 90);
  x.fillStyle = '#121212'; x.textAlign = 'left'; x.font = `700 ${name.length > 24 ? 50 : name.length > 18 ? 60 : 72}px Arial`; x.fillText(name, 160, 92, 840);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.g3b = 'sign'; return t;
}
function styleSigns(root, group, prof, F, meta, rods) {
  const tex = hangSignTexture(meta.name, meta.line);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); mat.name = 'G3b_Sign';
  const geo = new THREE.PlaneGeometry(3.2, 0.55), ms = [];
  // Bij open-air hangen de borden aan de dakrand iets lager; ondergronds onder het plafond.
  const yy = Math.min(F.roofY - 0.85, 3.1);
  for (const x of F.signXs) for (const s of [-1, 1]) {
    const z = s * F.signZ;
    ms.push(M4(x, yy, z + s * 0.012, s > 0 ? 0 : Math.PI));      // naar het spoor
    ms.push(M4(x, yy, z - s * 0.012, s > 0 ? Math.PI : 0));      // naar het perron
  }
  group.add(inst(geo, mat, ms, 'G3b_HangSigns'));
  for (const x of F.signXs) for (const s of [-1, 1]) for (const dx of [-1.3, 1.3]) rods.push(M4(x + dx, (yy + F.roofY) / 2 + 0.14, s * F.signZ, 0, 1, F.roofY - yy - 0.28, 1));
  counts.signs += ms.length / 2;
}

function styleOpen(root, group, prof, F) {
  const o = prof.open;
  const accent = matOf(meshByName(root, 'Station_Accent'), 'StationSteel');
  if (accent) { accent.color.set(o.steel); accent.userData.g3b = 'accent'; }
  const roof = meshByName(root, 'Station_Roof'), rm = matOf(roof);
  if (rm && rm.name === 'Ceiling') {
    rm.map = MaterialBase.station.ceiling({ t: o.rt || 'steel', c: o.roof }); rm.color.setHex(0xffffff); rm.userData.g3b = 'ceiling'; rm.needsUpdate = true;
    if (!roof.geometry.attributes.uv) MaterialBase.station.boxUV(roof.geometry, 3);
  } else if (rm) rm.color.set(o.roof);
  if (o.panels) {
    // Zijwanden met ramen achter de buitenste zuilrij (echte U2-hallen zijn grotendeels dicht).
    const tex = MaterialBase.station.side(o.panels).clone(); tex.repeat.set(F.half * 2 / 6, 1); tex.needsUpdate = true;
    const mat = std('G3b_Glass', '#ffffff', { map: tex, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, depthWrite: false });
    mat.userData.g3b = 'side';
    const g = new THREE.PlaneGeometry(F.half * 2, 3.9);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(g, mat); m.name = 'G3b_SidePanel'; m.position.set(0, 1.95, s * 9.08); m.renderOrder = 2; group.add(m); }
    // Het matglas van het sjabloon staat vóór de ramen: helderder maken zodat roeden en kozijnen zichtbaar zijn.
    const glass = matOf(meshByName(root, 'Station_Glass'));
    if (glass) { glass.transparent = true; glass.opacity = Math.min(glass.opacity ?? 1, 0.22); glass.depthWrite = false; glass.userData.g3b = 'glass'; glass.needsUpdate = true; }
  }
}

function styleFloor(root, prof) {
  if (!prof.floor) return;
  const m = matOf(meshByName(root, 'Station_Floor'), 'Terrazzo'); if (m) { m.color.set(prof.floor); m.userData.g3b = 'floor'; }
}

// ── Publiek ─────────────────────────────────────────────────────────────────────────────────────────────
function keyOf(line, idOrSlug) {
  if (P[`${line}:${idOrSlug}`]) return `${line}:${idOrSlug}`;
  const meta = [...metaByKey.values()].find(m => m.line === line && (m.id === idOrSlug || m.slug === idOrSlug || String(m.index) === String(idOrSlug)));
  return meta ? `${line}:${meta.slug}` : null;
}
const metaByKey = new Map();

export const StationProfiles = {
  version: VERSION,
  /** Profiel van een station (manifest-gegevens + G3b-profiel). */
  get(line, id) { const k = keyOf(line, id); return k ? { ...(metaByKey.get(k) || {}), ...P[k], key: k } : null; },
  /** Stijl van de wandborden (BlenderStationsV1.signage). */
  wallSign(meta) {
    const p = P[`${meta.line}:${meta.slug}`] || {}, s = p.sign || (meta.line === 'U8' ? 'black' : 'white');
    return { black: { bg: '#141414', fg: '#f4f1e8', bar: null, border: '#d8d4c8' }, white: { bg: '#f4f2ec', fg: '#141414', bar: LINE_COLOR[meta.line], border: null },
      blue: { bg: '#1f3f8f', fg: '#ffffff', bar: null, border: '#e9edf5' }, relief: { bg: '#2e2a28', fg: '#ebe6dd', bar: null, border: null },
      red: { bg: '#f4f2ec', fg: '#141414', bar: null, border: '#a8352d' } }[s] || { bg: '#f4f2ec', fg: '#141414', bar: '#' + meta.accent };
  },
  /** Eén keer per geladen sjabloon (BlenderStationsV1): profiel toepassen. Fouten laten het station staan. */
  apply(template, meta) {
    const key = `${meta.line}:${meta.slug}`; metaByKey.set(key, meta);
    const prof = P[key]; if (!prof || template.userData.g3b) return false;
    const F = FRAME[meta.line]; const group = new THREE.Group(); group.name = 'G3b_Profile'; group.userData.g3b = VERSION;
    try {
      if (prof.open) styleOpen(template, group, prof, F);
      else { styleWall(template, prof, F); styleColumns(template, group, prof, F, meta.line); styleCeiling(template, group, prof, F); styleFloor(template, prof); }
      const rods = [];                                          // ophangstangen van lampen en borden: één draw call
      styleLamps(template, group, prof, F, rods);
      styleSigns(template, group, prof, F, meta, rods);
      if (rods.length) group.add(inst(new THREE.CylinderGeometry(0.014, 0.014, 1, 6), std('G3b_Paint', '#2e2e2e'), rods, 'G3b_Rods'));
      template.add(group); template.userData.g3b = VERSION;
      counts.templates++; applied.set(key, { at: Date.now(), parts: group.children.length });
      return true;
    } catch (e) {
      counts.failed++; console.warn('[Berlin Life] G3b-profiel overgeslagen', key, e);
      return false;
    }
  },
  /** Heeft dit station een geladen G3b-profiel? Dan zijn oudere decoratielagen (Phase81) overbodig. */
  covers(line, id) { const k = keyOf(line, id); return !!k && applied.has(k); },
  register(meta) { metaByKey.set(`${meta.line}:${meta.slug}`, meta); },
  status() { return { version: VERSION, profiles: Object.keys(P).length, ...counts, loaded: [...applied.keys()] }; },
  profiles: P,
};
globalThis.BerlinStationProfiles = StationProfiles;
