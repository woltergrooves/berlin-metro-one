const BASE='https://berlin-metro-4g0o5gxh3-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/GfxV3.js').catch(e=>console.error('[Metro] GfxV3 disabled',e));
import('./systems/InspectorGodV3.js').catch(e=>console.error('[Metro] InspectorGodV3 disabled',e));
import('./systems/Phase16V1.js').catch(e=>console.error('[Metro] Phase16V1 disabled',e));
