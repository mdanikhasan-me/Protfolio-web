export interface FixedStepResult {
  steps: number;
  alpha: number;
  droppedSeconds: number;
}

export class FixedStepClock {
  readonly stepSeconds: number;
  readonly maximumFrameSeconds: number;
  readonly maximumSteps: number;
  private accumulator = 0;

  constructor(stepSeconds = 1 / 60, maximumFrameSeconds = 0.1, maximumSteps = 8) {
    this.stepSeconds = stepSeconds;
    this.maximumFrameSeconds = maximumFrameSeconds;
    this.maximumSteps = maximumSteps;
  }

  reset() {
    this.accumulator = 0;
  }

  advance(frameSeconds: number, update: (stepSeconds: number) => void): FixedStepResult {
    const finiteFrame = Number.isFinite(frameSeconds) ? Math.max(0, frameSeconds) : 0;
    const accepted = Math.min(finiteFrame, this.maximumFrameSeconds);
    let droppedSeconds = Math.max(0, finiteFrame - accepted);
    this.accumulator += accepted;

    let steps = 0;
    while (this.accumulator >= this.stepSeconds && steps < this.maximumSteps) {
      update(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps += 1;
    }

    if (this.accumulator >= this.stepSeconds) {
      droppedSeconds += this.accumulator - (this.accumulator % this.stepSeconds);
      this.accumulator %= this.stepSeconds;
    }

    return {
      steps,
      alpha: this.accumulator / this.stepSeconds,
      droppedSeconds,
    };
  }
}
