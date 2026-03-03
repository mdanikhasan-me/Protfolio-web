(() => {
  'use strict';
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const conn = navigator.connection?.effectiveType || '';
  const slowConn = /(^2g$|slow-2g)/i.test(conn);

  const low = prefersReducedMotion || cores <= 4 || mem <= 4 || slowConn;
  const high = !prefersReducedMotion && cores >= 8 && mem >= 8 && !slowConn;
  const tier = high ? 'high' : (low ? 'low' : 'mid');

  const rawDpr = window.devicePixelRatio || 1;
  const dprCap = tier === 'low' ? 1.25 : (tier === 'mid' ? 1.75 : 2.25);
  
  window.__sitePerf = { tier, reducedMotion: prefersReducedMotion, dpr: Math.max(1, Math.min(dprCap, rawDpr)) };
  window.__siteState = { reducedMotion: prefersReducedMotion, isTabActive: !document.hidden };
  
  window.__siteUtils = {
    isReducedMotion: () => !!window.__sitePerf?.reducedMotion,
    isTabActive: () => !!window.__siteState?.isTabActive
  };

  document.addEventListener('visibilitychange', () => {
    window.__siteState.isTabActive = !document.hidden;
    document.dispatchEvent(new CustomEvent(document.hidden ? 'site:inactive' : 'site:active'));
  }, { passive: true });
})();