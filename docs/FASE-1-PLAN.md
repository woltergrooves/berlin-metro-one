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
2. ✅ **Eén save-formaat** — `src/state/SaveFormat.js`. Elk slot in `berlin-save-slots-v1` bevat nu
   een volledige save (`format: 2`): de gedeelde sleutels, de sleutels per slot
   (`berlin-economy-v4@<slot>`, `berlin-discovery-v4@<slot>`) en `berlin-state-v2`. Bestaande saves
   worden bij het eerste opstarten automatisch omgezet; het oude register blijft als reservekopie
   bewaard in `berlin-save-slots-v1.before-format-2`. Het register houdt `schema: 1`, zodat een
   eerdere versie van de game de saves nog kan openen. Beschikbaar als `BerlinState.saves`
   (`list()`, `saveNow()`, `exportSlot(id)`).
   *Gedragswijziging (bugfix):* "Nieuwe save starten" wist nu ook de economie en ontdekkingen van de
   vorige normale save. Voorheen bleef bijvoorbeeld contant geld uit de vorige game staan.
3. ✅ **Eén portemonnee** — `src/state/Wallet.js`, geladen direct na de save-keuze. Het saldo staat
   alleen nog in `BerlinState.wallet` (opgeslagen in `berlin-state-v2`). `game.economy.balanceCents`,
   `game.metroEconomy.balanceCents` en de cash/bank-verdeling van economie v4 lezen en schrijven via
   die ene bron; de oude opslagplekken worden alleen nog als kopie bijgewerkt.
   *Gemeten fout die hiermee verdwijnt:* geld verdiend via de ene economie werd door de volgende
   aankoop in de andere economie overschreven. In de test: €85 + €10 loon − €2 aankoop + €5 fooi gaf
   €83 in plaats van €98; na herladen bleef €83 staan. Nu overal €98, ook na herladen.
   Bestaande saves houden het saldo dat de game tot nu toe toonde.
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

## Tests stap 2 en 3 (26 oktober 2026)

Lokaal, headless Chromium met iPad-emulatie, oude versie (commit `96d4f9e`) naast de nieuwe:

- `tools/consolidation/saveformat-test.mjs` — migratie van het register (zonder browser).
- `tools/consolidation/wallet-probe.mjs` — verdienen/uitgeven via beide economieën, herladen,
  nieuwe save. Oud: €83 (fout), nieuw: €98 in elke bron.
- `tools/consolidation/migration-probe.mjs` — save van de oude versie openen in de nieuwe.
- `probe3.mjs` — opstartmeldingen, HUD, telefoon: vergeleken met de oude versie.
- `devserve.mjs` — draait de game zonder Vite-build (alleen voor tests).
