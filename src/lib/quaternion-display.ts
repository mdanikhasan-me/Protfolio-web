import type { Quaternion } from 'three';

/** Keep the controller on the model's rendered frame; skip unchanged poses. */
export function createQuaternionDisplaySync(
  initial: Quaternion,
  draw: (orientation: Quaternion) => void,
) {
  const displayed = initial.clone();
  return (orientation: Quaternion) => {
    if (displayed.equals(orientation)) return;
    draw(orientation);
    displayed.copy(orientation);
  };
}
