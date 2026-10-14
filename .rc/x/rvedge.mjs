// Reviewer probe (Round 1331 review). Runner only. From a tree root: node <this file> <label>
// Plays simCmSubs' press fleet shape (wider) on the tree's engine and, for every bigGame question asked at a
// whistle, measures the engine's own edge against the fixture the question names (the next one). A bigGame
// line claims "on paper are a level above you", which the engine asks only at edge - 7 <= -6. Prints how many
// questions make that claim about a club the engine does not rate a level above.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const label = process.argv[2] ?? 'tree';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rvedge-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
if (cm.ensureAllEraRosters) await cm.ensureAllEraRosters();
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const SEEDS = Number(process.env.RV_SEEDS ?? 8), MATCHES = 38;
let asked = 0, untrue = 0;
const samples = [];
for (let k = 0; k < SEEDS; k++) {
  for (const [club, era] of [['Liverpool', null], ['Everton', null], ['Barcelona', null], ['Burnley', null], ['Brentford', null], ['Getafe', null]]) {
    let s = withSeed(9100 + 37 * k, () => (era ? cm.startCareer(club, era) : cm.startCareer(club)));
    for (let i = 0, played = 0; played < MATCHES && i < MATCHES * 3; i++) {
      const before = s.press?.pending ?? null;
      const week = s.week;
      const last = cm.nextFixture(s);
      const r = withSeed(9100 + 37 * k + 1000 * i, () => cm.playNextEntry(s, { skipHalftime: true }));
      if (r.kind === 'seasonOver') break;
      s = r.state;
      if (r.kind !== 'match') continue;
      played += 1;
      const q = s.press?.pending ?? null;
      if (!q || q === before || s.press.lastWeek !== week || q.kind !== 'bigGame') continue;
      asked += 1;
      const next = cm.nextFixtureFrom(s, s.week);
      const eNext = cm.matchEdge(s, next);
      const claimNotTrue = eNext === null || eNext - 7 > -6;
      if (claimNotTrue) { untrue += 1; if (samples.length < 6) samples.push(`${club} s${k} m${played}: "${q.text.slice(0, 60)}" edge vs ${next.opponent} ${eNext?.toFixed?.(1)} (just played ${last.opponent})`); }
    }
  }
}
console.log(samples.join('\n'));
console.log(`RVEDGE ${label}: bigGame asked ${asked}, of them about a club the engine does not rate a level above ${untrue}`);
