import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ReferenceFluid } from './reference-fluid';

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
  const uniforms = { uTime: {value:0}, uReveal: {value:0} };
  const material = new THREE.ShaderMaterial({
    transparent:true, side:THREE.DoubleSide, uniforms,
    vertexShader: `varying vec3 vPosition; varying vec3 vNormal; void main(){vPosition=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec3 vPosition; varying vec3 vNormal; uniform float uTime; uniform float uReveal;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        if(abs(vNormal.z)>.45 || vNormal.x>-.2 || vPosition.x>0.0 || uReveal<.001) discard;
        vec3 p=vPosition*1.4+vec3(0,uTime*.09,0);
        float n=noise(p);
        vec3 flow=vec3(noise(p+vec3(n*2.3,0,0)),noise(p+vec3(0,2.1+n,0)),noise(p+vec3(0,0,5.7+n)));
        vec3 color=clamp((flow-.2)*1.65,0.0,1.0);
        color+= (hash(vec3(gl_FragCoord.xy,uTime))-.5)*.12;
        gl_FragColor=vec4(color,uReveal);
      }`,
  });
  const identity = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  // A smooth bevel has no single sharp edge for EdgesGeometry to trace. Render
  // an expanded back-face shell around the depth-only solid for a closed contour.
  const maskMaterial = new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide});
  const mask = new THREE.Mesh(geometry,maskMaterial);
  const outlineMaterial = new THREE.ShaderMaterial({
    side:THREE.BackSide,
    vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*.015,1.0);}',
    fragmentShader:'void main(){gl_FragColor=vec4(1.0);}',
  });
  const outline = new THREE.Mesh(geometry,outlineMaterial);
  mask.renderOrder=1;outline.renderOrder=2;mesh.renderOrder=3;
  material.depthFunc=THREE.LessEqualDepth;
  material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
  identity.add(mask,outline,mesh); scene.add(identity);
  gltf.scene.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      for (const m of Array.isArray(child.material) ? child.material : [child.material]) m.dispose();
    }
  });
  root.dataset.lightReady = 'true';
  let active = false, frame = 0, last = performance.now(), stopped = false;
  let rootTop = 0, rootHeight = 0, visionTop = 0;
  const pointer = new THREE.Vector2(), filteredPointer = new THREE.Vector2();
  const velocity = new THREE.Vector2(), residual = new THREE.Vector2();
  let pointerPrimed = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const events = new AbortController();
  function measure() {
    rootTop=root.getBoundingClientRect().top+scrollY;rootHeight=root.offsetHeight;
    visionTop=vision.getBoundingClientRect().top+scrollY;
    renderer.setSize(innerWidth,innerHeight,false);camera.left=-3.2*innerWidth/innerHeight;camera.right=-camera.left;camera.updateProjectionMatrix();
    backgroundUniforms.uSize.value.set(innerWidth,innerHeight);fluid.resize(innerWidth,innerHeight);
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
    vision.style.setProperty('--vision-blur',`${zoom*7}px`);
    vision.style.setProperty('--vision-copy-opacity',String(1-zoom*.7));
    if(pointerPrimed) {
      residual.copy(pointer).sub(filteredPointer);
      filteredPointer.addScaledVector(residual,Math.min(1,dt*10));
      velocity.lerp(residual,Math.min(1,dt*20));
      fluid.update({x:filteredPointer.x,y:filteredPointer.y,space:'ndc',deltaX:velocity.x*(reduced?.35:1),deltaY:velocity.y*(reduced?.35:1)});
    }
    fluid.step(dt);renderer.render(scene,camera);
    if(scrollY>rootTop-innerHeight*.28) document.documentElement.dataset.referenceSurface=scrollY<rootTop+rootHeight-innerHeight*.2?'light':'dark';
    frame=requestAnimationFrame(render);
  }
  function resume(){if(!frame && active && !stopped && !document.hidden){last=performance.now();frame=requestAnimationFrame(render);}}
  const observer=new IntersectionObserver(([entry])=>{active=entry?.isIntersecting??false;if(!active){cancelAnimationFrame(frame);frame=0;}else resume();},{rootMargin:'100px'});
  measure();observer.observe(root);
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
    events.abort();observer.disconnect();geometry.dispose();material.dispose();maskMaterial.dispose();outlineMaterial.dispose();backgroundGeometry.dispose();backgroundMaterial.dispose();fluid.dispose();renderer.dispose();
  },{signal:events.signal});
}

if(root && canvas && vision) {
  const loader = new IntersectionObserver(([entry]) => {
    if(!entry?.isIntersecting)return;loader.disconnect();
    startLightChapters(root,canvas,vision).catch(error=>{console.error('Light chapter failed',error);});
  },{rootMargin:'1200px'});
  loader.observe(root);
}
