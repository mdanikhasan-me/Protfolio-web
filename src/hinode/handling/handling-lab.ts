import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  FogExp2,
  GridHelper,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
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
import { HANDLING_STEP_SECONDS } from '../vehicle/handling-model';
import { HANDLING_BARRIERS, HANDLING_BOUNDS, HANDLING_SECTIONS } from './handling-layout';
import { RapierHandlingSimulation, type HandlingPose } from './rapier-handling';
import './handling-lab.css';

const root = document.querySelector<HTMLElement>('[data-handling-lab]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-handling-canvas]');
if (!root || !canvas) throw new Error('Hinode handling lab shell is incomplete.');

const find = <T extends Element>(selector: string) => root.querySelector<T>(selector);
const progress = find<HTMLProgressElement>('[data-loading-progress]');
const loadingStatus = find<HTMLElement>('[data-loading-status]');
const loadingPercent = find<HTMLElement>('[data-loading-percent]');
const startButton = find<HTMLButtonElement>('[data-start-drive]');
const resumeButton = find<HTMLButtonElement>('[data-resume-drive]');
const pausePanel = find<HTMLElement>('[data-pause-panel]');
const speedOutput = find<HTMLElement>('[data-speed]');
const gearOutput = find<HTMLElement>('[data-gear]');
const steerOutput = find<HTMLElement>('[data-steer]');
const frontSlipOutput = find<HTMLElement>('[data-front-slip]');
const rearSlipOutput = find<HTMLElement>('[data-rear-slip]');
const lateralOutput = find<HTMLElement>('[data-lateral-g]');
const rearGripOutput = find<HTMLElement>('[data-rear-grip]');
const collisionOutput = find<HTMLElement>('[data-collisions]');
const rapierOutput = find<HTMLElement>('[data-rapier]');
const fpsOutput = find<HTMLElement>('[data-fps]');
const callsOutput = find<HTMLElement>('[data-draw-calls]');
const trianglesOutput = find<HTMLElement>('[data-triangles]');
const qualityOutput = find<HTMLElement>('[data-quality]');
const statusOutput = find<HTMLElement>('[data-drive-status]');
const rpmOutput = find<HTMLElement>('[data-engine-rpm]');
const throttleOutput = find<HTMLElement>('[data-throttle]');
const brakeOutput = find<HTMLElement>('[data-brake]');
const steerInputOutput = find<HTMLElement>('[data-steer-input]');
const longitudinalOutput = find<HTMLElement>('[data-longitudinal-g]');
const frontGripOutput = find<HTMLElement>('[data-front-grip]');
const handbrakeOutput = find<HTMLElement>('[data-handbrake]');
const groundedOutput = find<HTMLElement>('[data-grounded-wheels]');
const physicsFrameOutput = find<HTMLElement>('[data-physics-frame]');
const resetsOutput = find<HTMLElement>('[data-resets]');
const tuningProfileOutput = find<HTMLElement>('[data-tuning-profile-output]');
const tuningForm = find<HTMLFormElement>('[data-tuning-form]');
const tuningProfile = find<HTMLSelectElement>('[data-tuning-profile]');
const tuningSteering = find<HTMLInputElement>('[data-tuning-steering]');
const tuningGrip = find<HTMLInputElement>('[data-tuning-grip]');
const tuningHandbrake = find<HTMLInputElement>('[data-tuning-handbrake]');

const quality = resolveQuality(location.search);
root.dataset.quality = quality.name;
if (qualityOutput) qualityOutput.textContent = quality.name.toUpperCase();

const renderer = new WebGLRenderer({
  canvas,
  antialias: quality.antialias,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.62;
renderer.shadowMap.enabled = quality.headlightShadows;
renderer.shadowMap.type = PCFSoftShadowMap;

const scene = new Scene();
scene.background = new Color(0x050b18);
scene.fog = new FogExp2(0x050b18, quality.name === 'high' ? 0.006 : 0.009);
scene.add(new HemisphereLight(0xb8d5ff, 0x17101c, 3.1));
const moon = new DirectionalLight(0xc4dcff, 3.1);
moon.position.set(-35, 44, 22);
moon.castShadow = quality.headlightShadows;
scene.add(moon);

const camera = new PerspectiveCamera(58, 1, 0.1, 260);
const vehicleAnchor = new Group();
vehicleAnchor.name = 'RUNTIME_MAH_NIGHTLINE';
scene.add(vehicleAnchor);
const loader = new GLTFLoader();
const fixedStep = new FixedStepClock(HANDLING_STEP_SECONDS, 0.15, 24);
const desiredCamera = new Vector3();
const desiredLook = new Vector3();
const currentLook = new Vector3();

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
let phase: 'loading' | 'ready' | 'driving' | 'paused' | 'error' = 'loading';
let previousTime = performance.now();
let cameraMode = 0;
let lastContactCount = 0;
let resetCount = 0;
let physicsFrameMilliseconds = 0;
let statusTimer = 0;
let fpsFrames = 0;
let fpsStart = previousTime;

const setLoading = (ratio: number, label: string) => {
  if (progress) progress.value = ratio;
  if (loadingPercent) loadingPercent.textContent = `${Math.round(ratio * 100)}%`;
  if (loadingStatus) loadingStatus.textContent = label;
};

const setPhase = (next: typeof phase) => {
  phase = next;
  root.dataset.phase = next;
  input.setActive(next === 'driving');
  if (pausePanel) pausePanel.hidden = next !== 'paused';
};

const setStatus = (message: string, duration = 1600) => {
  if (!statusOutput) return;
  statusOutput.textContent = message;
  clearTimeout(statusTimer);
  if (message) {
    statusTimer = window.setTimeout(() => {
      statusOutput.textContent = '';
    }, duration);
  }
};

const buildLab = () => {
  const groundMaterial = new MeshStandardMaterial({
    color: 0x18283d,
    roughness: 0.86,
    metalness: 0.06,
  });
  const ground = new Mesh(
    new PlaneGeometry(HANDLING_BOUNDS.width, HANDLING_BOUNDS.depth),
    groundMaterial,
  );
  ground.name = 'LAB_Asphalt';
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new GridHelper(HANDLING_BOUNDS.width, 28, 0x2a5579, 0x173048);
  grid.position.y = 0.008;
  scene.add(grid);

  const sectionColours = {
    acceleration: 0x43d8ff,
    braking: 0xffb84d,
    slalom: 0xff5f79,
    curve: 0x8c85ff,
    corner: 0xff8e54,
    hairpin: 0xff55bd,
    surface: 0xb0c372,
    camera: 0x5de3c1,
    clearance: 0x75a8ff,
    collision: 0xff4d58,
    reset: 0xffffff,
  } as const;
  for (const definition of HANDLING_SECTIONS) {
    const group = new Group();
    group.name = `LAB_SECTION_${definition.id}`;
    group.userData.sectionLabel = definition.label;
    group.position.set(definition.centre[0], 0.018, definition.centre[1]);
    group.rotation.y = definition.yaw ?? 0;
    const colour = sectionColours[definition.class];
    const zone = new Mesh(
      new PlaneGeometry(definition.size[0], definition.size[1]),
      new MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: definition.class === 'reset' ? 0.2 : 0.055,
        depthWrite: false,
      }),
    );
    zone.rotation.x = -Math.PI / 2;
    const outline = new LineLoop(
      new BufferGeometry().setFromPoints([
        new Vector3(-definition.size[0] * 0.5, 0.015, -definition.size[1] * 0.5),
        new Vector3(definition.size[0] * 0.5, 0.015, -definition.size[1] * 0.5),
        new Vector3(definition.size[0] * 0.5, 0.015, definition.size[1] * 0.5),
        new Vector3(-definition.size[0] * 0.5, 0.015, definition.size[1] * 0.5),
      ]),
      new LineBasicMaterial({ color: colour, transparent: true, opacity: 0.44 }),
    );
    group.add(zone, outline);
    scene.add(group);
  }
  root.dataset.sectionCount = String(HANDLING_SECTIONS.length);

  const linePoints = Array.from({ length: 96 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    return new Vector3(Math.cos(angle) * 55, 0.025, Math.sin(angle) * 31);
  });
  scene.add(
    new LineLoop(
      new BufferGeometry().setFromPoints(linePoints),
      new LineBasicMaterial({ color: 0x75dfff }),
    ),
  );

  const barrierGeometry = new BoxGeometry(1, 1.5, 1);
  const barrierMaterial = new MeshStandardMaterial({
    color: 0x344d6d,
    roughness: 0.52,
    metalness: 0.58,
  });
  for (const barrier of HANDLING_BARRIERS) {
    const mesh = new Mesh(barrierGeometry, barrierMaterial);
    mesh.name = `LAB_Barrier_${barrier.id}`;
    mesh.position.set(barrier.x, 0.75, barrier.z);
    mesh.scale.set(barrier.width, 1, barrier.depth);
    mesh.rotation.y = barrier.yaw ?? 0;
    mesh.castShadow = quality.headlightShadows;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const coneGeometry = new ConeGeometry(0.28, 0.72, 8);
  const coneMaterial = new MeshStandardMaterial({
    color: 0xff4f3e,
    emissive: 0x2b0402,
    emissiveIntensity: 0.9,
    roughness: 0.58,
  });
  for (let index = 0; index < 13; index += 1) {
    const cone = new Mesh(coneGeometry, coneMaterial);
    cone.position.set(-26 + index * 4.3, 0.36, index % 2 === 0 ? -4.5 : 4.5);
    cone.castShadow = quality.headlightShadows;
    scene.add(cone);
  }

  const lightCount = quality.name === 'high' ? 16 : 8;
  for (let index = 0; index < lightCount; index += 1) {
    const angle = (index / lightCount) * Math.PI * 2;
    const light = new PointLight(index % 3 === 0 ? 0xff405b : 0x57cfff, 24, 24, 1.8);
    light.position.set(Math.cos(angle) * 62, 4.6, Math.sin(angle) * 37);
    scene.add(light);
  }
};

const syncVehicle = () => {
  if (!pose) return;
  vehicleAnchor.position.set(pose.x, 0.025, pose.z);
  vehicleAnchor.rotation.y = pose.yaw;
  for (const wheel of Object.values(wheels)) {
    if (wheel) wheel.rotation.x = pose.wheelSpin;
  }
  if (wheels.fl) wheels.fl.rotation.y = pose.telemetry.steeringAngle;
  if (wheels.fr) wheels.fr.rotation.y = pose.telemetry.steeringAngle;
  const inputState = input.peek();
  for (const material of brakeMaterials) {
    material.emissive.set(inputState.brake > 0.05 ? 0xff1327 : 0x290003);
    material.emissiveIntensity = inputState.brake > 0.05 ? 7.5 : 0.55;
  }
};

const updateCamera = (deltaSeconds: number, snap = false) => {
  if (!pose) return;
  const forward = new Vector3(-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
  const right = new Vector3(-forward.z, 0, forward.x);
  const cameraSettings = [
    { distance: 7.6, height: 3.05, side: 0 },
    { distance: 10.2, height: 4.15, side: 0 },
    { distance: 8.8, height: 3.45, side: 4.6 },
  ] as const;
  const settings = cameraSettings[cameraMode] ?? cameraSettings[0];
  desiredCamera
    .set(pose.x, settings.height, pose.z)
    .addScaledVector(forward, -settings.distance)
    .addScaledVector(right, settings.side);
  desiredLook
    .set(pose.x, 0.8, pose.z)
    .addScaledVector(forward, MathUtils.clamp(pose.telemetry.speedMetresPerSecond * 0.2, 2.2, 8));
  const cameraVector = desiredCamera.clone().sub(desiredLook);
  for (let progress = 0.12; progress <= 1; progress += 0.05) {
    const candidate = desiredLook.clone().addScaledVector(cameraVector, progress);
    const blocked = HANDLING_BARRIERS.some((barrier) => {
      if (candidate.y > 2.2) return false;
      const yaw = -(barrier.yaw ?? 0);
      const deltaX = candidate.x - barrier.x;
      const deltaZ = candidate.z - barrier.z;
      const localX = deltaX * Math.cos(yaw) - deltaZ * Math.sin(yaw);
      const localZ = deltaX * Math.sin(yaw) + deltaZ * Math.cos(yaw);
      return (
        Math.abs(localX) <= barrier.width * 0.5 + 0.55 &&
        Math.abs(localZ) <= barrier.depth * 0.5 + 0.55
      );
    });
    if (blocked) {
      desiredCamera.copy(desiredLook).addScaledVector(cameraVector, Math.max(0.1, progress - 0.08));
      break;
    }
  }
  const requestedFov = MathUtils.clamp(54 + pose.telemetry.speedMetresPerSecond * 0.32, 54, 67);
  if (Math.abs(camera.fov - requestedFov) > 0.05) {
    camera.fov = MathUtils.lerp(camera.fov, requestedFov, snap ? 1 : 0.08);
    camera.updateProjectionMatrix();
  }
  if (snap) {
    camera.position.copy(desiredCamera);
    currentLook.copy(desiredLook);
  } else {
    camera.position.lerp(desiredCamera, 1 - Math.exp(-deltaSeconds * 5.8));
    currentLook.lerp(desiredLook, 1 - Math.exp(-deltaSeconds * 8.2));
  }
  camera.lookAt(currentLook);
};

const reset = () => {
  input.resetState();
  simulation?.reset();
  pose = simulation?.pose();
  fixedStep.reset();
  syncVehicle();
  updateCamera(0, true);
  lastContactCount = 0;
  resetCount += 1;
  setStatus('Nightline reset to the measured spawn');
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
    root.dataset.cameraMode = String(cameraMode);
    setStatus(`Camera ${cameraMode + 1} / 3`);
  },
  pause: togglePause,
});

const updateTelemetry = () => {
  if (!pose) return;
  const speedKph = Math.round(pose.telemetry.speedMetresPerSecond * 3.6);
  const longitudinal = pose.telemetry.longitudinalSpeed;
  const gear =
    longitudinal < -0.35
      ? 'R'
      : speedKph < 2
        ? 'N'
        : String(Math.min(5, Math.floor(speedKph / 34) + 1));
  if (speedOutput) speedOutput.textContent = String(speedKph).padStart(3, '0');
  if (gearOutput) gearOutput.textContent = gear;
  if (steerOutput)
    steerOutput.textContent = `${MathUtils.radToDeg(pose.telemetry.steeringAngle).toFixed(1)}°`;
  if (frontSlipOutput)
    frontSlipOutput.textContent = `${pose.telemetry.frontSlipDegrees.toFixed(1)}°`;
  if (rearSlipOutput) rearSlipOutput.textContent = `${pose.telemetry.rearSlipDegrees.toFixed(1)}°`;
  if (lateralOutput) lateralOutput.textContent = `${pose.telemetry.lateralG.toFixed(2)} G`;
  if (rearGripOutput) rearGripOutput.textContent = `${pose.telemetry.rearGripPercent}%`;
  if (collisionOutput) collisionOutput.textContent = String(pose.collisions);
  const controls = input.peek();
  const numericGear = Number.parseInt(gear, 10) || 1;
  const rpm = Math.round(
    MathUtils.clamp(
      900 + (Math.abs(speedKph) * 125) / numericGear + controls.throttle * 850,
      900,
      7600,
    ),
  );
  if (rpmOutput) rpmOutput.textContent = String(rpm);
  if (throttleOutput) throttleOutput.textContent = `${Math.round(controls.throttle * 100)}%`;
  if (brakeOutput) brakeOutput.textContent = `${Math.round(controls.brake * 100)}%`;
  if (steerInputOutput) steerInputOutput.textContent = `${Math.round(controls.steer * 100)}%`;
  if (longitudinalOutput)
    longitudinalOutput.textContent = `${pose.telemetry.longitudinalG.toFixed(2)} G`;
  if (frontGripOutput) frontGripOutput.textContent = `${pose.telemetry.frontGripPercent}%`;
  if (handbrakeOutput) handbrakeOutput.textContent = controls.handbrake ? 'ON' : 'OFF';
  if (groundedOutput) groundedOutput.textContent = '4 / 4';
  if (physicsFrameOutput)
    physicsFrameOutput.textContent = `${physicsFrameMilliseconds.toFixed(2)} MS`;
  if (resetsOutput) resetsOutput.textContent = String(resetCount);
  root.dataset.speedKph = String(speedKph);
  root.dataset.vehicleX = pose.x.toFixed(3);
  root.dataset.vehicleZ = pose.z.toFixed(3);
  root.dataset.vehicleYaw = pose.yaw.toFixed(4);
  root.dataset.frontSlip = pose.telemetry.frontSlipDegrees.toFixed(3);
  root.dataset.rearSlip = pose.telemetry.rearSlipDegrees.toFixed(3);
  root.dataset.rearGrip = String(pose.telemetry.rearGripPercent);
  root.dataset.collisions = String(pose.collisions);
  root.dataset.engineRpm = String(rpm);
  root.dataset.throttle = controls.throttle.toFixed(3);
  root.dataset.brake = controls.brake.toFixed(3);
  root.dataset.steerInput = controls.steer.toFixed(3);
  root.dataset.longitudinalG = pose.telemetry.longitudinalG.toFixed(3);
  root.dataset.frontGrip = String(pose.telemetry.frontGripPercent);
  root.dataset.handbrake = String(controls.handbrake);
  root.dataset.groundedWheels = '4';
  root.dataset.physicsFrameMs = physicsFrameMilliseconds.toFixed(3);
  root.dataset.resetCount = String(resetCount);
  if (pose.collisions > lastContactCount) {
    lastContactCount = pose.collisions;
    input.pulse(0.74, 115);
    setStatus('Rapier barrier contact registered');
  }
};

const resize = () => {
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const updateRendererMetrics = (now: number) => {
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

const frame = (now: number) => {
  const deltaSeconds = Math.min(0.15, Math.max(0, (now - previousTime) / 1000));
  previousTime = now;
  if (phase === 'driving' && simulation) {
    const physicsStart = performance.now();
    fixedStep.advance(deltaSeconds, () => {
      pose = simulation?.step(input.sample(HANDLING_STEP_SECONDS));
    });
    physicsFrameMilliseconds = performance.now() - physicsStart;
    syncVehicle();
    updateTelemetry();
  }
  updateCamera(deltaSeconds);
  renderer.render(scene, camera);
  updateRendererMetrics(now);
  requestAnimationFrame(frame);
};

const tuningProfiles = {
  'balanced-road': { steeringResponse: 1, gripScale: 1, handbrakeGripScale: 1 },
  'road-grip': { steeringResponse: 0.92, gripScale: 1.1, handbrakeGripScale: 1.05 },
  'drift-study': { steeringResponse: 1.1, gripScale: 0.92, handbrakeGripScale: 0.74 },
} as const;

const applyTuning = (profileName: string) => {
  if (!simulation || !tuningSteering || !tuningGrip || !tuningHandbrake) return;
  simulation.setTuning({
    steeringResponse: Number(tuningSteering.value),
    gripScale: Number(tuningGrip.value),
    handbrakeGripScale: Number(tuningHandbrake.value),
  });
  root.dataset.tuningProfile = profileName;
  if (tuningProfileOutput)
    tuningProfileOutput.textContent = profileName.replaceAll('-', ' ').toUpperCase();
};

tuningProfile?.addEventListener('change', () => {
  const profile = tuningProfiles[tuningProfile.value as keyof typeof tuningProfiles];
  if (!profile || !tuningSteering || !tuningGrip || !tuningHandbrake) return;
  tuningSteering.value = String(profile.steeringResponse);
  tuningGrip.value = String(profile.gripScale);
  tuningHandbrake.value = String(profile.handbrakeGripScale);
  applyTuning(tuningProfile.value);
  setStatus(`${tuningProfile.value.replaceAll('-', ' ')} tuning loaded`);
});

tuningForm?.addEventListener('input', (event) => {
  if (event.target === tuningProfile) return;
  applyTuning('custom');
});

const loadVehicle = async () => {
  const gltf = await loader.loadAsync('/hinode/models/vehicles/mah-nightline-r34.glb');
  vehicleModel = gltf.scene;
  vehicleModel.name = 'MAH_Nightline_Visual';
  vehicleModel.rotation.y = Math.PI;
  vehicleAnchor.add(vehicleModel);
  wheels = {
    fl: vehicleModel.getObjectByName('VEH_Wheel_FL_LOD0'),
    fr: vehicleModel.getObjectByName('VEH_Wheel_FR_LOD0'),
    rl: vehicleModel.getObjectByName('VEH_Wheel_RL_LOD0'),
    rr: vehicleModel.getObjectByName('VEH_Wheel_RR_LOD0'),
  };
  if (Object.values(wheels).some((wheel) => !wheel)) {
    throw new Error('The MAH Nightline export is missing one or more independent wheel pivots.');
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
  const headlights = [
    { x: -0.58, name: 'RUNTIME_HEADLIGHT_L' },
    { x: 0.58, name: 'RUNTIME_HEADLIGHT_R' },
  ];
  for (const definition of headlights) {
    const light = new SpotLight(0x80cfff, quality.name === 'high' ? 54 : 36, 35, 0.26, 0.45, 1.5);
    light.name = definition.name;
    light.position.set(definition.x, 0.62, -1.75);
    light.target.position.set(definition.x * 0.5, 0.12, -18);
    light.castShadow = quality.headlightShadows;
    vehicleAnchor.add(light, light.target);
  }
  const vehicleFill = new PointLight(0xb9dcff, 52, 18, 1.45);
  vehicleFill.name = 'RUNTIME_VEHICLE_FILL';
  vehicleFill.position.set(0, 3.2, 1.2);
  vehicleAnchor.add(vehicleFill);
};

const initialise = async () => {
  try {
    buildLab();
    setLoading(0.18, 'Loading Rapier WebAssembly');
    simulation = await RapierHandlingSimulation.create();
    applyTuning('balanced-road');
    root.dataset.rapier = 'ready';
    root.dataset.physicsHz = '120';
    if (rapierOutput) rapierOutput.textContent = 'READY';
    setLoading(0.55, 'Loading attributed MAH Nightline LOD0');
    await loadVehicle();
    pose = simulation.pose();
    syncVehicle();
    updateTelemetry();
    updateCamera(0, true);
    setLoading(1, 'Handling lab ready');
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = 'Enter proving ground';
    }
    root.dataset.assetId = 'VEH_MAH_Nightline_R34_Derivative';
    root.dataset.cameraMode = String(cameraMode);
    setPhase('ready');
  } catch (error) {
    console.error(error);
    setLoading(0, 'Handling lab failed to initialise');
    if (startButton) startButton.hidden = true;
    setPhase('error');
  }
};

startButton?.addEventListener('click', () => {
  if (!simulation || !vehicleModel) return;
  previousTime = performance.now();
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
camera.position.set(-47, 3.2, 29);
currentLook.set(-47, 0.8, 20);
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
