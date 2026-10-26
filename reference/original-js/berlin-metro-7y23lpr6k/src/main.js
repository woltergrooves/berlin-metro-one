await import('https://berlin-metro-dpsjiz57u-wolter1.vercel.app/src/main.js');
await import('./systems/HinterhofMoritzplatzV1.js').catch(e=>console.error('[Berlin Life] Hinterhof relocation',e));
console.info('[Berlin Life] Hinterhof relocated to Moritzplatz');
