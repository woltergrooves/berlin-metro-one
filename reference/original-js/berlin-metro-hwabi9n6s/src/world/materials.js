import * as THREE from 'three';

export const mats = {
  concrete: new THREE.MeshLambertMaterial({ color: 0xa9a9a4 }),
  darkConcrete: new THREE.MeshLambertMaterial({ color: 0x3a3a39 }),
  yellow: new THREE.MeshLambertMaterial({ color: 0xf4cf22 }),
  red: new THREE.MeshLambertMaterial({ color: 0xc51d2a }),
  black: new THREE.MeshLambertMaterial({ color: 0x111111 }),
  metal: new THREE.MeshLambertMaterial({ color: 0x777d80 }),
  seat: new THREE.MeshLambertMaterial({ color: 0x7d3030 }),
  glass: new THREE.MeshLambertMaterial({ color: 0x7db5c9, transparent: true, opacity: 0.24, depthWrite: false }),
  lightPanel: new THREE.MeshBasicMaterial({ color: 0xfff3d8 }),
};
