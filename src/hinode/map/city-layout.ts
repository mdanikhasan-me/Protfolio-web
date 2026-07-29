import { CubicBezierCurve3, CurvePath, Euler, Vector3 } from 'three';

export type LayoutPoint = [number, number, number];

export interface LayoutTransform {
  position: LayoutPoint;
  rotationY: number;
  scale: LayoutPoint;
}

export type HinodeRoadKind = 'primary-loop' | 'route' | 'connector' | 'shortcut' | 'underpass';

export interface HinodeBezierSpline {
  type: 'cubic-bezier';
  tangentLengths: number[];
  tangentYawOffsetsDegrees: number[];
  bankingDegrees: number[];
}

export interface HinodeRoad {
  id: string;
  label: string;
  kind: HinodeRoadKind;
  surface: 'highway' | 'city' | 'alley' | 'mountain' | 'waterfront' | 'elevated' | 'tunnel';
  width: number;
  lanes: number;
  direction: 'one-way' | 'two-way';
  closed: boolean;
  spline: HinodeBezierSpline;
  transform: LayoutTransform;
  points: LayoutPoint[];
  hidden?: boolean;
  locked?: boolean;
}

export interface HinodeDistrict {
  id: string;
  label: string;
  centre: LayoutPoint;
  size: LayoutPoint;
  rotationY?: number;
  proxyDensity: number;
  colour: string;
  hidden: boolean;
  locked: boolean;
}

export interface HinodeWater {
  id: string;
  label: string;
  centre: LayoutPoint;
  size: LayoutPoint;
  colour: string;
}

export interface HinodeRoadsidePlan {
  roadId: string;
  leftWidth: number;
  rightWidth: number;
  drainageWidth: number;
}

export interface HinodePlanZone {
  id: string;
  label: string;
  centre: LayoutPoint;
  size: LayoutPoint;
  rotationY: number;
  districtId?: string;
  hostRoadId?: string;
}

export interface HinodeCollisionVolume {
  id: string;
  label: string;
  centre: LayoutPoint;
  size: LayoutPoint;
}

export interface HinodeReviewView {
  id: string;
  label: string;
  roadId: string;
  progress: number;
  districtId?: string;
  feature: 'district' | 'flyover' | 'underpass';
  sightlineMetres: number;
}

export interface HinodePlanningLayers {
  footpaths: HinodeRoadsidePlan[];
  parcels: HinodePlanZone[];
  vegetationZones: HinodePlanZone[];
  signZones: HinodePlanZone[];
  collisionVolumes: HinodeCollisionVolume[];
  reviewViews: HinodeReviewView[];
}

export interface HinodeAuthoringData {
  junctions: Array<{
    id: string;
    kind: 'merge' | 'crossing' | 'roundabout';
    roadIds: string[];
    centre: LayoutPoint;
    clearanceMetres: number;
  }>;
  curbProfiles: Array<{
    roadId: string;
    profile: 'raised' | 'flush' | 'painted-shoulder';
    heightMetres: number;
  }>;
  buildingProxies: Array<{
    id: string;
    parcelId: string;
    buildingType: string;
    heightMetres: number;
    facadeDirectionDegrees: number;
    roofClass: string;
    role: 'commercial' | 'residential' | 'industrial' | 'scenic';
    signCapacity: number;
    visibilityBand: 'hero' | 'mid' | 'background';
    futureAssetId: string;
    setbackMetres: number;
  }>;
  billboardSockets: HinodePlanZone[];
  futurePropSockets: HinodePlanZone[];
  structures: Array<{
    id: string;
    type: 'flyover' | 'underpass';
    roadId: string;
    minimumClearanceMetres: number;
  }>;
  canals: string[];
  landmarks: HinodePlanZone[];
  skylineProxies: HinodePlanZone[];
  vehicleClearanceVolumes: HinodeCollisionVolume[];
  resetZones: Array<HinodePlanZone & { roadId: string }>;
  routeCheckpoints: Array<{
    id: string;
    roadId: string;
    progress: number;
  }>;
  lodClasses: Record<
    'hero' | 'mid' | 'background',
    { minimumMetres: number; maximumMetres: number }
  >;
  collisionClasses: Record<string, { dynamic: boolean; purpose: string }>;
  assetSources: Array<{
    assetId: string;
    sourceId: string;
    attributionId: string;
    rightsStatus: string;
    approvedPurpose: string;
  }>;
  visibilityBands: Array<{
    id: 'hero' | 'mid' | 'background';
    minimumMetres: number;
    maximumMetres: number;
  }>;
}

export interface HinodeCityLayout {
  schemaVersion: 1;
  editorVersion: string;
  layoutVersion: string;
  layoutId: string;
  name: string;
  status: string;
  coordinateSystem: string;
  bounds: {
    width: 500;
    depth: 350;
    minimumX: number;
    maximumX: number;
    minimumZ: number;
    maximumZ: number;
  };
  spawn: {
    roadId: string;
    position: LayoutPoint;
    yawRadians: number;
  };
  gameplay: {
    targetLapSeconds: [number, number];
    estimatedRouteDistanceMetres: number;
    checkpointRoadOrder: string[];
  };
  roads: HinodeRoad[];
  districts: HinodeDistrict[];
  water: HinodeWater[];
  planning: HinodePlanningLayers;
  authoring: HinodeAuthoringData;
}

export interface LayoutValidation {
  valid: boolean;
  errors: string[];
  metrics: {
    roadCount: number;
    primaryLoops: number;
    connectors: number;
    shortcuts: number;
    routeLengthMetres: number;
    maximumElevationMetres: number;
    minimumElevationMetres: number;
    footpathCorridors: number;
    parcelCount: number;
    vegetationZoneCount: number;
    signZoneCount: number;
    collisionVolumeCount: number;
    reviewViewCount: number;
  };
}

const REQUIRED_ROADS = new Set([
  'main-loop',
  'downtown-core',
  'alley-district',
  'touge-pass',
  'waterfront-route',
  'flyover-junction',
  'tunnel-underpass',
]);

const asLayout = (value: unknown) => value as HinodeCityLayout;
const roadSampleCache = new WeakMap<
  HinodeRoad,
  Map<number, { signature: string; points: Vector3[] }>
>();

export function cloneCityLayout(layout: HinodeCityLayout): HinodeCityLayout {
  return structuredClone(layout);
}

export function transformRoadPoint(point: LayoutPoint, transform: LayoutTransform) {
  const vector = new Vector3(point[0], point[1], point[2]);
  vector.multiply(new Vector3(...transform.scale));
  vector.applyEuler(new Euler(0, transform.rotationY, 0));
  vector.add(new Vector3(...transform.position));
  return vector;
}

export function roadCurve(road: HinodeRoad) {
  const anchors = road.points.map((point) => transformRoadPoint(point, road.transform));
  const path = new CurvePath<Vector3>();
  const tangentAt = (index: number) => {
    const anchor = anchors[index]!;
    const previous =
      anchors[index - 1] ??
      (road.closed ? anchors.at(-1)! : anchor.clone().sub(anchors[1]!).add(anchor));
    const next =
      anchors[index + 1] ??
      (road.closed
        ? anchors[0]!
        : anchor
            .clone()
            .sub(anchors[index - 1]!)
            .add(anchor));
    const tangent = next.clone().sub(previous);
    tangent.y = next.y - previous.y;
    if (tangent.lengthSq() < 0.0001) tangent.set(0, 0, -1);
    tangent.normalize();
    const yawOffset = (road.spline.tangentYawOffsetsDegrees[index] ?? 0) * (Math.PI / 180);
    tangent.applyAxisAngle(new Vector3(0, 1, 0), yawOffset);
    return tangent;
  };
  const segmentCount = road.closed ? anchors.length : anchors.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const nextIndex = (index + 1) % anchors.length;
    const start = anchors[index]!;
    const end = anchors[nextIndex]!;
    const distance = start.distanceTo(end);
    const startLength = Math.min(
      road.spline.tangentLengths[index] ?? distance / 3,
      distance * 0.48,
    );
    const endLength = Math.min(
      road.spline.tangentLengths[nextIndex] ?? distance / 3,
      distance * 0.48,
    );
    path.add(
      new CubicBezierCurve3(
        start,
        start.clone().addScaledVector(tangentAt(index), startLength),
        end.clone().addScaledVector(tangentAt(nextIndex), -endLength),
        end,
      ),
    );
  }
  return path;
}

export function sampleRoad(road: HinodeRoad, samples = Math.max(40, road.points.length * 18)) {
  const signature = JSON.stringify([
    road.points,
    road.transform,
    road.spline.tangentLengths,
    road.spline.tangentYawOffsetsDegrees,
  ]);
  let entries = roadSampleCache.get(road);
  if (!entries) {
    entries = new Map();
    roadSampleCache.set(road, entries);
  }
  const cached = entries.get(samples);
  if (cached?.signature === signature) return cached.points;
  const points = roadCurve(road).getSpacedPoints(samples);
  entries.set(samples, { signature, points });
  return points;
}

export function roadBankRadiansAt(road: HinodeRoad, progress: number) {
  const banking = road.spline.bankingDegrees;
  if (banking.length === 0) return 0;
  const segmentCount = road.closed ? road.points.length : Math.max(1, road.points.length - 1);
  const position = Math.max(0, Math.min(1, progress)) * segmentCount;
  const firstIndex = Math.min(Math.floor(position), road.points.length - 1);
  const secondIndex = road.closed
    ? (firstIndex + 1) % road.points.length
    : Math.min(firstIndex + 1, road.points.length - 1);
  const blend = position - Math.floor(position);
  const degrees = (banking[firstIndex] ?? 0) * (1 - blend) + (banking[secondIndex] ?? 0) * blend;
  return (degrees * Math.PI) / 180;
}

export function roadLength(road: HinodeRoad) {
  return roadCurve(road).getLength();
}

export function reviewPose(layout: HinodeCityLayout, id: string) {
  const view = layout.planning.reviewViews.find((candidate) => candidate.id === id);
  if (!view) return undefined;
  const road = layout.roads.find((candidate) => candidate.id === view.roadId);
  if (!road) return undefined;
  const curve = roadCurve(road);
  const point = curve.getPointAt(view.progress);
  const tangent = curve.getTangentAt(view.progress);
  return {
    view,
    road,
    position: point,
    yawRadians: Math.atan2(-tangent.x, -tangent.z),
    tangent,
  };
}

export function distanceToRoad(point: { x: number; z: number }, road: HinodeRoad) {
  const samples = sampleRoad(road);
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = samples[index];
    const end = samples[index + 1];
    if (!start || !end) continue;
    const segmentX = end.x - start.x;
    const segmentZ = end.z - start.z;
    const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
    const projection =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point.x - start.x) * segmentX + (point.z - start.z) * segmentZ) / lengthSquared,
            ),
          );
    minimum = Math.min(
      minimum,
      Math.hypot(
        point.x - (start.x + segmentX * projection),
        point.z - (start.z + segmentZ * projection),
      ),
    );
  }
  return minimum;
}

export function nearestCityRoad(layout: HinodeCityLayout, point: { x: number; z: number }) {
  return layout.roads.reduce(
    (best, road) => {
      const distance = distanceToRoad(point, road);
      return distance < best.distance ? { road, distance } : best;
    },
    { road: layout.roads[0]!, distance: Number.POSITIVE_INFINITY },
  );
}

export function nearestCityRoadPoint(layout: HinodeCityLayout, point: { x: number; z: number }) {
  let nearest = {
    road: layout.roads[0]!,
    distance: Number.POSITIVE_INFINITY,
    elevation: 0,
    x: 0,
    z: 0,
    tangentYaw: 0,
  };
  for (const road of layout.roads) {
    const samples = sampleRoad(road);
    for (let index = 0; index < samples.length - 1; index += 1) {
      const start = samples[index];
      const end = samples[index + 1];
      if (!start || !end) continue;
      const segmentX = end.x - start.x;
      const segmentZ = end.z - start.z;
      const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
      const projection =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((point.x - start.x) * segmentX + (point.z - start.z) * segmentZ) / lengthSquared,
              ),
            );
      const candidateX = start.x + segmentX * projection;
      const candidateZ = start.z + segmentZ * projection;
      const distance = Math.hypot(point.x - candidateX, point.z - candidateZ);
      if (distance >= nearest.distance) continue;
      nearest = {
        road,
        distance,
        elevation: start.y + (end.y - start.y) * projection,
        x: candidateX,
        z: candidateZ,
        tangentYaw: Math.atan2(-segmentX, -segmentZ),
      };
    }
  }
  return nearest;
}

export function validateCityLayout(value: unknown): LayoutValidation {
  const layout = asLayout(value);
  const errors: string[] = [];
  if (!layout || typeof layout !== 'object') {
    errors.push('Layout must be an object.');
  }
  if (layout?.schemaVersion !== 1) errors.push('schemaVersion must equal 1.');
  if (!layout?.editorVersion || !layout?.layoutVersion) {
    errors.push('editorVersion and layoutVersion are required.');
  }
  if (layout?.bounds?.width !== 500 || layout?.bounds?.depth !== 350) {
    errors.push('Authoritative bounds must remain exactly 500 by 350 metres.');
  }
  if (!Array.isArray(layout?.roads)) errors.push('roads must be an array.');
  const roads = Array.isArray(layout?.roads) ? layout.roads : [];
  const ids = new Set<string>();
  for (const road of roads) {
    if (!road.id || ids.has(road.id)) errors.push(`Road id is missing or duplicated: ${road.id}`);
    ids.add(road.id);
    if (!Array.isArray(road.points) || road.points.length < 2) {
      errors.push(`${road.id} needs at least two control points.`);
    }
    if (!(road.width >= 4 && road.width <= 14)) {
      errors.push(`${road.id} width is outside the 4–14 metre authoring range.`);
    }
    if (road.spline?.type !== 'cubic-bezier') {
      errors.push(`${road.id} must use the cubic-bezier spline contract.`);
    }
    for (const [label, values] of [
      ['tangent lengths', road.spline?.tangentLengths],
      ['tangent yaw offsets', road.spline?.tangentYawOffsetsDegrees],
      ['banking values', road.spline?.bankingDegrees],
    ] as const) {
      if (!Array.isArray(values) || values.length !== road.points.length) {
        errors.push(`${road.id} ${label} must match its control-point count.`);
      }
    }
  }
  for (const required of REQUIRED_ROADS) {
    if (!ids.has(required)) errors.push(`Required route is missing: ${required}`);
  }
  const primaryLoops = roads.filter((road) => road.kind === 'primary-loop').length;
  const connectors = roads.filter((road) => road.kind === 'connector').length;
  const shortcuts = roads.filter((road) => road.kind === 'shortcut').length;
  if (primaryLoops !== 1) errors.push('The layout must contain exactly one primary loop.');
  if (connectors < 2) errors.push('The layout must contain at least two connectors.');
  if (shortcuts !== 2) errors.push('The layout must contain exactly two shortcuts.');
  if (!ids.has(layout?.spawn?.roadId)) errors.push('Spawn roadId does not reference a road.');
  const planning = layout?.planning;
  if (!planning || typeof planning !== 'object') {
    errors.push('planning layers are required.');
  }
  const footpaths = Array.isArray(planning?.footpaths) ? planning.footpaths : [];
  const footpathRoads = new Set(footpaths.map((item) => item.roadId));
  for (const road of roads) {
    if (!footpathRoads.has(road.id)) errors.push(`Footpath plan is missing for ${road.id}.`);
  }
  for (const item of footpaths) {
    if (!ids.has(item.roadId)) errors.push(`Footpath references unknown road: ${item.roadId}.`);
    if (item.leftWidth < 0.4 || item.rightWidth < 0.4) {
      errors.push(`Footpath width is too narrow for ${item.roadId}.`);
    }
  }
  const districts = Array.isArray(layout?.districts) ? layout.districts : [];
  const districtIds = new Set(districts.map((district) => district.id));
  const parcels = Array.isArray(planning?.parcels) ? planning.parcels : [];
  const vegetationZones = Array.isArray(planning?.vegetationZones) ? planning.vegetationZones : [];
  const signZones = Array.isArray(planning?.signZones) ? planning.signZones : [];
  const collisionVolumes = Array.isArray(planning?.collisionVolumes)
    ? planning.collisionVolumes
    : [];
  const reviewViews = Array.isArray(planning?.reviewViews) ? planning.reviewViews : [];
  if (parcels.length < 10) errors.push('At least ten proxy parcels are required.');
  if (vegetationZones.length < 5) errors.push('At least five vegetation zones are required.');
  if (signZones.length < 7) errors.push('At least seven sign zones are required.');
  if (collisionVolumes.length < 4) errors.push('At least four collision volumes are required.');
  for (const zone of [...parcels, ...vegetationZones, ...signZones]) {
    if (
      Math.abs(zone.centre[0]) + zone.size[0] * 0.5 > layout.bounds.width * 0.5 ||
      Math.abs(zone.centre[2]) + zone.size[2] * 0.5 > layout.bounds.depth * 0.5
    ) {
      errors.push(`Planning zone leaves the map bounds: ${zone.id}.`);
    }
    if (zone.districtId && !districtIds.has(zone.districtId)) {
      errors.push(`Planning zone references unknown district: ${zone.id}.`);
    }
    if (zone.hostRoadId && !ids.has(zone.hostRoadId)) {
      errors.push(`Sign zone references unknown road: ${zone.id}.`);
    }
  }
  const requiredViews = new Set([...districtIds, 'flyover-review', 'underpass-review']);
  const reviewIds = new Set(reviewViews.map((view) => view.id));
  for (const id of requiredViews) {
    if (!reviewIds.has(id)) errors.push(`Required review view is missing: ${id}.`);
  }
  for (const view of reviewViews) {
    if (!ids.has(view.roadId)) errors.push(`Review view references unknown road: ${view.id}.`);
    if (view.progress < 0 || view.progress > 1) {
      errors.push(`Review view progress must be between zero and one: ${view.id}.`);
    }
  }
  const elevations = roads.flatMap((road) => road.points.map((point) => point[1]));
  const maximumElevationMetres = Math.max(0, ...elevations);
  const minimumElevationMetres = Math.min(0, ...elevations);
  if (maximumElevationMetres < 8) errors.push('A visible flyover elevation is required.');
  if (minimumElevationMetres >= 0) errors.push('A tunnel or underpass below grade is required.');
  const routeLengthMetres = roads.reduce((total, road) => total + roadLength(road), 0);
  if (routeLengthMetres < 2_500) errors.push('The authored road network is too short.');
  if (!layout.authoring || typeof layout.authoring !== 'object') {
    errors.push('Complete authoring metadata is required.');
  } else {
    if (layout.authoring.junctions.length < 3)
      errors.push('At least three junction records are required.');
    if (layout.authoring.curbProfiles.length !== roads.length) {
      errors.push('Every road requires a curb profile.');
    }
    if (layout.authoring.buildingProxies.length < parcels.length) {
      errors.push('Every authored parcel requires a building proxy record.');
    }
    if (layout.authoring.routeCheckpoints.length < layout.gameplay.checkpointRoadOrder.length) {
      errors.push('Every gameplay route gate requires an authored checkpoint.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    metrics: {
      roadCount: roads.length,
      primaryLoops,
      connectors,
      shortcuts,
      routeLengthMetres,
      maximumElevationMetres,
      minimumElevationMetres,
      footpathCorridors: footpaths.length,
      parcelCount: parcels.length,
      vegetationZoneCount: vegetationZones.length,
      signZoneCount: signZones.length,
      collisionVolumeCount: collisionVolumes.length,
      reviewViewCount: reviewViews.length,
    },
  };
}

export async function loadCityLayout(
  url = '/hinode/layouts/hinode-city-v1.json',
): Promise<HinodeCityLayout> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Hinode layout request failed: HTTP ${response.status}`);
  const layout = asLayout(await response.json());
  const validation = validateCityLayout(layout);
  if (!validation.valid) {
    throw new Error(`Hinode layout is invalid: ${validation.errors.join(' ')}`);
  }
  return layout;
}
