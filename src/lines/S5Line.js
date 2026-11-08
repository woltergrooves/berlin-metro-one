// Berlin Life — S-Bahn Stadtbahn (Fase 45): Westkreuz ⇄ Ostkreuz, 14 stations op het gemetselde viaduct.
// Deel a (8 nov 2026): stations, hallen, uitgangen + Street View. Deel b: treinen BR 481 (SBahnTrains.js) —
// S5 met twee treinen per richting, S3/S7/S9 als gasten op hetzelfde spoor, met hun echte eindpunten op film,
// vertrekbord (4 regels, op tijd gesorteerd) en HUD; af en toe een ICE/RE op de Fernbahnsporen.
// Overstappen (deel c) en echte omgeving (deel d): zie docs/S-STADTBAHN-PLAN.md.
import { S5_LINE, S5_STATIONS, S5_GUESTS, S5_SIGN } from '../data/s5.js';
import { createLine } from './LineRuntime.js';
import { sbahnTemplate, FernbahnTraffic } from './SBahnTrains.js';

export const S5 = createLine({ line: S5_LINE, stations: S5_STATIONS, withTrains: true, trainsPerDir: 2, guests: S5_GUESTS, transfers: S5_SIGN, template: sbahnTemplate,
  dfiRows: 4, decor: (world, stations) => new FernbahnTraffic(world, stations), surroundings: false, label: 'Nieuw: S-Bahn Stadtbahn (S3 · S5 · S7 · S9)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), S5 };
S5.install();
