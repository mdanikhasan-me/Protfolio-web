import assert from 'node:assert/strict';
import console from 'node:console';
import { Euler, Quaternion, Vector2 } from 'three';
import { advancePointerRotation, pointerBlend } from '../../src/lib/pointer-rotation.ts';

// Numerical input-response regression, not rendered FPS or reference parity.
function sweep(hz) {
  const pointer = new Vector2(), filtered = new Vector2(), velocity = new Vector2();
  const momentum = new Euler(), step = new Euler();
  const delta = new Quaternion(), orientation = new Quaternion(), rest = new Quaternion();
  let peak = 0, firstResponse = null;
  let angleAtQuarterSecond = 0;
  for (let i = 0; i < hz * 10; i++) {
    const t = i / hz;
    pointer.set(Math.min(t, 0.5) * 0.3, 0);
    advancePointerRotation(pointer, filtered, velocity, momentum, step, delta, orientation, 1 / hz, 1);
    orientation.slerp(rest, pointerBlend(2, 1 / hz));
    const angle = orientation.angleTo(rest);
    peak = Math.max(peak, angle);
    if (t <= 0.25) angleAtQuarterSecond = angle;
    if (angle > 0.001 && firstResponse === null) firstResponse = t;
    assert.ok(Number.isFinite(angle));
  }
  assert.ok(orientation.angleTo(rest) < 0.003, `${hz} Hz fails to settle`);
  assert.ok(firstResponse < 0.1, `${hz} Hz input is delayed`);
  assert.ok(angleAtQuarterSecond > 0.15, `${hz} Hz response is too weak during movement`);
  return { hz, peakDegrees: peak * 180 / Math.PI, firstResponseSeconds: firstResponse,
    quarterSecondDegrees: angleAtQuarterSecond * 180 / Math.PI };
}
const results = [30, 60, 120, 144, 240].map(sweep);
const baseline = results.find(r => r.hz === 120).peakDegrees;
for (const result of results) {
  const tolerance = result.hz === 30 ? 0.12 : 0.05;
  assert.ok(Math.abs(result.peakDegrees / baseline - 1) < tolerance,
    `${result.hz} Hz changes the pointer strength: ${result.peakDegrees}`);
}
console.log(JSON.stringify({kind:'NUMERICAL_RESPONSE_REGRESSION', results}, null, 2));
