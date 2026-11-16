// Berlin Life — one-time save migration Dutch → English (16 Nov 2026, EN-1).
//
// Since the game switched to English, older saves can still hold Dutch display texts that were
// stored as-is (job titles, delivery addresses, transactions, diary entries, contact names).
// This runs once at boot, before any system reads localStorage: it walks every save key (also the
// JSON strings nested in the save-slot registry) and replaces known old texts with their English
// version. Only text values change — keys, ids and numbers stay untouched.
// Console: BerlinEnglishMigration.status()

const FLAG = 'berlin-en-strings-v1';
const DUTCH = /\b(de|het|een|naar|voor|bij|niet|geen|nog|je|van|op|uit|met|Koerier\w*|Buurvrouw|bezorg\w*|halte\w*|Dag)\b/;
const status = { ran: false, skipped: null, keys: 0, changed: 0, strings: 0, error: null };

function translator(PAIRS) {
  const exact = new Map(PAIRS);
  const long = PAIRS.filter(([nl]) => nl.length >= 14).sort((a, b) => b[0].length - a[0].length);
  return s => {
    if (exact.has(s)) return exact.get(s);
    if (!DUTCH.test(s)) return s;
    let out = s;
    for (const [nl, en] of long) if (out.includes(nl)) out = out.split(nl).join(en);
    return out;
  };
}

function walk(v, tr) {
  if (typeof v === 'string') {
    const t = v.trim();
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
      try { const inner = JSON.parse(t); const w = walk(inner, tr); return w === inner ? v : JSON.stringify(w); } catch {}
    }
    if (!/[A-Za-zÀ-ÿ]{2}/.test(v) || !/\s|[A-Z]/.test(v)) return v;   // ids/keys (no space, no capital) stay
    const n = tr(v);
    if (n !== v) status.strings++;
    return n;
  }
  if (Array.isArray(v)) { let ch = false; const a = v.map(x => { const y = walk(x, tr); if (y !== x) ch = true; return y; }); return ch ? a : v; }
  if (v && typeof v === 'object') {
    let ch = false; const o = {};
    for (const [k, x] of Object.entries(v)) { const y = walk(x, tr); if (y !== x) ch = true; o[k] = y; }
    return ch ? o : v;
  }
  return v;
}

async function run() {
  let ls; try { ls = globalThis.localStorage; if (!ls || ls.getItem(FLAG)) { status.skipped = 'done before'; return; } } catch { status.skipped = 'no storage'; return; }
  const keys = [];
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && /berlin|metro/i.test(k)) keys.push(k); }
  status.keys = keys.length;
  if (!keys.some(k => DUTCH.test(ls.getItem(k) || ''))) { ls.setItem(FLAG, String(Date.now())); status.skipped = 'nothing Dutch'; return; }
  const { PAIRS } = await import('./enLegacyStrings.js');
  const tr = translator(PAIRS);
  for (const k of keys) {
    const raw = ls.getItem(k); if (raw == null) continue;
    let val; try { val = JSON.parse(raw); } catch { continue; }
    const out = walk(val, tr);
    if (out !== val) { ls.setItem(k, JSON.stringify(out)); status.changed++; }
  }
  ls.setItem(FLAG, String(Date.now()));
  status.ran = true;
}

try { await run(); } catch (e) { status.error = String(e); console.warn('[Berlin Life] English save migration failed', e); }
globalThis.BerlinEnglishMigration = { status: () => ({ ...status }) };
