export interface AnalogVehicleInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
}

export interface PlanarVehicleSample {
  yaw: number;
  velocityX: number;
  velocityZ: number;
  yawRate: number;
}

export interface HandlingForces {
  forceX: number;
  forceZ: number;
  yawTorque: number;
  steeringAngle: number;
  speedMetresPerSecond: number;
  longitudinalSpeed: number;
  lateralSpeed: number;
  frontSlipDegrees: number;
  rearSlipDegrees: number;
  lateralG: number;
  longitudinalG: number;
  frontLoadNewtons: number;
  rearLoadNewtons: number;
  frontGripPercent: number;
  rearGripPercent: number;
}

export const HANDLING_STEP_SECONDS = 1 / 120;

export interface HandlingTuning {
  steeringResponse: number;
  gripScale: number;
  handbrakeGripScale: number;
}

export const DEFAULT_HANDLING_TUNING: Readonly<HandlingTuning> = {
  steeringResponse: 1,
  gripScale: 1,
  handbrakeGripScale: 1,
};

export const NIGHTLINE_HANDLING = {
  massKilograms: 1480,
  gravity: 9.81,
  wheelbaseMetres: 2.6127,
  centreToFrontAxleMetres: 1.31,
  centreToRearAxleMetres: 1.3027,
  centreOfMassHeightMetres: 0.51,
  frontCorneringStiffness: 58_000,
  rearCorneringStiffness: 62_000,
  dryGrip: 1.08,
  handbrakeRearGrip: 0.43,
  engineForceNewtons: 9_200,
  reverseForceNewtons: 4_800,
  brakeForceNewtons: 15_500,
  rollingResistanceNewtons: 190,
  aerodynamicDrag: 4.3,
  maximumForwardSpeed: 47,
  maximumReverseSpeed: 9,
  lowSpeedSteerRadians: 0.56,
  highSpeedSteerRadians: 0.22,
  steeringRateRadiansPerSecond: 3.4,
} as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const approach = (value: number, target: number, amount: number) =>
  value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);

export class NightlineTireModel {
  steeringAngle = 0;
  private tuning: HandlingTuning = { ...DEFAULT_HANDLING_TUNING };

  reset() {
    this.steeringAngle = 0;
  }

  setTuning(tuning: Partial<HandlingTuning>) {
    this.tuning = {
      steeringResponse: clamp(tuning.steeringResponse ?? this.tuning.steeringResponse, 0.65, 1.35),
      gripScale: clamp(tuning.gripScale ?? this.tuning.gripScale, 0.78, 1.18),
      handbrakeGripScale: clamp(
        tuning.handbrakeGripScale ?? this.tuning.handbrakeGripScale,
        0.62,
        1.35,
      ),
    };
  }

  getTuning(): Readonly<HandlingTuning> {
    return this.tuning;
  }

  step(
    sample: PlanarVehicleSample,
    input: AnalogVehicleInput,
    stepSeconds = HANDLING_STEP_SECONDS,
  ): HandlingForces {
    const specification = NIGHTLINE_HANDLING;
    const forwardX = -Math.sin(sample.yaw);
    const forwardZ = -Math.cos(sample.yaw);
    const rightX = Math.cos(sample.yaw);
    const rightZ = -Math.sin(sample.yaw);
    const longitudinalSpeed = sample.velocityX * forwardX + sample.velocityZ * forwardZ;
    const lateralSpeed = sample.velocityX * rightX + sample.velocityZ * rightZ;
    const speed = Math.hypot(sample.velocityX, sample.velocityZ);
    const steerSpeedRatio = clamp(speed / 33, 0, 1);
    const maximumSteer =
      specification.lowSpeedSteerRadians +
      (specification.highSpeedSteerRadians - specification.lowSpeedSteerRadians) * steerSpeedRatio;
    const requestedSteer = clamp(input.steer, -1, 1) * maximumSteer;
    this.steeringAngle = approach(
      this.steeringAngle,
      requestedSteer,
      specification.steeringRateRadiansPerSecond * this.tuning.steeringResponse * stepSeconds,
    );

    const safeLongitudinalSpeed = Math.max(1.4, Math.abs(longitudinalSpeed));
    const frontLateralVelocity =
      lateralSpeed - specification.centreToFrontAxleMetres * sample.yawRate;
    const rearLateralVelocity =
      lateralSpeed + specification.centreToRearAxleMetres * sample.yawRate;
    const frontSlip = Math.atan2(frontLateralVelocity, safeLongitudinalSpeed) - this.steeringAngle;
    const rearSlip = Math.atan2(rearLateralVelocity, safeLongitudinalSpeed);

    const throttle = clamp(input.throttle, 0, 1);
    const brake = clamp(input.brake, 0, 1);
    const estimatedLongitudinalAcceleration =
      (throttle * specification.engineForceNewtons - brake * specification.brakeForceNewtons) /
      specification.massKilograms;
    const staticFrontLoad =
      (specification.massKilograms * specification.gravity * specification.centreToRearAxleMetres) /
      specification.wheelbaseMetres;
    const loadTransfer =
      (specification.massKilograms *
        estimatedLongitudinalAcceleration *
        specification.centreOfMassHeightMetres) /
      specification.wheelbaseMetres;
    const frontLoad = clamp(
      staticFrontLoad - loadTransfer,
      specification.massKilograms * specification.gravity * 0.27,
      specification.massKilograms * specification.gravity * 0.73,
    );
    const rearLoad = specification.massKilograms * specification.gravity - frontLoad;
    const dryGrip = specification.dryGrip * this.tuning.gripScale;
    const rearGrip = input.handbrake
      ? specification.handbrakeRearGrip * this.tuning.gripScale * this.tuning.handbrakeGripScale
      : dryGrip;
    const frontLateralForce = clamp(
      -frontSlip * specification.frontCorneringStiffness,
      -frontLoad * dryGrip,
      frontLoad * dryGrip,
    );
    const rearLateralForce = clamp(
      -rearSlip * specification.rearCorneringStiffness,
      -rearLoad * rearGrip,
      rearLoad * rearGrip,
    );

    const driveFade = clamp(
      1 - Math.max(0, longitudinalSpeed) / specification.maximumForwardSpeed,
      0,
      1,
    );
    let longitudinalForce = throttle * specification.engineForceNewtons * driveFade;
    if (brake > 0) {
      if (longitudinalSpeed > 0.65) {
        longitudinalForce -= brake * specification.brakeForceNewtons;
      } else if (longitudinalSpeed > -specification.maximumReverseSpeed) {
        longitudinalForce -= brake * specification.reverseForceNewtons;
      }
    }
    if (Math.abs(longitudinalSpeed) > 0.15) {
      longitudinalForce -=
        Math.sign(longitudinalSpeed) *
        (specification.rollingResistanceNewtons +
          specification.aerodynamicDrag * longitudinalSpeed * longitudinalSpeed);
    }

    const lateralForce = frontLateralForce + rearLateralForce;
    const forceX = forwardX * longitudinalForce + rightX * lateralForce;
    const forceZ = forwardZ * longitudinalForce + rightZ * lateralForce;
    const yawTorque =
      -specification.centreToFrontAxleMetres * frontLateralForce +
      specification.centreToRearAxleMetres * rearLateralForce;

    return {
      forceX,
      forceZ,
      yawTorque,
      steeringAngle: this.steeringAngle,
      speedMetresPerSecond: speed,
      longitudinalSpeed,
      lateralSpeed,
      frontSlipDegrees: (frontSlip * 180) / Math.PI,
      rearSlipDegrees: (rearSlip * 180) / Math.PI,
      lateralG: Math.abs(lateralForce) / (specification.massKilograms * specification.gravity),
      longitudinalG: longitudinalForce / (specification.massKilograms * specification.gravity),
      frontLoadNewtons: frontLoad,
      rearLoadNewtons: rearLoad,
      frontGripPercent: Math.round(
        clamp(Math.abs(frontLateralForce) / Math.max(1, frontLoad * dryGrip), 0, 1) * 100,
      ),
      rearGripPercent: Math.round((rearGrip / dryGrip) * 100),
    };
  }
}
