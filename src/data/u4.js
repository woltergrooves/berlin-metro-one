// Berlin Life — U4. Nollendorfplatz ⇄ Innsbrucker Platz, 5 stations, volledig ondergronds.
//
// Bron: OpenStreetMap-route-relatie 2676945 (haltecoördinaten; alle sporen tunnel, layer −1), urbanrail.net / Wikipedia.
// De U4 is de kortste lijn van Berlijn: gebouwd (1910) door de toen zelfstandige stad Schöneberg, met eigen
// "dorps"-karakter. Rathaus Schöneberg ligt in het dal van het Rudolph-Wilde-Park: het perron heeft grote ramen
// naar het park (profiel 'park').
//
// Speltekening (zie src/lines/LineWorld.js): eigen gebied op z = −3800 (U1 −2600, U3 −3200), langs de x-as,
// +x = richting Innsbrucker Platz, 150 m per station. Nollendorfplatz = x 0.
// Overstap Nollendorfplatz: naar het U1/U3-perron of de U2 (keuze), zie LineTransfers.fromLine.

export const U4_LINE = {
  id: 'U4',
  name: 'U4',
  color: '#ffd900',          // BVG-lijnkleur U4 (geel)
  textColor: '#1a1a1a',      // zwarte letters op het gele lijnsymbool
  trainModel: 'bvg-hk',      // Kleinprofil (HK)
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -3800 }, // 600 m naast de U3 (z −3200); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: ['nollendorfplatz', 'innsbrucker-platz'],
};

// [id, naam, lat, lon, ligging, perron, overstap, wand, accent, profiel]
const RAW = [
  ['nollendorfplatz',    'Nollendorfplatz',    52.4998509, 13.3547193, 'tunnel', 'island', ['U1', 'U2', 'U3'], 'd9e3d2', '8a6a1a', null],
  ['viktoria-luise-platz', 'Viktoria-Luise-Platz', 52.4961053, 13.3427839, 'tunnel', 'island', [],           'eef0e6', '2f5a3f', null],
  ['bayerischer-platz',  'Bayerischer Platz',  52.4889727, 13.3401928, 'tunnel', 'island', ['U7'],            'e8d9b5', '7a3f2a', null],
  ['rathaus-schoeneberg', 'Rathaus Schöneberg', 52.4829916, 13.3419575, 'tunnel', 'island', [],               'efe9dc', '3f6a4a', 'park'],
  ['innsbrucker-platz',  'Innsbrucker Platz',  52.4790160, 13.3437459, 'tunnel', 'island', ['S41', 'S42', 'S46'], 'd8e4ec', '2a4f7a', null],
];

// Overstappen. Nollendorfplatz: keuze tussen het U1/U3-perron (zelfde gebouw) en de U2 (Hochbahn).
// U7 en de Ringbahn bestaan nog niet in het spel → trapgat met echt bord, maar afgesloten (zoals U3c).
export const U4_TRANSFERS = {
  nollendorfplatz: {
    line: 'U1', color: '#55a822', also: [{ line: 'U3', color: '#16683d' }, { line: 'U2', color: '#da421e' }],
    towards: 'Warschauer Str. · Krumme Lanke · Pankow', station: 'nollendorfplatz', label: 'U1 · U3 · U2',
    options: [
      { line: 'U1', station: 'nollendorfplatz', name: 'U1 · U3 perron', sub: 'Warschauer Str. · Uhlandstr. · Krumme Lanke', color: '#55a822' },
      { line: 'U2', station: 'nollendorfplatz', name: 'U2', sub: 'Pankow · Ruhleben', color: '#da421e' },
    ],
  },
  'bayerischer-platz': { line: 'U7', color: '#528dba', station: 'bayerischer-platz', towards: 'Rathaus Spandau · Rudow' },
  'innsbrucker-platz': { line: 'S', label: 'S41 S42 S46', color: '#008d4f', towards: 'Ringbahn · S41 S42 S46', closed: true },
};

/** Stations van de U4-wereld. */
export const U4_STATIONS = RAW.map(([id, name, lat, lon, kind, layout, transfers, wall, accent, profile], index) => ({
  line: 'U4', id, name, index, lat, lon, kind, layout, realLayout: layout, elev: 0, transfers,
  wall: '#' + wall, accent: '#' + accent, transfer: U4_TRANSFERS[id] || null, profile: profile ? { kind: profile } : null, bridge: null, surroundings: null,
  x: U4_LINE.origin.x + index * U4_LINE.spacing,
}));
