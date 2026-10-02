/**
 * Round 840: writes the home page's static copy into index.html from
 * src/data/homeCopy.ts, between the home-copy markers.
 *
 * The React home renders the same module below the game tiles, so a crawler
 * that runs JavaScript and one that does not read the same words. Run this
 * after any edit to the module and commit index.html with it. Nothing runs it
 * for you; scripts/simHomeCopy.mjs section 6 fails while the committed block
 * and the module disagree.
 *
 * Run: node scripts/genHomeCopy.mjs
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { withHomeCopy } from './lib/homeCopyHtml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-gen-home-copy-${process.pid}-`));
const out = path.join(temp, 'homeCopy.cjs');
try {
  await build({
    entryPoints: [path.join(ROOT, 'src/data/homeCopy.ts')],
    bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') },
  });
  const { HOME_COPY } = createRequire(import.meta.url)(out);
  const file = path.join(ROOT, 'index.html');
  const before = fs.readFileSync(file, 'utf8');
  const after = withHomeCopy(before, HOME_COPY);
  if (after === before) {
    console.log('genHomeCopy: index.html already carries the module\'s copy, nothing written');
  } else {
    fs.writeFileSync(file, after);
    console.log('genHomeCopy: wrote the home copy into index.html; commit it with src/data/homeCopy.ts');
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
