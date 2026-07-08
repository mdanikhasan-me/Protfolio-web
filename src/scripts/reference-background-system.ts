import * as THREE from 'three';

type PatternIndex = 0 | 1 | 2;

type OpeningPatternStep = {
  at: number;
  pattern: PatternIndex;
  transition: number;
  duration: number;
  palette?: number;
};

export interface ReferenceBackgroundSystem {
  group: THREE.Group;
  update: (
    elapsed: number,
    fluidTexture: THREE.Texture | null,
    galleryPresence?: number,
    projectProgress?: number,
  ) => void;
  resize: (camera: THREE.PerspectiveCamera, width: number, height: number, pixelRatio: number) => void;
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
  uniform float uPaletteMode;

  void main() {
    vec4 noise = texture2D(uNoise, vUv);
    vec3 leftColor = vec3(0.035, 0.30, 0.62);
    vec3 rightColor = vec3(0.035, 0.46, 0.16);
    vec3 upperColor = vec3(0.18, 0.24, 0.28);
    float upperStrength = 0.18;
    if (uPaletteMode > 0.5 && uPaletteMode < 1.5) {
      leftColor = vec3(0.028, 0.16, 0.60);
      rightColor = vec3(0.035, 0.48, 0.54);
      upperColor = vec3(0.22, 0.28, 0.38);
    } else if (uPaletteMode >= 1.5 && uPaletteMode < 2.5) {
      leftColor = vec3(0.46, 0.075, 0.15);
      rightColor = vec3(0.19, 0.085, 0.54);
      upperColor = vec3(0.30, 0.25, 0.36);
    } else if (uPaletteMode >= 2.5) {
      leftColor = vec3(0.055, 0.18, 0.58);
      rightColor = vec3(0.035, 0.46, 0.18);
      upperColor = vec3(0.48, 0.075, 0.30);
      upperStrength = 0.48;
    }
    float horizontalMix = smoothstep(0.08, 0.92, vUv.x + (noise.a - 0.5) * 0.10);
    float signal = 0.54 + noise.b * 0.28 + noise.r * 0.10;
    float pulse = 0.94 + sin(uTime * 0.16 + noise.a * 3.14159) * 0.06;
    vec3 color = mix(leftColor, rightColor, horizontalMix) * signal * pulse;
    float upperField = smoothstep(0.46, 0.96, vUv.y) * (upperStrength + noise.g * 0.12);
    color = mix(color, upperColor * (0.58 + noise.r * 0.24), upperField);
    float highlight = smoothstep(0.74, 0.98, noise.a) * 0.16;
    color = mix(color, color * 1.36 + vec3(0.035, 0.055, 0.075), highlight);
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
    float soft = smoothstep(0.42, 0.62, noise.g) * 0.18;
    gl_FragColor = vec4(vec3(binary * 0.88 + soft), 1.0);
  }
`;

const violetPatternFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uNoise;
  uniform float uTime;
  uniform float uPaletteMode;

  void main() {
    vec4 noise = texture2D(uNoise, vUv);
    vec3 leftColor = vec3(0.025, 0.14, 0.50);
    vec3 rightColor = vec3(0.27, 0.075, 0.62);
    vec3 upperColor = vec3(0.15, 0.19, 0.30);
    if (uPaletteMode > 0.5 && uPaletteMode < 1.5) {
      leftColor = vec3(0.21, 0.085, 0.50);
      rightColor = vec3(0.31, 0.36, 0.46);
      upperColor = vec3(0.25, 0.28, 0.35);
    } else if (uPaletteMode >= 1.5 && uPaletteMode < 2.5) {
      leftColor = vec3(0.46, 0.075, 0.15);
      rightColor = vec3(0.19, 0.085, 0.54);
      upperColor = vec3(0.31, 0.22, 0.34);
    } else if (uPaletteMode >= 2.5) {
      leftColor = vec3(0.16, 0.075, 0.54);
      rightColor = vec3(0.58, 0.12, 0.055);
      upperColor = vec3(0.28, 0.22, 0.36);
    }
    float horizontalMix = smoothstep(0.06, 0.94, vUv.x + (noise.g - 0.5) * 0.12);
    float signal = 0.50 + noise.b * 0.26 + noise.a * 0.10;
    float pulse = 0.94 + sin(uTime * 0.14 + noise.r * 3.14159) * 0.06;
    vec3 color = mix(leftColor, rightColor, horizontalMix) * signal * pulse;
    float upperField = smoothstep(0.56, 0.96, vUv.y) * (0.18 + noise.r * 0.14);
    color = mix(color, upperColor * (0.58 + noise.b * 0.25), upperField);
    float coolHighlight = smoothstep(0.78, 0.98, noise.a) * 0.18;
    color = mix(color, color * 1.30 + vec3(0.035, 0.050, 0.085), coolHighlight);
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
  varying float vPatternMix;
  varying float vBlackout;
  varying vec4 vInstanceId;

  uniform vec2 uScale;
  uniform float uPatternMix;
  uniform float uTransitionType;
  uniform float uBlackoutRate;
  uniform float uBlackoutSeed;
  uniform float uUvShiftRate;
  uniform float uUvShiftSeed;
  uniform float uUvShiftPower;

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
      random(instanceId.yz + uvSeed + 10.0)
    ) - 0.5;
    float shiftGate = step(random(instanceId.xy + uvSeed + 4.0), uUvShiftRate);
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
    vec2 screenUv = screenClip.xy / screenClip.w * 0.5 + 0.5 + uvShift;
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
  varying float vPatternMix;
  varying float vBlackout;
  varying vec4 vInstanceId;

  uniform float uTime;
  uniform float uSymbolMode;
  uniform sampler2D uPatternCurrent;
  uniform sampler2D uPatternNext;
  uniform sampler2D uSymbol;
  uniform sampler2D uWordmark;
  uniform sampler2D uFluid;
  uniform float uDisplayGain;
  uniform float uGallery;
  uniform float uProject;

  vec3 projectPaletteLeft(float index) {
    // Project order: Boilabin, SoctuKit, UIU Bot, Salty Potato AI.
    if (index < 0.5) return vec3(0.38, 0.24, 0.15);
    if (index < 1.5) return vec3(0.08, 0.10, 0.15);
    if (index < 2.5) return vec3(0.06, 0.20, 0.48);
    return vec3(0.38, 0.16, 0.045);
  }

  vec3 projectPaletteRight(float index) {
    if (index < 0.5) return vec3(0.04, 0.24, 0.56);
    if (index < 1.5) return vec3(0.06, 0.24, 0.58);
    if (index < 2.5) return vec3(0.42, 0.22, 0.055);
    return vec3(0.045, 0.20, 0.50);
  }

  void main() {
    vec3 currentPattern = texture2D(uPatternCurrent, vScreenUv).rgb;
    vec3 nextPattern = texture2D(uPatternNext, vScreenUv).rgb;
    vec3 displayColor = mix(currentPattern, nextPattern, vPatternMix);
    float tilePaletteMix = fract(
      sin(dot(vInstanceId.xy, vec2(12.9898, 78.233))) * 43758.5453
    );
    // Retain a sparse set of stable dark panels for depth without letting the gallery inherit
    // the broad black slabs visible in the earlier recording. tilePaletteMix is seeded per panel,
    // so this remains spatially stable while reducing the expected blackout share from 16% to 8%.
    float stableProjectBlackout = step(0.92, tilePaletteMix);
    float effectiveBlackout = mix(vBlackout, stableProjectBlackout, uGallery);
    displayColor *= 1.0 - effectiveBlackout;

    float projectIndex = clamp(uProject, 0.0, 3.0);
    float projectBase = floor(projectIndex);
    float projectBlend = smoothstep(0.18, 0.82, fract(projectIndex));
    vec3 projectLeft = mix(
      projectPaletteLeft(projectBase),
      projectPaletteLeft(min(projectBase + 1.0, 3.0)),
      projectBlend
    );
    vec3 projectRight = mix(
      projectPaletteRight(projectBase),
      projectPaletteRight(min(projectBase + 1.0, 3.0)),
      projectBlend
    );
    float spatialPaletteMix = smoothstep(0.06, 0.94, vGlobalUv.x);
    vec3 projectTint = mix(
      projectLeft,
      projectRight,
      mix(spatialPaletteMix, tilePaletteMix, 0.10)
    );
    float stablePanelLight = 0.70 + tilePaletteMix * 0.14 + spatialPaletteMix * 0.10;
    vec3 projectColor = projectTint * stablePanelLight;
    projectColor = mix(projectColor, displayColor * 1.04, 0.01);
    float projectLuma = dot(projectColor, vec3(0.2126, 0.7152, 0.0722));
    projectColor = mix(vec3(projectLuma), projectColor, 1.45) * 1.22;
    projectColor *= 1.0 - effectiveBlackout;
    displayColor = mix(displayColor, projectColor, uGallery * 0.98);

    const float WORDMARK_ASPECT = 787.842 / 209.0;
    vec2 logoUv = vGlobalUv;
    float logo = 0.0;
    if (uSymbolMode < 0.5) {
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
      tileUv.x += uTime * 0.05;
      logoUv = fract(tileUv);
      if (abs(floor(tileUv.y)) < 0.5) logoUv = vec2(0.0);
      logo = texture2D(uWordmark, logoUv).a;
    } else {
      logoUv = vUv;
      logoUv.y -= uTime * 0.5 * vInstanceId.x;
      logoUv.y = fract(logoUv.y);
      logoUv -= 0.5;
      logoUv *= 1.3 + vInstanceId.z * 5.0;
      logoUv += 0.5;
      logo = texture2D(uSymbol, logoUv).a;
      if (vInstanceId.y < 0.0) logo = 0.0;
    }
    float logoBounds =
      step(0.0, logoUv.x) * step(logoUv.x, 1.0) *
      step(0.0, logoUv.y) * step(logoUv.y, 1.0);
    float logoWeight = smoothstep(0.10, 0.86, logo) * logoBounds;
    vec2 galleryLogoUv = (vUv - 0.5) * 1.35 + 0.5;
    float galleryLogoBounds =
      step(0.0, galleryLogoUv.x) * step(galleryLogoUv.x, 1.0) *
      step(0.0, galleryLogoUv.y) * step(galleryLogoUv.y, 1.0);
    float galleryLogoWeight =
      smoothstep(0.10, 0.86, texture2D(uSymbol, galleryLogoUv).a) * galleryLogoBounds;
    logoWeight = mix(logoWeight, galleryLogoWeight, uGallery);
    float galleryLogoScale = mix(1.0, 0.30, uGallery);
    displayColor += vec3(logoWeight * 0.28 * galleryLogoScale * (1.0 - effectiveBlackout));

    vec2 dotUv = fract(vGlobalUv * 414.0) - 0.5;
    float dotMask = smoothstep(0.50, 0.20, length(dotUv));
    displayColor *= mix(dotMask, 1.0, 0.62) * 0.90;

    float chamberFade = smoothstep(0.58, 0.04, length(vGlobalUv - 0.5));
    displayColor *= chamberFade;

    vec2 fluidVelocity = texture2D(uFluid, clamp(vGlobalUv, 0.0, 1.0)).xy;
    float fluidEnergy = clamp(length(fluidVelocity) * 3.2, 0.0, 1.0);
    vec3 sideColor = vec3(0.02, 0.08, 0.12) + fluidEnergy * vec3(0.18, 0.62, 0.82);
    sideColor = mix(sideColor, projectTint * 0.32, uGallery);
    vec3 color = mix(sideColor, displayColor, vFrontFace);
    color *= mix(uDisplayGain, 0.50, uGallery);
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
    float radius = uScale.x * 0.5 - 0.010;
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

  void main() {
    vec2 coordinate = vUv * 64.0;
    vec2 distanceToLine = min(fract(coordinate), 1.0 - fract(coordinate));
    vec2 antialias = fwidth(coordinate) * 0.92;
    float vertical = 1.0 - smoothstep(0.0, antialias.x, distanceToLine.x);
    float horizontal = 1.0 - smoothstep(0.0, antialias.y, distanceToLine.y);
    float line = max(vertical, horizontal);
    float edgeFade = smoothstep(0.58, 0.08, length(vUv - 0.5));
    gl_FragColor = vec4(vec3(0.48, 0.58, 0.64), line * 0.24 * edgeFade);
  }
`;

const crossVertexShader = /* glsl */ `
  precision highp float;

  attribute vec2 instancePosition;
  varying vec2 vUv;
  uniform vec2 uScale;

  const float PI = 3.14159265359;

  void main() {
    vec2 flatPosition = instancePosition + position.xy * 0.006;
    float theta = flatPosition.x * PI;
    float radius = uScale.x * 0.5 - 0.018;
    vec3 curvedPosition = vec3(
      sin(theta) * radius,
      flatPosition.y * uScale.y * 1.5,
      -cos(theta) * radius
    );
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(curvedPosition, 1.0);
  }
`;

const crossFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  void main() {
    vec2 centered = abs(vUv - 0.5);
    float horizontal = (1.0 - smoothstep(0.055, 0.12, centered.y)) *
      (1.0 - smoothstep(0.28, 0.48, centered.x));
    float vertical = (1.0 - smoothstep(0.055, 0.12, centered.x)) *
      (1.0 - smoothstep(0.28, 0.48, centered.y));
    float cross = max(horizontal, vertical);
    gl_FragColor = vec4(vec3(0.66, 0.74, 0.78), cross * 0.10);
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
  const source = new THREE.BoxGeometry(1, 1, 0.006, 4, 4, 1);
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

    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const x = centerX + (column * 2 - 1) * size * 0.25;
        const y = centerY + (row * 2 - 1) * size * 0.25;
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
  for (let row = 1; row < 10; row += 1) {
    for (let column = 1; column < 10; column += 1) {
      positions.push(column / 10 - 0.5, row / 10 - 0.5);
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
  wordCanvas.height = 1088;
  const wordContext = wordCanvas.getContext('2d');
  if (!wordContext) throw new Error('Unable to create authored ANIK texture');
  wordContext.fillStyle = '#ffffff';
  const sourceWidth = 787.842;
  const sourceHeight = 209;
  const wordScale = Math.min(
    (wordCanvas.width * 0.94) / sourceWidth,
    (wordCanvas.height * 0.84) / sourceHeight,
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

function createPatternTarget(width = 512, height = 288) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  target.texture.generateMipmaps = false;
  return target;
}

const patternParams = [
  { blackout: 0, uvShift: 0, uvIntervalMin: 1.0, uvIntervalRange: 0 },
  { blackout: 0.44, uvShift: 0.50, uvIntervalMin: 0.10, uvIntervalRange: 5.0 },
  { blackout: 0.22, uvShift: 0.32, uvIntervalMin: 0.10, uvIntervalRange: 5.0 },
] as const;

const patternGains = [1.15, 1.15, 1.15] as const;

export function createReferenceBackgroundSystem(
  renderer: THREE.WebGLRenderer,
): ReferenceBackgroundSystem {
  const random = createSeededRandom(0x0a11ce26);
  const group = new THREE.Group();
  group.name = 'desktop-opening-background';

  const blackTexture = createBlackTexture();
  const { symbolTexture, wordmarkTexture } = createIdentityTextures();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  symbolTexture.anisotropy = anisotropy;
  wordmarkTexture.anisotropy = anisotropy;
  const noiseTarget = createPatternTarget(64, 64);
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
    uPaletteMode: { value: 0 },
  };
  const binaryPatternUniforms = {
    uNoise: { value: noiseTarget.texture },
  };
  const violetPatternUniforms = {
    uNoise: { value: noiseTarget.texture },
    uTime: { value: 0 },
    uPaletteMode: { value: 0 },
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
    uBlackoutRate: { value: 0.18 },
    uBlackoutSeed: { value: 0.21 },
    uUvShiftRate: { value: 0.14 },
    uUvShiftSeed: { value: 0.37 },
    uUvShiftPower: { value: 0 },
    uSymbol: { value: symbolTexture },
    uWordmark: { value: wordmarkTexture },
    uFluid: { value: blackTexture as THREE.Texture },
    uDisplayGain: { value: patternGains[2] as number },
    uGallery: { value: 0 },
    uProject: { value: 0 },
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
    uniforms: { uScale: scaleUniform },
    vertexShader: gridVertexShader,
    fragmentShader: gridFragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const crossMesh = new THREE.Mesh(crossGeometry, crossMaterial);
  crossMesh.name = 'curved-display-crosses';
  crossMesh.frustumCulled = false;
  crossMesh.renderOrder = 2;
  group.add(crossMesh);

  let layoutIndex = 0;
  let currentPattern: PatternIndex = 2;
  let nextPattern: PatternIndex = 2;
  let transitionStart = 0;
  let transitionDuration = 0;
  let nextLayoutAt = 4;
  let nextBlackoutAt = 0.8;
  let nextUvShiftAt = 0.4;
  let introStep = 0;
  let mobileDenseLayout = false;
  const openingPatternSequence: OpeningPatternStep[] = [
    { at: 2.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 5.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 12.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 17.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 18.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 19.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 20.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 25.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 29.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 31.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 34.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 35.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 38.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 40.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 41.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 42.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 43.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 44.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 46.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 48.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 49.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
    { at: 50.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 52.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 53.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 54.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 55.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 57.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 59.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 61.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 62.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 63.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 64.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
    { at: 65.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 67.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 69.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 72.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 74.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 75.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 76.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 77.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 78.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 80.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 82.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
    { at: 83.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 84.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 85.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 88.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 92.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 95.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 96.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 97.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 98.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 100.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 101.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 102.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 103.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 108.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 110.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 111.6, pattern: 0 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 112.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 0 },
    { at: 114.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 119.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 120.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 123.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 2 },
    { at: 124.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 126.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
    { at: 130.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 132.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
    { at: 133.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 136.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 1 },
    { at: 137.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
    { at: 140.6, pattern: 1 as PatternIndex, transition: 1, duration: 0.30 },
    { at: 143.6, pattern: 2 as PatternIndex, transition: 1, duration: 0.34, palette: 3 },
  ];
  const ambientPatternCycle = [
    { duration: 6.0, pattern: 2 as PatternIndex, palette: 3 },
    { duration: 3.0, pattern: 1 as PatternIndex },
    { duration: 5.0, pattern: 0 as PatternIndex, palette: 0 },
    { duration: 2.0, pattern: 1 as PatternIndex },
    { duration: 7.0, pattern: 2 as PatternIndex, palette: 1 },
    { duration: 3.0, pattern: 1 as PatternIndex },
    { duration: 5.0, pattern: 0 as PatternIndex, palette: 1 },
    { duration: 2.0, pattern: 1 as PatternIndex },
  ] as const;
  const ambientCycleStart = 144.0;
  const ambientCycleDuration = ambientPatternCycle.reduce(
    (duration, segment) => duration + segment.duration,
    0,
  );
  let ambientSegment = -1;
  const motifCycleStart = 5.2;
  const motifHoldDuration = 4.0;

  const beginPatternChange = (
    elapsed: number,
    pattern: PatternIndex,
    transition: number,
    duration: number,
    paletteMode = 0,
  ) => {
    if (pattern === 0) {
      colorPatternUniforms.uPaletteMode.value = paletteMode;
    } else if (pattern === 2) {
      violetPatternUniforms.uPaletteMode.value = paletteMode;
    }
    currentPattern = nextPattern;
    nextPattern = pattern;
    tileUniforms.uPatternCurrent.value = patternTargets[currentPattern].texture;
    tileUniforms.uPatternNext.value = patternTargets[nextPattern].texture;
    tileUniforms.uPatternMix.value = duration === 0 ? 1 : 0;
    tileUniforms.uTransitionType.value = transition;
    tileUniforms.uDisplayGain.value = patternGains[pattern];
    transitionStart = elapsed;
    transitionDuration = duration;
  };

  const renderProceduralTargets = (elapsed: number) => {
    const previousTarget = renderer.getRenderTarget();
    noiseUniforms.uTime.value = elapsed;
    colorPatternUniforms.uTime.value = elapsed;
    violetPatternUniforms.uTime.value = elapsed;
    proceduralMesh.material = noiseMaterial;
    renderer.setRenderTarget(noiseTarget);
    renderer.render(proceduralScene, proceduralCamera);
    patternMaterials.forEach((material, index) => {
      proceduralMesh.material = material;
      renderer.setRenderTarget(patternTargets[index as PatternIndex]);
      renderer.render(proceduralScene, proceduralCamera);
    });
    renderer.setRenderTarget(previousTarget);
  };

  const update = (
    elapsed: number,
    fluidTexture: THREE.Texture | null,
    galleryPresence = 0,
    projectProgress = 0,
  ) => {
    // Once the project rail fully owns the chamber, its authored project palette replaces the
    // opening patterns. Freeze those four offscreen targets instead of shading millions of pixels
    // that only contribute a one-percent residual texture in the gallery branch. They resume
    // during gallery exit, before the opening display becomes visible again.
    if (galleryPresence < 0.98) renderProceduralTargets(elapsed);
    tileUniforms.uTime.value = elapsed;
    tileUniforms.uFluid.value = fluidTexture ?? blackTexture;
    tileUniforms.uGallery.value = THREE.MathUtils.clamp(galleryPresence, 0, 1);
    tileUniforms.uProject.value = THREE.MathUtils.clamp(projectProgress, 0, 3);

    let step = openingPatternSequence[introStep];
    while (step && elapsed >= step.at) {
      beginPatternChange(step.at, step.pattern, step.transition, step.duration, step.palette ?? 0);
      introStep += 1;
      step = openingPatternSequence[introStep];
    }

    if (elapsed >= ambientCycleStart) {
      const cycleElapsed = (elapsed - ambientCycleStart) % ambientCycleDuration;
      let segmentElapsed = 0;
      let nextAmbientSegment = 0;
      for (let index = 0; index < ambientPatternCycle.length; index += 1) {
        segmentElapsed += ambientPatternCycle[index]?.duration ?? 0;
        if (cycleElapsed < segmentElapsed) {
          nextAmbientSegment = index;
          break;
        }
      }
      if (ambientSegment !== nextAmbientSegment) {
        ambientSegment = nextAmbientSegment;
        const segment = ambientPatternCycle[ambientSegment] ?? ambientPatternCycle[0];
        beginPatternChange(
          elapsed,
          segment.pattern,
          1,
          segment.pattern === 1 ? 0.30 : 0.34,
          'palette' in segment ? segment.palette : 0,
        );
      }
    }

    const motifStep = Math.floor(Math.max(0, elapsed - motifCycleStart) / motifHoldDuration);
    const symbolMode = elapsed < motifCycleStart ? 0 : motifStep % 2 === 0 ? 2 : 1;
    if (tileUniforms.uSymbolMode.value !== symbolMode) {
      tileUniforms.uSymbolMode.value = symbolMode;
    }

    if (transitionDuration > 0) {
      const progress = THREE.MathUtils.clamp(
        (elapsed - transitionStart) / transitionDuration,
        0,
        1,
      );
      tileUniforms.uPatternMix.value = progress;
    }

    if (elapsed >= nextLayoutAt) {
      layoutIndex = (layoutIndex + 1 + Math.floor(random() * 3)) % quadtreeGeometries.length;
      const activeGeometries = mobileDenseLayout
        ? mobileQuadtreeGeometries
        : quadtreeGeometries;
      tileMesh.geometry = activeGeometries[layoutIndex] ?? activeGeometries[0]!;
      nextLayoutAt = elapsed + 4;
    }

    const params = patternParams[nextPattern];
    if (elapsed >= nextBlackoutAt) {
      tileUniforms.uBlackoutRate.value = params.blackout * (0.75 + random() * 0.15);
      tileUniforms.uBlackoutSeed.value = random();
      nextBlackoutAt = elapsed + 1;
    }
    if (elapsed >= nextUvShiftAt) {
      tileUniforms.uUvShiftRate.value = params.uvShift;
      tileUniforms.uUvShiftPower.value = params.uvShift > 0 ? random() * 0.75 : 0;
      tileUniforms.uUvShiftSeed.value = random();
      nextUvShiftAt = elapsed + params.uvIntervalMin + params.uvIntervalRange * random();
    }
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
    const colorWidth = Math.max(384, Math.min(1024, Math.round(width * pixelRatio * 0.30)));
    const colorHeight = Math.max(216, Math.min(576, Math.round(height * pixelRatio * 0.30)));
    const displayWidth = Math.max(640, Math.min(1920, Math.round(width * pixelRatio * 0.80)));
    const displayHeight = Math.max(360, Math.min(1080, Math.round(height * pixelRatio * 0.80)));
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
    blackTexture.dispose();
  };

  return { group, update, resize, dispose };
}
