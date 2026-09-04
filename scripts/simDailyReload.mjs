/* Daily reload harness: a finished daily survives a refresh and cannot be
   played again.

   Round 428. An audit found daily games where a finished daily was
   destroyed by a page refresh, the same daily was then replayable with the
   answer known, and every replay recorded a second completion and paid the
   score again (game_completions row, local totals, and for a signed in
   player user_scores.total_points; only daily_completions dedupes). Eleven
   of twelve investigated routes were confirmed plus four sibling hooks;
   /nba-stat-line was already right and is the positive control.

   The test is src/test/dailyReload.test.tsx. It discovers one driver per
   route from src/test/dailyReload/<slug>.driver.tsx (contract in
   src/test/dailyReload/driver.ts), mounts the REAL page or hook with the
   real useGameCompletion, the real restoredFinish handshake and jsdom's
   real localStorage, and runs five assertions per row: one dated record
   after the finish; a byte identical finished outcome after unmount and
   remount; every replay path refused with the record unchanged and no
   replay control offered; recordCompletion called exactly once across all
   of that; and a fresh daily, nothing thrown, nothing recorded, when the
   key holds each of the six wreckage forms scripts/sweepSaves.mjs writes.

   This wrapper refuses to pass unless vitest names the test file and prints
   the passed summary, prints one line per route, and then runs the two
   negative controls (house rule: prove the check can fail):
     DAILY_RELOAD_CONTROL=clear   drops every prefixed key between the
                                  unmount and the remount; assertion (2)
                                  must then FAIL on every row, with (1)
                                  still green so the red is the restore and
                                  not a load error
     DAILY_RELOAD_CONTROL=silent  makes markRestoredFinish a no-op;
                                  assertion (4) must then FAIL on every row
                                  whose restore depends on the mark (a
                                  handler restore) and stay green on every
                                  initializer row and on nba-stat-line,
                                  which sets its own already-played flag in
                                  the same batch. A probe test proves the
                                  stub fired even on a day with no mark
                                  dependent rows.
   Then the source backstop: for every row that depends on the mark, the
   restoring file is read as code (comments and string contents stripped)
   and must call markRestoredFinish with the slug ahead of the finished
   state set in the same function; the same checker is then run on a copy
   with the call removed and must go red, or the check is dead.

   Run: node scripts/simDailyReload.mjs          (all rows)
        ONLY=nba-stat-line node scripts/simDailyReload.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/dailyReload.test.tsx';
const ONLY = process.env.ONLY || '';
const ASSERTIONS = [1, 2, 3, 4, 5];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

function runVitest(extraEnv) {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', TEST, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/* One parse for every run: the row descriptions the test prints, the
   per assertion marks from the verbose reporter, the two top level tests,
   and the summary line. */
function parse(out) {
  const rows = new Map();
  const top = {};
  for (const raw of out.split('\n')) {
    const line = raw.replace(/\r$/, '');
    let m = line.match(/^DAILY_RELOAD_ROW (\{.*\})\s*$/);
    if (m) {
      const info = JSON.parse(m[1]);
      rows.set(info.slug, { info, marks: {} });
      continue;
    }
    m = line.match(/^\s*([✓×↓])\s+\S*dailyReload\.test\.tsx > daily reload > (.+?) > \((\d)\)/);
    if (m) {
      if (!rows.has(m[2])) rows.set(m[2], { info: null, marks: {} });
      rows.get(m[2]).marks[Number(m[3])] = m[1];
      continue;
    }
    m = line.match(/^\s*([✓×↓])\s+\S*dailyReload\.test\.tsx > daily reload > (discovers drivers|markRestoredFinish is live|silent control: markRestoredFinish is a no-op)\b/);
    if (m) top[m[2]] = m[1];
  }
  const summaryLine = out.match(/Tests\s+(.+)/);
  const summary = summaryLine ? summaryLine[1].trim() : null;
  const passed = summary ? summary.match(/(\d+) passed/) : null;
  const failed = summary ? summary.match(/(\d+) failed/) : null;
  return {
    named: out.includes('dailyReload.test.tsx'),
    rows,
    top,
    summary,
    passed: passed ? Number(passed[1]) : 0,
    failed: failed ? Number(failed[1]) : 0,
  };
}

const marksOf = row => ASSERTIONS.map(n => row.marks[n] || '?').join('');
const redOnes = row => ASSERTIONS.filter(n => row.marks[n] !== '✓').map(n => `(${n})`).join(' ');
const describe = info => `${info.restoreStyle} restore${info.usesRestoreMark ? ', mark dependent' : info.restoreStyle === 'handler' ? ', no mark needed' : ''}, ${info.payloadShape} payload`;
const detailLines = out => out.split('\n').filter(l => /AssertionError|Error:|expected|×/.test(l)).slice(0, 14).map(l => '    ' + l.trim()).join('\n');

/* ------------------------------------------------------------ 1) the run */
console.log(`1) The real routes, rendered: a finished daily survives a refresh and refuses a replay${ONLY ? ` (ONLY=${ONLY})` : ''}`);
const main = runVitest({ DAILY_RELOAD_CONTROL: '' });
const parsed = parse(main.out);
if (!parsed.named) abort('vitest did not report on the test file at all, so nothing was checked:\n' + main.out.slice(-2000));
console.log(`   vitest exit ${main.code}, ${parsed.summary || 'no summary line'}`);
if (parsed.top['discovers drivers'] !== '✓') fail('the driver discovery test is not green (a malformed driver file, or ONLY names no row):\n' + detailLines(main.out));
if (parsed.top['markRestoredFinish is live'] !== '✓') fail('the restoredFinish handshake is not live in the normal run');
const rowList = [...parsed.rows.values()].filter(r => r.info);
if (rowList.length === 0) fail('no driver rows ran, so nothing was checked (add src/test/dailyReload/<slug>.driver.tsx)');
for (const row of rowList) {
  const allGreen = ASSERTIONS.every(n => row.marks[n] === '✓');
  console.log(`   ${row.info.slug}: ${allGreen ? 'green' : 'RED ' + redOnes(row)}  [${marksOf(row)}]  ${describe(row.info)}`);
  if (!allGreen) fail(`${row.info.slug} is red on ${redOnes(row)}`);
}
for (const [slug, row] of parsed.rows) if (!row.info) fail(`marks appeared for "${slug}" but the test printed no row description for it`);
const expectedTests = rowList.length * ASSERTIONS.length + 2;
if (main.code !== 0 || parsed.failed > 0 || parsed.passed !== expectedTests) {
  fail(`expected ${expectedTests} passed and none failed, vitest says: ${parsed.summary || 'nothing'}`);
  console.error(detailLines(main.out));
}

/* --------------------------------------------- 2) control: keys dropped */
console.log('2) NEGATIVE CONTROL clear: every prefixed key is dropped between the unmount and the remount, (2) must fail on every row');
{
  const run = runVitest({ DAILY_RELOAD_CONTROL: 'clear' });
  const p = parse(run.out);
  if (!p.named) abort('control cannot run: vitest did not report on the test file:\n' + run.out.slice(-2000));
  const rows = [...p.rows.values()].filter(r => r.info);
  if (rows.length !== rowList.length) fail(`control clear ran ${rows.length} row(s), the normal run ${rowList.length}`);
  let flipped = 0;
  for (const row of rows) {
    const finished = row.marks[1] === '✓';
    const restoreRed = row.marks[2] === '×';
    const dropped = new RegExp(`^DAILY_RELOAD_CLEAR ${row.info.slug} dropped ([1-9]\\d*) key`, 'm').test(run.out);
    console.log(`   ${row.info.slug}: [${marksOf(row)}] ${finished && restoreRed && dropped ? 'restore went red with the key gone, as designed' : 'DID NOT FLIP'}`);
    if (!finished) fail(`control clear: ${row.info.slug} did not even finish (1), so its red is a load error and not the check`);
    if (!dropped) fail(`control clear: ${row.info.slug} had no key to drop, the control changed nothing`);
    if (!restoreRed) fail(`control clear: ${row.info.slug} still restored with its key gone; the restore does not depend on storage, so a refresh is not what the test measures`);
    if (finished && restoreRed && dropped) flipped += 1;
  }
  console.log(`   ${flipped} of ${rows.length} row(s) flipped`);
}

/* ---------------------------------------- 3) control: the mark silenced */
console.log('3) NEGATIVE CONTROL silent: markRestoredFinish is a no-op, (4) must fail on every mark dependent row and stay green on every other');
{
  const run = runVitest({ DAILY_RELOAD_CONTROL: 'silent' });
  const p = parse(run.out);
  if (!p.named) abort('control cannot run: vitest did not report on the test file:\n' + run.out.slice(-2000));
  if (p.top['silent control: markRestoredFinish is a no-op'] !== '✓') fail('control silent: the probe says the stub did not swallow the mark, the control did not fire');
  else console.log('   probe: the stub swallowed a mark and the real handshake could not consume it, the control is live');
  const rows = [...p.rows.values()].filter(r => r.info);
  if (rows.length !== rowList.length) fail(`control silent ran ${rows.length} row(s), the normal run ${rowList.length}`);
  let flipped = 0;
  let held = 0;
  for (const row of rows) {
    const want = row.info.usesRestoreMark ? '×' : '✓';
    const got = row.marks[4] || '?';
    const restoredFine = [1, 2, 3].every(n => row.marks[n] === '✓');
    const asDesigned = got === want && restoredFine;
    const verdict = row.info.usesRestoreMark
      ? (got === '×' ? 'recorded again without the mark, as designed' : 'DID NOT FLIP')
      : (got === '✓' ? 'stayed green without the mark, as designed' : 'WENT RED without depending on the mark');
    console.log(`   ${row.info.slug}: [${marksOf(row)}] ${verdict}`);
    if (!restoredFine) fail(`control silent: ${row.info.slug} is red on ${[1, 2, 3].filter(n => row.marks[n] !== '✓').map(n => `(${n})`).join(' ')}; silencing the mark must only change whether the completion records`);
    if (got !== want) fail(`control silent: ${row.info.slug} (4) is ${got}, expected ${want} for a ${describe(row.info)}`);
    if (asDesigned) { if (row.info.usesRestoreMark) flipped += 1; else held += 1; }
  }
  const dependent = rows.filter(r => r.info.usesRestoreMark).length;
  console.log(`   ${flipped} of ${dependent} mark dependent row(s) flipped, ${held} of ${rows.length - dependent} other row(s) held`);
  if (dependent === 0) console.log('   no mark dependent rows today; the probe alone proves the stub, and the first Group A or Group C row will be the first to flip here');
}

/* ------------------------------------------- 4) the source backstop */
console.log('4) Source backstop: every mark dependent restore names markRestoredFinish(<slug>) ahead of its finished state set, as code');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* Same length as the input, so an index found in the blanked text is valid
   in the comment stripped text it came from. */
function blankStrings(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      out += c;
      i += 1;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\' && i + 1 < src.length) { out += '  '; i += 2; continue; }
        out += src[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < src.length) { out += c; i += 1; }
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function markBeforeSet(code, slug, setter, binding = null) {
  const blanked = blankStrings(code);
  const setterBlanked = blankStrings(setter);
  const calls = [...blanked.matchAll(/\bmarkRestoredFinish\s*\(/g)];
  if (calls.length === 0) return { ok: false, why: 'no markRestoredFinish( call in the code (comments and strings excluded)' };
  const problems = [];
  for (const m of calls) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let i = open; i < blanked.length; i += 1) {
      if (blanked[i] === '(') depth += 1;
      else if (blanked[i] === ')') { depth -= 1; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) { problems.push('an unclosed markRestoredFinish('); continue; }
    const arg = code.slice(open + 1, close).trim();
    let resolved = null;
    const literal = arg.match(/^(['"`])(.*)\1$/);
    if (literal) resolved = literal[2];
    else if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
      const def = code.match(new RegExp(`\\b${arg}\\s*=\\s*(['"\`])([^'"\`]+)\\1`));
      if (def) resolved = def[2];
      else if (binding) {
        /* A shared hook marks with its own parameter (useDailyPuzzle's
           markRestoredFinish(gameSlug)) and the page that calls it binds
           that name. The binding file must hand exactly one literal to the
           name and import the hook the mark lives in, so a page that binds
           it to another slug, or to two, or never calls the hook, is red. */
        const bound = [...new Set([...binding.code.matchAll(new RegExp(`\\b${arg}\\s*:\\s*(['"\`])([^'"\`]+)\\1`, 'g'))].map(x => x[2]))];
        if (bound.length === 1 && binding.importsRestore) resolved = bound[0];
      }
    }
    if (resolved !== slug) { problems.push(`markRestoredFinish(${arg}) does not resolve to '${slug}' (a literal, an identifier assigned that literal in the same file, or a parameter the driver's slugBoundIn file binds to exactly that literal while importing the restore module)`); continue; }
    const after = blanked.slice(close);
    const at = after.indexOf(setterBlanked);
    if (at < 0) { problems.push(`no ${setter} after markRestoredFinish(${arg})`); continue; }
    const between = after.slice(0, at);
    if (/\breturn\b/.test(between)) { problems.push(`a return sits between markRestoredFinish(${arg}) and ${setter}`); continue; }
    if (/\bfunction\b|=>\s*\{/.test(between)) { problems.push(`a new function starts between markRestoredFinish(${arg}) and ${setter}`); continue; }
    return { ok: true, gap: at, arg };
  }
  return { ok: false, why: problems.join('; ') };
}
{
  const dependent = rowList.filter(r => r.info.usesRestoreMark);
  if (dependent.length === 0) console.log('   no mark dependent rows today, nothing to read (this section starts working the day a handler restore row lands)');
  for (const row of dependent) {
    const { slug, restoreFile, finishedSetter, slugBoundIn } = row.info;
    if (!restoreFile || !finishedSetter) { fail(`${slug}: the driver names no restoreFile or finishedSetter, the backstop cannot read it`); continue; }
    const file = path.join(ROOT, restoreFile);
    if (!fs.existsSync(file)) { fail(`${slug}: ${restoreFile} does not exist`); continue; }
    const code = stripComments(fs.readFileSync(file, 'utf8').split('\r\n').join('\n'));
    let binding = null;
    if (slugBoundIn) {
      const boundFile = path.join(ROOT, slugBoundIn);
      if (!fs.existsSync(boundFile)) { fail(`${slug}: ${slugBoundIn} does not exist`); continue; }
      const restoreModule = path.basename(restoreFile).replace(/\.[cm]?[jt]sx?$/, '');
      const boundCode = stripComments(fs.readFileSync(boundFile, 'utf8').split('\r\n').join('\n'));
      binding = {
        file: slugBoundIn,
        code: boundCode,
        importsRestore: new RegExp(`from\\s*['"][^'"]*\\/${escapeRe(restoreModule)}['"]`).test(boundCode),
      };
    }
    const real = markBeforeSet(code, slug, finishedSetter, binding);
    if (!real.ok) { fail(`${slug}: ${restoreFile}: ${real.why}`); continue; }
    /* The inline negative: the same checker on a copy without the call
       must go red, or green above means "did not look". */
    const removed = code.replace(/\bmarkRestoredFinish\s*\([^)]*\)\s*;?/, '');
    if (removed === code) { fail(`${slug}: the backstop negative could not remove the mark call it just found`); continue; }
    const without = markBeforeSet(removed, slug, finishedSetter, binding);
    if (without.ok) { fail(`${slug}: the backstop stays green with the mark call removed, the check is dead`); continue; }
    /* The binding negative: the same binding file with its literal pointed
       at another slug must go red too, or the binding check did not look. */
    if (binding) {
      const pointed = binding.code.replace(new RegExp(`(\\b${real.arg}\\s*:\\s*)(['"\`])${escapeRe(slug)}\\2`), `$1$2not-${slug}$2`);
      if (pointed === binding.code) { fail(`${slug}: the binding negative could not move the literal it just found in ${slugBoundIn}`); continue; }
      const elsewhere = markBeforeSet(code, slug, finishedSetter, { ...binding, code: pointed });
      if (elsewhere.ok) { fail(`${slug}: the backstop stays green with ${slugBoundIn} binding ${real.arg} to another slug, the binding check is dead`); continue; }
    }
    console.log(`   ${slug}: ${restoreFile} marks '${slug}' ${real.gap} chars ahead of ${finishedSetter}${binding ? ` (as ${real.arg}, bound by ${slugBoundIn})` : ''}; red without the call${binding ? ', red with the binding pointed elsewhere' : ''}`);
  }
}

if (failures > 0) {
  console.error(`\nsimDailyReload: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`\nsimDailyReload: all green (${rowList.length} row(s), both controls fired)`);
