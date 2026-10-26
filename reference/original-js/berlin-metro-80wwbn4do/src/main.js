const BASE='https://berlin-metro-dbfqoj76f-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/GodMenuMobileFixV4.js').catch(e=>console.error('[Metro] God mobile fix disabled',e));
import('./systems/Phase16V2.js').catch(e=>console.error('[Metro] Phase16 V2 disabled',e));
