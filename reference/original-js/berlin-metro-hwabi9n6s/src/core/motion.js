export function computeMoveDelta({ yaw, strafe, forward, speed, delta }) {
  const magnitude = Math.hypot(forward, strafe);
  if (magnitude < 0.02) return { x: 0, z: 0 };

  const scale = speed * delta / Math.max(1, magnitude);
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  return {
    x: (strafe * cos - forward * sin) * scale,
    z: (-strafe * sin - forward * cos) * scale,
  };
}

export function computeLook({ yaw, pitch, lookX, lookY, sensitivity, maxPitch }) {
  const nextYaw = yaw - lookX * sensitivity;
  const rawPitch = pitch - lookY * sensitivity;
  const nextPitch = Math.max(-maxPitch, Math.min(maxPitch, rawPitch));
  return { yaw: nextYaw, pitch: nextPitch };
}
