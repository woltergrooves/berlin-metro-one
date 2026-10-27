import { Tick } from '../state/Tick.js';
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { Game } from '../core/Game.js';

// Visual-only integration. Original service, boarding, collision and save objects stay authoritative.
const manifest = {
 U2: { file: 'bvg-hk.glb', family: 'HK', rotation: -Math.PI / 2 },
 U8: { file: 'bvg-h.glb', family: 'H', rotation: 0 },
};
const loader = new GLTFLoader();
const assets = new Map(), records = new Map();
const status = { version: 1, generator: 'Blender 4.5.3 LTS', models: {}, instances: 0, errors: [] };
let activeGame = null, scanAt = 0;

function load(line) {
 if (assets.has(line)) return assets.get(line);
 const url = new URL(`/assets/trains/${manifest[line].file}`, location.href);
 const task = (async () => {
  if (typeof DecompressionStream === 'function') {
   const response = await fetch(`${url.href}.gz`);
   if (!response.ok) throw new Error(`Asset request failed: ${response.status}`);
   const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
   return loader.parseAsync(await new Response(stream).arrayBuffer(), url.href);
  }
  return loader.loadAsync(url.href);
 })().then(gltf => {
  const names = new Set(); let triangles = 0;
  gltf.scene.traverse(node => {
   if (!node.isMesh) return;
   names.add(node.name); node.castShadow = node.receiveShadow = false;
   node.geometry.computeBoundingSphere();
   for (const material of (Array.isArray(node.material) ? node.material : [node.material])) if (material?.transparent) material.forceSinglePass = true;
   triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
  });
  if (!names.has('BVG_Shell') || [...names].filter(n => /^Door_[pn]_\d_[LR]$/.test(n)).length !== 16) {
   throw new Error(`Invalid ${line} model: missing shell or door nodes`);
  }
  status.models[line] = { loaded: true, family: manifest[line].family, triangles, meshes: names.size };
  return gltf.scene;
 }).catch(error => {
  status.models[line] = { loaded: false, error: String(error.message || error) };
  status.errors.push(`${line}: ${error.message || error}`);
  console.warn(`[Berlin Life] Blender ${line} model unavailable; existing train retained`, error);
  return null;
 });
 assets.set(line, task); return task;
}

function display(root, line, source) {
 const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 100;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Destination canvas unavailable');
 const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
 texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false;
 const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
 const geo = new THREE.PlaneGeometry(1.62, .215);
 for (const end of [-1, 1]) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'LiveDestination'; mesh.position.set(end * (12.147 - 2.675 * (line === 'U8' ? .19 : .23)), 2.675, 0);
  mesh.rotation.y = end * Math.PI / 2; root.add(mesh);
 }
 let key = '';
 return () => {
  const direction = line === 'U2' ? source.direction : source.userData.u8.direction;
  const destination = line === 'U2' ? source.terminusName : (source.userData.u8.service?.timeline?.terminusName || (direction < 0 ? 'Wittenau' : 'Hermannstraße'));
  const nextKey = `${line} ${destination}`; if (nextKey === key) return;
  key = nextKey; ctx.fillStyle = '#080b0b'; ctx.fillRect(0, 0, 768, 100);
  ctx.fillStyle = '#ffd05b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 67px monospace'; ctx.fillText(key, 384, 52, 742); texture.needsUpdate = true;
 };
}

function install(source, line, template) {
 const parent = line === 'U2' ? source.group : source;
 if (!parent || records.has(parent)) return;
 const root = template.clone(true); root.name = `Blender_${line}_${manifest[line].family}`;
 root.rotation.y = manifest[line].rotation;
 const allDoors = new Map(); root.traverse(node => { if (/^Door_[pn]_\d_[LR]$/.test(node.name)) allDoors.set(node.name, node); });
 const proxies = line === 'U2' ? source.doorMeshes : source.userData.u8?.doors;
 if (!proxies?.length) return;
 const side = line === 'U2' ? -source.doorSide : source.userData.u8.platformSide;
 const prefix = side > 0 ? 'p' : 'n';
 const bindings = proxies.flatMap((pair, i) => [
  { mesh: allDoors.get(`Door_${prefix}_${i}_L`), proxy: pair.left || pair.a },
  { mesh: allDoors.get(`Door_${prefix}_${i}_R`), proxy: pair.right || pair.b },
 ]);
 if (bindings.some(b => !b.mesh || !b.proxy)) return;
 const infoScreens = parent.children.filter(node => node.userData?.u8InfoV3);
 const keep = new Set([source.routeBoard, source.nextStopBoard, source.userData?.u8FullRouteMap?.mesh, ...infoScreens].filter(Boolean));
 const updateDisplay = display(root, line, source);
 updateDisplay();
 const boardState = [source.routeBoard, source.nextStopBoard, source.userData?.u8FullRouteMap?.mesh, ...infoScreens].filter(Boolean).map(node => ({node,position:node.position.clone(),scale:node.scale.clone(),rotation:node.rotation.clone()}));
 const hidden = [];
 // Existing static train parts are direct meshes, or the named previous visual layer.
 // Passenger groups and information system objects are retained.
 for (const child of parent.children) {
  if (keep.has(child)) continue;
  if (child.isMesh || /^U8CarriageVisual|^TrainVisual|^LegacyTrain|^CarriageVisual/i.test(child.name)) {
   hidden.push([child, child.visible]); child.visible = false;
  }
 }
 parent.add(root);
 if (line === 'U2') {
  if (source.routeBoard) { source.routeBoard.position.y = 2.72; source.routeBoard.scale.set(.66, .27, 1); }
  if (source.nextStopBoard) {
   source.nextStopBoard.position.y = 2.59;
   source.nextStopBoard.position.z = source.direction > 0 ? -10.78 : 10.78;
   source.nextStopBoard.scale.set(.44, .35, 1);
  }
 }
 if (line === 'U8' && source.userData.u8FullRouteMap?.mesh) {
  const board = source.userData.u8FullRouteMap.mesh;
  board.position.set(-5.3, 2.73, board.position.z); board.scale.set(.63, .25, 1);
 }
 for (const node of infoScreens) { node.position.y = 2.73; node.scale.set(.60, .31, 1); }
 const record = { source, line, parent, root, bindings, hidden, updateDisplay, boardState, keep, hiddenSet: new Set(hidden.map(([node]) => node)) };
 records.set(parent, record);
 parent.userData.blenderTrain = { version: 1, line, family: manifest[line].family, doors: bindings.length, source: manifest[line].file };
 status.instances = records.size; sync(record);
}

function sync(record) {
 const { line, parent, source, root, bindings, updateDisplay } = record;
 // Some earlier cosmetic modules install after the base game starts. Keep those static
 // parts hidden too, while retaining passengers and the live information boards.
 for (const child of parent.children) {
  if (child.userData?.u8InfoV3 && !record.keep.has(child)) {
   record.keep.add(child);
   record.boardState.push({node:child,position:child.position.clone(),scale:child.scale.clone(),rotation:child.rotation.clone()});
   child.position.y = 2.73; child.scale.set(.60, .31, 1);
  }
  if (child === root || record.keep.has(child)) continue;
  if (child.isMesh || /^U8CarriageVisual/.test(child.name)) {
   if (!record.hiddenSet.has(child)) { record.hidden.push([child, child.visible]); record.hiddenSet.add(child); }
   child.visible = false;
  }
 }
 // Copied from already-animated proxies, so closed/open state can never diverge from boarding.
 for (const { mesh, proxy } of bindings) mesh.position.x = line === 'U2' ? proxy.position.z : proxy.position.x;
 if (line === 'U2' && source.nextStopBoard) {
  source.nextStopBoard.position.z = source.direction > 0 ? -10.78 : 10.78;
  source.nextStopBoard.rotation.y = source.direction > 0 ? 0 : Math.PI;
 }
 root.visible = true; updateDisplay();
}

async function scan() {
 if (!activeGame) return;
 for (const line of ['U2', 'U8']) {
  const template = await load(line); if (!template) continue;
  const trains = line === 'U2' ? activeGame.trains || [] : activeGame.u8Trains || window.__berlinMetroU8Trains || [];
  for (const source of trains) {
   const parent = line === 'U2' ? source.group : source;
   if (!records.has(parent) && !parent?.userData?.blenderTrainFailed) {
    try { install(source, line, template); }
    catch (error) { status.errors.push(`${line} install: ${error.message}`); console.warn('[Berlin Life] Blender visual install', error); }
   }
  }
 }
}

function attach(game) {
 if (game.__blenderTrainsV1) return;
 game.__blenderTrainsV1 = true; activeGame = game;
 const render = game.renderer.render;
 game.renderer.render = function(scene, camera) {
  const now = performance.now();
  if (now >= scanAt) { scanAt = now + 1100; void scan(); }
  for (const record of records.values()) if (record.parent.visible) {
   try { sync(record); }
   catch (error) {
    for (const [node, visible] of record.hidden) node.visible = visible;
    for (const b of record.boardState) { b.node.position.copy(b.position); b.node.scale.copy(b.scale); b.node.rotation.copy(b.rotation); }
    record.root.removeFromParent(); record.parent.userData.blenderTrainFailed = true;
    records.delete(record.parent); status.instances = records.size;
    status.errors.push(`${record.line} render: ${error.message}`);
    console.warn('[Berlin Life] Original train visuals restored', error);
   }
  }
  return render.call(this, scene, camera);
 };
 void scan();
}

const baseStart = Game.prototype.start;
Game.prototype.start = function(...args) { const result = baseStart.apply(this, args); attach(this); return result; };
const discoverGame = Tick.every('trains.glb-discover', 750, () => {
 if (activeGame) { Tick.cancel(discoverGame); return; }
 const game = window.BerlinLife?.game || window.__berlinMetroGame || window.__berlinGame;
 if (game?.renderer && game?.trains) attach(game);
});
// Starts fetching while the normal game boot and save picker load.
load('U2'); load('U8');
window.BerlinBlenderTrains = {
 version: 1,
 get status() { return JSON.parse(JSON.stringify(status)); },
 check: () => ({ ...JSON.parse(JSON.stringify(status)), trains: [...records.values()].map(r => ({
  line: r.line, family: manifest[r.line].family, visible: r.parent.visible, doors: r.bindings.length,
  synchronized: r.bindings.every(b => Math.abs(b.mesh.position.x - (r.line === 'U2' ? b.proxy.position.z : b.proxy.position.x)) < .0001),
 })) }),
};
console.info('[Berlin Life] Blender train visual pipeline ready');
