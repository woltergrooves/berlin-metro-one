export const DAILY_EVENTS = [
  {id:'busy', emoji:'🚇', title:'Drukke dag', text:'Bij nieuwe bezorgklussen krijg je vandaag 90 seconden extra voor drukte onderweg.', extraSeconds:90},
  {id:'quiet', emoji:'☕', title:'Rustige dag', text:'Buurtbewoners hebben tijd voor een praatje: bij nieuwe klussen is tot €2 extra fooi mogelijk.', extraTip:200},
  {id:'packages', emoji:'📦', title:'Veel bestellingen', text:'Kiez Kurier betaalt vandaag 20% meer basisloon voor nieuwe bestellingen.', payMultiplier:1.2},
  {id:'kotti', emoji:'🌙', title:'Kotti vanavond', text:'Deniz betaalt vandaag €4 extra voor een nachtklus. Vraag hem na 20:00 naar werk.', nightBonus:400},
  {id:'pfand', emoji:'♻️', title:'Een rondje door de Kiez', text:'Een rustige dag om statiegeld in te leveren, je huur te regelen en bekenden op te zoeken.'}
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
