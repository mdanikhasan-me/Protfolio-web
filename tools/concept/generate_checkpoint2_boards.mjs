import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '../..');
const outputRoot = path.join(projectRoot, 'docs/design/checkpoint-2');
const W = 1920;
const H = 1080;

const directions = [
  {
    slug: 'direction-01',
    name: 'SIGNAL WEAVE',
    law: 'One continuous signal changes role under tension.',
    family: 'weave',
    ink: '#F4F1E9',
    paper: '#111226',
    soft: '#A5A8C5',
    colors: ['#72D7DF', '#F2B74B', '#E65B8F', '#7E78FF'],
    states: [
      '01 / FIRST VIEWPORT — dormant signal',
      '02 / SIGNATURE TRANSFORMATION — tension',
      '03 / BRIGHT CHAPTER — bone interval',
      '04 / DARK CHAPTER — mineral depth',
      '05 / PROJECT SELECTION — aperture focus',
      '06 / PROJECT OPENING — evidence threads',
      '07 / CALM CONTACT — direct endpoints',
      '08 / RETURN / RECOVERY — continuity',
    ],
    mobile: [
      'First viewport',
      'Navigation',
      'Simplified transform',
      'Project entry',
      'Reduced density',
      'Identity / no 3D',
      'Reduced motion',
      'No-WebGL',
    ],
    roles: [
      'Identity trace',
      'Navigation tension',
      'Media aperture',
      'Chapter threshold',
      'Selection focus',
      'Progress measure',
      'Content mask',
      'Return path',
    ],
  },
  {
    slug: 'direction-02',
    name: 'KINETIC LEDGER',
    law: 'A pressure seam reorganizes typographic strata.',
    family: 'ledger',
    ink: '#171721',
    paper: '#F4F0E8',
    soft: '#716F7B',
    colors: ['#2447FF', '#FF5C35', '#5B2A86', '#F2B632'],
    states: [
      '01 / FIRST VIEWPORT — ledger at rest',
      '02 / SIGNATURE TRANSFORMATION — pressure',
      '03 / BRIGHT CHAPTER — chalk register',
      '04 / DARK CHAPTER — inverted ledger',
      '05 / PROJECT SELECTION — active band',
      '06 / PROJECT OPENING — evidence owns row',
      '07 / CALM CONTACT — plain language',
      '08 / RETURN / RECOVERY — aligned rhythm',
    ],
    mobile: [
      'First viewport',
      'Navigation',
      'Simplified transform',
      'Project entry',
      'Reduced density',
      'Identity / no 3D',
      'Reduced motion',
      'No-WebGL',
    ],
    roles: [
      'Identity measure',
      'Navigation rail',
      'Media band',
      'Chapter seam',
      'Selection pressure',
      'Progress baseline',
      'Content register',
      'Return rhythm',
    ],
  },
  {
    slug: 'direction-03',
    name: 'CONSTRAINT FIELD',
    law: 'Invisible rules become legible through many small responses.',
    family: 'field',
    ink: '#E7E3D3',
    paper: '#101B2B',
    soft: '#9BACB5',
    colors: ['#D96B4B', '#A9D6D0', '#F0B53A', '#7F90C9'],
    states: [
      '01 / FIRST VIEWPORT — quiet field',
      '02 / SIGNATURE TRANSFORMATION — bend',
      '03 / BRIGHT CHAPTER — sparse ricepaper',
      '04 / DARK CHAPTER — storm current',
      '05 / PROJECT SELECTION — boundary force',
      '06 / PROJECT OPENING — evidence current',
      '07 / CALM CONTACT — settled rows',
      '08 / RETURN / RECOVERY — path memory',
    ],
    mobile: [
      'First viewport',
      'Navigation',
      'Simplified transform',
      'Project entry',
      'Reduced density',
      'Identity / no 3D',
      'Reduced motion',
      'No-WebGL',
    ],
    roles: [
      'Identity field',
      'Navigation current',
      'Media boundary',
      'Chapter inversion',
      'Selection force',
      'Progress density',
      'Content corridor',
      'Return memory',
    ],
  },
];

const esc = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function header(direction, title, subtitle) {
  return `
    <text x="72" y="68" class="kicker">${esc(direction.name)} · CHECKPOINT 2</text>
    <text x="72" y="130" class="title">${esc(title)}</text>
    <text x="72" y="168" class="subtitle">${esc(subtitle)}</text>
    <text x="1848" y="68" text-anchor="end" class="folio">CONCEPT STUDY / NOT PUBLIC COPY</text>
  `;
}

function wrap(direction, title, subtitle, body, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="board-title board-desc">
  <title id="board-title">${esc(direction.name)} — ${esc(title)}</title>
  <desc id="board-desc">${esc(subtitle)}</desc>
  <defs>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="microShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="7" stdDeviation="10" flood-color="#000" flood-opacity=".25"/>
    </filter>
    <pattern id="microGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="${direction.ink}" stroke-opacity=".055" stroke-width="1"/>
    </pattern>
    <linearGradient id="fade" x1="0" x2="1">
      <stop offset="0" stop-color="${direction.colors[0]}"/>
      <stop offset=".48" stop-color="${direction.colors[2]}"/>
      <stop offset="1" stop-color="${direction.colors[1]}"/>
    </linearGradient>
    ${extraDefs}
  </defs>
  <style>
    .kicker,.folio,.label,.micro,.state { font-family: "IBM Plex Mono", "Cascadia Mono", monospace; letter-spacing: .12em; }
    .title,.display,.word { font-family: "Arial Narrow", "Inter Tight", Arial, sans-serif; font-weight: 760; }
    .kicker { font-size: 19px; fill: ${direction.colors[0]}; }
    .folio { font-size: 14px; fill: ${direction.soft}; }
    .title { font-size: 54px; fill: ${direction.ink}; letter-spacing: -.035em; }
    .subtitle { font: 22px Arial, sans-serif; fill: ${direction.soft}; }
    .label { font-size: 13px; fill: ${direction.ink}; }
    .micro { font-size: 11px; fill: ${direction.soft}; }
    .state { font-size: 14px; fill: ${direction.ink}; }
    .display { fill: ${direction.ink}; letter-spacing: -.07em; }
  </style>
  <rect width="${W}" height="${H}" fill="${direction.paper}"/>
  <rect width="${W}" height="${H}" fill="url(#microGrid)"/>
  ${header(direction, title, subtitle)}
  ${body}
</svg>`;
}

function weaveGlyph(x, y, w, h, state, direction, compact = false) {
  const c = direction.colors;
  const phase = state % 4;
  const apertureX = x + w * (0.52 + (phase - 1.5) * 0.055);
  const apertureY = y + h * (0.49 + ((state % 3) - 1) * 0.06);
  const apertureW = w * (compact ? 0.42 : 0.32);
  const apertureH = h * (compact ? 0.26 : 0.36);
  const paths = [
    `M ${x - 18} ${y + h * 0.18} C ${x + w * 0.18} ${y + h * (0.05 + phase * 0.03)}, ${x + w * 0.31} ${y + h * 0.72}, ${apertureX} ${apertureY - apertureH / 2} S ${x + w * 0.76} ${y + h * 0.12}, ${x + w + 18} ${y + h * 0.3}`,
    `M ${x - 18} ${y + h * 0.34} C ${x + w * 0.24} ${y + h * 0.58}, ${x + w * 0.27} ${y + h * 0.08}, ${apertureX - apertureW / 2} ${apertureY} S ${x + w * 0.73} ${y + h * 0.82}, ${x + w + 18} ${y + h * 0.57}`,
    `M ${x - 18} ${y + h * 0.61} C ${x + w * 0.18} ${y + h * 0.78}, ${x + w * 0.37} ${y + h * 0.28}, ${apertureX} ${apertureY + apertureH / 2} S ${x + w * 0.78} ${y + h * 0.42}, ${x + w + 18} ${y + h * 0.77}`,
    `M ${x - 18} ${y + h * 0.78} C ${x + w * 0.28} ${y + h * 0.44}, ${x + w * 0.35} ${y + h * 0.87}, ${apertureX + apertureW / 2} ${apertureY} S ${x + w * 0.84} ${y + h * 0.58}, ${x + w + 18} ${y + h * 0.88}`,
  ];
  return `
    <g>
      ${paths
        .map(
          (d, index) =>
            `<path d="${d}" fill="none" stroke="${c[index]}" stroke-width="${compact ? 7 : 10}" stroke-linecap="round" opacity="${0.72 + index * 0.06}"/>`,
        )
        .join('')}
      <rect x="${apertureX - apertureW / 2}" y="${apertureY - apertureH / 2}" width="${apertureW}" height="${apertureH}" rx="${compact ? 8 : 12}" fill="${direction.paper}" stroke="${c[state % c.length]}" stroke-width="2"/>
      ${
        state === 4 || state === 5
          ? `<text x="${apertureX}" y="${apertureY}" text-anchor="middle" class="micro">[PROJECT IMAGE — PENDING]</text>`
          : `<circle cx="${apertureX}" cy="${apertureY}" r="${compact ? 5 : 7}" fill="${c[(state + 1) % c.length]}" filter="url(#softGlow)"/>`
      }
    </g>`;
}

function ledgerGlyph(x, y, w, h, state, direction, compact = false) {
  const c = direction.colors;
  const bands = compact ? 7 : 9;
  const gap = h / (bands + 1);
  const seam = x + w * (0.28 + (state % 5) * 0.11);
  const word = ['ANIK', 'WORK', 'BUILD', 'PROOF'][state % 4];
  let rails = '';
  for (let i = 0; i < bands; i += 1) {
    const yy = y + gap * (i + 1);
    const amplitude =
      state >= 2 && state <= 5 ? Math.max(4, 18 - Math.abs(yy - (y + h / 2)) * 0.06) : 2;
    rails += `<path d="M ${x} ${yy} H ${seam - 42} Q ${seam} ${yy + (i % 2 ? -amplitude : amplitude)} ${seam + 42} ${yy} H ${x + w}" fill="none" stroke="${i % 3 === 0 ? c[i % c.length] : direction.ink}" stroke-opacity="${i % 3 === 0 ? 0.92 : 0.19}" stroke-width="${i % 3 === 0 ? 3 : 1}"/>`;
  }
  return `
    <g>
      ${rails}
      <text x="${x + 12}" y="${y + h * 0.63}" class="display" font-size="${compact ? 42 : 70}" opacity=".93">${word}</text>
      <rect x="${seam - 3}" y="${y + 6}" width="6" height="${h - 12}" fill="${c[state % c.length]}"/>
      ${
        state === 4 || state === 5
          ? `<rect x="${x + w * 0.54}" y="${y + h * 0.25}" width="${w * 0.39}" height="${h * 0.48}" fill="${c[0]}" opacity=".16"/><text x="${x + w * 0.735}" y="${y + h * 0.5}" text-anchor="middle" class="micro">[PROJECT IMAGE — PENDING]</text>`
          : `<text x="${seam + 14}" y="${y + 22}" class="micro">PRESSURE ${String(state).padStart(2, '0')}</text>`
      }
    </g>`;
}

function fieldGlyph(x, y, w, h, state, direction, compact = false) {
  const c = direction.colors;
  const cols = compact ? 11 : 17;
  const rows = compact ? 8 : 11;
  const forceX = x + w * (0.36 + (state % 4) * 0.11);
  const forceY = y + h * (0.35 + ((state + 1) % 3) * 0.13);
  const slot = state === 4 || state === 5;
  let marks = '';
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const px = x + 15 + (col * (w - 30)) / (cols - 1);
      const py = y + 15 + (row * (h - 30)) / (rows - 1);
      const dx = px - forceX;
      const dy = py - forceY;
      const distance = Math.max(22, Math.sqrt(dx * dx + dy * dy));
      const angle =
        Math.atan2(dy, dx) * (180 / Math.PI) + 90 + Math.sin((col + row + state) * 0.7) * 14;
      const inVoid =
        slot && px > x + w * 0.48 && px < x + w * 0.87 && py > y + h * 0.24 && py < y + h * 0.75;
      if (!inVoid) {
        const highlight = distance < w * 0.25 || (row + col + state) % 13 === 0;
        marks += `<line x1="${px - 3}" y1="${py}" x2="${px + (compact ? 4 : 7)}" y2="${py}" transform="rotate(${angle.toFixed(1)} ${px} ${py})" stroke="${highlight ? c[(row + col) % c.length] : direction.ink}" stroke-opacity="${highlight ? 0.9 : 0.32}" stroke-width="${highlight ? 2.4 : 1.2}" stroke-linecap="round"/>`;
      }
    }
  }
  return `
    <g>
      ${marks}
      <circle cx="${forceX}" cy="${forceY}" r="${compact ? 5 : 7}" fill="${c[state % c.length]}" filter="url(#softGlow)"/>
      ${
        slot
          ? `<rect x="${x + w * 0.48}" y="${y + h * 0.24}" width="${w * 0.39}" height="${h * 0.51}" rx="10" fill="${direction.paper}" stroke="${c[1]}" stroke-width="2"/><text x="${x + w * 0.675}" y="${y + h * 0.5}" text-anchor="middle" class="micro">[PROJECT IMAGE — PENDING]</text>`
          : ''
      }
    </g>`;
}

function glyph(direction, x, y, w, h, state, compact = false) {
  if (direction.family === 'weave') return weaveGlyph(x, y, w, h, state, direction, compact);
  if (direction.family === 'ledger') return ledgerGlyph(x, y, w, h, state, direction, compact);
  return fieldGlyph(x, y, w, h, state, direction, compact);
}

function desktopBoard(direction) {
  const tileW = 420;
  const tileH = 350;
  const gapX = 32;
  const gapY = 54;
  const startX = 72;
  const startY = 238;
  let tiles = '';
  direction.states.forEach((state, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = startX + col * (tileW + gapX);
    const y = startY + row * (tileH + gapY);
    const visualDirection =
      index === 2 && direction.family !== 'ledger'
        ? { ...direction, paper: '#E7E3D3', ink: '#101B2B', soft: '#52616B' }
        : index === 3 && direction.family === 'ledger'
          ? { ...direction, paper: '#171721', ink: '#F4F0E8', soft: '#B4AFB2' }
          : direction;
    tiles += `
      <g>
        <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="16" fill="${direction.family === 'ledger' ? '#FFFFFF' : '#FFFFFF'}" fill-opacity="${direction.family === 'ledger' ? 0.58 : 0.035}" stroke="${direction.ink}" stroke-opacity=".17"/>
        <rect x="${x + 14}" y="${y + 14}" width="${tileW - 28}" height="${tileH - 92}" rx="10" fill="${visualDirection.paper}" stroke="${direction.ink}" stroke-opacity=".14"/>
        ${glyph(visualDirection, x + 22, y + 22, tileW - 44, tileH - 108, index)}
        <text x="${x + 16}" y="${y + tileH - 48}" class="state">${esc(state)}</text>
        <text x="${x + 16}" y="${y + tileH - 21}" class="micro">Full-viewport behavior sample · 16:9</text>
      </g>`;
  });
  return wrap(
    direction,
    'DESKTOP EXPERIENCE BOARD',
    'Eight authored states sharing one visual law; each tile represents a full 16:9 viewport.',
    tiles,
  );
}

function mobileBoard(direction) {
  const phoneW = 194;
  const phoneH = 548;
  const gap = 26;
  const startX = 72;
  const y = 280;
  let phones = '';
  direction.mobile.forEach((state, index) => {
    const x = startX + index * (phoneW + gap);
    phones += `
      <g filter="url(#microShadow)">
        <rect x="${x}" y="${y}" width="${phoneW}" height="${phoneH}" rx="38" fill="${direction.paper}" stroke="${direction.ink}" stroke-opacity=".4" stroke-width="2"/>
        <rect x="${x + 13}" y="${y + 16}" width="${phoneW - 26}" height="${phoneH - 32}" rx="28" fill="${direction.paper}" stroke="${direction.ink}" stroke-opacity=".08"/>
        <rect x="${x + phoneW / 2 - 27}" y="${y + 9}" width="54" height="7" rx="4" fill="${direction.ink}" opacity=".22"/>
        ${glyph(direction, x + 21, y + 70, phoneW - 42, phoneH - 164, index === 3 ? 4 : index, true)}
        <text x="${x + 22}" y="${y + phoneH - 62}" class="label">${String(index + 1).padStart(2, '0')} / ${esc(state.toUpperCase())}</text>
        <text x="${x + 22}" y="${y + phoneH - 36}" class="micro">thumb path · ${index % 2 ? 'settled' : 'active'}</text>
      </g>`;
  });
  const notes = `
    <path d="M72 900H1848" stroke="${direction.ink}" stroke-opacity=".18"/>
    <text x="72" y="946" class="label">MOBILE RULE</text>
    <text x="250" y="946" class="subtitle">The governing system reflows; it is not a cropped desktop scene.</text>
    <text x="72" y="995" class="micro">Minimum hit targets 44px · no hover dependency · lower density · reduced motion is a first-class state</text>`;
  return wrap(
    direction,
    'MOBILE EXPERIENCE BOARD',
    'Eight 390×844 intent studies showing hierarchy, touch reach, and a real mobile composition.',
    phones + notes,
  );
}

function motionBoard(direction) {
  const count = 14;
  const tileW = 238;
  const tileH = 292;
  const gapX = 24;
  const gapY = 42;
  const startX = 72;
  const startY = 255;
  let frames = '';
  for (let index = 0; index < count; index += 1) {
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = startX + col * (tileW + gapX);
    const y = startY + row * (tileH + gapY);
    const progress = Math.round((index / (count - 1)) * 100);
    frames += `
      <g>
        <rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="12" fill="${direction.ink}" fill-opacity=".028" stroke="${direction.ink}" stroke-opacity=".16"/>
        <rect x="${x + 10}" y="${y + 10}" width="${tileW - 20}" height="${tileH - 76}" rx="8" fill="${direction.paper}"/>
        ${glyph(direction, x + 16, y + 16, tileW - 32, tileH - 88, Math.min(7, Math.floor(index / 2)), true)}
        <text x="${x + 12}" y="${y + tileH - 40}" class="label">F${String(index + 1).padStart(2, '0')} · ${progress}%</text>
        <text x="${x + 12}" y="${y + tileH - 17}" class="micro">${index < 4 ? 'orient' : index < 10 ? 'transform' : 'settle'} / anchor held</text>
      </g>`;
  }
  return wrap(
    direction,
    'MOTION STORYBOARD',
    'Fourteen authored frames for the arrival-to-project-focus transition; timing semantics live beside this board.',
    frames,
  );
}

function signatureBoard(direction) {
  const tileW = 420;
  const tileH = 344;
  const startX = 72;
  const startY = 250;
  const gapX = 32;
  const gapY = 48;
  let tiles = '';
  direction.roles.forEach((role, index) => {
    const x = startX + (index % 4) * (tileW + gapX);
    const y = startY + Math.floor(index / 4) * (tileH + gapY);
    tiles += `
      <g>
        <text x="${x}" y="${y}" class="label">${String(index + 1).padStart(2, '0')} / ${esc(role.toUpperCase())}</text>
        <rect x="${x}" y="${y + 22}" width="${tileW}" height="${tileH - 22}" rx="14" fill="${direction.ink}" fill-opacity=".03" stroke="${direction.ink}" stroke-opacity=".18"/>
        ${glyph(direction, x + 16, y + 44, tileW - 32, tileH - 92, [0, 1, 4, 2, 4, 1, 5, 7][index])}
        <text x="${x + 16}" y="${y + tileH - 18}" class="micro">same law · materially different job</text>
      </g>`;
  });
  return wrap(
    direction,
    'SIGNATURE-SYSTEM CONTACT SHEET',
    'The signature earns its place in eight functional roles; it is not a decorative hero prop.',
    tiles,
  );
}

function typeSample(direction, x, y, w, h, index) {
  const words = [
    'ANIK',
    'SYSTEMS',
    'PRESS',
    'RELEASE',
    'PLAY',
    'CONTACT',
    'BUILD / LEARN',
    'HTML + BODY',
  ];
  const word = words[index];
  const fontSize = index === 6 ? 48 : index === 7 ? 56 : index % 2 ? 68 : 86;
  if (direction.family === 'ledger') {
    return `
      <text x="${x + 18}" y="${y + h * 0.54}" class="display" font-size="${fontSize}" ${index < 6 ? `textLength="${w - 36}" lengthAdjust="spacingAndGlyphs"` : ''}>${word}</text>
      <path d="M${x + 18} ${y + h * 0.68} H${x + w - 18}" stroke="${direction.colors[index % 4]}" stroke-width="${index % 3 === 0 ? 8 : 3}"/>
      <rect x="${x + w * 0.62}" y="${y + 20}" width="5" height="${h - 40}" fill="${direction.colors[(index + 1) % 4]}"/>`;
  }
  if (direction.family === 'weave') {
    return `
      <text x="${x + 18}" y="${y + h * 0.58}" class="display" font-size="${fontSize}">${word}</text>
      <path d="M${x + 15} ${y + h * 0.74} C${x + w * 0.3} ${y + h * 0.55},${x + w * 0.62} ${y + h * 0.93},${x + w - 15} ${y + h * 0.68}" fill="none" stroke="url(#fade)" stroke-width="7" stroke-linecap="round"/>`;
  }
  return `
    <text x="${x + 18}" y="${y + h * 0.55}" class="display" font-size="${fontSize}">${word}</text>
    ${fieldGlyph(x + w * 0.58, y + 20, w * 0.37, h - 40, index, direction, true)}`;
}

function typographyBoard(direction) {
  const requirements = [
    'Display typography',
    'Body typography',
    'Expressive behaviour',
    'Stable recovery',
    'Mobile treatment',
    'Reduced-motion treatment',
    'Long-heading behaviour',
    'Readable HTML relationship',
  ];
  const tileW = 420;
  const tileH = 338;
  const startX = 72;
  const startY = 252;
  let tiles = '';
  requirements.forEach((requirement, index) => {
    const x = startX + (index % 4) * 452;
    const y = startY + Math.floor(index / 4) * 392;
    tiles += `
      <g>
        <text x="${x}" y="${y}" class="label">${String(index + 1).padStart(2, '0')} / ${esc(requirement.toUpperCase())}</text>
        <rect x="${x}" y="${y + 22}" width="${tileW}" height="${tileH - 22}" rx="12" fill="${direction.ink}" fill-opacity=".025" stroke="${direction.ink}" stroke-opacity=".16"/>
        ${typeSample(direction, x, y + 22, tileW, tileH - 56, index)}
        <text x="${x + 18}" y="${y + tileH - 16}" class="micro">Manrope + IBM Plex Mono · system font fallback tested</text>
      </g>`;
  });
  return wrap(
    direction,
    'TYPOGRAPHY STUDY',
    'Eight hierarchy and behavior tests using fonts already present in the repository; wording is non-public study copy.',
    tiles,
  );
}

await mkdir(outputRoot, { recursive: true });
for (const direction of directions) {
  const directionRoot = path.join(outputRoot, direction.slug);
  await mkdir(directionRoot, { recursive: true });
  const boards = {
    'desktop-experience-board.svg': desktopBoard(direction),
    'mobile-experience-board.svg': mobileBoard(direction),
    'motion-storyboard.svg': motionBoard(direction),
    'signature-system-contact-sheet.svg': signatureBoard(direction),
    'typography-study.svg': typographyBoard(direction),
  };
  for (const [fileName, source] of Object.entries(boards)) {
    await writeFile(path.join(directionRoot, fileName), source, 'utf8');
  }
}

stdout.write(`Generated ${directions.length * 5} Checkpoint 2 SVG boards in ${outputRoot}\n`);
