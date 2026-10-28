// Phase 8.4/8.5 (extra U8 station details + transfer signage) was NEVER active in the live game:
// the original file (berlin-metro-easa0ncsd .../src/systems/Phase845V1.js) contains a syntax error
// (one surplus closing brace at line 23), so the browser rejected it and boot/main.easa0ncsd.js
// logged "[Metro] Phase 8.4/8.5 disabled". The untouched original is kept in
// docs/inactive-in-live-game/Phase845V1.js.txt. Re-enabling it is a gameplay change and needs approval.
throw new SyntaxError('Phase845V1 was inactive in the original game (syntax error in source)');
