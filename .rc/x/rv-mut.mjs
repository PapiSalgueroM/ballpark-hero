/* rv-mut.mjs (review scratch, never committed). Applies ONE small mutation to a source file on the runner, or
   restores every file it touched. Each anchor must be in its file exactly once, and the swap must change it.
   Usage: node .rc/x/rv-mut.mjs <id>     |     node .rc/x/rv-mut.mjs restore */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const M = {
  /* off by one: the 2023-24 season itself carries no games bar */
  A: { file: 'src/lib/awardDecision.ts',
    find: '  return year >= rule.gamesBarFrom ? Math.ceil((rule.gamesBar / rule.gamesBarOf) * length) : 0;',
    put: '  return year > rule.gamesBarFrom ? Math.ceil((rule.gamesBar / rule.gamesBarOf) * length) : 0;' },
  /* dropped step: the awards read the raw line, the era's level is no longer divided out */
  B: { file: 'src/lib/nbaCareerAwards.ts',
    find: '  const now = nbaEraNeutral({ ppg: x.ppg, rpg: x.rpg, apg: x.apg, spg: x.spg, bpg: x.bpg }, x.year);',
    put: '  const now = { ppg: x.ppg, rpg: x.rpg, apg: x.apg, spg: x.spg, bpg: x.bpg };' },
  /* swapped argument: the rebounding title is judged against the assists leaders' bar */
  C: { file: 'src/lib/nbaCareerAwards.ts',
    find: "  const rebounding = title('reb', x.rpg, u7);",
    put: "  const rebounding = title('ast', x.rpg, u7);" },
  /* inverted branch: the fans alone pick the starters in the modern era, the weighted vote before it */
  D: { file: 'src/lib/nbaCareerAwards.ts',
    find: '    const fanShare = x.year >= R.allStarFanShareFrom ? R.allStarFanShare : 1;',
    put: '    const fanShare = x.year >= R.allStarFanShareFrom ? 1 : R.allStarFanShare;' },
  /* the lift proof must be able to fail: Front Office's win weight at 19 */
  E: { file: 'src/lib/nbaSeasonStats.ts',
    find: 'export const NBA_MVP_WIN_WEIGHT = 20;',
    put: 'export const NBA_MVP_WIN_WEIGHT = 19;' },
  /* the old save proof must be able to fail: an old season printed to one decimal */
  F: { file: 'src/lib/usCareerStatLine.ts',
    find: "export function nbaStatLine(s: NbaSeasonLine): string {\n  const one = isNum(s.mpg);",
    put: "export function nbaStatLine(s: NbaSeasonLine): string {\n  const one = true;" },
  /* stale constant: the real rule's 65 games typed as 62 in the data file */
  G: { file: 'src/data/nbaLeagueNorms.ts',
    find: '  gamesBarFrom: 2023, gamesBar: 65, gamesBarOf: 82,',
    put: '  gamesBarFrom: 2023, gamesBar: 62, gamesBarOf: 82,' },
  /* the legacy score of an old save must not move: the scale applied to every season, old lines included */
  H: { file: 'src/lib/nbaMyCareer.ts',
    find: '  const newPts = cal === 1 ? 0 : c.seasons.reduce((n, s) => n + (isNbaNewLine(s) ? s.ppg * s.games : 0), 0);',
    put: '  const newPts = cal === 1 ? 0 : c.seasons.reduce((n, s) => n + s.ppg * s.games, 0);' },
};

const BK = path.join('.rc', 'x', 'backup');
const id = process.argv[2];
if (id === 'restore') {
  for (const m of Object.values(M)) {
    const b = path.join(BK, m.file.replace(/\//g, '__'));
    if (existsSync(b)) copyFileSync(b, m.file);
  }
  console.log('restored');
  process.exit(0);
}
if (id === 'check') {
  /* read only: how many times each anchor sits in its file */
  for (const [k, v] of Object.entries(M)) console.log(k, v.file, readFileSync(v.file, 'utf8').replace(/\r\n/g, '\n').split(v.find).length - 1);
  process.exit(0);
}
const m = M[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(2); }
mkdirSync(BK, { recursive: true });
const b = path.join(BK, m.file.replace(/\//g, '__'));
if (!existsSync(b)) copyFileSync(m.file, b);
const src = readFileSync(m.file, 'utf8').replace(/\r\n/g, '\n');
const hits = src.split(m.find).length - 1;
if (hits !== 1) { console.error(`mutation ${id}: anchor found ${hits} times in ${m.file}, expected 1. Refusing.`); process.exit(2); }
const out = src.replace(m.find, m.put);
if (out === src) { console.error(`mutation ${id}: the swap changed nothing. Refusing.`); process.exit(2); }
writeFileSync(m.file, out);
console.log(`mutation ${id} applied to ${m.file}`);
