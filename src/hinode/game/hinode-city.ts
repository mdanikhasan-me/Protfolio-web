import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Scene,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DrivingInput } from '../core/driving-input';
import { FixedStepClock } from '../core/fixed-step';
import { resolveQuality } from '../core/quality';
import { RapierHandlingSimulation, type HandlingPose } from '../handling/rapier-handling';
import type { HandlingBarrier } from '../handling/handling-layout';
import {
  loadCityLayout,
  nearestCityRoadPoint,
  reviewPose,
  sampleRoad,
  type HinodeCityLayout,
} from '../map/city-layout';
import { buildCityScene } from '../map/city-scene';
import { HANDLING_STEP_SECONDS } from '../vehicle/handling-model';
import './hinode-city.css';

interface CityCheckpoint {
  roadId: string;
  label: string;
  position: [number, number, number];
}

const root = document.querySelector<HTMLElement>('[data-hinode-city]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-city-canvas]');
if (!root || !canvas) throw new Error('Hinode City shell is incomplete.');

const find = <T extends Element>(selector: string) => root.querySelector<T>(selector);
const progress = find<HTMLProgressElement>('[data-loading-progress]');
const loadingStatus = find<HTMLElement>('[data-loading-status]');
const loadingPercent = find<HTMLElement>('[data-loading-percent]');
const startButton = find<HTMLButtonElement>('[data-start-drive]');
const resumeButton = find<HTMLButtonElement>('[data-resume-drive]');
const pausePanel = find<HTMLElement>('[data-pause-panel]');
const speedOutput = find<HTMLElement>('[data-speed]');
const gearOutput = find<HTMLElement>('[data-gear]');
const checkpointIndexOutput = find<HTMLElement>('[data-checkpoint-index]');
const checkpointNameOutput = find<HTMLElement>('[data-checkpoint-name]');
const roadNameOutput = find<HTMLElement>('[data-road-name]');
const routeProgress = find<HTMLElement>('[data-route-progress]');
const fpsOutput = find<HTMLElement>('[data-fps]');
const callsOutput = find<HTMLElement>('[data-draw-calls]');
const trianglesOutput = find<HTMLElement>('[data-triangles]');
const gripOutput = find<HTMLElement>('[data-grip]');
const collisionOutput = find<HTMLElement>('[data-collisions]');
const lapOutput = find<HTMLElement>('[data-lap-time]');
const statusOutput = find<HTMLElement>('[data-drive-status]');
const minimap = find<HTMLCanvasElement>('[data-minimap]');
const minimapContext = minimap?.getContext('2d');

const query = new URLSearchParams(location.search);
const requestedReviewId = query.get('review');
const requestedReviewView = query.get('view') === 'driver' ? 'driver' : 'chase';
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
renderer.toneMappingExposure = 1.42;
renderer.shadowMap.enabled = quality.headlightShadows;
renderer.shadowMap.type = PCFSoftShadowMap;

const scene = new Scene();
scene.background = new Color(0x020611);
scene.fog = new FogExp2(0x020611, quality.name === 'high' ? 0.0024 : 0.0036);
scene.add(new HemisphereLight(0x9ebde9, 0x0d0b15, 2.35));
const moon = new DirectionalLight(0xc0d7fb, 3.05);
moon.position.set(-150, 240, -80);
moon.castShadow = quality.headlightShadows;
scene.add(moon);

const camera = new PerspectiveCamera(57, 1, 0.1, 900);
const vehicleAnchor = new Group();
vehicleAnchor.name = 'RUNTIME_MAH_NIGHTLINE_CITY';
scene.add(vehicleAnchor);
const loader = new GLTFLoader();
const fixedStep = new FixedStepClock(HANDLING_STEP_SECONDS, 0.15, 24);
const desiredCamera = new Vector3();
const desiredLook = new Vector3();
const currentLook = new Vector3();

let layout: HinodeCityLayout;
let simulation: RapierHandlingSimulation | undefined;
let pose: HandlingPose | undefined;
let vehicleModel: Group | undefined;
let wheels: Record<'fl' | 'fr' | 'rl' | 'rr', Object3D | undefined> = {
  fl: undefined,
  fr: undefined,
  rl: undefined,
  rr: undefined,
};
const brakeMaterials: MeshStandardMaterial[] = [];
let checkpoints: CityCheckpoint[] = [];
let checkpointIndex = 0;
let lapStartedAt = 0;
let completedLapMilliseconds = 0;
let visualElevation = 0;
let cameraMode = 0;
let reviewMode: 'driver' | 'chase' | undefined;
let activeReviewPose: ReturnType<typeof reviewPose>;
let phase: 'loading' | 'ready' | 'driving' | 'paused' | 'error' = 'loading';
let previousTime = performance.now();
let fpsStart = previousTime;
let fpsFrames = 0;
let previousCollisions = 0;
let statusTimer = 0;

const setLoading = (ratio: number, label: string) => {
  if (progress) progress.value = ratio;
  if (loadingPercent) loadingPercent.textContent = `${Math.round(ratio * 100)}%`;
  if (loadingStatus) loadingStatus.textContent = label;
};

const setStatus = (message: string, duration = 1800) => {
  if (!statusOutput) return;
  statusOutput.textContent = message;
  clearTimeout(statusTimer);
  if (message) {
    statusTimer = window.setTimeout(() => {
      statusOutput.textContent = '';
    }, duration);
  }
};

const setPhase = (next: typeof phase) => {
  phase = next;
  root.dataset.phase = next;
  input.setActive(next === 'driving');
  if (pausePanel) pausePanel.hidden = next !== 'paused';
};

const mapBarriers = (city: HinodeCityLayout): HandlingBarrier[] =>
  city.planning.collisionVolumes.map((volume) => ({
    id: volume.id,
    x: volume.centre[0],
    z: volume.centre[2],
    width: volume.size[0],
    depth: volume.size[2],
  }));

const buildCheckpoints = (city: HinodeCityLayout): CityCheckpoint[] => {
  const requested: Array<[string, string, number]> = [
    ['main-loop', 'Main Loop', 0],
    ['touge-pass', 'Touge Pass', 4],
    ['downtown-core', 'Downtown Core', 3],
    ['flyover-junction', 'Flyover Junction', 5],
    ['waterfront-route', 'Waterfront Route', 3],
    ['alley-district', 'Alley District', 4],
  ];
  return requested.map(([roadId, label, pointIndex]) => {
    const road = city.roads.find((candidate) => candidate.id === roadId);
    if (!road) throw new Error(`Checkpoint road is missing: ${roadId}`);
    return {
      roadId,
      label,
      position: road.points[Math.min(pointIndex, road.points.length - 1)]!,
    };
  });
};

const addCityLighting = (city: HinodeCityLayout) => {
  const colours = [0x52dfff, 0xff4266, 0xf2ba52, 0x886cff, 0x48d9c0];
  city.districts.forEach((district, index) => {
    const light = new PointLight(
      colours[index % colours.length],
      quality.name === 'high' ? 72 : 42,
      quality.name === 'high' ? 82 : 58,
      1.7,
    );
    light.position.set(district.centre[0], 18, district.centre[2]);
    scene.add(light);
  });
  const main = city.roads.find((road) => road.id === 'main-loop');
  if (!main) return;
  const samples = sampleRoad(main, quality.name === 'high' ? 28 : 14);
  samples.forEach((point, index) => {
    if (index % 2 !== 0) return;
    const light = new PointLight(index % 4 === 0 ? 0xff4b64 : 0x5ddfff, 24, 32, 1.8);
    light.position.set(point.x, point.y + 4.2, point.z);
    scene.add(light);
  });
};

const loadVehicle = async () => {
  const gltf = await loader.loadAsync('/hinode/models/vehicles/mah-nightline-r34.glb');
  vehicleModel = gltf.scene;
  vehicleModel.name = 'MAH_Nightline_City_Visual';
  vehicleModel.rotation.y = Math.PI;
  vehicleAnchor.add(vehicleModel);
  wheels = {
    fl: vehicleModel.getObjectByName('VEH_Wheel_FL_LOD0'),
    fr: vehicleModel.getObjectByName('VEH_Wheel_FR_LOD0'),
    rl: vehicleModel.getObjectByName('VEH_Wheel_RL_LOD0'),
    rr: vehicleModel.getObjectByName('VEH_Wheel_RR_LOD0'),
  };
  if (Object.values(wheels).some((wheel) => !wheel)) {
    throw new Error('MAH Nightline wheel pivots are incomplete.');
  }
  vehicleModel.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.castShadow = quality.headlightShadows;
    node.receiveShadow = true;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial && material.name === 'MAH_Light_Brake_Off') {
        brakeMaterials.push(material);
      }
    }
  });
  for (const x of [-0.58, 0.58]) {
    const light = new SpotLight(0x8bd5ff, quality.name === 'high' ? 58 : 38, 42, 0.25, 0.5, 1.4);
    light.position.set(x, 0.62, -1.75);
    light.target.position.set(x * 0.4, 0.1, -20);
    light.castShadow = quality.headlightShadows;
    vehicleAnchor.add(light, light.target);
  }
  const vehicleFill = new PointLight(0x93caff, 18, 13, 1.7);
  vehicleFill.name = 'RUNTIME_VEHICLE_FILL';
  vehicleFill.position.set(0, 3.2, 1.2);
  vehicleAnchor.add(vehicleFill);
};

const nearestRoad = () =>
  layout && pose ? nearestCityRoadPoint(layout, { x: pose.x, z: pose.z }) : undefined;

const syncVehicle = () => {
  if (!pose || !layout) return;
  const road = nearestRoad();
  const targetElevation = road && road.distance <= road.road.width * 0.75 ? road.elevation : 0;
  visualElevation = MathUtils.lerp(visualElevation, targetElevation, 0.14);
  vehicleAnchor.position.set(pose.x, visualElevation + 0.025, pose.z);
  vehicleAnchor.rotation.y = pose.yaw;
  for (const wheel of Object.values(wheels)) {
    if (wheel) wheel.rotation.x = pose.wheelSpin;
  }
  if (wheels.fl) wheels.fl.rotation.y = pose.telemetry.steeringAngle;
  if (wheels.fr) wheels.fr.rotation.y = pose.telemetry.steeringAngle;
  const controls = input.peek();
  for (const material of brakeMaterials) {
    material.emissive.set(controls.brake > 0.05 ? 0xff1327 : 0x290003);
    material.emissiveIntensity = controls.brake > 0.05 ? 7.5 : 0.5;
  }
};

const updateCamera = (deltaSeconds: number, snap = false) => {
  if (!pose) return;
  const forward = new Vector3(-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
  if (reviewMode === 'driver') {
    camera.fov = 67;
    camera.updateProjectionMatrix();
    desiredCamera.set(pose.x, visualElevation + 1.38, pose.z).addScaledVector(forward, 0.45);
    desiredLook.set(pose.x, visualElevation + 1.15, pose.z).addScaledVector(forward, 34);
    if (snap) {
      camera.position.copy(desiredCamera);
      currentLook.copy(desiredLook);
    } else {
      camera.position.lerp(desiredCamera, 1 - Math.exp(-deltaSeconds * 7.5));
      currentLook.lerp(desiredLook, 1 - Math.exp(-deltaSeconds * 9.5));
    }
    camera.lookAt(currentLook);
    return;
  }
  const settings = [
    { distance: 7.8, height: 3.1, fov: 57 },
    { distance: 11.5, height: 4.7, fov: 52 },
    { distance: 3.6, height: 1.75, fov: 64 },
  ][cameraMode]!;
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  desiredCamera
    .set(pose.x, visualElevation + settings.height, pose.z)
    .addScaledVector(forward, -settings.distance);
  desiredLook
    .set(pose.x, visualElevation + 0.78, pose.z)
    .addScaledVector(forward, MathUtils.clamp(pose.telemetry.speedMetresPerSecond * 0.22, 2.4, 9));
  if (snap) {
    camera.position.copy(desiredCamera);
    currentLook.copy(desiredLook);
  } else {
    camera.position.lerp(desiredCamera, 1 - Math.exp(-deltaSeconds * 5.5));
    currentLook.lerp(desiredLook, 1 - Math.exp(-deltaSeconds * 8.2));
  }
  camera.lookAt(currentLook);
};

const resetRoute = () => {
  checkpointIndex = 0;
  lapStartedAt = phase === 'driving' ? performance.now() : 0;
  completedLapMilliseconds = 0;
};

const reset = () => {
  input.resetState();
  simulation?.reset();
  pose = simulation?.pose();
  visualElevation = 0;
  fixedStep.reset();
  resetRoute();
  syncVehicle();
  updateCamera(0, true);
  setStatus('Returned to the Main Loop spawn');
};

const togglePause = () => {
  if (phase === 'driving') {
    setPhase('paused');
  } else if (phase === 'paused') {
    previousTime = performance.now();
    fixedStep.reset();
    setPhase('driving');
    canvas.focus();
  }
};

const input = new DrivingInput({
  reset,
  camera: () => {
    cameraMode = (cameraMode + 1) % 3;
    setStatus(`Chase camera ${cameraMode + 1} / 3`);
  },
  pause: togglePause,
});

const formatTime = (milliseconds: number) => {
  const totalSeconds = milliseconds / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`;
};

const updateRoute = (now: number) => {
  if (!pose || !checkpoints.length) return;
  if (activeReviewPose && reviewMode) {
    if (checkpointIndexOutput) checkpointIndexOutput.textContent = reviewMode.toUpperCase();
    if (checkpointNameOutput) checkpointNameOutput.textContent = activeReviewPose.view.label;
    if (routeProgress) routeProgress.style.width = '100%';
    root.dataset.checkpoint = activeReviewPose.road.id;
    root.dataset.checkpointIndex = 'review';
    return;
  }
  const checkpoint = checkpoints[checkpointIndex]!;
  const distance = Math.hypot(pose.x - checkpoint.position[0], pose.z - checkpoint.position[2]);
  if (phase === 'driving' && distance < 24) {
    const reached = checkpoint.label;
    checkpointIndex += 1;
    if (checkpointIndex >= checkpoints.length) {
      completedLapMilliseconds = now - lapStartedAt;
      checkpointIndex = 0;
      lapStartedAt = now;
      setStatus(`Route complete: ${formatTime(completedLapMilliseconds)}`, 3200);
    } else {
      setStatus(`${reached} gate cleared`);
    }
  }
  const active = checkpoints[checkpointIndex]!;
  if (checkpointIndexOutput)
    checkpointIndexOutput.textContent = `${String(checkpointIndex + 1).padStart(2, '0')} / ${String(checkpoints.length).padStart(2, '0')}`;
  if (checkpointNameOutput) checkpointNameOutput.textContent = active.label;
  if (routeProgress)
    routeProgress.style.width = `${((checkpointIndex + 1) / checkpoints.length) * 100}%`;
  root.dataset.checkpoint = active.roadId;
  root.dataset.checkpointIndex = String(checkpointIndex);
};

const updateTelemetry = (now: number) => {
  if (!pose || !layout) return;
  const speedKph = Math.round(pose.telemetry.speedMetresPerSecond * 3.6);
  const gear =
    pose.telemetry.longitudinalSpeed < -0.35
      ? 'R'
      : speedKph < 2
        ? 'N'
        : String(Math.min(5, Math.floor(speedKph / 34) + 1));
  const road = nearestRoad();
  const onRoad = Boolean(road && road.distance <= road.road.width * 0.72);
  if (speedOutput) speedOutput.textContent = String(speedKph).padStart(3, '0');
  if (gearOutput) gearOutput.textContent = gear;
  if (roadNameOutput)
    roadNameOutput.textContent = road
      ? `${road.road.label}${onRoad ? '' : ' / SHOULDER'}`
      : 'OFF NETWORK';
  if (gripOutput) gripOutput.textContent = `${onRoad ? pose.telemetry.rearGripPercent : 62}%`;
  if (collisionOutput) collisionOutput.textContent = String(pose.collisions);
  const lapMilliseconds = completedLapMilliseconds || (lapStartedAt ? now - lapStartedAt : 0);
  if (lapOutput) lapOutput.textContent = formatTime(lapMilliseconds);
  root.dataset.speedKph = String(speedKph);
  root.dataset.vehicleX = pose.x.toFixed(3);
  root.dataset.vehicleZ = pose.z.toFixed(3);
  root.dataset.vehicleYaw = pose.yaw.toFixed(4);
  root.dataset.road = road?.road.id ?? 'none';
  root.dataset.onRoad = String(onRoad);
  root.dataset.collisions = String(pose.collisions);
  if (pose.collisions > previousCollisions) {
    previousCollisions = pose.collisions;
    input.pulse(0.74, 115);
    setStatus('City boundary contact registered');
  }
};

const drawMinimap = () => {
  if (!minimap || !minimapContext || !layout) return;
  const width = minimap.width;
  const height = minimap.height;
  const toCanvas = (x: number, z: number) => ({
    x: ((x - layout.bounds.minimumX) / layout.bounds.width) * width,
    y: height - ((z - layout.bounds.minimumZ) / layout.bounds.depth) * height,
  });
  minimapContext.clearRect(0, 0, width, height);
  minimapContext.fillStyle = 'rgba(3, 9, 22, 0.94)';
  minimapContext.fillRect(0, 0, width, height);
  minimapContext.lineCap = 'round';
  minimapContext.lineJoin = 'round';
  for (const road of layout.roads) {
    const samples = sampleRoad(road, Math.max(24, road.points.length * 8));
    minimapContext.beginPath();
    samples.forEach((point, index) => {
      const canvasPoint = toCanvas(point.x, point.z);
      if (index === 0) minimapContext.moveTo(canvasPoint.x, canvasPoint.y);
      else minimapContext.lineTo(canvasPoint.x, canvasPoint.y);
    });
    minimapContext.strokeStyle =
      road.kind === 'shortcut' ? '#ffb950' : road.kind === 'primary-loop' ? '#6fe5ff' : '#526b88';
    minimapContext.lineWidth = road.kind === 'primary-loop' ? 2.2 : 1.2;
    minimapContext.stroke();
  }
  const checkpoint = checkpoints[checkpointIndex];
  if (checkpoint) {
    const marker = toCanvas(checkpoint.position[0], checkpoint.position[2]);
    minimapContext.beginPath();
    minimapContext.arc(marker.x, marker.y, 4, 0, Math.PI * 2);
    minimapContext.fillStyle = '#ff5165';
    minimapContext.fill();
  }
  if (pose) {
    const car = toCanvas(pose.x, pose.z);
    minimapContext.save();
    minimapContext.translate(car.x, car.y);
    minimapContext.rotate(-pose.yaw);
    minimapContext.beginPath();
    minimapContext.moveTo(0, -6);
    minimapContext.lineTo(4, 5);
    minimapContext.lineTo(-4, 5);
    minimapContext.closePath();
    minimapContext.fillStyle = '#ffffff';
    minimapContext.fill();
    minimapContext.restore();
  }
};

const resize = () => {
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const updateRenderMetrics = (now: number) => {
  fpsFrames += 1;
  const elapsed = now - fpsStart;
  if (elapsed < 500) return;
  const fps = (fpsFrames * 1000) / elapsed;
  fpsFrames = 0;
  fpsStart = now;
  root.dataset.fps = fps.toFixed(1);
  root.dataset.drawCalls = String(renderer.info.render.calls);
  root.dataset.triangles = String(renderer.info.render.triangles);
  if (fpsOutput) fpsOutput.textContent = root.dataset.fps;
  if (callsOutput) callsOutput.textContent = root.dataset.drawCalls;
  if (trianglesOutput) trianglesOutput.textContent = root.dataset.triangles;
};

const applyRoadSurface = () => {
  if (!simulation || !pose || !layout) return;
  const road = nearestRoad();
  if (!road || road.distance <= road.road.width * 0.72) return;
  const velocity = simulation.body.linvel();
  simulation.body.setLinvel({ x: velocity.x * 0.988, y: 0, z: velocity.z * 0.988 }, true);
};

const frame = (now: number) => {
  const deltaSeconds = Math.min(0.15, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  if (phase === 'driving' && simulation) {
    fixedStep.advance(deltaSeconds, () => {
      pose = simulation?.step(input.sample(HANDLING_STEP_SECONDS));
      applyRoadSurface();
    });
    syncVehicle();
    updateRoute(now);
    updateTelemetry(now);
  }
  updateCamera(deltaSeconds);
  drawMinimap();
  renderer.render(scene, camera);
  updateRenderMetrics(now);
  requestAnimationFrame(frame);
};

const initialise = async () => {
  try {
    setLoading(0.12, 'Loading authoritative 500 × 350 metre layout');
    layout = await loadCityLayout();
    const requestedPose = requestedReviewId ? reviewPose(layout, requestedReviewId) : undefined;
    activeReviewPose = requestedPose;
    reviewMode = requestedPose ? requestedReviewView : undefined;
    checkpoints = buildCheckpoints(layout);
    const city = buildCityScene(layout, { quality: quality.name });
    scene.add(city.root);
    addCityLighting(layout);
    root.dataset.layoutId = layout.layoutId;
    root.dataset.mapWidth = String(layout.bounds.width);
    root.dataset.mapDepth = String(layout.bounds.depth);
    root.dataset.routeCount = String(layout.roads.length);
    setLoading(0.45, 'Initialising Rapier city boundary and 120 Hz handling');
    simulation = await RapierHandlingSimulation.create({
      spawn: requestedPose
        ? {
            x: requestedPose.position.x,
            z: requestedPose.position.z,
            yaw: requestedPose.yawRadians,
          }
        : {
            x: layout.spawn.position[0],
            z: layout.spawn.position[2],
            yaw: layout.spawn.yawRadians,
          },
      barriers: mapBarriers(layout),
    });
    root.dataset.rapier = 'ready';
    root.dataset.physicsHz = '120';
    setLoading(0.7, 'Loading attributed MAH Nightline');
    await loadVehicle();
    pose = simulation.pose();
    visualElevation = requestedPose?.position.y ?? 0;
    if (vehicleModel && reviewMode === 'driver') vehicleModel.visible = false;
    syncVehicle();
    updateRoute(performance.now());
    updateTelemetry(performance.now());
    updateCamera(0, true);
    drawMinimap();
    setLoading(1, 'Hinode City ready');
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = requestedPose ? `Open ${requestedReviewView} view` : 'Start route';
    }
    root.dataset.assetId = 'VEH_MAH_Nightline_R34_Derivative';
    root.dataset.review = requestedPose?.view.id ?? 'none';
    root.dataset.reviewView = reviewMode ?? 'none';
    if (requestedPose) {
      if (checkpointNameOutput) checkpointNameOutput.textContent = requestedPose.view.label;
      if (roadNameOutput) roadNameOutput.textContent = `${requestedReviewView} review`;
      setStatus(`${requestedPose.view.label} ${requestedReviewView} view ready`, 4_000);
    }
    setPhase('ready');
  } catch (error) {
    console.error(error);
    setLoading(0, 'Hinode City failed to initialise');
    if (startButton) startButton.hidden = true;
    setPhase('error');
  }
};

startButton?.addEventListener('click', () => {
  if (!simulation || !vehicleModel) return;
  previousTime = performance.now();
  lapStartedAt = previousTime;
  fixedStep.reset();
  setPhase('driving');
  canvas.focus();
});
resumeButton?.addEventListener('click', togglePause);
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && phase === 'driving') setPhase('paused');
});

resize();
camera.position.set(-198, 3.2, -83);
currentLook.set(-191, 0.8, -92);
camera.lookAt(currentLook);
requestAnimationFrame(frame);
void initialise();

addEventListener(
  'pagehide',
  () => {
    input.dispose();
    simulation?.dispose();
    renderer.dispose();
  },
  { once: true },
);
