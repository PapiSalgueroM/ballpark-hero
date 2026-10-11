// Review (run lens) of Round 1212: how the runs of a game are spread over its innings in the view, measured.
// Light: bundles the head's MLB binding and number file, plays FLEET hitter careers, derives every open season.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BUNDLE = path.join(os.tmpdir(), `review-run-innings-${process.pid}.mjs`);
await build({
  stdin: { contents: ["export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';", "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';", "export { MLB_SEASON } from './src/lib/season/mlb.ts';", "export { buildUsSeason } from './src/lib/season/us.ts';", "export { deriveSeasonOrWhy } from './src/lib/season/core.ts';"].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __rq } from 'node:module'; const require = __rq(import.meta.url);" },
});
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const M = await import(pathToFileURL(BUNDLE).href);
try { fs.unlinkSync(BUNDLE); } catch { /* a copy */ }
const SB = M.MLB_CAREER_SPORT;
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const FLEET = Number(process.env.FLEET || 24);
const POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const T = { teamGames: 0, runs: 0, scoringInnings: 0, max5: 0, max7: 0, max8: 0, oneInning4: 0, four: 0, oneInningAll: 0, scored: 0, seasons: 0, bothBig: 0, games: 0, feedLines: 0, hisHr: 0, hrGames: 0 };
const maxHist = {};
const examples = [];
let over9 = 0; let over17 = 0;
for (let i = 0; i < FLEET; i += 1) {
  const rng = mulberry32(i * 7919 + 4242);
  const real = Math.random; Math.random = rng;
  try {
    const pos = POS[i % POS.length];
    const c = SB.startCareer(`Innings ${i}`, pos, SB.create.archetypes[pos][i % SB.create.archetypes[pos].length], rng, null, 'now');
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let n = 0; n < 6 && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng); continue; }
      if (c.contractYears <= 0) { const fa = SB.buildFaWindow(c, tq, rng); const o = fa.offers.find(x => !x.gone) ?? fa.offers[0]; if (o) { M.applyFaSigning(c, o); SB.campBattle(c, o.quality, rng); tq = o.quality; } }
      SB.campBattle(c, tq, rng);
      const { line } = SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      const b = M.buildUsSeason(M.MLB_SEASON, c, line, SB.teamLabelOf);
      if (b.ok) {
        const s = M.deriveSeasonOrWhy(b.sport, line, b.ctx);
        if (typeof s !== 'string') {
          T.seasons += 1;
          for (const g of s.games) {
            T.games += 1;
            T.feedLines += g.events.length;
            const big = [];
            for (const side of ['us', 'them']) {
              const by = {};
              for (const e of g.events) if (e.kind === 'inning' && e.side === side) by[e.min] = (by[e.min] ?? 0) + (e.pts ?? 0);
              const vals = Object.values(by);
              const total = side === 'us' ? g.us : g.them;
              const mx = vals.length ? Math.max(...vals) : 0;
              T.teamGames += 1; T.runs += total; T.scoringInnings += vals.length;
              maxHist[mx] = (maxHist[mx] ?? 0) + 1;
              if (mx > 9) over9 += 1; if (mx > 17) over17 += 1;
              if (mx >= 14) examples.push(`career ${i} (${pos} ${line.team} ${line.year}) game ${g.md}: ${side === 'us' ? 'his side' : 'the other side'} puts ${mx} on the board in inning ${Object.keys(by).find(k => by[k] === mx)} of a ${g.us}-${g.them} game`);
              if (mx >= 5) T.max5 += 1; if (mx >= 7) T.max7 += 1; if (mx >= 8) T.max8 += 1;
              if (total > 0) { T.scored += 1; if (vals.length === 1) T.oneInningAll += 1; }
              if (total >= 4) { T.four += 1; if (vals.length === 1) T.oneInning4 += 1; }
              big.push(mx);
            }
            if (big[0] >= 5 && big[1] >= 5) T.bothBig += 1;
          }
        }
      }
      if (SB.shouldRetire(c)) break;
      tq = SB.rollTeamQuality(tq, rng);
    }
  } finally { Math.random = real; }
}
const pct = (a, b) => `${(100 * a / Math.max(1, b)).toFixed(1)}%`;
console.log(`seasons ${T.seasons}, games ${T.games}, team games ${T.teamGames}, runs a team game ${(T.runs / T.teamGames).toFixed(2)}`);
console.log(`innings a team scores in, a game: ${(T.scoringInnings / T.teamGames).toFixed(2)} (of 9: ${pct(T.scoringInnings, 9 * T.teamGames)} of its innings)`);
console.log(`team games whose biggest inning is 5 or more: ${pct(T.max5, T.teamGames)}; 7 or more: ${pct(T.max7, T.teamGames)}; 8 or more: ${pct(T.max8, T.teamGames)}`);
console.log(`team games that scored: all the runs in ONE inning ${pct(T.oneInningAll, T.scored)}; with 4 runs or more: all in one inning ${pct(T.oneInning4, T.four)} (${T.oneInning4} of ${T.four})`);
console.log(`games in which BOTH sides have an inning of 5 or more: ${pct(T.bothBig, T.games)}; feed lines a game ${(T.feedLines / T.games).toFixed(2)}`);
console.log(`team games with an inning of MORE THAN 9 runs (the score law's own cap an inning): ${over9} of ${T.teamGames} (${pct(over9, T.teamGames)}), about ${(324 * over9 / T.teamGames).toFixed(1)} a season watched; more than 17 (the modern record): ${over17}`);
for (const e of examples.slice(0, 8)) console.log(`  ${e}`);
console.log(`biggest inning of a team game, share by runs: ${Object.keys(maxHist).sort((a, b) => a - b).map(k => `${k}: ${pct(maxHist[k], T.teamGames)}`).join(', ')}`);
