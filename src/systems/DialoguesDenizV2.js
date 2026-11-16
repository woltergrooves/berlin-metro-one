export function denizNode({st,part,rep,active,euro,firstMeeting,nightWork},node='root'){
 if(node==='root')return {say:firstMeeting?'Ey. Deniz. If you come here more often you\'ll start recognising the same faces.':part==='nacht'?'Now Kotti is only just waking up.':'Kotti in the daytime is almost a different station.',choices:[
  ...(active?.to==='Kottbusser Tor'?[{t:'I have an order for you.',effect:'deliver',end:true,summary:'delivered an order'}]:[]),
  {t:'Do you know of any work here?',n:'work'},
  {t:'What happens here at night?',n:'night'},
  {t:'How did you end up here?',n:'about'},
  {t:'What should I see here?',n:'area'},
  {t:'Later.',end:true,summary:'had a quick chat with Deniz'}]};
 if(node==='work'){
  if(active)return {say:active.kind==='night'?`You've got my box for ${active.to}. ${active.line}, about ${active.hops} stops. Deliver outside and you'll get ${euro(active.basePay)}.`:`You're already on your way to ${active.to}. Finish that delivery first.`,choices:[{t:'I\'m heading off.',end:true,summary:'my delivery in progress'}]};
  if(!nightWork.ready)return {say:nightWork.reason,choices:[{t:'Tell me something about yourself.',n:'about'},{t:'I\'ll come back.',end:true,summary:'night work with Deniz'}]};
  const o=nightWork.offer;
  return {say:`Yes. Flyers for a gig, to ${o.to}. Take the U8 towards Wittenau, change to the U2 at Alexanderplatz. About ${o.hops} stops and ${Math.ceil(o.seconds/60)} minutes. ${euro(o.basePay)} fixed, no tip.${o.nightBonus?' Including a €4 night bonus today.':''}`,choices:[{t:`I'll take the night job · ${euro(o.basePay)}`,effect:'acceptNight',n:'accepted'},{t:'Not today.',end:true,summary:'Deniz’s job offer'}]};
 }
 if(node==='accepted')return {say:`Nice. The box is in your bag. Under City in your phone you'll find the route and deadline: ${active?.to||'the delivery address'}. You can deliver outside at the destination.`,choices:[{t:'Will do.',end:true,summary:'accepted a night job'}]};
 if(node==='night')return {say:st.relationship>=2?'Clubs, crews, small gigs. From 20:00 I sometimes have a box of flyers for an address on the U2. With reputation 2 and once we know each other, you can run those.':'More than you see at first glance. Get to know me a bit better and come back again.',choices:[{t:'Do you have a job like that now?',effect:'nightLead',n:'work'},{t:'I\'ll keep it in mind.',end:true,summary:'night work'}]};
 if(node==='about')return {say:'I stuck around here after a gig. Now I help friends with flyers, gear and small events. You get to know the city by doing something for people.',choices:[{t:'I can relate to that.',effect:'bond',n:'bond'},{t:'Got it.',end:true,summary:'getting to know Deniz'}]};
 if(node==='bond')return {say:rep>=2?'You\'ve already shown you can deliver. Ask me for work tonight.':'It\'ll come. Miro at Alex can help you with your first deliveries. Then we\'ll see each other tonight.',choices:[{t:'One more thing about that work…',n:'work'},{t:'See you later.',end:true,summary:'getting to know Deniz better'}]};
 if(node==='area')return {say:'Walk around, eat something, see who\'s there. Kotti is more about people than buildings.',choices:[{t:'I get it.',end:true,summary:'Kotti'}]};
 return {say:'Later.',choices:[{t:'Later.',end:true,summary:'had a quick chat'}]};
}
