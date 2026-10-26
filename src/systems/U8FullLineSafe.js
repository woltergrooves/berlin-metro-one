import {addFullU8Visual} from './U8FullLineVisual.js';
import {installU8FullRuntime} from './U8ParityRuntime.js';
export function installU8FullLine(game,hud){
  if(game.__u8FullInstalled)return;
  const chunk=[...game.world.chunks.values()].find(c=>c.station?.id==='alexanderplatz');
  if(!chunk?.structure)throw new Error('Alexanderplatz ontbreekt');
  const line=addFullU8Visual(chunk.structure,chunk.station),train=chunk.structure.userData.u8Train;
  if(!train?.userData?.u8)throw new Error('U8-trein ontbreekt');
  installU8FullRuntime(game,hud,train,line);game.__u8FullInstalled=true;
  hud.notify?.('U8 · beide richtingen rijden met de U2-dienstregeling');
}
