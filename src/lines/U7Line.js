// Berlin Life — U7a (Mijlpaal 4): Rudow ⇄ Möckernbrücke (17 stations, ondergronds). Runtime = LineRuntime.
// Westhelft Yorckstraße ⇄ Rathaus Spandau komt later (U7b, achteraan). Overstappen: Möckernbrücke ⇄ U1/U3,
// Mehringdamm ⇄ U6, Hermannplatz ⇄ U8 (blauw U7-bord op het U8-perron). S-Ring Neukölln nog dicht.
import { U7_LINE, U7_STATIONS, U7_SIGN } from '../data/u7.js';
import { createLine } from './LineRuntime.js';

export const U7 = createLine({ line: U7_LINE, stations: U7_STATIONS, withTrains: true, trainsPerDir: 3, transfers: U7_SIGN, surroundings: false, label: 'Nieuw: U7 (Rudow ⇄ Möckernbrücke)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U7 };
U7.install();
