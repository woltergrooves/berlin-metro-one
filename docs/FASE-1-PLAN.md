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
4. ✅ **Eén klok** — `src/state/Clock.js` (`BerlinState.clock`, ook `BerlinClock`), opgeslagen in
   `berlin-state-v2`. Speldag (`dayNumber`), minuut en weekdag staan op één plek. De zichtbare klok en
   dag/nacht (`__berlinMetroTime`, `phase12State`), de Berlin Life-klok (`BerlinLife.state.clock`) en de
   woningdag (`home.day`) lezen en schrijven via die klok. Slapen = `nextMorning(8)`.
   Tempo: 1 spelminuut per echte seconde (een speldag = 24 minuten), het tempo van de zichtbare klok.
   *Gedragswijzigingen:* de tijd wordt nu opgeslagen (voorheen stond de zichtbare klok na elke start op
   08:15); openingstijden en weekdagen volgen nu de tijd die je ziet (voorheen liep die verborgen
   Berlin Life-klok apart, 0,4 minuut per seconde, en stond die bij een nieuwe save op vrijdag 18:20).
   Een nieuwe save begint op dag 1, maandag 08:15. Bestaande saves gaan verder op de weekdag en tijd
   van hun Berlin Life-klok en houden hun woningdag.
5. **Dubbele systemen opruimen** — V1-versies verwijderen waar V2 ze volledig vervangt
   (Contacts, Guide, Phone, Jobs, GodMenu, Phase16), na controle per systeem.
6. **Opstartketen platslaan** — de 49 `main.*.js`-bestanden vervangen door één overzichtelijke,
   geordende opstartlijst met dezelfde volgorde.
7. **Eén game-tick** — losse `setInterval`-timers vervangen door één centrale update per frame of
   per seconde. Beter voor batterij en prestaties op iPhone/iPad.

## Beslissing klok (26 oktober 2026)

Gekozen: **één klok, en een nieuwe save begint 's ochtends.** `BerlinLife.state.clock` (dag +
minuut) wordt de leidende tijd; `__berlinMetroTime` wordt daarvan afgeleid. Uitgewerkt in stap 4.
Het tempo (`MINUTES_PER_SECOND` in `Clock.js`) is één getal en eenvoudig aan te passen.

## Tests stap 2 en 3 (26 oktober 2026)

Lokaal, headless Chromium met iPad-emulatie, oude versie (commit `96d4f9e`) naast de nieuwe:

- `tools/consolidation/saveformat-test.mjs` — migratie van het register (zonder browser).
- `tools/consolidation/wallet-probe.mjs` — verdienen/uitgeven via beide economieën, herladen,
  nieuwe save. Oud: €83 (fout), nieuw: €98 in elke bron.
- `tools/consolidation/migration-probe.mjs` — save van de oude versie openen in de nieuwe.
- `probe3.mjs` — opstartmeldingen, HUD, telefoon: vergeleken met de oude versie.
- `devserve.mjs` — draait de game zonder Vite-build (alleen voor tests).
- `tools/consolidation/clock-probe.mjs` — stap 4: tijdbronnen, middernacht, slapen, herladen.
  Oud: zichtbare klok maandag 08:15, spelregels vrijdag 18:21, na herladen terug naar 08:15.
  Nieuw: overal dezelfde tijd en dag, ook na herladen.

## Stap 5 deel 1 — Contacts, Guide, Phone (26 oktober 2026)

Wat er in het live spel echt gebeurde (gemeten met `tools/consolidation/contacts-probe.mjs`):

- **Phone**: V2 verborg V1 volledig. V1 verwijderd; V2 heet nu `src/systems/Phone.js`
  (DOM-ids `#phoneBtnV2` e.d. ongewijzigd, CityPhone bouwt erop voort).
- **Gids**: V1 en V2 pasten dezelfde knop aan, die door Phone V2 én Phase16UXFix altijd verborgen
  werd. Nooit zichtbaar → beide verwijderd. Alles uit de gids staat ook in de telefoon.
- **Contacten**: beide praatkaartjes werden elke 90 ms weggehaald door Phase16StabilityV2 (die heeft
  de echte praatknop). V1 en V2 vervangen door `src/systems/Contacts.js`, dat alleen nog de
  dagelijkse berichtjes van ontmoete contacten verstuurt, op de centrale klok (nieuwe dag) in plaats
  van een timer van 1,2 s. In de oude versie kwamen die berichtjes in de praktijk niet aan
  (V1 werkte op een losse kopie van de save); nu wel.
- Resultaat: 5 bestanden weg, 33 → 29 `setInterval`-timers bij een nieuwe save, geen fouten.
  `probe3.mjs`: gelijk aan de oude versie.

## Stap 5 deel 2 — Jobs, GodMenu, Phase16 (27 oktober 2026)

Gemeten met `tools/consolidation/jobs-god-probe.mjs` (oude en nieuwe versie naast elkaar):

- **Jobs**: V1 draaide nog mee, maar zijn knop en timer waren altijd verborgen (door V2 en CleanHud).
  Bij een verlopen bezorging konden V1 en V2 allebei reageren; won V1, dan werd de mislukte job niet
  geteld en zakte de reputatie niet (gezien in één van de testruns: melding "Bezorgjob verlopen" van V1).
  V1 verwijderd; V2 heet nu `src/systems/DeliveryJobs.js` (DOM-ids `#acceptJobV2`, `#deliverJobV2`
  ongewijzigd; BaselineJobs en de oude-job-migratie werken daarop). Aannemen, afleveren, loon en
  verlopen: gelijk aan de oude versie.
- **GOD-menu**: V1 en V2 bouwden elk een knop en paneel die InspectorGodV3 en Phase16V3Hotspots direct
  weer weghaalden. V3 (InspectorGodV3 + GodMenuMobileFixV4) heeft dezelfde teleport- en tijdknoppen.
  V1 en V2 verwijderd; de opruimcode voor hun knoppen ook.
- **Phase16**: het straatpaneel van V1 werd door Phase16UXFix verborgen, dat van V2 door
  Phase16V3Hotspots verwijderd. Beide verwijderd. *Gemeten fout die hiermee verdwijnt:* een
  straatbezoek werd dubbel geteld (V2 én V3 telden `surfaceVisited`); nu één keer.
  Uit Phase16UXFix zijn de selectors voor de gidsen (weg sinds deel 1) en de oude straatpanelen gehaald,
  inclusief de controle die elke 350 ms alle knoppen op de tekst "Gids" doorzocht.
  Phase16StabilityV2 (echte contact-praatknop) blijft.
- Resultaat: 5 bestanden weg, 3 minder lagen om de game-loop, `setInterval`-timers bij een nieuwe save
  gelijk (29). `probe3.mjs`: geen fouten, zelfde stappen als de basislijn.

## Stap 6 — opstartketen platgeslagen (27 oktober 2026)

- De 49 `src/boot/main.<hash>.js`-bestanden (een keten waarin elk bestand eerst het volgende inlaadde)
  zijn vervangen door één lijst: `src/boot/BootSequence.js`, ingedeeld in 10 genummerde blokken.
  `src/main.js` laadt alleen nog die lijst; ook de laatste regels van `main.js` (CityClean … GameState)
  staan nu in de lijst.
- Volgorde mechanisch uitgevouwen en vergeleken: 106 imports, exact dezelfde volgorde, en per regel
  hetzelfde soort laden (wachten / wachten met foutopvang / alleen starten).
- Weggelaten omdat ze niets deden: `LegacyStreetDisabled.js` (leeg bestand, 6× geïmporteerd) en de
  4 stubs in `src/missing/` (gooiden alleen een fout die direct werd genegeerd; ook in het originele
  spel bestonden die modules niet). Zes opeenvolgende `BerlinBuildStatus`-toewijzingen samengevoegd
  tot één (zelfde eindwaarde).
- Getest met `tools/consolidation/boot-probe.mjs` (oud en nieuw naast elkaar, warme run): zelfde
  152 geladen spelmodules, zelfde console-meldingen, zelfde `BerlinBuildStatus`, HUD, station en saldo.
  Opstart na de save-keuze ~0,8 s (oud 0,9 s warm; 49 bestanden minder om op te halen).
  Let op: de systemen die tot 60 s op de game wachten ("… timed out") zijn ook in de oude versie
  timing-afhankelijk; bij een koude eerste run van de oude versie vielen er 6 af, warm 1
  (Phase 8.5.1 fix, in beide versies). `probe3.mjs`: 0 fouten, zelfde 4 "no button"-stappen als de basislijn.

## Stap 7 deel 1 — één planner voor alle timers (28 oktober 2026)

Stap 7 bleek drie soorten losse timers te hebben. Daarom in drie delen:
1. **herhalende `setInterval`-timers** (dit deel);
2. **opstart-wachtlussen**: 48 systemen die tot 60 s, 10× per seconde, op `__berlinMetroGame` wachten;
3. **`game.loop`-wrappers** (✅ deel 3): 26 systemen die zich om de game-loop heen wikkelen.

Deel 1:
- Nieuw: `src/state/Tick.js` (`BerlinTick`, ook als `BerlinState.tick`). Eén timer voor alles:
  taken die binnen 16 ms van elkaar aan de beurt zijn draaien in dezelfde wekbeurt, herhalende taken
  pauzeren als het tabblad verborgen is, wacht-taken (`until`) stoppen zelf bij succes of time-out,
  en een fout in één taak stopt de andere niet. `Tick.list()` toont per taak naam, interval,
  aantal keer gedraaid, fouten en gemiddelde duur.
- Alle 31 `setInterval`-aanroepen in 29 bestanden omgezet (zelfde intervallen, zelfde volgorde van
  werk, eerste aanroep na het interval zoals bij `setInterval`). Er staat geen `setInterval` meer in `src/`.
- Unit-test zonder browser: `tools/consolidation/tick-test.mjs` (8/8).
- `tools/consolidation/tick-probe.mjs` (nieuwe save, iPad-emulatie, warme run, oud naast nieuw):

  | | oud | nieuw |
  |---|---|---|
  | lopende `setInterval`-timers na start | 21 | 0 |
  | timer-wekbeurten per 10 s | 454 | 205 |
  | wekbeurten in 5 s verborgen tabblad | 189 | 18 (alleen wacht-taken) |
  | taken | 21 losse timers | dezelfde 21 als `BerlinTick`-taken |

  HUD, klok, saldo en console-meldingen gelijk. `probe3.mjs`: 0 fouten, zelfde 4 "no button"-stappen.
- Gevonden, niet aangepast: de Phase 8.5.1-fix kan nooit starten. Hij wacht op
  `stationArchitectureVersion === 'V8.5'`, maar Phase 8.4/8.5 staat bewust uit (syntaxfout in het
  origineel). Dat is 60 s nutteloos pollen; aanzetten is een gameplay-wijziging. Hoort bij deel 2.
- Ook gezien: `stations.consistency` (CrossSystemStationConsistencyV1) slaagt nooit en pollt dus
  25 s lang elke 150 ms; de Hinterhof-validatie meldt `ok: false`. Beide ook in de oude versie.

## Stap 7 deel 2 — opstart-wachtlussen (28 oktober 2026)

- `Tick.sleep(ms, naam)` toegevoegd aan `src/state/Tick.js` (versie "Tick 2"). Alle slapers worden op
  een gedeeld raster van 25 ms samen gewekt: één wekbeurt voor alle wachtende systemen in plaats van
  één timer per systeem. Een slaap duurt `ms` tot `ms + 25`; loopt ook door bij een verborgen tabblad
  (zoals de oude `setTimeout`). Slapers staan in `Tick.list()` als `kind: 'once'`, naam `boot.<Bestand>`.
- Omgezet: alle 48 opstart-wachtlussen (`for(i<N){…await new Promise(r=>setTimeout(r,M))}`) in 48
  bestanden, plus de geneste wachtlus in Phase67RestoreV2 (wacht op StationLifeVisualV72) en de
  opstartlus van ProgrammableStreetViewV2 (eigen `sleep`-helper). Alleen de slaap is vervangen:
  voorwaarde, aantal pogingen, `return`/`break`, time-out-melding en alle code eromheen zijn gelijk.
  Mechanisch gedaan met een script dat per lus precies de lus-slaap vervangt (bij AlexanderStairSeamFixV2
  is de eenmalige 80 ms-pauze na "klaar" bewust gebleven).
- Niet omgezet (geen opstartlus): `waitForFrame` in ProgrammableStreetViewV2 (Street View tijdens het spelen).
- Bewust niet gekozen: één "game klaar"-gebeurtenis. De lussen wachten op verschillende dingen
  (versievlaggen van andere systemen, `__berlinMetroU8Trains`, overlays); een gebeurtenis zou de
  volgorde veranderen. De gedeelde slaap houdt de volgorde en haalt de losse timers weg.
- Unit-test `tick-test.mjs`: 13/13 (5 nieuw: 40 slapers in 2 wekbeurten, 102 ms voor sleep(100),
  opruimen, verborgen tabblad, volledige lus).
- `tools/consolidation/bootwait-probe.mjs` (nieuwe save, iPad, oud naast nieuw, warme runs; headless is ruisig):

  | eerste 10 s na Start | oud (3 runs) | nieuw (3 runs) |
  |---|---|---|
  | setTimeout-callbacks | 240–404 | 129–261 |
  | daarvan 25–100 ms (wachtlussen) | 216–334 | 92–157 |
  | wachtende systemen na 10 s | — | 2 |

  Console-meldingen ("ready", "timed out", …) identiek, 0 fouten. Game-vlaggen gelijk aan oud; in één
  oude run ontbraken `contactsVersion`, `homeUpgradesVersion` en Gfx V3 (race in de oude versie), in
  alle nieuwe runs waren ze er.
- Na 10 s wachten er nog maar twee: RuntimeCleanupV1 (loopt bewust de volle 600 beurten, doet werk per
  beurt) en Phase851FixV1 (kan nooit starten, zie deel 1). Door het raster duren die nu ±60–75 s in
  plaats van 60 s. Phase851Fix aanzetten of weghalen = gameplay-keuze, niet gedaan.
- `probe3.mjs`: 0 fouten, zelfde stappen als oud (4 "no button"). Soms een `ERR_ABORTED` op een
  `.glb` in de lijst mislukte verzoeken: komt ook bij de oude versie willekeurig voor (devserver/headless),
  modellen laden wel ("pipeline ready").

## Stap 7 deel 3 — één frame-update (28 oktober 2026)
- Tick uitgebreid met een frame-lijst (`Tick 3`): `Tick.frame(naam, { before, after })`, `Tick.runFrame(kern)`,
  `Tick.frames()` (per hook: volgorde, runs, fouten, gem. ms). `Game.loop` is nu `() => Tick.runFrame(kern)`;
  de kern (`game.frameCore`) is de oude Game-loop inclusief de prototype-patches NpcPatch en AudioPatch (die
  waren al onderdeel van de kern via `bind`, bewust zo gelaten).
- Het waren 26 wrappers, niet 25: GfxV3 heette `g.loop` en viel buiten de eerdere telling (Phase823V1 heeft er 2).
  Alle 26 omgezet met een script dat elke vervanging precies één keer controleert. Elke wrapper riep de vorige
  loop precies één keer aan zonder vroege `return`, dus splitsen kon zonder gedragswijziging:
  13 alleen `after`, 11 alleen `before`, 2 beide (Phase12FixV2, Phase1315V1: tijd/dt meten vóór de kern, werk erna).
- Geen enkele `game.loop = function` of extra `setAnimationLoop` meer in `src/systems`; alleen `Game.start` zet de loop.
- Volgorde: zoals de oude keten — `before` van laatst naar eerst geïnstalleerd, dan de kern, dan `after` van eerst
  naar laatst. Hooks die tijdens een frame bijkomen lopen vanaf het volgende frame (zoals vroeger).
- Bewust anders: een fout in één hook stopt het frame niet meer; hij wordt per hook geteld en (max. 3×) gelogd.
  Een fout in de kern stopt het frame wel, zoals vroeger.
- Tests: `tick-test.mjs` (4 nieuwe: volgorde identiek aan een oude wrapperketen van 8, fout-isolatie, laat
  toegevoegde hook, cancel). `frame-probe.mjs` (nieuw, oud vs. nieuw, 3 runs elk): zelfde game-vlaggen, zelfde
  zichtbare scene-objecten, spelklok en frames per 20 s gelijk binnen ruis, 25 hooks actief (Phase851FixV1
  installeert nooit), 0 fouten in hooks. `streetOutdoorVersion` is soms V4.1-static en soms V4.2-static — in
  beide versies: race tussen de opstartlussen van Phase67RestoreV2 en Phase823V1 (open punt, niet aangeraakt).
  `probe3.mjs`: 0 fouten, zelfde 4 "no button"-stappen; "failed" = geblokkeerde externe geluiden/foto's +
  willekeurige `ERR_ABORTED` op `.glb` (ook in oud).
- Duurste hooks per frame (headless, swiftshader): Phase910V1 ±11 ms, Phase1315V1 ±4 ms, Phase125TexturesV2 ±3 ms,
  GfxV3 ±3 ms — kandidaten voor later (deze draaien elk frame werk dat niet elk frame hoeft).

## Open punten fase 1 (28 okt 2026)
- **Phase 8.4/8.5 + 8.5.1 weg uit de opstart.** Phase845V1 was een stub die altijd een fout gooide (origineel had
  een syntaxfout); Phase851FixV1 wachtte 60 s op `stationArchitectureVersion==='V8.5'`, wat nooit gebeurt, en
  installeerde dus nooit. Beide bestanden staan in `docs/inactive-in-live-game/`. Geen gedragsverandering.
- **Race `streetOutdoorVersion` = echte bug.** StreetCoreClean zet `'V4.1'`; UniversalStationExitV5 wachtte op
  precies `'V4.1'`. Als Phase67RestoreV2 dat eerst naar `'V4.1-static'` zette, installeerde de hele keten
  UniversalStationExitV5 → StationLifeVisualV72 → Phase8ArchetypesV1 → Phase823V1 → U8AlexanderDetailV1
  nooit (geen stationsdetails, trappen, tussenhallen; 25 i.p.v. 18 frame-hooks). Fix: ExitV5 accepteert elke
  `V4.x`; Phase67 overschrijft niet meer als Phase823 al `V4.2-static` zette. Nu altijd `V4.2-static` / `V8.3`.
- **`stations.consistency`**: controleerde `BerlinCareerV2`, dat in geen enkele build bestaat. Rondt nu direct af
  met `skipped` (geen 25 s pollen meer); werkt nog steeds als dat systeem ooit komt.
- **Hinterhof-validatie**: telde ontbrekende systemen (`BerlinCareerV2`, `BerlinClubBridgeV2`) als fout.
  Nu `null` = niet aanwezig; ok als alle aanwezige verwijzingen kloppen (discovery + bouncer). Log "OK" één keer.
- Tests: nieuw `openpoints-probe.mjs` (oud 1×, nieuw 5×): nieuw altijd V4.2-static/V8.3, 25 hooks, enige
  resterende opstartwachter `boot.RuntimeCleanupV1` (ook in oud); fouten alleen geblokkeerde externe bestanden.
  `probe3.mjs`: 0 fouten, 4 "no button" = basislijn.
- Nog gezien, niet aangepast: `boot.RuntimeCleanupV1` wacht in oud én nieuw na 75 s nog.
