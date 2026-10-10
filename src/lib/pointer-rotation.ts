import type { Euler, Quaternion, Vector2 } from 'three';

// MainLogo.update returns toward rest once per rendered frame using dt * force.
// An exponential 120-Hz conversion changes that trajectory at other cadences.
export const pointerBlend = (rate: number, seconds: number) =>
  Math.min(1, Math.max(0, seconds * rate));

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
  // MainLogo.hover queues one impulse per rendered frame. Its update damps
  // momentum by elapsed time, then applies that Euler once. Scaling both the
  // impulse and step by display Hz made slow frames rotate disproportionately.
  velocity.copy(pointer).sub(filtered);
  const reach = Math.max(0, 1 - pointer.length() * 1.5);
  const impulse = 0.01 * reach * intensity;
  momentum.x -= velocity.y * impulse;
  momentum.y += velocity.x * impulse;
  const retention = Math.max(0, 1 - seconds);
  momentum.x *= retention;
  momentum.y *= retention;
  momentum.z = 0;
  step.set(momentum.x, momentum.y, 0);
  delta.setFromEuler(step);
  orientation.premultiply(delta).normalize();
  // The reference Lerper updates after the scene consumes this frame's residual.
  filtered.addScaledVector(velocity, Math.min(1, seconds * 10));
  return velocity.length() * reach;
}
