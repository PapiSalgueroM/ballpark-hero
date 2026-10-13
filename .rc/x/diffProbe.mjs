// Release AZ fix pass 3 probe (never committed): which field of the state after the summer rollover moved between
// two trees. Usage: node diffProbe.mjs <treeDir> <outFile>. Plays three seeded careers one season, rolls over, and
// writes the JSON of each state after the rollover. Compare two outputs with: node diffProbe.mjs --diff a.json b.json
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

function leafDiff(a, b, at, out) {
  if (out.length >= 60) return;
  if (a === b) return;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    out.push(`${at}: ${JSON.stringify(a)?.slice(0, 120)} | ${JSON.stringify(b)?.slice(0, 120)}`); return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) leafDiff(a[k], b[k], `${at}.${k}`, out);
}

if (process.argv[2] === '--diff') {
  const a = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const b = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  for (const k of Object.keys(a)) {
    const out = [];
    leafDiff(a[k], b[k], k, out);
    console.log(`${k}: ${out.length} differing leaves${out.length >= 60 ? ' (first 60)' : ''}`);
    for (const line of out) console.log(`  ${line}`);
  }
  process.exit(0);
}

const ROOT = path.resolve(process.argv[2]);
const OUT = process.argv[3];
async function engine() {
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
  const script = new vm.Script(out.outputFiles[0].text);
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, performance,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx); if (module.exports.eras.ensureAllEraRosters) await module.exports.eras.ensureAllEraRosters();
  return module.exports;
}
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const { cm } = await engine();
const result = {};
for (const [i, club] of ['Arsenal', 'Real Madrid', 'Ajax'].entries()) {
  Math.random = mulberry32(4242 + i);
  let s = cm.startCareer(club);
  for (let k = 0; k < 160; k++) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  const next = cm.startNextSeason(s);
  result[club] = JSON.parse(JSON.stringify(next));
}
fs.writeFileSync(OUT, JSON.stringify(result));
console.log(`diffProbe: wrote ${Object.keys(result).length} states to ${OUT}`);
