import assert from 'node:assert/strict';
import console from 'node:console';
import { Quaternion, Vector3 } from 'three';
import { createQuaternionDisplaySync } from '../../src/lib/quaternion-display.ts';

// CPU scheduling regression only: not SVG rendering, native FPS or parity.
const results = [];
for (const hz of [30, 60, 120, 144, 240]) {
  for (const stopFrame of [1, 2, 7, 19, 37]) {
    let shown = new Quaternion(), writes = 0;
    const sync = createQuaternionDisplaySync(shown, q => { shown.copy(q); writes++; });
    const pose = new Quaternion(), axis = new Vector3(0, 1, 0);
    for (let i = 1; i <= stopFrame; i++) {
      pose.setFromAxisAngle(axis, i / stopFrame * Math.PI / 2);
      sync(pose);
      assert.ok(shown.equals(pose), `${hz} Hz / frame ${i}: controller lags the model`);
    }
    assert.equal(writes, stopFrame, 'moving poses must be delivered on every rendered frame');
    assert.ok(shown.equals(pose), `${hz} Hz / stop ${stopFrame}: final pose lost`);
    const settledWrites = writes;
    for (let i = 0; i < hz; i++) sync(pose);
    assert.equal(writes, settledWrites, 'stationary orientation repeats SVG writes');
    pose.identity();
    sync(pose);
    assert.ok(shown.equals(pose), 'reset leaves the previous pose visible');
    results.push({hz, stopFrame, movingWrites: settledWrites, everyFrameSynchronized: true, finalPose: true, idleWrites: 0, reset: true});
  }
}
console.log(JSON.stringify({kind: 'NUMERICAL_SCHEDULING_REGRESSION', cases: results.length, results}, null, 2));
