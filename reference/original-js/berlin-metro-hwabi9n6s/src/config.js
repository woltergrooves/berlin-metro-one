export const CONFIG = {
  player: {
    eyeHeight: 1.68,
    speed: 3.8,
    lookSensitivity: 0.0042,
    maxPitch: Math.PI * 0.43,
  },
  render: {
    mobilePixelRatio: 1.2,
    desktopPixelRatio: 1.55,
    fogNear: 48,
    fogFar: 175,
    stationStreamRadius: 2,
  },
  train: {
    stationSpacing: 180,
    approachDistance: 58,
    approachSpeed: 15,
    cruiseSpeed: 25,
    openDelaySeconds: 0.55,
    doorOpenSeconds: 4.5,
    departDelaySeconds: 0.75,
    terminalDwellSeconds: 7,
    recycleDelaySeconds: 1.2,
    localLoopDelaySeconds: 5,
    maxLocalStopsAway: 2,
    reverseInitialDelaySeconds: 10,
    estimatedRideSeconds: 9.5,
    tracks: {
      ruhleben: -4.05,
      pankow: 9.45,
    },
  },
  economy: {
    startingCents: 0,
    pfandCents: 25,
    testTicketCents: 100,
  },
};
