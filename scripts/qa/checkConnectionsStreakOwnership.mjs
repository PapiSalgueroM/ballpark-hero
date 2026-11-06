import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const binding = {
  run: '42302611326', head: 'cfe1f893b81cd90fd531328d0bc3138defe39521', tree: '13cfc8ca6070d49fc2fc5077547190289d805208', artifact: '13545221221',
  zipBytes: '9182838', zipSHA256: 'c4937468e6458ed75f1b06782ec1ec0397ab1b74ed2bfaea87ffbf75e4d75a6f', rawBytes: '30757119', rawSHA256: '971f704d647f65abc35003ae10027b952eab60706333577152bdaa711133ff44',
};
for (const key of ['run', 'artifact', 'zipBytes', 'rawBytes']) {
  assert.match(binding[key], /^[1-9][0-9]*$/, 'Completed fixed binding required: ' + key);
  assert(Number.isSafeInteger(Number(binding[key])), 'Safe fixed numeric binding: ' + key);
}
for (const key of ['head', 'tree']) assert.match(binding[key], /^[a-f0-9]{40}$/, 'Completed fixed binding required: ' + key);
for (const key of ['zipSHA256', 'rawSHA256']) assert.match(binding[key], /^[a-f0-9]{64}$/, 'Completed fixed binding required: ' + key);
const out = process.env.CONNECTIONS_STREAK_CONTROL_OUT, reference = process.env.CONNECTIONS_FIXED_REFERENCE;
const absolute = value => typeof value === 'string' && value.startsWith('/') && !value.split('/').includes('..');
assert(absolute(out) && !fs.existsSync(out), 'Fresh absolute CONNECTIONS_STREAK_CONTROL_OUT required');
assert(absolute(reference) && fs.statSync(reference).isDirectory(), 'Retained absolute CONNECTIONS_FIXED_REFERENCE required');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.version, 'v24.22.1', 'Pinned Node runtime');
assert(/--require=.*scripts\/lib\/offlineTransport\.cjs/.test(process.env.NODE_OPTIONS || ''), 'Actual offline preload required');
for (const name of ['NO_DOUBLE_SWAP', 'COMPLETION_HOOK']) assert(!process.env[name], 'No alternate core module alias: ' + name);
const offline = process.env.SIM_OFFLINE_RECEIPT;
assert(absolute(offline) && fs.statSync(offline).isFile()); assert.equal(fs.statSync(offline).size, 0);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const read = file => fs.readFileSync(file), json = file => JSON.parse(read(file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const hook = 'src/hooks/useConnections.ts', test = 'src/test/connectionsStreakOwnership.test.tsx';
const priorTest = 'src/test/connectionsModeSelection.test.tsx', controller = 'scripts/qa/checkConnectionsStreakOwnership.mjs';
const workflow = '.github/workflows/connections-streak-20261106.yml', plan = 'docs/plans/2026-11-06-connections-streak-ownership.md';
const pins = {
  [hook]: '4b855e80db09fcff02154cf44d3357d0d0ffa1c6', [test]: 'a196e04d005c53c605ad092615ced0d566c7ba21',
  [priorTest]: 'e79ad2f59a671d83fba294e4bc61c400dd2b3037', [plan]: '505c809a4bc9903a6846daebb51709571954325c',
  'src/pages/Connections.tsx': 'b5bd5aaba7d8877be86cc592ca4ae1616b517a5f',
  'src/components/connections/ConnectionsBoard.tsx': 'ddf73f5aa52fca4d425b5050b1bc48ef898155fe',
  'src/hooks/useDailyPuzzle.ts': 'b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846',
  'src/hooks/useGameCompletion.ts': 'b104822551fd5d9b1c5d6ddb14f01c79e5a662b2',
  'src/lib/fetchConnectionsPuzzles.ts': '9898509632c42b37b8db3195ace953cd565fc201',
  'src/lib/safeStorage.ts': '43ab9a6ed454594bf4e0e2a4a20edc5e45cf7683',
  'src/App.tsx': '8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33',
  'src/data/gameRegistry.ts': 'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
  'public/connections/index.html': '41f384834b6c6fc3435c751f7d6154065389ac91',
  'package.json': '2ff64986fb76ebc51b706f2fd24765768874008a',
  'package-lock.json': '97d6f12a052f25f400462938c241789a083f0bfe',
};
for (const [file, expected] of Object.entries(pins)) assert.equal(blob(read(file)), expected, file + ' physical body');
const fixedHook = read(hook), fixedText = fixedHook.toString('utf8');
const originalRegion = `  // Streak: only fire when the user actually plays (wasPlaying guard)
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (isLoading) return;
    if (gameStatus === 'playing') { wasPlayingRef.current = true; return; }
    if (!wasPlayingRef.current) return;
    wasPlayingRef.current = false;
    if (gameStatus === 'won') {
      setStreak((prev) => {
        const next = prev + 1;
        safeSetItem('connections-streak', String(next));
        return next;
      });
    } else {
      setStreak(0);
      safeSetItem('connections-streak', '0');
    }
  }, [gameStatus, isLoading]);`;
const fixedRegion = `  // Streak: each mode owns its wasPlaying guard.
  const wasPlayingRef = useRef<Record<ConnectionsMode, boolean>>({ daily: false, unlimited: false });
  useEffect(() => {
    if (isLoading) return;
    if (gameStatus === 'playing') { wasPlayingRef.current[mode] = true; return; }
    if (!wasPlayingRef.current[mode]) return;
    wasPlayingRef.current[mode] = false;
    if (gameStatus === 'won') {
      setStreak((prev) => {
        const next = prev + 1;
        safeSetItem('connections-streak', String(next));
        return next;
      });
    } else {
      setStreak(0);
      safeSetItem('connections-streak', '0');
    }
  }, [mode, gameStatus, isLoading]);`;
function replaceOnce(text, before, after, name) {
  assert.equal(text.split(before).length - 1, 1, name + ' one complete physical source region');
  assert.notEqual(before, after, name + ' replacement differs');
  const result = text.replace(before, () => after); assert.notEqual(result, text, name + ' source changed'); return result;
}
const originalHook = Buffer.from(replaceOnce(fixedText, fixedRegion, originalRegion, 'original inverse'));
assert.equal(blob(originalHook), '55050eccb78a6574a1524f0cfb7597c789104c73');
assert(!originalHook.equals(fixedHook), 'Original arm physically differs from fixed');
assert(Buffer.from(replaceOnce(originalHook.toString('utf8'), originalRegion, fixedRegion, 'fixed forward')).equals(fixedHook));

function physicalFiles(root) {
  const result = [];
  const visit = relative => {
    for (const entry of fs.readdirSync(root + (relative ? '/' + relative : ''), { withFileTypes: true })) {
      const file = relative ? relative + '/' + entry.name : entry.name;
      assert(!entry.isSymbolicLink(), 'No reference packet symlink: ' + file);
      if (entry.isDirectory()) visit(file); else { assert(entry.isFile()); result.push(file); }
    }
  };
  visit(''); return result.sort();
}
function archive(zip, packet, expectedSHA, expectedBytes, name) {
  const bytes = read(zip); assert.equal(bytes.length, Number(expectedBytes)); assert.equal(sha(bytes), expectedSHA, name + ' actual ZIP digest');
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trimEnd().split('\n');
  assert(entries.length > 0); assert.equal(new Set(entries).size, entries.length, name + ' unique ZIP entries');
  for (const file of entries) assert(file && !file.endsWith('/') && !file.startsWith('/') && !file.includes('\\') && !file.split('/').includes('..'), name + ' safe file entry');
  assert.deepEqual([...entries].sort(), physicalFiles(packet), name + ' every extracted body and no extras');
  const bodies = entries.map(file => {
    const archived = execFileSync('unzip', ['-p', zip, file], { maxBuffer: 128 * 1024 * 1024 });
    const physical = read(packet + '/' + file); assert(archived.equals(physical), name + ' actual ZIP body: ' + file);
    return { file, bytes: physical.length, sha256: sha(physical) };
  });
  return { bytes: bytes.length, sha256: sha(bytes), bodies, bodyCount: bodies.length, bodyBytes: bodies.reduce((n, row) => n + row.bytes, 0) };
}
function metadata(run, jobs, meta, expected, kind) {
  assert.equal(String(run.id), String(expected.run)); assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success'); assert.equal(run.head_sha, expected.head);
  assert.equal(run.repository.full_name, 'PapiSalgueroM/ballpark-hero'); assert.equal(run.path, workflow); assert.equal(run.event, 'push');
  if (Object.hasOwn(jobs, 'total_count')) assert.equal(jobs.total_count, 1); assert.equal(jobs.jobs.length, 1);
  const job = jobs.jobs[0]; assert.equal(job.run_id, Number(expected.run)); assert.equal(job.status, 'completed'); assert.equal(job.conclusion, 'success');
  assert(meta && typeof meta === 'object' && !Array.isArray(meta), 'Artifact metadata object required');
  const artifacts = Object.hasOwn(meta, 'artifacts') ? meta.artifacts : [meta];
  assert(Array.isArray(artifacts)); assert.equal(artifacts.length, 1); const artifact = artifacts[0];
  assert.equal(String(artifact.id), String(expected.artifact)); assert.equal(artifact.name, 'connections-streak-' + kind + '-' + expected.run);
  assert.equal(artifact.expired, false); assert.equal(artifact.size_in_bytes, Number(expected.zipBytes)); assert.equal(artifact.digest, 'sha256:' + expected.zipSHA256);
  assert.equal(artifact.workflow_run.id, Number(expected.run)); assert.equal(artifact.workflow_run.head_sha, expected.head);
  return { run: run.id, head: run.head_sha, artifact: artifact.id, job: job.id, status: run.conclusion };
}
const ref = reference + '/packet';
const fixedMetadata = metadata(json(reference + '/run.json'), json(reference + '/jobs.json'), json(reference + '/artifact.json'), binding, 'fixed');
const fixedArchive = archive(reference + '/artifact.zip', ref, binding.zipSHA256, binding.zipBytes, 'completed fixed');
assert.equal(read(ref + '/head.txt').toString('utf8').trim(), binding.head); assert.equal(read(ref + '/tree.txt').toString('utf8').trim(), binding.tree);
const fixedJoin = json(ref + '/source-join.json'); assert.equal(fixedJoin.status, 'passed'); assert.equal(fixedJoin.head, binding.head); assert.equal(fixedJoin.trackedRows, 5780);
assert.equal(fixedJoin.base, '3cb2528ca044c75edae96197e58d2ca525b5e1f9'); assert.equal(fixedJoin.baseTree, '93ba5a30f0fcb70725284702260c7c389e94a8ab');
for (const file of [hook, test, priorTest, plan]) assert.equal(fixedJoin.pins[file], pins[file], 'Fixed authenticated source join: ' + file);
const originalBinding = { run: 42299438424, head: '38f1e0ecec25513ef3417868bd3122092f95ff9a', tree: '0b899770145ff1a9105b0ee2b2ae4ec7db9c41a4', artifact: 13542769378, zipBytes: 3778065, zipSHA256: 'a4d67f2079e3169c20f8d5ba3b37e60508a6783e1b3786cde4147e3a80cc0626' };
const originalMetadata = metadata(json(ref + '/original-run.json'), json(ref + '/original-jobs.json'), json(ref + '/original-artifact.json'), originalBinding, 'original');
const originalRef = ref + '/original-packet';
const originalArchive = archive(ref + '/original.zip', originalRef, originalBinding.zipSHA256, originalBinding.zipBytes, 'completed original');
assert.equal(originalArchive.bodyCount, 46); assert.equal(originalArchive.bodyBytes, 37606951);
assert.equal(read(originalRef + '/head.txt').toString('utf8').trim(), originalBinding.head); assert.equal(read(originalRef + '/tree.txt').toString('utf8').trim(), originalBinding.tree);
const originalBytes = read(originalRef + '/streak-raw.json'), originalPriorBytes = read(originalRef + '/mode-raw.json');
const fixedBytes = read(ref + '/streak-raw.json'), fixedPriorBytes = read(ref + '/mode-raw.json');
assert.equal(originalBytes.length, 30838539); assert.equal(sha(originalBytes), 'bae153a52f8091315cb9fda82563db59745acc9140af5bb5d48fc8705d2f70f9');
assert.equal(originalPriorBytes.length, 394640); assert.equal(sha(originalPriorBytes), '88cb3ae8d73b6f10d32d181b11e392a78921eaba07e59d56ae0cd5c135085d75');
assert.equal(fixedBytes.length, Number(binding.rawBytes)); assert.equal(sha(fixedBytes), binding.rawSHA256); assert(fixedPriorBytes.equals(originalPriorBytes));
assert(!fixedBytes.equals(originalBytes), 'Completed fixed outcomes physically differ from original');
const original = JSON.parse(originalBytes), originalPrior = JSON.parse(originalPriorBytes), fixed = JSON.parse(fixedBytes), fixedProof = json(ref + '/fixed-admission.json');
const originalProof = json(originalRef + '/original-admission.json');
assert.equal(originalProof.status, 'expected-three-original-business-failures-three-new-preserves-prior-eight-passed');
assert.equal(fixedProof.status, 'fixed-six-streak-cases-prior-eight-passed-three-whole-preserves');
for (const [key, value] of Object.entries({ actualCases: 14, actualPasses: 14, actualFailures: 0, newCases: 6, newPasses: 6, priorCases: 8, priorPasses: 8, newFrames: 116, priorFrames: 42, totalFrames: 158, publicUnitClicks: 248, boundedQueries: 7 })) assert.equal(fixedProof[key], value, 'Fixed actual ' + key);
assert.equal(fixedProof.source.hook, pins[hook]); assert.equal(fixedProof.source.newTest, pins[test]); assert.equal(fixedProof.source.priorTest, pins[priorTest]); assert.equal(fixedProof.source.plan, pins[plan]);
assert.equal(fixedProof.raw.bytes, fixedBytes.length); assert.equal(fixedProof.raw.sha256, sha(fixedBytes)); assert.equal(fixedProof.priorRaw.sha256, sha(originalPriorBytes)); assert.equal(fixedProof.priorRaw.literalBytesEqualOriginal, true);
assert.equal(fixedProof.originalRun, originalBinding.run); assert.equal(fixedProof.originalArtifact, originalBinding.artifact); assert.equal(fixedProof.originalRawSHA256, sha(originalBytes));

const keys = ['current', 'restore', 'unlimitedLost', 'dailyWon', 'unlimitedWon', 'dailyLost'];
const preserves = keys.slice(0, 3), harms = keys.slice(3);
const markers = { dailyWon: 'CONN_STREAK_DAILY_WIN_VIEW', unlimitedWon: 'CONN_STREAK_UNLIMITED_WIN_VIEW', dailyLost: 'CONN_STREAK_DAILY_LOSS_VIEW' };
const priorKeys = ['forward', 'reverse', 'forwardFeedback', 'reverseFeedback', 'same', 'progress', 'daily', 'unlimited'];
const labels = Object.fromEntries(keys.map(key => [key, original.cases[key].frames.map(frame => frame.label)]));
const priorLabels = Object.fromEntries(priorKeys.map(key => [key, originalPrior.cases[key].frames.map(frame => frame.label)]));
assert.deepEqual(Object.values(labels).map(list => list.length), [24, 24, 20, 14, 15, 19]);
assert.deepEqual(Object.values(priorLabels).map(list => list.length), [5, 5, 4, 4, 10, 6, 4, 4]);
assert.deepEqual(originalProof.wholeNewPreservedCases.map(row => row.key), preserves);
assert.deepEqual(originalProof.wholePriorPreservedCases.map(row => row.key), priorKeys);
const casePins = new Map([...originalProof.wholeNewPreservedCases.map(row => ['new:' + row.key, row]), ...originalProof.wholePriorPreservedCases.map(row => ['prior:' + row.key, row])]);
const badBanner = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError|ReferenceError|TypeError|Unexpected.*fixture|overlapping act\(\)|not wrapped in act\(/;
function actualReport(file, failedKeys, name) {
  const report = json(file), rows = report.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(report.numTotalTests, 14); assert.equal(report.numPassedTests, 14 - failedKeys.length); assert.equal(report.numFailedTests, failedKeys.length);
  assert.equal(report.numPendingTests, 0); if (Object.hasOwn(report, 'numTodoTests')) assert.equal(report.numTodoTests, 0);
  assert.equal(report.testResults.length, 2); assert.equal(rows.length, 14); assert.equal(report.success, failedKeys.length === 0);
  assert.deepEqual(report.testResults.map(suite => suite.name.split('/').at(-1)).sort(), [priorTest.split('/').at(-1), test.split('/').at(-1)].sort());
  for (const field of ['numRuntimeErrorTestSuites', 'numUnhandledErrors']) if (Object.hasOwn(report, field)) assert.equal(report[field], 0, name + ' ' + field);
  for (const field of ['unhandledErrors', 'testExecutionErrors']) if (Object.hasOwn(report, field)) assert.deepEqual(report[field], [], name + ' ' + field);
  for (const suite of report.testResults) {
    assert.equal(suite.message ?? '', '', name + ' no hidden suite error');
    assert.equal(suite.status, suite.assertionResults.some(row => row.status === 'failed') ? 'failed' : 'passed');
  }
  const expected = [...keys.map(key => ({ key, title: original.cases[key].title, failed: failedKeys.includes(key) })), ...priorKeys.map(key => ({ key, title: originalPrior.cases[key].title, failed: false }))];
  assert.deepEqual(rows.map(row => row.title).sort(), expected.map(row => row.title).sort(), name + ' exact14 actual titles');
  for (const definition of expected) {
    const matching = rows.filter(row => row.title === definition.title); assert.equal(matching.length, 1); const row = matching[0];
    assert.equal(row.status, definition.failed ? 'failed' : 'passed', name + ' actual row ' + definition.key);
    assert(Array.isArray(row.failureMessages)); assert.equal(row.failureMessages.length, definition.failed ? 1 : 0);
    if (definition.failed) {
      const message = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '');
      assert(message.startsWith('AssertionError: ' + markers[definition.key] + ' '), name + ' exact named business AssertionError');
      const baseline = originalProof.businessFailures.find(failure => failure.key === definition.key);
      assert.equal(message.split('\n')[0], baseline.failureMessage.split('\n')[0], name + ' same concrete original business harm');
      assert(!/STACK_TRACE_ERROR|timed out|TypeError|ReferenceError|SyntaxError|Cannot find|Failed to resolve/.test(message));
    }
  }
  return { rows, report, failed: rows.filter(row => row.status === 'failed'), passed: rows.filter(row => row.status === 'passed') };
}
function wholeVectors(raw, prior, name) {
  const result = [];
  for (const [kind, source, selected] of [['new', raw, preserves], ['prior', prior, priorKeys]]) {
    for (const key of selected) {
      const fullObject = source.cases[key], bytes = Buffer.from(JSON.stringify(fullObject)), expected = casePins.get(kind + ':' + key);
      assert.equal(sha(bytes), expected.sha256, name + ' complete literal preservation object ' + kind + ':' + key);
      assert.equal(fullObject.frames.length, expected.frames);
      result.push({ kind, key, frames: fullObject.frames.length, bytes: bytes.length, sha256: sha(bytes), entireObject: true });
    }
  }
  assert.equal(result.length, 11); return result;
}
function actualRaw(raw, prior, name) {
  assert.deepEqual({ ...raw, cases: null }, { ...original, cases: null }, name + ' entire new RAW header/fictional pool');
  assert.deepEqual(Object.keys(raw.cases), keys); assert.deepEqual(Object.keys(prior.cases), priorKeys);
  let newFrames = 0, priorFrames = 0, clicks = 0, queries = 0;
  for (const key of keys) {
    const value = raw.cases[key]; assert.equal(value.title, original.cases[key].title); assert.deepEqual(value.frames.map(frame => frame.label), labels[key]);
    newFrames += value.frames.length;
    const last = value.frames.at(-1); assert.equal(last.label, 'teardown-after'); assert.equal(last.state, null); assert.equal(last.page, null);
    assert.equal(value.frames.at(-2).label, 'teardown-before'); assert.equal(last.pendingResponses, 0); assert.deepEqual(last.unexpectedTransport, []);
    clicks += last.actions.length; queries += last.transport.length;
  }
  for (const key of priorKeys) { assert.equal(prior.cases[key].title, originalPrior.cases[key].title); assert.deepEqual(prior.cases[key].frames.map(frame => frame.label), priorLabels[key]); priorFrames += prior.cases[key].frames.length; }
  assert.equal(newFrames, 116); assert.equal(priorFrames, 42); assert.equal(clicks, 248); assert.equal(queries, 7);
  return { newFrames, priorFrames, totalFrames: newFrames + priorFrames, publicUnitClicks: clicks, boundedQueries: queries };
}
const frame = (raw, key, label) => { const found = raw.cases[key].frames.filter(value => value.label === label); assert.equal(found.length, 1); return found[0]; };
function observed(raw, originalArm) {
  const win = key => [frame(raw, key, (key === 'dailyWon' ? 'daily-won' : 'unlimited-won') + '-ok-4').state.streak, frame(raw, key, (key === 'dailyWon' ? 'daily-won' : 'unlimited-won') + '-revisit').state.streak, frame(raw, key, (key === 'dailyWon' ? 'daily-won' : 'unlimited-won') + '-revisit-again').state.streak];
  const observations = { dailyWon: win('dailyWon'), unlimitedWon: win('unlimitedWon'), dailyLost: ['daily-lost-other-ok-4', 'daily-lost-other-retry', 'daily-lost-revisit', 'daily-lost-revisit-again'].map(label => frame(raw, 'dailyLost', label).state.streak) };
  assert.deepEqual(observations, originalArm ? { dailyWon: [3, 4, 5], unlimitedWon: [3, 4, 5], dailyLost: [1, 1, 0, 0] } : { dailyWon: [3, 3, 3], unlimitedWon: [3, 3, 3], dailyLost: [1, 1, 1, 1] });
  return observations;
}
actualReport(originalRef + '/owned.json', harms, 'qualified original'); actualReport(ref + '/owned.json', [], 'qualified fixed');
assert(!badBanner.test(read(originalRef + '/owned.log').toString('utf8'))); assert(!badBanner.test(read(ref + '/owned.log').toString('utf8')));
actualRaw(original, originalPrior, 'qualified original'); actualRaw(fixed, JSON.parse(fixedPriorBytes), 'qualified fixed');
wholeVectors(original, originalPrior, 'qualified original'); wholeVectors(fixed, JSON.parse(fixedPriorBytes), 'qualified fixed');
observed(original, true); observed(fixed, false);

function indexRows(text) {
  return text.trimEnd().split('\n').map(line => {
    const matching = /^(100644|100755) ([a-f0-9]{40}) 0\t(.+)$/.exec(line); assert(matching, 'Regular stage0 tracked file row: ' + line);
    return { mode: matching[1], blob: matching[2], file: matching[3], line };
  });
}
const index = git(['ls-files', '-s']), indexed = indexRows(index), files = indexed.map(row => row.file);
assert.equal(new Set(files).size, files.length); assert.equal(files.length, 5781); assert(files.includes(controller));
assert.equal(files.filter(file => /^(src|public|scripts)\//.test(file)).length, 4659);
const fixedIndex = read(ref + '/source-before.txt').toString('utf8'), fixedRows = indexRows(fixedIndex);
assert.equal(fixedRows.length, 5780); assert.equal(fixedRows.filter(row => /^(src|public|scripts)\//.test(row.file)).length, 4658);
for (const [left, right] of [['source-before.txt', 'source-after.txt'], ['tracked-before.json', 'tracked-after.json'], ['locks-before.txt', 'locks-after.txt'], ['installed-before.json', 'installed-after.json']]) assert(read(ref + '/' + left).equals(read(ref + '/' + right)), 'Completed fixed exact hold: ' + left);
assert.equal(read(ref + '/types.log').length, 0); assert.equal(read(ref + '/offline.log').length, 0);
const fixedHolds = json(ref + '/final-holds.json'); assert.equal(fixedHolds.status, 'passed'); assert.equal(fixedHolds.trackedBodies, 5780); assert.equal(fixedHolds.installedLockedVersions, 521);
for (const key of ['indexUnchanged', 'sourceBytesUnchanged', 'locksUnchanged']) assert.equal(fixedHolds[key], true); assert.equal(fixedHolds.offlineBytes, 0);
const ownedQA = new Set([workflow, controller]);
const currentHeld = indexed.filter(row => !ownedQA.has(row.file)), referenceHeld = fixedRows.filter(row => !ownedQA.has(row.file));
assert.equal(currentHeld.length, 5779); assert.deepEqual(currentHeld.map(row => row.line), referenceHeld.map(row => row.line), 'Every other5779 mode/blob/stage/path joins actual fixed, including frozen plan');
function scan() {
  return indexed.map(row => {
    const stat = fs.statSync(row.file); assert(stat.isFile()); assert.equal(!!(stat.mode & 0o111), row.mode === '100755');
    const bytes = read(row.file); return { file: row.file, physicalMode: stat.mode & 0o777, bytes: bytes.length, blob: blob(bytes), sha256: sha(bytes) };
  });
}
const locks = () => ['package.json', 'package-lock.json'].map(file => ({ file, bytes: read(file).length, sha256: sha(read(file)) }));
function installed() {
  const lock = json('package-lock.json');
  const rows = Object.keys(lock.packages).filter(file => file.startsWith('node_modules/') && fs.existsSync(file + '/package.json')).map(file => [file, json(file + '/package.json').version]);
  assert.equal(rows.length, 521); for (const [file, version] of rows) assert.equal(version, lock.packages[file].version, file + ' locked version'); return rows;
}
const before = scan(), beforeLocks = locks(), versions = installed(), head = git(['rev-parse', 'HEAD']).trim(), tree = git(['rev-parse', 'HEAD^{tree}']).trim();
for (const row of indexed) assert.equal(before.find(value => value.file === row.file).blob, row.blob, row.file + ' exact physical/index blob');
git(['diff', '--exit-code', 'HEAD', '--', '.']);
const referenceBodies = json(ref + '/tracked-before.json').filter(row => !ownedQA.has(row.file));
assert.deepEqual(before.filter(row => !ownedQA.has(row.file)).map(({ file, bytes, sha256 }) => ({ file, bytes, sha256 })), referenceBodies, 'Every other5779 actual physical body joins fixed');
function holds(expected, name) {
  assert.deepEqual(scan(), expected, name + ' every tracked physical mode/body'); assert.equal(git(['ls-files', '-s']), index, name + ' every index mode/blob/stage/path');
  assert.equal(git(['rev-parse', 'HEAD']).trim(), head); assert.equal(git(['rev-parse', 'HEAD^{tree}']).trim(), tree);
  assert.deepEqual(locks(), beforeLocks, name + ' locks'); assert.deepEqual(installed(), versions, name + '521 locked versions'); assert.equal(fs.statSync(offline).size, 0, name + ' offline receipt');
}
fs.mkdirSync(out, { recursive: true });
write(out + '/reference-custody.json', { fixedBinding: binding, fixedMetadata, fixedArchive, originalBinding, originalMetadata, originalArchive, completeOriginalRawSHA256: sha(originalBytes), completeFixedRawSHA256: sha(fixedBytes), entirePriorRawSHA256: sha(originalPriorBytes), fixedSourceJoinedPhysicalBodies: 5779, excludedQAOnly: [...ownedQA], frozenPlan: pins[plan] });
for (const name of ['run.json', 'jobs.json', 'artifact.json']) fs.copyFileSync(reference + '/' + name, out + '/fixed-' + name, fs.constants.COPYFILE_EXCL);
fs.copyFileSync(reference + '/artifact.zip', out + '/fixed-reference.zip', fs.constants.COPYFILE_EXCL);
write(out + '/tracked-before.json', before); fs.writeFileSync(out + '/source-before.txt', index, { flag: 'wx' }); write(out + '/locks-before.json', beforeLocks); write(out + '/installed-before.json', versions);
fs.writeFileSync(out + '/fixed-hook-before.ts', fixedHook, { flag: 'wx' });

const arms = [
  { name: 'fixed', body: fixedHook, failed: [] },
  { name: 'original', body: originalHook, failed: harms },
  { name: 'restored', body: fixedHook, failed: [] },
];
const summaries = []; let failure = null, restorationFailure = null, restored = false;
try {
  for (const arm of arms) {
    const dir = out + '/' + arm.name; fs.mkdirSync(dir);
    const different = !arm.body.equals(fixedHook); assert.equal(different, arm.name === 'original');
    fs.writeFileSync(hook, arm.body);
    const physical = read(hook); assert(physical.equals(arm.body), arm.name + ' actual written Hook bytes');
    assert.equal(blob(physical), arm.name === 'original' ? '55050eccb78a6574a1524f0cfb7597c789104c73' : pins[hook]);
    const expected = before.map(row => row.file === hook ? { ...row, bytes: physical.length, blob: blob(physical), sha256: sha(physical) } : row);
    const source = { name: arm.name, changedPhysicalPaths: different ? [hook] : [], physicalHookBlob: blob(physical), physicalHookBytes: physical.length, physicalHookSHA256: sha(physical), indexHookBlob: pins[hook], indexIntentionallyHeld: true, sourceInverseChecked: true, expectedFailedBusinessMarkers: arm.failed.map(key => markers[key]) };
    fs.writeFileSync(dir + '/working-hook.ts', physical, { flag: 'wx' }); write(dir + '/source.json', source);
    holds(expected, arm.name + ' before child');
    assert.deepEqual(git(['diff', '--name-only', '--no-renames', 'HEAD', '--', '.']).trim().split('\n').filter(Boolean), different ? [hook] : [], arm.name + ' only actual Hook may differ from fixed index');
    fs.writeFileSync(dir + '/working-diff.patch', git(['diff', '--no-ext-diff', 'HEAD', '--', hook]), { flag: 'wx' });
    write(dir + '/tracked-before.json', scan()); fs.writeFileSync(dir + '/source-before.txt', git(['ls-files', '-s']), { flag: 'wx' });
    const rawFile = dir + '/streak-raw.json', priorFile = dir + '/mode-raw.json', reportFile = dir + '/owned.json', logFile = dir + '/owned.log';
    const args = ['run', test, priorTest, '--reporter=json', '--outputFile=' + reportFile, '--testTimeout=60000', '--no-file-parallelism'];
    const fd = fs.openSync(logFile, 'wx'); let child;
    try {
      child = spawnSync('node_modules/.bin/vitest', args, { cwd: process.cwd(), env: { ...process.env, CONNECTIONS_STREAK_RAW: rawFile, CONNECTIONS_MODE_RAW: priorFile }, stdio: ['ignore', fd, fd], timeout: 600000 });
    } finally { fs.closeSync(fd); }
    write(dir + '/child.json', { command: 'node_modules/.bin/vitest', args, status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, processTimeoutMs: 600000 });
    write(dir + '/tracked-after.json', scan()); fs.writeFileSync(dir + '/source-after.txt', git(['ls-files', '-s']), { flag: 'wx' });
    write(dir + '/locks-after.json', locks()); write(dir + '/installed-after.json', installed()); holds(expected, arm.name + ' after child');
    assert.equal(child.error, undefined, arm.name + ' actual fresh child launch/completion'); assert.equal(child.signal, null); assert.equal(child.status, arm.failed.length ? 1 : 0);
    const actual = actualReport(reportFile, arm.failed, arm.name), log = read(logFile).toString('utf8'); assert(!badBanner.test(log), arm.name + ' no hidden runtime/setup/act failure');
    const rawBytes = read(rawFile), priorBytes = read(priorFile), raw = JSON.parse(rawBytes), prior = JSON.parse(priorBytes);
    const expectedRaw = arm.name === 'original' ? originalBytes : fixedBytes;
    assert(rawBytes.equals(expectedRaw), arm.name + ' entire actual new RAW literal byte join to completed admitted reference');
    assert(priorBytes.equals(originalPriorBytes), arm.name + ' entire prior RAW literal bytes held');
    if (arm.name === 'original') assert(!rawBytes.equals(fixedBytes), 'Actual original control changes complete public outcomes');
    const counts = actualRaw(raw, prior, arm.name), vectors = wholeVectors(raw, prior, arm.name), observations = observed(raw, arm.name === 'original');
    const summary = { status: 'passed', ...source, actualRows: actual.rows.length, actualPasses: actual.passed.length, actualNamedBusinessReds: actual.failed.length, actualFailedTitles: actual.failed.map(row => row.title), actualPassedTitles: actual.passed.map(row => row.title), rawFrames: counts.totalFrames, newFrames: counts.newFrames, priorFrames: counts.priorFrames, publicUnitClicks: counts.publicUnitClicks, boundedQueries: counts.boundedQueries, raw: { file: 'streak-raw.json', bytes: rawBytes.length, sha256: sha(rawBytes), literalByteEqualReference: arm.name === 'original' ? 'qualified-original' : 'completed-fixed' }, priorRaw: { file: 'mode-raw.json', bytes: priorBytes.length, sha256: sha(priorBytes), literalByteEqualOriginal: true }, wholePreservationVectors: vectors, observations, everyOtherTrackedBodyAndModeHeld: true, indexHeld: true, locksHeld: true, installed521Held: true, offlineBytes: 0 };
    write(dir + '/admission.json', summary); summaries.push(summary);
    console.log('PASS ' + arm.name + ': actual14 rows/' + summary.actualPasses + 'passes/' + summary.actualNamedBusinessReds + 'named business reds/158 full frames/11whole vectors');
    fs.writeFileSync(hook, fixedHook); holds(before, arm.name + ' exact fixed source restored between arms');
  }
  assert.equal(summaries.length, 3); assert.deepEqual(summaries.map(arm => arm.name), ['fixed', 'original', 'restored']);
  assert.deepEqual(summaries.map(arm => arm.actualNamedBusinessReds), [0, 3, 0]); assert.deepEqual(summaries.map(arm => arm.actualPasses), [14, 11, 14]);
  assert.equal(summaries.reduce((n, arm) => n + arm.actualRows, 0), 42); assert.equal(summaries.reduce((n, arm) => n + arm.actualPasses, 0), 39);
  assert.equal(summaries.reduce((n, arm) => n + arm.actualNamedBusinessReds, 0), 3); assert.equal(summaries.reduce((n, arm) => n + arm.rawFrames, 0), 474);
  assert.equal(summaries.reduce((n, arm) => n + arm.wholePreservationVectors.length, 0), 33);
} catch (cause) { failure = cause; } finally {
  try {
    fs.writeFileSync(hook, fixedHook); fs.writeFileSync(out + '/fixed-hook-after.ts', read(hook), { flag: 'wx' });
    write(out + '/tracked-after.json', scan()); fs.writeFileSync(out + '/source-after.txt', git(['ls-files', '-s']), { flag: 'wx' }); write(out + '/locks-after.json', locks()); write(out + '/installed-after.json', installed());
    holds(before, 'final exact fixed source restoration'); assert(read(hook).equals(fixedHook)); assert.equal(blob(read(hook)), pins[hook]); git(['diff', '--exit-code', 'HEAD', '--', '.']); restored = true;
  } catch (cause) { restorationFailure = cause; }
  write(out + '/summary.json', { status: failure || restorationFailure ? 'failed' : 'passed-three-physical-streak-control-arms', error: failure ? String(failure) : null, restorationError: restorationFailure ? String(restorationFailure) : null, pins, head, tree, fixedBinding: binding, arms: summaries, completedArms: summaries.length, actualRows: summaries.reduce((n, arm) => n + arm.actualRows, 0), actualPasses: summaries.reduce((n, arm) => n + arm.actualPasses, 0), actualNamedBusinessReds: summaries.reduce((n, arm) => n + arm.actualNamedBusinessReds, 0), rawFrames: summaries.reduce((n, arm) => n + arm.rawFrames, 0), wholePreservationVectors: summaries.reduce((n, arm) => n + arm.wholePreservationVectors.length, 0), originalRaw: { bytes: originalBytes.length, sha256: sha(originalBytes) }, fixedRaw: { bytes: fixedBytes.length, sha256: sha(fixedBytes) }, entirePriorRaw: { bytes: originalPriorBytes.length, sha256: sha(originalPriorBytes) }, allTrackedRestored: restored, indexHeld: restored, locksHeld: restored, installed521Held: restored, offlineHeld: restored, limits: 'Three actual fresh source-control unit invocations only. All entire new RAW bodies join either completed fixed or admitted original literal bytes. Three complete new preservation case objects and eight complete prior objects are held in all three arms, with entire prior RAW bytes held. Source modes/blobs/physical bytes/index/locks/521 versions/offline are checked before and after each arm and exact fixed restoration in finally. Proper app types must pass in the enclosing workflow before and after controls. No build/readers/caps/native/provider/real-player/backend-write/full-suite/integration/release claim.' });
}
if (failure) throw failure; if (restorationFailure) throw restorationFailure;
console.log('PASS3 actual physical arms/42rows/39passes/3named business reds/474full frames/33whole preservation vectors; exact fixed source/index/locks/521/offline restored');
