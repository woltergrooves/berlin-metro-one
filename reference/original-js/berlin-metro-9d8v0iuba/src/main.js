const BASE='https://berlin-metro-7hkq0xl5j-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase823V1.js').catch(e=>console.error('[Metro] Phase 8.2/8.3 disabled',e));
