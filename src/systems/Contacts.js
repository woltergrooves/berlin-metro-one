import { Tick } from '../state/Tick.js';
// Contacten (Miro, Lea, Deniz) — fase 1 stap 5: vervangt ContactsV1 + ContactsV2.
//
// Wat hiervan overbleef in het live spel:
// - De praatkaartjes van V1 en V2 werden allebei elke 90 ms weggehaald door Phase16StabilityV2
//   (dat heeft een eigen praatknop). Die kaartjes zijn dus vervallen.
// - Het enige zichtbare effect: elke speldag een bericht van ieder contact dat je hebt ontmoet.
//   Dat gebeurt nu bij een nieuwe dag op de centrale klok, niet meer via een timer van 1,2 s.
// - "Ontmoet" (met) bepaalt zichtbaarheid; `unlocked` volgt `met` (alleen nog voor oude saves).
import { clock } from '../state/Clock.js';

const KEY = 'metro-economy-v2';
const IDS = ['miro', 'lea', 'deniz'];

function read(game) {
  if (game.metroEconomy) return game.metroEconomy;
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

function ensure(s) {
  if (!s) return null;
  s.contacts ??= {};
  s.messages ??= [];
  for (const id of IDS) {
    const st = (s.contacts[id] ??= { met: false, relationship: 0, lastTalkDay: 0, unlocked: false });
    st.unlocked = !!st.met;
  }
  return s;
}

function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  document.dispatchEvent(new CustomEvent('metro-contacts-changed'));
  document.dispatchEvent(new CustomEvent('metro-economy-changed'));
}

function addMessage(s, id, text, day) {
  const mid = `${id}:${day}:${text}`;
  if (s.messages.some(m => m.id === mid)) return false;
  s.messages.unshift({ id: mid, from: id, text, day, read: false, at: Date.now() });
  s.messages = s.messages.slice(0, 30);
  return true;
}

function dailyText(id, s, day) {
  if (id === 'miro') return day % 2 ? `Dag ${day}: ik heb vandaag weer koeriersritten vanaf Alexander.` : 'Als je geld nodig hebt: check de Späti. Nieuwe ritten.';
  if (id === 'lea') return (s.home?.nextRentDay - day) <= 1 ? 'Kleine reminder: de huur komt eraan.' : 'Alles rustig in de Altbau vandaag.';
  const m = clock.minute;
  return (m >= 1320 || m < 360) ? 'Kotti is nog wakker. Nachtwerk komt later.' : 'Vanavond ben ik rond Kotti.';
}

/** Eén keer per speldag: berichtjes van contacten die je al ontmoet hebt. */
function daily(game) {
  const s = ensure(read(game));
  if (!s) return;
  const day = s.home?.day || clock.dayNumber || 1;
  if (s.contacts.__dailyDay === day) return;
  s.contacts.__dailyDay = day;
  for (const id of IDS) if (s.contacts[id].met) addMessage(s, id, dailyText(id, s, day), day);
  save(s);
}

function install(game) {
  if (game.__contacts) return;
  game.__contacts = true;
  if (!ensure(read(game))) return;
  daily(game);
  clock.subscribe(() => daily(game));
  game.contactsVersion = 'merged';
}

(async () => {
  for (let i = 0; i < 500; i++) {
    const g = globalThis.__berlinMetroGame;
    if (g?.player && g?.ui) { install(g); return; }
    await Tick.sleep(100,'boot.Contacts');
  }
})().catch(e => console.error('[Metro] Contacts failed', e));
