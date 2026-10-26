export function busTransition(document,card,ride,{waiting,duration}){
  const window=document.createElement('div');window.setAttribute('aria-label',waiting?'De bus komt aan':'Stadsbeeld vanuit de bus');
  window.style.cssText='position:relative;height:220px;overflow:hidden;border:9px solid #d4a91d;border-bottom-width:28px;border-radius:24px 24px 9px 9px;background:linear-gradient(#6387a3,#bac5c1 68%,#514e48 69%);margin:18px 0;box-shadow:inset 0 0 35px #0005';
  const city=document.createElement('div');city.style.cssText='position:absolute;inset:0;width:220%;background:repeating-linear-gradient(90deg,transparent 0 20px,#343d48 20px 27px,transparent 27px 75px);opacity:.96';
  city.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 240" preserveAspectRatio="none" style="width:100%;height:100%"><g fill="#52606a"><path d="M0 100h85v80H0zM105 80h75v100h-75zM205 110h80v70h-80zM315 60h85v120h-85zM435 100h100v80H435zM570 80h90v100h-90zM700 65h100v115H700zM840 100h100v80H840zM980 70h95v110h-95zM1110 90h90v90h-90z"/></g><g fill="#e4c98e"><path d="M20 120h8v12h-8zM45 120h8v12h-8zM125 100h8v12h-8zM150 100h8v12h-8zM335 90h8v12h-8zM365 90h8v12h-8zM455 120h8v12h-8zM485 120h8v12h-8zM590 100h8v12h-8zM620 100h8v12h-8zM720 90h8v12h-8zM755 90h8v12h-8zM1000 90h8v12h-8z"/></g><path d="M0 180h1200v60H0z" fill="#383c43"/><path d="M0 215h1200" stroke="#e9d9a9" stroke-width="3" stroke-dasharray="50 50"/><path d="M530 180V50h7v130M534 48V8" stroke="#4b555c" stroke-width="4"/><ellipse cx="534" cy="57" rx="17" ry="8" fill="#b3b9bd"/></svg>';
  window.appendChild(city);
  const frame=document.createElement('div');frame.style.cssText='position:absolute;left:48%;top:0;bottom:0;width:9px;background:#d4a91d;box-shadow:2px 0 4px #0005';window.appendChild(frame);
  const bus=document.createElement('div');bus.textContent='🚌';bus.style.cssText='position:absolute;bottom:13px;font-size:60px;filter:drop-shadow(0 5px 3px #0007)';if(waiting)window.appendChild(bus);
  card.appendChild(window);
  const animations=[];
  if(waiting)animations.push(bus.animate([{transform:'translateX(350px)'},{transform:'translateX(80px)'}],{duration,fill:'forwards',easing:'ease-out'}));
  else animations.push(city.animate([{transform:'translateX(0)'},{transform:'translateX(-45%)'}],{duration:3800,iterations:Infinity}));
  animations.push(window.animate([{opacity:0},{opacity:1}],{duration:280,fill:'forwards'}));
  return ()=>animations.forEach(animation=>animation.cancel());
}
