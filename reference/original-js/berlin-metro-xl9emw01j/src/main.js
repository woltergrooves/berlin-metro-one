const BASE='https://berlin-metro-80wwbn4do-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase16V3Hotspots.js').catch(e=>console.error('[Metro] Phase16 V3 disabled',e));
