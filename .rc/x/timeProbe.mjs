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
// Release AZ, advice 15: what a market build and a league matchday cost on a seeded save holding a few hundred
// ledger records, fresh and with every record a year behind, against the same save with no ledger and the base.
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
function time(label, fn, n = 7) { const t = []; for (let i = 0; i < n; i += 1) { const a = performance.now(); fn(); t.push(performance.now() - a); } return `${label} ${median(t).toFixed(1)} ms`; }
const out = [];
for (const base of [false, true]) {
  const fresh = await engine(base);
  const M = await fresh(); Math.random = seeded(0x7171);
  let s = { ...M.cm.startCareer('Everton'), budget: 99999, wageCap: 99999, transferWindow: 'summer' };
  s = M.cm.finishSeason((() => { let x = s; for (let i = 0; i < 260; i += 1) { const r = M.cm.playNextEntry(x, { skipHalftime: true, noCoach: true }); x = r.state; if (r.kind === 'seasonOver') return x; } return x; })()).state;
  s = { ...M.cm.startNextSeason(s), budget: 99999, wageCap: 99999, transferWindow: 'summer' };
  let deals = 0;
  for (let k = 0; k < 900 && deals < 300; k += 1) {
    const have = new Set(s.squad.map(p => p.name));
    const mp = M.cm.buildMarket(s).filter(p => p.position !== 'GK' && !have.has(p.name))[k % 40];
    const b = mp && M.cm.buyPlayer(s, mp); if (!b) continue;
    const man = b.squad.find(p => p.name === mp.name); const r = man && M.cm.releasePlayer(b, man.id);
    if (r) { s = { ...r, budget: 99999, wageCap: 99999 }; deals += 1; }
  }
  const held = M.ledger ? M.ledger.readWorldRoster(s) : null;
  const stale = { ...s, startYear: s.startYear + 1 };
  const plain = { ...s }; delete plain.worldRoster;
  const tree = base ? 'b6eb78e7' : 'head';
  out.push(`${tree}: ${deals} buy and release pairs, ledger ${held ? held.records.length + ' records' : 'none'}, save ${JSON.stringify(s).length} code units`);
  out.push(`${tree}: ${time('buildMarket', () => M.cm.buildMarket(s))}; ${time('matchday', () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }))}`);
  if (!base) {
    out.push(`${tree} stale a year: ${time('buildMarket', () => M.cm.buildMarket(stale))}; ${time('matchday', () => M.cm.playNextEntry(stale, { skipHalftime: true, noCoach: true }))}`);
    out.push(`${tree} same save, no ledger: ${time('buildMarket', () => M.cm.buildMarket(plain))}; ${time('matchday', () => M.cm.playNextEntry(plain, { skipHalftime: true, noCoach: true }))}`);
  }
}
for (const l of out) console.log(l);
console.log('timeProbe: done');
