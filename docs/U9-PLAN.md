# U9 — Osloer Straße ⇄ Rathaus Steglitz (✅ 8 nov 2026)

Bron: OSM-relatie 2679016 (terug: 2679017). 18 stations, alles tunnel (layer −1/−2/−3).

## Opbouw
- `src/data/u9.js`: eigen gebied **z = −6200**, 150 m per station: Osloer Straße x = 0 … Rathaus Steglitz x = 2550 (index 17). Lijnkleur #f3791d.
- `src/lines/U9Line.js` = `createLine` met 3 treinen per richting, `transfers: U9_SIGN`. DFI-eindpunten Osloer Straße / Rathaus Steglitz.
- Wandbeelden (`muralTex` in LineWorld): **`westhafen`** (haven, kranen, pakhuis), **`hansa`** (Hansaviertel/Interbau 1957, mozaïek + hoogbouw), **`zoo`** (Elefantentor, dieren). Tegelkleur per station; Schloßstraße fel oranje.

## Overstappen
| U9-station | naar | terug |
|---|---|---|
| Osloer Straße (0) | U8 (`toU8(7)`, westeinde) | oranje U9-bord westeinde U8-perron |
| Leopoldplatz (2) | U6 | U6-trapgat (was dicht) |
| Zoologischer Garten (8) | U2 | oranje U9-bord −z-einde U2-perron |
| Kurfürstendamm (9) | U1 | nieuw U1-trapgat (`U1_TRANSFERS.kurfuerstendamm`) |
| Spichernstraße (10) | U3 | U3-trapgat (was dicht) |
| Berliner Straße (12) | U7 | U7-trapgat (was dicht) |

Dicht: Westhafen (S41/S42), Bundesplatz (S41/S42/S46), Rathaus Steglitz (S1).

## Buurtpakketten
12 nieuw (`ONLY_LINES=U9`) → 171 haltes.

## GOD-menu (zelfde dag)
`src/lines/GodTeleport.js` = enige eigenaar van het teleportdeel: lijnchips U1–U9, lijst per lijn (overstapbadges, 📍 huidige halte), zoeken over alle lijnen, kopje Tools. `LineRuntime.installGod` maakt geen eigen blok meer; de API geeft `godStations`. Console: `BerlinGodTeleport.status()`, `.teleport('U9', 7)`.

## Tests
- `tools/consolidation/u9-test.mjs <url> <map>` (env `NORIDE=1` / `SKIP=1`) → 35/35 en 19/19.
- `tools/consolidation/god-tp-test.mjs <url> <map> [toestel]` → 9/9.

## Bekend
- Treinen HK-model (echt: Großprofil); Leopoldplatz/Zoo/Osloer Straße zonder zichtbaar tweede niveau; Schloßstraße zonder het voorbereide U10-niveau.
