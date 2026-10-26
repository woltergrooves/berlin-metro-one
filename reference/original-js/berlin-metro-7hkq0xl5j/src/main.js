const BASE='https://berlin-metro-8bsuawju5-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase8ArchetypesV1.js').catch(e=>console.error('[Metro] Phase 8.1 disabled',e));
