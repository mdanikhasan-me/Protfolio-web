import { Buffer } from 'node:buffer';
import console from 'node:console';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const cataloguePath = path.join(root, 'docs/hinode/vegetation-catalogue.json');
const renderDirectory = path.join(root, 'artifacts/hinode/vegetation/renders');
const outputPath = path.join(
  root,
  'artifacts/hinode/vegetation/hinode-vegetation-contact-sheet-4k.png',
);
const catalogue = JSON.parse(await fs.readFile(cataloguePath, 'utf8'));

const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const panels = await Promise.all(
  catalogue.assets.map(async (asset) => {
    const source = path.join(
      renderDirectory,
      `${path.basename(asset.sourceFilename, path.extname(asset.sourceFilename))}.png`,
    );
    const [width, depth, height] = asset.dimensionsMetres;
    const overlay = Buffer.from(`
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <style>
          .title { font: 700 28px Arial, sans-serif; fill: #f2f5fa; letter-spacing: 1px; }
          .meta { font: 500 18px Arial, sans-serif; fill: #a8bad1; }
          .view { font: 700 15px Arial, sans-serif; fill: #6f8bab; letter-spacing: 2px; }
          .scale { font: 600 15px Arial, sans-serif; fill: #d7e0eb; }
        </style>
        <rect x="0" y="0" width="1280" height="92" fill="#07101f" fill-opacity=".94"/>
        <rect x="0" y="638" width="1280" height="82" fill="#07101f" fill-opacity=".94"/>
        <text x="28" y="38" class="title">${escape(asset.sourceFilename)}</text>
        <text x="28" y="72" class="meta">${escape(asset.assetFamily)} / variant ${asset.variant ?? '--'} / ${asset.triangleCount.toLocaleString()} tris</text>
        <text x="200" y="120" text-anchor="middle" class="view">FRONT</text>
        <text x="640" y="120" text-anchor="middle" class="view">SIDE</text>
        <text x="1060" y="120" text-anchor="middle" class="view">THREE-QUARTER</text>
        <text x="28" y="674" class="scale">Bounds ${width.toFixed(2)} x ${depth.toFixed(2)} x ${height.toFixed(2)} m / height ${height.toFixed(2)} m</text>
        <circle cx="800" cy="671" r="8" fill="#fa2658"/>
        <text x="818" y="677" class="scale">1.8 m human</text>
        <rect x="1015" y="663" width="24" height="14" fill="#20c8ed"/>
        <text x="1050" y="677" class="scale">Hinode coupe</text>
        <rect x="0" y="0" width="1279" height="719" fill="none" stroke="#29405d" stroke-width="2"/>
      </svg>
    `);
    return sharp(source)
      .composite([{ input: overlay }])
      .png()
      .toBuffer();
  }),
);

await sharp({
  create: {
    width: 3840,
    height: 2160,
    channels: 4,
    background: '#050b15',
  },
})
  .composite(
    panels.map((input, index) => ({
      input,
      left: (index % 3) * 1280,
      top: Math.floor(index / 3) * 720,
    })),
  )
  .png()
  .toFile(outputPath);

console.log(`Vegetation contact sheet: ${outputPath}`);
