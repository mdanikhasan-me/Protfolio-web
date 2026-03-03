(() => {
  'use strict';
  const { tier, reducedMotion, dpr } = window.__sitePerf;
  const lowPower = tier === 'low';

  const injectHomeBg = () => {
    if (document.getElementById('home-bg') || !document.body.classList.contains('home-page')) return;
    const wrap = document.createElement('div'); wrap.id = 'home-bg';
    wrap.innerHTML = `<canvas class="bg-canvas" id="bg-three"></canvas><div class="mountains"><div class="mountain-layer layer-back"></div><div class="mountain-layer layer-mid"></div><div class="mountain-layer layer-front"></div><div class="mountain-glow" aria-hidden="true"></div></div><div class="bg-vignette" aria-hidden="true"></div>`;
    document.body.insertBefore(wrap, document.body.firstChild);
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectHomeBg();
    const bg = document.getElementById('home-bg'), canvas = document.getElementById('bg-three');
    if (!bg) return;

    const state = { mx: 0.55, my: 0.35, mxT: 0.55, myT: 0.35, scroll: 0, scrollT: 0, running: true, t: 0 };
    const clamp01 = v => Math.max(0, Math.min(1, v));

    const onPointer = (e) => {
      state.mxT = clamp01((e.clientX ?? innerWidth * 0.55) / innerWidth);
      state.myT = clamp01((e.clientY ?? innerHeight * 0.35) / innerHeight);
      bg.style.setProperty('--bgx', `${(state.mxT * 100).toFixed(2)}%`);
      bg.style.setProperty('--bgy', `${(state.myT * 100).toFixed(2)}%`);
      bg.style.setProperty('--mx', state.mxT.toFixed(4));
      bg.style.setProperty('--my', state.myT.toFixed(4));
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', () => state.scrollT = clamp01((scrollY || 0) / Math.max(1, document.documentElement.scrollHeight - innerHeight)), { passive: true });

    document.addEventListener('site:inactive', () => state.running = false, { passive: true });
    document.addEventListener('site:active', () => state.running = true, { passive: true });

    if (!canvas || !window.THREE) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lowPower, powerPreference: lowPower ? 'low-power' : 'high-performance' });
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const uniforms = {
      uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0.55, 0.35) }, uScroll: { value: 0 },
      uRes: { value: new THREE.Vector3(innerWidth, innerHeight, dpr) },
      uAccentA: { value: new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2B4C7E') },
      uAccentB: { value: new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#2E6B4F') },
      uAccentC: { value: new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--accent3').trim() || '#7C96B6') }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
      fragmentShader: `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float; varying vec2 vUv;
        uniform float uTime, uScroll; uniform vec2 uMouse; uniform vec3 uRes, uAccentA, uAccentB, uAccentC;
        float paper(vec2 p){
          p.y += uScroll * 0.25; p += (uMouse - vec2(0.5)) * vec2(-0.44, 0.32);
          float h = sin(p.x * 3.2 + uTime * 0.06)*sin(p.y * 4.6 - uTime * 0.05) + 0.35*sin((p.x + p.y) * 2.4) + 0.25*sin(p.x * 9.5) * sin(p.y * 7.8);
          return smoothstep(0.10, 0.95, 0.5 + 0.5*h);
        }
        void main(){
          vec2 p = vUv * vec2(2.2, 1.8); float h = paper(p);
          vec3 n = normalize(vec3(dFdx(h)*1.2, dFdy(h)*1.2, 0.35));
          vec2 lm = (uMouse - vec2(0.5)) * vec2(1.0, -1.0); vec3 l = normalize(vec3(lm * 0.85, 0.95));
          float sky = smoothstep(0.15, 1.0, vUv.y);
          vec3 base = mix(vec3(0.035,0.040,0.048), vec3(0.075,0.080,0.092), sky) + mix(uAccentA*0.10, uAccentC*0.12, sky)*0.55 + (clamp(dot(n, l), 0.0, 1.0) - 0.5)*0.10 + (h - 0.5)*0.05;
          vec2 pp = vUv - vec2(0.5 + lm.x*0.16, 0.55 + lm.y*0.11);
          base += (uAccentB*0.18 + vec3(0.06)) * exp(-dot(pp,pp)*8.5) * 0.55 + (fract(sin(dot(vUv*uRes.xy, vec2(12.9898,78.233))) * 43758.5453) - 0.5)*0.010;
          gl_FragColor = vec4(base, 1.0);
        }`
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const onResize = () => { renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false); uniforms.uRes.value.set(innerWidth, innerHeight, dpr); };
    window.addEventListener('resize', onResize, { passive: true }); onResize();

    let last = performance.now();
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (!state.running) { last = now; return; }
      const dt = Math.min(0.033, (now - last) / 1000); last = now;
      state.mx += (state.mxT - state.mx) * (lowPower ? 0.14 : 0.20);
      state.my += (state.myT - state.my) * (lowPower ? 0.14 : 0.20);
      state.scroll += (state.scrollT - state.scroll) * (lowPower ? 0.10 : 0.12);
      uniforms.uMouse.value.set(state.mx, state.my); uniforms.uScroll.value = state.scroll;
      if (!reducedMotion) state.t += dt * (lowPower ? 0.55 : 1);
      uniforms.uTime.value = state.t;
      renderer.render(scene, camera);
    };
    requestAnimationFrame(tick);
  });
})();