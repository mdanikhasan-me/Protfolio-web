import type { Euler, Quaternion, Vector2 } from 'three';

// Calibrate to the existing 120 Hz reference replay, independent of display Hz.
const RESPONSE_HZ = 120;
export const pointerBlend = (rate: number, seconds: number) =>
  1 - Math.pow(1 - rate / RESPONSE_HZ, seconds * RESPONSE_HZ);

export function advancePointerRotation(
  pointer: Vector2,
  filtered: Vector2,
  velocity: Vector2,
  momentum: Euler,
  step: Euler,
  delta: Quaternion,
  orientation: Quaternion,
  seconds: number,
  intensity: number,
) {
  const frames = seconds * RESPONSE_HZ;
  velocity.copy(pointer).sub(filtered);
  filtered.addScaledVector(velocity, pointerBlend(10, seconds));
  const reach = Math.max(0, 1 - pointer.length() * 1.5);
  const impulse = 0.01 * reach * intensity * frames;
  momentum.x -= velocity.y * impulse;
  momentum.y += velocity.x * impulse;
  const retention = 1 - pointerBlend(1, seconds);
  momentum.x *= retention;
  momentum.y *= retention;
  momentum.z = 0;
  step.set(momentum.x * frames, momentum.y * frames, 0);
  delta.setFromEuler(step);
  orientation.premultiply(delta).normalize();
  return velocity.length() * reach;
}
