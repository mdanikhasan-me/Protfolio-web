(() => {
  'use strict';
    const perf = window.__sitePerf || { tier: 'mid', reducedMotion: false, dpr: 1 };
  const reduceMotion = !!perf.reducedMotion;
  const lowPower = perf.tier === 'low';

  function injectHomeBg() {
    if (document.getElementById('home-bg')) return;

    const wrap = document.createElement('div');
    wrap.id = 'home-bg';

    const canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas';
    canvas.id = 'bg-three';

    const mountains = document.createElement('div');
    mountains.className = 'mountains';
    mountains.innerHTML = `
      <div class="mountain-layer layer-back"></div>
      <div class="mountain-layer layer-mid"></div>
      <div class="mountain-layer layer-front"></div>
      <div class="mountain-glow" aria-hidden="true"></div>
    `;

    const vignette = document.createElement('div');
    vignette.className = 'bg-vignette';
    vignette.setAttribute('aria-hidden', 'true');

    wrap.appendChild(canvas);
    wrap.appendChild(mountains);
    wrap.appendChild(vignette);

    document.body.insertBefore(wrap, document.body.firstChild);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('home-page')) return;

    injectHomeBg();

    const bg = document.getElementById('home-bg');
    const canvas = document.getElementById('bg-three');

    const state = {
      // frame limiting for low tier
      _lastT: 0,
      _acc: 0,
      _step: (lowPower ? 1/30 : 1/60),
      _maxSub: (lowPower ? 1 : 2),
      
      mx: 0.55, my: 0.35, mxT: 0.55, myT: 0.35,
      scroll: 0, scrollT: 0,
      running: true,
      t: 0
    };

    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    const onPointer = (e) => {
      const x = (e.clientX ?? (innerWidth * 0.55)) / Math.max(1, innerWidth);
      const y = (e.clientY ?? (innerHeight * 0.35)) / Math.max(1, innerHeight);
      state.mxT = clamp01(x);
      state.myT = clamp01(y);

      if (bg) {
        bg.style.setProperty('--bgx', (state.mxT * 100).toFixed(2) + '%');
        bg.style.setProperty('--bgy', (state.myT * 100).toFixed(2) + '%');
        bg.style.setProperty('--mx', state.mxT.toFixed(4));
        bg.style.setProperty('--my', state.myT.toFixed(4));
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('touchmove', (e) => {
      const t = e.touches && e.touches[0];
      if (t) onPointer(t);
    }, { passive: true });

    const updateScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, (doc.scrollHeight || 1) - innerHeight);
      state.scrollT = clamp01((scrollY || 0) / max);
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    const mtnBack = document.querySelector('#home-bg .layer-back');
    const mtnMid = document.querySelector('#home-bg .layer-mid');
    const mtnFront = document.querySelector('#home-bg .layer-front');

    const updateMountains = () => {
      const mx = (state.mx - 0.5);
      const my = (state.my - 0.5);
      const s  = (state.scroll - 0.5);

      if (mtnBack)  mtnBack.style.transform  = `translate3d(${(mx*36 + s*12).toFixed(2)}px, ${(my*24 + s*20).toFixed(2)}px, 0)`;
      if (mtnMid)   mtnMid.style.transform   = `translate3d(${(mx*52 + s*18).toFixed(2)}px, ${(my*36 + s*30).toFixed(2)}px, 0)`;
      if (mtnFront) mtnFront.style.transform = `translate3d(${(mx*70 + s*24).toFixed(2)}px, ${(my*48 + s*38).toFixed(2)}px, 0)`;
    };

    document.addEventListener('visibilitychange', () => { state.running = !document.hidden; }, { passive: true });

    if (!canvas || !window.THREE) {
      const tick = (now) => {
        requestAnimationFrame(tick);
        if (!state.running) { state._lastT = now || performance.now(); return; }

        if (!state._lastT) state._lastT = now || performance.now();
        const dt = Math.min(0.05, ((now || performance.now()) - state._lastT) / 1000);
        state._lastT = now || performance.now();
        state._acc += dt;

        let sub = 0;
        while (state._acc >= state._step && sub < state._maxSub) {
          sub++;
          state._acc -= state._step;

          state.mx += (state.mxT - state.mx) * (lowPower ? 0.10 : 0.14);
          state.my += (state.myT - state.my) * 0.14;
          state.scroll += (state.scrollT - state.scroll) * 0.12;
          updateMountains();
        }
        
        if (sub === 0) {
          state.mx += (state.mxT - state.mx) * (lowPower ? 0.10 : 0.14);
          state.my += (state.myT - state.my) * 0.14;
          state.scroll += (state.scrollT - state.scroll) * 0.12;
          updateMountains();
        }
      };
      requestAnimationFrame(tick);
      return;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !lowPower,
      powerPreference: lowPower ? 'low-power' : 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const getCss = (name, fallback) =>
      (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);

    const timeScale = (lowPower ? 0.55 : 1) * (reduceMotion ? 0.45 : 1);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.55, 0.35) },
      uScroll: { value: 0 },
      uRes: { value: new THREE.Vector3(1, 1, 1) },
      uAccentA: { value: new THREE.Color(getCss('--accent', '#2B4C7E')) },
      uAccentB: { value: new THREE.Color(getCss('--accent2', '#2E6B4F')) },
      uAccentC: { value: new THREE.Color(getCss('--accent3', '#7C96B6')) }
    };

    const vert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

    const frag = `
      #extension GL_OES_standard_derivatives : enable
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uScroll;
      uniform vec3 uRes;
      uniform vec3 uAccentA;
      uniform vec3 uAccentB;
      uniform vec3 uAccentC;

      float paper(vec2 p){
        p.y += uScroll * 0.25;
        p += (uMouse - vec2(0.5)) * vec2(-0.44, 0.32);
        float a = sin(p.x * 3.2 + uTime * 0.06);
        float b = sin(p.y * 4.6 - uTime * 0.05);
        float c = sin((p.x + p.y) * 2.4);
        float d = sin(p.x * 9.5) * sin(p.y * 7.8);
        float h = (a*b + 0.35*c + 0.25*d);
        h = 0.5 + 0.5*h;
        h = smoothstep(0.10, 0.95, h);
        return h;
      }

      void main(){
        vec2 uv = vUv;
        vec2 p  = uv * vec2(2.2, 1.8);
        float h = paper(p);
        vec2 g = vec2(dFdx(h), dFdy(h));
        vec3 n = normalize(vec3(g * 1.2, 0.35));
        vec2 lm = (uMouse - vec2(0.5)) * vec2(1.0, -1.0);
        vec3 l = normalize(vec3(lm * 0.85, 0.95));
        float diff = clamp(dot(n, l), 0.0, 1.0);

        float sky = smoothstep(0.15, 1.0, uv.y);
        vec3 base = mix(vec3(0.035,0.040,0.048), vec3(0.075,0.080,0.092), sky);
        vec3 mist = mix(uAccentA*0.10, uAccentC*0.12, sky);
        base += mist * 0.55;
        base += (diff - 0.5) * 0.10;
        base += (h - 0.5) * 0.05;

        vec2 pp = uv - vec2(0.5 + lm.x*0.16, 0.55 + lm.y*0.11);
        float glow = exp(-dot(pp,pp)*8.5);
        base += (uAccentB*0.18 + vec3(1.0)*0.06) * glow * 0.55;

        float gn = fract(sin(dot(uv*uRes.xy, vec2(12.9898,78.233))) * 43758.5453);
        base += (gn - 0.5) * 0.010;

        gl_FragColor = vec4(base, 1.0);
      }
    `;

    const ensureSize = () => {
      const dpr = Math.min(lowPower ? 1 : 2, window.devicePixelRatio || 1);
      renderer.setPixelRatio(dpr);
      renderer.setSize(Math.max(1, innerWidth), Math.max(1, innerHeight), false);
      uniforms.uRes.value.set(Math.max(1, innerWidth), Math.max(1, innerHeight), dpr);
    };
    ensureSize();
    window.addEventListener('resize', ensureSize, { passive: true });

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      depthTest: false,
      depthWrite: false
    });
    scene.add(new THREE.Mesh(geo, mat));

    let last = performance.now();
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (!state.running) return;

      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      state.mx += (state.mxT - state.mx) * (lowPower ? 0.14 : 0.20);
      state.my += (state.myT - state.my) * (lowPower ? 0.14 : 0.20);
      state.scroll += (state.scrollT - state.scroll) * (lowPower ? 0.10 : 0.12);

      updateMountains();

      uniforms.uMouse.value.set(state.mx, state.my);
      uniforms.uScroll.value = state.scroll;

      if (!reduceMotion) state.t += dt * timeScale;
      uniforms.uTime.value = state.t;

      renderer.render(scene, camera);
    };
    requestAnimationFrame(tick);
  });
})();