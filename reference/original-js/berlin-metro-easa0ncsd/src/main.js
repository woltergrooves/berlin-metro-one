const BASE='https://berlin-metro-m93m0ycyh-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase845V1.js').catch(e=>console.error('[Metro] Phase 8.4/8.5 disabled',e));
