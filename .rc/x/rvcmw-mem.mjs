// Reviewer cm-world (Release AZ), never committed. The projected world cache (clubManagerEras.ts WORLD_CACHE) is
// never emptied and since Round 1250 is keyed by the seed too. Heap held by fifteen world years, unseeded, then one
// seed, then a second seed (a second career in the same tab), and the time to build one seeded world year.
// Run: node --expose-gc .rc/x/rvcmw-mem.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const lf = s => s.split('\r\n').join('\n');
const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
  const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
  if (!rel.startsWith('src/')) return null;
  return { contents: lf(fs.readFileSync(args.path, 'utf8')), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
}); } };
const out = await build({ stdin: { contents: "export * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, sourcefile: 'm.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
const module = { exports: {} };
const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date,
  URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, fetch: () => Promise.reject(new Error('offline')),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} } });
new vm.Script(out.outputFiles[0].text).runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
const E = module.exports.eras;
const heap = () => { global.gc(); global.gc(); return process.memoryUsage().heapUsed / 1048576; };
let h0 = heap();
for (const [label, seed] of [['unseeded', undefined], ['seed A', 123456], ['seed B', 987654]]) {
  let ms = 0;
  for (let y = 1; y <= 15; y += 1) { const t = performance.now(); E.projectedWorldFor('now', y, seed); ms += performance.now() - t; }
  const h1 = heap();
  console.log(`${label}: 15 world years held ${(h1 - h0).toFixed(1)} MB more; built in ${Math.round(ms)} ms (${Math.round(ms / 15)} ms a year on average)`);
  h0 = h1;
}
console.log('rvcmw-mem: done');
