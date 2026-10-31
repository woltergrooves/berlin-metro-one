// Berlin Life — U3 (Mijlpaal 2): Krumme Lanke ⇄ Warschauer Straße. Zie docs/U3-PLAN.md.
// U3a: de eigen tak (13 stations, Krumme Lanke … Augsburger Straße) begaanbaar via het GOD-menu, met
// open ingravingen in Dahlem/Zehlendorf, tunnelstations en uitgangen naar Street View.
// U3b: treinen over de hele route (24 haltes) — vanaf Wittenbergplatz over het U1-spoor.
// Overgang: in het midden van de tunnel Augsburger Straße → Wittenbergplatz. De U3-wereld (z = −3200) en de
// U1-wereld (z = −2600) hebben hetzelfde x-raster; vanaf x = 262 liggen beide sporen recht op middenperron-ligging
// (de S-bocht van de U1 bij Kurfürstendamm eindigt op x = 237), dus een meerijder merkt de wissel niet.
// Te zien: in de U3-wereld tot het einde van de kopie van Wittenbergplatz, in de U1-wereld pas voorbij het
// perron van Kurfürstendamm (x ≥ 236), zodat een U3 daar niet door het U1-station rijdt.
import { U3_LINE, U3_STATIONS, U3_BRANCH, U3_ROUTE, U3_SPLIT_X } from '../data/u3.js';
import { U1_LINE, U1_STATIONS } from '../data/u1.js';
import { createLine } from './LineRuntime.js';

const zones = [
  { id: 'U3', stations: U3_STATIONS, origin: U3_LINE.origin, to: U3_SPLIT_X, viewMax: 360 },
  { id: 'U1', stations: U1_STATIONS, origin: U1_LINE.origin, from: U3_SPLIT_X, viewMin: 236 },
];
export const U3 = createLine({ line: U3_LINE, stations: U3_STATIONS, godStations: U3_BRANCH, route: U3_ROUTE, zones, withTrains: true, transfers: false, surroundings: false, label: 'Nieuw: U3 met treinen (Krumme Lanke ⇄ Warschauer Straße)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U3 };
U3.install();
