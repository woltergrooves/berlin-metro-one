// Berlin Life — U1 (Mijlpaal 1). Uhlandstraße ⇄ Warschauer Straße, 13 stations.
//
// Bron: OpenStreetMap-route-relatie 2669206 (haltecoördinaten), urbanrail.net / Wikipedia (ligging, perrons).
// Ligging: Uhlandstraße t/m Kurfürstenstraße ondergronds; vanaf Gleisdreieck (bovenste niveau, boven de U2)
// over het viaduct van de Hochbahn tot Warschauer Straße.
//
// Speltekening (zie src/lines/LineWorld.js): de U1 ligt in een eigen gebied, ver van U2 en U8, langs de
// x-as (+x = richting Warschauer Straße), z dwars (+ = rechts in rijrichting +x), y = 0 is het perron.
// Ondergronds: grond (straat) op +6. Viaduct: straat op −elev.
//
// layout: 'island' (middenperron, sporen buiten) of 'side' (zijperrons, sporen in het midden).
// realLayout = de echte situatie; layout = wat het spel bouwt (gelijk, tenzij hieronder vermeld).

export const U1_LINE = {
  id: 'U1',
  name: 'U1',
  color: '#55a822',          // BVG-lijnkleur U1 (groen)
  textColor: '#ffffff',
  trainModel: 'bvg-hk',      // Kleinprofil (HK), net als de U2
  headwayMinutes: 5,
  spacing: 150,              // spelafstand tussen stations (m); echt gemiddeld ±720 m
  origin: { x: 0, y: 0, z: -2600 }, // ver van U2 (z −1080…3960, x≈0) en U8 (z≈49, x −1115…803)
  termini: ['uhlandstrasse', 'warschauer-strasse'],
};

// [id, naam, lat, lon, ligging, perron, hoogte (m: straat onder het perron bij viaduct), overstap, wand, accent]
const RAW = [
  ['uhlandstrasse',      'Uhlandstraße',        52.5028059, 13.3264501, 'tunnel',  'island', 0,    [],                           'e6dcc4', '7a2f2a'],
  ['kurfuerstendamm',    'Kurfürstendamm',      52.5038495, 13.3314691, 'tunnel',  'side',   0,    ['U9'],                       'd9cfb2', '2f4f7a'],
  ['wittenbergplatz',    'Wittenbergplatz',     52.5019390, 13.3430433, 'tunnel',  'island', 0,    ['U2', 'U3'],                 'efe8d6', '2d6a8f'],
  ['nollendorfplatz',    'Nollendorfplatz',     52.5001131, 13.3550595, 'tunnel',  'island', 0,    ['U2', 'U3', 'U4'],           'd3e2cc', '2e6b48'],
  ['kurfuerstenstrasse', 'Kurfürstenstraße',    52.5003037, 13.3609762, 'tunnel',  'island', 0,    ['U3'],                       'e4d48a', '7a5b1e'],
  ['gleisdreieck',       'Gleisdreieck',        52.4995715, 13.3735305, 'viaduct', 'side',   15.6, ['U2', 'U3'],                 '6f7d72', '3f5a4a'],
  ['moeckernbruecke',    'Möckernbrücke',       52.4991271, 13.3826389, 'viaduct', 'side',   7,    ['U3', 'U7'],                 '6f7d72', '3f5a4a'],
  ['hallesches-tor',     'Hallesches Tor',      52.4978374, 13.3899703, 'viaduct', 'side',   7,    ['U3', 'U6'],                 '6f7d72', '3f5a4a'],
  ['prinzenstrasse',     'Prinzenstraße',       52.4984002, 13.4050918, 'viaduct', 'side',   7,    ['U3'],                       '6f7d72', '3f5a4a'],
  ['kottbusser-tor',     'Kottbusser Tor',      52.4990137, 13.4178906, 'viaduct', 'island', 7,    ['U3', 'U8'],                 '5f7a62', '35513f'],
  ['goerlitzer-bahnhof', 'Görlitzer Bahnhof',   52.4992519, 13.4276166, 'viaduct', 'side',   7,    ['U3'],                       '5f7a62', '35513f'],
  ['schlesisches-tor',   'Schlesisches Tor',    52.5008434, 13.4414409, 'viaduct', 'side',   7,    ['U3'],                       '6f7d72', '3f5a4a'],
  ['warschauer-strasse', 'Warschauer Straße',   52.5051735, 13.4490382, 'viaduct', 'island', 7,    ['U3', 'S-Bahn', 'Tram'],     '7d8a86', '3a4a52'],
];

// Overstappen die in het spel echt begaanbaar worden (U1c). De rest staat alleen op de borden.
// line/station = waar je uitkomt; color/towards = het overstapbord op het U1-perron.
const U2X = { line: 'U2', color: '#da421e', towards: 'Pankow · Ruhleben' };
export const U1_TRANSFERS = {
  wittenbergplatz: { ...U2X, station: 'wittenbergplatz' },
  nollendorfplatz: { ...U2X, station: 'nollendorfplatz' },
  gleisdreieck:    { ...U2X, station: 'gleisdreieck' },
  'kottbusser-tor': { line: 'U8', color: '#224f86', towards: 'Wittenau · Hermannstraße', station: 18 },
};

// U1d — stationsprofielen op het viaduct (herkenbaar, niet 1:1). Zonder profiel: perronkappen in de accentkleur.
//   hall-barrel  — gesloten hal met tongewelf en glazen zijwanden over twee zijperrons (Görlitzer Bahnhof);
//   hall-green   — groene staal-en-glashal over het middenperron (Kottbusser Tor);
//   canopy-glass — losse glazen kappen per zijperron, lichte staanders (Prinzenstraße).
export const U1_PROFILES = {
  prinzenstrasse: { hall: 'canopy-glass', steel: '#d6d7d1', roof: '#e9ece9' },
  'kottbusser-tor': { hall: 'hall-green', steel: '#3d6b4c', roof: '#2f4d3a' },
  'goerlitzer-bahnhof': { hall: 'hall-barrel', steel: '#56695c', roof: '#3c4640' },
};
// U1d — echte omgeving (OpenStreetMap, tools/g4/osm2pack.py → public/assets/surroundings/u1/<id>.json).
// sunk = het water ligt lager dan de straat, met kademuren (Landwehrkanaal).
export const U1_SURROUNDINGS = {
  gleisdreieck: {}, moeckernbruecke: { sunk: true }, 'hallesches-tor': { sunk: true }, prinzenstrasse: {},
  'kottbusser-tor': {}, 'goerlitzer-bahnhof': {}, 'schlesisches-tor': {}, 'warschauer-strasse': {},
};
// Bruggen in het tussenstuk ná het genoemde station (LineWorld bouwt ze; de omgeving laat de rivier vrij).
export const U1_BRIDGES = {
  'schlesisches-tor': { name: 'Oberbaumbrücke', river: 'Spree', width: 52 },
};

export const U1_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, elev, transfers, wall, accent], index) => ({
  line: 'U1', id, name, index, lat, lon, kind, layout, realLayout: layout,
  elev: kind === 'viaduct' ? elev : 0, transfers, wall: '#' + wall, accent: '#' + accent,
  transfer: U1_TRANSFERS[id] || null, profile: U1_PROFILES[id] || null, bridge: U1_BRIDGES[id] || null,
  surroundings: U1_SURROUNDINGS[id] || null,
  x: U1_LINE.origin.x + index * U1_LINE.spacing,
}));
