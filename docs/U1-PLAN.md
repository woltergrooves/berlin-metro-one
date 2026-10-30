# Mijlpaal 1 — U1 volledig (plan en stand)

U1: Uhlandstraße ⇄ Warschauer Straße, 13 stations. Uhlandstraße t/m Kurfürstenstraße ondergronds,
vanaf Gleisdreieck (bovenste niveau) over het Hochbahn-viaduct tot Warschauer Straße. Kleinprofil (HK-treinen,
zelfde model als de U2). Bronnen: OSM-relatie 2669206 (haltes), urbanrail.net, Wikipedia.

## Architectuur (nieuw, herbruikbaar voor U3/U5/U6/U7)

| Bestand | Eigenaar van |
|---|---|
| `src/data/u1.js` | lijngegevens: volgorde, echte coördinaten, ligging (tunnel/viaduct), perronvorm, hoogte, overstappen, kleuren |
| `src/lines/LineWorld.js` | generieke bouw + streaming van een lijn: stations, tunnel-/viaductstukken, tunnelmond, straat eronder |
| `src/lines/U1Line.js` | U1-runtime: betreden/verlaten, lopen op het perron, HUD, GOD-menu, hemel boven het viaduct |

Keuzes:
- **Eigen gebied:** de U1 ligt langs de x-as op z = −2600 (U2: x≈0, z −1080…3960; U8: z≈49). Verder dan de
  camera ver (390 m) → stations van andere lijnen zijn nooit zichtbaar. Overstappen gaan via een overgang
  (trap/gang + korte overgang), niet via gedeelde geometrie.
- **Spelafstand** 150 m tussen stations (echt ±720 m). Perron 72 m (±36).
- **Spelerstoestand:** `player.__line = 'U1'`, `player.__lineStation`, `player.__lineOpenAir`. De oude U2-beweging
  wordt dan overgeslagen; RenderBase kiest `openair`/`ondergronds` op basis van `__lineOpenAir`.
- **Streaming:** station ±1 en de stukken ertussen; max. één bouwstap per frame; alles per materiaal samengevoegd.
  Na 20 s niet op de lijn wordt alles opgeruimd.
- Groepen dragen `userData.line = 'U1'`.

## Stappen

- **U1a — Lijnwereld + stations ✅** (deze stap): alle 13 stations begaanbaar via GOD-menu (blok "U1"),
  tunnelstations (tegelwand in stationskleur, naamborden, zuilen bij middenperron), viaductstations (perronkap,
  glasleuning, stalen viaduct, straat met gevels en bomen eronder), tunnelmond tussen Kurfürstenstraße en
  Gleisdreieck, hemel dag/nacht. Status: `BerlinLines.U1.status()`. Test: `tools/consolidation/u1-shots.mjs`.
- **U1b — Treinen ✅:** `src/lines/LineTrains.js` (herbruikbaar): `LineTrain` = `TrainTimeline` (zelfde dienst als
  U2/U8) + het Blender-HK-model van de U2 (`BerlinBlenderTrains.load('U2')`), twee gekoppelde eenheden (50 m),
  elke eenheid volgt het spoor (ook de S-bocht middenperron ↔ zijperrons); bak 0,85× zo breed zodat hij tussen
  perronrand en tweede spoor past. Middenperron-sporen naar ±5,15 m; viaduct breder naast een middenperron.
  Deuren openen alleen aan de perronkant. Instappen = door een open deur de trein in lopen; meerijden = lopen
  in de trein; uitstappen = bij een open deur het perron op. HUD: vertrektijden op het perron, voortgangsbalk
  + "Nächster Halt" in de trein. DFI-vertrekbord boven elk perron. Ritgeluid + waarschuwingssignaal.
  Twee treinen (één per richting) die zich, net als bij de U8, bij een wachtende speler in de buurt houden.
  Test: `tools/consolidation/u1-trains.mjs`. Console: `BerlinLines.U1.board(i, dir)`, `.status().trains`.
- **U1c — Overstappen ✅:** `src/lines/LineTransfers.js` (herbruikbaar). Op het U1-perron een overstaptrapgat bij
  x = −19 (`TRANSFER_X`, gespiegeld aan de uitgang) met blauwe "Übergang"-borden in de doellijnkleur; erin lopen =
  korte fade → perron van de andere lijn. U2 (Wittenbergplatz, Nollendorfplatz, Gleisdreieck): overstappunt aan het
  −z-einde van het U2-perron (de Street View-uitgang zit aan +z), groen U1-bord + groene vloerstrook. U8 (Kottbusser
  Tor): westeinde van het perron (uitgang = oosteinde). Op U2/U8 werkt het op positie (perroneinde + duwen ±0,2 s),
  los van de volgorde van de oude bewegingswrappers. Stand in de save: sectie `location` in `berlin-state-v2`
  (`{line:'U1', station}`); na laden zet de U1 je na 2,5 s terug op dat perron. HUD-hint op overstapstations.
  Test: `tools/consolidation/u1-transfer.mjs <url> <map> [kwaliteit] [uur]` (env `ONLY=2,3,5,9`, `TRACE=1`;
  headless loopt ±10× te traag → wandelingen tot 90 s). Console: `BerlinLines.Transfers.status()`, `.toU1(i)`,
  `.toU2(id)`, `.toU8(18)`, `.flags()`.
- **U1d — Echte omgeving:** OSM-pakketten (`tools/g4/osm2pack.py`) voor de 8 viaductstations, met
  Oberbaumbrücke/Spree bij Warschauer Straße en Schlesisches Tor, Landwehrkanaal bij Möckernbrücke/Hallesches Tor.
  Stationsprofielen (kappen Prinzenstraße, groene hal Kottbusser Tor, Görlitzer Bahnhof).
- **U1e — Uitgangen + Street View ✅:** de uitgangstrap (x = 18, open kant richting Warschauer Straße) erin lopen
  → Street View (gratis embed) op de echte haltecoördinaten uit `src/data/u1.js`; '← U-Bahn' zet je boven aan de trap
  terug op het perron (`returnKind: 'line'` + `onReturn` in `StreetCoreClean`). Buiten: nieuw `src/street/StreetScreen.js`
  (geldt voor álle U1/U2/U8-uitgangen): HUD, buurtkaart, echte plekken uit OSM (`public/assets/places/`), kopen, Pfand,
  Berlin Stamps, uitgaan, verhalen. Betaalde Maps API standaard uit. Test: `tools/consolidation/u1e-test.mjs`.

## Bekende beperkingen (na U1c)
- Overstap is een sprong met fade (eigen gebied); geen doorlopende gang/trap.
- Treinen op U2/U8 gaan door het overstapeinde heen: het bord hangt boven het perroneinde, niet in een eigen hal.
- Eén trein per richting (zoals de U8); geen echte 5-minutendienst over de hele lijn.
- Bebouwing langs het viaduct is tijdelijk en procedureel (U1d → OpenStreetMap).
- Uitgang = sprong naar Street View vanaf de trap (geen 3D-trap naar straatniveau).
