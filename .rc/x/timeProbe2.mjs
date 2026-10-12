// Release AZ, decision 9: one save measured in code units and in UTF-8 bytes, on this tree and on b6eb78e7.
// (a) Everton, Real Madrid, Lincoln City: fifteen seasons with no deal of mine (the SaveSize shape), the saved
//     string at the end; (b) a seeded career with deals (a buy, a sale, a release, a loan option each summer for
//     three seasons), the saved string and the ledger's share of it. Run from the repo root: node sizeProbe.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const BASE = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
async function engine(base) {
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!rel.startsWith('src/')) return null;
    const text = base ? execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }) : fs.readFileSync(args.path, 'utf8');
    return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
  }); } };
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n" + (base ? '' : "export * as ledger from './src/lib/clubManagerWorldRoster';\n"), resolveDir: ROOT, sourcefile: 'probe.ts', loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const script = new vm.Script(out.outputFiles[0].text);
  return async () => {
    const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
    class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
    const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
      URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval,
      localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
    script.runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
    return { ...module.exports, store };
  };
}
// Release AZ, advice 15, the realistic case: a seeded career played fifteen seasons with no deal of mine (the
// rollover's own exits write the ledger), timed at the start of seasons 5, 10 and 15.
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function time(fn, n = 5) { const t = []; for (let i = 0; i < n; i += 1) { const a = performance.now(); fn(); t.push(performance.now() - a); } return median(t).toFixed(1); }
const fresh = await engine(false);
for (const club of ['Everton', 'Real Madrid']) {
  const M = await fresh(); Math.random = seeded(0x51ce);
  let s = M.cm.startCareer(club);
  for (let k = 1; k <= 15; k += 1) {
    if (k === 5 || k === 10 || k === 15) {
      const held = M.ledger.readWorldRoster(s);
      console.log(`${club} season ${k}: ledger ${held ? held.records.length : 0} records; buildMarket ${time(() => M.cm.buildMarket(s))} ms; matchday ${time(() => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }))} ms`);
    }
    for (let i = 0; i < 260; i += 1) { const r = M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state; if (r.kind === 'seasonOver') break; }
    s = M.cm.finishSeason(s).state; if (k < 15) s = M.cm.startNextSeason(s);
  }
}
console.log('timeProbe2: done');
