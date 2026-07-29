import type { AnalogVehicleInput } from '../vehicle/handling-model';

type DrivingAction = 'accelerate' | 'brake' | 'left' | 'right' | 'handbrake';

const ACTION_BY_CODE: Readonly<Partial<Record<string, DrivingAction>>> = {
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

const approach = (value: number, target: number, amount: number) =>
  value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

interface VibrationActuator {
  playEffect?: (
    type: 'dual-rumble',
    parameters: {
      duration: number;
      strongMagnitude: number;
      weakMagnitude: number;
    },
  ) => Promise<unknown>;
  pulse?: (value: number, duration: number) => Promise<boolean>;
}

export class DrivingInput {
  private readonly pressed = new Set<DrivingAction>();
  private active = false;
  private current: AnalogVehicleInput = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
  };
  private previousGamepadButtons = new Set<number>();
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

  sample(stepSeconds = 1 / 120): AnalogVehicleInput {
    const gamepad = navigator.getGamepads?.()[0];
    const gamepadSteer = gamepad?.axes[0] ?? 0;
    const keyboardSteer = Number(this.pressed.has('right')) - Number(this.pressed.has('left'));
    const throttleTarget = Math.max(
      Number(this.pressed.has('accelerate')),
      gamepad?.buttons[7]?.value ?? 0,
    );
    const brakeTarget = Math.max(
      Number(this.pressed.has('brake')),
      gamepad?.buttons[6]?.value ?? 0,
    );
    const rawSteer =
      Math.abs(gamepadSteer) > 0.12
        ? Math.sign(gamepadSteer) * Math.pow((Math.abs(gamepadSteer) - 0.12) / 0.88, 1.45)
        : keyboardSteer;
    const steerRate = rawSteer === 0 ? 7.2 : Math.abs(gamepadSteer) > 0.12 ? 8.5 : 5.4;
    this.current = {
      throttle: approach(
        this.current.throttle,
        throttleTarget,
        (throttleTarget > this.current.throttle ? 2.8 : 4.8) * stepSeconds,
      ),
      brake: approach(
        this.current.brake,
        brakeTarget,
        (brakeTarget > this.current.brake ? 4.6 : 7.2) * stepSeconds,
      ),
      steer: approach(this.current.steer, rawSteer, steerRate * stepSeconds),
      handbrake: this.pressed.has('handbrake') || (gamepad?.buttons[0]?.pressed ?? false),
    };
    this.pollGamepadActions(gamepad);
    return this.current;
  }

  peek(): Readonly<AnalogVehicleInput> {
    return this.current;
  }

  resetState() {
    this.pressed.clear();
    this.current = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  }

  pulse(strength = 0.5, duration = 80) {
    const gamepad = navigator.getGamepads?.()[0];
    const actuator = (gamepad as (Gamepad & { vibrationActuator?: VibrationActuator }) | undefined)
      ?.vibrationActuator;
    if (actuator?.playEffect) {
      void actuator.playEffect('dual-rumble', {
        duration,
        strongMagnitude: Math.min(1, strength),
        weakMagnitude: Math.min(1, strength * 0.62),
      });
    } else if (actuator?.pulse) {
      void actuator.pulse(Math.min(1, strength), duration);
    }
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
      this.pressed.add(action);
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
    this.pressed.delete(action);
  };

  private readonly clear = () => {
    this.resetState();
    this.previousGamepadButtons.clear();
  };

  private pollGamepadActions(gamepad: Gamepad | null | undefined) {
    if (!gamepad) {
      this.previousGamepadButtons.clear();
      return;
    }
    const pressed = new Set<number>();
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed) pressed.add(index);
    });
    if (pressed.has(1) && !this.previousGamepadButtons.has(1)) this.onReset();
    if (pressed.has(3) && !this.previousGamepadButtons.has(3)) this.onCamera();
    if (pressed.has(9) && !this.previousGamepadButtons.has(9)) this.onPause();
    this.previousGamepadButtons = pressed;
  }
}
