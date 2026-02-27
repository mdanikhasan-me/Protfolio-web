document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  let lastY = window.scrollY || 0;
  let ticking = false;
  let hidden = false;

  const closeMenu = () => {
    if (!mobileToggle || !navLinks) return;
    mobileToggle.classList.remove('active');
    navLinks.classList.remove('open');
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

    if (y <= 8) {
      setHidden(false);
    } else if (delta > 1 && y > 24) {
      setHidden(true);
    } else if (delta < -1) {
      setHidden(false);
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
      mobileToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
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

  const introOverlay = document.querySelector('.intro-overlay');
  if (introOverlay) {
    setTimeout(() => {
      document.body.classList.remove('loading');
      document.querySelectorAll('.hero-section .fade-up').forEach(el => el.classList.add('in-view'));
      setTimeout(() => { introOverlay.style.display = 'none'; }, 220);
    }, 1200);
  } else {
    requestAnimationFrame(() => document.body.classList.remove('loading'));
  }

    const isHome = document.body.classList.contains('home-page');

  
if (isHome) {
  const overlay = document.querySelector('.intro-overlay');
  setTimeout(() => {
    document.body.classList.remove('loading');
    document.querySelectorAll('.hero-section .fade-up').forEach(el => el.classList.add('in-view'));
    if (overlay) setTimeout(() => overlay.classList.add('hidden'), 220);
  }, 1200);

  const state = {
    w: 0,
    h: 0,
    dpr: 1,
    mx: 0.5,
    my: 0.35,
    mxT: 0.5,
    myT: 0.35,
    scroll: 0,
    scrollT: 0,
    reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    running: true
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function injectHomeBg() {
    if (document.getElementById('home-bg')) return;

    const wrap = document.createElement('div');
    wrap.id = 'home-bg';

    const grid = document.createElement('div');
    grid.className = 'bg-grid';

    const spot = document.createElement('div');
    spot.className = 'bg-spotlight';

    const vignette = document.createElement('div');
    vignette.className = 'bg-vignette';

    const noise = document.createElement('canvas');
    noise.className = 'bg-canvas bg-noise';
    noise.id = 'bg-noise';

    const canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas';
    canvas.id = 'bg-three';

    wrap.appendChild(canvas);
    wrap.appendChild(noise);
    wrap.appendChild(grid);
    wrap.appendChild(spot);
    wrap.appendChild(vignette);

    document.body.insertBefore(wrap, document.body.firstChild);
  }

  injectHomeBg();

  const bgWrap = document.getElementById('home-bg');
  const threeCanvas = document.getElementById('bg-three');
  const noiseCanvas = document.getElementById('bg-noise');
  const bgGrid = bgWrap ? bgWrap.querySelector('.bg-grid') : null;

  const sections = Array.from(document.querySelectorAll('main section'));
  const getScrollProgress = () => {
    if (!sections.length) {
      const doc = document.documentElement;
      const max = Math.max(1, (doc.scrollHeight || 1) - window.innerHeight);
      return clamp01((window.scrollY || 0) / max);
    }
    const mid = (window.scrollY || 0) + window.innerHeight * 0.55;
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      const r = sections[i].getBoundingClientRect();
      const top = r.top + (window.scrollY || 0);
      const bot = top + r.height;
      if (mid >= top && mid <= bot) { idx = i; break; }
      if (mid > bot) idx = i;
    }
    const sec = sections[idx];
    const r = sec.getBoundingClientRect();
    const top = r.top + (window.scrollY || 0);
    const span = Math.max(1, r.height);
    const local = clamp01((mid - top) / span);
    const denom = Math.max(1, sections.length - 1);
    return clamp01((idx + local) / denom);
  };

  function onPointerMove(e) {
    state.mxT = clamp01(e.clientX / Math.max(1, window.innerWidth));
    state.myT = clamp01(e.clientY / Math.max(1, window.innerHeight));
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!e.touches || !e.touches[0]) return;
    onPointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
  }, { passive: true });

  function resize() {
    state.w = Math.max(1, window.innerWidth);
    state.h = Math.max(1, window.innerHeight);
    state.dpr = Math.min(2, window.devicePixelRatio || 1);

    if (noiseCanvas) {
      noiseCanvas.width = Math.floor(state.w * state.dpr);
      noiseCanvas.height = Math.floor(state.h * state.dpr);
    }
    threeBg && threeBg.resize(state.w, state.h, state.dpr);
  }

  window.addEventListener('resize', resize, { passive: true });

  let noiseCtx = null;
  let noiseImg = null;
  let noiseTick = 0;

  function initNoise() {
    if (!noiseCanvas) return;
    noiseCtx = noiseCanvas.getContext('2d', { alpha: true });
    noiseImg = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
  }

  function drawNoise() {
    if (!noiseCtx || !noiseImg) return;
    noiseTick++;
    if (noiseTick % 2 !== 0) return;

    const d = noiseImg.data;
    const w = noiseCanvas.width;
    const h = noiseCanvas.height;
    const stride = 4;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const o = (y * w + x) * stride;
        const v = (Math.random() * 255) | 0;
        d[o] = v;
        d[o + 1] = v;
        d[o + 2] = v;
        d[o + 3] = 20;
      }
    }
    noiseCtx.putImageData(noiseImg, 0, 0);
  }

  function hexToInt(h) {
    return parseInt((h || '#ffffff').replace('#', ''), 16);
  }

  function initThreeBackground(canvas) {
    if (!canvas || !window.THREE) return null;

    const THREE = window.THREE;
    const css = getComputedStyle(document.documentElement);

    const cNavy = hexToInt(css.getPropertyValue('--accent').trim() || '#2b4c7e');
    const cForest = hexToInt(css.getPropertyValue('--accent2').trim() || '#2e6b4f');
    const cSteel = hexToInt(css.getPropertyValue('--accent3').trim() || '#7c96b6');

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b10, 0.055);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 0.4, 16);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(cSteel, 0.35);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(cNavy, 0.55);
    key.position.set(6, 10, 8);
    scene.add(key);

    const pointerLight = new THREE.PointLight(cForest, 0.9, 45, 1.9);
    pointerLight.position.set(0, 0, 8);
    scene.add(pointerLight);

    const rim = new THREE.DirectionalLight(cForest, 0.28);
    rim.position.set(-8, -6, 10);
    scene.add(rim);

    const createSwirl = (count, radius, height, color, size, opacity) => {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const a = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = radius * (0.15 + Math.random() * 0.85);
        const y = (Math.random() - 0.5) * height;
        const ix = i * 3;
        pos[ix] = Math.cos(t) * r;
        pos[ix + 1] = y;
        pos[ix + 2] = Math.sin(t) * r;
        a[i] = Math.random();
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('a', new THREE.BufferAttribute(a, 1));

      const m = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      return new THREE.Points(g, m);
    };

    const far = createSwirl(2600, 18, 18, cSteel, 0.028, 0.26);
    far.position.z = -10;
    group.add(far);

    const mid = createSwirl(1700, 12, 14, cNavy, 0.030, 0.28);
    mid.position.z = -2;
    group.add(mid);

    const ring = createSwirl(1200, 7.5, 8, cForest, 0.034, 0.30);
    ring.position.z = 4;
    group.add(ring);

    const grid = new THREE.GridHelper(56, 56, cSteel, cSteel);
    grid.material.transparent = true;
    grid.material.opacity = 0.05;
    grid.material.depthWrite = false;
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -14;
    group.add(grid);

    const coreGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: cNavy,
      roughness: 0.62,
      metalness: 0.18,
      emissive: cForest,
      emissiveIntensity: 0.08
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.1, 6.5);
    group.add(core);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.9, 1)),
      new THREE.LineBasicMaterial({ color: cSteel, transparent: true, opacity: 0.20 })
    );
    wire.position.copy(core.position);
    group.add(wire);

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(2.6, 0.16, 180, 10),
      new THREE.MeshStandardMaterial({
        color: cSteel,
        roughness: 0.75,
        metalness: 0.12,
        emissive: cNavy,
        emissiveIntensity: 0.04,
        transparent: true,
        opacity: 0.55
      })
    );
    knot.position.set(0, 0.0, 5.8);
    knot.rotation.x = Math.PI * 0.2;
    group.add(knot);

    let lastT = 0;

    function resizeTo(w, h, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }

    function render(now) {
      const t = now * 0.001;
      const dt = Math.min(0.033, Math.max(0.0, t - lastT));
      lastT = t;

      const s = state.scroll;
      const mx = (state.mx - 0.5) * 2.0;
      const my = (state.my - 0.5) * 2.0;

      pointerLight.position.x += (mx * 7.5 - pointerLight.position.x) * 0.08;
      pointerLight.position.y += (-my * 4.2 - pointerLight.position.y) * 0.08;

      const tz = 16 - s * 6.5;
      const ty = 0.4 + s * 2.3;
      const tx = mx * 0.9;

      camera.position.z += (tz - camera.position.z) * 0.06;
      camera.position.y += (ty - camera.position.y) * 0.06;
      camera.position.x += (tx - camera.position.x) * 0.05;

      const lookZ = 6.5 - s * 1.8;
      camera.lookAt(new THREE.Vector3(mx * 0.8, -my * 0.45 + s * 0.4, lookZ));

      group.rotation.y = t * 0.10 + s * 1.55;
      group.rotation.x = (-my * 0.22) + s * 0.12;

      far.rotation.y += dt * 0.018;
      mid.rotation.y += dt * 0.028;
      ring.rotation.y += dt * 0.042;

      core.rotation.y += dt * (0.55 + Math.abs(mx) * 0.15);
      core.rotation.x += dt * (0.28 + Math.abs(my) * 0.12);
      wire.rotation.copy(core.rotation);
      wire.position.copy(core.position);

      knot.rotation.y += dt * 0.18;
      knot.rotation.z += dt * 0.12;

      const pulse = 0.06 + 0.04 * Math.sin(t * 0.9);
      coreMat.emissiveIntensity = 0.06 + pulse + (0.06 * (1.0 - Math.min(1.0, Math.abs(mx) + Math.abs(my))));

      renderer.render(scene, camera);
    }

    return { resize: resizeTo, render };
  }

  const threeBg = initThreeBackground(threeCanvas);

  resize();
  initNoise();

  function onVisibility() {
    state.running = !document.hidden;
  }

  document.addEventListener('visibilitychange', onVisibility);

  function frame(now) {
    state.scrollT = getScrollProgress();

    state.mx += (state.mxT - state.mx) * 0.12;
    state.my += (state.myT - state.my) * 0.12;
    state.scroll += (state.scrollT - state.scroll) * 0.09;

    const bgx = (state.mx * 100).toFixed(2) + '%';
    const bgy = (state.my * 100).toFixed(2) + '%';
    document.documentElement.style.setProperty('--bgx', bgx);
    document.documentElement.style.setProperty('--bgy', bgy);

    if (bgGrid) {
      const tx = ((state.mx - 0.5) * -24).toFixed(2);
      const ty = ((state.my - 0.5) * -18 + state.scroll * -60).toFixed(2);
      bgGrid.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }

    if (!state.reduceMotion) drawNoise();

    if (state.running && threeBg) {
      threeBg.render(now);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}


});
