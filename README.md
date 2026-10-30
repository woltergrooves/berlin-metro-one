# Berlin Life (voorheen Berlin Metro)

First-person 3D-simulatie van Berlijn: reizen met U2, U8 en (nieuw) U1, stations verkennen, via Street View
naar buiten, werken, geld verdienen en een eigen leven opbouwen. Gebouwd met Three.js, bedoeld
voor iPhone en iPad (touchbediening).

Live: **https://berlin-metro-one.vercel.app** · roadmap: `docs/ROADMAP.md` (Roadmap 3.0).

Deze repository is de **enige broncodebasis**. Alle code en assets staan hier met lokale imports;
er wordt niets meer geladen van oude `berlin-metro-*.vercel.app`-adressen.

## Stand (oktober 2026)

| Onderdeel | Status |
|-----------|--------|
| Fase 1 — technische opschoning | ✅ centrale state, één save-formaat (`berlin-state-v2`), één portemonnee, één klok, één `BootSequence.js`, één `Tick` |
| Mijlpaal 0 — graphics (G1–G4) | ✅ prestaties, rendering-basis, materialen, stationsprofielen (53 U2/U8-stations), 3D-omgeving buitenstations · audio nog open |
| U1 (Mijlpaal 1) | ✅ U1a lijn + 13 stations · ✅ U1b treinen · ✅ U1c overstappen (Wittenbergplatz, Nollendorfplatz, Gleisdreieck, Kottbusser Tor) · ✅ U1d omgeving · ✅ U1e uitgangen/Street View |
| Alexanderplatz | ✅ trap U2 → Verteilerebene, hal, gang en trap naar de U8 en de uitgang opnieuw gebouwd (`AlexanderHub.js`) |

## Snel starten

```bash
npm install
npm run dev        # lokale ontwikkelserver
npm run build      # productiebuild in dist/
npm run preview    # build lokaal bekijken
npm run check:no-legacy-urls   # faalt als er nog een oude deployment-URL in de code staat
```

Vereist: Node.js 20 of nieuwer.

### Deployen op Vercel

Vercel-project `berlin-metro-one` (team wolter1), werkbranch `fase-1`. Vite-project: build `npm run build`,
output `dist`, geen environment-variabelen.

Afgeronde stappen gaan **direct naar productie** (geen previews; terugdraaien via een rollback in Vercel):

1. pushen naar `fase-1` en de build afwachten;
2. die build naar productie zetten (`target: production`);
3. **de hoofdlink controleren:** `berlin-metro-one.vercel.app` is handmatig vastgezet en schuift niet vanzelf mee.
   Zo nodig de alias opnieuw toewijzen aan de nieuwe deployment;
4. met `curl` controleren dat de hoofdlink de nieuwe code serveert.

## Projectstructuur

```
index.html              ← HTML-schil (boot-scherm, HUD, touchzones)
src/
  main.js               ← ingang van de game
  boot/BootSequence.js  ← de enige opstartvolgorde (vervangt de oude keten van 49 modules)
  state/                ← centrale state en de "eigenaars": Store, Tick, RenderBase, MaterialBase,
                          StationProfiles, Surroundings, SceneCache
  core/                 ← Game, PlayerController, InputController, motion
  world/                ← stations, treinen, WorldStreamer, Alexanderplatz (AlexanderHub)
  lines/                ← nieuwe metrolijnen: LineWorld, LineTrains, LineTransfers, U1Line
  data/                 ← lijngegevens (U2, U1 uit OpenStreetMap)
  systems/              ← gameplay-systemen (U8, Street View, economie, gesprekken, telefoon, saves, …)
  ui/                   ← HUD
  vendor/               ← meegeleverde Three.js-hulpmodules (GLTFLoader, BufferGeometryUtils e.a.)
  styles/styles.css
public/assets/
  stations/             ← 53 Blender-stationsmodellen (.glb.gz) + stations.json
  trains/               ← BVG-treinen (HK voor U2/U1, H voor U8)
  actors/, props/       ← NPC's en stationsmeubilair
  surroundings/         ← OSM-pakketten voor de omgeving van bovengrondse stations
docs/                   ← ROADMAP, FASE-1-PLAN, U1-PLAN, TESTRAPPORT, herkomst (provenance.json)
reference/              ← bevroren referentie: de originele JS uit de oude deployments
tools/consolidation/    ← testscripts (Playwright) en de lokale devserver
tools/g4/osm2pack.py    ← maakt omgevingspakketten uit OpenStreetMap
```

## Wie is eigenaar van wat

Nieuwe code hoort bij één eigenaar; oude patches worden niet uitgebreid.

| Onderwerp | Bestand |
|-----------|---------|
| lichten, tone mapping, mist, hemel, kwaliteit laag/midden/hoog | `src/state/RenderBase.js` |
| materialen, stationstexturen | `src/state/MaterialBase.js` |
| uiterlijk per U2/U8-station | `src/state/StationProfiles.js` |
| 3D-omgeving buitenstations U2 | `src/state/Surroundings.js` |
| Alexanderplatz: trap, Verteilerebene, gang en trap naar de U8, uitgang | `src/world/AlexanderHub.js` |
| nieuwe lijnen | `src/lines/` + `src/data/<lijn>.js` |
| overstappen tussen lijnen | `src/lines/LineTransfers.js` |
| spelerslocatie in de save | Store-sectie `location` |
| alles boven Street View: HUD, buurt (kaart + echte plekken), kopen, Pfand, stempels, uitgaan, verhalen | `src/street/StreetScreen.js` (stand: Store-sectie `street`; plekken: `public/assets/places/`, gemaakt met `tools/places/osm2places.py`) |
| Street View zelf (iframe, coördinaten, terugkeer) | `src/systems/StreetCoreClean.js` (`game.__allStreetOverlay`) |
| timers en frame-hooks | `src/state/Tick.js` (geen eigen `setInterval`/`requestAnimationFrame`) |

### Alexanderplatz (`AlexanderHub.js`)

Vervangt het uiterlijk van vijf oude lagen (AlexanderConcourse, AlexanderplatzUpgrade, U8Alexanderplatz,
AlexanderTransitionFix, AlexanderTransferOverlay). Die blijven geladen omdat lopen, de U8-hal en de
U8-trein eraan hangen, maar alles wat ze in de trap, de hal, de gang en de trap naar de U8 neerzetten
wordt verborgen en opnieuw gebouwd:

- U2-kant crème tegels met rood, U8-gang groene tegels (zelfde kleuren als de stationsprofielen);
  terrazzovloer, plafondpanelen, TL-lijnen, glazen balustrade rond het trapgat, winkels en kaartautomaten;
- één BVG-bordenset uit één textuur-atlas, hoog onder het plafond (niet meer midden in de doorgang);
- een echte uitgangstrap naar het plein met daglicht, U-Bahn-paal en de Fernsehturm (dag/nacht);
  bovenaan de hal opent Street View zoals voorheen;
- trappen hebben echte treden; de loophoogte in `PlayerConcoursePatch` is lineair en loopt gelijk met de treden;
- alles per materiaal samengevoegd: weinig draw calls voor het hele gebied.

Console: `BerlinAlexHub.status()`, `BerlinAlexHub.showOld(true)` (oud tonen om te vergelijken).
Test: `tools/consolidation/alex-shots.mjs <url> <map> [kwaliteit] [uur] [blikken]`.

## Testen

De testscripts in `tools/consolidation/` draaien de game headless (Playwright, iPad-formaat):

| Script | Wat |
|--------|-----|
| `probe3.mjs` | regressierun over de hele game (draai met `QUALITY=laag`) |
| `alex-shots.mjs` | Alexanderplatz: blikken langs trap, hal, gang, U8 en uitgang + loopproef |
| `u1-shots.mjs`, `u1-trains.mjs`, `u1-transfer.mjs` | U1: stations, treinen, overstappen |
| `u8-sight.mjs` | U8: alleen het eigen station zichtbaar |
| `g2-shots.mjs`, `g3b-shots.mjs`, `g4-shots.mjs` | graphics-stappen |

Lokale server zonder npm: `node tools/consolidation/devserve.mjs <repo> <three.js-map> 4180`.
Praktijktests op iPhone/iPad horen bij iedere release.

## Externe diensten

| Dienst | Waarvoor |
|--------|----------|
| `three` (npm, 0.186.1) | 3D-engine |
| Google Street View (embed, gratis) | buitenwereld |
| Google Maps JavaScript API (betaald) | programmeerbare Street View — alleen bewust aanzetten (nul-kostenwens) |
| v6.bvg.transport.rest | BVG-dienstregelinggegevens |
| nominatim.openstreetmap.org, OpenStreetMap | locaties, lijn- en omgevingsdata |
| Wikimedia Commons, freesound.org | enkele geluiden/afbeeldingen |

**Google Maps API-sleutel.** `src/systems/ProgrammableStreetViewV2.js` bevat een browsersleutel. Beperk hem
in Google Cloud Console tot de eigen domeinen (*HTTP referrers*: `berlin-metro-one.vercel.app/*`,
`berlin-metro-one-wolter1.vercel.app/*`) en tot de Maps JavaScript API. Het GOD-menu toont of Street View
nu gratis (embed) of betaald draait. **De betaalde API staat standaard aan** (keuze speler 30 okt; loads in de gaten houden via het
GOD-menu). Uitzetten: `localStorage.setItem('berlin-sv-paid', '0')`. Bij een fout valt hij terug op de embed.

## Bekende punten

- `ProgrammableStreetViewV2` laadt standaard de betaalde Maps API zodra je naar buiten gaat → kandidaat voor
  een schakelaar (standaard gratis).
- Overstappen U1 ⇄ U2/U8 is een sprong met fade, nog geen doorlopende gang.
- Modules die ook in de oude live game nooit laadden (404 of syntaxfout, o.a. `Phase845V1.js`) zijn
  bewaard in `docs/inactive-in-live-game/`.
