/* rv-probe1.mjs (review scratch, never committed). Plays the real engine on a seed, the harness's own fleet
   loop, and prints what a player would be told. Reads nothing but the bundle. No network.
   Usage: node .tmp-fx/rv-probe1.mjs [careers] [seed] */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CAREERS = Number(process.argv[2] || 600);
const SEED = Number(process.argv[3] || 1);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const out = path.join(process.env.RV_TMP || os.tmpdir(), `rv-probe1-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    "export * as nba from './src/lib/nbaMyCareer.ts';",
    "export * as awards from './src/lib/careerAwards.ts';",
    "export { NBA_CAREER_HALL } from './src/lib/nbaCareerHall.ts';",
    "export { hallRecordFor } from './src/lib/careerHallOfFame.ts';",
    "export * as norms from './src/data/nbaLeagueNorms.ts';",
    "export * as nbaAwards from './src/lib/nbaCareerAwards.ts';",
    "export { nbaStatLine } from './src/lib/usCareerStatLine.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error', outfile: out, alias: { '@': path.join(ROOT, 'src') },
});
const E = await import(pathToFileURL(out).href);
const { nba } = E;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const rnd = mulberry32(SEED); Math.random = rnd;
const S = []; const C = [];
for (let i = 0; i < CAREERS; i++) {
  const pos = POS[i % 5]; const arch = nba.NBA_ARCHETYPES[pos][i % 3]; const era = i % 4 === 3 ? 'y2004' : 'now';
  const c = nba.startNbaCareer(`Sim ${i}`, pos, arch, rnd, null, era === 'y2004' ? 'y2004' : undefined);
  let tq = nba.nbaRollTeamQuality(null, rnd); nba.nbaAssignRole(c, tq, rnd);
  let guard = 0; let done = false;
  while (!done && guard++ < 30) {
    if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 }); }
    else { nba.nbaCampBattle(c, tq, rnd); const fan = c.fanbase; const role = c.role ?? 'starter'; const n = c.seasons.length; const { line, notes } = nba.simNbaSeason(c, tq, rnd); S.push({ i, pos, arch: arch.id, era, role, n, fan, line, notes }); }
    nba.nbaProgress(c, rnd);
    const ev = nba.drawNbaEvent(c, rnd); if (ev) { const pick = ev.options[Math.floor(rnd() * ev.options.length)]; pick.apply(c, rnd); }
    tq = nba.nbaRollTeamQuality(tq, rnd);
    if (nba.nbaShouldRetire(c)) done = true;
  }
  C.push({ i, pos, arch: arch.id, era, c });
}
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
const awardsOf = c => c.seasons.flatMap(s => s.awards ?? []);
const withAward = C.filter(k => awardsOf(k.c).length > 0);
const tileBefore = k => k.c.rings + k.c.mvps + k.c.allNbas;
const tileAfter = k => tileBefore(k) + (k.c.allStars ?? 0);
const emptyBefore = withAward.filter(k => tileBefore(k) === 0);
const emptyAfter = withAward.filter(k => tileAfter(k) === 0);
console.log(`careers ${C.length}, seed ${SEED}; careers with any award on a season line: ${withAward.length} (${pct(withAward.length, C.length)})`);
console.log(`tile reads Empty while the case lists an award: before the fix ${emptyBefore.length} (${pct(emptyBefore.length, C.length)}), after ${emptyAfter.length} (${pct(emptyAfter.length, C.length)})`);
const tally = {}; for (const k of emptyAfter) for (const a of new Set(awardsOf(k.c))) tally[a] = (tally[a] ?? 0) + 1;
console.log(`what those careers hold (careers each): ${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(', ')}`);
const starOnly = C.filter(k => (k.c.allStars ?? 0) > 0 && tileBefore(k) === 0).length;
console.log(`All-Star with no ring, MVP or All-NBA: ${starOnly} (${pct(starOnly, C.length)})`);
