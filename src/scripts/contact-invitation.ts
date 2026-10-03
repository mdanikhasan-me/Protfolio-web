// One entrance per page visit. No animation loop, font morphing or extra canvas.
const invitationCopy = document.querySelector<HTMLElement>('.home-contact-copy');
if (invitationCopy && !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  invitationCopy.dataset.reveal = 'pending';
  const reveal = () => {
    invitationCopy.dataset.reveal = 'visible';
    observer.disconnect();
    invitationCopy.removeEventListener('focusin', reveal);
  };
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) reveal();
  }, { threshold: 0.3 });
  observer.observe(invitationCopy);
  invitationCopy.addEventListener('focusin', reveal);
}
