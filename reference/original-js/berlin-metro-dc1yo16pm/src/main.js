const BASE='https://berlin-metro-k2j5g568z-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase12FixV2.js').catch(e=>console.error('[Metro] Phase12FixV2 disabled',e));
import('./systems/GodMenuV2.js').catch(e=>console.error('[Metro] GodMenuV2 disabled',e));
