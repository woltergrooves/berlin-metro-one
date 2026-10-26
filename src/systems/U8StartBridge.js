import {Game} from '../core/Game.js';
// Preserve the original game's public handle without the old parallel U8 exit patch.
const start=Game.prototype.start;
Game.prototype.start=function(){globalThis.__berlinMetroGame=this;return start.call(this);};
