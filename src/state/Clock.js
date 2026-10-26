// Berlin Life — Game State 2.0, stap 4: één klok (roadmap fase 1)
//
// Er was eerst geen gedeelde tijd:
//   - de zichtbare klok + dag/nacht (fase 12, `__berlinMetroTime`): 1 spelminuut per seconde,
//     begon altijd om 08:15 en werd niet opgeslagen;
//   - de Berlin Life-klok (`BerlinLife.state.clock`): weekdag + minuut, 0,4 spelminuut per seconde,
//     wél opgeslagen; bepaalt openingstijden en weekdagen van activiteiten;
//   - de woningdag (`metro-economy-v2`.home.day): telt bij middernacht van de zichtbare klok en bij slapen.
//
// Nu is er één klok. Gekozen (26 oktober 2026): de Berlin Life-klok is leidend, een nieuwe save
// begint 's ochtends (08:15). Het tempo is dat van de zichtbare klok: 1 spelminuut per echte seconde
// (een speldag = 24 minuten), zodat dag/nacht, kaartjes en huur hetzelfde blijven lopen.
//
//   dayNumber   speldag 1, 2, 3 … (= "Dag N" in het save-scherm en de woning)
//   minute      0–1439 binnen de dag
//   weekday     0 = maandag … 6 = zondag
//
// De oude plekken lezen en schrijven via deze klok (zie Phase12FixV2, BerlinLifeCoreV1, Phase162HomeV1).
import { readSection, writeSection } from './Store.js';
import { safeParse } from './SaveFormat.js';

export const MINUTES_PER_SECOND = 1;
export const NEW_GAME_MINUTE = 8 * 60 + 15;
const WEEKDAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const getItem = k => { try { return localStorage.getItem(k); } catch { return null; } };
const mod = (v, m) => ((v % m) + m) % m;

function initial() {
  const own = readSection('clock');
  if (own && num(own.dayNumber) !== null && num(own.minute) !== null) {
    return { dayNumber: Math.max(1, Math.floor(own.dayNumber)), minute: mod(own.minute, 1440), totalMinutes: num(own.totalMinutes) ?? 0, weekdayOffset: mod(Math.floor(num(own.weekdayOffset) ?? 0), 7), source: 'save' };
  }
  // Bestaande save van vóór stap 4: Berlin Life-klok (weekdag + minuut) en woningdag samenvoegen.
  const life = safeParse(getItem('berlinLifeCoreV1'))?.clock;
  const homeDay = num(safeParse(getItem('metro-economy-v2'))?.home?.day);
  if (life || homeDay !== null) {
    const dayNumber = Math.max(1, Math.floor(homeDay ?? 1));
    const weekday = num(life?.day) !== null ? mod(Math.floor(life.day), 7) : mod(dayNumber - 1, 7);
    return { dayNumber, minute: num(life?.minute) !== null ? mod(life.minute, 1440) : NEW_GAME_MINUTE, totalMinutes: num(life?.totalMinutes) ?? 0, weekdayOffset: mod(weekday - (dayNumber - 1), 7), source: 'migratie' };
  }
  return { dayNumber: 1, minute: NEW_GAME_MINUTE, totalMinutes: 0, weekdayOffset: 0, source: 'nieuw' };
}

const t = initial();
const source = t.source;
delete t.source;
const listeners = new Set();
let lastSaved = 0, dirty = false, lastHour = Math.floor(t.minute / 60), lastDay = t.dayNumber;

function save() {
  dirty = false;
  lastSaved = Date.now();
  writeSection('clock', { dayNumber: t.dayNumber, minute: Math.round(t.minute * 100) / 100, totalMinutes: Math.round(t.totalMinutes), weekdayOffset: t.weekdayOffset });
}
function changed(force = false) {
  dirty = true;
  const hour = Math.floor(t.minute / 60);
  const dayChanged = t.dayNumber !== lastDay;
  if (force || dayChanged || hour !== lastHour || Date.now() - lastSaved > 1000) save();
  if (dayChanged || hour !== lastHour || force) {
    lastHour = hour; lastDay = t.dayNumber;
    for (const fn of listeners) { try { fn(clock); } catch (e) { console.error('[Berlin Life] clock listener', e); } }
  }
}
addEventListener('pagehide', () => dirty && save());
document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) save(); });

/** Laat de tijd verder lopen (minuten, mag over middernacht). */
function advance(minutes) {
  if (!(minutes > 0)) return;
  t.minute += minutes;
  t.totalMinutes += minutes;
  while (t.minute >= 1440) { t.minute -= 1440; t.dayNumber += 1; }
  changed();
}

export const clock = {
  get dayNumber() { return t.dayNumber; },
  get minute() { return t.minute; },
  get totalMinutes() { return t.totalMinutes; },
  get weekday() { return mod(t.dayNumber - 1 + t.weekdayOffset, 7); },
  get weekdayName() { return WEEKDAYS[clock.weekday]; },
  get hhmm() { const m = Math.floor(t.minute); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; },
  /** Waar de tijd bij het laden vandaan kwam: 'save', 'migratie' of 'nieuw'. */
  source,
  /** Eén frame/tick: echte seconden → spelminuten. Alleen de spellus roept dit aan. */
  tick(realSeconds, speed = 1) { advance(Math.min(5, Math.max(0, realSeconds)) * MINUTES_PER_SECOND * speed); },
  advance,
  /** Zet de klok op een uur van dezelfde dag (debugmenu). */
  setHour(h) { t.minute = mod(h * 60, 1440); changed(true); },
  /** Zet de minuut binnen dezelfde dag. */
  setMinute(m) { t.minute = mod(m, 1440); changed(true); },
  /** ± minuten; vooruit kan over middernacht, achteruit blijft binnen de dag (zoals voorheen). */
  addMinutes(m) { if (m >= 0) advance(m); else { t.minute = mod(t.minute + m, 1440); changed(true); } },
  /** Slapen: naar de volgende dag, om `hour` uur. */
  nextMorning(hour = 8) { t.totalMinutes += mod(hour * 60 - t.minute, 1440) || 1440; t.dayNumber += 1; t.minute = hour * 60; changed(true); },
  /** Zet de speldag (bijv. als oude code home.day aanpast). */
  setDay(n) { const v = Math.max(1, Math.floor(Number(n))); if (Number.isFinite(v) && v !== t.dayNumber) { t.dayNumber = v; changed(true); } },
  /** Zet de weekdag zonder de speldag te veranderen. */
  setWeekday(w) { t.weekdayOffset = mod(Math.floor(w) - (t.dayNumber - 1), 7); changed(true); },
  /** Roep fn aan bij elk nieuw uur en elke nieuwe dag. */
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  saveNow: save,
};

/** Een object met day (weekdag), minute en totalMinutes dat rechtstreeks op de klok werkt. */
export function lifeClockView() {
  const view = {};
  Object.defineProperties(view, {
    day: { enumerable: true, get: () => clock.weekday, set: v => clock.setWeekday(v) },
    minute: { enumerable: true, get: () => t.minute, set: v => { const d = Number(v) - t.minute; if (d > 0 && d < 60) advance(d); else clock.setMinute(v); } },
    totalMinutes: { enumerable: true, get: () => t.totalMinutes, set: () => {} },
  });
  return view;
}

/** Koppelt home.day aan de speldag. */
export function bindHomeDay(home) {
  if (!home || typeof home !== 'object') return home;
  const d = Object.getOwnPropertyDescriptor(home, 'day');
  if (d?.get?.__berlinClock) return home;
  const get = () => t.dayNumber;
  get.__berlinClock = true;
  Object.defineProperty(home, 'day', { configurable: true, enumerable: true, get, set: v => clock.setDay(v) });
  return home;
}

save();
globalThis.BerlinClock = clock;
console.info(`[Berlin Life] Game State 2.0 stap 4: één klok · dag ${t.dayNumber} (${clock.weekdayName}) ${clock.hhmm} · uit ${source}`);
