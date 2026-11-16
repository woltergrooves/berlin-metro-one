// Berlin Life — S-Bahn Nord-Süd-Bahn (Phase 45, roadmap work plan C, 16 Nov 2026): Gesundbrunnen ⇄ Südkreuz through the
// north–south tunnel, 10 stations. Trains BR 481: S2 2 per direction, S25 and S26 as guests on the same track.
// Transfers to the Ring, U8, Stadtbahn, U6, U5, U2 and U7. See docs/S-NORDSUED-PLAN.md.
import { S2_LINE, S2_STATIONS, S2_GUESTS, S2_SIGN } from '../data/s2.js';
import { createLine } from './LineRuntime.js';
import { sbahnTemplate } from './SBahnTrains.js';

export const S2 = createLine({ line: S2_LINE, stations: S2_STATIONS, withTrains: true, trainsPerDir: 2, guests: S2_GUESTS, template: sbahnTemplate,
  dfiRows: 4, transfers: S2_SIGN, label: 'New: Nord-Süd-Bahn (S2 · S25 · S26)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), S2 };
S2.install();
