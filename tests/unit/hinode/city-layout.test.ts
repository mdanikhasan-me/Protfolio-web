import { describe, expect, it } from 'vitest';
import layoutData from '../../../public/hinode/layouts/hinode-city-v1.json';
import {
  distanceToRoad,
  validateCityLayout,
  type HinodeCityLayout,
} from '../../../src/hinode/map/city-layout';

const layout = layoutData as unknown as HinodeCityLayout;

describe('Hinode City authoritative 500 x 350 metre layout', () => {
  it('contains the complete route identity and structural contract', () => {
    const validation = validateCityLayout(layout);

    expect(validation.errors).toEqual([]);
    expect(validation.metrics).toMatchObject({
      roadCount: 9,
      primaryLoops: 1,
      connectors: 2,
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

  it('covers exactly the approved map bounds and lap target', () => {
    expect(layout.bounds).toMatchObject({ width: 500, depth: 350 });
    expect(layout.gameplay.targetLapSeconds).toEqual([150, 240]);
  });

  it('stores the complete editor and road-authoring contract in versioned JSON', () => {
    expect(layout.editorVersion).toBe('1.1.0');
    expect(layout.layoutVersion).toBe('1.0.0');
    expect(layout.roads.every((road) => road.spline.type === 'cubic-bezier')).toBe(true);
    expect(
      layout.roads.every((road) => road.spline.bankingDegrees.length === road.points.length),
    ).toBe(true);
    expect(layout.authoring).toMatchObject({
      junctions: expect.arrayContaining([
        expect.objectContaining({ id: 'junction-downtown-flyover' }),
      ]),
      structures: expect.arrayContaining([
        expect.objectContaining({ type: 'flyover' }),
        expect.objectContaining({ type: 'underpass' }),
      ]),
    });
    expect(layout.authoring.buildingProxies).toHaveLength(layout.planning.parcels.length);
    expect(layout.authoring.assetSources[1]?.rightsStatus).toBe('pending_full_asset_audit');
  });
});
