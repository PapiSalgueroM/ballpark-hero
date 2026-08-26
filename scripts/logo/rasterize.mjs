/**
 * Round 286: every raster asset from the generated SVGs, so the PNGs can never
 * drift from the mark. Run after gen_logo.py.
 *
 *   node scripts/logo/rasterize.mjs
 *
 * Writes into public/: favicon-16.png, favicon-32.png, apple-touch-icon.png
 * (180), icon-192.png, icon-512.png, og-image.png (1200 by 630). The .ico is
 * assembled by gen_logo.py's sibling step in Python, because sharp does not
 * write ICO containers.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '/home/claude/.npm-global/lib/node_modules/sharp/lib/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(HERE, '..', '..', 'public');
const src = f => path.join(PUBLIC, f);

const jobs = [
  ['favicon.svg', 'favicon-16.png', 16],
  ['favicon.svg', 'favicon-32.png', 32],
  ['favicon.svg', 'apple-touch-icon.png', 180],
  ['favicon.svg', 'icon-192.png', 192],
  ['favicon.svg', 'icon-512.png', 512],
  [path.join(HERE, 'og-image.svg'), 'og-image.png', 1200],
];
for (const [from, to, width] of jobs) {
  const input = path.isAbsolute(from) ? from : src(from);
  await sharp(input, { density: 400 }).resize({ width }).png({ compressionLevel: 9 }).toFile(src(to));
  console.log(`wrote ${to} (${width}px wide)`);
}
