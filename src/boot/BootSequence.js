// Berlin Life — opstartvolgorde (Fase 1, stap 6)
//
// Dit ene bestand vervangt de oude keten van 49 `src/boot/main.<hash>.js`-bestanden die elkaar
// één voor één inlaadden. De volgorde hieronder is exact die van de oude keten (van binnen naar
// buiten uitgevouwen), zodat elk systeem nog steeds op hetzelfde moment laadt.
//
// Drie soorten regels — laat dat onderscheid staan, de volgorde/timing hangt ervan af:
//   await import(x)                 → laden en wachten tot het klaar is (verplicht; fout = opstart stopt)
//   await import(x).catch(log)      → laden en wachten; bij een fout gaat de opstart door
//   import(x).catch(log)            → alleen starten, niet wachten (laadt op de achtergrond verder)
//
// Weggelaten (deden niets): 6× `LegacyStreetDisabled.js` (leeg bestand) en 4 stubs in
// `src/missing/` die alleen een fout gooiden die meteen werd genegeerd.

const log = label => e => console.error(`[Metro] ${label} disabled`, e);
const logLife = label => e => console.error(`[Berlin Life] ${label}`, e);

// ── 1. Startknop vergrendelen, GLB-modellen, veilige save-basis ─────────────────────────────
const berlinStartButton = document.getElementById('startButton');
if (berlinStartButton) { berlinStartButton.disabled = true; berlinStartButton.textContent = 'Berlijn laden…'; }
void import('../systems/BlenderStationsV1.js').catch(e => console.warn('[Berlin Life] Stationmodel kan niet laden', e));
void import('../systems/BlenderTrainsV1.js').catch(e => console.warn('[Berlin Life] Treinmodel kan niet laden', e));
await import('../systems/BlenderNPCsV1.js').catch(logLife('NPC pipeline'));
await import('../systems/BlenderPropsV1.js').catch(logLife('Prop pipeline'));
await import('../systems/SafeSaveBootstrapV1.js');

// ── 2. Save-keuze, portemonnee en klok (Game State 2.0 stap 3 + 4) ──────────────────────────
await import('../systems/SaveSlotBootV1.js');
await import('../state/Wallet.js');
await import('../state/Clock.js');

// ── 3. Kern: stations, treinen, NPC's, audio, Alexanderplatz; Game + HUD + startknop ────────
await import('../world/StationVisualPatch.js');
await import('../world/KlosterSignPatch.js');
await import('../world/TrainVisualPatch.js');
await import('../systems/TrainRidePatch.js');
await import('../systems/MobilePerfPatch.js');
await import('../systems/NpcPatch.js');
await import('../systems/AudioPatch.js');
await import('../systems/AtmospherePatch.js');
await import('../systems/TrainPolishV2.js');
await import('../systems/AudioQuietPatch.js');
await import('../world/AlexanderplatzUpgrade.js');
await import('../world/AlexanderConcourse.js');
await import('../world/U8Alexanderplatz.js');
await import('../systems/PlayerConcoursePatch.js');
await import('../world/AlexanderTransitionFix.js');
await import('../systems/AlexanderTransferOverlay.js');
await import('../world/AlexanderHub.js');            // Alexanderplatz: enige eigenaar van trap, hal, gang en uitgang

const [{ Game }, { Hud }] = await Promise.all([import('../core/Game.js'), import('../ui/Hud.js')]);
const boot = document.querySelector('#boot');
const startButton = document.querySelector('#startButton');
const hud = new Hud();
let game = null;

async function installOptionalFullU8() {
  try {
    const mod = await import('../systems/U8FullLineSafe.js');
    await mod.installU8FullLine?.(game, hud);
  } catch (error) {
    console.error('[Metro] Full U8 disabled:', error);
    hud.notify?.('Volledige U8 kon niet laden · basisgame blijft actief.');
  }
}

function launch() {
  if (game) return;
  boot.classList.add('hidden');
  hud.show();
  game = new Game(document.querySelector('#app'), {
    leftZone: document.querySelector('#leftZone'),
    rightZone: document.querySelector('#rightZone'),
    stickBase: document.querySelector('#stickBase'),
    stickKnob: document.querySelector('#stickKnob'),
    interactButton: hud.interactButton,
    onTrainStatus: (train, text) => hud.onTrainStatus(train, text),
    updatePlayer: (player, trains, stations) => hud.updatePlayer(player, trains, stations),
    updateEconomy: state => hud.updateEconomy(state),
    onInteractionFocus: interaction => hud.onInteractionFocus(interaction),
    notify: text => hud.notify(text),
  });
  game.start();
  installOptionalFullU8();
}
startButton.addEventListener('click', launch, { once: true });

// ── 4. U8-lijn: visuals, reizigers, interieur, borden, deuren, tunnel ───────────────────────
import('../systems/U8CentralVisual.js').catch(log('central visuals'));
import('../systems/U8CentralCrowd.js').catch(log('U8 crowds'));
await import('../systems/U8OuterVisuals.js').catch(log('outer visuals'));
await import('../systems/U8PassengerFlowV2.js').catch(log('U8 NPC V2'));
import('../systems/U8InteriorV2.js').catch(log('U8 interior V2'));
import('../systems/U8AudioV2.js').catch(log('U8 audio V2'));
import('../systems/U8DynamicInfo.js').catch(log('U8 dynamic info'));
import('../systems/U8SignageFixV3.js').catch(log('signage fix'));
import('../systems/U8DynamicInfoV3.js').catch(log('U8 dynamic info V3'));
import('../systems/U8DepartureBoards.js').catch(log('U8 departure boards'));
import('../systems/U8StartBridge.js').catch(log('U8 exit fix'));
import('../systems/U8DoorFlowPolish.js').catch(log('U8 door flow polish'));
import('../systems/U8LegacyTimingDisabled.js').catch(log('U8 ride feel V5'));
import('../systems/U8LineOfSightV6.js').catch(log('U8 sightline V6'));
import('../systems/U8TunnelDetailV1.js').catch(log('U8 tunnel detail'));

// ── 4b. Nieuwe lijnen (Mijlpaal 1): U1 — eigen gebied, eigen beweging/HUD (src/lines/) ─────
import('../lines/U1Line.js').catch(log('U1'));

// ── 5. Straat, stationsuitgangen, fases 6–16 (achtergrond) ─────────────────────────────────
await import('../systems/StreetCoreClean.js').catch(log('all-station Street View V4.1'));
import('../systems/AlexanderStairSeamFixV2.js').catch(log('stair seam V2'));
import('../systems/UniversalStationExitV5.js').catch(log('universal station exits V5'));
import('../systems/StationLifeVisualV72.js').catch(log('Station detail V7.2'));
import('../systems/Phase67RestoreV2.js').catch(log('Phase 6/7 restore'));
import('../systems/Phase8ArchetypesV1.js').catch(log('Phase 8.1'));
import('../systems/Phase823V1.js').catch(log('Phase 8.2/8.3'));
import('../systems/U8AlexanderDetailV1.js').catch(log('U8/Alexander detail'));
// Phase 8.4/8.5 en 8.5.1 waren nooit actief (syntaxfout; 8.5.1 wachtte 60 s op V8.5) — zie docs/inactive-in-live-game/
import('../systems/Phase910V1.js').catch(log('Phase 9/10'));
import('../systems/Phase11V1.js').catch(log('Phase 11'));
import('../systems/Phase12FixV2.js').catch(log('Phase12FixV2'));
import('../systems/Phase125GraphicsV1.js').catch(log('Phase 12.5'));
import('../systems/Phase125TexturesV2.js').catch(log('textured graphics'));
import('../systems/Phase1315V1.js').catch(log('phases 13-15'));
import('../systems/GfxV3.js').catch(log('GfxV3'));
import('../systems/InspectorGodV3.js').catch(log('InspectorGodV3'));
import('../systems/GodMenuMobileFixV4.js').catch(log('God mobile fix'));
import('../systems/Phase16V3Hotspots.js').catch(log('Phase16 V3'));
import('../systems/Phase16GeoCommerceV4.js').catch(log('Geo commerce V4'));
import('../systems/InspectorSpawnFixV4.js').catch(log('Inspector spawn fix V4'));
import('../systems/Phase162HomeV1.js').catch(log('Phase 16.2 home'));
import('../systems/Phase16StationLifeV5.js').catch(log('Station Life V5'));
import('../systems/DeliveryJobs.js').catch(log('Jobs V2'));
import('../systems/CleanHudV1.js').catch(log('Clean HUD'));
import('../systems/LegacyJobMigrationV1.js').catch(log('Legacy job migration'));
import('../systems/MissionResultV1.js').catch(log('Mission result'));
import('../systems/HomeUpgradesV1.js').catch(log('Home upgrades V1'));
import('../systems/Phase16UXFixV1.js').catch(log('Phase16 UX fix'));
import('../systems/Contacts.js').catch(log('Contacts'));
import('../systems/Phone.js').catch(log('Phone'));
import('../systems/Phase16StabilityV2.js').catch(log('Phase16 stability V2'));
console.info('[Metro] Stable Street View rollback loaded');

// ── 6. Stadsleven: gesprekken, missies, highlights ──────────────────────────────────────────
await import('../systems/ConversationCoreV4.js');
await import('../systems/AlexanderStairFoot.js');
await import('../systems/LivingCityActions.js');
await import('../systems/SurfaceTransport.js');
await import('../systems/HasselhoffNpcV2.js');
await import('../systems/U8Bootstrap.js');
await import('../systems/CityMissions.js');
await import('../systems/VisualPolishV3.js');
await import('../systems/BerlinHighlightsV1.js');
await import('../systems/HighlightExperienceV2.js');
console.info('[Metro] Clean Street View recovery base: pre-teleport');

// ── 7. Berlin Life-kern: NPC-visuals, carrière, discovery, wereldbrug, Street View 2.0 ──────
await import('../systems/NpcVisualUpgradeV1.js');
console.info('[Berlin Life] stable Street View + NPC visual restore v1');
await import('../systems/BerlinLifeCoreV1.js');
await import('../systems/BouncerCareerV1.js');
await import('../systems/Phase34CoreV1.js');
console.info('[Berlin Life] stable Street View + NPC visuals + isolated phases 3/4');
await import('../systems/CareerEntryGuardV1.js');
console.info('[Berlin Life] Phase 3/4 preview with discovery-only career entry');
await import('../systems/RegistryClean.js');
console.info('[Berlin Life] station-bound Discovery v2 loaded');
await import('../systems/DiscoveryCouplingFixV1.js');
console.info('[Berlin Life] station-bound Discovery + economy coupling complete');
await import('../systems/HudMenuGuardV1.js').catch(logLife('HUD menu guard'));
await import('../systems/CrossSystemStationConsistencyV1.js').catch(logLife('station consistency'));
await import('../systems/BridgeClean.js').catch(logLife('World Bridge'));
console.info('[Berlin Life] HUD menu cleanup + Phase 5 World Bridge');
await import('../systems/HinterhofMoritzplatzV1.js').catch(logLife('Hinterhof relocation'));
console.info('[Berlin Life] Hinterhof relocated to Moritzplatz');
await import('../systems/ProgrammableStreetViewV2.js').catch(logLife('Street View 2.0'));
console.info('[Berlin Life] Phase 5 programmable Street View bootstrap loaded');
await import('../systems/RuntimeCleanupV1.js').catch(logLife('runtime cleanup'));
window.BerlinBuildStatus = { ...(window.BerlinBuildStatus || {}), currentPhase: 5.3, name: 'Unified Street View cleanup' };
console.info('[Berlin Life] clean API base + unified Street View overlay');

// ── 8. Kern klaar: startknop vrijgeven ──────────────────────────────────────────────────────
if (berlinStartButton) { berlinStartButton.disabled = false; berlinStartButton.textContent = 'Start'; berlinStartButton.dataset.coreReady = 'true'; }
window.BerlinCoreReady = true;

// ── 9. Na de startknop: treinwagon, activiteiten, fundamenten ───────────────────────────────
await import('../systems/U8CarriagePolishV3.js').catch(logLife('U8 Train'));
await import('../systems/Phase7HybridActivitiesV6.js').catch(logLife('Hybrid Activities'));
window.BerlinBuildStatus = {
  ...(window.BerlinBuildStatus || {}),
  currentPhase: 7.10,
  stability: 'Phase 5–6 arrival, waypoint, fallback',
  safeSave: true, phaseAudit: 3, virtualProximity: 3,
  blenderTrains: 1, blenderStations: 1,
  release: 'fixed-20261019', blenderModels: true,
  visualPipeline: 'GLB_only_v3', actorsGLB: true, propsGLB: true,
  hybridActivities: 6,
};
await import('../systems/Phase16Foundations.js');

// ── 10. Stadssystemen en centrale Game State (laatste) ─────────────────────────────────────
await import('../systems/CityClean.js');
await import('../systems/UiClean.js');
import('../street/StreetScreen.js').catch(log('StreetScreen'));
await import('../systems/CityEpisodesV1.js');
await import('../systems/CityFlowV3.js');
await import('../state/GameState.js'); // Game State 2.0 stap 1: alleen lezen, laadt na alle systemen
