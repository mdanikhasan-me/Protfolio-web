(function () {
  var root = document.documentElement;

  function onReady(callback) {
    if (typeof callback !== 'function') { return; }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  }

  function rafThrottle(fn) {
    if (typeof fn !== 'function') {
      return function () {};
    }

    var frame = 0;
    var lastArgs;
    var lastThis;

    return function throttled() {
      lastArgs = arguments;
      lastThis = this;

      if (frame) { return; }

      frame = requestAnimationFrame(function () {
        frame = 0;
        fn.apply(lastThis, lastArgs);
      });
    };
  }

  function setRootVar(name, value) {
    if (!name) { return; }
    root.style.setProperty(name, value);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function selectAll(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  window.SiteCore = {
    onReady: onReady,
    rafThrottle: rafThrottle,
    setRootVar: setRootVar,
    clamp: clamp,
    selectAll: selectAll
  };
})();
