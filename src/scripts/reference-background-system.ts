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
  setProjectTextures: (textures: readonly THREE.Texture[]) => void;
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
  uniform float uPaletteMode;

  void main() {
    vec4 noise = texture2D(uNoise, vUv);
    vec3 color = vec3(0.3451, 0.0980, 0.9922) * vec3(0.60, 0.60, 1.0);
    color = mix(
      color,
      vec3(0.6980, 0.9294, 1.0),
      smoothstep(0.5, 0.9, noise.a)
    );
    color = mix(
      color,
      vec3(0.9922, 0.3725, 0.0471),
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

  uniform vec2 uScale;
  uniform float uPatternMix;
  uniform float uTransitionType;
  uniform float uBlackoutRate;
  uniform float uBlackoutSeed;
  uniform float uUvShiftRate;
  uniform float uUvShiftSeed;
  uniform float uUvShiftPower;
  uniform sampler2D uFluid;

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
    vec2 projectedScreenUv = screenClip.xy / screenClip.w * 0.5 + 0.5;
    vec2 screenUv = projectedScreenUv + uvShift;
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
  uniform sampler2D uProjectCurrent;
  uniform sampler2D uProjectNext;
  uniform float uProjectCurrentAspect;
  uniform float uProjectNextAspect;
  uniform float uProjectTextureReady;
  uniform float uScreenAspectRatio;

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
    float effectiveBlackout = vBlackout * (1.0 - uGallery);
    displayColor *= 1.0 - effectiveBlackout;

    vec2 currentProjectUv = projectCoverUv(vScreenUv, uProjectCurrentAspect);
    vec2 nextProjectUv = projectCoverUv(vScreenUv, uProjectNextAspect);
    vec3 currentProjectColor = texture2D(uProjectCurrent, currentProjectUv).rgb;
    vec3 nextProjectColor = texture2D(uProjectNext, nextProjectUv).rgb;
    float projectFraction = fract(clamp(uProject, 0.0, 3.0));
    float projectBlend = smoothstep(
      vScreenUv.x - 0.03,
      vScreenUv.x + 0.03,
      projectFraction * 1.06 - 0.03
    );
    vec3 projectColor = mix(currentProjectColor, nextProjectColor, projectBlend);
    projectColor *= mix(1.0, random(gl_FragCoord.xy / 1000.0), 0.10);
    vec3 projectHsv = rgbToHsv(projectColor);
    projectColor = hsvToRgb(vec3(projectHsv.x, projectHsv.y * 2.0, projectHsv.z));
    vec3 projectTint = projectColor;
    displayColor = mix(displayColor, projectColor, uGallery * uProjectTextureReady);

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
      tileUv.x += uTime * 0.05 * sign(floor(tileUv.y));
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
    displayColor += vec3(logoWeight * 0.20 * galleryLogoScale * (1.0 - effectiveBlackout));

    displayColor *= smoothstep(1.9, 0.1, length(vUv - 0.5));

    vec2 dotUv = fract(vGlobalUv * 414.0) - 0.5;
    float dotMask = smoothstep(0.50, 0.20, length(dotUv));
    displayColor *= mix(dotMask, 1.0, 0.60) * 0.90;

    float chamberFade = smoothstep(0.55, 0.05, length(vGlobalUv - 0.5));
    displayColor *= chamberFade;

    vec3 sideColor = vec3(vEmitSide * 0.80);
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
  { blackout: 0, blackoutRange: 0, uvShift: 0, uvIntervalMin: 0.2, uvIntervalRange: 0.5 },
  { blackout: 0, blackoutRange: 0.5, uvShift: 0.50, uvIntervalMin: 0.10, uvIntervalRange: 5.0 },
  { blackout: 0, blackoutRange: 0.5, uvShift: 0.50, uvIntervalMin: 0.10, uvIntervalRange: 5.0 },
] as const;

const patternGains = [0.50, 0.50, 0.50] as const;

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
    uProjectCurrent: { value: blackTexture as THREE.Texture },
    uProjectNext: { value: blackTexture as THREE.Texture },
    uProjectCurrentAspect: { value: 16 / 9 },
    uProjectNextAspect: { value: 16 / 9 },
    uProjectTextureReady: { value: 0 },
    uScreenAspectRatio: { value: 16 / 9 },
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
    const currentIndex = Math.min(maximumIndex, Math.max(0, Math.floor(progress)));
    if (currentIndex === activeProjectTextureIndex) return;
    const nextIndex = Math.min(maximumIndex, currentIndex + 1);
    const currentTexture = projectColorTextures[currentIndex]!;
    const nextTexture = projectColorTextures[nextIndex]!;
    tileUniforms.uProjectCurrent.value = currentTexture;
    tileUniforms.uProjectNext.value = nextTexture;
    tileUniforms.uProjectCurrentAspect.value = currentTexture.userData.projectAspect as number;
    tileUniforms.uProjectNextAspect.value = nextTexture.userData.projectAspect as number;
    activeProjectTextureIndex = currentIndex;
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
      canvas.width = 24;
      canvas.height = Math.max(1, Math.round(canvas.width / sourceAspect));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to derive project color field');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
      const colorTexture = new THREE.CanvasTexture(canvas);
      colorTexture.colorSpace = THREE.SRGBColorSpace;
      colorTexture.minFilter = THREE.LinearFilter;
      colorTexture.magFilter = THREE.LinearFilter;
      colorTexture.generateMipmaps = false;
      colorTexture.userData.projectAspect = sourceAspect;
      colorTexture.needsUpdate = true;
      return colorTexture;
    });
    activeProjectTextureIndex = -1;
    tileUniforms.uProjectTextureReady.value = projectColorTextures.length > 0 ? 1 : 0;
    setProjectTexturePair(0);
  };

  let layoutIndex = 0;
  let currentPattern: PatternIndex = 2;
  let nextPattern: PatternIndex = 2;
  let transitionStart = 0;
  let transitionDuration = 0;
  let nextLayoutAt = 4;
  let nextBlackoutAt = 0.8;
  let nextUvShiftAt = 0.4;
  let patternStep = 0;
  let nextPatternAt = 2.6;
  let mobileDenseLayout = false;
  const patternTimingRandom = createSeededRandom(0x7a11ce26);
  const referenceTransitionDurations = [0, 0.3, 3] as const;
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
    projectProgress = 0,
  ) => {
    tileUniforms.uTime.value = elapsed;
    tileUniforms.uFluid.value = fluidTexture ?? blackTexture;
    tileUniforms.uGallery.value = THREE.MathUtils.clamp(galleryPresence, 0, 1);
    const clampedProjectProgress = THREE.MathUtils.clamp(
      projectProgress,
      0,
      Math.max(0, projectColorTextures.length - 1),
    );
    tileUniforms.uProject.value = clampedProjectProgress;
    setProjectTexturePair(clampedProjectProgress);

    while (elapsed >= nextPatternAt) {
      const changeAt = nextPatternAt;
      let step = openingPatternSequence[patternStep % openingPatternSequence.length]!;
      patternStep += 1;
      while (step.pattern === nextPattern) {
        step = openingPatternSequence[patternStep % openingPatternSequence.length]!;
        patternStep += 1;
      }
      const transition = Math.floor(patternTimingRandom() * 3);
      const duration = referenceTransitionDurations[transition] ?? 0;
      beginPatternChange(changeAt, step.pattern, transition, duration, step.palette ?? 0);
      nextPatternAt = changeAt + 1 + duration + patternTimingRandom();
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
      tileUniforms.uBlackoutRate.value = params.blackout + random() * params.blackoutRange;
      tileUniforms.uBlackoutSeed.value = random();
      nextBlackoutAt = elapsed + 1;
    }
    if (elapsed >= nextUvShiftAt) {
      tileUniforms.uUvShiftRate.value = params.uvShift;
      tileUniforms.uUvShiftPower.value = params.uvShift > 0 ? random() : 0;
      tileUniforms.uUvShiftSeed.value = random();
      nextUvShiftAt = elapsed + params.uvIntervalMin + params.uvIntervalRange * random();
    }

    // Shade only the visible procedural pattern, plus its predecessor during the brief transition.
    // Once the project rail fully owns the chamber, both it and the shared noise target freeze.
    if (galleryPresence < 0.98) renderProceduralTargets(elapsed);
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

  return { group, setProjectTextures, update, resize, dispose };
}
