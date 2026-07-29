export interface HandlingBarrier {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  yaw?: number;
}

export interface HandlingSection {
  id: string;
  label: string;
  centre: readonly [number, number];
  size: readonly [number, number];
  yaw?: number;
  class:
    | 'acceleration'
    | 'braking'
    | 'slalom'
    | 'curve'
    | 'corner'
    | 'hairpin'
    | 'surface'
    | 'camera'
    | 'clearance'
    | 'collision'
    | 'reset';
}

export const HANDLING_BOUNDS = {
  width: 140,
  depth: 90,
} as const;

export const HANDLING_SPAWN = {
  x: -47,
  z: 20,
  yaw: -Math.PI / 2,
} as const;

export const HANDLING_BARRIERS: readonly HandlingBarrier[] = [
  { id: 'north', x: 0, z: -44, width: 140, depth: 1.2 },
  { id: 'south', x: 0, z: 44, width: 140, depth: 1.2 },
  { id: 'west', x: -69.4, z: 0, width: 1.2, depth: 88 },
  { id: 'east', x: 69.4, z: 0, width: 1.2, depth: 88 },
  { id: 'chicane-a', x: -6, z: -8, width: 17, depth: 1.1, yaw: 0.28 },
  { id: 'chicane-b', x: 9, z: 8, width: 17, depth: 1.1, yaw: 0.28 },
  { id: 'brake-wall', x: 47, z: -23, width: 1.1, depth: 21 },
] as const;

export const HANDLING_SECTIONS: readonly HandlingSection[] = [
  {
    id: 'acceleration-straight',
    label: 'Long acceleration straight',
    centre: [-12, 20],
    size: [72, 9],
    class: 'acceleration',
  },
  {
    id: 'measured-braking-zone',
    label: 'Measured braking zone',
    centre: [34, 20],
    size: [18, 12],
    class: 'braking',
  },
  {
    id: 'slalom',
    label: 'Slalom',
    centre: [0, 0],
    size: [58, 13],
    class: 'slalom',
  },
  {
    id: 'medium-s-bend',
    label: 'Medium-speed S bend',
    centre: [-38, -16],
    size: [28, 13],
    yaw: -0.38,
    class: 'curve',
  },
  {
    id: 'urban-ninety',
    label: 'Ninety-degree urban corner',
    centre: [30, -18],
    size: [22, 18],
    class: 'corner',
  },
  {
    id: 'increasing-radius',
    label: 'Increasing-radius curve',
    centre: [51, 1],
    size: [22, 18],
    class: 'curve',
  },
  {
    id: 'decreasing-radius',
    label: 'Decreasing-radius curve',
    centre: [47, 32],
    size: [28, 13],
    yaw: 0.24,
    class: 'curve',
  },
  {
    id: 'tight-hairpin',
    label: 'Tight hairpin',
    centre: [-48, -31],
    size: [24, 18],
    class: 'hairpin',
  },
  {
    id: 'uneven-surface',
    label: 'Short uneven surface',
    centre: [-4, 34],
    size: [18, 9],
    class: 'surface',
  },
  {
    id: 'tunnel-camera',
    label: 'Tunnel-like camera section',
    centre: [18, 34],
    size: [22, 9],
    class: 'camera',
  },
  {
    id: 'narrow-road',
    label: 'Narrow road section',
    centre: [-57, 5],
    size: [12, 28],
    class: 'clearance',
  },
  {
    id: 'collision-wall',
    label: 'Collision wall',
    centre: [47, -23],
    size: [12, 22],
    class: 'collision',
  },
  {
    id: 'reset-zone',
    label: 'Deterministic reset zone',
    centre: [-47, 20],
    size: [8, 7],
    class: 'reset',
  },
] as const;
