(() => {
  'use strict';
  const root = document.documentElement;
  if (window.__sitePerf?.reducedMotion) {
    document.addEventListener('DOMContentLoaded', () => {
      root.style.setProperty('--flash-x', '55%'); root.style.setProperty('--flash-y', '35%');
      root.style.setProperty('--bgx', '55%'); root.style.setProperty('--bgy', '35%');
    }); return;
  }

  const state = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, raf: 0 };
  const update = () => {
    state.raf = 0;
    state.x += (state.tx - state.x) * 0.16; state.y += (state.ty - state.y) * 0.16;
    const px = `${(state.x * 100).toFixed(2)}%`, py = `${(state.y * 100).toFixed(2)}%`;
    root.style.setProperty('--flash-x', px); root.style.setProperty('--flash-y', py);
    root.style.setProperty('--bgx', px); root.style.setProperty('--bgy', py);
    if (Math.abs(state.tx - state.x) > 0.001) state.raf = requestAnimationFrame(update);
  };

  const onMove = (x, y) => {
    state.tx = Math.max(0, Math.min(1, x / innerWidth)); state.ty = Math.max(0, Math.min(1, y / innerHeight));
    root.classList.add('has-pointer');
    if (!state.raf) state.raf = requestAnimationFrame(update);
  };

  document.addEventListener('DOMContentLoaded', () => {
    root.style.setProperty('--flash-x', '55%'); root.style.setProperty('--flash-y', '35%');
    window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
  });
})();