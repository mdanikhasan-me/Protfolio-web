import { describe, expect, it } from 'vitest';
import {
  createVehicleState,
  resetVehicle,
  stepVehicle,
} from '../../../src/hinode/vehicle/dynamics';

const idle = {
  accelerate: false,
  brake: false,
  left: false,
  right: false,
  handbrake: false,
};

describe('Hinode arcade vehicle', () => {
  it('accelerates forward and remains on the alley', () => {
    const state = createVehicleState();
    for (let index = 0; index < 90; index += 1) {
      stepVehicle(state, { ...idle, accelerate: true }, 1 / 60);
    }

    expect(state.speed).toBeGreaterThan(8);
    expect(state.z).toBeLessThan(18);
    expect(state.collisions).toBe(0);
  });

  it('brakes into a bounded reverse gear', () => {
    const state = createVehicleState();
    for (let index = 0; index < 80; index += 1) {
      stepVehicle(state, { ...idle, brake: true }, 1 / 60);
    }
    expect(state.speed).toBeLessThan(-3);
    expect(state.speed).toBeGreaterThanOrEqual(-7);
  });

  it('reduces grip and creates recoverable slip under handbrake steering', () => {
    const state = createVehicleState();
    for (let index = 0; index < 50; index += 1) {
      stepVehicle(state, { ...idle, accelerate: true }, 1 / 60);
    }
    const result = stepVehicle(
      state,
      { ...idle, accelerate: true, right: true, handbrake: true },
      1 / 30,
    );
    expect(result.gripPercent).toBe(58);
    expect(state.slipAngle).toBeGreaterThan(0);
  });

  it('records corridor contact without letting the car cross a wall', () => {
    const state = createVehicleState();
    state.x = -26.5;
    state.z = 18;
    state.speed = 7;
    const before = { x: state.x, z: state.z };
    const result = stepVehicle(state, { ...idle, left: true }, 1 / 30);

    expect(result.collided).toBe(true);
    expect(state.collisions).toBe(1);
    expect({ x: state.x, z: state.z }).toEqual(before);
  });

  it('resets to the authored spawn', () => {
    const state = createVehicleState();
    state.x = 12;
    state.z = -4;
    state.speed = 10;
    resetVehicle(state);
    expect(state).toMatchObject({ x: -25, z: 23, yaw: 0, speed: 0 });
  });
});
