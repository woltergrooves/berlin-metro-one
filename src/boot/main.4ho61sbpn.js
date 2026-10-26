
await import('./main.core.js');
import('../systems/U8CentralVisual.js').catch(e=>console.error('[Metro] central visuals disabled',e));
import('../systems/U8CentralCrowd.js').catch(e=>console.error('[Metro] U8 crowds disabled',e));
