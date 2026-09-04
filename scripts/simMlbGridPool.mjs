/* MLB grid answer pool harness: the page's own request answers under a burst, the pool is whole, and the record holds.

   Round 432, audit blocker 6. /mlb-grid and /mlb-connect-4 read their answer
   pool from public.mlb_grid_players through src/lib/gridEngine.ts: four pages
   of 1,000 rows ordered by player_name, franchises not null. Until this round
   that relation was a VIEW that recomputed all 3,264 careers from about
   221,000 Lahman rows on every page read (a 4.5 MB external sort and a five
   batch hash aggregate spilled to disk under a 2 MB work_mem): 695 ms mean
   server time and 7 MB of temp per page, under the anon role's 3 s
   statement_timeout, on a shared Micro instance. Whenever anything else was
   running the query was cancelled (SQLSTATE 57014: 138 cancellations of this
   one query in 24 hours, 62 in a single hour) and the page showed "Couldn't
   load MLB career data right now". The cache was warm the whole time (zero
   shared reads in EXPLAIN); it was concurrency, not a cold start. The NHL and
   NBA siblings run the same engine against plain tables and answer in about
   35 ms. The fix is a same-named table, so no line of src changed:
   supabase/migrations/20260904_round_432_mlb_grid_players_table.sql.

   WHAT THIS HOLDS:
     1. THE WALK. The exact request the engine sends, four pages sequential,
        no retry (a retry would hide what is being measured): every page
        HTTP 200, rows collected at or above MIN_POOL_SIZE as the lib defines
        it, and the last page short. Page times are printed, not asserted.
     2. THE BURST. Eight concurrent page-0 requests (a few visitors opening
        the page at once): zero non-200 answers and a median wall time under
        CEILING_MS. The max is printed, never asserted.
        BEFORE THE FIX, AT A CALM MOMENT, THIS SECTION GOES RED ON THE MEDIAN
        CEILING AND NOT ON THE STATUS COUNT. The view answered 8 of 8 with
        200 at 1.7 to 2.0 s when nothing else was running, and 8 of 8 with
        500 at 3.2 to 4.4 s when anything was. A green status count proved
        nothing about the view; the median did.
     3. THE RECORD. Three rows the copy must carry, from the facts already
        verified in src/lib/mlbGrid.ts: Babe Ruth ATL,BOS,NYY and 714 home
        runs, Hank Aaron 755, Derek Jeter 3,465 hits. A fast but empty or
        half copied table goes red here, as does a rebuild that drops a
        column.
     4. THE SIBLING, report only. The same burst against nhl_player_stats,
        printed beside the MLB median as the contention reference. Both live
        on the same instance, so a post-fix red in section 2 at a peak hour
        with the NHL median also high is contention, and with the NHL median
        low it is a regression. Not asserted: the calm ratio was about 3x
        before the fix and about 1x after, so any threshold there would sit
        inside the distribution (the Round 284 lesson).

   CEILING_MS comes from measured headroom, from this machine over the
   public network on 2026-09-04, 8 concurrent page-0 requests:
     the view (before):  median 1.86 s calm; 8 of 8 cancelled at 3.2 to
                         4.4 s under contention (this harness measured
                         median 3,310 ms, 0 of 8 HTTP 200, with the NHL
                         sibling at 1,030 ms beside it)
     the table (after):  median 301 ms, max 452 ms, with the NHL sibling at
                         420 ms beside it; four further runs put the MLB
                         median at 217 to 301 ms
   1,500 ms is half the anon statement_timeout: above it the request is one
   busy neighbour away from being cancelled. The calm view sat above it and
   the table sits about 5x below it.

   NEGATIVE CONTROLS (house rule: prove each check can fail):
     SIM_MLBGRID_CONTROL=missing  points every MLB request at a relation that
                                  does not exist (there is no renamed view to
                                  point at, the migration drops it); the
                                  status checks in sections 1 and 2 must both
                                  go red.
     SIM_MLBGRID_CONTROL=floor    sets CEILING_MS to 0 in memory; section 2
                                  must go red, proving the timing check reads
                                  real nonzero times.
     SIM_MLBGRID_CONTROL=record   expects 715 home runs of Babe Ruth, in
                                  memory; section 3 must go red.
   Each control refuses to run if what it rewrites is not there, and is
   judged on its own section(s) only.

   Refuses to run unless the request it times is the request the page sends:
   the config strings below must be in src/lib/mlbGrid.ts and the query
   chain in src/lib/gridEngine.ts, comments stripped before matching, or the
   harness would be timing a URL nobody uses.

   Needs the database. When it cannot be reached it says so and checks
   nothing. Never run it alongside a build.

   Run: node scripts/simMlbGridPool.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_MLBGRID_CONTROL || '';
const PAGE_SIZE = 1000;
const BURST = 8;
let CEILING_MS = 1500;
const failures = { 1: 0, 2: 0, 3: 0, 4: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const read = rel => fs.readFileSync(path.join(ROOT, ...rel.split('/')), 'utf8');
/* Code, not prose: block comments and whole-line comments are dropped before
   any string is looked for, so the docstring explaining a config cannot
   satisfy the check for the config. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const client = read('src/integrations/supabase/client.ts');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEADERS = { apikey: KEY, authorization: `Bearer ${KEY}` };

function gridConfig(rel) {
  const src = code(read(rel));
  const pick = key => { const m = src.match(new RegExp(key + String.raw`:\s*'([^']+)'`)); return m ? m[1] : null; };
  return { table: pick('table'), select: pick('select'), franchiseColumn: pick('franchiseColumn'), orderColumn: pick('orderColumn') };
}

const mlbSrc = code(read('src/lib/mlbGrid.ts'));
const engineSrc = code(read('src/lib/gridEngine.ts'));
const mlb = gridConfig('src/lib/mlbGrid.ts');
const nhl = gridConfig('src/lib/hockeyGrid.ts');
const expectMlb = { table: 'mlb_grid_players', select: 'player_name, franchises, hits, hrs, games', franchiseColumn: 'franchises', orderColumn: 'player_name' };
for (const [k, v] of Object.entries(expectMlb)) {
  if (mlb[k] !== v) abort(`src/lib/mlbGrid.ts no longer carries ${k}: '${v}' (found ${JSON.stringify(mlb[k])}); this harness would time a request the page does not send. NOTHING WAS CHECKED.`);
}
const poolMatch = mlbSrc.match(/export const MIN_POOL_SIZE = (\d+);/);
if (!poolMatch) abort('src/lib/mlbGrid.ts no longer exports MIN_POOL_SIZE as a literal; NOTHING WAS CHECKED.');
const MIN_POOL_SIZE = Number(poolMatch[1]);
for (const needle of [".not(cfg.franchiseColumn, 'is', null)", '.order(cfg.orderColumn, { ascending: true })', '.range(from, from + PAGE_SIZE - 1)']) {
  if (!engineSrc.includes(needle)) abort(`src/lib/gridEngine.ts no longer builds the page with ${needle}; the request below is not what the page sends. NOTHING WAS CHECKED.`);
}
if (!engineSrc.includes('const PAGE_SIZE = 1000;')) abort('src/lib/gridEngine.ts no longer pages by 1000; NOTHING WAS CHECKED.');

let TABLE = mlb.table;
if (CONTROL === 'missing') {
  if (TABLE !== 'mlb_grid_players') abort('control cannot run: the table name to rewrite is not mlb_grid_players');
  TABLE = 'mlb_grid_players_round_432_no_such_relation';
  console.log(`NEGATIVE CONTROL ON: every MLB request points at ${TABLE}, in memory`);
}
if (CONTROL === 'floor') {
  if (CEILING_MS <= 0) abort('control cannot run: CEILING_MS is already zero');
  CEILING_MS = 0;
  console.log('NEGATIVE CONTROL ON: CEILING_MS set to 0, in memory');
}

/* The wire form of the engine's query: postgrest-js strips the spaces out of
   the select list and encodes .range(from, to) as offset and limit. */
const pageUrl = (cfg, table, from) =>
  `${URL_}/rest/v1/${table}?select=${cfg.select.replace(/\s+/g, '')}&${cfg.franchiseColumn}=not.is.null&order=${cfg.orderColumn}.asc&offset=${from}&limit=${PAGE_SIZE}`;

async function timed(url) {
  const t0 = performance.now();
  let res, text;
  try {
    res = await fetch(url, { headers: HEADERS });
    text = await res.text();
  } catch (err) {
    abort(`\nSUPABASE unreachable (${String(err).slice(0, 80)}) for ${url.slice(URL_.length + 9, URL_.length + 120)}. NOTHING WAS CHECKED.`);
  }
  const ms = performance.now() - t0;
  let rows = null;
  if (res.ok) { try { rows = JSON.parse(text); } catch { rows = null; } }
  return { status: res.status, ms, rows, body: text.slice(0, 120) };
}
const median = xs => { const s = [...xs].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const fmt = ms => `${Math.round(ms)} ms`;

section = 1;
console.log(`1) The walk: ${TABLE} in pages of ${PAGE_SIZE}, ordered by ${mlb.orderColumn}, sequential, no retry`);
{
  let collected = 0;
  let pages = 0;
  let lastShort = false;
  for (let from = 0; ; from += PAGE_SIZE) {
    const r = await timed(pageUrl(mlb, TABLE, from));
    pages += 1;
    if (r.status !== 200 || !Array.isArray(r.rows)) {
      fail(`page at offset ${from}: HTTP ${r.status} in ${fmt(r.ms)} (${r.body})`);
      break;
    }
    console.log(`   offset ${from}: ${r.rows.length} rows in ${fmt(r.ms)}`);
    collected += r.rows.length;
    if (r.rows.length < PAGE_SIZE) { lastShort = true; break; }
    if (from >= 20000) { fail('the walk did not end after 20 pages; the pool is not the 3,264 careers the lib describes'); break; }
  }
  if (collected < MIN_POOL_SIZE) fail(`${collected} rows collected, under MIN_POOL_SIZE ${MIN_POOL_SIZE}; the page would show its error card`);
  if (collected >= MIN_POOL_SIZE && !lastShort) fail('the last page was not short, so the engine would never stop paging');
  console.log(`   ${collected} rows over ${pages} page(s), floor ${MIN_POOL_SIZE}`);
}

section = 2;
console.log(`2) The burst: ${BURST} concurrent page-0 requests, ceiling ${CEILING_MS} ms on the median`);
let mlbMedian = null;
{
  const results = await Promise.all(Array.from({ length: BURST }, () => timed(pageUrl(mlb, TABLE, 0))));
  const bad = results.filter(r => r.status !== 200);
  const times = results.map(r => r.ms);
  mlbMedian = median(times);
  console.log(`   ${results.length - bad.length} of ${BURST} HTTP 200; median ${fmt(mlbMedian)}, max ${fmt(Math.max(...times))} (max is printed, never asserted)`);
  if (bad.length) fail(`${bad.length} of ${BURST} answered non-200: ${[...new Set(bad.map(r => `HTTP ${r.status} (${r.body.slice(0, 70)})`))].join('; ')}`);
  if (mlbMedian >= CEILING_MS) fail(`median ${fmt(mlbMedian)} is at or over the ${CEILING_MS} ms ceiling`);
}

section = 3;
console.log('3) The record: three rows the copy must carry');
{
  /* Facts the lib's own docstring verified against Lahman on 2026-07-21 and
     re-read live on 2026-09-04: Ruth's franchises are Lahman franchIDs, so
     his 1935 Boston Braves year shows as ATL. */
  const cases = [
    { who: 'Babe Ruth', franchises: 'ATL,BOS,NYY', hrs: 714 },
    { who: 'Hank Aaron', hrs: 755 },
    { who: 'Derek Jeter', hits: 3465 },
  ];
  if (CONTROL === 'record') {
    const ruth = cases.find(c => c.who === 'Babe Ruth');
    if (!ruth || ruth.hrs !== 714) abort('control cannot run: the Babe Ruth case with 714 home runs is not there to rewrite');
    ruth.hrs = 715;
    console.log('   NEGATIVE CONTROL ON: Babe Ruth expected at 715 home runs, in memory');
  }
  for (const c of cases) {
    const r = await timed(`${URL_}/rest/v1/${TABLE}?select=player_name,franchises,hits,hrs,games&player_name=eq.${encodeURIComponent(c.who)}`);
    if (r.status !== 200 || !Array.isArray(r.rows)) { fail(`${c.who}: HTTP ${r.status} (${r.body})`); continue; }
    if (r.rows.length !== 1) { fail(`${c.who}: ${r.rows.length} rows, expected exactly one`); continue; }
    const row = r.rows[0];
    for (const [k, want] of Object.entries(c)) {
      if (k === 'who') continue;
      const got = typeof want === 'number' ? Number(row[k]) : row[k];
      if (got !== want) fail(`${c.who}: ${k} is ${JSON.stringify(row[k])}, the record says ${JSON.stringify(want)}`);
    }
    for (const col of ['player_name', 'franchises', 'hits', 'hrs', 'games']) {
      if (!(col in row)) fail(`${c.who}: the row has no ${col} column, which the page selects`);
    }
  }
  console.log(`   ${cases.length} careers checked`);
}

section = 4;
console.log(`4) The sibling, report only: ${BURST} concurrent page-0 requests at ${nhl.table}`);
{
  if (!nhl.table || !nhl.select || !nhl.franchiseColumn || !nhl.orderColumn) {
    console.log('   src/lib/hockeyGrid.ts no longer carries a readable grid config; reference skipped');
  } else {
    const results = await Promise.all(Array.from({ length: BURST }, () => timed(pageUrl(nhl, nhl.table, 0))));
    const ok = results.filter(r => r.status === 200).length;
    const times = results.map(r => r.ms);
    const nhlMedian = median(times);
    const ratio = mlbMedian !== null && nhlMedian > 0 ? (mlbMedian / nhlMedian).toFixed(2) : 'n/a';
    console.log(`   ${ok} of ${BURST} HTTP 200; median ${fmt(nhlMedian)}, max ${fmt(Math.max(...times))}; MLB median is ${ratio}x the NHL median`);
    console.log('   (a high MLB median beside a high NHL median is the instance being busy; beside a low one it is the MLB relation)');
  }
}

const own = { missing: [1, 2], floor: [2], record: [3] }[CONTROL];
const total = failures[1] + failures[2] + failures[3] + failures[4];
if (CONTROL) {
  if (!own) abort(`unknown control "${CONTROL}" (missing, floor, record)`);
  const fired = own.filter(s => failures[s] > 0);
  if (fired.length === own.length) { console.log(`\ncontrol "${CONTROL}": ${own.map(s => `${failures[s]} failure(s) in section ${s}`).join(', ')} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own.filter(s => failures[s] === 0).join(' and ')}, the check is dead`);
}
if (total > 0) { console.error(`\nsimMlbGridPool: ${total} failure(s)`); process.exit(1); }
console.log('\nsimMlbGridPool: green. The page request answers under a burst, the pool is whole, and the record holds.');
