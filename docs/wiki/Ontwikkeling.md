# Ontwikkeling

- **Repo:** `woltergrooves/berlin-metro-one`, werkbranch **`fase-1`**
- **Hosting:** Vercel-project `berlin-metro-one`, hoofdlink https://berlin-metro-one.vercel.app
- **Techniek:** Three.js (r186), Vite, gewone ES-modules, Google Maps JavaScript API (Street View) en OpenStreetMap-data voor de omgeving

## Werkwijze

Elke stap doorloopt dezelfde volgorde: **bouwen → headless testen → direct naar de hoofdlink → controle op iPhone/iPad.** Er zijn geen previews. Terugdraaien kan via een rollback in Vercel.

Deployen gaat in vier stappen:
1. Push naar `fase-1`.
2. Maak een productie-deployment.
3. Zet de alias `berlin-metro-one.vercel.app` op de nieuwe deployment. Dit gebeurt niet vanzelf.
4. Controleer met curl dat de hoofdlink de nieuwe code serveert.

## Structuur (belangrijkste eigenaars)

| Wat | Bestand |
|---|---|
| Opstart | `src/boot/BootSequence.js` |
| Bediening (aanraken, toetsenbord, muis) | `src/core/InputController.js` |
| Lijnwerelden U1, U3–U7, U9, S-Bahn | `src/lines/` + `src/data/<lijn>.js` (`LineRuntime.createLine`) |
| Stations, viaducten, ingravingen | `src/lines/LineWorld.js` |
| Treinen en vertrekborden | `src/lines/LineTrains.js`, dienstregeling `src/systems/TrainTimeline.js` |
| Overstappen | `src/lines/LineTransfers.js` |
| OSM-omgeving | `src/state/Surroundings.js`, `src/lines/LineSurroundings.js`, pakketten in `public/assets/surroundings/` |
| Licht, mist, hemel | `src/state/RenderBase.js` |
| Alles boven Street View | `src/street/StreetScreen.js` (Street View zelf: `StreetCoreClean.js`) |
| Telefoon | `Phone.js` (inhoud), `PhoneSkin.js` (uiterlijk), `PhoneNetz.js` (BVG-app/routeplanner) |
| Routebalk | `src/systems/RouteHud.js` |
| GOD-teleport | `src/lines/GodTeleport.js` |

Elke functie heeft precies één eigenaar. Er zijn geen dubbele menu's of overlays.

## Testen

De headless browsertests staan in `tools/consolidation/` en draaien met Playwright en swiftshader:

```
node tools/consolidation/devserve.mjs <repo> <three> 4180
node tools/consolidation/<test>.mjs http://localhost:4180/ <uitvoermap>
```

- **Regressie:** `QUALITY=laag probe3.mjs`
- **Per lijn:** `u9-test`, `s5b-test`, `s41b-test` enzovoort
- **Bediening:** `desktop-test` (Mac), `phone-test`

Headless loopt het spel op ongeveer 1 beeld per seconde. Gebruik `BerlinLines.<lijn>.simulate(sec)` om de treinen vooruit te spoelen.

## Nieuwe lijn toevoegen

1. Maak `src/data/<lijn>.js` (stations uit een OSM-relatie) en `<Lijn>Line.js` met `createLine`.
2. Geef de lijn een eigen gebied op de z-as (de volgende vrije plek is z = −8000).
3. Regel de overstappen via `transfer.station`, en open de gesloten trapgaten bij de andere lijnen.
4. Voeg de lijn toe op deze plekken: een regel in BootSequence, `osm2places.py`, `GodTeleport.js` (`ORDER`/`COLORS`) en `StreetScreen.js` (`LINE_COLORS`).
5. Schrijf een eigen test, als kopie van `s41b-test`.

Per lijn staat een gedetailleerd plan in `docs/<LIJN>-PLAN.md`.

## Wiki bijwerken

De wiki-pagina's staan in `docs/wiki/`. Bij een push naar `fase-1` publiceert `.github/workflows/wiki.yml` ze automatisch naar de GitHub-wiki.
