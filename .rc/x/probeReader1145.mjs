/* Round 1145 probe, not committed: is the shared paged reader the same reader
   for every caller that passes no row limit?

   Round 1145 gave fetchAllRowsParallel an optional third argument. The four
   Perfect Season wheels call it with two, and the harness that fences them
   (simPerfectSeasonWheel) needs the live database, so it cannot run on a
   runner. This runs main's reader and the branch's reader side by side over
   the same fake table and compares, call for call: which ranges were asked
   for, in what order, which rows came back and whether an error did.

   Usage: node probeReader1145.mjs <branch fetchAllRows.ts> <main fetchAllRows.ts>
   NEGATIVE CONTROL: PROBE_CONTROL=limit hands the branch's reader a row limit
   the old one never gets, so the two must disagree and the probe must exit 1. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

const [newPath, oldPath] = process.argv.slice(2);
if (!newPath || !oldPath) { console.error('usage: node probeReader1145.mjs <branch file> <main file>'); process.exit(2); }
const CONTROL = process.env.PROBE_CONTROL || '';
if (CONTROL && CONTROL !== 'limit') { console.error(`unknown PROBE_CONTROL=${CONTROL}`); process.exit(2); }

const newSrc = fs.readFileSync(newPath, 'utf8');
const oldSrc = fs.readFileSync(oldPath, 'utf8');
if (!newSrc.includes('maxRows?: number,\n): Promise<{ data: T[]; error: unknown }> {\n  const fetchPage') && !newSrc.replace(/\r\n/g, '\n').includes('maxRows?: number,\n): Promise<{ data: T[]; error: unknown }> {\n  const fetchPage')) {
  console.error('probeReader1145: REFUSING TO RUN. The branch file does not carry the Round 1145 row limit on fetchAllRowsParallel, so there is nothing to compare.');
  process.exit(2);
}
if (oldSrc.replace(/\r\n/g, '\n') === newSrc.replace(/\r\n/g, '\n')) {
  console.error('probeReader1145: REFUSING TO RUN. The two files are the same file, so agreeing proves nothing.');
  process.exit(2);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-reader-1145-'));
const load = async (src, name) => {
  const out = path.join(dir, name);
  fs.writeFileSync(out, transformSync(src, { loader: 'ts', format: 'esm' }).code);
  return import(pathToFileURL(out).href);
};
const NEW = await load(newSrc, 'new.mjs');
const OLD = await load(oldSrc, 'old.mjs');

/* The reader waits 400 ms and 800 ms between attempts. The waits are not what
   is being compared, so they fire at once. */
globalThis.setTimeout = fn => { queueMicrotask(fn); return 0; };

const PAGE = 1000;
/* A fake ordered table of `total` rows. `plan` maps a page number to how many
   times that page fails before it answers ('always' never answers), and
   `nullPage` answers one page with data: null and no error. */
const table = (total, plan, nullPage) => {
  const calls = [];
  const left = new Map(Object.entries(plan).map(([k, v]) => [Number(k), v]));
  const page = (from, to) => {
    calls.push(`${from}-${to}`);
    const i = from / PAGE;
    const n = left.get(i);
    if (n === 'always') return Promise.resolve({ data: null, error: { code: '57014', page: i } });
    if (n > 0) { left.set(i, n - 1); return Promise.resolve({ data: null, error: { code: '57014', page: i } }); }
    if (nullPage === i) return Promise.resolve({ data: null, error: null });
    const len = Math.max(0, Math.min(total, to + 1) - from);
    return Promise.resolve({ data: Array.from({ length: len }, (_, k) => from + k), error: null });
  };
  return { page, calls };
};

const TOTALS = [0, 1, 999, 1000, 1001, 2000, 2300, 5000, 5865, 15000, 15278];
const FIRST = [0, 1, 2, 5, 15, 16];
const PLANS = [
  [{}, undefined], [{ 0: 1 }, undefined], [{ 0: 2 }, undefined], [{ 0: 'always' }, undefined],
  [{ 1: 1 }, undefined], [{ 1: 2 }, undefined], [{ 1: 'always' }, undefined],
  [{ 2: 'always' }, undefined], [{ 5: 2 }, undefined], [{ 15: 'always' }, undefined],
  [{ 0: 1, 2: 2 }, undefined], [{}, 0], [{}, 1], [{}, 2],
];

const shape = (r, calls) => JSON.stringify({ calls, n: r.data.length, data: r.data, error: r.error });
let cases = 0, differ = 0, readSomething = 0, sawError = 0, sawRetry = 0;
const firstDiffs = [];
for (const total of TOTALS) for (const firstPages of FIRST) for (const [plan, nullPage] of PLANS) {
  const a = table(total, plan, nullPage), b = table(total, plan, nullPage);
  const oldRes = await OLD.fetchAllRowsParallel(a.page, firstPages);
  const newRes = CONTROL === 'limit'
    ? await NEW.fetchAllRowsParallel(b.page, firstPages, 1000)
    : await NEW.fetchAllRowsParallel(b.page, firstPages);
  cases += 1;
  if (oldRes.data.length > 0) readSomething += 1;
  if (oldRes.error) sawError += 1;
  if (new Set(a.calls).size < a.calls.length) sawRetry += 1;
  if (shape(oldRes, a.calls) !== shape(newRes, b.calls)) {
    differ += 1;
    if (firstDiffs.length < 3) firstDiffs.push(`total ${total}, firstPages ${firstPages}, plan ${JSON.stringify(plan)}: main asked ${a.calls.length} ranges and returned ${oldRes.data.length} rows, the branch asked ${b.calls.length} and returned ${newRes.data.length}`);
  }
  /* The page at a time reader was not edited by the round. Same comparison,
     with no limit and with one, so an accidental edit there shows too. */
  for (const lim of [undefined, 1500]) {
    const c = table(total, plan, nullPage), d = table(total, plan, nullPage);
    const o = await OLD.fetchAllRows(c.page, lim), n = await NEW.fetchAllRows(d.page, lim);
    cases += 1;
    if (shape(o, c.calls) !== shape(n, d.calls)) { differ += 1; if (firstDiffs.length < 3) firstDiffs.push(`fetchAllRows total ${total}, limit ${lim}, plan ${JSON.stringify(plan)}`); }
  }
}

/* A comparison that never read a row, never met an error or never retried
   would agree for the wrong reason. */
if (readSomething < 100 || sawError < 50 || sawRetry < 100) {
  console.error(`probeReader1145: REFUSING TO CALL IT. The matrix is not exercising the reader (${readSomething} reads with rows, ${sawError} with an error, ${sawRetry} with a retried range).`);
  process.exit(2);
}
for (const d of firstDiffs) console.error('  DIFFERS: ' + d);
if (CONTROL === 'limit') {
  if (differ > 0) { console.error(`probeReader1145 control limit: fired, ${differ} of ${cases} cases differ once the branch's reader is handed a row limit. Exit 1 is the expected result.`); process.exit(1); }
  console.error('probeReader1145 control limit: DID NOT FIRE. A row limit changed nothing, so the comparison cannot see one.');
  process.exit(3);
}
if (differ > 0) { console.error(`probeReader1145: ${differ} of ${cases} cases differ between main's reader and the branch's with no row limit passed.`); process.exit(1); }
console.log(`probeReader1145: green. ${cases} cases (${TOTALS.length} table sizes, ${FIRST.length} first page counts, ${PLANS.length} failure plans; ${sawError} ended in an error, ${sawRetry} retried a range): with no row limit passed, main's reader and the branch's ask for the same ranges in the same order and return the same rows and the same errors.`);
