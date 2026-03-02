(() => {
  'use strict';

  // Early, tiny perf + state bootstrap
  const prefersReducedMotion =
    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const conn = (navigator.connection && (navigator.connection.effectiveType || '')) || '';
  const slowConn = /(^2g$|slow-2g)/i.test(conn);

  const low = prefersReducedMotion || cores <= 4 || mem <= 4 || slowConn;
  const high = !prefersReducedMotion && cores >= 8 && mem >= 8 && !slowConn;
  const tier = high ? 'high' : (low ? 'low' : 'mid');

  const rawDpr = window.devicePixelRatio || 1;
  const dprCap = tier === 'low' ? 1.25 : (tier === 'mid' ? 1.75 : 2.25);
  const dpr = Math.max(1, Math.min(dprCap, rawDpr));

  window.__sitePerf = { tier, reducedMotion: prefersReducedMotion, dpr };

  const state = (window.__siteState = window.__siteState || {});
  state.reducedMotion = prefersReducedMotion;
  state.isTabActive = !document.hidden;

  // Broadcast visibility 
  const notify = () => {
    state.isTabActive = !document.hidden;
    document.dispatchEvent(new CustomEvent(state.isTabActive ? 'site:active' : 'site:inactive'));
  };

  document.addEventListener('visibilitychange', notify, { passive: true });

  // Small helper for modules
  window.__siteUtils = window.__siteUtils || {};
  window.__siteUtils.isReducedMotion = () => !!window.__sitePerf?.reducedMotion;
  window.__siteUtils.isTabActive = () => !!window.__siteState?.isTabActive;
})();