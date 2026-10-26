// Berlin Life — Game State 2.0: opslag van de centrale state in 'berlin-state-v2'.
// Eén object met secties (wallet, clock …). Elke module werkt alleen zijn eigen sectie bij.
import { STATE_KEY, safeParse } from './SaveFormat.js';

let cache = null;
function load() {
  if (cache) return cache;
  let raw = null;
  try { raw = localStorage.getItem(STATE_KEY); } catch {}
  const v = safeParse(raw);
  cache = v && typeof v === 'object' ? v : {};
  return cache;
}

/** Lees een sectie (of null). */
export function readSection(name) { return load()[name] ?? null; }

/** Schrijf een sectie en sla het geheel op. */
export function writeSection(name, value) {
  const s = load();
  s.schema = 2;
  s[name] = value;
  s.updatedAt = Date.now();
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) { console.warn('[Berlin Life] Opslaan mislukt', STATE_KEY, e?.name || e); }
}
