# U6 — Alt-Mariendorf ⇄ Kurt-Schumacher-Platz (✅ 7 nov 2026, Mijlpaal 4 deel 1)

24 stations, volledig ondergronds. Bron: OSM-relatie 2679164 (U Alt-Tegel ⇒ U Alt-Mariendorf; alle sporen tunnel, layer −1…−3).

## Waarom niet tot Alt-Tegel
Het noordstuk Kurt-Schumacher-Platz ⇄ Alt-Tegel (Scharnweberstraße, Otisstraße, Holzhauser Straße, Borsigwerke, Alt-Tegel) is in werkelijkheid
gesloten voor een grote renovatie (OSM: `railway=construction`; heropening volgens de BVG in de zomer van 2027). In het spel eindigt de U6
daarom voorlopig, net als in het echt, op Kurt-Schumacher-Platz. Alt-Mariendorf = index 0, dus het noordstuk kan later **achteraan**
(index 24 …, x 3600 …) worden toegevoegd zonder bestaande indexen, saves of tests te verschuiven.

## Wat er is
- `src/data/u6.js` — stations, kleuren, overstappen. Eigen gebied **z = −5000**, Alt-Mariendorf x = 0 … Kurt-Schumacher-Platz x = 3450 (150 m per station). Lijnkleur #8c6dab (witte letters).
- `src/lines/U6Line.js` — `createLine` met 3 treinen per richting (HK-model), `transfers: U6_SIGN` (lila bord op het U2-perron Stadtmitte). BootSequence laadt hem na de U5.
- Elke Grenander-station een eigen tegelkleur; Oranienburger Tor en Reinickendorfer Straße met zijperrons.
- **Wandbeelden** (LineWorld `muralTex`, profiel `murals`): Kochstraße/Checkpoint Charlie `checkpoint` (wachthuisje, sectorbord, muur met wachttoren), Platz der Luftbrücke `luftbruecke` ("Rosinenbomber" boven het vliegveld Tempelhof).
- **Overstappen:**
  - Unter den Linden U6 ⇄ U5 (het gesloten trapgat op het U5-perron is nu open).
  - Stadtmitte U6 → U2-perron (−z-einde); terug via het **lila U6-bord** aan het −z-einde van het U2-perron Stadtmitte.
  - Hallesches Tor U6 ⇄ U1/U3 (nieuw trapgat op het U1-viaductperron, `U1_TRANSFERS['hallesches-tor']`).
  - Dicht (hek): Friedrichstraße (S), Tempelhof (Ring), Wedding (Ring), Mehringdamm (U7), Leopoldplatz (U9).
- **Fix:** het overstapbord-materiaal in `LineWorld` heette `Line_Transfer_<lijn>` → twee S-overstappen op één lijn deelden één textuur (U5 Brandenburger Tor toonde het bord van Hauptbahnhof). Nu per station.
- 21 nieuwe buurtpakketten (`ONLY_LINES=U6`; Stadtmitte, Hallesches Tor en Unter den Linden bestonden al) → 124 haltes.

## Test
`tools/consolidation/u6-test.mjs <url> <map> [kwaliteit] [uur]` (env `SKIP=1` = stations/hek overslaan, `NORIDE=1` = stoppen na de overstappen).
Controleert: stations 24/24, wandbeelden, hek U7, overstappen 6/6 (U6⇄U5, U6⇄U2, U6⇄U1), 6 treinen + DFI, meerijden Kochstraße → Stadtmitte, uitgang Platz der Luftbrücke → Street View.
Console: `BerlinLines.U6.enter(i)`, `.board(i, dir)`, `.exit(i)`, `BerlinLines.Transfers.toU6(i)`, `.toLine('U6', id)`.

## Bekend / later
- Noordstuk tot Alt-Tegel (zie boven), Scharnweberstraße bovengronds.
- Treinen = HK-model (echte U6 rijdt Großprofil).
- Stadtmitte: geen "Mäusetunnel"; Mehringdamm: geen kruisperron met de U7 (komt met de U7).
- Unter den Linden: geen tweede niveau zichtbaar (U5 en U6 liggen in eigen gebieden).
