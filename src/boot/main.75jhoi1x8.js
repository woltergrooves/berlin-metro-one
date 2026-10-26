await import('./main.q1ib777cs.js');
await import('../systems/RuntimeCleanupV1.js').catch(e=>console.error('[Berlin Life] runtime cleanup',e));
await import('../systems/LegacyStreetDisabled.js').catch(e=>console.error('[Berlin Life] unified Street View overlay',e));
window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),currentPhase:5.3,name:'Unified Street View cleanup'};
console.info('[Berlin Life] clean API base + unified Street View overlay');
