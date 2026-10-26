const BASE='https://berlin-metro-hu7c5smtf-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/Phase161JobsV2.js').catch(e=>console.error('[Metro] Jobs V2 disabled',e));
import('./systems/CleanHudV1.js').catch(e=>console.error('[Metro] Clean HUD disabled',e));
import('./systems/GuideV2.js').catch(e=>console.error('[Metro] Guide V2 disabled',e));
