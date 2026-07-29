import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';

const DEFAULT_TOPOLOGY_URL = new URL(
  '../../../public/hinode/layouts/hinode-city-v2-topology.json',
  import.meta.url,
);

const EDGE_CLASSES = new Set([
  'highway-shoulder',
  'crash-barrier-zone',
  'urban-pavement',
  'maintenance-walkway',
  'painted-shoulder',
  'narrow-alley-drainage',
  'flush-building-edge',
  'mountain-drainage-channel',
  'guardrail-zone',
  'seawall',
]);

const PROTECTION_CLASSES = new Set([
  'none',
  'crash-barrier',
  'guardrail',
  'seawall',
  'tunnel-wall',
  'canal-guardrail',
]);

const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const pointKey = (point) => `${point[0].toFixed(3)},${point[1].toFixed(3)}`;

function segmentIntersection(a, b, c, d) {
  const denominator = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(denominator) < 1e-7) return null;

  const determinantAB = a[0] * b[1] - a[1] * b[0];
  const determinantCD = c[0] * d[1] - c[1] * d[0];
  const x = (determinantAB * (c[0] - d[0]) - (a[0] - b[0]) * determinantCD) / denominator;
  const z = (determinantAB * (c[1] - d[1]) - (a[1] - b[1]) * determinantCD) / denominator;
  const within = (value, one, two) =>
    value >= Math.min(one, two) - 1e-5 && value <= Math.max(one, two) + 1e-5;
  return within(x, a[0], b[0]) &&
    within(z, a[1], b[1]) &&
    within(x, c[0], d[0]) &&
    within(z, c[1], d[1])
    ? [x, z]
    : null;
}

function routeSegments(route) {
  const segments = route.points.slice(0, -1).map((point, index) => ({
    routeId: route.id,
    index,
    a: point,
    b: route.points[index + 1],
  }));
  if (route.closed) {
    segments.push({
      routeId: route.id,
      index: route.points.length - 1,
      a: route.points.at(-1),
      b: route.points[0],
    });
  }
  return segments;
}

function nodeAtPoint(nodeById, route, point) {
  const pointIndex = route.points.findIndex((candidate) => distance(candidate, point) < 0.05);
  const nodeId = pointIndex >= 0 ? route.nodeIds[pointIndex] : null;
  return nodeId ? nodeById.get(nodeId) : null;
}

function validateRouteGeometry(topology, route, errors) {
  const { bounds } = topology;
  const arrays = ['nodeIds', 'elevations', 'tangentLengths', 'bankingDegrees'];

  if (!Array.isArray(route.points) || route.points.length < 2) {
    errors.push(`${route.id}: route needs at least two points`);
    return;
  }
  for (const key of arrays) {
    if (!Array.isArray(route[key]) || route[key].length !== route.points.length) {
      errors.push(`${route.id}: ${key} must match points length`);
    }
  }
  if (!(route.width >= 3 && route.width <= 14)) {
    errors.push(`${route.id}: width ${route.width} is outside 3-14 metres`);
  }
  if (route.roadClass === 'alley-narrow' && route.width > 3.4) {
    errors.push(`${route.id}: alley width exceeds the 3.4 metre compact limit`);
  }
  for (const [index, point] of route.points.entries()) {
    if (
      point[0] < bounds.minimumX ||
      point[0] > bounds.maximumX ||
      point[1] < bounds.minimumZ ||
      point[1] > bounds.maximumZ
    ) {
      errors.push(`${route.id}[${index}]: point is outside the 500 x 350 bounds`);
    }
  }

  const plan = route.edgePlan;
  if (!plan) {
    errors.push(`${route.id}: missing explicit edgePlan`);
  } else {
    for (const side of ['left', 'right']) {
      if (!EDGE_CLASSES.has(plan[`${side}Class`])) {
        errors.push(`${route.id}: unknown ${side} edge class`);
      }
      if (!(plan[`${side}Width`] >= 0 && plan[`${side}Width`] <= 3)) {
        errors.push(`${route.id}: invalid ${side} edge width`);
      }
      if (!PROTECTION_CLASSES.has(plan[`${side}Protection`])) {
        errors.push(`${route.id}: unknown ${side} protection class`);
      }
    }
  }

  const limit =
    route.id === 'touge-pass'
      ? 14
      : route.id === 'flyover-junction'
        ? 9
        : route.id === 'tunnel-underpass'
          ? 7
          : 10;
  for (let index = 0; index < route.points.length - 1; index += 1) {
    const run = distance(route.points[index], route.points[index + 1]);
    const rise = Math.abs(route.elevations[index + 1] - route.elevations[index]);
    const gradient = (rise / run) * 100;
    if (gradient > limit + 0.01) {
      errors.push(
        `${route.id}[${index}-${index + 1}]: ${gradient.toFixed(2)}% gradient exceeds ${limit}%`,
      );
    }
  }
}

function validateConnectivity(topology, errors) {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  const adjacency = new Map(topology.nodes.map((node) => [node.id, new Set()]));
  const degree = new Map(topology.nodes.map((node) => [node.id, 0]));

  for (const route of topology.routes) {
    for (const [index, nodeId] of route.nodeIds.entries()) {
      if (!nodeId) continue;
      const node = nodeById.get(nodeId);
      if (!node) {
        errors.push(`${route.id}: references missing node ${nodeId}`);
      } else if (distance(node.position, route.points[index]) > 0.05) {
        errors.push(`${route.id}: ${nodeId} does not match its route point`);
      }
    }

    const nodesAlongRoute = route.nodeIds.filter(Boolean);
    for (let index = 0; index < nodesAlongRoute.length - 1; index += 1) {
      const a = nodesAlongRoute[index];
      const b = nodesAlongRoute[index + 1];
      adjacency.get(a)?.add(b);
      adjacency.get(b)?.add(a);
      degree.set(a, (degree.get(a) ?? 0) + 1);
      degree.set(b, (degree.get(b) ?? 0) + 1);
    }
    if (route.closed && nodesAlongRoute.length > 2) {
      const a = nodesAlongRoute.at(-1);
      const b = nodesAlongRoute[0];
      adjacency.get(a)?.add(b);
      adjacency.get(b)?.add(a);
      degree.set(a, (degree.get(a) ?? 0) + 1);
      degree.set(b, (degree.get(b) ?? 0) + 1);
    }
  }

  const start = topology.spawn?.nodeId ?? topology.nodes[0]?.id;
  const visited = new Set();
  const queue = start ? [start] : [];
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const next of adjacency.get(node) ?? []) queue.push(next);
  }
  for (const node of topology.nodes) {
    if (!visited.has(node.id)) errors.push(`node ${node.id}: disconnected from spawn`);
    if ((degree.get(node.id) ?? 0) < 2) {
      errors.push(`node ${node.id}: accidental dead end (degree below 2)`);
    }
  }
}

function validateCrossings(topology, errors) {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]));
  const routeById = new Map(topology.routes.map((route) => [route.id, route]));
  const declared = topology.gradeSeparatedCrossings;
  const segments = topology.routes.flatMap(routeSegments);

  for (let first = 0; first < segments.length; first += 1) {
    for (let second = first + 1; second < segments.length; second += 1) {
      const a = segments[first];
      const b = segments[second];
      if (a.routeId === b.routeId) continue;
      const crossing = segmentIntersection(a.a, a.b, b.a, b.b);
      if (!crossing) continue;

      const routeA = routeById.get(a.routeId);
      const routeB = routeById.get(b.routeId);
      const nodeA = nodeAtPoint(nodeById, routeA, crossing);
      const nodeB = nodeAtPoint(nodeById, routeB, crossing);
      if (nodeA?.id && nodeA.id === nodeB?.id) continue;

      const gradeSeparated = declared.find(
        (entry) =>
          new Set([entry.upperRoadId, entry.lowerRoadId]).has(a.routeId) &&
          new Set([entry.upperRoadId, entry.lowerRoadId]).has(b.routeId) &&
          distance(entry.centre, crossing) < 8,
      );
      if (!gradeSeparated) {
        errors.push(
          `undeclared same-grade crossing: ${a.routeId} / ${b.routeId} near ${pointKey(crossing)}`,
        );
      }
    }
  }

  for (const crossing of declared) {
    const clearance = crossing.upperElevationMetres - crossing.lowerElevationMetres - 0.35;
    if (clearance < crossing.minimumClearanceMetres) {
      errors.push(
        `${crossing.id}: ${clearance.toFixed(2)}m underside clearance is below ${crossing.minimumClearanceMetres}m`,
      );
    }
  }
}

function validateStructures(topology, errors) {
  const routeIds = new Set(topology.routes.map((route) => route.id));
  for (const type of ['flyover', 'underpass']) {
    const structure = topology.structures.find((entry) => entry.type === type);
    if (!structure) {
      errors.push(`missing complete ${type} structure definition`);
      continue;
    }
    for (const key of ['roadId', 'originRoadId', 'destinationRoadId']) {
      if (!routeIds.has(structure[key])) {
        errors.push(`${structure.id}: ${key} references a missing route`);
      }
    }
    if (
      !Array.isArray(structure.entranceProgress) ||
      !Array.isArray(structure.deckProgress) ||
      !Array.isArray(structure.exitProgress)
    ) {
      errors.push(`${structure.id}: entrance, deck, and exit ranges are required`);
    }
    if (
      type === 'flyover' &&
      (!structure.supportProgress.length ||
        structure.supportOffsetMetres <= 0 ||
        structure.deckThicknessMetres <= 0)
    ) {
      errors.push(`${structure.id}: flyover supports and deck thickness are incomplete`);
    }
  }
}

export function validateTopology(topology) {
  const errors = [];
  if (topology.topologyId !== 'HINODE_CITY_V2_TOPOLOGY') {
    errors.push('topologyId must identify the Hinode City v2 topology');
  }
  if (topology.status !== 'candidate_awaiting_user_approval') {
    errors.push('status must remain candidate_awaiting_user_approval');
  }
  if (
    topology.bounds.width !== 500 ||
    topology.bounds.depth !== 350 ||
    topology.northAxis !== '+Z'
  ) {
    errors.push('map must remain north-up within exact 500 x 350 metre bounds');
  }

  const routeIds = topology.routes.map((route) => route.id);
  if (new Set(routeIds).size !== routeIds.length) errors.push('route ids must be unique');
  const closedPrimary = topology.routes.filter(
    (route) => route.kind === 'primary-loop' && route.closed,
  );
  if (closedPrimary.length !== 1) errors.push('exactly one closed primary loop is required');
  if (topology.routes.filter((route) => route.kind === 'shortcut').length !== 2) {
    errors.push('exactly two deliberate shortcut routes are required');
  }

  for (const route of topology.routes) validateRouteGeometry(topology, route, errors);
  validateConnectivity(topology, errors);
  validateCrossings(topology, errors);
  validateStructures(topology, errors);

  return {
    ok: errors.length === 0,
    errors,
    metrics: {
      boundsMetres: `${topology.bounds.width}x${topology.bounds.depth}`,
      districtCount: topology.districts.length,
      routeCount: topology.routes.length,
      nodeCount: topology.nodes.length,
      closedPrimaryLoops: closedPrimary.length,
      shortcuts: topology.routes.filter((route) => route.kind === 'shortcut').length,
      gradeSeparatedCrossings: topology.gradeSeparatedCrossings.length,
      edgePlans: topology.routes.filter((route) => route.edgePlan).length,
    },
  };
}

async function main() {
  const topologyPath = process.argv[2]
    ? new URL(`file:///${process.argv[2].replaceAll('\\', '/')}`)
    : DEFAULT_TOPOLOGY_URL;
  const topology = JSON.parse(await readFile(topologyPath, 'utf8'));
  const result = validateTopology(topology);
  globalThis.console.log(JSON.stringify({ file: fileURLToPath(topologyPath), ...result }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
