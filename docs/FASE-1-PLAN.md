# Fase 1 — technische cleanup & Game State 2.0

Doel (uit de roadmap): één centrale state voor tijd, geld, locatie, actieve job, contacten,
inventory, reputatie, activity state en saves, zodat nieuwe features niet meer bovenop twintig
oude intervals en patches gestapeld worden.

## Inventarisatie (26 oktober 2026)

Gemeten met `tools/consolidation/audit.mjs` (statisch) en een speelsessie in de browser
(`tools/consolidation/dump.mjs`).

| Wat | Aantal |
|-----|--------|
| JavaScript-modules | 210 (alle 210 worden bij het opstarten geladen) |
| Opstartketen (`src/boot/main.*.js`) | 49 bestanden die elkaar één voor één inladen |
| `setInterval`-timers | 36 |
| `setTimeout`-aanroepen | 102 |
| `requestAnimationFrame`-lussen | 10 |
| Globale variabelen op `window` | 34 |
| Overschreven methodes (`X.prototype.y = …`) | 24 methodes op 44 plekken — o.a. `Game.start` door 8 modules, `WorldStreamer.load` door 7 |
| Systemen waarvan V1 én V2 tegelijk draaien | 6: Contacts, GodMenu, Guide, Phase161Jobs, Phase16, Phone |

### Dezelfde gegevens op meerdere plekken

| Gegeven | Waar het nu staat |
|---------|-------------------|
| **Geld** | `game.economy.balanceCents`, localStorage `metro-economy-v2`, localStorage `berlin-economy-v4@<slot>` (cash + bank). Worden nu gelijk gehouden door synchronisatiecode. |
| **Tijd** | Twee klokken die elkaar tegenspreken: `BerlinLife.state.clock` (nieuwe save in onze test: dag 4, 18:24) en `__berlinMetroTime` (08:16). De woning telt daarnaast een eigen dag (dag 1). |
| **Contacten, woning** | `metro-economy-v2` |
| **Carrière, reputatie, verhaal** | `berlinLifeCoreV1` |
| **Ontdekkingen** | `berlin-discovery-v4@<slot>` én `BerlinLife.state.discovered` |
| **Saves** | `berlin-save-slots-v1` (slots) plus de losse sleutels hierboven, en per station een Street View-cache (`metro-street-v41:*`) |

### Overig gevonden

- `src/systems/ProgrammableStreetViewV2.js` bevat een Google Maps API-sleutel. Een browsersleutel
  is altijd zichtbaar voor bezoekers; hij moet daarom in Google Cloud beperkt zijn tot de eigen
  domeinen (HTTP-referrers). Zie README.

## Aanpak in stappen

Iedere stap: bouwen → automatisch vergelijken met de referentie → preview → controle op iPad.
Geen stap verandert de gameplay, behalve waar dat hieronder expliciet staat.

1. ✅ **Centrale state, alleen lezen** — `src/state/GameState.js`, beschikbaar als
   `BerlinState.snapshot()`, `BerlinState.consistency()` en `BerlinState.subscribe()`. Leest alle
   bronnen hierboven en meldt waar ze van elkaar afwijken. Verandert niets aan het spel.
2. **Eén save-formaat** — `BerlinState` maakt en herstelt een volledige save per slot (alle
   sleutels samen, met versienummer), met automatische migratie van bestaande saves.
3. **Eén portemonnee** — geld wordt alleen nog in `BerlinState` bijgehouden; de drie oude
   economieën lezen en schrijven via die ene bron. Daarmee verdwijnt de synchronisatiecode.
4. **Eén klok** — basis voor roadmap fase 2. *Hiervoor is een keuze nodig* (zie onder).
5. **Dubbele systemen opruimen** — V1-versies verwijderen waar V2 ze volledig vervangt
   (Contacts, Guide, Phone, Jobs, GodMenu, Phase16), na controle per systeem.
6. **Opstartketen platslaan** — de 49 `main.*.js`-bestanden vervangen door één overzichtelijke,
   geordende opstartlijst met dezelfde volgorde.
7. **Eén game-tick** — losse `setInterval`-timers vervangen door één centrale update per frame of
   per seconde. Beter voor batterij en prestaties op iPhone/iPad.

## Beslissing klok (26 oktober 2026)

Gekozen: **één klok, en een nieuwe save begint 's ochtends.** `BerlinLife.state.clock` (dag +
minuut) wordt de leidende tijd; `__berlinMetroTime` wordt daarvan afgeleid. Uitwerking in stap 4.
