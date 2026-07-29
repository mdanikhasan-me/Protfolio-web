import { readFile, writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import { validateTopology } from './validate-hinode-v2-topology.mjs';

const topologyUrl = new URL(
  '../../../public/hinode/layouts/hinode-city-v2-topology.json',
  import.meta.url,
);
const outputUrl = new URL(
  '../../../public/hinode/layouts/hinode-city-v2-candidate.json',
  import.meta.url,
);

const colours = {
  touge: '#273a32',
  alley: '#5a2935',
  downtown: '#3c3158',
  port: '#35414d',
  waterfront: '#23455a',
};
const districtHeights = {
  touge: 38,
  alley: 14,
  downtown: 44,
  port: 16,
  waterfront: 16,
};

const parcelSpecs = [
  ['touge-ridge-service', 'touge', [-128, 4, 120], [24, 8, 17], -0.08, 'scenic', 'pitched'],
  ['touge-lookout', 'touge', [-205, 3, 145], [18, 6, 13], 0.12, 'scenic', 'pitched'],
  ['alley-entry-row', 'alley', [-148, 5, -26], [30, 10, 12], 0.18, 'commercial', 'flat'],
  ['alley-west-row', 'alley', [-204, 5, -63], [21, 10, 30], -0.08, 'commercial', 'flat'],
  ['alley-market-row', 'alley', [-151, 6, -78], [37, 12, 17], 0.1, 'commercial', 'flat'],
  ['alley-south-row', 'alley', [-188, 5, -112], [24, 10, 12], -0.1, 'residential', 'pitched'],
  ['downtown-west-midrise', 'downtown', [-18, 12, 100], [24, 24, 28], 0.08, 'commercial', 'flat'],
  [
    'downtown-core-tower',
    'downtown',
    [35, 22, 104],
    [20, 44, 20],
    0,
    'commercial',
    'mechanical-screen',
  ],
  ['downtown-east-midrise', 'downtown', [80, 15, 100], [26, 30, 24], -0.06, 'commercial', 'flat'],
  ['downtown-south-row', 'downtown', [38, 8, 48], [46, 16, 18], 0.06, 'commercial', 'flat'],
  ['port-north-warehouse', 'port', [174, 7, 108], [48, 14, 28], 0, 'industrial', 'sawtooth'],
  ['port-core-warehouse', 'port', [184, 7, 45], [42, 14, 30], 0.04, 'industrial', 'sawtooth'],
  ['port-south-warehouse', 'port', [177, 6, -20], [45, 12, 24], -0.04, 'industrial', 'flat'],
  ['waterfront-west-row', 'waterfront', [-30, 6, -142], [42, 12, 13], 0.02, 'commercial', 'flat'],
  ['waterfront-east-row', 'waterfront', [115, 7, -132], [47, 14, 16], -0.08, 'commercial', 'flat'],
  ['waterfront-service', 'waterfront', [181, 5, -133], [25, 10, 15], 0.08, 'industrial', 'flat'],
];

const asPoint3 = (point, elevation = 0) => [point[0], elevation, point[1]];
const asZone = (zone) => ({
  id: zone.id,
  label: zone.label,
  centre: zone.centre.length === 3 ? zone.centre : asPoint3(zone.centre),
  size: zone.size,
  rotationY: zone.rotationY ?? 0,
  ...(zone.districtId ? { districtId: zone.districtId } : {}),
  ...(zone.hostRoadId ? { hostRoadId: zone.hostRoadId } : {}),
  ...(zone.brightnessClass ? { brightnessClass: zone.brightnessClass } : {}),
});

const roadPointAt = (route, progress) => {
  const lengths = route.points.slice(0, -1).map((point, index) => {
    const next = route.points[index + 1];
    return Math.hypot(next[0] - point[0], next[1] - point[1]);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let target = Math.max(0, Math.min(1, progress)) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (target > lengths[index]) {
      target -= lengths[index];
      continue;
    }
    const blend = lengths[index] === 0 ? 0 : target / lengths[index];
    const first = route.points[index];
    const second = route.points[index + 1];
    const elevation =
      route.elevations[index] + (route.elevations[index + 1] - route.elevations[index]) * blend;
    return [
      first[0] + (second[0] - first[0]) * blend,
      elevation,
      first[1] + (second[1] - first[1]) * blend,
    ];
  }
  return asPoint3(route.points.at(-1), route.elevations.at(-1));
};

const topology = JSON.parse(await readFile(topologyUrl, 'utf8'));
const topologyValidation = validateTopology(topology);
if (!topologyValidation.ok) {
  throw new Error(
    `Refusing to build an invalid v2 topology:\n${topologyValidation.errors.join('\n')}`,
  );
}

const roads = topology.routes.map((route) => ({
  id: route.id,
  label: route.label,
  kind: route.kind,
  roadClass: route.roadClass,
  surface: route.surface,
  width: route.width,
  lanes: route.lanes,
  direction: route.direction,
  closed: route.closed,
  edgePlan: route.edgePlan,
  spline: {
    type: 'cubic-bezier',
    tangentLengths: route.tangentLengths,
    tangentYawOffsetsDegrees: route.points.map(() => 0),
    bankingDegrees: route.bankingDegrees,
  },
  transform: {
    position: [0, 0, 0],
    rotationY: 0,
    scale: [1, 1, 1],
  },
  points: route.points.map((point, index) => asPoint3(point, route.elevations[index])),
  hidden: false,
  locked: false,
}));

const parcels = parcelSpecs.map(([id, districtId, centre, size, rotationY, role, roofClass]) => ({
  id: `parcel-${id}`,
  label: id
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' '),
  centre,
  size,
  rotationY,
  districtId,
  role,
  roofClass,
}));

const collisionVolumes = [
  ['safety-west-boundary', 'West shoreline safety boundary', [-247, 2, 0], [4, 4, 345], 'boundary'],
  ['safety-east-boundary', 'East shoreline safety boundary', [247, 2, 0], [4, 4, 345], 'boundary'],
  [
    'safety-north-boundary',
    'North shoreline safety boundary',
    [0, 2, 172],
    [495, 4, 4],
    'boundary',
  ],
  ['safety-south-seawall', 'South seawall collision', [55, 2, -172], [380, 4, 4], 'seawall'],
  [
    'safety-canal-west',
    'Canal west guard edge',
    [-84, 1.2, -18],
    [1.2, 2.4, 164],
    'canal-guardrail',
  ],
  [
    'safety-canal-east',
    'Canal east guard edge',
    [-60, 1.2, -18],
    [1.2, 2.4, 164],
    'canal-guardrail',
  ],
  [
    'safety-port-service',
    'Port service exclusion',
    [238, 2, 26],
    [8, 4, 92],
    'industrial-boundary',
  ],
  ['safety-ridge-outer', 'Touge outer guard zone', [-236, 2, 92], [5, 4, 142], 'guardrail'],
].map(([id, label, centre, size, collisionClass]) => ({
  id,
  label,
  centre,
  size,
  collisionClass,
}));

const reviewViews = topology.reviewViews.map((view) => ({ ...view }));
const routeById = new Map(topology.routes.map((route) => [route.id, route]));
const resetZones = topology.resetZones.map((zone) => ({
  id: zone.id,
  label: zone.label,
  roadId: zone.roadId,
  centre: roadPointAt(routeById.get(zone.roadId), zone.progress),
  size: zone.size,
  rotationY: 0,
}));

const layout = {
  schemaVersion: 1,
  editorVersion: '2.0.0-candidate',
  layoutVersion: '2.0.0-candidate.1',
  layoutId: 'HINODE_CITY_V2_CANDIDATE',
  topologyId: topology.topologyId,
  referenceManifestId: topology.referenceManifestId,
  name: 'Hinode City v2 / Honshu Coast',
  status: 'candidate_awaiting_user_approval',
  coordinateSystem: 'metres, Y-up, north +Z, road points stored as [x, elevation, z]',
  bounds: topology.bounds,
  spawn: {
    roadId: topology.spawn.roadId,
    position: roadPointAt(routeById.get(topology.spawn.roadId), 0),
    yawRadians: topology.spawn.yawRadians,
  },
  gameplay: {
    targetLapSeconds: [150, 240],
    estimatedRouteDistanceMetres: 0,
    checkpointRoadOrder: [
      'main-loop',
      'touge-pass',
      'downtown-core',
      'flyover-junction',
      'waterfront-route',
      'alley-district',
    ],
  },
  roads,
  districts: topology.districts.map((district) => ({
    id: district.id,
    label: district.label,
    centre: asPoint3(district.centre),
    size: [district.size[0], districtHeights[district.id], district.size[1]],
    rotationY: 0,
    proxyDensity: district.density,
    densityClass: district.heightClass,
    requiredQuadrant: district.requiredQuadrant,
    colour: colours[district.id],
    hidden: false,
    locked: true,
  })),
  water: topology.water.map((water) => ({
    id: water.id,
    label: water.label,
    centre: asPoint3(water.centre, -0.16),
    size: [water.size[0], 0.16, water.size[1]],
    colour: '#082638',
  })),
  planning: {
    footpaths: topology.routes.map((route) => ({
      roadId: route.id,
      ...route.edgePlan,
    })),
    parcels,
    vegetationZones: topology.zones.vegetation.map(asZone),
    signZones: topology.zones.signs.map(asZone),
    darkRestZones: topology.zones.darkRest.map(asZone),
    collisionVolumes,
    reviewViews,
  },
  authoring: {
    junctions: topology.nodes
      .filter(
        (node) => topology.routes.filter((route) => route.nodeIds.includes(node.id)).length > 1,
      )
      .map((node) => ({
        id: `junction-${node.id}`,
        kind: 'merge',
        roadIds: topology.routes
          .filter((route) => route.nodeIds.includes(node.id))
          .map((route) => route.id),
        centre: asPoint3(node.position),
        clearanceMetres: 5.2,
      })),
    gradeSeparatedCrossings: topology.gradeSeparatedCrossings,
    curbProfiles: topology.routes.map((route) => ({
      roadId: route.id,
      profile:
        route.roadClass === 'alley-narrow'
          ? 'flush'
          : route.edgePlan.rightClass === 'painted-shoulder'
            ? 'painted-shoulder'
            : 'raised',
      heightMetres: route.roadClass === 'alley-narrow' ? 0.04 : 0.16,
    })),
    buildingProxies: parcels.map((parcel, index) => ({
      id: `building-${parcel.id.slice(7)}`,
      parcelId: parcel.id,
      buildingType: parcel.role === 'industrial' ? 'warehouse-shell' : 'district-shell',
      heightMetres: parcel.size[1],
      facadeDirectionDegrees: Math.round((parcel.rotationY * 180) / Math.PI),
      roofClass: parcel.roofClass,
      role: parcel.role,
      signCapacity: parcel.role === 'commercial' ? (index % 3) + 2 : 0,
      visibilityBand: parcel.size[1] >= 30 ? 'hero' : parcel.size[1] >= 14 ? 'mid' : 'background',
      futureAssetId: `V2_${parcel.id.replace('parcel-', '').toUpperCase().replaceAll('-', '_')}`,
      setbackMetres: parcel.role === 'commercial' ? 1.2 : 2.4,
    })),
    billboardSockets: topology.zones.signs.map(asZone),
    futurePropSockets: [
      {
        id: 'socket-alley-vending-v2',
        label: 'Alley vending socket',
        centre: [-176, 0, -54],
        size: [2, 3, 2],
        rotationY: 0.2,
        districtId: 'alley',
        hostRoadId: 'alley-district',
      },
      {
        id: 'socket-port-crane-v2',
        label: 'Port crane socket',
        centre: [207, 0, 25],
        size: [18, 40, 12],
        rotationY: 0,
        districtId: 'port',
        hostRoadId: 'port-connector',
      },
      {
        id: 'socket-waterfront-bench-v2',
        label: 'Waterfront bench socket',
        centre: [20, 0, -150],
        size: [3, 2, 2],
        rotationY: 0,
        districtId: 'waterfront',
        hostRoadId: 'waterfront-route',
      },
    ],
    structures: topology.structures,
    terrainMasses: topology.terrainMasses.map((mass) => ({
      ...mass,
      centre: asPoint3(mass.centre),
    })),
    lightingZones: topology.lightingZones,
    canals: topology.water.filter((entry) => entry.id.includes('canal')).map((entry) => entry.id),
    landmarks: topology.landmarks.map(asZone),
    skylineProxies: parcels
      .filter((parcel) => parcel.size[1] >= 24)
      .map((parcel) => ({ ...parcel, id: `skyline-${parcel.id.slice(7)}` })),
    vehicleClearanceVolumes: collisionVolumes,
    resetZones,
    routeCheckpoints: [
      ['checkpoint-main-v2', 'main-loop', 0.03],
      ['checkpoint-touge-v2', 'touge-pass', 0.5],
      ['checkpoint-downtown-v2', 'downtown-core', 0.55],
      ['checkpoint-flyover-v2', 'flyover-junction', 0.55],
      ['checkpoint-waterfront-v2', 'waterfront-route', 0.55],
      ['checkpoint-alley-v2', 'alley-district', 0.5],
    ].map(([id, roadId, progress]) => ({ id, roadId, progress })),
    lodClasses: {
      hero: { minimumMetres: 0, maximumMetres: 80 },
      mid: { minimumMetres: 60, maximumMetres: 180 },
      background: { minimumMetres: 140, maximumMetres: 500 },
    },
    collisionClasses: {
      boundary: { dynamic: false, purpose: 'map containment' },
      seawall: { dynamic: false, purpose: 'waterfront fall protection' },
      'canal-guardrail': { dynamic: false, purpose: 'canal fall protection' },
      'industrial-boundary': { dynamic: false, purpose: 'port service containment' },
      guardrail: { dynamic: false, purpose: 'touge fall protection' },
    },
    assetSources: [],
    visibilityBands: [
      { id: 'hero', minimumMetres: 0, maximumMetres: 80 },
      { id: 'mid', minimumMetres: 60, maximumMetres: 180 },
      { id: 'background', minimumMetres: 140, maximumMetres: 500 },
    ],
  },
};

await writeFile(outputUrl, `${JSON.stringify(layout, null, 2)}\n`);
globalThis.console.log(
  JSON.stringify(
    {
      written: fileURLToPath(outputUrl),
      status: layout.status,
      roads: roads.length,
      parcels: parcels.length,
      topologyValidation: topologyValidation.metrics,
    },
    null,
    2,
  ),
);
