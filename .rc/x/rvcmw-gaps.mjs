// Reviewer cm-world (Release AZ), never committed. Seam 8 (iii): fillSquadGaps reads the UNSEEDED market. On a
// seeded career whose seniors all walk (no contract renewed), the emergency signings come off the unseeded world:
// is each of them a man the seeded world holds at another club, and once I sell him, do two clubs list him?
// Run from the repo root: node .rc/x/rvcmw-gaps.mjs
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
const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n", resolveDir: ROOT, sourcefile: 'g.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
const script = new vm.Script(out.outputFiles[0].text);
async function fresh() {
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('offline')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
  return { ...module.exports, store };
}
function tape(seed, action) {
  let st = seed >>> 0; const original = Math.random;
  Math.random = () => { st = (st + 0x6d2b79f5) >>> 0; let v = st; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return action(); } finally { Math.random = original; }
}
let elsewhere = 0, signedTotal = 0, twoClubs = 0; const lines = [];
for (const [club, era, seed] of [['Everton', 'now', 1], ['Lincoln City', 'now', 2], ['Real Betis', 'era2020', 3], ['Blackburn Rovers', 'era2010', 4], ['Eibar', 'era2015', 5], ['Brentford', 'now', 6]]) {
  const M = await fresh();
  let s = tape(seed, () => M.cm.startCareer(club, era));
  for (let season = 1; season <= 2; season += 1) {
    for (let i = 0; i < 240; i += 1) { const r = tape(seed * 1000 + season * 300 + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })); s = r.state; if (r.kind === 'seasonOver') break; }
    s = tape(seed + 50 + season, () => M.cm.finishSeason(s).state);
    /* Season two ends with no senior renewed: every man of 20 or more walks at the rollover. */
    if (season === 2) s = { ...s, squad: s.squad.map(p => (!p.isYouth && p.age >= 20 ? { ...p, contractYears: 0 } : p)) };
    s = tape(seed + 70 + season, () => M.cm.startNextSeason(s));
  }
  const y = M.cm.yearsOn(s); const world = M.eras.projectedWorldFor(s.eraId ?? 'now', y, s.worldSeed);
  const keyless = s.squad.filter(p => !p.worldRosterKey && !p.isYouth && !p.academyGrad && p.age >= 20);
  const news = (s.freeAgentsIn ?? s.seasonFreeAgents ?? []);
  for (const p of keyless) {
    const held = Object.keys(world).filter(c => M.cm.worldRosterFor(s, c).some(q => q.n === p.name));
    if (!held.length) continue;
    signedTotal += 1; elsewhere += 1;
    lines.push(`${club} ${era} season ${s.season}: ${p.name} (${p.position}, ${p.age}, rated ${p.rating}) is in my squad and the seeded world also holds him at ${held.join(', ')} (rated ${M.cm.worldRosterFor(s, held[0]).find(q => q.n === p.name).r})`);
    const buyer = Object.keys(world).find(c => c !== s.clubName && !held.includes(c) && !s.leagueClubs.includes(c));
    const sold = tape(seed + 99, () => M.cm.acceptBid({ ...s, transferWindow: 'summer', incomingBids: [{ playerId: p.id, playerName: p.name, club: buyer, offer: 5, status: 'open' }] }, p.id));
    if (!sold) { lines.push(`  (the sale to ${buyer} was refused)`); continue; }
    const at = [buyer, ...held].filter(c => M.cm.oppRosterFor(sold, c).some(q => q.n === p.name));
    if (at.length > 1) twoClubs += 1;
    lines.push(`  sold to ${buyer}: now listed by ${at.length} clubs (${at.join(', ')})`);
    break;
  }
  lines.push(`${club}: ${keyless.length} keyless seniors after the emergency summer (news ${JSON.stringify(news).slice(0, 120)})`);
}
for (const l of lines) console.log(l);
console.log(`rvcmw-gaps: ${elsewhere} emergency signings held elsewhere by the seeded world; ${twoClubs} listed by two clubs once sold`);
