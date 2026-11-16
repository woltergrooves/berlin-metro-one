import { Tick } from '../state/Tick.js';
const HIGHLIGHTS={
'Pankow':['🏛️','Rathaus Pankow','Historic town hall and landmark of Alt-Pankow'],
'Vinetastraße':['🌳','Bürgerpark Pankow','One of the best-known green spots in Pankow'],
'Schönhauser Allee':['🏭','Kulturbrauerei','Industrial culture complex with clubs, cinema and events'],
'Eberswalder Straße':['🌳','Mauerpark','Famous park, flea market and Sunday karaoke'],
'Senefelderplatz':['☕','Kollwitzplatz','Classic Prenzlauer Berg with cafés and historic streets'],
'Rosa-Luxemburg-Platz':['🎭','Volksbühne','Iconic Berlin theatre on Rosa-Luxemburg-Platz'],
'Alexanderplatz':['📡','Berliner Fernsehturm','The most famous skyline marker of Alexanderplatz'],
'Klosterstraße':['🏘️','Nikolaiviertel','Historic heart of Berlin around the Nikolaikirche'],
'Märkisches Museum':['🏛️','Märkisches Museum','Museum about the history and culture of Berlin'],
'Spittelmarkt':['🌉','Gertraudenbrücke','Historic crossing towards Fischerinsel'],
'Hausvogteiplatz':['🏛️','Gendarmenmarkt','Monumental square with the Konzerthaus and two cathedrals'],
'Stadtmitte':['🏛️','Gendarmenmarkt','One of the best-known squares in Berlin'],
'Anton-Wilhelm-Amo-Straße':['🕯️','Holocaustmonument','The memorial to the murdered Jews of Europe'],
'Potsdamer Platz':['🏙️','Potsdamer Platz','Modern high-rises, cinema and the former Sony Center'],
'Mendelssohn-Bartholdy-Park':['🚂','Deutsches Technikmuseum','Trains, planes and technology in a huge museum'],
'Gleisdreieck':['🌳','Park am Gleisdreieck','Large city park on former railway land'],
'Bülowstraße':['🎨','Urban Nation','Museum for street art and urban contemporary art'],
'Nollendorfplatz':['🌈','Nollendorfplatz & Motzstraße','Famous centre of Berlin\'s queer scene'],
'Wittenbergplatz':['🛍️','KaDeWe','The most famous department store in Berlin'],
'Zoologischer Garten':['⛪','Kaiser-Wilhelm-Gedächtniskirche','The ruined church and modern tower at Breitscheidplatz'],
'Ernst-Reuter-Platz':['🎓','Technische Universität Berlin','Large Berlin university campus on the Straße des 17. Juni'],
'Deutsche Oper':['🎼','Deutsche Oper Berlin','One of the most important opera houses in Germany'],
'Bismarckstraße':['🎼','Deutsche Oper Berlin','Opera house right on the Bismarckstraße axis'],
'Sophie-Charlotte-Platz':['🏰','Schloss Charlottenburg','The largest palace complex in Berlin'],
'Kaiserdamm':['📻','Funkturm Berlin','Historic radio tower at Messe Berlin'],
'Theodor-Heuss-Platz':['📻','Funkturm & Messe Berlin','West Berlin landmark and exhibition complex'],
'Neu-Westend':['🗿','Georg Kolbe Museum','Museum and sculpture garden in green Westend'],
'Olympia-Stadion':['🏟️','Olympiastadion Berlin','Historic stadium and home of Hertha BSC'],
'Ruhleben':['🎤','Waldbühne','Open-air stage in the Olympiapark'],
'Wittenau':['⛪','Alt-Wittenau','Village centre around the old church of Wittenau'],
'Rathaus Reinickendorf':['🏛️','Rathaus Reinickendorf','Monumental district hall of Reinickendorf'],
'Karl-Bonhoeffer-Nervenklinik':['🏥','Historisch Klinikgelände','Sprawling historic hospital complex'],
'Lindauer Allee':['🌊','Schäfersee','Popular lake and park in Reinickendorf'],
'Paracelsus-Bad':['🏊','Paracelsus-Bad','Well-known public pool in Reinickendorf'],
'Residenzstraße':['🌊','Schäfersee','Lake with walking route and city park'],
'Franz-Neumann-Platz':['🌊','Schäfersee','Green recreation spot right by the U8'],
'Osloer Straße':['🌿','Panke & Grüntaler Promenade','Green route along the Panke'],
'Pankstraße':['🕳️','Berliner Unterwelten','Bunkers and underground history around Gesundbrunnen'],
'Gesundbrunnen':['🕳️','Berliner Unterwelten','Tours through bunkers and hidden infrastructure'],
'Voltastraße':['🌳','Volkspark Humboldthain','Park with Flakturm viewpoint and rose garden'],
'Bernauer Straße':['🧱','Gedenkstätte Berliner Mauer','The most important memorial site of the Berlin Wall'],
'Rosenthaler Platz':['🌆','Rosenthaler Platz & Torstraße','Busy Mitte crossing full of cafés and nightlife'],
'Weinmeisterstraße':['🏘️','Hackesche Höfe','Famous Jugendstil courtyards in Mitte'],
'Jannowitzbrücke':['🌊','Spreeufer Jannowitzbrücke','View along the Spree towards Holzmarkt'],
'Heinrich-Heine-Straße':['🌿','Engelbecken','Quiet pond and park on the former Luisenstädtischer Kanal'],
'Moritzplatz':['🏢','Aufbau Haus','Creative centre for art, design and culture'],
'Kottbusser Tor':['🌆','Kottbusser Tor & Oranienstraße','Kreuzberg junction with food, bars and street life'],
'Schönleinstraße':['🛶','Maybachufer','Canal boulevard with market and a Neukölln/Kreuzberg vibe'],
'Hermannplatz':['🌳','Volkspark Hasenheide','Large park just south of Hermannplatz'],
'Boddinstraße':['🛫','Tempelhofer Feld','Former airport that is now a huge city park'],
'Leinestraße':['🛫','Tempelhofer Feld','Open parkland on the former Tempelhof airport'],
'Hermannstraße':['🌹','Körnerpark','Neo-baroque park and gallery in Neukölln']
};
let current=null,pinTimer=null;
const game=()=>globalThis.__berlinMetroGame;
const q=s=>encodeURIComponent(`${s}, Berlin, Germany`);
function style(){if(document.querySelector('#berlinHighlightsCss'))return;const s=document.createElement('style');s.id='berlinHighlightsCss';s.textContent='@keyframes metroPinPulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.04)}}';document.head.appendChild(s)}
function modal(item){let r=document.querySelector('#metroHighlightModal');if(!r){r=document.createElement('div');r.id='metroHighlightModal';r.style.cssText='display:none;position:fixed;inset:0;z-index:23200;background:#000b;align-items:center;justify-content:center;padding:16px;font-family:Arial;pointer-events:auto';r.onclick=e=>{if(e.target===r)r.style.display='none'};document.body.appendChild(r)}r.innerHTML=`<div style="width:min(440px,94vw);background:#151a21;color:white;border:1px solid #ffffff2c;border-radius:18px;padding:17px;box-shadow:0 24px 70px #000c"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:34px">${item[0]}</span><div><div style="font-size:11px;color:#f1c92c;font-weight:900">⭐ AREA HIGHLIGHT</div><b style="font-size:21px">${item[1]}</b></div><button id="mhClose" style="margin-left:auto;border:0;background:#2a3039;color:#fff;border-radius:9px;padding:8px">✕</button></div><p style="line-height:1.5;color:#cfd5dc">${item[2]}</p><button id="mhPin" style="width:100%;padding:12px;border:0;border-radius:10px;background:#f0c928;color:#151515;font-weight:900;margin-bottom:8px">📍 HIGHLIGHT IN VIEW</button><button id="mhMaps" style="width:100%;padding:12px;border:1px solid #ffffff2a;border-radius:10px;background:#252c35;color:#fff;font-weight:900">OPEN IN MAPS ↗</button><div style="font-size:10px;color:#808995;margin-top:10px">A highlight is a game tip for this area; Maps opens the real location.</div></div>`;r.querySelector('#mhClose').onclick=()=>r.style.display='none';r.querySelector('#mhPin').onclick=()=>{r.style.display='none';showPin(item)};r.querySelector('#mhMaps').onclick=()=>window.open(`https://www.google.com/maps/search/?api=1&query=${q(item[1])}`,'_blank','noopener');r.style.display='flex'}
function showPin(item){clearTimeout(pinTimer);let p=document.querySelector('#metroHighlightPin');if(!p){p=document.createElement('div');p.id='metroHighlightPin';p.style.cssText='position:fixed;left:50%;top:28%;z-index:17590;transform:translateX(-50%);pointer-events:none;font-family:Arial;text-align:center;filter:drop-shadow(0 5px 10px #000b)';document.body.appendChild(p)}p.innerHTML=`<div style="animation:metroPinPulse 1.2s ease-in-out infinite"><div style="display:inline-block;background:#f0c928;color:#121212;padding:8px 12px;border-radius:999px;font-weight:900;font-size:12px">📍 ${item[1]}</div><div style="font-size:30px;line-height:24px">▼</div></div>`;p.style.display='block';game()?.ui?.notify?.(`⭐ Highlight: ${item[1]}`);pinTimer=setTimeout(()=>p.style.display='none',6500)}
function ensureCard(ctx){const root=document.querySelector('#reliableStreetUi');if(!root||!ctx)return;let card=document.querySelector('#metroStationHighlight');if(!card){card=document.createElement('div');card.id='metroStationHighlight';card.style.cssText='margin-top:8px;background:#111e;border:1px solid #f0c92866;border-radius:14px;padding:10px;box-shadow:0 10px 34px #0009;backdrop-filter:blur(10px);pointer-events:auto';const bus=document.querySelector('#surfaceBusButtonV1');bus?root.insertBefore(card,bus):root.appendChild(card)}const item=HIGHLIGHTS[ctx.name];if(!item){card.style.display='none';return}card.style.display='block';card.innerHTML=`<div style="font-size:10px;color:#f0c928;font-weight:900;letter-spacing:.08em">⭐ MOST POPULAR HIGHLIGHT</div><div style="display:flex;gap:9px;align-items:center;margin-top:6px"><span style="font-size:25px">${item[0]}</span><div style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item[1]}</b><div style="font-size:10px;color:#aeb5bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item[2]}</div></div></div><button id="metroHighlightOpen" style="width:100%;margin-top:8px;border:0;border-radius:9px;padding:9px;background:#f0c928;color:#111;font-weight:900;touch-action:manipulation">VIEW HIGHLIGHT</button>`;card.querySelector('#metroHighlightOpen').onclick=e=>{e.preventDefault();e.stopPropagation();modal(item)}}
document.addEventListener('metro-street-cell',e=>{current=e.detail?.ctx||null;setTimeout(()=>ensureCard(current),0);setTimeout(()=>ensureCard(current),100)});
style();Tick.every('highlights.pin',700,()=>{const g=game();if(!g?.player?.__streetMode){document.querySelector('#metroHighlightPin')?.style.setProperty('display','none');return}if(current)ensureCard(current)});

function hoffDialogue(npc){const interaction=npc?.userData?.interaction;if(!interaction||interaction.__berlinV2)return;interaction.__berlinV2=true;interaction.action=()=>{const g=game();let sheet=document.querySelector('#hoffConversationV2');if(sheet){sheet.remove();return}sheet=document.createElement('div');sheet.id='hoffConversationV2';sheet.style.cssText='position:fixed;inset:0;z-index:23500;display:flex;align-items:flex-end;justify-content:center;background:#0009;color:#fff;font-family:Arial;pointer-events:auto';const card=document.createElement('div');card.style.cssText='width:min(520px,100vw);max-height:84vh;overflow:auto;padding:20px 20px max(22px,env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:#151b24;border-top:2px solid #f0c928;box-shadow:0 -20px 60px #000a';card.innerHTML='<div style="font-size:11px;color:#f0c928;font-weight:900">ALEXANDERPLATZ · CAMEO</div><h2 style="margin:5px 0 8px">David Hasselhoff</h2><p id="hoffText" style="line-height:1.55;margin:0 0 12px">Hey! Berlin always gets me. You can feel the history here — and the city still knows how to have a good time.</p><div id="hoffChoices"></div><div style="font-size:10px;color:#7f8893;margin-top:10px">Fictional game dialogue, inspired by his public persona and well-known Berlin connection.</div>';const text=card.querySelector('#hoffText'),choices=card.querySelector('#hoffChoices');const options=[['Why Berlin?','Germany has always had a special energy for me. Berlin especially — history, music, people in the streets. I came here as an entertainer, but the connection became bigger than one show.'],['Looking for Freedom?','That song took on a life of its own in Germany. When I sang it by the Brandenburg Gate on New Year’s Eve 1989, the Wall had just opened. Nobody standing there needed a lecture about what freedom meant.'],['So you brought down the Wall?','Ha! Great headline, not great history. I sang on a crane in a jacket covered in lights. The people of East and West Germany did the real work. I just had a very dramatic outfit.'],['Why do Germans love you?','Maybe because I never treated Germany like a side stop. I kept coming back, learned what the audience loved, and they gave that loyalty back. Also: Germans appreciate commitment. And apparently leather jackets.'],['Knight Rider or Baywatch?','If I’m driving through Berlin: Knight Rider. If somebody falls in the Spree: suddenly everybody expects Baywatch.'],['What should I see here?','You are on Alexanderplatz — start with the Fernsehturm. Then walk. Berlin makes more sense when you stop trying to see it all at once.'],['Later, Hoff!','Enjoy Berlin. And if you see a flashing piano-key jacket somewhere… no you didn’t.']];for(const [label,answer] of options){const b=document.createElement('button');b.textContent=label;b.style.cssText='display:block;width:100%;padding:12px 13px;margin:7px 0;border:1px solid #ffffff20;border-radius:10px;background:#28313d;color:#fff;font-weight:800;text-align:left;touch-action:manipulation';b.onclick=()=>{text.textContent=answer;if(label==='Later, Hoff!')setTimeout(()=>sheet.remove(),900)};choices.appendChild(b)}sheet.onclick=e=>{if(e.target===sheet)sheet.remove()};sheet.appendChild(card);document.body.appendChild(sheet);g?.ui?.notify?.('David Hasselhoff · conversation opened')};}
(async()=>{for(let i=0;i<2400;i++){const g=game();const npc=g?.scene?.getObjectByName?.('DavidHasselhoff');if(npc){hoffDialogue(npc);g.berlinHighlightsVersion='V1';return}await Tick.sleep(25,'boot.BerlinHighlightsV1')}})().catch(e=>console.error('[Metro] BerlinHighlightsV1',e));
