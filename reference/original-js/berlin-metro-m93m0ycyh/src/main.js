const BASE='https://berlin-metro-9d8v0iuba-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/U8AlexanderDetailV1.js').catch(e=>console.error('[Metro] U8/Alexander detail disabled',e));
