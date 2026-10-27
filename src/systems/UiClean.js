import { Tick } from '../state/Tick.js';
(function(){
"use strict";
if(window.BerlinCleanStreet)return;
const css=document.createElement("style");css.textContent=[
"#street-clean-ui{display:none;position:fixed;inset:0;z-index:32000;pointer-events:none;color:white;font:12px system-ui,-apple-system,Arial,sans-serif}",
"#street-clean-ui.open{display:block}",
"#street-clean-ui .top{position:absolute;left:12px;right:12px;top:max(12px,env(safe-area-inset-top));display:flex;align-items:flex-start;justify-content:space-between;gap:9px}",
"#street-clean-ui .label{background:#0a131de5;border-radius:10px;padding:10px;max-width:36%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800}",
"#street-clean-ui .actions{display:flex;gap:7px;max-width:64%;flex-wrap:wrap;justify-content:flex-end;pointer-events:auto}",
"#street-clean-ui button{border:0;border-radius:10px;padding:11px;color:white;min-height:42px;font:800 12px system-ui;touch-action:manipulation;pointer-events:auto}",
"#street-clean-ui .activity{background:#edc62e;color:#111}",
"#street-clean-ui .play{background:#158a5c;display:none}",
"#street-clean-ui .back{position:absolute;bottom:max(13px,env(safe-area-inset-bottom));left:12px;background:#1467b4}",
"#street-clean-menu{position:fixed;inset:0;z-index:41000;display:none;align-items:flex-end;justify-content:center;background:#000c;color:white;font:13px system-ui}",
"#street-clean-menu.open{display:flex}",
"#street-clean-menu section{background:#141c26;width:min(560px,100vw);max-height:86dvh;display:flex;flex-direction:column;border-radius:20px 20px 0 0;overflow:hidden}",
"#street-clean-menu header{padding:14px;display:flex;justify-content:space-between;gap:10px;background:#263446}",
"#street-clean-menu header button{background:#3b5066;color:white;border:0;border-radius:8px;padding:8px}",
"#street-clean-menu .items{overflow:auto;min-height:0;padding:12px 12px calc(14px + env(safe-area-inset-bottom))}",
"#street-clean-menu article{background:#213044;border-radius:12px;padding:11px;margin:7px 0}",
"#street-clean-menu article small{display:block;color:#bac7d5;margin:5px 0 9px}",
"#street-clean-menu article button{background:#edc62e;color:#111;border:0;border-radius:9px;padding:10px;margin:2px;font-weight:800;touch-action:manipulation}",
"html.street-clean-active #p34-discovery,html.street-clean-active #p34-economy,html.street-clean-active #phoneModalV1,html.street-clean-active #hud,html.street-clean-active #p34-eco,html.street-clean-active #p34-dis,html.street-clean-active #phoneBtnV1,html.street-clean-active #bl-chip,html.street-clean-active #bl-nearby,html.street-clean-active #stationLifeV5{display:none!important}",
"@media(min-width:680px){#street-clean-menu{align-items:center}#street-clean-menu section{border-radius:20px}}"
].join("\n");css.textContent+=String.raw`
#street-clean-menu .cs-episode-timer{display:block;color:#f2d26b;font-weight:900;font-variant-numeric:tabular-nums;margin:9px 0}\n#street-clean-menu .cs-story p{color:#eff2f6;font-size:13px;line-height:1.6;margin:2px 0 12px}
#street-clean-menu .cs-story .cs-choice{display:block;width:100%;text-align:left;background:#273e53;color:#f7f9fc;border:1px solid #ffffff30;padding:13px;border-radius:10px;margin:9px 0;font:700 12px/1.4 system-ui}
#street-clean-menu .cs-episodes-back{width:100%;display:block;background:#415167;color:white;border:0;border-radius:11px;padding:12px;margin:10px 0;touch-action:manipulation}
`;document.head.appendChild(css);
const root=document.createElement("div");root.id="street-clean-ui";
root.innerHTML='<div class="top"><div class="label"></div><div class="actions"><button class="play">▶ SPEEL</button><button class="activity">ACTIVITEITEN</button></div></div><button class="back">← TERUG NAAR U-BAHN</button>';
document.body.append(root);
const modal=document.createElement("div");modal.id="street-clean-menu";modal.innerHTML='<section role="dialog" aria-modal="true" aria-label="Activiteiten"><header><b>Activiteiten</b><button class="close">✕</button></header><div class="items"></div></section>';document.body.append(modal);
const play=root.querySelector(".play");let activeEpisode=null;
function closeActivities(){activeEpisode=null;modal.classList.remove("open")}
function showEpisode(id,screen){
 activeEpisode=id;
 const box=modal.querySelector(".items"),ep=window.BerlinCityEpisodes;
 const v=screen||ep?.view?.(id);if(!v)return;
 modal.querySelector("header b").textContent=v.title||"Stadsleven";
 box.replaceChildren();
 const scene=document.createElement("article");scene.className="cs-story";
 const text=document.createElement("p");text.textContent=v.text||"";scene.append(text);
 for(const detail of v.extras||[]){if(!detail)continue;const p=document.createElement("small");p.textContent=detail;if(detail.startsWith("Tijd over:"))p.className="cs-episode-timer";scene.append(p)}
 for(const option of v.actions||[]){
  const button=document.createElement("button");button.type="button";button.className="cs-choice";
  button.textContent=option.label;
  if(option.detail)button.title=option.detail;
  button.onclick=()=>{const next=ep.choose(id,option.id);showEpisode(id,next)};
  scene.append(button);
 }
 box.append(scene);
 const back=document.createElement("button");back.type="button";back.className="cs-episodes-back";back.textContent="← TERUG NAAR ACTIVITEITEN";back.onclick=openActivities;box.append(back);
 modal.classList.add("open");
}
function openActivities(){activeEpisode=null;const api=window.BerlinCityDiscovery,l=api?.activities?.()||[],box=modal.querySelector(".items");modal.querySelector("header b").textContent=(api?.where?.()?.name||"Berlijn")+" · activiteiten";box.replaceChildren();
if(!l.length){const p=document.createElement("p");p.textContent="Geen activiteiten bij deze halte.";box.append(p)}
for(const a of l){const card=document.createElement("article"),b=document.createElement("strong"),desc=document.createElement("small");b.textContent=(a.icon||"📍")+" "+a.name;desc.textContent=a.detail||"Bezoek deze plek";card.append(b,desc);
if(api.geoPoint(a)){const go=document.createElement("button");go.textContent="GA ERHEEN";go.onclick=async()=>{closeActivities();if(!await api.travelTo(a))window.__berlinMetroGame?.ui?.notify?.("Buitenlocatie niet beschikbaar")};card.append(go)}
if(window.BerlinCityEpisodes?.has?.(a.id)){
 const episode=document.createElement("button");episode.type="button";episode.textContent=a.episodeLabel|| (a.id.endsWith(":vacatures")?"BEKIJK KLUS":a.id.endsWith(":delivery")?"AFLEVEREN":a.id.endsWith(":architecture")?"ADVIES GEVEN":"PRAAT");
 episode.onclick=()=>showEpisode(a.id);card.append(episode);
}else if(!api.geoPoint(a)||api.readyActivity()?.id===a.id){
 const doIt=document.createElement("button");doIt.textContent=a.id.endsWith(":spaeti")?"BETREED SPÄTI":"SPEEL / BEZOEK";
 doIt.onclick=()=>{closeActivities();api.perform(a.id)};card.append(doIt);
}
box.append(card)}
modal.classList.add("open")}
root.querySelector(".activity").onclick=openActivities;
root.querySelector(".back").onclick=()=>{closeActivities();window.__berlinMetroGame?.__allStreetOverlay?.close?.()};
play.onclick=()=>{const a=window.BerlinCityDiscovery?.readyActivity?.();if(a)window.BerlinCityDiscovery?.perform(a.id)};
modal.querySelector(".close").onclick=closeActivities;modal.addEventListener("click",e=>{if(e.target===modal)closeActivities()});
const oldIds=["reliableStreetUi","reliableStreetBack","reliableStreetModal","berlin-street-unified","sv-discovery-dock","sv-discovery-modal","sdv2-btn","sdv2-modal","highlightRouteHudV2","metroStationHighlight","hoc-v10","metroHighlightOpen","metroHighlightModal","metroHighlightPin","hoc-float","hoc-route-pill","sv-waypoint-controls","sv-waypoint-pill","sv-waypoint-mode","phase6-waypoint","svu-play-action","streetview-mode-badge"];
let prev="",prevAct="";
function tick(){
 if(activeEpisode){
  const clk=modal.querySelector(".cs-episode-timer"),flow=window.BerlinCityFlowV3,ep=window.BerlinCityEpisodes;
  if(clk){
   const remaining=flow?.remainingFor?.(activeEpisode);
   const ms=Number.isFinite(remaining)?remaining:(["alexanderplatz:vacatures","hermannplatz:delivery"].includes(activeEpisode)?ep?.remaining?.():null);
   if(Number.isFinite(ms)){
    const sec=Math.ceil(Math.max(0,ms)/1000);
    clk.textContent="Tijd over: "+Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
    if(ms<=0&&modal.classList.contains("open"))showEpisode(activeEpisode);
   }
  }
 }
 for(const id of oldIds)document.getElementById(id)?.remove();const g=window.__berlinMetroGame,o=g?.__allStreetOverlay;const active=!!g?.player?.__streetMode&&!!o?.root&&o.root.style.display!=="none";
document.documentElement.classList.toggle("street-clean-active",active);root.classList.toggle("open",active);if(!active){closeActivities();return}
const name=window.BerlinCityDiscovery?.where?.()?.name||o.context?.name||"Berlijn";if(name!==prev){root.querySelector(".label").textContent=name;prev=name}
const a=window.BerlinCityDiscovery?.readyActivity?.(),id=a?.id||"";if(id!==prevAct){play.style.display=a?"inline-block":"none";play.title=a?"Speel bij "+a.name:"";prevAct=id}}
window.BerlinCleanStreet={version:1,openActivities,closeActivities,inspect:()=>({active:root.classList.contains("open"),oldPresent:oldIds.filter(id=>document.getElementById(id))})};
Tick.every('ui.clean',500,tick);tick();
})();
