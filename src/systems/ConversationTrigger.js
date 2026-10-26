export function attachConversationTrigger({document,getGame,stationAt,canTalk,openConversation}) {
  function target(event) {
    const game=getGame();
    if (!game?.player?.__streetMode) return null;
    const button=event.target.closest?.('#reliableStreetUi button');
    if (!button || !/PRAAT/i.test(button.textContent||'')) return null;
    const station=stationAt();
    return canTalk(station) ? {game,station} : null;
  }
  function click(event) {
    const context=target(event);
    if (!context) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openConversation(context.game,context.station);
  }
  function pointerdown(event) {
    if(target(event)) event.stopPropagation();
  }
  document.addEventListener('click',click,true);
  document.addEventListener('pointerdown',pointerdown,true);
  return ()=>{
    document.removeEventListener('click',click,true);
    document.removeEventListener('pointerdown',pointerdown,true);
  };
}
