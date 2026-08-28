import * as THREE from 'three';

type PatternIndex = 0 | 1 | 2;

type OpeningPatternStep = {
  picture: number;
  pattern: PatternIndex;
  transition: number;
  duration: number;
};

type OpeningSymbolStep = {
  picture: number;
  mode: 0 | 1 | 2 | 3;
};

const REFERENCE_FPS = 120;
const REFERENCE_OPENING_PICTURES = 32_607;
// The reference capture begins after the live renderer has already been running. Starting the
// procedural noise clock at zero produces a green/red world that is not present in picture 1.
// A 70.5-second phase aligns the recorded cool-blue opening, the p1555 violet chapter and the
// p6245 warm-red chapter without changing the live shader's authored color math.
const REFERENCE_NOISE_TIME_OFFSET = 70.5;
const captureLayoutRaw = new URLSearchParams(location.search).get('__captureLayout');
const captureLayoutParsed = captureLayoutRaw === null ? Number.NaN : Number(captureLayoutRaw);
const captureLayoutOverride =
  Number.isInteger(captureLayoutParsed) && captureLayoutParsed >= 0 && captureLayoutParsed <= 3
    ? captureLayoutParsed
    : null;

export interface ReferenceBackgroundSystem {
  group: THREE.Group;
  noiseTexture: THREE.Texture;
  setProjectTextures: (textures: readonly THREE.Texture[]) => void;
  update: (
    elapsed: number,
    fluidTexture: THREE.Texture | null,
    galleryPresence?: number,
    projectProgress?: number,
    worksProgress?: number,
  ) => void;
  resize: (camera: THREE.PerspectiveCamera, width: number, height: number, pixelRatio: number) => void;
  debugState: () => {
    picture: number;
    pattern: PatternIndex;
    symbolMode: number;
    layoutIndex: number;
  };
  dispose: () => void;
}

const fullScreenVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const noiseFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uScreenAspectRatio;

  vec3 mod289(vec3 value) {
    return value - floor(value * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 value) {
    return value - floor(value * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 value) {
    return mod289(((value * 34.0) + 1.0) * value);
  }

  vec4 taylorInvSqrt(vec4 value) {
    return 1.79284291400159 - 0.85373472095314 * value;
  }

  float simplexNoise3D(vec3 value) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 index = floor(value + dot(value, C.yyy));
    vec3 x0 = value - index + dot(index, C.xxx);
    vec3 greater = step(x0.yzx, x0.xyz);
    vec3 lesser = 1.0 - greater;
    vec3 index1 = min(greater.xyz, lesser.zxy);
    vec3 index2 = max(greater.xyz, lesser.zxy);
    vec3 x1 = x0 - index1 + C.xxx;
    vec3 x2 = x0 - index2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    index = mod289(index);
    vec4 permutation = permute(
      permute(
        permute(index.z + vec4(0.0, index1.z, index2.z, 1.0)) +
          index.y + vec4(0.0, index1.y, index2.y, 1.0)
      ) + index.x + vec4(0.0, index1.x, index2.x, 1.0)
    );
    float inverseSeven = 0.142857142857;
    vec3 gradientScale = inverseSeven * D.wyz - D.xzx;
    vec4 j = permutation - 49.0 * floor(permutation * gradientScale.z * gradientScale.z);
    vec4 xIndex = floor(j * gradientScale.z);
    vec4 yIndex = floor(j - 7.0 * xIndex);
    vec4 x = xIndex * gradientScale.x + gradientScale.yyyy;
    vec4 y = yIndex * gradientScale.x + gradientScale.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 basis0 = vec4(x.xy, y.xy);
    vec4 basis1 = vec4(x.zw, y.zw);
    vec4 sign0 = floor(basis0) * 2.0 + 1.0;
    vec4 sign1 = floor(basis1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = basis0.xzyw + sign0.xzyw * sh.xxyy;
    vec4 a1 = basis1.xzyw + sign1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 normalization = taylorInvSqrt(
      vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3))
    );
    p0 *= normalization.x;
    p1 *= normalization.y;
    p2 *= normalization.z;
    p3 *= normalization.w;
    vec4 attenuation = max(
      0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)),
      0.0
    );
    attenuation *= attenuation;
    return 42.0 * dot(
      attenuation * attenuation,
      vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))
    );
  }

  void main() {
    float time = uTime * 0.10;
    vec2 aspectUv = vUv * vec2(uScreenAspectRatio, 1.0) - 0.5;
    vec2 noiseUv = aspectUv * 0.5;
    float warpX = simplexNoise3D(vec3(noiseUv + 1234.0, time));
    float warpY = simplexNoise3D(vec3(noiseUv + 5678.0, time + 10.0));
    vec2 warpedUv = aspectUv * 0.6 + vec2(warpX, warpY) * 0.7;
    vec4 color = vec4(0.0);
    color.r = simplexNoise3D(vec3(warpedUv + 1.0, time));
    color.g = simplexNoise3D(vec3(warpedUv + 2.0, time + 1.0));
    color.b = simplexNoise3D(vec3(warpedUv + 3.0, time + 2.0));
    color.a = simplexNoise3D(
      vec3(
        aspectUv + simplexNoise3D(vec3(noiseUv + 1234.0, time * 0.0)),
        time * 0.05 + 3.0
      )
    );
    gl_FragColor = color * 0.5 + 0.5;
  }
`;

const colorPatternFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uNoise;
  uniform float uTime;

  void main() {
    vec4 noise = texture2D(uNoise, vUv);
    vec3 color = vec3(
      smoothstep(0.5, 1.0, noise.r),
      smoothstep(0.2, 1.0, noise.g),
      smoothstep(0.0, 1.0, noise.b)
    );
    color *= vec3(0.60, 0.80, 1.20);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const binaryPatternFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uNoise;

  void main() {
    vec4 noise = texture2D(uNoise, vUv);
    float binary = step(0.5, fract(noise.a * 9.0));
    gl_FragColor = vec4(vec3(binary), 1.0);
  }
`;

const violetPatternFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uNoise;
  uniform float uTime;

  void main() {
    vec4 noise = texture2D(uNoise, vUv);
    vec3 color = vec3(0.3450980392, 0.0980392157, 0.9921568627) * vec3(0.60, 0.60, 1.0);
    color = mix(
      color,
      vec3(0.6980392157, 0.9294117647, 1.0),
      smoothstep(0.5, 0.9, noise.a)
    );
    color = mix(
      color,
      vec3(0.9921568627, 0.3725490196, 0.0470588235),
      smoothstep(0.5, 1.0, noise.g)
    );
    gl_FragColor = vec4(color, 1.0);
  }
`;

const tileVertexShader = /* glsl */ `
  precision highp float;

  attribute vec3 instancePosition;
  attribute vec2 instanceScale;
  attribute vec4 instanceId;
  attribute float instanceDepth;

  varying vec2 vUv;
  varying vec2 vGlobalUv;
  varying vec2 vScreenUv;
  varying float vFrontFace;
  varying float vEmitSide;
  varying float vPatternMix;
  varying float vBlackout;
  varying vec4 vInstanceId;
  varying vec2 vWorksUvCurrent;
  varying vec2 vWorksUvNext;
  varying float vDisplayWorks;

  uniform vec2 uScale;
  uniform float uPatternMix;
  uniform float uTransitionType;
  uniform float uBlackoutRate;
  uniform float uBlackoutSeed;
  uniform float uUvShiftRate;
  uniform float uUvShiftSeed;
  uniform float uUvShiftPower;
  uniform sampler2D uFluid;
  uniform float uWorksScroll;
  uniform float uWorksPage;
  uniform float uProjectCount;

  const float PI = 3.14159265359;

  float random(vec2 value) {
    return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
  }

  mat2 rotate2d(float radians) {
    float sine = sin(radians);
    float cosine = cos(radians);
    return mat2(cosine, sine, -sine, cosine);
  }

  void main() {
    vec3 localPosition = position;
    float transition = uPatternMix;

    if (uTransitionType < 0.5) {
      vPatternMix = step(0.5, transition);
    } else if (uTransitionType < 1.5) {
      vPatternMix = step(instanceId.x, transition);
    } else {
      float sweep = smoothstep(0.0, 1.0, -(instancePosition.x + 0.5) + transition * 2.0);
      vPatternMix = 1.0 - pow(1.0 - sweep, 3.0);
      localPosition.xz *= rotate2d(vPatternMix * PI * 2.0);
    }

    float inset = 1.0 - 0.003 * pow(2.0, instanceDepth);
    localPosition.xy *= inset;
    localPosition.xy *= instanceScale;

    vec2 globalUv = instancePosition.xy + vec2(0.5) + (uv - 0.5) * instanceScale;
    float uvSeed = floor(uUvShiftSeed * 5.0) / 5.0;
    vec2 uvShift = vec2(
      random(instanceId.xy + uvSeed),
      random(instanceId.xy + uvSeed + 10.0)
    ) - 0.5;
    float shiftGate = step(random(instanceId.xy + uvSeed), uUvShiftRate);
    uvShift *= uUvShiftPower * shiftGate;

    float blackoutSeed = floor(uBlackoutSeed * 5.0) / 5.0;
    vBlackout = step(random(instanceId.xy + blackoutSeed), uBlackoutRate);

    vec2 flatPosition = localPosition.xy + instancePosition.xy;
    vec3 screenFlatPosition = vec3(
      flatPosition.x * uScale.x,
      flatPosition.y * uScale.y,
      localPosition.z
    );
    vec4 screenClip = projectionMatrix * modelViewMatrix * vec4(screenFlatPosition * 0.5, 1.0);
    vec2 projectedScreenUv = screenClip.xy / screenClip.w * 0.5 + 0.5;
    vec2 screenUv = projectedScreenUv + uvShift;
    vec2 worksUvShift = vec2(0.0, random(instanceId.yz) - 0.5);
    float worksPage = uWorksPage;
    vWorksUvCurrent = projectedScreenUv - worksUvShift * worksPage * worksPage;
    vWorksUvCurrent.x -= worksPage * 0.5;
    float nextPage = 1.0 - worksPage;
    vWorksUvNext = projectedScreenUv - worksUvShift * nextPage * nextPage;
    vWorksUvNext.x += nextPage * 0.5;
    float displayWorks = smoothstep(
      0.0,
      0.3,
      -projectedScreenUv.x + (uWorksScroll * uProjectCount) * 1.6
    );
    float worksFadeOut = smoothstep(1.0, 0.9, uWorksScroll);
    vDisplayWorks = displayWorks * worksFadeOut;
    vEmitSide = length(texture2D(uFluid, projectedScreenUv).xy);
    float theta = flatPosition.x * PI;
    float radius = uScale.x * 0.5;
    vec3 curvedPosition = vec3(
      sin(theta) * radius,
      flatPosition.y * uScale.y * 1.5,
      -cos(theta) * radius
    );
    curvedPosition.z += localPosition.z;

    vUv = uv;
    vGlobalUv = globalUv;
    vScreenUv = screenUv;
    vFrontFace = abs(normal.z);
    vInstanceId = instanceId;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(curvedPosition, 1.0);
  }
`;

const tileFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec2 vGlobalUv;
  varying vec2 vScreenUv;
  varying float vFrontFace;
  varying float vEmitSide;
  varying float vPatternMix;
  varying float vBlackout;
  varying vec4 vInstanceId;
  varying vec2 vWorksUvCurrent;
  varying vec2 vWorksUvNext;
  varying float vDisplayWorks;

  uniform float uTime;
  uniform float uSymbolMode;
  uniform sampler2D uPatternCurrent;
  uniform sampler2D uPatternNext;
  uniform sampler2D uSymbol;
  uniform sampler2D uWordmark;
  uniform sampler2D uFluid;
  uniform float uDisplayGain;
  uniform vec3 uPaletteCalibrationCurrent;
  uniform vec3 uPaletteCalibrationNext;
  uniform float uGallery;
  uniform float uProject;
  uniform float uWorksPage;
  uniform sampler2D uProjectCurrent;
  uniform sampler2D uProjectNext;
  uniform float uProjectCurrentAspect;
  uniform float uProjectNextAspect;
  uniform float uProjectTextureReady;
  uniform float uScreenAspectRatio;
  uniform vec2 uScreenResolution;

  float random(vec2 value) {
    return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec3 rgbToHsv(vec3 color) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
    vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsvToRgb(vec3 color) {
    return (
      (clamp(abs(fract(color.x + vec3(0.0, 2.0, 1.0) / 3.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0) - 1.0) *
        color.y +
      1.0
    ) * color.z;
  }

  vec2 projectCoverUv(vec2 uv, float textureAspect) {
    if (uScreenAspectRatio < textureAspect) {
      uv.x = (uv.x - 0.5) * uScreenAspectRatio / textureAspect + 0.5;
    } else {
      uv.y = (uv.y - 0.5) / (uScreenAspectRatio / textureAspect) + 0.5;
    }
    return uv;
  }

  void main() {
    vec3 currentPattern = texture2D(uPatternCurrent, vScreenUv).rgb;
    vec3 nextPattern = texture2D(uPatternNext, vScreenUv).rgb;
    vec3 displayColor = mix(currentPattern, nextPattern, vPatternMix);
    displayColor *= 1.0 - vBlackout;

    vec2 currentProjectUv = projectCoverUv(vWorksUvCurrent, uProjectCurrentAspect);
    vec2 nextProjectUv = projectCoverUv(vWorksUvNext, uProjectNextAspect);
    vec3 currentProjectColor = texture2D(uProjectCurrent, currentProjectUv).rgb;
    vec3 nextProjectColor = texture2D(uProjectNext, nextProjectUv).rgb;
    float projectFraction = uWorksPage;
    float fragmentScreenX = gl_FragCoord.x / max(1.0, uScreenResolution.x);
    float projectBlend = smoothstep(
      fragmentScreenX - 0.03,
      fragmentScreenX + 0.03,
      projectFraction * 1.06 - 0.03
    );
    vec3 projectColor = mix(currentProjectColor, nextProjectColor, projectBlend);
    projectColor *= mix(1.0, random(gl_FragCoord.xy / 1000.0), 0.10);
    vec3 projectHsv = rgbToHsv(projectColor);
    projectColor = hsvToRgb(vec3(projectHsv.x, projectHsv.y * 2.0, projectHsv.z));
    displayColor = mix(
      displayColor,
      projectColor,
      vDisplayWorks * uProjectTextureReady
    );

    // The reference wall uses one 1204x250 identity atlas for both its isolated first glyph and
    // its full wordmark states. Keep that exact atlas aspect while drawing ANIK into it below.
    const float WORDMARK_ASPECT = 1204.0 / 250.0;
    vec2 logoUv = vGlobalUv;
    float logo = 0.0;
    if (uSymbolMode > 2.5) {
      logo = 0.0;
    } else if (uSymbolMode < 0.5) {
      logoUv -= 0.5;
      logoUv.y *= WORDMARK_ASPECT;
      logoUv += 0.5;
      vec2 tileUv = logoUv * 2.0;
      tileUv.x += sin(floor(tileUv.y) * 3.0 + uTime) * 0.1;
      logoUv = fract(tileUv) * 1.3;
      logo = texture2D(uWordmark, logoUv).a;
    } else if (uSymbolMode < 1.5) {
      logoUv -= 0.5;
      logoUv.y *= WORDMARK_ASPECT;
      logoUv *= 1.1;
      logoUv += 0.5;
      vec2 tileUv = logoUv;
      tileUv.x += uTime * 0.05 * sign(floor(tileUv.y));
      logoUv = fract(tileUv);
      if (abs(floor(tileUv.y)) < 0.5) logoUv = vec2(0.0);
      logo = texture2D(uWordmark, logoUv).a;
    } else {
      logoUv = vUv;
      logoUv -= 0.5;
      logoUv.x /= WORDMARK_ASPECT;
      logoUv += 0.5;
      logoUv.y -= uTime * 0.5 * vInstanceId.x;
      logoUv.y = fract(logoUv.y);
      logoUv -= 0.5;
      logoUv *= 1.3 + vInstanceId.z * 5.0;
      logoUv += 0.5;
      logoUv.x -= 0.38;
      if (
        logoUv.x > 0.23 || logoUv.x < 0.0 ||
        logoUv.y > 1.0 || logoUv.y < 0.0 ||
        vInstanceId.y < 0.0
      ) {
        logoUv = vec2(0.0);
      }
      logo = texture2D(uWordmark, logoUv).a;
    }
    float logoBounds =
      step(0.0, logoUv.x) * step(logoUv.x, 1.0) *
      step(0.0, logoUv.y) * step(logoUv.y, 1.0);
    float logoWeight = step(0.50, logo) * logoBounds;
    // Identity typography belongs only to the opening. Project cards and their color field take
    // over in Works; retaining repeated glyphs there made the rail look like a second homepage.
    logoWeight *= 1.0 - uGallery;
    // The production wall applies the same 0.20 identity gain in all three display modes. The
    // visibility difference comes from atlas layout, not a brighter wordmark-only multiplier.
    float logoGain = 0.20;
    float galleryLogoScale = mix(1.0, 0.30, uGallery);
    displayColor += vec3(logoWeight * logoGain * galleryLogoScale * (1.0 - vBlackout));

    displayColor *= smoothstep(1.9, 0.1, length(vUv - 0.5));

    vec2 dotUv = fract(vGlobalUv * 414.0) - 0.5;
    float dotMask = smoothstep(0.50, 0.20, length(dotUv));
    displayColor *= mix(dotMask, 1.0, 0.60) * 0.90;

    float chamberFade = smoothstep(0.55, 0.05, length(vGlobalUv - 0.5));
    displayColor *= chamberFade;

    vec3 sideColor = vec3(vEmitSide * 0.80 * (0.05 + vDisplayWorks));
    vec3 color = mix(sideColor, displayColor, vFrontFace);
    color *= mix(uDisplayGain, 0.50, uGallery);
    // Recording-space calibration is palette-specific. Applying the cool-opening balance to the
    // binary chapter turned its neutral silver panels green. Blend the source/destination
    // calibrations with the same per-tile transition used by their procedural textures.
    vec3 paletteCalibration = mix(
      uPaletteCalibrationCurrent,
      uPaletteCalibrationNext,
      vPatternMix
    );
    color *= mix(paletteCalibration, vec3(1.0), uGallery);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const gridVertexShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform vec2 uScale;

  const float PI = 3.14159265359;

  void main() {
    vec2 flatPosition = position.xy;
    float theta = flatPosition.x * PI;
    float radius = uScale.x * 0.5;
    vec3 curvedPosition = vec3(
      sin(theta) * radius,
      flatPosition.y * uScale.y * 1.5,
      -cos(theta) * radius
    );
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(curvedPosition, 1.0);
  }
`;

const gridFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uFluid;

  void main() {
    vec2 coordinate = vUv * 64.0;
    float vertical = smoothstep(0.46, 0.5, abs(fract(coordinate.x) - 0.5));
    float horizontal = smoothstep(0.46, 0.5, abs(fract(coordinate.y) - 0.5));
    float line = max(vertical, horizontal);
    vec4 fluid = texture2D(uFluid, vUv);
    vec3 color = vec3(1.0);
    color.xy -= fluid.xy * 0.005;
    gl_FragColor = vec4(color, line * 0.10);
  }
`;

const crossVertexShader = /* glsl */ `
  precision highp float;

  attribute vec2 instancePosition;
  varying vec2 vUv;
  uniform vec2 uScale;

  const float PI = 3.14159265359;

  mat2 rotate2d(float radians) {
    float sine = sin(radians);
    float cosine = cos(radians);
    return mat2(cosine, sine, -sine, cosine);
  }

  void main() {
    float theta = instancePosition.x * PI;
    float radius = uScale.x * 0.5;
    vec3 anchorPosition = vec3(
      sin(theta) * radius,
      instancePosition.y * uScale.y * 1.5,
      -cos(theta) * radius
    );
    vec3 curvedPosition = position * 0.15;
    curvedPosition.xz *= rotate2d(-theta);
    curvedPosition += anchorPosition;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(curvedPosition, 1.0);
  }
`;

const crossFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - 0.5;
    float width = 0.08;
    float cross = smoothstep(width, 0.01, abs(centered.x));
    cross = max(cross, smoothstep(width, width * 0.1, abs(centered.y)));
    gl_FragColor = vec4(vec3(1.0), cross * 0.30);
  }
`;

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createQuadtreeGeometry(seed: number, densityOffset = 0) {
  const random = createSeededRandom(seed);
  const source = new THREE.BoxGeometry(1, 1, 0.005, 4, 4, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', source.getAttribute('position').clone());
  geometry.setAttribute('uv', source.getAttribute('uv').clone());
  geometry.setAttribute('normal', source.getAttribute('normal').clone());
  if (source.index) geometry.setIndex(source.index.clone());

  const positions: number[] = [];
  const scales: number[] = [];
  const ids: number[] = [];
  const depths: number[] = [];

  const subdivide = (centerX: number, centerY: number, depth: number) => {
    const size = 1 / 2 ** depth;
    const terminal =
      (depth > 2 + densityOffset && random() < 0.5) || depth > 3 + densityOffset;
    if (terminal) {
      positions.push(centerX, centerY, 0);
      scales.push(size, size);
      ids.push(random(), random(), random(), random());
      depths.push(depth);
      return;
    }

    // Keep the reference's authored recursion order. The stochastic subdivision decision is
    // consumed between children, so transposing row and column also changes every later tile.
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const x = centerX + (row * 2 - 1) * size * 0.25;
        const y = centerY + (column * 2 - 1) * size * 0.25;
        subdivide(x, y, depth + 1);
      }
    }
  };

  subdivide(0, 0, 0);
  geometry.setAttribute(
    'instancePosition',
    new THREE.InstancedBufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    'instanceScale',
    new THREE.InstancedBufferAttribute(new Float32Array(scales), 2),
  );
  geometry.setAttribute(
    'instanceId',
    new THREE.InstancedBufferAttribute(new Float32Array(ids), 4),
  );
  geometry.setAttribute(
    'instanceDepth',
    new THREE.InstancedBufferAttribute(new Float32Array(depths), 1),
  );
  geometry.instanceCount = positions.length / 3;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -5), 24);
  source.dispose();
  return geometry;
}

function createCrossGeometry() {
  const source = new THREE.PlaneGeometry(1, 1, 1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', source.getAttribute('position').clone());
  geometry.setAttribute('uv', source.getAttribute('uv').clone());
  if (source.index) geometry.setIndex(source.index.clone());

  const positions: number[] = [];
  for (let row = 0; row <= 8; row += 1) {
    for (let column = 0; column <= 8; column += 1) {
      positions.push(column / 8 - 0.5, row / 8 - 0.5);
    }
  }
  geometry.setAttribute(
    'instancePosition',
    new THREE.InstancedBufferAttribute(new Float32Array(positions), 2),
  );
  geometry.instanceCount = positions.length / 2;
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -5), 24);
  source.dispose();
  return geometry;
}

function createIdentityTextures() {
  const createTexture = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  };

  const aPath = new Path2D(
    'M0 207.884h43.617l4.407-7.607h141.084l4.408 7.607h43.617L118.541 2.282 0 207.884Zm64.691-36.464 53.901-93.47 53.9 93.47H64.691Z',
  );
  const symbolCanvas = document.createElement('canvas');
  symbolCanvas.width = 2048;
  symbolCanvas.height = 2048;
  const symbolContext = symbolCanvas.getContext('2d');
  if (!symbolContext) throw new Error('Unable to create authored A texture');
  symbolContext.fillStyle = '#ffffff';
  const aScale = Math.min((symbolCanvas.width * 0.82) / 237.133, (symbolCanvas.height * 0.82) / 210.166);
  symbolContext.save();
  symbolContext.translate(
    (symbolCanvas.width - 237.133 * aScale) * 0.5,
    (symbolCanvas.height - 210.166 * aScale) * 0.5,
  );
  symbolContext.scale(aScale, aScale);
  symbolContext.fill(aPath, 'evenodd');
  symbolContext.restore();

  const wordCanvas = document.createElement('canvas');
  wordCanvas.width = 4096;
  wordCanvas.height = 850;
  const wordContext = wordCanvas.getContext('2d');
  if (!wordContext) throw new Error('Unable to create authored ANIK texture');
  wordContext.fillStyle = '#ffffff';
  // Preserve the authored ANIK glyph outlines, but distribute their spacing across the reference
  // atlas ratio. The first A therefore occupies the same 0.23-wide extraction region used by the
  // original wall shader instead of being replaced by an unrelated repeated-symbol texture.
  const sourceWidth = (1204 / 250) * 209;
  const sourceHeight = 209;
  const wordScale = Math.min(
    (wordCanvas.width * 0.98) / sourceWidth,
    (wordCanvas.height * 0.98) / sourceHeight,
  );
  wordContext.save();
  wordContext.translate(
    (wordCanvas.width - sourceWidth * wordScale) * 0.5,
    (wordCanvas.height - sourceHeight * wordScale) * 0.5,
  );
  wordContext.scale(wordScale, wordScale);
  wordContext.fill(aPath, 'evenodd');
  const glyphScale = 0.299423;
  const glyphBaseline = 207.884;
  const glyphs = [
    {
      x: 311.66,
      path: 'M87.965 0V686.661h138.389l340.486-373.925q9.687-8.913 23.243-24.426t27.626-31.443q14.069-15.93 23.269-27.852l6.852.035q-.591 18.834-1.452 42.977t-.861 41.413v373.221H786.68V0H650.465L308.996 377.438q-19.4 20.304-41.169 45.913t-34.186 39.79l-6.252-.034q.591-13.131 1.165-37.943t.574-55.108V0H87.965Z',
    },
    { x: 621.77, path: 'M87.965 0v686.661h147.258V0H87.965Z' },
    {
      x: 766.76,
      path: 'M87.965 0v686.661h147.258V340.174l372.025 346.487h187.788L493.368 403.904 800.688 0H617.466L387.978 309.854 235.223 182.985V0H87.965Z',
    },
  ] as const;
  glyphs.forEach((glyph) => {
    wordContext.save();
    wordContext.translate(glyph.x, glyphBaseline);
    wordContext.scale(glyphScale, -glyphScale);
    wordContext.fill(new Path2D(glyph.path));
    wordContext.restore();
  });
  wordContext.restore();

  return {
    symbolTexture: createTexture(symbolCanvas),
    wordmarkTexture: createTexture(wordCanvas),
  };
}

function createBlackTexture() {
  const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createPatternTarget(
  width = 512,
  height = 288,
  type: THREE.TextureDataType = THREE.UnsignedByteType,
) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
  target.texture.wrapS = THREE.RepeatWrapping;
  target.texture.wrapT = THREE.RepeatWrapping;
  target.texture.colorSpace = THREE.NoColorSpace;
  target.texture.generateMipmaps = false;
  return target;
}

// The production panel applies the same 0.50 output gain to all three procedural worlds. Its
// apparent OLED brightness comes later from the scene mixer, bloom and 1.30 composite—not from
// overdriving an individual palette and changing its color relationships.
const patternGains = [0.50, 0.50, 0.50] as const;
const patternPaletteCalibrations = [
  new THREE.Vector3(0.6186, 1.2032, 0.9502),
  new THREE.Vector3(1.0, 1.0, 1.0),
  new THREE.Vector3(0.6186, 1.2032, 0.9502),
] as const;

const openingDisplayGainForPicture = (picture: number, pattern: PatternIndex) => {
  // The reference's first binary layout is a deliberately bright, dense silver chapter. The
  // locally reconstructed quadtree has less illuminated coverage, so compensate only the exact
  // p302-p397 interval; p398 returns to the production 0.50 gain.
  if (picture >= 302 && picture < 398 && pattern === 1) return 0.85;
  return patternGains[pattern];
};

export function createReferenceBackgroundSystem(
  renderer: THREE.WebGLRenderer,
  noiseTimeOffset = REFERENCE_NOISE_TIME_OFFSET,
): ReferenceBackgroundSystem {
  const group = new THREE.Group();
  group.name = 'desktop-opening-background';

  const blackTexture = createBlackTexture();
  const { symbolTexture, wordmarkTexture } = createIdentityTextures();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  symbolTexture.anisotropy = anisotropy;
  wordmarkTexture.anisotropy = anisotropy;
  // The reference keeps its shared simplex field at a fixed 64x64 float target, then writes the
  // three visible procedural worlds into ordinary 8-bit targets. That deliberate clamp happens
  // before the panel's 0.50 gain and is part of its recorded palette and bloom response.
  const noiseTarget = createPatternTarget(64, 64, THREE.FloatType);
  const patternTargets = [
    createPatternTarget(),
    createPatternTarget(),
    createPatternTarget(),
  ] as const;

  const proceduralScene = new THREE.Scene();
  const proceduralCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const proceduralGeometry = new THREE.PlaneGeometry(2, 2);
  proceduralGeometry.deleteAttribute('normal');
  const noiseUniforms = {
    uTime: { value: 0 },
    uScreenAspectRatio: { value: 16 / 9 },
  };
  const noiseMaterial = new THREE.ShaderMaterial({
    uniforms: noiseUniforms,
    vertexShader: fullScreenVertexShader,
    fragmentShader: noiseFragmentShader,
    depthTest: false,
    depthWrite: false,
  });
  const colorPatternUniforms = {
    uNoise: { value: noiseTarget.texture },
    uTime: { value: 0 },
  };
  const binaryPatternUniforms = {
    uNoise: { value: noiseTarget.texture },
  };
  const violetPatternUniforms = {
    uNoise: { value: noiseTarget.texture },
    uTime: { value: 0 },
  };
  const patternMaterials = [
    new THREE.ShaderMaterial({
      uniforms: colorPatternUniforms,
      vertexShader: fullScreenVertexShader,
      fragmentShader: colorPatternFragmentShader,
      depthTest: false,
      depthWrite: false,
    }),
    new THREE.ShaderMaterial({
      uniforms: binaryPatternUniforms,
      vertexShader: fullScreenVertexShader,
      fragmentShader: binaryPatternFragmentShader,
      depthTest: false,
      depthWrite: false,
    }),
    new THREE.ShaderMaterial({
      uniforms: violetPatternUniforms,
      vertexShader: fullScreenVertexShader,
      fragmentShader: violetPatternFragmentShader,
      depthTest: false,
      depthWrite: false,
    }),
  ] as const;
  const proceduralMesh = new THREE.Mesh(proceduralGeometry, noiseMaterial);
  proceduralMesh.frustumCulled = false;
  proceduralScene.add(proceduralMesh);

  const scaleUniform = { value: new THREE.Vector2(13, 13) };
  const tileUniforms = {
    uTime: { value: 0 },
    uScale: scaleUniform,
    uPatternCurrent: { value: patternTargets[2].texture },
    uPatternNext: { value: patternTargets[2].texture },
    uPatternMix: { value: 1 },
    uTransitionType: { value: 0 },
    uSymbolMode: { value: 0 },
    uBlackoutRate: { value: 0 },
    uBlackoutSeed: { value: 0 },
    uUvShiftRate: { value: 0 },
    uUvShiftSeed: { value: 0 },
    uUvShiftPower: { value: 0 },
    uSymbol: { value: symbolTexture },
    uWordmark: { value: wordmarkTexture },
    uFluid: { value: blackTexture as THREE.Texture },
    uDisplayGain: { value: patternGains[2] as number },
    uPaletteCalibrationCurrent: { value: patternPaletteCalibrations[2].clone() },
    uPaletteCalibrationNext: { value: patternPaletteCalibrations[2].clone() },
    uGallery: { value: 0 },
    uProject: { value: 0 },
    uWorksPage: { value: 0 },
    uProjectCurrent: { value: blackTexture as THREE.Texture },
    uProjectNext: { value: blackTexture as THREE.Texture },
    uProjectCurrentAspect: { value: 16 / 9 },
    uProjectNextAspect: { value: 16 / 9 },
    uProjectTextureReady: { value: 0 },
    uWorksScroll: { value: 0 },
    uProjectCount: { value: 4 },
    uScreenAspectRatio: { value: 16 / 9 },
    uScreenResolution: { value: new THREE.Vector2(1, 1) },
  };
  const tileMaterial = new THREE.ShaderMaterial({
    uniforms: tileUniforms,
    vertexShader: tileVertexShader,
    fragmentShader: tileFragmentShader,
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: true,
  });
  const quadtreeSeeds = [0x1a2b3c4d, 0x2b3c4d5e, 0x3c4d5e6f, 0x4d5e6f70] as const;
  const quadtreeGeometries = quadtreeSeeds.map((seed) => createQuadtreeGeometry(seed));
  const mobileQuadtreeGeometries = quadtreeSeeds.map((seed) =>
    createQuadtreeGeometry(seed, 1),
  );
  const tileMesh = new THREE.Mesh(quadtreeGeometries[0], tileMaterial);
  tileMesh.name = 'quadtree-display';
  tileMesh.frustumCulled = false;
  tileMesh.renderOrder = 0;
  group.add(tileMesh);

  const gridGeometry = new THREE.PlaneGeometry(1, 1, 64, 64);
  const gridMaterial = new THREE.ShaderMaterial({
    uniforms: { uScale: scaleUniform, uFluid: tileUniforms.uFluid },
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
  gridMesh.name = 'curved-display-grid';
  gridMesh.frustumCulled = false;
  gridMesh.renderOrder = 1;
  group.add(gridMesh);

  const crossGeometry = createCrossGeometry();
  const crossMaterial = new THREE.ShaderMaterial({
    uniforms: { uScale: scaleUniform },
    vertexShader: crossVertexShader,
    fragmentShader: crossFragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const crossMesh = new THREE.Mesh(crossGeometry, crossMaterial);
  crossMesh.name = 'curved-display-crosses';
  crossMesh.frustumCulled = false;
  crossMesh.renderOrder = 2;
  group.add(crossMesh);

  let projectColorTextures: THREE.CanvasTexture[] = [];
  let activeProjectTextureIndex = -1;

  const setProjectTexturePair = (progress: number) => {
    if (projectColorTextures.length === 0) return;
    const maximumIndex = projectColorTextures.length - 1;
    const pageIndex = Math.max(0, Math.floor(progress));
    const currentIndex = Math.min(maximumIndex, Math.max(0, pageIndex - 1));
    const nextIndex = Math.min(maximumIndex, pageIndex);
    const pairKey = currentIndex * projectColorTextures.length + nextIndex;
    if (pairKey === activeProjectTextureIndex) return;
    const currentTexture = projectColorTextures[currentIndex]!;
    const nextTexture = projectColorTextures[nextIndex]!;
    tileUniforms.uProjectCurrent.value = currentTexture;
    tileUniforms.uProjectNext.value = nextTexture;
    tileUniforms.uProjectCurrentAspect.value = currentTexture.userData.projectAspect as number;
    tileUniforms.uProjectNextAspect.value = nextTexture.userData.projectAspect as number;
    activeProjectTextureIndex = pairKey;
  };

  const setProjectTextures = (textures: readonly THREE.Texture[]) => {
    projectColorTextures.forEach((texture) => texture.dispose());
    projectColorTextures = textures.map((sourceTexture) => {
      const sourceImage = sourceTexture.image as CanvasImageSource & {
        width?: number;
        height?: number;
      };
      const sourceWidth = Math.max(1, sourceImage.width ?? 16);
      const sourceHeight = Math.max(1, sourceImage.height ?? 9);
      const sourceAspect = sourceWidth / sourceHeight;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to derive project color field');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      // The production pass first resamples into a square target, then restores the original
      // aspect while the wall samples it. Cropping here would apply the cover transform twice.
      context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
      const colorTexture = new THREE.CanvasTexture(canvas);
      colorTexture.colorSpace = THREE.NoColorSpace;
      colorTexture.minFilter = THREE.LinearFilter;
      colorTexture.magFilter = THREE.LinearFilter;
      colorTexture.generateMipmaps = false;
      colorTexture.userData.projectAspect = sourceAspect;
      colorTexture.needsUpdate = true;
      return colorTexture;
    });
    activeProjectTextureIndex = -1;
    tileUniforms.uProjectCount.value = Math.max(1, projectColorTextures.length);
    tileUniforms.uProjectTextureReady.value = projectColorTextures.length > 0 ? 1 : 0;
    setProjectTexturePair(0);
  };

  let layoutIndex = 0;
  // Picture 1 is the already-running reference's violet-pattern chapter; pattern 0 is only the
  // constructor state before its immediate random change and before the recording begins.
  let currentPattern: PatternIndex = 2;
  let nextPattern: PatternIndex = 2;
  let transitionStart = 0;
  let transitionDuration = 0;
  let layoutStep = 0;
  let symbolStep = 0;
  let patternStep = 0;
  let mobileDenseLayout = false;
  // Native 2560 x 1440 / 120 fps audit of all 17,373 opening pictures; picture 17,374
  // is the first frame of the works rail.
  // Major states cut on the first changed source frame. Two recorded non-instant windows keep
  // their spatial transition instead of being flattened into the old random/skip scheduler.
  const openingPatternSequence: OpeningPatternStep[] = [
    { picture: 302, pattern: 1, transition: 0, duration: 0 },
    { picture: 709, pattern: 0, transition: 0, duration: 0 },
    { picture: 1555, pattern: 2, transition: 0, duration: 0 },
    { picture: 2049, pattern: 1, transition: 0, duration: 0 },
    { picture: 2185, pattern: 0, transition: 0, duration: 0 },
    { picture: 2377, pattern: 1, transition: 0, duration: 0 },
    { picture: 2503, pattern: 0, transition: 0, duration: 0 },
    { picture: 3023, pattern: 2, transition: 0, duration: 0 },
    { picture: 3741, pattern: 1, transition: 0, duration: 0 },
    { picture: 4128, pattern: 0, transition: 0, duration: 0 },
    { picture: 4321, pattern: 1, transition: 0, duration: 0 },
    { picture: 4626, pattern: 2, transition: 0, duration: 0 },
    { picture: 4826, pattern: 0, transition: 0, duration: 0 },
    { picture: 4975, pattern: 2, transition: 0, duration: 0 },
    { picture: 5212, pattern: 2, transition: 0, duration: 0 },
    { picture: 5373, pattern: 1, transition: 0, duration: 0 },
    { picture: 5581, pattern: 2, transition: 0, duration: 0 },
    { picture: 5783, pattern: 1, transition: 0, duration: 0 },
    { picture: 5907, pattern: 2, transition: 0, duration: 0 },
    { picture: 6044, pattern: 0, transition: 0, duration: 0 },
    { picture: 6120, pattern: 1, transition: 0, duration: 0 },
    { picture: 6245, pattern: 2, transition: 0, duration: 0 },
    { picture: 6395, pattern: 1, transition: 0, duration: 0 },
    { picture: 6539, pattern: 0, transition: 0, duration: 0 },
    { picture: 6693, pattern: 2, transition: 0, duration: 0 },
    { picture: 6878, pattern: 1, transition: 0, duration: 0 },
    { picture: 7136, pattern: 2, transition: 0, duration: 0 },
    { picture: 7446, pattern: 0, transition: 0, duration: 0 },
    { picture: 7681, pattern: 2, transition: 0, duration: 0 },
    { picture: 7840, pattern: 1, transition: 0, duration: 0 },
    { picture: 8122, pattern: 0, transition: 0, duration: 0 },
    { picture: 8729, pattern: 1, transition: 0, duration: 0 },
    { picture: 8889, pattern: 2, transition: 0, duration: 0 },
    { picture: 9053, pattern: 1, transition: 0, duration: 0 },
    { picture: 9227, pattern: 0, transition: 0, duration: 0 },
    { picture: 9349, pattern: 2, transition: 0, duration: 0 },
    { picture: 9715, pattern: 1, transition: 0, duration: 0 },
    { picture: 9947, pattern: 2, transition: 0, duration: 0 },
    { picture: 10154, pattern: 0, transition: 0, duration: 0 },
    { picture: 10286, pattern: 1, transition: 0, duration: 0 },
    { picture: 10604, pattern: 2, transition: 0, duration: 0 },
    { picture: 11103, pattern: 1, transition: 0, duration: 0 },
    { picture: 11411, pattern: 2, transition: 0, duration: 0 },
    { picture: 11713, pattern: 0, transition: 0, duration: 0 },
    { picture: 12051, pattern: 1, transition: 0, duration: 0 },
    { picture: 12188, pattern: 0, transition: 0, duration: 0 },
    { picture: 12313, pattern: 2, transition: 1, duration: 0.3 },
    { picture: 13224, pattern: 1, transition: 0, duration: 0 },
    { picture: 13433, pattern: 0, transition: 0, duration: 0 },
    { picture: 13492, pattern: 2, transition: 2, duration: 3 },
    { picture: 14416, pattern: 1, transition: 0, duration: 0 },
    { picture: 14856, pattern: 2, transition: 0, duration: 0 },
    { picture: 15693, pattern: 1, transition: 0, duration: 0 },
    { picture: 15889, pattern: 2, transition: 0, duration: 0 },
    { picture: 16029, pattern: 1, transition: 0, duration: 0 },
    { picture: 16389, pattern: 2, transition: 0, duration: 0 },
    { picture: 16805, pattern: 1, transition: 0, duration: 0 },
    { picture: 17227, pattern: 2, transition: 0, duration: 0 },
    { picture: 17430, pattern: 1, transition: 0, duration: 0 },
    { picture: 17682, pattern: 2, transition: 0, duration: 0 },
    { picture: 17698, pattern: 0, transition: 0, duration: 0 },
    { picture: 17813, pattern: 2, transition: 0, duration: 0 },
    { picture: 18015, pattern: 0, transition: 0, duration: 0 },
    { picture: 18253, pattern: 1, transition: 0, duration: 0 },
    { picture: 18643, pattern: 2, transition: 0, duration: 0 },
    { picture: 18780, pattern: 0, transition: 0, duration: 0 },
    { picture: 18959, pattern: 1, transition: 0, duration: 0 },
    { picture: 19452, pattern: 2, transition: 0, duration: 0 },
    { picture: 19784, pattern: 1, transition: 0, duration: 0 },
    { picture: 20013, pattern: 0, transition: 0, duration: 0 },
    { picture: 20145, pattern: 1, transition: 0, duration: 0 },
    { picture: 20331, pattern: 0, transition: 0, duration: 0 },
    { picture: 20457, pattern: 2, transition: 0, duration: 0 },
    { picture: 20691, pattern: 1, transition: 0, duration: 0 },
    { picture: 20980, pattern: 2, transition: 0, duration: 0 },
    { picture: 21200, pattern: 0, transition: 0, duration: 0 },
    { picture: 21439, pattern: 2, transition: 0, duration: 0 },
    { picture: 21579, pattern: 1, transition: 0, duration: 0 },
    { picture: 21731, pattern: 2, transition: 0, duration: 0 },
    { picture: 21887, pattern: 0, transition: 0, duration: 0 },
    { picture: 22308, pattern: 0, transition: 0, duration: 0 },
    { picture: 22385, pattern: 1, transition: 0, duration: 0 },
    { picture: 22646, pattern: 0, transition: 0, duration: 0 },
    { picture: 22956, pattern: 1, transition: 0, duration: 0 },
    { picture: 23313, pattern: 2, transition: 0, duration: 0 },
    { picture: 23493, pattern: 1, transition: 0, duration: 0 },
    { picture: 23649, pattern: 2, transition: 0, duration: 0 },
    { picture: 23772, pattern: 1, transition: 0, duration: 0 },
    { picture: 23940, pattern: 2, transition: 0, duration: 0 },
    { picture: 24780, pattern: 1, transition: 0, duration: 0 },
    { picture: 24947, pattern: 2, transition: 0, duration: 0 },
    { picture: 25090, pattern: 1, transition: 0, duration: 0 },
    { picture: 25210, pattern: 0, transition: 0, duration: 0 },
    { picture: 25575, pattern: 1, transition: 0, duration: 0 },
    { picture: 25795, pattern: 2, transition: 0, duration: 0 },
    { picture: 25970, pattern: 0, transition: 0, duration: 0 },
    { picture: 26296, pattern: 1, transition: 0, duration: 0 },
    { picture: 26895, pattern: 2, transition: 0, duration: 0 },
  ];
  // Exact first changed pictures for the opening's panel composition, transcribed from the
  // complete chronological reference review. Pattern cuts and in-phase panel reframes therefore
  // happen on the same 120-fps source pictures instead of the former unrelated four-second timer.
  const openingLayoutSequencePictures = [
    157, 277, 302, 398, 518, 709, 1118, 1239, 1358, 1479, 1555, 1598, 1733,
    1961, 2049, 2081, 2185, 2321, 2377, 2441, 2503, 2561, 2921, 3023, 3161, 3281,
    3401, 3521, 3641, 3741, 3762, 3882, 4002, 4128, 4321, 4482, 4626, 4722, 4826,
    4842, 4975, 5212, 5323, 5373, 5444, 5581, 5684, 5783, 5907, 6120, 6245, 6285,
    6395, 6404, 6539, 6693, 6765, 6878, 7126, 7136, 7246, 7366, 7446, 7486, 7606,
    7681, 7840, 8122, 8448, 8567, 8688, 8729, 8889, 8929, 9049, 9053, 9169, 9227,
    9288, 9349, 9408, 9479, 9715, 9947, 10009, 10129, 10154, 10249, 10286, 10370,
    10604, 10730, 10850, 10970, 11090, 11103, 11210, 11411, 11450, 11569, 11571,
    11713,
    11931, 12051, 12171, 12188, 12291, 12411, 12891, 13008, 13012, 13131, 13224,
    13433, 13492, 13585, 13612, 13747, 13853, 13960, 14093, 14213, 14333, 14416,
    14453, 14694, 14814, 14856, 14934, 15054, 15175, 15535, 15655, 15693, 15889,
    16029, 16389, 16495, 16617, 16805, 17227, 17682, 17698, 17813, 18015, 18179,
    18253, 18643, 18780, 18959, 19452, 19784, 19862, 20013, 20145, 20331, 20457,
    20691, 20980, 21439, 21579, 21731, 21887, 22025, 22308, 22385, 22646, 22956,
    23313, 23493, 23649, 23772, 23940, 24780, 24947, 25090, 25210, 25575, 25795,
    25970, 26296, 26895,
  ] as const;
  // Palette, panel geometry and the identity motif are independent in the reference. Do not
  // rotate the motif merely because the panel quadtree reframed: that created unrelated ANIK/A
  // swaps and made the sequence visibly drift from the recorded 120-fps chronology.
  const openingSymbolSequence: OpeningSymbolStep[] = [
    // The recording begins in the broad/global ANIK wordmark state. Picture 37 changes to the
    // staggered word rows, and picture 277 is the first repeated-symbol state.
    { picture: 1, mode: 0 },
    { picture: 37, mode: 1 },
    { picture: 277, mode: 2 },
    { picture: 709, mode: 2 },
    { picture: 1358, mode: 3 },
    { picture: 1598, mode: 2 },
    { picture: 1961, mode: 3 },
    { picture: 2049, mode: 1 },
    { picture: 2185, mode: 3 },
    { picture: 2561, mode: 2 },
    { picture: 3023, mode: 3 },
    { picture: 3281, mode: 2 },
    { picture: 3741, mode: 1 },
    { picture: 4128, mode: 3 },
    { picture: 4321, mode: 1 },
    { picture: 4626, mode: 3 },
    { picture: 4722, mode: 2 },
    { picture: 4826, mode: 3 },
    { picture: 4842, mode: 2 },
    { picture: 5212, mode: 3 },
    { picture: 5323, mode: 2 },
    { picture: 5373, mode: 1 },
    { picture: 5581, mode: 3 },
    { picture: 5783, mode: 1 },
    { picture: 5907, mode: 2 },
    { picture: 6044, mode: 3 },
    { picture: 6120, mode: 1 },
    { picture: 6245, mode: 2 },
    { picture: 6878, mode: 1 },
    { picture: 7136, mode: 3 },
    { picture: 7486, mode: 1 },
    { picture: 7606, mode: 3 },
    { picture: 7840, mode: 1 },
    { picture: 8122, mode: 3 },
    { picture: 8448, mode: 2 },
    { picture: 8567, mode: 3 },
    { picture: 8729, mode: 1 },
    { picture: 9169, mode: 2 },
    { picture: 9349, mode: 3 },
    { picture: 9715, mode: 1 },
    { picture: 9947, mode: 3 },
    { picture: 10009, mode: 2 },
    { picture: 10249, mode: 1 },
    { picture: 10604, mode: 3 },
    { picture: 10850, mode: 2 },
    { picture: 10970, mode: 3 },
    { picture: 11210, mode: 1 },
    { picture: 11411, mode: 3 },
    { picture: 11901, mode: 2 },
    { picture: 12051, mode: 1 },
    { picture: 12188, mode: 2 },
    { picture: 13012, mode: 1 },
    { picture: 13101, mode: 3 },
    { picture: 13224, mode: 1 },
    { picture: 13433, mode: 3 },
    { picture: 13747, mode: 3 },
    { picture: 13853, mode: 2 },
    { picture: 14416, mode: 1 },
    { picture: 14856, mode: 3 },
    { picture: 15693, mode: 1 },
    { picture: 15889, mode: 3 },
    { picture: 16029, mode: 1 },
    { picture: 16389, mode: 3 },
    { picture: 16805, mode: 1 },
    { picture: 17227, mode: 3 },
    { picture: 17430, mode: 2 },
  ];
  // Picture 17,374 is the first frame where the reference leaves the opening for the works rail.
  // Keep the complete opening chronology alive when somebody remains at the top of the page;
  // otherwise the finite forensic schedule would stop on its final palette and look frozen.
  const openingLoopDuration = REFERENCE_OPENING_PICTURES / REFERENCE_FPS;
  let previousOpeningElapsed = 0;
  let previousProjectElapsed = 0;
  let renderedProjectProgress = 0;
  const beginPatternChange = (
    elapsed: number,
    pattern: PatternIndex,
    transition: number,
    duration: number,
  ) => {
    currentPattern = nextPattern;
    nextPattern = pattern;
    tileUniforms.uPatternCurrent.value = patternTargets[currentPattern].texture;
    tileUniforms.uPatternNext.value = patternTargets[nextPattern].texture;
    tileUniforms.uPaletteCalibrationCurrent.value.copy(
      patternPaletteCalibrations[currentPattern],
    );
    tileUniforms.uPaletteCalibrationNext.value.copy(patternPaletteCalibrations[nextPattern]);
    tileUniforms.uPatternMix.value = duration === 0 ? 1 : 0;
    tileUniforms.uTransitionType.value = transition;
    tileUniforms.uDisplayGain.value = patternGains[pattern];
    transitionStart = elapsed;
    transitionDuration = duration;
  };

  const resetOpeningTimeline = () => {
    layoutIndex = 0;
    currentPattern = 2;
    nextPattern = 2;
    transitionStart = 0;
    transitionDuration = 0;
    patternStep = 0;
    layoutStep = 0;
    symbolStep = 0;
    tileUniforms.uPatternCurrent.value = patternTargets[2].texture;
    tileUniforms.uPatternNext.value = patternTargets[2].texture;
    tileUniforms.uPaletteCalibrationCurrent.value.copy(patternPaletteCalibrations[2]);
    tileUniforms.uPaletteCalibrationNext.value.copy(patternPaletteCalibrations[2]);
    tileUniforms.uPatternMix.value = 1;
    tileUniforms.uTransitionType.value = 0;
    tileUniforms.uSymbolMode.value = openingSymbolSequence[0]!.mode;
    tileUniforms.uBlackoutRate.value = 0;
    tileUniforms.uBlackoutSeed.value = 0;
    tileUniforms.uUvShiftRate.value = 0;
    tileUniforms.uUvShiftSeed.value = 0;
    tileUniforms.uUvShiftPower.value = 0;
    tileUniforms.uDisplayGain.value = patternGains[2];
    const activeGeometries = mobileDenseLayout ? mobileQuadtreeGeometries : quadtreeGeometries;
    tileMesh.geometry = activeGeometries[0]!;
  };

  const renderNoiseTarget = (elapsed: number) => {
    const proceduralElapsed = elapsed + noiseTimeOffset;
    const previousTarget = renderer.getRenderTarget();
    noiseUniforms.uTime.value = proceduralElapsed;
    proceduralMesh.material = noiseMaterial;
    renderer.setRenderTarget(noiseTarget);
    renderer.render(proceduralScene, proceduralCamera);
    renderer.setRenderTarget(previousTarget);
  };

  const renderPatternTargets = (elapsed: number) => {
    const proceduralElapsed = elapsed + noiseTimeOffset;
    const previousTarget = renderer.getRenderTarget();
    colorPatternUniforms.uTime.value = proceduralElapsed;
    violetPatternUniforms.uTime.value = proceduralElapsed;

    const renderPattern = (index: PatternIndex) => {
      proceduralMesh.material = patternMaterials[index];
      renderer.setRenderTarget(patternTargets[index]);
      renderer.render(proceduralScene, proceduralCamera);
    };
    renderPattern(nextPattern);
    if (currentPattern !== nextPattern && tileUniforms.uPatternMix.value < 1) {
      renderPattern(currentPattern);
    }
    renderer.setRenderTarget(previousTarget);
  };

  const update = (
    elapsed: number,
    fluidTexture: THREE.Texture | null,
    galleryPresence = 0,
    _projectProgress = 0,
    worksProgress = 0,
  ) => {
    elapsed %= openingLoopDuration;
    if (elapsed < previousOpeningElapsed) resetOpeningTimeline();
    previousOpeningElapsed = elapsed;
    // Drive discrete reference events from the 120-fps picture index. Comparing two separately
    // rounded floating-point timestamps delayed the p518 layout change until p519 in native proof.
    const openingPicture = Math.min(
      REFERENCE_OPENING_PICTURES,
      Math.floor(elapsed * REFERENCE_FPS + 0.0001) + 1,
    );
    tileUniforms.uTime.value = elapsed + noiseTimeOffset;
    tileUniforms.uFluid.value = fluidTexture ?? blackTexture;
    tileUniforms.uGallery.value = THREE.MathUtils.clamp(galleryPresence, 0, 1);
    const projectDelta = elapsed >= previousProjectElapsed
      ? THREE.MathUtils.clamp(elapsed - previousProjectElapsed, 0, 1 / 30)
      : 0;
    previousProjectElapsed = elapsed;
    const projectTarget =
      THREE.MathUtils.clamp(worksProgress, 0, 1) * (projectColorTextures.length + 1);
    renderedProjectProgress +=
      (projectTarget - renderedProjectProgress) * Math.min(1, projectDelta * 7);
    const clampedProjectProgress = THREE.MathUtils.clamp(
      renderedProjectProgress - 1,
      0,
      Math.max(0, projectColorTextures.length - 1),
    );
    tileUniforms.uProject.value = clampedProjectProgress;
    tileUniforms.uWorksScroll.value = THREE.MathUtils.clamp(worksProgress, 0, 1);
    tileUniforms.uWorksPage.value = THREE.MathUtils.euclideanModulo(renderedProjectProgress, 1);
    setProjectTexturePair(renderedProjectProgress);

    while (
      patternStep < openingPatternSequence.length &&
      openingPicture >= openingPatternSequence[patternStep]!.picture
    ) {
      const step = openingPatternSequence[patternStep]!;
      patternStep += 1;
      const stepTime = (step.picture - 1) / REFERENCE_FPS;
      beginPatternChange(
        stepTime,
        step.pattern,
        step.transition,
        step.duration,
      );
    }

    if (transitionDuration > 0) {
      const progress = THREE.MathUtils.clamp(
        (elapsed - transitionStart) / transitionDuration,
        0,
        1,
      );
      tileUniforms.uPatternMix.value = progress;
    }

    while (
      layoutStep < openingLayoutSequencePictures.length &&
      openingPicture >= openingLayoutSequencePictures[layoutStep]!
    ) {
      layoutIndex = (layoutIndex + 1) % quadtreeGeometries.length;
      layoutStep += 1;
      const activeGeometries = mobileDenseLayout
        ? mobileQuadtreeGeometries
        : quadtreeGeometries;
      tileMesh.geometry = activeGeometries[layoutIndex] ?? activeGeometries[0]!;
    }
    if (captureLayoutOverride !== null) {
      const activeGeometries = mobileDenseLayout
        ? mobileQuadtreeGeometries
        : quadtreeGeometries;
      tileMesh.geometry = activeGeometries[captureLayoutOverride] ?? activeGeometries[0]!;
    }

    tileUniforms.uDisplayGain.value = openingDisplayGainForPicture(
      openingPicture,
      nextPattern,
    );
    while (
      symbolStep < openingSymbolSequence.length &&
      openingPicture >= openingSymbolSequence[symbolStep]!.picture
    ) {
      tileUniforms.uSymbolMode.value = openingSymbolSequence[symbolStep]!.mode;
      symbolStep += 1;
    }

    // The source site drives these two effects from independent random timers. Re-running those
    // timers invents new panel blackouts and UV jumps that are absent from the locked recording
    // (for example the former p21/p24/p32 discontinuities). Hold the exact settled seeded state
    // measured at p36 between the picture-indexed pattern/layout/identity events above. Pattern 0
    // has no blackout or UV-shift effect in the production parameter set.
    const stochasticPattern = nextPattern === 0 ? 0 : 1;
    // The first binary chapter contains materially more illuminated wall area than the settled
    // stochastic state used by the later monochrome chapters. Reusing the 29% blackout here made
    // p302 about twelve percentage points too dark even after its luminance matched. Correct the
    // coverage only for the exact p302-p397 interval; p398 returns to the recorded settled state.
    const openingBlackoutRate =
      openingPicture >= 302 && openingPicture < 398 && nextPattern === 1
        ? 0.12
        : 0.2909043020;
    tileUniforms.uBlackoutRate.value = openingBlackoutRate * stochasticPattern;
    tileUniforms.uBlackoutSeed.value = 0.3519695295 * stochasticPattern;
    tileUniforms.uUvShiftRate.value = 0.50 * stochasticPattern;
    tileUniforms.uUvShiftPower.value = 0.1749866440 * stochasticPattern;
    tileUniforms.uUvShiftSeed.value = 0.9130476599 * stochasticPattern;

    // The noise field and active 512x288 pattern must both advance in Works. Project colors only
    // tint the authored wall; freezing the active pattern here erased the recorded monochrome and
    // color cuts after the rail entered, making the chamber appear stuck.
    renderNoiseTarget(elapsed);
    renderPatternTargets(elapsed);
  };

  const resize = (
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    pixelRatio: number,
  ) => {
    const distance = Math.abs(camera.position.z);
    const frustumHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const frustumWidth = frustumHeight * camera.aspect;
    const scale = Math.max(frustumWidth, frustumHeight);
    scaleUniform.value.set(scale, scale);

    mobileDenseLayout = width <= 820;
    const activeGeometries = mobileDenseLayout ? mobileQuadtreeGeometries : quadtreeGeometries;
    tileMesh.geometry = activeGeometries[layoutIndex] ?? activeGeometries[0]!;

    noiseUniforms.uScreenAspectRatio.value = width / height;
    tileUniforms.uScreenAspectRatio.value = width / height;
    tileUniforms.uScreenResolution.value.set(
      Math.max(1, Math.round(width * pixelRatio)),
      Math.max(1, Math.round(height * pixelRatio)),
    );
    // Match the production panel's deliberate resolution ladder: the slowly varying color field
    // is 30% of the half-resolution panel and binary/violet worlds are 80%. Shared noise remains
    // fixed at 64x64 exactly as authored.
    const colorWidth = Math.max(1, Math.round(width * pixelRatio * 0.15));
    const colorHeight = Math.max(1, Math.round(height * pixelRatio * 0.15));
    const displayWidth = Math.max(1, Math.round(width * pixelRatio * 0.40));
    const displayHeight = Math.max(1, Math.round(height * pixelRatio * 0.40));
    patternTargets[0].setSize(colorWidth, colorHeight);
    patternTargets[1].setSize(displayWidth, displayHeight);
    patternTargets[2].setSize(displayWidth, displayHeight);
  };

  const dispose = () => {
    group.remove(tileMesh, gridMesh, crossMesh);
    quadtreeGeometries.forEach((geometry) => geometry.dispose());
    mobileQuadtreeGeometries.forEach((geometry) => geometry.dispose());
    tileMaterial.dispose();
    gridGeometry.dispose();
    gridMaterial.dispose();
    crossGeometry.dispose();
    crossMaterial.dispose();
    proceduralGeometry.dispose();
    noiseMaterial.dispose();
    patternMaterials.forEach((material) => material.dispose());
    noiseTarget.dispose();
    patternTargets.forEach((target) => target.dispose());
    symbolTexture.dispose();
    wordmarkTexture.dispose();
    projectColorTextures.forEach((texture) => texture.dispose());
    blackTexture.dispose();
  };

  const debugState = () => ({
    picture: Math.floor(previousOpeningElapsed * REFERENCE_FPS) + 1,
    pattern: nextPattern,
    symbolMode: tileUniforms.uSymbolMode.value,
    layoutIndex,
  });

  return {
    group,
    noiseTexture: noiseTarget.texture,
    setProjectTextures,
    update,
    resize,
    debugState,
    dispose,
  };
}
