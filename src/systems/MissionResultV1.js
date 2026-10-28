import { Tick } from '../state/Tick.js';
const KEY='metro-economy-v2';
const euro=c=>`€${((c||0)/100).toFixed(2).replace('.',',')}`;
const fmt=ms=>{const s=Math.max(0,Math.ceil((ms||0)/1000)),m=Math.floor(s/60),ss=String(s%60).padStart(2,'0');return `${m}:${ss}`};
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function install(game){
  if(game.__missionResultV1)return;game.__missionResultV1=true;
  let lastSeen=null;
  try{lastSeen=sessionStorage.getItem('metro-last-mission-result')||null}catch{}
  let modal=document.querySelector('#missionResultV1');
  if(!modal){
    modal=document.createElement('div');
    modal.id='missionResultV1';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:17000;background:#000b;align-items:center;justify-content:center;padding:16px;font-family:Arial;pointer-events:auto';
    modal.innerHTML=`<div style="width:min(460px,94vw);background:linear-gradient(180deg,#18221d,#11161a);color:#fff;border:1px solid #79e3a344;border-radius:18px;padding:18px;box-shadow:0 24px 80px #000e"><div style="text-align:center"><div style="font-size:44px">✅</div><b style="font-size:24px">Missie voltooid</b><div id="mrRoute" style="margin-top:5px;color:#b8c0c7"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px"><div style="background:#20272d;border-radius:12px;padding:11px"><small style="color:#9ba3ac">Basisloon</small><div id="mrBase" style="font-size:20px;font-weight:900"></div></div><div style="background:#20272d;border-radius:12px;padding:11px"><small style="color:#9ba3ac">Fooi</small><div id="mrTip" style="font-size:20px;font-weight:900;color:#ffd34d"></div></div><div style="background:#20272d;border-radius:12px;padding:11px"><small style="color:#9ba3ac">Tijd over</small><div id="mrTime" style="font-size:18px;font-weight:900"></div></div><div style="background:#20272d;border-radius:12xp;padding:11px"><small style="color:#9ba3ac">Reputatie</small><div id="mrRep" style="font-size:18px;font-weight:900;color:#79e3a3"></div></div></div><div style="margin-top:12px;background:#f0c51a;color:#111;border-radius:12px;padding:12px;text-align:center"><small>TOTAAL VERDIEND</small><div id="mrTotal" style="font-size:28px;font-weight:1000"></div></div><button id="mrClose" style="width:100%;margin-top:12px;border:0;border-radius:11px;padding:13px;background:#fff;color:#111;font-weight:900">VERDER</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#mrClose').onclick=()=>modal.style.display='none';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none'});
  }
  function maybeShow(){
    const s=read(); const j=s?.activeDelivery;
    if(!j||j.status!=='done'||!j.finishedAt)return;
    const id=`${j.id||j.to}:${j.finishedAt}`;
    if(id===lastSeen)return;
    lastSeen=id;try{sessionStorage.setItem('metro-last-mission-result',id)}catch{}
    const total=Number.isFinite(j.totalPay)?j.totalPay:(j.basePay||0)+(j.tip||0);
    const rep=s?.jobStats?.reputation??0;
    const rem=Math.max(0,(j.expiresAt||j.finishedAt)-(j.finishedAt||Date.now()));
    modal.querySelector('#mrRoute').textContent=`${j.from||'Alexanderplatz'} → ${j.to||'Bestemming'}`;
    modal.querySelector('#mrBase').textContent=euro(j.basePay||0);
    modal.querySelector('#mrTip').textContent=`+${euro(j.tip||0)}`;
    modal.querySelector('#mrTime').textContent=fmt(rem);
    modal.querySelector('#mrRep').textContent=`+1 · totaal ${rep}`;
    modal.querySelector('#mrTotal').textContent=euro(total);
    modal.style.display='flex';
  }
  document.addEventListener('metro-job-changed',()=>setTimeout(maybeShow,0));
  let lastStatus=null;
  Tick.every('mission.result',700,()=>{const s=read(),st=s?.activeDelivery?.status;if(st==='done'&&lastStatus!=='done')maybeShow();lastStatus=st});
  game.missionResultVersion='V1';
}
(async()=>{for(let i=0;i<500;i++){const g=globalThis.__berlinMetroGame;if(g?.player&&g?.ui){install(g);return}await Tick.sleep(100,'boot.MissionResultV1')}})().catch(e=>console.error('[Metro] Mission result failed',e));
