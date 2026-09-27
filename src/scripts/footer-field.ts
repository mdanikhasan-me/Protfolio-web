import * as THREE from 'three';
import { noiseFragmentShader } from './reference-background-system';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;
const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uNoiseTex;
  uniform float uAspectRatio;
  uniform float uVisibility;
  float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  void main() {
    vec2 centered = (vUv - 0.5) * 2.0;
    if (uAspectRatio > 1.0) centered.x *= uAspectRatio;
    else centered.y /= uAspectRatio;
    vec3 color = texture2D(uNoiseTex, vUv).rgb * vec3(0.3, 0.5, 1.0);
    color *= smoothstep(1.0, 0.1, length(centered)) * 0.3;
    color *= 1.0 - random(vUv) * 0.1;
    gl_FragColor = vec4(color, uVisibility);
  }
`;

// Reference visibility easing: normalized sigmoid, steepness 6.
function visibilityEase(progress: number) {
  const a = Math.exp(-6 * (2 * progress - 1));
  const b = Math.exp(-6);
  return (1 + (1 - a) / (1 + a) * (1 + b) / (1 - b)) / 2;
}

export function createFooterField(canvas: HTMLCanvasElement, epoch = performance.now()) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0, 1);
  // Measured live reference framebuffer at DPR 1: its detached
  // placeholder prevents its resize path from changing these initial sizes.
  // Keep this deliberate rather than reproducing that DOM lifecycle defect.
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(300, 150, false);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 1;
  const noiseTarget = new THREE.WebGLRenderTarget(64, 64, { type: THREE.FloatType, depthBuffer: false });
  noiseTarget.texture.wrapS = noiseTarget.texture.wrapT = THREE.RepeatWrapping;
  const clock = { value: 0 };
  const alpha = { value: 0 };
  const aspect = { value: 1 };
  const noiseMaterial = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: noiseFragmentShader,
    uniforms: { uTime: clock, uScreenAspectRatio: { value: 1 } },
    depthTest: false, depthWrite: false,
  });
  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uNoiseTex: { value: noiseTarget.texture },
      uAspectRatio: aspect,
      uVisibility: alpha,
    },
  });
  const noiseScene = new THREE.Scene();
  const scene = new THREE.Scene();
  noiseScene.add(new THREE.Mesh(geometry, noiseMaterial));
  scene.add(new THREE.Mesh(geometry, material));
  let active = false;
  let inView = false;
  let suspended = false;
  let manual = false;
  let contextLost = false;
  let request = 0;
  let previous = 0;
  let elapsed = 0;
  let fadeTime = 1;
  let fadeFrom = 0;
  let visibility = 0;
  let draws = 0;

  const draw = (time: number, opacity: number) => {
    clock.value = time;
    alpha.value = opacity;
    renderer.setRenderTarget(noiseTarget);
    renderer.render(noiseScene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    draws++;
  };
  const eligible = () => inView && !suspended && !document.hidden && !manual && !contextLost;
  // Allocate both targets and compile both passes during preload, not on the
  // first visible name-animation frame. A transparent draw preserves the entrance.
  renderer.initRenderTarget(noiseTarget);
  draw((performance.now() - epoch) / 1000, 0);
  const tick = (now: number) => {
    request = 0;
    if (!eligible()) return;
    const delta = previous ? Math.min((now - previous) / 1000, 1 / 30) : 0;
    previous = now;
    // The color phase belongs to the page, not each footer entry. Advancing the
    // clock offscreen requires no GPU work and does not replay the initial hue.
    elapsed = (now - epoch) / 1000;
    fadeTime = Math.min(1, fadeTime + delta);
    visibility = THREE.MathUtils.lerp(fadeFrom, active ? 1 : 0, visibilityEase(fadeTime));
    draw(elapsed, visibility);
    if (active || fadeTime < 1) request = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!eligible()) {
      cancelAnimationFrame(request);
      request = previous = 0;
    } else if (!request && (active || fadeTime < 1)) {
      previous = 0;
      request = requestAnimationFrame(tick);
    }
  };
  const intersection = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    schedule();
  });
  intersection.observe(canvas);
  document.addEventListener('visibilitychange', schedule);
  const loseContext = () => { contextLost = true; schedule(); };
  const restoreContext = () => { contextLost = false; schedule(); };
  canvas.addEventListener('webglcontextlost', loseContext);
  canvas.addEventListener('webglcontextrestored', restoreContext);

  const controller = {
    setActive(value: boolean) {
      if (active === value) return;
      fadeFrom = visibility;
      fadeTime = 0;
      active = value;
      schedule();
    },
    suspend(value: boolean) { suspended = value; schedule(); },
    dispose() {
      suspended = true;
      schedule();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', restoreContext);
      geometry.dispose(); noiseTarget.dispose(); noiseMaterial.dispose(); material.dispose(); renderer.dispose();
    },
  };
  // Explicit comparison mode only. Normal runtime retains no global test handle.
  if (new URLSearchParams(location.search).get('__footerCapture') === '1') {
    Object.assign(window, { __footerField: {
      renderAt(time: number, alpha: number) { manual = true; schedule(); draw(time, alpha); },
      resume() { manual = false; schedule(); },
      state() { return { draws, active, inView, running: !!request, time: clock.value, visibility: alpha.value, width: canvas.width, height: canvas.height }; },
    } });
  }
  return controller;
}
