// Berlin Life — U5 (Mijlpaal 3): Hauptbahnhof ⇄ Hönow (26 stations). Runtime = LineRuntime.
// West (ondergronds) + oost: ondergronds tot Tierpark, bovengronds op een aarden baan (Biesdorf-Süd, Elsterwerdaer
// Platz, Wuhletal, Hönow, met echte OSM-omgeving) en in open ingravingen tussen de Plattenbau (Kaulsdorf-Nord …
// Louis-Lewin-Straße). Overstap Alexanderplatz naar U2 of U8 (keuze) en terug via een bruin U5-bord op het
// U2-perron Alexanderplatz. S-Bahn (Hauptbahnhof, Brandenburger Tor, Frankfurter Allee, Lichtenberg, Wuhletal) en
// U6 (Unter den Linden) nog dicht. Drie treinen per richting (lange lijn).
import { U5_LINE, U5_STATIONS, U5_SIGN } from '../data/u5.js';
import { createLine } from './LineRuntime.js';

export const U5 = createLine({ line: U5_LINE, stations: U5_STATIONS, withTrains: true, trainsPerDir: 3, transfers: U5_SIGN, surroundings: true, label: 'Nieuw: U5 (Hauptbahnhof ⇄ Hönow)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U5 };
U5.install();
