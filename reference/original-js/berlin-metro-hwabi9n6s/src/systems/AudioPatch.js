import { Game } from '../core/Game.js';
import { AudioSystem } from './AudioSystem.js';
const baseStart=Game.prototype.start,baseLoop=Game.prototype.loop;
Game.prototype.start=function(){if(!this.audioSystem)this.audioSystem=new AudioSystem(this);this.audioSystem.resume();return baseStart.call(this)};
Game.prototype.loop=function(){this.audioSystem?.update();return baseLoop.call(this)};
