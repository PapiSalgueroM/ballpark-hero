/* Round 1344 runner helper, never committed: bundle the engine and the world ledger of a source root (for example an
   exported copy with the measurement probe applied) into ESM files the way PR269's own harness does, so its unit
   test can import them through CM_AI_E and CM_AI_W while vitest runs in the real checkout.
   node pr269bundle.mjs <source root> <out dir> */
import path from 'node:path';
import fs from 'node:fs';
const [root, out] = process.argv.slice(2).map(p => path.resolve(p));
if (!root || !out) { console.error('pr269bundle: say <source root> <out dir>'); process.exit(2); }
const esbuild = await import(path.resolve('node_modules/esbuild/lib/main.js'));
fs.mkdirSync(out, { recursive: true });
await esbuild.build({ entryPoints: { engine: path.join(root, 'src/lib/clubManager.ts'), world: path.join(root, 'src/lib/clubManagerWorldRoster.ts') },
  outdir: out, bundle: true, splitting: true, format: 'esm', platform: 'node', outExtension: { '.js': '.mjs' },
  alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
console.log(`pr269bundle: ${fs.readdirSync(out).filter(f => f.endsWith('.mjs')).length} files from ${root} in ${out}`);
