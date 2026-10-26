const BASE='https://berlin-metro-ebg4m41wy-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/U8LineOfSightV6.js').catch(e=>console.error('[Metro] U8 sightline V6 disabled',e));
import('./systems/U8TunnelDetailV1.js').catch(e=>console.error('[Metro] U8 tunnel detail disabled',e));
