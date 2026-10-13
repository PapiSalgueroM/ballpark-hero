// Release AZ fixer probe (never committed): simFreeAgents section 17 on a seeded career. What keeps the released
// man off the market once releasedNames and goneNames are taken away. Run from the repo root.
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as w from './src/lib/clubManagerWorldRoster';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const module = { exports: {} }; const store = new Map();
const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date,
  URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, performance,
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text).runInContext(ctx);
const { cm, w } = module.exports;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const real = Math.random;
const seeded = (seed, fn) => { Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
const st = seeded(7700, () => cm.startCareer('Everton'));
cm.ensureFreeAgents(st);
const shelf = cm.buildMarket({ ...st, squad: [] });
const pick = st.squad.filter(p => !p.isYouth && !p.generated && cm.releaseBlock(st, p) === null)
  .map(p => ({ p, mp: shelf.find(m => m.name === p.name) })).filter(x => x.mp && x.mp.price <= st.budget).sort((a, b) => a.mp.price - b.mp.price)[0];
console.log('seed', st.worldSeed, 'season', st.season, 'pick', pick?.p.name);
const rel = cm.releasePlayer(st, pick.p.id);
const held = w.readWorldRoster ? w.readWorldRoster(rel) : null;
console.log('ledger after release:', rel.worldRoster ? Object.keys(rel.worldRoster).join(',') : 'none', 'records', held ? held.records.map(r => `${r.player.name}:${r.status}:${r.owner}:${r.origin.club}`).join(' ; ') : 'unreadable');
const later = { ...rel, transferWindow: 'summer', windowWeeksLeft: 4, goneNames: [], freeAgents: (rel.freeAgents ?? []).filter(f => f.name !== pick.p.name) };
const forgotten = { ...later, releasedNames: [] };
const name = pick.p.name;
console.log('market lists him, forgotten:', cm.buildMarket(forgotten).some(m => m.name === name));
const noLedger = { ...forgotten }; delete noLedger.worldRoster;
console.log('market lists him, forgotten and no ledger:', cm.buildMarket(noLedger).some(m => m.name === name));
const noSeed = { ...forgotten }; delete noSeed.worldSeed;
console.log('market lists him, forgotten and no seed:', cm.buildMarket(noSeed).some(m => m.name === name));
console.log('market lists him with the list, no ledger:', cm.buildMarket((() => { const c = { ...later }; delete c.worldRoster; return c; })()).some(m => m.name === name));
