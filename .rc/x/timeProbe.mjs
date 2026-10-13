// Release AZ fix pass 3 probe (never committed): what the own club's base read costs a seeded career. My club's
// level now reads the UNSEEDED projection, so a seeded career builds one unseeded world a season beside its seeded
// one (cached after the first read). This times both cold, per world year, and a seeded rollover with each.
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
async function engine() {
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
  const script = new vm.Script(out.outputFiles[0].text);
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, performance,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx);
  return module.exports;
}
const { cm, eras } = await engine();
const rows = [];
for (const y of [1, 3, 5, 10, 15]) {
  const h0 = process.memoryUsage().heapUsed;
  let t = performance.now(); eras.projectedWorldFor('now', y, 12345); const seeded = performance.now() - t;
  const h1 = process.memoryUsage().heapUsed;
  t = performance.now(); eras.projectedWorldFor('now', y); const unseeded = performance.now() - t;
  const h2 = process.memoryUsage().heapUsed;
  rows.push({ y, seededMs: +seeded.toFixed(1), unseededMs: +unseeded.toFixed(1), seededMB: +((h1 - h0) / 1e6).toFixed(1), unseededMB: +((h2 - h1) / 1e6).toFixed(1) });
}
for (const r of rows) console.log(JSON.stringify(r));
