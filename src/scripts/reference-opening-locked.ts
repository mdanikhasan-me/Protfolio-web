import * as THREE from 'three';
import { referenceMotionState } from '../lib/reference-motion-state';
import { createReferenceBackgroundSystem } from './reference-background-system';

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));
const smoothstep = (minimum: number, maximum: number, value: number) => {
  const normalized = clamp((value - minimum) / Math.max(0.00001, maximum - minimum));
  return normalized * normalized * (3 - 2 * normalized);
};

const section = document.querySelector<HTMLElement>('[data-reference-opening]');
const world = document.querySelector<HTMLElement>('[data-reference-world]');
const canvas = world?.querySelector<HTMLCanvasElement>('[data-reference-canvas]');
const boot = world?.querySelector<HTMLElement>('[data-reference-boot]');
const curveSection = document.querySelector<HTMLElement>('[data-curve-work]');
const meltSection = document.querySelector<HTMLElement>('[data-melt-section]');
const stateReadout = section?.querySelector<HTMLElement>('[data-reference-state]');
const quaternionReadout = section?.querySelector<HTMLElement>('[data-reference-fold]');
const resetButton = section?.querySelector<HTMLButtonElement>('[data-reference-reset]');
const rotationGizmo = section?.querySelector<HTMLButtonElement>('[data-reference-gizmo]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = matchMedia('(hover: none) and (pointer: coarse)').matches;
const pointerEffectsEnabled = !reducedMotion && !coarsePointer;

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

  void main() {
    vUv = uv;
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
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  float random(vec2 coordinate) {
    return fract(sin(dot(coordinate, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float distributionGGX(vec3 normal, vec3 halfVector, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float nDotH = max(dot(normal, halfVector), 0.0);
    float denominator = nDotH * nDotH * (a2 - 1.0) + 1.0;
    return a2 / max(3.14159265 * denominator * denominator, 0.0001);
  }

  void main() {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    vec3 viewNormal = normalize(vViewNormal);
    if (!gl_FrontFacing) viewNormal *= -1.0;
    vec3 viewDirection = normalize(vViewPosition);
    vec4 firstNoise = texture2D(uNoise, vUv * 9.0);
    vec4 secondNoise = texture2D(
      uNoise,
      vUv + (firstNoise.xy - 0.5) * 2.0
    );
    float roughness = smoothstep(0.3, 0.8, secondNoise.y) * 0.10;
    float refractPower = 0.10;
    vec2 refractNormal = viewNormal.xy * (1.0 - viewNormal.z * 0.7);
    vec3 refractedColor = vec3(0.0);
    float sineB = sin(firstNoise.b * 6.2831853);
    float cosineB = cos(firstNoise.b * 6.2831853);
    float sineG = sin(firstNoise.g * 6.2831853);
    float cosineG = cos(firstNoise.g * 6.2831853);
    const float sineOne = 0.8414709848;
    const float cosineOne = 0.5403023059;

    for (int index = 0; index < 8; index++) {
      float sampleIndex = float(index);
      float slide = 0.005 + firstNoise.r * 0.004 + sampleIndex * 0.00043;
      vec2 roughnessDirection =
        (secondNoise.xy - 0.5) * roughness * 0.30 +
        vec2(sineB, cosineG) * roughness * 0.028;
      vec2 uvR = clamp(
        roughnessDirection + screenUv - refractNormal * (refractPower + slide),
        0.001,
        0.999
      );
      vec2 uvG = clamp(
        roughnessDirection + screenUv - refractNormal * (refractPower + slide * 2.0),
        0.001,
        0.999
      );
      vec2 uvB = clamp(
        roughnessDirection + screenUv - refractNormal * (refractPower + slide * 4.0),
        0.001,
        0.999
      );
      refractedColor += vec3(
        texture2D(uScene, uvR).r,
        texture2D(uScene, uvG).g,
        texture2D(uScene, uvB).b
      ) * 0.9;
      float nextSineB = sineB * cosineOne + cosineB * sineOne;
      cosineB = cosineB * cosineOne - sineB * sineOne;
      sineB = nextSineB;
      float nextSineG = sineG * cosineOne + cosineG * sineOne;
      cosineG = cosineG * cosineOne - sineG * sineOne;
      sineG = nextSineG;
    }
    vec3 color = refractedColor * 0.125;

    vec3 lightDirection = normalize(vec3(-1.0, 0.8, -1.0));
    vec3 halfVector = normalize(viewDirection + lightDirection);
    float specular = distributionGGX(
      viewNormal,
      halfVector,
      0.018 + roughness * 0.46
    );
    color += vec3(min(0.82, specular * 0.075));

    float fresnel =
      0.1 +
      0.9 * pow(1.0 - max(dot(viewDirection, viewNormal), 0.0), 5.0);
    vec2 reflectionUv = clamp(
      screenUv +
        viewNormal.xy * (0.04 + fresnel * 0.05) +
        (secondNoise.xy - 0.5) * roughness * 0.08,
      0.001,
      0.999
    );
    vec3 chamberReflection = texture2D(uScene, reflectionUv).rgb;
    color = mix(color, chamberReflection, 0.12 + fresnel * 0.5);
    vec3 edgeSpectrum =
      0.5 +
      0.5 *
        cos(
          6.2831853 *
            (vec3(0.0, 0.34, 0.67) +
              firstNoise.r * 0.035)
        );
    color += edgeSpectrum * pow(fresnel, 1.7) * 0.07;
    float microGrain = random(gl_FragCoord.xy + floor(uTime * 24.0)) - 0.5;
    color += microGrain * 0.0015;
    color = max(color, vec3(0.0));

    gl_FragColor = vec4(color * 1.14, uOpacity);
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
  uniform float uVelocity;

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
    float velocity = clamp(uVelocity * 0.0009, -0.004, 0.004);
    vec3 normal = normalize(vViewNormal);
    float frontDirection = dot(normal, vec3(0.0, 0.0, 1.0));
    vec2 normalOffset = -normal.xy * 0.018 * smoothstep(0.82, 1.0, frontDirection);
    vec2 centeredUv = (uv - 0.5 + vec2(velocity, 0.0)) * vec2(1.004, 1.006);
    vec2 sharpUv = lensDistortion(centeredUv, 0.004) + 0.5 + normalOffset;
    float imageEdge = smoothstep(
      0.42,
      0.92,
      length((vUv - 0.5) * vec2(1.0, 1.72))
    );
    float chroma = (0.00022 + abs(velocity) * 0.18) * mix(0.24, 1.0, imageEdge);
    vec3 color = vec3(
      texture2D(uMap, sharpUv + vec2(chroma, 0.0)).r,
      texture2D(uMap, sharpUv).g,
      texture2D(uMap, sharpUv - vec2(chroma, 0.0)).b
    );
    float reflection = smoothstep(0.0, 0.2, reflect(-normalize(vViewPosition), normal).x);
    color = mix(color, vec3(reflection), 0.018);
    vec2 edgeDistance = min(vUv, 1.0 - vUv);
    float nearestEdge = min(edgeDistance.x, edgeDistance.y);
    float edgeWidth = max(fwidth(nearestEdge), 0.00065);
    float silhouetteCoverage = smoothstep(0.0, edgeWidth * 1.25, nearestEdge);
    float outerRim = 1.0 - smoothstep(edgeWidth * 0.45, edgeWidth * 1.65, nearestEdge);
    float innerRim = 1.0 - smoothstep(
      edgeWidth * 0.8,
      edgeWidth * 1.8,
      abs(nearestEdge - edgeWidth * 2.7)
    );
    float grazing = 1.0 - clamp(abs(frontDirection), 0.0, 1.0);
    vec3 neutralGlass = vec3(0.11, 0.13, 0.15) + color * 0.045;
    color += neutralGlass * outerRim * (0.34 + grazing * 0.24);
    color += vec3(0.045, 0.052, 0.060) * innerRim * 0.32;
    float opacity = uOpacity * silhouetteCoverage;
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

const compositeFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uIdentity;
  uniform sampler2D uFluid;
  uniform sampler2D uBloomTexture0;
  uniform sampler2D uBloomTexture1;
  uniform sampler2D uBloomTexture2;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uReveal;
  uniform float uGallery;

  float hash21(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
  }

  vec3 fxaa(vec2 uv, out vec3 center) {
    vec2 pixel = 1.0 / uResolution;
    center = texture2D(uScene, uv).rgb;
    vec3 northWest = texture2D(uScene, uv + vec2(-pixel.x, pixel.y)).rgb;
    vec3 northEast = texture2D(uScene, uv + vec2(pixel.x, pixel.y)).rgb;
    vec3 southWest = texture2D(uScene, uv + vec2(-pixel.x, -pixel.y)).rgb;
    vec3 southEast = texture2D(uScene, uv + vec2(pixel.x, -pixel.y)).rgb;
    vec3 luminance = vec3(0.299, 0.587, 0.114);
    float centerLuma = dot(center, luminance);
    float northWestLuma = dot(northWest, luminance);
    float northEastLuma = dot(northEast, luminance);
    float southWestLuma = dot(southWest, luminance);
    float southEastLuma = dot(southEast, luminance);
    float minimumLuma = min(
      centerLuma,
      min(min(northWestLuma, northEastLuma), min(southWestLuma, southEastLuma))
    );
    float maximumLuma = max(
      centerLuma,
      max(max(northWestLuma, northEastLuma), max(southWestLuma, southEastLuma))
    );
    vec2 direction;
    direction.x = -((northWestLuma + northEastLuma) - (southWestLuma + southEastLuma));
    direction.y = (northWestLuma + southWestLuma) - (northEastLuma + southEastLuma);
    float directionReduce = max(
      (northWestLuma + northEastLuma + southWestLuma + southEastLuma) * 0.03125,
      0.0078125
    );
    float reciprocalMinimum =
      1.0 / (min(abs(direction.x), abs(direction.y)) + directionReduce);
    direction = clamp(direction * reciprocalMinimum, vec2(-8.0), vec2(8.0)) * pixel;
    vec3 resultA = 0.5 * (
      texture2D(uScene, uv + direction * (1.0 / 3.0 - 0.5)).rgb +
      texture2D(uScene, uv + direction * (2.0 / 3.0 - 0.5)).rgb
    );
    vec3 resultB = resultA * 0.5 + 0.25 * (
      texture2D(uScene, uv + direction * -0.5).rgb +
      texture2D(uScene, uv + direction * 0.5).rgb
    );
    float resultLuma = dot(resultB, luminance);
    if (resultLuma < minimumLuma || resultLuma > maximumLuma) return resultA;
    return resultB;
  }

  #if POINTER_FX == 1
  float fluidSmoke(vec2 uv, vec2 centerVelocity) {
    vec2 pixel = 1.0 / uResolution;
    float smoke = length(centerVelocity) * 0.22;
    smoke += length(texture2D(uFluid, uv + vec2( 5.0,  0.0) * pixel).xy) * 0.13;
    smoke += length(texture2D(uFluid, uv + vec2(-5.0,  0.0) * pixel).xy) * 0.13;
    smoke += length(texture2D(uFluid, uv + vec2( 0.0,  5.0) * pixel).xy) * 0.13;
    smoke += length(texture2D(uFluid, uv + vec2( 0.0, -5.0) * pixel).xy) * 0.13;
    smoke += length(texture2D(uFluid, uv + vec2( 9.0,  7.0) * pixel).xy) * 0.065;
    smoke += length(texture2D(uFluid, uv + vec2(-9.0,  7.0) * pixel).xy) * 0.065;
    smoke += length(texture2D(uFluid, uv + vec2( 9.0, -7.0) * pixel).xy) * 0.065;
    smoke += length(texture2D(uFluid, uv + vec2(-9.0, -7.0) * pixel).xy) * 0.065;
    return smoothstep(0.018, 0.62, smoke);
  }
  #endif

  void main() {
    vec2 velocity = vec2(0.0);
    float wake = 0.0;
    float smoke = 0.0;
    #if POINTER_FX == 1
    velocity = texture2D(uFluid, vUv).xy;
    wake = min(length(velocity), 1.0);
    smoke = fluidSmoke(vUv, velocity);
    #endif
    float galleryProtect = smoothstep(0.18, 0.82, uGallery);
    float warpStrength = mix(0.0105, 0.0015, galleryProtect);
    vec2 warpedUv = clamp(vUv - velocity * warpStrength, 0.001, 0.999);
    vec3 color;
    #if RETINA_DIRECT == 1
    color = texture2D(uScene, warpedUv).rgb;
    #else
    if (galleryProtect >= 0.999) {
      color = texture2D(uScene, warpedUv).rgb;
    } else {
      vec3 directColor;
      vec3 antialiasedColor = fxaa(warpedUv, directColor);
      color = mix(antialiasedColor, directColor, galleryProtect);
    }
    #endif

    vec3 bloomQuarter = texture2D(uBloomTexture0, warpedUv).rgb;
    vec3 bloomEighth = texture2D(uBloomTexture1, warpedUv).rgb;
    vec3 bloomSixteenth = texture2D(uBloomTexture2, warpedUv).rgb;
    float bloomGain = mix(1.0, 0.42, galleryProtect);
    color +=
      (bloomQuarter * 0.075 + bloomEighth * 0.15 + bloomSixteenth * 0.225) * bloomGain;
    color *= mix(1.3, 1.08, galleryProtect);

    vec4 identityLayer = texture2D(uIdentity, warpedUv);
    // Keep a restrained part of the authored metallic treatment in the gallery. The previous
    // all-or-nothing cutoff exposed the raw rainbow layer as soon as projects appeared.
    float identityTreatment = mix(1.0, 0.16, galleryProtect);
    float identityMask = smoothstep(0.008, 0.24, identityLayer.a) * identityTreatment;
    vec2 identityPixel = 1.0 / uResolution;
    float identityNeighbour = max(
      max(
        texture2D(uIdentity, warpedUv + vec2(identityPixel.x, 0.0)).a,
        texture2D(uIdentity, warpedUv - vec2(identityPixel.x, 0.0)).a
      ),
      max(
        texture2D(uIdentity, warpedUv + vec2(0.0, identityPixel.y)).a,
        texture2D(uIdentity, warpedUv - vec2(0.0, identityPixel.y)).a
      )
    );
    float identityEdge =
      clamp(identityNeighbour - identityLayer.a, 0.0, 1.0) * mix(1.0, 0.18, galleryProtect);
    vec3 identitySource = clamp(
      identityLayer.rgb / max(identityLayer.a, 0.045),
      vec3(0.0),
      vec3(1.35)
    );
    float identityLuma = dot(identitySource, vec3(0.2126, 0.7152, 0.0722));
    vec3 identitySilver = mix(
      identitySource,
      vec3(identityLuma) * vec3(0.90, 1.00, 1.15),
      0.14
    );
    identitySilver = mix(
      identitySilver,
      vec3(identityLuma) * vec3(0.82, 0.96, 1.12),
      galleryProtect * 0.32
    );
    identitySilver *= 0.72;
    float identityResponse = smoothstep(0.025, 0.78, identityLuma);
    vec3 environmentalSilver = mix(
      vec3(0.055, 0.12, 0.28),
      vec3(0.075, 0.20, 0.19),
      smoothstep(0.46, 0.84, vUv.x)
    );
    vec3 readableIdentity = max(
      vec3(0.06, 0.08, 0.12),
      identitySilver * (1.15 + identityResponse * 0.32) + vec3(0.030, 0.045, 0.072)
    );
    readableIdentity += environmentalSilver * (0.14 + identityResponse * 0.10);
    vec3 galleryResponsiveIdentity = mix(readableIdentity * 0.55, color * 1.18, 0.62);
    readableIdentity = mix(readableIdentity, galleryResponsiveIdentity, galleryProtect);
    float identityDensity = mix(0.88, 0.96, identityResponse);
    color = mix(color, max(readableIdentity, color * 0.32), identityMask * identityDensity);
    float darkIdentity = (1.0 - smoothstep(0.06, 0.30, identityLuma)) * identityMask;
    float rightSideSupport = mix(0.64, 1.0, smoothstep(0.46, 0.84, vUv.x));
    color += vec3(0.026, 0.044, 0.086) * darkIdentity * rightSideSupport;
    color += vec3(0.048, 0.074, 0.135) * identityEdge * 0.44;

    vec3 smokeTint = mix(vec3(0.12, 0.22, 0.34), vec3(0.20, 0.10, 0.34), vUv.y);
    color = mix(color, color * 1.035 + smokeTint * 0.095, smoke * 0.74);
    color *= 1.0 + wake * 0.10;
    color += vec3(smoke) * 0.012;

    float dotPattern = 0.996 + step(0.982, hash21(floor(gl_FragCoord.xy * 0.5))) * 0.008;
    float grain = hash21(gl_FragCoord.xy + uTime * 59.0) - 0.5;
    float vignette =
      1.0 - smoothstep(0.27, 0.92, length((vUv - 0.5) * vec2(0.82, 1.0)));
    color *= mix(dotPattern * (0.78 + vignette * 0.25), 0.95 + vignette * 0.05, galleryProtect);
    color += grain * mix(0.008, 0.002, galleryProtect);
    color *= smoothstep(0.0, 1.0, uReveal);
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

function createWordTexture(textureWidth = 4096) {
  const wordCanvas = document.createElement('canvas');
  wordCanvas.width = textureWidth;
  wordCanvas.height = Math.round(textureWidth / 4);
  const context = wordCanvas.getContext('2d');
  if (!context) throw new Error('Unable to create environmental word texture');
  context.clearRect(0, 0, wordCanvas.width, wordCanvas.height);
  context.fillStyle = '#ffffff';

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

function createMaterialNoiseTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let seed = 0x6d2b79f5;
  for (let index = 0; index < data.length; index += 4) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    const value = seed & 255;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
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
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geometry, material));
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.scale.setScalar(5.08 / Math.max(size.y, 0.001));
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
  const phoneClassPointer = coarsePointer && Math.min(screen.width, screen.height) <= 500;
  const pixelRatioCap = phoneClassPointer ? 2 : 1.5;
  const initialPixelRatio = Math.min(devicePixelRatio, pixelRatioCap);
  const retinaDirectSampling = phoneClassPointer && initialPixelRatio >= 2;
  const requiredWordTextureWidth = Math.max(screen.width, screen.height) * initialPixelRatio;
  const wordTextureWidth = coarsePointer
    ? Math.min(4096, Math.max(2048, 2 ** Math.ceil(Math.log2(requiredWordTextureWidth))))
    : 4096;
  const renderer = new THREE.WebGLRenderer({
    canvas: outputCanvas,
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x020109, 1);

  const baseScene = new THREE.Scene();
  baseScene.background = new THREE.Color(0x020109);
  const identityScene = new THREE.Scene();
  const galleryScene = new THREE.Scene();
  baseScene.matrixAutoUpdate = false;
  identityScene.matrixAutoUpdate = false;
  galleryScene.matrixAutoUpdate = false;
  const camera = new THREE.PerspectiveCamera(41, 1, 0.1, 50);
  camera.position.set(0, 0.1, 10);
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

  const openingBackground = createReferenceBackgroundSystem(renderer);
  baseScene.add(openingBackground.group);

  const heroWordBaseOpacity = phoneClassPointer ? 0.78 : 1;
  const heroWordPromise = Promise.resolve().then(() => {
    const heroWordMaterial = new THREE.MeshBasicMaterial({
      map: createWordTexture(wordTextureWidth),
      color: phoneClassPointer ? 0xffffff : 0xb8bcc6,
      transparent: true,
      alphaTest: 0.012,
      opacity: heroWordBaseOpacity,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const heroWordGeometry = new THREE.PlaneGeometry(9.8, 2.45);
    heroWordGeometry.deleteAttribute('normal');
    const heroWord = new THREE.Mesh(heroWordGeometry, heroWordMaterial);
    heroWord.position.set(0, -0.02, -2.1);
    heroWord.frustumCulled = false;
    heroWord.updateMatrix();
    heroWord.matrixAutoUpdate = false;
    heroWord.renderOrder = 10;
    baseScene.add(heroWord);
    return { heroWord, heroWordMaterial };
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
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    depthTexture: backgroundDepthTexture,
  });
  const identityTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });

  const materialNoiseTexture = createMaterialNoiseTexture();
  const glassUniforms = {
    uScene: { value: backgroundTarget.texture },
    uNoise: { value: materialNoiseTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
  };
  const glassMaterial = new THREE.ShaderMaterial({
    uniforms: glassUniforms,
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const identityPromise = loadIdentity(glassMaterial);

  const projectSources = Array.from(document.querySelectorAll<HTMLElement>('[data-curve-card]'))
    .map((card) => {
      const desktopMedia = card.dataset.projectMedia ?? '';
      return {
        media: phoneClassPointer ? desktopMedia.replace(/-1600\.webp$/, '-960.webp') : desktopMedia,
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
  const galleryVisualsPromise = Promise.all(
    projectSources.map(async (project) => {
      const texture = await loadTexture(projectTextureLoader, project.media);
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
          uVelocity: { value: 0 },
        },
        vertexShader: galleryVertexShader,
        fragmentShader: galleryFragmentShader,
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(galleryGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 30;
      return { mesh, material, route: project.route, texture };
    }),
  );
  const [{ heroWord, heroWordMaterial }, identity, loadedGalleryVisuals] = await Promise.all([
    heroWordPromise,
    identityPromise,
    galleryVisualsPromise,
  ]);
  const identityBaseScale = identity.scale.x;
  const identityBaseQuaternion = identity.quaternion.clone();
  // The first rendered frame always normalizes the authored root to this origin. Set it once
  // before rendering instead of rewriting the same transform on every animation frame.
  identity.position.set(0, 0, 0);
  identity.updateMatrix();
  identity.matrixAutoUpdate = false;
  identityScene.add(identity);
  loadedGalleryVisuals.forEach((visual) => {
    galleryGroup.add(visual.mesh);
    galleryVisuals.push(visual);
  });
  const galleryMeshes = galleryVisuals.map((visual) => visual.mesh);
  const galleryVisualByMesh = new Map<THREE.Object3D, GalleryVisual>(
    galleryVisuals.map((visual) => [visual.mesh, visual]),
  );
  curveSection?.setAttribute('data-webgl-gallery', 'true');

  const postScene = new THREE.Scene();
  postScene.matrixAutoUpdate = false;
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postCamera.matrixAutoUpdate = false;
  const postGeometry = new THREE.PlaneGeometry(2, 2);
  postGeometry.deleteAttribute('normal');
  const fluid = pointerEffectsEnabled
    ? new (await import('./reference-fluid')).ReferenceFluid(renderer)
    : null;
  const bloomTargetOptions: THREE.RenderTargetOptions = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  };
  const bloomScales = [4, 8, 16] as const;
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
    uScene: { value: sceneTarget.texture },
    uThreshold: { value: 0.9 },
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
  const compositeUniforms = {
    uScene: { value: sceneTarget.texture },
    uIdentity: { value: identityTarget.texture },
    uFluid: { value: fluid?.texture ?? sceneTarget.texture },
    uBloomTexture0: { value: bloomHorizontalTargets[0]!.texture },
    uBloomTexture1: { value: bloomHorizontalTargets[1]!.texture },
    uBloomTexture2: { value: bloomHorizontalTargets[2]!.texture },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uReveal: { value: reducedMotion ? 1 : 0 },
    uGallery: { value: 0 },
  };
  const compositeMaterial = new THREE.ShaderMaterial({
    defines: {
      POINTER_FX: pointerEffectsEnabled ? 1 : 0,
      RETINA_DIRECT: retinaDirectSampling ? 1 : 0,
    },
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
  const targetQuaternion = new THREE.Quaternion();
  const deltaQuaternion = new THREE.Quaternion();
  const deltaEuler = new THREE.Euler();
  const targetCamera = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const previousPointer = new THREE.Vector2();
  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const appliedInteractionQuaternion = interactionQuaternion.clone();
  let appliedIdentityScale = identity.scale.x;
  let pointerInitialized = false;
  let pointerOverIdentity = false;
  let hoveredGalleryVisual: GalleryVisual | null = null;
  let lastPointerTime = performance.now();
  let lastMotionTime = -1000;
  let pointerEnergy = 0;
  let revealStart = performance.now();
  let animationFrame = 0;
  let lastFrame = performance.now();
  const backgroundTimeParam = import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get('__backgroundTime')
    : null;
  const backgroundTimeOverride = backgroundTimeParam === null ? null : Number(backgroundTimeParam);
  let currentGalleryProgress = 0;
  let renderedGalleryProgress = 0;
  let currentGalleryPresence = 0;
  let renderedGalleryPresence = 0;
  let galleryHasVisibleVisual = false;
  let galleryLayoutActive = false;
  let responsiveIdentityScale = identityBaseScale;
  let responsiveWordScale = 1;
  let worldInView = true;
  let surfaceUpdateFrame = 0;
  let renderReady = false;
  let disposed = false;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let renderPixelRatio = 0;
  let resizeFrame = 0;
  let compactGallery = innerWidth <= 820;

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

  const updateProjectScene = (deltaSeconds: number) => {
    if (!curveSection || galleryVisuals.length === 0) return;
    let boundsTop: number;
    let boundsHeight: number;
    if (referenceMotionState.curveBoundsHeight > 0) {
      boundsTop = referenceMotionState.curveDocumentTop - scrollY;
      boundsHeight = referenceMotionState.curveBoundsHeight;
    } else {
      const bounds = curveSection.getBoundingClientRect();
      boundsTop = bounds.top;
      boundsHeight = bounds.height;
    }
    const entry = clamp((innerHeight - boundsTop) / Math.max(innerHeight, 1));
    currentGalleryPresence = smoothstep(0.05, 0.9, entry);
    const travel = Math.max(1, boundsHeight - innerHeight);
    currentGalleryProgress = clamp(-boundsTop / travel) * Math.max(0, galleryVisuals.length - 1);
    // Touch scrolling on the phone is native; soften only the visual stage lerp so the
    // project rail follows a swipe with a deliberate beat instead of snapping in.
    const blendRate = compactGallery ? 4.2 : 5.4;
    const blend = 1 - Math.exp(-blendRate * deltaSeconds);
    renderedGalleryProgress += (currentGalleryProgress - renderedGalleryProgress) * blend;
    renderedGalleryPresence += (currentGalleryPresence - renderedGalleryPresence) * blend;
    wallUniforms.uGallery.value = renderedGalleryPresence;
    // Keep the chamber attached to the same continuously eased project position as the card rail.
    // A separately rounded, faster palette state made the wall jump projects before the selected
    // plane had settled, which read as an unrelated flash during scroll and touch transitions.
    wallUniforms.uProject.value = renderedGalleryProgress;
    compositeUniforms.uGallery.value = renderedGalleryPresence;
    const heroExit = smoothstep(0.04, 0.3, renderedGalleryPresence);
    const galleryReveal = smoothstep(0.72, 1.0, renderedGalleryPresence);
    const galleryProgress = galleryReveal + renderedGalleryProgress;
    const galleryEntrance = Math.min(1, galleryProgress * 2);
    const galleryExit = Math.min(1, galleryVisuals.length + 1 - galleryProgress);
    const galleryVelocity = referenceMotionState.curveVelocity;
    const heroWordOpacity = heroWordBaseOpacity * (1 - heroExit);
    if (heroWordMaterial.opacity !== heroWordOpacity) heroWordMaterial.opacity = heroWordOpacity;
    const heroWordVisible = heroWordOpacity > 0;
    if (heroWord.visible !== heroWordVisible) heroWord.visible = heroWordVisible;

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
      // Keep the selected plane and the two planes crossing at mid-swipe fully readable, then
      // clear settled side planes quickly. The earlier 0.8-2.5 range left a one-step neighbour at
      // roughly 96% opacity, so dark project artwork became a pair of black slabs at the edges.
      const visibility = (1 - smoothstep(0.55, 1.45, distance)) * galleryEntrance * galleryExit;
      visual.mesh.visible = visibility > 0.002;
      galleryHasVisibleVisual ||= visual.mesh.visible;
      visual.mesh.position.set(Math.sin(offset) * 11, -offset, Math.cos(offset) * 5 - 6);
      visual.mesh.rotation.set(0, offset * 0.6, 0);
      const scale = 0.9 + (compactGallery ? 0.1 : 0.2) * (1 - Math.min(1, distance));
      visual.mesh.scale.setScalar(scale);
      if (visual.material.uniforms.uOpacity!.value !== visibility) {
        visual.material.uniforms.uOpacity!.value = visibility;
      }
      if (visual.material.uniforms.uVelocity!.value !== galleryVelocity) {
        visual.material.uniforms.uVelocity!.value = galleryVelocity;
      }
      visual.mesh.renderOrder = 30 - Math.round(distance * 4);
    });
  };

  const resize = () => {
    const width = Math.max(1, Math.round(outputCanvas.clientWidth || innerWidth));
    const height = Math.max(1, Math.round(outputCanvas.clientHeight || innerHeight));
    const pixelRatio = Math.min(devicePixelRatio, pixelRatioCap);
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
    openingBackground.resize(camera, width, height, pixelRatio);
    const desktopIdentityFit = clamp(Math.min(width / 1280, height / 820), 0.90, 1);
    responsiveIdentityScale =
      identityBaseScale *
      (width <= 820 ? clamp(camera.aspect / 0.74, 0.62, 0.94) : desktopIdentityFit);
    responsiveWordScale = width <= 820 ? clamp(camera.aspect * 1.28, 0.52, 0.64) : 1.5;
    heroWord.scale.setScalar(responsiveWordScale);
    heroWord.updateMatrix();
    galleryGroup.scale.setScalar(width <= 820 ? 0.54 : 0.6);
    galleryGroup.updateMatrix();
    const renderWidth = Math.max(1, outputCanvas.width);
    const renderHeight = Math.max(1, outputCanvas.height);
    sceneTarget.setSize(renderWidth, renderHeight);
    backgroundTarget.setSize(renderWidth, renderHeight);
    identityTarget.setSize(renderWidth, renderHeight);
    // The first retained bloom level is quarter-resolution. Threshold directly into that
    // footprint instead of paying for a full-resolution intermediate that is immediately
    // downsampled by the first blur pass.
    bloomBrightTarget.setSize(
      Math.max(1, Math.ceil(renderWidth / bloomScales[0])),
      Math.max(1, Math.ceil(renderHeight / bloomScales[0])),
    );
    bloomScales.forEach((scale, index) => {
      const bloomWidth = Math.max(1, Math.ceil(renderWidth / scale));
      const bloomHeight = Math.max(1, Math.ceil(renderHeight / scale));
      bloomVerticalTargets[index]!.setSize(bloomWidth, bloomHeight);
      bloomHorizontalTargets[index]!.setSize(bloomWidth, bloomHeight);
    });
    renderer.initRenderTarget(sceneTarget);
    renderer.initRenderTarget(backgroundTarget);
    renderer.initRenderTarget(identityTarget);
    renderer.initRenderTarget(bloomBrightTarget);
    bloomVerticalTargets.forEach((target) => renderer.initRenderTarget(target));
    bloomHorizontalTargets.forEach((target) => renderer.initRenderTarget(target));
    glassUniforms.uResolution.value.set(renderWidth, renderHeight);
    compositeUniforms.uResolution.value.set(renderWidth, renderHeight);
    fluid?.resize(width, height);
  };

  const renderReferenceBloom = () => {
    bloomQuad.material = bloomBrightMaterial;
    renderer.setRenderTarget(bloomBrightTarget);
    renderer.clear(true, false, false);
    renderer.render(bloomScene, postCamera);

    let inputTexture = bloomBrightTarget.texture;
    bloomScales.forEach((_scale, index) => {
      const verticalTarget = bloomVerticalTargets[index]!;
      const horizontalTarget = bloomHorizontalTargets[index]!;
      bloomQuad.material = bloomBlurMaterial;
      bloomBlurUniforms.uInput.value = inputTexture;
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
      inputTexture = horizontalTarget.texture;
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
    if (!worldInView || coarsePointer) return;
    const now = performance.now();
    pointer.set(event.clientX, event.clientY);
    if (!pointerInitialized) {
      previousPointer.copy(pointer);
      pointerInitialized = true;
      lastPointerTime = now;
      return;
    }
    const deltaTime = Math.max(8, now - lastPointerTime);
    const deltaX = pointer.x - previousPointer.x;
    const deltaY = pointer.y - previousPointer.y;
    const speed = Math.hypot(deltaX, deltaY) / deltaTime;
    const normalizedX = (event.clientX / Math.max(1, canvasWidth)) * 2 - 1;
    const normalizedY = -((event.clientY / Math.max(1, canvasHeight)) * 2 - 1);
    const wasPointerOverIdentity = pointerOverIdentity;
    pointerNdc.set(normalizedX, normalizedY);
    identity.updateWorldMatrix(true, true);
    raycaster.setFromCamera(pointerNdc, camera);
    pointerOverIdentity =
      renderedGalleryPresence < 0.18 && raycaster.intersectObject(identity, true).length > 0;
    hoveredGalleryVisual = galleryVisualAt(event.clientX, event.clientY);
    setCurveCursor(hoveredGalleryVisual ? 'pointer' : '');

    if (fluid) {
      fluid.update({
        x: event.clientX / Math.max(1, canvasWidth),
        y: 1 - event.clientY / Math.max(1, canvasHeight),
        deltaX: deltaX / Math.max(1, canvasWidth),
        deltaY: -deltaY / Math.max(1, canvasHeight),
        deltaTime: deltaTime / 1000,
      });
    }

    if (pointerEffectsEnabled && pointerOverIdentity && wasPointerOverIdentity && speed > 0.08) {
      const intensity = clamp(Math.pow(speed, 1.18) * 0.78, 0, 1);
      deltaEuler.set(
        clamp((deltaY / Math.max(1, canvasHeight)) * 6.6, -1.82, 1.82),
        clamp((deltaX / Math.max(1, canvasWidth)) * 7.2, -2.1, 2.1),
        clamp(((deltaX - deltaY) / Math.max(1, canvasWidth)) * 1.55, -0.46, 0.46),
      );
      deltaQuaternion.setFromEuler(deltaEuler);
      targetQuaternion.premultiply(deltaQuaternion).normalize();
      lastMotionTime = now;
      pointerEnergy = Math.max(pointerEnergy, intensity);
    }

    previousPointer.copy(pointer);
    lastPointerTime = now;
  };

  const onPointerLeave = () => {
    pointerInitialized = false;
    pointerOverIdentity = false;
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

  let gizmoDragging = false;
  const gizmoPointer = new THREE.Vector2();
  const resetOrientation = () => {
    targetQuaternion.identity();
    interactionQuaternion.identity();
    pointerEnergy = 0;
  };
  const beginGizmoDrag = (event: PointerEvent) => {
    gizmoDragging = true;
    gizmoPointer.set(event.clientX, event.clientY);
    rotationGizmo?.setPointerCapture(event.pointerId);
    if (rotationGizmo) rotationGizmo.dataset.dragging = 'true';
  };
  const moveGizmo = (event: PointerEvent) => {
    if (!gizmoDragging) return;
    const dx = event.clientX - gizmoPointer.x;
    const dy = event.clientY - gizmoPointer.y;
    deltaEuler.set(dy * 0.012, dx * 0.012, 0);
    deltaQuaternion.setFromEuler(deltaEuler);
    targetQuaternion.premultiply(deltaQuaternion).normalize();
    gizmoPointer.set(event.clientX, event.clientY);
    lastMotionTime = performance.now();
  };
  const releaseGizmo = (event: PointerEvent) => {
    if (!gizmoDragging) return;
    gizmoDragging = false;
    rotationGizmo?.releasePointerCapture(event.pointerId);
    rotationGizmo?.removeAttribute('data-dragging');
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
    if (disposed || document.hidden || !worldInView) return;
    const deltaSeconds = Math.min(0.05, Math.max(1 / 240, (time - lastFrame) / 1000));
    lastFrame = time;
    const elapsed = Math.max(0, (time - revealStart) * 0.001);
    wallUniforms.uTime.value = elapsed;
    glassUniforms.uTime.value = elapsed;
    compositeUniforms.uTime.value = elapsed;
    updateProjectScene(deltaSeconds);

    if (!coarsePointer) {
      const pointerX = pointerOverIdentity ? (pointer.x / Math.max(1, canvasWidth)) * 2 - 1 : 0;
      const pointerY = pointerOverIdentity ? -((pointer.y / Math.max(1, canvasHeight)) * 2 - 1) : 0;
      targetCamera.set(pointerX * 0.5, 0.1 + pointerY * 0.5, 10);
      if (!camera.position.equals(targetCamera)) {
        camera.position.lerp(targetCamera, 1 - Math.exp(-3 * deltaSeconds));
        camera.lookAt(0, 0, -0.2);
        camera.updateMatrix();
      }

      const idle = time - lastMotionTime > 72;
      if (idle) {
        targetQuaternion.slerp(identityQuaternion, 1 - Math.exp(-3.2 * deltaSeconds));
      }
      interactionQuaternion.slerp(targetQuaternion, 1 - Math.exp(-9 * deltaSeconds));
      pointerEnergy *= Math.pow(0.91, deltaSeconds * 60);
      if (pointerEnergy < 0.0005) pointerEnergy = 0;
    }

    const galleryIdentityStage = smoothstep(0.18, 0.55, renderedGalleryPresence);
    let identityTransformChanged = false;
    if (!coarsePointer) {
      if (renderedGalleryPresence > 0.18) targetQuaternion.identity();
      if (!appliedInteractionQuaternion.equals(interactionQuaternion)) {
        identity.quaternion.copy(identityBaseQuaternion).multiply(interactionQuaternion);
        appliedInteractionQuaternion.copy(interactionQuaternion);
        identityTransformChanged = true;
      }
    }
    const identityScale = responsiveIdentityScale * (1 - galleryIdentityStage * 0.12);
    if (appliedIdentityScale !== identityScale) {
      identity.scale.setScalar(identityScale);
      appliedIdentityScale = identityScale;
      identityTransformChanged = true;
    }
    if (identityTransformChanged) identity.updateMatrix();

    if (fluid) {
      fluid.step(deltaSeconds);
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
      renderedGalleryPresence,
      renderedGalleryProgress,
    );
    const reveal = reducedMotion ? 1 : clamp((time - revealStart) / 2600);
    compositeUniforms.uReveal.value = smoothstep(0, 1, reveal);

    // Render the expensive chamber once, then duplicate its exact color and depth buffers on the
    // GPU. The two transparent layers retain their original order: identity first, gallery last.
    renderer.setRenderTarget(sceneTarget);
    renderer.clear(true, true, false);
    renderer.render(baseScene, camera);
    renderer.copyTextureToTexture(sceneTarget.texture, backgroundTarget.texture);

    if (galleryHasVisibleVisual) {
      renderer.copyTextureToTexture(sceneDepthTexture, backgroundDepthTexture);
      renderer.setRenderTarget(backgroundTarget);
      renderer.render(galleryScene, camera);
    }
    renderer.setRenderTarget(identityTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(identityScene, camera);
    renderer.setClearColor(0x020109, 1);
    renderer.setRenderTarget(sceneTarget);
    renderer.render(identityScene, camera);
    if (galleryHasVisibleVisual) renderer.render(galleryScene, camera);
    renderReferenceBloom();
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);

    if (!coarsePointer && stateReadout) {
      const nextState =
        renderedGalleryPresence > 0.55
          ? `WORK ${String(Math.round(renderedGalleryProgress) + 1).padStart(2, '0')}`
          : pointerEnergy > 0.04
            ? 'MOVING'
            : 'REST';
      if (stateReadout.textContent !== nextState) stateReadout.textContent = nextState;
    }
    if (!coarsePointer && quaternionReadout) {
      const quaternion = interactionQuaternion;
      const nextQuaternion = `${quaternion.x.toFixed(2)} ${quaternion.y.toFixed(
        2,
      )} ${quaternion.z.toFixed(2)} ${quaternion.w.toFixed(2)}`;
      if (quaternionReadout.textContent !== nextQuaternion) {
        quaternionReadout.textContent = nextQuaternion;
      }
    }
    if (worldInView && !document.hidden) animationFrame = requestAnimationFrame(render);
  };

  const resumeRender = () => {
    if (!renderReady || disposed || animationFrame || document.hidden || !worldInView) return;
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
  renderer.initTexture(materialNoiseTexture);
  galleryVisuals.forEach((visual) => renderer.initTexture(visual.texture));
  await Promise.all([
    renderer.compileAsync(baseScene, camera),
    renderer.compileAsync(identityScene, camera),
    renderer.compileAsync(galleryScene, camera),
    renderer.compileAsync(postScene, postCamera),
  ]);
  worldElement.dataset.modelReady = 'true';
  openingElement.dataset.modelReady = 'true';
  revealStart = performance.now();
  worldElement.dataset.bootReady = 'true';
  openingElement.dataset.bootReady = 'true';
  if (boot) boot.dataset.ready = 'true';
  renderReady = true;
  resumeRender();

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
    sceneTarget.dispose();
    backgroundTarget.dispose();
    identityTarget.dispose();
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
    materialNoiseTexture.dispose();
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
    boot?.setAttribute('data-ready', 'true');
  });
}
