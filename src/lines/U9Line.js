// Berlin Life — U9: Osloer Straße ⇄ Rathaus Steglitz (18 stations, volledig ondergronds, 8 nov 2026). Runtime = LineRuntime.
// Overstappen: Osloer Straße ⇄ U8 (oranje U9-bord op het U8-perron), Leopoldplatz ⇄ U6, Zoologischer Garten ⇄ U2
// (oranje U9-bord op het U2-perron), Kurfürstendamm ⇄ U1, Spichernstraße ⇄ U3, Berliner Straße ⇄ U7.
// Dicht: S-Bahn (Westhafen, Bundesplatz, Rathaus Steglitz). Drie treinen per richting.
import { U9_LINE, U9_STATIONS, U9_SIGN } from '../data/u9.js';
import { createLine } from './LineRuntime.js';

export const U9 = createLine({ line: U9_LINE, stations: U9_STATIONS, withTrains: true, trainsPerDir: 3, transfers: U9_SIGN, surroundings: false, label: 'Nieuw: U9 (Osloer Straße ⇄ Rathaus Steglitz)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U9 };
U9.install();
