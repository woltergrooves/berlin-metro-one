// Berlin Life — S-Bahn Nord-Süd-Bahn S1/S2/S25/S26 (Phase 45, roadmap work plan C, part a+b+c, 16 Nov 2026).
// Gesundbrunnen ⇄ Südkreuz, 10 stations: the north–south tunnel under the city centre (opened 1936–1939).
//
// Source: OpenStreetMap route relation 2269237 (S2: Bernau ⇒ Blankenfelde; stop coordinates + way tags layer/tunnel),
// filled in with the real situation (recognisable, not 1:1). S1 (relation 1929070) leaves this track after Anhalter
// Bahnhof for Yorckstraße (Großgörschenstraße) → Schöneberg → Wannsee; that branch comes later (like the U3 on the U1).
//
// Cold War: between 1961 and 1989 West Berlin trains ran through this tunnel under East Berlin without stopping.
// Nordbahnhof, Oranienburger Straße, Brandenburger Tor (then "Unter den Linden") and Potsdamer Platz were
// "ghost stations" (Geisterbahnhöfe), dimly lit and guarded; only Friedrichstraße stayed open as a border crossing.
// Nordbahnhof has a small exhibition about it (profile 'photos').
//
// Game layout (src/lines/LineWorld.js): own area at z = −8000 (Ring −7400), along the x-axis, 150 m per station,
// Gesundbrunnen = x 0 … Südkreuz = x 1350, +x = southbound (towards Blankenfelde / Teltow Stadt).
// Position: Gesundbrunnen and Humboldthain in an open cutting, Nordbahnhof … Anhalter Bahnhof in the tunnel,
// Yorckstraße on the embankment above the Yorckstraße bridges, Südkreuz on the lower level under the Ring.

export const S2_LINE = {
  id: 'S2',
  name: 'S2',
  color: '#007734',          // VBB line colour S2 (S25/S26 the same green, S1 pink)
  sbahn: true,               // green station signs with the S logo
  trainModel: 'bvg-481',
  dest: ['Bernau', 'Blankenfelde'],   // [direction −1 = northbound, direction +1 = southbound]
  headwayMinutes: 10,
  spacing: 150,
  origin: { x: 0, y: 0, z: -8000 }, // 600 m beside the Ring (z −7400); far from U2 (x≈0, z ≥ −1080) and U8 (z≈49)
  termini: ['gesundbrunnen', 'suedkreuz'],
};
// The other lines on the Nord-Süd track (guests in the S2 line world, like S3/S7/S9 on the Stadtbahn).
export const S2_GUESTS = [
  { line: { id: 'S25', name: 'S25', color: '#007734', sbahn: true, dest: ['Hennigsdorf', 'Teltow Stadt'], origin: S2_LINE.origin }, start: 4 },
  { line: { id: 'S26', name: 'S26', color: '#007734', sbahn: true, dest: ['Blankenburg', 'Teltow Stadt'], origin: S2_LINE.origin }, start: 7 },
];

// [id, name, lat, lon, position, height, transfers, wall, accent, profile]
const RAW = [
  ['gesundbrunnen',         'Gesundbrunnen',         52.5493068, 13.3890629, 'cutting', 0, ['U8', 'S41', 'S42', 'RE', 'ICE'],        null,     '3f4a4f', { city: 'platte' }],
  ['humboldthain',          'Humboldthain',          52.5447617, 13.3792576, 'cutting', 0, [],                                      null,     '4a5a4e', { city: 'platte' }],
  ['nordbahnhof',           'Nordbahnhof',           52.5326616, 13.3869051, 'tunnel',  0, ['Tram'],                                'e6e0cc', '2f6a4a', 'photos'],
  ['oranienburger-strasse', 'Oranienburger Straße',  52.5251817, 13.3928834, 'tunnel',  0, ['Tram'],                                'dfe3d2', '3a6a5a', null],
  ['friedrichstrasse',      'Friedrichstraße',       52.5202346, 13.3858855, 'tunnel',  0, ['U6', 'S3', 'S5', 'S7', 'S9', 'RE'],    'ece2c8', '7a3a2a', null],
  ['brandenburger-tor',     'Brandenburger Tor',     52.5164367, 13.3809354, 'tunnel',  0, ['U5'],                                  'e4e4dc', '2a4a7a', null],
  ['potsdamer-platz',       'Potsdamer Platz',       52.5092642, 13.3763912, 'tunnel',  0, ['U2', 'RE'],                            'e8dcc0', '2f5a3f', null],
  ['anhalter-bahnhof',      'Anhalter Bahnhof',      52.5034307, 13.3813522, 'tunnel',  0, [],                                      'e6d8c2', '7a4a2a', null],
  ['yorckstrasse',          'Yorckstraße',           52.4911281, 13.3719867, 'viaduct', 6, ['U7', 'S1'],                            null,     '5a4a3e', null],
  ['suedkreuz',             'Südkreuz',              52.4758197, 13.3648297, 'cutting', 0, ['S41', 'S42', 'S45', 'S46', 'RE', 'ICE'], null,   '9aa2a6', { city: 'platte' }],
];

// Transfers (part c): all open. Back: on U2 (Potsdamer Platz) and U8 (Gesundbrunnen) a green S sign at the platform
// end (S2_SIGN); on the new lines, the Stadtbahn and the Ring their own stairwell (`to: 'S2'`).
const S_GREEN = '#008d4f';
const S2_TRANSFERS = {
  gesundbrunnen: { line: 'S', color: S_GREEN, also: [{ line: 'U8', color: '#224f86' }], label: 'S41 S42 · U8', towards: 'Ringbahn · Wittenau · Hermannstraße', station: 'gesundbrunnen',
    options: [
      { line: 'S', to: 'S41', station: 'gesundbrunnen', name: 'Ringbahn', sub: 'S41 ↻ · S42 ↺', color: S_GREEN },
      { line: 'U8', station: 9, name: 'U8', sub: 'Wittenau · Hermannstraße', color: '#224f86' },
    ] },
  friedrichstrasse: { line: 'S', color: S_GREEN, also: [{ line: 'U6', color: '#8c6dab' }], label: 'S3 S5 S7 S9 · U6', towards: 'Stadtbahn · Kurt-Schumacher-Pl. · Alt-Mariendorf', station: 'friedrichstrasse',
    options: [
      { line: 'S', to: 'S5', station: 'friedrichstrasse', name: 'S-Bahn Stadtbahn', sub: 'S3 S5 S7 S9 · Westkreuz · Ostkreuz', color: S_GREEN },
      { line: 'U6', station: 'friedrichstrasse', name: 'U6', sub: 'Kurt-Schumacher-Pl. · Alt-Mariendorf', color: '#8c6dab' },
    ] },
  'brandenburger-tor': { line: 'U5', color: '#7e5330', station: 'brandenburger-tor', towards: 'Hauptbahnhof · Hönow' },
  'potsdamer-platz': { line: 'U2', color: '#da421e', station: 'potsdamer-platz', towards: 'Pankow · Ruhleben' },
  yorckstrasse: { line: 'U7', color: '#528dba', station: 'yorckstrasse', towards: 'Rudow · Rathaus Spandau' },
  suedkreuz: { line: 'S', to: 'S41', station: 'suedkreuz', label: 'S41 S42', color: S_GREEN, towards: 'Ringbahn · S41 ↻ · S42 ↺' },
};
for (const t of Object.values(S2_TRANSFERS)) if (!t.label) t.label = [t, ...(t.also || [])].map(b => b.line).join(' · ');
/** Sign at the U2/U8 platform end (back to the Nord-Süd-Bahn). */
export const S2_SIGN = { line: 'S', label: 'S1 S2 S25 S26', color: S_GREEN, towards: 'Nord-Süd-Bahn · Blankenfelde · Teltow · Bernau', hint: 'Übergang Nord-Süd-Bahn' };

// Exit to Street View: fixed street point for the open-air stations (cutting / embankment; there Google often only
// finds platform panoramas). From OSM: nearest named street. Tunnel stations use their own coordinates.
const S_EXITS = {
  gesundbrunnen: [52.5502414, 13.3903673],   // Behmstraße (same as the Ring)
  humboldthain: [52.5444955, 13.3790358],    // Wiesenstraße
  yorckstrasse: [52.4923226, 13.3726001],    // Yorckstraße
  suedkreuz: [52.4762385, 13.3667478],       // General-Pape-Straße (same as the Ring)
};

/** Stations of the Nord-Süd world. */
export const S2_STATIONS = RAW.map(([id, name, lat, lon, kind, elev, transfers, wall, accent, profile], index) => ({
  line: 'S2', id, name, index, lat, lon, kind, layout: 'island', realLayout: 'island', elev: kind === 'viaduct' ? elev : 0,
  embank: kind === 'viaduct', transfers, wall: wall ? '#' + wall : '#7a4a3a', accent: '#' + accent, transfer: S2_TRANSFERS[id] || null,
  exit: S_EXITS[id] ? { lat: S_EXITS[id][0], lon: S_EXITS[id][1] } : null,
  profile: typeof profile === 'string' ? { kind: profile } : profile, bridge: null, surroundings: {},
  x: S2_LINE.origin.x + index * S2_LINE.spacing,
}));
