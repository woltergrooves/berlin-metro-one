// Berlin Life — U7 (Mijlpaal 4). Rudow ⇄ Rathaus Spandau, 40 stations, volledig ondergronds (U7a 7 nov, U7b 8 nov 2026).
//
// Bron: OpenStreetMap-route-relatie 2678985 (U Rudow ⇒ S+U Rathaus Spandau; haltecoördinaten, alle sporen tunnel,
// layer −1/−2/−3). De U7 (40 stations) wordt in twee helften gebouwd. U7a = het oostelijke/zuidelijke deel tot en met
// Möckernbrücke. Rudow = index 0, dus U7b (Yorckstraße … Rathaus Spandau, 23 stations) komt later **achteraan**
// (index 17 …, x 2550 …) zonder bestaande indexen, saves of tests te verschuiven.
//
// Herkenbaar (niet 1:1):
//   Rudow … Grenzallee — jaren-60/70-stations, felle tegelkleuren per station (Rümmler-stijl).
//   Neukölln — overstap S-Ring (nog dicht).
//   Rathaus Neukölln, Karl-Marx-Straße — Grenander-stations van de oude "Neuköllner Linie".
//   Hermannplatz — hoge hal (7 m) uit 1926 (profiel vault), overstap U8.
//   Mehringdamm — overstap U6 (in werkelijkheid kruisperron).
//   Möckernbrücke — overstap U1/U3 (de U1 rijdt hier op het viaduct boven het Landwehrkanaal).
//   U7b: Bayerischer Platz (U4), Fehrbelliner Platz (U3, Rümmler-rood/oranje), Bismarckstraße (U2),
//   Siemensdamm/Rohrdamm (Siemensstadt, industrie), Paulsternstraße (bloemenweide), Zitadelle (Juliusturm),
//   Rathaus Spandau (hoge hal met kroonluchters, profiel vault).
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −5600 (U1 −2600, U3 −3200, U4 −3800, U5 −4400, U6 −5000),
// langs de x-as, 150 m per station. Rudow = x 0, +x = richting Möckernbrücke (later Rathaus Spandau).

export const U7_LINE = {
  id: 'U7',
  name: 'U7',
  color: '#528dba',          // BVG-lijnkleur U7 (lichtblauw)
  trainModel: 'bvg-hk',      // in werkelijkheid Großprofil (H/IK); voorlopig dezelfde treinmodellen als de andere lijnen
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -5600 }, // 600 m naast de U6 (z −5000); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['rudow', 'rathaus-spandau'],
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel]
const RAW = [
  ['rudow',                   'Rudow',                   52.4166350, 13.4946115, 'tunnel', 'island', [],                          'e8b04a', '6a3f12', null],
  ['zwickauer-damm',          'Zwickauer Damm',          52.4235281, 13.4835040, 'tunnel', 'island', [],                          'd9e2cf', '2f6a3a', null],
  ['wutzkyallee',             'Wutzkyallee',             52.4233841, 13.4739611, 'tunnel', 'island', [],                          'f0d36a', '7a5a12', null],
  ['lipschitzallee',          'Lipschitzallee',          52.4249637, 13.4619090, 'tunnel', 'island', [],                          'c9dbe8', '1f4f7a', null],
  ['johannisthaler-chaussee', 'Johannisthaler Chaussee', 52.4295772, 13.4532641, 'tunnel', 'island', [],                          'e6c3a3', '7a3a1a', null],
  ['britz-sued',              'Britz-Süd',               52.4382329, 13.4480960, 'tunnel', 'island', [],                          'f2e2a0', '3a5a2a', null],
  ['parchimer-allee',         'Parchimer Allee',         52.4451594, 13.4497610, 'tunnel', 'island', [],                          'cfe6dc', '1f6a5a', null],
  ['blaschkoallee',           'Blaschkoallee',           52.4520869, 13.4492600, 'tunnel', 'island', [],                          'e8cfa0', '8a4a12', null],
  ['grenzallee',              'Grenzallee',              52.4631670, 13.4446703, 'tunnel', 'island', [],                          'dfe3ea', '2a3f6a', null],
  ['neukoelln',               'Neukölln',                52.4691125, 13.4418492, 'tunnel', 'island', ['S41', 'S42', 'S45', 'S46', 'S47'], 'e3dcc8', '5a4a2a', null],
  ['karl-marx-strasse',       'Karl-Marx-Straße',        52.4766760, 13.4392161, 'tunnel', 'island', [],                          'd6e2d0', '3a5a3a', null],
  ['rathaus-neukoelln',       'Rathaus Neukölln',        52.4819300, 13.4338637, 'tunnel', 'island', [],                          'e6d6b8', '7a4a2a', null],
  ['hermannplatz',            'Hermannplatz',            52.4865240, 13.4239661, 'tunnel', 'island', ['U8'],                      'efe3c2', '5a4a1a', { kind: 'vault' }],
  ['suedstern',               'Südstern',                52.4894228, 13.4073070, 'tunnel', 'island', [],                          'd3dfe6', '2a4a6a', null],
  ['gneisenaustrasse',        'Gneisenaustraße',         52.4914508, 13.3952569, 'tunnel', 'island', [],                          'e6dcc6', '6a3a2a', null],
  ['mehringdamm',             'Mehringdamm',             52.4944635, 13.3889251, 'tunnel', 'island', ['U6'],                      'f0e2b8', '8a4a2a', null],
  ['moeckernbruecke',         'Möckernbrücke',           52.4987640, 13.3827271, 'tunnel', 'island', ['U1', 'U3'],                'dde4d6', '3a5a4a', null],
  // U7b — Yorckstraße ⇄ Rathaus Spandau (8 nov 2026), achteraan: index 17 … 39, x 2550 … 5850.
  ['yorckstrasse',            'Yorckstraße',             52.4930453, 13.3703794, 'tunnel', 'island', ['S1', 'S2', 'S25', 'S26'],  'e9dc9a', '5a6a1a', null],
  ['kleistpark',              'Kleistpark',              52.4904543, 13.3598438, 'tunnel', 'island', [],                          'cfe0c8', '2f5a2f', null],
  ['eisenacher-strasse',      'Eisenacher Straße',       52.4895710, 13.3498022, 'tunnel', 'island', [],                          'f0c9a8', '8a3a1a', null],
  ['bayerischer-platz',       'Bayerischer Platz',       52.4886909, 13.3409909, 'tunnel', 'island', ['U4'],                      'c8d8ea', '1f4a8a', null],
  ['berliner-strasse',        'Berliner Straße',         52.4872916, 13.3304957, 'tunnel', 'island', ['U9'],                      'f2e6c4', 'a0502a', null],
  ['blissestrasse',           'Blissestraße',            52.4864661, 13.3216144, 'tunnel', 'island', [],                          'e0d0e6', '5a2a6a', null],
  ['fehrbelliner-platz',      'Fehrbelliner Platz',      52.4906784, 13.3141087, 'tunnel', 'island', ['U3'],                      'f2c38a', 'b8461e', null],
  ['konstanzer-strasse',      'Konstanzer Straße',       52.4948205, 13.3089766, 'tunnel', 'island', [],                          'd2e4ec', '1a5a7a', null],
  ['adenauerplatz',           'Adenauerplatz',           52.5002423, 13.3073990, 'tunnel', 'island', [],                          'e6d8c4', '6a4a2a', null],
  ['wilmersdorfer-strasse',   'Wilmersdorfer Straße',    52.5068976, 13.3066701, 'tunnel', 'island', ['S3', 'S5', 'S7', 'S9'],    'efe7c8', '7a6a1a', null],
  ['bismarckstrasse',         'Bismarckstraße',          52.5119125, 13.3051930, 'tunnel', 'island', ['U2'],                      'f2d9a0', '8a2a1a', null],
  ['richard-wagner-platz',    'Richard-Wagner-Platz',    52.5171293, 13.3066452, 'tunnel', 'island', [],                          'e8c8c0', '7a1f24', null],
  ['mierendorffplatz',        'Mierendorffplatz',        52.5263638, 13.3048917, 'tunnel', 'island', [],                          'dfe6c6', '4a6a1a', null],
  ['jungfernheide',           'Jungfernheide',           52.5304169, 13.3007460, 'tunnel', 'island', ['S41', 'S42', 'RE', 'RB'],  'd6dde6', '2a3a5a', null],
  ['jakob-kaiser-platz',      'Jakob-Kaiser-Platz',      52.5363433, 13.2931796, 'tunnel', 'island', [],                          'f0e0b0', '8a6a12', null],
  ['halemweg',                'Halemweg',                52.5366817, 13.2859108, 'tunnel', 'island', [],                          'e4ecd8', '3a6a3a', null],
  ['siemensdamm',             'Siemensdamm',             52.5368161, 13.2727557, 'tunnel', 'island', [],                          'e8ecef', '1f5f8a', { kind: 'murals', style: 'siemens' }],
  ['rohrdamm',                'Rohrdamm',                52.5370337, 13.2626304, 'tunnel', 'island', [],                          'd8dbe0', '3a4048', { kind: 'murals', style: 'siemens' }],
  ['paulsternstrasse',        'Paulsternstraße',         52.5380626, 13.2476544, 'tunnel', 'island', [],                          'cfe2c2', '2a5a2a', { kind: 'murals', style: 'paulstern' }],
  ['haselhorst',              'Haselhorst',              52.5387660, 13.2328804, 'tunnel', 'island', [],                          'f0dcc0', '8a4a1a', null],
  ['zitadelle',               'Zitadelle',               52.5376748, 13.2175554, 'tunnel', 'island', [],                          'd8c8b0', '6a3a22', { kind: 'murals', style: 'zitadelle' }],
  ['altstadt-spandau',        'Altstadt Spandau',        52.5391065, 13.2056046, 'tunnel', 'island', [],                          'c9b49a', '5a2a1a', null],
  ['rathaus-spandau',         'Rathaus Spandau',         52.5353827, 13.1997806, 'tunnel', 'island', ['S3', 'S9', 'RE', 'RB'],    'e6dcc0', '2a4a3a', { kind: 'vault' }],
];

// Overstappen. line/station = waar je uitkomt; color/towards = het overstapbord op het U7-perron.
//   Möckernbrücke ⇄ U1/U3 (viaduct), Mehringdamm ⇄ U6, Hermannplatz ⇄ U8 (bord aan het westeinde van het U8-perron).
//   Neukölln (S-Ring) bestaat nog niet in het spel → trapgat met echt bord, maar afgesloten.
export const U7_TRANSFERS = {
  neukoelln: { line: 'S', label: 'S41 S42 S45 S46 S47', color: '#008d4f', towards: 'Ringbahn · Flughafen BER', closed: true },
  hermannplatz: { line: 'U8', color: '#224f86', station: 20, towards: 'Wittenau · Hermannstraße' },
  mehringdamm: { line: 'U6', color: '#8c6dab', station: 'mehringdamm', towards: 'Kurt-Schumacher-Pl. · Alt-Mariendorf' },
  moeckernbruecke: { line: 'U1', color: '#55a822', also: [{ line: 'U3', color: '#16683d' }], station: 'moeckernbruecke', label: 'U1 · U3', towards: 'Warschauer Str. · Uhlandstr. · Krumme Lanke' },
  // U7b: U4, U3 en U2 open; U9 open sinds 8 nov (U9); S-Bahn en regionaal verkeer nog dicht.
  yorckstrasse: { line: 'S', label: 'S1 S2 S25 S26', color: '#008d4f', towards: 'Nord-Süd-Bahn · S1 S2 S25 S26', closed: true },
  'bayerischer-platz': { line: 'U4', color: '#ffd900', text: '#1a1a1a', station: 'bayerischer-platz', towards: 'Nollendorfplatz · Innsbrucker Platz' },
  'berliner-strasse': { line: 'U9', color: '#f3791d', station: 'berliner-strasse', towards: 'Osloer Straße · Rathaus Steglitz' },
  'fehrbelliner-platz': { line: 'U3', color: '#16683d', station: 'fehrbelliner-platz', towards: 'Warschauer Str. · Krumme Lanke' },
  'wilmersdorfer-strasse': { line: 'S', to: 'S5', station: 'charlottenburg', label: 'S3 S5 S7 S9', color: '#008d4f', towards: 'Stadtbahn · S Charlottenburg' },   // open sinds S-Bahn deel c
  bismarckstrasse: { line: 'U2', color: '#da421e', station: 'bismarckstrasse', towards: 'Pankow · Ruhleben' },
  jungfernheide: { line: 'S', label: 'S41 S42', color: '#008d4f', towards: 'Ringbahn · Flughafen BER', closed: true },
  'rathaus-spandau': { line: 'S', label: 'S3 S9', color: '#008d4f', towards: 'Stadtbahn · S3 S9 · Regionalverkehr', closed: true },
};

// Bord op het U8-perron Hermannplatz en (sinds U7b) op het U2-perron Bismarckstraße (terug naar de U7), zie LineTransfers.
export const U7_SIGN = { line: 'U7', color: '#528dba', towards: 'Rudow · Rathaus Spandau', hint: 'Übergang U7' };

/** Stations van de U7-wereld. */
export const U7_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U7', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U7_TRANSFERS[id] || null,
  profile: typeof profile === 'string' ? { kind: profile } : profile, bridge: null, surroundings: null,
  x: U7_LINE.origin.x + index * U7_LINE.spacing,
}));
