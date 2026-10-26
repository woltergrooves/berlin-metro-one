// Delegate to the existing job system: it owns packages, payment and deadlines.
// No new game-loop wrappers or independent job timers are installed.
export function acceptBaselineJob(game,station,document=globalThis.document) {
  const s=game.metroEconomy;
  if(!game.player?.__streetMode || station!=='Alexanderplatz' || !s || s.activeDelivery?.status==='active') return false;
  const button=document.querySelector('#acceptJobV2');
  if(!button || button.disabled) return false;
  button.click();
  return s.activeDelivery?.status==='active' && s.activeDelivery.from==='Alexanderplatz';
}
export function finishBaselineJob(game,station,document=globalThis.document) {
  const s=game.metroEconomy,j=s?.activeDelivery;
  if(!game.player?.__streetMode || j?.status!=='active' || j.to!==station) return false;
  const button=document.querySelector('#deliverJobV2');
  if(!button || button.disabled) return false;
  button.click();
  return j.status==='done';
}
