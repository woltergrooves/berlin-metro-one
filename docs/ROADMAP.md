🚇 BERLIN LIFE — ROADMAP 3.0

Bijgewerkt: 28 oktober 2026

Hoofddoel: Eerst een groot, authentiek en leuk te verkennen Berlijn bouwen. Daarna die wereld steeds levendiger maken met economie, personages, banen, verhalen en keuzes die echte gevolgen hebben.

De oorspronkelijke fasenummers blijven behouden, maar de volgorde van ontwikkeling is veranderd.

Legenda: ✅ Afgerond/geïmplementeerd · 🟡 Gedeeltelijk aanwezig · ⬜ Nog te ontwikkelen.

⸻

HOOFDSTUK 1 — TECHNISCH FUNDAMENT

✅ Fase 0 — Berlin Metro Core

De bestaande gamebasis:

* U2 en U8 met rijdende treinen in beide richtingen.
* Overstappen, stationshallen, perrons en uitgangen.
* Blender-stations, treinen, NPC’s en decoraties.
* First-person gameplay en mobiele bediening.
* Google Street View-buitenwereld.
* Bus 200.
* In-game telefoon, geld, activiteiten en banen.
* Berlin Stamps, historische locaties en David Hasselhoff.
* Savegames en God Mode.

Status: ✅ Fundament aanwezig.

✅ Fase 1 — Technical Cleanup & Game State 2.0

Alle zeven technische stappen zijn geïmplementeerd.

* [x]	Centrale Game State.
* [x]	Eén save-formaat met migratie van oudere savegames.
* [x]	Eén portemonnee voor alle geldsystemen.
* [x]	Eén spelklok voor dagen, tijd en woning.
* [x]	Dubbele systemen voor telefoon, contacten, banen, God Mode en activiteiten opgeschoond.
* [x]	De 49 oude opstartmodules vervangen door één BootSequence.js.
* [x]	Eén centraal Tick-systeem voor timers, opstart-wachtlussen en gameframes.

Technische resultaten:

* Geen afzonderlijke oude Vercel-imports meer nodig voor de gamecode.
* 26 oude game-loop-wrappers vervangen.
* Timer-wekbeurten in de gemeten test teruggebracht van 454 naar 205 per tien seconden.
* Een bug waarbij inkomsten werden overschreven door andere geldsystemen is opgelost.
* De verschillende klokken en saveformaten zijn samengebracht.

Status: ✅ Technische uitvoering afgerond.

Open punten opgelost (commit 0423c01, 28 okt 2026): de Street View-opstartvolgorde (de stationsketen met trappen, tussenhallen en details laadt nu bij elke start), de nooit-startende Phase851Fix is uit de opstart, en de station- en Hinterhof-controles kloppen. Getest door de speler op iPhone/iPad: goedgekeurd. Praktijktests op iPhone/iPad blijven onderdeel van iedere releasecontrole.

⸻

HOOFDSTUK 2 — BERLIJN UITBREIDEN

Dit krijgt nu de hoogste ontwikkelprioriteit.

⬜ Fase 43 — U1 en U3

Eerst U1, daarna U3.

U1:

* Volledige route met alle stations.
* Authentieke Blender-modellen.
* Treinen in beide richtingen en correcte frequenties.
* Overstappen bij Wittenbergplatz (U2) en Kottbusser Tor (U8).
* Schlesisches Tor, Warschauer Straße en de omgeving van de Oberbaumbrücke.
* Uitgangen en Street View op ieder station.

U3:

* Het gedeelde tracé met U1 correct implementeren.
* Nieuwe stations richting Dahlem en Krumme Lanke.
* Verschillen tussen beide lijnen behouden.

Doel: Het bestaande netwerk voor het eerst substantieel uitbreiden.

⬜ Fase 44 — U5, U6 en U7

U5

* Alexanderplatz → Hauptbahnhof als eerste traject.
* Museumsinsel, Unter den Linden, Brandenburger Tor.
* Historische ontdekkingen en locaties.
* Daarna uitbreiding naar het volledige tracé.

U6

* Overstappen bij Stadtmitte.
* Friedrichstraße, Checkpoint Charlie en Tempelhof.
* Noord-zuidverbinding door de stad.

U7

* Overstappen op bestaande lijnen, waaronder Bismarckstraße en Hermannplatz.
* Lange, herkenbare route door verschillende stadsdelen.
* Nieuwe wijken en bestemmingen bereikbaar maken.

Iedere lijn wordt afzonderlijk gebouwd en getest.

⬜ Fase 45 — Tram en S-Bahn

* Selectieve uitbreiding van het OV-netwerk.
* Realistische overstappen.
* Eigen treintypes, haltes en geluiden.
* S-Bahn als verbinding tussen belangrijke stadsdelen.
* Trams met herkenbare bovengrondse routes.
* Bus 200 behouden en verder verbeteren.

🟡 Fase 46 — Berlin Graphics & Audio Upgrade — ⏭️ EERSTVOLGENDE STAP (graphics-deel vóór U1)

* Meer authentieke stationsdetails.
* Betere belichting, textures en materialen.
* BVG-geluiden en stationsaankondigingen.
* Dynamische stationsdecoratie.
* Meer variatie in reizigers.
* Optimalisatie voor iPhone en iPad.
* Betere laadschermen en modelstreaming.
* Geen terugkeer van oude glitchende modellen.

🟡 Fase 33 — Olympiastadion als bestemming

* Bereikbaar via de U2.
* Uitgebreide omgeving buiten het station.
* Activiteiten rond het stadion.
* Wedstrijdbezoek en historische ontdekkingen.

⬜ Fase 37 — Alte Försterei

* Stadion van Union Berlin.
* Bereikbaar via het uitgebreide OV-netwerk.
* Eerste voetbalactiviteiten.
* Eigen omgeving en herkenbare sfeer.

⸻

HOOFDSTUK 3 — EEN LEVENDE STAD

Als Berlijn groter is, moet het ook interessanter worden om rond te dwalen.

🟡 Fase 4 — Activity Discovery System

* Activiteiten ontdekken tijdens het reizen.
* Onbekende locaties blijven verborgen.
* Nieuwe plekken verschijnen bij het bereiken van stations.
* Späti’s, winkels, cafés, clubs en historische locaties.
* Persoonlijke ontdekkingsgeschiedenis.

🟡 Fase 5 — Street View 2.0 & World Bridge

* Eén stabiele Street View-interface.
* Soepele overgang tussen U-Bahn en buitenwereld.
* Correcte buitenposities.
* Activiteiten en interacties vanuit Street View.
* Altijd kunnen terugkeren naar het station.
* Betaalde Google Maps-API alleen bewust inschakelen, met kostenbeheersing.
* Geen dubbele overlays.

🟡 Fase 6 — Virtual Proximity

* Activiteiten verschijnen wanneer ze logisch bereikbaar zijn.
* Interacties zoals:
    * Ga naar binnen.
    * Praat.
    * Werk hier.
    * Bekijk.
    * Speel.
* Locatiegebonden interacties zonder voortdurende GPS-tracking.

🟡 Fase 7 — Hybrid Activities

Activiteiten ontwikkelen zich in niveaus:

1. Menu- en dialooginteracties.
2. Interactieve 2D-/360-gradenervaringen.
3. Volledige 3D-interieurs waar dat gameplaywaarde toevoegt.

🟡 Fase 15 — Berlin Knowledge

* Geschiedenis van Berlijn.
* DDR en Koude Oorlog.
* Architectuur.
* Muziek en clubcultuur.
* Voetbalgeschiedenis.
* U-Bahn- en S-Bahn-geschiedenis.
* Berlin Stamps met uitdagende vragen.
* Historische locaties met verhalen en ontdekkingen.

⬜ Fase 16 — City Memories & Story Collections

* Persoonlijk reisdagboek.
* Herinneringen aan bezochte plekken.
* Verhalen en ontdekkingen verzamelen.
* Zeldzame historische gebeurtenissen.

⬜ Fase 17 — Rumours & Secrets

* Verborgen locaties.
* Aanwijzingen via NPC’s.
* Geruchten over clubs en wijken.
* Geheime opdrachten en ontdekkingen.

🟡 Fase 18 — NPC Routines 2.0

* Reizigers hebben dagelijkse bestemmingen.
* NPC’s stappen in en uit treinen.
* Werknemers hebben diensten.
* Vaste personages hebben een eigen dagschema.
* Drukte verandert door tijdstip en locatie.
* Personages onthouden eerdere ontmoetingen.

⬜ Fase 31 — Dynamic Berlin

* Spitsuren en rustige nachten.
* Dynamische openingstijden.
* Nachtleven en evenementen.
* Veranderingen in het OV.
* Weer en omgevingsveranderingen.
* Verschillende sfeer per wijk.

⬜ Fase 42 — District Completion

* Wijkgebonden ontdekkingen.
* Unieke activiteiten.
* Verzamelde herinneringen.
* Verborgen gebeurtenissen.
* Geen verplicht afvinkspelletje: vrijheid blijft belangrijk.

⸻

HOOFDSTUK 4 — DAGELIJKS LEVEN EN ECONOMIE

🟡 Fase 2 — Time, Days & Calendar

* Eén klok is inmiddels aanwezig.
* Dag en weekdag in de telefoon.
* Openingstijden en werktijden.
* Nachtvervoer en nachtdiensten.
* Spitsuren.
* Keuze voor het definitieve speltempo.

Huidig technisch tempo: één spelminuut per echte seconde, dus 24 echte minuten per speldag. Het oorspronkelijke doel van 45–60 minuten per dag moet nog worden afgewogen.

🟡 Fase 3 — Economy Core

* Centrale portemonnee is aanwezig.
* Cash en bank.
* Salarissen en fooien.
* Huur en boodschappen.
* Pfand verzamelen.
* OV-kaartjes en boetes.
* Kosten voor uitgaan.
* Financiële keuzes met consequenties.

🟡 Fase 26 — Housing

* Startwoning/WG rond Rosa-Luxemburg-Platz.
* Slapen en tijd doorspoelen.
* Wekelijkse huur.
* Meubels en woningupgrades.
* Verhuizen naar betere appartementen.
* Verschillende wijken met eigen huurprijzen.

⬜ Fase 27 — Inventory & Possessions

* Kleding.
* Telefoon.
* Aangeschafte voorwerpen.
* Persoonlijke bezittingen.
* Spullen bewaren in de woning.

🟡 Fase 28 — Reputation & Districts

* Reputatie per sector.
* Vertrouwen bij NPC’s.
* Reputatie in verschillende wijken.
* Gevolgen voor banen, toegang en gesprekken.

⬜ Fase 29 — Grote financiële doelen

* Sparen voor een betere woning.
* Dure aankopen.
* Eigen bedrijf beginnen.
* Meer financiële vrijheid.

⬜ Fase 30 — Businesses

* Eigen Späti.
* Kleine ondernemingen.
* Voorraad en personeel.
* Inkomsten en uitgaven.
* Groei of faillissement.

🟡 Fase 32 — Ticket System 2.0

* OV-kaartjes.
* Tariefzones.
* Controleurs.
* Boetes bij zwartrijden.
* Gevolgen voor geld en reputatie.

🟡 Fase 19 — Relationships

* Contacten onderhouden.
* Vertrouwen opbouwen.
* Betekenisvolle gesprekken.
* Keuzes die relaties veranderen.
* Geen traditionele RPG-checklist.

⸻

HOOFDSTUK 5 — CARRIÈRES, VERHALEN EN NACHTLEVEN

Deze systemen krijgen hun grote uitbreiding nadat het OV-netwerk en de stad verder zijn ontwikkeld.

🟡 Fase 8 — First Weeks in Berlin

Een speelbare introductie tot het leven in Berlijn.

* Je begint in je woning.
* Je hebt geld nodig.
* Je ontdekt de buurt.
* Eerste Späti- en koeriersopdrachten.
* Je leert Miro, Deniz en Lea kennen.
* Je maakt kennis met het nachtleven.
* Je keuzes bepalen hoe je eerste weken verlopen.

⬜ Fase 9 — Narrative Bible

* Achtergrond van belangrijke NPC’s.
* Persoonlijkheden en motivaties.
* Geheimen en relaties.
* Consistente dialogen.
* Langlopende verhaallijnen.

🟡 Fase 10 — Career Core

* Werkgevers.
* Sollicitaties en diensten.
* Loon en fooien.
* XP en ervaring.
* Promoties en ontslag.
* Reputatie.
* Vaardigheden.

🟡 Fase 23 — Delivery Career

* Späti-bezorgingen.
* Langere koeriersroutes door Berlijn.
* Deadlines.
* Routekeuzes via het OV.
* Nachtkoerier.
* Fooien en reputatie.
* Moeilijkere opdrachten naarmate je doorgroeit.

🟡 Fase 21 — Späti Career & Pfand 2.0

* Werken in een Späti.
* Voorraad beheren.
* Bezorgingen.
* Klantcontact.
* Pfand verzamelen en inleveren.

🟡 Fase 11 — Bouncer Career

Carrière van beginnende portier tot exclusieve clubs.

* Start bij kleinere clubs, waaronder OST.
* Berghain als einddoel.
* ID-controle.
* Guestlists.
* Dronkenschap en agressie.
* Capaciteit.
* Lastige morele en praktische keuzes.
* Promoties op basis van prestaties en reputatie.

⬜ Fase 12 — Eerste volledige clubinterieur

* Eén authentiek clubinterieur.
* Dansvloer.
* Bar.
* Bezoekers.
* Geluid en belichting.
* NPC-interacties.

⬜ Fase 13 — Club Life System

Dezelfde club moet op verschillende manieren gebruikt kunnen worden:

* Bezoeker.
* Portier.
* Bartender.
* Promoter.
* DJ.

⬜ Fase 14 — Dance, Rhythm & DJ Gameplay

* DJ-minigames.
* Muziekprestaties.
* Interactie met publiek.
* Eigen muzikale vooruitgang.

⬜ Fase 22 — Bartender Career

* Bestellingen.
* Drukke shifts.
* Klantcontact.
* Fooien.
* Promotie.

⬜ Fase 24 — Promoter Career

* Evenementen organiseren.
* Contacten opbouwen.
* Tickets.
* Reputatie.
* Toegang tot exclusieve clubs.

⬜ Fase 25 — BVG Careers

* Werken voor het OV.
* Service en controle.
* Operationele taken.
* Reizen als onderdeel van het werk.

⬜ Fase 20 — Underworld Storyline

Optionele volwassen verhaallijn:

* Contacten met de Berlijnse onderwereld.
* Geheimzinnige opdrachten.
* Risico’s en beloningen.
* Politie en reputatie.
* Meerdere uitkomsten afhankelijk van keuzes.

⬜ Fase 39 — Contracts & Achievements

* Dagelijkse opdrachten.
* Wekelijkse contracten.
* Zeldzame beloningen.
* Langetermijnprogressie.

🟡 Fase 40 — Mission System 2.0

* Missies met voorwaarden.
* Vertakkende verhalen.
* Verschillende uitkomsten.
* Persistente gevolgen.
* Moeilijkere beslissingen.

⬜ Fase 41 — Career Storylines

* Verhalen bij werkgevers.
* Rivaliteit.
* Vriendschappen.
* Promoties.
* Werkconflicten.
* Keuzes die toekomstige kansen beïnvloeden.

⸻

HOOFDSTUK 6 — VOETBAL EN BIJZONDERE ERVARINGEN

⬜ Fase 34 — Olympiastadion Game Modes

* Wedstrijdbezoek.
* Evenementen.
* Stadionopdrachten.
* Rondleidingen.

⬜ Fase 35 — Stadium Seat Experience

* Beleving vanuit verschillende tribunes.
* Stadionsfeer.
* Publiek.
* Verschillende perspectieven.

⬜ Fase 36 — Historical Olympiastadion

Historische ervaringen rond:

* Olympische Spelen van 1936.
* WK 2006.
* Het hedendaagse stadion.

Met historische context en interactieve ontdekkingen.

⬜ Fase 38 — Football Life

* Hertha BSC.
* Union Berlin.
* Supporterscultuur.
* Wedstrijden en evenementen.
* Voetbalgerelateerde activiteiten.

⸻

HOOFDSTUK 7 — TOEKOMSTIGE GROTE UITBREIDINGEN

⬜ Fase 47 — Multi-City Engine

De gamearchitectuur geschikt maken voor meerdere steden.

⬜ Fase 48 — Amsterdam

Een tweede volledig herkenbare stad met eigen vervoer, wijken en activiteiten.

⬜ Fase 49 — Intercity Progression

Reizen tussen steden, verblijven en nieuwe mogelijkheden ontdekken.

⬜ Fase 50 — More Cities

Nieuwe steden met eigen identiteit, geschiedenis en systemen.

⬜ Fase 51 — Standalone / Unreal Evaluation

Onderzoeken of een zelfstandige game-engine zinvol wordt.

⬜ Fase 52 — Multiplayer Foundation

Een technische basis ontwikkelen voor multiplayer, zonder de singleplayer-game te beschadigen.

⬜ Fase 53 — Multiplayer Multi-City

Samen reizen, werken en leven in verschillende steden.

⸻

DE CONCRETE VOLGENDE MIJLPALEN

Mijlpaal 0 — Graphics-upgrade (Fase 46, graphics-deel) ⏭️ NU

Berlin Life moet er minstens zo goed uitzien als Gods Are Made Not Born, met behoud van alle BVG-elementen (gele treinen, U2-rood en U8-blauw, stationstegels, borden, perronindeling). Eerst nu, zodat U1 en latere lijnen direct op de nieuwe grafische basis gebouwd worden.

* G1 — Prestaties: dure frame-hooks lichter maken (Phase910V1, Phase1315V1, Phase125TexturesV2, GfxV3), zodat er ruimte is op iPhone/iPad.
* G2 — Rendering-basis: tone mapping, kleurruimte, belichting, schaduw/ambient occlusion, mist en één centrale kwaliteitsinstelling voor iPhone/iPad.
* G3 — Stations en treinen: materialen en textures.
* G4 — Straat en buiten. ✅ (29 okt 2026) 3D-omgeving bij de zeven buitenstations uit OpenStreetMap (© OpenStreetMap-bijdragers): gebouwen met Berlijnse gevels en 's avonds verlichte ramen, wegen, parken, bomen, eigen viaduct; U1-bovenhal Gleisdreieck, koepel Nollendorfplatz, Fernsehturm en Olympiastadion in de verte. Laadt alleen bij het station (`src/state/Surroundings.js`, pakketten in `public/assets/surroundings/`).

Elke stap apart als preview, met vóór/na-screenshots. Audio (BVG-geluiden, aankondigingen) volgt later binnen Fase 46.

Mijlpaal 1 — U1 volledig bouwen

De eerstvolgende grote gameplay-uitbreiding.

Een volledige U1 met stations, treinen, overstappen, Blender-modellen, Street View en ontdekkingen.

Pas na een succesvolle test doorgaan.

Mijlpaal 2 — U3 toevoegen

De U3 laten aansluiten op het bestaande netwerk en het gedeelde U1/U3-traject correct implementeren.

Mijlpaal 3 — U5 uitbreiden

Begin bij Alexanderplatz richting Hauptbahnhof, met historische haltes zoals Museumsinsel en Brandenburger Tor. Daarna verdere uitbreiding.

Mijlpaal 4 — U6 en U7

Nieuwe stadsdelen en belangrijke overstapstations speelbaar maken.

Mijlpaal 5 — Berlin Discovery uitbreiden

Nieuwe stations krijgen eigen activiteiten, ontdekkingen, historische verhalen en interessante bestemmingen.

Mijlpaal 6 — De levende stad

NPC-routines, openingstijden, spitsuren, geld, huur en activiteiten laten samenwerken met het grotere OV-netwerk.

Mijlpaal 7 — Carrières en verhaal

De volledige koeriers-, Späti- en portierscarrières ontwikkelen, gevolgd door clubs, relaties, keuzes en verhaallijnen.

⸻

BLIJVENDE KWALITEITSREGELS

1. GitHub is de enige broncodebasis. Vercel wordt gebruikt voor previews en productie, niet voor losse codeketens.
2. Elke nieuwe metrolijn moet volledig functioneren. Stations, modellen, treinen, overstappen, uitgangen en Street View horen bij elkaar.
3. Geen regressies. De bestaande U2, U8, Blender-modellen, savegames en Street View mogen niet kapotgaan door nieuwe uitbreidingen.
4. Eén interface per functie. Geen dubbele knoppen, menu’s of overlays.
5. iPhone en iPad eerst. Prestaties, touchbediening en geheugengebruik zijn doorslaggevend.
6. Google Maps-kosten beheersen. De programmeerbare Street View-API mag geen onverwachte kosten veroorzaken; bij een absolute nul-kosteneis moet de betaalde API uit blijven.
7. Elke uitbreiding eerst als preview. De productieversie wordt uitsluitend aangepast na expliciete toestemming.
8. Vrijheid en consequenties. Berlin Life moet geen verzameling oppervlakkige minigames worden. De stad, personages en gameplay moeten met elkaar samenhangen.

⸻

EINDVISIE

Berlin Life moet uitgroeien tot een grote, levende simulatie van Berlijn.

Je begint als iemand die een nieuw leven opbouwt in de stad. Je reist met de U-Bahn, ontdekt wijken, ontmoet mensen, verdient geld, gaat uit, bezoekt voetbalwedstrijden en raakt betrokken bij verschillende verhalen.

Er is geen verplicht pad: je kunt koerier worden, het nachtleven induiken, historische locaties verkennen, een onderneming beginnen of gewoon door de stad dwalen.

De keuzes die je maakt bepalen hoe jouw leven in Berlijn zich ontwikkelt.

Eerst bouwen we de stad. Daarna bouwen we het leven erin.