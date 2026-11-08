// Berlin Life — S-Bahn Stadtbahn (Fase 45, deel a, 8 nov 2026). Westkreuz ⇄ Ostkreuz, 14 stations, volledig op het
// gemetselde Stadtbahnviaduct (Viaduktbögen) naast de twee Fernbahnsporen.
//
// Bron: OpenStreetMap-route-relatie 2015959 (S5: Westkreuz ⇒ Strausberg Nord; haltecoördinaten). Op dit traject
// rijden S3, S5, S7 en S9; de lijnwereld heet naar de S5 (die het hele stuk Westkreuz–Ostkreuz rijdt).
//
// Herkenbaar (niet 1:1):
//   Zoologischer Garten, Hauptbahnhof (glazen tongewelf, hoogste niveau), Friedrichstraße, Hackescher Markt
//   (bakstenen hal met boogramen), Alexanderplatz, Ostbahnhof — grote stalen stationshallen over alle vier sporen.
//   Jannowitzbrücke — eigen hal over de S-Bahn, aan de Spree. Overige stations: vlinderdak op het middenperron.
//   Charlottenburg, Ostkreuz — regionaal perron naast de S-Bahn.
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −6800 (U9 −6200), langs de x-as, 150 m per station.
// Westkreuz = x 0, +x = richting Ostkreuz. Dwarsprofiel: S-Bahn-middenperron (sporen z ±5,15) aan de −z-kant,
// de twee Fernbahnsporen op z 10,4 en 17,4 (bovenleiding); viaduct van z −7,6 tot 19,6 (`arches`).
// Hoogte (elev) = straat onder het perron.

export const S5_LINE = {
  id: 'S5',
  name: 'S5',
  color: '#eb7405',          // VBB-lijnkleur S5 (oranje)
  sbahn: true,               // S-Bahn: groene stationsborden met het S-logo
  trainModel: 'bvg-481',     // deel b: BR 481/483 (nog niet in het spel)
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -6800 }, // 600 m naast de U9 (z −6200); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['westkreuz', 'ostkreuz'],
};

// [id, naam, lat, lon, hoogte (straat onder het perron), overstap, accent (kap), profiel]
const RAW = [
  ['westkreuz',           'Westkreuz',           52.5006843, 13.2843857, 7,  ['S41', 'S42', 'S46'],              '4a5a4e', null],
  ['charlottenburg',      'Charlottenburg',      52.5050590, 13.3052159, 6,  ['U7', 'RE'],                       '5a4a3e', { fern: true }],
  ['savignyplatz',        'Savignyplatz',        52.5051098, 13.3189562, 7,  [],                                 '4a5a4e', null],
  ['zoologischer-garten', 'Zoologischer Garten', 52.5069420, 13.3318108, 8,  ['U2', 'U9', 'RE'],                 '3f4a4f', { hall: 'hall-stadtbahn', steel: '#56646a', roof: '#3a4448', fern: true }],
  ['tiergarten',          'Tiergarten',          52.5142085, 13.3364598, 7,  [],                                 '3e5a3e', null],
  ['bellevue',            'Bellevue',            52.5199303, 13.3480101, 7,  [],                                 '6a4a36', null],
  ['hauptbahnhof',        'Hauptbahnhof',        52.5251819, 13.3700300, 10, ['U5', 'RE', 'ICE'],                '3f4a4f', { hall: 'hall-stadtbahn', steel: '#9aa4a8', roof: '#8e989c', glassAll: true, fern: true }],
  ['friedrichstrasse',    'Friedrichstraße',     52.5203431, 13.3871988, 8,  ['U6', 'S1', 'S2', 'S25', 'S26', 'RE'], '3f4a4f', { hall: 'hall-stadtbahn', steel: '#4a585e', roof: '#38433f', fern: true }],
  ['hackescher-markt',    'Hackescher Markt',    52.5226166, 13.4023469, 7,  ['Tram'],                           '3f4a4f', { hall: 'hall-stadtbahn', steel: '#5a5048', roof: '#3f3a36', brick: true }],
  ['alexanderplatz',      'Alexanderplatz',      52.5214176, 13.4113816, 8,  ['U2', 'U5', 'U8', 'RE'],           '3f4a4f', { hall: 'hall-stadtbahn', steel: '#4e5c62', roof: '#3a4448', fern: true }],
  ['jannowitzbruecke',    'Jannowitzbrücke',     52.5140767, 13.4197527, 8,  ['U8'],                             '3c4640', { hall: 'hall-barrel', steel: '#56695c', roof: '#3c4640' }],
  ['ostbahnhof',          'Ostbahnhof',          52.5106059, 13.4350936, 7,  ['RE', 'ICE'],                      '3f4a4f', { hall: 'hall-stadtbahn', steel: '#56646a', roof: '#3a4448', fern: true }],
  ['warschauer-strasse',  'Warschauer Straße',   52.5059080, 13.4516857, 6,  ['U1', 'U3', 'Tram'],               'b8bcbc', null],
  ['ostkreuz',            'Ostkreuz',            52.5028203, 13.4701851, 5,  ['S41', 'S42', 'S8', 'S85', 'RE'],  '9aa2a6', { fern: true }],
];

// Overstappen. Deel a: alle trapgaten met echt bord, maar nog afgesloten (rood-wit hek) — open in deel c.
const S_TRANSFERS = {
  westkreuz: { line: 'S', label: 'S41 S42 S46', color: '#008d4f', towards: 'Ringbahn', closed: true },
  charlottenburg: { line: 'U7', color: '#528dba', towards: 'Rudow · Rathaus Spandau (Wilmersdorfer Str.)', closed: true },
  'zoologischer-garten': { line: 'U2', color: '#da421e', also: [{ line: 'U9', color: '#f3791d' }], towards: 'Pankow · Ruhleben · Osloer Str.', closed: true },
  hauptbahnhof: { line: 'U5', color: '#7e5330', towards: 'Hönow', closed: true },
  friedrichstrasse: { line: 'U6', color: '#8c6dab', towards: 'Kurt-Schumacher-Pl. · Alt-Mariendorf', closed: true },
  alexanderplatz: { line: 'U2', color: '#da421e', also: [{ line: 'U5', color: '#7e5330' }, { line: 'U8', color: '#224f86' }], towards: 'Pankow · Hönow · Wittenau', closed: true },
  jannowitzbruecke: { line: 'U8', color: '#224f86', towards: 'Wittenau · Hermannstraße', closed: true },
  'warschauer-strasse': { line: 'U1', color: '#55a822', also: [{ line: 'U3', color: '#16683d' }], towards: 'Uhlandstr. · Krumme Lanke', closed: true },
  ostkreuz: { line: 'S', label: 'S41 S42 S8 S85', color: '#008d4f', towards: 'Ringbahn · Pankow · Grünau', closed: true },
};

// Overstap naar een bestaande U-lijn: eigen tekst in de hint (de lijn bestaat al, alleen de doorgang nog niet).
for (const t of Object.values(S_TRANSFERS)) if (t.line !== 'S') { t.note = 'overstap opent binnenkort'; t.label = [t, ...(t.also || [])].map(b => b.line).join(' · '); }

/** Stations van de Stadtbahnwereld. */
export const S5_STATIONS = RAW.map(([id, name, lat, lon, elev, transfers, accent, profile], index) => ({
  line: 'S5', id, name, index, lat, lon, kind: 'viaduct', arches: true, layout: 'island', realLayout: 'island', elev, transfers,
  wall: '#7a3b2e', accent: '#' + accent, transfer: S_TRANSFERS[id] || null,
  profile: profile && profile.hall ? profile : null, fern: !!profile?.fern, bridge: null, surroundings: null,
  x: S5_LINE.origin.x + index * S5_LINE.spacing,
}));
