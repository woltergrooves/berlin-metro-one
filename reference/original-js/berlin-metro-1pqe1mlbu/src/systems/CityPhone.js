import {dailyEvent} from './DailyWorldModel.js';
import {nightWorkAvailability} from './ContactWork.js';
import {cityMissionSummary} from './CityMissionModel.js';

export function nightRoute(job){
  if(job?.kind!=='night')return null;
  const direction=job.to==='Rosa-Luxemburg-Platz'?'Pankow':'Ruhleben';
  return `Kottbusser Tor → U8 richting Wittenau → overstappen op Alexanderplatz → U2 richting ${direction} → ${job.to}`;
}

export function attachCityPhone({document,getGame,sync}){
  let panel=null,button=null;
  function hide(){if(panel){panel.style.display='none';if(panel.firstChild)panel.replaceChildren();}const body=document.querySelector('#phoneBodyV2');if(body)body.style.display='';}
  function setup(){
    const body=document.querySelector('#phoneBodyV2'),nav=document.querySelector('#phoneNavV2');
    if(!body || !nav)return false;
    if(!document.querySelector('#phoneCityV3')){
      panel=document.createElement('div');panel.id='phoneCityV3';panel.style.cssText='display:none;flex:1;overflow:auto;padding:13px';body.after(panel);
      button=document.createElement('button');button.id='phoneCityTabV3';button.textContent='🌙 Stad';
      button.style.cssText='border:0;background:#1d2937;color:#fff;padding:8px 2px;font:700 10px Arial';
      nav.appendChild(button);nav.style.gridTemplateColumns='repeat(6,1fr)';
    }
    return true;
  }
  function render(){
    const game=getGame(),s=game?.metroEconomy;
    if(!s || !setup())return;
    sync();panel.replaceChildren();
    function card(title,text){
      const section=document.createElement('section');section.style.cssText='padding:12px;margin-bottom:10px;background:#171d24;border:1px solid #ffffff18;border-radius:14px';
      const heading=document.createElement('b');heading.textContent=title;
      const content=document.createElement('p');content.style.cssText='font-size:13px;line-height:1.5;white-space:pre-line;color:#c3cad1';content.textContent=text;
      section.append(heading,content);panel.appendChild(section);
    }
    const event=dailyEvent(s);card(`${event.emoji} Dag ${event.day} · ${event.title}`,event.text);
    card('📋 Stadsopdrachten',cityMissionSummary(s));
    const missions=document.createElement('button');missions.textContent='Opdrachten bekijken';missions.style.cssText='width:100%;padding:12px;margin-bottom:12px;border:0;border-radius:10px;background:#d8b62e;font-weight:800';missions.onclick=()=>document.dispatchEvent(new CustomEvent('metro-missions-open'));panel.appendChild(missions);
    const job=s.activeDelivery?.status==='active'?s.activeDelivery:null;
    if(job){
      const deadline=new Date(job.expiresAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      card('📦 Lopende bezorging',`${job.from} → ${job.to}\n${nightRoute(job)||job.line}\nAfleveren vóór ${deadline}\n€${(job.basePay/100).toFixed(2).replace('.',',')}${job.maxTip?' + fooi':''}\nLever buiten bij de bestemming af.`);
    }
    const availability=nightWorkAvailability(s,game.phase12State?.minutes??495);
    card('🌙 Nachtwerk bij Deniz',availability.ready?`Haal de doos bij Deniz op Kottbusser Tor op.\nBestemming: ${availability.offer.to}\n€${(availability.offer.basePay/100).toFixed(2).replace('.',',')}`:availability.reason);
    document.querySelector('#phoneBodyV2').style.display='none';panel.style.display='block';
  }
  function click(event){
    if(document.querySelector('#phoneModalV2')?.style.display!=='flex'){hide();return;}
    const target=event.target.closest?.('button');if(!target)return;
    if(target.id==='phoneBtnV2' || target.closest?.('#phoneBtnV2')){hide();sync();setup();if(getGame()?.metroEconomy?.activeDelivery?.kind==='night' && getGame().metroEconomy.activeDelivery.status==='active')render();}
    else if(target.id==='phoneCityTabV3')render();
    else if(target.id==='phoneCloseV2')hide();
    else if(target.closest?.('#phoneNavV2')){
      if(getGame()?.metroEconomy?.activeDelivery?.kind==='night' && getGame().metroEconomy.activeDelivery.status==='active' && ['jobs','map'].includes(target.dataset.tab))render();else hide();
    }
  }
  function changed(){if(panel?.style.display==='block' && document.querySelector('#phoneModalV2')?.style.display==='flex')render();}
  document.addEventListener('click',click);
  for(const name of ['metro-home-changed','metro-job-changed'])document.addEventListener(name,changed);
  return ()=>{document.removeEventListener('click',click);for(const name of ['metro-home-changed','metro-job-changed'])document.removeEventListener(name,changed);};
}
