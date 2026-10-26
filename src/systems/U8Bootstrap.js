import {Game} from '../core/Game.js';
import {Hud} from '../ui/Hud.js';
import {installU8FullLine} from './U8FullLineSafe.js';

// Load the local installer before Start can be pressed. The original core's
// optional dynamic import then sees __u8FullInstalled and does nothing.
export function attachU8Bootstrap(GameClass,HudClass,installLine){
  const start=GameClass.prototype.start;
  GameClass.prototype.start=function(){
    const result=start.call(this);
    if(this.__u8FullInstalled)return result;
    const hud=new HudClass();hud.updatePlayer=()=>{};hud.notify=text=>this.ui.notify?.(text);
    // This installer is synchronous: all dependencies were statically loaded.
    installLine(this,hud);
    const native=this.ui.updatePlayer;
    this.ui.updatePlayer=function(...args){const value=native.apply(this,args);hud.updatePlayer(...args);return value;};
    this.u8BootVersion='direct-start-v2';
    return result;
  };
}
attachU8Bootstrap(Game,Hud,installU8FullLine);
