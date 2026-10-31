// Berlin Life — U1 (Mijlpaal 1): Uhlandstraße ⇄ Warschauer Straße. De runtime zelf staat in LineRuntime.js
// (gedeeld met de U3 sinds U3a); hier alleen de U1-instellingen: treinen, overstappen (U1c), omgeving (U1d).
import { U1_LINE, U1_STATIONS } from '../data/u1.js';
import { createLine } from './LineRuntime.js';

export const U1 = createLine({ line: U1_LINE, stations: U1_STATIONS, withTrains: true, transfers: true, surroundings: true, label: 'Nieuw: U1 met treinen' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), U1 };
U1.install();
