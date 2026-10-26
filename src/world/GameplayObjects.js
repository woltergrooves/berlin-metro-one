import * as THREE from 'three';

const GEO = {
  benchSeat: new THREE.BoxGeometry(2.6, 0.16, 0.65),
  benchBack: new THREE.BoxGeometry(2.6, 0.75, 0.13),
  benchLeg: new THREE.BoxGeometry(0.12, 0.58, 0.12),
  machine: new THREE.BoxGeometry(0.72, 2.05, 1.15),
  machineScreen: new THREE.BoxGeometry(0.05, 0.72, 0.72),
  bottleBody: new THREE.CylinderGeometry(0.09, 0.11, 0.34, 8),
  bottleNeck: new THREE.CylinderGeometry(0.045, 0.065, 0.13, 8),
  cap: new THREE.CylinderGeometry(0.052, 0.052, 0.035, 8),
  can: new THREE.CylinderGeometry(0.105, 0.105, 0.32, 10),
};

const MAT = {
  bench: new THREE.MeshLambertMaterial({ color: 0x6f201d }),
  metal: new THREE.MeshLambertMaterial({ color: 0x34383b }),
  machine: new THREE.MeshLambertMaterial({ color: 0xf0ca16 }),
  dark: new THREE.MeshLambertMaterial({ color: 0x1f2326 }),
  bottleGreen: new THREE.MeshLambertMaterial({ color: 0x5b8d68, transparent: true, opacity: 0.9 }),
  bottleBlue: new THREE.MeshLambertMaterial({ color: 0x6b7fa0, transparent: true, opacity: 0.9 }),
  canRed: new THREE.MeshLambertMaterial({ color: 0xd14f44 }),
  canBlue: new THREE.MeshLambertMaterial({ color: 0x3c6fb0 }),
  cap: new THREE.MeshLambertMaterial({ color: 0xe6dede }),
};

function mesh(geometry, material, position) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  return item;
}

function createBench(parent, x, z, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  group.add(mesh(GEO.benchSeat, MAT.bench, [0, 0.56, 0]));
  group.add(mesh(GEO.benchBack, MAT.bench, [0, 0.98, 0.25]));
  group.add(mesh(GEO.benchLeg, MAT.metal, [-0.95, 0.28, 0]));
  group.add(mesh(GEO.benchLeg, MAT.metal, [0.95, 0.28, 0]));
  parent.add(group);
  return group;
}

function createTicketMachine(parent, station) {
  const group = new THREE.Group();
  group.position.set(5.95, 0, -10);
  group.add(mesh(GEO.machine, MAT.machine, [0, 1.03, 0]));
  group.add(mesh(GEO.machineScreen, MAT.dark, [-0.385, 1.33, 0]));

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 1.18), MAT.dark);
  top.position.set(0, 2.08, 0);
  group.add(top);
  parent.add(group);
  group.userData.interaction = {
    kind: 'ticket-machine',
    label: 'Ticketautomaat gebruiken',
    stationId: station.id,
  };
  return group;
}

function createBottle(parent, station, slot, x, z, material) {
  const group = new THREE.Group();
  group.position.set(x, 0.08, z);
  group.add(mesh(GEO.bottleBody, material, [0, 0.19, 0]));
  group.add(mesh(GEO.bottleNeck, material, [0, 0.42, 0]));
  group.add(mesh(GEO.cap, MAT.cap, [0, 0.505, 0]));
  group.userData.interaction = {
    kind: 'pfand',
    label: 'Pfand oppakken · +€0,25',
    id: `${station.id}-pfand-${slot}`,
    stationId: station.id,
  };
  parent.add(group);
  return group;
}

function createCan(parent, station, slot, x, z, material) {
  const group = new THREE.Group();
  group.position.set(x, 0.08, z);
  group.add(mesh(GEO.can, material, [0, 0.18, 0]));
  group.userData.interaction = {
    kind: 'pfand',
    label: 'Pfand oppakken · +€0,25',
    id: `${station.id}-pfand-${slot}`,
    stationId: station.id,
  };
  parent.add(group);
  return group;
}

export function createPlatformGameplay(parent, station, collectedIds = new Set()) {
  createBench(parent, 2.35, -15, 0);
  createBench(parent, 4.65, 15, Math.PI);

  const ticketMachine = createTicketMachine(parent, station);
  const candidates = [
    () => createBottle(parent, station, 1, 3.45, -22, MAT.bottleGreen),
    () => createCan(parent, station, 2, 5.15, -3, MAT.canRed),
    () => createBottle(parent, station, 3, 5.75, 10, MAT.bottleBlue),
    () => createCan(parent, station, 4, 3.25, 23, MAT.canBlue),
    () => createBottle(parent, station, 5, 4.95, 17, MAT.bottleGreen),
  ];

  const items = [];
  candidates.forEach((factory, index) => {
    const id = `${station.id}-pfand-${index + 1}`;
    if (!collectedIds.has(id)) items.push(factory());
  });

  return { items, ticketMachine, interactives: [...items, ticketMachine] };
}
