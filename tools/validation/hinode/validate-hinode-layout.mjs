import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const layoutPath = path.join(root, 'public', 'hinode', 'layouts', 'hinode-city-v1.json');
const layout = JSON.parse(await fs.readFile(layoutPath, 'utf8'));
const failures = [];

const requireValue = (condition, message) => {
  if (!condition) failures.push(message);
};

requireValue(layout.schemaVersion === 1, 'schemaVersion must equal 1');
requireValue(Boolean(layout.editorVersion), 'editorVersion is required');
requireValue(Boolean(layout.layoutVersion), 'layoutVersion is required');
requireValue(layout.bounds?.width === 500, 'map width must equal 500 metres');
requireValue(layout.bounds?.depth === 350, 'map depth must equal 350 metres');
requireValue(Array.isArray(layout.roads), 'roads must be an array');

const roads = Array.isArray(layout.roads) ? layout.roads : [];
const ids = new Set(roads.map((road) => road.id));
for (const road of roads) {
  requireValue(road.spline?.type === 'cubic-bezier', `${road.id} must use cubic-bezier`);
  requireValue(
    road.spline?.tangentLengths?.length === road.points?.length,
    `${road.id} tangent lengths must match its anchors`,
  );
  requireValue(
    road.spline?.tangentYawOffsetsDegrees?.length === road.points?.length,
    `${road.id} tangent yaw offsets must match its anchors`,
  );
  requireValue(
    road.spline?.bankingDegrees?.length === road.points?.length,
    `${road.id} banking values must match its anchors`,
  );
}
for (const id of [
  'main-loop',
  'downtown-core',
  'alley-district',
  'touge-pass',
  'waterfront-route',
  'flyover-junction',
  'tunnel-underpass',
]) {
  requireValue(ids.has(id), `required road missing: ${id}`);
}
requireValue(
  roads.filter((road) => road.kind === 'primary-loop').length === 1,
  'exactly one primary loop is required',
);
requireValue(
  roads.filter((road) => road.kind === 'connector').length >= 2,
  'at least two connectors are required',
);
requireValue(
  roads.filter((road) => road.kind === 'shortcut').length === 2,
  'exactly two shortcuts are required',
);

const elevations = roads.flatMap((road) => road.points.map((point) => point[1]));
requireValue(Math.max(...elevations) >= 8, 'flyover elevation is missing');
requireValue(Math.min(...elevations) < 0, 'tunnel or underpass elevation is missing');
requireValue(
  layout.gameplay?.targetLapSeconds?.[0] === 150 && layout.gameplay?.targetLapSeconds?.[1] === 240,
  'target lap window must remain 150–240 seconds',
);

const planning = layout.planning ?? {};
const footpaths = Array.isArray(planning.footpaths) ? planning.footpaths : [];
const parcels = Array.isArray(planning.parcels) ? planning.parcels : [];
const vegetationZones = Array.isArray(planning.vegetationZones) ? planning.vegetationZones : [];
const signZones = Array.isArray(planning.signZones) ? planning.signZones : [];
const collisionVolumes = Array.isArray(planning.collisionVolumes) ? planning.collisionVolumes : [];
const reviewViews = Array.isArray(planning.reviewViews) ? planning.reviewViews : [];
requireValue(
  roads.every((road) => footpaths.some((item) => item.roadId === road.id)),
  'every road requires a footpath and drainage plan',
);
requireValue(parcels.length >= 10, 'at least ten parcel zones are required');
requireValue(vegetationZones.length >= 5, 'at least five vegetation zones are required');
requireValue(signZones.length >= 7, 'at least seven sign zones are required');
requireValue(collisionVolumes.length >= 4, 'at least four collision volumes are required');
for (const reviewId of [
  'touge',
  'alley',
  'downtown',
  'port',
  'waterfront',
  'flyover-review',
  'underpass-review',
]) {
  requireValue(
    reviewViews.some((view) => view.id === reviewId),
    `required review view missing: ${reviewId}`,
  );
}

const authoring = layout.authoring ?? {};
requireValue(authoring.junctions?.length >= 3, 'at least three junction records are required');
requireValue(
  authoring.curbProfiles?.length === roads.length,
  'every road requires a curb profile record',
);
requireValue(
  authoring.buildingProxies?.length >= parcels.length,
  'every parcel requires a building proxy record',
);
requireValue(authoring.billboardSockets?.length >= 3, 'billboard sockets are required');
requireValue(authoring.futurePropSockets?.length >= 3, 'future prop sockets are required');
requireValue(authoring.structures?.length >= 2, 'flyover and underpass structures are required');
requireValue(authoring.resetZones?.length >= 3, 'reset zones are required');
requireValue(
  authoring.routeCheckpoints?.length >= layout.gameplay.checkpointRoadOrder.length,
  'every route gate requires an authored checkpoint',
);

if (failures.length) {
  globalThis.console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  globalThis.console.log(
    JSON.stringify(
      {
        valid: true,
        layoutId: layout.layoutId,
        roads: roads.length,
        connectors: roads.filter((road) => road.kind === 'connector').length,
        shortcuts: roads.filter((road) => road.kind === 'shortcut').length,
        districts: layout.districts.length,
        boundsMetres: [layout.bounds.width, layout.bounds.depth],
        planning: {
          footpathCorridors: footpaths.length,
          parcels: parcels.length,
          vegetationZones: vegetationZones.length,
          signZones: signZones.length,
          collisionVolumes: collisionVolumes.length,
          reviewViews: reviewViews.length,
        },
        authoring: {
          bezierRoads: roads.filter((road) => road.spline?.type === 'cubic-bezier').length,
          junctions: authoring.junctions.length,
          curbProfiles: authoring.curbProfiles.length,
          buildingProxies: authoring.buildingProxies.length,
          billboardSockets: authoring.billboardSockets.length,
          futurePropSockets: authoring.futurePropSockets.length,
          resetZones: authoring.resetZones.length,
          routeCheckpoints: authoring.routeCheckpoints.length,
        },
      },
      null,
      2,
    ),
  );
}
