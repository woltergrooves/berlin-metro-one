// Mijlpaal 0 / G1: gecachete naam-lookups in de scene.
// Object3D.getObjectByName doorloopt de hele boom (±10.700 objecten in de scene). Frame-hooks deden dat
// tientallen keren per frame. byName onthoudt een gevonden object zolang het nog onder dezelfde root hangt;
// een losgekoppeld object kost nog één zoektocht, een misser hooguit één per seconde.
const cache = new WeakMap();
const MISS_MS = 1000; // een misser wordt 1 s onthouden: objecten die later ontstaan, worden binnen 1 s gevonden
const now = () => (globalThis.performance?.now?.() ?? Date.now());

function attached(o, root) {
  for (let p = o; p; p = p.parent) if (p === root) return true;
  return false;
}

/** Zoals root.getObjectByName(name), maar gecachet. */
export function byName(root, name) {
  if (!root) return undefined;
  let m = cache.get(root);
  if (!m) { m = new Map(); cache.set(root, m); }
  const hit = m.get(name);
  if (typeof hit === 'number') { if (now() - hit < MISS_MS) return undefined; }
  else if (hit && hit.name === name && attached(hit, root)) return hit;
  const found = root.getObjectByName(name);
  m.set(name, found || now());
  return found;
}

/**
 * Houdt bij welke U8-haltes al zijn aangekleed, zodat een hook stopt met zoeken zodra alles klaar is.
 * run(fn) roept fn(stop) aan voor elke halte die nog niet klaar is; fn geeft true terug als die halte klaar is.
 */
export function stopTracker(stops) {
  const done = new Set();
  return {
    get complete() { return done.size >= stops.length; },
    run(fn) {
      if (done.size >= stops.length) return true;
      for (const s of stops) if (!done.has(s.id) && fn(s)) done.add(s.id);
      return done.size >= stops.length;
    },
  };
}
