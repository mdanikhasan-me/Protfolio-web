import { describe, expect, it } from 'vitest';
import {
  HANDLING_STEP_SECONDS,
  NIGHTLINE_HANDLING,
  NightlineTireModel,
} from '../../../src/hinode/vehicle/handling-model';

const idle = { throttle: 0, brake: 0, steer: 0, handbrake: false };

describe('MAH Nightline custom tire-force model', () => {
  it('runs on the approved fixed 120 Hz simulation step', () => {
    expect(HANDLING_STEP_SECONDS).toBeCloseTo(1 / 120, 12);
  });

  it('produces forward force from rest without lateral or yaw force', () => {
    const model = new NightlineTireModel();
    const result = model.step(
      { yaw: 0, velocityX: 0, velocityZ: 0, yawRate: 0 },
      { ...idle, throttle: 1 },
    );

    expect(result.forceZ).toBeLessThan(-8_000);
    expect(Math.abs(result.forceX)).toBeLessThan(1);
    expect(Math.abs(result.yawTorque)).toBeLessThan(1);
  });

  it('reduces the steering angle as speed rises', () => {
    const slow = new NightlineTireModel();
    const fast = new NightlineTireModel();
    let slowResult = slow.step(
      { yaw: 0, velocityX: 0, velocityZ: -3, yawRate: 0 },
      { ...idle, steer: 1 },
    );
    let fastResult = fast.step(
      { yaw: 0, velocityX: 0, velocityZ: -38, yawRate: 0 },
      { ...idle, steer: 1 },
    );
    for (let index = 0; index < 120; index += 1) {
      slowResult = slow.step(
        { yaw: 0, velocityX: 0, velocityZ: -3, yawRate: 0 },
        { ...idle, steer: 1 },
      );
      fastResult = fast.step(
        { yaw: 0, velocityX: 0, velocityZ: -38, yawRate: 0 },
        { ...idle, steer: 1 },
      );
    }

    expect(slowResult.steeringAngle).toBeGreaterThan(fastResult.steeringAngle);
    expect(slowResult.steeringAngle).toBeCloseTo(NIGHTLINE_HANDLING.lowSpeedSteerRadians, 1);
    expect(fastResult.steeringAngle).toBeCloseTo(NIGHTLINE_HANDLING.highSpeedSteerRadians, 1);
  });

  it('drops rear grip under handbrake without removing front authority', () => {
    const model = new NightlineTireModel();
    const road = model.step(
      { yaw: 0, velocityX: 2.5, velocityZ: -18, yawRate: -0.2 },
      { ...idle, steer: 0.7 },
    );
    const handbrake = model.step(
      { yaw: 0, velocityX: 2.5, velocityZ: -18, yawRate: -0.2 },
      { ...idle, steer: 0.7, handbrake: true },
    );

    expect(road.rearGripPercent).toBe(100);
    expect(handbrake.rearGripPercent).toBeLessThan(45);
    expect(handbrake.frontLoadNewtons).toBeGreaterThan(0);
  });

  it('applies bounded development tuning without changing the fixed-step model', () => {
    const model = new NightlineTireModel();
    model.setTuning({ steeringResponse: 1.2, gripScale: 0.9, handbrakeGripScale: 0.7 });
    const result = model.step(
      { yaw: 0, velocityX: 2.5, velocityZ: -18, yawRate: -0.2 },
      { ...idle, steer: 0.7, handbrake: true },
    );

    expect(model.getTuning()).toEqual({
      steeringResponse: 1.2,
      gripScale: 0.9,
      handbrakeGripScale: 0.7,
    });
    expect(result.rearGripPercent).toBeLessThan(30);
    expect(result.frontGripPercent).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.longitudinalG)).toBe(true);
  });

  it('is deterministic for the same state, input, and step', () => {
    const first = new NightlineTireModel();
    const second = new NightlineTireModel();
    const sample = { yaw: 0.2, velocityX: 3, velocityZ: -14, yawRate: -0.14 };
    const input = { throttle: 0.7, brake: 0, steer: 0.35, handbrake: false };

    expect(first.step(sample, input)).toEqual(second.step(sample, input));
  });
});
