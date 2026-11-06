// Berlin Life — U5 west (Mijlpaal 3): Hauptbahnhof ⇄ Alexanderplatz (7 stations, ondergronds). Runtime = LineRuntime.
// Treinen pendelen op het eigen spoor; overstap Alexanderplatz naar U2 of U8 (keuze) en terug via een bruin
// U5-bord op het U2-perron Alexanderplatz. S-Bahn (Hauptbahnhof, Brandenburger Tor) en U6 (Unter den Linden) nog dicht.
import { U5_LINE, U5_STATIONS, U5_SIGN } from '../data/u5.js';
import { createLine } from './LineRuntime.js';

export const U5 = createLine({ line: U5_LINE, stations: U5_STATIONS, withTrains: true, transfers: U5_SIGN, surroundings: false, label: 'Nieuw: U5 (Hauptbahnhof ⇄ Alexanderplatz)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U5 };
U5.install();
