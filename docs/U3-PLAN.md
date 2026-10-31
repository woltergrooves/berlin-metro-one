# Mijlpaal 2 — U3 (plan en stand)

U3: Krumme Lanke ⇄ Warschauer Straße, 24 haltes. Bron: OSM-relatie 2669208 (haltes, `tunnel`/`cutting`-tags).
- **Eigen tak (13):** Krumme Lanke, Onkel Toms Hütte, Oskar-Helene-Heim, Freie Universität (Thielplatz), Dahlem-Dorf,
  Podbielskiallee — **open ingraving** (cutting, villawijk); Breitenbachplatz, Rüdesheimer Platz, Heidelberger Platz,
  Fehrbelliner Platz, Hohenzollernplatz, Spichernstraße, Augsburger Straße — **tunnel**.
- **Gedeeld met de U1 (11):** Wittenbergplatz … Warschauer Straße (bestaan al, `src/data/u1.js`).

## Architectuur

| Bestand | Eigenaar van |
|---|---|
| `src/data/u3.js` | U3-gegevens: `U3_STATIONS` (eigen tak + kopie Wittenbergplatz voor het uiterlijk), `U3_BRANCH` (begaanbaar), `U3_ROUTE` (24 haltes, voor de treinen in U3b), profielen |
| `src/lines/LineRuntime.js` | **nieuw, gedeeld:** `createLine({line, stations, godStations, withTrains, transfers, surroundings})` = lopen, meerijden, HUD, GOD-blok, hemel, audio, uitgang, save. Was `U1Line.js` (U1a–U1e) |
| `src/lines/U1Line.js` / `U3Line.js` | alleen de instellingen per lijn (+ `BerlinLines.U1` / `.U3`) |
| `src/lines/LineWorld.js` | nu ook ligging **`cutting`**: keerwanden (natuursteen), hekwerk, talud met gras/bomen/villa's, perronkappen, straatbrug over de ingraving met **trap omhoog** (open kant −x), tunnelportaal tussen ingraving en tunnel; profiel **`vault`** (tongewelf + ribben + kroonluchters) |

Keuzes:
- **Eigen gebied:** U3-tak op z = −3200 (U1: −2600), zelfde x-raster: Augsburger Straße x = 150, Wittenbergplatz x = 300
  (gelijk aan de U1), Krumme Lanke x = −1650.
- **Gedeeld spoor (U3b):** een U3-trein rijdt in het U3-gebied tot het midden van de tunnel Augsburger Straße →
  Wittenbergplatz (x ≈ 225) en gaat daar over naar dezelfde x in het U1-gebied (alleen z verandert; tunnelstukken
  zien er gelijk uit). Daarna rijdt hij over het U1-spoor met U3-borden. Spelers op de U1-perrons zien hem gewoon
  binnenkomen uit de tunnel. Het U3-gebied bouwt daarom een kopie van Wittenbergplatz (`shared: true`, niet begaanbaar).
- **Opslag:** sectie `location` = `{line:'U3', station}`; één gedeelde sleutel `__berlinLineSaved` voorkomt dat een
  lijnwissel niet wordt opgeslagen.
- **Ingraving** telt als open lucht (`__lineOpenAir`, hemel + `openair` in RenderBase).
- Profielen: Krumme Lanke (eindpunt, stationsgebouw dwars over het einde, stootjukken), Onkel Toms Hütte (zijperrons +
  winkelpuien "Ladenstraße"), Dahlem-Dorf (vakwerkgebouw met rieten dak), Heidelberger Platz (gewelf).

## Stappen

- **U3a — Data + eigen tak + uitgangen ✅ (deze stap):** 13 stations via GOD-menu (blok "U3"), ingraving/tunnel/gewelf,
  uitgangen → Street View met buurtpakketten (`ONLY_LINES=U3 python3 -I tools/places/osm2places.py fetch|build <repo> <cache>`).
  Test: `tools/consolidation/u3-shots.mjs <url> <map> [kwaliteit] [index,…] [yaw,…] [uur] [dx]`.
  Console: `BerlinLines.U3.enter(i)`, `.status()`, `.exit(i)`, `.leave()`.
- **U3b — Treinen ✅:** U3-treinen (HK, lijnkleur groen) over `U3_ROUTE` (24 haltes), één per richting zoals de U1.
  - **Zones** (`U3Line.js`): elke `LineTrain` kent de lijnwerelden waar hij doorheen rijdt. U3: eigen gebied tot
    `U3_SPLIT_X` = 262, daarna het U1-gebied. Op x = 262 liggen beide sporen recht op middenperron-ligging (de S-bocht
    bij Kurfürstendamm eindigt op 237) → de meerijder merkt de wissel niet (getest: dwarspositie gelijk).
    Gezien wordt de trein in de U3-wereld tot x = 360, in de U1-wereld vanaf x = 236 (voorbij het perron van
    Kurfürstendamm, dus nooit door een U1-station dat de U3 niet bedient).
  - **Overname meerijder:** rijdt de trein een andere zone in, dan neemt die lijn de speler over (`api.adopt`,
    `player.__line` wisselt). De andere lijnwereld wordt vanaf 170 m vooraf opgebouwd (`LineWorld.warm`).
  - **Gedeelde registers** in `LineTrains.js`: `ALL_TRAINS`, `WORLDS[lijn]`. Elke runtime werkt met
    `relevant()` = eigen treinen + gasten die door zijn wereld rijden; alleen de actieve lijn beweegt treinen.
  - **Blokbeveiliging:** `blocked()` laat een trein wachten als er vóór hem op hetzelfde spoor een trein binnen
    één treinlengte staat; `trackClear()` voorkomt dat het terugzetten naar de wachtende speler op een bezette plek gebeurt.
    Gasten (U3 op de U1) komen ±20 s na de eigen trein.
  - **DFI:** `DepartureBoards(line, root, rows)` toont per lijn+richting de eerstvolgende; U1-borden 4 regels
    (U1 + U3), U3-borden 2. HUD: "U3 Warschauer Straße nu · U1 …".
  - Test: `tools/consolidation/u3-trains.mjs <url> <map> [kwaliteit] [uur]` (Dahlem-Dorf instappen → Podbielskiallee,
    Augsburger Straße → overgang → Wittenbergplatz U1-perron, U3 terug naar Augsburger Straße, Kottbusser Tor, geen overlap).
  - Console: `BerlinLines.U3.board(i, dir)`, `.status().trains` (view/track per trein), `BerlinLines.U1.status().dfi`.
- **U3c — Overstappen + afwerking:** U3 ⇄ U1/U2 bij Wittenbergplatz/Nollendorfplatz (gedeeld perron), borden voor U7
  (Fehrbelliner Platz), U9 (Spichernstraße), Ring (Heidelberger Platz); eventueel OSM-omgeving voor de ingravingen.

## Bekend
- Perronvormen deels geschat (eiland, behalve Onkel Toms Hütte); wandkleuren herkenbaar bedoeld, niet 1:1.
- Bebouwing boven de ingraving is procedureel (villa's, bomen), nog geen OSM-pakket.
- Fehrbelliner Platz' rood-oranje hal hoort bij de U7; hier alleen de accentkleur.
