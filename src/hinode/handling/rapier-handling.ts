import RAPIER from '@dimforge/rapier3d-compat';
import {
  HANDLING_STEP_SECONDS,
  NIGHTLINE_HANDLING,
  NightlineTireModel,
  type AnalogVehicleInput,
  type HandlingForces,
  type HandlingTuning,
} from '../vehicle/handling-model';
import { HANDLING_BARRIERS, HANDLING_SPAWN, type HandlingBarrier } from './handling-layout';

export interface RapierHandlingOptions {
  spawn?: {
    x: number;
    z: number;
    yaw: number;
  };
  barriers?: readonly HandlingBarrier[];
}

export interface HandlingPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  wheelSpin: number;
  collisions: number;
  telemetry: HandlingForces;
}

export class RapierHandlingSimulation {
  readonly world: RAPIER.World;
  readonly body: RAPIER.RigidBody;
  readonly vehicleCollider: RAPIER.Collider;
  readonly tireModel = new NightlineTireModel();
  private wheelSpin = 0;
  private collisions = 0;
  private hadContact = false;
  private latest: HandlingForces;
  private readonly spawn: { x: number; z: number; yaw: number };

  private constructor(
    world: RAPIER.World,
    body: RAPIER.RigidBody,
    collider: RAPIER.Collider,
    spawn: { x: number; z: number; yaw: number },
  ) {
    this.world = world;
    this.body = body;
    this.vehicleCollider = collider;
    this.spawn = spawn;
    this.latest = this.tireModel.step(
      { yaw: spawn.yaw, velocityX: 0, velocityZ: 0, yawRate: 0 },
      { throttle: 0, brake: 0, steer: 0, handbrake: false },
    );
  }

  static async create(options: RapierHandlingOptions = {}) {
    await RAPIER.init();
    const spawn = options.spawn ?? HANDLING_SPAWN;
    const barriers = options.barriers ?? HANDLING_BARRIERS;
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    world.timestep = HANDLING_STEP_SECONDS;
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spawn.x, 0.66, spawn.z)
        .setRotation({
          x: 0,
          y: Math.sin(spawn.yaw * 0.5),
          z: 0,
          w: Math.cos(spawn.yaw * 0.5),
        })
        .enabledTranslations(true, false, true)
        .enabledRotations(false, true, false)
        .setLinearDamping(0.025)
        .setAngularDamping(0.24)
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    const vehicleCollider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.86, 0.55, 2.09)
        .setMass(NIGHTLINE_HANDLING.massKilograms)
        .setFriction(0.05)
        .setRestitution(0.08),
      body,
    );
    for (const barrier of barriers) {
      const rigidBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(barrier.x, 0.7, barrier.z)
          .setRotation({
            x: 0,
            y: Math.sin((barrier.yaw ?? 0) * 0.5),
            z: 0,
            w: Math.cos((barrier.yaw ?? 0) * 0.5),
          }),
      );
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(barrier.width * 0.5, 0.75, barrier.depth * 0.5)
          .setFriction(0.18)
          .setRestitution(0.06),
        rigidBody,
      );
    }
    return new RapierHandlingSimulation(world, body, vehicleCollider, spawn);
  }

  reset() {
    this.body.setTranslation({ x: this.spawn.x, y: 0.66, z: this.spawn.z }, true);
    this.body.setRotation(
      {
        x: 0,
        y: Math.sin(this.spawn.yaw * 0.5),
        z: 0,
        w: Math.cos(this.spawn.yaw * 0.5),
      },
      true,
    );
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.tireModel.reset();
    this.wheelSpin = 0;
    this.collisions = 0;
    this.hadContact = false;
  }

  setTuning(tuning: Partial<HandlingTuning>) {
    this.tireModel.setTuning(tuning);
  }

  step(input: AnalogVehicleInput): HandlingPose {
    const rotation = this.body.rotation();
    const yaw = 2 * Math.atan2(rotation.y, rotation.w);
    const velocity = this.body.linvel();
    const angularVelocity = this.body.angvel();
    this.latest = this.tireModel.step(
      {
        yaw,
        velocityX: velocity.x,
        velocityZ: velocity.z,
        yawRate: angularVelocity.y,
      },
      input,
      HANDLING_STEP_SECONDS,
    );
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.body.addForce({ x: this.latest.forceX, y: 0, z: this.latest.forceZ }, true);
    this.body.addTorque({ x: 0, y: this.latest.yawTorque, z: 0 }, true);
    this.world.step();
    let hasContact = false;
    this.world.contactPairsWith(this.vehicleCollider, () => {
      hasContact = true;
    });
    if (hasContact && !this.hadContact) this.collisions += 1;
    this.hadContact = hasContact;
    this.wheelSpin -= (this.latest.longitudinalSpeed / 0.3017) * HANDLING_STEP_SECONDS;
    return this.pose();
  }

  pose(): HandlingPose {
    const position = this.body.translation();
    const rotation = this.body.rotation();
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      yaw: 2 * Math.atan2(rotation.y, rotation.w),
      wheelSpin: this.wheelSpin,
      collisions: this.collisions,
      telemetry: this.latest,
    };
  }

  dispose() {
    this.world.free();
  }
}
