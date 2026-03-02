(() => {
  'use strict';

  document.documentElement.classList.add('js');
  const BLOCK_COPY = false;

  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  window.__siteUtils = window.__siteUtils || { qs, qsa };

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    const navbar = qs('#navbar');
    const mobileToggle = qs('.mobile-menu-toggle');
    const navLinks = qs('#nav-links') || qs('.nav-links');
    const path = (location.pathname || '/').toLowerCase();

    if (navLinks) {
      const isAbout = document.body.classList.contains('about-page') || path.startsWith('/about');
      const existingAbout = qs('a[href="/about/"]', navLinks);

      if (isAbout && !existingAbout) {
        const li = document.createElement('li');
        li.className = 'magnetic-wrap';
        const a = document.createElement('a');
        a.className = 'nav-link magnetic-target';
        a.href = '/about/';
        a.textContent = 'About';
        li.appendChild(a);
        navLinks.appendChild(li);
      }

      if (!isAbout && existingAbout) {
        existingAbout.closest('li')?.remove();
      }

      qsa('a.nav-link', navLinks).forEach(a => {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      });

      const active = (() => {
        if (path.startsWith('/projects')) return qs('a[href="/projects/"]', navLinks);
        if (path.startsWith('/contact')) return qs('a[href="/contact/"]', navLinks);
        if (path.startsWith('/about')) return qs('a[href="/about/"]', navLinks);
        return qs('a[href="/"]', navLinks);
      })();

      if (active) {
        active.classList.add('active');
        active.setAttribute('aria-current', 'page');
      }
    }

    let lastY = window.scrollY || 0;
    let raf = 0;

    const closeMenu = () => {
      if (!mobileToggle || !navLinks) return;
      mobileToggle.classList.remove('active');
      navLinks.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Open menu');
    };

    const apply = () => {
      raf = 0;
      const y = window.scrollY || 0;
      const delta = y - lastY;

      if (navbar) {
        navbar.classList.toggle('scrolled', y > 10);

        if (y <= 12) {
          navbar.classList.remove('hidden');
        } else if (delta > 0) {
         
          navbar.classList.add('hidden');
          closeMenu();
        } else if (delta < -2) {
       
          navbar.classList.remove('hidden');
        }
      }

      lastY = y;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    apply();

    // Mobile menu
    if (mobileToggle && navLinks) {
      const toggleMenu = (e) => {
        e.stopPropagation();
        const willOpen = !navLinks.classList.contains('open');
        mobileToggle.classList.toggle('active', willOpen);
        navLinks.classList.toggle('open', willOpen);
        mobileToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        mobileToggle.setAttribute('aria-label', willOpen ? 'Close menu' : 'Open menu');
      };

      mobileToggle.addEventListener('click', toggleMenu);
      mobileToggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleMenu(e);
        }
      });

      qsa('a', navLinks).forEach(a => a.addEventListener('click', closeMenu));

      document.addEventListener('click', (e) => {
        const clickedInside = navLinks.contains(e.target) || mobileToggle.contains(e.target);
        if (!clickedInside) closeMenu();
      });

      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMenu();
      }, { passive: true });
    }

    const fadeEls = qsa('.fade-up');
    if (fadeEls.length) {
      if (prefersReducedMotion()) {
        fadeEls.forEach(el => el.classList.add('in-view'));
      } else {
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              observer.unobserve(entry.target);
            }
          }
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        fadeEls.forEach(el => observer.observe(el));
      }
    }

    // Copy email
    const copyBtn = qs('#copy-email-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const el = qs('#email-text');
        const feedback = qs('#copy-feedback');
        if (!el) return;

        const email = (el.innerText || '').trim();
        if (!email) return;

        try {
          await navigator.clipboard.writeText(email);
          if (feedback) feedback.textContent = 'Copied';
        } catch {
          if (feedback) feedback.textContent = 'Copy failed';
        }

        if (feedback) setTimeout(() => { feedback.textContent = ''; }, 1200);
      });
    }

    // Block selection/copy/context menu 
    if (BLOCK_COPY) {
      const stop = (e) => { e.preventDefault(); return false; };
      document.addEventListener('contextmenu', stop);
      document.addEventListener('selectstart', stop);
      document.addEventListener('copy', stop);
      document.addEventListener('cut', stop);
      document.addEventListener('dragstart', stop);
    }
  });
})();