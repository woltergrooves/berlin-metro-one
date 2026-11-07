// Berlin Life — U6 (Mijlpaal 4): Alt-Mariendorf ⇄ Kurt-Schumacher-Platz (24 stations, ondergronds). Runtime = LineRuntime.
// Noordstuk naar Alt-Tegel is in werkelijkheid in renovatie (tot 2027) → komt later. Overstappen: Unter den Linden ⇄ U5,
// Stadtmitte ⇄ U2 (lila U6-bord op het U2-perron), Hallesches Tor ⇄ U1/U3. S-Bahn, U7 en U9 nog dicht.
import { U6_LINE, U6_STATIONS, U6_SIGN } from '../data/u6.js';
import { createLine } from './LineRuntime.js';

export const U6 = createLine({ line: U6_LINE, stations: U6_STATIONS, withTrains: true, trainsPerDir: 3, transfers: U6_SIGN, surroundings: false, label: 'Nieuw: U6 (Alt-Mariendorf ⇄ Kurt-Schumacher-Platz)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U6 };
U6.install();
