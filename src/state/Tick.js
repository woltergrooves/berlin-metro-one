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
//   Tick.cancel(id)                            stop een taak (null/undefined mag)
//   Tick.list()                                overzicht voor de GOD/inspector en probes
//
// Gedrag per taak is verder gelijk aan setInterval: de eerste aanroep is na `ms`, niet direct.

const SLACK_MS = 16;      // taken die binnen één frame aan de beurt zijn, samen draaien
const MAX_ERRORS_LOGGED = 3;

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

export const Tick = {
  version: 'Tick 1 · fase 1 stap 7 deel 1',
  /** Herhaal fn elke ms (pauzeert bij verborgen tabblad, tenzij background). */
  every: (name, ms, fn, opts = {}) => add('every', name, ms, fn, { background: !!opts.background }),
  /** Roep fn elke ms aan tot die iets waars teruggeeft of timeoutMs verstrijkt. */
  until: (name, ms, fn, timeoutMs = null, onTimeout = null) => add('until', name, ms, fn, { background: true, timeoutMs, onTimeout }),
  /** Stop een taak. */
  cancel(id) { if (id != null && tasks.delete(id)) arm(); },
  /** Overzicht van de lopende taken. */
  list() {
    return [...tasks.values()].map(t => ({
      name: t.name, kind: t.kind, everyMs: t.every, runs: t.runs, errors: t.errors,
      avgMs: t.runs ? Math.round((t.busyMs / t.runs) * 100) / 100 : 0, paused: !runnable(t),
    }));
  },
  get stats() { return { tasks: tasks.size, wakeups, armed: handle !== null }; },
};
globalThis.BerlinTick = Tick;
export default Tick;
