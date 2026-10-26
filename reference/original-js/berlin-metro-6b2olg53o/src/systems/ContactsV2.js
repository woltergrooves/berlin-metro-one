const KEY='metro-economy-v2';
const CONTACTS={
  miro:{name:'Miro',emoji:'🧔',role:'Kiez Späti',station:'Alexanderplatz',color:'#f0c51a',intro:'Chef van Kiez Späti en jouw vaste koeriercontact.',lines:['Morgen. Als je wilt rijden, ik heb bestellingen liggen.','Netjes bezorgd. Mensen beginnen je te kennen.','Rustig blijven rijden. Snel is goed, heel aankomen is beter.']},
  lea:{name:'Lea',emoji:'👩',role:'Buurvrouw',station:'Rosa-Luxemburg-Platz',color:'#79e3a3',intro:'Woont in dezelfde Altbau en houdt een oogje op het huis.',lines:['Hey buur. Alles goed?','Als je laat thuiskomt: de voordeur klemt een beetje.','Je kamer begint er zowaar bewoond uit te zien.']},
  deniz:{name:'Deniz',emoji:'🧢',role:'Kotti contact',station:'Kottbusser Tor',color:'#7fb8ff',intro:'Kent mensen in Kreuzberg en het nachtleven.',lines:['Kotti slaapt nooit. Kom later nog eens langs.','Je kent de stad inmiddels beter dan sommige chauffeurs.','Na tienen gebeurt er ander werk. Nog niet voor iedereen.']}
};
function read(game){if(game.metroEconomy)return game.metroEconomy;try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function ensure(s){if(!s)return null;s.contacts??={};s.messages??=[];for(const id of Object.keys(CONTACTS)){s.contacts[id]??={met:false,relationship:0,lastTalkDay:0,unlocked:false};}return s}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{};document.dispatchEvent(new CustomEvent('metro-contacts-changed'));document.dispatchEvent(new CustomEvent('metro-economy-changed'))}
function addMessage(s,id,text,day){const mid=`${id}:${day}:${text}`;if(s.messages.some(m=>m.id===mid))return;s.messages.unshift({id:mid,from:id,text,day,read:false,at:Date.now()});s.messages=s.messages.slice(0,30)}
let currentStreet=null;
function card(){let e=document.querySelector('#contactTalkV2');if(e)return e;e=document.createElement('div');e.id='contactTalkV2';e.style.cssText='display:none;position:fixed;right:12px;bottom:max(122px,calc(env(safe-area-inset-bottom) + 112px));z-index:15400;width:min(255px,calc(100vw - 24px));background:#111d;color:#fff;border:1px solid #ffffff28;border-radius:13px;padding:10px;font:700 12px Arial;box-shadow:0 10px 34px #000b;backdrop-filter:blur(10px);pointer-events:auto';document.body.appendChild(e);return e}
function hit(){return Object.entries(CONTACTS).find(([,c])=>c.station===currentStreet?.name)||null}
function render(game,s){
  document.querySelector('#contactTalkV1')?.style.setProperty('display','none','important');
  const e=card(),h=hit();
  if(!game.player.__streetMode||!h){e.style.display='none';return}
  const [id,c]=h,st=s.contacts[id];
  e.innerHTML=`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:26px">${c.emoji}</span><div style="flex:1"><b style="color:${c.color};font-size:14px">${c.name}</b><div style="font-size:11px;color:#aab2ba">${c.role}</div></div><button id="talkContactV2" style="border:0;border-radius:8px;padding:9px 10px;background:${c.color};color:#111;font-weight:900">PRATEN</button></div>`;
  e.style.display='block';
  e.querySelector('#talkContactV2').onclick=()=>{
    const day=s.home?.day||1;
    if(!st.met){st.met=true;st.unlocked=true;addMessage(s,id,c.intro,day)}
    const idx=Math.min(c.lines.length-1,Math.floor((st.relationship||0)/2));
    const line=c.lines[idx];
    if(st.lastTalkDay!==day){st.relationship=(st.relationship||0)+1;st.lastTalkDay=day}
    addMessage(s,id,line,day);save(s);
    game.ui?.notify?.(`${c.emoji} ${c.name}: “${line}”`);
  };
}
function install(game){
  if(game.__contactsV2)return;game.__contactsV2=true;
  const s=ensure(read(game));if(!s)return;
  const style=document.createElement('style');style.textContent='#contactTalkV1{display:none!important}';document.head.appendChild(style);
  // V1 may have prematurely set unlocked=true. Contact visibility now depends on met=true only.
  for(const id of Object.keys(CONTACTS)) if(!s.contacts[id].met) s.contacts[id].unlocked=false;
  save(s);
  document.addEventListener('metro-street-cell',e=>{currentStreet=e.detail?.ctx||null;render(game,s)});
  setInterval(()=>render(game,s),500);
  game.contactsVersion='V2-talk-first';
}
(async()=>{for(let i=0;i<500;i++){const g=globalThis.__berlinMetroGame;if(g?.player&&g?.ui){install(g);return}await new Promise(r=>setTimeout(r,100))}})().catch(e=>console.error('[Metro] Contacts V2 failed',e));
