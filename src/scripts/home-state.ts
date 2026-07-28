import { boundedProjectIndex } from '../lib/project-state';

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMotionQuery = matchMedia('(max-width: 820px), (hover: none) and (pointer: coarse)');

const hero = document.querySelector<HTMLElement>('[data-v5-hero]');
const meltSection = document.querySelector<HTMLElement>('[data-melt-section]');
const meltDisplacement = meltSection?.querySelector<SVGFEDisplacementMapElement>(
  '[data-melt-displacement]',
);
const meltTurbulence = meltSection?.querySelector<SVGFETurbulenceElement>('[data-melt-turbulence]');
const curveSection = document.querySelector<HTMLElement>('[data-curve-work]');
const curveCards = Array.from(
  curveSection?.querySelectorAll<HTMLElement>('[data-curve-card]') ?? [],
);
const curveTitle = curveSection?.querySelector<HTMLElement>('[data-curve-title]');
const curveDescription = curveSection?.querySelector<HTMLElement>('[data-curve-description]');
const curveLink = curveSection?.querySelector<HTMLAnchorElement>('[data-curve-link]');
const curveCount = curveSection?.querySelector<HTMLElement>('[data-curve-count]');
const previousButton = curveSection?.querySelector<HTMLButtonElement>('[data-curve-previous]');
const nextButton = curveSection?.querySelector<HTMLButtonElement>('[data-curve-next]');

let activeProject = -1;
let animationFrame = 0;
let targetMelt = 0;
let renderedMelt = 0;
let targetCurveProgress = 0;
let renderedCurveProgress = 0;
let lastMotionFrame = performance.now();
let wheelGestureLocked = false;
let wheelGestureTimer = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStepCommitted = false;

function usesStageRail() {
  return !reduceMotion;
}

function syncCurveStage() {
  const enhanced = usesStageRail();
  curveSection?.toggleAttribute('data-enhanced', enhanced);
  if (!enhanced) {
    curveCards.forEach((card) => {
      card.style.removeProperty('opacity');
      card.style.removeProperty('pointer-events');
      card.style.removeProperty('z-index');
      card.style.removeProperty('--curve-x');
      card.style.removeProperty('--curve-y');
      card.style.removeProperty('--curve-rotate');
      card.style.removeProperty('--curve-scale');
    });
  }
}

function syncMotionTier() {
  const mobileMotion = mobileMotionQuery.matches;
  document.documentElement.dataset.motionTier = mobileMotion ? 'mobile' : 'full';
  meltSection?.toggleAttribute('data-mobile-motion', mobileMotion);
  curveSection?.toggleAttribute('data-mobile-motion', mobileMotion);
  syncCurveStage();
}

function updateHero() {
  if (!hero || reduceMotion) return;
  const rect = hero.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > innerHeight) return;
  const progress = clamp(-rect.top / Math.max(1, rect.height - innerHeight * 0.55));
  hero.style.setProperty('--hero-progress', progress.toFixed(4));
}

function updateMelt() {
  if (!meltSection || reduceMotion) return;
  const rect = meltSection.getBoundingClientRect();
  if (rect.bottom < -innerHeight * 0.25 || rect.top > innerHeight * 1.25) return;
  const travel = Math.max(1, rect.height - innerHeight);
  const progress = clamp(-rect.top / travel);
  targetMelt = Math.sin(progress * Math.PI);
}

function renderMelt(band: number) {
  if (!meltSection) return;
  const mobileMotion = mobileMotionQuery.matches;
  meltSection.style.setProperty('--melt', band.toFixed(4));
  meltDisplacement?.setAttribute('scale', String(Math.round(band * (mobileMotion ? 20 : 32))));
  meltTurbulence?.setAttribute(
    'baseFrequency',
    `${(0.006 + band * (mobileMotion ? 0.001 : 0.0015)).toFixed(4)} ${(
      0.014 +
      band * (mobileMotion ? 0.008 : 0.012)
    ).toFixed(4)}`,
  );
}

function setActiveProject(index: number) {
  if (!curveCards.length) return;
  const nextProject = Math.round(clamp(index, 0, curveCards.length - 1));
  if (nextProject === activeProject) return;
  activeProject = nextProject;
  const card = curveCards[activeProject];
  if (!card) return;

  curveCards.forEach((item, itemIndex) => {
    const active = itemIndex === activeProject;
    item.dataset.active = String(active);
    const link = item.querySelector<HTMLAnchorElement>('a');
    if (link) {
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  });

  if (curveTitle) curveTitle.textContent = card.dataset.projectTitle ?? '';
  if (curveDescription) curveDescription.textContent = card.dataset.projectDescription ?? '';
  if (curveLink && card.dataset.projectRoute) curveLink.href = card.dataset.projectRoute;
  if (curveCount) {
    curveCount.textContent = `${String(activeProject + 1).padStart(2, '0')} / ${String(
      curveCards.length,
    ).padStart(2, '0')}`;
  }
  if (previousButton) previousButton.disabled = activeProject === 0;
  if (nextButton) nextButton.disabled = activeProject === curveCards.length - 1;
}

function renderCurve(progress: number) {
  if (!curveSection || !usesStageRail() || !curveCards.length) return;
  const compactStage = mobileMotionQuery.matches;
  const spread = Math.min(compactStage ? 300 : 520, innerWidth * (compactStage ? 0.72 : 0.34));
  const rise = Math.min(compactStage ? 52 : 86, innerHeight * (compactStage ? 0.065 : 0.095));

  curveCards.forEach((card, index) => {
    const offset = index - progress;
    const distance = Math.abs(offset);
    const x = offset * spread;
    const y = Math.min(compactStage ? 90 : 150, offset * offset * rise);
    const rotation = clamp(offset * 5.5, -12, 12);
    const scale = Math.max(compactStage ? 0.76 : 0.72, 1 - distance * 0.12);
    const opacity = clamp(1 - Math.max(0, distance - 1.7) * 0.55, 0.18, 1);

    card.style.setProperty('--curve-x', `${x.toFixed(2)}px`);
    card.style.setProperty('--curve-y', `${y.toFixed(2)}px`);
    card.style.setProperty('--curve-rotate', `${rotation.toFixed(2)}deg`);
    card.style.setProperty('--curve-scale', scale.toFixed(3));
    card.style.opacity = opacity.toFixed(3);
    card.style.zIndex = String(100 - Math.round(distance * 10));
    card.style.pointerEvents = distance <= 1.25 ? 'auto' : 'none';
  });
}

function updateAll(timestamp = performance.now()) {
  animationFrame = 0;
  const deltaSeconds = Math.min(0.05, Math.max(1 / 240, (timestamp - lastMotionFrame) / 1_000));
  lastMotionFrame = timestamp;
  updateHero();
  updateMelt();

  const meltBlend = 1 - Math.exp(-12 * deltaSeconds);
  renderedMelt += (targetMelt - renderedMelt) * meltBlend;
  if (Math.abs(targetMelt - renderedMelt) < 0.0005) renderedMelt = targetMelt;
  renderMelt(renderedMelt);

  if (curveSection && usesStageRail() && curveCards.length) {
    const curveBlend = 1 - Math.exp(-10.5 * deltaSeconds);
    renderedCurveProgress += (targetCurveProgress - renderedCurveProgress) * curveBlend;
    if (Math.abs(targetCurveProgress - renderedCurveProgress) < 0.0005) {
      renderedCurveProgress = targetCurveProgress;
    }
    renderCurve(renderedCurveProgress);
  }

  if (
    Math.abs(targetMelt - renderedMelt) > 0.0005 ||
    Math.abs(targetCurveProgress - renderedCurveProgress) > 0.0005
  ) {
    animationFrame = requestAnimationFrame(updateAll);
  }
}

function requestUpdate() {
  if (!animationFrame) animationFrame = requestAnimationFrame(updateAll);
}

function selectProject(index: number) {
  if (!curveSection || curveCards.length < 2) return;
  const target = Math.round(clamp(index, 0, curveCards.length - 1));
  if (usesStageRail()) {
    targetCurveProgress = target;
    setActiveProject(target);
    requestUpdate();
    return;
  }
  curveCards[target]?.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'center',
  });
  setActiveProject(target);
}

function advanceProject(direction: -1 | 1) {
  const current = usesStageRail() ? Math.round(targetCurveProgress) : Math.max(0, activeProject);
  const target = boundedProjectIndex(current, direction, curveCards.length);
  if (target === current) return false;
  selectProject(target);
  return true;
}

if (hero && !reduceMotion) {
  hero.addEventListener(
    'pointermove',
    (event) => {
      const rect = hero.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
      hero.style.setProperty('--pointer-x', x.toFixed(3));
      hero.style.setProperty('--pointer-y', y.toFixed(3));
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--pointer-x', '0');
    hero.style.setProperty('--pointer-y', '0');
  });
}

if (curveSection && curveCards.length) {
  syncCurveStage();
  setActiveProject(0);
  if (!usesStageRail()) {
    const cardObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveProject(curveCards.indexOf(visible.target as HTMLElement));
      },
      { root: curveSection.querySelector('[data-curve-track]'), threshold: [0.5, 0.7, 0.9] },
    );
    curveCards.forEach((card) => cardObserver.observe(card));
  }

  previousButton?.addEventListener('click', () => advanceProject(-1));
  nextButton?.addEventListener('click', () => advanceProject(1));
  curveSection.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      advanceProject(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      advanceProject(1);
    }
  });
  curveSection.addEventListener(
    'wheel',
    (event) => {
      if (!usesStageRail()) return;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 2) return;
      const direction = delta > 0 ? 1 : -1;
      const current = Math.round(targetCurveProgress);
      const target = boundedProjectIndex(current, direction, curveCards.length);
      if (target === current) return;

      event.preventDefault();
      clearTimeout(wheelGestureTimer);
      wheelGestureTimer = window.setTimeout(() => {
        wheelGestureLocked = false;
      }, 220);
      if (wheelGestureLocked) return;

      wheelGestureLocked = true;
      advanceProject(direction);
    },
    { passive: false },
  );
  curveSection.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStepCommitted = false;
    },
    { passive: true },
  );
  curveSection.addEventListener(
    'touchmove',
    (event) => {
      if (!usesStageRail()) return;
      const touch = event.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaY) <= Math.abs(deltaX) || Math.abs(deltaY) < 4) return;
      if (touchStepCommitted) {
        event.preventDefault();
        return;
      }

      const direction = deltaY < 0 ? 1 : -1;
      const current = Math.round(targetCurveProgress);
      if (boundedProjectIndex(current, direction, curveCards.length) === current) return;

      event.preventDefault();
      if (Math.abs(deltaY) >= 44) {
        touchStepCommitted = true;
        advanceProject(direction);
      }
    },
    { passive: false },
  );
  const finishTouch = () => {
    touchStepCommitted = false;
  };
  curveSection.addEventListener('touchend', finishTouch, { passive: true });
  curveSection.addEventListener('touchcancel', finishTouch, { passive: true });
}

addEventListener('scroll', requestUpdate, { passive: true });
addEventListener(
  'resize',
  () => {
    syncMotionTier();
    requestUpdate();
  },
  { passive: true },
);
syncMotionTier();
updateAll();

document.querySelectorAll<HTMLDetailsElement>('.mobile-navigation').forEach((navigation) => {
  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navigation.open = false;
    });
  });
});
