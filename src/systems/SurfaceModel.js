// Selected playable transfer stops from the BVG 200 route. The intervening
// physical stops count toward a Kurzstrecke; journey times are compressed.
// Source: https://www.bvg.de/de/verbindungen/linienuebersicht/200 (2026-10-16).
export const BUS_STOPS=[
  {name:'Zoologischer Garten',routeIndex:1,minutes:3},
  {name:'Potsdamer Platz',routeIndex:9,minutes:18},
  {name:'Stadtmitte',routeIndex:11,minutes:22},
  {name:'Spittelmarkt',routeIndex:13,minutes:25},
  {name:'Alexanderplatz',routeIndex:17,minutes:34}
];
export function busOptions(from){return BUS_STOPS.filter(stop=>stop.name!==from && BUS_STOPS.some(s=>s.name===from));}
export function busRoute(from,to){
  const a=BUS_STOPS.find(s=>s.name===from),b=BUS_STOPS.find(s=>s.name===to);
  if(!a || !b || a===b)return null;
  return {line:'200',from,to,stops:Math.abs(a.routeIndex-b.routeIndex),direction:b.routeIndex>a.routeIndex?'Michelangelostr.':'S+U Zoologischer Garten',seconds:Math.min(14,Math.max(4,Math.round(Math.abs(a.minutes-b.minutes)*.45)))};
}
export function busTicketValid(s,route){
  return !!route && (s.ticket?.type==='AB' && s.ticket.remainingMinutes>0 || s.ticket?.type==='SHORT' && s.ticket.remainingStops>=route.stops);
}
export function planBusRide(s,from,to,now=Date.now()){
  if(['waiting','riding'].includes(s.surfaceTravel?.status))return {ok:false,reason:'Je bent al onderweg.'};
  const route=busRoute(from,to);
  if(!route)return {ok:false,reason:'Deze busverbinding is hier niet beschikbaar.'};
  if(!busTicketValid(s,route))return {ok:false,reason:route.stops>3?'Voor deze rit heb je een geldig Berlin AB-ticket nodig.':'Koop eerst een geldig ticket bij de automaat.'};
  const wait=Math.min(2500,(6000-now%6000)%6000);
  s.surfaceTravel={...route,id:`bus200-${now}`,status:'waiting',plannedAt:now,departAt:now+wait,arriveAt:now+wait+route.seconds*1000};
  return {ok:true,ride:s.surfaceTravel};
}
export function departBus(s){
  const ride=s.surfaceTravel;
  if(ride?.status!=='waiting')return false;
  if(!busTicketValid(s,ride)){ride.status='cancelled';return false;}
  if(s.ticket.type==='SHORT'){s.ticket.remainingStops-=ride.stops;if(s.ticket.remainingStops<=0)s.ticket=null;}
  ride.status='riding';return true;
}
export function completeBus(s){
  const ride=s.surfaceTravel;
  if(ride?.status!=='riding')return false;
  ride.status='done';s.surfaceStats??={trips:0};s.surfaceStats.trips++;
  s.surfaceHistory??=[];s.surfaceHistory.unshift({id:ride.id,from:ride.from,to:ride.to,line:'200'});s.surfaceHistory=s.surfaceHistory.slice(0,10);return true;
}
