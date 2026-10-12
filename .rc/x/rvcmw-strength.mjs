// Reviewer cm-world (Release AZ), never committed. Does a seeded world (Round 1250's trajectory: breakouts, ceilings
// to 99) drift stronger or weaker than the original projection, while my own squad still ages on agePlayer with its
// 95 ceiling? Per era and world year: the mean best eleven of every club, of the twenty strongest clubs, the mean
// best player, and the count of men rated 95 or more, unseeded against six seeds. Run: node .rc/x/rvcmw-strength.mjs
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
const out = await build({ stdin: { contents: "export * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, sourcefile: 's.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
const module = { exports: {} };
const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date,
  URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, fetch: () => Promise.reject(new Error('offline')),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} } });
new vm.Script(out.outputFiles[0].text).runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
const E = module.exports.eras;
const xi = roster => { const r = roster.map(p => p.r).sort((a, b) => b - a).slice(0, 11); while (r.length < 11) r.push(60); return r.reduce((a, b) => a + b, 0) / 11; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function measure(era, y, seed) {
  const world = E.projectedWorldFor(era, y, seed); const clubs = Object.values(world).filter(r => r.length);
  const xis = clubs.map(xi).sort((a, b) => b - a);
  return { all: mean(xis), top20: mean(xis.slice(0, 20)), best: mean(clubs.map(r => Math.max(...r.map(p => p.r)))), elite: clubs.reduce((n, r) => n + r.filter(p => p.r >= 95).length, 0) };
}
const SEEDS = [11, 222, 3333, 44444, 555555, 6666666];
for (const era of ['now', 'era2010']) for (const y of [5, 10, 15]) {
  const base = measure(era, y, undefined);
  const seeded = SEEDS.map(s => measure(era, y, s));
  const f = k => `${k} ${base[k].toFixed(2)} vs seeded ${mean(seeded.map(m => m[k])).toFixed(2)} (${Math.min(...seeded.map(m => m[k])).toFixed(2)} to ${Math.max(...seeded.map(m => m[k])).toFixed(2)})`;
  console.log(`${era} y${y}: ${f('all')}; ${f('top20')}; ${f('best')}; ${f('elite')}`);
}
console.log('rvcmw-strength: done');
