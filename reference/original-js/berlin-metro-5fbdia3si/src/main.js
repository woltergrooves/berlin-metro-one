const BASE='https://berlin-metro-drrsth0cd-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/GoogleStreetViewExteriorV31.js').catch(e=>console.error('[Metro] Google Street View exterior V3.1 disabled',e));
