await import('./boot/main.bqh848uhh.js');
await import('./systems/CityClean.js');
await import('./systems/UiClean.js');
await import('./systems/CityEpisodesV1.js');
await import('./systems/CityFlowV3.js');

// Roadmap fase 1 – centrale Game State (alleen lezen); laadt als laatste, na alle bestaande systemen.
await import('./state/GameState.js');
