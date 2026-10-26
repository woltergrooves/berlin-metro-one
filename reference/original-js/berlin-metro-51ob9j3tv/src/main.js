const BASE='https://berlin-metro-euqr6g23c-wolter1.vercel.app/src/main.js';
await import(BASE);
import('./systems/U8ExitFixV4.js').catch(e=>console.error('[Metro] U8 exit fix disabled',e));
import('./systems/U8DoorFlowPolish.js').catch(e=>console.error('[Metro] U8 door flow polish disabled',e));
