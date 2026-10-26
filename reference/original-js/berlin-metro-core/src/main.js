const BASE='https://berlin-metro-hwabi9n6s-wolter1.vercel.app';
const TRANSFER='https://berlin-metro-husn3dlxh-wolter1.vercel.app/src/systems/AlexanderTransferOverlay.js';
await import(`${BASE}/src/world/StationVisualPatch.js`);
await import(`${BASE}/src/world/KlosterSignPatch.js`);
await import(`${BASE}/src/world/TrainVisualPatch.js`);
await import(`${BASE}/src/systems/TrainRidePatch.js`);
await import(`${BASE}/src/systems/MobilePerfPatch.js`);
await import(`${BASE}/src/systems/NpcPatch.js`);
await import(`${BASE}/src/systems/AudioPatch.js`);
await import(`${BASE}/src/systems/AtmospherePatch.js`);
await import(`${BASE}/src/systems/TrainPolishV2.js`);
await import(`${BASE}/src/systems/AudioQuietPatch.js`);
await import(`${BASE}/src/world/AlexanderplatzUpgrade.js`);
await import(`${BASE}/src/world/AlexanderConcourse.js`);
await import(`${BASE}/src/world/U8Alexanderplatz.js`);
await import(`${BASE}/src/systems/PlayerConcoursePatch.js`);
await import(`${BASE}/src/world/AlexanderTransitionFix.js`);
await import(TRANSFER);
const [{Game},{Hud}]=await Promise.all([import(`${BASE}/src/core/Game.js`),import(`${BASE}/src/ui/Hud.js`)]);
const boot=document.querySelector('#boot'),startButton=document.querySelector('#startButton'),hud=new Hud();let game=null;
async function installOptionalFullU8(){try{const mod=await import('./systems/U8FullLineSafe.js');await mod.installU8FullLine?.(game,hud)}catch(error){console.error('[Metro] Full U8 disabled:',error);hud.notify?.('Volledige U8 kon niet laden · basisgame blijft actief.')}}
function launch(){if(game)return;boot.classList.add('hidden');hud.show();game=new Game(document.querySelector('#app'),{leftZone:document.querySelector('#leftZone'),rightZone:document.querySelector('#rightZone'),stickBase:document.querySelector('#stickBase'),stickKnob:document.querySelector('#stickKnob'),interactButton:hud.interactButton,onTrainStatus:(train,text)=>hud.onTrainStatus(train,text),updatePlayer:(player,trains,stations)=>hud.updatePlayer(player,trains,stations),updateEconomy:state=>hud.updateEconomy(state),onInteractionFocus:interaction=>hud.onInteractionFocus(interaction),notify:text=>hud.notify(text)});game.start();installOptionalFullU8()}
startButton.addEventListener('click',launch,{once:true});