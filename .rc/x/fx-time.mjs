// Release AZ fixer probe (never committed): a seeded career's market and matchday cost, against the same save with
// its seed and ledger taken off. cold = a fresh copy of the save (new ledger object, every cache of it empty),
// warm = a second save object that shares the ledger (a formation tap). Run from the repo root.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const SEASONS = Number(process.env.FX_SEASONS || 15);
const CLUBS = (process.env.FX_CLUBS || 'Everton,Real Madrid').split(',');
async function engine() {
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n", resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
  const script = new vm.Script(out.outputFiles[0].text);
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, performance,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
  return module.exports;
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const ms = fn => { const a = performance.now(); fn(); return performance.now() - a; };
const M = await engine();
const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.worldSeed; delete c.worldRoster; return c; };
for (const club of CLUBS) {
  Math.random = seeded(0x51ce);
  let s = M.cm.startCareer(club);
  for (let k = 1; k <= SEASONS; k += 1) {
    if (k % 5 === 0) {
      const held = M.ledger.readWorldRoster(s);
      const cold = [], warm = [], sCold = [], sWarm = [], day = [], sDay = [];
      for (let i = 0; i < 3; i += 1) {
        const copy = JSON.parse(JSON.stringify(s)); cold.push(ms(() => M.cm.buildMarket(copy)));
        warm.push(ms(() => M.cm.buildMarket({ ...copy, formation: copy.formation })));
        const bare = strip(s); sCold.push(ms(() => M.cm.buildMarket(bare))); sWarm.push(ms(() => M.cm.buildMarket({ ...bare })));
        const r = Math.random; Math.random = seeded(7 + i);
        day.push(ms(() => M.cm.playNextEntry(JSON.parse(JSON.stringify(s)), { skipHalftime: true, noCoach: true })));
        Math.random = seeded(7 + i);
        sDay.push(ms(() => M.cm.playNextEntry(strip(s), { skipHalftime: true, noCoach: true })));
        Math.random = r;
      }
      console.log(`${club} s${k}: ledger ${held ? held.records.length : 0}; market cold ${median(cold).toFixed(1)} warm ${median(warm).toFixed(1)} | stripped ${median(sCold).toFixed(1)} / ${median(sWarm).toFixed(1)} ms; matchday ${median(day).toFixed(1)} vs ${median(sDay).toFixed(1)} ms`);
    }
    for (let i = 0; i < 260; i += 1) { const r = M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state; if (r.kind === 'seasonOver') break; }
    s = M.cm.finishSeason(s).state; if (k < SEASONS) s = M.cm.startNextSeason(s);
  }
}
console.log('fx-time: done');
