(() => {
  'use strict';

  const utils = window.__siteUtils || {};
  const qs = utils.qs || ((s, root = document) => root.querySelector(s));
  const qsa = utils.qsa || ((s, root = document) => Array.from(root.querySelectorAll(s)));

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    // Magnetic effect
    qsa('.magnetic-wrap').forEach((wrap) => {
      const target = qs('.magnetic-target', wrap);
      if (!target) return;

      let rect = null;
      let raf = 0;
      let curX = 0, curY = 0;
      let toX = 0, toY = 0;

      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

      const animate = () => {
        raf = 0;
        curX += (toX - curX) * 0.22;
        curY += (toY - curY) * 0.22;
        target.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;

        if (Math.abs(toX - curX) > 0.02 || Math.abs(toY - curY) > 0.02) {
          raf = requestAnimationFrame(animate);
        }
      };

      wrap.addEventListener('pointerenter', () => {
        rect = wrap.getBoundingClientRect();
      });

      wrap.addEventListener('pointermove', (e) => {
        if (!rect) rect = wrap.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        toX = clamp(x * 0.12, -10, 10);
        toY = clamp(y * 0.12, -10, 10);

        if (!raf) raf = requestAnimationFrame(animate);
      }, { passive: true });

      wrap.addEventListener('pointerleave', () => {
        toX = 0; toY = 0;
        rect = null;
        if (!raf) raf = requestAnimationFrame(animate);
      });
    });

    // Tilt effect (disabled for reduced motion)
    const tiltCards = qsa('.project-card, .tilt-card, .feature-card, .glass-card, .social-card2, .contact-email-card');
    if (!tiltCards.length) return;

    const reduced = prefersReducedMotion();

    tiltCards.forEach(card => {
      let bounds = null;

      let current = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
      let target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };

      let isHovering = false;
      let rafId = 0;
      let boundsDirty = false;
      let boundsRaf = 0;

      const updateBounds = () => { bounds = card.getBoundingClientRect(); };

      const queueBoundsUpdate = () => {
        boundsDirty = true;
        if (boundsRaf) return;
        boundsRaf = requestAnimationFrame(() => {
          boundsRaf = 0;
          if (!boundsDirty) return;
          boundsDirty = false;
          updateBounds();
        });
      };

      const onEnter = () => {
        if (reduced) return;
        isHovering = true;
        updateBounds();
        target.s = 1.02;
        window.addEventListener('scroll', queueBoundsUpdate, { passive: true });
        window.addEventListener('resize', queueBoundsUpdate, { passive: true });
        if (!rafId) rafId = requestAnimationFrame(animate);
      };

      const onLeave = () => {
        if (reduced) return;
        isHovering = false;
        target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };
        window.removeEventListener('scroll', queueBoundsUpdate);
        window.removeEventListener('resize', queueBoundsUpdate);
        // animation easerest.
        if (!rafId) rafId = requestAnimationFrame(animate);
      };

      const onMove = (e) => {
        if (reduced) return;
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
        target.rx = -(dy / Math.max(1, cy)) * tilt;
        target.ry = (dx / Math.max(1, cx)) * tilt;
        target.x = dx * 0.05;
        target.y = dy * 0.05;

        if (!rafId) rafId = requestAnimationFrame(animate);
      };

      const animate = () => {
        rafId = 0;

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

        card.style.transform =
          `perspective(1000px) scale(${sc}) translate3d(${tX}px, ${tY}px, 0) rotateX(${rX}deg) rotateY(${rY}deg)`;

        const isResting =
          !isHovering &&
          Math.abs(target.x - current.x) < 0.01 &&
          Math.abs(target.y - current.y) < 0.01 &&
          Math.abs(target.rx - current.rx) < 0.01 &&
          Math.abs(target.ry - current.ry) < 0.01 &&
          Math.abs(target.s - current.s) < 0.001;

        if (isResting) {
          card.style.transform = 'perspective(1000px) scale(1) translate3d(0,0,0) rotateX(0) rotateY(0)';
          return;
        }

        rafId = requestAnimationFrame(animate);
      };

      if (reduced) {
        // Ensure transforms don't stick for reduced motion users.
        card.style.transform = '';
        return;
      }

      card.addEventListener('pointerenter', onEnter);
      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerleave', onLeave);
    });

    // Social hover accent (color shift)
    qsa('.social-card2').forEach(card => {
      const accent = card.getAttribute('data-accent');
      if (accent) card.style.setProperty('--social-accent', accent);

      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
        card.style.setProperty('--mouse-y', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
  });
})();