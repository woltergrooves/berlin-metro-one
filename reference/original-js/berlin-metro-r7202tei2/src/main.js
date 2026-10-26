const BASE='https://berlin-metro-ndq0ojsm8-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/LegacyJobMigrationV1.js').catch(e=>console.error('[Metro] Legacy job migration disabled',e));
import('./systems/MissionResultV1.js').catch(e=>console.error('[Metro] Mission result disabled',e));
