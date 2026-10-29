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
- **U1b — Treinen:** twee HK-treinen (beide richtingen, `TrainTimeline` zoals U8Service), instappen, meerijden,
  deuren, HUD-voortgang, vertrekborden. Ritgeluid hergebruiken.
- **U1c — Overstappen:** Wittenbergplatz (U2, zelfde perron in het echt → korte gang), Nollendorfplatz en
  Gleisdreieck (U2, trap), Kottbusser Tor (U8, trap omlaag). Overgang met korte fade; stand in de save.
- **U1d — Echte omgeving:** OSM-pakketten (`tools/g4/osm2pack.py`) voor de 8 viaductstations, met
  Oberbaumbrücke/Spree bij Warschauer Straße en Schlesisches Tor, Landwehrkanaal bij Möckernbrücke/Hallesches Tor.
  Stationsprofielen (kappen Prinzenstraße, groene hal Kottbusser Tor, Görlitzer Bahnhof).
- **U1e — Uitgangen + Street View:** trap omhoog → Street View op de echte coördinaten (`src/data/u1.js`),
  gratis embed; terugkeer naar het perron. Ontdekkingen/stamps per station; ticketautomaat.

## Bekende beperkingen U1a
- Nog geen treinen; je komt er alleen via het GOD-menu.
- Bebouwing langs het viaduct is tijdelijk en procedureel (U1d → OpenStreetMap).
- Uitgangstrap is decor (U1e).
