import * as THREE from 'three';

/**
 * Pointer coordinates default to bottom-left-origin UV space. Deltas use the
 * same space and `deltaTime` is expressed in seconds.
 */
export interface ReferenceFluidPointer {
  x: number;
  y: number;
  deltaX?: number;
  deltaY?: number;
  deltaTime?: number;
  active?: boolean;
  space?: 'uv' | 'ndc' | 'screen';
}

/** Suggested values for compositing the velocity field into the final scene. */
export const REFERENCE_FLUID_SCENE_WARP = 0.01;
export const REFERENCE_FLUID_MAGNITUDE_GAIN = 0.8;

const FIELD_LONG_EDGE = 256;
const CURL_STRENGTH = 0.02;
const PRESSURE_ITERATIONS = 4;
const VELOCITY_RETENTION_PER_FRAME = 0.99;
const IMPULSE_RETENTION_PER_FRAME = 0.5;
const POINTER_SPEED_EXPONENT = 1.6;
const POINTER_FORCE = 30;
const POINTER_FORCE_COMPONENT_LIMIT = 2;
const POINTER_RADIUS_MIN = 0.01;
const POINTER_RADIUS_MAX = 0.06;
const REFERENCE_FRAME_RATE = 60;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const signedPow = (value: number, exponent: number) =>
  Math.sign(value) * Math.pow(Math.abs(value), exponent);

const fullscreenVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const curlFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uData;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    float leftVelocityY = texture2D(uData, vUv - vec2(uTexel.x, 0.0)).y;
    float rightVelocityY = texture2D(uData, vUv + vec2(uTexel.x, 0.0)).y;
    float topVelocityX = texture2D(uData, vUv + vec2(0.0, uTexel.y)).x;
    float bottomVelocityX = texture2D(uData, vUv - vec2(0.0, uTexel.y)).x;
    float curl = rightVelocityY - leftVelocityY - topVelocityX + bottomVelocityX;

    gl_FragColor = vec4(${CURL_STRENGTH.toFixed(2)} * curl, 0.0, 0.0, 1.0);
  }
`;

const forceFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uData;
  uniform sampler2D uCurl;
  uniform vec2 uTexel;
  uniform vec2 uPointer;
  uniform vec2 uImpulse;
  uniform float uAspect;
  uniform float uFrameScale;
  varying vec2 vUv;

  void main() {
    float curlLeft = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float curlRight = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float curlTop = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float curlBottom = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float curlCenter = texture2D(uCurl, vUv).x;

    vec2 vorticity = 0.5 * vec2(
      abs(curlTop) - abs(curlBottom),
      abs(curlRight) - abs(curlLeft)
    );
    vorticity /= length(vorticity) + 0.0001;
    vorticity *= curlCenter * uFrameScale;
    vorticity.y *= -1.0;

    vec2 pointerOffset = vUv - uPointer;
    if (uAspect < 1.0) {
      pointerOffset.x *= uAspect;
    } else {
      pointerOffset.y /= uAspect;
    }

    float pointerSpeed = smoothstep(0.01, 1.0, length(uImpulse));
    float pointerRadius = ${POINTER_RADIUS_MIN.toFixed(2)}
      + ${(POINTER_RADIUS_MAX - POINTER_RADIUS_MIN).toFixed(2)}
      * min(1.0, pointerSpeed * 2.0);
    float pointerWeight = 1.0 - smoothstep(
      0.0,
      pointerRadius,
      length(pointerOffset)
    );

    vec2 pointerForce = uImpulse * ${POINTER_FORCE.toFixed(1)};
    if (uAspect < 1.0) {
      pointerForce.x /= uAspect;
    } else {
      pointerForce.y *= uAspect;
    }
    pointerForce = clamp(
      pointerForce,
      vec2(-${POINTER_FORCE_COMPONENT_LIMIT.toFixed(1)}),
      vec2(${POINTER_FORCE_COMPONENT_LIMIT.toFixed(1)})
    );

    vec4 data = texture2D(uData, vUv);
    data.xy += vorticity + pointerWeight * pointerForce;
    gl_FragColor = data;
  }
`;

const divergenceFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uData;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    vec2 velocityLeft = texture2D(uData, vUv - vec2(uTexel.x, 0.0)).xy;
    vec2 velocityRight = texture2D(uData, vUv + vec2(uTexel.x, 0.0)).xy;
    vec2 velocityTop = texture2D(uData, vUv + vec2(0.0, uTexel.y)).xy;
    vec2 velocityBottom = texture2D(uData, vUv - vec2(0.0, uTexel.y)).xy;
    float divergence = (
      velocityRight.x - velocityLeft.x
      + velocityTop.y - velocityBottom.y
    ) * 0.5;

    vec4 data = texture2D(uData, vUv);
    gl_FragColor = vec4(data.xyz, divergence);
  }
`;

const pressureFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uData;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    float pressureLeft = texture2D(uData, vUv - vec2(uTexel.x, 0.0)).z;
    float pressureRight = texture2D(uData, vUv + vec2(uTexel.x, 0.0)).z;
    float pressureTop = texture2D(uData, vUv + vec2(0.0, uTexel.y)).z;
    float pressureBottom = texture2D(uData, vUv - vec2(0.0, uTexel.y)).z;
    vec4 data = texture2D(uData, vUv);
    float pressure = (
      pressureLeft
      + pressureRight
      + pressureTop
      + pressureBottom
      - data.w
    ) * 0.25;

    gl_FragColor = vec4(data.xy, pressure, data.w);
  }
`;

const gradientFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uData;
  uniform vec2 uTexel;
  varying vec2 vUv;

  void main() {
    float pressureLeft = texture2D(uData, vUv - vec2(uTexel.x, 0.0)).z;
    float pressureRight = texture2D(uData, vUv + vec2(uTexel.x, 0.0)).z;
    float pressureTop = texture2D(uData, vUv + vec2(0.0, uTexel.y)).z;
    float pressureBottom = texture2D(uData, vUv - vec2(0.0, uTexel.y)).z;
    vec4 data = texture2D(uData, vUv);

    data.xy -= vec2(
      pressureRight - pressureLeft,
      pressureTop - pressureBottom
    );
    gl_FragColor = data;
  }
`;

const advectionFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uData;
  uniform vec2 uTexel;
  uniform float uRetention;
  uniform float uFrameScale;
  varying vec2 vUv;

  void main() {
    vec2 velocity = texture2D(uData, vUv).xy;
    vec2 sourceUv = vUv - velocity * uTexel * uFrameScale;
    vec2 advectedVelocity = texture2D(uData, sourceUv).xy;

    // Pressure and divergence are rebuilt on the next frame.
    gl_FragColor = vec4(advectedVelocity * uRetention, 0.0, 0.0);
  }
`;

const createRenderTarget = (width: number, height: number, name: string) => {
  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
  target.texture.name = name;
  target.texture.colorSpace = THREE.NoColorSpace;
  target.texture.generateMipmaps = false;
  return target;
};

const createPassMaterial = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => {
  const material = new THREE.ShaderMaterial({
    vertexShader: fullscreenVertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  return material;
};

/**
 * A compact GPU stable-fluid solver for the opening's pointer wake.
 *
 * The exposed texture stores signed velocity in RG. A scene compositor can use
 * `uv + velocity.xy * REFERENCE_FLUID_SCENE_WARP` and
 * `length(velocity.xy) * REFERENCE_FLUID_MAGNITUDE_GAIN`.
 */
export class ReferenceFluid {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly geometry: THREE.BufferGeometry;
  private readonly quad: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly texel = new THREE.Vector2(1, 1);
  private readonly pointerPosition = new THREE.Vector2(0.5, 0.5);
  private readonly pointerImpulse = new THREE.Vector2();
  private readonly previousPointer = new THREE.Vector2();
  private readonly savedClearColor = new THREE.Color();
  private readonly savedViewport = new THREE.Vector4();
  private readonly savedScissor = new THREE.Vector4();
  private readonly materials: THREE.ShaderMaterial[];

  private readonly curlUniforms = {
    uData: { value: null as THREE.Texture | null },
    uTexel: { value: this.texel },
  };

  private readonly forceUniforms = {
    uData: { value: null as THREE.Texture | null },
    uCurl: { value: null as THREE.Texture | null },
    uTexel: { value: this.texel },
    uPointer: { value: this.pointerPosition },
    uImpulse: { value: this.pointerImpulse },
    uAspect: { value: 1 },
    uFrameScale: { value: 1 },
  };

  private readonly divergenceUniforms = {
    uData: { value: null as THREE.Texture | null },
    uTexel: { value: this.texel },
  };

  private readonly pressureUniforms = {
    uData: { value: null as THREE.Texture | null },
    uTexel: { value: this.texel },
  };

  private readonly gradientUniforms = {
    uData: { value: null as THREE.Texture | null },
    uTexel: { value: this.texel },
  };

  private readonly advectionUniforms = {
    uData: { value: null as THREE.Texture | null },
    uTexel: { value: this.texel },
    uRetention: { value: VELOCITY_RETENTION_PER_FRAME },
    uFrameScale: { value: 1 },
  };

  private readonly curlMaterial: THREE.ShaderMaterial;
  private readonly forceMaterial: THREE.ShaderMaterial;
  private readonly divergenceMaterial: THREE.ShaderMaterial;
  private readonly pressureMaterial: THREE.ShaderMaterial;
  private readonly gradientMaterial: THREE.ShaderMaterial;
  private readonly advectionMaterial: THREE.ShaderMaterial;

  private fluidFront: THREE.WebGLRenderTarget;
  private fluidBack: THREE.WebGLRenderTarget;
  private fluidRead: THREE.WebGLRenderTarget;
  private fluidWrite: THREE.WebGLRenderTarget;
  private curlTarget: THREE.WebGLRenderTarget;
  private pointerPrimed = false;
  private fieldActive = false;
  private disposed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    width = renderer.domElement.clientWidth || renderer.domElement.width || 1,
    height = renderer.domElement.clientHeight || renderer.domElement.height || 1,
  ) {
    this.renderer = renderer;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));

    this.curlMaterial = createPassMaterial(curlFragmentShader, this.curlUniforms);
    this.forceMaterial = createPassMaterial(forceFragmentShader, this.forceUniforms);
    this.divergenceMaterial = createPassMaterial(divergenceFragmentShader, this.divergenceUniforms);
    this.pressureMaterial = createPassMaterial(pressureFragmentShader, this.pressureUniforms);
    this.gradientMaterial = createPassMaterial(gradientFragmentShader, this.gradientUniforms);
    this.advectionMaterial = createPassMaterial(advectionFragmentShader, this.advectionUniforms);
    this.materials = [
      this.curlMaterial,
      this.forceMaterial,
      this.divergenceMaterial,
      this.pressureMaterial,
      this.gradientMaterial,
      this.advectionMaterial,
    ];

    this.quad = new THREE.Mesh(this.geometry, this.curlMaterial);
    this.quad.frustumCulled = false;
    this.quad.matrixAutoUpdate = false;
    this.scene.matrixAutoUpdate = false;
    this.camera.matrixAutoUpdate = false;
    this.scene.add(this.quad);

    this.fluidFront = createRenderTarget(1, 1, 'reference-fluid-velocity');
    this.fluidBack = createRenderTarget(1, 1, 'reference-fluid-work');
    this.fluidRead = this.fluidFront;
    this.fluidWrite = this.fluidBack;
    this.curlTarget = createRenderTarget(1, 1, 'reference-fluid-curl');

    this.resize(width, height);
  }

  /**
   * The texture identity remains stable across steps and resizes. RG contains
   * signed velocity in simulation-pixel units.
   */
  get texture(): THREE.Texture {
    return this.fluidFront.texture;
  }

  /**
   * Queue pointer motion for the next simulation frame.
   *
   * UV input uses x/y in [0, 1] with y increasing upward. NDC input uses x/y
   * in [-1, 1], also increasing upward. Use `space: 'screen'` for top-left-
   * origin normalized coordinates.
   */
  update(pointer: ReferenceFluidPointer): void {
    if (this.disposed) return;

    const space = pointer.space ?? 'uv';
    const ndcX = space === 'ndc' ? pointer.x : pointer.x * 2 - 1;
    const ndcY =
      space === 'ndc' ? pointer.y : space === 'screen' ? 1 - pointer.y * 2 : pointer.y * 2 - 1;
    const clampedX = clamp(ndcX, -1, 1);
    const clampedY = clamp(ndcY, -1, 1);

    this.pointerPosition.set(clampedX * 0.5 + 0.5, clampedY * 0.5 + 0.5);

    if (pointer.active === false) {
      this.pointerPrimed = false;
      this.previousPointer.set(clampedX, clampedY);
      return;
    }

    let deltaX = clampedX - this.previousPointer.x;
    let deltaY = clampedY - this.previousPointer.y;
    const suppliedDeltaX = pointer.deltaX;
    const suppliedDeltaY = pointer.deltaY;

    if (suppliedDeltaX !== undefined) {
      deltaX = space === 'ndc' ? suppliedDeltaX : suppliedDeltaX * 2;
    }
    if (suppliedDeltaY !== undefined) {
      deltaY = space === 'ndc' ? suppliedDeltaY : suppliedDeltaY * (space === 'screen' ? -2 : 2);
    }

    this.previousPointer.set(clampedX, clampedY);
    if (!this.pointerPrimed) {
      this.pointerPrimed = true;
      return;
    }

    if (pointer.deltaTime !== undefined && pointer.deltaTime > 0) {
      const eventFrameScale = clamp(pointer.deltaTime * REFERENCE_FRAME_RATE, 0.25, 2);
      deltaX /= eventFrameScale;
      deltaY /= eventFrameScale;
    }

    this.pointerImpulse.x += signedPow(clamp(deltaX, -1, 1), POINTER_SPEED_EXPONENT);
    this.pointerImpulse.y += signedPow(clamp(deltaY, -1, 1), POINTER_SPEED_EXPONENT);
    this.pointerImpulse.clampScalar(-1, 1);
    if (this.pointerImpulse.lengthSq() > 0) {
      this.fieldActive = true;
    }
  }

  /**
   * Advance the field. At 60 Hz this applies 0.99 velocity retention and halves
   * the queued pointer impulse every frame; other rates are time-corrected.
   */
  step(dt: number): void {
    if (this.disposed || !this.fieldActive || !Number.isFinite(dt) || dt <= 0) return;

    const frameScale = clamp(dt * REFERENCE_FRAME_RATE, 0.25, 2);
    this.forceUniforms.uFrameScale.value = frameScale;
    this.advectionUniforms.uFrameScale.value = frameScale;
    this.advectionUniforms.uRetention.value = Math.pow(VELOCITY_RETENTION_PER_FRAME, frameScale);

    this.withRendererState(() => {
      this.curlUniforms.uData.value = this.fluidRead.texture;
      this.renderPass(this.curlMaterial, this.curlTarget);

      this.forceUniforms.uData.value = this.fluidRead.texture;
      this.forceUniforms.uCurl.value = this.curlTarget.texture;
      this.renderFluidPass(this.forceMaterial);

      this.divergenceUniforms.uData.value = this.fluidRead.texture;
      this.renderFluidPass(this.divergenceMaterial);

      for (let iteration = 0; iteration < PRESSURE_ITERATIONS; iteration += 1) {
        this.pressureUniforms.uData.value = this.fluidRead.texture;
        this.renderFluidPass(this.pressureMaterial);
      }

      this.gradientUniforms.uData.value = this.fluidRead.texture;
      this.renderFluidPass(this.gradientMaterial);

      this.advectionUniforms.uData.value = this.fluidRead.texture;
      this.renderFluidPass(this.advectionMaterial);
    });

    // Eight packed-data passes return the final field to fluidFront, keeping
    // the public texture object stable for materials that hold it as a uniform.
    this.pointerImpulse.multiplyScalar(Math.pow(IMPULSE_RETENTION_PER_FRAME, frameScale));
  }

  resize(width: number, height: number): void;
  resize(size: THREE.Vector2): void;
  resize(widthOrSize: number | THREE.Vector2, height?: number): void {
    if (this.disposed) return;

    const width = typeof widthOrSize === 'number' ? widthOrSize : Math.max(1, widthOrSize.x);
    const resolvedHeight =
      typeof widthOrSize === 'number'
        ? Math.max(1, height ?? widthOrSize)
        : Math.max(1, widthOrSize.y);
    const resolvedWidth = Math.max(1, width);
    const aspect = resolvedWidth / resolvedHeight;
    const fieldWidth =
      aspect < 1 ? Math.max(1, Math.floor(FIELD_LONG_EDGE * aspect)) : FIELD_LONG_EDGE;
    const fieldHeight =
      aspect < 1 ? FIELD_LONG_EDGE : Math.max(1, Math.floor(FIELD_LONG_EDGE / aspect));

    this.forceUniforms.uAspect.value = aspect;
    this.texel.set(1 / fieldWidth, 1 / fieldHeight);
    this.fluidFront.setSize(fieldWidth, fieldHeight);
    this.fluidBack.setSize(fieldWidth, fieldHeight);
    this.curlTarget.setSize(fieldWidth, fieldHeight);
    this.fluidRead = this.fluidFront;
    this.fluidWrite = this.fluidBack;
    this.pointerImpulse.set(0, 0);
    this.pointerPrimed = false;
    this.fieldActive = false;

    this.clearTargets();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.quad);
    this.geometry.dispose();
    this.materials.forEach((material) => material.dispose());
    this.fluidFront.dispose();
    this.fluidBack.dispose();
    this.curlTarget.dispose();
  }

  private renderFluidPass(material: THREE.ShaderMaterial): void {
    this.renderPass(material, this.fluidWrite);
    const previousRead = this.fluidRead;
    this.fluidRead = this.fluidWrite;
    this.fluidWrite = previousRead;
  }

  private renderPass(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget): void {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  private clearTargets(): void {
    this.withRendererState(() => {
      this.renderer.getClearColor(this.savedClearColor);
      const previousClearAlpha = this.renderer.getClearAlpha();
      this.renderer.setClearColor(0x000000, 0);
      for (const target of [this.fluidFront, this.fluidBack, this.curlTarget]) {
        this.renderer.setRenderTarget(target);
        this.renderer.clear(true, false, false);
      }
      this.renderer.setClearColor(this.savedClearColor, previousClearAlpha);
    });
  }

  private withRendererState(render: () => void): void {
    const previousTarget = this.renderer.getRenderTarget();
    const previousAutoClear = this.renderer.autoClear;
    const previousXrEnabled = this.renderer.xr.enabled;
    const previousViewport = this.renderer.getViewport(this.savedViewport);
    const previousScissor = this.renderer.getScissor(this.savedScissor);
    const previousScissorTest = this.renderer.getScissorTest();

    this.renderer.autoClear = false;
    this.renderer.xr.enabled = false;

    try {
      render();
    } finally {
      this.renderer.setRenderTarget(previousTarget);
      this.renderer.setViewport(previousViewport);
      this.renderer.setScissor(previousScissor);
      this.renderer.setScissorTest(previousScissorTest);
      this.renderer.autoClear = previousAutoClear;
      this.renderer.xr.enabled = previousXrEnabled;
    }
  }
}

export default ReferenceFluid;
