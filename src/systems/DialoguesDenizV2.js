export function denizNode({st,part,rep,active,euro,firstMeeting,nightWork},node='root'){
 if(node==='root')return {say:firstMeeting?'Ey. Deniz. Als je hier vaker komt ga je vanzelf dezelfde gezichten herkennen.':part==='nacht'?'Nu wordt Kotti pas wakker.':'Kotti overdag is bijna een ander station.',choices:[
  ...(active?.to==='Kottbusser Tor'?[{t:'Ik heb een bestelling voor je.',effect:'deliver',end:true,summary:'een bestelling afgeleverd'}]:[]),
  {t:'Ken jij werk hier?',n:'work'},
  {t:'Wat gebeurt hier ’s nachts?',n:'night'},
  {t:'Hoe ben jij hier terechtgekomen?',n:'about'},
  {t:'Wat moet ik hier zien?',n:'area'},
  {t:'Later.',end:true,summary:'even met Deniz gepraat'}]};
 if(node==='work'){
  if(active)return {say:active.kind==='night'?`Je hebt mijn doos voor ${active.to}. ${active.line}, ongeveer ${active.hops} haltes. Lever buiten af, dan krijg je ${euro(active.basePay)}.`:`Je rijdt al naar ${active.to}. Eerst die bezorging afmaken.`,choices:[{t:'Ik ga op pad.',end:true,summary:'mijn lopende bezorging'}]};
  if(!nightWork.ready)return {say:nightWork.reason,choices:[{t:'Vertel iets over jezelf.',n:'about'},{t:'Ik kom terug.',end:true,summary:'nachtwerk bij Deniz'}]};
  const o=nightWork.offer;
  return {say:`Ja. Flyers voor een optreden, naar ${o.to}. Pak U8 richting Wittenau, stap op Alexanderplatz over op U2. Ongeveer ${o.hops} haltes en ${Math.ceil(o.seconds/60)} minuten. ${euro(o.basePay)} vast, geen fooi.${o.nightBonus?' Inclusief €4 nachtbonus vandaag.':''}`,choices:[{t:`Ik neem de nachtklus aan · ${euro(o.basePay)}`,effect:'acceptNight',n:'accepted'},{t:'Vandaag even niet.',end:true,summary:'Deniz’ werkaanbod'}]};
 }
 if(node==='accepted')return {say:`Mooi. De doos zit in je tas. Onder Stad in je telefoon staan de route en deadline: ${active?.to||'het afleveradres'}. Buiten bij de bestemming kun je afleveren.`,choices:[{t:'Komt goed.',end:true,summary:'een nachtklus aangenomen'}]};
 if(node==='night')return {say:st.relationship>=2?'Clubs, crews, kleine optredens. Vanaf 20:00 heb ik soms een doos flyers voor een adres aan de U2. Met reputatie 2 en als we elkaar kennen, kun je die rijden.':'Meer dan je op het eerste gezicht ziet. Leer me wat beter kennen en kom nog eens terug.',choices:[{t:'Heb je nu zo’n klus?',effect:'nightLead',n:'work'},{t:'Ik hou het in gedachten.',end:true,summary:'nachtwerk'}]};
 if(node==='about')return {say:'Ik ben hier blijven hangen na een optreden. Nu help ik vrienden met flyers, spullen en kleine evenementen. Je leert de stad kennen door iets voor mensen te doen.',choices:[{t:'Daar herken ik wel wat in.',effect:'bond',n:'bond'},{t:'Duidelijk.',end:true,summary:'Deniz leren kennen'}]};
 if(node==='bond')return {say:rep>=2?'Je hebt al laten zien dat je kunt bezorgen. Vraag me vanavond naar werk.':'Komt vanzelf. Miro op Alex kan je helpen aan je eerste bezorgingen. Dan zien we elkaar vanavond.',choices:[{t:'Nog iets over dat werk…',n:'work'},{t:'Tot later.',end:true,summary:'Deniz beter leren kennen'}]};
 if(node==='area')return {say:'Loop rond, eet iets, kijk wie er staat. Kotti draait meer om mensen dan om gebouwen.',choices:[{t:'Snap ik.',end:true,summary:'Kotti'}]};
 return {say:'Later.',choices:[{t:'Later.',end:true,summary:'even gepraat'}]};
}
