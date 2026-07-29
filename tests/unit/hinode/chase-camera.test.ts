import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { ChaseCamera } from '../../../src/hinode/camera/chase-camera';
import { createVehicleState } from '../../../src/hinode/vehicle/dynamics';

describe('Hinode road-height chase camera', () => {
  it('stays below driver-review height in the default mode', () => {
    const camera = new PerspectiveCamera();
    const chase = new ChaseCamera();
    const vehicle = createVehicleState();

    chase.snap(camera, vehicle);

    expect(camera.position.y).toBeCloseTo(2.85, 6);
    expect(camera.position.y).toBeLessThan(4);
  });

  it('changes only between two compact road-height distance modes', () => {
    const camera = new PerspectiveCamera();
    const chase = new ChaseCamera();
    const vehicle = createVehicleState();

    chase.toggleDistance();
    chase.snap(camera, vehicle);

    expect(camera.position.y).toBeCloseTo(3.35, 6);
    expect(camera.position.y).toBeLessThan(4);
  });
});
