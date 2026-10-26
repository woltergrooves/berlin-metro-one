(function saveGuardBootstrap(){
 "use strict";
 const KEY="berlin.safe.backup.v1.2026-10-18.step1";
 const MAX_SIZE=1700000;
 const gameKey=k=>{
  if(!k||k.startsWith("berlin.safe.backup."))return false;
  if(/(?:^|[._:-])(token|auth|oauth|api[-_]?key|secret|password|credential)(?:[._:-]|$)/i.test(k))return false;
  return /^(berlin|metro|bvg|u2[_:.-]|u8[_:.-]|save[-_]?slot|game[-_]?save|player[-_]?save)/i.test(k);
 };
 let status={version:1,backupKey:KEY,created:false,available:false,entries:0,error:null};
 const collect=()=>{
  const o=Object.create(null);
  for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);if(!gameKey(k))continue;
   const val=localStorage.getItem(k);if(typeof val==="string")o[k]=val;
  }
  return o
 };
 function createInitial(){
  try{
   const prior=localStorage.getItem(KEY);
   if(prior){
    const data=JSON.parse(prior);
    status={...status,available:true,created:false,entries:Object.keys(data?.values||{}).length};
    return status;
   }
   const values=collect(),keys=Object.keys(values);
   if(!keys.length){status={...status,available:false,error:"Geen bestaande opgeslagen speldata gevonden bij start."};return status}
   const payload=JSON.stringify({type:"berlin-life-backup",schema:1,origin:location.origin,createdAt:new Date().toISOString(),values});
   if(payload.length>MAX_SIZE){status={...status,error:"Save groter dan veilige back-uplimiet; export blijft mogelijk.",entries:keys.length};return status}
   localStorage.setItem(KEY,payload);
   status={...status,available:true,created:true,entries:keys.length,error:null};
  }catch(e){status={...status,available:false,error:String(e?.message||e)}}
  return status
 }
 function captureLive(){
  const values=collect();
  return{type:"berlin-life-save-export",schema:1,origin:location.origin,createdAt:new Date().toISOString(),values};
 }
 function exportData(){
  const blob=new Blob([JSON.stringify(captureLive(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download="berlin-life-save-"+new Date().toISOString().slice(0,10)+".json";
  link.style.display="none";document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),6000);
  return true
 }
 function validate(){
  const summary={at:Date.now(),backupAvailable:status.available,keyCount:0,invalidJson:[],storageAvailable:true};
  try{const o=collect();summary.keyCount=Object.keys(o).length;
   for(const[k,v]of Object.entries(o))if(/berlinLifeCoreV1|berlin-discovery-v4@|save[-_]?slots/i.test(k)){
    try{JSON.parse(v)}catch{summary.invalidJson.push(k)}
   }
  }catch(e){summary.storageAvailable=false;summary.error=String(e?.message||e)}
  return summary
 }
 window.BerlinSaveGuard={version:1,get status(){return {...status}},validate,captureLive,exportData,backupKey:KEY,
  // Deliberately no restore or automatic migration; avoids overwriting existing saves.
  readBackup:()=>{try{const x=localStorage.getItem(KEY);return x?JSON.parse(x):null}catch{return null}}
 };
 createInitial();
 console.info("[Berlin Life] Safe save snapshot:",status.available?"available":"not available","keys",status.entries);
})();