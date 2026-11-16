# Nord-Süd-Bahn S1/S2/S25/S26 — plan and status

Roadmap 3.0, Phase 45, work plan C. Built 16 Nov 2026 (parts a, b and c in one go).

## The line in the game

- `src/data/s2.js` (OSM relation 2269237, S2 Bernau ⇒ Blankenfelde): **10 stations Gesundbrunnen ⇄ Südkreuz**.
  Line world id **`S2`** (colour #007734), `sbahn: true`, **own area z = −8000**, Gesundbrunnen x = 0 … Südkreuz x = 1350,
  +x = southbound (Blankenfelde / Teltow Stadt), −x = northbound (Bernau / Hennigsdorf / Blankenburg).
- Position: Gesundbrunnen and Humboldthain `cutting` (open cutting, Plattenbau above until the OSM packs come),
  Nordbahnhof … Anhalter Bahnhof `tunnel` (island platform, 1930s tiles with a colour band per station),
  Yorckstraße `viaduct` + `embank` (the embankment above the Yorckstraße bridges), Südkreuz `cutting` (lower level under the Ring).
- Nordbahnhof: profile `photos` (sepia photos — the small exhibition about the ghost stations).
- `src/lines/S2Line.js` = `createLine` with BR 481 (`sbahnTemplate`): S2 2 trains per direction, **S25 and S26 as guests**
  (`S2_GUESTS`, real termini on the train, departure board and HUD). Departure board 4 rows.
- Exits + Street View: fixed street points for the open-air stations (`S_EXITS`: Behmstraße, Wiesenstraße, Yorckstraße,
  General-Pape-Straße); tunnel stations use the station coordinates. 4 new neighbourhood packs (Humboldthain, Nordbahnhof,
  Oranienburger Straße, Anhalter Bahnhof) → **196 stops** (`osm2places.py` reads S2).
- GOD chip S2, BVG app ("Nord-Süd · S2 · S25 · S26"), StreetScreen colour, HUD texts for the tunnel and the cuttings.

## Transfers (part c)

| S2 station | to | back |
|---|---|---|
| Gesundbrunnen | choice Ring / U8 | Ring: choice U8 / Nord-Süd · U8: green S sign at the west end (stacked above the Ring sign → choice) |
| Friedrichstraße | choice Stadtbahn / U6 | Stadtbahn: choice U6 / Nord-Süd · U6: choice Stadtbahn / Nord-Süd |
| Brandenburger Tor | U5 | U5 stairwell (`to: 'S2'`) |
| Potsdamer Platz | U2 | green S sign at the −z end of the U2 platform (`S2_SIGN`) |
| Yorckstraße | U7 | U7 stairwell |
| Südkreuz | Ring | Ring stairwell (was closed) |

Still closed: Ring Schöneberg and U9 Rathaus Steglitz (both S1). Console: `BerlinLines.S2.enter(i)`, `.board(i, dir)`,
`.simulate(sec)`, `.exit(i)`, `BerlinLines.Transfers.toS2(i)`.

## Test

`tools/consolidation/s2-test.mjs <url> <outDir>` — stations, trains, departure board, riding, all transfers both ways,
route planner, GOD menu.

## Next (later chats)

- **S1 branch**: Anhalter Bahnhof → Yorckstraße (Großgörschenstraße) → Julius-Leber-Brücke → Schöneberg (Ring) →
  … Rathaus Steglitz (U9) → Wannsee, like the U3 on the U1 (own area, trains change over in the tunnel south of Anhalter Bahnhof).
  North of Gesundbrunnen: Bornholmer Straße.
- **Part d**: OSM surroundings for the cuttings and the Yorckstraße embankment (`osm2pack.py` list `S2`, `cutHole`).
- **Ghost stations in Berlin Knowledge**: story at Nordbahnhof, Oranienburger Straße, Brandenburger Tor and Potsdamer Platz.
- Station profiles: Friedrichstraße (deep tunnel, border crossing "Tränenpalast"), Potsdamer Platz (restored 1939 hall).
