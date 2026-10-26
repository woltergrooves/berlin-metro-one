const RAW_STATIONS = [
  ['pankow', 'Pankow'],
  ['vinetastrasse', 'Vinetastraße'],
  ['schoenhauser-allee', 'Schönhauser Allee'],
  ['eberswalder-strasse', 'Eberswalder Straße'],
  ['senefelderplatz', 'Senefelderplatz'],
  ['rosa-luxemburg-platz', 'Rosa-Luxemburg-Platz'],
  ['alexanderplatz', 'Alexanderplatz'],
  ['klosterstrasse', 'Klosterstraße'],
  ['maerkisches-museum', 'Märkisches Museum'],
  ['spittelmarkt', 'Spittelmarkt'],
  ['hausvogteiplatz', 'Hausvogteiplatz'],
  ['stadtmitte', 'Stadtmitte'],
  ['anton-wilhelm-amo-strasse', 'Anton-Wilhelm-Amo-Straße'],
  ['potsdamer-platz', 'Potsdamer Platz'],
  ['mendelssohn-bartholdy-park', 'Mendelssohn-Bartholdy-Park'],
  ['gleisdreieck', 'Gleisdreieck'],
  ['buelowstrasse', 'Bülowstraße'],
  ['nollendorfplatz', 'Nollendorfplatz'],
  ['wittenbergplatz', 'Wittenbergplatz'],
  ['zoologischer-garten', 'Zoologischer Garten'],
  ['ernst-reuter-platz', 'Ernst-Reuter-Platz'],
  ['deutsche-oper', 'Deutsche Oper'],
  ['bismarckstrasse', 'Bismarckstraße'],
  ['sophie-charlotte-platz', 'Sophie-Charlotte-Platz'],
  ['kaiserdamm', 'Kaiserdamm'],
  ['theodor-heuss-platz', 'Theodor-Heuss-Platz'],
  ['neu-westend', 'Neu-Westend'],
  ['olympia-stadion', 'Olympia-Stadion'],
  ['ruhleben', 'Ruhleben'],
];

export const U2_START_INDEX = 6; // Alexanderplatz stays at world z=0.

export function createU2Stations(spacing) {
  return RAW_STATIONS.map(([id, name], index) => ({
    id,
    name,
    index,
    z: (index - U2_START_INDEX) * spacing,
  }));
}

export const U2_TERMINI = {
  pankow: 'Pankow',
  ruhleben: 'Ruhleben',
};
