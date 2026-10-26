const BASE='https://berlin-metro-r7202tei2-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/ContactsV1.js').catch(e=>console.error('[Metro] Contacts V1 disabled',e));
import('./systems/HomeUpgradesV1.js').catch(e=>console.error('[Metro] Home upgrades V1 disabled',e));
import('./systems/PhoneV1.js').catch(e=>console.error('[Metro] Phone V1 disabled',e));
