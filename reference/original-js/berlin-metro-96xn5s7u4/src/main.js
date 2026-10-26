const BASE='https://berlin-metro-iyuiiez1o-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/UniversalStationExitV5.js').catch(e=>console.error('[Metro] universal station exits V5 disabled',e));
