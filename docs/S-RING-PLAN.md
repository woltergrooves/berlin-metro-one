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
  - Overstappen (deel a): echt bord, maar **dicht** (`closed`, `note: 'overstap opent binnenkort'`): Gesundbrunnen U8,
    Schönhauser Allee U2, Frankfurter Allee U5, Ostkreuz/Westkreuz Stadtbahn, Neukölln U7, Hermannstraße U8,
    Tempelhof U6, Südkreuz S2/S25/S26, Schöneberg S1, Innsbrucker Platz U4, Bundesplatz U9, Heidelberger Platz U3,
    Jungfernheide U7, Westhafen U9, Wedding U6.
  - Uitgang: vast straatpunt per station (`S_EXITS`, uit OSM: dichtstbijzijnde benoemde straat; Westkreuz/Ostkreuz =
    Stadtbahnpunten). 13 nieuwe buurtpakketten → **192 haltes** (`osm2places.py` leest S41).
  - GOD-menu: chip S41; StreetScreen-kleur; HUD-tekst "Ringbahn · wacht op de S41 ↻ of S42 ↺".
  - BVG-app: Ring in het lijnenplan ("Rondlijn · treinen volgen binnenkort"); de **routeplanner** kent rondlijnen
    (buren lopen rond, richting "Ring ↻" = S41 / "Ring ↺" = S42) maar gebruikt alleen lijnen waar treinen rijden.
- **b ✅ (9 nov 2026) — treinen:** BR 481 (`sbahnTemplate`). `S41Line.js`: `trainsPerDir: 4, dirs: [1]` (S41 alleen ↻) +
  gast `S42_LINE` `{ perDir: 4, dirs: [-1] }` (alleen ↺); `createLine` kent nu `dirs` (eigen treinen) en `gs.dirs` (gasten).
  - **`RingTimeline`** (`src/systems/TrainTimeline.js`): volgende halte = (index ± 1) mod 27, nooit eindpunt/keren;
    `aheadZ` = doel in rijrichting (eventueel een ronde verder); midden in het naadstuk (x > 3975 of < −75) springt z met
    de ringlengte 4050 rond (`wrap`). `etaToStation` loopt rond. `LineTrain` kiest `RingTimeline` bij `line.ring`.
  - Tekenen: `LineTrain.place()` tekent op de kopie van de ring die het dichtst bij de speler ligt (`drawX`);
    `blocked`/`trackClear` rekenen de afstand rond de naad (`along`). Vertrekbord en HUD: geen eindpuntfilter op de Ring;
    S42 telt niet als "gast" (zelfde wachttijden als de S41).
  - **LineWorld:** kopiestations aan de naad (`st` −1 = Wedding op x −150, `st` 27 = Gesundbrunnen op x 4050); bij index
    ≤ 1 of ≥ 25 wordt de overkant van de naad al gebouwd → de meerijder springt onzichtbaar rond (`primeAll` als vangnet,
    `status.seam` telt de sprongen).
- **c ✅ (9 nov 2026) — overstappen:** open: Gesundbrunnen → U8 (9), Schönhauser Allee → U2, Frankfurter Allee → U5,
  Ostkreuz/Westkreuz → Stadtbahn, Neukölln/Jungfernheide → U7, Hermannstraße → U8 (23), Tempelhof/Wedding → U6,
  Innsbrucker Platz → U4, Bundesplatz/Westhafen → U9, Heidelberger Platz → U3. Dicht (Nord-Süd-Bahn komt later): Südkreuz,
  Schöneberg. Terug: `to: 'S41'` op U3/U4/U5/U6/U7/U9 en de Stadtbahn; groen bord **`S41_SIGN`** aan het −z-einde van
  het U2-perron Schönhauser Allee en aan het westeinde van het U8-perron Gesundbrunnen/Hermannstraße. Console:
  `BerlinLines.Transfers.toS41(i)`.
- **d ✅ (9 nov 2026) — omgeving:** 27 OSM-pakketten `public/assets/surroundings/s41/` (`osm2pack.py` lijst `S41`, sleutel
  `s41-<id>`, uitsnede `osm/s41-<id>.osm`, `BAND` ±22 m, geen spiegeling; env `ONLY_LINES=S41`). `LineSurroundings` neemt
  op de Ring ook de ingravingen mee; `Surroundings.build` kent `opts.cutHole(x)` (geen grond/groen boven de ingraving,
  gat |z| < 13,9 waar `groundAt` > 2). De villa's/standaardgevels verdwijnen zodra het pakket er staat.
- **e ⬜ — afwerking:** stationsprofielen (Ostkreuz Ringhalle, Südkreuz glasdak, Gesundbrunnen), controle Street View.

## Routeaanwijzing in de HUD (9 nov 2026) — `src/systems/RouteHud.js`
Kies je in de BVG-app een bestemming, dan staat bovenin (onder de ritbalk als die zichtbaar is) een balkje met lijn,
richting, aantal haltes en waar je uitstapt of overstapt. Rijdend: "Blijf zitten · nog N haltes", "Stap uit bij de
volgende halte", ⚠ bij de verkeerde richting (nieuwe lijnen; niet U2/U3). Aangekomen: ✓, na 8 s weg. Tik = BVG-app,
× = route stoppen. Bron: `BerlinPhoneNetz.dest` / `.plan()`. **Fix 9 nov (melding speler):** het balkje viel onder het
stationsvak linksboven → `layout()` meet alle zichtbare HUD-elementen bovenin die horizontaal overlappen en zet het balkje
eronder (`position: fixed`, z-index 30, ook bij draaien van het scherm); `BerlinRouteHud.status().top`. Console: `BerlinRouteHud.status()`, `.update()`, `.stop()`.

## Test
`tools/consolidation/s41b-test.mjs <url> <map>` (deel b–d) → **23/24** (de ene FOUT is de bedoeld geblokkeerde loop bij
Südkreuz; de controle erna is OK): treinen, vertrekbord, rit rond de naad beide kanten op, overstappen heen en terug,
borden op U2/U8, omgeving, routebalk vrij van het stationsvak, planner via de Ring. ±25 min.

`tools/consolidation/s41-test.mjs <url> <map>` (env `SKIP=1` = stations overslaan) — stations, naad, GOD, dicht trapgat,
uitgang → Street View, routebalk (perron, overstap, rijdend, aangekomen, ×), routeplanner rond de Ring.
