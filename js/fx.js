(() => {
  'use strict';
  const root = document.documentElement;
  const state = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35, raf: 0 };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const setVars = () => {
    state.raf = 0;
    state.x += (state.tx - state.x) * 0.16;
    state.y += (state.ty - state.y) * 0.16;

    const px = (state.x * 100).toFixed(2) + '%';
    const py = (state.y * 100).toFixed(2) + '%';

    root.style.setProperty('--flash-x', px);
    root.style.setProperty('--flash-y', py);
    root.style.setProperty('--bgx', px);
    root.style.setProperty('--bgy', py);
  };

  const queue = () => {
    if (!state.raf) state.raf = requestAnimationFrame(setVars);
  };

  const onMove = (clientX, clientY) => {
    state.tx = clamp01(clientX / Math.max(1, innerWidth));
    state.ty = clamp01(clientY / Math.max(1, innerHeight));
    root.classList.add('has-pointer');
    queue();
  };

  document.addEventListener('DOMContentLoaded', () => {
    // initial vars
    root.style.setProperty('--flash-x', '55%');
    root.style.setProperty('--flash-y', '35%');
    root.style.setProperty('--bgx', '55%');
    root.style.setProperty('--bgy', '35%');

    window.addEventListener('pointermove', (e) => onMove(e.clientX ?? innerWidth*0.5, e.clientY ?? innerHeight*0.35), { passive: true });
    window.addEventListener('pointerdown', (e) => onMove(e.clientX ?? innerWidth*0.5, e.clientY ?? innerHeight*0.35), { passive: true });
    window.addEventListener('touchmove', (e) => {
      const t = e.touches && e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    }, { passive: true });
  });
})();