import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { ReferenceFluid } from './reference-fluid';
import { noiseFragmentShader } from './reference-background-system';

const root = document.querySelector<HTMLElement>('[data-light-chapters]');
const canvas = root?.querySelector<HTMLCanvasElement>('[data-light-canvas]');
const vision = root?.querySelector<HTMLElement>('.vision-chapter');
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => { const t = clamp((n-a)/(b-a)); return t*t*(3-2*t); };

async function startLightChapters(root: HTMLElement, canvas: HTMLCanvasElement, vision: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6.2,6.2,3.2,-3.2,.1,100);
  camera.position.z = 10;
  const fluid = new ReferenceFluid(renderer, innerWidth, innerHeight);
  const backgroundUniforms = { uSize: { value: new THREE.Vector2() }, uFluid: { value: fluid.texture }, uScroll: { value: scrollY / innerHeight } };
  const backgroundMaterial = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, uniforms: backgroundUniforms,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.0);}',
    fragmentShader: `
      varying vec2 vUv; uniform vec2 uSize; uniform sampler2D uFluid; uniform float uScroll;
      void main(){
        vec2 wake=texture2D(uFluid,vUv).xy;
        vec2 uv=vUv+wake*.01;
        vec2 pixel=uv*uSize;
        float spacing=max(uSize.x,uSize.y)/64.0;
        vec2 gridPixel=pixel-vec2(0.0,uScroll*1.5*spacing);
        vec2 cell=abs(fract(gridPixel/spacing)-.5)*spacing;
        float grid=1.0-smoothstep(.35,.95,min(cell.x,cell.y));
        float crossSpacing=spacing*8.0;
        vec2 crossPixel=pixel-vec2(0.0,uScroll*.1*max(uSize.x,uSize.y));
        vec2 cross=abs(mod(crossPixel+crossSpacing*.5,crossSpacing)-crossSpacing*.5);
        float marks=(1.0-smoothstep(.4,1.0,cross.x))*(1.0-step(8.0,cross.y));
        marks=max(marks,(1.0-smoothstep(.4,1.0,cross.y))*(1.0-step(8.0,cross.x)));
        vec3 color=vec3(.875,.910,.918);
        color-=grid*.023+marks*.19;
        color*=1.0-.13*smoothstep(.15,.78,length((vUv-.5)*vec2(1.15,1.0)));
        color+=min(length(wake)*.07,.06);
        gl_FragColor=vec4(color,1.0);
      }`,
  });
  const backgroundGeometry = new THREE.PlaneGeometry(2,2);
  const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
  background.frustumCulled = false; background.renderOrder = -100;
  scene.add(background);
  const noiseTarget=new THREE.WebGLRenderTarget(64,64,{type:THREE.FloatType,depthBuffer:false,stencilBuffer:false});
  noiseTarget.texture.wrapS=THREE.RepeatWrapping;noiseTarget.texture.wrapT=THREE.RepeatWrapping;
  const noiseUniforms={uTime:{value:0},uScreenAspectRatio:{value:innerWidth/innerHeight}};
  const noiseMaterial=new THREE.ShaderMaterial({uniforms:noiseUniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:noiseFragmentShader,depthTest:false,depthWrite:false});
  const noiseScene=new THREE.Scene();
  noiseScene.add(new THREE.Mesh(backgroundGeometry,noiseMaterial));
  const gltf = await new GLTFLoader().loadAsync('/media/identity/reference-a-desktop.glb');
  let original: THREE.BufferGeometry | undefined;
  gltf.scene.traverse(child => { if (!original && child instanceof THREE.Mesh) original = child.geometry; });
  if (!original) throw new Error('Missing light-chapter identity geometry');
  const geometry = original.clone();
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(4.35 / size.y, 4.35 / size.y, 4.35 / size.y);
  geometry.computeBoundingBox();
  // Derive the authored face boundary from its triangles. Internal triangulation
  // edges occur twice and cancel; the remaining segments form both closed rims.
  const positions=geometry.getAttribute('position');
  const indices=geometry.index!;
  const frontZ=geometry.boundingBox!.max.z;
  const edges=new Map<string,{count:number;points:number[]}>();
  for(let i=0;i<indices.count;i+=3){
    const triangle=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];
    if(triangle.some(index=>Math.abs(positions.getZ(index)-frontZ)>.0001))continue;
    for(let e=0;e<3;e++){
      const a=triangle[e]!,b=triangle[(e+1)%3]!;
      const pa=[positions.getX(a),positions.getY(a),positions.getZ(a)];
      const pb=[positions.getX(b),positions.getY(b),positions.getZ(b)];
      const key=[pa.map(n=>n.toFixed(4)).join(','),pb.map(n=>n.toFixed(4)).join(',')].sort().join('|');
      const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{count:1,points:[...pa,...pb]});
    }
  }
  const rimGeometry=new LineSegmentsGeometry();
  rimGeometry.setPositions([...edges.values()].filter(edge=>edge.count===1).flatMap(edge=>edge.points));
  const rimMaterial=new LineMaterial({color:0xffffff,linewidth:1.5,depthTest:false,depthWrite:false,transparent:true});
  const rim=new LineSegments2(rimGeometry,rimMaterial);rim.renderOrder=4;
  const uniforms = { uTime: {value:0}, uReveal: {value:0}, uNoise:{value:noiseTarget.texture}, uHalfDepth:{value:frontZ}, uResolution:{value:new THREE.Vector2()} };
  const material = new THREE.ShaderMaterial({
    transparent:true, side:THREE.DoubleSide, uniforms,
    vertexShader: `varying vec3 vPosition; varying vec3 vNormal; void main(){vPosition=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec3 vPosition; varying vec3 vNormal; uniform float uTime; uniform float uReveal; uniform sampler2D uNoise; uniform float uHalfDepth; uniform vec2 uResolution;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        if(abs(vNormal.z)>.45 || vNormal.x>-.2 || vPosition.x>0.0 || uReveal<.001) discard;
        vec2 sideUv=vec2(.5+vPosition.z/(2.0*uHalfDepth)*.15,vPosition.y/4.35+.5);
        vec4 firstNoise=texture2D(uNoise,sideUv);
        vec4 secondNoise=texture2D(uNoise,sideUv*.3+firstNoise.xy*(2.3+hash(gl_FragCoord.xy/uResolution)*.2));
        // This layer renders directly to the canvas rather than through the
        // opening compositor, so retain that compositor's 1.3 display gain.
        vec3 color=secondNoise.rgb*1.3;
        gl_FragColor=vec4(color,uReveal);
      }`,
  });
  const identity = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  // Keep the depth-only solid for the colored side; the front boundary is
  // independently traced so smooth bevels cannot leave holes in the contour.
  const maskMaterial = new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide});
  const mask = new THREE.Mesh(geometry,maskMaterial);
  mask.renderOrder=1;mesh.renderOrder=3;
  material.depthFunc=THREE.LessEqualDepth;
  material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  identity.add(mask,mesh,rim); scene.add(identity);
  gltf.scene.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      for (const m of Array.isArray(child.material) ? child.material : [child.material]) m.dispose();
    }
  });
  let active = false, frame = 0, last = performance.now(), stopped = false;
  let visionTop = 0;
  let lastBlur = '', lastCopyOpacity = '';
  const pointer = new THREE.Vector2(), filteredPointer = new THREE.Vector2();
  const velocity = new THREE.Vector2(), residual = new THREE.Vector2();
  let pointerPrimed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const events = new AbortController();
  function measure() {
    visionTop=vision.getBoundingClientRect().top+scrollY;
    renderer.setSize(innerWidth,innerHeight,false);
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
    rimMaterial.resolution.set(innerWidth,innerHeight);
    const aspect=innerWidth/innerHeight;
    const halfHeight=Math.max(3.2,3.1/aspect);
    camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.left=-halfHeight*aspect;camera.right=-camera.left;camera.updateProjectionMatrix();
    backgroundUniforms.uSize.value.set(innerWidth,innerHeight);fluid.resize(innerWidth,innerHeight);
    noiseUniforms.uScreenAspectRatio.value=innerWidth/innerHeight;
  }
  function render(time:number) {
    frame=0;if(stopped || !active || document.hidden) return;
    const dt=Math.min(.033,(time-last)/1000);last=time;
    backgroundUniforms.uScroll.value += (scrollY / innerHeight - backgroundUniforms.uScroll.value) * Math.min(1,dt*5);
    const travel=(scrollY-visionTop)/innerHeight;
    const tilt=smooth(-.75,.25,travel), zoom=smooth(.5,1.65,travel);
    const scale=1+zoom*2.9;
    identity.rotation.set(-tilt*.10-zoom*.2,tilt*.236+zoom*.785,0);
    identity.scale.setScalar(scale);identity.position.set(zoom*.65,-.05,0);
    uniforms.uTime.value=time/1000;uniforms.uReveal.value=tilt;
    const blur=`${zoom*7}px`, copyOpacity=String(1-zoom*.7);
    if(blur!==lastBlur){vision.style.setProperty('--vision-blur',blur);lastBlur=blur;}
    if(copyOpacity!==lastCopyOpacity){vision.style.setProperty('--vision-copy-opacity',copyOpacity);lastCopyOpacity=copyOpacity;}
    if(pointerPrimed) {
      residual.copy(pointer).sub(filteredPointer);
      filteredPointer.addScaledVector(residual,Math.min(1,dt*10));
      velocity.lerp(residual,Math.min(1,dt*20));
      fluid.update({x:filteredPointer.x,y:filteredPointer.y,space:'ndc',deltaX:velocity.x*(reduced?.35:1),deltaY:velocity.y*(reduced?.35:1)});
    }
    fluid.step(dt);
    noiseUniforms.uTime.value=time/1000;
    renderer.setRenderTarget(noiseTarget);renderer.render(noiseScene,camera);renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    frame=requestAnimationFrame(render);
  }
  function resume(){if(!frame && active && !stopped && !document.hidden){last=performance.now();frame=requestAnimationFrame(render);}}
  const observer=new IntersectionObserver(([entry])=>{active=entry?.isIntersecting??false;if(!active){cancelAnimationFrame(frame);frame=0;}else resume();},{rootMargin:'100px'});
  measure();
  // Compile while approaching the chapter, including its initially invisible
  // colored side. Avoid compiling its first visible Vision frame on demand.
  uniforms.uReveal.value=1;
  await renderer.compileAsync(scene,camera);
  await renderer.compileAsync(noiseScene,camera);
  uniforms.uReveal.value=0;
  root.dataset.lightReady = 'true';
  observer.observe(root);
  addEventListener('resize',measure,{passive:true,signal:events.signal});
  addEventListener('pointermove',event=>{
    if(!active || event.pointerType==='touch')return;
    pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
    if(!pointerPrimed)filteredPointer.copy(pointer);
    pointerPrimed=true;
  },{passive:true,signal:events.signal});
  document.addEventListener('visibilitychange',resume,{signal:events.signal});
  addEventListener('pageshow',()=>{stopped=false;resume();},{signal:events.signal});
  addEventListener('pagehide',event=>{
    stopped=true;cancelAnimationFrame(frame);frame=0;if(event.persisted)return;
    events.abort();observer.disconnect();geometry.dispose();rimGeometry.dispose();rimMaterial.dispose();material.dispose();maskMaterial.dispose();backgroundGeometry.dispose();backgroundMaterial.dispose();noiseMaterial.dispose();noiseTarget.dispose();fluid.dispose();renderer.dispose();
  },{signal:events.signal});
}

if(root && canvas && vision) {
  const loader = new IntersectionObserver(([entry]) => {
    if(!entry?.isIntersecting)return;loader.disconnect();
    startLightChapters(root,canvas,vision).catch(error=>{console.error('Light chapter failed',error);});
  },{rootMargin:'300% 0px'});
  loader.observe(root);
}
