// Berlin Life — U3 (Mijlpaal 2). Krumme Lanke ⇄ Warschauer Straße, 24 stations.
//
// Bron: OpenStreetMap-route-relatie 2669208 (haltecoördinaten, tunnel/cutting-tags), urbanrail.net / Wikipedia.
// Ligging: Krumme Lanke t/m Podbielskiallee in een open ingraving (cutting, villawijk Dahlem/Zehlendorf);
// vanaf Breitenbachplatz ondergronds tot Wittenbergplatz. Van Wittenbergplatz tot Warschauer Straße (11 stations)
// rijdt de U3 over het spoor van de U1 (src/data/u1.js) — die stations worden niet opnieuw gebouwd.
//
// Speltekening (zie src/lines/LineWorld.js en docs/U3-PLAN.md): de eigen U3-tak ligt in een eigen gebied,
// evenwijdig aan de U1 op z = −3200 (U1: z = −2600), met dezelfde x-indeling: Augsburger Straße op x = 150,
// Wittenbergplatz op x = 300 (zelfde x als op de U1). Zo kan een U3-trein in de tunnel tussen Augsburger Straße
// en Wittenbergplatz ongemerkt van het U3-gebied naar het U1-gebied overgaan (U3b): alleen z verandert.
//
// kind: 'tunnel' | 'cutting' (open ingraving: perron onder straatniveau, open lucht, keerwanden).
// layout: 'island' (middenperron) of 'side' (zijperrons). Herkenbaar, niet 1:1.

import { U1_STATIONS } from './u1.js';

export const U3_LINE = {
  id: 'U3',
  name: 'U3',
  color: '#16683d',          // BVG-lijnkleur U3 (donkergroen)
  textColor: '#ffffff',
  trainModel: 'bvg-hk',      // Kleinprofil (HK), net als U1/U2
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: -1650, y: 0, z: -3200 }, // 600 m naast de U1 (z −2600); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['krumme-lanke', 'warschauer-strasse'],
  joinAt: 'wittenbergplatz',  // hier begint het gedeelde spoor met de U1
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel]
const RAW = [
  ['krumme-lanke',       'Krumme Lanke',         52.4430844, 13.2409997, 'cutting', 'island', [],                  'b9ad97', '7a2f22', 'terminus'],
  ['onkel-toms-huette',  'Onkel Toms Hütte',     52.4498256, 13.2526899, 'cutting', 'side',   [],                  'b9ad97', '9a6a2a', 'ladenstrasse'],
  ['oskar-helene-heim',  'Oskar-Helene-Heim',    52.4504272, 13.2687116, 'cutting', 'island', [],                  'b9ad97', '4a6a3a', null],
  ['freie-universitaet', 'Freie Universität (Thielplatz)', 52.4509977, 13.2814971, 'cutting', 'island', [],        'b9ad97', '2f5a7a', null],
  ['dahlem-dorf',        'Dahlem-Dorf',          52.4570906, 13.2893426, 'cutting', 'island', [],                  'b4a58a', '6a4a2a', 'thatch'],
  ['podbielskiallee',    'Podbielskiallee',      52.4639457, 13.2951491, 'cutting', 'island', [],                  'b9ad97', '3f5a4a', null],
  ['breitenbachplatz',   'Breitenbachplatz',     52.4670281, 13.3087573, 'tunnel',  'island', [],                  'd6e0e8', '3f5f7a', null],
  ['ruedesheimer-platz', 'Rüdesheimer Platz',    52.4729514, 13.3143280, 'tunnel',  'island', [],                  'e3c9a8', '8a3b2a', null],
  ['heidelberger-platz', 'Heidelberger Platz',   52.4800449, 13.3129539, 'tunnel',  'island', ['S41', 'S42', 'S46'], 'd8d0bd', '6b5b45', 'vault'],
  ['fehrbelliner-platz', 'Fehrbelliner Platz',   52.4902943, 13.3146688, 'tunnel',  'island', ['U7'],              'e9d6b8', 'c0502a', null],
  ['hohenzollernplatz',  'Hohenzollernplatz',    52.4939935, 13.3243336, 'tunnel',  'island', [],                  'cfe0d6', '2f5f4f', null],
  ['spichernstrasse',    'Spichernstraße',       52.4967561, 13.3316082, 'tunnel',  'island', ['U9'],              'e7e2cf', '4c6b3a', null],
  ['augsburger-strasse', 'Augsburger Straße',    52.5001249, 13.3360701, 'tunnel',  'island', [],                  'e8dfb0', '6a5a2a', null],
];

// Stationsprofielen (LineWorld): herkenbaar, niet 1:1.
//   terminus     — Krumme Lanke: eindpunt met stationsgebouw dwars over het perroneinde;
//   ladenstrasse — Onkel Toms Hütte: zijperrons met winkelarcade (Ladenstraße) langs beide kanten;
//   thatch       — Dahlem-Dorf: vakwerk-ingangsgebouw met rieten dak boven de ingraving;
//   vault        — Heidelberger Platz: hoge gewelfde hal ("kathedraal") met kroonluchters.
// U3c — overstappen op de eigen tak. U7, U9 en de Ringbahn bestaan nog niet in het spel: het trapgat is er,
// met het echte overstapbord, maar afgesloten (closed) — de HUD zegt dat die lijn later komt.
export const U3_TRANSFERS = {
  'heidelberger-platz': { line: 'S', label: 'S41 S42 S46', color: '#008d4f', towards: 'Ringbahn · S41 S42 S46', closed: true },
  'fehrbelliner-platz': { line: 'U7', color: '#528dba', station: 'fehrbelliner-platz', towards: 'Rathaus Spandau · Rudow' },
  spichernstrasse:      { line: 'U9', color: '#f3791d', station: 'spichernstrasse', towards: 'Osloer Straße · Rathaus Steglitz' },
};

export const U3_PROFILES = Object.fromEntries(RAW.filter(r => r[9]).map(r => [r[0], { kind: r[9] }]));

const branch = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U3', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U3_TRANSFERS[id] || null, profile: profile ? { kind: profile } : null, bridge: null, surroundings: null,
  x: U3_LINE.origin.x + index * U3_LINE.spacing,
}));

// Wittenbergplatz als laatste station van de U3-wereld: alleen het uiterlijk (de tunnel naar Augsburger Straße
// moet ergens heen lopen). Spelen gebeurt op het echte U1-station; dit exemplaar is niet begaanbaar.
const join = U1_STATIONS.find(s => s.id === U3_LINE.joinAt);
const joinCopy = { ...join, line: 'U3', index: branch.length, shared: true, transfer: null, x: U3_LINE.origin.x + branch.length * U3_LINE.spacing };

/** Stations van de U3-wereld (eigen tak + kopie Wittenbergplatz). */
export const U3_STATIONS = [...branch, joinCopy];
/** Alleen de eigen, begaanbare U3-stations (GOD-menu, save). */
export const U3_BRANCH = branch;
/** De hele U3-route (24 haltes): eigen tak + de gedeelde U1-stations Wittenbergplatz … Warschauer Straße. */
export const U3_ROUTE = [...branch, ...U1_STATIONS.slice(U1_STATIONS.indexOf(join))];

/** U3b: lijnpositie waar U3-treinen van het U3-spoor op het U1-spoor overgaan (tunnel Augsburger Str. → Wittenbergplatz). */
export const U3_SPLIT_X = 262;

if (joinCopy.x !== join.x) console.warn('[Metro] U3: Wittenbergplatz ligt niet op dezelfde x als op de U1');
