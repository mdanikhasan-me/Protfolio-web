export function projectMediaUrl(base: string, width: 960 | 1600) {
  if (!base.startsWith('/media/projects/')) {
    throw new Error('Project media must use the stable public media directory.');
  }
  return `${base}-${width}.webp`;
}

export function projectPreviewAlt(title: string) {
  return `${title.trim()} project preview`;
}

export interface ProjectStageTransform {
  x: number;
  y: number;
  depth: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  opacity: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function boundedProjectIndex(index: number, direction: -1 | 1, count: number) {
  if (count <= 0) return 0;
  return clamp(Math.round(index) + direction, 0, count - 1);
}

export function projectStageTransform(
  index: number,
  progress: number,
  compact: boolean,
): ProjectStageTransform {
  const offset = index - progress;
  const distance = Math.abs(offset);
  const signedDistance = Math.sign(offset);
  const spread = compact ? 244 : 470;
  const x = offset * spread * Math.max(0.72, 1 - distance * 0.055);
  const y = Math.min(distance * distance, 4) * (compact ? 9 : 14);
  const depth = -Math.min(distance, 3) * (compact ? 92 : 148);
  const rotateY = clamp(offset * -9.5, -24, 24);
  const rotateZ = signedDistance * Math.min(distance * 0.65, 1.4);
  const scale = Math.max(compact ? 0.7 : 0.66, 1 - distance * (compact ? 0.15 : 0.13));
  const opacity = clamp(1 - Math.max(0, distance - 1.35) * 0.48, 0.08, 1);

  return { x, y, depth, rotateY, rotateZ, scale, opacity };
}
