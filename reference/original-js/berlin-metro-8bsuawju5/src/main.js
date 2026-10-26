const BASE='https://berlin-metro-gnu1jemur-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase67RestoreV2.js').catch(e=>console.error('[Metro] Phase 6/7 restore disabled',e));
