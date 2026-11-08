// Berlin Life — S-Bahn Stadtbahn (Fase 45, deel a): Westkreuz ⇄ Ostkreuz (14 stations op het gemetselde viaduct, 8 nov 2026).
// Runtime = LineRuntime. Deel a: stations begaanbaar (GOD-menu), uitgangen + Street View; treinen volgen in deel b,
// overstappen (nu nog afgesloten trapgaten) in deel c, echte omgeving in deel d. Zie docs/S-STADTBAHN-PLAN.md.
import { S5_LINE, S5_STATIONS } from '../data/s5.js';
import { createLine } from './LineRuntime.js';

export const S5 = createLine({ line: S5_LINE, stations: S5_STATIONS, withTrains: false, surroundings: false, label: 'Nieuw: S-Bahn Stadtbahn (Westkreuz ⇄ Ostkreuz)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), S5 };
S5.install();
