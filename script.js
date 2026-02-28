(() => {
  document.documentElement.classList.add('js');
  const ensure = (selector, create) => {
    if (document.head.querySelector(selector)) return;
    document.head.appendChild(create());
  };

  ensure('link[rel="icon"][type="image/png"][href="/assets/icons/favicon.png"]', () => {
    const l = document.createElement('link');
    l.rel = 'icon';
    l.type = 'image/png';
    l.sizes = '32x32';
    l.href = '/assets/icons/favicon.png';
    return l;
  });

  ensure('link[rel="apple-touch-icon"][href="/assets/icons/favicon.png"]', () => {
    const l = document.createElement('link');
    l.rel = 'apple-touch-icon';
    l.href = '/assets/icons/favicon.png';
    return l;
  });

  ensure('meta[name="theme-color"][content="#0D0F13"]', () => {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    m.content = '#0D0F13';
    return m;
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  const path = (location.pathname || '/').toLowerCase();

  const syncNav = () => {
    if (!navLinks) return;

    const isAbout = document.body.classList.contains('about-page') || path.startsWith('/about');
    const existingAbout = navLinks.querySelector('a[href="/about/"]');

    if (isAbout && !existingAbout) {
      const li = document.createElement('li');
      li.className = 'magnetic-wrap';
      const a = document.createElement('a');
      a.className = 'nav-link magnetic-target';
      a.href = '/about/';
      a.textContent = 'About';
      li.appendChild(a);
      navLinks.appendChild(li);
    }

    if (!isAbout && existingAbout) {
      existingAbout.closest('li')?.remove();
    }

    navLinks.querySelectorAll('a.nav-link').forEach(a => a.classList.remove('active'));
    const active = (() => {
      if (path.startsWith('/projects')) return navLinks.querySelector('a[href="/projects/"]');
      if (path.startsWith('/contact')) return navLinks.querySelector('a[href="/contact/"]');
      if (path.startsWith('/about')) return navLinks.querySelector('a[href="/about/"]');
      return navLinks.querySelector('a[href="/"]');
    })();
    if (active) active.classList.add('active');
  };

  syncNav();

  let lastY = window.scrollY || 0;
  let ticking = false;
  let hidden = false;
  let downAccum = 0;

  const closeMenu = () => {
    if (!mobileToggle || !navLinks) return;
    mobileToggle.classList.remove('active');
    navLinks.classList.remove('open');
    if (mobileToggle.hasAttribute('aria-expanded')) mobileToggle.setAttribute('aria-expanded', 'false');
    if (mobileToggle.hasAttribute('aria-label')) mobileToggle.setAttribute('aria-label', 'Open menu');
  };

  const setScrolled = (y) => {
    if (!navbar) return;
    if (y > 10) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };

  const setHidden = (value) => {
    if (!navbar) return;
    hidden = value;
    navbar.classList.toggle('hidden', value);
    if (value) closeMenu();
  };

  const onScroll = () => {
    const y = window.scrollY || 0;
    const delta = y - lastY;
    setScrolled(y);
    if (y <= 12) {
      downAccum = 0;
      setHidden(false);
    } else if (delta > 0) {
      downAccum += delta;
      if (downAccum > 42 && y > 120) setHidden(true);
    } else if (delta < 0) {
      downAccum = 0;
      if (delta < -6) setHidden(false);
    }

    lastY = y;
    ticking = false;
  };

  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  };

  setScrolled(lastY);
  window.addEventListener('scroll', requestTick, { passive: true });

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lenis = null;

  if (window.Lenis && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.35,
      smoothWheel: true,
      smoothTouch: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.25,
      easing: (t) => 1 - Math.pow(1 - t, 3)
    });

    const rafLenis = (time) => {
      lenis.raf(time);
      requestAnimationFrame(rafLenis);
    };
    requestAnimationFrame(rafLenis);
  }

  if (mobileToggle && navLinks) {
    const toggleMenu = (e) => {
      e.stopPropagation();
      const willOpen = !navLinks.classList.contains('open');
      mobileToggle.classList.toggle('active', willOpen);
      navLinks.classList.toggle('open', willOpen);
      if (mobileToggle.hasAttribute('aria-expanded')) {
        mobileToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      }
      if (mobileToggle.hasAttribute('aria-label')) {
        mobileToggle.setAttribute('aria-label', willOpen ? 'Close menu' : 'Open menu');
      }
    };

    mobileToggle.addEventListener('click', toggleMenu);
    mobileToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(e); }
    });

    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    document.addEventListener('click', (e) => {
      const clickedInside = navLinks.contains(e.target) || mobileToggle.contains(e.target);
      if (!clickedInside) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    }, { passive: true });

    window.addEventListener('scroll', () => {
      if (navLinks.classList.contains('open')) closeMenu();
    }, { passive: true });
  }

  const magneticWraps = document.querySelectorAll('.magnetic-wrap');
  magneticWraps.forEach((wrap) => {
    const target = wrap.querySelector('.magnetic-target');
    if (!target) return;

    let rect = null;
    let raf = null;
    let curX = 0, curY = 0;
    let toX = 0, toY = 0;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const animate = () => {
      curX += (toX - curX) * 0.22;
      curY += (toY - curY) * 0.22;
      target.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;
      if (Math.abs(toX - curX) < 0.02 && Math.abs(toY - curY) < 0.02) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(animate);
    };

    wrap.addEventListener('pointerenter', () => {
      rect = wrap.getBoundingClientRect();
    });

    wrap.addEventListener('pointermove', (e) => {
      if (!rect) rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const mx = clamp(x * 0.12, -10, 10);
      const my = clamp(y * 0.12, -10, 10);

      toX = mx;
      toY = my;

      if (!raf) raf = requestAnimationFrame(animate);
    });

    wrap.addEventListener('pointerleave', () => {
      toX = 0; toY = 0;
      rect = null;
      if (!raf) raf = requestAnimationFrame(animate);
    });
  });

  const tiltCards = document.querySelectorAll('.project-card, .tilt-card, .feature-card, .glass-card, .social-card2, .contact-email-card');
  tiltCards.forEach(card => {
    let bounds = null;
    let current = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
    let target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
    let isHovering = false;
    let rafId = null;

    const updateBounds = () => { bounds = card.getBoundingClientRect(); };

    const onEnter = () => {
      isHovering = true;
      updateBounds();
      target.s = 1.02;
      window.addEventListener('scroll', updateBounds, { passive: true });
      window.addEventListener('resize', updateBounds, { passive: true });
      if (!rafId) rafId = requestAnimationFrame(animate);
    };

    const onLeave = () => {
      isHovering = false;
      target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
      window.removeEventListener('scroll', updateBounds);
      window.removeEventListener('resize', updateBounds);
    };

    const onMove = (e) => {
      if (!bounds) return;

      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;

      card.style.setProperty('--mouse-x', x + 'px');
      card.style.setProperty('--mouse-y', y + 'px');

      const cx = bounds.width / 2;
      const cy = bounds.height / 2;
      const dx = x - cx;
      const dy = y - cy;

      const tilt = 6;
      target.rx = -(dy / cy) * tilt;
      target.ry = (dx / cx) * tilt;
      target.x = dx * 0.05;
      target.y = dy * 0.05;
    };

    const animate = () => {
      const ease = isHovering ? 0.25 : 0.1;

      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      current.rx += (target.rx - current.rx) * ease;
      current.ry += (target.ry - current.ry) * ease;
      current.s += (target.s - current.s) * ease;

      const tX = Math.round(current.x * 100) / 100;
      const tY = Math.round(current.y * 100) / 100;
      const rX = Math.round(current.rx * 1000) / 1000;
      const rY = Math.round(current.ry * 1000) / 1000;
      const sc = Math.round(current.s * 1000) / 1000;

      card.style.transform = `perspective(1000px) scale(${sc}) translate3d(${tX}px, ${tY}px, 0) rotateX(${rX}deg) rotateY(${rY}deg)`;

      const isResting = !isHovering &&
        Math.abs(target.x - current.x) < 0.01 &&
        Math.abs(target.y - current.y) < 0.01 &&
        Math.abs(target.rx - current.rx) < 0.01 &&
        Math.abs(target.ry - current.ry) < 0.01 &&
        Math.abs(target.s - current.s) < 0.001;

      if (isResting) {
        rafId = null;
        card.style.transform = 'perspective(1000px) scale(1) translate3d(0,0,0) rotateX(0) rotateY(0)';
        return;
      }

      rafId = requestAnimationFrame(animate);
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
  });

  
  const getCssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  const cssToHex = (v) => {
    const s = v.trim();
    if (!s) return 0xffffff;
    if (s[0] === '#') {
      const h = s.slice(1);
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      const n = parseInt(full, 16);
      return Number.isFinite(n) ? n : 0xffffff;
    }
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (!m) return 0xffffff;
    const parts = m[1].split(',').map(x => parseFloat(x.trim()));
    const r = Math.max(0, Math.min(255, parts[0] || 0));
    const g = Math.max(0, Math.min(255, parts[1] || 0));
    const b = Math.max(0, Math.min(255, parts[2] || 0));
    return ((r << 16) | (g << 8) | b) >>> 0;
  };

  const initThreePageFx = (canvasId, preset) => {
    if (!window.THREE) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const accent = cssToHex(getCssVar('--accent', '#2B4C7E'));
    const accent2 = cssToHex(getCssVar('--accent2', '#2E6B4F'));
    const accent3 = cssToHex(getCssVar('--accent3', '#7C96B6'));

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 0, 14);

    const ambient = new THREE.AmbientLight(0xffffff, (preset === 'projects' || preset === 'contact') ? 0.78 : 0.55);
    scene.add(ambient);

    const key = new THREE.PointLight(0xffffff, (preset === 'projects' || preset === 'contact') ? 1.35 : 1.05, 60);
    key.position.set(6, 6, 10);
    scene.add(key);

    const fill = new THREE.PointLight(0xffffff, (preset === 'projects' || preset === 'contact') ? 0.85 : 0.65, 60);
    fill.position.set(-7, -4, 10);
    scene.add(fill);

    scene.fog = new THREE.FogExp2(0x000000, (preset === 'projects' || preset === 'contact') ? 0.015 : 0.022);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    size();
    window.addEventListener('resize', size, { passive: true });

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      pointer.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
    }, { passive: true });

    const mkParticles = (count) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      const c1 = new THREE.Color(accent3);
      const c2 = new THREE.Color(accent);

      for (let i = 0; i < count; i++) {
        const r = 6.0 * Math.pow(Math.random(), 0.55);
        const a = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 6.5;
        pos[i * 3 + 0] = Math.cos(a) * r;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(a) * r;

        const t = Math.min(1, Math.max(0, r / 6));
        const c = c1.clone().lerp(c2, t);
        col[i * 3 + 0] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

      const mat = new THREE.PointsMaterial({
        size: preset === 'contact' ? 0.06 : 0.05,
        transparent: true,
        opacity: (preset === 'projects' || preset === 'contact') ? 0.72 : 0.48,
        vertexColors: true,
        depthWrite: false
      });

      const pts = new THREE.Points(geo, mat);
      return pts;
    };

    const particles = mkParticles(preset === 'projects' ? 1400 : 1000);
    particles.position.z = -6;
    scene.add(particles);

    const coreMat = new THREE.MeshStandardMaterial({
      color: accent,
      roughness: 0.52,
      metalness: 0.30,
      transparent: true,
      opacity: (preset === 'projects' || preset === 'contact') ? 0.56 : 0.38,
      emissive: new THREE.Color(accent2),
      emissiveIntensity: (preset === 'projects' || preset === 'contact') ? 0.34 : 0.18
    });

    let core;
    if (preset === 'about') {
      core = new THREE.Mesh(new THREE.TorusKnotGeometry(2.15, 0.62, 160, 20), coreMat);
      core.position.set(2.2, -0.2, -1.2);
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(2.15, 0.62, 90, 12)),
        new THREE.LineBasicMaterial({ color: accent3, transparent: true, opacity: 0.16 })
      );
      wire.position.copy(core.position);
      scene.add(wire);
    } else if (preset === 'contact') {
      core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 1), coreMat);
      core.position.set(-2.0, 0.4, -1.5);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.1, 0.06, 12, 220),
        new THREE.MeshBasicMaterial({ color: accent2, transparent: true, opacity: 0.18 })
      );
      ring.rotation.x = Math.PI * 0.45;
      ring.rotation.y = Math.PI * 0.2;
      ring.position.copy(core.position);
      scene.add(ring);
    } else {
      core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.35, 2), coreMat);
      core.position.set(2.0, 0.2, -1.2);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.4, 0.085, 12, 260),
        new THREE.MeshBasicMaterial({ color: accent2, transparent: true, opacity: 0.14 })
      );
      ring.rotation.x = Math.PI * 0.55;
      ring.rotation.y = Math.PI * 0.08;
      ring.position.copy(core.position);
      scene.add(ring);
    }
    scene.add(core);

    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = document.visibilityState === 'visible';
      if (running) requestAnimationFrame(loop);
    });

    const loop = (t) => {
      if (!running) return;
      const time = (t || 0) * 0.001;

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      const px = pointer.x;
      const py = pointer.y;

      camera.position.x += ((px * 1.5) - camera.position.x) * 0.06;
      camera.position.y += ((py * 0.95) - camera.position.y) * 0.06;
      camera.lookAt(0, 0, 0);

      key.position.x = 6 + px * 6;
      key.position.y = 6 + py * 5;

      particles.rotation.y = time * 0.06 + px * 0.08;
      particles.rotation.x = time * 0.04 + py * 0.06;

      core.rotation.y = time * 0.42 + px * 0.35;
      core.rotation.x = time * 0.28 + py * 0.22;

      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  if (document.body.classList.contains('about-page')) initThreePageFx('fx-about', 'about');
  if (document.body.classList.contains('projects-page')) initThreePageFx('fx-projects', 'projects');
  if (document.body.classList.contains('contact-page')) initThreePageFx('fx-contact', 'contact');

window.copyEmail = function () {
    const el = document.getElementById('email-text');
    if (!el) return;

    const feedback = document.getElementById('copy-feedback');
    const email = el.innerText.trim();

    const show = (text) => {
      if (!feedback) return;
      feedback.textContent = text;
      feedback.classList.add('active');
      clearTimeout(window.__copyTimer);
      window.__copyTimer = setTimeout(() => {
        feedback.classList.remove('active');
        setTimeout(() => { feedback.textContent = ''; }, 220);
      }, 1400);
    };

    navigator.clipboard.writeText(email).then(() => {
      show('Copied');
    }).catch(() => {
      show('Copy failed');
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
  const wantsUnifiedBg = true;
if (wantsUnifiedBg) {

  function injectHomeBg() {
    if (document.getElementById('home-bg')) return;

    const wrap = document.createElement('div');
    wrap.id = 'home-bg';

    const canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas';
    canvas.id = 'bg-three';

    const vignette = document.createElement('div');
    vignette.className = 'bg-vignette';

    wrap.appendChild(canvas);
    const mountains = document.createElement('div');
    mountains.className = 'mountains';
    mountains.innerHTML = `
      <div class="mountain-layer layer-back"></div>
      <div class="mountain-layer layer-mid"></div>
      <div class="mountain-layer layer-front"></div>
      <div class="mountain-glow" aria-hidden="true"></div>
    `;
    wrap.appendChild(mountains);

    wrap.appendChild(vignette);

    document.body.insertBefore(wrap, document.body.firstChild);
  }
  injectHomeBg();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower =
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const dprCap = lowPower ? 1 : 1.0;
let bgRoot = document.getElementById('home-bg');
if (!bgRoot) {
  bgRoot = document.createElement('div');
  bgRoot.id = 'home-bg';
  bgRoot.innerHTML = '<canvas id="bg-three"></canvas><div class="bg-vignette" aria-hidden="true"></div>';
  document.body.prepend(bgRoot);
}
const canvas = document.getElementById('bg-three');

  const state = {
    w: 0, h: 0, dpr: 1,
    mx: 0.5, my: 0.35, mxT: 0.5, myT: 0.35,
    scroll: 0, scrollT: 0,
    t: 0,
    running: true
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const onPointer = (e) => {
    const x = (e.clientX || (state.w * 0.5)) / Math.max(1, state.w);
    const y = (e.clientY || (state.h * 0.35)) / Math.max(1, state.h);
    state.mxT = clamp01(x);
    state.myT = clamp01(y);
    const bg = document.getElementById('home-bg');
    if (bg) {
      bg.style.setProperty('--bgx', `${state.mxT * 100}%`);
      bg.style.setProperty('--bgy', `${state.myT * 100}%`);
      bg.style.setProperty('--mx', `${state.mxT}`);
      bg.style.setProperty('--my', `${state.myT}`);
    }
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });

  const updateScroll = () => {
    const doc = document.documentElement;
    const max = Math.max(1, (doc.scrollHeight || 1) - window.innerHeight);
    state.scrollT = clamp01((window.scrollY || 0) / max);
    const bg = document.getElementById('home-bg');
    if (bg) bg.style.setProperty('--scr', `${state.scrollT}`);
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  const vignette = document.querySelector('#home-bg .bg-vignette');

  const ensureSize = (renderer, camera, uRes) => {
    state.w = Math.max(1, window.innerWidth);
    state.h = Math.max(1, window.innerHeight);
    state.dpr = Math.min(dprCap, window.devicePixelRatio || 1);
    renderer.setPixelRatio(state.dpr);
    renderer.setSize(state.w, state.h, false);
    if (camera) camera.updateProjectionMatrix();
    if (uRes) uRes.value.set(state.w, state.h, state.dpr);
    if (vignette) vignette.style.opacity = lowPower ? '0.65' : '0.75';
  };

  document.addEventListener('visibilitychange', () => {
    state.running = !document.hidden;
  }, { passive: true });

  if (!window.THREE || !canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !lowPower,
    powerPreference: lowPower ? 'low-power' : 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const getCss = (name, fallback) => (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.35) },
    uScroll: { value: 0 },
    uRes: { value: new THREE.Vector3(1, 1, 1) },
    uAccentA: { value: new THREE.Color(getCss('--accent', '#2B4C7E')) },
    uAccentB: { value: new THREE.Color(getCss('--accent2', '#2E6B4F')) },
    uAccentC: { value: new THREE.Color(getCss('--accent3', '#7C96B6')) }
  };

  const vert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

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
      p += (uMouse - vec2(0.5)) * vec2(-0.15, 0.10);

      float a = sin(p.x * 3.2 + uTime * 0.06);
      float b = sin(p.y * 4.6 - uTime * 0.05);
      float c = sin((p.x + p.y) * 2.4);
      float d = sin(p.x * 9.5) * sin(p.y * 7.8);

      float h = (a*b + 0.35*c + 0.25*d);
      h = 0.5 + 0.5*h;            // 0..1
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
      vec3 l = normalize(vec3(lm * 0.65, 0.95));
      float diff = clamp(dot(n, l), 0.0, 1.0);
      float sky = smoothstep(0.15, 1.0, uv.y);
      vec3 base = mix(vec3(0.035,0.040,0.048), vec3(0.075,0.080,0.092), sky);
      vec3 mist = mix(uAccentA*0.10, uAccentC*0.12, sky);
      base += mist * 0.55;
      base += (diff - 0.5) * 0.10;
      base += (h - 0.5) * 0.05;
      vec2 pp = uv - vec2(0.5 + lm.x*0.12, 0.55 + lm.y*0.08);
      float glow = exp(-dot(pp,pp)*8.5);
      base += (uAccentB*0.18 + vec3(1.0)*0.06) * glow * 0.55;
      float gn = fract(sin(dot(uv*uRes.xy, vec2(12.9898,78.233))) * 43758.5453);
      base += (gn - 0.5) * 0.010;

      gl_FragColor = vec4(base, 1.0);
    }
  `;

  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    depthTest: false,
    depthWrite: false
  });

  scene.add(new THREE.Mesh(geo, mat));

  ensureSize(renderer, camera, uniforms.uRes);
  window.addEventListener('resize', () => ensureSize(renderer, camera, uniforms.uRes), { passive: true });

  let last = performance.now();
  function tick(now){
    requestAnimationFrame(tick);
    if (!state.running) return;

    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    state.mx += (state.mxT - state.mx) * (lowPower ? 0.10 : 0.14);
    state.my += (state.myT - state.my) * (lowPower ? 0.10 : 0.14);
    state.scroll += (state.scrollT - state.scroll) * (lowPower ? 0.10 : 0.12);

    uniforms.uMouse.value.set(state.mx, state.my);
    uniforms.uScroll.value = state.scroll;

    if (!reduceMotion) state.t += dt;
    uniforms.uTime.value = state.t;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}

});
  (function disableCopy(){
    const block = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    document.addEventListener('selectstart', block);
    })();
