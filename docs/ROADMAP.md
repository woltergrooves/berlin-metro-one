# Roadmap Berlin Life

De roadmap zoals opgesteld tijdens de ontwikkeling, aangevuld met **wat er op 26 oktober 2026
al in de code zit**. "Begin aanwezig" betekent: er draait al een eerste versie, maar die is nog niet
af en moet bij fase 1 worden opgeschoond. Modulenamen verwijzen naar `src/systems/`.

Legenda: ✅ staat · 🟡 begin aanwezig · ⬜ nog niet gestart · 🔜/🆕/🔥 = markering uit de oorspronkelijke roadmap

| # | Fase | Status in de code |
|---|------|-------------------|
| 0 | ✅ **Fundament — Berlin Metro Core.** U2, U8, treinen in beide richtingen, overstappen, stations, NPC's, uitgangen, Street View, Bus 200, telefoon, eerste shops/jobs/contacts, highlights, Berlin Stamps, Hasselhoff, mobiele performancebasis. | ✅ aanwezig |
| 1 | 🔜 **Technische cleanup & Game State 2.0.** Eén centrale state voor tijd, geld, locatie, actieve job, contacten, inventory, reputatie, activity state en saves. | 🟡 bezig — zie [FASE-1-PLAN.md](FASE-1-PLAN.md) |
| 2 | 🔜 **Tijd, dagen en kalender.** Telefoon toont bijv. *Vrijdag 18:47*; tijd stuurt spits, NPC's, winkels, shifts, nightlife, events en nachtvervoer. Gamedag ≈ 45–60 echte minuten. | 🟡 er is een dag/tijd-klok (`BerlinLifeCoreV1`), maar ook een tweede klok die afwijkt |
| 3 | 🔜 **Economy Core.** Cash/bank, salaris, fooien, Pfand, huur, boodschappen, OV, kleding, uitgaan, boetes. | 🟡 economie met cash, bank, achterstand en uitgavencategorieën (`Phase34CoreV1`), naast twee oudere geldsystemen |
| 4 | 🆕 **Activity Discovery System.** "IN DE BUURT: Späti · 42 m, Clubnacht vanavond …"; onontdekte dingen blijven verborgen. | 🟡 Discovery-knop en stationgebonden ontdekkingen (`Phase34CoreV1`, `DiscoveryV2`, `CityClean`) |
| 5 | 🆕 **Street View 2.0 / World Bridge.** Programmeerbare `StreetViewPanorama` i.p.v. alleen iframes; positie via `getPosition()`. | 🟡 `ProgrammableStreetViewV2`, `BridgeClean` (World Bridge) |
| 6 | 🆕 **Virtuele proximity.** Binnen ~40 m van een activiteit verschijnt GA NAAR BINNEN / BEKIJK / PRAAT / WERK HIER. | 🟡 `BerlinProximity` in `CityClean` |
| 7 | 🆕 **Hybride activiteiten.** Menu/minigame → 2D/360 → volledige 3D-interieurs, achter dezelfde GA NAAR BINNEN-knop. | 🟡 activiteitenregister (`Phase7HybridActivitiesV6`) |
| 8 | 🆕 **First Weeks in Berlin.** Lichte verhaallijn als tutorial: WG → geld nodig → Späti → delivery → Miro/Deniz/Lea → eerste job → eerste avond uit. | 🟡 hoofdstuk "Eerste week in Berlijn" (`BerlinLifeCoreV1`), koeriersroute en gesprekken (`CityEpisodesV1`, `CityFlowV3`) |
| 9 | 🆕 **Narrative Bible.** Vaste achtergrond, taal, kring, eigenaardigheden en geheimen per personage vóór verdere dialogen. | ⬜ (dialogen Miro, Lea, Deniz bestaan al) |
| 10 | 🔜 **Career Core.** Werkgevers, shifts, loon, XP, levels, performance, ontslag/promotie, skills. | 🟡 carrièrevelden en jobs (`BerlinLifeCoreV1`, `DeliveryJobs`, `BaselineJobs`) |
| 11 | 🔥 **Bouncer Career.** ID, dronkenschap, agressie, guestlist, capaciteit; Trainee → Head Door. | 🟡 preview (`BouncerCareerV1`, "Bouncer Career v1.1-preview") |
| 12 | 🔥 **Eerste volledige clubinterieur.** | ⬜ |
| 13 | 🆕 **Club Life System.** Zelfde club als bezoeker, bouncer, bartender, promoter of DJ. | ⬜ |
| 14 | 🆕 **Dans/ritme & DJ gameplay.** | ⬜ |
| 15 | 🆕 **Berlin Knowledge.** History, Transport, Music, Football, Architecture, Cold War. | 🟡 Berlin Stamps / highlights (`BerlinHighlightsV1`, `HighlightExperienceV2`) |
| 16 | 🆕 **City Memories & Story Collections.** | ⬜ |
| 17 | 🆕 **Rumours & Secrets.** | ⬜ |
| 18 | 🔜 **NPC Routines 2.0.** Echte dagdoelen, persistente personages. | 🟡 basis-NPC's en patrouilles (`NpcSystem`, `HoffPatrol`, `DailyWorldModel`) |
| 19 | 🆕 **Relaties zonder RPG-checklist.** | 🟡 contacten met relatiewaarde (`ContactsV1/V2`) |
| 20 | 🆕 **Underworld side-story** (optioneel, fictieve risico-laag). | ⬜ |
| 21 | **Späti Career & Pfand 2.0.** | 🟡 Pfand verzamelen en Späti-interacties |
| 22 | **Bartender Career.** | ⬜ |
| 23 | **Delivery Career.** De stad is de minigame. | 🟡 koeriersopdrachten |
| 24 | **Promoter / nightlife work.** | ⬜ |
| 25 | **BVG careers.** | ⬜ (BVG-reputatie bestaat als veld) |
| 26 | **Housing.** | 🟡 WG, huur en woningupgrades (`HomeUpgradesV1`, `Phase162HomeV1`) |
| 27 | **Bezittingen.** | ⬜ |
| 28 | **Reputaties & districts.** | 🟡 reputatie nightlife/BVG/hospitality (nog geen wijken) |
| 29 | **Grote financiële doelen.** | ⬜ |
| 30 | **Businesses.** | ⬜ |
| 31 | **Dynamic Berlin.** Dag/nacht, spits, weer, events, storingen. | ⬜ |
| 32 | **Ticket System 2.0.** | 🟡 ticket kopen bestaat (€4,00) |
| 33 | 🔥 **Olympiastadion als destination.** | 🟡 activiteit bij het Olympiastadion |
| 34 | 🆕 Olympiastadion Game Modes. | ⬜ |
| 35 | 🆕 Stadium Seat Experience. | ⬜ |
| 36 | 🆕 Historische lagen Olympiastadion (1936, 2006, heden). | ⬜ |
| 37 | 🔥 Alte Försterei. | ⬜ |
| 38 | Football Life. | ⬜ |
| 39 | Daily/weekly contracts & achievements. | ⬜ |
| 40 | Mission System 2.0. | 🟡 missies (`CityMissions`, `MissionResultV1`) |
| 41 | Career storylines. | ⬜ |
| 42 | District Completion. | ⬜ |
| 43 | U1/U3. | ⬜ |
| 44 | U5, U6, U7. | ⬜ |
| 45 | Tram en S-Bahn. | ⬜ (Bus 200 bestaat) |
| 46 | Audio/visual Berlin pass. | ⬜ |
| 47 | Multi-city engine. | ⬜ |
| 48 | Amsterdam. | ⬜ |
| 49 | Echte intercity progression. | ⬜ |
| 50 | Verdere steden. | ⬜ |
| 51 | Standalone/Unreal-evaluatie. | ⬜ |
| 52 | Multiplayer foundation. | ⬜ |
| 53 | Multiplayer multi-city. | ⬜ |

## Prioriteit

Fase 1 gaat voor alles: fase 2 t/m 11 bouwen allemaal op dezelfde tijd, hetzelfde geld en dezelfde
saves. Omdat fase 2 t/m 8 al deels bestaan, betekent "fase 1 afmaken" vooral: per systeem kiezen
welke versie de echte wordt, en de rest opruimen. Fase 43 en verder (extra lijnen, andere steden,
Unreal, multiplayer) is visie, geen planning.
