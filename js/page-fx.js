(() => {
  'use strict';

  const getCssVar = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };

  const cssToHex = (v) => {
    const s = (v || '').trim();
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

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getTier = () => (window.__sitePerf && window.__sitePerf.tier) || 'mid';
  const isLowPowerDevice = () => getTier() === 'low';


  const initThreePageFx = (canvasId, preset) => {
    if (!window.THREE) return;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const accent = cssToHex(getCssVar('--accent', '#2B4C7E'));
    const accent2 = cssToHex(getCssVar('--accent2', '#2E6B4F'));
    const accent3 = cssToHex(getCssVar('--accent3', '#7C96B6'));

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 0, 14);

    const strong = (preset === 'projects' || preset === 'contact');
    const ambient = new THREE.AmbientLight(0xffffff, strong ? 0.78 : 0.55);
    scene.add(ambient);

    const key = new THREE.PointLight(0xffffff, strong ? 1.35 : 1.05, 60);
    key.position.set(6, 6, 10);
    scene.add(key);

    const fill = new THREE.PointLight(0xffffff, strong ? 0.85 : 0.65, 60);
    fill.position.set(-7, -4, 10);
    scene.add(fill);

    scene.fog = new THREE.FogExp2(0x000000, strong ? 0.015 : 0.022);

        const tier = (window.__sitePerf && window.__sitePerf.tier) || 'mid';
    const lowPower = isLowPowerDevice();
    const maxDpr = tier === 'high' ? 2 : (tier === 'low' ? 1.25 : 1.5);
    const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);

    const size = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };

    size();

    const onResize = () => size();
    window.addEventListener('resize', onResize, { passive: true });

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e) => {
      pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      pointer.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

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
        opacity: strong ? 0.72 : 0.48,
        vertexColors: true,
        depthWrite: false
      });

      return new THREE.Points(geo, mat);
    };

    const particleCount = strong ? (lowPower ? 900 : 1400) : (lowPower ? 650 : 1000);
    const particles = mkParticles(preset === 'projects' ? particleCount : particleCount);
    particles.position.z = -6;
    scene.add(particles);

    const coreMat = new THREE.MeshStandardMaterial({
      color: accent,
      roughness: 0.52,
      metalness: 0.30,
      transparent: true,
      opacity: strong ? 0.56 : 0.38,
      emissive: new THREE.Color(accent2),
      emissiveIntensity: strong ? 0.34 : 0.18
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
    let rafId = 0;

    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running && !rafId) rafId = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const loop = (t) => {
      rafId = 0;
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
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    
    const cleanup = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);

      try {
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
            else obj.material.dispose?.();
          }
        });
      } catch {}
    };

    window.addEventListener('pagehide', cleanup, { once: true });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    if (body.classList.contains('about-page')) initThreePageFx('fx-about', 'about');
    if (body.classList.contains('projects-page')) initThreePageFx('fx-projects', 'projects');
    if (body.classList.contains('contact-page')) initThreePageFx('fx-contact', 'contact');
  });
})();