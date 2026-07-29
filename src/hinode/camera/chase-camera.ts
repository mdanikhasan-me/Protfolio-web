import { MathUtils, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import { isDriveable } from '../environment/road-network';
import type { VehicleState } from '../vehicle/dynamics';

const desiredPosition = new Vector3();
const desiredLook = new Vector3();
const currentLook = new Vector3();

export class ChaseCamera {
  private distanceMode = 0;

  toggleDistance() {
    this.distanceMode = (this.distanceMode + 1) % 2;
  }

  snap(camera: PerspectiveCamera, vehicle: VehicleState) {
    this.resolveDesired(vehicle, desiredPosition, desiredLook);
    camera.position.copy(desiredPosition);
    currentLook.copy(desiredLook);
    camera.lookAt(currentLook);
  }

  update(camera: PerspectiveCamera, vehicle: VehicleState, deltaSeconds: number) {
    this.resolveDesired(vehicle, desiredPosition, desiredLook);
    const positionBlend = 1 - Math.exp(-deltaSeconds * 6.2);
    const lookBlend = 1 - Math.exp(-deltaSeconds * 8.5);
    camera.position.lerp(desiredPosition, positionBlend);
    currentLook.lerp(desiredLook, lookBlend);
    camera.lookAt(currentLook);
  }

  private resolveDesired(vehicle: VehicleState, position: Vector3, look: Vector3) {
    const requestedDistance = this.distanceMode === 0 ? 6.2 : 7.6;
    const baseHeight = this.distanceMode === 0 ? 2.85 : 3.35;
    const yawOffsets = [0, 0.28, -0.28, 0.52, -0.52] as const;
    let accepted = {
      x: vehicle.x,
      z: vehicle.z,
    };
    let found = false;

    for (let distance = requestedDistance; distance >= 0.6 && !found; distance -= 0.3) {
      for (const yawOffset of yawOffsets) {
        const cameraYaw = vehicle.yaw + yawOffset;
        const candidate = {
          x: vehicle.x + Math.sin(cameraYaw) * distance,
          z: vehicle.z + Math.cos(cameraYaw) * distance,
        };
        const sightlineStaysInsideRoad = [0.2, 0.4, 0.6, 0.8, 1].every((ratio) =>
          isDriveable(
            {
              x: MathUtils.lerp(vehicle.x, candidate.x, ratio),
              z: MathUtils.lerp(vehicle.z, candidate.z, ratio),
            },
            0.08,
          ),
        );
        if (!sightlineStaysInsideRoad) continue;
        accepted = candidate;
        found = true;
        break;
      }
    }

    // The geometry provides the sightline. The camera remains at road height
    // and shortens or side-biases its chase arm instead of jumping overhead.
    position.set(accepted.x, baseHeight, accepted.z);
    const lookAhead = MathUtils.clamp(Math.abs(vehicle.speed) * 0.16, 0.8, 2.8);
    look.set(
      vehicle.x - Math.sin(vehicle.yaw) * lookAhead,
      0.85,
      vehicle.z - Math.cos(vehicle.yaw) * lookAhead,
    );
  }
}
