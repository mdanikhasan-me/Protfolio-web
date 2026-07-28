import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { ChaseCamera } from '../camera/chase-camera';
import { FixedStepClock } from '../core/fixed-step';
import { HinodeInput } from '../core/input';
import { resolveQuality } from '../core/quality';
import { nearestRoad } from '../environment/road-network';
import { disposeHinodeAssets, loadHinodeAssets, type HinodeAssets } from '../loading/assets';
import {
  createVehicleState,
  resetVehicle,
  speedKph,
  stepVehicle,
  type VehicleStepResult,
} from '../vehicle/dynamics';

const root = document.querySelector<HTMLElement>('[data-hinode-preview]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-hinode-canvas]');

if (!root || !canvas) throw new Error('Hinode preview shell is incomplete.');

const progress = root.querySelector<HTMLProgressElement>('[data-loading-progress]');
const progressText = root.querySelector<HTMLElement>('[data-loading-percent]');
const loadingStatus = root.querySelector<HTMLElement>('[data-loading-status]');
const startButton = root.querySelector<HTMLButtonElement>('[data-start-drive]');
const pausePanel = root.querySelector<HTMLElement>('[data-pause-panel]');
const resumeButton = root.querySelector<HTMLButtonElement>('[data-resume-drive]');
const speedOutput = root.querySelector<HTMLElement>('[data-speed]');
const gearOutput = root.querySelector<HTMLElement>('[data-gear]');
const statusOutput = root.querySelector<HTMLElement>('[data-drive-status]');

const quality = resolveQuality(location.search);
root.dataset.quality = quality.name;

const renderer = new WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = quality.headlightShadows;

const scene = new Scene();
scene.background = new Color(0x030916);
const camera = new PerspectiveCamera(55, 1, 0.1, 180);
const chaseCamera = new ChaseCamera();
scene.add(new HemisphereLight(0x829dc2, 0x09080c, 1.3));
const moon = new DirectionalLight(0xaac5ed, 1.55);
moon.position.set(-12, 20, -8);
scene.add(moon);

const vehicle = createVehicleState();
const fixedStep = new FixedStepClock();
let assets: HinodeAssets | undefined;
let lastStep: VehicleStepResult = {
  collided: false,
  brakeLights: false,
  gripPercent: 100,
  gear: 'N',
};
let phase: 'loading' | 'ready' | 'driving' | 'paused' | 'error' = 'loading';
let previousTime = performance.now();
let fpsWindowStart = previousTime;
let fpsFrames = 0;
let statusTimeout = 0;

const setPhase = (next: typeof phase) => {
  phase = next;
  root.dataset.phase = next;
  const isDriving = next === 'driving';
  input.setActive(isDriving);
  if (pausePanel) pausePanel.hidden = next !== 'paused';
};

const setStatus = (message: string, duration = 1400) => {
  if (!statusOutput) return;
  statusOutput.textContent = message;
  clearTimeout(statusTimeout);
  if (message) {
    statusTimeout = window.setTimeout(() => {
      statusOutput.textContent = '';
    }, duration);
  }
};

const syncVehicleModel = () => {
  if (!assets) return;
  assets.vehicleRoot.position.set(vehicle.x, 0.035 + vehicle.bodyBob, vehicle.z);
  assets.vehicleRoot.rotation.y = vehicle.yaw;
  for (const wheel of Object.values(assets.wheels)) wheel.rotation.x = vehicle.wheelSpin;
  assets.wheels.frontLeft.rotation.y = -vehicle.steering;
  assets.wheels.frontRight.rotation.y = -vehicle.steering;
  for (const material of assets.brakeMaterials) {
    material.emissiveIntensity = lastStep.brakeLights ? 7 : 2.2;
    material.needsUpdate = true;
  }
};

const reset = () => {
  resetVehicle(vehicle);
  fixedStep.reset();
  syncVehicleModel();
  chaseCamera.snap(camera, vehicle);
  setStatus('Vehicle reset');
};

const togglePause = () => {
  if (phase === 'driving') {
    setPhase('paused');
    setStatus('');
  } else if (phase === 'paused') {
    previousTime = performance.now();
    fixedStep.reset();
    setPhase('driving');
    canvas.focus();
  }
};

const input = new HinodeInput({
  reset,
  camera: () => {
    chaseCamera.toggleDistance();
    setStatus('Camera distance changed');
  },
  pause: togglePause,
});

const resize = () => {
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const updateMetrics = (now: number) => {
  fpsFrames += 1;
  const elapsed = now - fpsWindowStart;
  if (elapsed < 500) return;
  const fps = (fpsFrames * 1000) / elapsed;
  fpsFrames = 0;
  fpsWindowStart = now;
  root.dataset.fps = fps.toFixed(1);
  root.dataset.drawCalls = String(renderer.info.render.calls);
  root.dataset.triangles = String(renderer.info.render.triangles);
  root.dataset.textures = String(renderer.info.memory.textures);
  root.dataset.geometries = String(renderer.info.memory.geometries);
  root.dataset.speedKph = String(speedKph(vehicle));
  root.dataset.vehicleX = vehicle.x.toFixed(3);
  root.dataset.vehicleZ = vehicle.z.toFixed(3);
  root.dataset.collisions = String(vehicle.collisions);
  root.dataset.road = nearestRoad(vehicle).corridor.id;
  root.dataset.grip = String(lastStep.gripPercent);
};

const frame = (now: number) => {
  const frameSeconds = Math.min(0.1, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;

  if (phase === 'driving') {
    fixedStep.advance(frameSeconds, (stepSeconds) => {
      lastStep = stepVehicle(vehicle, input.state, stepSeconds);
      if (lastStep.collided) setStatus('Barrier contact — keep the coupe inside the clear lane');
    });
    syncVehicleModel();
    chaseCamera.update(camera, vehicle, frameSeconds);
  }

  if (speedOutput) speedOutput.textContent = String(speedKph(vehicle)).padStart(2, '0');
  if (gearOutput) gearOutput.textContent = `GEAR ${lastStep.gear}`;
  renderer.render(scene, camera);
  updateMetrics(now);
  requestAnimationFrame(frame);
};

const startDrive = () => {
  if (!assets || phase === 'loading' || phase === 'error') return;
  previousTime = performance.now();
  fixedStep.reset();
  setPhase('driving');
  canvas.focus();
};

startButton?.addEventListener('click', startDrive);
resumeButton?.addEventListener('click', togglePause);
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && phase === 'driving') setPhase('paused');
});

resize();
chaseCamera.snap(camera, vehicle);
requestAnimationFrame(frame);

loadHinodeAssets((ratio) => {
  if (progress) progress.value = ratio;
  if (progressText) progressText.textContent = `${Math.round(ratio * 100)}%`;
})
  .then((loaded) => {
    assets = loaded;
    scene.add(loaded.environment, loaded.vehicleScene);
    syncVehicleModel();
    chaseCamera.snap(camera, vehicle);
    if (loadingStatus) loadingStatus.textContent = 'New Hinode slice ready';
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = 'Start drive';
    }
    setPhase('ready');
  })
  .catch((error: unknown) => {
    console.error(error);
    if (loadingStatus) loadingStatus.textContent = 'The 3D slice could not load.';
    if (startButton) startButton.hidden = true;
    setPhase('error');
  });

addEventListener(
  'pagehide',
  () => {
    input.dispose();
    if (assets) disposeHinodeAssets(assets);
    renderer.dispose();
  },
  { once: true },
);
