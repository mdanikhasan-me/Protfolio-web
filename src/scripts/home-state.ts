import { boundedProjectIndex } from '../lib/project-state';
import { referenceMotionState } from '../lib/reference-motion-state';
import Lenis from 'lenis';

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));
const smoothstep = (minimum: number, maximum: number, value: number) => {
  const normalized = clamp((value - minimum) / Math.max(0.0001, maximum - minimum));
  return normalized * normalized * (3 - 2 * normalized);
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMotionQuery = matchMedia('(max-width: 820px), (hover: none) and (pointer: coarse)');
const smoothScroller = reduceMotion
  ? null
  : new Lenis({
      anchors: true,
      lerp: 0.075,
      smoothWheel: true,
      wheelMultiplier: 0.66,
    });

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
const curveDetail = curveSection?.querySelector<HTMLElement>('.curve-work-detail');
const previousButton = curveSection?.querySelector<HTMLButtonElement>('[data-curve-previous]');
const nextButton = curveSection?.querySelector<HTMLButtonElement>('[data-curve-next]');

let activeProject = -1;
let projectSwapTimer = 0;
let targetMelt = 0;
let renderedMelt = 0;
let targetCurveTrigger = 0;
let renderedCurveTrigger = 0;
let renderedCurveProgress = 0;
let renderedCurveVelocity = 0;
let lastMotionFrame = performance.now();
let lastMeltValue = '';
let lastMeltScale = '';
let lastMeltFrequency = '';
let lastCurvePresence = '';
let meltNearViewport = Boolean(meltSection);
let curveNearViewport = Boolean(curveSection);

type SectionBounds = {
  top: number;
  bottom: number;
  height: number;
};

let meltDocumentTop = 0;
let meltSectionHeight = 0;
let curveDocumentTop = 0;
let curveSectionHeight = 0;
const curveViewportBounds: SectionBounds = { top: 0, bottom: 0, height: 0 };

function measureMotionSections() {
  const pageY = scrollY;
  if (meltSection) {
    const bounds = meltSection.getBoundingClientRect();
    meltDocumentTop = pageY + bounds.top;
    meltSectionHeight = bounds.height;
    referenceMotionState.meltDocumentTop = meltDocumentTop;
    referenceMotionState.meltBoundsHeight = meltSectionHeight;
  }
  if (curveSection) {
    const bounds = curveSection.getBoundingClientRect();
    curveDocumentTop = pageY + bounds.top;
    curveSectionHeight = bounds.height;
    referenceMotionState.curveDocumentTop = curveDocumentTop;
    referenceMotionState.curveBoundsHeight = curveSectionHeight;
  }
}

function readCurveBounds() {
  curveViewportBounds.top = curveDocumentTop - scrollY;
  curveViewportBounds.height = curveSectionHeight;
  curveViewportBounds.bottom = curveViewportBounds.top + curveViewportBounds.height;
  return curveViewportBounds;
}

measureMotionSections();

const motionSectionResizeObserver =
  'ResizeObserver' in window ? new ResizeObserver(measureMotionSections) : null;
if (meltSection) motionSectionResizeObserver?.observe(meltSection);
if (curveSection) motionSectionResizeObserver?.observe(curveSection);
document.fonts.ready.then(measureMotionSections);

const motionSectionObserver =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target === meltSection) meltNearViewport = entry.isIntersecting;
            if (entry.target === curveSection) curveNearViewport = entry.isIntersecting;
          });
        },
        { rootMargin: '100% 0px' },
      )
    : null;
if (meltSection) motionSectionObserver?.observe(meltSection);
if (curveSection) motionSectionObserver?.observe(curveSection);

function usesStageRail() {
  return !reduceMotion;
}

function syncCurveStage() {
  const enhanced = usesStageRail();
  if (curveSection) curveSection.dataset.enhanced = String(enhanced);
  curveSection?.style.setProperty('--curve-items', String(curveCards.length));
  if (!enhanced) {
    curveCards.forEach((card) => {
      card.style.removeProperty('opacity');
      card.style.removeProperty('pointer-events');
      card.style.removeProperty('z-index');
      card.style.removeProperty('--curve-x');
      card.style.removeProperty('--curve-y');
      card.style.removeProperty('--curve-rotate');
      card.style.removeProperty('--curve-rotate-y');
      card.style.removeProperty('--curve-z');
      card.style.removeProperty('--curve-scale');
    });
  }
}

function syncMotionTier() {
  syncCurveStage();
}

function updateMelt() {
  if (!meltSection || !meltNearViewport || reduceMotion) return;
  const top = meltDocumentTop - scrollY;
  const bottom = top + meltSectionHeight;
  if (bottom < -innerHeight * 0.25 || top > innerHeight * 1.25) return;
  const travel = Math.max(1, meltSectionHeight - innerHeight);
  const progress = clamp(-top / travel);
  targetMelt = Math.sin(progress * Math.PI);
}

function renderMelt(band: number) {
  if (!meltSection) return;
  const mobileMotion = mobileMotionQuery.matches;
  const meltValue = band.toFixed(4);
  const displacementScale = String(Math.round(band * (mobileMotion ? 20 : 32)));
  const turbulenceFrequency = `${(0.006 + band * (mobileMotion ? 0.001 : 0.0015)).toFixed(
    4,
  )} ${(0.014 + band * (mobileMotion ? 0.008 : 0.012)).toFixed(4)}`;
  if (meltValue !== lastMeltValue) {
    meltSection.style.setProperty('--melt', meltValue);
    lastMeltValue = meltValue;
  }
  if (meltDisplacement && displacementScale !== lastMeltScale) {
    meltDisplacement.setAttribute('scale', displacementScale);
    lastMeltScale = displacementScale;
  }
  if (meltTurbulence && turbulenceFrequency !== lastMeltFrequency) {
    meltTurbulence.setAttribute('baseFrequency', turbulenceFrequency);
    lastMeltFrequency = turbulenceFrequency;
  }
}

function setActiveProject(index: number) {
  if (!curveCards.length) return;
  const nextProject = Math.round(clamp(index, 0, curveCards.length - 1));
  if (nextProject === activeProject) return;
  const previousProject = activeProject;
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

  const updateMetadata = () => {
    if (curveTitle) curveTitle.textContent = card.dataset.projectTitle ?? '';
    if (curveDescription) curveDescription.textContent = card.dataset.projectDescription ?? '';
    if (curveLink && card.dataset.projectRoute) curveLink.href = card.dataset.projectRoute;
    if (curveCount) {
      curveCount.textContent = `${String(activeProject + 1).padStart(2, '0')} / ${String(
        curveCards.length,
      ).padStart(2, '0')}`;
    }
  };
  clearTimeout(projectSwapTimer);
  if (previousProject < 0 || reduceMotion || !curveDetail) {
    updateMetadata();
  } else {
    curveDetail.dataset.swapping = 'true';
    projectSwapTimer = window.setTimeout(() => {
      updateMetadata();
      curveDetail.removeAttribute('data-swapping');
    }, 120);
  }
  if (previousButton) previousButton.disabled = activeProject === 0;
  if (nextButton) nextButton.disabled = activeProject === curveCards.length - 1;
}

function renderCurve(progress: number) {
  if (!curveSection || !usesStageRail() || !curveCards.length) return;
  const entrance = Math.min(1, progress * 2);
  const exit = Math.min(1, (curveCards.length + 1 - progress) * 2);
  const sectionPresence = clamp(Math.min(entrance, exit));
  const curvePresence = sectionPresence.toFixed(4);
  if (curvePresence !== lastCurvePresence) {
    curveSection.style.setProperty('--curve-presence', curvePresence);
    lastCurvePresence = curvePresence;
  }
  referenceMotionState.curveProgress = Math.round(progress * 100_000) / 100_000;
  referenceMotionState.curveVelocity = Math.round(renderedCurveVelocity * 100_000) / 100_000;

  if (curveSection.dataset.webglGallery === 'true') return;

  const compactStage = mobileMotionQuery.matches;
  const horizontalRadius = Math.min(
    compactStage ? 440 : 1080,
    innerWidth * (compactStage ? 0.74 : 0.57),
  );
  const verticalStep = Math.min(
    compactStage ? 48 : 92,
    innerHeight * (compactStage ? 0.055 : 0.085),
  );
  const depthRadius = Math.min(compactStage ? 120 : 270, innerWidth * (compactStage ? 0.2 : 0.145));

  curveCards.forEach((card, index) => {
    const offset = index + 1 - progress;
    const distance = Math.abs(offset);
    const x = Math.sin(offset) * horizontalRadius;
    const y = offset * verticalStep;
    const z = (Math.cos(offset) - 1) * depthRadius;
    const rotationY = clamp(offset * (180 / Math.PI) * 0.6, -86, 86);
    const scale =
      (compactStage ? 0.94 : 0.9) + (compactStage ? 0.12 : 0.2) * (1 - Math.min(1, distance));
    const opacity = (1 - smoothstep(0.8, 2.5, distance)) * clamp(Math.min(entrance, exit));

    card.style.setProperty('--curve-x', `${x.toFixed(2)}px`);
    card.style.setProperty('--curve-y', `${y.toFixed(2)}px`);
    card.style.setProperty('--curve-rotate', '0deg');
    card.style.setProperty('--curve-rotate-y', `${rotationY.toFixed(3)}deg`);
    card.style.setProperty('--curve-z', `${z.toFixed(2)}px`);
    card.style.setProperty('--curve-scale', scale.toFixed(3));
    card.style.opacity = opacity.toFixed(3);
    card.style.zIndex = String(100 - Math.round(distance * 10));
    card.style.pointerEvents = distance <= 0.58 && sectionPresence > 0.7 ? 'auto' : 'none';
  });
}

function updateCurveTarget(measuredBounds?: SectionBounds) {
  if (!curveSection || !usesStageRail() || !curveCards.length) return;
  const bounds = measuredBounds ?? readCurveBounds();
  // The reference works trigger runs from `top bottom` through `bottom top`.
  targetCurveTrigger = clamp(
    (innerHeight - bounds.top) / Math.max(1, bounds.height + innerHeight),
  );
}

function updateAll(timestamp = performance.now()) {
  const deltaSeconds = Math.min(0.05, Math.max(1 / 240, (timestamp - lastMotionFrame) / 1_000));
  lastMotionFrame = timestamp;
  updateMelt();
  const curveBounds =
    curveSection && curveNearViewport && usesStageRail() && curveCards.length
      ? readCurveBounds()
      : undefined;
  if (curveNearViewport) updateCurveTarget(curveBounds);

  if (meltNearViewport) {
    const meltBlend = 1 - Math.exp(-12 * deltaSeconds);
    renderedMelt += (targetMelt - renderedMelt) * meltBlend;
    if (Math.abs(targetMelt - renderedMelt) < 0.0005) renderedMelt = targetMelt;
    renderMelt(renderedMelt);
  }

  if (curveSection && curveNearViewport && usesStageRail() && curveCards.length) {
    const previousProgress = renderedCurveProgress;
    // Match the reference's two-stage works rail exactly: first smooth the section trigger at
    // 10/s, then bias the nearest project stop 60/40 and smooth that result at 5/s.
    renderedCurveTrigger +=
      (targetCurveTrigger - renderedCurveTrigger) * Math.min(1, deltaSeconds * 10);
    const continuousProgress = renderedCurveTrigger * (curveCards.length + 1);
    const nearestProjectStop = Math.round(continuousProgress);
    const targetCurveProgress =
      nearestProjectStop - (nearestProjectStop - continuousProgress) * 0.4;
    renderedCurveProgress +=
      (targetCurveProgress - renderedCurveProgress) * Math.min(1, deltaSeconds * 5);
    if (Math.abs(targetCurveProgress - renderedCurveProgress) < 0.0005) {
      renderedCurveProgress = targetCurveProgress;
    }
    const instantaneousVelocity =
      (renderedCurveProgress - previousProgress) / Math.max(deltaSeconds, 1 / 240);
    renderedCurveVelocity +=
      (instantaneousVelocity - renderedCurveVelocity) * (1 - Math.exp(-8 * deltaSeconds));
    renderCurve(renderedCurveProgress);
    setActiveProject(Math.floor(renderedCurveProgress - 0.5));
  }
}

function selectProject(index: number) {
  if (!curveSection || curveCards.length < 2) return;
  const target = Math.round(clamp(index, 0, curveCards.length - 1));
  if (usesStageRail()) {
    const triggerProgress = (target + 1) / (curveCards.length + 1);
    const scrollTarget =
      curveDocumentTop - innerHeight + triggerProgress * (curveSectionHeight + innerHeight);
    if (smoothScroller) {
      smoothScroller.scrollTo(scrollTarget, { duration: 1.55 });
    } else {
      scrollTo({ top: scrollTarget, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
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
  const current = Math.max(0, activeProject);
  const target = boundedProjectIndex(current, direction, curveCards.length);
  if (target === current) return false;
  selectProject(target);
  return true;
}

if (curveSection && curveCards.length) {
  syncCurveStage();
  setActiveProject(0);
  renderCurve(renderedCurveProgress);
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
}

addEventListener(
  'resize',
  () => {
    measureMotionSections();
    syncMotionTier();
    renderCurve(renderedCurveProgress);
  },
  { passive: true },
);
syncMotionTier();

let motionLoopRunning = true;
let smoothScrollAnimationFrame = 0;
const smoothScrollFrame = (time: number) => {
  smoothScrollAnimationFrame = 0;
  if (!motionLoopRunning) return;
  smoothScroller?.raf(time);
  if (meltNearViewport || curveNearViewport) {
    updateAll(time);
  } else {
    lastMotionFrame = time;
  }
  smoothScrollAnimationFrame = requestAnimationFrame(smoothScrollFrame);
};
const startMotionLoop = () => {
  if (!motionLoopRunning || smoothScrollAnimationFrame) return;
  smoothScrollAnimationFrame = requestAnimationFrame(smoothScrollFrame);
};
startMotionLoop();

addEventListener('pagehide', (event) => {
  motionLoopRunning = false;
  cancelAnimationFrame(smoothScrollAnimationFrame);
  smoothScrollAnimationFrame = 0;
  smoothScroller?.stop();
  if (event.persisted) return;
  clearTimeout(projectSwapTimer);
  motionSectionObserver?.disconnect();
  motionSectionResizeObserver?.disconnect();
  smoothScroller?.destroy();
});

addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  measureMotionSections();
  lastMotionFrame = performance.now();
  motionLoopRunning = true;
  smoothScroller?.start();
  startMotionLoop();
});

document
  .querySelectorAll<HTMLDetailsElement>('.mobile-navigation, .reference-mobile-menu')
  .forEach((navigation) => {
    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navigation.open = false;
      });
    });
  });
