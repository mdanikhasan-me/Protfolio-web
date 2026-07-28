import type { VehicleInput } from '../vehicle/dynamics';

type Action = keyof VehicleInput;

const ACTION_BY_CODE: Readonly<Partial<Record<string, Action>>> = {
  KeyW: 'accelerate',
  ArrowUp: 'accelerate',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'handbrake',
};

const shouldIgnore = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

export class HinodeInput {
  readonly state: VehicleInput = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
  };

  private active = false;
  private readonly onReset: () => void;
  private readonly onCamera: () => void;
  private readonly onPause: () => void;

  constructor(callbacks: { reset: () => void; camera: () => void; pause: () => void }) {
    this.onReset = callbacks.reset;
    this.onCamera = callbacks.camera;
    this.onPause = callbacks.pause;
    addEventListener('keydown', this.handleDown);
    addEventListener('keyup', this.handleUp);
    addEventListener('blur', this.clear);
  }

  setActive(active: boolean) {
    this.active = active;
    if (!active) this.clear();
  }

  dispose() {
    removeEventListener('keydown', this.handleDown);
    removeEventListener('keyup', this.handleUp);
    removeEventListener('blur', this.clear);
  }

  private readonly handleDown = (event: KeyboardEvent) => {
    if (!this.active || shouldIgnore(event.target)) return;
    const action = ACTION_BY_CODE[event.code];
    if (action) {
      event.preventDefault();
      this.state[action] = true;
      return;
    }
    if (event.repeat) return;
    if (event.code === 'KeyR') this.onReset();
    if (event.code === 'KeyC') this.onCamera();
    if (event.code === 'Escape') this.onPause();
  };

  private readonly handleUp = (event: KeyboardEvent) => {
    const action = ACTION_BY_CODE[event.code];
    if (!action) return;
    event.preventDefault();
    this.state[action] = false;
  };

  private readonly clear = () => {
    for (const action of Object.keys(this.state) as Action[]) this.state[action] = false;
  };
}
