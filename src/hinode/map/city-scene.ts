import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineLoop,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import {
  distanceToRoad,
  reviewPose,
  roadBankRadiansAt,
  roadCurve,
  type HinodeCityLayout,
  type HinodeDistrict,
  type HinodePlanZone,
  type HinodeRoad,
  type HinodeRoadsidePlan,
} from './city-layout';

export interface CitySceneOptions {
  quality: 'high' | 'low';
  editor?: boolean;
}

export interface CitySceneBuild {
  root: Group;
  editableObjects: Map<string, Group>;
  reviewLayers: Map<ReviewLayerKind, Group>;
}

export type ReviewLayerKind =
  | 'topology'
  | 'road-hierarchy'
  | 'elevation'
  | 'road-width'
  | 'road-edges'
  | 'safety'
  | 'district-density'
  | 'footpaths'
  | 'parcels'
  | 'vegetation'
  | 'signs'
  | 'collision'
  | 'sightlines';

interface ProxyFootprint {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

const ROAD_COLOURS: Readonly<Record<HinodeRoad['surface'], number>> = {
  highway: 0x48566a,
  city: 0x505969,
  alley: 0x3c414e,
  mountain: 0x455052,
  waterfront: 0x3e586a,
  elevated: 0x596174,
  tunnel: 0x282f3d,
};

const MARKING_COLOURS: Readonly<Record<HinodeRoad['surface'], number>> = {
  highway: 0xf0ba48,
  city: 0xe9e7d9,
  alley: 0x708497,
  mountain: 0xe5b44c,
  waterfront: 0x77cbea,
  elevated: 0xe9e7d9,
  tunnel: 0xff745f,
};

const EDGE_COLOURS: Readonly<Record<string, number>> = {
  'highway-shoulder': 0x7fa8c9,
  'crash-barrier-zone': 0xff665b,
  'urban-pavement': 0xc8bfa9,
  'maintenance-walkway': 0x7b91a6,
  'painted-shoulder': 0xe3c65a,
  'narrow-alley-drainage': 0x40677b,
  'flush-building-edge': 0x8e6b73,
  'mountain-drainage-channel': 0x426975,
  'guardrail-zone': 0xf19a52,
  seawall: 0x5eb3c6,
};

const HIERARCHY_COLOURS: Readonly<Record<string, number>> = {
  'main-loop-highway': 0xf5f0da,
  'secondary-commercial': 0x77d7ff,
  'secondary-industrial': 0x92a6be,
  'alley-narrow': 0xff6f9e,
  'touge-mountain': 0xf5b84b,
  'waterfront-scenic': 0x50e1d0,
  'elevated-flyover': 0xff705b,
  'underpass-connector': 0x9a7cff,
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const randomFactory = (seed: number) => {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

function roadRibbon(road: HinodeRoad) {
  const curve = roadCurve({
    ...road,
    transform: { position: [0, 0, 0], rotationY: 0, scale: [1, 1, 1] },
  });
  const sampleCount = Math.max(40, road.points.length * 18);
  const points = curve.getSpacedPoints(sampleCount);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const leftEdge: Vector3[] = [];
  const rightEdge: Vector3[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const before = points[Math.max(0, index - 1)]!;
    const after = points[Math.min(points.length - 1, index + 1)]!;
    const tangent = after.clone().sub(before);
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const bank = roadBankRadiansAt(road, index / Math.max(1, points.length - 1));
    const bankCosine = Math.cos(bank);
    const bankSine = Math.sin(bank);
    const normalX = (tangent.z / length) * bankCosine;
    const normalZ = (-tangent.x / length) * bankCosine;
    const halfWidth = road.width * 0.5;
    positions.push(
      point.x + normalX * halfWidth,
      point.y + bankSine * halfWidth + 0.015,
      point.z + normalZ * halfWidth,
      point.x - normalX * halfWidth,
      point.y - bankSine * halfWidth + 0.015,
      point.z - normalZ * halfWidth,
    );
    leftEdge.push(
      new Vector3(
        point.x + normalX * halfWidth,
        point.y + bankSine * halfWidth + 0.065,
        point.z + normalZ * halfWidth,
      ),
    );
    rightEdge.push(
      new Vector3(
        point.x - normalX * halfWidth,
        point.y - bankSine * halfWidth + 0.065,
        point.z - normalZ * halfWidth,
      ),
    );
    const v = index / Math.max(1, points.length - 1);
    uvs.push(0, v, 1, v);
    if (index < points.length - 1) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  if (road.closed) {
    const base = (points.length - 1) * 2;
    indices.push(base, base + 1, 0, base + 1, 1, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, points, leftEdge, rightEdge };
}

function roadBand(
  road: HinodeRoad,
  firstOffset: number,
  secondOffset: number,
  heightOffset = 0.035,
) {
  const curve = roadCurve({
    ...road,
    transform: { position: [0, 0, 0], rotationY: 0, scale: [1, 1, 1] },
  });
  const points = curve.getSpacedPoints(Math.max(40, road.points.length * 18));
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const before = points[Math.max(0, index - 1)]!;
    const after = points[Math.min(points.length - 1, index + 1)]!;
    const tangent = after.clone().sub(before);
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const bank = roadBankRadiansAt(road, index / Math.max(1, points.length - 1));
    const bankCosine = Math.cos(bank);
    const bankSine = Math.sin(bank);
    const normalX = (tangent.z / length) * bankCosine;
    const normalZ = (-tangent.x / length) * bankCosine;
    positions.push(
      point.x + normalX * firstOffset,
      point.y + bankSine * firstOffset + heightOffset,
      point.z + normalZ * firstOffset,
      point.x + normalX * secondOffset,
      point.y + bankSine * secondOffset + heightOffset,
      point.z + normalZ * secondOffset,
    );
    if (index < points.length - 1) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  if (road.closed) {
    const base = (points.length - 1) * 2;
    indices.push(base, base + 1, 0, base + 1, 1, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const edgeMaterial = (edgeClass: string) => {
  const colour = EDGE_COLOURS[edgeClass] ?? 0x626a76;
  return new MeshStandardMaterial({
    color: colour,
    emissive: new Color(colour).multiplyScalar(0.16),
    emissiveIntensity: 0.5,
    roughness: 0.9,
    metalness: edgeClass.includes('barrier') ? 0.28 : 0.04,
    side: DoubleSide,
  });
};

function roadProtection(
  road: HinodeRoad,
  points: Vector3[],
  side: -1 | 1,
  roadsideWidth: number,
  protection: string,
) {
  if (protection === 'none' || protection === 'tunnel-wall') return undefined;
  const halfWidth = road.width * 0.5;
  const stride = protection === 'seawall' ? 2 : 3;
  const placements = Math.ceil((points.length - 1) / stride);
  const height = protection === 'seawall' ? 1.15 : 0.72;
  const geometry = new BoxGeometry(0.18, height, 1);
  const material = new MeshStandardMaterial({
    color: protection === 'seawall' ? 0x59798b : 0x9ba7ad,
    emissive: protection === 'canal-guardrail' ? 0x173444 : 0x15191d,
    emissiveIntensity: 0.46,
    roughness: 0.58,
    metalness: 0.48,
  });
  const barriers = new InstancedMesh(geometry, material, placements);
  barriers.name = `SAFETY_${side > 0 ? 'LEFT' : 'RIGHT'}_${road.id}`;
  const dummy = new Object3D();
  let placement = 0;
  for (let index = 0; index < points.length - 1; index += stride) {
    const point = points[index]!;
    const next = points[Math.min(points.length - 1, index + stride)]!;
    const tangent = next.clone().sub(point);
    const length = Math.hypot(tangent.x, tangent.z) || 1;
    const offset = side * (halfWidth + (road.edgePlan?.drainageWidth ?? 0) + roadsideWidth + 0.16);
    dummy.position.set(
      (point.x + next.x) * 0.5 + (tangent.z / length) * offset,
      (point.y + next.y) * 0.5 + height * 0.5,
      (point.z + next.z) * 0.5 - (tangent.x / length) * offset,
    );
    dummy.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0);
    dummy.scale.set(1, 1, Math.max(0.8, length * 1.04));
    dummy.updateMatrix();
    barriers.setMatrixAt(placement, dummy.matrix);
    placement += 1;
  }
  barriers.count = placement;
  barriers.instanceMatrix.needsUpdate = true;
  return barriers;
}

function createRoad(
  road: HinodeRoad,
  roadside: HinodeRoadsidePlan | undefined,
  options: CitySceneOptions,
  structure: HinodeCityLayout['authoring']['structures'][number] | undefined,
) {
  const group = new Group();
  group.name = `ROAD_${road.id}`;
  group.userData.editorType = 'road';
  group.userData.layoutId = road.id;
  group.userData.locked = road.locked ?? false;
  group.visible = !road.hidden;
  group.position.set(...road.transform.position);
  group.rotation.y = road.transform.rotationY;
  group.scale.set(...road.transform.scale);

  const { geometry, points, leftEdge, rightEdge } = roadRibbon(road);
  const roadMaterial = new MeshStandardMaterial({
    color: ROAD_COLOURS[road.surface],
    emissive: new Color(ROAD_COLOURS[road.surface]).multiplyScalar(0.18),
    emissiveIntensity: 0.45,
    roughness: 0.86,
    metalness: road.surface === 'elevated' ? 0.24 : 0.06,
    side: DoubleSide,
  });
  const surface = new Mesh(geometry, roadMaterial);
  surface.name = `ROAD_SURFACE_${road.id}`;
  surface.receiveShadow = options.quality === 'high';
  group.add(surface);

  const lineGeometry = new BufferGeometry().setFromPoints(
    points.map((point) => point.clone().add(new Vector3(0, 0.055, 0))),
  );
  const marking = new Line(
    lineGeometry,
    new LineBasicMaterial({
      color: MARKING_COLOURS[road.surface],
      transparent: true,
      opacity: road.surface === 'alley' ? 0.38 : 0.92,
    }),
  );
  marking.name = `ROAD_MARKING_${road.id}`;
  group.add(marking);
  const roadEdgeLineMaterial = new LineBasicMaterial({
    color: road.surface === 'tunnel' ? 0xff655d : 0xa7c9e8,
    transparent: true,
    opacity: road.surface === 'alley' ? 0.34 : 0.66,
  });
  const leftMarking = new Line(new BufferGeometry().setFromPoints(leftEdge), roadEdgeLineMaterial);
  leftMarking.name = `ROAD_EDGE_LEFT_${road.id}`;
  const rightMarking = new Line(
    new BufferGeometry().setFromPoints(rightEdge),
    roadEdgeLineMaterial,
  );
  rightMarking.name = `ROAD_EDGE_RIGHT_${road.id}`;
  group.add(leftMarking, rightMarking);

  if (roadside) {
    const halfWidth = road.width * 0.5;
    const leftFootpath = new Mesh(
      roadBand(
        road,
        halfWidth + roadside.drainageWidth,
        halfWidth + roadside.drainageWidth + roadside.leftWidth,
      ),
      edgeMaterial(roadside.leftClass),
    );
    leftFootpath.name = `FOOTPATH_LEFT_${road.id}`;
    leftFootpath.receiveShadow = options.quality === 'high';
    const rightFootpath = new Mesh(
      roadBand(
        road,
        -halfWidth - roadside.drainageWidth,
        -halfWidth - roadside.drainageWidth - roadside.rightWidth,
      ),
      edgeMaterial(roadside.rightClass),
    );
    rightFootpath.name = `FOOTPATH_RIGHT_${road.id}`;
    rightFootpath.receiveShadow = options.quality === 'high';
    group.add(leftFootpath, rightFootpath);

    const drainageMaterial = new LineBasicMaterial({
      color: 0x243648,
      transparent: true,
      opacity: 0.92,
    });
    const drainagePoints = (offset: number) =>
      points.map((point, index) => {
        const before = points[Math.max(0, index - 1)]!;
        const after = points[Math.min(points.length - 1, index + 1)]!;
        const tangent = after.clone().sub(before);
        const length = Math.hypot(tangent.x, tangent.z) || 1;
        return new Vector3(
          point.x + (tangent.z / length) * offset,
          point.y + 0.06,
          point.z - (tangent.x / length) * offset,
        );
      });
    const leftDrain = new Line(
      new BufferGeometry().setFromPoints(drainagePoints(halfWidth + roadside.drainageWidth * 0.5)),
      drainageMaterial,
    );
    leftDrain.name = `DRAINAGE_LEFT_${road.id}`;
    const rightDrain = new Line(
      new BufferGeometry().setFromPoints(drainagePoints(-halfWidth - roadside.drainageWidth * 0.5)),
      drainageMaterial,
    );
    rightDrain.name = `DRAINAGE_RIGHT_${road.id}`;
    group.add(leftDrain, rightDrain);

    const leftProtection = roadProtection(
      road,
      points,
      1,
      roadside.leftWidth,
      roadside.leftProtection,
    );
    const rightProtection = roadProtection(
      road,
      points,
      -1,
      roadside.rightWidth,
      roadside.rightProtection,
    );
    if (leftProtection) group.add(leftProtection);
    if (rightProtection) group.add(rightProtection);
  }

  if (road.surface === 'elevated') {
    const supportMaterial = new MeshStandardMaterial({
      color: 0x303945,
      roughness: 0.72,
      metalness: 0.35,
    });
    const underside = new Mesh(
      roadBand(
        road,
        road.width * 0.5,
        -road.width * 0.5,
        -(structure?.deckThicknessMetres ?? 0.65),
      ),
      supportMaterial,
    );
    underside.name = `FLYOVER_UNDERSIDE_${road.id}`;
    group.add(underside);
    const supportGeometry = new BoxGeometry(1.15, 1, 1.15);
    const curve = roadCurve({
      ...road,
      transform: { position: [0, 0, 0], rotationY: 0, scale: [1, 1, 1] },
    });
    for (const progress of structure?.supportProgress ?? [0.42, 0.68]) {
      const point = curve.getPointAt(progress);
      if (point.y < 2) continue;
      const tangent = curve.getTangentAt(progress);
      const normal = new Vector3(tangent.z, 0, -tangent.x).normalize();
      for (const side of [-1, 1]) {
        const support = new Mesh(supportGeometry, supportMaterial);
        support.name = `FLYOVER_SUPPORT_${road.id}_${progress}_${side}`;
        support.position
          .copy(point)
          .addScaledVector(normal, side * (structure?.supportOffsetMetres ?? 4.7));
        support.position.y = point.y * 0.5;
        support.scale.y = point.y;
        group.add(support);
      }
    }
  }

  if (road.surface === 'tunnel') {
    const tunnelMaterial = new MeshStandardMaterial({
      color: 0x161b24,
      roughness: 0.78,
      metalness: 0.26,
    });
    const wallGeometry = new BoxGeometry(0.8, 4.6, 4);
    const ceilingGeometry = new BoxGeometry(road.width + 2.1, 0.7, 4);
    const tunnelSamples: Array<{
      point: Vector3;
      normal: Vector3;
      yaw: number;
      segmentLength: number;
    }> = [];
    for (let index = 8; index < points.length - 8; index += 8) {
      const point = points[index]!;
      if (point.y > -1) continue;
      const before = points[Math.max(0, index - 1)]!;
      const after = points[Math.min(points.length - 1, index + 1)]!;
      const tangent = after.clone().sub(before);
      const length = Math.hypot(tangent.x, tangent.z) || 1;
      tunnelSamples.push({
        point,
        normal: new Vector3(tangent.z / length, 0, -tangent.x / length),
        yaw: Math.atan2(tangent.x, tangent.z),
        segmentLength: Math.max(1, length * 0.5),
      });
    }
    const walls = new InstancedMesh(wallGeometry, tunnelMaterial, tunnelSamples.length * 2);
    walls.name = `TUNNEL_WALLS_${road.id}`;
    const ceilings = new InstancedMesh(ceilingGeometry, tunnelMaterial, tunnelSamples.length);
    ceilings.name = `TUNNEL_CEILING_${road.id}`;
    const dummy = new Object3D();
    let wallIndex = 0;
    tunnelSamples.forEach((sample, sampleIndex) => {
      for (const side of [-1, 1]) {
        dummy.position
          .copy(sample.point)
          .addScaledVector(sample.normal, side * (road.width * 0.58));
        dummy.position.y = sample.point.y + 2.25;
        dummy.rotation.set(0, sample.yaw, 0);
        dummy.scale.set(1, 1, sample.segmentLength);
        dummy.updateMatrix();
        walls.setMatrixAt(wallIndex, dummy.matrix);
        wallIndex += 1;
      }
      dummy.position.set(sample.point.x, sample.point.y + 4.65, sample.point.z);
      dummy.rotation.set(0, sample.yaw, 0);
      dummy.scale.set(1, 1, sample.segmentLength);
      dummy.updateMatrix();
      ceilings.setMatrixAt(sampleIndex, dummy.matrix);
    });
    walls.instanceMatrix.needsUpdate = true;
    ceilings.instanceMatrix.needsUpdate = true;
    group.add(walls, ceilings);
  }
  return group;
}

const footprintsOverlap = (first: ProxyFootprint, second: ProxyFootprint, margin = 0.8) =>
  Math.abs(first.x - second.x) < first.halfWidth + second.halfWidth + margin &&
  Math.abs(first.z - second.z) < first.halfDepth + second.halfDepth + margin;

function createTerrainMass(
  mass: NonNullable<HinodeCityLayout['authoring']['terrainMasses']>[number],
) {
  const group = new Group();
  group.name = `TERRAIN_MASS_${mass.id}`;
  const geometry =
    mass.shape === 'rounded-foothill'
      ? new SphereGeometry(0.5, 24, 12)
      : new SphereGeometry(0.5, 18, 8);
  const material = new MeshStandardMaterial({
    color: mass.shape === 'rounded-foothill' ? 0x23352f : 0x1b2c29,
    emissive: 0x07110f,
    emissiveIntensity: 0.42,
    roughness: 0.98,
    metalness: 0,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = `TERRAIN_SURFACE_${mass.id}`;
  mesh.position.set(mass.centre[0], mass.maximumHeightMetres * 0.5 - 2, mass.centre[2]);
  mesh.rotation.y = mass.rotationY;
  mesh.scale.set(mass.size[0], mass.maximumHeightMetres, mass.size[2]);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function createLightingSockets(layout: HinodeCityLayout) {
  const group = new Group();
  group.name = 'LIGHTING_SOURCE_PROXIES';
  const polePlacements: Array<{ matrix: Matrix4; colour: Color }> = [];
  const fixturePlacements: Array<{ matrix: Matrix4; colour: Color }> = [];
  const signPlacements: Array<{ matrix: Matrix4; colour: Color }> = [];
  const dummy = new Object3D();
  for (const zone of layout.authoring.lightingZones ?? []) {
    const road = layout.roads.find((candidate) => candidate.id === zone.roadId);
    if (!road) continue;
    const curve = roadCurve(road);
    zone.progresses.forEach((progress, index) => {
      const point = curve.getPointAt(progress);
      const tangent = curve.getTangentAt(progress).normalize();
      const normal = new Vector3(tangent.z, 0, -tangent.x).normalize();
      const yaw = Math.atan2(tangent.x, tangent.z);
      const colour = new Color(zone.colour);
      if (zone.type === 'streetlight') {
        const side = index % 2 === 0 ? 1 : -1;
        const base = point.clone().addScaledVector(normal, side * (road.width * 0.5 + 1.25));
        dummy.position.set(base.x, point.y + 2.1, base.z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        polePlacements.push({ matrix: dummy.matrix.clone(), colour });
        dummy.position.set(base.x, point.y + 4.2, base.z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        fixturePlacements.push({ matrix: dummy.matrix.clone(), colour });
      } else if (zone.type === 'tunnel-light') {
        dummy.position.set(point.x, point.y + 4.15, point.z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1.8, 1, 0.65);
        dummy.updateMatrix();
        fixturePlacements.push({ matrix: dummy.matrix.clone(), colour });
      } else {
        const base = point.clone().addScaledVector(normal, road.width * 0.5 + 2.4);
        dummy.position.set(base.x, point.y + 4.4, base.z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        signPlacements.push({ matrix: dummy.matrix.clone(), colour });
      }
    });
  }

  if (polePlacements.length) {
    const poles = new InstancedMesh(
      new BoxGeometry(0.14, 4.2, 0.14),
      new MeshStandardMaterial({ color: 0x34414d, roughness: 0.62, metalness: 0.5 }),
      polePlacements.length,
    );
    poles.name = 'STREETLIGHT_PROXY_POLES';
    polePlacements.forEach((placement, index) => poles.setMatrixAt(index, placement.matrix));
    group.add(poles);
  }
  if (fixturePlacements.length) {
    const fixtures = new InstancedMesh(
      new BoxGeometry(0.72, 0.16, 0.72),
      new MeshBasicMaterial({ color: 0xffffff }),
      fixturePlacements.length,
    );
    fixtures.name = 'VISIBLE_LIGHT_PROXY_FIXTURES';
    fixturePlacements.forEach((placement, index) => {
      fixtures.setMatrixAt(index, placement.matrix);
      fixtures.setColorAt(index, placement.colour);
    });
    group.add(fixtures);
  }
  if (signPlacements.length) {
    const signs = new InstancedMesh(
      new BoxGeometry(2.6, 1.35, 0.18),
      new MeshBasicMaterial({ color: 0xffffff }),
      signPlacements.length,
    );
    signs.name = 'COMMERCIAL_LIGHT_PROXY_SOURCES';
    signPlacements.forEach((placement, index) => {
      signs.setMatrixAt(index, placement.matrix);
      signs.setColorAt(index, placement.colour);
    });
    group.add(signs);
  }
  return group;
}

function createDistrict(
  district: HinodeDistrict,
  layout: HinodeCityLayout,
  options: CitySceneOptions,
  occupied: ProxyFootprint[],
) {
  const group = new Group();
  group.name = `DISTRICT_${district.id}`;
  group.userData.editorType = 'district';
  group.userData.layoutId = district.id;
  group.userData.locked = district.locked;
  group.visible = !district.hidden;
  group.position.set(...district.centre);
  group.rotation.y = district.rotationY ?? 0;

  const random = randomFactory(hashString(district.id));
  const baseCount = Math.floor(
    ((district.size[0] * district.size[2]) / 360) * district.proxyDensity,
  );
  const count = Math.max(
    district.id === 'touge' ? 12 : 18,
    Math.min(options.quality === 'high' ? 130 : 52, baseCount),
  );
  const geometry = new BoxGeometry(1, 1, 1);
  const colour = new Color(district.colour);
  const material = new MeshStandardMaterial({
    color: colour,
    emissive: colour.clone().multiplyScalar(0.32),
    emissiveIntensity: options.editor ? 0.74 : 0.58,
    roughness: district.id === 'touge' ? 0.94 : 0.68,
    metalness: district.id === 'touge' ? 0 : 0.18,
  });
  const placements: Array<{
    x: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    rotationY: number;
  }> = [];
  const maximumAttempts = count * 45;
  for (let attempt = 0; attempt < maximumAttempts && placements.length < count; attempt += 1) {
    const x = (random() - 0.5) * district.size[0] * 0.88;
    const z = (random() - 0.5) * district.size[2] * 0.88;
    const width = district.id === 'touge' ? 4 + random() * 6 : 5 + random() * 9;
    const depth = district.id === 'touge' ? 4 + random() * 7 : 5 + random() * 10;
    const height =
      district.id === 'downtown'
        ? 12 + random() * district.size[1]
        : district.id === 'touge'
          ? 3 + random() * 6
          : 5 + random() * district.size[1] * 0.7;
    const worldX = district.centre[0] + x;
    const worldZ = district.centre[2] + z;
    const footprint = {
      x: worldX,
      z: worldZ,
      halfWidth: width * 0.5,
      halfDepth: depth * 0.5,
    };
    const roadClearance = Math.hypot(width, depth) * 0.48 + 1.8;
    const entersRoad = layout.roads.some(
      (road) => distanceToRoad({ x: worldX, z: worldZ }, road) < road.width * 0.5 + roadClearance,
    );
    const entersWater = layout.water.some(
      (water) =>
        Math.abs(worldX - water.centre[0]) < water.size[0] * 0.5 + footprint.halfWidth &&
        Math.abs(worldZ - water.centre[2]) < water.size[2] * 0.5 + footprint.halfDepth,
    );
    if (entersRoad || entersWater || occupied.some((item) => footprintsOverlap(item, footprint))) {
      continue;
    }
    occupied.push(footprint);
    placements.push({ x, z, width, depth, height, rotationY: random() * Math.PI });
  }
  const proxies = new InstancedMesh(geometry, material, placements.length);
  proxies.name = `PROXIES_${district.id}`;
  proxies.instanceMatrix.setUsage(DynamicDrawUsage);
  const dummy = new Object3D();
  placements.forEach((placement, index) => {
    dummy.position.set(placement.x, placement.height * 0.5 - district.centre[1], placement.z);
    dummy.scale.set(placement.width, placement.height, placement.depth);
    dummy.rotation.y = placement.rotationY;
    dummy.updateMatrix();
    proxies.setMatrixAt(index, dummy.matrix);
  });
  proxies.castShadow = options.quality === 'high';
  proxies.receiveShadow = true;
  group.add(proxies);

  const pad = new Mesh(
    new PlaneGeometry(district.size[0], district.size[2]),
    new MeshStandardMaterial({
      color: colour.clone().multiplyScalar(0.38),
      emissive: colour.clone().multiplyScalar(0.14),
      emissiveIntensity: 0.45,
      roughness: 0.95,
      transparent: true,
      opacity: options.editor ? 0.42 : 0.22,
      side: DoubleSide,
    }),
  );
  pad.name = `DISTRICT_PAD_${district.id}`;
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -district.centre[1] + 0.01;
  group.add(pad);
  return group;
}

const layerGroup = (name: ReviewLayerKind) => {
  const group = new Group();
  group.name = `REVIEW_LAYER_${name.toUpperCase().replace('-', '_')}`;
  group.visible = false;
  return group;
};

const zonePlane = (zone: HinodePlanZone, colour: number, opacity: number) => {
  const group = new Group();
  group.name = `ZONE_${zone.id}`;
  group.position.set(...zone.centre);
  group.rotation.y = zone.rotationY;
  const plane = new Mesh(
    new PlaneGeometry(zone.size[0], zone.size[2]),
    new MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity,
      side: DoubleSide,
      depthWrite: false,
      depthTest: false,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.renderOrder = 50;
  group.add(plane);
  const points = [
    new Vector3(-zone.size[0] * 0.5, 0.04, -zone.size[2] * 0.5),
    new Vector3(zone.size[0] * 0.5, 0.04, -zone.size[2] * 0.5),
    new Vector3(zone.size[0] * 0.5, 0.04, zone.size[2] * 0.5),
    new Vector3(-zone.size[0] * 0.5, 0.04, zone.size[2] * 0.5),
  ];
  const outline = new LineLoop(
    new BufferGeometry().setFromPoints(points),
    new LineBasicMaterial({ color: colour, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  outline.renderOrder = 51;
  group.add(outline);
  return group;
};

function createReviewLayers(layout: HinodeCityLayout) {
  const layers = new Map<ReviewLayerKind, Group>();
  const addLayer = (kind: ReviewLayerKind) => {
    const group = layerGroup(kind);
    layers.set(kind, group);
    return group;
  };
  const topology = addLayer('topology');
  const hierarchy = addLayer('road-hierarchy');
  const elevation = addLayer('elevation');
  const roadWidth = addLayer('road-width');
  const roadEdges = addLayer('road-edges');
  const safety = addLayer('safety');
  const districtDensity = addLayer('district-density');
  const footpaths = addLayer('footpaths');
  const parcels = addLayer('parcels');
  const vegetation = addLayer('vegetation');
  const signs = addLayer('signs');
  const collision = addLayer('collision');
  const sightlines = addLayer('sightlines');

  for (const road of layout.roads) {
    const roadGeometry = roadRibbon(road);
    const wrapper = new Group();
    wrapper.position.set(...road.transform.position);
    wrapper.rotation.y = road.transform.rotationY;
    wrapper.scale.set(...road.transform.scale);
    const overlay = new Mesh(
      roadGeometry.geometry,
      new MeshBasicMaterial({
        color: 0x57e6ff,
        transparent: true,
        opacity: 0.64,
        side: DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    overlay.renderOrder = 45;
    wrapper.add(overlay);
    roadWidth.add(wrapper);

    const topologyWrapper = new Group();
    topologyWrapper.position.copy(wrapper.position);
    topologyWrapper.rotation.copy(wrapper.rotation);
    topologyWrapper.scale.copy(wrapper.scale);
    const topologyLine = new Line(
      new BufferGeometry().setFromPoints(
        roadGeometry.points.map((point) => point.clone().add(new Vector3(0, 0.2, 0))),
      ),
      new LineBasicMaterial({
        color:
          road.kind === 'primary-loop' ? 0xffffff : road.kind === 'shortcut' ? 0xff6b9b : 0x66d9ff,
        depthTest: false,
      }),
    );
    topologyLine.renderOrder = 55;
    topologyWrapper.add(topologyLine);
    topology.add(topologyWrapper);

    const overlayRoad = (target: Group, colour: number, opacity: number, renderOrder: number) => {
      const overlayWrapper = new Group();
      overlayWrapper.position.copy(wrapper.position);
      overlayWrapper.rotation.copy(wrapper.rotation);
      overlayWrapper.scale.copy(wrapper.scale);
      const mesh = new Mesh(
        roadGeometry.geometry,
        new MeshBasicMaterial({
          color: colour,
          transparent: true,
          opacity,
          side: DoubleSide,
          depthWrite: false,
          depthTest: false,
        }),
      );
      mesh.renderOrder = renderOrder;
      overlayWrapper.add(mesh);
      target.add(overlayWrapper);
    };
    overlayRoad(hierarchy, HIERARCHY_COLOURS[road.roadClass ?? ''] ?? 0x8190a8, 0.82, 47);
    const maximumRoadElevation = Math.max(...road.points.map((point) => point[1]));
    overlayRoad(
      elevation,
      maximumRoadElevation >= 6
        ? 0xff5c56
        : maximumRoadElevation > 0
          ? 0xffc657
          : road.surface === 'tunnel'
            ? 0x8f73ff
            : 0x4dc7f0,
      0.84,
      48,
    );

    const roadside = layout.planning.footpaths.find((item) => item.roadId === road.id);
    if (!roadside) continue;
    const footpathWrapper = new Group();
    footpathWrapper.position.copy(wrapper.position);
    footpathWrapper.rotation.copy(wrapper.rotation);
    footpathWrapper.scale.copy(wrapper.scale);
    const halfWidth = road.width * 0.5;
    const bands: ReadonlyArray<readonly [number, number]> = [
      [halfWidth + roadside.drainageWidth, halfWidth + roadside.drainageWidth + roadside.leftWidth],
      [
        -halfWidth - roadside.drainageWidth,
        -halfWidth - roadside.drainageWidth - roadside.rightWidth,
      ],
    ];
    for (const [inner, outer] of bands) {
      const mesh = new Mesh(
        roadBand(road, inner, outer, 0.12),
        new MeshBasicMaterial({
          color: 0xffd65c,
          transparent: true,
          opacity: 0.86,
          side: DoubleSide,
          depthWrite: false,
          depthTest: false,
        }),
      );
      mesh.renderOrder = 46;
      footpathWrapper.add(mesh);
    }
    footpaths.add(footpathWrapper);

    const edgeWrapper = new Group();
    edgeWrapper.position.copy(wrapper.position);
    edgeWrapper.rotation.copy(wrapper.rotation);
    edgeWrapper.scale.copy(wrapper.scale);
    const safetyWrapper = edgeWrapper.clone(false);
    const sidePlans = [
      {
        side: 1,
        width: roadside.leftWidth,
        edgeClass: roadside.leftClass,
        protection: roadside.leftProtection,
      },
      {
        side: -1,
        width: roadside.rightWidth,
        edgeClass: roadside.rightClass,
        protection: roadside.rightProtection,
      },
    ] as const;
    for (const sidePlan of sidePlans) {
      const inner = sidePlan.side * (halfWidth + roadside.drainageWidth);
      const outer = sidePlan.side * (halfWidth + roadside.drainageWidth + sidePlan.width);
      const edgeMesh = new Mesh(
        roadBand(road, inner, outer, 0.14),
        new MeshBasicMaterial({
          color: EDGE_COLOURS[sidePlan.edgeClass] ?? 0xffffff,
          transparent: true,
          opacity: 0.92,
          side: DoubleSide,
          depthWrite: false,
          depthTest: false,
        }),
      );
      edgeMesh.renderOrder = 49;
      edgeWrapper.add(edgeMesh);
      if (sidePlan.protection !== 'none') {
        const safetyMesh = new Mesh(
          roadBand(road, inner, outer, 0.18),
          new MeshBasicMaterial({
            color: 0xff4f5f,
            transparent: true,
            opacity: 0.9,
            side: DoubleSide,
            depthWrite: false,
            depthTest: false,
          }),
        );
        safetyMesh.renderOrder = 50;
        safetyWrapper.add(safetyMesh);
      }
    }
    roadEdges.add(edgeWrapper);
    safety.add(safetyWrapper);
  }

  layout.districts.forEach((district) =>
    districtDensity.add(
      zonePlane(
        {
          id: `density-${district.id}`,
          label: `${district.label} density`,
          centre: district.centre,
          size: district.size,
          rotationY: district.rotationY ?? 0,
          districtId: district.id,
        },
        new Color(district.colour).getHex(),
        0.42 + district.proxyDensity * 0.35,
      ),
    ),
  );
  layout.planning.parcels.forEach((zone) => parcels.add(zonePlane(zone, 0xa9baff, 0.19)));
  layout.planning.vegetationZones.forEach((zone) =>
    vegetation.add(zonePlane(zone, 0x51ef91, 0.42)),
  );
  layout.planning.signZones.forEach((zone) => signs.add(zonePlane(zone, 0xff55d5, 0.76)));
  layout.authoring.billboardSockets.forEach((zone) => signs.add(zonePlane(zone, 0xffa347, 0.7)));
  layout.authoring.futurePropSockets.forEach((zone) => signs.add(zonePlane(zone, 0x78a8ff, 0.62)));

  for (const volume of [
    ...layout.planning.collisionVolumes,
    ...layout.authoring.vehicleClearanceVolumes,
  ]) {
    const mesh = new Mesh(
      new BoxGeometry(...volume.size),
      new MeshBasicMaterial({
        color: 0xff526b,
        transparent: true,
        opacity: 0.72,
        wireframe: true,
        depthTest: false,
      }),
    );
    mesh.name = `COLLISION_${volume.id}`;
    mesh.position.set(...volume.centre);
    mesh.renderOrder = 52;
    collision.add(mesh);
  }

  for (const definition of layout.planning.reviewViews) {
    const pose = reviewPose(layout, definition.id);
    if (!pose) continue;
    const start = pose.position.clone().add(new Vector3(0, 0.22, 0));
    const end = start
      .clone()
      .add(pose.tangent.clone().normalize().multiplyScalar(definition.sightlineMetres));
    const line = new Line(
      new BufferGeometry().setFromPoints([start, end]),
      new LineBasicMaterial({ color: 0xffb84d, depthTest: false }),
    );
    line.name = `SIGHTLINE_${definition.id}`;
    line.renderOrder = 53;
    sightlines.add(line);
    const marker = new Mesh(
      new ConeGeometry(1.4, 4.5, 8),
      new MeshBasicMaterial({ color: 0xffb84d, depthTest: false }),
    );
    marker.position.copy(start).add(new Vector3(0, 2.1, 0));
    marker.renderOrder = 53;
    sightlines.add(marker);
  }
  layout.authoring.landmarks.forEach((zone) => sightlines.add(zonePlane(zone, 0xffd34f, 0.34)));
  layout.authoring.resetZones.forEach((zone) => sightlines.add(zonePlane(zone, 0xffffff, 0.42)));
  return layers;
}

export function buildCityScene(
  layout: HinodeCityLayout,
  options: CitySceneOptions,
): CitySceneBuild {
  const root = new Group();
  root.name = layout.layoutId;
  const editableObjects = new Map<string, Group>();
  const reviewLayers = new Map<ReviewLayerKind, Group>();
  const ground = new Mesh(
    new PlaneGeometry(layout.bounds.width, layout.bounds.depth),
    new MeshStandardMaterial({
      color: 0x182334,
      emissive: 0x050b13,
      emissiveIntensity: 0.42,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  ground.name = 'CITY_GROUND';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  ground.receiveShadow = options.quality === 'high';
  root.add(ground);

  for (const water of layout.water) {
    const mesh = new Mesh(
      new PlaneGeometry(water.size[0], water.size[2]),
      new MeshStandardMaterial({
        color: water.colour,
        emissive: new Color(water.colour).multiplyScalar(0.22),
        emissiveIntensity: 0.65,
        roughness: 0.26,
        metalness: 0.35,
        transparent: true,
        opacity: 0.88,
      }),
    );
    mesh.name = `WATER_${water.id}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(...water.centre);
    root.add(mesh);
  }

  for (const terrainMass of layout.authoring.terrainMasses ?? []) {
    root.add(createTerrainMass(terrainMass));
  }
  root.add(createLightingSockets(layout));

  const occupied: ProxyFootprint[] = [];
  for (const district of layout.districts) {
    const group = createDistrict(district, layout, options, occupied);
    root.add(group);
    editableObjects.set(`district:${district.id}`, group);
  }
  for (const road of layout.roads) {
    const group = createRoad(
      road,
      layout.planning.footpaths.find((item) => item.roadId === road.id),
      options,
      layout.authoring.structures.find((structure) => structure.roadId === road.id),
    );
    root.add(group);
    editableObjects.set(`road:${road.id}`, group);
  }
  if (options.editor) {
    for (const [kind, layer] of createReviewLayers(layout)) {
      root.add(layer);
      reviewLayers.set(kind, layer);
    }
  }
  return { root, editableObjects, reviewLayers };
}

export function applyTransformToLayout(
  layout: HinodeCityLayout,
  editorType: 'road' | 'district',
  id: string,
  object: Group,
) {
  if (editorType === 'road') {
    const road = layout.roads.find((candidate) => candidate.id === id);
    if (!road) return;
    road.transform.position = [object.position.x, object.position.y, object.position.z];
    road.transform.rotationY = object.rotation.y;
    road.transform.scale = [object.scale.x, object.scale.y, object.scale.z];
  } else {
    const district = layout.districts.find((candidate) => candidate.id === id);
    if (!district) return;
    district.centre = [object.position.x, object.position.y, object.position.z];
    district.rotationY = object.rotation.y;
    district.size = [
      district.size[0] * object.scale.x,
      district.size[1] * object.scale.y,
      district.size[2] * object.scale.z,
    ];
    object.scale.set(1, 1, 1);
  }
}

export function matrixFromRoadTransform(road: HinodeRoad) {
  return new Matrix4()
    .makeRotationY(road.transform.rotationY)
    .scale(new Vector3(...road.transform.scale))
    .setPosition(new Vector3(...road.transform.position));
}
