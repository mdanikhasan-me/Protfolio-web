// Reference-style character reveal using this site's identity alphabet.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const links = document.querySelectorAll<HTMLAnchorElement>(
  '.reference-nav a, .studio-header nav a, .curve-more-works',
);
links.forEach(link => {
  const text = [...link.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
  if (!text?.textContent?.trim()) return;
  const original = text.textContent;
  link.setAttribute('aria-label', link.textContent?.trim() ?? original.trim());
  let frame = 0;
  const restore = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    text.textContent = original;
    link.style.removeProperty('width');
  };
  const animate = () => {
    restore();
    if (reduced.matches) return;
    link.style.width = `${link.getBoundingClientRect().width}px`;
    const start = performance.now();
    let lastStep = -1;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= 400) { restore(); return; }
      const step = Math.floor(elapsed / 50);
      if (step !== lastStep) {
        const reveal = Math.max(0, (elapsed - 200) / 200);
        const count = Math.floor(original.length * (1 - (1 - reveal) ** 3));
        text.textContent = [...original].map((char, index) =>
          index < count || /\s/.test(char) ? char : 'AnikANIK'[(step * 3 + index * 5) % 8],
        ).join('');
        lastStep = step;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  link.addEventListener('pointerenter', animate);
  link.addEventListener('focus', animate);
  link.addEventListener('blur', restore);
  addEventListener('pagehide', restore, { once: true });
});
