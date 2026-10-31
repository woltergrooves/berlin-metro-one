// Berlin Life — U3 (Mijlpaal 2): Krumme Lanke ⇄ Warschauer Straße. Zie docs/U3-PLAN.md.
// U3a: de eigen tak (13 stations, Krumme Lanke … Augsburger Straße) begaanbaar via het GOD-menu, met
// open ingravingen in Dahlem/Zehlendorf, tunnelstations en uitgangen naar Street View.
// U3b: treinen over de hele route (24 haltes) — vanaf Wittenbergplatz over het U1-spoor.
import { U3_LINE, U3_STATIONS, U3_BRANCH } from '../data/u3.js';
import { createLine } from './LineRuntime.js';

export const U3 = createLine({ line: U3_LINE, stations: U3_STATIONS, godStations: U3_BRANCH, withTrains: false, transfers: false, surroundings: false, label: 'Nieuw: U3 — eigen tak (treinen volgen)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U3 };
U3.install();
