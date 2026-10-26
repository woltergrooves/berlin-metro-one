import {ensureDailyWorld,applyDailyOffer} from './DailyWorldModel.js';
import {settleContactWork} from './ContactWork.js';

export function attachCityEvents({document,getGame,persist}) {
  function sync(){
    const game=getGame(),s=game?.metroEconomy;
    if(!s)return null;
    const previousDay=s.world?.day,previousEvent=s.world?.dailyEvent?.id;
    const oldVersion=s.world?.eventVersion;
    const event=ensureDailyWorld(s);
    let changed=previousDay!==event.day || previousEvent!==event.id || oldVersion!=='actions-v1';
    s.world.eventVersion='actions-v1';
    const offer=s.jobs?.offer;
    if(offer && (offer.dailyAppliedDay!==event.day || offer.dailyEvent!==event.id)){
      s.jobs.offer=applyDailyOffer(s,offer);changed=true;
    }
    if(settleContactWork(s)){
      s.messages??=[];
      s.messages.unshift({id:`night-done:${s.activeDelivery.id}`,from:'deniz',text:'Netjes afgeleverd. Kom morgen na 20:00 terug voor een nieuwe ronde.',read:false,day:event.day,at:Date.now()});
      s.messages=s.messages.slice(0,40);changed=true;
    }
    if(changed)persist(s,game);
    return event;
  }
  const events=['metro-street-cell','metro-home-changed','metro-job-changed'];
  for(const event of events)document.addEventListener(event,sync);
  function beforeAccept(event){if(event.target.closest?.('#acceptJobV2'))sync();}
  document.addEventListener('click',beforeAccept,true);
  return {sync,dispose(){for(const event of events)document.removeEventListener(event,sync);document.removeEventListener('click',beforeAccept,true);}};
}
