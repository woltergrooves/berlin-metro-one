import {currentDay, dailyEvent} from './DailyWorldModel.js';

const DESTINATIONS = [
  {name:'Rosa-Luxemburg-Platz', hops:5, note:'Lea neemt de doos bij de Altbau-voordeur aan.'},
  {name:'Potsdamer Platz', hops:11, note:'Lever af bij de hotelreceptie buiten het station.'},
  {name:'Stadtmitte', hops:9, note:'Lever af bij de kantoorentree buiten het station.'}
];

export function nightWorkAvailability(s, minutes) {
  if (s.activeDelivery?.status === 'active') return {ready:false, reason:`Maak eerst je bezorging naar ${s.activeDelivery.to} af.`};
  const relationship = Number(s.contacts?.deniz?.relationship) || 0;
  const reputation = Number(s.jobStats?.reputation) || 0;
  if (relationship < 2) return {ready:false, reason:'Laten we elkaar eerst wat beter leren kennen. Praat met me over de buurt of kom nog een dag terug.'};
  if (reputation < 2) return {ready:false, reason:`Bouw eerst je koerierreputatie op naar 2. Je staat nu op ${reputation}; Miro heeft gewone klussen op Alexanderplatz.`};
  const time = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  if (!Number.isFinite(time) || (time >= 360 && time < 1200)) return {ready:false, reason:'Kom tussen 20:00 en 06:00 terug. Dan heb ik nachtwerk voor je.'};
  const day = currentDay(s);
  if (s.contactWork?.lastNightAcceptedDay === day) return {ready:false, reason:'Je hebt mijn ronde voor vandaag al gehad. Morgen ligt er weer werk.'};
  const d = DESTINATIONS[(day - 1) % DESTINATIONS.length];
  const bonus = dailyEvent(s).nightBonus || 0;
  return {ready:true, offer:{
    id:`deniz-night-${day}`,
    kind:'night', contactId:'deniz', from:'Kottbusser Tor', to:d.name,
    line:'U8 → U2', note:d.note, cargo:'doos flyers voor een optreden',
    hops:d.hops, seconds:Math.min(900, 480 + d.hops * 35),
    basePay:1900 + d.hops * 100 + bonus, maxTip:0, nightBonus:bonus
  }};
}

export function acceptNightDelivery(s, {station, minutes, now=Date.now()}) {
  if (station !== 'Kottbusser Tor') return {ok:false, reason:'Je haalt deze bestelling persoonlijk op bij Deniz op Kottbusser Tor.'};
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
