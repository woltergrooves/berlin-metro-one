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
- **Deel b — treinen ✅ (8/9 nov 2026)**
  - `src/lines/SBahnTrains.js`: eigen model **BR 481** (`sbahnTemplate`, onder karminrood, boven oker, zwarte raamband,
    interieur met blauwe zitjes en gele stangen, doorzichtige ramen). Prestaties: drie gedeelde materialen met
    vertexkleuren, deurbladen per kant samengevoegd (`Door_p_0_L` enz.), ±17 meshes per wagen. Cabines aan beide
    uiteinden (`Cab+`/`Cab-`), binnen het treinstel de overloop (`Gang±`).
  - S5 met 2 treinen per richting; **S3, S7, S9 als gasten** (`S5_GUESTS`, `createLine({ guests })`) met eigen
    beginhalte. `line.dest` = echte eindpunten (Spandau/Erkner, Westkreuz/Strausberg Nord, Potsdam Hbf/Ahrensfelde,
    Spandau/Flughafen BER) op film, vertrekbord en HUD (`LineTrain.setDestination`, ook na keren).
  - Vertrekbord 4 regels, op tijd gesorteerd, ronde lijnsymbolen (`line.sbahn`); HUD toont max. 4 vertrekken.
  - Fernbahn-decor (`FernbahnTraffic`): om de 1–2 min een RE (stopt aan het regionale perron) of ICE (rijdt door) op
    z 10,4 / 17,4; alleen als de speler op de Stadtbahn is.
  - `createLine({ template, guests, decor })` + `simulate(sec)` (spoelt treinen vooruit; headless loopt het spel op ±1 fps).
  - Test `tools/consolidation/s5b-test.mjs <url> <map>` → **9/9**.
- **Deel c — overstappen ✅ (9 nov 2026)**
  - S-kant: Charlottenburg → U7 (Wilmersdorfer Str.), Zoo → keuze U2/U9, Hauptbahnhof → U5, Friedrichstraße → U6,
    Alexanderplatz → keuze U2/U5/U8, Jannowitzbrücke → U8 (index 15), Warschauer Straße → U1 (met U3). West-/Ostkreuz dicht (Ring).
  - Terug: de vroegere S-hekken wijzen naar de S5 (`to: 'S5'`): U5 Hauptbahnhof, U6 Friedrichstraße, U7 Wilmersdorfer
    Straße; U5 Alexanderplatz en U9 Zoo krijgen een extra keuze "S-Bahn"; U1 Warschauer Straße nieuw trapgat.
    Groen S-bord (`S5_SIGN`) op het U2-perron Zoo en Alexanderplatz en het U8-perron Jannowitzbrücke.
  - `LineTransfers`: `o.to` = doellijn naast het bordsymbool; punten ook uit `options`; twee lijnen op hetzelfde
    perroneinde → borden boven elkaar en een keuzevenster (`choose(t, fromU)`). U8 Alexanderplatz → S via het U2-perron.
  - Test `tools/consolidation/s5c-test.mjs <url> <map>` → **12/12**.
- **Deel d — echte omgeving ✅ (9 nov 2026)**
  - 14 OSM-pakketten `public/assets/surroundings/s5/` (`osm2pack.py`: lijst `S5`, eigen spoor = `light_rail`, strook
    z −12 … 24 over het hele viaduct, gebouwen max. 70 m, torens weg, `xing` = waterkruisingen, spiegelen als de
    Fernbahn links ligt — bij alle 14 niet nodig). `S5Line` met `surroundings: true`.
  - Spreebruggen (`S_BRIDGES`, `LineWorld.stadtbahnBridge`): Bellevue → Hauptbahnhof en Hauptbahnhof → Friedrichstraße,
    stalen vakwerkligger over vier sporen, landhoofden, pijler, water met kades.
  - Fernsehturm in de verte (`Surroundings.FAR_MARKS`, lijn S5).
  - Shots `tools/consolidation/s5d-shots.mjs <url> <map>` (env `ONLY=3,6`).

## Bekend
- Viaducthoogte per station vereenvoudigd (5–10 m); Ostkreuz zonder het Ring-niveau erboven.
- Halleinden open; Hauptbahnhof zonder de kruisende noord-zuidhal.
- Overgangen tussen bogen met verschillende hoogte: kleine sprong aan de onderkant (in de straat verborgen).
- Treinen rijden binnen de lijnwereld en keren aan West-/Ostkreuz (film toont de echte bestemming).
- Bij Bellevue ligt het OSM-park over het water van de brug; pakketten zijn per station, de afstanden in het spel ingekort.
- U8 Alexanderplatz → S-Bahn via het U2-perron (het westeinde van het U8-perron is de trap naar de hal).
- Op iPhone/iPad controleren: treinen in/uit, vertrekbord, overstappen Zoo/Alex (keuzevenster), omgeving en bruggen, prestaties.
