const BASE='https://berlin-metro-dc1yo16pm-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase125GraphicsV1.js').catch(e=>console.error('[Metro] Phase 12.5 disabled',e));
