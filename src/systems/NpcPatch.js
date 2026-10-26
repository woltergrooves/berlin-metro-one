import { Game } from '../core/Game.js';
import { NpcSystem } from './NpcSystem.js';
const baseLoop = Game.prototype.loop;
Game.prototype.loop = function(){
  if(!this.npcSystem) this.npcSystem = new NpcSystem(this);
  this.npcSystem.update();
  return baseLoop.call(this);
};
