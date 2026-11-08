# U7 — in twee helften (Mijlpaal 4 deel 2) — ✅ volledig sinds 8 nov 2026

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

## U7b — Yorckstraße ⇄ Rathaus Spandau (8 nov 2026)
23 stations achteraan: **Yorckstraße = index 17 (x 2550) … Rathaus Spandau = index 39 (x 5850)**. Alles tunnel (OSM-wegen layer −1…−3).
U7 nu volledig: 40 stations, **5 treinen per richting**, DFI-eindpunten Rudow / Rathaus Spandau.

- Profielen: Rathaus Spandau `vault` (hoge hal); `murals` met nieuwe stijlen `siemens` (Siemensdamm, Rohrdamm: fabriekshallen + tandwielen),
  `paulstern` (Paulsternstraße: bloemenweide onder sterren) en `zitadelle` (Zitadelle: Juliusturm, baksteen). Tegelkleur per station.
- **Overstappen open:**
  - Bayerischer Platz U7 ⇄ U4 (U4-hek weg; U4-bord met donkere letters).
  - Fehrbelliner Platz U7 ⇄ U3 (U3-hek weg).
  - Bismarckstraße U7 → U2 (−z-einde U2-perron) en terug via het **blauwe U7-bord aan het −z-einde van het U2-perron Bismarckstraße** (zelfde `U7_SIGN` als op het U8-perron Hermannplatz).
- **Dicht:** Yorckstraße (S1/S2/S25/S26), Berliner Straße (U9), Wilmersdorfer Straße (Stadtbahn), Jungfernheide (Ring), Rathaus Spandau (S3/S9).
- Buurtpakketten voor de nieuwe haltes (`ONLY_LINES=U7`; Bayerischer Platz, Fehrbelliner Platz, Bismarckstraße bestonden al).

### Test U7b
`tools/consolidation/u7b-test.mjs <url> <map> [kwaliteit] [uur]` (env `SKIP=1`, `NORIDE=1`). Controleert: 40 stations, stations 17–39,
hekken Yorckstraße/Berliner Straße, U7⇄U4, U7⇄U3, U7⇄U2 (blauw bord), U7a-controle Möckernbrücke → U1, 10 treinen + DFI-eindpunt,
meerijden Altstadt Spandau → Rathaus Spandau, uitgang Rathaus Spandau → Street View.
Let op: `u7-test.mjs` verwacht nog 6 treinen (nu 10); `u3c-test`/`u4-test` verwachten nog een U7-hek.

## Bekend / later
- Treinen = HK-model (echte U7 rijdt Großprofil).
- Mehringdamm zonder kruisperron met de U6; Hermannplatz zonder de Karstadt-ingang.
