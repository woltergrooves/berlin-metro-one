export const CITY_MISSIONS=[
  {id:'kiez',title:'Van Mitte naar Kotti',description:'Verken je buurt en ontmoet Berlijn buiten de perrons.',stops:['Alexanderplatz','Rosa-Luxemburg-Platz','Kottbusser Tor'],reward:900},
  {id:'west',title:'Met de 200 naar het westen',description:'Bezoek Potsdamer Platz en Zoo en maak een rit met bus 200.',stops:['Potsdamer Platz','Zoologischer Garten'],busTrips:1,reward:1400},
  {id:'u8',title:'Een rondje U8',description:'Stap buiten uit bij drie verschillende U8-buurten.',stops:['Rosenthaler Platz','Kottbusser Tor','Hermannplatz'],reward:1200}
];
export function acceptCityMission(s,id,station){
  const mission=CITY_MISSIONS.find(m=>m.id===id);s.cityMissions??={completed:[],active:null};
  if(!mission || s.cityMissions.active || s.cityMissions.completed.includes(id))return {ok:false,reason:'Je hebt al een opdracht lopen of hebt deze al afgerond.'};
  s.cityMissions.active={id,visited:mission.stops.includes(station)?[station]:[],busIds:[]};return {ok:true};
}
export function recordMissionVisit(s,station){
  const active=s.cityMissions?.active,mission=CITY_MISSIONS.find(m=>m.id===active?.id);
  if(!mission || !mission.stops.includes(station) || active.visited.includes(station))return false;
  active.visited.push(station);return true;
}
export function recordMissionBus(s,trip){
  const active=s.cityMissions?.active,mission=CITY_MISSIONS.find(m=>m.id===active?.id);
  if(!mission?.busTrips || trip?.line!=='200' || !trip.id || active.busIds.includes(trip.id))return false;
  active.busIds.push(trip.id);return true;
}
export function cityMissionReady(s){
  const active=s.cityMissions?.active,mission=CITY_MISSIONS.find(m=>m.id===active?.id);
  return !!mission && mission.stops.every(stop=>active.visited.includes(stop)) && active.busIds.length>=(mission.busTrips||0);
}
export function claimCityMission(s){
  if(!cityMissionReady(s))return {ok:false,reason:'Bezoek eerst alle gevraagde plekken en voltooi de rit.'};
  const active=s.cityMissions.active,mission=CITY_MISSIONS.find(m=>m.id===active.id);
  if(s.cityMissions.completed.includes(active.id))return {ok:false,reason:'Deze beloning is al opgehaald.'};
  s.balanceCents=(s.balanceCents||0)+mission.reward;s.cityMissions.completed.push(active.id);s.cityMissions.active=null;
  return {ok:true,reward:mission.reward};
}
export function cityMissionSummary(s){
  const active=s.cityMissions?.active,mission=CITY_MISSIONS.find(m=>m.id===active?.id);
  return mission?`${mission.title} · ${active.visited.length}/${mission.stops.length} plekken${mission.busTrips?` · bus ${Math.min(1,active.busIds.length)}/1`:''}`:'Nieuwe stadsopdrachten beschikbaar.';
}
