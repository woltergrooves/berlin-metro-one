await import('https://berlin-metro-q1ib777cs-wolter1.vercel.app/src/main.js');
await import('./systems/RuntimeCleanupV1.js').catch(e=>console.error('[Berlin Life] runtime cleanup',e));
await import('./systems/StreetViewUnifiedOverlayV1.js').catch(e=>console.error('[Berlin Life] unified Street View overlay',e));
window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),currentPhase:5.3,name:'Unified Street View cleanup'};
console.info('[Berlin Life] clean API base + unified Street View overlay');
