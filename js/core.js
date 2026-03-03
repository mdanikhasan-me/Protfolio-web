(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  window.__siteUtils = { ...window.__siteUtils, qs, qsa };

  document.addEventListener('DOMContentLoaded', () => {
    const navbar = qs('#navbar');
    const mobileToggle = qs('.mobile-menu-toggle');
    const navLinks = qs('#nav-links') || qs('.nav-links');
    
    // Scroll & Navbar Logic
    let lastY = window.scrollY || 0;
    let raf = 0;
    const closeMenu = () => {
      if (!mobileToggle || !navLinks) return;
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
    };

    const handleScroll = () => {
      raf = 0;
      const y = window.scrollY || 0;
      if (navbar) {
        navbar.classList.toggle('scrolled', y > 10);
        if (y <= 12) navbar.classList.remove('hidden');
        else if (y - lastY > 0) { navbar.classList.add('hidden'); closeMenu(); }
        else if (y - lastY < -2) navbar.classList.remove('hidden');
      }
      lastY = y;
    };

    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(handleScroll); }, { passive: true });
    handleScroll();

    // Mobile Menu Logic
    if (mobileToggle && navLinks) {
      const toggleMenu = (e) => {
        e.stopPropagation();
        const willOpen = !navLinks.classList.contains('open');
        mobileToggle.classList.toggle('active', willOpen);
        navLinks.classList.toggle('open', willOpen);
        mobileToggle.setAttribute('aria-expanded', String(willOpen));
      };
      mobileToggle.addEventListener('click', toggleMenu);
      qsa('a', navLinks).forEach(a => a.addEventListener('click', closeMenu));
      document.addEventListener('click', (e) => { if (!navLinks.contains(e.target) && !mobileToggle.contains(e.target)) closeMenu(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
      window.addEventListener('resize', () => { if (window.innerWidth > 768) closeMenu(); }, { passive: true });
    }

    // Reveal Observer
    const fadeEls = qsa('.fade-up');
    if (fadeEls.length) {
      if (window.__siteUtils.isReducedMotion()) {
        fadeEls.forEach(el => el.classList.add('in-view'));
      } else {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        fadeEls.forEach(el => observer.observe(el));
      }
    }

    // Copy Email Functionality
    const copyBtn = qs('#copy-email-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const emailEl = qs('#email-text');
        const feedback = qs('#copy-feedback');
        if (!emailEl || !feedback) return;
        try {
          await navigator.clipboard.writeText(emailEl.innerText.trim());
          feedback.textContent = 'Copied';
          feedback.classList.add('active');
        } catch {
          feedback.textContent = 'Failed';
        }
        setTimeout(() => { feedback.textContent = ''; feedback.classList.remove('active'); }, 1200);
      });
    }
  });
})();