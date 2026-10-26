const SELECTORS=['#cpv2.open','#bc-overlay.open','#sdv2-modal.open','#p34-economy.open','#p34-discovery.open','#pcv5.open'];
const style=document.createElement('style');style.id='hud-menu-guard-v1';style.textContent=`html.bl-menu-open #hud .topbar-left{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transform:translateY(-6px)!important}#hud .topbar-left{transition:opacity .14s ease,transform .14s ease}`;document.head.appendChild(style);
function visible(el){if(!el)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'}
function sync(){const open=SELECTORS.some(sel=>{const el=document.querySelector(sel);return visible(el)});document.documentElement.classList.toggle('bl-menu-open',open);return open}
const observer=new MutationObserver(sync);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden']});
document.addEventListener('click',()=>queueMicrotask(sync),true);window.addEventListener('berlinlife:career-v2-ready',sync);setInterval(sync,700);sync();
window.BerlinHudMenuGuard={version:1,sync,selectors:[...SELECTORS]};
