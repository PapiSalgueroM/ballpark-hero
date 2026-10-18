// Remote original-product diagnostic. A successful diagnostic is not a fix or release qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const FIXTURE = 'scripts/qa/fixtures/ballQuizCompletion.fixture.tsx';
const FIXTURE_SHA = 'b7bbe432b96ec664020b3745a8a92a638599d6fc87659b8ea8615bdc98fb5490';
const TEMP = 'src/test/__ballQuizCompletionDiagnostic.test.tsx';
const SELF = 'scripts/qa/proveBallQuizCompletion.mjs';
const WORKFLOW = '.github/workflows/career-phone-quiz-results.yml';
const KEYS = ['score0', 'score1', 'score2', 'score3', 'alreadyPlayed', 'noHistory', 'unfinished'];
const TITLES = ['completed zero-answer quiz keeps its saved result visible', 'completed one-answer quiz keeps its saved result visible',
  'completed two-answer quiz keeps its saved result visible', 'completed perfect quiz keeps its saved result visible',
  'already-played quiz stays locked without another action', 'insufficient-history quiz stays unavailable without an action',
  'unfinished quiz reopens without recording a result'];
const CAUSE = 'BALL_QUIZ_COMPLETION_VISIBLE';
const LOCKED = "You have had today's three. It reloads next season, on the bus.";
const EMPTY = 'Not enough football has happened yet for it to ask you anything. Play a season.';
const require = createRequire(import.meta.url), out = process.env.BALL_QUIZ_COMPLETION_OUT;
assert.equal(process.argv[2], 'baseline');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert.equal(process.versions.node.split('.')[0], '20');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual inherited offline preload');
assert(out && path.isAbsolute(out) && path.resolve(out) !== path.resolve('.') && !path.resolve(out).startsWith(path.resolve('.') + path.sep), 'Absolute evidence outside source');
fs.mkdirSync(out, { recursive: true }); assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned diagnostic report');
const sha = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const write = (file, data) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const tracked = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const sourceMap = () => Object.fromEntries(tracked().map(file => [file, { bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }]));
const report = { version: 1, mode: 'baseline', kind: 'original-product-diagnostic', status: 'unqualified', ready: false,
  productFixQualified: false, sourceHeld: false, temporaryBeforeAbsent: false, temporaryAfterAbsent: false,
  head: git(['rev-parse', 'HEAD']).toString().trim(), base: BASE,
  limits: 'Actual PhonePanel, ArcadeScreen and engine action under remote Vitest. All transport is trapped. No page autosave, browser, geometry, build, caps, current release or publication qualification.' };
let fixture, before, names, created = false;
function hold(label) {
  assert.deepEqual(tracked(), names, label + ' tracked membership');
  const current = sourceMap(); write(label + '-source.json', current); assert.deepEqual(current, before, label + ' whole tracked bodies');
  assert(fs.existsSync(TEMP) && fs.readFileSync(TEMP).equals(fixture), label + ' exact owned temporary body');
  write(label + '-temporary.json', { file: TEMP, bytes: fixture.length, sha256: sha(fs.readFileSync(TEMP)), tracked: false });
}
function child(label, args, extra = {}) {
  hold(label + '-before'); const dir = path.join(out, label); fs.mkdirSync(dir);
  const transport = path.join(dir, 'ordinary.transport'); fs.writeFileSync(transport, '', { flag: 'wx' });
  const started = new Date().toISOString(), result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 300000,
    maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...extra, SIM_OFFLINE_RECEIPT: transport } });
  fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr ?? '', { flag: 'wx' });
  write(label + '/process.json', { command: process.execPath, args, started, finished: new Date().toISOString(), exit: result.status,
    signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null,
    completed: !result.error && result.signal === null && Number.isInteger(result.status), node: process.versions.node,
    offlinePreload: process.env.NODE_OPTIONS, network: process.env.SIM_NETWORK, temporaryFixtureSha256: FIXTURE_SHA });
  hold(label + '-after'); assert(!result.error && result.signal === null, label + ' actual child completes');
  assert.equal(fs.statSync(transport).size, 0, label + ' ordinary transport empty'); return result;
}
function rawSemantics(raw) {
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
  for (const [index, key] of KEYS.entries()) {
    const row = raw.cases[key]; assert.equal(row.key, key); assert.equal(row.title, TITLES[index]);
    assert.equal(typeof row.initialJSON, 'string'); const initial = JSON.parse(row.initialJSON), actual = JSON.parse(row.finalJSON);
    JSON.parse(row.expectedJSON); assert.equal(row.sourceAfterJSON, row.initialJSON); assert.equal(row.finalJSON, row.expectedJSON);
    assert.deepEqual(row.storesBefore, { local: { 'fixture-quiz-local': 'unchanged' }, session: { 'fixture-quiz-session': 'unchanged' } });
    assert.deepEqual(row.storesAfter, row.storesBefore); assert.deepEqual(row.draws, []); assert.deepEqual(row.requests, []);
    const snapshots = index < 4 ? ['opened', 'completed', 'reopened'] : ['opened', 'beforeBack', 'reopened'];
    for (const name of snapshots) { const snapshot = row[name]; assert.equal(typeof snapshot.html, 'string'); assert(snapshot.html.length > 0);
      assert.equal(typeof snapshot.text, 'string'); assert(snapshot.focused === null || typeof snapshot.focused === 'string');
      assert.equal(snapshot.careerJSON, index < 4 && name !== 'opened' ? row.expectedJSON : row.initialJSON); }
    assert.equal(row.questions.length, key === 'noHistory' ? 0 : 3);
    for (const question of row.questions) { assert.equal(typeof question.q, 'string'); assert(Array.isArray(question.options) && question.options.length > 1);
      assert(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length); }
    if (index < 4) {
      assert.equal(row.committedJSON, row.expectedJSON); assert.deepEqual(row.actions, [{ t: 'arcade', right: index }]); assert.deepEqual(row.toasts, [index + '/3']);
      assert.equal(row.answers.length, 3); assert.equal(row.answers.filter(answer => answer.correct).length, index);
      row.answers.forEach((answer, i) => { const q = row.questions[i], pick = i < index ? q.answer : (q.answer + 1) % q.options.length;
        assert.deepEqual(answer, { question: q.q, chosen: q.options[pick], correct: pick === q.answer }); });
      assert.deepEqual(row.completion, { expectedScore: index + '/3', scorePresent: false, resultBackPresent: false, visible: false });
      assert(row.completed.text.includes(LOCKED)); assert(row.reopened.text.includes(LOCKED));
      assert.deepEqual([actual.money.aYear, actual.money.aPlays, actual.money.aBest], [2025, 1, index]);
      assert.equal(actual.netWorth, index === 3 ? 2.02 : 2); assert.equal(actual.morale, index === 3 ? 62 : index === 2 ? 61 : 60);
      assert.equal(actual.events.length, initial.events.length + 1);
    } else {
      assert.equal(row.expectedJSON, row.initialJSON); assert.deepEqual(row.actions, []); assert.deepEqual(row.toasts, []);
      if (key === 'unfinished') { assert.deepEqual(row.answers, [{ question: row.questions[0].q, chosen: row.questions[0].options[row.questions[0].answer], correct: true }]);
        assert(row.beforeBack.text.includes('Next one')); assert(row.reopened.text.includes('Question 1 of 3')); assert(row.reopened.text.includes('0 right so far'));
      } else { assert.deepEqual(row.answers, []); assert(row.opened.text.includes(key === 'alreadyPlayed' ? LOCKED : EMPTY));
        assert(row.reopened.text.includes(key === 'alreadyPlayed' ? LOCKED : EMPTY)); }
      if (key === 'alreadyPlayed') assert.deepEqual([actual.money.aYear, actual.money.aPlays, actual.money.aBest], [2025, 1, 3]);
    }
  }
}
try {
  assert.equal(report.head, process.env.GITHUB_SHA); git(['merge-base', '--is-ancestor', BASE, report.head]);
  assert.equal(git(['status', '--porcelain', '--untracked-files=all']).toString(), '', 'Clean committed request');
  const changed = git(['diff', '--name-only', BASE, report.head, '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert.deepEqual([...changed].sort(), [FIXTURE, SELF, WORKFLOW].sort(), 'Only three new diagnostic leaves beyond docs');
  for (const file of [FIXTURE, SELF, WORKFLOW]) { assert(fs.readFileSync(file).equals(git(['show', report.head + ':' + file]))); assert.equal(git(['ls-tree', BASE, '--', file]).length, 0, 'New diagnostic leaf absent at base'); }
  fixture = fs.readFileSync(FIXTURE); assert.equal(sha(fixture), FIXTURE_SHA); assert(!fs.existsSync(TEMP), 'Temporary test absent before diagnostic');
  assert.equal(git(['ls-files', '--', TEMP]).length, 0, 'Temporary test is never tracked'); report.temporaryBeforeAbsent = true;
  names = tracked(); before = sourceMap(); write('source-before.json', before);
  write('source-bindings.json', { base: BASE, head: report.head, changed, fixture: { file: FIXTURE, bytes: fixture.length, sha256: FIXTURE_SHA },
    temporary: TEMP, self: { file: SELF, sha256: sha(fs.readFileSync(SELF)) }, workflow: { file: WORKFLOW, sha256: sha(fs.readFileSync(WORKFLOW)) },
    applicationWholeBaseHeld: true, diagnosticOnly: true, negativeControl: 'The unchanged original product must fail exactly four completed-result Boolean assertions.' });
  fs.copyFileSync(FIXTURE, path.join(out, 'frozen-fixture.tsx'), fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(TEMP, fixture, { flag: 'wx' }); created = true;
  fs.copyFileSync(TEMP, path.join(out, 'executed-temporary-test.tsx'), fs.constants.COPYFILE_EXCL);
  const types = child('types', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']);
  assert.equal(types.status, 0, 'Actual app types including the temporary fixture'); assert.equal(types.stdout + types.stderr, '', 'No type diagnostics'); report.types = 'passed';
  const dir = path.join(out, 'baseline'), jsonFile = path.join(dir, 'vitest.json'), rawFile = path.join(dir, 'observations.json');
  const result = child('baseline', ['node_modules/vitest/vitest.mjs', 'run', TEMP, '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + jsonFile], { BALL_QUIZ_COMPLETION_RAW: rawFile });
  const units = JSON.parse(fs.readFileSync(jsonFile, 'utf8')), rows = units.testResults.flatMap(suite => suite.assertionResults);
  const clean = text => text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  const output = clean((result.stdout ?? '') + '\n' + (result.stderr ?? ''));
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught (?:Exception|Error)|TypeError:|ReferenceError:|SyntaxError:|Cannot find (?:module|package)|Failed to (?:load|resolve)|ERR_MODULE_NOT_FOUND/i.test(output), 'No additional setup or unhandled errors');
  if (units.numRuntimeErrorTestSuites !== undefined) assert.equal(units.numRuntimeErrorTestSuites, 0);
  assert.equal(result.status, 1); assert.equal(units.success, false); assert.equal(units.testResults.length, 1);
  assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEMP));
  assert.deepEqual([units.numTotalTests, units.numPassedTests, units.numFailedTests, units.numPendingTests, units.numTodoTests], [7, 3, 4, 0, 0]);
  assert.deepEqual(rows.map(row => row.title), TITLES); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
  for (const [index, row] of rows.entries()) { assert.equal(row.status, index < 4 ? 'failed' : 'passed');
    if (index < 4) { assert.equal(row.failureMessages.length, 1); const failure = clean(row.failureMessages[0]); assert(failure.startsWith('AssertionError: ' + CAUSE + ':')); assert(/expected false to be true/i.test(failure)); }
    else assert.deepEqual(row.failureMessages, []); }
  const rawBody = fs.readFileSync(rawFile); rawSemantics(JSON.parse(rawBody));
  report.cases = { completed: 7, originalNamedFaults: 4, healthy: 3, cause: CAUSE, titles: TITLES, rawBytes: rawBody.length, rawSha256: sha(rawBody) };
  report.status = 'original-faults-observed';
} catch (error) { report.status = 'failed-diagnostic-method'; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1;
} finally {
  try {
    if (created) { assert(fs.existsSync(TEMP) && fs.readFileSync(TEMP).equals(fixture), 'Only delete the exact temporary body owned by this helper'); fs.unlinkSync(TEMP); }
    assert(!fs.existsSync(TEMP), 'Temporary test absent after diagnostic'); report.temporaryAfterAbsent = true;
    if (before) { const after = sourceMap(); write('source-after.json', after); assert.deepEqual(tracked(), names); assert.deepEqual(after, before, 'All tracked source bodies finally held'); }
    assert.equal(git(['status', '--porcelain', '--untracked-files=all']).toString(), '', 'No persistent test or other source change'); report.sourceHeld = true;
  } catch (error) { report.status = 'failed-diagnostic-method'; report.cleanupError = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
  write('report.json', report);
}
assert.equal(report.status, 'original-faults-observed', report.error?.message ?? report.cleanupError?.message ?? 'Diagnostic did not close');
console.log('DIAGNOSTIC ONLY: seven completed original cases, four exact missing-result faults and three healthy cases. No fix or READY qualification.');
