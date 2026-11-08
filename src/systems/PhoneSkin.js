// Berlin Life — telefoon als echte smartphone (8 nov 2026). Enige eigenaar van het UITERLIJK van de telefoon.
// Phone.js blijft eigenaar van de inhoud (tabs Home/Jobs/Netz/Chats/Plekken), CityPhone.js van de tab "Stad".
// Deze laag: toestelframe met Dynamic Island, statusbalk, beginscherm met widgets en app-iconen, app-kopregel met
// terugknop en een home-balk. De oude tabbalk (#phoneNavV2) blijft bestaan maar is verborgen: een app-icoon klikt de
// bijbehorende tabknop aan, zodat alle bestaande logica (ook CityPhone) ongewijzigd werkt.
import { Tick } from '../state/Tick.js';

const APPS = [
  { tab: 'home', name: 'Thuis', icon: '🏠', bg: 'linear-gradient(160deg,#ffb347,#ff7a2f)' },
  { tab: 'jobs', name: 'Jobs', icon: '📦', bg: 'linear-gradient(160deg,#ffd75e,#e9a400)' },
  { tab: 'map', name: 'BVG', icon: '🚇', bg: 'linear-gradient(160deg,#f5d000,#e3b700)', text: '#1a1a1a' },
  { tab: 'contacts', name: 'Chats', icon: '💬', bg: 'linear-gradient(160deg,#5ef08a,#21b85a)', badge: true },
  { tab: 'places', name: 'Plekken', icon: '📍', bg: 'linear-gradient(160deg,#ff6b6b,#d63031)' },
  { tab: 'city', name: 'Stad', icon: '🌙', bg: 'linear-gradient(160deg,#6c7cff,#3a3fbf)', city: true },
];
const DOCK = ['contacts', 'map', 'jobs'];   // dock onderin; de rest staat op het beginscherm

const CSS = `
#phoneModalV2{background:radial-gradient(ellipse at center,#000a,#000d)!important;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
#phoneModalV2.bl-on>.bl-device{animation:blPhoneIn .28s cubic-bezier(.2,.9,.3,1.15)}
@keyframes blPhoneIn{from{transform:translateY(40px) scale(.94);opacity:0}to{transform:none;opacity:1}}
#phoneModalV2>.bl-device{position:relative;height:min(780px,92dvh)!important;width:auto!important;aspect-ratio:9/19.3;max-width:96vw;
  background:#0b0d10!important;border:0!important;border-radius:clamp(34px,6.2dvh,54px)!important;padding:clamp(8px,1.3dvh,12px);box-sizing:border-box;
  box-shadow:0 0 0 2px #3b3f45,0 0 0 4px #15171a,0 40px 100px #000,inset 0 0 0 1px #2a2d31!important;overflow:visible!important;display:block!important;font-family:-apple-system,"SF Pro Text",system-ui,Arial,sans-serif}
#phoneModalV2 .bl-side{position:absolute;width:4px;border-radius:2px;background:linear-gradient(90deg,#2a2d31,#4a4f56)}
#phoneModalV2 .bl-screen{position:relative;width:100%;height:100%;border-radius:clamp(26px,5.2dvh,44px);overflow:hidden;background:#000;display:flex;flex-direction:column;color:#fff}
#phoneModalV2 .bl-island{position:absolute;top:clamp(7px,1.2dvh,11px);left:50%;transform:translateX(-50%);width:31%;height:clamp(22px,3.6dvh,31px);background:#000;border-radius:20px;z-index:30;box-shadow:0 0 0 1px #0002}
#phoneModalV2 .bl-island:after{content:'';position:absolute;right:16%;top:50%;width:9px;height:9px;margin-top:-4.5px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#2b3a55,#0a0d14 60%)}
#phoneModalV2 .bl-status{position:absolute;top:0;left:0;right:0;height:clamp(40px,6.2dvh,52px);display:flex;align-items:center;justify-content:space-between;padding:0 7% 0 9%;z-index:25;font:600 clamp(13px,1.9dvh,16px) -apple-system,system-ui,Arial;letter-spacing:-.01em;pointer-events:none}
#phoneModalV2 .bl-status .r{display:flex;align-items:center;gap:5px}
#phoneModalV2 .bl-status svg{height:.78em;fill:currentColor}
#phoneModalV2 .bl-batt{display:inline-flex;align-items:center;gap:1px}
#phoneModalV2 .bl-batt i{display:block;width:1.55em;height:.78em;border:1.5px solid #fffa;border-radius:3.5px;padding:1px;box-sizing:border-box}
#phoneModalV2 .bl-batt i b{display:block;height:100%;border-radius:1.5px;background:#fff}
#phoneModalV2 .bl-batt:after{content:'';width:1.5px;height:.32em;border-radius:0 1px 1px 0;background:#fff8}
#phoneModalV2 .bl-app{position:absolute;inset:0;display:flex;flex-direction:column;background:#000;color:#fff;padding-top:clamp(40px,6.2dvh,52px)}
#phoneModalV2 .bl-app .bl-status{color:#fff}
#phoneModalV2 .bl-head{display:flex;align-items:center;gap:6px;padding:4px 10px 8px;flex:none}
#phoneModalV2 .bl-head button{border:0;background:none;color:#0a84ff;font:500 16px -apple-system,system-ui,Arial;padding:6px 4px;min-height:36px}
#phoneModalV2 .bl-head b{font:700 22px -apple-system,system-ui,Arial;letter-spacing:-.02em;margin-left:4px}
#phoneModalV2 #phoneBodyV2,#phoneModalV2 #phoneCityV3{flex:1;overflow:auto;padding:4px 12px 26px!important;-webkit-overflow-scrolling:touch;color:#fff}
#phoneModalV2 #phoneBodyV2 section,#phoneModalV2 #phoneCityV3 section{background:#1c1c1e!important;border:0!important;border-radius:16px!important;color:#fff}
#phoneModalV2 #phoneBodyV2 section>b,#phoneModalV2 #phoneCityV3 section>b{font:650 15px -apple-system,system-ui,Arial}
#phoneModalV2 #phoneBodyV2 button,#phoneModalV2 #phoneCityV3 button{border-radius:12px!important}
#phoneModalV2 .bl-oldhead,#phoneModalV2 #phoneNavV2{display:none!important}
#phoneModalV2 .bl-homebar{position:absolute;bottom:clamp(6px,1dvh,9px);left:50%;transform:translateX(-50%);width:36%;height:5px;border-radius:3px;background:#fff;z-index:40;opacity:.9}
#phoneModalV2 .bl-homehit{position:absolute;bottom:0;left:25%;right:25%;height:26px;z-index:41;border:0;background:transparent;cursor:pointer}
#phoneModalV2 .bl-home{position:absolute;inset:0;display:flex;flex-direction:column;padding:clamp(48px,7.4dvh,62px) 6% 0;
  background:linear-gradient(185deg,#1b2a4a 0%,#3a3f78 38%,#b0607a 72%,#f3a66a 100%)}
#phoneModalV2 .bl-home:before{content:'';position:absolute;left:0;right:0;bottom:0;height:46%;pointer-events:none;opacity:.55;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' preserveAspectRatio='none'%3E%3Cg fill='%23161a33'%3E%3Crect x='186' y='40' width='6' height='130'/%3E%3Ccircle cx='189' cy='118' r='15'/%3E%3Crect x='182' y='132' width='14' height='60'/%3E%3Cpath d='M0 300V215h22v-18h26v30h18v-44h30v40h16v-22h34v30h26v-60h20v40h18v-26h36v38h20v-50h26v30h20v-16h30v32h18v-24h40v74z'/%3E%3C/g%3E%3C/svg%3E") bottom/100% 100% no-repeat}
#phoneModalV2 .bl-widgets{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;position:relative;z-index:1}
#phoneModalV2 .bl-w{border-radius:20px;padding:11px 12px;background:#ffffff26;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:inset 0 0 0 .5px #ffffff30;min-height:clamp(78px,12dvh,104px);box-sizing:border-box}
#phoneModalV2 .bl-w small{display:block;font:600 11px -apple-system,system-ui;opacity:.8;text-transform:uppercase;letter-spacing:.04em}
#phoneModalV2 .bl-w .big{font:300 clamp(30px,5.4dvh,44px) -apple-system,system-ui;letter-spacing:-.03em;line-height:1.05}
#phoneModalV2 .bl-w .mid{font:650 clamp(17px,2.6dvh,21px) -apple-system,system-ui;margin-top:4px}
#phoneModalV2 .bl-w .sub{font:500 11px -apple-system,system-ui;opacity:.85;margin-top:3px;line-height:1.3}
#phoneModalV2 .bl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,2.2dvh,20px) 6px;position:relative;z-index:1}
#phoneModalV2 .bl-ic{border:0;background:none;color:#fff;padding:0;display:flex;flex-direction:column;align-items:center;gap:5px;font:500 11px -apple-system,system-ui;text-shadow:0 1px 3px #0008;cursor:pointer;position:relative}
#phoneModalV2 .bl-ic span.i{width:clamp(48px,7.6dvh,62px);aspect-ratio:1;border-radius:24%;display:flex;align-items:center;justify-content:center;font-size:clamp(24px,3.9dvh,32px);box-shadow:0 3px 10px #0004,inset 0 0 0 .5px #ffffff40;text-shadow:none}
#phoneModalV2 .bl-ic:active span.i{transform:scale(.92);filter:brightness(.85)}
#phoneModalV2 .bl-ic em{position:absolute;top:-5px;right:calc(50% - clamp(30px,4.6dvh,37px));min-width:20px;height:20px;border-radius:10px;background:#ff3b30;color:#fff;font:600 12px -apple-system,system-ui;font-style:normal;display:flex;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box;text-shadow:none}
#phoneModalV2 .bl-dock{position:absolute;left:4%;right:4%;bottom:clamp(14px,2.4dvh,22px);padding:clamp(10px,1.6dvh,14px) 4%;border-radius:clamp(26px,4.2dvh,34px);background:#ffffff30;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:grid;grid-template-columns:repeat(3,1fr);z-index:2}
#phoneModalV2 .bl-dock .bl-ic small{display:none}
#phoneModalV2 .bl-dots{display:flex;justify-content:center;gap:6px;margin-top:auto;margin-bottom:clamp(100px,15dvh,124px);position:relative;z-index:1}
#phoneModalV2 .bl-dots i{width:7px;height:7px;border-radius:50%;background:#fff5}#phoneModalV2 .bl-dots i:first-child{background:#fff}
#phoneBtnV2{border-radius:12px!important;width:40px!important;height:62px!important;background:linear-gradient(160deg,#2a2e35,#0d0f12)!important;border:2px solid #4a4f57!important;font-size:0!important;box-shadow:0 8px 24px #000a!important;padding:0!important}
#phoneBtnV2:before{content:'';position:absolute;left:3px;right:3px;top:3px;bottom:3px;border-radius:8px;background:linear-gradient(185deg,#3a3f78,#b0607a 70%,#f3a66a)}
#phoneBtnV2:after{content:'';position:absolute;top:6px;left:50%;width:12px;height:4px;margin-left:-6px;border-radius:2px;background:#000}
#phoneBtnV2 #phoneBadgeV2{z-index:2}
`;

const svg = {
  signal: '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  wifi: '<svg viewBox="0 0 16 12"><path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A9 9 0 0 1 8 2.2zm0 3.4c1.5 0 2.9.6 3.9 1.5l1.2-1.3A7.4 7.4 0 0 0 8 3.8 7.4 7.4 0 0 0 2.9 5.8l1.2 1.3C5.1 6.2 6.5 5.6 8 5.6zM8 9a2 2 0 0 0-1.5.6L8 11.4l1.5-1.8A2 2 0 0 0 8 9z"/></svg>',
};
const euro = c => `€${((c || 0) / 100).toFixed(2).replace('.', ',')}`;
const clockNow = g => {
  const c = globalThis.BerlinState?.clock;
  if (c?.hhmm) return { hhmm: c.hhmm, day: c.weekdayName || '' };
  const x = ((Math.floor(g?.phase12State?.minutes || 0) % 1440) + 1440) % 1440;
  return { hhmm: `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`, day: '' };
};

function install(game) {
  const m = document.querySelector('#phoneModalV2'), shell = m?.firstElementChild, body = m?.querySelector('#phoneBodyV2'), nav = m?.querySelector('#phoneNavV2');
  if (!m || !shell || !body || !nav || m.__blSkin) return false;
  m.__blSkin = true;
  const st = document.createElement('style'); st.id = 'blPhoneSkin'; st.textContent = CSS; document.head.appendChild(st);
  shell.classList.add('bl-device');
  const oldHead = shell.firstElementChild; oldHead.classList.add('bl-oldhead');
  // Scherm opbouwen: de bestaande body/nav verhuizen naar het app-venster.
  const screen = document.createElement('div'); screen.className = 'bl-screen';
  screen.innerHTML = `<div class="bl-island"></div>
    <div class="bl-home"><div class="bl-status"><span class="t">--:--</span><span class="r">${svg.signal}<span style="font-size:.8em;font-weight:700">5G</span><span class="bl-batt"><i><b></b></i></span></span></div>
      <div class="bl-widgets"><div class="bl-w"><small class="wd">Berlijn</small><div class="big t">--:--</div><div class="sub w2"></div></div>
        <div class="bl-w"><small>Portemonnee</small><div class="mid money">€0,00</div><div class="sub tk"></div></div></div>
      <div class="bl-grid"></div><div class="bl-dots"><i></i><i></i></div><div class="bl-dock"></div></div>
    <div class="bl-app" style="display:none"><div class="bl-status"><span class="t">--:--</span><span class="r">${svg.signal}<span style="font-size:.8em;font-weight:700">5G</span><span class="bl-batt"><i><b></b></i></span></span></div>
      <div class="bl-head"><button class="bl-back">‹ Apps</button></div><div class="bl-title" style="padding:0 16px 8px;font:700 30px -apple-system,system-ui,Arial;letter-spacing:-.02em;color:#fff"></div></div>
    <div class="bl-homebar"></div><button class="bl-homehit" aria-label="Beginscherm"></button>`;
  shell.appendChild(screen);
  for (const [side, top, h] of [['left', 17, 5], ['left', 25, 9], ['left', 36, 9], ['right', 28, 14]]) {
    const b = document.createElement('i'); b.className = 'bl-side'; b.style.cssText = `${side}:-6px;top:${top}%;height:${h}%`; shell.appendChild(b);
  }
  const app = screen.querySelector('.bl-app'), home = screen.querySelector('.bl-home'), title = screen.querySelector('.bl-title');
  app.appendChild(body); if (document.querySelector('#phoneCityV3')) app.appendChild(document.querySelector('#phoneCityV3')); app.appendChild(nav);
  const city = () => document.querySelector('#phoneCityV3');
  const icon = a => `<button class="bl-ic" data-app="${a.tab}"><span class="i" style="background:${a.bg};color:${a.text || '#fff'}">${a.icon}</span>${a.badge ? '<em style="display:none"></em>' : ''}<small>${a.name}</small></button>`;
  const visible = () => APPS.filter(a => !a.city || document.querySelector('#phoneCityTabV3'));
  function drawIcons() {
    const key = visible().map(a => a.tab).join();
    if (home.__key === key) return; home.__key = key;
    home.querySelector('.bl-grid').innerHTML = visible().filter(a => !DOCK.includes(a.tab)).map(icon).join('');
    home.querySelector('.bl-dock').innerHTML = DOCK.map(t => APPS.find(a => a.tab === t)).map(icon).join('');
    home.querySelectorAll('.bl-ic').forEach(b => { b.onclick = () => openApp(b.dataset.app); });
  }
  function openApp(tab) {
    const a = APPS.find(x => x.tab === tab); if (!a) return;
    const btn = a.city ? document.querySelector('#phoneCityTabV3') : nav.querySelector(`button[data-tab="${tab}"]`);
    if (a.city && city() && city().parentElement !== app) app.insertBefore(city(), nav);
    btn?.click();   // bestaande tablogica (Phone.js / CityPhone.js)
    title.textContent = a.name;
    home.style.display = 'none'; app.style.display = 'flex'; screen.classList.add('in-app');
    app.scrollTop = 0; body.scrollTop = 0;
  }
  function goHome() {
    // Stadsscherm verbergen zoals CityPhone dat doet bij een andere tab: via de home-tabknop.
    if (city()?.style.display === 'block') nav.querySelector('button[data-tab="home"]')?.click();
    app.style.display = 'none'; home.style.display = 'flex'; screen.classList.remove('in-app');
    update(true);
  }
  screen.querySelector('.bl-back').onclick = goHome;
  screen.querySelector('.bl-homehit').onclick = () => { if (app.style.display === 'flex') goHome(); else m.querySelector('#phoneCloseV2')?.click(); };
  function update(force) {
    if (!force && m.style.display !== 'flex') return;
    drawIcons();
    const t = clockNow(game), s = game.metroEconomy || {};
    screen.querySelectorAll('.t').forEach(el => { el.textContent = t.hhmm; });
    screen.querySelector('.wd').textContent = t.day || 'Berlijn';
    const job = s.activeDelivery?.status === 'active' ? s.activeDelivery : null;
    screen.querySelector('.w2').textContent = job ? `📦 naar ${job.to}` : (s.home?.day ? `Dag ${s.home.day}` : '');
    screen.querySelector('.money').textContent = euro(s.balanceCents);
    screen.querySelector('.tk').textContent = !s.ticket ? '🎫 geen ticket' : s.ticket.type === 'AB' ? `🎫 AB · ${Math.max(0, Math.ceil(s.ticket.remainingMinutes || 0))} min` : `🎫 Kurzstrecke · ${Math.max(0, s.ticket.remainingStops || 0)}`;
    const batt = Math.max(12, 100 - Math.floor(((Date.now() - (game.__blPhoneSince ||= Date.now())) / 60000) % 88));   // loopt langzaam leeg
    screen.querySelectorAll('.bl-batt b').forEach(el => { el.style.width = batt + '%'; el.style.background = batt < 20 ? '#ff3b30' : '#fff'; });
    const unread = document.querySelector('#phoneBadgeV2'), n = unread?.style.display !== 'none' ? unread?.textContent : '';
    screen.querySelectorAll('.bl-ic[data-app="contacts"] em').forEach(e => { e.textContent = n || ''; e.style.display = n ? 'flex' : 'none'; });
  }
  // Openen = altijd op het beginscherm, met animatie.
  const btn = document.querySelector('#phoneBtnV2');
  btn?.addEventListener('click', () => setTimeout(() => { goHome(); m.classList.remove('bl-on'); void m.offsetWidth; m.classList.add('bl-on'); }, 0));
  Tick.every('phone.skin', 1000, () => update(false));
  goHome();
  globalThis.BerlinPhoneSkin = { version: 1, openApp, goHome, status: () => ({ open: m.style.display === 'flex', inApp: app.style.display === 'flex', apps: visible().map(a => a.tab) }) };
  return true;
}

(async () => {
  for (let i = 0; i < 600; i++) {
    const g = globalThis.__berlinMetroGame;
    if (g?.__phoneV2 && document.querySelector('#phoneModalV2') && install(g)) return;
    await Tick.sleep(100, 'boot.PhoneSkin');
  }
})().catch(e => console.error('[Berlin Life] PhoneSkin failed', e));
