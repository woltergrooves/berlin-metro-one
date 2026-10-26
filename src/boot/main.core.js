

await import('../world/StationVisualPatch.js');
await import('../world/KlosterSignPatch.js');
await import('../world/TrainVisualPatch.js');
await import('../systems/TrainRidePatch.js');
await import('../systems/MobilePerfPatch.js');
await import('../systems/NpcPatch.js');
await import('../systems/AudioPatch.js');
await import('../systems/AtmospherePatch.js');
await import('../systems/TrainPolishV2.js');
await import('../systems/AudioQuietPatch.js');
await import('../world/AlexanderplatzUpgrade.js');
await import('../world/AlexanderConcourse.js');
await import('../world/U8Alexanderplatz.js');
await import('../systems/PlayerConcoursePatch.js');
await import('../world/AlexanderTransitionFix.js');
await import('../systems/AlexanderTransferOverlay.js');
const [{Game},{Hud}]=await Promise.all([import('../core/Game.js'),import('../ui/Hud.js')]);
const boot=document.querySelector('#boot'),startButton=document.querySelector('#startButton'),hud=new Hud();let game=null;
async function installOptionalFullU8(){try{const mod=await import('../systems/U8FullLineSafe.js');await mod.installU8FullLine?.(game,hud)}catch(error){console.error('[Metro] Full U8 disabled:',error);hud.notify?.('Volledige U8 kon niet laden · basisgame blijft actief.')}}
function launch(){if(game)return;boot.classList.add('hidden');hud.show();game=new Game(document.querySelector('#app'),{leftZone:document.querySelector('#leftZone'),rightZone:document.querySelector('#rightZone'),stickBase:document.querySelector('#stickBase'),stickKnob:document.querySelector('#stickKnob'),interactButton:hud.interactButton,onTrainStatus:(train,text)=>hud.onTrainStatus(train,text),updatePlayer:(player,trains,stations)=>hud.updatePlayer(player,trains,stations),updateEconomy:state=>hud.updateEconomy(state),onInteractionFocus:interaction=>hud.onInteractionFocus(interaction),notify:text=>hud.notify(text)});game.start();installOptionalFullU8()}
startButton.addEventListener('click',launch,{once:true});