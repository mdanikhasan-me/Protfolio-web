import type { createFooterField } from './footer-field';

const outro = document.querySelector<HTMLElement>('[data-footer-outro]');

if (outro) {
  let top = 0;
  let trigger = 0;
  let scheduled = 0;
  let started = false;
  let headerHidden = false;
  let field: ReturnType<typeof createFooterField> | undefined;
  let ended = false;
  const fieldEpoch = performance.now();
  const preload = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    preload.disconnect();
    const canvas = outro.querySelector<HTMLCanvasElement>('.footer-outro-field');
    if (!canvas) return;
    void import('./footer-field').then(({ createFooterField }) => {
      if (ended) return;
      field = createFooterField(canvas, fieldEpoch);
      field.setActive(started);
    }).catch(error => {
      // The SVG identity and links remain usable if WebGL is unavailable.
      console.warn('Footer background could not initialize', error);
    });
  }, { rootMargin: '250% 0px' });
  preload.observe(outro);

  const update = () => {
    scheduled = 0;
    // Reset only when returning above the entrance. Scrolling down to the
    // footer links must not erase the completed wordmark or replay it.
    const next = window.scrollY >= trigger;
    if (next !== started) {
      started = next;
      outro.toggleAttribute('data-playing', started);
      field?.setActive(started);
    }
    const hide = window.scrollY >= top - (window.innerWidth <= 700 ? window.innerHeight / 2 : 64);
    if (hide !== headerHidden) {
      headerHidden = hide;
      document.body.toggleAttribute('data-footer-active', hide);
    }
  };
  const schedule = () => {
    if (!scheduled) scheduled = requestAnimationFrame(update);
  };
  const measure = () => {
    top = outro.getBoundingClientRect().top + window.scrollY;
    // The desktop reference enters after 300px. Keep the whole sequence
    // reachable on a short mobile stage too.
    trigger = top - window.innerHeight + Math.min(300, outro.offsetHeight / 2);
    update();
  };
  outro.setAttribute('data-outro-ready', '');
  const resizeObserver = new ResizeObserver(measure);
  const main = document.querySelector('main');
  const connect = () => {
    resizeObserver.observe(outro);
    if (main) resizeObserver.observe(main);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    measure();
  };
  connect();
  window.addEventListener('pagehide', event => {
    field?.suspend(true);
    if (!event.persisted) {
      ended = true;
      preload.disconnect();
      field?.dispose();
    }
    resizeObserver.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', measure);
    cancelAnimationFrame(scheduled);
    scheduled = 0;
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      field?.suspend(false);
      connect();
    }
  });
}
