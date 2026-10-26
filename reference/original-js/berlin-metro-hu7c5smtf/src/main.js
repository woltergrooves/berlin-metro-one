const BASE='https://berlin-metro-k29l5ks2w-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase16StationLifeV5.js').catch(e=>console.error('[Metro] Station Life V5 disabled',e));
import('./systems/GuideV1.js').catch(e=>console.error('[Metro] Guide V1 disabled',e));