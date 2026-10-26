const BASE='https://berlin-metro-3nwgpo9ua-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase16UXFixV1.js').catch(e=>console.error('[Metro] Phase16 UX fix disabled',e));
import('./systems/ContactsV2.js').catch(e=>console.error('[Metro] Contacts V2 disabled',e));
import('./systems/PhoneV2.js').catch(e=>console.error('[Metro] Phone V2 disabled',e));
