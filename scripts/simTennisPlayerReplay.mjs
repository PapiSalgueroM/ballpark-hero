import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const boardFile = 'src/components/tennis-player/TennisPlayerBoard.tsx';
const oldSuite = 'src/test/tennisPlayerFeedback.test.tsx';
const newSuite = 'src/test/tennisPlayerReplay.test.tsx';
const regression = 'clears an unanswered surrender prompt before replaying the same unlimited puzzle';
const suites = [
  { file: newSuite, group: 'actual Tennis Player surrender prompt across replay', titles: [
    regression,
    'cancels a current surrender decision and keeps the accepted guess and payout',
    'confirms a fresh surrender for zero points without a winning score post',
    'keeps an active surrender decision open through hints and further guesses',
    'replays the same puzzle with normal clue points and an available fresh decision',
  ] },
  { file: oldSuite, group: 'actual Tennis Player committed feedback', titles: [
    'keeps a committed first-clue win correct at the old delayed boundary',
    'cues repeated accepted wrong appends with stable clues and the original600 win',
    'keeps hints and clones quiet without restarting or extending a live cue',
    'restores completed and partial dailies quietly without paying a restored finish',
    'reports the exhausted last miss truthfully with the original zero-score loss',
    'clears reset and unmount timers without leaking delayed feedback',
    'separates an immediate Give up decision from the active wrong-guess stamp',
    'binds finite static-motion cues full guess text and owned44px actions',
    'reopens actual active-game help without changing the accepted round',
    'holds independent original six-clue payouts exact saves full shares and once completion',
  ] },
];
const baseline = process.env.TENNIS_REPLAY_BASELINE === '1';
assert(!process.env.TENNIS_REPLAY_BASELINE || baseline, 'Explicit baseline control is 1');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs'), 'Runtime inherits the offline transport');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'TENNIS_FEEDBACK_CSS']) assert(!process.env[key], `No inherited control ${key}`);
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const sha = body => createHash('sha256').update(body).digest('hex');
const clean = body => body.replace(/\x1b\[[0-9;]*m/g, '');
const lf = body => body.replace(/\r\n/g, '\n');
function once(body, from, to) {
  assert.equal(body.split(from).length - 1, 1, 'Unique executable source anchor');
  const changed = body.replace(from, to); assert.notEqual(changed, body, 'Effective source edit'); return changed;
}
const original = git(['show', `${base}:${boardFile}`]);
const fixed = once(original, 'onClick={resetGame}', 'onClick={() => { resetGame(); setShowGiveUpConfirm(false); }}');
assert.equal(once(fixed, 'onClick={() => { resetGame(); setShowGiveUpConfirm(false); }}', 'onClick={resetGame}'), original, 'Whole replay handler inverse equals original');
assert.equal(lf(fs.readFileSync(path.join(root, boardFile), 'utf8')), baseline ? original : fixed, 'Only the declared replay handler differs from original');
assert.equal(lf(fs.readFileSync(path.join(root, oldSuite), 'utf8')), git(['show', `${base}:${oldSuite}`]), 'All ten original feedback tests remain whole');
const artifactRoot = process.env.TENNIS_REPLAY_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-tennis-replay-'));
assert(path.isAbsolute(artifactRoot) && fs.statSync(artifactRoot).isDirectory(), 'Existing absolute artifact root');
assert(path.relative(root, artifactRoot).split(path.sep).includes('..'), 'Evidence stays outside checkout');
const out = path.join(artifactRoot, 'unit'); assert(!fs.existsSync(out), 'Fresh unit evidence'); fs.mkdirSync(out);
const write = (file, body) => fs.writeFileSync(path.join(out, file), typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2) + '\n', { flag: 'wx' });
const controlDir = path.join(root, 'src/test/__tennisReplayControls');
assert(!fs.existsSync(controlDir), 'Exclusive disposable control path');
function sourceMap() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => { const body = fs.readFileSync(path.join(root, file)); return { file, bytes: body.length, sha256: sha(body) }; });
}
const initial = sourceMap(), statusBefore = git(['status', '--porcelain', '--untracked-files=all']);
const report = { version: 1, base, head: git(['rev-parse', 'HEAD']).trim(), mode: baseline ? 'baseline' : 'fixed', qualified: false, productQualified: false, cases: 15, arms: [], temporaryControlsRemoved: false };
write('source-before.json', initial); write('original-TennisPlayerBoard.tsx', original); write('expected-fixed-TennisPlayerBoard.tsx', fixed);
write('source-bindings.json', { base, original: sha(original), fixed: sha(fixed), actual: sha(fs.readFileSync(path.join(root, boardFile))), oldSuite: sha(fs.readFileSync(path.join(root, oldSuite))), newSuite: sha(fs.readFileSync(path.join(root, newSuite))), suites });
function run(name, expectFault, controlFile) {
  fs.mkdirSync(path.join(out, name));
  const transport = path.join(out, name, 'transport.transport');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: transport };
  if (controlFile) { env.US_BOARD_CONTROL_ALIAS = '@/components/tennis-player/TennisPlayerBoard'; env.US_BOARD_CONTROL_FILE = controlFile; }
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...suites.map(suite => suite.file), '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', `--outputFile=${path.join(out, name, 'vitest.json')}`];
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  write(`${name}/stdout.log`, child.stdout ?? ''); write(`${name}/stderr.log`, child.stderr ?? '');
  write(`${name}/process.json`, { command: process.execPath, args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, copiedOriginal: Boolean(controlFile) });
  assert.ifError(child.error); assert.equal(child.signal, null, 'No timeout or signal');
  assert(!fs.existsSync(transport) || fs.statSync(transport).size === 0, 'No swallowed child transport denials');
  assert.doesNotMatch(clean(`${child.stdout ?? ''}\n${child.stderr ?? ''}`), /Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|(?:^|\n)(?:TypeError|ReferenceError|SyntaxError):|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND/, 'No runtime or setup faults');
  const json = JSON.parse(fs.readFileSync(path.join(out, name, 'vitest.json'), 'utf8'));
  assert.equal(child.status, expectFault ? 1 : 0); assert.equal(json.testResults.length, 2); assert.equal(json.numTotalTests, 15);
  assert.equal(json.numPassedTests, expectFault ? 14 : 15); assert.equal(json.numFailedTests, expectFault ? 1 : 0);
  assert.equal(json.numPendingTests, 0); assert.equal(json.numTodoTests, 0); assert.equal(json.success, !expectFault);
  if (json.numRuntimeErrorTestSuites !== undefined) assert.equal(json.numRuntimeErrorTestSuites, 0);
  if (json.unhandledErrors !== undefined) assert.deepEqual(json.unhandledErrors, []);
  const failures = [];
  for (const suite of suites) {
    const matches = json.testResults.filter(row => row.name.replaceAll('\\', '/').endsWith('/' + suite.file)); assert.equal(matches.length, 1, 'One actual result per suite');
    const result = matches[0]; assert.equal(result.message, ''); assert.deepEqual(result.assertionResults.map(row => row.title), suite.titles);
    assert.equal(result.status, expectFault && suite.file === newSuite ? 'failed' : 'passed');
    for (const row of result.assertionResults) {
      assert.deepEqual(row.ancestorTitles, [suite.group]); assert.equal(row.fullName, `${suite.group} ${row.title}`);
      const failed = expectFault && row.title === regression; assert.equal(row.status, failed ? 'failed' : 'passed');
      assert.equal(row.failureMessages.length, failed ? 1 : 0);
      if (failed) {
        const message = clean(row.failureMessages[0]);
        assert(message.startsWith('AssertionError: A replay must not inherit the previous surrender decision:'), 'Only the stale prompt assertion fails');
        assert.match(message, /expected[\s\S]*<button[\s\S]*Yes, Give Up[\s\S]*to be null/, 'Failure is the retained actual surrender button');
        failures.push({ title: row.title, message });
      }
    }
  }
  assert.equal(failures.length, expectFault ? 1 : 0);
  const current = sourceMap(); write(`${name}/source-after.json`, current); assert.deepEqual(current, initial, 'Every tracked source body and member held');
  report.arms.push({ name, passed: json.numPassedTests, failed: json.numFailedTests, failures });
}
let copy;
try {
  run(baseline ? 'original' : 'fixed', baseline);
  if (!baseline) {
    fs.mkdirSync(controlDir); copy = path.join(controlDir, 'TennisPlayerBoard.tsx');
    let body = original;
    for (const name of ['TennisPlayerSearch', 'TennisPlayerHowToPlay', 'TennisPlayerFeedback.module.css']) body = once(body, `from './${name}'`, `from '@/components/tennis-player/${name}'`);
    let inverse = body;
    for (const name of ['TennisPlayerSearch', 'TennisPlayerHowToPlay', 'TennisPlayerFeedback.module.css']) inverse = once(inverse, `from '@/components/tennis-player/${name}'`, `from './${name}'`);
    assert.equal(inverse, original, 'Copied control is whole original Board with bound import paths only');
    fs.writeFileSync(copy, body, { flag: 'wx' }); write('copied-original-TennisPlayerBoard.tsx', body);
    run('original-control', true, copy);
    assert.equal(fs.readFileSync(copy, 'utf8'), body, 'Copied source body held'); assert.deepEqual(fs.readdirSync(controlDir), ['TennisPlayerBoard.tsx'], 'No other control files');
    fs.unlinkSync(copy); fs.rmdirSync(controlDir);
    assert.equal(git(['status', '--porcelain', '--untracked-files=all']), statusBefore, 'Copied control removed before restored runtime');
    run('restored', false);
  }
  report.qualified = true;
} finally {
  if (copy && fs.existsSync(copy)) fs.unlinkSync(copy);
  if (fs.existsSync(controlDir)) fs.rmdirSync(controlDir);
  report.temporaryControlsRemoved = !fs.existsSync(controlDir);
  const final = sourceMap(); write('source-after.json', final); assert.deepEqual(final, initial, 'Tracked source restored');
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']), statusBefore, 'Working source and untracked membership restored');
  write('report.json', report);
}
console.log(`simTennisPlayerReplay: ${report.mode} checks ${baseline ? '14 healthy outcomes and one exact original stale-prompt failure' : '15 passing outcomes and one effective original-source control'}.`);
console.log('simTennisPlayerReplay: same fictional puzzle ID across replay; original hook, payouts, score posts and daily progress.');
console.log('simTennisPlayerReplay: Cancel, fresh surrender, active hint/guess progress and all ten original feedback cases held.');
console.log('simTennisPlayerReplay: tracked bodies and untracked membership held; disposable control removed.');
console.log(`simTennisPlayerReplay: component evidence ${path.join(out, 'report.json')}; built-route evidence is separate.`);
