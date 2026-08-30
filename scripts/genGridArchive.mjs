/**
 * Round 354, extended in Round 358: build the grid archive data file.
 *
 * Why a build-time file and not a live page. The archive shows past daily
 * boards, and "the last N days" is a thing computed from a clock. Anything
 * clock-derived is stripped from the saved pages by scripts/prerender.mjs, and
 * rightly so: a snapshot is a promise held for weeks. Baking the window at
 * build time makes the page static, so it prerenders honestly, its sitemap
 * date moves only when its content really changes, and a crawler and a visitor
 * see the same thing.
 *
 * Why the franchise grids and not the soccer or NFL one. Those two draw from a
 * fixed pool and recycle it, so publishing a board's answers publishes an
 * answer key for a puzzle that comes back around. The NBA, MLB and NHL grids
 * build each day's board from that date's seed, so a board belongs to its date
 * and never returns, and answering it publicly costs a future player nothing.
 *
 * Where the answers come from. Not from what people guessed: the selections
 * tables are sparse (315 rows across 22 NFL boards, and similar elsewhere), so
 * a picks-based page would be mostly empty. Every valid answer is computed
 * from the same indexed player data the game itself validates against, using
 * the game's own playerMatchesCell, so the page cannot claim a player the game
 * would reject, and nothing here is invented. That is also what makes these
 * pages worth publishing at all: a champions list is on a thousand other
 * sites, and this is on none of them.
 *
 * Run: node scripts/genGridArchive.mjs   (needs the database)
 * Output: src/data/gridArchive.json, committed.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* How many past days each sport carries. Big enough to be a real archive,
   small enough that the page stays a page: 14 boards is 126 cells. */
const DAYS = 14;
/* The end of the window. Yesterday and backwards, never today, because today's
   board is still being played and its answers are not ours to publish yet. */
const ARG_END = process.argv.find(a => a.startsWith('--end='));

/* The three grids that seed a fresh board from the date. They share a shape,
   so this is a list rather than three copies of the same script. */
const SPORTS = [
  { key: 'nba', label: 'NBA', game: '/nba-grid', lib: 'src/lib/nbaGrid.ts', fetch: 'fetchNbaGridData' },
  { key: 'mlb', label: 'MLB', game: '/mlb-grid', lib: 'src/lib/mlbGrid.ts', fetch: 'fetchMlbGridData' },
  { key: 'nhl', label: 'NHL', game: '/hockey-grid', lib: 'src/lib/hockeyGrid.ts', fetch: 'fetchHockeyGridData' },
];

const ENTRY = path.join(os.tmpdir(), 'gridArchiveEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'gridArchive.bundle.mjs');
const p = rel => (path.join(ROOT, rel)).replaceAll('\\', '/');
/* The grid modules read a remembered difficulty at module scope, so browser
   storage has to exist before the import runs, and the imports are dynamic
   because a static one is hoisted above the assignment. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
${SPORTS.map(s => `const ${s.key} = await import('${p(s.lib)}');`).join('\n')}
const dateLib = await import('${p('src/lib/dateUtils.ts')}');
export const libs = {
${SPORTS.map(s => `  ${s.key}: { build: ${s.key}.buildGridPuzzle, fetchData: ${s.key}.${s.fetch}, matches: ${s.key}.playerMatchesCell },`).join('\n')}
};
export const dateSeed = dateLib.dateSeed;
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { libs, dateSeed } = await import(pathToFileURL(BUNDLE).href);

const end = ARG_END ? ARG_END.split('=')[1] : new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
const dates = [];
{
  const d = new Date(end + 'T12:00:00Z');
  for (let i = 0; i < DAYS; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
}

/* A cell with too few answers is a bad board to publish, and a cell with
   hundreds is a list nobody reads. Keep the rarest by career games played,
   which is the closest thing to "deep cut" this data supports, and publish the
   full count alongside so the short list never implies it is complete. */
const PER_CELL = 8;
const MIN_PER_CELL = 3;

const sports = {};
for (const sport of SPORTS) {
  const lib = libs[sport.key];
  const data = await lib.fetchData();
  if (!data) {
    console.error(`the ${sport.label} grid data did not load, so nothing was written`);
    process.exit(1);
  }
  console.log(`${sport.label}: indexed ${data.players.length} players`);

  const boards = [];
  let skipped = 0;
  for (const date of dates) {
    const puzzle = lib.build(dateSeed(date));
    const cells = [];
    let thin = false;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = { row: puzzle.rows[r], col: puzzle.cols[c] };
        const all = data.players.filter(pl => lib.matches(pl, cell));
        if (all.length < MIN_PER_CELL) thin = true;
        const shown = all.slice().sort((a, b) => a.games - b.games).slice(0, PER_CELL).map(pl => pl.name);
        cells.push({ row: cell.row.label, col: cell.col.label, total: all.length, answers: shown });
      }
    }
    if (thin) { skipped += 1; console.log(`   ${sport.label} skipped ${date}: a cell has fewer than ${MIN_PER_CELL} valid answers`); continue; }
    boards.push({ date, rows: puzzle.rows.map(x => x.label), cols: puzzle.cols.map(x => x.label), cells });
  }
  sports[sport.key] = { label: sport.label, game: sport.game, boards };
  console.log(`${sport.label}: ${boards.length} boards (${skipped} skipped as thin)`);
}

const out = {
  generatedFor: end,
  note: "Answers are computed with each game's own playerMatchesCell against the same indexed player data the game validates guesses with. Counts are the full number of valid players for that crossing; the names listed are the rarest by career games played.",
  sports,
};
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'gridArchive.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${Object.keys(sports).length} sports to src/data/gridArchive.json`);
