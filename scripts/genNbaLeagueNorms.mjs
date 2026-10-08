/* genNbaLeagueNorms.mjs (Round 1103). Derives the starter quartiles in src/data/nbaLeagueNorms.ts.

   A generator a human runs, not a harness: nothing discovers it, and it reaches no network. It reads two
   table extracts that are NOT in the repo (a file of real players' season lines adds provenance exposure the
   repo does not need) and writes only the aggregates, between the GENERATED marks of the data file.

   THE EXTRACTS (one line a starter, or the same rows joined with ";"):
       pos,G,GS,MP,PTS,TRB,AST,STL,BLK
     .tmp-fx/data/starters-2026.csv   https://www.basketball-reference.com/leagues/NBA_2026_per_game.html
     .tmp-fx/data/starters-2004.csv   https://www.basketball-reference.com/leagues/NBA_2004_per_game.html
   Both read 2026-10-07 out of the page's own per game table (id per_game_stats), no names taken.
   THE FILTER, applied when the extract was made: one row a player (a traded player's season total row, the
   first row the table lists for him), the first listed position, and games started of 41 or more (half of an
   82 game season). 583 players and 149 starters in 2025-26; 443 players and 137 starters in 2003-04.
   Each extract was checked against the page with a checksum over its whole text (djb2, computed in the page and
   again over the file): 2026 length 5173, 1677516745; 2004 length 4745, 1814273378.

   THE QUARTILES are the linear interpolation kind (the R type 7 a spreadsheet's QUARTILE gives), rounded to one
   decimal. Counts by position are written beside them as `n`.

   SMELLS THAT STOP THE WRITE: quartiles out of order; fewer than 15 starters at a position; a starter row with
   fewer games than starts.

   Run:  node scripts/genNbaLeagueNorms.mjs            writes the block
         node scripts/genNbaLeagueNorms.mjs --check    fails when the committed block differs from the extracts */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'src', 'data', 'nbaLeagueNorms.ts');
const EXTRACTS = { y2004: path.join(ROOT, '.tmp-fx', 'data', 'starters-2004.csv'), now: path.join(ROOT, '.tmp-fx', 'data', 'starters-2026.csv') };
const START = '// GENERATED:START NBA_STARTER_NORMS';
const END = '// GENERATED:END NBA_STARTER_NORMS';
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const STATS = [['mpg', 3], ['pts', 4], ['reb', 5], ['ast', 6], ['stl', 7], ['blk', 8]];

function quantile(sorted, p) {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
}
const one = x => Math.round(x * 10) / 10;

function read(file) {
  if (!existsSync(file)) { console.error(`missing extract ${file}. See this script's header for where it comes from.`); process.exit(2); }
  const rows = readFileSync(file, 'utf8').trim().split(/[;\n]+/).map(l => l.trim()).filter(Boolean).map(l => l.split(','));
  for (const r of rows) {
    if (r.length !== 9 || !POS.includes(r[0])) { console.error(`bad row in ${file}: ${r.join(',')}`); process.exit(2); }
    if (Number(r[1]) < Number(r[2])) { console.error(`a row with fewer games than starts in ${file}: ${r.join(',')}`); process.exit(2); }
  }
  return rows;
}

function norms(rows) {
  const out = {};
  for (const pos of POS) {
    const mine = rows.filter(r => r[0] === pos);
    if (mine.length < 15) { console.error(`only ${mine.length} starters at ${pos}: too few for quartiles`); process.exit(2); }
    const row = { n: mine.length };
    for (const [key, col] of STATS) {
      const v = mine.map(r => Number(r[col])).sort((a, b) => a - b);
      const q = { p25: one(quantile(v, 0.25)), p50: one(quantile(v, 0.5)), p75: one(quantile(v, 0.75)) };
      if (!(q.p25 <= q.p50 && q.p50 <= q.p75)) { console.error(`quartiles out of order at ${pos} ${key}`); process.exit(2); }
      row[key] = q;
    }
    out[pos] = row;
  }
  return out;
}

const q = v => `{ p25: ${v.p25}, p50: ${v.p50}, p75: ${v.p75} }`;
function block(all) {
  const lines = [START, 'export const NBA_STARTER_NORMS: Record<NbaNormEra, Record<NbaNormPos, NbaStarterNorm>> = {'];
  for (const era of ['y2004', 'now']) {
    lines.push(`  ${era}: {`);
    for (const pos of POS) {
      const r = all[era][pos];
      lines.push(`    ${pos}: { n: ${r.n}, mpg: ${q(r.mpg)}, pts: ${q(r.pts)}, reb: ${q(r.reb)}, ast: ${q(r.ast)}, stl: ${q(r.stl)}, blk: ${q(r.blk)} },`);
    }
    lines.push('  },');
  }
  lines.push('};', END);
  return lines.join('\n');
}

const all = { y2004: norms(read(EXTRACTS.y2004)), now: norms(read(EXTRACTS.now)) };
const src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf(START);
const b = src.indexOf(END);
if (a < 0 || b < a) { console.error('the GENERATED marks are missing from src/data/nbaLeagueNorms.ts'); process.exit(2); }
const next = src.slice(0, a) + block(all) + src.slice(b + END.length);
for (const era of ['y2004', 'now']) console.log(`${era}: ${POS.map(p => `${p} n=${all[era][p].n} pts ${all[era][p].pts.p50} reb ${all[era][p].reb.p50} ast ${all[era][p].ast.p50} mpg ${all[era][p].mpg.p50}`).join(' | ')}`);
if (process.argv.includes('--check')) {
  if (next !== src) { console.error('genNbaLeagueNorms --check: the committed block differs from the extracts'); process.exit(1); }
  console.log('genNbaLeagueNorms --check: the committed block is what the extracts give');
} else {
  writeFileSync(FILE, next);
  console.log(next === src ? 'no change' : 'wrote src/data/nbaLeagueNorms.ts');
}
