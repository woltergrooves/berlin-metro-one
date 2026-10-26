import {miroNode} from './DialoguesMiroV1.js';
import {leaNode} from './DialoguesLeaV1.js';
import {denizNode} from './DialoguesDenizV2.js';
import {acceptBaselineJob,finishBaselineJob} from './BaselineJobs.js';
import {acceptNightDelivery,recordDailyBond,nightWorkAvailability} from './ContactWork.js';
import {ensureDailyWorld,applyDailyOffer} from './DailyWorldModel.js';
export {nightWorkAvailability};
const KEY='metro-economy-v2';
export const PEOPLE={Alexanderplatz:{id:'miro',name:'Miro',emoji:'🧔',role:'Kiez Späti',accent:'#f0c51a',node:miroNode},'Rosa-Luxemburg-Platz':{id:'lea',name:'Lea',emoji:'👩',role:'Buurvrouw',accent:'#79e3a3',node:leaNode},'Kottbusser Tor':{id:'deniz',name:'Deniz',emoji:'🧢',role:'Kotti contact',accent:'#7fb8ff',node:denizNode}};
export const euro=c=>`€${((c||0)/100).toFixed(2).replace('.',',')}`;
export function read(game){if(game.metroEconomy)return game.metroEconomy;try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
export function ensure(s){if(!s)return null;s.contacts??={};s.messages??=[];s.flags??={};for(const p of Object.values(PEOPLE)){s.contacts[p.id]??={met:false,relationship:0,lastTalkDay:0,unlocked:false};if(!s.contacts[p.id].met)s.contacts[p.id].unlocked=false;}return s}
export function save(s,game){if(game?.economy)game.economy.balanceCents=s.balanceCents||0;game?.ui?.updateEconomy?.({balanceCents:s.balanceCents||0,hasTicket:!!s.ticket,collectedPfand:s.pfand||0,ticketCents:400});try{localStorage.setItem(KEY,JSON.stringify(s))}catch{};document.dispatchEvent(new CustomEvent('metro-contacts-changed'));document.dispatchEvent(new CustomEvent('metro-economy-changed'))}
export function addSummary(s,id,text,day,isRead=true){const key=`talk:${id}:${day}:${text}`;if(s.messages.some(m=>m.id===key))return;s.messages.unshift({id:key,from:id,text,day,read:isRead,kind:'conversation-summary',at:Date.now()});s.messages=s.messages.slice(0,40)}
export function minutes(game){return ((Math.floor(game.phase12State?.minutes??495)%1440)+1440)%1440}
export function dayPart(game){const h=Math.floor(minutes(game)/60);if(h>=6&&h<11)return 'ochtend';if(h>=11&&h<17)return 'middag';if(h>=17&&h<22)return 'avond';return 'nacht'}
export function currentStation(){const txt=document.querySelector('#reliableStreetUi #rsPanel')?.textContent||'';for(const name of Object.keys(PEOPLE))if(txt.includes(name))return name;return null}
export function offer(s){const o=s.jobs?.offer;if(!o)return 'Ik kijk zo wat er ligt.';return `${o.to}. ${o.line}, ongeveer ${o.hops||'?'} haltes. ${euro(o.basePay||0)} plus fooi.`}
export function applyEffect(s,p,e,{game,station}={}){
 if(e==='bond')recordDailyBond(s,p.id);
 if(e==='kottiLead')s.flags.kottiLead=true;
 if(e==='nightLead'&&s.contacts[p.id].relationship>=2)s.flags.nightCourierLead=true;
 if(e==='acceptNight'){
  ensureDailyWorld(s);
  const result=acceptNightDelivery(s,{station,minutes:minutes(game)});
  if(!result.ok)return result;
  const j=result.job;
  addSummary(s,'deniz',`Nachtklus: ${j.from} → ${j.to}. ${j.line}, ±${j.hops} haltes. ${euro(j.basePay)}. Lever buiten af.`,s.home?.day||1,false);
  game.ui?.notify?.(`🌙 Nachtklus aangenomen · ${j.to} · ${euro(j.basePay)}`);
  return {ok:true,jobChanged:true};
 }
 if(e==='acceptSpati'){
  ensureDailyWorld(s);
  if(s.jobs?.offer)s.jobs.offer=applyDailyOffer(s,s.jobs.offer);
  if(!acceptBaselineJob(game,station))return {ok:false,reason:'Er is nu geen vrije bezorgklus. Check je huidige opdracht in je telefoon.'};
  const j=s.activeDelivery;if(j)addSummary(s,'miro',`Bezorging: ${j.to} · ${j.line} · ${euro(j.basePay)} + fooi. Lever buiten af.`,s.home?.day||1,false);
  return {ok:true,jobChanged:true};
 }
 if(e==='deliver'){
  if(s.activeDelivery?.to!==station||!finishBaselineJob(game,station))return {ok:false,reason:'Deze bestelling kan hier niet worden afgeleverd. Check je telefoon voor het afleveradres.'};
  return {ok:true,jobChanged:true};
 }
 return {ok:true};
}
