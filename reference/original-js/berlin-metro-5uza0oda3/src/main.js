const BASE='https://berlin-metro-4ho61sbpn-wolter1.vercel.app/src/main.js';
await import(BASE);
await import('https://berlin-metro-idr71b3br-wolter1.vercel.app/src/systems/U8OuterVisuals.js').catch(e=>console.error('[Metro] outer visuals disabled',e));
await import('https://berlin-metro-pzwase4dd-wolter1.vercel.app/src/systems/U8PassengerFlowV2.js').catch(e=>console.error('[Metro] U8 NPC V2 disabled',e));
import('./systems/U8InteriorV2.js').catch(e=>console.error('[Metro] U8 interior V2 disabled',e));
import('./systems/U8AudioV2.js').catch(e=>console.error('[Metro] U8 audio V2 disabled',e));
import('./systems/U8DynamicInfo.js').catch(e=>console.error('[Metro] U8 dynamic info disabled',e));
