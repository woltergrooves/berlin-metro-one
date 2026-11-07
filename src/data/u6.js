// Berlin Life — U6 (Mijlpaal 4). Alt-Mariendorf ⇄ Kurt-Schumacher-Platz, 24 stations, volledig ondergronds.
//
// Bron: OpenStreetMap-route-relatie 2679164 (U Alt-Tegel ⇒ U Alt-Mariendorf; haltecoördinaten, alle sporen tunnel,
// layer −1/−2/−3), urbanrail.net / Wikipedia. Het noordelijke stuk Kurt-Schumacher-Platz ⇄ Alt-Tegel (Scharnweberstraße,
// Otisstraße, Holzhauser Straße, Borsigwerke, Alt-Tegel) is in werkelijkheid gesloten voor een grote renovatie
// (in OSM railway=construction; heropening volgens de BVG zomer 2027) → in het spel eindigt de U6, net als in het echt,
// voorlopig op Kurt-Schumacher-Platz. Later achteraan toe te voegen (index 24 …) zonder de bestaande indexen te verschuiven.
//
// De U6 is de oude Nord-Süd-Bahn (1923): Grenander-stations met tegels in een eigen kleur per station, eilandperrons.
// Herkenbaar (niet 1:1):
//   Unter den Linden — nieuw station (2020), donker graniet, kruising met de U5 (overstap).
//   Stadtmitte — geel, overstap U2 (in werkelijkheid via de lange "Mäusetunnel").
//   Kochstraße/Checkpoint Charlie — wandbeelden over de grensovergang (profiel murals 'checkpoint').
//   Hallesches Tor — overstap U1/U3 (de U1 rijdt hier op het viaduct erboven).
//   Platz der Luftbrücke — luchtbrug 1948/49 en luchthaven Tempelhof (profiel murals 'luftbruecke').
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −5000 (U1 −2600, U3 −3200, U4 −3800, U5 −4400),
// langs de x-as, 150 m per station. Alt-Mariendorf = x 0, +x = richting Kurt-Schumacher-Platz (later Alt-Tegel).

export const U6_LINE = {
  id: 'U6',
  name: 'U6',
  color: '#8c6dab',          // BVG-lijnkleur U6 (lila)
  trainModel: 'bvg-hk',      // in werkelijkheid Großprofil (H/IK); voorlopig dezelfde treinmodellen als de andere lijnen
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -5000 }, // 600 m naast de U5 (z −4400); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['alt-mariendorf', 'kurt-schumacher-platz'],
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel]
const RAW = [
  ['alt-mariendorf',        'Alt-Mariendorf',          52.4396554, 13.3874140, 'tunnel', 'island', [],                          'dfe6d3', '2f5a7a', null],
  ['westphalweg',           'Westphalweg',             52.4462642, 13.3856143, 'tunnel', 'island', [],                          'e8e4d0', '5a6a3a', null],
  ['ullsteinstrasse',       'Ullsteinstraße',          52.4535479, 13.3844188, 'tunnel', 'island', [],                          'cfd9e3', '2f4f7a', null],
  ['kaiserin-augusta-strasse', 'Kaiserin-Augusta-Straße', 52.4596777, 13.3844815, 'tunnel', 'island', [],                       'e6d8b5', '7a5a2a', null],
  ['alt-tempelhof',         'Alt-Tempelhof',           52.4652812, 13.3855659, 'tunnel', 'island', [],                          'd3e0d0', '3f6a4a', null],
  ['tempelhof',             'Tempelhof',               52.4698920, 13.3855070, 'tunnel', 'island', ['S41', 'S42', 'S45', 'S46'], 'e8d8a8', '8a6a1a', null],
  ['paradestrasse',         'Paradestraße',            52.4781195, 13.3861713, 'tunnel', 'island', [],                          'cfe0ea', '2a5f8a', null],
  ['platz-der-luftbruecke', 'Platz der Luftbrücke',    52.4855965, 13.3858014, 'tunnel', 'island', [],                          'ede6d3', '3a4a6a', { kind: 'murals', style: 'luftbruecke' }],
  ['mehringdamm',           'Mehringdamm',             52.4943660, 13.3886320, 'tunnel', 'island', ['U7'],                      'f0e2b8', '8a4a2a', null],
  ['hallesches-tor',        'Hallesches Tor',          52.4986955, 13.3916401, 'tunnel', 'island', ['U1', 'U3'],                'e8eadf', '4a6a3a', null],
  ['kochstrasse',           'Kochstraße/Checkpoint Charlie', 52.5055012, 13.3906153, 'tunnel', 'island', [],                    'e6e2d6', '6a2a2a', { kind: 'murals', style: 'checkpoint' }],
  ['stadtmitte',            'Stadtmitte',              52.5102192, 13.3898430, 'tunnel', 'island', ['U2'],                      'f3e7c4', '6a5a2a', null],
  ['unter-den-linden',      'Unter den Linden',        52.5161798, 13.3889138, 'tunnel', 'island', ['U5'],                      'd6d9dc', '2a2f3a', null],
  ['friedrichstrasse',      'Friedrichstraße',         52.5200402, 13.3882292, 'tunnel', 'island', ['S1', 'S2', 'S25', 'S26', 'S3', 'S5', 'S7', 'S9'], 'e0d4b8', '5a3a2a', null],
  ['oranienburger-tor',     'Oranienburger Tor',       52.5256031, 13.3872745, 'tunnel', 'side',   [],                          'd9e4cf', '3a5a3a', null],
  ['naturkundemuseum',      'Naturkundemuseum',        52.5309471, 13.3824968, 'tunnel', 'island', [],                          'cfe3e6', '2a5a6a', null],
  ['schwartzkopffstrasse',  'Schwartzkopffstraße',     52.5351951, 13.3771815, 'tunnel', 'island', [],                          'e3d9c4', '6a4a2a', null],
  ['reinickendorfer-strasse', 'Reinickendorfer Straße', 52.5397069, 13.3706430, 'tunnel', 'side',  [],                          'dbe3e8', '3a4a6a', null],
  ['wedding',               'Wedding',                 52.5428467, 13.3653021, 'tunnel', 'island', ['S41', 'S42'],              'e8d4b0', '8a5a2a', null],
  ['leopoldplatz',          'Leopoldplatz',            52.5463824, 13.3591318, 'tunnel', 'island', ['U9'],                      'd4dfe8', '2a4a7a', null],
  ['seestrasse',            'Seestraße',               52.5494860, 13.3534346, 'tunnel', 'island', [],                          'ead9c0', '5a6a7a', null],
  ['rehberge',              'Rehberge',                52.5566244, 13.3408781, 'tunnel', 'island', [],                          'd8e3cc', '3f6a3a', null],
  ['afrikanische-strasse',  'Afrikanische Straße',     52.5600134, 13.3348890, 'tunnel', 'island', [],                          'e8d0a8', '8a5a1a', null],
  ['kurt-schumacher-platz', 'Kurt-Schumacher-Platz',   52.5631787, 13.3271376, 'tunnel', 'island', [],                          'dfe4ea', '4a5a6a', null],
];

// Overstappen. line/station = waar je uitkomt; color/towards = het overstapbord op het U6-perron.
//   Unter den Linden ⇄ U5, Stadtmitte ⇄ U2 (bord aan het −z-einde van het U2-perron), Hallesches Tor ⇄ U1/U3.
//   S-Bahn, U7 en U9 bestaan nog niet in het spel → trapgat met echt bord, maar afgesloten (zoals U3c/U4/U5).
export const U6_TRANSFERS = {
  tempelhof: { line: 'S', label: 'S41 S42 S45 S46', color: '#008d4f', towards: 'Ringbahn · Flughafen BER', closed: true },
  mehringdamm: { line: 'U7', color: '#528dba', towards: 'Rathaus Spandau · Rudow', closed: true },
  'hallesches-tor': { line: 'U1', color: '#55a822', also: [{ line: 'U3', color: '#16683d' }], station: 'hallesches-tor', label: 'U1 · U3', towards: 'Warschauer Str. · Uhlandstr. · Krumme Lanke' },
  stadtmitte: { line: 'U2', color: '#da421e', station: 'stadtmitte', towards: 'Pankow · Ruhleben' },
  'unter-den-linden': { line: 'U5', color: '#7e5330', station: 'unter-den-linden', towards: 'Hauptbahnhof · Hönow' },
  friedrichstrasse: { line: 'S', label: 'S1 S2 S25 S26 · S3 S5 S7 S9', color: '#008d4f', towards: 'Stadtbahn · Nord-Süd-Tunnel', closed: true },
  wedding: { line: 'S', label: 'S41 S42', color: '#008d4f', towards: 'Ringbahn', closed: true },
  leopoldplatz: { line: 'U9', color: '#f3791d', towards: 'Osloer Str. · Rathaus Steglitz', closed: true },
};

// Bord op het U2-perron Stadtmitte (terug naar de U6), zie LineTransfers.
export const U6_SIGN = { line: 'U6', color: '#8c6dab', towards: 'Kurt-Schumacher-Pl. · Alt-Mariendorf', hint: 'Übergang U6' };

/** Stations van de U6-wereld. */
export const U6_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U6', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U6_TRANSFERS[id] || null,
  profile: typeof profile === 'string' ? { kind: profile } : profile, bridge: null, surroundings: null,
  x: U6_LINE.origin.x + index * U6_LINE.spacing,
}));
