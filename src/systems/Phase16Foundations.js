import { Tick } from '../state/Tick.js';
(function(){
"use strict";
if(window.BerlinPhase16Foundations)return;
const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const life=()=>window.BerlinLife, city=()=>window.BerlinCityDiscovery;
const now=()=>life()?.state?.clock||{day:4,minute:1100};
const fmtCents=n=>"€ "+(Number(n||0)/100).toFixed(2);
const fmtTime=n=>{n=Math.floor(Number(n)||0);return String(Math.floor(n/60)%24).padStart(2,"0")+":"+String(n%60).padStart(2,"0")};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let panel=null,section=null,tab="kalender",audit=null;
function calendar(){
 const s=life()?.state;if(!s)return null;
 if(!s.phase16Diary){
  s.phase16Diary={schema:1,number:1,weekday:s.clock?.day??4,log:[]};
  life()?.save?.();
 }
 return s.phase16Diary;
}
function update(){
 const d=calendar(),c=now();
 if(!d||!Number.isInteger(c.day)||c.day<0||c.day>6)return;
 if(d.weekday!==c.day){
  const diff=(c.day-d.weekday+7)%7;
  if(diff){d.number+=diff;d.log.unshift({day:d.number,event:"New game day",weekday:c.day});d.log=d.log.slice(0,50);life()?.save?.()}
  d.weekday=c.day;
 }
}
function available(a,day=now().day,minute=now().minute){
 if(a.days&&!a.days.includes(day))return false;
 if(a.from==null)return true;
 const to=a.to??1440;
 return a.from<=to?minute>=a.from&&minute<=to:minute>=a.from||minute<=to;
}
function snapshot(){
 const ec=window.BerlinPhase34?.economy||{};
 const checks=window.BerlinPhaseAudit?.inspect?.()||{};
 const save=window.BerlinSaveGuard?.validate?.()||{};
 const cs=now();
 audit={day:calendar()?.number||1,clock:cs,economy:ec,save,station:city()?.where?.()?.name||null,nearby:window.BerlinProximity?.nearby?.()||[],streetMode:window.BerlinStreetView2?.state?.mode||"—",checks:checks.flags||{},models:window.BerlinBuildStatus?.visualPipeline||"unknown"};
 return audit;
}
const tile=(label,value)=>'<div class="f16-tile"><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>';
const row=(label,detail="",button="")=>'<div class="f16-row"><span><strong>'+esc(label)+'</strong><small>'+esc(detail)+'</small></span>'+button+'</div>';
const button=(action,label)=>'<button class="f16-action" data-action="'+action+'">'+esc(label)+'</button>';
function render(){
 if(!panel?.classList.contains("open"))return;
 const s=snapshot(),list=city()?.activities?.()||[],money=s.economy,clock=s.clock;
 panel.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("selected",b.dataset.tab===tab));
 let content="";
 if(tab==="kalender"){
  content='<div class="f16-grid">'+tile("Game day",s.day)+tile("Weekday",days[clock.day]||"—")+tile("Time",fmtTime(clock.minute))+'</div><h3>This week</h3>';
  for(let i=0;i<7;i++){const day=(clock.day+i)%7;content+=row(i?"Day +"+i+" · "+days[day]:"Today · "+days[day],list.filter(a=>!a.days||a.days.includes(day)).length+" possible activities in this district")}
  content+='<p class="f16-note">Time runs on the existing game clock. The week planning is based on in-game activities and is not a BVG timetable.</p>';
 }else if(tab==="geld"){
  content='<div class="f16-grid">'+tile("Cash",fmtCents(money.cash))+tile("Bank",fmtCents(money.bank))+tile("Total",fmtCents((money.cash||0)+(money.bank||0)))+'</div><h3>Transactions</h3>';
  content+=(money.tx||[]).slice(0,12).map(t=>row(t.label||"Transaction",(t.type==="income"?"+":"−")+" "+fmtCents(t.amount))).join("")||'<p class="f16-note">No transactions yet.</p>';
  content+='<h3>Inventory</h3>';
  const inventory=life()?.state?.phase7Hybrid?.inventory||{};
  content+=Object.entries(inventory).filter(([k,v])=>Number.isFinite(v)&&v>0).map(([k,v])=>row(k,v+" items")).join("")||'<p class="f16-note">Nothing collected yet.</p>';
  content+='<p class="f16-note">No rent is charged without an active rental contract.</p>'+button("economy","💳 View full money overview");
 }else if(tab==="places"){
  content='<div class="f16-grid">'+tile("Station",s.station||"—")+tile("Activities",list.length)+tile("Within 85 m",s.streetMode==="programmable"?s.nearby.length:"—")+'</div>';
  content+='<p class="f16-note">'+(s.streetMode==="programmable"?"Virtual distance based on the Street View camera.":"Fallback Street View doesn't give a reliable live position; no distances are made up.")+'</p><h3>Activities at this station</h3>';
  content+=list.map(a=>row((a.icon||"📍")+" "+a.name,available(a)?"Available":"Closed",city()?.geoPoint?.(a)?'<button class="f16-go" data-action="travel" data-id="'+esc(a.id)+'">Go there</button>':"")).join("")||'<p class="f16-note">No activities registered here yet.</p>';
  content+=button("discovery","🔎 Open Discovery");
 }else{
  const c=now(),tests=[
   ["Save protection",!!window.BerlinSaveGuard&&s.save.storageAvailable!==false&&!(s.save.invalidJson||[]).length],
   ["Kalender",Number.isInteger(c.day)&&c.day>=0&&c.day<=6&&Number.isFinite(c.minute)],
   ["Money system",Number.isFinite(money.cash)&&Number.isFinite(money.bank)],
   ["Discovery",!!city()&&!!window.BerlinDiscoveryV2],
   ["Street View Bridge",!!window.BerlinStreetView2&&!!window.BerlinWorldBridge],
   ["Proximity",!!window.BerlinProximity?.nearby]
  ];
  content='<h3>Phase 1–6 · basic checks</h3>'+tests.map(([name,ok])=>row((ok?"✓ ":"⚠ ")+name,ok?"System present":"Check needed")).join("");
  content+='<p class="f16-note">These are basic checks, not proof that all 3D features work on every mobile device.</p><h3>Savegame</h3>';
  content+=row("Back-up",window.BerlinSaveGuard?.status?.available?"Present":"No backup on this device yet")+row("JSON",s.save.invalidJson?.length?s.save.invalidJson.length+" invalid saves":"No known invalid saves");
  content+=button("save","💾 Keep game state")+button("export","⬇️ Export savegame");
 }
 const y=section.scrollTop;section.innerHTML=content;section.scrollTop=y;
}
function close(){panel?.classList.remove("open")}
function open(){
 if(!panel)mount();
 panel.classList.add("open");
 render();
}
function mount(){
 const style=document.createElement("style");
 style.id="berlin-phase16-foundations-style";
 style.textContent="#berlin-phase16{position:fixed;inset:0;z-index:45000;display:none;align-items:flex-end;justify-content:center;background:#000a;color:white;font:13px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif}#berlin-phase16.open{display:flex}#berlin-phase16 .f16-shell{width:min(580px,100vw);max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;border-radius:20px 20px 0 0;background:#101a24;border:1px solid #ffffff2b}#berlin-phase16 header{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#243447}#berlin-phase16 header b{font-size:17px}#berlin-phase16 header small{color:#b1c0d0;display:block;font-size:10px}#berlin-phase16 button{touch-action:manipulation;cursor:pointer}#berlin-phase16 .f16-close{padding:7px 11px;background:#384e64;border:1px solid #ffffff3c;color:#fff;border-radius:9px}#berlin-phase16 nav{display:flex;gap:5px;padding:7px}#berlin-phase16 nav button{flex:1;border:1px solid #ffffff23;border-radius:9px;background:#29394b;color:white;padding:10px 3px;font-size:11px;font-weight:700}#berlin-phase16 nav button.selected{background:#f3ce38;color:#151515}#berlin-phase16 .f16-content{overflow-y:auto;min-height:0;padding:9px 14px calc(17px + env(safe-area-inset-bottom))}#berlin-phase16 .f16-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#berlin-phase16 .f16-tile{background:#243347;border-radius:10px;padding:8px}#berlin-phase16 .f16-tile small,#berlin-phase16 .f16-row small{display:block;font-size:10px;color:#b6c3d1}#berlin-phase16 .f16-tile b{font-size:13px;overflow-wrap:anywhere}#berlin-phase16 h3{font-size:13px;color:#f3ce38;margin:14px 0 8px}#berlin-phase16 .f16-row{display:flex;align-items:center;gap:8px;background:#1f2c3c;border-radius:9px;padding:9px;margin:5px 0}#berlin-phase16 .f16-row span{flex:1;min-width:0}#berlin-phase16 .f16-go{background:#f3ce38;color:#171717;border:0;padding:8px;border-radius:8px;font-size:11px;font-weight:700}#berlin-phase16 .f16-action{display:block;width:100%;background:#32495f;border:1px solid #ffffff29;color:white;border-radius:10px;padding:11px;font-weight:700;margin:8px 0}#berlin-phase16 .f16-note{font-size:11px;color:#b7c3ce}@media(min-width:650px){#berlin-phase16{align-items:center}#berlin-phase16 .f16-shell{border-radius:20px}}";
 document.head.appendChild(style);
 panel=document.createElement("div");panel.id="berlin-phase16";
 panel.innerHTML='<div class="f16-shell" role="dialog" aria-modal="true" aria-label="City and planning"><header><div><b>🏙️ City & planning</b><small>Berlin Life · phases 1–6</small></div><button data-action="close" class="f16-close">✕</button></header><nav><button data-tab="kalender">Day</button><button data-tab="geld">Money</button><button data-tab="plekken">Places</button><button data-tab="save">Save</button></nav><div class="f16-content"></div></div>';
 document.body.appendChild(panel);section=panel.querySelector(".f16-content");
 panel.addEventListener("click",async ev=>{
  const b=ev.target.closest("button");
  if(!b){if(ev.target===panel)close();return}
  if(b.dataset.tab){tab=b.dataset.tab;render();return}
  const a=b.dataset.action;
  if(a==="close")return close();
  if(a==="economy"){close();window.BerlinPhase34?.openEconomy?.();return}
  if(a==="discovery"){close();city()?.open?.();return}
  if(a==="save"){life()?.save?.();try{const d=window.BerlinPhase34?.discovery;if(d)localStorage.setItem("berlin-discovery-v4@"+(window.BerlinSaveSlots?.active||"normal"),JSON.stringify(d))}catch{}render();return}
  if(a==="export"){life()?.save?.();window.BerlinSaveGuard?.exportData?.();return}
  if(a==="travel"){const activity=(city()?.activities?.()||[]).find(x=>x.id===b.dataset.id);if(activity){close();try{await city()?.travelTo?.(activity)}catch(e){console.warn("[Berlin Life] destination",e)}}}
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&panel?.classList.contains("open"))close()});
}
function phone(){
 const grid=document.querySelector("#pcv5.open #pcv5-body .pc-grid");
 if(!grid||grid.querySelector("#phase16-plan-button"))return;
 const b=document.createElement("button");
 b.type="button";b.id="phase16-plan-button";b.className="pc-action";
 b.innerHTML="🏙️<b>City & planning</b><small>Calendar · money · places</small>";
 b.addEventListener("click",open);grid.appendChild(b);
}
window.BerlinPhase16Foundations={version:1,open,close,inspect:snapshot};
window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),phase16Integration:1,glbUnchanged:true};
Tick.every("phase16.foundations",3600,()=>{try{update();phone();if(panel?.classList.contains("open"))render()}catch(e){console.warn("[Berlin Life] Phase 1–6",e)}});
phone();
console.info("[Berlin Life] Phase 1–6 integration V1 active; existing models and gameplay untouched");
})();