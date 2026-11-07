# U7 — in twee helften (Mijlpaal 4 deel 2)

Bron: OSM-relatie 2678985 (U Rudow ⇒ S+U Rathaus Spandau, 40 haltes; alle sporen tunnel, layer −1…−3) en 2678986 (andere richting).

## U7a — Rudow ⇄ Möckernbrücke (7 nov 2026)
17 stations, volledig ondergronds. **Rudow = index 0**, Möckernbrücke = index 16 (x 2400). U7b (Yorckstraße … Rathaus Spandau,
23 stations) komt **achteraan** (index 17 …, x 2550 …), zodat indexen, saves en tests niet verschuiven.

- `src/data/u7.js` — stations, kleuren, overstappen. Eigen gebied **z = −5600**, 150 m per station. Lijnkleur #528dba (witte letters).
- `src/lines/U7Line.js` — `createLine` met 3 treinen per richting (HK-model), `transfers: U7_SIGN` (blauw bord op het U8-perron Hermannplatz). BootSequence laadt hem na de U6.
- Tegelkleuren per station (Rümmler-stijl in het zuiden, Grenander bij Neukölln/Hermannplatz). Hermannplatz: profiel `vault` (de hoge hal van 1926).
- **Overstappen:**
  - Hermannplatz U7 → U8-perron (westeinde, `toU8(20)`); terug via het **blauwe U7-bord** aan het westeinde van het U8-perron.
  - Mehringdamm U7 ⇄ U6 (het hek op het U6-perron is weg).
  - Möckernbrücke U7 ⇄ U1/U3 (nieuw trapgat op het U1-viaduct, `U1_TRANSFERS.moeckernbruecke`).
  - Dicht (hek): Neukölln (S-Ring).
  - U3 Fehrbelliner Platz en U4 Bayerischer Platz blijven dicht tot U7b (bordkleur nu #528dba).
- 14 nieuwe buurtpakketten (`ONLY_LINES=U7`; Hermannplatz, Mehringdamm, Möckernbrücke bestonden al) → 138 haltes. `osm2places.py` leest nu ook U7.

## Test
`tools/consolidation/u7-test.mjs <url> <map> [kwaliteit] [uur]` (env `SKIP=1`, `NORIDE=1`).
Controleert: stations 17/17, hek S Neukölln, overstappen 6/6 (U7⇄U6, U7⇄U1, U7⇄U8), 6 treinen + DFI, meerijden Rathaus Neukölln → Hermannplatz, uitgang Rathaus Neukölln → Street View.
Console: `BerlinLines.U7.enter(i)`, `.board(i, dir)`, `.exit(i)`, `BerlinLines.Transfers.toU7(i)`, `.toLine('U7', id)`.
Let op: `u6-test.mjs` verwacht op Mehringdamm nog een hek (U7) → verouderd voor dat onderdeel.

## U7b — Yorckstraße ⇄ Rathaus Spandau (volgt)
Yorckstraße (S1/S2), Kleistpark, Eisenacher Straße, Bayerischer Platz (U4), Berliner Straße (U9), Blissestraße, Fehrbelliner Platz (U3),
Konstanzer Straße, Adenauerplatz, Wilmersdorfer Straße (S), Bismarckstraße (U2), Richard-Wagner-Platz, Mierendorffplatz, Jungfernheide (S),
Jakob-Kaiser-Platz, Halemweg, Siemensdamm, Rohrdamm, Paulsternstraße, Haselhorst, Zitadelle, Altstadt Spandau, Rathaus Spandau (S).
Openen: U4 Bayerischer Platz, U3 Fehrbelliner Platz, U2 Bismarckstraße (bord op het U2-perron).

## Bekend / later
- Treinen = HK-model (echte U7 rijdt Großprofil).
- Mehringdamm zonder kruisperron met de U6; Hermannplatz zonder de Karstadt-ingang.
