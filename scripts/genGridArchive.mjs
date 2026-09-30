/**
 * Round 354, extended in Rounds 358 and 369, made an accumulating archive in
 * Round 653: build the grid archive data file.
 *
 * Why a build-time file and not a live page. The archive shows past daily
 * boards, and "every day up to yesterday" is a thing computed from a clock.
 * Anything clock-derived is stripped from the saved pages by
 * scripts/prerender.mjs, and rightly so: a snapshot is a promise held for
 * weeks. Baking the boards at release time makes the page static, so it
 * prerenders honestly, its sitemap date moves only when its content really
 * changes, and a crawler and a visitor see the same thing.
 *
 * Why the franchise grids and not the soccer or NFL one. Those two draw from a
 * fixed pool and recycle it, so publishing a board's answers publishes an
 * answer key for a puzzle that comes back around. The NBA, MLB and NHL grids
 * build each day's board from that date's seed, so a board belongs to its date
 * and never returns, and answering it publicly costs a future player nothing.
 *
 * Where the answers come from. Not from what people guessed: the selections
 * tables are sparse, so a picks-based page would be mostly empty. Every valid
 * answer is computed from the same indexed player data the game itself
 * validates against, using the game's own playerMatchesCell, so the page cannot
 * claim a player the game would reject, and nothing here is invented.
 *
 * ROUND 653, WHAT CHANGED AND WHY.
 *   1. AN ARCHIVE ACCUMULATES. This used to write a fixed 14 day window ending
 *      yesterday, so every run rolled the oldest published boards off, and
 *      because it ran by hand only (it needs the database) it stopped at
 *      2026-08-30 while the page went on saying "the last 14". Now the window
 *      starts where the existing file starts and runs to yesterday, Eastern,
 *      and the script refuses to write if any board already published would
 *      change or disappear. It is a named release step: `npm run archive:grids`,
 *      before build:seo, in docs/SHIP-PIPELINE.md.
 *   2. PLAYERS ARE COUNTED BY ID. ncaa_player_stats holds 1,600 players twice,
 *      so counts ran high and names printed twice in a cell. Each lib now loads
 *      the source's own id when asked (the games never ask), and every count is
 *      of distinct ids. See scripts/lib/gridArchiveRules.mjs.
 *   3. PLACEHOLDER NAMES ARE NEVER PRINTED. Three college rows have "_" for a
 *      first name. They still count (the game accepts them), they are never
 *      listed.
 *   4. SAME INPUT, SAME FILE. Ties in the rarest list break by name and then id
 *      in code unit order, not by whatever order the rows arrived in.
 *
 * CBB IS NOT QUITE THE SAME SHAPE, and the difference matters for an archive.
 * A franchise board is a function of the SEED ALONE. A CBB board is a function
 * of the seed AND the eligible school pool, which is derived from the data at
 * runtime (see src/lib/cbbGrid.ts). So the CBB section records the pool it
 * published against, boards are rebuilt from that record, and this script
 * refuses to extend the archive if the live game's pool has moved away from
 * it, because then it cannot know which pool served the days in between.
 *
 * Run: npm run archive:grids   (needs the database, reads only)
 *      node scripts/genGridArchive.mjs --end=2026-09-29   (a fixed end, for a reproducible run)
 * Output: src/data/gridArchive.json, committed.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addDays, dedupeById, malformedName, namesToShow } from './lib/gridArchiveRules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'gridArchive.json');
const argVal = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const refuse = m => { console.error(`genGridArchive: ${m}. Nothing was written.`); process.exit(1); };

const SPORTS = [
  { key: 'nba', label: 'NBA', game: '/nba-grid', crossing: 'each pair of franchises', lib: 'src/lib/nbaGrid.ts', fetch: 'fetchNbaGridData' },
  { key: 'mlb', label: 'MLB', game: '/mlb-grid', crossing: 'each pair of franchises', lib: 'src/lib/mlbGrid.ts', fetch: 'fetchMlbGridData' },
  { key: 'nhl', label: 'NHL', game: '/hockey-grid', crossing: 'each pair of franchises', lib: 'src/lib/hockeyGrid.ts', fetch: 'fetchHockeyGridData' },
  { key: 'cbb', label: 'College Basketball', game: '/cbb-grid', crossing: 'each school and career achievement', lib: 'src/lib/cbbGrid.ts', fetch: 'fetchCbbGridData', derivesPool: true },
];

/* A cell with too few answers is a bad board to publish, and a cell with
   hundreds is a list nobody reads. Keep the rarest by career games played and
   publish the full count alongside, so the short list never implies it is
   complete. */
const PER_CELL = 8;
const MIN_PER_CELL = 3;

/* ---------- the window: where the file starts, to yesterday Eastern ---------- */
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const published = new Map();
for (const s of SPORTS) {
  const m = new Map();
  for (const b of previous?.sports?.[s.key]?.boards ?? []) m.set(b.date, b);
  published.set(s.key, m);
}
const publishedDates = [...published.values()].flatMap(m => [...m.keys()]).sort();
const todayET = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
const start = argVal('start') ?? publishedDates[0];
const end = argVal('end') ?? addDays(todayET, -1);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
if (!start) refuse('there is no archive to extend and no --start=YYYY-MM-DD was given');
if (!ISO.test(start) || !ISO.test(end)) refuse(`--start and --end must be YYYY-MM-DD (got ${start} and ${end})`);
if (end >= todayET) refuse(`--end=${end} is not over yet in America/New_York (today there is ${todayET}), and a board only goes up once its day is over`);
if (start > end) refuse(`the window starts on ${start}, after it ends on ${end}`);
if (publishedDates.length && start > publishedDates[0]) refuse(`--start=${start} would roll off boards published from ${publishedDates[0]}`);
if (publishedDates.length && end < publishedDates[publishedDates.length - 1]) refuse(`--end=${end} would roll off boards published up to ${publishedDates[publishedDates.length - 1]}`);
const dates = [];
for (let d = end; d >= start; d = addDays(d, -1)) dates.push(d);
console.log(`window ${start} to ${end}, ${dates.length} days (today in America/New_York is ${todayET})`);

/* ---------- the game's own code, bundled ---------- */
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
${SPORTS.map(s => s.derivesPool
  ? `  ${s.key}: { build: ${s.key}.buildCbbGridPuzzle, fetchData: ${s.key}.${s.fetch}, matches: ${s.key}.playerMatchesCell, pool: ${s.key}.eligibleSchools },`
  : `  ${s.key}: { build: ${s.key}.buildGridPuzzle, fetchData: ${s.key}.${s.fetch}, matches: ${s.key}.playerMatchesCell },`).join('\n')}
};
export const dateSeed = dateLib.dateSeed;
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { libs, dateSeed } = await import(pathToFileURL(BUNDLE).href);

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sports = {};
const summary = [];
for (const sport of SPORTS) {
  const lib = libs[sport.key];
  /* Retry the whole pull: the libs retry each page, but a pull is up to 44
     pages and one exhausting its retries is a transient, not an answer. */
  let data = null;
  for (let attempt = 0; attempt <= 2 && !data; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 800 * attempt));
    data = await lib.fetchData({ withIds: true });
  }
  if (!data) refuse(`the ${sport.label} grid data did not load`);

  const { kept, duplicates, noId } = dedupeById(data.players);
  if (noId) refuse(`${noId} ${sport.label} players came back with no id, so they cannot be counted once each`);
  const malformed = kept.filter(pl => malformedName(pl.name));
  console.log(`${sport.label}: indexed ${data.players.length} rows, ${kept.length} distinct players, ${duplicates.length} duplicate rows folded` +
    (duplicates.length ? ` (e.g. ${[...new Set(duplicates.map(d => d.name))].slice(0, 4).join(', ')})` : ''));
  if (malformed.length) console.log(`   ${malformed.length} names never printed: ${malformed.map(x => `"${x.name}" (${malformedName(x.name)})`).join(', ')}`);

  /* The CBB board depends on the pool. Rebuild published boards from the pool
     they were published against, and refuse to extend when the live game has
     moved off it: the days in between could have been served by either. */
  let pool = null;
  if (sport.derivesPool) {
    const live = lib.pool(data).map(x => x.id);
    const recorded = previous?.sports?.[sport.key]?.schoolPool ?? null;
    if (recorded && !sameList(recorded, live)) {
      const gone = recorded.filter(x => !live.includes(x));
      const added = live.filter(x => !recorded.includes(x));
      refuse(`the live ${sport.label} school pool (${live.length}) is not the recorded one (${recorded.length}; ${gone.length} gone, ${added.length} new), so the boards since the last run cannot be known. The archive needs a pool per board before it can carry both`);
    }
    const ids = recorded ?? live;
    pool = ids.map(id => ({ kind: 'school', id, label: id }));
    /* Measured for the database round that removes the duplicate rows: the
       pool counts rows, so deleting them could move schools out of it, and
       that would change every future CBB board. */
    const dedupedPool = lib.pool({ players: kept, byNormalizedName: data.byNormalizedName }).map(x => x.id);
    const wouldLeave = ids.filter(x => !dedupedPool.includes(x));
    console.log(`   ${ids.length} schools in the pool; counted once per player it would be ${dedupedPool.length}` +
      (wouldLeave.length ? `, and ${wouldLeave.join(', ')} would leave it` : ', the same schools'));
  }

  const before = published.get(sport.key);
  const boards = [];
  let skipped = 0;
  for (const date of dates) {
    const prior = before.get(date);
    const puzzle = pool ? lib.build(dateSeed(date), pool) : lib.build(dateSeed(date));
    if (!puzzle) {
      if (prior) refuse(`${sport.label} ${date} was published and no board can be built for it now`);
      skipped += 1; console.log(`   ${sport.label} skipped ${date}: no board could be built`); continue;
    }
    const rows = puzzle.rows.map(x => x.label);
    const cols = puzzle.cols.map(x => x.label);
    if (prior && (!sameList(prior.rows, rows) || !sameList(prior.cols, cols))) {
      refuse(`${sport.label} ${date} rebuilds as ${rows.join(', ')} x ${cols.join(', ')}, not the published ${prior.rows.join(', ')} x ${prior.cols.join(', ')}`);
    }
    const cells = [];
    let thin = null;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = { row: puzzle.rows[r], col: puzzle.cols[c] };
        const all = kept.filter(pl => lib.matches(pl, cell));
        const answers = namesToShow(all, PER_CELL);
        if (all.length < MIN_PER_CELL || answers.length === 0) thin = `${cell.row.label} x ${cell.col.label} has ${all.length}`;
        cells.push({ row: cell.row.label, col: cell.col.label, total: all.length, answers });
      }
    }
    if (thin) {
      if (prior) refuse(`${sport.label} ${date} was published and ${thin} valid players now`);
      skipped += 1; console.log(`   ${sport.label} skipped ${date}: ${thin} valid players`); continue;
    }
    boards.push({ date, rows, cols, cells });
  }
  sports[sport.key] = {
    label: sport.label,
    game: sport.game,
    /* What a crossing on this board actually is: the CBB board crosses a
       school with an achievement, the franchise grids cross two franchises. */
    crossing: sport.crossing,
    boards,
    /* Only present where the board depends on a derived pool. */
    ...(pool ? { schoolPool: pool.map(x => x.id) } : {}),
  };
  summary.push(`${sport.label}: ${before.size} boards before, ${boards.length} after (${skipped} skipped)`);
}

const out = {
  generatedFor: end,
  note: "Answers are computed with each game's own playerMatchesCell against the same indexed player data the game validates guesses with. Counts are the number of distinct players, by the source's own id, valid for that crossing; the names listed are the rarest by career games played, each name once, with placeholder names left out.",
  sports,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
for (const line of summary) console.log(line);
console.log(`wrote ${Object.keys(sports).length} sports to src/data/gridArchive.json, generated for ${end}`);
