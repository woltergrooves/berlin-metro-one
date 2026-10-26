// Berlin Life — Game State 2.0, stap 2: één save-formaat (roadmap fase 1)
//
// Eén savegame = één slot in het register 'berlin-save-slots-v1' met ALLE sleutels van dat spel:
//   - de gedeelde sleutels die het spel tijdens het spelen gebruikt (CANONICAL_KEYS)
//   - de sleutels die al per slot een eigen naam hebben (economie v4, ontdekkingen v4)
//   - 'berlin-state-v2' (centrale state: de portemonnee uit stap 3)
//
// Compatibel met de vorige versie: het register houdt `schema: 1` en `slot.data` blijft een lijst
// "sleutel → ruwe tekst". Oudere code van de game kan deze saves dus nog steeds openen (handig bij
// terugdraaien). Nieuw is `format: 2` per slot plus `savedAt`.
//
// Dit bestand bevat alleen pure functies (geen DOM), zodat het los te testen is.

export const REGISTRY_KEY = 'berlin-save-slots-v1';
export const STATE_KEY = 'berlin-state-v2';
export const FORMAT = 2;
export const FORMAT_NAME = 'berlin-save/2';
export const BACKUP_KEY = 'berlin-save-slots-v1.before-format-2';

/** Sleutels die het spel gedeeld gebruikt en die bij het wisselen van save worden vervangen. */
export const CANONICAL_KEYS = ['metro-economy-v2', 'berlinLifeCoreV1', 'metro-highlight-visits-v2', STATE_KEY];
/** Vorige versie: alleen deze drie sleutels zaten in een save. */
export const LEGACY_CANONICAL_KEYS = ['metro-economy-v2', 'berlinLifeCoreV1', 'metro-highlight-visits-v2'];

/** Sleutels die al per slot een eigen naam hebben. */
export const slotKeys = id => [`berlin-economy-v4@${id}`, `berlin-discovery-v4@${id}`];
/** Alle sleutels die samen één savegame vormen. */
export const saveKeys = id => [...CANONICAL_KEYS, ...slotKeys(id)];

export function safeParse(raw, fallback = null) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function emptyRegistry(now = Date.now()) {
  return { schema: 1, format: FORMAT, active: null, slots: {}, createdAt: now };
}

/**
 * Bepaalt het saldo van een save volgens de oude regels, zoals de game het tot nu toe toonde:
 * bij het laden won 'metro-economy-v2', daarna de Berlin Life-kern, daarna economie v4.
 */
export function legacyBalance(data, id) {
  const v2 = safeParse(data?.['metro-economy-v2']);
  const life = safeParse(data?.berlinLifeCoreV1);
  const v4 = safeParse(data?.[`berlin-economy-v4@${id}`]);
  const v4total = v4 && (num(v4.cash) !== null || num(v4.bank) !== null) ? (num(v4.cash) || 0) + (num(v4.bank) || 0) : null;
  return num(v2?.balanceCents) ?? num(life?.economy?.balanceCents) ?? v4total;
}

/** Maakt de inhoud van 'berlin-state-v2' (null als er nog geen saldo bekend is). */
export function makeState(cents, now = Date.now()) {
  if (num(cents) === null) return null;
  return JSON.stringify({ schema: 2, wallet: { cents: Math.round(cents) }, updatedAt: now });
}

/**
 * Zet één slot om naar formaat 2. `getItem` leest de huidige localStorage (voor de sleutels die
 * per slot een eigen naam hebben en dus nooit in het oude slot zaten).
 */
export function migrateSlot(slot, id, getItem, now = Date.now()) {
  if (slot?.format === FORMAT) return { slot, changed: false };
  const data = { ...(slot?.data || {}) };
  for (const k of slotKeys(id)) {
    if (data[k] == null) { const v = getItem(k); if (v != null) data[k] = v; }
  }
  if (data[STATE_KEY] == null) {
    const st = makeState(legacyBalance(data, id), now);
    if (st) data[STATE_KEY] = st;
  }
  return { slot: { ...slot, id: slot?.id || id, format: FORMAT, savedAt: slot?.updatedAt || now, data }, changed: true };
}

/** Zet het hele register om. Geeft { registry, changed } terug. */
export function migrateRegistry(registry, getItem, now = Date.now()) {
  if (!registry || registry.schema !== 1) return { registry: emptyRegistry(now), changed: true };
  let changed = registry.format !== FORMAT;
  const slots = {};
  for (const [id, slot] of Object.entries(registry.slots || {})) {
    const r = migrateSlot(slot, id, getItem, now);
    slots[id] = r.slot;
    changed ||= r.changed;
  }
  return { registry: { ...registry, format: FORMAT, slots }, changed };
}

/** Leest de huidige spelsleutels van een slot uit localStorage (alleen sleutels die bestaan). */
export function capture(id, getItem) {
  const data = {};
  for (const k of saveKeys(id)) { const v = getItem(k); if (v != null) data[k] = v; }
  return data;
}

/** Samenvatting voor het keuzescherm: dag, geld, voltooide koeriersjobs. */
export function describe(slot) {
  const d = slot?.data || {};
  const econ = safeParse(d['metro-economy-v2'], {}) || {};
  const life = safeParse(d.berlinLifeCoreV1, {}) || {};
  const st = safeParse(d[STATE_KEY], {}) || {};
  const day = num(st?.clock?.dayNumber) ?? (econ?.home?.day || ((life?.clock?.day ?? 0) + 1) || 1);
  const cents = num(st?.wallet?.cents) ?? num(econ?.balanceCents) ?? num(life?.economy?.balanceCents) ?? 0;
  const done = econ?.jobStats?.done || 0;
  return { day, cents, done };
}

/** Exporteerbaar bestand voor één slot. */
export function exportSlot(slot, id) {
  return { type: 'berlin-life-save', format: FORMAT_NAME, slot: id, label: slot?.label, savedAt: slot?.savedAt || slot?.updatedAt || null, data: { ...(slot?.data || {}) } };
}
