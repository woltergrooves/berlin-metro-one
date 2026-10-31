// Berlin Life — U4: Nollendorfplatz ⇄ Innsbrucker Platz (5 stations, ondergronds). Runtime = LineRuntime.
// Treinen pendelen op het eigen spoor; overstap Nollendorfplatz naar U1/U3 of U2 (keuze), U7/Ring nog dicht.
import { U4_LINE, U4_STATIONS } from '../data/u4.js';
import { createLine } from './LineRuntime.js';

export const U4 = createLine({ line: U4_LINE, stations: U4_STATIONS, withTrains: true, transfers: false, surroundings: false, label: 'Nieuw: U4 (Nollendorfplatz ⇄ Innsbrucker Platz)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U4 };
U4.install();
