import * as THREE from 'three';
import { noiseFragmentShader } from './reference-background-system';
import ReferenceFluid from './reference-fluid';
import {
  interiorBackgroundFragment, interiorGridVertex,
  interiorGridFragment, interiorCrossFragment,
} from './interior-background-shaders';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }
`;
const mixerShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uFluidsTex;
  void main() {
    vec2 uv = vUv;
    vec3 color = texture2D(uScene, uv).rgb;
    color *= 1.0 + length(texture2D(uFluidsTex, uv).xy) * 0.8;
    color *= smoothstep(1.5, 0.3, length(uv - 0.5));
    gl_FragColor = vec4(color, 1.0);
  }
`;
const compositeShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uFluidsTex;
  void main() {
    vec2 uv = vUv - texture2D(uFluidsTex, vUv).xy * 0.001;
    gl_FragColor = vec4(texture2D(uScene, uv).rgb * 1.3, 1.0);
  }
`;

export function createInteriorBackground(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setClearColor(0);
  const camera = new THREE.PerspectiveCamera(75, 1, .1, 1000);
  camera.position.z = 5;
  const screenCamera = new THREE.Camera();
  const quad = new THREE.PlaneGeometry(2, 2);
  const noiseTarget = new THREE.WebGLRenderTarget(64, 64, { type: THREE.FloatType, depthBuffer: false });
  noiseTarget.texture.wrapS = noiseTarget.texture.wrapT = THREE.RepeatWrapping;
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const mixedTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const fluid = new ReferenceFluid(renderer);
  const time = { value: 0 };
  const aspect = { value: 1 };
  const scale = { value: new THREE.Vector3(1, 1, 1) };
  const resolution = { value: new THREE.Vector2() };
  const fluidUniform = { value: fluid.texture };
  const noiseMaterial = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: noiseFragmentShader,
    uniforms: { uTime: time, uScreenAspectRatio: aspect }, depthTest: false, depthWrite: false,
  });
  const noiseScene = new THREE.Scene();
  noiseScene.add(new THREE.Mesh(quad, noiseMaterial));
  const scene = new THREE.Scene();
  const backgroundMaterial = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: interiorBackgroundFragment,
    uniforms: { uNoiseTex: { value: noiseTarget.texture }, uScreenResolution: resolution },
    depthTest: false, depthWrite: false,
  });
  scene.add(new THREE.Mesh(quad, backgroundMaterial));
  const gridUniforms = {
    uScale: scale, uTime: time, uScroll: { value: 0 },
    uGrid: { value: new THREE.Vector2(64, 64) }, uFluidsTex: fluidUniform,
  };
  const gridMaterial = new THREE.ShaderMaterial({
    vertexShader: interiorGridVertex, fragmentShader: interiorGridFragment,
    uniforms: gridUniforms, defines: { IS_GRID: '', IS_FLAT: '', IS_THIN_LIGHT: '' },
    transparent: true, depthTest: false, depthWrite: false,
  });
  const gridGeometry = new THREE.PlaneGeometry(1, 1, 64, 64);
  const grid = new THREE.Mesh(gridGeometry, gridMaterial);
  grid.renderOrder = -999;
  scene.add(grid);
  const crossPlane = new THREE.PlaneGeometry(1, 1, 8, 8);
  const crossGeometry = new THREE.InstancedBufferGeometry();
  crossGeometry.setAttribute('position', crossPlane.getAttribute('position'));
  crossGeometry.setAttribute('uv', crossPlane.getAttribute('uv'));
  crossGeometry.setIndex(crossPlane.getIndex());
  const instances = [];
  for (let y = 0; y <= 8; y++) for (let x = 0; x <= 8; x++) instances.push(x / 8, y / 8);
  crossGeometry.setAttribute('instanceId', new THREE.InstancedBufferAttribute(new Float32Array(instances), 2));
  const crossMaterial = new THREE.ShaderMaterial({
    vertexShader: interiorGridVertex, fragmentShader: interiorCrossFragment,
    uniforms: gridUniforms, defines: { IS_CROSS: '', IS_FLAT: '', IS_THIN_LIGHT: '' },
    transparent: true, depthTest: false, depthWrite: false,
  });
  const crosses = new THREE.Mesh(crossGeometry, crossMaterial);
  crosses.frustumCulled = false;
  crosses.renderOrder = -999;
  grid.add(crosses);
  const mixerMaterial = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: mixerShader,
    uniforms: { uScene: { value: target.texture }, uFluidsTex: fluidUniform },
    depthTest: false, depthWrite: false,
  });
  const mixedScene = new THREE.Scene();
  mixedScene.add(new THREE.Mesh(quad, mixerMaterial));
  const compositeMaterial = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: compositeShader,
    uniforms: { uScene: { value: mixedTarget.texture }, uFluidsTex: fluidUniform },
    depthTest: false, depthWrite: false,
  });
  const finalScene = new THREE.Scene();
  finalScene.add(new THREE.Mesh(quad, compositeMaterial));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  let request = 0, previous = 0, elapsed = 0, draws = 0;
  let inView = true, suspended = false, manual = false, lost = false;
  let pointerActive = false;
  const eligible = () => inView && !document.hidden && !suspended && !lost && !manual;
  const draw = (seconds: number, dt = 0) => {
    time.value = seconds;
    fluid.step(dt);
    renderer.setRenderTarget(noiseTarget);
    renderer.render(noiseScene, screenCamera);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(mixedTarget);
    renderer.render(mixedScene, screenCamera);
    renderer.setRenderTarget(null);
    renderer.render(finalScene, screenCamera);
    draws++;
  };
  const tick = (now: number) => {
    request = 0;
    if (!eligible()) return;
    const dt = previous ? Math.min((now - previous) / 1000, 1 / 30) : 0;
    previous = now;
    // Preserve the field and direct response; reduced motion stops only ambient drift.
    if (!reducedMotion.matches) elapsed += dt;
    draw(elapsed, dt);
    if (!reducedMotion.matches || pointerActive) request = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!eligible()) { cancelAnimationFrame(request); request = previous = 0; }
    else if (!request) { previous = 0; request = requestAnimationFrame(tick); }
  };
  const resize = () => {
    const width = innerWidth, height = innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    // The reference draws its flat interior scene at 2/3 of the final buffer.
    // Divide the unrounded scene resolution, as the reference does. Dividing
    // canvas.width first loses a whole scene pixel at fractional device scales.
    target.setSize(Math.floor(width * ratio / 1.5), Math.floor(height * ratio / 1.5));
    mixedTarget.setSize(canvas.width, canvas.height);
    aspect.value = width / height;
    camera.aspect = aspect.value;
    camera.updateProjectionMatrix();
    const visibleHeight = 10 * Math.tan(THREE.MathUtils.degToRad(75) / 2);
    const side = visibleHeight * Math.max(1, camera.aspect);
    scale.value.set(side, side, 1);
    resolution.value.set(canvas.width, canvas.height);
    fluid.resize(width, height);
    pointerActive = false;
    schedule();
  };
  const pointer = (event: PointerEvent) => {
    if (!eligible() || event.pointerType === 'touch') return;
    fluid.update({ x: event.clientX / innerWidth, y: 1 - event.clientY / innerHeight });
    pointerActive = true;
    schedule();
  };
  const intersection = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting); schedule();
  });
  const main = document.querySelector('main');
  if (main) intersection.observe(main);
  window.addEventListener('resize', resize, { signal: abort.signal });
  window.addEventListener('pointermove', pointer, { passive: true, signal: abort.signal });
  document.addEventListener('visibilitychange', schedule, { signal: abort.signal });
  reducedMotion.addEventListener('change', schedule, { signal: abort.signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; schedule();
  }, { signal: abort.signal });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); }, { signal: abort.signal });
  resize();
  const controller = {
    suspend(value: boolean) { suspended = value; schedule(); },
    dispose() {
      suspended = true; schedule(); abort.abort(); intersection.disconnect();
      fluid.dispose(); noiseTarget.dispose(); target.dispose(); mixedTarget.dispose();
      quad.dispose(); gridGeometry.dispose(); crossGeometry.dispose(); crossPlane.dispose();
      for (const material of [noiseMaterial, backgroundMaterial, gridMaterial, crossMaterial, mixerMaterial, compositeMaterial]) material.dispose();
      renderer.dispose();
    },
  };
  if (new URLSearchParams(location.search).get('__backgroundCapture') === '1') {
    Object.assign(window, { __interiorBackground: {
      renderAt(seconds: number, dt = 0) { manual = true; schedule(); draw(seconds, dt); },
      resume() { manual = false; schedule(); },
      state() { return { draws, running: !!request, inView, suspended, lost, time: time.value, width: canvas.width, height: canvas.height, textures: renderer.info.memory.textures }; },
      ...controller,
    } });
  }
  return controller;
}
