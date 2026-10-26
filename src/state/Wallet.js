// Berlin Life — Game State 2.0, stap 3: één portemonnee (roadmap fase 1)
//
// Het saldo bestaat nog maar op één plek: deze portemonnee, bewaard in 'berlin-state-v2' (en dus in
// elke savegame). De drie oude economieën blijven werken zoals ze geschreven zijn, maar lezen en
// schrijven hun saldo via deze ene bron:
//
//   game.economy.balanceCents      (EconomySystem — earn/spend/Pfand/ticket)   → koppeling via de class
//   game.metroEconomy.balanceCents ('metro-economy-v2' — winkels, jobs, huur …) → koppeling op het object
//   BerlinPhase34.economy cash+bank ('berlin-economy-v4@slot')                  → verdeling van hetzelfde saldo
//
// Voorheen hield elk systeem een eigen kopie bij. Geld dat via het ene systeem binnenkwam, werd door
// het volgende systeem weer overschreven (gemeten: €10 loon en €5 fooi verdwenen na één aankoop).
//
// Moet geladen worden direct na de save-keuze (SaveSlotBootV1) en vóór de Berlin Life-kern.
import { EconomySystem } from '../systems/EconomySystem.js';
import { safeParse, legacyBalance } from './SaveFormat.js';
import { readSection, writeSection } from './Store.js';

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const getItem = k => { try { return localStorage.getItem(k); } catch { return null; } };
const setItem = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { console.warn('[Berlin Life] Opslaan mislukt', k, e?.name || e); } };
const slot = () => globalThis.BerlinSaveSlots?.active || 'main';

// ── beginsaldo bepalen ─────────────────────────────────────────────────────────────────────────
// 1. de portemonnee uit de save; 2. anders (bestaande save van vóór stap 3) het saldo dat de game
// tot nu toe toonde; 3. anders (nieuwe save) het startbedrag dat de game zelf instelt.
function initialCents() {
  const own = num(readSection('wallet')?.cents);
  if (own !== null) return { cents: own, source: 'save' };
  const data = {};
  for (const k of ['metro-economy-v2', 'berlinLifeCoreV1', `berlin-economy-v4@${slot()}`]) data[k] = getItem(k);
  const legacy = legacyBalance(data, slot());
  if (legacy !== null) return { cents: legacy, source: 'migratie' };
  return { cents: null, source: 'nieuw' };
}

const start = initialCents();
let cents = start.cents;
const listeners = new Set();
const history = [];

function persist() {
  if (cents === null) return;
  writeSection('wallet', { cents });
  // Spiegels bijwerken, zodat oudere code die het saldo nog rechtstreeks uit localStorage leest
  // (en terugdraaien naar een vorige versie) hetzelfde bedrag ziet.
  const v2 = safeParse(getItem('metro-economy-v2'));
  if (v2 && typeof v2 === 'object' && v2.balanceCents !== cents) { v2.balanceCents = cents; setItem('metro-economy-v2', JSON.stringify(v2)); }
  const life = globalThis.BerlinLife?.state;
  if (life?.economy && life.economy.balanceCents !== cents) { life.economy = { ...life.economy, balanceCents: cents }; globalThis.BerlinLife.save?.(); }
  // Economie v4 verdeelt het saldo in cash en bank; cash kan nooit meer zijn dan het totaal.
  const E = globalThis.BerlinPhase34?.economy;
  if (E && num(E.cash) !== null && E.cash > cents) { E.cash = cents; E.bank = 0; setItem(`berlin-economy-v4@${slot()}`, JSON.stringify(E)); }
}

// Bij het laden meteen alle opgeslagen kopieën gelijkzetten. Anders zou de Berlin Life-kern bij het
// starten een verouderd saldo uit zijn eigen opslag terugzetten.
if (cents !== null) {
  persist();
  const life = safeParse(getItem('berlinLifeCoreV1'));
  if (life?.economy && life.economy.balanceCents !== cents) { life.economy.balanceCents = cents; setItem('berlinLifeCoreV1', JSON.stringify(life)); }
  const v4key = `berlin-economy-v4@${slot()}`, v4 = safeParse(getItem(v4key));
  if (v4 && typeof v4 === 'object') {
    const cash = Math.min(Math.max(0, num(v4.cash) || 0), cents);
    if (v4.cash !== cash || v4.bank !== cents - cash) { v4.cash = cash; v4.bank = cents - cash; setItem(v4key, JSON.stringify(v4)); }
  }
}

let notifyQueued = false;
function set(next, reason) {
  const v = Math.round(Number(next));
  if (!Number.isFinite(v)) { console.warn('[Berlin Life] Ongeldig saldo genegeerd:', next, reason); return; }
  if (v === cents) return;
  const before = cents;
  cents = v;
  history.unshift({ at: Date.now(), from: before, to: v, reason });
  history.length = Math.min(history.length, 40);
  persist();
  if (!notifyQueued) {
    notifyQueued = true;
    queueMicrotask(() => {
      notifyQueued = false;
      for (const fn of listeners) { try { fn(cents); } catch (e) { console.error('[Berlin Life] wallet listener', e); } }
      const game = globalThis.__berlinMetroGame;
      try { game?.ui?.updateEconomy?.(game.economy.snapshot()); } catch {}
      document.dispatchEvent(new CustomEvent('metro-economy-changed'));
    });
  }
}

// ── koppeling 1: EconomySystem ─────────────────────────────────────────────────────────────────
// De constructor zet het startbedrag (this.balanceCents = startingCents). Dat telt alleen voor een
// nieuwe save; bij een bestaande save wint het saldo uit de portemonnee.
const constructed = new WeakSet();
Object.defineProperty(EconomySystem.prototype, 'balanceCents', {
  configurable: true,
  get() { return cents ?? 0; },
  set(v) {
    if (!constructed.has(this)) {
      constructed.add(this);
      if (cents !== null) return;
      set(v, 'startbedrag');
      return;
    }
    set(v, 'EconomySystem');
  },
});

// ── koppeling 2: het 'metro-economy-v2'-object ─────────────────────────────────────────────────
// Fase 13–15 maakt dat object bij het starten en zet het op game.metroEconomy. Zodra dat gebeurt,
// wordt balanceCents op dat object een venster op de portemonnee.
function bindV2(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const d = Object.getOwnPropertyDescriptor(obj, 'balanceCents');
  if (d?.get?.__berlinWallet) return obj;
  const getter = () => cents ?? 0;
  getter.__berlinWallet = true;
  Object.defineProperty(obj, 'balanceCents', { configurable: true, enumerable: true, get: getter, set: v => set(v, 'metro-economy-v2') });
  return obj;
}
function bindGame(game) {
  if (!game || typeof game !== 'object' || game.__berlinWalletBound) return;
  Object.defineProperty(game, '__berlinWalletBound', { value: true });
  let current = bindV2(game.metroEconomy);
  Object.defineProperty(game, 'metroEconomy', { configurable: true, enumerable: true, get: () => current, set: v => { current = bindV2(v); } });
}
// Het spelobject wordt bij Start als globalThis.__berlinMetroGame gezet (U8StartBridge).
{
  let gameRef = globalThis.__berlinMetroGame;
  if (gameRef) bindGame(gameRef);
  Object.defineProperty(globalThis, '__berlinMetroGame', { configurable: true, enumerable: true, get: () => gameRef, set: v => { gameRef = v; bindGame(v); } });
}

export const wallet = {
  get cents() { return cents; },
  get euro() { return cents === null ? null : cents / 100; },
  /** Waar het beginsaldo vandaan kwam: 'save', 'migratie' of 'nieuw'. */
  startSource: start.source,
  /** Laatste wijzigingen (alleen in het geheugen, voor controle/debug). */
  history,
  /** Roep fn(cents) aan bij elke wijziging. Geeft een functie terug om af te melden. */
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

console.info(`[Berlin Life] Game State 2.0 stap 3: één portemonnee actief · beginsaldo uit ${start.source}${cents === null ? '' : ` (€${(cents / 100).toFixed(2)})`}`);
