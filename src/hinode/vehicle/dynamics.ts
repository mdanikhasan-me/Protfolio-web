import {
  isDriveable,
  isInsideSlice,
  VEHICLE_CLEARANCE_RADIUS,
  type RoadPoint,
} from '../environment/road-network';

export interface VehicleInput {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
}

export interface VehicleState extends RoadPoint {
  yaw: number;
  speed: number;
  steering: number;
  slipAngle: number;
  wheelSpin: number;
  bodyBob: number;
  collisions: number;
}

export interface VehicleStepResult {
  collided: boolean;
  brakeLights: boolean;
  gripPercent: number;
  gear: 'R' | 'N' | '1';
}

export const VEHICLE_SPAWN = {
  x: -25,
  z: 23,
  yaw: 0,
} as const;

const FORWARD_MAX = 18;
const REVERSE_MAX = -7;
const WHEEL_BASE = 2.45;
const WHEEL_RADIUS = 0.34;

const approach = (value: number, target: number, amount: number) =>
  value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

export function createVehicleState(): VehicleState {
  return {
    ...VEHICLE_SPAWN,
    speed: 0,
    steering: 0,
    slipAngle: 0,
    wheelSpin: 0,
    bodyBob: 0,
    collisions: 0,
  };
}

export function resetVehicle(state: VehicleState) {
  Object.assign(state, createVehicleState());
}

export function stepVehicle(
  state: VehicleState,
  input: VehicleInput,
  stepSeconds: number,
): VehicleStepResult {
  const throttleAcceleration = 7.2;
  const reverseAcceleration = 5;
  const brakeAcceleration = 13;

  if (input.accelerate) state.speed += throttleAcceleration * stepSeconds;
  if (input.brake) {
    state.speed +=
      state.speed > 0.35 ? -brakeAcceleration * stepSeconds : -reverseAcceleration * stepSeconds;
  }
  if (!input.accelerate && !input.brake) {
    state.speed = approach(state.speed, 0, (0.8 + Math.abs(state.speed) * 0.055) * stepSeconds);
  }
  state.speed = Math.max(REVERSE_MAX, Math.min(FORWARD_MAX, state.speed));

  const steerInput = Number(input.right) - Number(input.left);
  const speedRatio = Math.min(1, Math.abs(state.speed) / FORWARD_MAX);
  const maximumSteering = 0.58 - speedRatio * 0.31;
  state.steering = approach(state.steering, steerInput * maximumSteering, 2.75 * stepSeconds);

  const handbrakeGrip = input.handbrake && Math.abs(state.speed) > 2.5 ? 0.58 : 1;
  const direction = state.speed >= 0 ? 1 : -1;
  const yawRate =
    (Math.abs(state.speed) / WHEEL_BASE) * Math.tan(state.steering) * handbrakeGrip * direction;
  state.yaw -= yawRate * stepSeconds;

  const targetSlip =
    input.handbrake && Math.abs(state.speed) > 3
      ? steerInput * Math.min(0.34, Math.abs(state.speed) * 0.017)
      : steerInput * Math.min(0.08, Math.abs(state.speed) * 0.0035);
  state.slipAngle = approach(
    state.slipAngle,
    targetSlip,
    (input.handbrake ? 1.3 : 2.8) * stepSeconds,
  );

  const travelAngle = state.yaw + state.slipAngle;
  const next = {
    x: state.x - Math.sin(travelAngle) * state.speed * stepSeconds,
    z: state.z - Math.cos(travelAngle) * state.speed * stepSeconds,
  };
  let collided = false;
  if (isDriveable(next, VEHICLE_CLEARANCE_RADIUS)) {
    state.x = next.x;
    state.z = next.z;
  } else {
    collided = Math.abs(state.speed) > 0.35;
    if (collided) state.collisions += 1;
    state.speed *= -0.16;
    state.slipAngle *= 0.35;
  }

  if (!isInsideSlice(state)) resetVehicle(state);
  state.wheelSpin -= (state.speed / WHEEL_RADIUS) * stepSeconds;
  state.bodyBob =
    Math.sin(state.wheelSpin * 0.22) * Math.min(0.025, Math.abs(state.speed) * 0.0015);

  return {
    collided,
    brakeLights: input.brake || state.speed < -0.2,
    gripPercent: Math.round(handbrakeGrip * 100),
    gear: state.speed < -0.25 ? 'R' : Math.abs(state.speed) < 0.2 ? 'N' : '1',
  };
}

export function speedKph(state: VehicleState) {
  return Math.round(Math.abs(state.speed) * 3.6);
}
