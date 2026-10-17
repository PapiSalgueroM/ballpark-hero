// Remote-only fixed/original/restored proof. This does not execute the live-table NBA search harness.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '8293c758f4284d21baaa2320383cfd5cb5bd4944';
const BASELINE = '5f75c17bb3a880d1daa53942b31ab51c3eba9d12';
const SELF = 'scripts/qa/proveNbaEvaluationResetFixed.mjs';
const BASE_HELPER = 'scripts/qa/proveNbaEvaluationResetBaseline.mjs';
const TEST = 'src/test/nbaLineupEvaluationReset.test.tsx', HOOK = 'src/hooks/useNbaLineup.ts';
const WORKFLOW = '.github/workflows/nba-evaluation-reset.yml';
const TEST_SHA = 'a429b483fb303f82d79219a08505e4785e33e73f6db3838f3c3c69046ff5b087';
const BASE_HELPER_SHA = 'efc5ba178c4dca5ecb089792f898b5034ce58f5fd4e82f4d27275f4d4a0cbd92';
const ORIGINAL_SHA = '23dd0e8ed4f0c2dc609e71dbfce2ec1536a42b4aabd7e82c77985f555aaae85b';
const CANDIDATE_SHA = '6fbb8a55a2d8f525921736585c13c9269787ff20e509d39f5aaf59651b777cc8';
const OUT = process.env.NBA_EVALUATION_OUT, mode = process.argv[2];
assert(['source', 'arms', 'build-transport'].includes(mode));
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI is mandatory');
assert(process.env.NODE_OPTIONS?.includes('scripts/lib/offlineTransport.cjs'), 'Inherited offline preload is mandatory');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'))], 'Actual offline preload must be in require.cache');
assert(OUT && path.isAbsolute(OUT)); fs.mkdirSync(OUT, { recursive: true });
assert(/^[0-9a-f]{40}$/.test(BASELINE) && /^[0-9a-f]{64}$/.test(TEST_SHA) && /^[0-9a-f]{64}$/.test(BASE_HELPER_SHA), 'Corrected qualified baseline and frozen method pins must be finalized');
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const git = args => execFileSync('git', args, { cwd: ROOT });
const put = (file, value) => fs.writeFileSync(path.join(OUT, file), value, { flag: 'wx' });
const json = (file, value) => put(file, JSON.stringify(value, null, 2) + '\n');
const inventory = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const original = git(['show', BASE + ':' + HOOK]);
assert.equal(sha(original), ORIGINAL_SHA); assert.deepEqual(original, git(['show', BASELINE + ':' + HOOK]));
assert.equal(sha(read(TEST)), TEST_SHA); assert.equal(sha(git(['show', BASELINE + ':' + TEST])), TEST_SHA);
assert.equal(sha(read(BASE_HELPER)), BASE_HELPER_SHA); assert.deepEqual(read(BASE_HELPER), git(['show', BASELINE + ':' + BASE_HELPER]));

if (mode === 'source') {
  assert(/^[0-9a-f]{64}$/.test(CANDIDATE_SHA), 'Actual reviewed candidate pin must be finalized');
  git(['merge-base', '--is-ancestor', BASELINE, 'HEAD']);
  git(['diff', '--exit-code', BASELINE, 'HEAD', '--', '.', ':!docs', ':!' + HOOK, ':!' + SELF, ':!' + WORKFLOW]);
  git(['diff', '--exit-code', 'HEAD', '--', '.']);
  const candidate = read(HOOK); assert.equal(sha(candidate), CANDIDATE_SHA); assert(!candidate.equals(original));
  const patch = git(['diff', '--binary', '--full-index', BASELINE, 'HEAD', '--', HOOK]); assert(patch.length > 0);
  put('original-hook.ts', original); put('candidate-hook.ts', candidate); put('frozen-test.tsx', read(TEST)); put('product.patch', patch);
  json('source-map.json', inventory());
  json('source-bindings.json', { base: BASE, baseline: BASELINE, head: git(['rev-parse', 'HEAD']).toString().trim(), originalSha256: ORIGINAL_SHA, candidateSha256: CANDIDATE_SHA, testSha256: TEST_SHA, baselineHelperSha256: BASE_HELPER_SHA, patchSha256: sha(patch) });
  console.log('PASS exact original829 hook, frozen corrected baseline5f75 test/helper and reviewed candidate; every other protected source body held.');
} else if (mode === 'build-transport') {
  const report = { status: 'running', method: 'Retained guard-denial classification only, no outbound permission', sources: {}, observations: [] };
  try {
    assert.equal(process.env.PRERENDER_ONLY, '/whats-new');
    const { SAMPLE_DAYS } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/prerenderClock.mjs')).href);
    assert.deepEqual(SAMPLE_DAYS, [0, 5, 11]);
    for (const file of ['scripts/lib/offlineTransport.cjs', 'scripts/lib/prerenderClock.mjs', 'scripts/prerender.mjs']) { assert.deepEqual(read(file), git(['show', BASELINE + ':' + file])); report.sources[file] = sha(read(file)); }
    const line = '[SIM_OFFLINE_BLOCK] external browser route continue https://fonts.googleapis.com\n', expected = Buffer.from(line.repeat(3));
    assert.equal(sha(expected), '1175154605f5681b53732047b77c744fb9e814fe3c6340be82f786ea27138e57');
    const check = bytes => assert(bytes.equals(expected), 'Build must retain exactly three known denied font requests');
    const actual = fs.readFileSync(path.join(OUT, 'build.transport')); check(actual);
    report.observations.push({ case: 'actual-three-font-denials', accepted: true, bytes: actual.length, sha256: sha(actual) });
    for (const [name, changed] of [['missing-line', Buffer.from(line.repeat(2))], ['extra-line', Buffer.from(line.repeat(4))], ['database-line', Buffer.from(line.repeat(2) + '[SIM_OFFLINE_BLOCK] database browser route continue https://fixture.invalid\n')]]) {
      assert(!changed.equals(actual)); assert.throws(() => check(changed), assert.AssertionError);
      report.observations.push({ case: name, accepted: false, bytes: changed.length, sha256: sha(changed) });
    }
    assert.equal(report.observations.length, 4); report.status = 'passed'; console.log('PASS three actual denied font requests and three changed receipt rejection controls.');
  } catch (error) { report.status = 'failed'; report.error = error.stack; throw error; }
  finally { json('build-transport-classification.json', report); }
} else {
  assert(/^[0-9a-f]{64}$/.test(CANDIDATE_SHA));
  const baselineRawSha = process.env.NBA_EVALUATION_BASELINE_RAW_SHA256;
  assert(/^[0-9a-f]{64}$/.test(baselineRawSha ?? ''), 'Separately qualified actual baseline raw hash is mandatory');
  const candidate = fs.readFileSync(path.join(OUT, 'candidate-hook.ts')), sourceMap = JSON.parse(fs.readFileSync(path.join(OUT, 'source-map.json'), 'utf8'));
  assert.equal(sha(candidate), CANDIDATE_SHA); assert.deepEqual(read(HOOK), candidate);
  const faultRows = [
    ['resetSuccess', 'reset keeps a late NBA verdict out and releases evaluation busy', 'Starting over must keep the abandoned NBA five from becoming a result'],
    ['resetJson', 'reset keeps a late NBA JSON verdict out', 'A reset NBA game must ignore the previous held JSON verdict'],
    ['nonOkFallback', 'reset drops a non-ok NBA fallback already being judged', 'A reset NBA game must ignore its abandoned non-ok fallback'],
    ['thrownFallback', 'reset drops a thrown NBA fallback already being judged', 'A reset NBA game must ignore its abandoned network fallback'],
    ['rejectedFallback', 'an abandoned NBA fallback rejection cannot set a new-game error', 'An abandoned NBA judge rejection must not set the new game error'],
    ['replacement', 'an old NBA evaluation cannot clear or overwrite the next game', 'An abandoned NBA evaluation must leave the next game busy and verdict alone'],
    ['unmount', 'unmount ignores a late NBA request error without judging it', 'An unmounted NBA game must not start the offline judge after its request fails'],
  ];
  const preserveRows = [['remote', 'ordinary NBA remote success posts the chosen five and records once'], ['nonOk', 'ordinary NBA non-ok replies still finish with the offline judge'], ['thrown', 'ordinary NBA thrown requests still finish with the offline judge'], ['malformed', 'ordinary malformed NBA replies still finish with the offline judge'], ['nestedError', 'ordinary NBA local failures keep the existing retry error']];
  const all = [...faultRows, ...preserveRows], related = ['src/test/playerSearchIdentity.test.ts', 'src/test/playerSearchLocal.test.ts', 'src/hooks/useGameCompletion.test.ts'];
  const report = { status: 'running', ready: false, baseline: BASELINE, baselineRawSha256: baselineRawSha, originalSha256: ORIGINAL_SHA, candidateSha256: CANDIDATE_SHA, arms: {}, receiptControls: [], errors: [] };
  json('qualification.running.json', report);
  const outputs = {};
  function hold(label, expectedHook) {
    const actual = inventory(); json(label + '.source.json', actual); assert.deepEqual(Object.keys(actual), Object.keys(sourceMap));
    for (const [file, value] of Object.entries(sourceMap)) assert.equal(actual[file], file === HOOK ? sha(expectedHook) : value, 'Whole source hold: ' + label + ' ' + file);
  }
  function run(label, files, expectedHook, owned) {
    hold(label + '-before', expectedHook);
    const rawPath = path.join(OUT, 'raw', label + '.observations.json'), reporter = path.join(OUT, label + '.vitest.json');
    assert(!fs.existsSync(rawPath) && !fs.existsSync(reporter));
    const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + reporter];
    const env = { ...process.env, NBA_EVALUATION_RAW: owned ? rawPath : '', SIM_OFFLINE_RECEIPT: path.join(OUT, label + '.transport') };
    const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    put(label + '.stdout.log', result.stdout ?? ''); put(label + '.stderr.log', result.stderr ?? '');
    json(label + '.exit.json', { args, exitCode: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null });
    hold(label + '-after', expectedHook);
    assert(!result.error && result.signal === null && result.status !== null, 'Actual child must complete: ' + label);
    const log = (result.stdout ?? '') + '\n' + (result.stderr ?? '');
    assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK/i.test(log));
    assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0);
    const unit = JSON.parse(fs.readFileSync(reporter, 'utf8')), rows = unit.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(unit.testResults.length, files.length); assert.deepEqual(unit.testResults.map(suite => suite.name.replaceAll('\\', '/').split('/src/')[1]).sort(), files.map(file => file.slice(4)).sort());
    assert.equal(unit.numPendingTests, 0); assert.equal(unit.numTodoTests, 0);
    const bytes = owned ? fs.readFileSync(rawPath) : null, raw = owned ? JSON.parse(bytes) : null;
    outputs[label] = { unit, rows, raw, bytes, exit: result.status };
    report.arms[label] = { exitCode: result.status, total: unit.numTotalTests, passed: unit.numPassedTests, failed: unit.numFailedTests, raw: bytes ? { file: 'raw/' + label + '.observations.json', bytes: bytes.length, sha256: sha(bytes) } : null };
    return outputs[label];
  }
  function commonRaw(raw) {
    assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, all.map(row => row[1])); assert.deepEqual(Object.keys(raw.cases), all.map(row => row[0]));
    let reviews = 0, enrichments = 0, gates = 0;
    for (const [key, title] of all) {
      const r = raw.cases[key]; assert.equal(r.title, title); assert.deepEqual(r.unexpected, []); assert.deepEqual(r.draws, []); assert.deepEqual(r.storesAfter, r.storesBefore);
      assert(r.deferred.length > 0 && r.deferred.every(gate => typeof gate.label === 'string' && gate.settled === true)); gates += r.deferred.length;
      const chosen = key === 'replacement' ? [r.moments.pending.chosen, r.moments.pending.fresh, r.moments.completed.chosen, r.moments.completed.fresh] : [r.moments.chosen];
      const requests = chosen.flatMap(s => {
        assert.equal(s.phase, 'reviewing'); assert.equal(s.filledCount, 5); assert.equal(s.totalStat, 65); assert.equal(s.verdict, null); assert.equal(s.filledSlots.length, 5); assert.deepEqual(s.filledSlotsArray, s.filledSlots.map(row => row.slot));
        return [...s.filledSlots.map(({ slot }) => ({ kind: 'enrichment', url: 'https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/nba-validate-player', method: 'POST', contentType: 'application/json', body: { playerName: slot.playerName, teamName: slot.assignedTeam, position: slot.role, challengeStat: s.challenge.stat }, signalAtCall: null })), { kind: 'evaluation', url: 'https://flawuiqbvjobmkfkauhw.supabase.co/functions/v1/nba-evaluate-lineup', method: 'POST', contentType: 'application/json', body: { players: s.filledSlotsArray, challenge: s.challenge }, signalAtCall: null }];
      });
      assert.deepEqual(r.requests, requests, 'Actual public hook request bodies: ' + key);
      reviews += r.requests.filter(row => row.kind === 'evaluation').length; enrichments += r.requests.filter(row => row.kind === 'enrichment').length;
    }
    assert.equal(reviews, 15); assert.equal(enrichments, 75); assert.equal(gates, 19);
  }
  function green(o, count) { assert.equal(o.exit, 0); assert.equal(o.unit.success, true); assert.equal(o.unit.numTotalTests, count); assert.equal(o.unit.numPassedTests, count); assert.equal(o.unit.numFailedTests, 0); assert.equal(o.rows.length, count); assert(o.rows.every(row => row.status === 'passed')); }
  function owned(o, old) {
    commonRaw(o.raw); assert.equal(o.unit.numTotalTests, 12); assert.equal(o.rows.length, 12);
    if (!old) { green(o, 12); assert.deepEqual(o.rows.map(row => row.title), all.map(row => row[1])); return; }
    assert.equal(o.exit, 1); assert.equal(o.unit.success, false); assert.equal(o.unit.numPassedTests, 5); assert.equal(o.unit.numFailedTests, 7);
    const failed = o.rows.filter(row => row.status === 'failed'); assert.deepEqual(failed.map(row => row.title), faultRows.map(row => row[1])); assert.deepEqual(o.rows.filter(row => row.status === 'passed').map(row => row.title), preserveRows.map(row => row[1]));
    failed.forEach((row, index) => { assert(row.failureMessages.length > 0); for (const message of row.failureMessages) { const text = message.replace(/\x1b\[[0-9;]*m/g, ''); assert(text.includes('AssertionError') && text.includes(faultRows[index][2]) && text.includes('expected false to be true')); } });
    assert.equal(sha(o.bytes), baselineRawSha, 'Whole actual original raw must equal separately qualified corrected baseline5f75');
  }
  function relatedGreen(o) { green(o, 41); const counts = [29, 8, 4]; related.forEach((file, i) => { const suites = o.unit.testResults.filter(suite => suite.name.replaceAll('\\', '/').endsWith('/' + file)); assert.equal(suites.length, 1); assert.equal(suites[0].assertionResults.length, counts[i]); }); }
  function attempt(label, work) { try { work(); } catch (error) { report.errors.push({ label, error: error.stack }); } }
  try {
    attempt('candidate', () => owned(run('candidate', [TEST], candidate, true), false));
    attempt('related-current', () => relatedGreen(run('related-current', related, candidate, false)));
    hold('before-original-write', candidate); fs.writeFileSync(path.join(ROOT, HOOK), original);
    attempt('original', () => owned(run('original', [TEST], original, true), true));
    attempt('related-original', () => relatedGreen(run('related-original', related, original, false)));
  } catch (error) { report.errors.push({ label: 'source-transition', error: error.stack }); }
  finally { fs.writeFileSync(path.join(ROOT, HOOK), candidate); hold('finally-restored', candidate); }
  attempt('restored', () => owned(run('restored', [TEST], candidate, true), false));
  attempt('cross-arm', () => {
    const normal = outputs.candidate, old = outputs.original, restored = outputs.restored;
    assert(normal && old && restored); assert(normal.bytes.equals(restored.bytes), 'Restored entire raw bytes equal candidate');
    for (const [key] of preserveRows) assert.deepEqual(normal.raw.cases[key], old.raw.cases[key], 'Whole preservation case unchanged: ' + key);
    assert.deepEqual(outputs['related-current'].rows.map(row => row.fullName).sort(), outputs['related-original'].rows.map(row => row.fullName).sort());
    for (const [name, change] of [['payload', raw => { raw.cases.remote.requests[0].body.playerName = 'Changed receipt only'; }], ['unsettled', raw => { raw.cases.remote.deferred[0].settled = false; }]]) {
      const changed = structuredClone(normal.raw); change(changed); assert.notEqual(sha(JSON.stringify(changed)), sha(JSON.stringify(normal.raw))); assert.throws(() => commonRaw(changed), assert.AssertionError); report.receiptControls.push({ name, changedSha256: sha(JSON.stringify(changed)), rejected: true });
    }
    report.preservedWholeCases = preserveRows.map(row => row[0]); report.restoredRawEqualsCandidate = true;
  });
  hold('final-candidate', candidate);
  report.status = report.errors.length ? 'failed' : 'passed'; report.limits = 'Prepared fictional five-player inputs, actual public hook actions and completion callback. No live NBA lookup, new browser journey, physical device, broad suite, changed I join or publication claim.';
  json('qualification.json', report);
  assert.equal(report.errors.length, 0, 'Every owned and preservation arm must pass without setup errors');
  console.log('PASS candidate12, original7precise+5preserve, restored12; original baseline full raw, restored byte equality, five whole preserves, both existing41 and whole source holds.');
}
