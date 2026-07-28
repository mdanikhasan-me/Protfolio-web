export type HinodeQuality = 'high' | 'medium' | 'low';

export interface HinodeQualitySettings {
  name: HinodeQuality;
  pixelRatio: number;
  antialias: boolean;
  shadowMapSize: number;
  headlightShadows: boolean;
  decorativeDensity: number;
  reflections: boolean;
}

const SETTINGS: Readonly<Record<HinodeQuality, HinodeQualitySettings>> = {
  high: {
    name: 'high',
    pixelRatio: 1.75,
    antialias: true,
    shadowMapSize: 1024,
    headlightShadows: true,
    decorativeDensity: 1,
    reflections: true,
  },
  medium: {
    name: 'medium',
    pixelRatio: 1.35,
    antialias: true,
    shadowMapSize: 512,
    headlightShadows: false,
    decorativeDensity: 0.82,
    reflections: false,
  },
  low: {
    name: 'low',
    pixelRatio: 1,
    antialias: false,
    shadowMapSize: 256,
    headlightShadows: false,
    decorativeDensity: 0.55,
    reflections: false,
  },
};

export function resolveQuality(search: string): HinodeQualitySettings {
  const requested = new URLSearchParams(search).get('quality');
  if (requested === 'high' || requested === 'medium' || requested === 'low') {
    return SETTINGS[requested];
  }
  return SETTINGS.medium;
}
