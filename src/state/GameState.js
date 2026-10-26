// Berlin Life — Game State 2.0 (roadmap fase 1): stap 1 lezen, stap 2 saves, stap 3 portemonnee
//
// Eén centrale plek om de toestand van het spel te LEZEN. Deze eerste versie verandert niets aan
// de gameplay: ze leest de bestaande, verspreide bronnen uit en laat zien waar die van elkaar
// afwijken. Volgende stappen verhuizen het schrijven (geld, tijd, saves …) systeem voor systeem
// naar deze module, telkens getest tegen de referentie.
//
// Bestaande bronnen (zie docs/FASE-1-PLAN.md):
//   geld      game.economy.balanceCents · localStorage 'metro-economy-v2'.balanceCents ·
//             localStorage 'berlin-economy-v4@<slot>' (cash + bank)
//   tijd      BerlinLife.state.clock (dag + minuut) · __berlinMetroTime.minutes
//   locatie   game.player.currentStation · Street View-overlay (BerlinCleanStreet)
//   carrière, reputatie   BerlinLife.state
//   contacten, woning     'metro-economy-v2'
//   ontdekkingen          'berlin-discovery-v4@<slot>' · BerlinLife.state.discovered
//   saves                 BerlinSaveSlots

import { wallet } from './Wallet.js';

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function readJson(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const hhmm = minute => {
  if (num(minute) === null) return null;
  const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function activeSlot() {
  return globalThis.BerlinSaveSlots?.active || readJson('berlin-save-slots-v1')?.active || 'main';
}

function readMoney() {
  const game = globalThis.__berlinMetroGame;
  const slot = activeSlot();
  const v2 = readJson('metro-economy-v2');
  const v4 = globalThis.BerlinPhase34?.economy || readJson(`berlin-economy-v4@${slot}`);
  const sources = {
    game: num(game?.economy?.balanceCents),
    economyV2: num(v2?.balanceCents),
    economyV4: v4 && (num(v4.cash) !== null || num(v4.bank) !== null) ? (num(v4.cash) || 0) + (num(v4.bank) || 0) : null,
  };
  // Sinds stap 3 is de portemonnee de enige echte bron; de andere waarden zijn afgeleid.
  const primary = wallet.cents ?? sources.game ?? sources.economyV4 ?? sources.economyV2;
  sources.wallet = wallet.cents;
  return {
    cents: primary,
    euro: primary === null ? null : primary / 100,
    cash: num(v4?.cash), bank: num(v4?.bank), arrears: num(v4?.arrears), pfand: num(game?.economy?.collectedPfand ?? v2?.pfand),
    hasTicket: game?.economy?.hasTicket ?? null,
    sources,
  };
}

function readTime() {
  const life = globalThis.BerlinLife?.state?.clock;
  const metroMinutes = num(globalThis.__berlinMetroTime?.minutes);
  const day = num(life?.day);
  const minute = num(life?.minute);
  return {
    day,
    weekday: day === null ? null : DAYS[((day - 1) % 7 + 7) % 7],
    minute,
    clock: hhmm(minute),
    sources: { berlinLife: hhmm(minute), metroTime: hhmm(metroMinutes), homeDay: num(readJson('metro-economy-v2')?.home?.day) },
  };
}

function readLocation() {
  const game = globalThis.__berlinMetroGame;
  const st = game?.player?.currentStation;
  const street = globalThis.BerlinCleanStreet?.inspect?.();
  return {
    mode: street?.active ? 'streetview' : 'ubahn',
    station: st?.name ?? document.querySelector('#stationName')?.textContent ?? null,
    stationId: st?.id ?? null,
    onTrain: !!(game?.player?.onTrain ?? game?.player?.riding ?? false),
  };
}

function readLife() {
  const s = globalThis.BerlinLife?.state;
  const v2 = readJson('metro-economy-v2');
  const disc = readJson(`berlin-discovery-v4@${activeSlot()}`);
  return {
    story: s?.story ? { chapter: s.story.chapter, stage: s.story.stage, goal: s.story.goal } : null,
    career: s?.career ? { ...s.career } : null,
    reputation: s?.reputation ? { ...s.reputation } : null,
    contacts: v2?.contacts ? Object.fromEntries(Object.entries(v2.contacts).filter(([k]) => !k.startsWith('__')).map(([k, c]) => [k, { met: !!c.met, relationship: c.relationship ?? 0 }])) : null,
    home: v2?.home ? { day: v2.home.day, nextRentDay: v2.home.nextRentDay, rentDebt: v2.home.rentDebt, roomScore: v2.home.roomScore } : null,
    inventory: v2?.home?.storageItems ? { ...v2.home.storageItems } : null,
    discovery: {
      discovered: Object.keys(disc?.discovered || {}).length,
      visited: Object.keys(disc?.visited || {}).length,
      jobLeads: Object.keys(disc?.jobLeads || {}).length,
    },
  };
}

/** Volledige momentopname van de spelstatus (alleen lezen). */
export function snapshot() {
  return {
    schema: 'berlin-state/2',
    takenAt: new Date().toISOString(),
    save: { activeSlot: activeSlot(), format: globalThis.BerlinSaveSlots?.format ?? null },
    money: readMoney(),
    time: readTime(),
    location: readLocation(),
    ...readLife(),
  };
}

/** Lijst van plekken waar de verschillende bronnen elkaar tegenspreken. */
export function consistency(snap = snapshot()) {
  const issues = [];
  const m = Object.entries(snap.money.sources).filter(([, v]) => v !== null);
  if (new Set(m.map(([, v]) => v)).size > 1) issues.push({ area: 'geld', detail: Object.fromEntries(m) });
  const t = snap.time.sources;
  if (t.berlinLife && t.metroTime && t.berlinLife !== t.metroTime) issues.push({ area: 'tijd', detail: { berlinLife: t.berlinLife, metroTime: t.metroTime } });
  if (snap.time.day !== null && t.homeDay !== null && snap.time.day !== t.homeDay) issues.push({ area: 'dag', detail: { berlinLife: snap.time.day, woning: t.homeDay } });
  return issues;
}

// ── eenvoudige abonnementen: één timer, alleen actief zolang er luisteraars zijn ──
const listeners = new Set();
let timer = null, last = '';
function tick() {
  const snap = snapshot();
  const key = JSON.stringify({ ...snap, takenAt: 0 });
  if (key === last) return;
  last = key;
  for (const fn of listeners) { try { fn(snap); } catch (e) { console.error('[Berlin State] listener', e); } }
}
/** Roep fn aan bij elke wijziging van de spelstatus. Geeft een functie terug om af te melden. */
export function subscribe(fn, intervalMs = 1000) {
  listeners.add(fn);
  if (!timer) timer = setInterval(tick, intervalMs);
  return () => { listeners.delete(fn); if (!listeners.size) { clearInterval(timer); timer = null; last = ''; } };
}

export const BerlinState = {
  version: 'Game State 2.0 · stap 3 (één save-formaat, één portemonnee)',
  snapshot, consistency, subscribe,
  /** De enige portemonnee (stap 3). */
  wallet,
  /** Savegames in één formaat (stap 2): list(), saveNow(), exportSlot(id). */
  get saves() { return globalThis.BerlinSaveSlots ?? null; },
};
globalThis.BerlinState = BerlinState;
console.info('[Berlin Life] Game State 2.0: centrale state beschikbaar als BerlinState (stap 1–3)');
