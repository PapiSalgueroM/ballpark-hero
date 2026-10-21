// Remote-only proof of the actual Grid, daily-save and completion hooks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = '8293c758f4284d21baaa2320383cfd5cb5bd4944';
const HOOK = 'src/hooks/useSoccerGrid.ts';
const TEST = 'src/test/soccerGridDeadline.test.tsx';
const SELF = 'scripts/qa/proveSoccerGridDeadline.mjs';
const WORKFLOW = '.github/workflows/soccer-grid-deadline.yml';
const TEST_SHA = '4e144630d8e01ed28aee1d6e083a938747866fbccc9a7fb2875ee092e331243d';
const ORIGINAL_SHA = '626a6ce40a809e3c6edca0f465a0f862d91c777ab7d779a6d400122669683d34';
const PROTECTED = {
  'src/hooks/useDailyPuzzle.ts': '7ca4592d195f8446106faad991b73500113405d2ae8091b2d87077200461c308',
  'src/hooks/useGameCompletion.ts': '125b276927ca63746254f0abab5835d78e7233df7962baa957e8d9fe54d82d84',
};
const KEYS = ['lateValidator', 'lateRarity', 'lateInsert', 'lateWrong', 'lateUnverified', 'timelyValid', 'timelyWrong', 'timelyUnverified', 'exhausted', 'rejected', 'overtimeValid', 'overtimeWrong'];
const TITLES = [
  'late validator success cannot change the completed main result',
  'late rarity success cannot change the completed main result',
  'late selection-write success cannot change the completed main result',
  'late wrong verdict cannot change the completed main result',
  'late unverified verdict preserves the completed main result',
  'timely valid answers still update the main board and save',
  'timely wrong answers still consume one main guess',
  'timely unverified answers remain a no-penalty retry',
  'exhausted checking still preserves the guess budget',
  'rejected validation still preserves the guess budget',
  'genuine Overtime success stays separate from the frozen main result',
  'genuine Overtime wrong answers remain unlimited and unscored',
];
const CAUSES = [
  'The main result must stay frozen after late validator success',
  'The main result must stay frozen after late rarity success',
  'The main result must stay frozen after late selection-write success',
  'The main result must stay frozen after a late wrong verdict',
];
const RELATED = {
  'src/hooks/useDailyPuzzleIdentity.test.ts': [
    'waits for the Supabase puzzle when there is no static pool, then writes its id into the save',
    'restores a save under the same man',
    'starts fresh when a different man arrives under the same index, and does not carry his finish across',
    'marks a restored finish once, when the man it belongs to arrives',
    'still reads a save written before the id existed',
    'a game with no static pool and no getPuzzleId still finishes loading when its puzzle lands',
    'a static pool game without getPuzzleId saves and restores exactly as before, with no id',
  ],
  'src/hooks/useGameCompletion.test.ts': [
    'records nothing for a game that mounts already finished',
    'records a finish it witnessed exactly once',
    'records nothing for a finish the daily puzzle hook restored after mount, and a later real finish once',
    'records again after a reset and a new finish',
  ],
};
const mode = process.argv[2], out = process.env.SC_GRID_DEADLINE_OUT;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourceMap = names => Object.fromEntries(names.map(name => [name, sha(fs.readFileSync(name))]));
const require = createRequire(import.meta.url);
const setupFault = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function once(source, before, after) { assert.equal(source.split(before).length, 2, 'Unique source anchor: ' + before); return source.replace(before, after); }
function candidateFrom(original) {
  const status = "  const gameStatus: SoccerGridGameStatus = (rawDailyStatus !== 'playing' || timeUp) ? 'complete' : 'playing';\n";
  const ref = "  const mainRoundComplete = useRef(gameStatus === 'complete');\n  mainRoundComplete.current = gameStatus === 'complete';\n";
  const guard = '          if (!isOvertime && mainRoundComplete.current) return;\n';
  let candidate = once(original, status, status + ref);
  candidate = once(candidate, '        if (isValid) {\n', '        if (isValid) {\n' + guard);
  const rarity = '          const rarity = await fetchRarity(puzzle.id, capturedCell, displayName);\n';
  candidate = once(candidate, rarity, rarity + guard);
  const insert = '            player_name: displayName.toLowerCase(),\n          });\n';
  candidate = once(candidate, insert, insert + guard);
  candidate = once(candidate, '        } else {\n          setWrongFlash', '        } else {\n' + guard + '          setWrongFlash');
  assert.equal(candidate.split(guard).length, 5, 'Four verified-result guards, no quota/toast branch change');
  assert.equal(once(candidate.split(guard).join(''), ref, ''), original, 'Whole original hook inverse');
  return Buffer.from(candidate);
}
assert(['baseline', 'fixed'].includes(mode));
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI is mandatory');
assert(out && path.isAbsolute(out), 'SC_GRID_DEADLINE_OUT must be absolute');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Inherited actual offline preload');
assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh report path');
fs.mkdirSync(out, { recursive: true });
const report = { version: 1, mode, base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), status: 'running', qualified: false, arms: [], related: [], limits: 'Actual hook/save/completion proof at stubbed external IO. No live database, browser, complete-game or publication claim.' };
let names, before;
try {
  git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
  const allowed = new Set([HOOK, TEST, SELF, WORKFLOW]);
  const changed = git(['diff', '--name-only', BASE, 'HEAD', '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(name => allowed.has(name)), 'Only declared source leaves: ' + changed);
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA, 'Frozen actual-hook test');
  const original = git(['show', BASE + ':' + HOOK]); assert.equal(sha(original), ORIGINAL_SHA);
  for (const [name, expected] of Object.entries(PROTECTED)) { assert.equal(sha(fs.readFileSync(name)), expected, 'Protected original source: ' + name); assert(fs.readFileSync(name).equals(git(['show', BASE + ':' + name]))); }
  const candidate = candidateFrom(original.toString());
  assert(fs.readFileSync(HOOK).equals(mode === 'baseline' ? original : candidate), 'Exact selected hook source');
  fs.writeFileSync(path.join(out, 'original-hook.ts'), original, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.tsx'), fs.constants.COPYFILE_EXCL);
  write('source-bindings.json', { base: BASE, head: report.head, mode, hook: HOOK, originalSha256: sha(original), candidateSha256: sha(candidate), test: TEST, testSha256: TEST_SHA, protected: PROTECTED, wholeInverseExact: true });
  names = git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort(); before = sourceMap(names); write('source-before.json', before);
  function child(label, files, expectedSource, raw) {
    assert.deepEqual(sourceMap(names), expectedSource, label + ' whole source before');
    const dir = path.join(out, label); fs.mkdirSync(dir);
    const args = ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')];
    const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') };
    if (raw) env.SC_GRID_DEADLINE_RAW = path.join(dir, 'observations.json');
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024, env });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    write(label + '/process.json', { exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null, args });
    write(label + '/source-after.json', sourceMap(names));
    assert.deepEqual(sourceMap(names), expectedSource, label + ' whole source after');
    assert(!result.error && !result.signal && result.status !== null, label + ' child completed');
    assert(!setupFault.test((result.stdout || '') + (result.stderr || '')), label + ' no setup/unhandled/transport fault');
    assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, label + ' no ordinary transport blocks');
    return { dir, exit: result.status, units: JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))) };
  }
  function arm(label, faults, expectedSource) {
    const run = child(label, [TEST], expectedSource, true), units = run.units, rows = units.testResults.flatMap(suite => suite.assertionResults);
    const record = { label, status: 'unqualified', exit: run.exit }; report.arms.push(record);
    assert.equal(run.exit, faults ? 1 : 0); assert.equal(units.success, !faults); assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
    assert.equal(units.numTotalTests, 12); assert.equal(units.numPassedTests, faults ? 8 : 12); assert.equal(units.numFailedTests, faults ? 4 : 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(rows.length, 12); assert.deepEqual(rows.map(row => row.title), TITLES);
    for (const [index, row] of rows.entries()) { assert.equal(row.status, faults && index < 4 ? 'failed' : 'passed'); if (row.status === 'failed') { const cause = row.failureMessages.join('\n'); assert(cause.includes(CAUSES[index]) && /expected false to be true/i.test(cause), 'Exact completed-main Boolean cause'); } else assert.equal(row.failureMessages.length, 0); }
    const bytes = fs.readFileSync(path.join(run.dir, 'observations.json')), raw = JSON.parse(bytes);
    assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
    for (const [index, key] of KEYS.entries()) {
      const row = raw.cases[key]; assert.equal(row.title, TITLES[index]); assert.deepEqual(row.unexpected, []); assert(row.deferred.every(item => item.settled === true)); assert(row.requests.length > 0); assert(row.moments.length >= 2);
      const lookup = name => { const matches = row.moments.filter(moment => moment.label === name); assert.equal(matches.length, 1, key + ' unique moment: ' + name); return matches[0]; };
      const ready = lookup('ready'), settled = lookup(index >= 10 ? 'settled-overtime' : 'settled-main');
      assert.equal(ready.state.main.correctCount, 1); assert.equal(ready.state.main.rarityScore, 20); assert.equal(ready.state.main.guessesLeft, 14); assert.equal(ready.state.main.cells[0].playerName, 'Grid Fixture First'); assert.deepEqual(ready.state.recordings, []);
      assert.equal(settled.state.validating, false); assert.equal(settled.state.activeCell, null); assert.equal(typeof settled.state.main.dailyJSON, 'string'); JSON.parse(settled.state.main.dailyJSON);
      if (index < 4) {
        assert.deepEqual(row.moments.map(moment => moment.label), ['ready', 'before-pending', 'pending', 'completed-main', 'overtime-entered', 'settled-main']);
        const pending = lookup('pending'), completed = lookup('completed-main'), overtime = lookup('overtime-entered');
        assert.equal(pending.at - ready.at, 39000); assert.equal(completed.at - ready.at, 40000); assert.equal(pending.state.validating, true); assert.equal(completed.state.validating, true); assert.equal(completed.state.gameStatus, 'complete'); assert.equal(completed.state.timeUp, true); assert.equal(completed.state.main.correctCount, 1); assert.equal(completed.state.main.rarityScore, 20); assert.deepEqual(completed.state.recordings, [['/soccer-grid', 100, 'Grid Fixture Guest', 0]]); assert.equal(overtime.state.isOvertime, true);
        assert.equal(same(settled.state.main, completed.state.main), !faults, key + ' actual completed main preservation'); assert.deepEqual(settled.state.recordings, completed.state.recordings); assert.deepEqual(settled.state.overtimeCells, []);
        assert(row.requests.some(request => request.deferred === row.deferred[0]?.name), key + ' actual held request');
      }
    }
    Object.assign(record, { status: 'qualified', passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: bytes.length, rawSha256: sha(bytes) });
    return { raw, bytes };
  }
  function related(label) {
    const run = child(label, Object.keys(RELATED), before, false), units = run.units;
    assert.equal(run.exit, 0); assert.equal(units.success, true); assert.equal(units.testResults.length, 2); assert.equal(units.numTotalTests, 11); assert.equal(units.numPassedTests, 11); assert.equal(units.numFailedTests, 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
    const seen = new Set(); for (const suite of units.testResults) { const name = Object.keys(RELATED).find(file => suite.name.replaceAll('\\', '/').endsWith('/' + file)); assert(name && !seen.has(name)); seen.add(name); assert.deepEqual(suite.assertionResults.map(row => row.title), RELATED[name]); assert(suite.assertionResults.every(row => row.status === 'passed' && row.failureMessages.length === 0)); }
    report.related.push({ label, status: 'qualified', passed: 11, titles: RELATED });
  }
  if (mode === 'baseline') { arm('baseline', true, before); related('related-baseline'); }
  else {
    assert(/^[0-9a-f]{64}$/.test(process.env.SC_GRID_DEADLINE_BASELINE_RAW_SHA256 || ''), 'Actual separately qualified original raw pin');
    const normal = arm('normal', false, before); related('related-normal'); let control;
    try { fs.writeFileSync(HOOK, original); control = arm('original', true, { ...before, [HOOK]: ORIGINAL_SHA }); }
    finally { fs.writeFileSync(HOOK, candidate); assert.deepEqual(sourceMap(names), before, 'Entire candidate restored in finally'); }
    assert.equal(sha(control.bytes), process.env.SC_GRID_DEADLINE_BASELINE_RAW_SHA256, 'Whole original raw equals independently qualified baseline');
    for (const key of KEYS.slice(4)) assert.deepEqual(normal.raw.cases[key], control.raw.cases[key], 'Whole healthy case preserved: ' + key);
    const restored = arm('restored', false, before); assert(restored.bytes.equals(normal.bytes), 'Whole normal/restored raw byte equality'); related('related-restored');
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) { const after = sourceMap(names); write('source-after.json', after); try { assert.deepEqual(after, before); report.sourceHeld = true; } catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; } }
  write('report.json', report); console.log(`Soccer Grid deadline ${mode}: ${report.status}; ${report.arms.length} owned arm(s), ${report.related.length} prior suite run(s), qualified=${report.qualified}`);
}
