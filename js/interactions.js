(() => {
  'use strict';
  const { qs, qsa, isReducedMotion } = window.__siteUtils;

  const initMagnetic = () => {
    if (isReducedMotion()) return;
    qsa('.magnetic-wrap').forEach(wrap => {
      const target = wrap.querySelector('.magnetic-target') || wrap.firstElementChild;
      if (!target) return;
      let rect = null, raf = 0, curX = 0, curY = 0, toX = 0, toY = 0;
      
      const animate = () => {
        curX += (toX - curX) * 0.22;
        curY += (toY - curY) * 0.22;
        target.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;
        if (Math.abs(toX - curX) > 0.02 || Math.abs(toY - curY) > 0.02) raf = requestAnimationFrame(animate);
        else raf = 0;
      };

      wrap.addEventListener('pointerenter', () => rect = wrap.getBoundingClientRect(), { passive: true });
      wrap.addEventListener('pointermove', e => {
        if (!rect) rect = wrap.getBoundingClientRect();
        toX = Math.max(-10, Math.min(10, (e.clientX - rect.left - rect.width / 2) * 0.12));
        toY = Math.max(-10, Math.min(10, (e.clientY - rect.top - rect.height / 2) * 0.12));
        if (!raf) raf = requestAnimationFrame(animate);
      }, { passive: true });
      wrap.addEventListener('pointerleave', () => { toX = 0; toY = 0; rect = null; if (!raf) raf = requestAnimationFrame(animate); }, { passive: true });
    });
  };

  const initTilt = () => {
    const cards = qsa('.project-card, .tilt-card, .glass-card, .social-card2, .contact-email-card');
    if (isReducedMotion()) return;
    
    cards.forEach(card => {
      let bounds = null, isHovering = false, rafId = 0;
      const cur = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 }, target = { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 };

      const animate = () => {
        const ease = isHovering ? 0.25 : 0.1;
        cur.x += (target.x - cur.x) * ease; cur.y += (target.y - cur.y) * ease;
        cur.rx += (target.rx - cur.rx) * ease; cur.ry += (target.ry - cur.ry) * ease;
        cur.s += (target.s - cur.s) * ease;
        
        card.style.transform = `perspective(1000px) scale(${cur.s.toFixed(3)}) translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0) rotateX(${cur.rx.toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg)`;
        
        if (!isHovering && Math.abs(target.x - cur.x) < 0.01 && Math.abs(target.s - cur.s) < 0.001) {
          card.style.transform = 'none';
          rafId = 0;
        } else {
          rafId = requestAnimationFrame(animate);
        }
      };

      card.addEventListener('pointerenter', () => { isHovering = true; bounds = card.getBoundingClientRect(); target.s = 1.02; if (!rafId) rafId = requestAnimationFrame(animate); }, { passive: true });
      card.addEventListener('pointermove', e => {
        if (!bounds) return;
        const x = e.clientX - bounds.left, y = e.clientY - bounds.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
        const dx = x - bounds.width / 2, dy = y - bounds.height / 2;
        target.rx = -(dy / Math.max(1, bounds.height / 2)) * 6;
        target.ry = (dx / Math.max(1, bounds.width / 2)) * 6;
        target.x = dx * 0.05; target.y = dy * 0.05;
        if (!rafId) rafId = requestAnimationFrame(animate);
      }, { passive: true });
      card.addEventListener('pointerleave', () => { isHovering = false; Object.assign(target, { x: 0, y: 0, rx: 0, ry: 0, s: 1.0 }); if (!rafId) rafId = requestAnimationFrame(animate); }, { passive: true });
    });
  };

  document.addEventListener('DOMContentLoaded', () => { initMagnetic(); initTilt(); });
})();