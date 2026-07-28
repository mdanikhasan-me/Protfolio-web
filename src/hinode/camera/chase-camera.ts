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
    const requestedDistance = this.distanceMode === 0 ? 6.8 : 8.2;
    let acceptedDistance = 1.4;
    const baseHeight = this.distanceMode === 0 ? 3.0 : 3.6;

    for (let distance = requestedDistance; distance >= 1.4; distance -= 0.35) {
      const candidateX = vehicle.x + Math.sin(vehicle.yaw) * distance;
      const candidateZ = vehicle.z + Math.cos(vehicle.yaw) * distance;
      const sightlineStaysInsideRoad = [0.25, 0.5, 0.75, 1].every((ratio) =>
        isDriveable(
          {
            x: MathUtils.lerp(vehicle.x, candidateX, ratio),
            z: MathUtils.lerp(vehicle.z, candidateZ, ratio),
          },
          0.1,
        ),
      );
      if (sightlineStaysInsideRoad) {
        acceptedDistance = distance;
        break;
      }
    }
    if (acceptedDistance < 3) {
      // Dense façades can close the rear sightline at the hairpin. A brief
      // overhead transition keeps the car and road visible instead of
      // allowing the camera to pass through an upper-storey mesh.
      position.set(vehicle.x, 11.5, vehicle.z);
    } else {
      position.set(
        vehicle.x + Math.sin(vehicle.yaw) * acceptedDistance,
        baseHeight,
        vehicle.z + Math.cos(vehicle.yaw) * acceptedDistance,
      );
    }
    const lookAhead = MathUtils.clamp(Math.abs(vehicle.speed) * 0.16, 0.8, 2.8);
    look.set(
      vehicle.x - Math.sin(vehicle.yaw) * lookAhead,
      0.85,
      vehicle.z - Math.cos(vehicle.yaw) * lookAhead,
    );
  }
}
