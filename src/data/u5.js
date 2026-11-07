// Berlin Life — U5 (Mijlpaal 3). Hauptbahnhof ⇄ Hönow, 26 stations.
// U5 west: Hauptbahnhof ⇄ Alexanderplatz, ondergronds. U5 oost: Schillingstraße ⇄ Hönow — ondergronds tot Tierpark,
// dan bovengronds (Biesdorf-Süd, Elsterwerdaer Platz op een dijk, Wuhletal naast de S5), in een open ingraving tussen
// de Plattenbau van Kaulsdorf/Hellersdorf (Kaulsdorf-Nord … Louis-Lewin-Straße) en bovengronds eindpunt Hönow.
// Liggingen volgens de OSM-wegen van de relatie (tunnel / embankment / cutting).
//
// Bron: OpenStreetMap-route-relatie 2227743 (U Hauptbahnhof ⇒ U Hönow; haltecoördinaten), urbanrail.net / Wikipedia.
// Het westelijke stuk (de vroegere U55 + de "Lückenschluss" van 2020) loopt onder het regeringskwartier,
// Unter den Linden en de Museumsinsel door naar het oude U5-station Alexanderplatz (1930). Daarna gaat de
// oude U5 (1930 tot Friedrichsfelde, Grenander-tegelstations onder de Karl-Marx-Allee) verder, 1973 tot Tierpark, 1988/89 bovengronds naar Hönow.
//
// Herkenbaar (niet 1:1):
//   Hauptbahnhof — licht, modern, grijs/wit. Bundestag — kaal beton.
//   Brandenburger Tor — zandsteenkleur met historische foto's (profiel 'photos').
//   Unter den Linden — donkerblauw/grijs, kruising met de U6 (overstap).
//   Museumsinsel — donkerblauw gewelf met sterrenhemel (profiel 'stars', naar Schinkels Zauberflöte-decor).
//   Rotes Rathaus — grijs met roodbruin accent. Alexanderplatz — het oude groen-grijze U5-perron.
//   Oost: elk 1930-station een eigen tegelkleur (Grenander); Magdalenenstraße en Tierpark met wandschilderingen
//   (profiel 'murals'); Kienberg felgroen (IGA 2017); ingravingen met Plattenbau erboven (profiel city 'platte').
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −4400 (U1 −2600, U3 −3200, U4 −3800), langs de
// x-as, +x = richting Hönow, 150 m per station. Hauptbahnhof = x 0, Alexanderplatz = x 900, Hönow = x 3750.
// Bovengronds = ligging 'viaduct' met embank (aarden baan, LineWorld.embankment) en straat op −elev.

export const U5_LINE = {
  id: 'U5',
  name: 'U5',
  color: '#7e5330',          // BVG-lijnkleur U5 (bruin)
  trainModel: 'bvg-hk',      // in werkelijkheid Großprofil (H/IK); voorlopig dezelfde treinmodellen als de andere lijnen
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -4400 }, // 600 m naast de U4 (z −3800); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['hauptbahnhof', 'hoenow'],
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel, hoogte (m, bovengronds: straat onder het spoor)]
const RAW = [
  ['hauptbahnhof',      'Hauptbahnhof',      52.5251423, 13.3700843, 'tunnel', 'island', ['S3', 'S5', 'S7', 'S9'], 'e8eaec', '4a5560', null],
  ['bundestag',         'Bundestag',         52.5201499, 13.3728265, 'tunnel', 'island', [],                       'd6d3cc', '5f6369', null],
  ['brandenburger-tor', 'Brandenburger Tor', 52.5165428, 13.3811753, 'tunnel', 'island', ['S1', 'S2', 'S25', 'S26'], 'dccaa2', '5b4a33', 'photos'],
  ['unter-den-linden',  'Unter den Linden',  52.5169314, 13.3898289, 'tunnel', 'island', ['U6'],                   'cdd2d6', '1f2f45', null],
  ['museumsinsel',      'Museumsinsel',      52.5171411, 13.3993940, 'tunnel', 'island', [],                       'c4cad4', '1b2c5a', 'stars'],
  ['rotes-rathaus',     'Rotes Rathaus',     52.5189128, 13.4082907, 'tunnel', 'island', [],                       'bcb7b0', '7a2a22', null],
  ['alexanderplatz',    'Alexanderplatz',    52.5216433, 13.4140891, 'tunnel', 'island', ['U2', 'U8', 'S'],        'b9c6a8', '3d5a3a', null],
  // ── U5 oost ──
  ['schillingstrasse',  'Schillingstraße',   52.5206939, 13.4212287, 'tunnel', 'island', [],                       'e7c96a', '6b5320', null],
  ['strausberger-platz','Strausberger Platz',52.5179666, 13.4322487, 'tunnel', 'island', [],                       'a9bccb', '33495e', null],
  ['weberwiese',        'Weberwiese',        52.5166105, 13.4453458, 'tunnel', 'island', [],                       'e9dc8c', '6a5a1c', null],
  ['frankfurter-tor',   'Frankfurter Tor',   52.5157244, 13.4540173, 'tunnel', 'island', [],                       '8fc1b5', '235a50', null],
  ['samariterstrasse',  'Samariterstraße',   52.5145978, 13.4653954, 'tunnel', 'island', [],                       'd99a8a', '7a2e22', null],
  ['frankfurter-allee', 'Frankfurter Allee', 52.5135547, 13.4757042, 'tunnel', 'island', ['S41', 'S42', 'S8', 'S85'], 'e3d8a8', '5a4a1c', null],
  ['magdalenenstrasse', 'Magdalenenstraße',  52.5123655, 13.4874854, 'tunnel', 'island', [],                       'c9c2b4', '6a3a2a', { kind: 'murals', style: 'lichtenberg' }],
  ['lichtenberg',       'Lichtenberg',       52.5110033, 13.4988952, 'tunnel', 'island', ['S5', 'S7', 'S75'],      'b8c4cc', '2f3f4f', null],
  ['friedrichsfelde',   'Friedrichsfelde',   52.5057713, 13.5131493, 'tunnel', 'island', [],                       'cfd9b8', '3f5a2a', null],
  ['tierpark',          'Tierpark',          52.4972665, 13.5231233, 'tunnel', 'island', [],                       'e2d6b8', '7a5a2a', { kind: 'murals', style: 'tierpark' }],
  ['biesdorf-sued',     'Biesdorf-Süd',      52.4995098, 13.5464812, 'viaduct', 'island', [],                      'b9b4a8', '8a3a2a', null, 1.4],
  ['elsterwerdaer-platz','Elsterwerdaer Platz',52.5054484, 13.5611929, 'viaduct', 'island', [],                    'b9b4a8', '2f5a7a', null, 3.5],
  ['wuhletal',          'Wuhletal',          52.5125803, 13.5760855, 'viaduct', 'island', ['S5'],                  'b9b4a8', '3d6a4a', null, 1.4],
  ['kaulsdorf-nord',    'Kaulsdorf-Nord',    52.5211222, 13.5890346, 'cutting', 'island', [],                      'c9bea8', '8a4a2a', { city: 'platte' }],
  ['kienberg',          'Kienberg (Gärten der Welt)', 52.5285704, 13.5906901, 'cutting', 'island', [],            'c9bea8', '5aa02c', { city: 'platte' }],
  ['cottbusser-platz',  'Cottbusser Platz',  52.5339777, 13.5971793, 'cutting', 'island', [],                      'c9bea8', '2f5a8a', { city: 'platte' }],
  ['hellersdorf',       'Hellersdorf',       52.5367896, 13.6073992, 'cutting', 'island', [],                      'c9bea8', 'a8432a', { city: 'platte' }],
  ['louis-lewin-strasse','Louis-Lewin-Straße',52.5389923, 13.6190831, 'cutting', 'island', [],                     'c9bea8', '6a4a8a', { city: 'platte' }],
  ['hoenow',            'Hönow',             52.5382584, 13.6336218, 'viaduct', 'island', [],                      'b9b4a8', '7e5330', null, 1.4],
];
// Bovengronds: echte omgeving uit OSM (tools/g4/osm2pack.py → public/assets/surroundings/u5/<id>.json).
export const U5_SURROUNDINGS = { 'biesdorf-sued': {}, 'elsterwerdaer-platz': {}, wuhletal: {}, hoenow: {} };

// Overstappen. Alexanderplatz: keuze tussen U2 en U8 (bestaande perrons). Op het U2-perron Alexanderplatz
// staat aan het −z-einde een bruin U5-bord (LineTransfers) → terug naar de U5.
// S-Bahn en U6 bestaan nog niet in het spel → trapgat met echt bord, maar afgesloten (zoals U3c/U4).
export const U5_TRANSFERS = {
  hauptbahnhof: { line: 'S', label: 'S3 S5 S7 S9', color: '#008d4f', towards: 'Stadtbahn · Fernbahn', closed: true },
  'brandenburger-tor': { line: 'S', label: 'S1 S2 S25 S26', color: '#008d4f', towards: 'Oranienburg · Wannsee · Blankenfelde', closed: true },
  'unter-den-linden': { line: 'U6', color: '#8c6dab', station: 'unter-den-linden', towards: 'Kurt-Schumacher-Pl. · Alt-Mariendorf' },   // U6: open sinds Mijlpaal 4
  'frankfurter-allee': { line: 'S', label: 'S41 S42 S8 S85', color: '#008d4f', towards: 'Ringbahn · Grünau · Pankow', closed: true },
  lichtenberg: { line: 'S', label: 'S5 S7 S75', color: '#008d4f', towards: 'Strausberg · Ahrensfelde · Wartenberg', closed: true },
  wuhletal: { line: 'S', label: 'S5', color: '#008d4f', towards: 'Strausberg Nord · Westkreuz', closed: true },
  alexanderplatz: {
    line: 'U2', color: '#da421e', also: [{ line: 'U8', color: '#224f86' }], station: 'alexanderplatz',
    towards: 'Pankow · Ruhleben · Wittenau · Hermannstr.', label: 'U2 · U8',
    options: [
      { line: 'U2', station: 'alexanderplatz', name: 'U2', sub: 'Pankow · Ruhleben', color: '#da421e' },
      { line: 'U8', station: 14, name: 'U8', sub: 'Wittenau · Hermannstraße', color: '#224f86' },
    ],
  },
};

// Bord op het U2-perron Alexanderplatz (terug naar de U5), zie LineTransfers.
export const U5_SIGN = { line: 'U5', color: '#7e5330', towards: 'Hauptbahnhof · Hönow', hint: 'Übergang U5' };

/** Stations van de U5-wereld. */
export const U5_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile, elev = 0], index) => ({
  line: 'U5', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: kind === 'viaduct' ? elev : 0, embank: kind === 'viaduct', transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U5_TRANSFERS[id] || null,
  profile: typeof profile === 'string' ? { kind: profile } : profile, bridge: null, surroundings: U5_SURROUNDINGS[id] || null, end: id === 'hoenow',
  x: U5_LINE.origin.x + index * U5_LINE.spacing,
}));
