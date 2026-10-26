export function leaNode({s,st,part,euro,active,firstMeeting},node='root'){
 if(node==='root') return {say:firstMeeting?'Hoi! Jij bent toch degene die hier net woont? Ik ben Lea, paar deuren verder.':part==='nacht'?'Je bent laat thuis. Alles nog heel?':'Hey buur, hoe bevalt het?',choices:[
  ...(active?.to==='Rosa-Luxemburg-Platz'?[{t:'Ik heb een pakket voor je.',effect:'deliver',end:true,summary:'een pakket afgeleverd'}]:[]),
  {t:'Vertel eens over het huis.',n:'home',summary:'het appartement'},
  {t:'Hoe zit die huur ook alweer?',n:'rent',summary:'de huur'},
  {t:'Wat is leuk in de buurt?',n:'area',summary:'de buurt'},
  {t:'Later!',end:true,summary:'even met Lea gepraat'}]};
 if(node==='home') return {say:'Oud gebouw, dunne muren, veel karakter. Maak je kamer gewoon van jezelf. Een lamp, platen, planten — scheelt echt.',choices:[{t:'Kan ik spullen verbeteren?',n:'upgrade',summary:'woning-upgrades'},{t:'Klinkt goed.',end:true,summary:'het appartement'}]};
 if(node==='upgrade') return {say:'Zeker. Begin klein. Goede lamp en opslag zijn nuttiger dan meteen geld verbranden aan iets duurs.',choices:[{t:'Ik ga sparen.',end:true,summary:'woning-upgrades'}]};
 if(node==='rent') return {say:`Volgens je administratie komt de huur op dag ${s.home?.nextRentDay||8}. Openstaand: ${euro(s.home?.rentDebt||0)}.`,choices:[{t:'Duidelijk.',end:true,summary:'de huur'}]};
 if(node==='area') return {say:'Rosa is chill. Voor drukte ben je zo op Alex, en als je iets anders wilt pak je U8 vanaf daar richting Kotti.',choices:[{t:'Ik ga Kotti eens checken.',effect:'kottiLead',end:true,summary:'Kottbusser Tor'}]};
 return {say:'Tot later buur.',choices:[{t:'Later.',end:true,summary:'even gepraat'}]};
}
