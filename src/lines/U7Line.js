// Berlin Life — U7 (Mijlpaal 4): Rudow ⇄ Rathaus Spandau (40 stations, volledig ondergronds). Runtime = LineRuntime.
// U7a (7 nov 2026): Rudow ⇄ Möckernbrücke; U7b (8 nov 2026): Yorckstraße ⇄ Rathaus Spandau, achteraan (index 17 …).
// Overstappen: Hermannplatz ⇄ U8 (blauw U7-bord op het U8-perron), Mehringdamm ⇄ U6, Möckernbrücke ⇄ U1/U3,
// Bayerischer Platz ⇄ U4, Fehrbelliner Platz ⇄ U3, Bismarckstraße ⇄ U2 (blauw U7-bord op het U2-perron).
// Dicht: S-Bahn (Neukölln, Yorckstraße, Wilmersdorfer Straße, Jungfernheide, Rathaus Spandau) en U9 (Berliner Straße).
// Vijf treinen per richting (lange lijn).
import { U7_LINE, U7_STATIONS, U7_SIGN } from '../data/u7.js';
import { createLine } from './LineRuntime.js';

export const U7 = createLine({ line: U7_LINE, stations: U7_STATIONS, withTrains: true, trainsPerDir: 5, transfers: U7_SIGN, surroundings: false, label: 'Nieuw: U7 (Rudow ⇄ Rathaus Spandau)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U7 };
U7.install();
