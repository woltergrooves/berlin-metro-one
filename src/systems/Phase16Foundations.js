(function(){
"use strict";
if(window.BerlinPhase16Foundations)return;
const days=["Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag","Zondag"];
const life=()=>window.BerlinLife, city=()=>window.BerlinCityDiscovery;
const now=()=>life()?.state?.clock||{day:4,minute:1100};
const fmtCents=n=>"€ "+(Number(n||0)/100).toFixed(2).replace(".",",");
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
  if(diff){d.number+=diff;d.log.unshift({day:d.number,event:"Nieuwe speldag",weekday:c.day});d.log=d.log.slice(0,50);life()?.save?.()}
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
  content='<div class="f16-grid">'+tile("Speldag",s.day)+tile("Weekdag",days[clock.day]||"—")+tile("Tijd",fmtTime(clock.minute))+'</div><h3>Deze week</h3>';
  for(let i=0;i<7;i++){const day=(clock.day+i)%7;content+=row(i?"Dag +"+i+" · "+days[day]:"Vandaag · "+days[day],list.filter(a=>!a.days||a.days.includes(day)).length+" mogelijke activiteiten in deze wijk")}
  content+='<p class="f16-note">Tijd loopt via de bestaande spelklok. De weekplanning is gebaseerd op in-game activiteiten en is geen BVG-dienstregeling.</p>';
 }else if(tab==="geld"){
  content='<div class="f16-grid">'+tile("Cash",fmtCents(money.cash))+tile("Bank",fmtCents(money.bank))+tile("Totaal",fmtCents((money.cash||0)+(money.bank||0)))+'</div><h3>Transacties</h3>';
  content+=(money.tx||[]).slice(0,12).map(t=>row(t.label||"Transactie",(t.type==="income"?"+":"−")+" "+fmtCents(t.amount))).join("")||'<p class="f16-note">Nog geen transacties.</p>';
  content+='<h3>Inventaris</h3>';
  const inventory=life()?.state?.phase7Hybrid?.inventory||{};
  content+=Object.entries(inventory).filter(([k,v])=>Number.isFinite(v)&&v>0).map(([k,v])=>row(k,v+" stuks")).join("")||'<p class="f16-note">Nog geen spullen verzameld.</p>';
  content+='<p class="f16-note">Geen huur wordt afgeschreven zonder actief huurcontract.</p>'+button("economy","💳 Bekijk volledig geldoverzicht");
 }else if(tab==="plekken"){
  content='<div class="f16-grid">'+tile("Station",s.station||"—")+tile("Activiteiten",list.length)+tile("Binnen 85 m",s.streetMode==="programmable"?s.nearby.length:"—")+'</div>';
  content+='<p class="f16-note">'+(s.streetMode==="programmable"?"Virtuele afstand op basis van de Street View-camera.":"Fallback Street View geeft geen betrouwbare live positie door; er worden geen afstanden verzonnen.")+'</p><h3>Activiteiten bij dit station</h3>';
  content+=list.map(a=>row((a.icon||"📍")+" "+a.name,available(a)?"Beschikbaar":"Gesloten",city()?.geoPoint?.(a)?'<button class="f16-go" data-action="travel" data-id="'+esc(a.id)+'">Ga erheen</button>':"")).join("")||'<p class="f16-note">Hier zijn nog geen activiteiten geregistreerd.</p>';
  content+=button("discovery","🔎 Open Discovery");
 }else{
  const c=now(),tests=[
   ["Savebeveiliging",!!window.BerlinSaveGuard&&s.save.storageAvailable!==false&&!(s.save.invalidJson||[]).length],
   ["Kalender",Number.isInteger(c.day)&&c.day>=0&&c.day<=6&&Number.isFinite(c.minute)],
   ["Geldsysteem",Number.isFinite(money.cash)&&Number.isFinite(money.bank)],
   ["Discovery",!!city()&&!!window.BerlinDiscoveryV2],
   ["Street View Bridge",!!window.BerlinStreetView2&&!!window.BerlinWorldBridge],
   ["Nabijheid",!!window.BerlinProximity?.nearby]
  ];
  content='<h3>Fase 1–6 · basiscontroles</h3>'+tests.map(([name,ok])=>row((ok?"✓ ":"⚠ ")+name,ok?"Systeem aanwezig":"Controle nodig")).join("");
  content+='<p class="f16-note">Dit zijn basiscontroles, geen bewijs dat alle 3D-functies op elk mobiel apparaat werken.</p><h3>Savegame</h3>';
  content+=row("Back-up",window.BerlinSaveGuard?.status?.available?"Aanwezig":"Nog geen back-up op dit apparaat")+row("JSON",s.save.invalidJson?.length?s.save.invalidJson.length+" ongeldige saves":"Geen ongeldige bekende saves");
  content+=button("save","💾 Spelstatus bewaren")+button("export","⬇️ Exporteer savegame");
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
 panel.innerHTML='<div class="f16-shell" role="dialog" aria-modal="true" aria-label="Stad en planning"><header><div><b>🏙️ Stad & planning</b><small>Berlin Life · fase 1–6</small></div><button data-action="close" class="f16-close">✕</button></header><nav><button data-tab="kalender">Dag</button><button data-tab="geld">Geld</button><button data-tab="plekken">Plekken</button><button data-tab="save">Save</button></nav><div class="f16-content"></div></div>';
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
 b.innerHTML="🏙️<b>Stad & planning</b><small>Kalender · geld · plekken</small>";
 b.addEventListener("click",open);grid.appendChild(b);
}
window.BerlinPhase16Foundations={version:1,open,close,inspect:snapshot};
window.BerlinBuildStatus={...(window.BerlinBuildStatus||{}),phase16Integration:1,glbUnchanged:true};
setInterval(()=>{try{update();phone();if(panel?.classList.contains("open"))render()}catch(e){console.warn("[Berlin Life] Phase 1–6",e)}},3600);
phone();
console.info("[Berlin Life] Phase 1–6 integration V1 active; existing models and gameplay untouched");
})();