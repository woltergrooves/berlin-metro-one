// Berlin Life — U9 (Mijlpaal 4+). Osloer Straße ⇄ Rathaus Steglitz, 18 stations, volledig ondergronds (8 nov 2026).
//
// Bron: OpenStreetMap-route-relatie 2679016 (U Osloer Straße ⇒ S+U Rathaus Steglitz; haltecoördinaten, alle sporen
// tunnel, layer −1/−2/−3). Terugrichting: relatie 2679017.
//
// Herkenbaar (niet 1:1):
//   Osloer Straße — overstap U8 (Rümmler, 1976).
//   Leopoldplatz — overstap U6 (Wedding).
//   Westhafen — overstap S-Ring (nog dicht); wandbeeld haven met kranen en schepen.
//   Turmstraße — Moabit.
//   Hansaplatz — Hansaviertel / Interbau 1957: kleurige mozaïekvlakken.
//   Zoologischer Garten — overstap U2; wandbeeld met het Elefantentor en dieren.
//   Kurfürstendamm — overstap U1. Spichernstraße — overstap U3. Berliner Straße — overstap U7.
//   Bundesplatz (S-Ring), Rathaus Steglitz (S1) — nog dicht. Schloßstraße — fel oranje Rümmler-station.
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −6200 (U1 −2600, U3 −3200, U4 −3800, U5 −4400,
// U6 −5000, U7 −5600), langs de x-as, 150 m per station. Osloer Straße = x 0, +x = richting Rathaus Steglitz.

export const U9_LINE = {
  id: 'U9',
  name: 'U9',
  color: '#f3791d',          // BVG-lijnkleur U9 (oranje)
  trainModel: 'bvg-hk',      // in werkelijkheid Großprofil (H/IK); voorlopig dezelfde treinmodellen als de andere lijnen
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -6200 }, // 600 m naast de U7 (z −5600); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['osloer-strasse', 'rathaus-steglitz'],
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel]
const RAW = [
  ['osloer-strasse',          'Osloer Straße',           52.5572181, 13.3731350, 'tunnel', 'island', ['U8'],                       'dfe4cf', '2f5a3a', null],
  ['nauener-platz',           'Nauener Platz',           52.5514647, 13.3670710, 'tunnel', 'island', [],                           'f0b47a', '7a3a12', null],
  ['leopoldplatz',            'Leopoldplatz',            52.5464499, 13.3590333, 'tunnel', 'island', ['U6'],                       'e8d88a', '6a5a12', null],
  ['amrumer-strasse',         'Amrumer Straße',          52.5421459, 13.3494883, 'tunnel', 'island', [],                           'c8dce8', '1f4a7a', null],
  ['westhafen',               'Westhafen',               52.5364786, 13.3423432, 'tunnel', 'island', ['S41', 'S42'],               'd0e0ee', '1a4a8a', { kind: 'murals', style: 'westhafen' }],
  ['birkenstrasse',           'Birkenstraße',            52.5320987, 13.3412350, 'tunnel', 'island', [],                           'e8c4b0', '8a2a1a', null],
  ['turmstrasse',             'Turmstraße',              52.5257759, 13.3411392, 'tunnel', 'island', [],                           'f0dc96', '6a5012', null],
  ['hansaplatz',              'Hansaplatz',              52.5177461, 13.3420120, 'tunnel', 'island', [],                           'e8e2d0', '2a5a8a', { kind: 'murals', style: 'hansa' }],
  ['zoologischer-garten',     'Zoologischer Garten',     52.5071612, 13.3330473, 'tunnel', 'island', ['U2', 'S3', 'S5', 'S7', 'S9'], 'f0e4c8', '3a5a2a', { kind: 'murals', style: 'zoo' }],
  ['kurfuerstendamm',         'Kurfürstendamm',          52.5037715, 13.3313480, 'tunnel', 'island', ['U1'],                       'd6e4d0', '2a5a3a', null],
  ['spichernstrasse',         'Spichernstraße',          52.4963668, 13.3307478, 'tunnel', 'island', ['U3'],                       'e6e0c6', '5a4a2a', null],
  ['guentzelstrasse',         'Güntzelstraße',           52.4920817, 13.3309061, 'tunnel', 'island', [],                           'c8e0d6', '1f5a4a', null],
  ['berliner-strasse',        'Berliner Straße',         52.4874539, 13.3308127, 'tunnel', 'island', ['U7'],                       'dce6ef', '2a4a6a', null],
  ['bundesplatz',             'Bundesplatz',             52.4774810, 13.3283618, 'tunnel', 'island', ['S41', 'S42', 'S46'],        'ead6c0', '7a3a1a', null],
  ['friedrich-wilhelm-platz', 'Friedrich-Wilhelm-Platz', 52.4717109, 13.3286106, 'tunnel', 'island', [],                           'd8d0e6', '4a2a6a', null],
  ['walther-schreiber-platz', 'Walther-Schreiber-Platz', 52.4656165, 13.3281755, 'tunnel', 'island', [],                           'f0c870', '8a5a12', null],
  ['schlossstrasse',          'Schloßstraße',            52.4614271, 13.3250187, 'tunnel', 'island', [],                           'f2a65a', '8a3a12', null],
  ['rathaus-steglitz',        'Rathaus Steglitz',        52.4568134, 13.3208049, 'tunnel', 'island', ['S1'],                       'e6dcc0', '2a3a5a', null],
];

// Overstappen. line/station = waar je uitkomt; color/towards = het overstapbord op het U9-perron.
//   Osloer Straße ⇄ U8 (oranje U9-bord aan het westeinde van het U8-perron), Zoologischer Garten ⇄ U2 (oranje U9-bord
//   aan het −z-einde van het U2-perron), Leopoldplatz ⇄ U6, Kurfürstendamm ⇄ U1, Spichernstraße ⇄ U3, Berliner Straße ⇄ U7.
//   S-Bahn (Westhafen, Bundesplatz, Rathaus Steglitz) bestaat nog niet in het spel → trapgat met echt bord, maar afgesloten.
export const U9_TRANSFERS = {
  'osloer-strasse': { line: 'U8', color: '#224f86', station: 7, towards: 'Wittenau · Hermannstraße' },
  leopoldplatz: { line: 'U6', color: '#8c6dab', station: 'leopoldplatz', towards: 'Kurt-Schumacher-Pl. · Alt-Mariendorf' },
  westhafen: { line: 'S', label: 'S41 S42', color: '#008d4f', towards: 'Ringbahn · Flughafen BER', closed: true },
  'zoologischer-garten': { line: 'U2', color: '#da421e', station: 'zoologischer-garten', towards: 'Pankow · Ruhleben' },
  kurfuerstendamm: { line: 'U1', color: '#55a822', station: 'kurfuerstendamm', towards: 'Warschauer Str. · Uhlandstr.' },
  spichernstrasse: { line: 'U3', color: '#16683d', station: 'spichernstrasse', towards: 'Warschauer Str. · Krumme Lanke' },
  'berliner-strasse': { line: 'U7', color: '#528dba', station: 'berliner-strasse', towards: 'Rudow · Rathaus Spandau' },
  bundesplatz: { line: 'S', label: 'S41 S42 S46', color: '#008d4f', towards: 'Ringbahn · Königs Wusterhausen', closed: true },
  'rathaus-steglitz': { line: 'S', label: 'S1', color: '#008d4f', towards: 'Wannsee · Oranienburg', closed: true },
};

// Bord op het U8-perron Osloer Straße en op het U2-perron Zoologischer Garten (terug naar de U9), zie LineTransfers.
export const U9_SIGN = { line: 'U9', color: '#f3791d', towards: 'Osloer Str. · Rathaus Steglitz', hint: 'Übergang U9' };

/** Stations van de U9-wereld. */
export const U9_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U9', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U9_TRANSFERS[id] || null,
  profile: typeof profile === 'string' ? { kind: profile } : profile, bridge: null, surroundings: null,
  x: U9_LINE.origin.x + index * U9_LINE.spacing,
}));
