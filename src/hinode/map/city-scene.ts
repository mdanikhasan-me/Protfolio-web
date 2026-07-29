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
  'road-width' | 'footpaths' | 'parcels' | 'vegetation' | 'signs' | 'collision' | 'sightlines';

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

function createRoad(
  road: HinodeRoad,
  roadside: HinodeRoadsidePlan | undefined,
  options: CitySceneOptions,
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
  const edgeMaterial = new LineBasicMaterial({
    color: road.surface === 'tunnel' ? 0xff655d : 0xa7c9e8,
    transparent: true,
    opacity: road.surface === 'alley' ? 0.34 : 0.66,
  });
  const leftMarking = new Line(new BufferGeometry().setFromPoints(leftEdge), edgeMaterial);
  leftMarking.name = `ROAD_EDGE_LEFT_${road.id}`;
  const rightMarking = new Line(new BufferGeometry().setFromPoints(rightEdge), edgeMaterial);
  rightMarking.name = `ROAD_EDGE_RIGHT_${road.id}`;
  group.add(leftMarking, rightMarking);

  if (roadside) {
    const halfWidth = road.width * 0.5;
    const footpathMaterial = new MeshStandardMaterial({
      color: road.surface === 'waterfront' ? 0x61778a : 0x626a76,
      emissive: road.surface === 'waterfront' ? 0x122a38 : 0x171c25,
      emissiveIntensity: 0.62,
      roughness: 0.92,
      metalness: 0.04,
      side: DoubleSide,
    });
    const leftFootpath = new Mesh(
      roadBand(
        road,
        halfWidth + roadside.drainageWidth,
        halfWidth + roadside.drainageWidth + roadside.leftWidth,
      ),
      footpathMaterial,
    );
    leftFootpath.name = `FOOTPATH_LEFT_${road.id}`;
    leftFootpath.receiveShadow = options.quality === 'high';
    const rightFootpath = new Mesh(
      roadBand(
        road,
        -halfWidth - roadside.drainageWidth,
        -halfWidth - roadside.drainageWidth - roadside.rightWidth,
      ),
      footpathMaterial,
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
  }

  if (road.surface === 'elevated') {
    const supportMaterial = new MeshStandardMaterial({
      color: 0x303945,
      roughness: 0.72,
      metalness: 0.35,
    });
    const supportGeometry = new BoxGeometry(1.2, 1, 1.2);
    for (let index = 3; index < points.length - 3; index += 10) {
      const point = points[index]!;
      if (point.y < 2) continue;
      const support = new Mesh(supportGeometry, supportMaterial);
      support.position.set(point.x, point.y * 0.5, point.z);
      support.scale.y = point.y;
      group.add(support);
    }
  }

  if (road.surface === 'tunnel') {
    const tunnelMaterial = new MeshStandardMaterial({
      color: 0x161b24,
      roughness: 0.78,
      metalness: 0.26,
    });
    const wallGeometry = new BoxGeometry(0.8, 4.5, 4);
    for (let index = 8; index < points.length - 8; index += 8) {
      const point = points[index]!;
      if (point.y > -1) continue;
      for (const side of [-1, 1]) {
        const wall = new Mesh(wallGeometry, tunnelMaterial);
        wall.position.set(point.x + side * (road.width * 0.55), point.y + 2.2, point.z);
        group.add(wall);
      }
    }
  }
  return group;
}

const footprintsOverlap = (first: ProxyFootprint, second: ProxyFootprint, margin = 0.8) =>
  Math.abs(first.x - second.x) < first.halfWidth + second.halfWidth + margin &&
  Math.abs(first.z - second.z) < first.halfDepth + second.halfDepth + margin;

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
  const geometry = district.id === 'touge' ? new ConeGeometry(1, 1, 7) : new BoxGeometry(1, 1, 1);
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
    const width = district.id === 'touge' ? 10 + random() * 20 : 5 + random() * 9;
    const depth = district.id === 'touge' ? 10 + random() * 20 : 5 + random() * 10;
    const height =
      district.id === 'downtown'
        ? 12 + random() * district.size[1]
        : district.id === 'touge'
          ? 14 + random() * 22
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
  const roadWidth = addLayer('road-width');
  const footpaths = addLayer('footpaths');
  const parcels = addLayer('parcels');
  const vegetation = addLayer('vegetation');
  const signs = addLayer('signs');
  const collision = addLayer('collision');
  const sightlines = addLayer('sightlines');

  for (const road of layout.roads) {
    const wrapper = new Group();
    wrapper.position.set(...road.transform.position);
    wrapper.rotation.y = road.transform.rotationY;
    wrapper.scale.set(...road.transform.scale);
    const overlay = new Mesh(
      roadRibbon(road).geometry,
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
  }

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
