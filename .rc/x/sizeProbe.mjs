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
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, sourcefile: 'probe.ts', loader: 'ts' },
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
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const measure = (M, s) => { M.store.clear(); M.cm.saveCareer(s); const raw = M.store.get(M.cm.SAVE_KEY);
  const led = s.worldRoster ? JSON.stringify(s.worldRoster) : '';
  return { units: raw.length, utf8: Buffer.byteLength(raw, 'utf8'), ledgerUnits: led.length, ledgerUtf8: Buffer.byteLength(led, 'utf8'), seeded: s.worldSeed !== undefined }; };
const season = (M, s) => { for (let i = 0; i < 260; i += 1) { const r = M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state; if (r.kind === 'seasonOver') return M.cm.finishSeason(s).state; } throw new Error('no season end'); };
const rows = [];
for (const base of [false, true]) {
  const fresh = await engine(base);
  for (const club of ['Everton', 'Real Madrid', 'Lincoln City']) {
    const M = await fresh(); Math.random = seeded(0x51ce);
    let s = M.cm.startCareer(club);
    for (let k = 1; k <= 15; k += 1) { s = season(M, s); if (k < 15) s = M.cm.startNextSeason(s); }
    rows.push({ tree: base ? 'b6eb78e7' : 'head', save: `${club}, 15 seasons, no deal`, ...measure(M, s) });
  }
  const M = await fresh(); Math.random = seeded(0xdea1);
  let s = M.cm.startCareer('Everton');
  for (let k = 1; k <= 4; k += 1) {
    s = { ...s, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
    const have = new Set(s.squad.map(p => p.name));
    const market = M.cm.buildMarket(s).filter(p => p.position !== 'GK' && !have.has(p.name));
    for (const mp of market.slice(0, 3)) { const n = M.cm.buyPlayer(s, mp); if (n) s = n; }
    const out = s.squad.filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => a.rating - b.rating);
    for (const p of out.slice(0, 2)) { const n = M.cm.releasePlayer(s, p.id); if (n) s = n; }
    const top = s.squad.filter(p => !p.onLoan && p.position !== 'GK').sort((a, b) => b.rating - a.rating)[2];
    if (top) { const n = M.cm.acceptBid({ ...s, incomingBids: [{ playerId: top.id, playerName: top.name, club: market[0].club, offer: 30, status: 'open' }] }, top.id); if (n) s = n; }
    s = season(M, s); s = M.cm.startNextSeason(s);
  }
  rows.push({ tree: base ? 'b6eb78e7' : 'head', save: 'Everton, four summers of deals', ...measure(M, s) });
}
for (const r of rows) console.log(JSON.stringify(r));
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'size-probe.json'), JSON.stringify(rows, null, 2));
console.log('sizeProbe: done');
