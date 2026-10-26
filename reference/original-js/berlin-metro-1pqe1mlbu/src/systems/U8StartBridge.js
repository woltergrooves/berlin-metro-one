import {Game} from 'https://berlin-metro-hwabi9n6s-wolter1.vercel.app/src/core/Game.js';
// Preserve the original game's public handle without the old parallel U8 exit patch.
const start=Game.prototype.start;
Game.prototype.start=function(){globalThis.__berlinMetroGame=this;return start.call(this);};
