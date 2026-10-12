// Round 1308 review (run lens): with the GM desk's edges ON, is the bracket path (nflPlayTie through playBracketAll)
// still the one press path (runPlayoffs with the same edges), game for game and champion? Over many seasons, three
// edge sets: none, the unit test's made up set, and a real desk's (+3 strength points on his club, the most the NFL
// staff pack gives: 0.72 x 3 + 0.28 x 3). Exit 1 when any season differs. Run on the head (must be 0) and with
// .rc/x/mut.mjs edges applied (the desk's points dropped from the playoff game, kept in the telling).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const SEASONS = Number(process.env.SEASONS || 300);
const out = path.join(os.tmpdir(), `probe-edges-${process.pid}.mjs`);
await build({
  stdin: { contents: [
    "export * as E from './src/lib/frontOffice.ts';",
    "export * as B from './src/lib/gmBracket.ts';",
    "export * as NP from './src/lib/frontOfficePostseason.ts';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
});
const { E, B, NP } = await import(pathToFileURL(out).href);
fs.unlinkSync(out);
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const copy = x => JSON.parse(JSON.stringify(x));
const testEdges = lg => Object.fromEntries(Object.keys(lg.teams).sort().filter((_, i) => i % 5 === 0).map((a, i) => [a, i % 2 ? -1.5 : 2.5]));

const format = NP.NFL_POSTSEASON.formatFor(2026);
const differ = { none: 0, test: 0, desk: 0 };
const deskTitles = { one: 0, bracket: 0 };
let first = '';
for (let i = 0; i < SEASONS; i += 1) {
  const rng = mulberry(5000 + i);
  const real = Math.random; Math.random = rng;
  const lg = E.initLeague(Math.random, {});
  for (let w = 1; w <= E.REGULAR_WEEKS; w += 1) { E.injuryPass(lg.teams, Math.random); E.aiWeeklyMoves(lg, 'BUF', Math.random); for (const g of lg.schedule[lg.week - 1]) E.simGame(g, lg.teams, Math.random); if (lg.week < E.REGULAR_WEEKS) lg.week += 1; }
  Math.random = real;
  const seeds = NP.NFL_POSTSEASON.seeds(lg);
  const his = seeds[i % 14];
  for (const kind of ['none', 'test', 'desk']) {
    const edges = kind === 'none' ? undefined : kind === 'test' ? testEdges(lg) : { [his]: 3 };
    const a = copy(lg.teams);
    const one = E.runPlayoffs(a, mulberry(7000 + i), edges);
    const oneGames = one.rounds.flatMap(r => r.games.map(g => `${r.name}|${g.home}|${g.away}|${g.winner}`));
    const b = copy(lg.teams);
    const save = B.playBracketAll(format, B.openBracket(format, lg.season, seeds), NP.nflPlayTie(b, mulberry(7000 + i), lg.season, edges, []));
    const bGames = B.bracketRounds(format, save).flatMap(r => r.games.map(g => `${r.name}|${g.home}|${g.away}|${g.winner}`));
    const champ = B.bracketChampion(format, save);
    if (kind === 'desk') { if (one.champion === his) deskTitles.one += 1; if (champ === his) deskTitles.bracket += 1; }
    if (JSON.stringify(oneGames) !== JSON.stringify(bGames) || one.champion !== champ) {
      differ[kind] += 1;
      if (!first) first = `season ${i} (${kind}): first differing game ${oneGames.find((g, k) => g !== bGames[k]) ?? 'none'} against ${bGames.find((g, k) => g !== oneGames[k]) ?? 'none'}; champions ${one.champion} and ${champ}`;
    }
  }
}
if (first) console.log(`  ${first}`);
console.log(`desk club's titles over ${SEASONS} seasons: one press ${deskTitles.one}, bracket path ${deskTitles.bracket}`);
const total = differ.none + differ.test + differ.desk;
console.log(`probeEdges: ${SEASONS} seasons; seasons where the bracket path is not the one press path: no edges ${differ.none}, the unit test's edges ${differ.test}, a real desk's +3 ${differ.desk}`);
process.exit(total === 0 ? 0 : 1);
