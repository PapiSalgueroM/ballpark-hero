/**
 * Round 359 harness: a transient page failure costs a retry, not the game.
 *
 * src/lib/fetchAllRows.ts pages every large read on this site through .range()
 * until a short page arrives. Nine libs depend on it: career players,
 * connections puzzles, the pack pool, the quiz board, rebuild, transfer grades,
 * transfer path puzzles, transfer values and Who Am I. Paging turns one read
 * into ten or twenty queries, which multiplies the chance of meeting a
 * transient by the number of pages, and the database really does cancel these
 * under load (Postgres 57014, statement timeout). Before Round 359 a single
 * cancelled page anywhere in the sequence returned an error to the caller and
 * the visitor got an unplayable game, silently, with nothing in any log.
 *
 * This harness needs no database on purpose. The failure is injected, so the
 * check is deterministic rather than a wait for the real thing to flake, and it
 * runs anywhere including a sandbox with no network.
 *
 * What it holds:
 *   1. A page that fails once and then succeeds costs a retry, not the read.
 *   2. The rows that come back after a retry are exactly the rows that come
 *      back without one: same count, same order, no duplicate, no gap. This is
 *      the risk the fix itself carries, because a retry that re-requested the
 *      wrong range would corrupt the result rather than fail it.
 *   3. A page that fails every attempt still returns its error. A database that
 *      is genuinely down must surface, not be retried forever.
 *   4. The work is bounded: a healthy read makes exactly one call per page, and
 *      a failing one is capped.
 *   5. The paging semantics the retry sits inside are unchanged: the short-page
 *      stop, the empty-page stop, and the maxRows cap.
 *
 *   6. Every caller reads the error. The helper returns what it collected
 *      ALONGSIDE the error, so a caller that takes only the data gets a silent
 *      fraction of the table rather than a failure.
 *
 * NEGATIVE CONTROLS, one per mechanism:
 *   FETCHRETRY_CONTROL=noretry strips the retry loop out of a temporary copy of
 *   the source (refusing to run if the loop is not there to strip) and sections
 *   1 and 2 must go red.
 *   FETCHRETRY_CONTROL=blindcaller blinds one caller to the error (refusing to
 *   run if it had none to remove) and section 6 must go red.
 *
 * Run: node scripts/simFetchRetry.mjs   (no database needed)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FETCHRETRY_CONTROL || '';
if (CONTROL && CONTROL !== 'noretry' && CONTROL !== 'blindcaller') {
  console.error(`FETCHRETRY_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const SRC = path.join(ROOT, 'src', 'lib', 'fetchAllRows.ts');
let source = fs.readFileSync(SRC, 'utf8');

/* The control removes the mechanism, not the checking code, so what it proves
   is that the checks would notice its absence. */
if (CONTROL === 'noretry') {
  const RETRY = /\n *for \(let attempt = 1; attempt <= RETRIES && error; attempt\+\+\) \{[\s\S]*?\n *\}\n/;
  if (!RETRY.test(source)) {
    console.error('control cannot run: the retry loop it removes is not in fetchAllRows.ts');
    process.exit(1);
  }
  source = source.replace(RETRY, '\n');
  console.log('   NEGATIVE CONTROL ON: the retry loop is stripped, sections 1 and 2 must go red');
}

const ENTRY = path.join(os.tmpdir(), 'fetchRetryEntry.ts');
const BUNDLE = path.join(os.tmpdir(), 'fetchRetry.bundle.mjs');
fs.writeFileSync(ENTRY, source);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { fetchAllRows } = await import(pathToFileURL(BUNDLE).href + '?t=' + process.pid);

/* 2,500 rows is three pages: 1,000, 1,000 and a short 500 that stops the loop.
   Distinct row values, so a duplicate or a gap is visible rather than plausible. */
const TOTAL = 2500;
const ROWS = Array.from({ length: TOTAL }, (_, i) => ({ id: i, name: `row-${i}` }));

/* A page function that serves the real slice, except on the call indices named
   in failOn, where it returns the shape PostgREST returns for a cancelled
   statement. It counts its calls so the work can be bounded. */
function makePage(failOn = []) {
  const state = { calls: 0, ranges: [] };
  const page = async (from, to) => {
    state.calls += 1;
    state.ranges.push(from);
    if (failOn.includes(state.calls)) {
      return { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
    }
    return { data: ROWS.slice(from, to + 1), error: null };
  };
  return { page, state };
}

const ids = r => r.map(x => x.id);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

console.log('1) a page that fails once and then succeeds costs a retry, not the read');
{
  /* Fail the second call, which is the middle page, so a botched retry shows up
     as a hole in the middle rather than a short read at the end. */
  const { page, state } = makePage([2]);
  const { data, error } = await fetchAllRows(page);
  console.log(`   ${state.calls} calls made, ${data.length} of ${TOTAL} rows returned, error ${error ? 'present' : 'null'}`);
  if (error) fail('a single transient page failure still failed the whole read');
  if (data.length !== TOTAL) fail(`the read came back with ${data.length} rows, expected ${TOTAL}`);
}

console.log('2) the rows after a retry are exactly the rows without one');
{
  const clean = await fetchAllRows(makePage([]).page);
  /* Fail one call in each page position, including the short last page. */
  for (const failAt of [1, 2, 3]) {
    const { page, state } = makePage([failAt]);
    const { data, error } = await fetchAllRows(page);
    const dupes = new Set(ids(data)).size !== data.length;
    const ok = !error && same(ids(data), ids(clean.data)) && !dupes;
    console.log(`   failure on call ${failAt}: ${data.length} rows, ${dupes ? 'DUPLICATES' : 'no duplicates'}, ranges ${state.ranges.join(',')}`);
    if (!ok) {
      if (error) fail(`a failure on call ${failAt} failed the read`);
      else if (dupes) fail(`the retry after call ${failAt} returned duplicate rows`);
      else fail(`the retry after call ${failAt} returned different rows than a clean read`);
    }
  }
}

console.log('3) a page that fails every attempt still returns its error');
{
  const { page, state } = makePage([2, 3, 4, 5, 6, 7, 8]);
  const { data, error } = await fetchAllRows(page);
  console.log(`   ${state.calls} calls made, error ${error ? 'returned' : 'SWALLOWED'}, ${data.length} rows returned`);
  if (!error) fail('a page that failed every attempt was reported as success, which is fail-open');
}

console.log('4) the work is bounded');
{
  const healthy = makePage([]);
  await fetchAllRows(healthy.page);
  const PAGES = 3;
  console.log(`   healthy read: ${healthy.state.calls} calls for ${PAGES} pages`);
  if (healthy.state.calls !== PAGES) fail(`a healthy read made ${healthy.state.calls} calls for ${PAGES} pages, so it is retrying when nothing failed`);

  const dead = makePage(Array.from({ length: 50 }, (_, i) => i + 1));
  await fetchAllRows(dead.page);
  console.log(`   read against a dead database: ${dead.state.calls} calls`);
  if (dead.state.calls > 4) fail(`a dead database drew ${dead.state.calls} calls, so the retry is not capped`);
}

console.log('5) the paging semantics around the retry are unchanged');
{
  const capped = await fetchAllRows(makePage([]).page, 1500);
  console.log(`   maxRows 1500 returned ${capped.data.length} rows`);
  if (capped.data.length !== 1500) fail(`maxRows returned ${capped.data.length} rows, expected 1500`);

  const empty = await fetchAllRows(async () => ({ data: [], error: null }));
  console.log(`   an empty first page returned ${empty.data.length} rows, error ${empty.error ? 'present' : 'null'}`);
  if (empty.data.length !== 0 || empty.error) fail('an empty first page no longer stops cleanly');

  /* A short first page must stop the loop rather than ask for another. */
  const shortState = { calls: 0 };
  const short = await fetchAllRows(async (from, to) => {
    shortState.calls += 1;
    return { data: ROWS.slice(from, Math.min(to + 1, 10)), error: null };
  });
  console.log(`   a short first page drew ${shortState.calls} call and returned ${short.data.length} rows`);
  if (shortState.calls !== 1) fail(`a short first page drew ${shortState.calls} calls, so the stop condition moved`);
}

console.log('6) every caller reads the error');
{
  /* This helper returns whatever it managed to collect ALONGSIDE the error, so
     a caller that destructures only data gets a silent fraction of the table
     rather than a failure: a Who Am I pool missing its last page misclassifies
     active players as retired, and a career pool missing its last page leaves
     real players with empty careers. All nine callers honour it today, and
     whoAmI documents why. This section is here so the tenth has to. */
  const callers = fs.readdirSync(path.join(ROOT, 'src', 'lib'))
    .filter(f => f.endsWith('.ts') && f !== 'fetchAllRows.ts')
    .map(f => ({ name: f, src: fs.readFileSync(path.join(ROOT, 'src', 'lib', f), 'utf8') }))
    .filter(f => /\bfetchAllRows\b/.test(f.src));

  /* Read the code, not the prose about the code: whoAmI's comment explains the
     error handling in words a naive match would happily accept as the thing
     itself. */
  const stripped = callers.map(c => ({
    name: c.name,
    code: c.src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
  }));

  if (CONTROL === 'blindcaller') {
    const victim = stripped[0];
    const before = victim.code;
    victim.code = victim.code.replace(/\berror\b/g, 'ignored');
    if (victim.code === before) {
      console.error('control cannot run: the caller it blinds had no error read to remove');
      process.exit(1);
    }
    console.log(`   NEGATIVE CONTROL ON: ${victim.name} blinded to the error, section 6 must go red`);
  }

  console.log(`   ${stripped.length} callers page through fetchAllRows`);
  if (stripped.length < 9) fail(`only ${stripped.length} callers found, expected at least 9, so this check is looking in the wrong place`);
  for (const c of stripped) {
    if (!/\berror\b/.test(c.code)) {
      fail(`${c.name} pages through fetchAllRows but never reads the error, so a failed page becomes silent partial data`);
    }
  }
}

console.log('');
if (CONTROL === 'blindcaller') {
  if (failures > 0) { console.log(`simFetchRetry control: green. A caller ignoring the error was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simFetchRetry control: RED. A caller that ignores the error went unnoticed.');
  process.exit(1);
}
if (CONTROL === 'noretry') {
  if (failures > 0) { console.log(`simFetchRetry control: green. Removing the retry was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simFetchRetry control: RED. The retry was stripped out and every check still passed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simFetchRetry: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simFetchRetry: green. A transient page failure costs a retry and the rows come back whole.');
