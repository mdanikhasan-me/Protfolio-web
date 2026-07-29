import { describe, expect, it } from 'vitest';
import layoutData from '../../../public/hinode/layouts/hinode-city-v2-candidate.json';
import {
  distanceToRoad,
  validateCityLayout,
  type HinodeCityLayout,
} from '../../../src/hinode/map/city-layout';

const layout = layoutData as unknown as HinodeCityLayout;

describe('Hinode City v2 candidate 500 x 350 metre layout', () => {
  it('contains the complete route identity and structural contract', () => {
    const validation = validateCityLayout(layout);

    expect(validation.errors).toEqual([]);
    expect(validation.metrics).toMatchObject({
      roadCount: 11,
      primaryLoops: 1,
      connectors: 3,
      shortcuts: 2,
    });
    expect(validation.metrics.routeLengthMetres).toBeGreaterThan(2_500);
    expect(validation.metrics.maximumElevationMetres).toBeGreaterThanOrEqual(12);
    expect(validation.metrics.minimumElevationMetres).toBeLessThan(0);
  });

  it('places the authored spawn on the primary loop', () => {
    const spawnRoad = layout.roads.find((road) => road.id === layout.spawn.roadId);
    expect(spawnRoad).toBeDefined();
    expect(
      distanceToRoad({ x: layout.spawn.position[0], z: layout.spawn.position[2] }, spawnRoad!),
    ).toBeLessThan(spawnRoad!.width * 0.5);
  });

  it('covers the exact provisional map bounds and lap target', () => {
    expect(layout.bounds).toMatchObject({ width: 500, depth: 350 });
    expect(layout.gameplay.targetLapSeconds).toEqual([150, 240]);
  });

  it('stores the complete editor and road-authoring contract in versioned JSON', () => {
    expect(layout.editorVersion).toBe('2.0.0-candidate');
    expect(layout.layoutVersion).toBe('2.0.0-candidate.1');
    expect(layout.status).toBe('candidate_awaiting_user_approval');
    expect(layout.topologyId).toBe('HINODE_CITY_V2_TOPOLOGY');
    expect(layout.roads.every((road) => road.spline.type === 'cubic-bezier')).toBe(true);
    expect(
      layout.roads.every((road) => road.spline.bankingDegrees.length === road.points.length),
    ).toBe(true);
    expect(layout.authoring).toMatchObject({
      junctions: expect.arrayContaining([
        expect.objectContaining({ id: 'junction-downtown-core' }),
      ]),
      structures: expect.arrayContaining([
        expect.objectContaining({ type: 'flyover' }),
        expect.objectContaining({ type: 'underpass' }),
      ]),
    });
    expect(layout.authoring.buildingProxies).toHaveLength(layout.planning.parcels.length);
    expect(layout.authoring.assetSources).toEqual([]);
    expect(layout.authoring.gradeSeparatedCrossings).toHaveLength(3);
    expect(layout.authoring.terrainMasses).toHaveLength(2);
    expect(layout.planning.footpaths.every((edge) => edge.leftClass && edge.rightClass)).toBe(true);
  });
});
