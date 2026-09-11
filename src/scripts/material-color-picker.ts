const toggle = document.querySelector<HTMLButtonElement>('[data-color-toggle]');
const panel = document.querySelector<HTMLElement>('[data-color-panel]');
const area = document.querySelector<HTMLElement>('[data-color-saturation]');
const cursor = document.querySelector<HTMLElement>('[data-color-cursor]');
const hueInput = document.querySelector<HTMLInputElement>('[data-color-hue]');
const colorInput = document.querySelector<HTMLInputElement>('[data-material-color]');
const swatch = document.querySelector<HTMLElement>('[data-color-swatch]');
const channels = [...document.querySelectorAll<HTMLInputElement>('[data-color-channel]')];
const readout = document.querySelector<HTMLOutputElement>('[data-material-color-value]');
const limit = (n: number, max = 1) => Math.min(max, Math.max(0, n));

if (toggle && panel && area && cursor && hueInput && colorInput && swatch && readout) {
  let hue = 0, saturation = 0, brightness = 1;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const close = () => { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
  const render = () => {
    const h = hue / 60;
    const c = brightness * saturation, x = c * (1 - Math.abs(h % 2 - 1)), m = brightness - c;
    const tuple = h < 1 ? [c,x,0] : h < 2 ? [x,c,0] : h < 3 ? [0,c,x] : h < 4 ? [0,x,c] : h < 5 ? [x,0,c] : [c,0,x];
    const rgb = tuple.map(n => Math.round((n + m) * 255));
    colorInput.value = '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('');
    swatch.style.backgroundColor = colorInput.value;
    area.style.setProperty('--picker-hue', String(hue));
    cursor.style.left = `${saturation * 100}%`;
    cursor.style.top = `${(1 - brightness) * 100}%`;
    hueInput.value = String(hue);
    channels.forEach((input, i) => { input.value = String(rgb[i]); });
    colorInput.dispatchEvent(new Event('input', { bubbles: true }));
    readout.value = `{r: ${rgb[0]}, g: ${rgb[1]}, b: ${rgb[2]}}`;
  };
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  }, options);
  const move = (event: PointerEvent) => {
    const bounds = area.getBoundingClientRect();
    saturation = limit((event.clientX - bounds.left) / bounds.width);
    brightness = 1 - limit((event.clientY - bounds.top) / bounds.height);
    render();
  };
  area.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); area.setPointerCapture(event.pointerId); move(event);
  }, options);
  area.addEventListener('pointermove', event => { if (area.hasPointerCapture(event.pointerId)) move(event); }, options);
  area.addEventListener('pointerup', event => {
    if (area.hasPointerCapture(event.pointerId)) area.releasePointerCapture(event.pointerId);
  }, options);
  hueInput.addEventListener('input', () => { hue = Number(hueInput.value); render(); }, options);
  channels.forEach(input => input.addEventListener('input', () => {
    const [r = 1,g = 1,b = 1] = channels.map(channel => limit(Number(channel.value), 255) / 255);
    const max = Math.max(r,g,b), delta = max - Math.min(r,g,b);
    brightness = max; saturation = max === 0 ? 0 : delta / max;
    if (delta > 0) hue = ((max === r ? (g-b)/delta : max === g ? (b-r)/delta+2 : (r-g)/delta+4) * 60 + 360) % 360;
    render();
  }, options));
  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Node && !panel.contains(event.target) && !toggle.contains(event.target)) close();
  }, options);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { close(); toggle.focus(); } }, options);
  addEventListener('pagehide', event => { if (!event.persisted) listeners.abort(); }, { once: true });
  render();
}
