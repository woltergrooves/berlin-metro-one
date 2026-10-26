await import('https://berlin-metro-i5sfnq551-wolter1.vercel.app/src/main.js');
await import('./systems/HudMenuGuardV1.js').catch(e=>console.error('[Berlin Life] HUD menu guard',e));
await import('./systems/CrossSystemStationConsistencyV1.js').catch(e=>console.error('[Berlin Life] station consistency',e));
await import('./systems/WorldBridgeV1.js').catch(e=>console.error('[Berlin Life] World Bridge',e));
console.info('[Berlin Life] HUD menu cleanup + Phase 5 World Bridge');
