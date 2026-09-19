/* No double record harness: the same finish is never recorded twice.

   Round 643. A read only audit on 2026-09-19 proved, with probes, that a
   finished game was recorded again in five shapes. The world board takes the
   day's best so it did not move, but every extra record paid the raw score
   into a signed in player's total again and added a play row:

     fight    Fight Career, Fight Gym and Fight Promoter restored a finished
              save in an effect after mount with no markRestoredFinish
     career   the four My Careers flipped done false then true on every
              Resume coaching then Back, paying the whole legacy again
     slug     twelve daily hooks marked a restored finish under their storage
              name (nfl-hl, ufc-game, football-connect4, career-path) while
              the recorder asked under another, so the mark was never used
     toggle   ten pages gated the recorder on the mode, so Unlimited and back
              re-armed it over a daily already recorded
     restore  six hooks restored a finish after their data loaded with no
              mark, and NFL Career Path re-armed on its Daily tab and recorded
              again from a Play Unlimited that never left the daily

   The test is src/test/noDoubleRecord.test.tsx, one table row per game. It
   mounts the REAL board, page or hook with the real useGameCompletion, the
   real restoredFinish handshake and jsdom's real localStorage, plays the
   finish (which must record exactly once), then a mode toggle and back,
   three coaching round trips, any replay path, and two reloads that must
   come back finished, and holds the recorder at one call throughout. Slug
   rows also prove the daily is still saved under the old key.

   Measured before the fix: with every module this round changed swapped back
   to its origin/main text, 36 of 36 rows were red, each at the step its
   shape predicts (a reload for fight, slug and after-data restore rows, the
   first coaching round trip for the careers, the first toggle for the
   toggle pages).

   NEGATIVE CONTROLS (house rule: prove the check can fail). Each one edits a
   COPY of one module under dist/.no-double-control, refuses to run unless
   its anchor occurs exactly once in that module as code (comments stripped),
   and points vitest at the copy through the NO_DOUBLE_SWAP alias in
   vitest.config.ts. src is never written.
     NO_DOUBLE_CONTROL=nomark       markRestoredFinish becomes a no-op. Every
                                    row whose reload relies on the mark
                                    (usesMark in the table) must go red on a
                                    "records nothing" assertion, and every
                                    other row must stay green.
     NO_DOUBLE_CONTROL=slugdrift    useNflHL's slug pair is put back to its old
                                    mismatch (gameSlug 'nfl-hl'); exactly the
                                    nfl-higher-lower row must go red.
     NO_DOUBLE_CONTROL=togglerearm  Rank 'Em's recorder gate gets its mode
                                    check back; exactly the rank-em row must
                                    go red.
     NO_DOUBLE_CONTROL=all          the three above, in turn.
   A control run exits 0 when the control fired exactly as it should and 1
   when it did not, because a control that changes nothing proves nothing.

   Run: node scripts/simNoDoubleRecord.mjs
        NO_DOUBLE_ONLY=rank-em node scripts/simNoDoubleRecord.mjs   (one row)
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/noDoubleRecord.test.tsx';
const CONTROL = process.env.NO_DOUBLE_CONTROL || '';
const ONLY = process.env.NO_DOUBLE_ONLY || '';

const CONTROLS = {
  nomark: {
    module: '@/lib/restoredFinish',
    file: 'src/lib/restoredFinish.ts',
    from: '  marks.set(gameSlug, Date.now());',
    to: '  void gameSlug; /* NO_DOUBLE_CONTROL=nomark: the mark is dropped */',
    why: 'markRestoredFinish is a no-op, so every restore that relies on it records again',
  },
  slugdrift: {
    module: '@/hooks/useNflHL',
    file: 'src/hooks/useNflHL.ts',
    from: "    gameSlug: 'nfl-higher-lower',\n    storageSlug: 'nfl-hl',",
    to: "    gameSlug: 'nfl-hl',",
    target: 'nfl-higher-lower',
    why: "NFL Higher or Lower marks its restore under 'nfl-hl' again while the recorder asks under 'nfl-higher-lower'",
  },
  togglerearm: {
    module: '@/pages/RankEm',
    file: 'src/pages/RankEm.tsx',
    from: "useGameCompletion('rank-em', rawDailyStatus !== 'playing', score);",
    to: "useGameCompletion('rank-em', mode === 'daily' && rawDailyStatus !== 'playing', score);",
    target: 'rank-em',
    why: "Rank 'Em gates the recorder on the mode again, so Unlimited and back re-arms it",
  },
};
if (CONTROL && CONTROL !== 'all' && !CONTROLS[CONTROL]) {
  console.error(`NO_DOUBLE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(1);
}
if (CONTROL && ONLY) {
  console.error('a control judges the whole table, so it cannot run with NO_DOUBLE_ONLY');
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
/* The worktree checks out CRLF and every anchor here is written LF. */
const readLF = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const count = (hay, needle) => hay.split(needle).length - 1;

/* vitest lives in this tree's node_modules, or in the main tree's when this
   runs from a worktree nested inside it: walk up, as node's own resolution
   does. */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
const VITEST = findVitest();
if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');

/* One vitest run. The json reporter is the verdict (a temp file of its own,
   so two runs at once cannot read each other's); the default reporter is the
   only way the NO_DOUBLE_CASE lines the table prints reach this process. */
function runSuite(env) {
  const out = path.join(os.tmpdir(), `noDoubleRecord-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const text = ((r.stdout || '') + (r.stderr || '')).split(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g')).join('');
  if (!fs.existsSync(out)) return { error: 'vitest wrote no report:\n' + text.slice(-3000) };
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(out, { force: true });
  const tests = new Map();
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      tests.set(a.title, { status: a.status, message: (a.failureMessages || []).join('\n').split('\n')[0] });
    }
  }
  const cases = [...text.matchAll(/NO_DOUBLE_CASE (\{.*\})/g)].map(m => JSON.parse(m[1]));
  const table = text.match(/NO_DOUBLE_TABLE (\{.*\})/);
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  return { code: r.status, tests, cases, table: table ? JSON.parse(table[1]) : null, loadError, text };
}

function checkTable(run) {
  if (run.error) { fail(run.error); return false; }
  if (!run.tests.size) { fail('vitest reported no tests from ' + TEST); return false; }
  if (run.tests.get('discovers the table')?.status !== 'passed') { fail('the table check did not pass: ' + (run.tests.get('discovers the table')?.message ?? 'not run')); return false; }
  if (!run.cases.length) { fail('the table printed no NO_DOUBLE_CASE rows, so nothing was graded'); return false; }
  return true;
}

/* ------------------------------------------------------------------------ */
if (!CONTROL) {
  console.log(`1) The table, rendered: ${TEST}${ONLY ? ` (NO_DOUBLE_ONLY=${ONLY})` : ''}`);
  const run = runSuite(ONLY ? { NO_DOUBLE_ONLY: ONLY } : {});
  if (checkTable(run)) {
    if (run.table) console.log(`   table: ${JSON.stringify(run.table)}`);
    if (run.tests.get('markRestoredFinish is live')?.status !== 'passed') fail('the restoredFinish handshake is not live in the normal run');
    const rows = run.cases.filter(c => !ONLY || c.id === ONLY);
    if (ONLY && rows.length !== 1) fail(`NO_DOUBLE_ONLY=${ONLY} names no row; the table has ${run.cases.map(c => c.id).join(', ')}`);
    for (const c of rows) {
      const t = run.tests.get(c.id);
      const verdict = t?.status === 'passed' ? 'ok  ' : 'RED ';
      console.log(`   ${verdict}${c.id.padEnd(22)} ${c.shape.padEnd(8)} mark ${c.usesMark ? 'yes' : 'no '}${c.toggle ? ', toggle' : ''}${c.coach ? ', coaching' : ''}${t?.status === 'passed' ? '' : `: ${t?.message ?? 'did not run'}`}`);
      if (t?.status !== 'passed') fail(`${c.id} records a finish more than once, or never reaches it`);
    }
    if (!ONLY && rows.length < 36) fail(`only ${rows.length} rows ran; the audit alone named 36`);
    if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every row green, read its output:\n${run.text.slice(-2000)}`);
    console.log(`   vitest exit ${run.code}, ${rows.length} rows`);
  }
  if (failures) {
    console.error(`\nsimNoDoubleRecord: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log(`\nsimNoDoubleRecord: all green (${run.cases.length} rows, each recorded once across the finish, the toggles, the coaching and two reloads)`);
  process.exit(0);
}

/* ------------------------------------------------------------------------ */
const which = CONTROL === 'all' ? Object.keys(CONTROLS) : [CONTROL];
const controlDir = path.join(ROOT, 'dist', '.no-double-control');
let fired = 0;
try {
  for (const name of which) {
    const ctl = CONTROLS[name];
    console.log(`\nNEGATIVE CONTROL ${name}: ${ctl.why}`);
    const src = readLF(ctl.file);
    if (count(src, ctl.from) !== 1) abort(`control ${name} cannot run: ${ctl.file} does not carry exactly one ${JSON.stringify(ctl.from)}`);
    if (count(stripComments(src), ctl.from) !== 1) abort(`control ${name} cannot run: the anchor in ${ctl.file} is not code`);
    const copy = src.replace(ctl.from, ctl.to);
    if (copy === src) abort(`control ${name} cannot run: the rewrite changed nothing`);
    if (/from '\.\.?\//.test(copy)) abort(`control ${name} cannot run: ${ctl.file} has a relative import, which a copy elsewhere cannot resolve`);
    const dir = path.join(controlDir, name);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, path.basename(ctl.file));
    fs.writeFileSync(file, copy);
    console.log(`   ${ctl.file} copied to ${path.relative(ROOT, file).replaceAll('\\', '/')} with its anchor rewritten, src untouched`);

    const run = runSuite({ NO_DOUBLE_CONTROL: name, NO_DOUBLE_SWAP: JSON.stringify({ [ctl.module]: file.replaceAll('\\', '/') }) });
    if (!checkTable(run)) continue;
    if (run.loadError && !run.tests.size) { fail(`control ${name}: the copy did not load, so every red is a crash:\n${run.loadError}`); continue; }
    if (name === 'nomark' && run.tests.get('nomark control: markRestoredFinish is a no-op')?.status !== 'passed') {
      fail('control nomark: the probe says the swapped module still keeps the mark, so the swap did not take');
      continue;
    }
    let wrong = 0;
    let red = 0;
    for (const c of run.cases) {
      const shouldBeRed = name === 'nomark' ? c.usesMark : c.id === ctl.target;
      const t = run.tests.get(c.id);
      const isRed = t?.status === 'failed';
      /* Only the assertion counts: a row red for any other reason (a crash, a
         finish that never lands) is not this control firing. */
      const onPoint = !isRed || /records nothing/.test(t.message);
      const ok = isRed === shouldBeRed && onPoint;
      if (isRed) red += 1;
      if (!ok) wrong += 1;
      console.log(`   ${ok ? 'ok  ' : 'BAD '}${c.id.padEnd(22)} ${isRed ? 'red  ' : 'green'} (${shouldBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    }
    if (wrong) fail(`control ${name}: ${wrong} row(s) did not answer the control the way their table entry says they must`);
    else if (red === 0) fail(`control ${name}: nothing went red, so the rows it targets are not proving anything`);
    else { fired += 1; console.log(`   control ${name} fired: ${red} row(s) red, exactly the ones it should, every other row green`); }
  }
} finally {
  fs.rmSync(controlDir, { recursive: true, force: true });
}

if (failures || fired !== which.length) {
  console.error(`\nsimNoDoubleRecord: control ${CONTROL} did not fire as it should (${failures} failure(s))`);
  process.exit(1);
}
console.log(`\nsimNoDoubleRecord: NO_DOUBLE_CONTROL=${CONTROL} fired exactly where it should, so the checks it targets can fail`);
