import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createU2Stations, U2_START_INDEX } from '../data/u2.js';
import { InputController } from './InputController.js';
import { PlayerController } from './PlayerController.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { WorldStreamer } from '../world/WorldStreamer.js';
import { TrainSystem } from '../world/Train.js';
import { Tick } from '../state/Tick.js';
import { RenderBase } from '../state/RenderBase.js';

export class Game {
  constructor(root, ui) {
    this.root = root;
    this.ui = ui;
    this.clock = new THREE.Clock();
    this.serviceCheckAccumulator = 0;
    this.collectedPfand = new Set();
    this.stations = createU2Stations(CONFIG.train.stationSpacing);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x09090a);
    this.scene.fog = new THREE.Fog(0x080809, CONFIG.render.fogNear, CONFIG.render.fogFar);

    const mobile = window.matchMedia?.('(pointer: coarse)').matches || /iPad|iPhone|iPod/i.test(navigator.userAgent);
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.05, 390);
    this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? CONFIG.render.mobilePixelRatio : CONFIG.render.desktopPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.root.appendChild(this.renderer.domElement);

    // G2: belichting, tone mapping, omgevingslicht, mist en kwaliteit komen uit één rendering-basis.
    RenderBase.install(this);

    this.input = new InputController(ui);
    this.economy = new EconomySystem();
    this.interaction = new InteractionSystem(this.camera, {
      maxDistance: 2.8,
      onFocus: (focus) => this.ui.onInteractionFocus(focus),
    });

    const forwardSpec = {
      id: 'u2-ruhleben',
      line: 'U2',
      stations: this.stations,
      direction: 1,
      startStationIndex: U2_START_INDEX,
      trackX: CONFIG.train.tracks.ruhleben,
      doorSide: 1,
      initialDelaySeconds: 0,
    };
    const reverseSpec = {
      id: 'u2-pankow',
      line: 'U2',
      stations: this.stations,
      direction: -1,
      startStationIndex: U2_START_INDEX + 1,
      trackX: CONFIG.train.tracks.pankow,
      doorSide: -1,
      initialDelaySeconds: CONFIG.train.reverseInitialDelaySeconds,
    };

    this.trains = [
      new TrainSystem(this.scene, forwardSpec, (train, status) => this.ui.onTrainStatus(train, status)),
      new TrainSystem(this.scene, reverseSpec, (train, status) => this.ui.onTrainStatus(train, status)),
    ];

    this.player = new PlayerController(this.camera, this.input);
    this.player.attachRoute(this.stations);
    this.player.attachTrains(this.trains);
    this.player.position.z = this.stations[U2_START_INDEX].z + 8;

    this.world = new WorldStreamer(this.scene, this.stations, this.trains, {
      collectedIds: this.collectedPfand,
      onLoadGameplay: (chunk) => this.registerChunkGameplay(chunk),
      onUnloadGameplay: (chunk) => this.unregisterChunkGameplay(chunk),
    });
    this.world.update(this.player.position.z);

    this.ui.updateEconomy(this.economy.snapshot());
    this.handleInteract = () => this.interaction.interact();
    this.ui.interactButton?.addEventListener('pointerdown', this.handleInteract);

    this.onResize = this.onResize.bind(this);
    // Fase 1 stap 7 deel 3: één frame-update. De kern (incl. prototype-patches NpcPatch/AudioPatch)
    // staat in frameCore; systemen haken in via Tick.frame i.p.v. game.loop te vervangen.
    const core = this.loop.bind(this);
    this.frameCore = core;
    this.loop = () => Tick.runFrame(core);
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(this.onResize, 120), { passive: true });
    this.onResize();
  }

  registerChunkGameplay(chunk) {
    for (const item of chunk.gameplay.items) {
      const interaction = item.userData.interaction;
      interaction.action = () => {
        if (!item.parent || this.collectedPfand.has(interaction.id)) return;
        this.collectedPfand.add(interaction.id);
        const result = this.economy.collectPfand();
        this.interaction.remove(item);
        item.parent.remove(item);
        this.ui.onInteractionFocus(null);
        this.ui.updateEconomy(result);
        this.ui.notify(`+ €0,25 Pfand · ${chunk.station.name}`);
      };
      this.interaction.add(item);
    }

    const machine = chunk.gameplay.ticketMachine;
    machine.userData.interaction.action = () => {
      const result = this.economy.buyTicket();
      this.ui.updateEconomy(result);
      this.ui.notify(result.message);
    };
    this.interaction.add(machine);
  }

  unregisterChunkGameplay(chunk) {
    for (const target of chunk.gameplay.interactives) this.interaction.remove(target);
  }

  keepTestServiceNearby(anchorIndex) {
    for (const train of this.trains) {
      if (this.player.activeTrain === train) continue;
      const validDeparture = anchorIndex + train.direction >= 0 && anchorIndex + train.direction < this.stations.length;
      if (!validDeparture) continue;
      const stopsAway = train.timeline.stopsUntilStation(anchorIndex);
      if (stopsAway > CONFIG.train.maxLocalStopsAway) {
        train.recenterNear(anchorIndex, CONFIG.train.localLoopDelaySeconds);
      }
    }
  }

  start() {
    this.clock.start();
    this.renderer.setAnimationLoop(this.loop);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  loop() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    for (const train of this.trains) {
      train.update(delta, { allowRecycle: this.player.activeTrain !== train });
    }

    this.player.update(delta);
    const anchorIndex = this.world.update(this.player.position.z);

    this.serviceCheckAccumulator += delta;
    if (this.serviceCheckAccumulator >= 0.5) {
      this.serviceCheckAccumulator = 0;
      this.keepTestServiceNearby(anchorIndex);
    }

    for (const train of this.trains) {
      train.setVisibleNear(this.player.position.z, this.player.activeTrain === train);
    }

    this.interaction.update();
    this.ui.updatePlayer(this.player, this.trains, this.stations);
    this.renderer.render(this.scene, this.camera);
  }
}
