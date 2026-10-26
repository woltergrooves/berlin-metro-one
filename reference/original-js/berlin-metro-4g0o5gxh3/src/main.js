const BASE='https://berlin-metro-pwanwxj7e-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase125TexturesV2.js').catch(e=>console.error('[Metro] textured graphics disabled',e));
import('./systems/Phase1315V1.js').catch(e=>console.error('[Metro] phases 13-15 disabled',e));
