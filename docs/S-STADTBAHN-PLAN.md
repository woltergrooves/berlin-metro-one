# Fase 45 — S-Bahn Stadtbahn (Westkreuz ⇄ Ostkreuz)

Bron: OSM-relatie 2015959 (S5 Westkreuz ⇒ Strausberg Nord; haltes). Op dit traject rijden S3, S5, S7 en S9.
14 stations, alles op het gemetselde Stadtbahnviaduct (Viaduktbögen) naast twee Fernbahnsporen.
Lijnwereld `S5` (lijnkleur #eb7405), eigen gebied **z = −6800**, 150 m per station: Westkreuz x = 0 … Ostkreuz x = 1950.

## Stappen
- **Deel a — lijnwereld + stations ✅ (8 nov 2026)**
  - `src/data/s5.js`, `src/lines/S5Line.js` (`createLine`, nog zonder treinen).
  - `LineWorld`: station-vlag **`arches`** → `archShell`: bakstenen boogviaduct (z −7,6 … 19,6), per 15 m een boog met
    winkelpui / café / dichtgemetseld (`archTex`, liggen vast in de wereld), borstwering met deksteen, ballastdek,
    **Fernbahnsporen** z 10,4 / 17,4 (geen stroomrail, `noThird`) met bovenleiding. `st.fern` = regionaal perron
    (niet begaanbaar) tussen de Fernbahnsporen. Zonder hal: vlinderdak op het middenperron (zuilen om de 9 m, vrij
    van uitgang/overstaptrap). Straat aan beide kanten van het viaduct (gevels op z −34 / 46).
  - Profiel **`hall-stadtbahn`** (`stadtbahnHall`): tongewelf over alle vier sporen, glazen lichtstraat;
    `glassAll` (Hauptbahnhof), `brick` (Hackescher Markt: bakstenen wanden met boogramen). Jannowitzbrücke: `hall-barrel`.
  - S-Bahn-stationsborden: donkergroen met wit S-logo (`line.sbahn`).
  - Overstaptrapgaten met echt bord, nog **dicht** (Zoo U2/U9, Hbf U5, Friedrichstraße U6, Alexanderplatz U2/U5/U8,
    Jannowitzbrücke U8, Warschauer Straße U1/U3, Charlottenburg U7, Westkreuz/Ostkreuz Ring). `transfer.note` = eigen
    hinttekst ("overstap opent binnenkort").
  - Uitgangen + Street View (zoals alle lijnen); 8 nieuwe buurtpakketten → **179 haltes**.
  - GOD-menu: lijnchip **S5** (`GodTeleport.js` ORDER/COLORS).
  - Test: `tools/consolidation/s5-test.mjs <url> <map>` (env `SKIP=1`).
- **Deel b — treinen:** BR 481/483 (rood/oker, eigen model), S3/S5/S7/S9 op dezelfde sporen (zoals U3-gasten op de U1),
  DFI met S-Bahn-bestemmingen, korte frequentie. Fernbahn: af en toe een ICE/RE op de buitensporen (decor).
- **Deel c — overstappen:** de trapgaten openen (`closed` weg + `station`), borden terug op U2 (Zoo, Alexanderplatz) en
  U8 (Alexanderplatz, Jannowitzbrücke) en de nu nog dichte S-trapgaten op U5 (Hbf), U6 (Friedrichstraße), U7
  (Wilmersdorfer Straße/Charlottenburg), U1/U3 (Warschauer Straße) naar `S5` laten wijzen.
- **Deel d — echte omgeving:** OSM-pakketten (`osm2pack.py`), Spree-bruggen (Bellevue, Hbf/Humboldthafen,
  Friedrichstraße–Hackescher Markt, Jannowitzbrücke), Fernsehturm/Dom, Tiergarten-groen.

## Bekend (deel a)
- Viaducthoogte per station vereenvoudigd (5–10 m); Ostkreuz zonder het Ring-niveau erboven.
- Halleinden open; Hauptbahnhof zonder de kruisende noord-zuidhal.
- Overgangen tussen bogen met verschillende hoogte: kleine sprong aan de onderkant (in de straat verborgen).
