# Ringbahn S41/S42 — plan en stand (Fase 45, roadmap-werkplan B)

Bron: OpenStreetMap-route-relaties **14981** (S41, met de klok mee ↻) en **14983** (S42, tegen de klok in ↺).
Lijnwereld-id **`S41`** (kleur #ad5937; S42 #cb6418), `sbahn: true`, **`ring: true`**. Eigen gebied **z = −7400**,
150 m per station in de S41-volgorde: Gesundbrunnen x = 0 … Wedding x = 3900. Richting +1 = S41, −1 = S42.

## Stappen
- **a ✅ (9 nov 2026)** — `src/data/s41.js` + `src/lines/S41Line.js` (`createLine`, nog **zonder treinen**). 27 stations:
  ingravingen (`cutting`: Gesundbrunnen, Schönhauser Allee, Prenzlauer Allee, Greifswalder Str., Landsberger Allee,
  Storkower Str., Hermannstraße, Tempelhof, Innsbrucker Platz, Bundesplatz, Heidelberger Platz, Hohenzollerndamm,
  Halensee, Westkreuz, Messe Nord/ZOB, Westend, Beusselstraße) en dijken (`viaduct` + `embank`: Frankfurter Allee,
  Ostkreuz (9 m, boven de Stadtbahn), Treptower Park, Sonnenallee, Neukölln, Südkreuz, Schöneberg, Jungfernheide,
  Westhafen, Wedding). Middenperron overal.
  - **Rondlopend spoor:** `LineWorld.wanted/buildOne` bouwen bij `line.ring` ook tussenstuk **−1** (vóór Gesundbrunnen,
    vanaf een kopie van Wedding op x −150) en **26** (na Wedding, naar een kopie van Gesundbrunnen op x 4050).
  - Overstappen: echt bord, maar **dicht** (`closed`, `note: 'overstap opent binnenkort'`): Gesundbrunnen U8,
    Schönhauser Allee U2, Frankfurter Allee U5, Ostkreuz/Westkreuz Stadtbahn, Neukölln U7, Hermannstraße U8,
    Tempelhof U6, Südkreuz S2/S25/S26, Schöneberg S1, Innsbrucker Platz U4, Bundesplatz U9, Heidelberger Platz U3,
    Jungfernheide U7, Westhafen U9, Wedding U6.
  - Uitgang: vast straatpunt per station (`S_EXITS`, uit OSM: dichtstbijzijnde benoemde straat; Westkreuz/Ostkreuz =
    Stadtbahnpunten). 13 nieuwe buurtpakketten → **192 haltes** (`osm2places.py` leest S41).
  - GOD-menu: chip S41; StreetScreen-kleur; HUD-tekst "Ringbahn · wacht op de S41 ↻ of S42 ↺".
  - BVG-app: Ring in het lijnenplan ("Rondlijn · treinen volgen binnenkort"); de **routeplanner** kent rondlijnen
    (buren lopen rond, richting "Ring ↻" = S41 / "Ring ↺" = S42) maar gebruikt alleen lijnen waar treinen rijden.
- **b ⬜ — treinen:** BR 481 (`sbahnTemplate`), S41 richting +1, S42 als gast richting −1 (`dest` 'Ring ↻'/'Ring ↺').
  Nieuw nodig: treinen springen bij de naad rond (x > 3900 + 75 → x − 4050 en omgekeerd), zonder eindpunt te keren;
  `TrainTimeline`/`LineTrain` moeten een route zonder einde aankunnen (index modulo 27). Vertrekbord: "S41 Ring ↻".
- **c ⬜ — overstappen:** trapgaten openen + terugwegen op de U-lijnen (U2 Schönhauser Allee en U8 Gesundbrunnen /
  Hermannstraße via borden aan het perroneinde), Stadtbahn ⇄ Ring bij Ost- en Westkreuz.
- **d ⬜ — omgeving:** OSM-pakketten (`osm2pack.py`, lijst S41), straatbruggen over de ingravingen.
- **e ⬜ — afwerking:** stationsprofielen (Ostkreuz Ringhalle, Südkreuz glasdak, Gesundbrunnen), controle Street View.

## Routeaanwijzing in de HUD (9 nov 2026) — `src/systems/RouteHud.js`
Kies je in de BVG-app een bestemming, dan staat bovenin (onder de ritbalk als die zichtbaar is) een balkje met lijn,
richting, aantal haltes en waar je uitstapt of overstapt. Rijdend: "Blijf zitten · nog N haltes", "Stap uit bij de
volgende halte", ⚠ bij de verkeerde richting (nieuwe lijnen; niet U2/U3). Aangekomen: ✓, na 8 s weg. Tik = BVG-app,
× = route stoppen. Bron: `BerlinPhoneNetz.dest` / `.plan()`. Console: `BerlinRouteHud.status()`, `.update()`, `.stop()`.

## Test
`tools/consolidation/s41-test.mjs <url> <map>` (env `SKIP=1` = stations overslaan) — stations, naad, GOD, dicht trapgat,
uitgang → Street View, routebalk (perron, overstap, rijdend, aangekomen, ×), routeplanner rond de Ring.
