export function leaNode({s,st,part,euro,active,firstMeeting},node='root'){
 if(node==='root') return {say:firstMeeting?'Hi! Aren\'t you the one who just moved in here? I\'m Lea, a few doors down.':part==='nacht'?'You\'re home late. Everything still in one piece?':'Hey neighbour, how are you liking it?',choices:[
  ...(active?.to==='Rosa-Luxemburg-Platz'?[{t:'I have a parcel for you.',effect:'deliver',end:true,summary:'delivered a parcel'}]:[]),
  {t:'Tell me about the building.',n:'home',summary:'the apartment'},
  {t:'How does the rent work again?',n:'rent',summary:'the rent'},
  {t:'What\'s fun in the neighbourhood?',n:'area',summary:'the neighbourhood'},
  {t:'Later!',end:true,summary:'had a quick chat with Lea'}]};
 if(node==='home') return {say:'Old building, thin walls, lots of character. Just make your room your own. A lamp, records, plants — it really makes a difference.',choices:[{t:'Can I improve my stuff?',n:'upgrade',summary:'home upgrades'},{t:'Sounds good.',end:true,summary:'the apartment'}]};
 if(node==='upgrade') return {say:'Sure. Start small. A good lamp and storage are more useful than burning money on something expensive right away.',choices:[{t:'I\'ll save up.',end:true,summary:'home upgrades'}]};
 if(node==='rent') return {say:`According to your records, rent is due on day ${s.home?.nextRentDay||8}. Outstanding: ${euro(s.home?.rentDebt||0)}.`,choices:[{t:'Got it.',end:true,summary:'the rent'}]};
 if(node==='area') return {say:'Rosa is chill. For crowds you\'re at Alex in no time, and if you want something else take the U8 from there towards Kotti.',choices:[{t:'I\'ll go check out Kotti.',effect:'kottiLead',end:true,summary:'Kottbusser Tor'}]};
 return {say:'See you later, neighbour.',choices:[{t:'Later.',end:true,summary:'had a quick chat'}]};
}
