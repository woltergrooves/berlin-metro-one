
await import('./main.4ho61sbpn.js');
await import('../systems/U8OuterVisuals.js').catch(e=>console.error('[Metro] outer visuals disabled',e));
await import('../systems/U8PassengerFlowV2.js').catch(e=>console.error('[Metro] U8 NPC V2 disabled',e));
import('../systems/U8InteriorV2.js').catch(e=>console.error('[Metro] U8 interior V2 disabled',e));
import('../systems/U8AudioV2.js').catch(e=>console.error('[Metro] U8 audio V2 disabled',e));
import('../systems/U8DynamicInfo.js').catch(e=>console.error('[Metro] U8 dynamic info disabled',e));
