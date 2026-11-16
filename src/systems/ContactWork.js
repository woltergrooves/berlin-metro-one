import {currentDay, dailyEvent} from './DailyWorldModel.js';

const DESTINATIONS = [
  {name:'Rosa-Luxemburg-Platz', hops:5, note:'Lea takes the box at the Altbau front door.'},
  {name:'Potsdamer Platz', hops:11, note:'Deliver at the hotel reception outside the station.'},
  {name:'Stadtmitte', hops:9, note:'Deliver at the office entrance outside the station.'}
];

export function nightWorkAvailability(s, minutes) {
  if (s.activeDelivery?.status === 'active') return {ready:false, reason:`First finish your delivery to ${s.activeDelivery.to}.`};
  const relationship = Number(s.contacts?.deniz?.relationship) || 0;
  const reputation = Number(s.jobStats?.reputation) || 0;
  if (relationship < 2) return {ready:false, reason:'Let\'s get to know each other a bit better first. Talk to me about the neighbourhood or come back another day.'};
  if (reputation < 2) return {ready:false, reason:`First build your courier reputation up to 2. You're now at ${reputation}; Miro has regular jobs at Alexanderplatz.`};
  const time = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  if (!Number.isFinite(time) || (time >= 360 && time < 1200)) return {ready:false, reason:'Come back between 20:00 and 06:00. Then I\'ll have night work for you.'};
  const day = currentDay(s);
  if (s.contactWork?.lastNightAcceptedDay === day) return {ready:false, reason:'You\'ve already had my round for today. There\'ll be work again tomorrow.'};
  const d = DESTINATIONS[(day - 1) % DESTINATIONS.length];
  const bonus = dailyEvent(s).nightBonus || 0;
  return {ready:true, offer:{
    id:`deniz-night-${day}`,
    kind:'night', contactId:'deniz', from:'Kottbusser Tor', to:d.name,
    line:'U8 → U2', note:d.note, cargo:'box of flyers for a gig',
    hops:d.hops, seconds:Math.min(900, 480 + d.hops * 35),
    basePay:1900 + d.hops * 100 + bonus, maxTip:0, nightBonus:bonus
  }};
}

export function acceptNightDelivery(s, {station, minutes, now=Date.now()}) {
  if (station !== 'Kottbusser Tor') return {ok:false, reason:'You collect this order in person from Deniz at Kottbusser Tor.'};
  const result = nightWorkAvailability(s, minutes);
  if (!result.ready) return {ok:false, reason:result.reason};
  const offer = result.offer;
  s.activeDelivery = {...offer, status:'active', startedAt:now, expiresAt:now + offer.seconds * 1000};
  s.surfaceItems ??= {};
  s.surfaceItems.delivery_package = (s.surfaceItems.delivery_package || 0) + 1;
  s.contactWork ??= {};
  s.contactWork.lastNightAcceptedDay = currentDay(s);
  s.flags ??= {};
  s.flags.nightCourierLead = true;
  return {ok:true, job:s.activeDelivery};
}

export function settleContactWork(s) {
  const j = s.activeDelivery;
  if (j?.kind !== 'night' || j.status !== 'done') return false;
  s.contactWork ??= {};
  if (s.contactWork.lastSettledId === j.id) return false;
  s.contactWork.lastSettledId = j.id;
  s.contactWork.nightsCompleted = (s.contactWork.nightsCompleted || 0) + 1;
  const deniz = s.contacts?.deniz;
  if (deniz) deniz.relationship = (deniz.relationship || 0) + 1;
  return true;
}

export function recordDailyBond(s, personId) {
  const contact = s.contacts?.[personId];
  if (!contact || contact.lastBondDay === currentDay(s)) return false;
  contact.lastBondDay = currentDay(s);
  contact.relationship = (contact.relationship || 0) + 1;
  return true;
}
