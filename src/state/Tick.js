// Berlin Life — fase 1, stap 7 (deel 1): één game-tick (roadmap fase 1)
//
// Voorheen startte bijna elk systeem zijn eigen `setInterval` (29 timers bij een nieuwe save,
// van elke 90 ms tot elke 3,6 s). Die liepen allemaal los van elkaar, wekten de telefoon elk
// apart op en draaiden door als het tabblad op de achtergrond stond.
//
// Nu is er één planner met één timer:
//   - taken die (bijna) tegelijk aan de beurt zijn, draaien in dezelfde wekbeurt (SLACK_MS);
//   - de timer wordt alleen gezet tot de eerstvolgende taak, nooit vaker dan nodig;
//   - herhalende taken pauzeren als het tabblad verborgen is en lopen weer zodra het zichtbaar is;
//   - wacht-taken (`until`) lopen ook verborgen door, met een harde time-out;
//   - een fout in één taak stopt de andere niet en wordt per taak geteld.
//
//   Tick.every(name, ms, fn, { background })   herhaal fn elke ms; geeft een id terug
//   Tick.until(name, ms, fn, timeoutMs)        roep fn elke ms aan tot die iets "waars" teruggeeft
//   Tick.sleep(ms, name)                       wacht minstens ms (één keer); geeft een Promise terug
//   Tick.cancel(id)                            stop een taak (null/undefined mag)
//   Tick.list()                                overzicht voor de GOD/inspector en probes
//
// Gedrag per taak is verder gelijk aan setInterval: de eerste aanroep is na `ms`, niet direct.
//
// Deel 2: opstart-wachtlussen. 48 systemen wachtten bij het opstarten tot een minuut lang, elk
// met een eigen `setTimeout(r,100)`, tot de game (of een ander systeem) klaar was. Die lussen
// slapen nu via `Tick.sleep`: dezelfde lus, dezelfde voorwaarde en hetzelfde aantal pogingen,
// maar alle slapers worden op een vast raster van SLEEP_GRID_MS samen gewekt (één wekbeurt in
// plaats van één per systeem). Een slaap duurt daardoor `ms` tot `ms + SLEEP_GRID_MS`.
// Slapers lopen ook door als het tabblad verborgen is (net als de oude setTimeout).
//
// Deel 3: één frame-update. Vroeger "wikkelden" 26 systemen elk game.loop in een eigen functie
// (wrapper rond wrapper rond de kern) en riepen ze elk opnieuw renderer.setAnimationLoop aan.
// Nu registreert elk systeem een frame-hook met een `before`- en/of `after`-deel:
//
//   Tick.frame(name, { before, after })   per frame; geeft een id terug
//   Tick.runFrame(core)                   één frame: before-hooks, kern, after-hooks
//   Tick.frames()                         overzicht van de frame-hooks
//
// De volgorde is precies die van de oude wrappers: een wrapper die later werd geïnstalleerd zat
// buitenom, dus `before` loopt van laatst naar eerst geregistreerd, dan de kern, dan `after` van
// eerst naar laatst. Verschil met vroeger: een fout in één hook stopt het frame niet meer (de
// andere hooks, de kern en de render lopen door); de fout wordt per hook geteld en gelogd.

const SLACK_MS = 16;      // taken die binnen één frame aan de beurt zijn, samen draaien
const MAX_ERRORS_LOGGED = 3;
const SLEEP_GRID_MS = 25; // raster waarop opstart-slapers samen wakker worden

const tasks = new Map();  // id → taak
let nextId = 1, handle = null, handleAt = Infinity, wakeups = 0;

const now = () => performance.now();
const hidden = () => typeof document !== 'undefined' && document.hidden;

function runnable(task) { return task.background || !hidden(); }

function arm() {
  let at = Infinity;
  for (const task of tasks.values()) if (runnable(task) && task.next < at) at = task.next;
  if (at === handleAt) return;
  if (handle !== null) clearTimeout(handle);
  handle = null; handleAt = at;
  if (at === Infinity) return;
  handle = setTimeout(pump, Math.max(0, at - now()));
}

function call(task) {
  const t0 = now();
  let result;
  try { result = task.fn(); } catch (e) {
    task.errors++;
    if (task.errors <= MAX_ERRORS_LOGGED) console.error(`[Berlin Tick] ${task.name}`, e);
  }
  task.runs++;
  task.busyMs += now() - t0;
  return result;
}

function pump() {
  handle = null; handleAt = Infinity; wakeups++;
  const t = now();
  for (const [id, task] of tasks) {
    if (task.since > t || task.next > t + SLACK_MS || !runnable(task)) continue;  // since > t: net toegevoegd
    if (task.deadline !== null && t >= task.deadline) { finish(id, task, 'time-out'); continue; }
    const result = call(task);
    if (!tasks.has(id)) continue;                     // taak heeft zichzelf gestopt
    if (task.kind === 'once') { tasks.delete(id); continue; }
    if (task.kind === 'until' && result) { finish(id, task, 'klaar'); continue; }
    // Vaste maat zoals setInterval, maar na een lange pauze niet "inhalen".
    task.next += task.every;
    if (task.next < t) task.next = t + task.every;
  }
  arm();
}

function finish(id, task, reason) {
  tasks.delete(id);
  if (reason === 'time-out' && task.onTimeout) { try { task.onTimeout(); } catch (e) { console.error(`[Berlin Tick] ${task.name}`, e); } }
}

function add(kind, name, ms, fn, { background = false, timeoutMs = null, onTimeout = null } = {}) {
  if (typeof fn !== 'function') throw new TypeError(`[Berlin Tick] ${name}: geen functie`);
  const every = Math.max(1, Number(ms) || 0);
  const id = nextId++;
  const t = now();
  tasks.set(id, {
    kind, name: String(name || 'naamloos'), every, fn, background,
    next: t + every, deadline: timeoutMs === null ? null : t + timeoutMs, onTimeout,
    runs: 0, errors: 0, busyMs: 0, since: t,
  });
  arm();
  return id;
}

if (typeof document !== 'undefined') {
  // Bij terugkeer naar het tabblad: achterstallige taken direct inplannen (niet inhalen).
  document.addEventListener('visibilitychange', () => {
    if (!hidden()) { const t = now(); for (const task of tasks.values()) if (task.next < t) task.next = t; }
    arm();
  });
}

const frameHooks = [];    // in registratievolgorde (= oude installatievolgorde)
let frameCount = 0, frameDirty = false;

function frame(name, { before = null, after = null } = {}) {
  if (before !== null && typeof before !== 'function') throw new TypeError(`[Berlin Tick] ${name}: before is geen functie`);
  if (after !== null && typeof after !== 'function') throw new TypeError(`[Berlin Tick] ${name}: after is geen functie`);
  const id = nextId++;
  frameHooks.push({ id, name: String(name || 'naamloos'), before, after, dead: false, runs: 0, errors: 0, busyMs: 0 });
  return id;
}

function hook(h, fn) {
  const t0 = now();
  try { fn(); } catch (e) {
    h.errors++;
    if (h.errors <= MAX_ERRORS_LOGGED) console.error(`[Berlin Tick] frame ${h.name}`, e);
  }
  h.busyMs += now() - t0;
}

function runFrame(core) {
  frameCount++;
  const n = frameHooks.length;                       // hooks die tijdens dit frame bijkomen: pas volgend frame
  for (let i = n - 1; i >= 0; i--) { const h = frameHooks[i]; if (!h.dead && h.before) hook(h, h.before); }
  const r = core();                                  // fout in de kern: zoals vroeger, frame stopt
  for (let i = 0; i < n; i++) { const h = frameHooks[i]; if (!h.dead) { if (h.after) hook(h, h.after); h.runs++; } }
  if (frameDirty) { frameDirty = false; for (let i = frameHooks.length - 1; i >= 0; i--) if (frameHooks[i].dead) frameHooks.splice(i, 1); }
  return r;
}

function sleep(ms, name = 'slaap') {
  return new Promise(resolve => {
    const id = add('once', name, ms, resolve, { background: true });
    const task = tasks.get(id);
    task.next = Math.ceil(task.next / SLEEP_GRID_MS) * SLEEP_GRID_MS;  // op het gedeelde raster
    arm();
  });
}

export const Tick = {
  version: 'Tick 3 · fase 1 stap 7 deel 3',
  /** Herhaal fn elke ms (pauzeert bij verborgen tabblad, tenzij background). */
  every: (name, ms, fn, opts = {}) => add('every', name, ms, fn, { background: !!opts.background }),
  /** Roep fn elke ms aan tot die iets waars teruggeeft of timeoutMs verstrijkt. */
  until: (name, ms, fn, timeoutMs = null, onTimeout = null) => add('until', name, ms, fn, { background: true, timeoutMs, onTimeout }),
  /** Wacht minstens ms (opstart-wachtlussen); alle slapers delen één raster en wekbeurt. */
  sleep,
  /** Frame-hook: before/after rond de kern-update (zie deel 3 hierboven). */
  frame,
  /** Eén frame draaien (Game.loop). */
  runFrame,
  /** Stop een taak of frame-hook. */
  cancel(id) {
    if (id == null) return;
    if (tasks.delete(id)) { arm(); return; }
    const h = frameHooks.find(x => x.id === id);
    if (h) { h.dead = true; frameDirty = true; }
  },
  /** Overzicht van de frame-hooks, in uitvoervolgorde van de before-delen. */
  frames() {
    return frameHooks.filter(h => !h.dead).map((h, i) => ({
      order: i, name: h.name, before: !!h.before, after: !!h.after, runs: h.runs, errors: h.errors,
      avgMs: h.runs ? Math.round((h.busyMs / h.runs) * 1000) / 1000 : 0,
    }));
  },
  /** Overzicht van de lopende taken. */
  list() {
    return [...tasks.values()].map(t => ({
      name: t.name, kind: t.kind, everyMs: t.every, runs: t.runs, errors: t.errors,
      avgMs: t.runs ? Math.round((t.busyMs / t.runs) * 100) / 100 : 0, paused: !runnable(t),
    }));
  },
  get stats() { return { tasks: tasks.size, wakeups, armed: handle !== null, frameHooks: frameHooks.filter(h => !h.dead).length, frames: frameCount }; },
};
globalThis.BerlinTick = Tick;
export default Tick;
