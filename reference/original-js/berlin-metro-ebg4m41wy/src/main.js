const BASE='https://berlin-metro-51ob9j3tv-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/U8RideFeelV5.js').catch(e=>console.error('[Metro] U8 ride feel V5 disabled',e));
