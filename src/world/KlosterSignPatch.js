import { WorldStreamer } from './WorldStreamer.js';

const previousLoad = WorldStreamer.prototype.load;
WorldStreamer.prototype.load = function klosterSignSafeLoad(index) {
  const alreadyLoaded = this.chunks.has(index);
  previousLoad.call(this, index);
  if (alreadyLoaded) return;
  const chunk = this.chunks.get(index);
  if (chunk?.station?.id !== 'klosterstrasse') return;

  const z = chunk.station.z;
  chunk.structure?.traverse?.((object) => {
    if (!object?.isMesh || object.geometry?.type !== 'BoxGeometry') return;
    const p = object.geometry.parameters || {};
    const thinWallPanel = (p.width ?? 99) < 0.13 && (p.depth ?? 0) > 4.4 && (p.depth ?? 99) < 5.1 && (p.height ?? 0) > 1.6 && (p.height ?? 99) < 2.2;
    const centeredOnSign = Math.abs(object.position.z - z) < 0.05;
    const onSideWall = Math.abs(object.position.x - 11.36) < 0.2 || Math.abs(object.position.x + 5.86) < 0.2;
    if (thinWallPanel && centeredOnSign && onSideWall) object.visible = false;
  });
};
