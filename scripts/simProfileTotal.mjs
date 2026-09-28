/* Profile total harness: the all time total adds each record at no more than
   its game's cap, with the caps the World Leaderboard uses.

   Round 648. The profile's Total Points was two running sums of raw scores:
   user_scores.total_points on the server, grown by record_auth_completion by
   the raw score of every save, and the browser's own tally in
   src/lib/streaks.ts, grown by the recorder the same way. Pack Battle records
   the banked value of a pack in dollars, so one pack added about 8.8 million
   to a total where a whole Club Manager season is worth 130, and the average
   score, the points badges and the points achievements read the same number.

   WHAT THIS MEASURES. src/test/profileTotal.test.tsx renders the profile hook
   (src/hooks/useProfileTotal.ts) against a planted record set: one absurd
   Pack Battle row of 8,800,000 beside ordinary plays, one play over its cap,
   one play of a game with no cap row, and 1,003 small plays so the read must
   page past the 1,000 row response cap. The total must equal the sum of the
   clamped values, computed by the test's own arithmetic. The same file drives
   the browser tally through the real recorder (src/lib/completions.ts) with
   the caps view stubbed, and holds the pending list (a play recorded before
   this browser has read the caps waits, and settles at no more than its cap
   when a fresh read lands; an empty read is a failed read and drops nothing).

   The before and after are printed from the planted set: before, the absurd
   row was all but the whole total; after, it is worth exactly its cap.

   NEGATIVE CONTROLS, each a broken copy of one module written under
   dist/.profile-total-control and pointed at through PROFILE_TOTAL_SWAP in
   vitest.config.ts (src is never written). A control refuses to run unless its
   anchor occurs exactly once in the module and is code, not a comment. Every
   case is then judged: the ones the control targets must go red on their own
   assertion, every other must stay green.
     noclamp     the sum adds the raw score again; cases 1 and 2
     rawlocal    the tally adds the raw score when a cap is known; 4 and 5
     settleraw   a held play settles at its raw score; 4, 5 and 6
     nocap       the recorder stops handing the tally a cap; 5
     noprime     the recorder stops kicking off the caps read; 5
     firstpage   the hook reads one page of records; 2
   PROFILE_TOTAL_CONTROL=all runs every control in turn. A control run exits 0
   when it fired exactly as it should and 1 when it did not.

   Run: node scripts/simProfileTotal.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/profileTotal.test.tsx';
const CONTROL = process.env.PROFILE_TOTAL_CONTROL || '';
const EXPECTED_CASES = 6;

const CONTROLS = {
  noclamp: {
    file: 'src/lib/scoreCaps.ts', alias: '@/lib/scoreCaps',
    from: '    total += clampScore(Number(record.score), cap);',
    to: '    total += Math.max(0, Math.round(Number(record.score)));',
    why: 'the sum adds the raw score again, so the absurd row is the whole total',
    red: ['1', '2'],
  },
  rawlocal: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '      state.totalPoints = (state.totalPoints || 0) + Math.min(points, cap);',
    to: '      state.totalPoints = (state.totalPoints || 0) + points;',
    why: 'the browser tally adds the raw score when it knows the cap',
    red: ['4', '5'],
  },
  settleraw: {
    file: 'src/lib/streaks.ts', alias: '@/lib/streaks',
    from: '    if (typeof cap === \'number\' && Number.isFinite(cap) && cap >= 1) added += Math.min(pending.score, cap);',
    to: '    if (typeof cap === \'number\' && Number.isFinite(cap) && cap >= 1) added += pending.score;',
    why: 'a held play settles at its raw score once the caps land',
    red: ['4', '5', '6'],
  },
  nocap: {
    file: 'src/lib/completions.ts', alias: '@/lib/completions',
    from: 'Number.isFinite(score) ? score : 0, knownCap(game));',
    to: 'Number.isFinite(score) ? score : 0, undefined);',
    why: 'the recorder stops handing the tally a cap, so every play waits for a read that a fresh cache never makes',
    red: ['5'],
  },
  noprime: {
    file: 'src/lib/completions.ts', alias: '@/lib/completions',
    from: '    primeScoreCaps().catch(() => {',
    to: '    Promise.resolve(null).catch(() => {',
    why: 'the recorder stops kicking off the caps read, so a held play never settles',
    red: ['5'],
  },
  firstpage: {
    file: 'src/hooks/useProfileTotal.ts', alias: '@/hooks/useProfileTotal',
    from: '            .range(from, to)),',
    to: '            .range(from, Math.min(to, 999))),',
    why: 'the hook reads one page of records, so a player past 1,000 plays is short changed',
    red: ['2'],
  },
};

const KNOWN = [...Object.keys(CONTROLS), 'all'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`PROFILE_TOTAL_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error('ABORT: ' + m); process.exit(2); };

const stripTs = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
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

/* One vitest run. The json reporter is the verdict; the default reporter is
   how the PROFILE_TOTAL_MEASURE line reaches this process. */
function runSuite(swap) {
  const VITEST = findVitest();
  if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');
  const out = path.join(os.tmpdir(), `profileTotal-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  if (swap) env.PROFILE_TOTAL_SWAP = JSON.stringify(swap);
  else delete env.PROFILE_TOTAL_SWAP;
  const r = spawnSync(process.execPath, [VITEST, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env,
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
  const measure = text.match(/PROFILE_TOTAL_MEASURE (\{.*\})/);
  const loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-2000) : null;
  return { code: r.status, tests, measure: measure ? JSON.parse(measure[1]) : null, loadError, text };
}

const caseNumber = title => title.split(' ')[0];

/* ------------------------------------------------------------------------ */
/* Default run                                                               */
/* ------------------------------------------------------------------------ */
function defaultRun() {
  console.log(`1) The profile total, rendered against the planted records: ${TEST}`);
  const run = runSuite(null);
  if (run.error) { fail(run.error); return; }
  if (run.loadError) { fail('vitest could not load the suite:\n' + run.loadError); return; }
  if (run.tests.size !== EXPECTED_CASES) {
    fail(`vitest collected ${run.tests.size} cases from ${TEST}, this harness expects ${EXPECTED_CASES}`);
  }
  for (const [title, t] of run.tests) {
    const ok = t.status === 'passed';
    console.log(`   ${ok ? 'ok  ' : 'RED '}${title}${ok ? '' : `: ${t.message}`}`);
    if (!ok) fail(`${title}`);
  }
  if (run.code !== 0 && failures === 0) fail(`vitest exited ${run.code} with every case green, so something outside the cases broke`);

  console.log('\n2) Before and after, on the planted set');
  if (!run.measure) {
    fail('the suite printed no PROFILE_TOTAL_MEASURE line, so the before and after were not measured');
  } else {
    const m = run.measure;
    const pct = x => `${(100 * x).toFixed(2)}%`;
    console.log(`   ${m.records} records. Before: total ${m.before.toLocaleString()}, the Pack Battle row ${m.absurdBefore.toLocaleString()} (${pct(m.absurdShareBefore)} of it).`);
    console.log(`   After: total ${m.after.toLocaleString()}, the Pack Battle row ${m.absurdAfter.toLocaleString()} (${pct(m.absurdShareAfter)} of it), which is exactly its cap.`);
    if (!(m.absurdShareBefore > 0.99)) fail(`the planted absurd row was only ${pct(m.absurdShareBefore)} of the raw total, so this set does not reproduce the defect`);
    if (!(m.absurdAfter < m.absurdBefore)) fail('the absurd row contributes no less after the clamp than before');
  }
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                  */
/* ------------------------------------------------------------------------ */
function writeBrokenCopy(name, c) {
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8').replaceAll('\r\n', '\n');
  if (count(src, c.from) !== 1) abort(`control ${name} cannot run: its anchor occurs ${count(src, c.from)} times in ${c.file}, it must occur exactly once`);
  if (count(stripTs(src), c.from) !== 1) abort(`control ${name} cannot run: its anchor in ${c.file} is not code (it only matches inside a comment)`);
  const changed = src.replace(c.from, c.to);
  if (changed === src) abort(`control ${name} changed nothing in ${c.file}`);
  const dir = path.join(ROOT, 'dist', '.profile-total-control', name);
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, path.basename(c.file));
  fs.writeFileSync(copy, changed);
  return copy;
}

function controlRun(name) {
  const c = CONTROLS[name];
  console.log(`CONTROL ${name}: ${c.why}`);
  const copy = writeBrokenCopy(name, c);
  const run = runSuite({ [c.alias]: copy });
  if (run.error) { fail(run.error); return false; }
  if (run.loadError) { fail('vitest could not load the suite under the control:\n' + run.loadError); return false; }
  if (run.tests.size !== EXPECTED_CASES) { fail(`the control run collected ${run.tests.size} cases, expected ${EXPECTED_CASES}`); return false; }
  let good = true;
  for (const [title, t] of run.tests) {
    const n = caseNumber(title);
    const mustBeRed = c.red.includes(n);
    const isRed = t.status !== 'passed';
    const ok = mustBeRed === isRed;
    console.log(`   ${ok ? 'ok  ' : 'BAD '}case ${n} ${isRed ? 'red  ' : 'green'} (${mustBeRed ? 'must be red' : 'must stay green'})${isRed ? `: ${t.message}` : ''}`);
    if (!ok) good = false;
  }
  if (run.code === 0) { console.log('   BAD vitest exited 0 under a control'); good = false; }
  if (good) console.log(`CONTROL PROVED ${name}: cases ${c.red.join(', ')} went red on their own assertions and every other case stayed green.`);
  else fail(`control ${name} did not fire the way it must`);
  return good;
}

if (!CONTROL) {
  defaultRun();
  console.log('');
  if (failures) { console.error(`simProfileTotal: ${failures} failure(s)`); process.exit(1); }
  console.log('simProfileTotal: green. The profile total adds each record at no more than its cap, the browser tally clamps at record time or waits for a cap, and the absurd row is worth exactly its cap.');
  process.exit(0);
}

const names = CONTROL === 'all' ? Object.keys(CONTROLS) : [CONTROL];
let proved = 0;
for (const name of names) if (controlRun(name)) proved += 1;
console.log('');
if (proved === names.length) { console.log(`simProfileTotal controls: ${proved} of ${names.length} proved.`); process.exit(0); }
console.error(`simProfileTotal controls: ${proved} of ${names.length} proved, ${names.length - proved} did NOT fire the way they must.`);
process.exit(1);
