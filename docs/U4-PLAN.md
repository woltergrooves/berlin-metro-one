# U4 — Nollendorfplatz ⇄ Innsbrucker Platz (✅ 31 okt 2026)

Kortste lijn van Berlijn, 5 stations, volledig ondergronds. Bron: OSM-relatie 2676945.

## Wat er is
- `src/data/u4.js` — stations, kleuren, overstappen. Eigen gebied **z = −3800**, Nollendorfplatz x = 0 … Innsbrucker Platz x = 600.
  Lijnkleur #ffd900 met **zwarte letters** (`textColor`) — HUD, GOD-blok, DFI, treinbord, overstapbord en StreetScreen-badge volgen dat.
- `src/lines/U4Line.js` — `createLine` met treinen (2 eenheden HK, één per richting), DFI 2 regels. Geladen in BootSequence na de U3.
- **Rathaus Schöneberg:** profiel `park` (LineWorld `parkWindowTex`) — grote ramen met groene roeden naar het Rudolph-Wilde-Park, aan beide kanten.
- **Overstappen:**
  - U4 Nollendorfplatz: trapgat met bord U1 · U3 · U2 → **keuzevenster** (U1/U3-perron of U2).
  - U1 Nollendorfplatz: het bestaande trapgat heeft nu bord U2 · U4 → keuzevenster (U2 of U4).
  - Bayerischer Platz (U7) en Innsbrucker Platz (S41/S42/S46): trapgat + echt bord, `closed` (hek).
  - Mechaniek: `transfer.options` in de lijndata → `LineTransfers.fromLine` toont het keuzevenster (`choose`); `toLine(lijn, station)` = naar het perron van een andere nieuwe lijn. Venster sluit als je >5 m wegloopt.
- Uitgangen + Street View: werkt via LineRuntime; 4 nieuwe buurtpakketten (`ONLY_LINES=U4`), Nollendorfplatz had er al een.

## Test
`tools/consolidation/u4-test.mjs <url> <map> [kwaliteit] [uur]` (env `SKIP=1` slaat stations/hekken over).
Resultaat: stations 5/5, hekken 2/2, overstappen 5/5, treinen+DFI, uitgang → Street View (Viktoria-Luise-Platz, 11 plekken).
Meerijden Rathaus Schöneberg → Innsbrucker Platz komt aan (screenshot), maar headless pas na ±15 min — de check zelf viel net buiten de tijd.
Console: `BerlinLines.U4.enter(i)`, `.board(i, dir)`, `.exit(i)`, `BerlinLines.Transfers.pick(i)`.

## Bekend / later
- Wandkleuren per station geschat (herkenbaar, niet 1:1). Rathaus Schöneberg: de ramen zijn een geschilderd park, geen 3D-omgeving.
- Het groene U1/U3-bord op het U2-perron Nollendorfplatz noemt de U4 nog niet (U4 bereik je via het U1-perron).
- `u1-transfer.mjs` verwacht op Nollendorfplatz (index 3) een directe sprong; daar komt nu het keuzevenster.
