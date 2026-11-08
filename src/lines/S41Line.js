// Berlin Life — S-Bahn Ringbahn S41/S42 (Fase 45, roadmap-werkplan B). Deel a (9 nov 2026): 27 stations rond het centrum,
// rondlopend spoor (`ring`), ingravingen en dijken, uitgangen + Street View; overstappen zichtbaar maar nog dicht.
// Deel b: treinen S41 (↻) en S42 (↺); c: overstappen; d: echte omgeving. Zie docs/S-RING-PLAN.md.
import { S41_LINE, S41_STATIONS } from '../data/s41.js';
import { createLine } from './LineRuntime.js';

export const S41 = createLine({ line: S41_LINE, stations: S41_STATIONS, withTrains: false, label: 'Nieuw: Ringbahn (S41 ↻ · S42 ↺)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), S41 };
S41.install();
