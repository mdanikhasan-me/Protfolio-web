import assert from 'node:assert/strict';
import console from 'node:console';
import { Euler, Quaternion, Vector2 } from 'three';
import { advancePointerRotation, pointerBlend } from '../../src/lib/pointer-rotation.ts';

// Numerical reference integration, not native input/rendered FPS. The reference
// applies hover once per render; cross-Hz equal strength was an incorrect oracle.
// Transcribed from MainLogo.hover/update and Lerper.update in reference-page.js
// SHA256 b2bd0d964416bd3db61b1392d2b645314e50ea79cadb09f69755d5f4c3791853.
const paths = {
  sweep: t => [Math.min(t, .5) * .3, 0],
  circle: t => [.25 * Math.sin(Math.min(t, 1) * 8), .25 * (Math.cos(Math.min(t, 1) * 8) - 1)],
  reversal: t => [t < .4 ? t * .6 : t < .8 ? .24 - (t - .4) * 1.2 : -.24, 0],
  corner: t => [Math.min(t, .5) * 1.6, Math.min(t, .5) * 1.4],
};
const results = [];
for (const hz of [30, 60, 120, 144, 240]) {
  for (const [path, position] of Object.entries(paths)) {
    const pointer = new Vector2(), filtered = new Vector2(), velocity = new Vector2();
    const momentum = new Euler(), step = new Euler(), delta = new Quaternion(), orientation = new Quaternion();
    const expected = new Quaternion(), rest = new Quaternion();
    let x = 0, y = 0, rx = 0, ry = 0, maxError = 0;
    for (let i = 0; i < hz * 10; i++) {
      const [px, py] = position(i / hz), dt = 1 / hz;
      pointer.set(px, py);
      advancePointerRotation(pointer, filtered, velocity, momentum, step, delta, orientation, dt, 1);
      const dx = px - x, dy = py - y;
      const force = .01 * Math.max(0, 1 - Math.hypot(px, py) * 1.5);
      rx = (rx - dy * force) * (1 - dt);
      ry = (ry + dx * force) * (1 - dt);
      expected.premultiply(new Quaternion().setFromEuler(new Euler(rx, ry, 0))).normalize();
      x += dx * Math.min(1, dt * 10);
      y += dy * Math.min(1, dt * 10);
      // Reference MainLogo.update applies a linear deltaTime * returnForce.
      // Keep this independent of the production helper to catch return drift.
      orientation.slerp(rest, pointerBlend(2, dt));
      expected.slerp(rest, Math.min(1, dt * 2));
      const error = orientation.angleTo(expected);
      assert.ok(Number.isFinite(error) && error < 1e-6, `${hz} Hz ${path} frame ${i}: reference integration mismatch`);
      maxError = Math.max(maxError, error);
    }
    assert.ok(orientation.angleTo(rest) < .003, `${hz} Hz ${path}: fails to settle`);
    results.push({ hz, path, frames: hz * 10, maxErrorRadians: maxError });
  }
}
console.log(JSON.stringify({ kind: 'NUMERICAL_REFERENCE_HOVER', cases: results.length, results }, null, 2));
