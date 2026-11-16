export const DAILY_EVENTS = [
  {id:'busy', emoji:'🚇', title:'Busy day', text:'New delivery jobs give you 90 extra seconds today for busy streets on the way.', extraSeconds:90},
  {id:'quiet', emoji:'☕', title:'Quiet day', text:'Locals have time for a chat: new jobs can give up to €2 extra tip.', extraTip:200},
  {id:'packages', emoji:'📦', title:'Lots of orders', text:'Kiez Kurier pays 20% more base pay for new orders today.', payMultiplier:1.2},
  {id:'kotti', emoji:'🌙', title:'Kotti tonight', text:'Deniz pays €4 extra for a night job today. Ask him for work after 20:00.', nightBonus:400},
  {id:'pfand', emoji:'♻️', title:'A walk around the Kiez', text:'A quiet day to return bottle deposits, sort your rent and look up people you know.'}
];

export function currentDay(s) {
  const n = Number(s.home?.day);
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
}

export function dailyEvent(s) {
  const day = currentDay(s);
  const previous = s.world?.day === day ? s.world?.dailyEvent?.id : null;
  const event = DAILY_EVENTS.find(e => e.id === previous) || DAILY_EVENTS[(day - 1) % DAILY_EVENTS.length];
  return {...event, day};
}

export function ensureDailyWorld(s) {
  const event = dailyEvent(s);
  s.world ??= {};
  s.world.day = event.day;
  s.world.dailyEvent = event;
  return event;
}

export function applyDailyOffer(s, offer) {
  if (!offer) return offer;
  const event = dailyEvent(s);
  const original = offer.dailyOriginal || {basePay:offer.basePay, maxTip:offer.maxTip, seconds:offer.seconds};
  return {
    ...offer,
    dailyOriginal:original,
    basePay:Math.round(original.basePay * (event.payMultiplier || 1)),
    maxTip:original.maxTip + (event.extraTip || 0),
    seconds:original.seconds + (event.extraSeconds || 0),
    dailyEvent:event.id,
    dailyAppliedDay:event.day
  };
}
