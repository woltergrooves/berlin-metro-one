// Berlin Life — S-Bahn Ringbahn S41/S42 (Fase 45, deel a, 9 nov 2026). 27 stations rond het centrum.
//
// Bron: OpenStreetMap-route-relaties 14981 (S41: Ring im Uhrzeigersinn ↻) en 14983 (S42: gegen den Uhrzeigersinn ↺);
// haltecoördinaten + ligging (tags layer/bridge/embankment), aangevuld met de werkelijke situatie (herkenbaar, niet 1:1).
//
// De Ring is een cirkel. Speltekening (src/lines/LineWorld.js): eigen gebied op z = −7400 (S5 −6800), langs de x-as,
// 150 m per station, in de S41-volgorde: Gesundbrunnen = x 0 … Wedding = x 3900. `ring: true` → na Wedding loopt het
// spoor door naar een kopie van Gesundbrunnen (x 4050) en vóór Gesundbrunnen ligt het stuk vanaf Wedding (x −150).
// Treinen (deel b) springen daar ongezien rond. Richting +1 = S41 (met de klok mee), −1 = S42 (tegen de klok in).
//
// Ligging: 'cutting' = ingraving onder de straatbrug (het klassieke Ringbahnstation: Schönhauser Allee, Prenzlauer Allee,
// Hermannstraße, Heidelberger Platz …); 'viaduct' + embank = op de dijk/brug boven de straat (Frankfurter Allee,
// Treptower Park, Neukölln, Südkreuz en Schöneberg op het bovenste niveau, Ostkreuz boven de Stadtbahn …).
// Hoogte (elev) = straat onder het perron (alleen viaduct).

export const S41_LINE = {
  id: 'S41',
  name: 'S41',
  color: '#ad5937',          // VBB-lijnkleur S41 (S42: #cb6418)
  sbahn: true,               // groene stationsborden met het S-logo
  ring: true,                // rondlopend: geen eindpunten
  trainModel: 'bvg-481',     // deel b: BR 481 zoals op de Stadtbahn
  dest: ['Ring ↺', 'Ring ↻'],   // [richting −1 = S42, richting +1 = S41]
  headwayMinutes: 5,
  spacing: 150,
  origin: { x: 0, y: 0, z: -7400 }, // 600 m naast de Stadtbahn (z −6800); ver van U2 (x≈0, z ≥ −1080) en U8 (z≈49)
  termini: [],
};
// Deel b: de S42 rijdt als gast in deze wereld, in de tegenrichting (zie S5_GUESTS).
export const S42_LINE = { id: 'S42', name: 'S42', color: '#cb6418', sbahn: true, ring: true, dest: S41_LINE.dest, origin: S41_LINE.origin };

// [id, naam, lat, lon, ligging, hoogte, overstap, kap/accent]
const RAW = [
  ['gesundbrunnen',       'Gesundbrunnen',       52.5491593, 13.3899951, 'cutting', 0, ['U8', 'S1', 'S2', 'S25', 'S26', 'RE', 'ICE'], '3f4a4f'],
  ['schoenhauser-allee',  'Schönhauser Allee',   52.5489522, 13.4164114, 'cutting', 0, ['U2', 'S8', 'S85'],         '5a3f36'],
  ['prenzlauer-allee',    'Prenzlauer Allee',    52.5446103, 13.4262424, 'cutting', 0, ['S8', 'S85', 'Tram'],       '4a5a4e'],
  ['greifswalder-strasse','Greifswalder Straße', 52.5398615, 13.4396585, 'cutting', 0, ['S8', 'S85', 'Tram'],       '5a4a3e'],
  ['landsberger-allee',   'Landsberger Allee',   52.5288924, 13.4552684, 'cutting', 0, ['S8', 'S85', 'Tram'],       '4a5a4e'],
  ['storkower-strasse',   'Storkower Straße',    52.5235155, 13.4656543, 'cutting', 0, ['S8', 'S85'],               '5a4a3e'],
  ['frankfurter-allee',   'Frankfurter Allee',   52.5145767, 13.4747039, 'viaduct', 6, ['U5', 'S8', 'S85'],         '3f4a4f'],
  ['ostkreuz',            'Ostkreuz',            52.5027427, 13.4687755, 'viaduct', 9, ['S3', 'S5', 'S7', 'S9', 'S8', 'S85', 'RE'], '9aa2a6'],
  ['treptower-park',      'Treptower Park',      52.4934080, 13.4611736, 'viaduct', 6, ['S8', 'S85', 'S9'],         '6a4a36'],
  ['sonnenallee',         'Sonnenallee',         52.4725382, 13.4551680, 'viaduct', 5, ['S45', 'S46', 'S47'],       '4a5a4e'],
  ['neukoelln',           'Neukölln',            52.4693782, 13.4423656, 'viaduct', 6, ['U7', 'S45', 'S46', 'S47'], '5a4a3e'],
  ['hermannstrasse',      'Hermannstraße',       52.4675681, 13.4303522, 'cutting', 0, ['U8', 'S45', 'S46', 'S47'], '4a5a4e'],
  ['tempelhof',           'Tempelhof',           52.4712316, 13.3835184, 'cutting', 0, ['U6', 'S45', 'S46'],        '3f4a4f'],
  ['suedkreuz',           'Südkreuz',            52.4763351, 13.3653382, 'viaduct', 8, ['S2', 'S25', 'S26', 'RE', 'ICE'], '9aa2a6'],
  ['schoeneberg',         'Schöneberg',          52.4792174, 13.3509197, 'viaduct', 7, ['S1'],                      '5a3f36'],
  ['innsbrucker-platz',   'Innsbrucker Platz',   52.4781680, 13.3406589, 'cutting', 0, ['U4', 'S46'],               '4a5a4e'],
  ['bundesplatz',         'Bundesplatz',         52.4777023, 13.3289611, 'cutting', 0, ['U9', 'S46'],               '5a4a3e'],
  ['heidelberger-platz',  'Heidelberger Platz',  52.4804521, 13.3113393, 'cutting', 0, ['U3', 'S46'],               '3f4a4f'],
  ['hohenzollerndamm',    'Hohenzollerndamm',    52.4889341, 13.2999556, 'cutting', 0, ['S46'],                     '4a5a4e'],
  ['halensee',            'Halensee',            52.4960144, 13.2906869, 'cutting', 0, ['S46'],                     '5a4a3e'],
  ['westkreuz',           'Westkreuz',           52.5013808, 13.2835436, 'cutting', 0, ['S3', 'S5', 'S7', 'S9', 'S46'], '4a5a4e'],
  ['messe-nord',          'Messe Nord/ZOB',      52.5081700, 13.2839390, 'cutting', 0, ['S46'],                     '3f4a4f'],
  ['westend',             'Westend',             52.5187699, 13.2843103, 'cutting', 0, ['S46'],                     '5a4a3e'],
  ['jungfernheide',       'Jungfernheide',       52.5304735, 13.3002882, 'viaduct', 5, ['U7', 'RE'],                '4a5a4e'],
  ['beusselstrasse',      'Beusselstraße',       52.5344182, 13.3300021, 'cutting', 0, [],                          '5a4a3e'],
  ['westhafen',           'Westhafen',           52.5362865, 13.3449438, 'viaduct', 5, ['U9'],                      '3f4a4f'],
  ['wedding',             'Wedding',             52.5433212, 13.3683388, 'viaduct', 6, ['U6'],                      '6a4a36'],
];

// Overstappen (deel c, 9 nov 2026): open, behalve naar de Nord-Süd-Bahn (Südkreuz S2/S25/S26, Schöneberg S1) — die
// komt later in het spel. Terug: op U2 (Schönhauser Allee) en U8 (Gesundbrunnen, Hermannstraße) een groen S-bord aan het
// perroneinde (S41_SIGN); op de nieuwe lijnen en de Stadtbahn het eigen trapgat (`to: 'S41'`).
const NOTE = 'Nord-Süd-Bahn komt later in het spel';
const T = (line, color, towards, extra = {}) => ({ line, color, towards, ...extra });
const S_GREEN = '#008d4f';
const S41_TRANSFERS = {
  gesundbrunnen: T('U8', '#224f86', 'Wittenau · Hermannstraße', { station: 9 }),
  'schoenhauser-allee': T('U2', '#da421e', 'Pankow · Ruhleben', { station: 'schoenhauser-allee' }),
  'frankfurter-allee': T('U5', '#7e5330', 'Hauptbahnhof · Hönow', { station: 'frankfurter-allee' }),
  ostkreuz: T('S', S_GREEN, 'Stadtbahn · Westkreuz · Erkner', { label: 'S3 S5 S7 S9', to: 'S5', station: 'ostkreuz' }),
  neukoelln: T('U7', '#528dba', 'Rudow · Rathaus Spandau', { station: 'neukoelln' }),
  hermannstrasse: T('U8', '#224f86', 'Wittenau · Hermannstraße', { station: 23 }),
  tempelhof: T('U6', '#8c6dab', 'Kurt-Schumacher-Pl. · Alt-Mariendorf', { station: 'tempelhof' }),
  suedkreuz: T('S', S_GREEN, 'Nord-Süd · Blankenfelde · Teltow', { label: 'S2 S25 S26', closed: true, note: NOTE }),
  schoeneberg: T('S', S_GREEN, 'Wannsee · Oranienburg', { label: 'S1', closed: true, note: NOTE }),
  'innsbrucker-platz': T('U4', '#ffd900', 'Nollendorfplatz', { station: 'innsbrucker-platz', text: '#1a1a1a' }),
  bundesplatz: T('U9', '#f3791d', 'Osloer Str. · Rathaus Steglitz', { station: 'bundesplatz' }),
  'heidelberger-platz': T('U3', '#16683d', 'Krumme Lanke · Warschauer Str.', { station: 'heidelberger-platz' }),
  westkreuz: T('S', S_GREEN, 'Stadtbahn · Spandau · Potsdam', { label: 'S3 S5 S7 S9', to: 'S5', station: 'westkreuz' }),
  jungfernheide: T('U7', '#528dba', 'Rudow · Rathaus Spandau', { station: 'jungfernheide' }),
  westhafen: T('U9', '#f3791d', 'Osloer Str. · Rathaus Steglitz', { station: 'westhafen' }),
  wedding: T('U6', '#8c6dab', 'Kurt-Schumacher-Pl. · Alt-Mariendorf', { station: 'wedding' }),
};
/** Bord aan het perroneinde van U2/U8 (terug naar de Ring). */
export const S41_SIGN = { line: 'S', label: 'S41 S42', color: S_GREEN, towards: 'Ringbahn · S41 ↻ · S42 ↺', hint: 'Übergang Ringbahn' };
for (const t of Object.values(S41_TRANSFERS)) if (!t.label) t.label = [t, ...(t.also || [])].map(b => b.line).join(' · ');

// Uitgang naar Street View: vast straatpunt per station (de halte ligt in de ingraving of op de dijk; daar vindt Google
// vaak alleen perron-/halpanorama's). Uit OSM: dichtstbijzijnde benoemde straat buiten de sporen. Westkreuz/Ostkreuz:
// dezelfde punten als de Stadtbahn (gecontroleerd 8 nov).
const S_EXITS = {
  gesundbrunnen: [52.5502414, 13.3903673],        // Behmstraße
  'schoenhauser-allee': [52.5491752, 13.4166952], // Greifenhagener Straße
  'prenzlauer-allee': [52.5440971, 13.4259518],   // Ahlbecker Straße
  'greifswalder-strasse': [52.5406209, 13.4403942], // Pieskower Weg
  'landsberger-allee': [52.5284710, 13.4549920],  // Landsberger Allee
  'storkower-strasse': [52.5234397, 13.4653373],  // Hermann-Blankenstein-Straße
  'frankfurter-allee': [52.5146545, 13.4742227],  // Rigaer Straße
  ostkreuz: [52.5028862, 13.4700329],             // Kynaststraße
  'treptower-park': [52.4937917, 13.4606272],     // Elsenstraße
  sonnenallee: [52.4726171, 13.4549144],          // Saalestraße
  neukoelln: [52.4693214, 13.4417954],            // Karl-Marx-Straße
  hermannstrasse: [52.4677721, 13.4303540],       // Siegfriedstraße
  tempelhof: [52.4715964, 13.3837288],            // Hoeppnerstraße
  suedkreuz: [52.4762385, 13.3667478],            // General-Pape-Straße
  schoeneberg: [52.4794390, 13.3500027],          // Ebersstraße
  'innsbrucker-platz': [52.4783968, 13.3409733],  // Wexstraße
  bundesplatz: [52.4772998, 13.3289771],          // Varziner Straße
  'heidelberger-platz': [52.4809354, 13.3118684], // Rudolstädter Straße
  hohenzollerndamm: [52.4893305, 13.3008808],     // Seesener Straße
  halensee: [52.4963597, 13.2914756],             // Seesener Straße
  westkreuz: [52.5007742, 13.2812438],            // Halenseestraße
  'messe-nord': [52.5081247, 13.2844036],         // Spiegelweg
  westend: [52.5187028, 13.2845750],              // Spandauer Damm
  jungfernheide: [52.5309631, 13.2999044],        // Max-Dohrn-Straße
  beusselstrasse: [52.5348054, 13.3287246],       // Westhafenstraße
  westhafen: [52.5354967, 13.3453510],            // Ellen-Epstein-Straße
  wedding: [52.5436321, 13.3678148],              // Lindower Straße
};

/** Stations van de Ringwereld (S41-volgorde). */
export const S41_STATIONS = RAW.map(([id, name, lat, lon, kind, elev, transfers, accent], index) => ({
  line: 'S41', id, name, index, lat, lon, kind, layout: 'island', realLayout: 'island', elev: kind === 'viaduct' ? elev : 0,
  embank: kind === 'viaduct', transfers, wall: '#7a4a3a', accent: '#' + accent, transfer: S41_TRANSFERS[id] || null,
  exit: S_EXITS[id] ? { lat: S_EXITS[id][0], lon: S_EXITS[id][1] } : null, profile: null, bridge: null, surroundings: {},   // deel d: OSM-pakket public/assets/surroundings/s41/<id>.json
 
  x: S41_LINE.origin.x + index * S41_LINE.spacing,
}));
