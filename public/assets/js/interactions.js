
(function () {
  var core = window.SiteCore;
  if (!core) { return; }

  core.onReady(function () {
    var root    = document.documentElement;
    var header  = document.querySelector('[data-header]');
    var toggle  = document.querySelector('[data-nav-toggle]');
    var panel   = document.querySelector('[data-nav-panel]');
    var lastY   = window.scrollY;
    var mobileBreakpoint = 896;

    var updateHeaderState = core.rafThrottle(function () {
      var currentY = window.scrollY;
      root.dataset.scrolled = currentY > 10 ? 'true' : 'false';

      if (!header) { lastY = currentY; return; }

      if (window.innerWidth <= mobileBreakpoint) {
        header.classList.remove('is-hidden');
        lastY = currentY;
        return;
      }

      if (currentY > lastY && currentY > 96) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }

      lastY = currentY;
    });


    function closeMenu() {
      if (!toggle || !panel) { return; }
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      panel.classList.remove('is-open');
    }

    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        var next     = !expanded;
        toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
        toggle.setAttribute('aria-label', next ? 'Close menu' : 'Open menu');
        panel.classList.toggle('is-open', next);
      });

      core.selectAll('a', panel).forEach(function (link) {
        link.addEventListener('click', closeMenu);
      });

      window.addEventListener('resize', core.rafThrottle(function () {
        if (window.innerWidth > mobileBreakpoint) { closeMenu(); }
      }), { passive: true });
    }

    window.addEventListener('scroll', updateHeaderState, { passive: true });
    window.addEventListener('resize', updateHeaderState, { passive: true });
    window.addEventListener('orientationchange', updateHeaderState, { passive: true });
    updateHeaderState();

    var shutterLabels = { Home: true, Projects: true, Blog: true, Contact: true };
    var shutterQuery = '(min-width: 1025px) and (hover: hover) and (pointer: fine)';
    var shutterMedia = window.matchMedia ? window.matchMedia(shutterQuery) : null;

    function getPlainNavLabel(link) {
      if (!link) { return ''; }
      return (link.dataset.shutterOriginal || link.getAttribute('data-nav-label') || link.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function resetNavShutter(link) {
      var label = getPlainNavLabel(link);
      if (!shutterLabels[label]) { return; }
      link.classList.remove('nav-shutter');
      link.textContent = label;
      link.setAttribute('data-nav-label', label);
      link.dataset.shutterOriginal = label;
      delete link.dataset.shutterReady;
    }

    function applyNavShutter() {
      var canEnhance = !!(shutterMedia && shutterMedia.matches);

      core.selectAll('.site-nav__list a').forEach(function (link) {
        var label = getPlainNavLabel(link);
        if (!shutterLabels[label]) { return; }

        if (!canEnhance) {
          resetNavShutter(link);
          return;
        }

        if (link.dataset.shutterReady === 'true') { return; }

        link.dataset.shutterOriginal = label;
        link.setAttribute('data-nav-label', label);
        link.classList.add('nav-shutter');
        link.innerHTML =
          '<span class="nav-shutter__inner" aria-hidden="true">' +
            '<span class="nav-shutter__text">' + label + '</span>' +
            '<span class="nav-shutter__ghost">' + label + '</span>' +
          '</span>' +
          '<span class="sr-only">' + label + '</span>';
        link.dataset.shutterReady = 'true';
      });
    }

    applyNavShutter();

    if (shutterMedia) {
      if (typeof shutterMedia.addEventListener === 'function') {
        shutterMedia.addEventListener('change', applyNavShutter);
      } else if (typeof shutterMedia.addListener === 'function') {
        shutterMedia.addListener(applyNavShutter);
      }
    }

    window.addEventListener('resize', applyNavShutter, { passive: true });
    window.addEventListener('orientationchange', applyNavShutter, { passive: true });

    // ── About page: code-block typing animation ──────────────────────────────
    if (document.body.dataset.page === 'about') {
      var pre = document.querySelector('.about-story__card pre');
      var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (pre && !reducedMotion) {
        var fullText  = pre.textContent;
        var charIndex = 0;
        var textNode  = document.createTextNode('');
        pre.textContent = '';
        pre.appendChild(textNode);

        function typeChar() {
          if (charIndex >= fullText.length) { return; }
          textNode.nodeValue += fullText[charIndex];
          charIndex += 1;
          window.setTimeout(typeChar, fullText[charIndex - 1] === '\n' ? 22 : 9);
        }

        typeChar();
      }
    }

    var copyButton  = document.querySelector('[data-copy-email]');
    var liveRegion  = document.getElementById('copy-status');
    var copyTimer   = null;

    if (!copyButton) { return; }

    function showCopyMessage(message, isSuccess) {
      if (!liveRegion) { return; }

      liveRegion.textContent = message;
      liveRegion.classList.add('is-visible');

      if (isSuccess) {
        copyButton.dataset.copied = 'true';
      } else {
        delete copyButton.dataset.copied;
      }

      if (copyTimer) {
        window.clearTimeout(copyTimer);
      }

      copyTimer = window.setTimeout(function () {
        liveRegion.classList.remove('is-visible');
        delete copyButton.dataset.copied;

        window.setTimeout(function () {
          if (!liveRegion.classList.contains('is-visible')) {
            liveRegion.textContent = '';
          }
        }, 220);
      }, 1800);
    }

    copyButton.addEventListener('click', function () {
      var value = copyButton.getAttribute('data-copy-email');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(
          function onSuccess() {
            showCopyMessage('Copied to clipboard.', true);
          },
          function onFailure() {
            showCopyMessage('Unable to copy automatically. Please copy the address manually.', false);
          }
        );
        return;
      }

      showCopyMessage('Clipboard not available. Please copy the address manually.', false);
    });
  });
})();