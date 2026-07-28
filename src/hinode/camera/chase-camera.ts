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
    let acceptedDistance = requestedDistance;
    const height = this.distanceMode === 0 ? 3.0 : 3.6;

    for (let distance = requestedDistance; distance >= 2.8; distance -= 0.35) {
      const candidateX = vehicle.x + Math.sin(vehicle.yaw) * distance;
      const candidateZ = vehicle.z + Math.cos(vehicle.yaw) * distance;
      if (isDriveable({ x: candidateX, z: candidateZ }, 0.15)) {
        acceptedDistance = distance;
        break;
      }
    }

    position.set(
      vehicle.x + Math.sin(vehicle.yaw) * acceptedDistance,
      height,
      vehicle.z + Math.cos(vehicle.yaw) * acceptedDistance,
    );
    const lookAhead = MathUtils.clamp(Math.abs(vehicle.speed) * 0.16, 0.8, 2.8);
    look.set(
      vehicle.x - Math.sin(vehicle.yaw) * lookAhead,
      0.85,
      vehicle.z - Math.cos(vehicle.yaw) * lookAhead,
    );
  }
}
