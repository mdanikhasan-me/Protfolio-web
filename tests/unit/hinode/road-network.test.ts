import { describe, expect, it } from 'vitest';
import {
  ALLEY_PATH,
  driveableClearance,
  isDriveable,
  maximumPathTurn,
  SECONDARY_PATH,
  VEHICLE_CLEARANCE_RADIUS,
} from '../../../src/hinode/environment/road-network';

describe('Hinode clean-room road network', () => {
  it('keeps the spawn and T-junction driveable for the contracted coupe', () => {
    expect(isDriveable({ x: -25, z: 23 }, VEHICLE_CLEARANCE_RADIUS)).toBe(true);
    expect(isDriveable({ x: -5.2, z: -0.5 }, VEHICLE_CLEARANCE_RADIUS)).toBe(true);
  });

  it('preserves nominal alley and secondary-road clearance', () => {
    expect(driveableClearance(ALLEY_PATH[8]!)).toBeCloseTo(1.6, 4);
    expect(driveableClearance(SECONDARY_PATH[31]!)).toBeCloseTo(3.3, 4);
  });

  it('uses densely sampled, smoothly changing curves instead of square road blocks', () => {
    expect(ALLEY_PATH.length).toBeGreaterThanOrEqual(40);
    expect(SECONDARY_PATH.length).toBeGreaterThanOrEqual(40);
    expect(maximumPathTurn(ALLEY_PATH)).toBeLessThan(0.12);
    expect(maximumPathTurn(SECONDARY_PATH)).toBeLessThan(0.04);
  });

  it('rejects positions outside the visible driveable corridor', () => {
    expect(isDriveable({ x: -31, z: 18 }, VEHICLE_CLEARANCE_RADIUS)).toBe(false);
    expect(isDriveable({ x: 0, z: 25 }, VEHICLE_CLEARANCE_RADIUS)).toBe(false);
  });
});
