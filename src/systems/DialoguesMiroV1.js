export function miroNode({s,st,part,rep,active,euro,offer,firstMeeting},node='root'){
 if(node==='root') return {say:firstMeeting?'Ah, you\'re new here, right? I\'m Miro. This Späti is pretty much my second living room.':part==='ochtend'?'Morning. Coffee\'s run out, but there are orders.':part==='nacht'?'Still out and about? Berlin never really stops.':'Yo. All good?',choices:[
  {t:'Got any work for me?',n:'work',summary:'courier work'},
  {t:'How\'s the Späti doing?',n:'shop',summary:'the Späti'},
  {t:'Who are you, actually?',n:'about',summary:'Miro'},
  {t:'I\'m off.',end:true,summary:'caught up'}]};
 if(node==='work') return {say:active?`You already have something running to ${active.to}. Deliver that one properly first.`:`Ja. ${offer(s)}`,choices:[...(!active?[{t:'I\'ll take the delivery job.',effect:'acceptSpati',n:'accepted'}]:[]),{t:'What should I watch out for?',n:'tips',summary:'courier work'},{t:'Great, I\'ll check the job card.',end:true,summary:'a new delivery job'}]};
 if(node==='accepted')return {say:`Nice, the order is in your bag. Destination: ${active?.to||'see your phone'}. Route and deadline are in your phone. Deliver outside.`,choices:[{t:'I\'m heading off.',end:true,summary:'accepted a delivery job'}]};
 if(node==='tips') return {say:rep>=3?'You know the drill by now. Check your Linienplan, take the right direction and don\'t waste too much time outside.':'Don\'t guess with lines. Check your phone, it shows the direction and the number of stops. And leave some margin for waiting.',choices:[{t:'Understood.',end:true,summary:'bezorgtips'}]};
 if(node==='shop') return {say:rep>=2?'Pretty good. Couriers like you help too: people order, you ride, I sell. Everyone\'s happy.':'Always the same: Mate, smokes, parcels, people who suddenly need crisps at 02:00.',choices:[{t:'Typical Berlin.',end:true,summary:'the Späti'}]};
 if(node==='about') return {say:'I know half of Mitte here. Not because I\'m interesting, but because everyone walks in here sooner or later.',choices:[{t:'Handy to know you then.',effect:'bond',n:'bond',summary:'getting to know Miro better'},{t:'Fair.',end:true,summary:'getting to know Miro'}]};
 if(node==='bond') return {say:'Exactly. And if you keep riding reliably, you\'ll hear more soon enough.',choices:[{t:'Deal.',end:true,summary:'trust with Miro'}]};
 return {say:'All quiet.',choices:[{t:'Later.',end:true,summary:'had a quick chat'}]};
}
