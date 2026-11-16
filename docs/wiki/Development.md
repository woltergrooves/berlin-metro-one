# Development

- **Repo:** `woltergrooves/berlin-metro-one`, working branch **`fase-1`**
- **Hosting:** Vercel project `berlin-metro-one`, main link https://berlin-metro-one.vercel.app
- **Tech:** Three.js (r186), Vite, plain ES modules, the Google Maps JavaScript API (Street View) and OpenStreetMap data for the surroundings
- **Language:** everything in English: in-game text, code comments, docs, wiki and commit messages. German station names and BVG signage (AUSGANG, Zurückbleiben bitte) stay German.

## Workflow

Every step follows the same order: **build → headless tests → straight to the main link → check on iPhone/iPad.** There are no preview deployments. To roll back, use a rollback in Vercel.

Deploying takes four steps:
1. Push to `fase-1`.
2. Create a production deployment.
3. Point the alias `berlin-metro-one.vercel.app` at the new deployment. This does not happen automatically.
4. Check with curl that the main link serves the new code.

## Structure (main owners)

| What | File |
|---|---|
| Startup | `src/boot/BootSequence.js` |
| Controls (touch, keyboard, mouse) | `src/core/InputController.js` |
| Line worlds U1, U3–U7, U9, S-Bahn | `src/lines/` + `src/data/<line>.js` (`LineRuntime.createLine`) |
| Stations, viaducts, cuttings | `src/lines/LineWorld.js` |
| Trains and departure boards | `src/lines/LineTrains.js`, timetable in `src/systems/TrainTimeline.js` |
| Transfers | `src/lines/LineTransfers.js` |
| OSM surroundings | `src/state/Surroundings.js`, `src/lines/LineSurroundings.js`, packs in `public/assets/surroundings/` |
| Light, fog, sky | `src/state/RenderBase.js` |
| Everything on top of Street View | `src/street/StreetScreen.js` (Street View itself: `StreetCoreClean.js`) |
| Phone | `Phone.js` (content), `PhoneSkin.js` (look), `PhoneNetz.js` (BVG app/journey planner) |
| Route bar | `src/systems/RouteHud.js` |
| GOD teleport | `src/lines/GodTeleport.js` |

Every feature has exactly one owner. There are no duplicate menus or overlays.

## Testing

The headless browser tests are in `tools/consolidation/` and run with Playwright and swiftshader:

```
node tools/consolidation/devserve.mjs <repo> <three> 4180
node tools/consolidation/<test>.mjs http://localhost:4180/ <output-dir>
```

- **Regression:** `QUALITY=laag probe3.mjs`
- **Per line:** `u9-test`, `s5b-test`, `s41b-test` and so on
- **Controls:** `desktop-test` (Mac), `phone-test`

Headless, the game runs at about 1 frame per second. Use `BerlinLines.<line>.simulate(sec)` to fast-forward the trains.

## Adding a new line

1. Create `src/data/<line>.js` (stations from an OSM relation) and `<Line>Line.js` using `createLine`.
2. Give the line its own area on the z axis (the next free spot is z = −8000).
3. Set up transfers with `transfer.station`, and open the closed transfer stairs on the other lines.
4. Register the line in these places: a line in BootSequence, `osm2places.py`, `GodTeleport.js` (`ORDER`/`COLORS`) and `StreetScreen.js` (`LINE_COLORS`).
5. Write its own test, as a copy of `s41b-test`.

Each line has a detailed plan in `docs/<LINE>-PLAN.md`.

## Updating the wiki

The wiki pages live in `docs/wiki/`. On every push to `fase-1`, `.github/workflows/wiki.yml` publishes them to the GitHub wiki automatically.
