// Berlin Life — LineSurroundings (Mijlpaal 1, U1d): de echte omgeving langs een nieuwe lijn.
//
// Per viaductstation één OSM-pakket (public/assets/surroundings/<lijn>/<id>.json, gemaakt met
// tools/g4/osm2pack.py — © OpenStreetMap-bijdragers, ODbL). Het bouwen zelf deelt de code met G4
// (Surroundings.buildPack): gebouwen met Berlijnse gevels, wegen, groen, water, bomen, 's avonds ramen.
//
// Net als bij de U2 staat alleen het pakket van het dichtstbijzijnde station er: de stations liggen in het
// spel 150 m uit elkaar (echt ±720 m), dus de pakketten zouden elkaar overlappen. Het vorige pakket blijft
// staan tot het nieuwe klaar is (geen gat bij het wisselen). Zolang er een pakket staat, verbergt LineWorld
// zijn tijdelijke straat en gevels. De hoogte volgt de lijn (LineWorld.groundAt: helling bij Gleisdreieck,
// tunnelmond); rivieren onder bruggen (Oberbaumbrücke) blijven vrij (LineWorld.clearZones).
//
// Status: BerlinLines.U1.surroundings() of BerlinLineSurroundings.status().
import { buildPack, tintPack, disposePack, osmCredit } from '../state/Surroundings.js';

const RANGE = 160;              // m langs de lijn: verder van elk pakketstation → niets tonen
const SHOW_NEAR = 110;          // ook buiten de open lucht tonen (tunnelmond) tot zo ver van het station
const KEEP = 2;                 // hoeveel gebouwde pakketten maximaal tegelijk (huidig + vorig)

export class LineSurroundings {
  constructor(world, line, stations) {
    this.world = world; this.line = line;
    this.stations = stations.filter(s => s.surroundings && s.kind === 'viaduct');
    this.base = new URL(`/assets/surroundings/${line.id.toLowerCase()}/`, location.href);
    this.packs = new Map();       // id → Promise<pack>
    this.built = new Map();       // id → { built, st, usedAt }
    this.loading = null; this.current = null; this.failed = new Map();
    this.counts = { built: 0, disposed: 0, failed: 0 };
    this.lastTint = 0; this.lastNight = -1; this.visible = false;
  }
  load(id) {
    if (!this.packs.has(id)) this.packs.set(id, fetch(new URL(id + '.json', this.base)).then(r => { if (!r.ok) throw new Error('U1d-pakket ' + r.status); return r.json(); })
      .catch(e => { this.packs.delete(id); throw e; }));
    return this.packs.get(id);
  }
  build(st, pack) {
    const zones = this.world.clearZones().map(([a, b]) => [a - st.x, b - st.x]);
    const built = buildPack(pack, {
      line: this.line.id, steel: this.line.steel || '#3f5a4a', clear: zones, sunkWater: !!st.surroundings.sunk,
      ground: x => this.world.groundAt(st.x + x),
    });
    built.group.position.x = st.x; built.group.updateMatrix?.();
    built.group.userData.lineSurroundings = st.id;
    this.world.root.add(built.group);
    this.built.set(st.id, { built, st, usedAt: performance.now() });
    this.counts.built++; this.lastNight = -1;
  }
  drop(id) { const e = this.built.get(id); if (!e) return; disposePack(e.built); this.built.delete(id); this.counts.disposed++; }
  clear() { for (const id of [...this.built.keys()]) this.drop(id); this.current = null; }
  /** Elk frame (goedkoop): kiest het pakket, bouwt hooguit één tegelijk, zet zichtbaarheid en avondlicht. */
  update(player, active, x) {
    let target = null, best = Infinity;
    if (active) for (const st of this.stations) { const d = Math.abs(x - st.x); if (d < best) { best = d; target = st; } }
    if (best > RANGE) target = null;
    const now = performance.now();
    if (target && !this.built.has(target.id) && !this.loading && !(now - (this.failed.get(target.id) || -1e9) < 15000)) {
      const st = target; this.loading = st.id;
      this.load(st.id).then(pack => {
        this.loading = null;
        try { if (!this.built.has(st.id)) this.build(st, pack); }
        catch (err) { this.counts.failed++; this.failed.set(st.id, performance.now()); console.warn('[Berlin Life] U1d-omgeving overgeslagen', st.id, err); }
      }).catch(err => { this.loading = null; this.counts.failed++; this.failed.set(st.id, performance.now()); console.warn('[Berlin Life] U1d-pakket niet geladen', st.id, err); });
    }
    // Tonen: het doelpakket als het er is, anders het vorige (tot het nieuwe klaar is).
    let show = target && this.built.get(target.id);
    if (!show && target && this.current) show = this.built.get(this.current);
    if (show && target && show.st.id === target.id) this.current = target.id;
    const open = !!(active && !player?.__streetMode && (player?.__lineOpenAir || best < SHOW_NEAR || player?.__lineTrain));
    let any = false;
    for (const [id, e] of this.built) { const vis = open && e === show; e.built.group.visible = vis; any ||= vis; if (vis) e.usedAt = now; }
    this.visible = any;
    this.world.setCity(!any);
    globalThis.__lineOsmVisible = any;
    if (any !== this.creditShown) { const c = osmCredit(); if (c) c.style.display = any ? 'block' : 'none'; this.creditShown = any; }
    // Opruimen: niet actief → na 20 s alles weg; anders hooguit KEEP pakketten.
    if (!active) { if (this.built.size && now - (this.inactiveSince ??= now) > 20000) this.clear(); return; }
    this.inactiveSince = undefined;
    if (this.built.size > KEEP) {
      const old = [...this.built.entries()].filter(([, e]) => e !== show).sort((a, b) => a[1].usedAt - b[1].usedAt);
      while (this.built.size > KEEP && old.length) this.drop(old.shift()[0]);
    }
    if (any && now - this.lastTint > 500) {
      this.lastTint = now;
      const d = globalThis.BerlinRender?.daylight ?? 1, night = Math.round(Math.max(0, Math.min(1, (0.5 - d) * 2.4)) * 50) / 50;
      const sky = globalThis.__berlinMetroGame?.scene?.fog?.color;
      for (const e of this.built.values()) tintPack(e.built, night, sky, d);
    }
  }
  status() {
    return { packs: this.stations.map(s => s.id), built: [...this.built.keys()], visible: this.visible ? this.current : null, loading: this.loading, ...this.counts, attribution: '© OpenStreetMap-bijdragers' };
  }
}
