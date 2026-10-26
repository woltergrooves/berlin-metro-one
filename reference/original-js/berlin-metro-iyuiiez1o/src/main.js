const BASE='https://berlin-metro-5fbdia3si-wolter1.vercel.app/src/main.js';
await import(BASE);
await import('./systems/AllStationStreetViewV41.js').catch(e=>console.error('[Metro] all-station Street View V4.1 disabled',e));
import('https://berlin-metro-lssqb42aq-wolter1.vercel.app/src/systems/AlexanderStairSeamFixV2.js').catch(e=>console.error('[Metro] stair seam V2 disabled',e));
