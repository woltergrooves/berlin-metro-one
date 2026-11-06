# U5 west — Hauptbahnhof ⇄ Alexanderplatz (✅ 7 nov 2026)

Eerste deel van Mijlpaal 3. 7 stations, volledig ondergronds. Bron: OSM-relatie 2227743 (U Hauptbahnhof ⇒ U Hönow).

## Wat er is
- `src/data/u5.js` — stations, kleuren, overstappen. Eigen gebied **z = −4400**, Hauptbahnhof x = 0 … Alexanderplatz x = 900. Lijnkleur #7e5330 (witte letters).
- `src/lines/U5Line.js` — `createLine` met treinen (HK, één per richting), DFI 2 regels; `transfers: U5_SIGN` (bord op het U2-perron). BootSequence laadt hem na de U4.
- **Profielen (LineWorld):** Museumsinsel `stars` = donkerblauw gewelf met sterrenhemel (Schinkels Zauberflöte-decor), lichtlijnen langs de voet; Brandenburger Tor `photos` = sepia fotostroken (Tor, Linden, 1989) tussen de naamborden. Overige stations: eigen wand-/accentkleur (Hauptbahnhof licht grijs, Bundestag beton, Unter den Linden donkerblauw, Rotes Rathaus roodbruin, Alexanderplatz groen-grijs).
- **Overstappen:**
  - U5 Alexanderplatz: trapgat met bord U2 · U8 → **keuzevenster** (U2-perron of U8-perron).
  - U2 Alexanderplatz: aan het −z-einde van het perron een **bruin U5-bord** + vloerstrook → terug naar de U5 (zoals de U1-punten op Wittenbergplatz e.d.).
  - U8 → U5: via de hal naar het U2-perron (geen eigen punt op het U8-perron: het westeinde is de trap naar de hal).
  - Hauptbahnhof (S3/S5/S7/S9), Brandenburger Tor (S1/S2/S25/S26), Unter den Linden (U6): `closed`.
  - `LineTransfers` kent nu meerdere lijnen met U2/U8-punten (`installTransfers` per lijn, eigen bord via `sign`); `toU8(14)` landt op Alexanderplatz verder op het perron (x 49), want x ≤ 43 is het hal-gebied.
- Uitgangen + Street View via LineRuntime; 6 nieuwe buurtpakketten (`ONLY_LINES=U5`), Alexanderplatz had er al een.

## Test
`tools/consolidation/u5-test.mjs <url> <map> [kwaliteit] [uur]` (env `SKIP=1` = stations/hekken overslaan, `NORIDE=1` = stoppen na de overstappen).
Resultaat: stations 7/7, hekken 2/2, overstappen 4/4 (U5→U2, U2→U5, U5→U8 na fix), treinen + DFI, meerijden Museumsinsel → Rotes Rathaus, uitgang Brandenburger Tor → Street View (13 plekken). probe3 = basislijn.
Console: `BerlinLines.U5.enter(i)`, `.board(i, dir)`, `.exit(i)`, `BerlinLines.Transfers.toU5(6)`, `.pick(i)`.

## Bekend / later
- U5 oost (Schillingstraße … Hönow, deels bovengronds) volgt; Alexanderplatz is voorlopig eindpunt.
- Treinen = HK-model (echte U5 rijdt Großprofil, breder).
- Unter den Linden: geen tweede niveau / U6-kruising zichtbaar; Hauptbahnhof niet hoger dan de rest.
- HUD-naam loopt headless een paar seconden achter (render elke 10 frames) — op het apparaat niet merkbaar.
