import { describe, expect, it, vi } from 'vitest';
import { FixedStepClock } from '../../../src/hinode/core/fixed-step';

describe('FixedStepClock', () => {
  it('turns a display-frame delta into deterministic simulation steps', () => {
    const clock = new FixedStepClock(1 / 60);
    const update = vi.fn();
    const result = clock.advance(0.05, update);

    expect(result.steps).toBe(3);
    expect(update).toHaveBeenCalledTimes(3);
    expect(result.alpha).toBeCloseTo(0, 5);
    expect(result.droppedSeconds).toBe(0);
  });

  it('caps suspended-tab catch-up work', () => {
    const clock = new FixedStepClock(1 / 60, 0.1, 4);
    const update = vi.fn();
    const result = clock.advance(2, update);

    expect(result.steps).toBe(4);
    expect(result.droppedSeconds).toBeGreaterThan(1.9);
  });
});
