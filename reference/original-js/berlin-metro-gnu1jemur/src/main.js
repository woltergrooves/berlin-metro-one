const BASE='https://berlin-metro-96xn5s7u4-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/StationLifeVisualV72.js').catch(e=>console.error('[Metro] Station detail V7.2 disabled',e));
