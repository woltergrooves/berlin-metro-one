const STABLE='https://berlin-metro-ej5lkfsom-wolter1.vercel.app/src/main.js';
await import(STABLE);
import('./systems/StreetOverlayReliableV1.js').catch(e=>console.error('[Metro] reliable street overlay disabled',e));
