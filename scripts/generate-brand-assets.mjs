import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const size = 512;
const channels = 4;
const pixels = Buffer.alloc(size * size * channels);
const colours = {
  ink: [21, 26, 25, 255],
  paper: [238, 231, 213, 255],
  cobalt: [35, 78, 159, 255],
  yellow: [210, 161, 36, 255],
};

function fill(colour) {
  for (let index = 0; index < size * size; index += 1) {
    const offset = index * channels;
    pixels[offset] = colour[0];
    pixels[offset + 1] = colour[1];
    pixels[offset + 2] = colour[2];
    pixels[offset + 3] = colour[3];
  }
}

function square(gridX, gridY, colour) {
  const cell = 52;
  const origin = 48;
  const startX = origin + gridX * cell;
  const startY = origin + gridY * cell;
  const inset = 5;

  for (let y = startY + inset; y < startY + cell - inset; y += 1) {
    for (let x = startX + inset; x < startX + cell - inset; x += 1) {
      const offset = (y * size + x) * channels;
      pixels[offset] = colour[0];
      pixels[offset + 1] = colour[1];
      pixels[offset + 2] = colour[2];
      pixels[offset + 3] = colour[3];
    }
  }
}

fill(colours.ink);

const letterPixels = [
  [1, 1],
  [0, 2],
  [2, 2],
  [0, 3],
  [1, 3],
  [2, 3],
  [0, 4],
  [2, 4],
  [0, 5],
  [2, 5],
  [4, 1],
  [6, 1],
  [4, 2],
  [6, 2],
  [4, 3],
  [5, 3],
  [6, 3],
  [4, 4],
  [6, 4],
  [4, 5],
  [6, 5],
];

for (const [x, y] of letterPixels) {
  square(x, y, y === 3 ? colours.cobalt : colours.paper);
}

square(6, 6, colours.yellow);

const publicDirectory = resolve('public');
await mkdir(publicDirectory, { recursive: true });

const source = await sharp(pixels, {
  raw: { width: size, height: size, channels },
})
  .png({ compressionLevel: 9, palette: true })
  .toBuffer();

await sharp(source).toFile(resolve(publicDirectory, 'icon-512.png'));

for (const dimension of [192, 48, 32]) {
  await sharp(source)
    .resize(dimension, dimension, { kernel: 'nearest' })
    .png({ compressionLevel: 9, palette: true })
    .toFile(resolve(publicDirectory, `icon-${dimension}.png`));
}

globalThis.console.log('Generated original raster workshop marks at 32, 48, 192, and 512 pixels.');
