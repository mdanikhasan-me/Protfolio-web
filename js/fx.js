
(function () {
  var core = window.SiteCore;
  if (!core) { return; }


  function prefersReducedMotion() {
    return document.documentElement.classList.contains('reduce-motion');
  }
  function isLowPower() {
    return document.documentElement.classList.contains('low-power');
  }
  function isSaveData() {
    return document.documentElement.classList.contains('save-data');
  }
  function isCoarsePointer() {
    return document.documentElement.classList.contains('coarse-pointer');
  }
  function supportsFinePointer() {
    try { return window.matchMedia('(pointer: fine)').matches; }
    catch (e) { return false; }
  }


  function createBackgroundMotion(options) {
    var s = options || {};
    var pointerStrength      = s.pointerStrength      || 5;
    var scrollStrength       = s.scrollStrength       || 8;
    var response             = s.response             || 20;
    var settleThreshold      = s.settleThreshold      || 0.08;
    var settleFramesRequired = s.settleFramesRequired || 8;

    var targetX = 0, targetY = 0, targetScroll = 0;
    var currentX = 0, currentY = 0, currentScroll = 0;
    var active = false, running = false, frame = 0, settledFrames = 0;
    var lastTime = 0;

    function write() {
      core.setRootVar('--bg-shift-x', currentX.toFixed(2) + 'px');
      core.setRootVar('--bg-shift-y', currentY.toFixed(2) + 'px');
      core.setRootVar('--bg-scroll',  currentScroll.toFixed(2) + 'px');
    }

    function step(value, target, dt) {
      if (value === target) { return value; }
      var amount = 1 - Math.exp(-response * dt);
      return value + (target - value) * amount;
    }

    function tick(now) {
      if (!running) { return; }

      var dt = Math.min(Math.max(((now || performance.now()) - (lastTime || now || performance.now())) / 1000, 1 / 240), 1 / 24);
      lastTime = now || performance.now();

      currentX      = step(currentX, targetX, dt);
      currentY      = step(currentY, targetY, dt);
      currentScroll = step(currentScroll, targetScroll, dt);
      write();

      var dx = Math.abs(targetX - currentX);
      var dy = Math.abs(targetY - currentY);
      var ds = Math.abs(targetScroll - currentScroll);

      if (dx < settleThreshold && dy < settleThreshold && ds < settleThreshold) {
        settledFrames += 1;
      } else {
        settledFrames = 0;
      }

      if (settledFrames >= settleFramesRequired) {
        currentX = targetX; currentY = targetY; currentScroll = targetScroll;
        write();
        running = false; frame = 0; settledFrames = 0; lastTime = 0;
        return;
      }

      frame = requestAnimationFrame(tick);
    }

    function ensureRunning() {
      if (!active || prefersReducedMotion() || running) {
        if (!active || prefersReducedMotion()) { write(); }
        return;
      }
      running = true; settledFrames = 0; lastTime = 0;
      frame = requestAnimationFrame(tick);
    }

    return {
      start: function () { active = true; ensureRunning(); },
      stop:  function () {
        active = false; running = false; settledFrames = 0; lastTime = 0;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
      },
      setPointer: function (x, y) {
        targetX = (x - 0.5) * pointerStrength;
        targetY = (y - 0.5) * pointerStrength;
        ensureRunning();
      },
      resetPointer: function () { targetX = 0; targetY = 0; ensureRunning(); },
      setScroll: function (progress) {
        targetScroll = progress * scrollStrength;
        ensureRunning();
      }
    };
  }


  core.onReady(function () {
    var page = document.body && document.body.dataset.page;
    if (!page) { return; }

    var isHome        = page === 'home';
    var useLightMotion = isLowPower() || isSaveData() || isCoarsePointer();

    var motion = createBackgroundMotion(
      isHome
        ? {
            pointerStrength:      useLightMotion ? 0    : 7.5,
            scrollStrength:       useLightMotion ? 4.4  : 8.6,
            response:             useLightMotion ? 16   : 24,
            settleThreshold:      useLightMotion ? 0.12 : 0.08,
            settleFramesRequired: useLightMotion ? 4    : 6
          }
        : {
            pointerStrength:      useLightMotion ? 0    : 4,
            scrollStrength:       useLightMotion ? 2.8  : 6.2,
            response:             useLightMotion ? 16   : 23,
            settleThreshold:      useLightMotion ? 0.12 : 0.08,
            settleFramesRequired: useLightMotion ? 4    : 6
          }
    );

    var allowPointer = supportsFinePointer() && !prefersReducedMotion() && !useLightMotion;

    var handlePointerMove = core.rafThrottle(function (event) {
      if (!allowPointer) { return; }
      motion.setPointer(event.clientX / (window.innerWidth || 1),
                        event.clientY / (window.innerHeight || 1));
    });

    var handlePointerLeave = core.rafThrottle(function () {
      motion.resetPointer();
    });

    var lastKnownScrollY = window.scrollY || 0;
    var scrollActivityFrame = 0;
    var scrollIdleTimer = 0;

    function syncScrollPosition() {
      var maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      lastKnownScrollY = window.scrollY || window.pageYOffset || 0;
      motion.setScroll(core.clamp(lastKnownScrollY / maxScroll, 0, 1));
    }

    function stopScrollTracking() {
      if (scrollActivityFrame) {
        cancelAnimationFrame(scrollActivityFrame);
        scrollActivityFrame = 0;
      }
      if (scrollIdleTimer) {
        clearTimeout(scrollIdleTimer);
        scrollIdleTimer = 0;
      }
    }

    function keepScrollTracking() {
      syncScrollPosition();
      scrollActivityFrame = requestAnimationFrame(keepScrollTracking);
    }

    var handleScroll = core.rafThrottle(function () {
      syncScrollPosition();
      if (!scrollActivityFrame) {
        scrollActivityFrame = requestAnimationFrame(keepScrollTracking);
      }
      if (scrollIdleTimer) { clearTimeout(scrollIdleTimer); }
      scrollIdleTimer = window.setTimeout(function () {
        stopScrollTracking();
        syncScrollPosition();
      }, 140);
    });

    function handleVisibility() {
      if (document.hidden) {
        stopScrollTracking();
        motion.stop();
        return;
      }
      motion.start();
      handleScroll();
    }

    motion.start();
    syncScrollPosition();

    window.addEventListener('scroll',           handleScroll,       { passive: true });
    window.addEventListener('resize',           handleScroll,       { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    if (allowPointer) {
      window.addEventListener('pointermove',  handlePointerMove,  { passive: true });
      window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    }
  });

  window.SiteFX = {
    prefersReducedMotion: prefersReducedMotion,
    isLowPower: isLowPower,
    isSaveData: isSaveData,
    isCoarsePointer: isCoarsePointer,
    supportsFinePointer: supportsFinePointer,
    createBackgroundMotion: createBackgroundMotion
  };
})();
