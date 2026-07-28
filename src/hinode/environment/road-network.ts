export interface RoadPoint {
  x: number;
  z: number;
}

export interface RoadCorridor {
  id: 'alley' | 'secondary';
  width: number;
  points: readonly RoadPoint[];
}

function cubicBezier(p0: RoadPoint, p1: RoadPoint, p2: RoadPoint, p3: RoadPoint, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    const inverse = 1 - t;
    return {
      x:
        inverse ** 3 * p0.x +
        3 * inverse * inverse * t * p1.x +
        3 * inverse * t * t * p2.x +
        t ** 3 * p3.x,
      z:
        inverse ** 3 * p0.z +
        3 * inverse * inverse * t * p1.z +
        3 * inverse * t * t * p2.z +
        t ** 3 * p3.z,
    };
  });
}

function mergeSegments(...segments: RoadPoint[][]) {
  return segments.flatMap((segment, index) => (index === 0 ? segment : segment.slice(1)));
}

export const ALLEY_PATH = mergeSegments(
  cubicBezier({ x: -25, z: 27 }, { x: -25, z: 21 }, { x: -25, z: 15 }, { x: -24, z: 10 }, 16),
  cubicBezier({ x: -24, z: 10 }, { x: -23.5, z: 5 }, { x: -19.5, z: 0.2 }, { x: -13, z: -0.5 }, 20),
  cubicBezier(
    { x: -13, z: -0.5 },
    { x: -10.5, z: -0.7 },
    { x: -8, z: -0.6 },
    { x: -5, z: -0.5 },
    12,
  ),
);

export const SECONDARY_PATH = cubicBezier(
  { x: -8, z: -0.5 },
  { x: 4, z: 0.2 },
  { x: 21, z: -3.2 },
  { x: 38, z: -5.5 },
  46,
);

export const ROAD_CORRIDORS: readonly RoadCorridor[] = [
  { id: 'alley', width: 3.2, points: ALLEY_PATH },
  { id: 'secondary', width: 6.6, points: SECONDARY_PATH },
];

export const SLICE_BOUNDARY = {
  minimumX: -37.5,
  maximumX: 37.5,
  minimumZ: -30,
  maximumZ: 30,
} as const;

export const VEHICLE_CLEARANCE_RADIUS = 0.9;

function distanceToSegment(point: RoadPoint, start: RoadPoint, end: RoadPoint) {
  const segmentX = end.x - start.x;
  const segmentZ = end.z - start.z;
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.z - start.z);
  const projection = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * segmentX + (point.z - start.z) * segmentZ) / lengthSquared),
  );
  return Math.hypot(
    point.x - (start.x + segmentX * projection),
    point.z - (start.z + segmentZ * projection),
  );
}

export function corridorDistance(point: RoadPoint, corridor: RoadCorridor) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < corridor.points.length - 1; index += 1) {
    const start = corridor.points[index];
    const end = corridor.points[index + 1];
    if (!start || !end) continue;
    minimum = Math.min(minimum, distanceToSegment(point, start, end));
  }
  return minimum;
}

export function driveableClearance(point: RoadPoint) {
  return ROAD_CORRIDORS.reduce(
    (best, corridor) => Math.max(best, corridor.width * 0.5 - corridorDistance(point, corridor)),
    Number.NEGATIVE_INFINITY,
  );
}

export function isInsideSlice(point: RoadPoint) {
  return (
    point.x >= SLICE_BOUNDARY.minimumX &&
    point.x <= SLICE_BOUNDARY.maximumX &&
    point.z >= SLICE_BOUNDARY.minimumZ &&
    point.z <= SLICE_BOUNDARY.maximumZ
  );
}

export function isDriveable(point: RoadPoint, radius = VEHICLE_CLEARANCE_RADIUS) {
  return isInsideSlice(point) && driveableClearance(point) >= radius;
}

export function nearestRoad(point: RoadPoint) {
  return ROAD_CORRIDORS.reduce(
    (best, corridor) => {
      const distance = corridorDistance(point, corridor);
      return distance < best.distance ? { corridor, distance } : best;
    },
    { corridor: ROAD_CORRIDORS[0]!, distance: Number.POSITIVE_INFINITY },
  );
}

export function maximumPathTurn(points: readonly RoadPoint[]) {
  let maximum = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = points[index - 1];
    const current = points[index];
    const after = points[index + 1];
    if (!before || !current || !after) continue;
    const first = Math.atan2(current.z - before.z, current.x - before.x);
    const second = Math.atan2(after.z - current.z, after.x - current.x);
    const delta = Math.atan2(Math.sin(second - first), Math.cos(second - first));
    maximum = Math.max(maximum, Math.abs(delta));
  }
  return maximum;
}
