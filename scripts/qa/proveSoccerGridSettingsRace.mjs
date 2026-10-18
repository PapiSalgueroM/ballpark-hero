// Remote-only proof of the mounted Grid page with actual Grid, daily-save and completion hooks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = 'f17130e8fc0694ac459e89270dc3baa66685bb35';
const PAGE = 'src/pages/SoccerGrid.tsx';
const TEST = 'src/test/soccerGridSettingsRace.test.tsx';
const SELF = 'scripts/qa/proveSoccerGridSettingsRace.mjs';
const WORKFLOW = '.github/workflows/soccer-grid-settings-race.yml';
const BROWSER = 'scripts/qa/playSoccerGridSettingsRace.mjs';
const TEST_SHA = '294cfec5df8146dfd1175d7ae45b3ae5ceb6167376690b779cfb1488c5f8f14c';
const ORIGINAL_SHA = 'fa2dcddca103b14b15ea7f884ddb8406403f0bf290e949f98897415587edf0b3';
const PROTECTED = {
  'src/hooks/useSoccerGrid.ts': '6940e46da1b9b9984ec85309ed01c502a24e54c6c80d5c4a79aa23a03363a2ca',
  'src/hooks/useDailyPuzzle.ts': '7ca4592d195f8446106faad991b73500113405d2ae8091b2d87077200461c308',
  'src/hooks/useGameCompletion.ts': '125b276927ca63746254f0abab5835d78e7233df7962baa957e8d9fe54d82d84',
};
const KEYS = ['pendingValidator', 'pendingRarity', 'pendingInsert', 'preplay', 'unverified', 'valid', 'wrong'];
const TITLES = [
  'the first validator check keeps both settings groups locked',
  'the first rarity check keeps both settings groups locked',
  'the first selection write keeps both settings groups locked',
  'pre-play difficulty and timer choices still select the requested puzzle',
  'an unverified first answer releases settings without spending a guess',
  'an ordinary first valid answer keeps its board and complete daily save',
  'an ordinary first wrong answer spends one guess and keeps its board',
];
const BOUNDARIES = ['validator', 'rarity', 'insert'];
const RELATED = {
  'src/test/soccerGridDeadline.test.tsx': [
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
  ],
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
const NAME = 'Grid Settings Fixture';
const NOW = Date.parse('2026-10-17T12:00:00.000Z');
const RETRY = "Couldn't verify that answer, please try again.";
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const mode = process.argv[2], out = process.env.GRID_SETTINGS_RACE_OUT;
const require = createRequire(import.meta.url);
const setupFault = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i;
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Unique executable source anchor: ' + before);
  return source.replace(before, after);
}
const ANCHORS = ['setDifficulty(d.tier)', 'setTimerMode(t.mode)'].map(call => ({
  old: `                      onClick={() => ${call}}\n`,
  added: `                      onClick={() => ${call}}\n                      disabled={validating}\n`,
}));
function pageVariants(original) {
  let candidate = original.toString();
  for (const span of ANCHORS) candidate = once(candidate, span.old, span.added);
  let inverse = candidate;
  for (const span of ANCHORS) inverse = once(inverse, span.added, span.old);
  assert(Buffer.from(inverse).equals(original), 'Two attributes reconstruct the complete original page');
  const difficulty = once(candidate, ANCHORS[0].added, ANCHORS[0].old);
  const timer = once(candidate, ANCHORS[1].added, ANCHORS[1].old);
  assert.notEqual(difficulty, candidate); assert.notEqual(timer, candidate);
  assert.equal(once(difficulty, ANCHORS[0].old, ANCHORS[0].added), candidate);
  assert.equal(once(timer, ANCHORS[1].old, ANCHORS[1].added), candidate);
  return { candidate: Buffer.from(candidate), difficulty: Buffer.from(difficulty), timer: Buffer.from(timer) };
}
assert(['baseline', 'fixed'].includes(mode), 'Select baseline or fixed');
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual inherited offline preload');
assert(out && path.isAbsolute(out), 'GRID_SETTINGS_RACE_OUT must be absolute');
assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh helper report; workflow evidence may already exist');
fs.mkdirSync(out, { recursive: true });
const report = { version: 1, mode, base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), status: 'running', qualified: false, arms: [], related: [], limits: 'Mounted actual Grid at declared fictional external IO. No live database, served-browser, production data or publication claim.' };
let names, before, initialPage, activePage;
const trackedNames = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const sourceMap = () => { assert.deepEqual(trackedNames(), names, 'Tracked path membership held'); return Object.fromEntries(names.map(name => [name, sha(fs.readFileSync(name))])); };
const expectedMap = () => ({ ...before, [PAGE]: sha(activePage) });
function setPage(bytes) { fs.writeFileSync(PAGE, bytes); activePage = bytes; assert(fs.readFileSync(PAGE).equals(bytes)); }
try {
  assert.equal(report.head, process.env.GITHUB_SHA, 'Actual request HEAD');
  git(['merge-base', '--is-ancestor', BASE, report.head]); git(['diff', '--exit-code', 'HEAD', '--', '.']);
  const allowed = new Set([TEST, SELF, WORKFLOW, BROWSER, ...(mode === 'fixed' ? [PAGE] : [])]);
  const changed = git(['diff', '--name-only', BASE, report.head, '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(name => allowed.has(name)), 'Only declared admission paths: ' + changed.join(', '));
  for (const name of [TEST, SELF, WORKFLOW]) assert(changed.includes(name), 'Declared new method path: ' + name);
  for (const [name, expected] of Object.entries(PROTECTED)) {
    const bytes = fs.readFileSync(name); assert.equal(sha(bytes), expected, 'Protected actual source: ' + name);
    assert(bytes.equals(git(['show', BASE + ':' + name])), 'Protected base body: ' + name);
  }
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA, 'Frozen seven-case test');
  const original = git(['show', BASE + ':' + PAGE]); assert.equal(sha(original), ORIGINAL_SHA);
  const variants = pageVariants(original);
  initialPage = fs.readFileSync(PAGE); activePage = initialPage;
  assert(initialPage.equals(mode === 'baseline' ? original : variants.candidate), 'Exact original or two-attribute candidate page');
  names = trackedNames(); before = sourceMap(); write('source-before.json', before);
  fs.writeFileSync(path.join(out, 'original-page.tsx'), original, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'candidate-page.tsx'), variants.candidate, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.tsx'), fs.constants.COPYFILE_EXCL);
  write('source-bindings.json', { base: BASE, head: report.head, mode, changed, testSha256: TEST_SHA, page: PAGE, originalSha256: ORIGINAL_SHA, candidateSha256: sha(variants.candidate), controls: { difficultySha256: sha(variants.difficulty), timerSha256: sha(variants.timer) }, spans: ANCHORS, wholeInverseExact: true, protected: PROTECTED });
  function arm(label, variant) {
    const record = { label, variant, status: 'unqualified' }; report.arms.push(record);
    assert.deepEqual(sourceMap(), expectedMap(), label + ' whole source before');
    const dir = path.join(out, label); fs.mkdirSync(dir);
    const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')];
    const env = { ...process.env, SC_GRID_SETTINGS_RAW: path.join(dir, 'observations.json'), SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') };
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', env, timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    write(label + '/process.json', { exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null, args });
    const after = sourceMap(); write(label + '/source-after.json', after); assert.deepEqual(after, expectedMap(), label + ' whole source after');
    assert(!result.error && !result.signal && result.status !== null, label + ' actual child completion');
    assert(!setupFault.test((result.stdout || '') + (result.stderr || '')), label + ' no setup, unhandled or transport error');
    assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, label + ' ordinary transport empty');
    const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json')));
    const faults = variant !== 'candidate', causeGroup = variant === 'timer' ? 'timer' : 'difficulty';
    assert.equal(result.status, faults ? 1 : 0); assert.equal(units.success, !faults);
    assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
    assert.equal(units.numTotalTests, 7); assert.equal(units.numPassedTests, faults ? 4 : 7); assert.equal(units.numFailedTests, faults ? 3 : 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
    const results = units.testResults[0].assertionResults; assert.deepEqual(results.map(row => row.title), TITLES);
    for (const [index, row] of results.entries()) {
      const failed = faults && index < 3; assert.equal(row.status, failed ? 'failed' : 'passed');
      if (failed) { assert.equal(row.failureMessages.length, 1); const cause = row.failureMessages[0]; assert(cause.includes(`GRID_SETTINGS_RACE_${BOUNDARIES[index]}_${causeGroup}`) && /expected false to be true/i.test(cause), 'Exact independent settings Boolean cause'); }
      else assert.deepEqual(row.failureMessages, []);
    }
    const bytes = fs.readFileSync(env.SC_GRID_SETTINGS_RAW), raw = JSON.parse(bytes);
    assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
    for (const [index, key] of KEYS.entries()) {
      const row = raw.cases[key]; assert.equal(row.title, TITLES[index]); assert.deepEqual(row.unexpected, []);
      assert(Array.isArray(row.draws) && row.draws.every(draw => draw === 0.25)); assert(row.deferred.every(gate => gate.settled === true));
      assert(row.requests.length > 0); assert.equal(row.requests.filter(request => request.kind === 'puzzles').length, 1);
      assert.equal(row.requests.filter(request => request.kind === 'career-players').length, 1); assert.equal(row.requests.filter(request => request.kind === 'career-seasons').length, 1);
      for (const moment of row.moments) {
        assert.equal(typeof moment.html, 'string'); assert(moment.html.length > 0); assert.equal(moment.cells.length, 9);
        assert.deepEqual(moment.recordings, []); assert(moment.controls.every(button => typeof button.disabled === 'boolean'));
        assert.equal(moment.storage['soccer-grid-settings-2026-10-17'], moment.settingsJSON);
        assert.equal(moment.storage['soccer-grid-daily-2026-10-17'] ?? null, moment.dailyJSON);
        if (moment.dailyJSON !== null) { const daily = JSON.parse(moment.dailyJSON); assert.equal(daily.v, 1); assert.equal(daily.date, '2026-10-17'); assert.equal(daily.puzzleIndex, 0); assert.equal(daily.puzzleId, moment.puzzle.id); assert.equal(daily.gameStatus, 'playing'); }
      }
      const start = row.moments[0], end = row.moments.at(-1);
      assert.equal(start.label, 'ready'); assert.equal(start.at, NOW); assert.deepEqual(JSON.parse(start.settingsJSON), { difficulty: 'easy', timerMode: 40 }); assert.equal(start.dailyJSON, null);
      assert(start.puzzle.id.startsWith('settings-fixture-easy-')); assert(start.cells.every(cell => cell.status === 'empty'));
      if (index < 3) {
        assert.deepEqual(row.moments.map(moment => moment.label), ['ready', 'pending', 'after-settings-attempts', 'settled']);
        assert(row.moments.every(moment => moment.at === NOW)); assert.equal(row.deferred.length, 1); assert.equal(row.deferred[0].name, ['held-validator', 'held-count', 'held-insert'][index]);
        assert(row.requests.some(request => request.deferred === row.deferred[0].name));
        const difficultyLocked = variant === 'candidate' || variant === 'timer', timerLocked = variant === 'candidate' || variant === 'difficulty';
        assert.deepEqual(row.disabled, { difficulty: Array(3).fill(difficultyLocked), timer: Array(4).fill(timerLocked) });
        const attempted = row.moments[2], settings = { difficulty: difficultyLocked ? 'easy' : 'hard', timerMode: timerLocked ? 40 : 0 };
        assert.deepEqual(JSON.parse(attempted.settingsJSON), settings); assert.deepEqual(JSON.parse(end.settingsJSON), settings);
        assert.equal(attempted.puzzle.id === start.puzzle.id, difficultyLocked); assert.equal(end.puzzle.id, attempted.puzzle.id);
        assert.deepEqual(JSON.parse(end.dailyJSON).guesses, [{ t: 'ok', cellIndex: 0, playerName: NAME, rarity: 20 }]); assert.equal(end.cells[0].status, 'correct');
        assert.deepEqual(end.toasts, []); assert.equal(row.requests.filter(request => request.kind === 'count').length, 2); assert.equal(row.requests.filter(request => request.kind === 'insert').length, 1);
        const validator = row.requests.filter(request => request.kind === 'validator'); assert.equal(validator.length, 1); assert.deepEqual(validator[0].body, { playerName: NAME, rowAttribute: start.puzzle.rows[0].label, colAttribute: start.puzzle.cols[0].label });
        for (const request of row.requests.filter(request => request.kind === 'count')) assert(request.filters.some(pair => pair[0] === 'puzzle_id' && pair[1] === start.puzzle.id));
        assert.deepEqual(row.requests.find(request => request.kind === 'insert').body, { puzzle_id: start.puzzle.id, cell_index: 0, player_name: NAME.toLowerCase() });
      } else if (key === 'preplay') {
        assert.deepEqual(row.moments.map(moment => moment.label), ['ready', 'settings-chosen']); assert.equal(end.dailyJSON, null); assert.deepEqual(JSON.parse(end.settingsJSON), { difficulty: 'hard', timerMode: 90 }); assert(end.puzzle.id.startsWith('settings-fixture-hard-')); assert(end.cells.every(cell => cell.status === 'empty'));
      } else if (key === 'unverified') {
        assert.deepEqual(row.moments.map(moment => moment.label), ['ready', 'unverified-released', 'settings-chosen']); assert.equal(row.deferred.length, 1); assert.equal(row.deferred[0].name, 'held-unverified'); assert.equal(end.dailyJSON, null); assert.deepEqual(row.moments[1].toasts, [[RETRY]]); assert.deepEqual(JSON.parse(end.settingsJSON), { difficulty: 'hard', timerMode: 60 });
      } else {
        assert.deepEqual(JSON.parse(end.settingsJSON), { difficulty: 'easy', timerMode: 40 }); assert.equal(end.puzzle.id, start.puzzle.id); assert.deepEqual(end.toasts, []);
        const valid = key === 'valid'; assert.deepEqual(row.moments.map(moment => moment.label), valid ? ['ready', 'valid-settled'] : ['ready', 'wrong-settled', 'wrong-flash-cleared']);
        assert.deepEqual(JSON.parse(end.dailyJSON).guesses, valid ? [{ t: 'ok', cellIndex: 0, playerName: NAME, rarity: 20 }] : [{ t: 'x' }]);
        if (valid) assert.equal(end.cells[0].status, 'correct'); else { assert.equal(row.moments[1].cells[0].status, 'wrong'); assert(end.cells.every(cell => cell.status === 'empty')); assert.equal(end.at - start.at, 1500); }
      }
    }
    Object.assign(record, { status: 'qualified', exit: result.status, passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: bytes.length, rawSha256: sha(bytes), sourceHeld: true });
    return { bytes, raw };
  }
  function related(label) {
    const record = { label, status: 'unqualified' }; report.related.push(record);
    assert.deepEqual(sourceMap(), before, label + ' whole source before');
    const dir = path.join(out, label); fs.mkdirSync(dir);
    const args = ['node_modules/vitest/vitest.mjs', 'run', ...Object.keys(RELATED), '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')];
    const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') };
    delete env.SC_GRID_SETTINGS_RAW; delete env.SC_GRID_DEADLINE_RAW;
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', env, timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    write(label + '/process.json', { exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null, args });
    const after = sourceMap(); write(label + '/source-after.json', after); assert.deepEqual(after, before, label + ' whole source after');
    assert(!result.error && !result.signal && result.status === 0, label + ' actual complete healthy child');
    assert(!setupFault.test((result.stdout || '') + (result.stderr || '')), label + ' no setup, unhandled or transport error');
    assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, label + ' ordinary transport empty');
    const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json')));
    assert.equal(units.success, true); assert.equal(units.testResults.length, 3); assert.equal(units.numTotalTests, 23); assert.equal(units.numPassedTests, 23); assert.equal(units.numFailedTests, 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
    const seen = new Set();
    for (const suite of units.testResults) {
      const file = Object.keys(RELATED).find(name => suite.name.replaceAll('\\', '/').endsWith('/' + name));
      assert(file && !seen.has(file)); seen.add(file); assert.deepEqual(suite.assertionResults.map(row => row.title), RELATED[file]); assert(suite.assertionResults.every(row => row.status === 'passed' && row.failureMessages.length === 0));
    }
    Object.assign(record, { status: 'qualified', passed: 23, counts: [12, 7, 4], sourceHeld: true });
  }
  if (mode === 'baseline') { arm('baseline', 'original'); related('related-baseline'); }
  else {
    const baselineRaw = process.env.GRID_SETTINGS_RACE_BASELINE_RAW_SHA256;
    assert(/^[0-9a-f]{64}$/.test(baselineRaw || ''), 'Actual separately qualified baseline raw SHA');
    const normal = arm('normal', 'candidate'); related('related-normal');
    try {
      for (const [label, variant, bytes] of [['original', 'original', original], ['difficulty-control', 'difficulty', variants.difficulty], ['timer-control', 'timer', variants.timer]]) {
        setPage(bytes); const control = arm(label, variant);
        if (label === 'original') assert.equal(sha(control.bytes), baselineRaw, 'Complete original raw matches the qualified baseline');
        for (const key of KEYS.slice(3)) assert.deepEqual(control.raw.cases[key], normal.raw.cases[key], label + ' complete healthy case held: ' + key);
      }
    } finally { setPage(initialPage); assert.deepEqual(sourceMap(), before, 'Complete candidate source restored in finally'); }
    const restored = arm('restored', 'candidate'); assert(restored.bytes.equals(normal.bytes), 'Complete normal/restored raw byte equality'); related('related-restored');
    report.baselineRawSha256 = baselineRaw; report.healthyCasesHeld = KEYS.slice(3); report.normalRestoredBytesEqual = true;
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) {
  report.status = 'failed'; report.qualified = false; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1;
} finally {
  if (before) {
    try { if (initialPage) setPage(initialPage); const after = sourceMap(); write('source-after.json', after); assert.deepEqual(after, before); report.sourceHeld = true; }
    catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; }
  }
  write('report.json', report);
  console.log(`Soccer Grid settings ${mode}: ${report.status}; ${report.arms.length} actual arm(s), ${report.related.length} prior suite run(s); qualified=${report.qualified}`);
}
