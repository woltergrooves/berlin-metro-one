const KEY='metro-economy-v2';
(function(){
  try{
    const s=JSON.parse(localStorage.getItem(KEY)||'null');
    const j=s?.activeDelivery;
    if(!j||j.status!=='active'||Number.isFinite(j.seconds))return;
    const total=Math.max(180,Math.round(((j.expiresAt||Date.now())-(j.startedAt||Date.now()))/1000)||480);
    j.seconds=total;
    j.basePay=Number.isFinite(j.basePay)?j.basePay:1500;
    j.maxTip=Number.isFinite(j.maxTip)?j.maxTip:500;
    j.note=j.note||'afleveradres';
    j.cargo=j.cargo||'pakket';
    j.line=j.line||'U2';
    localStorage.setItem(KEY,JSON.stringify(s));
  }catch(e){console.warn('[Metro] legacy job migration skipped',e)}
})();
