// Berlin Life — U5 west (Mijlpaal 3). Hauptbahnhof ⇄ Alexanderplatz, 7 stations, volledig ondergronds.
//
// Bron: OpenStreetMap-route-relatie 2227743 (U Hauptbahnhof ⇒ U Hönow; haltecoördinaten), urbanrail.net / Wikipedia.
// Het westelijke stuk (de vroegere U55 + de "Lückenschluss" van 2020) loopt onder het regeringskwartier,
// Unter den Linden en de Museumsinsel door naar het oude U5-station Alexanderplatz (1930). In het spel is
// Alexanderplatz voorlopig het eindpunt; het oostelijke deel (Schillingstraße … Hönow) volgt als U5 oost.
//
// Herkenbaar (niet 1:1):
//   Hauptbahnhof — licht, modern, grijs/wit. Bundestag — kaal beton.
//   Brandenburger Tor — zandsteenkleur met historische foto's (profiel 'photos').
//   Unter den Linden — donkerblauw/grijs, kruising met de U6 (nog dicht).
//   Museumsinsel — donkerblauw gewelf met sterrenhemel (profiel 'stars', naar Schinkels Zauberflöte-decor).
//   Rotes Rathaus — grijs met roodbruin accent. Alexanderplatz — het oude groen-grijze U5-perron.
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −4400 (U1 −2600, U3 −3200, U4 −3800), langs de
// x-as, +x = richting Alexanderplatz, 150 m per station. Hauptbahnhof = x 0, Alexanderplatz = x 900.

export const U5_LINE = {
  id: 'U5',
  name: 'U5',
  color: '#7e5330',          // BVG-lijnkleur U5 (bruin)
  trainModel: 'bvg-hk',      // in werkelijkheid Großprofil (H/IK); voorlopig dezelfde treinmodellen als de andere lijnen
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -4400 }, // 600 m naast de U4 (z −3800); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['hauptbahnhof', 'alexanderplatz'],
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel]
const RAW = [
  ['hauptbahnhof',      'Hauptbahnhof',      52.5251423, 13.3700843, 'tunnel', 'island', ['S3', 'S5', 'S7', 'S9'], 'e8eaec', '4a5560', null],
  ['bundestag',         'Bundestag',         52.5201499, 13.3728265, 'tunnel', 'island', [],                       'd6d3cc', '5f6369', null],
  ['brandenburger-tor', 'Brandenburger Tor', 52.5165428, 13.3811753, 'tunnel', 'island', ['S1', 'S2', 'S25', 'S26'], 'dccaa2', '5b4a33', 'photos'],
  ['unter-den-linden',  'Unter den Linden',  52.5169314, 13.3898289, 'tunnel', 'island', ['U6'],                   'cdd2d6', '1f2f45', null],
  ['museumsinsel',      'Museumsinsel',      52.5171411, 13.3993940, 'tunnel', 'island', [],                       'c4cad4', '1b2c5a', 'stars'],
  ['rotes-rathaus',     'Rotes Rathaus',     52.5189128, 13.4082907, 'tunnel', 'island', [],                       'bcb7b0', '7a2a22', null],
  ['alexanderplatz',    'Alexanderplatz',    52.5216433, 13.4140891, 'tunnel', 'island', ['U2', 'U8', 'S'],        'b9c6a8', '3d5a3a', null],
];

// Overstappen. Alexanderplatz: keuze tussen U2 en U8 (bestaande perrons). Op het U2-perron Alexanderplatz
// staat aan het −z-einde een bruin U5-bord (LineTransfers) → terug naar de U5.
// S-Bahn en U6 bestaan nog niet in het spel → trapgat met echt bord, maar afgesloten (zoals U3c/U4).
export const U5_TRANSFERS = {
  hauptbahnhof: { line: 'S', label: 'S3 S5 S7 S9', color: '#008d4f', towards: 'Stadtbahn · Fernbahn', closed: true },
  'brandenburger-tor': { line: 'S', label: 'S1 S2 S25 S26', color: '#008d4f', towards: 'Oranienburg · Wannsee · Blankenfelde', closed: true },
  'unter-den-linden': { line: 'U6', color: '#8c6dab', towards: 'Alt-Tegel · Alt-Mariendorf', closed: true },
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
export const U5_SIGN = { line: 'U5', color: '#7e5330', towards: 'Hauptbahnhof · Museumsinsel', hint: 'Übergang U5' };

/** Stations van de U5-wereld. */
export const U5_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U5', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U5_TRANSFERS[id] || null, profile: profile ? { kind: profile } : null, bridge: null, surroundings: null,
  x: U5_LINE.origin.x + index * U5_LINE.spacing,
}));
