const BASE='https://berlin-metro-6b2olg53o-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase16StabilityV2.js').catch(e=>console.error('[Metro] Phase16 stability V2 disabled',e));
