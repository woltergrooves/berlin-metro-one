const STABLE='https://berlin-metro-core-wolter1.vercel.app/src/main.js';
await import(STABLE);
import('./systems/U8CentralVisual.js').catch(e=>console.error('[Metro] central visuals disabled',e));
import('./systems/U8CentralCrowd.js').catch(e=>console.error('[Metro] U8 crowds disabled',e));
