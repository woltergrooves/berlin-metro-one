# Testrapport consolidatie — 26 oktober 2026

Vergeleken: **referentie** = huidige testversie `berlin-metro-ph8mgb20b-wolter1.vercel.app`
tegenover **preview** = `berlin-metro-air2vv9m4-wolter1.vercel.app` (gebouwd uit deze repository,
branch `consolidatie`, commit `53b77c6`).

Methode: headless Chromium met iPad Pro 11-emulatie (landscape, touch-events via het
DevTools-protocol), software-WebGL. Scripts staan in `tools/consolidation/`
(`probe2.mjs`, `probe3.mjs`, `probe4.mjs`, `compare.mjs`). **Er is niet op een echte iPad of iPhone getest.**

## Resultaten

| # | Test | Resultaat preview | Vergelijking met referentie |
|---|------|-------------------|-----------------------------|
| 1 | Game start, geen kritieke runtimefouten | ✅ 0 onafgevangen paginafouten | gelijk |
| 2 | Laadscherm en save-keuze | ✅ | identiek |
| 3 | Blender-assets laden (53 stations, U2/U8-treinen, NPC's, props) | ✅ "53-platform Blender station pipeline ready", "Blender train visual pipeline ready" | identieke meldingen |
| 4 | Alle opstartmodules geladen | ✅ alle opstartmeldingen van de referentie aanwezig | identiek (op de verwachte verschillen na, zie onder) |
| 5 | Wereld in beeld na Start (HUD, 3D-canvas, vertrektijden Ruhleben/Pankow) | ✅ | identiek |
| 6 | Startgeld €85 en save-sleutels in localStorage | ✅ | identiek (zelfde 52 sleutels) |
| 7 | Lopen met linker duim / kijken met rechter duim (touch) | ✅ beeld verandert | gelijk |
| 8 | HUD-knoppen (💳, Discovery, 🎒, GOD, 📱) | ✅ zelfde knoppen op exact dezelfde posities, geen overlap | identiek |
| 9 | Telefoon openen/sluiten (Home, Jobs, Netz, Chats, Plekken, Stad) | ✅ | identiek |
| 10 | God Mode: +€50 | ✅ €85 → €135 | — |
| 11 | Savegame opslaan → pagina herladen → "Doorgaan" | ✅ €135 hersteld | — |
| 12 | Geen verwijzingen meer naar oude deployments | ✅ `npm run check:no-legacy-urls` en netwerklog: 0 verzoeken naar oude deployments | referentie laadde code uit tientallen oude deployment-adressen (62 in totaal gevonden) |
| 13 | Street View openen/sluiten, Activiteiten, "Terug naar U-Bahn" | ⚠️ **niet automatisch geverifieerd** — de testrobot kreeg de speler niet door de uitgang. De Street View-modules laden wel identiek. | handmatig controleren |
| 14 | Treinen in-/uitstappen, overstappen Alexanderplatz | ⚠️ **niet automatisch geverifieerd** | handmatig controleren |
| 15 | Instellingen-/activiteitspanelen bij stations, koeriersopdrachten | ⚠️ **niet automatisch geverifieerd** (modules laden identiek) | handmatig controleren |

## Verwachte verschillen (bewust zo)

1. Three.js komt uit npm (0.186.1, gebundeld) in plaats van van cdn.jsdelivr.net — zelfde versie.
2. Vier modules die in de referentie een netwerkfout (404/CORS) gaven, zijn nu lokale stubs die op
   dezelfde manier falen; de netwerkfout zelf verschijnt dus niet meer in de console.
3. Fase 8.4/8.5 meldt "disabled" met een duidelijkere tekst; in de referentie was dit een syntaxfout.
4. Eén keer zag de referentie-run aan het eind de knop "PRAAT MET DAVID" en de preview niet: dat
   hangt af van waar de rondlopende NPC op dat moment staat (tijdsafhankelijk), niet van de code.
5. De volgorde waarin HUD-knoppen in de DOM terechtkomen verschilt soms per run (ook tussen twee
   runs van de referentie mogelijk); positie en zichtbaarheid zijn identiek.

## Gevonden en opgeloste problemen tijdens de consolidatie

- **Bundel-deadlock:** standaard Vite-bundeling voegde modules samen in gedeelde chunks, waardoor de
  opstartketen (top-level `await import`) halverwege bleef hangen. Opgelost met
  `preserveModules` in `vite.config.js`; daarna laadden alle modules zoals in de referentie.
- **.gz-assets:** de lokale Vite-previewserver stuurt `.glb.gz` met `Content-Encoding: gzip`,
  waardoor de treinmodellen niet laadden. Vercel doet dat niet; `vercel.json` legt het
  content-type nu expliciet vast. (Alleen relevant voor `npm run preview`.)
