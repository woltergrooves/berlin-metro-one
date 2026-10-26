const berlinStartButton=document.getElementById('startButton');
if(berlinStartButton){berlinStartButton.disabled=true;berlinStartButton.textContent='Berlijn laden…';}
void import('../systems/BlenderStationsV1.js').catch(e => console.warn('[Berlin Life] Stationmodel kan niet laden',e));
void import('../systems/BlenderTrainsV1.js').catch(e => console.warn('[Berlin Life] Treinmodel kan niet laden',e));
await import('../systems/BlenderNPCsV1.js').catch(e=>console.error('[Berlin Life] NPC pipeline',e));
await import('../systems/BlenderPropsV1.js').catch(e=>console.error('[Berlin Life] Prop pipeline',e));
await import('../systems/SafeSaveBootstrapV1.js');
await import('./main.75jhoi1x8.js');
if(berlinStartButton){berlinStartButton.disabled=false;berlinStartButton.textContent='Start';berlinStartButton.dataset.coreReady='true';}
window.BerlinCoreReady=true;
await import('../systems/LegacyStreetDisabled.js').catch(e=>console.error('[Berlin Life] Discovery Location Stability V4',e));
await import('../systems/U8CarriagePolishV3.js').catch(e=>console.error('[Berlin Life] U8 Train',e));
await import('../systems/LegacyStreetDisabled.js').catch(e=>console.error('[Berlin Life] Station Travel Stable',e));
await import('../systems/Phase7HybridActivitiesV6.js').catch(e=>console.error('[Berlin Life] Hybrid Activities',e));
await import('../systems/LegacyStreetDisabled.js').catch(e=>console.error('[Berlin Life] Phase 1 Integrity',e));
await import('../systems/LegacyStreetDisabled.js').catch(e=>console.error('[Berlin Life] Waypoint V3',e));
window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),currentPhase:7.9,stability:'Phase 5–6 arrival, waypoint, fallback',safeSave:true,phaseAudit:3,virtualProximity:3};
window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),blenderTrains:1};

window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),blenderStations:1};

window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),release:'fixed-20261019',blenderModels:true};

window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),visualPipeline:'GLB_only_v3',actorsGLB:true,propsGLB:true};

window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),currentPhase:7.10,hybridActivities:6};
