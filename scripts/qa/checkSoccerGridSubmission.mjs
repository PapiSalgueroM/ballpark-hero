import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

assert(process.env.CI, 'Remote qualification only');
const BASE = 'd3935a288f00abd556467a45076636b890d8dd25';
const FILES = { hook: 'src/hooks/useSoccerGrid.ts', daily: 'src/hooks/useDailyPuzzle.ts', page: 'src/pages/SoccerGrid.tsx' };
const TESTS = ['src/test/soccerGridSubmissionOwnership.test.tsx', 'src/test/soccerGridSubmissionDeadline.test.tsx', 'src/test/soccerGridTimerPolicy.test.tsx'];
const PINS = {
  'src/data/gameContent/soccer2.ts': 'fbc57434c0f4e27df17176dacccd10f159efad3b',
  [FILES.hook]: '1c84994a36c8ac51e4020823d899c2342be60271',
  [FILES.daily]: 'b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846',
  [FILES.page]: 'fd793d83fef33fa075fcac53e97453cdbf83fff7',
  [TESTS[0]]: '7cb7f94a73ce7340243e7bdae6d6759e2c1a6f11',
  [TESTS[1]]: 'ac23b92cb6cedb7c0eb92343d95ba462349ae8ac',
  [TESTS[2]]: 'f422283b69492a7a5b538749c694620d63847566',
  'src/test/dailySaveParity.test.tsx': '2dc86a625380e1f472f12ee4948c4fc1fae7cbc4',
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => { const body = Buffer.from(bytes); return createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + body.length + '\0'), body])).digest('hex'); };
for (const [file, pin] of Object.entries(PINS)) assert.equal(blob(fs.readFileSync(file)), pin, 'Exact qualification input: ' + file);
const source = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));
const originalHook = execFileSync('git', ['show', BASE + ':' + FILES.hook], { encoding: 'utf8' });
const originalPage = execFileSync('git', ['show', BASE + ':' + FILES.page], { encoding: 'utf8' });
assert.equal(blob(originalHook), '6beb012bbc5cd4b2402724fb2a80efe7d0fc5f0c', 'Immutable original hook');
assert.equal(blob(originalPage), '88113ce7f4f100af15b90b7a8ab9f4651c8887ba', 'Immutable original page');
const OUT = path.resolve('grid-submission-artifacts/arms');
assert(!fs.existsSync(OUT), 'Fresh controller artifact directory required'); fs.mkdirSync(OUT, { recursive: true });
const own = ['VALIDATOR', 'RARITY', 'INSERT', 'WRONG', 'BATCH', 'RULES'].map(id => 'SG_OWNERSHIP_' + id);
const deadline = ['ENTRY', 'VALIDATOR', 'RARITY', 'INSERT', 'WRONG', 'EXACT'].map(id => 'GRID_SUBMISSION_' + id);
const preserves = [
  ...['VALID', 'WRONG', 'RETRY', 'EXHAUSTED', 'REJECTED', 'NINTH', 'OVERTIME_VALID', 'OVERTIME_WRONG'].map(id => 'SG_OWNERSHIP_PRESERVE_' + id),
  ...['BEFORE', 'CLOCKS', 'OVERTIME', 'UNVERIFIED'].map(id => 'GRID_SUBMISSION_' + id),
];
const policies = ['SG_TIMER_POLICY_PREPLAY', 'SG_TIMER_POLICY_HELP'];
const allIds = [...own, ...deadline, ...preserves, ...policies].sort();
assert.equal(new Set(allIds).size, 26);
const report = { pins: PINS, base: BASE, arms: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
function replaceOnce(body, from, to) {
  assert.equal(body.split(from).length, 2, 'Unique actual source anchor: ' + from);
  const changed = body.replace(from, to); assert.notEqual(sha(changed), sha(body), 'Physical source fault changed bytes'); return changed;
}
function run(name, sources, expected) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  for (const [key, file] of Object.entries(FILES)) {
    fs.writeFileSync(file, sources[key]); fs.writeFileSync(path.join(dir, path.basename(file)), sources[key]);
  }
  const output = path.join(dir, 'units.json');
  const env = { ...process.env, SC_GRID_OWNERSHIP_RAW: path.join(dir, 'ownership.raw.json'),
    SC_GRID_SUBMISSION_DEADLINE_RAW: path.join(dir, 'deadline.raw.json'), SC_GRID_POLICY_RAW: path.join(dir, 'policy.raw.json') };
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...TESTS, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=default', '--reporter=json', '--outputFile=' + output], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000, env });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  assert(fs.existsSync(output), name + ': actual reporter JSON');
  const units = JSON.parse(fs.readFileSync(output, 'utf8')), cases = units.testResults.flatMap(suite => suite.assertionResults);
  const failed = cases.filter(c => c.status === 'failed'), ids = failed.map(c => c.title.split(' ')[0]).sort();
  const arm = { name, source: Object.fromEntries(Object.entries(sources).map(([key, body]) => [key, { blob: blob(body), sha256: sha(body) }])),
    status: child.status, signal: child.signal, expectedFailures: [...expected].sort(), cases };
  report.arms.push(arm); saveReport();
  assert.equal(units.numTotalTests, 26, name + ': reporter census'); assert.equal(cases.length, 26, name + ': actual rows');
  assert.deepEqual(cases.map(c => c.title.split(' ')[0]).sort(), allIds, name + ': every exact named case');
  assert(cases.every(c => c.status === 'passed' || c.status === 'failed'), name + ': no skipped or incomplete rows');
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import/.test((child.stdout || '') + (child.stderr || '')), name + ': no runtime banners');
  assert.equal(child.status, expected.length ? 1 : 0, name + ': expected actual child exit'); assert.deepEqual(ids, [...expected].sort(), name + ': exact business failure set');
  for (const c of failed) {
    const id = c.title.split(' ')[0];
    assert(c.failureMessages.length > 0, name + ': real assertion message');
    for (const message of c.failureMessages) {
      const plain = message.replace(/\u001b\[[0-9;]*m/g, '');
      assert(plain.startsWith('AssertionError: ' + id + ' '), name + ': owned assertion, not setup/import/runtime failure: ' + id);
    }
  }
  for (const id of preserves) assert.equal(cases.find(c => c.title.startsWith(id + ' '))?.status, 'passed', name + ': held preservation ' + id);
  const raw = {};
  for (const [file, count, field] of [['ownership.raw.json', 14, 'cases'], ['deadline.raw.json', 10, 'cases'], ['policy.raw.json', 2, 'frames']]) {
    const bytes = fs.readFileSync(path.join(dir, file)), value = JSON.parse(bytes);
    assert.equal(value.caseTitles.length, count, name + ': RAW titles ' + file); assert.equal(Object.keys(value[field]).length, count, name + ': all RAW cases ' + file);
    if (field === 'cases') for (const entry of Object.values(value.cases)) {
      assert.deepEqual(entry.unexpected, [], name + ': no undeclared transport ' + file);
      assert((entry.frames || entry.moments).length > 0, name + ': full actual state frames ' + file);
    }
    raw[file] = { bytes: bytes.length, sha256: sha(bytes), cases: count };
  }
  arm.raw = raw; saveReport();
  console.log(name + ': ' + (26 - failed.length) + ' passed, ' + failed.length + ' exact owned assertion failures; all26 RAW cases retained');
}
try {
  run('fixed', source, []);
  run('original-hook', { ...source, hook: originalHook }, [...own, ...deadline]);
  const currentGetter = '  const getCurrentProgress = useCallback(() => ({\n    guesses: guessesRef.current,\n    gameStatus: statusRef.current,\n  }), []);';
  const renderedGetter = '  const renderedProgress = useRef({ guesses, gameStatus });\n  renderedProgress.current = { guesses, gameStatus };\n  const getCurrentProgress = useCallback(() => renderedProgress.current, []);';
  run('render-only-progress', { ...source, daily: replaceOnce(source.daily, currentGetter, renderedGetter) }, ['SG_OWNERSHIP_BATCH']);
  let renderedSettings = replaceOnce(source.hook, '  const settingsRef = useRef(settings);', '  const settingsRef = useRef(settings);\n  settingsRef.current = settings;');
  renderedSettings = replaceOnce(renderedSettings, '    settingsRef.current = { ...settingsRef.current, difficulty };\n', '');
  renderedSettings = replaceOnce(renderedSettings, '    settingsRef.current = { ...settingsRef.current, timerMode };\n', '');
  run('render-only-settings', { ...source, hook: renderedSettings }, ['SG_OWNERSHIP_RULES']);
  const clock = '        if (!requestIsOvertime) {\n          const epoch = timerStartedAtRef.current;\n          const now = Date.now();\n          if (requestSettings.timerMode !== 0 && epoch !== null && now >= epoch + requestSettings.timerMode * 1000) {\n            mainRoundComplete.current = true;\n            saveTimerExpired(todayStr);\n            setTimerExpiredState(true);\n            setNowTick(now);\n            return false;\n          }\n        }\n';
  run('omit-wall-clock', { ...source, hook: replaceOnce(source.hook, clock, '') }, deadline);
  run('omit-main-cell-guard', { ...source, hook: replaceOnce(source.hook, "        if (progress.guesses.some(a => a.t === 'ok' && a.cellIndex === capturedCell)) return false;\n", '') }, own.filter(id => id !== 'SG_OWNERSHIP_RULES'));
  run('exclusive-deadline', { ...source, hook: replaceOnce(source.hook, 'now >= epoch + requestSettings.timerMode * 1000', 'now > epoch + requestSettings.timerMode * 1000') }, ['GRID_SUBMISSION_EXACT']);
  const rarity = '          const rarity = await fetchRarity(puzzle.id, capturedCell, displayName);\n          if (!canSettle()) return;\n';
  run('omit-post-rarity', { ...source, hook: replaceOnce(source.hook, rarity, '          const rarity = await fetchRarity(puzzle.id, capturedCell, displayName);\n') }, ['SG_OWNERSHIP_RARITY', 'GRID_SUBMISSION_RARITY']);
  const insert = '          });\n          if (!canSettle()) return;\n\n          if (requestIsOvertime) {';
  run('omit-post-insert', { ...source, hook: replaceOnce(source.hook, insert, '          });\n\n          if (requestIsOvertime) {') }, ['SG_OWNERSHIP_INSERT', 'GRID_SUBMISSION_INSERT']);
  const wrong = '        } else {\n          if (!canSettle()) return;\n          setWrongFlash({ cellIndex: capturedCell, playerName });';
  run('omit-wrong-guard', { ...source, hook: replaceOnce(source.hook, wrong, '        } else {\n          setWrongFlash({ cellIndex: capturedCell, playerName });') }, ['SG_OWNERSHIP_WRONG', 'GRID_SUBMISSION_WRONG']);
  run('original-policy-page', { ...source, page: originalPage }, policies);
  run('restored', source, []);
} finally {
  for (const [key, file] of Object.entries(FILES)) { fs.writeFileSync(file, source[key]); assert.equal(blob(fs.readFileSync(file)), PINS[file], 'Exact final restoration: ' + file); }
  for (const [file, pin] of Object.entries(PINS)) assert.equal(blob(fs.readFileSync(file)), pin, 'Every source/test input held: ' + file);
  saveReport();
}
