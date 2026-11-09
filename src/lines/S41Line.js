// Berlin Life — S-Bahn Ringbahn S41/S42 (Fase 45, roadmap-werkplan B). Deel a (9 nov 2026): 27 stations rond het centrum,
// rondlopend spoor (`ring`), ingravingen en dijken, uitgangen + Street View.
// Deel b (9 nov): treinen BR 481 — de S41 rijdt alleen met de klok mee (richting +1), de S42 als tweede lijn alleen
// tegen de klok in (−1); ze keren nooit (RingTimeline: volgende halte modulo 27, sprong rond de naad Wedding ⇄
// Gesundbrunnen). Deel c: overstappen; d: echte omgeving. Zie docs/S-RING-PLAN.md.
import { S41_LINE, S41_STATIONS, S42_LINE, S41_SIGN } from '../data/s41.js';
import { createLine } from './LineRuntime.js';
import { sbahnTemplate } from './SBahnTrains.js';

export const S41 = createLine({ line: S41_LINE, stations: S41_STATIONS, withTrains: true, trainsPerDir: 4, dirs: [1],
  guests: [{ line: S42_LINE, perDir: 4, dirs: [-1] }], template: sbahnTemplate, dfiRows: 2, transfers: S41_SIGN, surroundings: true,
  label: 'Nieuw: Ringbahn (S41 ↻ · S42 ↺)' });
globalThis.BerlinLines = { ...(globalThis.BerlinLines || {}), S41 };
S41.install();
