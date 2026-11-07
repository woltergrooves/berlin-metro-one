// Berlin Life — U7 (Mijlpaal 4, deel U7a). Rudow ⇄ Möckernbrücke, 17 stations, volledig ondergronds.
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
  termini: ['rudow', 'moeckernbruecke'],
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
];

// Overstappen. line/station = waar je uitkomt; color/towards = het overstapbord op het U7-perron.
//   Möckernbrücke ⇄ U1/U3 (viaduct), Mehringdamm ⇄ U6, Hermannplatz ⇄ U8 (bord aan het westeinde van het U8-perron).
//   Neukölln (S-Ring) bestaat nog niet in het spel → trapgat met echt bord, maar afgesloten.
export const U7_TRANSFERS = {
  neukoelln: { line: 'S', label: 'S41 S42 S45 S46 S47', color: '#008d4f', towards: 'Ringbahn · Flughafen BER', closed: true },
  hermannplatz: { line: 'U8', color: '#224f86', station: 20, towards: 'Wittenau · Hermannstraße' },
  mehringdamm: { line: 'U6', color: '#8c6dab', station: 'mehringdamm', towards: 'Kurt-Schumacher-Pl. · Alt-Mariendorf' },
  moeckernbruecke: { line: 'U1', color: '#55a822', also: [{ line: 'U3', color: '#16683d' }], station: 'moeckernbruecke', label: 'U1 · U3', towards: 'Warschauer Str. · Uhlandstr. · Krumme Lanke' },
};

// Bord op het U8-perron Hermannplatz (terug naar de U7), zie LineTransfers.
export const U7_SIGN = { line: 'U7', color: '#528dba', towards: 'Rudow · Rathaus Spandau', hint: 'Übergang U7' };

/** Stations van de U7-wereld. */
export const U7_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U7', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U7_TRANSFERS[id] || null,
  profile: typeof profile === 'string' ? { kind: profile } : profile, bridge: null, surroundings: null,
  x: U7_LINE.origin.x + index * U7_LINE.spacing,
}));
