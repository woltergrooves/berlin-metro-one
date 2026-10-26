# Berlin Life (voorheen Berlin Metro)

First-person 3D-simulatie van Berlijn: reizen met U2 en U8, stations verkennen, via Street View
naar buiten, werken, geld verdienen en een eigen leven opbouwen. Gebouwd met Three.js, bedoeld
voor iPhone en iPad (touchbediening).

Deze repository bevat de **volledige, zelfstandige codebase** van de game. Alle code en assets
die eerder verspreid stonden over tientallen losse Vercel-deployments staan nu hier, met lokale
imports. Er wordt **niets** meer geladen van oude `berlin-metro-*.vercel.app`-adressen.

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

Vercel herkent het project automatisch als Vite-project:

| Instelling       | Waarde          |
|------------------|-----------------|
| Framework        | Vite            |
| Build command    | `npm run build` |
| Output directory | `dist`          |

Er zijn geen environment-variabelen nodig.

## Projectstructuur

```
index.html              ← HTML-schil (boot-scherm, HUD, touchzones)
src/
  main.js               ← ingang van de game
  boot/                 ← de historische opstartketen (zie hieronder)
  core/                 ← Game, PlayerController, InputController, motion
  world/                ← stations, treinen, Alexanderplatz, visuele patches
  systems/              ← alle gameplay-systemen (U8, Street View, economie, gesprekken, telefoon, saves, …)
  ui/                   ← HUD
  vendor/               ← meegeleverde Three.js-loaders (GLTFLoader e.a.)
  data/, config.js      ← lijngegevens (U2) en configuratie
  styles/styles.css     ← stylesheet
  missing/              ← stubs voor modules die ook in de live game ontbraken (zie onder)
public/assets/
  stations/             ← 53 Blender-stationsmodellen (.glb.gz) + stations.json
  trains/               ← BVG-treinen (HK voor U2, H voor U8)
  actors/, props/       ← NPC's en stationsmeubilair
docs/
  provenance.json       ← herkomst van élk bestand: oorspronkelijke deployment-URL + hash
  localize-report.json  ← rapport van de consolidatie
  inactive-in-live-game/← originele bronbestanden die in de live game niet actief waren
reference/              ← bevroren referentie: de originele, ongewijzigde JS uit de deployments
tools/consolidation/    ← scripts waarmee de consolidatie en de tests zijn uitgevoerd
```

### Waarom bestanden als `src/boot/main.<code>.js`?

De game is in honderden kleine stappen gegroeid; iedere stap was een nieuwe deployment met een
eigen `main.js` die de vorige `main.js` inlaadde. Die keten bepaalt de **volgorde** waarin alle
systemen starten. In deze eerste herstelstap is die volgorde exact behouden, maar nu met lokale
bestanden: `src/main.js` → `src/boot/main.bqh848uhh.js` → … De code achter de punt
(bijv. `bqh848uhh`) is de oorspronkelijke deployment-ID, zodat altijd terug te vinden is waar een
bestand vandaan komt (zie ook `docs/provenance.json`).

Bestanden die in meerdere deployments met dezelfde naam voorkwamen maar verschillend waren,
hebben dezelfde ID als achtervoegsel. Ze zijn bewust **niet** samengevoegd: in de live game
draaiden het afzonderlijke modules met eigen toestand.

## Externe diensten

| Dienst | Waarvoor |
|--------|----------|
| `three` (npm, 0.186.1) | 3D-engine — nu als npm-dependency in plaats van via CDN |
| Google Maps / Street View (google.com/maps, in een iframe) | buitenwereld |
| v6.bvg.transport.rest | BVG-dienstregelinggegevens |
| nominatim.openstreetmap.org | locatie-opzoekingen |
| Wikimedia Commons, freesound.org | enkele geluiden/afbeeldingen |

Er zit geen API-sleutel in de code.

## Bekende punten (overgenomen uit de live game, níet veroorzaakt door de consolidatie)

Deze modules werden ook in de live game niet geladen. Het gedrag is identiek gehouden:

| Module | Oorzaak in de live game |
|--------|-------------------------|
| `NpcVisualUpgradeV1.js` (deployment kdhwzvudx) | bestand bestaat niet meer (HTTP 404) |
| `NpcVisualUpgradeV2.js` (deployment 7bcp3swv1) | bestand bestaat niet meer (HTTP 404) |
| `BerlinLifeCoreV1.js` (deployment 1o6c5vqu2) | bestand bestaat niet meer (HTTP 404); een andere versie wordt wél geladen |
| `BouncerCareerV1.js` (deployment ormasdfm5) | bestand bestaat niet meer (HTTP 404); een andere versie wordt wél geladen |
| `Phase845V1.js` (Fase 8.4/8.5) | syntaxfout in de bron (één `}` te veel); de browser weigerde het bestand. Origineel bewaard in `docs/inactive-in-live-game/`. |

Herstellen hiervan is een gameplaywijziging en gebeurt pas na expliciete goedkeuring.

## Volgende stap (na goedkeuring)

De opstartketen kan nu stap voor stap worden opgeschoond: verouderde systemen die alleen nog
door uitschakelmodules (`LegacyStreetDisabled.js`) worden overschreven verwijderen, dubbele
systemen samenvoegen en de keten vervangen door één overzichtelijke initialisatie. Iedere stap
wordt getest tegen `reference/` en de bestaande testscripts.
