import * as THREE from 'three';
import { referenceMotionState } from '../lib/reference-motion-state';
import { createReferenceBackgroundSystem } from './reference-background-system';

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));
const smoothstep = (minimum: number, maximum: number, value: number) => {
  const normalized = clamp((value - minimum) / Math.max(0.00001, maximum - minimum));
  return normalized * normalized * (3 - 2 * normalized);
};
const sigmoidEasing6 = (value: number) => {
  const normalized = clamp(value);
  const exponential = Math.exp(-6 * (2 * normalized - 1));
  const endpoint = Math.exp(-6);
  return (
    1 + ((1 - exponential) / (1 + exponential)) * ((1 + endpoint) / (1 - endpoint))
  ) * 0.5;
};

const section = document.querySelector<HTMLElement>('[data-reference-opening]');
const world = document.querySelector<HTMLElement>('[data-reference-world]');
const canvas = world?.querySelector<HTMLCanvasElement>('[data-reference-canvas]');
const curveSection = document.querySelector<HTMLElement>('[data-curve-work]');
const meltSection = document.querySelector<HTMLElement>('[data-melt-section]');
const stateReadout = world?.querySelector<HTMLElement>('[data-reference-state]');
const quaternionReadout = world?.querySelector<HTMLElement>('[data-reference-fold]');
const resetButton = world?.querySelector<HTMLButtonElement>('[data-reference-reset]');
const rotationGizmo = world?.querySelector<HTMLButtonElement>('[data-reference-gizmo]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = matchMedia('(hover: none) and (pointer: coarse)').matches;
const pointerEffectsEnabled = !coarsePointer;
const pointerMotionIntensity = reducedMotion ? 0.35 : 1;
const captureParameters = new URLSearchParams(window.location.search);
const deterministicCaptureMode = captureParameters.get('__capture') === '1';
const parseCaptureDimension = (name: string, fallback: number) => {
  const value = Number(captureParameters.get(name));
  return Number.isInteger(value) && value >= 320 && value <= 4096 ? value : fallback;
};
const captureWidth = parseCaptureDimension('__captureWidth', 2560);
const captureHeight = parseCaptureDimension('__captureHeight', 1440);
const REFERENCE_CAPTURE_FPS = 120;
const REFERENCE_TOTAL_PICTURES = 32_607;
const parseCaptureInteger = (name: string, fallback: number, minimum: number, maximum: number) => {
  const value = Number(captureParameters.get(name));
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : fallback;
};
const captureFirstPicture = parseCaptureInteger(
  '__captureFirstPicture',
  1,
  1,
  REFERENCE_TOTAL_PICTURES,
);
const captureLastPicture = parseCaptureInteger(
  '__captureLastPicture',
  REFERENCE_TOTAL_PICTURES,
  captureFirstPicture,
  REFERENCE_TOTAL_PICTURES,
);
const captureRangePictures = captureLastPicture - captureFirstPicture + 1;
const captureBatchSize = parseCaptureInteger('__captureBatchSize', 4, 1, 8);
const capturePointerSweep =
  deterministicCaptureMode && captureParameters.get('__capturePointer') === 'sweep';
const captureNoiseOffsetRaw = captureParameters.get('__captureNoiseOffset');
const captureNoiseOffsetParameter =
  captureNoiseOffsetRaw === null ? Number.NaN : Number(captureNoiseOffsetRaw);
const captureNoiseTimeOffset =
  deterministicCaptureMode && Number.isFinite(captureNoiseOffsetParameter)
    ? Math.max(0, captureNoiseOffsetParameter)
    : undefined;
const captureGalleryRaw = captureParameters.get('__captureGallery');
const captureGalleryParameter = captureGalleryRaw === null ? Number.NaN : Number(captureGalleryRaw);
const captureGallerySweep = deterministicCaptureMode && captureGalleryRaw === 'sweep';
const captureGalleryProgressOverride =
  deterministicCaptureMode && Number.isFinite(captureGalleryParameter)
    ? clamp(captureGalleryParameter, 0, 10)
    : null;
const captureGalleryMotionSchedule = [
  0, 0.002191, 0.002229, 0.005391, 0.008741, 0.012507, 0.012522, 0.016708,
  0.021635, 0.027059, 0.027087, 0.033244, 0.040513, 0.049145, 0.049179, 0.058503,
  0.058539, 0.067795, 0.078618, 0.08813, 0.088156, 0.097817, 0.107711, 0.120475,
  0.120503, 0.134169, 0.147394, 0.161366, 0.16139, 0.175386, 0.190491, 0.205317,
  0.220016, 0.220738, 0.23766, 0.25499, 0.255027, 0.271132, 0.289137, 0.30532,
  0.305359, 0.321871, 0.337916, 0.355948, 0.355978, 0.373839, 0.391673, 0.409629,
  0.409666, 0.424523, 0.441011, 0.457626, 0.457656, 0.473861, 0.47387, 0.489837,
  0.489913, 0.508152, 0.527498, 0.54268, 0.542695, 0.558742, 0.573085, 0.573808,
  0.587847, 0.587895, 0.602132, 0.620267, 0.640699, 0.640734, 0.658302, 0.673841,
  0.691891, 0.691975, 0.708567, 0.724524, 0.724568, 0.740529, 0.740556, 0.756912,
  0.756953, 0.756955, 0.775228, 0.790129, 0.80498, 0.805004, 0.825168, 0.837547,
  0.848841, 0.859531, 0.87033, 0.87837, 0.888869, 0.889267, 0.896854, 0.906622,
  0.915552, 0.915565, 0.926203, 0.926218, 0.933727, 0.939802, 0.939808, 0.949121,
  0.955431, 0.961458, 0.965282, 0.965299, 0.969435, 0.975403, 0.978157, 0.98184,
  0.981859, 0.984574, 0.987552, 0.99092, 0.993958, 0.993976, 0.998142, 1,
] as const;
const captureGalleryScheduledProgress = (picture: number) => {
  const index = clamp(
    picture - 17_374,
    0,
    captureGalleryMotionSchedule.length - 1,
  );
  const cadence = captureGalleryMotionSchedule[Math.round(index)] ?? 0;
  return THREE.MathUtils.lerp(0.02, 4.25, cadence);
};
const captureTypographyOnly =
  deterministicCaptureMode && captureParameters.get('__captureTypographyOnly') === '1';
const captureWordRefractionRaw = captureParameters.get('__captureWordRefraction');
const captureWordRefractionParameter =
  captureWordRefractionRaw === null ? Number.NaN : Number(captureWordRefractionRaw);
const captureWordRefractionOverride =
  deterministicCaptureMode && Number.isFinite(captureWordRefractionParameter)
    ? clamp(captureWordRefractionParameter, 0, 1)
    : null;

type ReferenceCaptureBridge = {
  readonly canvas: HTMLCanvasElement;
  readonly fps: number;
  readonly height: number;
  readonly totalPictures: number;
  readonly width: number;
  readPixels: (target?: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
  renderPicture: (picture: number) => {
    backgroundState: string;
    height: number;
    picture: number;
    width: number;
  };
};

const captureSinkParameter = captureParameters.get('__captureSink');
const captureSessionParameter = captureParameters.get('__captureSession');
const captureRawRgba = captureParameters.get('__captureFormat') === 'rgba';
const captureReleaseAfterFinish = captureParameters.get('__captureReleaseAfter') === '1';

const startNativePngCapture = async (
  bridge: ReferenceCaptureBridge,
  openingElement: HTMLElement,
) => {
  if (!captureSinkParameter || !captureSessionParameter) return;
  const sink = new URL(captureSinkParameter);
  if (sink.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(sink.hostname)) {
    throw new Error('The native capture sink must be a local HTTP endpoint');
  }
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/i.test(captureSessionParameter)) {
    throw new Error('The native capture session name is invalid');
  }

  const request = async (path: string, body?: BodyInit) => {
    const response = await fetch(new URL(path, sink), {
      ...(body ? { body } : {}),
      method: 'POST',
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? `Capture sink rejected ${path}`);
    return result;
  };
  const pngBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      bridge.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas PNG encoding failed'))),
        'image/png',
      );
    });

  const session = encodeURIComponent(captureSessionParameter);
  openingElement.dataset.captureState = 'STARTING';
  openingElement.dataset.captureProgress = `${captureFirstPicture - 1}/${bridge.totalPictures}`;
  await request(
    `/start?session=${session}&expected=${captureRangePictures}&width=${bridge.width}&height=${bridge.height}&fps=${bridge.fps}`,
  );
  openingElement.dataset.captureState = 'EXTRACTING';

  if (captureRawRgba) {
    const rawBytes = bridge.width * bridge.height * 4;
    for (
      let localFirstPicture = 1;
      localFirstPicture <= captureRangePictures;
      localFirstPicture += captureBatchSize
    ) {
      const count = Math.min(
        captureBatchSize,
        captureRangePictures - localFirstPicture + 1,
      );
      const batch = new Uint8Array(new ArrayBuffer(rawBytes * count));
      for (let offset = 0; offset < count; offset += 1) {
        const sourcePicture = captureFirstPicture + localFirstPicture + offset - 1;
        bridge.renderPicture(sourcePicture);
        bridge.readPixels(
          new Uint8Array(batch.buffer, offset * rawBytes, rawBytes),
        );
      }
      await request(
        `/batch?session=${session}&picture=${localFirstPicture}&count=${count}`,
        batch.buffer,
      );
      const sourceLastPicture = captureFirstPicture + localFirstPicture + count - 2;
      openingElement.dataset.captureProgress = `${sourceLastPicture}/${bridge.totalPictures}`;
    }
  } else {
    for (let localPicture = 1; localPicture <= captureRangePictures; localPicture += 1) {
      const sourcePicture = captureFirstPicture + localPicture - 1;
      bridge.renderPicture(sourcePicture);
      await request(`/frame?session=${session}&picture=${localPicture}`, await pngBlob());
      openingElement.dataset.captureProgress = `${sourcePicture}/${bridge.totalPictures}`;
    }
  }

  await request(`/finish?session=${session}`);
  openingElement.dataset.captureState = 'INTEGRITY_VERIFIED';
  if (captureReleaseAfterFinish) {
    setTimeout(() => window.location.replace('about:blank'), 0);
  }
};

type ProjectSource = {
  media: string;
  route: string;
};

type GalleryVisual = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  material: THREE.ShaderMaterial;
  route: string;
  texture: THREE.Texture;
};

const fullScreenVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const wallVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const wallFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uGallery;
  uniform float uProject;

  float hash21(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  float noise21(vec2 value) {
    vec2 index = floor(value);
    vec2 fraction = fract(value);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);
    float a = hash21(index);
    float b = hash21(index + vec2(1.0, 0.0));
    float c = hash21(index + vec2(0.0, 1.0));
    float d = hash21(index + vec2(1.0, 1.0));
    return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
  }

  float fbm(vec2 value) {
    float result = 0.0;
    float amplitude = 0.56;
    for (int index = 0; index < 4; index++) {
      result += noise21(value) * amplitude;
      value = value * 2.03 + vec2(11.7, 9.2);
      amplitude *= 0.48;
    }
    return result;
  }

  float gridLine(vec2 uv, vec2 count, float weight) {
    vec2 coordinate = uv * count;
    vec2 edge = min(fract(coordinate), 1.0 - fract(coordinate));
    vec2 width = fwidth(coordinate) * weight;
    return 1.0 - min(
      smoothstep(0.0, width.x, edge.x),
      smoothstep(0.0, width.y, edge.y)
    );
  }

  vec3 projectColor(float index, float layer) {
    if (index < 0.5) {
      return layer < 0.5 ? vec3(0.025, 0.16, 0.62) : vec3(0.34, 0.25, 0.18);
    }
    if (index < 1.5) {
      return layer < 0.5 ? vec3(0.045, 0.24, 0.58) : vec3(0.16, 0.21, 0.29);
    }
    if (index < 2.5) {
      return layer < 0.5 ? vec3(0.34, 0.20, 0.075) : vec3(0.23, 0.19, 0.13);
    }
    return layer < 0.5 ? vec3(0.015, 0.34, 0.54) : vec3(0.50, 0.22, 0.045);
  }

  vec3 projectAccent(float index) {
    if (index < 0.5) return vec3(0.66, 0.035, 0.025);
    if (index < 1.5) return vec3(0.08, 0.30, 0.75);
    if (index < 2.5) return vec3(0.56, 0.36, 0.11);
    return vec3(0.66, 0.31, 0.055);
  }

  vec2 projectLightCenter(float index, float layer) {
    if (index < 0.5) return layer < 0.5 ? vec2(0.48, 0.35) : vec2(0.34, 0.47);
    if (index < 1.5) return layer < 0.5 ? vec2(0.33, 0.47) : vec2(0.54, 0.20);
    if (index < 2.5) return layer < 0.5 ? vec2(0.50, 0.88) : vec2(0.55, 0.24);
    return layer < 0.5 ? vec2(0.47, 0.25) : vec2(0.49, 0.76);
  }

  float boxMask(vec2 uv, vec2 center, vec2 halfSize) {
    vec2 distance = abs(uv - center) - halfSize;
    return 1.0 - smoothstep(0.0, 0.0035, max(distance.x, distance.y));
  }

  float authoredPanelMask(vec2 uv) {
    float holes = 0.0;
    holes = max(holes, boxMask(uv, vec2(0.09, 0.18), vec2(0.085, 0.075)));
    holes = max(holes, boxMask(uv, vec2(0.31, 0.12), vec2(0.095, 0.105)));
    holes = max(holes, boxMask(uv, vec2(0.52, 0.16), vec2(0.075, 0.070)));
    holes = max(holes, boxMask(uv, vec2(0.72, 0.13), vec2(0.105, 0.085)));
    holes = max(holes, boxMask(uv, vec2(0.91, 0.20), vec2(0.075, 0.120)));
    holes = max(holes, boxMask(uv, vec2(0.18, 0.43), vec2(0.105, 0.075)));
    holes = max(holes, boxMask(uv, vec2(0.43, 0.39), vec2(0.080, 0.095)));
    holes = max(holes, boxMask(uv, vec2(0.67, 0.46), vec2(0.115, 0.075)));
    holes = max(holes, boxMask(uv, vec2(0.86, 0.48), vec2(0.085, 0.115)));
    holes = max(holes, boxMask(uv, vec2(0.08, 0.71), vec2(0.080, 0.105)));
    holes = max(holes, boxMask(uv, vec2(0.30, 0.73), vec2(0.105, 0.085)));
    holes = max(holes, boxMask(uv, vec2(0.57, 0.76), vec2(0.095, 0.115)));
    holes = max(holes, boxMask(uv, vec2(0.80, 0.78), vec2(0.105, 0.080)));
    holes = max(holes, boxMask(uv, vec2(0.96, 0.72), vec2(0.055, 0.115)));
    return 1.0 - holes;
  }

  float cyclicDistance(float phase, float center) {
    return abs(fract(phase - center + 0.5) - 0.5);
  }

  float paletteWeight(float phase, float center) {
    float distanceToCenter = cyclicDistance(phase, center);
    return exp(-distanceToCenter * distanceToCenter * 240.0);
  }

  float violetDropoutMask(vec2 uv, float phase) {
    float holes = 0.0;
    float gateA = smoothstep(0.04, 0.28, phase);
    float gateB = smoothstep(0.18, 0.46, phase);
    float gateC = smoothstep(0.34, 0.64, phase);
    float gateD = smoothstep(0.52, 0.82, phase);
    float gateE = smoothstep(0.68, 0.98, phase);
    holes = max(holes, boxMask(uv, vec2(0.09, 0.18), vec2(0.085, 0.075) * gateA));
    holes = max(holes, boxMask(uv, vec2(0.67, 0.46), vec2(0.115, 0.075) * gateA));
    holes = max(holes, boxMask(uv, vec2(0.31, 0.12), vec2(0.095, 0.105) * gateB));
    holes = max(holes, boxMask(uv, vec2(0.80, 0.78), vec2(0.105, 0.080) * gateB));
    holes = max(holes, boxMask(uv, vec2(0.18, 0.43), vec2(0.105, 0.075) * gateC));
    holes = max(holes, boxMask(uv, vec2(0.91, 0.20), vec2(0.075, 0.120) * gateC));
    holes = max(holes, boxMask(uv, vec2(0.57, 0.76), vec2(0.095, 0.115) * gateD));
    holes = max(holes, boxMask(uv, vec2(0.43, 0.39), vec2(0.080, 0.095) * gateD));
    holes = max(holes, boxMask(uv, vec2(0.86, 0.48), vec2(0.085, 0.115) * gateE));
    holes = max(holes, boxMask(uv, vec2(0.30, 0.73), vec2(0.105, 0.085) * gateE));
    return 1.0 - holes;
  }

  void main() {
    vec2 uv = vUv;
    float time = uTime;
    float gallery = smoothstep(0.0, 0.82, uGallery);
    float fineGrid = gridLine(uv, vec2(64.0, 40.0), 0.88);
    float panelGrid = gridLine(uv, vec2(10.0, 6.0), 0.84);
    float microGrid = gridLine(uv, vec2(192.0, 120.0), 0.42);
    float panels = authoredPanelMask(uv);
    float shimmer = fbm(uv * vec2(7.4, 5.1) + vec2(time * 0.008, -time * 0.005));
    float hardMonochrome = step(0.19, gallery);
    float galleryColor = smoothstep(0.38, 0.66, gallery);
    vec3 projectWash = vec3(0.0);

    // These branches are uniform across every fragment. They skip the invisible color world on
    // the opening chapter and the invisible opening palette once the gallery takes over, while
    // preserving the exact transition math at every visible boundary.
    if (galleryColor > 0.0) {
      float projectBase = floor(clamp(uProject, 0.0, 3.0));
      float projectNext = min(3.0, projectBase + 1.0);
      float projectMix = smoothstep(0.08, 0.72, fract(clamp(uProject, 0.0, 3.0)));
      float transition = sin(projectMix * 3.14159265);
      vec3 colorA = mix(
        projectColor(projectBase, 0.0),
        projectColor(projectNext, 0.0),
        projectMix
      );
      vec3 colorB = mix(
        projectColor(projectBase, 1.0),
        projectColor(projectNext, 1.0),
        projectMix
      );
      vec3 accent = mix(projectAccent(projectBase), projectAccent(projectNext), projectMix);
      vec2 lightCenterA = mix(
        projectLightCenter(projectBase, 0.0),
        projectLightCenter(projectNext, 0.0),
        projectMix
      );
      vec2 lightCenterB = mix(
        projectLightCenter(projectBase, 1.0),
        projectLightCenter(projectNext, 1.0),
        projectMix
      );
      lightCenterA += vec2(
        sin(time * 0.19 + uProject * 1.7) * 0.045,
        cos(time * 0.15 + uProject * 1.1) * 0.035
      );
      lightCenterB += vec2(
        cos(time * 0.13 + uProject * 1.3) * 0.038,
        sin(time * 0.17 + uProject * 1.9) * 0.042
      );
      vec2 lightDeltaA = (uv - lightCenterA) * vec2(1.0, 1.45);
      vec2 lightDeltaB = (uv - lightCenterB) * vec2(1.0, 1.62);
      float localLightA = exp(-dot(lightDeltaA, lightDeltaA) * mix(15.0, 25.0, transition));
      float localLightB = exp(-dot(lightDeltaB, lightDeltaB) * 26.0);
      float annularLight = 1.0 - smoothstep(
        0.0,
        0.035,
        abs(length((uv - lightCenterA) * vec2(1.0, 1.55)) - 0.055)
      );
      float projectField = smoothstep(
        0.28,
        0.86,
        fbm(uv * vec2(4.3, 3.2) + vec2(uProject * 1.71, -uProject * 0.63))
      );
      vec3 ledColor = mix(colorA, colorB, projectField);
      projectWash =
        ledColor * (0.12 + localLightA * 0.58 + shimmer * 0.15) +
        accent * (localLightB * 0.31 + annularLight * 0.24);
    }

    float diagonalBands = (
      1.0 - smoothstep(
        0.095,
        0.17,
        abs(fract((uv.x + uv.y * 0.58) * 4.35) - 0.5)
      )
    ) * (1.0 - smoothstep(0.58, 0.76, uv.x));
    float hugeLoop = 1.0 - smoothstep(
      0.018,
      0.050,
      abs(length((uv - vec2(0.88, 0.51)) * vec2(2.25, 1.35)) - 0.62)
    );
    float slabs = max(
      boxMask(uv, vec2(0.40, 0.35), vec2(0.16, 0.070)),
      boxMask(uv, vec2(0.59, 0.69), vec2(0.13, 0.085))
    );
    vec2 stamp = fract(uv * vec2(13.0, 8.0)) - 0.5;
    float stampSides = 1.0 - smoothstep(
      0.012,
      0.032,
      abs(abs(stamp.x) - (0.075 + (stamp.y + 0.31) * 0.42))
    );
    float stampBar =
      (1.0 - smoothstep(0.010, 0.025, abs(stamp.y + 0.055))) *
      (1.0 - smoothstep(0.10, 0.19, abs(stamp.x)));
    float stampCrop =
      smoothstep(-0.31, -0.25, stamp.y) * (1.0 - smoothstep(0.20, 0.32, stamp.y));
    float stamps = max(stampSides, stampBar) * stampCrop;

    float monochromeState = hardMonochrome * (1.0 - galleryColor);
    vec3 monochromeSurface =
      vec3(0.009, 0.011, 0.014) +
      vec3(0.39) * diagonalBands +
      vec3(0.21) * hugeLoop +
      vec3(0.28) * slabs +
      vec3(0.045) * stamps;
    vec3 openingSurface = vec3(0.0);
    if (hardMonochrome < 0.5) {
      const float openingSequenceDuration = 24.0;
      float sequencePhase = fract(time / openingSequenceDuration);
      vec2 openingLightA = uv - vec2(
      0.20 + sin(time * 0.071) * 0.055,
      0.43 + cos(time * 0.053) * 0.07
    );
    vec2 openingLightB = uv - vec2(
      0.52 + cos(time * 0.047) * 0.06,
      0.48 + sin(time * 0.061) * 0.08
    );
    vec2 openingLightC = uv - vec2(
      0.79 + sin(time * 0.039) * 0.05,
      0.35 + cos(time * 0.043) * 0.08
    );
    float openingGlowA = exp(-dot(openingLightA * vec2(1.0, 1.35), openingLightA * vec2(1.0, 1.35)) * 9.0);
    float openingGlowB = exp(-dot(openingLightB * vec2(1.0, 1.50), openingLightB * vec2(1.0, 1.50)) * 12.0);
    float openingGlowC = exp(-dot(openingLightC * vec2(1.0, 1.42), openingLightC * vec2(1.0, 1.42)) * 14.0);
    vec3 openingColorSurface = vec3(0.004, 0.008, 0.012);
    openingColorSurface += vec3(0.10, 0.038, 0.19) * openingGlowA;
    openingColorSurface += vec3(0.028, 0.080, 0.25) * openingGlowB;
    openingColorSurface += vec3(0.035, 0.20, 0.24) * openingGlowC;
    openingColorSurface += vec3(0.14, 0.30, 0.36) * openingGlowB * openingGlowC * 0.34;
    openingColorSurface += vec3(0.18, 0.035, 0.11) * openingGlowA * openingGlowB * 0.28;
    openingColorSurface *= mix(0.64, 1.0, panels);
    openingColorSurface += vec3(0.05, 0.10, 0.18) * stamps * 0.11;

    vec2 violetLeftCenter = vec2(
      0.20 + sin(time * 0.17) * 0.055,
      0.54 + cos(time * 0.13) * 0.045
    );
    vec2 violetCenterCenter = vec2(
      0.47 + cos(time * 0.11) * 0.065,
      0.60 + sin(time * 0.16) * 0.050
    );
    vec2 violetRightCenter = vec2(
      0.74 + sin(time * 0.14 + 1.7) * 0.050,
      0.25 + cos(time * 0.18 + 0.8) * 0.040
    );
    vec2 violetTealCenter = vec2(
      0.68 + cos(time * 0.15 + 2.2) * 0.060,
      0.43 + sin(time * 0.12 + 1.1) * 0.055
    );
    vec2 violetLeftDelta = (uv - violetLeftCenter) * vec2(1.0, 1.22);
    vec2 violetCenterDelta = (uv - violetCenterCenter) * vec2(0.92, 1.35);
    vec2 violetRightDelta = (uv - violetRightCenter) * vec2(1.08, 1.58);
    vec2 violetTealDelta = (uv - violetTealCenter) * vec2(1.0, 1.48);
    float violetLeft = exp(-dot(violetLeftDelta, violetLeftDelta) * 5.8);
    float violetCenter = exp(-dot(violetCenterDelta, violetCenterDelta) * 7.2);
    float violetRight = exp(-dot(violetRightDelta, violetRightDelta) * 11.5);
    float violetTeal = exp(-dot(violetTealDelta, violetTealDelta) * 13.0);
    float violetColorShift = sin(time * 0.24) * 0.5 + 0.5;
    float tealPulse = sin(time * 0.31 + 1.4) * 0.5 + 0.5;
    vec3 violetBase = vec3(0.003, 0.0035, 0.009);
    violetBase += mix(vec3(0.07, 0.022, 0.31), vec3(0.035, 0.075, 0.42), violetColorShift) * violetLeft;
    violetBase += mix(vec3(0.13, 0.035, 0.51), vec3(0.20, 0.025, 0.38), 1.0 - violetColorShift) * violetCenter;
    violetBase += mix(vec3(0.018, 0.10, 0.14), vec3(0.03, 0.18, 0.22), tealPulse) * violetTeal;
    violetBase += mix(vec3(0.20, 0.040, 0.14), vec3(0.12, 0.035, 0.25), violetColorShift) * violetRight;
    violetBase += vec3(0.18, 0.17, 0.25) * stamps * 0.075;

    float violetPhaseOne = smoothstep(0.27, 0.39, sequencePhase);
    float violetPhaseTwo = smoothstep(0.60, 0.72, sequencePhase);
    float violetMaskOne = violetDropoutMask(uv, violetPhaseOne);
    float violetMaskTwo = violetDropoutMask(uv, violetPhaseTwo);
    vec3 violetOne = violetBase * mix(0.025, 1.0, violetMaskOne);
    vec3 violetTwo = (
      violetBase +
      vec3(0.09, 0.014, 0.075) * violetRight +
      vec3(0.018, 0.07, 0.10) * violetTeal
    ) * mix(0.025, 1.0, violetMaskTwo);
    vec3 violetRefill = (
      violetBase * 1.08 +
      vec3(0.025, 0.010, 0.12) * (violetLeft + violetCenter)
    ) * mix(0.58, 1.0, panels);

    float coolWeight = paletteWeight(sequencePhase, 0.0);
    float monoWeightOne = paletteWeight(sequencePhase, 0.1666667);
    float violetWeightOne = paletteWeight(sequencePhase, 0.3333333);
    float monoWeightTwo = paletteWeight(sequencePhase, 0.5);
    float violetWeightTwo = paletteWeight(sequencePhase, 0.6666667);
    float refillWeight = paletteWeight(sequencePhase, 0.8333333);
    float totalPaletteWeight = max(
      0.0001,
      coolWeight + monoWeightOne + violetWeightOne +
        monoWeightTwo + violetWeightTwo + refillWeight
    );
    openingSurface = (
      openingColorSurface * coolWeight +
      monochromeSurface * (monoWeightOne + monoWeightTwo) +
      violetOne * violetWeightOne +
      violetTwo * violetWeightTwo +
      violetRefill * refillWeight
    ) / totalPaletteWeight;
    }
    vec3 gallerySurface =
      vec3(0.006, 0.009, 0.016) +
      projectWash * panels * (0.77 + shimmer * 0.13) +
      vec3(0.04) * stamps;

    vec3 surface =
      openingSurface * (1.0 - hardMonochrome) +
      monochromeSurface * monochromeState +
      gallerySurface * galleryColor;
    surface *= mix(0.12 + (1.0 - galleryColor) * 0.50, 1.0, panels);
    surface *= mix(0.12 + (1.0 - galleryColor) * 0.50, 1.0, panels);
    surface += vec3(0.004, 0.007, 0.013) * (1.0 - panels);
    surface += vec3(fineGrid) * 0.082;
    surface += vec3(panelGrid) * 0.105;
    surface += vec3(microGrid) * (0.010 + galleryColor * 0.009);

    float micro = step(0.976, hash21(floor(gl_FragCoord.xy * 0.5)));
    surface += micro * (0.006 + shimmer * 0.004);
    gl_FragColor = vec4(surface, 1.0);
  }
`;

const glassVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vObjectPosition;
  varying vec3 vObjectNormal;

  void main() {
    vUv = uv;
    vObjectPosition = position;
    vObjectNormal = normalize(normal);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const glassFragmentShader = `
  precision highp float;

  uniform sampler2D uScene;
  uniform sampler2D uNoise;
  uniform samplerCube uEnvironment;
  uniform vec2 uResolution;
  uniform float uRoughness;
  uniform float uNoiseScale;
  uniform vec3 uMaterialColor;
  uniform vec3 uObjectBoundsMin;
  uniform vec3 uObjectBoundsMax;
  uniform float uSurfaceDetailScale;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vObjectPosition;
  varying vec3 vObjectNormal;

  vec4 triplanarNoise(vec3 coordinate, vec3 weight, vec2 offset) {
    vec4 xProjection = texture2D(uNoise, coordinate.yz + offset);
    vec4 yProjection = texture2D(uNoise, coordinate.xz + offset);
    vec4 zProjection = texture2D(uNoise, coordinate.xy + offset);
    return xProjection * weight.x + yProjection * weight.y + zProjection * weight.z;
  }

  float random(vec2 coordinate) {
    return fract(sin(dot(coordinate, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float distributionGGX(float normalDotHalf, float roughness) {
    float roughnessSquared = roughness * roughness;
    roughnessSquared *= roughnessSquared;
    float normalDotHalfSquared = normalDotHalf * normalDotHalf;
    if (normalDotHalfSquared <= 0.0) return 0.0;
    return roughnessSquared /
      (
        3.14159265 *
        pow(normalDotHalfSquared * (roughnessSquared - 1.0) + 1.0, 2.0)
      );
  }

  float fresnel(float viewDotNormal) {
    const float baseReflectance = 0.1;
    return baseReflectance +
      (1.0 - baseReflectance) * pow(1.0 - viewDotNormal, 5.0);
  }

  void main() {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    vec3 viewNormal = normalize(vViewNormal);
    vec3 viewDirection = normalize(vViewPosition);
    // The protected ANIK mesh has a deliberately much coarser UV atlas than the reference mesh.
    // Generate only the stochastic roughness coordinate in object space so the material stays
    // continuous while screen-space refraction, authored normals and geometry remain untouched.
    vec3 objectExtent = max(uObjectBoundsMax - uObjectBoundsMin, vec3(0.0001));
    vec3 objectCoordinate = (vObjectPosition - uObjectBoundsMin) / objectExtent;
    vec3 triplanarWeight = pow(abs(normalize(vObjectNormal)), vec3(4.0));
    triplanarWeight /= max(0.0001, triplanarWeight.x + triplanarWeight.y + triplanarWeight.z);
    // The protected ANIK mesh has far fewer UV islands than the reference identity. Preserve the
    // reference material equations, but raise only the generated roughness-field frequency so the
    // transmitted word breaks into fine cloudy detail instead of broad painted-looking slabs.
    vec3 scaledObjectCoordinate = objectCoordinate * uNoiseScale * uSurfaceDetailScale;
    vec4 firstNoise = triplanarNoise(scaledObjectCoordinate, triplanarWeight, vec2(0.0));
    vec4 secondNoise = triplanarNoise(
      scaledObjectCoordinate,
      triplanarWeight,
      (firstNoise.xy - 0.5) * 2.0
    );
    float roughness = smoothstep(0.3, 0.8, secondNoise.y) * uRoughness;
    float refractPower = 0.10;
    vec2 refractNormal = viewNormal.xy * (1.0 - viewNormal.z * 0.7);
    vec3 refractedColor = vec3(0.0);

    for (int index = 0; index < 8; index++) {
      float sampleIndex = float(index);
      float slide = 0.005 + random(screenUv + sampleIndex * 0.2) * 0.007;
      vec2 roughnessDirection = vec2(
        random(screenUv + sampleIndex * 0.1) - 0.5,
        random(screenUv + sampleIndex * 0.2) - 0.5
      ) * roughness * 0.30;
      vec2 uvR =
        roughnessDirection + screenUv - refractNormal * (refractPower + slide);
      vec2 uvG =
        roughnessDirection + screenUv - refractNormal * (refractPower + slide * 2.0);
      vec2 uvB =
        roughnessDirection + screenUv - refractNormal * (refractPower + slide * 4.0);
      refractedColor += vec3(
        texture2D(uScene, uvR).r,
        texture2D(uScene, uvG).g,
        texture2D(uScene, uvB).b
      ) * 0.9;
    }
    refractedColor /= 8.0;
    vec3 color = refractedColor;

    vec3 lightDirection = normalize(vec3(-1.0, 0.8, -1.0));
    vec3 halfVector = normalize(viewDirection + lightDirection);
    float specular = distributionGGX(
      dot(viewNormal, halfVector),
      0.003 + roughness * 0.4
    );
    color += vec3(specular);

    float fresnelAmount = fresnel(dot(viewDirection, viewNormal));
    vec3 environmentReflection = textureCube(
      uEnvironment,
      reflect(viewDirection, viewNormal)
    ).rgb;
    color +=
      mix(color, environmentReflection, fresnelAmount * 0.9) *
      (1.0 - fresnelAmount);
    color *= 1.20;
    color *= uMaterialColor / 255.0;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const galleryVertexShader = `
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vec3 curvedPosition = position;
    float curveAngle = curvedPosition.x / 4.0 * 3.14159265 / 2.0 * 0.5;
    curvedPosition.z += cos(curveAngle) * 1.5 - 1.0;
    float curveSlope = -sin(curveAngle) * 1.5 * 3.14159265 / 16.0;
    vec3 curvedNormal = normalize(vec3(-curveSlope, 0.0, 1.0));
    vec4 viewPosition = modelViewMatrix * vec4(curvedPosition, 1.0);
    vViewPosition = -viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * curvedNormal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const galleryFragmentShader = `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uTextureAspect;
  uniform float uOpacity;
  uniform samplerCube uEnvironment;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  vec2 coverUv(vec2 uv, float textureAspect) {
    const float meshAspect = 1.77777778;
    if (textureAspect > meshAspect) {
      uv.x = (uv.x - 0.5) * meshAspect / textureAspect + 0.5;
    } else {
      uv.y = (uv.y - 0.5) * textureAspect / meshAspect + 0.5;
    }
    return uv;
  }

  vec2 lensDistortion(vec2 coordinate, float amount) {
    return coordinate * (1.0 - amount * dot(coordinate, coordinate));
  }

  void main() {
    vec2 uv = coverUv(vUv, uTextureAspect);
    vec3 normal = normalize(vViewNormal);
    float frontDirection = dot(normal, vec3(0.0, 0.0, 1.0));
    vec2 normalOffset = -normal.xy * 0.5 * smoothstep(0.8, 1.0, frontDirection);
    vec3 color = vec3(0.0);
    for (int index = 0; index < 4; index++) {
      float sampleIndex = float(index) / 4.0;
      vec2 centeredUv = (uv - 0.5) * vec2(1.17, 1.3);
      float distortion = 0.1 + sampleIndex * 0.03;
      color += vec3(
        texture2D(uMap, lensDistortion(centeredUv, distortion + 0.10) + 0.5 + normalOffset).r,
        texture2D(uMap, lensDistortion(centeredUv, distortion + 0.12) + 0.5 + normalOffset * 1.01).g,
        texture2D(uMap, lensDistortion(centeredUv, distortion + 0.14) + 0.5 + normalOffset * 1.02).b
      );
    }
    color /= 4.0;
    color *= smoothstep(0.9, 0.49, length(vUv - 0.5));
    vec3 reflectionDirection = reflect(-normalize(vViewPosition), normal);
    vec3 environmentReflection = textureCube(uEnvironment, reflectionDirection).rgb;
    color = mix(color, environmentReflection, 0.05);
    float opacity = uOpacity;
    if (opacity < 0.012) discard;
    gl_FragColor = vec4(color, opacity);
  }
`;

const bloomBrightFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform float uThreshold;

  void main() {
    vec3 color = texture2D(uScene, vUv).rgb;
    vec3 bright = max(color - vec3(uThreshold), vec3(0.0));
    gl_FragColor = vec4(color * bright, 1.0);
  }
`;

const bloomBlurFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uInput;
  uniform vec2 uResolution;
  uniform vec2 uDirection;

  void main() {
    const float weight0 = 0.2129735046;
    const float weight1 = 0.2046226940;
    const float weight2 = 0.1888905537;
    vec2 pixel = uDirection / uResolution;
    vec3 sum = texture2D(uInput, vUv).rgb * weight0;
    sum += texture2D(uInput, vUv + pixel * 2.0).rgb * weight1;
    sum += texture2D(uInput, vUv - pixel * 2.0).rgb * weight1;
    sum += texture2D(uInput, vUv + pixel * 4.0).rgb * weight2;
    sum += texture2D(uInput, vUv - pixel * 4.0).rgb * weight2;
    gl_FragColor = vec4(sum, 1.0);
  }
`;

const sceneMixerFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uFluid;

  void main() {
    vec2 velocity = vec2(0.0);
    float wake = 0.0;
    #if POINTER_FX == 1
    velocity = texture2D(uFluid, vUv).xy;
    wake = length(velocity);
    #endif

    // The production reference distorts and energizes the fully composed main scene before
    // thresholding it for bloom. Keeping this as its own pass is important: blooming the raw
    // scene and adding the motion response later made the panel both dimmer and less cohesive.
    vec2 sceneUv = vUv + velocity * 0.010;
    vec3 color = texture2D(uScene, sceneUv).rgb;
    color *= smoothstep(1.2, 0.0, length(vUv - 0.5));
    color *= 1.0 + wake * 0.80;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const compositeFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uFluid;
  uniform sampler2D uBloomTexture0;
  uniform sampler2D uBloomTexture1;
  uniform sampler2D uBloomTexture2;

  void main() {
    vec2 velocity = vec2(0.0);
    #if POINTER_FX == 1
    velocity = texture2D(uFluid, vUv).xy;
    #endif
    vec2 warpedUv = vUv - velocity * 0.001;
    vec3 color = texture2D(uScene, warpedUv).rgb;

    vec3 bloomQuarter = texture2D(uBloomTexture0, warpedUv).rgb;
    vec3 bloomEighth = texture2D(uBloomTexture1, warpedUv).rgb;
    vec3 bloomSixteenth = texture2D(uBloomTexture2, warpedUv).rgb;
    color +=
      bloomQuarter * 0.075 + bloomEighth * 0.15 + bloomSixteenth * 0.225;
    color *= 1.30;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createCurvedWallGeometry() {
  const horizontalSegments = 64;
  const verticalSegments = 40;
  const radius = 9;
  const span = 2.18;
  const height = 10.6;
  const vertexCount = (horizontalSegments + 1) * (verticalSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(horizontalSegments * verticalSegments * 6);
  let positionOffset = 0;
  let uvOffset = 0;
  let indexOffset = 0;

  for (let row = 0; row <= verticalSegments; row += 1) {
    const v = row / verticalSegments;
    for (let column = 0; column <= horizontalSegments; column += 1) {
      const u = column / horizontalSegments;
      const angle = (u - 0.5) * span;
      positions[positionOffset] = Math.sin(angle) * radius;
      positions[positionOffset + 1] = (0.5 - v) * height;
      positions[positionOffset + 2] = -4.2 + (1 - Math.cos(angle)) * radius;
      positionOffset += 3;
      uvs[uvOffset] = u;
      uvs[uvOffset + 1] = 1 - v;
      uvOffset += 2;
    }
  }

  for (let row = 0; row < verticalSegments; row += 1) {
    for (let column = 0; column < horizontalSegments; column += 1) {
      const first = row * (horizontalSegments + 1) + column;
      const second = first + horizontalSegments + 1;
      indices[indexOffset] = first;
      indices[indexOffset + 1] = second;
      indices[indexOffset + 2] = first + 1;
      indices[indexOffset + 3] = second;
      indices[indexOffset + 4] = second + 1;
      indices[indexOffset + 5] = first + 1;
      indexOffset += 6;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

function createWordTexture(textureWidth = 4096, withGlow = false) {
  const wordCanvas = document.createElement('canvas');
  wordCanvas.width = textureWidth;
  wordCanvas.height = Math.round(textureWidth / 4);
  const context = wordCanvas.getContext('2d');
  if (!context) throw new Error('Unable to create environmental word texture');
  context.clearRect(0, 0, wordCanvas.width, wordCanvas.height);
  context.fillStyle = '#ffffff';
  if (withGlow) {
    context.shadowColor = 'rgba(255, 255, 255, 0.92)';
    context.shadowBlur = Math.round(textureWidth * 0.012);
  }

  // A single vector wordmark drives both the WebGL texture and the navigation.
  // Every adjacent pair uses the same 28-unit visible-edge gap.
  const sourceWidth = 787.842;
  const sourceHeight = 209;
  const scale = Math.min(
    (wordCanvas.width * 0.92) / sourceWidth,
    (wordCanvas.height * 0.9) / sourceHeight,
  );
  const targetWidth = sourceWidth * scale;
  const targetHeight = sourceHeight * scale;
  context.save();
  context.translate((wordCanvas.width - targetWidth) / 2, (wordCanvas.height - targetHeight) / 2);
  context.scale(scale, scale);

  const referenceA = new Path2D(
    'M0 207.884h43.617l4.407-7.607h141.084l4.408 7.607h43.617L118.541 2.282 0 207.884Zm64.691-36.464 53.901-93.47 53.9 93.47H64.691Z',
  );
  context.fill(referenceA, 'evenodd');
  const glyphScale = 0.299423;
  const glyphBaseline = 207.884;
  const glyphs = [
    {
      x: 238.794,
      path: 'M87.965 0V686.661h138.389l340.486-373.925q9.687-8.913 23.243-24.426t27.626-31.443q14.069-15.93 23.269-27.852l6.852.035q-.591 18.834-1.452 42.977t-.861 41.413v373.221H786.68V0H650.465L308.996 377.438q-19.4 20.304-41.169 45.913t-34.186 39.79l-6.252-.034q.591-13.131 1.165-37.943t.574-55.108V0H87.965Z',
    },
    { x: 476.005, path: 'M87.965 0v686.661h147.258V0H87.965Z' },
    {
      x: 548.098,
      path: 'M87.965 0v686.661h147.258V340.174l372.025 346.487h187.788L493.368 403.904 800.688 0H617.466L387.978 309.854 235.223 182.985V0H87.965Z',
    },
  ] as const;
  glyphs.forEach((glyph) => {
    context.save();
    context.translate(glyph.x, glyphBaseline);
    context.scale(glyphScale, -glyphScale);
    context.fill(new Path2D(glyph.path));
    context.restore();
  });
  context.restore();
  const texture = new THREE.CanvasTexture(wordCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function loadStudioEnvironmentTexture() {
  const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(
    (face) => `/media/identity/environment/${face}.png`,
  );
  return new Promise<THREE.CubeTexture>((resolve, reject) => {
    new THREE.CubeTextureLoader().load(
      faces,
      (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function loadTexture(loader: THREE.TextureLoader, source: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      source,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        // The authored project exports are deliberately 16:9, but their 1600x900 and
        // 960x540 dimensions are not powers of two. Asking WebGL to allocate/generate
        // mipmaps for those images produces GL_INVALID_VALUE/GL_INVALID_OPERATION on
        // mobile GPUs and can leave the gallery surface black. Keep the same linear
        // sampling quality while selecting the mipmapped path only when it is valid.
        const image = texture.image as { width?: number; height?: number } | undefined;
        const isPowerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0;
        const width = image?.width ?? 0;
        const height = image?.height ?? 0;
        const canGenerateMipmaps = isPowerOfTwo(width) && isPowerOfTwo(height);
        texture.minFilter = canGenerateMipmaps
          ? THREE.LinearMipmapLinearFilter
          : THREE.LinearFilter;
        texture.generateMipmaps = canGenerateMipmaps;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

type GlbAccessor = {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  normalized?: boolean;
  type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4';
};

type GlbDocument = {
  accessors: GlbAccessor[];
  bufferViews: Array<{ byteLength: number; byteOffset?: number; byteStride?: number }>;
  meshes: Array<{
    primitives: Array<{
      attributes: { POSITION: number; NORMAL: number; TEXCOORD_0: number };
      indices: number;
    }>;
  }>;
};

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BINARY_CHUNK = 0x004e4942;
const GLB_COMPONENT_BYTES: Record<number, number> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};
const GLB_ITEM_SIZES: Record<GlbAccessor['type'], number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};

function createGlbAttribute(
  document: GlbDocument,
  source: ArrayBuffer,
  binaryOffset: number,
  accessorIndex: number,
) {
  const accessor = document.accessors[accessorIndex];
  if (!accessor) throw new Error(`Missing GLB accessor ${accessorIndex}`);
  const bufferView = document.bufferViews[accessor.bufferView];
  if (!bufferView) throw new Error(`Missing GLB buffer view ${accessor.bufferView}`);
  const itemSize = GLB_ITEM_SIZES[accessor.type];
  const componentBytes = GLB_COMPONENT_BYTES[accessor.componentType];
  if (!itemSize || !componentBytes) {
    throw new Error(`Unsupported GLB accessor ${accessor.type}/${accessor.componentType}`);
  }
  if (bufferView.byteStride && bufferView.byteStride !== componentBytes * itemSize) {
    throw new Error('Interleaved GLB identity buffers are not supported');
  }

  const byteOffset = binaryOffset + (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const length = accessor.count * itemSize;
  let array: THREE.TypedArray;
  switch (accessor.componentType) {
    case 5120:
      array = new Int8Array(source, byteOffset, length);
      break;
    case 5121:
      array = new Uint8Array(source, byteOffset, length);
      break;
    case 5122:
      array = new Int16Array(source, byteOffset, length);
      break;
    case 5123:
      array = new Uint16Array(source, byteOffset, length);
      break;
    case 5125:
      array = new Uint32Array(source, byteOffset, length);
      break;
    case 5126:
      array = new Float32Array(source, byteOffset, length);
      break;
    default:
      throw new Error(`Unsupported GLB component type ${accessor.componentType}`);
  }
  return new THREE.BufferAttribute(array, itemSize, Boolean(accessor.normalized));
}

async function loadIdentity(material: THREE.ShaderMaterial) {
  const identityUrl = '/media/identity/reference-a-desktop.glb?v=20260731-restored-broad-02';
  const response = await fetch(identityUrl);
  if (!response.ok) throw new Error(`Unable to load identity GLB (${response.status})`);
  const source = await response.arrayBuffer();
  const header = new DataView(source);
  if (
    source.byteLength < 20 ||
    header.getUint32(0, true) !== GLB_MAGIC ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) > source.byteLength
  ) {
    throw new Error('Invalid identity GLB header');
  }

  let document: GlbDocument | null = null;
  let binaryOffset = -1;
  let cursor = 12;
  const declaredLength = header.getUint32(8, true);
  while (cursor + 8 <= declaredLength) {
    const chunkLength = header.getUint32(cursor, true);
    const chunkType = header.getUint32(cursor + 4, true);
    const chunkOffset = cursor + 8;
    const chunkEnd = chunkOffset + chunkLength;
    if (chunkEnd > declaredLength) throw new Error('Invalid identity GLB chunk');
    if (chunkType === GLB_JSON_CHUNK) {
      const json = new TextDecoder().decode(new Uint8Array(source, chunkOffset, chunkLength));
      document = JSON.parse(json.replace(/\0+$/, '')) as GlbDocument;
    } else if (chunkType === GLB_BINARY_CHUNK) {
      binaryOffset = chunkOffset;
    }
    cursor = chunkEnd;
  }
  const primitive = document?.meshes?.[0]?.primitives?.[0];
  if (!document || !primitive || binaryOffset < 0) {
    throw new Error('Identity GLB is missing its locked mesh buffers');
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    createGlbAttribute(document, source, binaryOffset, primitive.attributes.POSITION),
  );
  geometry.setAttribute(
    'normal',
    createGlbAttribute(document, source, binaryOffset, primitive.attributes.NORMAL),
  );
  geometry.setAttribute(
    'uv',
    createGlbAttribute(document, source, binaryOffset, primitive.attributes.TEXCOORD_0),
  );
  geometry.setIndex(createGlbAttribute(document, source, binaryOffset, primitive.indices));
  geometry.computeBoundingBox();
  if (geometry.boundingBox) {
    const boundsMinimum = material.uniforms.uObjectBoundsMin?.value;
    const boundsMaximum = material.uniforms.uObjectBoundsMax?.value;
    if (boundsMinimum instanceof THREE.Vector3) boundsMinimum.copy(geometry.boundingBox.min);
    if (boundsMaximum instanceof THREE.Vector3) boundsMaximum.copy(geometry.boundingBox.max);
  }
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geometry, material));
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.position.y -= 0.18;
  // The live reference's 0.3764301-unit logo mesh is displayed through a 3x mesh scale and a
  // 4.3x parent scale: 0.3764301 * 3 * 4.3 = 4.856. Normalize the protected ANIK geometry to that
  // same rendered height without altering its vertices or replacing the authored asset.
  root.scale.setScalar(4.856 / Math.max(size.y, 0.001));
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = material;
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
      child.renderOrder = 20;
      child.updateMatrix();
      child.matrixAutoUpdate = false;
    }
  });
  // Preserve the authored three-quarter pitch/yaw and counter the camera's projection
  // slope with a slight positive roll. This makes the neutral left/right baseline level
  // before pointer interaction is applied.
  root.rotation.set(0.025, -0.085, 0.022);
  return root;
}

async function startReferenceWorld(
  worldElement: HTMLElement,
  openingElement: HTMLElement,
  outputCanvas: HTMLCanvasElement,
) {
  // The reference renders the main scene at the physical device-pixel ratio. Its background
  // procedural textures use their own lower, fixed ratios, so the A, grid and typography never
  // inherit a device-class quality ceiling.
  const wordTextureWidth = 4096;
  const renderer = new THREE.WebGLRenderer({
    canvas: outputCanvas,
    // Keep the canvas transparent only until the first complete frame is ready so the authored
    // chamber fallback remains visible instead of WebGL's default black drawing buffer.
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x020109, 0);

  const baseScene = new THREE.Scene();
  baseScene.background = new THREE.Color(0x020109);
  const refractionTypographyScene = new THREE.Scene();
  const identityScene = new THREE.Scene();
  const galleryScene = new THREE.Scene();
  baseScene.matrixAutoUpdate = false;
  refractionTypographyScene.matrixAutoUpdate = false;
  identityScene.matrixAutoUpdate = false;
  galleryScene.matrixAutoUpdate = false;
  const camera = new THREE.PerspectiveCamera(41, 1, 0.1, 50);
  camera.position.set(0, 0, 9.5);
  camera.lookAt(0, 0, -0.2);
  camera.updateMatrix();
  camera.matrixAutoUpdate = false;

  const wallUniforms = {
    uTime: { value: 0 },
    uGallery: { value: 0 },
    uProject: { value: 0 },
  };
  const wallMaterial = new THREE.ShaderMaterial({
    uniforms: wallUniforms,
    vertexShader: wallVertexShader,
    fragmentShader: wallFragmentShader,
    side: THREE.DoubleSide,
  });
  const wall = new THREE.Mesh(createCurvedWallGeometry(), wallMaterial);
  wall.frustumCulled = false;
  wall.matrixAutoUpdate = false;
  wall.visible = false;
  baseScene.add(wall);

  const openingBackground = createReferenceBackgroundSystem(renderer, captureNoiseTimeOffset);
  baseScene.add(openingBackground.group);

  // Keep ANIK as the large environmental word behind the refractive identity. The wall shader
  // still supplies its smaller picture-indexed motifs, while this plane preserves the authored
  // hero typography the user expects in the opening composition.
  const heroWordBaseOpacity = 1;
  const heroWordPromise = Promise.resolve().then(() => {
    const heroWordTexture = createWordTexture(wordTextureWidth);
    const heroWordMaterial = new THREE.MeshBasicMaterial({
      map: heroWordTexture,
      // The reference emits one 1.5x word texture and lets the shared bloom pyramid create its
      // halo. A second additive plane overexposed the object whenever that word was refracted.
      color: new THREE.Color(1.5, 1.5, 1.5),
      transparent: true,
      alphaTest: 0.012,
      // ANIK belongs to the opening/home composition. updateProjectScene keeps it fully present
      // at the top and removes it before the project rail owns the stage.
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const heroWordGeometry = new THREE.PlaneGeometry(9.8, 2.45);
    heroWordGeometry.deleteAttribute('normal');
    const heroWord = new THREE.Mesh(heroWordGeometry, heroWordMaterial);
    heroWord.position.set(-0.18, -0.17, -2.1);
    heroWord.frustumCulled = false;
    heroWord.updateMatrix();
    heroWord.matrixAutoUpdate = false;
    heroWord.renderOrder = -10;

    // The crisp visible word stays in the final identity pass so it can bloom at full intensity.
    identityScene.add(heroWord);

    // Feed a separate SDR copy into the screen-space refraction target. The object therefore bends
    // and reveals ANIK like the reference, while the broad HDR glyphs never enter the intermediate
    // target that previously amplified pointer wake into rectangular white flash blocks.
    const refractionWordMaterial = new THREE.MeshBasicMaterial({
      map: heroWordTexture,
      color: new THREE.Color(1, 1, 1),
      transparent: true,
      alphaTest: 0.012,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const refractionWord = new THREE.Mesh(heroWordGeometry, refractionWordMaterial);
    refractionWord.position.copy(heroWord.position);
    refractionWord.frustumCulled = false;
    refractionWord.updateMatrix();
    refractionWord.matrixAutoUpdate = false;
    refractionTypographyScene.add(refractionWord);
    return {
      heroWord,
      heroWordMaterial,
      refractionWord,
      refractionWordMaterial,
    };
  });

  const sceneDepthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedShortType);
  const backgroundDepthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedShortType);

  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    depthTexture: sceneDepthTexture,
  });
  const backgroundTarget = new THREE.WebGLRenderTarget(1, 1, {
    // The reference TransparentBufferRenderer copies the already-rendered main scene into the
    // default 8-bit WebGLRenderTarget before the logo shader samples it. Keeping this target in
    // half-float preserves over-range energy that the reference clamps here, which makes the
    // refracted typography pool into broad opaque-looking patches instead of crisp glass detail.
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    depthTexture: backgroundDepthTexture,
  });
  // Refraction deliberately samples beyond the screen edges. The live material wraps those
  // samples back into the chamber; clamping them produces the solid rectangular edge slabs that
  // appeared during pointer motion.
  backgroundTarget.texture.wrapS = THREE.RepeatWrapping;
  backgroundTarget.texture.wrapT = THREE.RepeatWrapping;
  const studioEnvironmentTexturePromise = loadStudioEnvironmentTexture();
  const glassUniforms = {
    uScene: { value: backgroundTarget.texture },
    uNoise: { value: openingBackground.noiseTexture },
    uEnvironment: { value: null as THREE.CubeTexture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uRoughness: { value: 0.1 },
    uNoiseScale: { value: 9 },
    uMaterialColor: { value: new THREE.Vector3(255, 255, 255) },
    uObjectBoundsMin: { value: new THREE.Vector3(-1, -1, -1) },
    uObjectBoundsMax: { value: new THREE.Vector3(1, 1, 1) },
    uSurfaceDetailScale: { value: 3.25 },
  };
  const glassMaterial = new THREE.ShaderMaterial({
    uniforms: glassUniforms,
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    transparent: true,
  });
  const identityPromise = loadIdentity(glassMaterial);

  const projectSources = Array.from(document.querySelectorAll<HTMLElement>('[data-curve-card]'))
    .map((card) => {
      const desktopMedia = card.dataset.projectMedia ?? '';
      return {
        media: desktopMedia,
        route: card.dataset.projectRoute ?? '',
      };
    })
    .filter((project): project is ProjectSource => Boolean(project.media));
  const galleryGroup = new THREE.Group();
  galleryGroup.position.set(0, 0, 0);
  galleryGroup.matrixAutoUpdate = false;
  galleryScene.add(galleryGroup);
  const galleryGeometry = new THREE.PlaneGeometry(8, 4.5, 32, 8);
  galleryGeometry.deleteAttribute('normal');
  const projectTextureLoader = new THREE.TextureLoader();
  const projectAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  const galleryVisuals: GalleryVisual[] = [];
  const galleryVisualsPromise = Promise.allSettled(
    projectSources.map(async (project) => {
      const [texture, projectEnvironmentTexture] = await Promise.all([
        loadTexture(projectTextureLoader, project.media),
        studioEnvironmentTexturePromise,
      ]);
      texture.anisotropy = projectAnisotropy;
      texture.needsUpdate = true;
      const textureImage = texture.image as { width?: number; height?: number };
      const textureAspect =
        Math.max(1, textureImage.width ?? 16) / Math.max(1, textureImage.height ?? 9);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uTextureAspect: { value: textureAspect },
          uOpacity: { value: 0 },
          uEnvironment: { value: projectEnvironmentTexture },
        },
        vertexShader: galleryVertexShader,
        fragmentShader: galleryFragmentShader,
        transparent: true,
        // Project planes are the foreground rail. The identity remains visible around them, but
        // must not punch through a selected card merely because its mesh is closer to the camera.
        depthTest: false,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(galleryGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 30;
      return { mesh, material, route: project.route, texture };
    }),
  ).then((results) => {
    const visuals: GalleryVisual[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        visuals.push(result.value);
        return;
      }
      console.error(`Project texture failed to load: ${projectSources[index]?.media ?? 'unknown'}`, result.reason);
    });
    return visuals;
  });
  const [
    {
      heroWord,
      heroWordMaterial,
      refractionWord,
      refractionWordMaterial,
    },
    identity,
    studioEnvironmentTexture,
  ] = await Promise.all([
    heroWordPromise,
    identityPromise,
    studioEnvironmentTexturePromise,
  ]);
  glassUniforms.uEnvironment.value = studioEnvironmentTexture;
  const identityBaseScale = identity.scale.x;
  const identityBaseQuaternion = identity.quaternion.clone();
  // Keep the GLB bounds-centering offset established by loadIdentity. Resetting the root to the
  // world origin discarded that authored correction and held the ANIK mark visibly too high.
  identity.updateMatrix();
  identity.matrixAutoUpdate = false;
  identityScene.add(identity);
  const galleryMeshes: THREE.Object3D[] = [];
  const galleryVisualByMesh = new Map<THREE.Object3D, GalleryVisual>();

  const postScene = new THREE.Scene();
  postScene.matrixAutoUpdate = false;
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postCamera.matrixAutoUpdate = false;
  const postGeometry = new THREE.PlaneGeometry(2, 2);
  postGeometry.deleteAttribute('normal');
  // Match the reference TransparentBufferRenderer: copy the already-rendered half-float chamber
  // through a full-screen shader into an ordinary 8-bit target. WebGL copyTextureToTexture is a
  // storage copy and cannot reliably convert the source/destination render-target formats; on the
  // current renderer that left the transmission buffer black.
  const backgroundCopyMaterial = new THREE.ShaderMaterial({
    uniforms: { uSource: { value: sceneTarget.texture } },
    vertexShader: fullScreenVertexShader,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uSource;

      void main() {
        gl_FragColor = texture2D(uSource, vUv);
      }
    `,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const backgroundCopyScene = new THREE.Scene();
  backgroundCopyScene.matrixAutoUpdate = false;
  const backgroundCopyQuad = new THREE.Mesh(postGeometry, backgroundCopyMaterial);
  backgroundCopyQuad.frustumCulled = false;
  backgroundCopyQuad.matrixAutoUpdate = false;
  backgroundCopyScene.add(backgroundCopyQuad);
  const fluid = pointerEffectsEnabled
    ? new (await import('./reference-fluid')).ReferenceFluid(renderer)
    : null;
  const zeroVelocityTexture = new THREE.DataTexture(
    new Uint8Array([0, 0, 0, 255]),
    1,
    1,
    THREE.RGBAFormat,
  );
  zeroVelocityTexture.minFilter = THREE.NearestFilter;
  zeroVelocityTexture.magFilter = THREE.NearestFilter;
  zeroVelocityTexture.needsUpdate = true;
  const mixedSceneTargetOptions: THREE.RenderTargetOptions = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  };
  const bloomTargetOptions: THREE.RenderTargetOptions = {
    // The live reference thresholds its half-float scene into ordinary 8-bit bloom targets.
    // Preserving over-range values here over-energizes the blur and creates white flash blocks.
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  };
  const bloomScales = [4, 8, 16] as const;
  // Keep the scene mixer in half-float; only the thresholded bloom pyramid is clamped to 8-bit.
  const mixedSceneTarget = new THREE.WebGLRenderTarget(1, 1, mixedSceneTargetOptions);
  const bloomBrightTarget = new THREE.WebGLRenderTarget(1, 1, bloomTargetOptions);
  const bloomVerticalTargets = bloomScales.map(
    () => new THREE.WebGLRenderTarget(1, 1, bloomTargetOptions),
  );
  const bloomHorizontalTargets = bloomScales.map(
    () => new THREE.WebGLRenderTarget(1, 1, bloomTargetOptions),
  );
  const bloomScene = new THREE.Scene();
  bloomScene.matrixAutoUpdate = false;
  const bloomBrightUniforms = {
    uScene: { value: mixedSceneTarget.texture },
    uThreshold: { value: 0.90 },
  };
  const bloomBrightMaterial = new THREE.ShaderMaterial({
    uniforms: bloomBrightUniforms,
    vertexShader: fullScreenVertexShader,
    fragmentShader: bloomBrightFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const bloomBlurUniforms = {
    uInput: { value: bloomBrightTarget.texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDirection: { value: new THREE.Vector2(0, 1) },
  };
  const bloomBlurMaterial = new THREE.ShaderMaterial({
    uniforms: bloomBlurUniforms,
    vertexShader: fullScreenVertexShader,
    fragmentShader: bloomBlurFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const bloomQuad = new THREE.Mesh(postGeometry, bloomBrightMaterial);
  bloomQuad.frustumCulled = false;
  bloomQuad.matrixAutoUpdate = false;
  bloomScene.add(bloomQuad);
  const sceneMixerUniforms = {
    uScene: { value: sceneTarget.texture },
    uFluid: { value: fluid?.texture ?? zeroVelocityTexture },
  };
  const sceneMixerMaterial = new THREE.ShaderMaterial({
    defines: { POINTER_FX: pointerEffectsEnabled ? 1 : 0 },
    uniforms: sceneMixerUniforms,
    vertexShader: fullScreenVertexShader,
    fragmentShader: sceneMixerFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const sceneMixerScene = new THREE.Scene();
  sceneMixerScene.matrixAutoUpdate = false;
  const sceneMixerQuad = new THREE.Mesh(postGeometry, sceneMixerMaterial);
  sceneMixerQuad.frustumCulled = false;
  sceneMixerQuad.matrixAutoUpdate = false;
  sceneMixerScene.add(sceneMixerQuad);
  const compositeUniforms = {
    uScene: { value: mixedSceneTarget.texture },
    uFluid: { value: fluid?.texture ?? zeroVelocityTexture },
    uBloomTexture0: { value: bloomHorizontalTargets[0]!.texture },
    uBloomTexture1: { value: bloomHorizontalTargets[1]!.texture },
    uBloomTexture2: { value: bloomHorizontalTargets[2]!.texture },
  };
  const compositeMaterial = new THREE.ShaderMaterial({
    defines: { POINTER_FX: pointerEffectsEnabled ? 1 : 0 },
    uniforms: compositeUniforms,
    vertexShader: fullScreenVertexShader,
    fragmentShader: compositeFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const postQuad = new THREE.Mesh(postGeometry, compositeMaterial);
  postQuad.frustumCulled = false;
  postQuad.matrixAutoUpdate = false;
  postScene.add(postQuad);

  const identityQuaternion = new THREE.Quaternion();
  const interactionQuaternion = new THREE.Quaternion();
  const composedIdentityQuaternion = new THREE.Quaternion();
  const deltaQuaternion = new THREE.Quaternion();
  const hoverEuler = new THREE.Euler();
  const scrollAxis = new THREE.Vector3(0, 1, 0);
  const pointer = new THREE.Vector2();
  const previousPointer = new THREE.Vector2();
  const pointerNdc = new THREE.Vector2();
  const filteredPointerNdc = new THREE.Vector2();
  const pointerVelocityNdc = new THREE.Vector2();
  const cameraPointerOffset = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const appliedIdentityQuaternion = interactionQuaternion.clone();
  let appliedIdentityScale = identity.scale.x;
  let pointerInitialized = false;
  let lastPointerTime = performance.now();
  let hoveredGalleryVisual: GalleryVisual | null = null;
  let pointerEnergy = 0;
  let gizmoDragging = false;
  const gizmoQuaternionStart = new THREE.Quaternion();
  const gizmoDragStart = new THREE.Vector3();
  const gizmoDragCurrent = new THREE.Vector3();
  const gizmoDragDelta = new THREE.Quaternion();
  const gizmoProjectedAxis = new THREE.Vector3();
  const gizmoAxes = ([
    ['x', new THREE.Vector3(1, 0, 0)],
    ['y', new THREE.Vector3(0, 1, 0)],
    ['z', new THREE.Vector3(0, 0, 1)],
  ] as const).map(([name, vector]) => {
    const group = rotationGizmo?.querySelector<SVGGElement>(`[data-reference-axis="${name}"]`);
    return {
      vector,
      group,
      line: group?.querySelector<SVGLineElement>('line') ?? null,
      point: group?.querySelector<SVGCircleElement>('circle') ?? null,
      label: group?.querySelector<SVGTextElement>('text') ?? null,
    };
  });
  const updateQuaternionController = (quaternion: THREE.Quaternion) => {
    gizmoAxes.forEach(({ vector, group, line, point, label }) => {
      if (!group || !line || !point || !label) return;
      gizmoProjectedAxis.copy(vector).applyQuaternion(quaternion);
      const x = 36 + gizmoProjectedAxis.x * 25;
      const y = 36 - gizmoProjectedAxis.y * 25;
      const labelDistance = 4.5;
      const labelX = x + gizmoProjectedAxis.x * labelDistance;
      const labelY = y - gizmoProjectedAxis.y * labelDistance;
      line.setAttribute('x2', x.toFixed(2));
      line.setAttribute('y2', y.toFixed(2));
      point.setAttribute('cx', x.toFixed(2));
      point.setAttribute('cy', y.toFixed(2));
      label.setAttribute('x', labelX.toFixed(2));
      label.setAttribute('y', labelY.toFixed(2));
      group.style.opacity = (0.58 + (gizmoProjectedAxis.z + 1) * 0.2).toFixed(3);
    });
  };
  const projectPointerToGizmoSphere = (event: PointerEvent, target: THREE.Vector3) => {
    const bounds = rotationGizmo?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return target.set(0, 0, 1);
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
    const radiusSquared = x * x + y * y;
    if (radiusSquared <= 1) return target.set(x, y, Math.sqrt(1 - radiusSquared));
    const inverseLength = 1 / Math.sqrt(radiusSquared);
    return target.set(x * inverseLength, y * inverseLength, 0);
  };
  updateQuaternionController(interactionQuaternion);
  let revealStart = performance.now();
  let animationFrame = 0;
  let lastFrame = performance.now();
  const backgroundTimeParam = captureParameters.get('__backgroundTime');
  const parsedBackgroundTime = backgroundTimeParam === null ? Number.NaN : Number(backgroundTimeParam);
  const backgroundTimeOverride = Number.isFinite(parsedBackgroundTime) && parsedBackgroundTime >= 0
    ? parsedBackgroundTime
    : null;
  let currentGalleryProgress = 0;
  let renderedGalleryProgress = 0;
  let currentGalleryPresence = 0;
  let renderedGalleryPresence = 0;
  let captureSourcePicture = 1;
  let galleryHasVisibleVisual = false;
  let galleryLayoutActive = false;
  let responsiveIdentityScale = identityBaseScale;
  let responsiveWordScale = 1;
  let worldInView = true;
  let surfaceUpdateFrame = 0;
  let controllerUpdateElapsed = 0;
  let renderReady = false;
  let disposed = false;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let renderPixelRatio = 0;
  let resizeFrame = 0;
  let compactGallery = innerWidth <= 820;
  let worksRotationWeight = 0;
  let worksRotationFrom = 0;
  let worksRotationGoal = 0;
  let worksRotationElapsed = 1;
  let smoothedLogoScrollVelocity = 0;
  let captureBridge: ReferenceCaptureBridge | null = null;
  let nativeCaptureStarted = false;

  const galleryVisualAt = (clientX: number, clientY: number) => {
    if (renderedGalleryPresence < 0.72) return null;
    pointerNdc.set(
      (clientX / Math.max(1, canvasWidth)) * 2 - 1,
      -((clientY / Math.max(1, canvasHeight)) * 2 - 1),
    );
    galleryGroup.updateWorldMatrix(true, true);
    raycaster.setFromCamera(pointerNdc, camera);
    const intersections = raycaster.intersectObjects(galleryMeshes, false);
    for (const intersection of intersections) {
      const visual = galleryVisualByMesh.get(intersection.object);
      if (visual?.mesh.visible && Number(visual.material.uniforms.uOpacity?.value ?? 0) > 0.18) {
        return visual;
      }
    }
    return null;
  };

  const setCurveCursor = (cursor: '' | 'pointer') => {
    if (curveSection && curveSection.style.cursor !== cursor) curveSection.style.cursor = cursor;
  };

  const updateProjectScene = (_deltaSeconds: number) => {
    if (!curveSection) return;
    // home-state owns the reference's two-stage rail lerp so the DOM metadata, background,
    // and WebGL planes all consume one continuous project position instead of drifting apart.
    if (captureGallerySweep) {
      currentGalleryProgress = captureGalleryScheduledProgress(captureSourcePicture);
    } else {
      currentGalleryProgress =
        captureGalleryProgressOverride ?? referenceMotionState.curveProgress;
    }
    renderedGalleryProgress = currentGalleryProgress;
    const galleryEntrance = Math.min(1, renderedGalleryProgress * 2);
    const galleryExit = Math.min(
      1,
      (galleryVisuals.length + 1 - renderedGalleryProgress) * 2,
    );
    currentGalleryPresence = clamp(Math.min(galleryEntrance, galleryExit));
    renderedGalleryPresence = currentGalleryPresence;
    wallUniforms.uGallery.value = renderedGalleryPresence;
    // Keep the chamber attached to the same continuously eased project position as the card rail.
    // A separately rounded, faster palette state made the wall jump projects before the selected
    // plane had settled, which read as an unrelated flash during scroll and touch transitions.
    const projectTextureProgress = Math.max(0, renderedGalleryProgress - 1);
    wallUniforms.uProject.value = projectTextureProgress;
    const galleryProgress = renderedGalleryProgress;
    // The large ANIK word is an opening-only layer. Remove it early in the handoff so project
    // cards never overlap it, while keeping the typography fully visible at the top of the page.
    const heroWordPresence = captureGallerySweep
      ? 0
      : 1 - smoothstep(0.001, 0.015, renderedGalleryProgress);
    const heroWordOpacity = heroWordBaseOpacity * heroWordPresence;
    if (heroWordMaterial.opacity !== heroWordOpacity) heroWordMaterial.opacity = heroWordOpacity;
    // The visible word remains full-energy, but its hidden transmission copy must stay SDR. Feeding
    // a full-white duplicate into a flatter protected mesh makes the A disappear into the glyphs;
    // a restrained copy preserves readable ANIK refraction alongside the dark glass material.
    const refractionWordOpacity =
      heroWordOpacity * (captureWordRefractionOverride ?? 0.68);
    if (refractionWordMaterial.opacity !== refractionWordOpacity) {
      refractionWordMaterial.opacity = refractionWordOpacity;
    }
    const heroWordVisible = heroWordOpacity > 0;
    if (heroWord.visible !== heroWordVisible) heroWord.visible = heroWordVisible;
    if (refractionWord.visible !== heroWordVisible) refractionWord.visible = heroWordVisible;

    if (galleryVisuals.length === 0) return;

    galleryHasVisibleVisual = false;
    if (galleryEntrance <= 0 || galleryExit <= 0) {
      if (!galleryLayoutActive) return;
      galleryVisuals.forEach((visual) => {
        if (visual.mesh.visible) visual.mesh.visible = false;
        if (visual.material.uniforms.uOpacity!.value !== 0) {
          visual.material.uniforms.uOpacity!.value = 0;
        }
      });
      galleryLayoutActive = false;
      return;
    }
    galleryLayoutActive = true;
    galleryVisuals.forEach((visual, index) => {
      const offset = index + 1 - galleryProgress;
      const distance = Math.abs(offset);
      const visibility = (1 - smoothstep(0.8, 2.5, distance)) * galleryEntrance * galleryExit;
      visual.mesh.visible = visibility > 0.002;
      galleryHasVisibleVisual ||= visual.mesh.visible;
      visual.mesh.position.set(Math.sin(offset) * 11, -offset, Math.cos(offset) * 5 - 6);
      visual.mesh.rotation.set(0, offset * 0.6, 0);
      const scale = 0.9 + (compactGallery ? 0.1 : 0.2) * (1 - Math.min(1, distance));
      visual.mesh.scale.setScalar(scale);
      if (visual.material.uniforms.uOpacity!.value !== visibility) {
        visual.material.uniforms.uOpacity!.value = visibility;
      }
      visual.mesh.renderOrder = 30 - Math.round(distance * 4);
    });
  };

  const resize = () => {
    const width = deterministicCaptureMode
      ? captureWidth
      : Math.max(1, Math.round(outputCanvas.clientWidth || innerWidth));
    const height = deterministicCaptureMode
      ? captureHeight
      : Math.max(1, Math.round(outputCanvas.clientHeight || innerHeight));
    const pixelRatio = deterministicCaptureMode ? 1 : Math.min(1.5, devicePixelRatio);
    if (width === canvasWidth && height === canvasHeight && pixelRatio === renderPixelRatio) {
      return;
    }
    canvasWidth = width;
    canvasHeight = height;
    renderPixelRatio = pixelRatio;
    compactGallery = innerWidth <= 820;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width <= 820 ? 50 : 41;
    camera.updateProjectionMatrix();
    openingBackground.resize(camera, width, height, Math.min(pixelRatio, 2));
    const desktopIdentityFit = clamp(Math.min(width / 1280, height / 820), 0.90, 1);
    responsiveIdentityScale =
      identityBaseScale *
      (width <= 820 ? clamp(camera.aspect / 0.74, 0.62, 0.94) : desktopIdentityFit);
    responsiveWordScale = width <= 820 ? clamp(camera.aspect * 1.28, 0.52, 0.64) : 1.5;
    const wordScaleX = width <= 820 ? responsiveWordScale : 1.74;
    const wordScaleY = width <= 820 ? responsiveWordScale : 1.35;
    heroWord.scale.set(wordScaleX, wordScaleY, 1);
    heroWord.updateMatrix();
    refractionWord.scale.set(wordScaleX, wordScaleY, 1);
    refractionWord.updateMatrix();
    galleryGroup.scale.setScalar(width <= 820 ? 0.54 : 0.72);
    galleryGroup.updateMatrix();
    const renderWidth = Math.max(1, outputCanvas.width);
    const renderHeight = Math.max(1, outputCanvas.height);
    sceneTarget.setSize(renderWidth, renderHeight);
    backgroundTarget.setSize(renderWidth, renderHeight);
    mixedSceneTarget.setSize(renderWidth, renderHeight);
    // Preserve sub-pixel highlights before the three blur levels downsample them. Thresholding
    // directly at quarter resolution was cheaper, but it erased the small luminous details that
    // make the reference panel and glass read as crisp rather than soft and underexposed.
    bloomBrightTarget.setSize(renderWidth, renderHeight);
    bloomScales.forEach((scale, index) => {
      const bloomWidth = Math.max(1, Math.ceil(renderWidth / scale));
      const bloomHeight = Math.max(1, Math.ceil(renderHeight / scale));
      bloomVerticalTargets[index]!.setSize(bloomWidth, bloomHeight);
      bloomHorizontalTargets[index]!.setSize(bloomWidth, bloomHeight);
    });
    renderer.initRenderTarget(sceneTarget);
    renderer.initRenderTarget(backgroundTarget);
    renderer.initRenderTarget(mixedSceneTarget);
    renderer.initRenderTarget(bloomBrightTarget);
    bloomVerticalTargets.forEach((target) => renderer.initRenderTarget(target));
    bloomHorizontalTargets.forEach((target) => renderer.initRenderTarget(target));
    glassUniforms.uResolution.value.set(renderWidth, renderHeight);
    fluid?.resize(width, height);
  };

  const renderReferenceBloom = () => {
    bloomQuad.material = bloomBrightMaterial;
    renderer.setRenderTarget(bloomBrightTarget);
    renderer.clear(true, false, false);
    renderer.render(bloomScene, postCamera);

    bloomScales.forEach((_scale, index) => {
      const verticalTarget = bloomVerticalTargets[index]!;
      const horizontalTarget = bloomHorizontalTargets[index]!;
      bloomQuad.material = bloomBlurMaterial;
      // Each authored bloom level starts from the same thresholded scene. Cascading the quarter
      // level into the eighth and then sixteenth over-softens the highlights and removes the crisp
      // colored velocity that distinguishes the reference.
      bloomBlurUniforms.uInput.value = bloomBrightTarget.texture;
      bloomBlurUniforms.uResolution.value.set(verticalTarget.width, verticalTarget.height);
      bloomBlurUniforms.uDirection.value.set(0, 1);
      renderer.setRenderTarget(verticalTarget);
      renderer.clear(true, false, false);
      renderer.render(bloomScene, postCamera);

      bloomBlurUniforms.uInput.value = verticalTarget.texture;
      bloomBlurUniforms.uResolution.value.set(horizontalTarget.width, horizontalTarget.height);
      bloomBlurUniforms.uDirection.value.set(1, 0);
      renderer.setRenderTarget(horizontalTarget);
      renderer.clear(true, false, false);
      renderer.render(bloomScene, postCamera);
    });
  };

  const requestResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  };
  const canvasResizeObserver =
    'ResizeObserver' in window ? new ResizeObserver(requestResize) : null;
  canvasResizeObserver?.observe(outputCanvas);

  const onPointerMove = (event: PointerEvent) => {
    if (!worldInView || coarsePointer || capturePointerSweep) return;
    const now = performance.now();
    pointer.set(event.clientX, event.clientY);
    const normalizedX = (event.clientX / Math.max(1, canvasWidth)) * 2 - 1;
    const normalizedY = -((event.clientY / Math.max(1, canvasHeight)) * 2 - 1);
    pointerNdc.set(normalizedX, normalizedY);
    if (!pointerInitialized) {
      previousPointer.copy(pointer);
      filteredPointerNdc.copy(pointerNdc);
      pointerInitialized = true;
      lastPointerTime = now;
      return;
    }
    const deltaTime = Math.max(8, now - lastPointerTime);
    const deltaX = pointer.x - previousPointer.x;
    const deltaY = pointer.y - previousPointer.y;
    hoveredGalleryVisual = galleryVisualAt(event.clientX, event.clientY);
    setCurveCursor(hoveredGalleryVisual ? 'pointer' : '');
    // Feed the wake from the actual pointer event. Re-injecting a smoothed residual on every RAF
    // introduced a visible 100-200ms trail and kept adding energy after the hand had stopped.
    if (fluid && !gizmoDragging) {
      fluid.update({
        x: event.clientX / Math.max(1, canvasWidth),
        y: 1 - event.clientY / Math.max(1, canvasHeight),
        deltaX: (deltaX / Math.max(1, canvasWidth)) * pointerMotionIntensity,
        deltaY: (-deltaY / Math.max(1, canvasHeight)) * pointerMotionIntensity,
        deltaTime: deltaTime / 1000,
      });
    }
    previousPointer.copy(pointer);
    lastPointerTime = now;
  };

  const capturePointerPosition = new THREE.Vector2(0.5, 0.5);
  const capturePointerPrevious = new THREE.Vector2(0.5, 0.5);
  const applyCapturePointerSweep = (picture: number) => {
    if (!capturePointerSweep) return;

    capturePointerPrevious.copy(capturePointerPosition);

    if (picture <= 48) {
      capturePointerPosition.set(0.5, 0.5);
    } else if (picture <= 288) {
      const phase = (picture - 49) / 239;
      capturePointerPosition.set(
        0.5 + Math.sin(phase * Math.PI * 8) * 0.32,
        0.5 + Math.sin(phase * Math.PI * 6 + 0.7) * 0.22,
      );
    } else if (picture <= 360) {
      const phase = (picture - 289) / 71;
      capturePointerPosition.set(
        0.5 + Math.sin(phase * Math.PI * 4) * (1 - phase) * 0.24,
        0.5 + Math.cos(phase * Math.PI * 3) * (1 - phase) * 0.16,
      );
    } else {
      capturePointerPosition.set(0.5, 0.5);
    }

    const pixelX = capturePointerPosition.x * canvasWidth;
    const pixelY = capturePointerPosition.y * canvasHeight;
    pointer.set(pixelX, pixelY);
    pointerNdc.set(
      capturePointerPosition.x * 2 - 1,
      1 - capturePointerPosition.y * 2,
    );

    const capturePointerActive = picture > 48 && picture <= 360;
    if (fluid && capturePointerActive) {
      fluid.update({
        x: capturePointerPosition.x,
        y: 1 - capturePointerPosition.y,
        deltaX: capturePointerPosition.x - capturePointerPrevious.x,
        deltaY: capturePointerPrevious.y - capturePointerPosition.y,
        deltaTime: 1 / REFERENCE_CAPTURE_FPS,
      });
    } else if (fluid) {
      fluid.update({ x: 0, y: 0, active: false, space: 'ndc' });
    }

    if (!pointerInitialized) {
      filteredPointerNdc.copy(pointerNdc);
      pointerInitialized = true;
    }
  };

  const onPointerLeave = () => {
    pointerInitialized = false;
    pointerNdc.set(0, 0);
    filteredPointerNdc.set(0, 0);
    pointerVelocityNdc.set(0, 0);
    fluid?.update({ x: 0, y: 0, active: false, space: 'ndc' });
    hoveredGalleryVisual = null;
    setCurveCursor('');
  };

  const onGalleryClick = (event: MouseEvent) => {
    if (!worldInView) return;
    const eventTarget = event.target instanceof Element ? event.target : null;
    if (eventTarget?.closest('a, button, summary, details')) return;
    const visual = galleryVisualAt(event.clientX, event.clientY);
    if (visual?.route) window.location.assign(visual.route);
  };

  addEventListener('click', onGalleryClick);
  addEventListener('resize', requestResize, { passive: true });

  const resetOrientation = () => {
    interactionQuaternion.identity();
    hoverEuler.set(0, 0, 0);
    pointerEnergy = 0;
    pointerInitialized = false;
    fluid?.update({ x: 0.5, y: 0.5, active: false });
  };
  const beginGizmoDrag = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    gizmoDragging = true;
    gizmoQuaternionStart.copy(interactionQuaternion);
    projectPointerToGizmoSphere(event, gizmoDragStart);
    hoverEuler.set(0, 0, 0);
    pointerEnergy = 0;
    pointerInitialized = false;
    fluid?.update({
      x: event.clientX / Math.max(1, canvasWidth),
      y: 1 - event.clientY / Math.max(1, canvasHeight),
      active: false,
    });
    rotationGizmo?.setPointerCapture(event.pointerId);
    if (rotationGizmo) rotationGizmo.dataset.dragging = 'true';
  };
  const moveGizmo = (event: PointerEvent) => {
    if (!gizmoDragging) return;
    event.preventDefault();
    projectPointerToGizmoSphere(event, gizmoDragCurrent);
    gizmoDragDelta.setFromUnitVectors(gizmoDragStart, gizmoDragCurrent);
    interactionQuaternion
      .copy(gizmoDragDelta)
      .multiply(gizmoQuaternionStart)
      .normalize();
  };
  const releaseGizmo = (event: PointerEvent) => {
    if (!gizmoDragging) return;
    gizmoDragging = false;
    if (rotationGizmo?.hasPointerCapture(event.pointerId)) {
      rotationGizmo.releasePointerCapture(event.pointerId);
    }
    rotationGizmo?.removeAttribute('data-dragging');
    pointerInitialized = false;
    fluid?.update({
      x: event.clientX / Math.max(1, canvasWidth),
      y: 1 - event.clientY / Math.max(1, canvasHeight),
      active: false,
    });
  };
  if (!coarsePointer) {
    addEventListener('pointermove', onPointerMove, { passive: true });
    addEventListener('pointerleave', onPointerLeave, { passive: true });
    resetButton?.addEventListener('click', resetOrientation);
    rotationGizmo?.addEventListener('pointerdown', beginGizmoDrag);
    rotationGizmo?.addEventListener('pointermove', moveGizmo);
    rotationGizmo?.addEventListener('pointerup', releaseGizmo);
    rotationGizmo?.addEventListener('pointercancel', releaseGizmo);
  }

  const updateSurfaceChrome = () => {
    if (!meltSection) return;
    let boundsTop: number;
    let boundsBottom: number;
    if (referenceMotionState.meltBoundsHeight > 0) {
      boundsTop = referenceMotionState.meltDocumentTop - scrollY;
      boundsBottom = boundsTop + referenceMotionState.meltBoundsHeight;
    } else {
      const bounds = meltSection.getBoundingClientRect();
      boundsTop = bounds.top;
      boundsBottom = bounds.bottom;
    }
    const onLight = boundsTop < innerHeight * 0.28 && boundsBottom > 0;
    const nextSurface = onLight ? 'light' : 'dark';
    if (document.documentElement.dataset.referenceSurface !== nextSurface) {
      document.documentElement.dataset.referenceSurface = nextSurface;
    }
  };

  const requestSurfaceChromeUpdate = () => {
    if (surfaceUpdateFrame) return;
    surfaceUpdateFrame = requestAnimationFrame(() => {
      surfaceUpdateFrame = 0;
      updateSurfaceChrome();
    });
  };

  addEventListener('scroll', requestSurfaceChromeUpdate, { passive: true });
  addEventListener('resize', requestSurfaceChromeUpdate, { passive: true });
  updateSurfaceChrome();

  const render = (time: number) => {
    animationFrame = 0;
    if (disposed || (!deterministicCaptureMode && (document.hidden || !worldInView))) return;
    const deltaSeconds = Math.min(1 / 30, Math.max(1 / 240, (time - lastFrame) / 1000));
    lastFrame = time;
    const elapsed = Math.max(0, (time - revealStart) * 0.001);
    wallUniforms.uTime.value = elapsed;
    updateProjectScene(deltaSeconds);

    const logoSection = captureGallerySweep ? 2 : referenceMotionState.logoSection;
    const worksRotationTarget = logoSection === 0 ? 0 : 1;
    if (worksRotationTarget !== worksRotationGoal) {
      worksRotationFrom = worksRotationWeight;
      worksRotationGoal = worksRotationTarget;
      worksRotationElapsed = 0;
    }
    if (worksRotationElapsed < 1) {
      worksRotationElapsed = Math.min(1, worksRotationElapsed + deltaSeconds);
      worksRotationWeight = THREE.MathUtils.lerp(
        worksRotationFrom,
        worksRotationGoal,
        sigmoidEasing6(worksRotationElapsed),
      );
    } else {
      worksRotationWeight = worksRotationGoal;
    }

    if (!coarsePointer) {
      if (gizmoDragging) {
        filteredPointerNdc.copy(pointerNdc);
        pointerVelocityNdc.set(0, 0);
        hoverEuler.set(0, 0, 0);
        pointerEnergy = 0;
      } else {
        pointerVelocityNdc.copy(pointerNdc).sub(filteredPointerNdc);
        filteredPointerNdc.addScaledVector(
          pointerVelocityNdc,
          Math.min(1, deltaSeconds * 10),
        );
        const hoverMultiplier = (logoSection === 0 ? 1 : 0.2) * pointerMotionIntensity;
        const pointerReach = Math.max(0, 1 - pointerNdc.length() * 1.5);
        const velocityMultiplier = 0.01 * pointerReach * hoverMultiplier;
        if (pointerEffectsEnabled && velocityMultiplier > 0) {
          hoverEuler.x -=
            pointerVelocityNdc.y * velocityMultiplier * (1 - worksRotationWeight * 0.7);
          hoverEuler.y += pointerVelocityNdc.x * velocityMultiplier;
        }
        hoverEuler.x *= 1 - deltaSeconds;
        hoverEuler.y *= 1 - deltaSeconds;
        hoverEuler.z = 0;
        deltaQuaternion.setFromEuler(hoverEuler);
        interactionQuaternion.premultiply(deltaQuaternion).normalize();
        pointerEnergy = Math.max(
          pointerVelocityNdc.length() * pointerReach,
          pointerEnergy * Math.pow(0.91, deltaSeconds * 60),
        );
        if (pointerEnergy < 0.0005) pointerEnergy = 0;
      }
    }

    // The reference camera supplies half a world-unit of pointer parallax. Without it the
    // screen-space texture barely travels across the A, even when the mesh itself rotates.
    const cameraTargetX = coarsePointer ? 0 : pointerNdc.x * 0.5 * pointerMotionIntensity;
    const cameraTargetY = coarsePointer ? 0 : pointerNdc.y * 0.5 * pointerMotionIntensity;
    cameraPointerOffset.x = THREE.MathUtils.lerp(
      cameraPointerOffset.x,
      cameraTargetX,
      Math.min(1, deltaSeconds * 3),
    );
    cameraPointerOffset.y = THREE.MathUtils.lerp(
      cameraPointerOffset.y,
      cameraTargetY,
      Math.min(1, deltaSeconds * 3),
    );
    camera.position.set(
      cameraPointerOffset.x,
      cameraPointerOffset.y,
      9.5 + worksRotationWeight * 0.5,
    );
    const referenceBaseFov = 35 + 18 / Math.max(0.2, camera.aspect);
    camera.fov = referenceBaseFov - 4 * (1 - worksRotationWeight);
    camera.lookAt(0, 0, 0);
    camera.updateMatrix();
    camera.updateProjectionMatrix();

    const logoScrollVelocity = smoothedLogoScrollVelocity;
    if (worksRotationWeight > 0.0001) {
      const scrollMotionIntensity = reducedMotion ? 0.35 : 1;
      const scrollAngle = (
        -deltaSeconds * 0.5 * worksRotationWeight -
        logoScrollVelocity * 0.001 * worksRotationWeight
      ) * scrollMotionIntensity;
      deltaQuaternion.setFromAxisAngle(scrollAxis, scrollAngle);
      interactionQuaternion.premultiply(deltaQuaternion).normalize();
    }
    smoothedLogoScrollVelocity +=
      (referenceMotionState.scrollVelocity - smoothedLogoScrollVelocity) *
      Math.min(1, deltaSeconds * 5);
    const returnForce = logoSection === 0 ? 2 : logoSection === 1 ? 0.4 : 0.1;
    interactionQuaternion.slerp(
      identityQuaternion,
      THREE.MathUtils.clamp(deltaSeconds * returnForce * (1 - worksRotationWeight * 0.8), 0, 1),
    );
    composedIdentityQuaternion.copy(interactionQuaternion).normalize();
    let identityTransformChanged = false;
    if (!appliedIdentityQuaternion.equals(composedIdentityQuaternion)) {
      identity.quaternion.copy(identityBaseQuaternion).multiply(composedIdentityQuaternion);
      appliedIdentityQuaternion.copy(composedIdentityQuaternion);
      controllerUpdateElapsed += deltaSeconds;
      if (controllerUpdateElapsed >= 1 / 30) {
        updateQuaternionController(composedIdentityQuaternion);
        controllerUpdateElapsed = 0;
      }
      identityTransformChanged = true;
    }
    const identityScale = responsiveIdentityScale;
    if (appliedIdentityScale !== identityScale) {
      identity.scale.setScalar(identityScale);
      appliedIdentityScale = identityScale;
      identityTransformChanged = true;
    }
    if (identityTransformChanged) identity.updateMatrix();

    if (fluid) {
      fluid.step(deltaSeconds);
      sceneMixerUniforms.uFluid.value = fluid.texture;
      compositeUniforms.uFluid.value = fluid.texture;
    }
    openingBackground.group.visible = true;
    wall.visible = false;
    const backgroundElapsed =
      backgroundTimeOverride !== null && Number.isFinite(backgroundTimeOverride)
        ? backgroundTimeOverride
        : elapsed;
    openingBackground.update(
      backgroundElapsed,
      fluid?.texture ?? null,
      captureTypographyOnly ? 0 : renderedGalleryPresence,
      Math.max(0, referenceMotionState.wallProjectProgress - 1),
      captureGallerySweep
        ? clamp(currentGalleryProgress / Math.max(1, galleryVisuals.length + 1))
        : referenceMotionState.worksProgress,
    );
    if (backgroundTimeOverride !== null) {
      const backgroundState = openingBackground.debugState();
      openingElement.dataset.backgroundState = [
        backgroundState.picture,
        backgroundState.pattern,
        backgroundState.symbolMode,
        backgroundState.layoutIndex,
      ].join(':');
    }
    // Render the chamber once, then duplicate that exact buffer for the A's screen-space
    // refraction. The chamber itself supplies the reference-timed ANIK typography.
    renderer.setRenderTarget(sceneTarget);
    renderer.clear(true, true, false);
    renderer.render(baseScene, camera);
    const galleryRendersVisible = galleryHasVisibleVisual && !captureTypographyOnly;
    if (galleryRendersVisible) {
      renderer.copyTextureToTexture(sceneDepthTexture, backgroundDepthTexture);
    }
    // The reference copies through a full-screen post-process pass, which also performs the
    // half-float -> unsigned-byte conversion needed by its transparent buffer. Keep auto-clear off
    // while adding the typography/gallery layers so they cannot erase the chamber underneath.
    const autoClear = renderer.autoClear;
    try {
      renderer.autoClear = false;
      renderer.setRenderTarget(backgroundTarget);
      renderer.render(backgroundCopyScene, postCamera);
      if (refractionWord.visible) renderer.render(refractionTypographyScene, camera);
    } finally {
      renderer.autoClear = autoClear;
    }
    renderer.setRenderTarget(sceneTarget);
    renderer.render(identityScene, camera);
    if (galleryRendersVisible) renderer.render(galleryScene, camera);

    // Reference pass order: scene mixer (fluid, vignette, wake) -> bloom threshold/blur ->
    // final fluid correction, bloom accumulation and 1.30 display gain.
    renderer.setRenderTarget(mixedSceneTarget);
    renderer.clear(true, false, false);
    renderer.render(sceneMixerScene, postCamera);
    renderReferenceBloom();
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);

    if (!coarsePointer && stateReadout) {
      const nextState =
        renderedGalleryPresence > 0.55
          ? `WORK ${String(Math.round(renderedGalleryProgress) + 1).padStart(2, '0')}`
          : gizmoDragging || pointerEnergy > 0.04
            ? 'MOVING'
            : 'REST';
      if (stateReadout.textContent !== nextState) stateReadout.textContent = nextState;
    }
    if (!coarsePointer && quaternionReadout) {
      const quaternion = composedIdentityQuaternion;
      const nextQuaternion = `${quaternion.x.toFixed(2)} ${quaternion.y.toFixed(
        2,
      )} ${quaternion.z.toFixed(2)} ${quaternion.w.toFixed(2)}`;
      if (quaternionReadout.textContent !== nextQuaternion) {
        quaternionReadout.textContent = nextQuaternion;
      }
    }
    if (!deterministicCaptureMode && worldInView && !document.hidden) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const resumeRender = () => {
    if (
      deterministicCaptureMode ||
      !renderReady ||
      disposed ||
      animationFrame ||
      document.hidden ||
      !worldInView
    ) {
      return;
    }
    lastFrame = performance.now();
    animationFrame = requestAnimationFrame(render);
  };

  const worldObserver = new IntersectionObserver(
    ([entry]) => {
      worldInView = entry?.isIntersecting ?? true;
      if (worldInView) resumeRender();
    },
    { rootMargin: '120px 0px' },
  );
  worldObserver.observe(worldElement);

  const onVisibilityChange = () => {
    if (!document.hidden) resumeRender();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  resize();
  if (heroWordMaterial.map) renderer.initTexture(heroWordMaterial.map);
    renderer.initTexture(studioEnvironmentTexture);
  await Promise.all([
    renderer.compileAsync(baseScene, camera),
    renderer.compileAsync(refractionTypographyScene, camera),
    renderer.compileAsync(identityScene, camera),
    renderer.compileAsync(sceneMixerScene, postCamera),
    renderer.compileAsync(postScene, postCamera),
  ]);
  worldElement.dataset.modelReady = 'true';
  openingElement.dataset.modelReady = 'true';
  renderReady = true;
  if (deterministicCaptureMode) {
    revealStart = 0;
    lastFrame = 0;
    captureBridge = {
      canvas: outputCanvas,
      fps: REFERENCE_CAPTURE_FPS,
      height: captureHeight,
      totalPictures: REFERENCE_TOTAL_PICTURES,
      width: captureWidth,
      readPixels: (target) => {
        const pixels =
          target ??
          new Uint8Array(new ArrayBuffer(outputCanvas.width * outputCanvas.height * 4));
        if (pixels.byteLength !== outputCanvas.width * outputCanvas.height * 4) {
          throw new RangeError('Capture pixel target has the wrong byte length');
        }
        const context = renderer.getContext();
        context.readPixels(
          0,
          0,
          outputCanvas.width,
          outputCanvas.height,
          context.RGBA,
          context.UNSIGNED_BYTE,
          pixels,
        );
        return pixels;
      },
      renderPicture: (picture) => {
        if (!Number.isInteger(picture) || picture < 1 || picture > REFERENCE_TOTAL_PICTURES) {
          throw new RangeError(
            `Capture picture must be an integer from 1 through ${REFERENCE_TOTAL_PICTURES}`,
          );
        }
        const elapsedMilliseconds = ((picture - 1) * 1000) / REFERENCE_CAPTURE_FPS;
        captureSourcePicture = picture;
        lastFrame = elapsedMilliseconds - 1000 / REFERENCE_CAPTURE_FPS;
        applyCapturePointerSweep(picture);
        render(elapsedMilliseconds);
        renderer.getContext().finish();
        return {
          backgroundState: openingElement.dataset.backgroundState ?? '',
          height: outputCanvas.height,
          picture,
          width: outputCanvas.width,
        };
      },
    };
    (window as Window & { __referenceCapture?: ReferenceCaptureBridge }).__referenceCapture =
      captureBridge;
    openingElement.dataset.captureReady = 'true';
    captureBridge.renderPicture(1);
  } else {
    revealStart = performance.now();
    resumeRender();
  }

  void galleryVisualsPromise.then(async (loadedGalleryVisuals) => {
    if (disposed) {
      loadedGalleryVisuals.forEach((visual) => {
        visual.material.dispose();
        visual.texture.dispose();
      });
      return;
    }

    if (loadedGalleryVisuals.length !== projectSources.length) {
      const message = `Project gallery loaded ${loadedGalleryVisuals.length}/${projectSources.length} textures`;
      openingElement.dataset.galleryReady = 'false';
      openingElement.dataset.galleryError = message;
      console.error(message);
      return;
    }

    openingBackground.setProjectTextures(loadedGalleryVisuals.map((visual) => visual.texture));
    loadedGalleryVisuals.forEach((visual) => {
      galleryGroup.add(visual.mesh);
      galleryVisuals.push(visual);
      galleryMeshes.push(visual.mesh);
      galleryVisualByMesh.set(visual.mesh, visual);
    });
    if (loadedGalleryVisuals.length > 0) curveSection?.setAttribute('data-webgl-gallery', 'true');
    try {
      loadedGalleryVisuals.forEach((visual) => renderer.initTexture(visual.texture));
      await renderer.compileAsync(galleryScene, camera);
      if (disposed) return;
      openingElement.dataset.galleryReady = 'true';
      openingElement.dataset.galleryCount = `${loadedGalleryVisuals.length}/${projectSources.length}`;
      if (deterministicCaptureMode && captureBridge && !nativeCaptureStarted) {
        nativeCaptureStarted = true;
        void startNativePngCapture(captureBridge, openingElement).catch((error) => {
          openingElement.dataset.captureState = 'FAILED';
          openingElement.dataset.captureError = error instanceof Error ? error.message : String(error);
          console.error('Native PNG capture failed', error);
        });
      }
    } catch (error) {
      openingElement.dataset.galleryReady = 'false';
      openingElement.dataset.galleryError =
        error instanceof Error ? error.message : String(error);
      console.error('Project gallery shader warm-up failed', error);
    }
  });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animationFrame);
    cancelAnimationFrame(surfaceUpdateFrame);
    cancelAnimationFrame(resizeFrame);
    worldObserver.disconnect();
    canvasResizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    removeEventListener('pointermove', onPointerMove);
    removeEventListener('pointerleave', onPointerLeave);
    removeEventListener('click', onGalleryClick);
    removeEventListener('resize', requestResize);
    resetButton?.removeEventListener('click', resetOrientation);
    rotationGizmo?.removeEventListener('pointerdown', beginGizmoDrag);
    rotationGizmo?.removeEventListener('pointermove', moveGizmo);
    rotationGizmo?.removeEventListener('pointerup', releaseGizmo);
    rotationGizmo?.removeEventListener('pointercancel', releaseGizmo);
    removeEventListener('resize', requestSurfaceChromeUpdate);
    removeEventListener('scroll', requestSurfaceChromeUpdate);
    setCurveCursor('');
    fluid?.dispose();
    zeroVelocityTexture.dispose();
    backgroundCopyMaterial.dispose();
    sceneTarget.dispose();
    backgroundTarget.dispose();
    mixedSceneTarget.dispose();
    bloomBrightTarget.dispose();
    bloomVerticalTargets.forEach((target) => target.dispose());
    bloomHorizontalTargets.forEach((target) => target.dispose());
    baseScene.remove(openingBackground.group);
    openingBackground.dispose();
    wall.geometry.dispose();
    wallMaterial.dispose();
    heroWord.geometry.dispose();
    heroWordMaterial.map?.dispose();
    heroWordMaterial.dispose();
    refractionWordMaterial.dispose();
    studioEnvironmentTexture.dispose();
    identity.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    glassMaterial.dispose();
    galleryGeometry.dispose();
    galleryVisuals.forEach((visual) => {
      visual.material.dispose();
      visual.texture.dispose();
    });
    postQuad.geometry.dispose();
    bloomBrightMaterial.dispose();
    bloomBlurMaterial.dispose();
    sceneMixerMaterial.dispose();
    compositeMaterial.dispose();
    renderer.dispose();
    removeEventListener('pagehide', onPageHide);
    removeEventListener('pageshow', onPageShow);
    document.documentElement.dataset.referenceSurface = 'light';
  };
  const onPageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) {
      dispose();
      return;
    }
    cancelAnimationFrame(animationFrame);
    cancelAnimationFrame(surfaceUpdateFrame);
    cancelAnimationFrame(resizeFrame);
    animationFrame = 0;
    surfaceUpdateFrame = 0;
    resizeFrame = 0;
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted || disposed) return;
    resize();
    updateSurfaceChrome();
    resumeRender();
  };
  addEventListener('pagehide', onPageHide);
  addEventListener('pageshow', onPageShow);
}

if (section && world && canvas) {
  startReferenceWorld(world, section, canvas).catch((error: unknown) => {
    console.error('Reference world failed to initialize', error);
    section.dataset.modelError = 'true';
    world.dataset.modelError = 'true';
  });
}
