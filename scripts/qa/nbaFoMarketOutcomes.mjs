import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const arg = name => process.argv[process.argv.indexOf(name) + 1];
for (const key of ['--out', '--cases']) assert(process.argv.includes(key), key + ' is required');
const ROOT = process.cwd(), out = path.resolve(arg('--out')), casesFile = path.resolve(arg('--cases'));
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Isolated offline CI only');
assert(out !== ROOT && !out.startsWith(ROOT + path.sep), 'Evidence outside source');
assert(process.env.NODE_OPTIONS?.includes(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')), 'Existing offline preload');
fs.mkdirSync(out, { recursive: true });
for (const name of ['fixed', 'whole-original', 'row-fault', 'restored', 'admission.json']) assert(!fs.existsSync(path.join(out, name)), 'Fresh outcome arms');
const specBytes = fs.readFileSync(casesFile), spec = JSON.parse(specBytes), cfg = spec.outcomes;
assert(cfg && cfg.mode === 'temporary-fixed-original-row-fault-restored');
for (const key of ['verifiedBase', 'qaParent', 'qaParentTree', 'originalHead', 'originalTree'])
  assert.match(cfg[key] ?? '', /^[a-f0-9]{40}$/, key + ' must be measured and bound');
assert.equal(cfg.verifiedBase, process.env.NBA_FO_VERIFIED_BASE); assert.equal(cfg.qaParent, process.env.NBA_FO_QA_PARENT);
assert.equal(spec.admission.verifiedBase, cfg.verifiedBase); assert.equal(spec.admission.qaParent, cfg.qaParent);
const git = (...args) => execFileSync('git', args, { maxBuffer: 16 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const BOARD = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const TEST = 'src/test/nbaFrontOfficeMarketAccess.test.tsx';
const TEST_BLOB = '8987f39786d523be495e1bacf3b7731e5c16bc57';
const TEST_SHA = '534d088807fe731ac8c5158a3ca275f11eedc2cec26ecc4cefdf23ddeaccc45f';
const pins = {
  [BOARD]: '9790f2cdb506f7feda1ed80304fe0864017878c6',
  'src/lib/nbaFrontOffice.ts': 'c1a4fd8c65f45ca251d6b6a5fe12f35c1bb3c217',
  'src/lib/nbaRotation.ts': 'acd7dbb36dda24f640647613e0daf63caff7d7cf',
  'src/lib/nbaGmDesk.ts': 'e43dcf727afae26b4040bec9f7999b5faaa19c55',
  'src/lib/gmContracts.ts': 'd51c6fe3b58b079c95b88d9b296c622d7181727e',
  'src/lib/gmDesk.ts': '732b2dd3546f383326ba24b9b65cb634e997d02c',
  'src/lib/entityIds.ts': '5d7791d0f0d573d1c25ef567b2102f29996f7d6e',
  'src/lib/frontOfficeCuts.ts': 'd835672cb11b2283270ffdfadf35d17abe78b228',
};
assert.equal(cfg.originalRun, 41930515709); assert.equal(cfg.originalHead, 'a4c4f71f3a13dd86ac61e6df835fb1250e344fb4');
assert.equal(cfg.originalTree, 'd3a0b5c6cf25d28a873b8437036e6407ea66819f');
const recordedRaw = [
  { file: 'complete-pool.json', bytes: 893326, sha256: '33d9f58d95a97103c2e93ba04c84b1b8ce7e5c34e422fb25b39de9561bf95bf9' },
  { file: 'tail-sign.json', bytes: 2511687, sha256: 'e4cbef5175bf1f21924abfec742e506b21936c89acdb97462a0ef6493dd234f1' },
  { file: 'legacy-guards.json', bytes: 4084720, sha256: '62fde002b6bf9d5f36d65e024e4a4a01fb373aa6035af9be730034c745ec5737' },
];
const files = recordedRaw.map(row => row.file).sort();
assert.deepEqual(cfg.recordedRaw, recordedRaw, 'Frozen measured original complete RAW hashes');
const originalProof = cfg.originalAdmission;
assert.equal(originalProof.status, 'admitted-original-only'); assert.equal(originalProof.releaseBase, cfg.verifiedBase);
assert.equal(originalProof.testCore, cfg.qaParent); assert.equal(originalProof.qaHead, cfg.originalHead); assert.equal(originalProof.qaTree, cfg.originalTree);
assert.equal(originalProof.run, cfg.originalRun); assert.equal(originalProof.job, 126925923417);
assert.equal(originalProof.artifact.id, 13372325319); assert.equal(originalProof.artifact.bytes, 2025261);
assert.equal(originalProof.artifact.sha256, 'b6b4f7c4c024fbc2127a60476ae273c5028be9fb342bce9a871d48f97b92e04d');
assert.equal(originalProof.artifact.acquisitions, 1); assert.equal(originalProof.artifact.checkedBeforeExtraction, true);
assert.equal(originalProof.test.git, TEST_BLOB); assert.equal(originalProof.test.bytes, 14160); assert.equal(originalProof.test.sha256, TEST_SHA);
assert.equal(originalProof.result.status, 'admitted-original');
assert.deepEqual(originalProof.result.counts, { total: 3, ownedFailures: 2, heldPasses: 1, pending: 0 });
assert.deepEqual(originalProof.result.raw, recordedRaw);
assert.equal(originalProof.result.sourceHeld, true); assert.equal(originalProof.result.exactFinalSource, true);
assert.equal(originalProof.result.productNeverMutated, true); assert.equal(originalProof.result.statusAfter, '');
assert.equal(originalProof.result.offline.blockedAttempts, 0);
assert.deepEqual(JSON.parse(originalProof.result.types), { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'types-passed.json'))), { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Initially clean source');
assert.equal(git('rev-parse', 'HEAD^').toString().trim(), cfg.qaParent, 'Untouched test/docs source is the immediate QA parent');
assert.equal(git('rev-parse', 'HEAD^^{tree}').toString().trim(), cfg.qaParentTree);
const test = fs.readFileSync(TEST), saved = fs.readFileSync(BOARD), original = saved;
assert.equal(test.length, 14160); assert.equal(blob(test), TEST_BLOB); assert.equal(sha(test), TEST_SHA);
assert.equal(spec.path, TEST); assert.equal(spec.git, TEST_BLOB); assert.equal(spec.bytes, 14160); assert.equal(spec.sha256, TEST_SHA);
assert.deepEqual(spec.pins, pins);
for (const [file, pin] of Object.entries(pins)) assert.equal(blob(fs.readFileSync(file)), pin, file + ' original body');
assert.equal(git('diff', '--name-only', 'HEAD^', 'HEAD', '--', 'src', 'public', 'index.html', 'package.json', 'package-lock.json', 'bun.lockb', 'vite.config.ts').length, 0,
  'QA commit does not change the original app, typed test, assets or dependency locks');
const oldSpan = '            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).slice(0, 20).map(p => {';
const newSpan = '            {[...league.freeAgents].sort((a, b) => b.ovr - a.ovr).map(p => {';
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'Exactly one real market row span');
  const next = source.replace(before, after); assert.notEqual(next, source); return next;
}
const fixed = Buffer.from(replaceOnce(original.toString('utf8'), oldSpan, newSpan));
assert(!fixed.equals(saved), 'Only the one row-cap removal forms the temporary fixed body');
const rowFault = Buffer.from(replaceOnce(fixed.toString('utf8'), newSpan, oldSpan));
assert(!rowFault.equals(fixed)); assert(rowFault.equals(original), 'Row fault equals the whole original, one fault class');
const paths = git('ls-files', '-z').toString().split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(paths.map(file => [file, sha(fs.readFileSync(file))]));
const parentReceipt = process.env.SIM_OFFLINE_RECEIPT; assert(parentReceipt && fs.existsSync(parentReceipt));
assert.equal(fs.statSync(parentReceipt).size, 0, 'Silent caller receipt before source arms');
const before = inventory();
function sourceHeld(body) { assert.deepEqual(inventory(), { ...before, [BOARD]: sha(body) }, 'Entire tracked source held except the declared board arm'); }
fs.writeFileSync(path.join(out, 'runner-cases.json'), specBytes);
fs.writeFileSync(path.join(out, 'runner-source-before.json'), JSON.stringify(before, null, 2) + '\n');
const names = [
  'NBA Front Office complete free agent market shows every saved free agent beyond twenty and thirty with the actual tail rating evidence',
  'NBA Front Office complete free agent market signs a player beyond thirty through the real model with rotation and arrival metadata then reloads the full save',
  'NBA Front Office complete free agent market preserves original head signing automatic saves and cap full roster and same season waiver refusals',
];
assert.deepEqual([...spec.rawFiles].sort(), files);
assert.deepEqual(spec.cases.map(row => ({ name: row.fullName, status: row.baseline })),
  names.map((name, i) => ({ name, status: i < 2 ? 'failed' : 'passed' })), 'Frozen manifest case census');
const markers = ['NBA_FO_MARKET_COMPLETE_POOL', 'NBA_FO_MARKET_TAIL_SIGN'];
const ids = Array.from({ length: 33 }, (_, i) => 'nba-market-access-fa-' + (i + 1));
const noRuntime = text => assert(!/\b(?:Unhandled\s+(?:Errors?|Rejection|Exception)|Vitest caught|uncaughtException|unhandledRejection)\b/i.test(text));
const arms = []; let fixedTypes;
function run(name, body, cut) {
  assert(fs.readFileSync(BOARD).equals(body)); sourceHeld(body);
  const dir = path.join(out, name), receipt = path.join(dir, 'transport.log'), rawDir = path.join(dir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true }); fs.writeFileSync(receipt, '');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt, NBA_FO_MARKET_ACCESS_RAW: rawDir };
  let typeEvidence;
  if (name === 'fixed') {
    const typeArgs = ['--noEmit', '-p', 'tsconfig.app.json'];
    const types = spawnSync(path.join(ROOT, 'node_modules/.bin/tsc'), typeArgs,
      { env, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(dir, 'types.log'), (types.stdout ?? '') + '\n' + (types.stderr ?? ''));
    typeEvidence = { command: ['node_modules/.bin/tsc', ...typeArgs], exit: types.status, signal: types.signal, error: types.error ? String(types.error) : null };
    fs.writeFileSync(path.join(dir, 'types-exit.json'), JSON.stringify(typeEvidence) + '\n');
    assert(!types.error && types.signal === null); assert.equal(types.status, 0, 'Actual temporary fixed app passes proper application types before Vitest');
    fixedTypes = typeEvidence;
  } else {
    assert(fixedTypes?.exit === 0);
    typeEvidence = { reused: name === 'restored' ? 'byte-identical fixed arm proper TSC0' : 'same original app/test bodies as the measured original and workflow preflight TSC0',
      executedInThisArm: false };
    fs.writeFileSync(path.join(dir, 'types-reuse.json'), JSON.stringify(typeEvidence) + '\n');
  }
  assert.equal(fs.statSync(receipt).size, 0); sourceHeld(body);
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'units.json')],
    { env, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  const log = (child.stdout ?? '') + '\n' + (child.stderr ?? '');
  fs.writeFileSync(path.join(dir, 'units.log'), log);
  fs.writeFileSync(path.join(dir, 'native-exit.json'), JSON.stringify({ exit: child.status, signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert(!child.error && child.signal === null); assert.equal(child.status, cut ? 1 : 0); noRuntime(log);
  assert.equal(fs.statSync(receipt).size, 0, name + ' silent type/test transport');
  const result = JSON.parse(fs.readFileSync(path.join(dir, 'units.json'))), rows = result.testResults.flatMap(file => file.assertionResults);
  assert.equal(result.success, !cut, name + ' overall Vitest success matches this arm');
  assert.equal(result.testResults.length, 1); assert.equal(result.numTotalTests, 3);
  assert.equal(result.numFailedTests, cut ? 2 : 0); assert.equal(result.numPassedTests, cut ? 1 : 3);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests ?? 0, 0);
  for (const key of ['numRuntimeErrors', 'numRuntimeErrorTestSuites']) if (Object.hasOwn(result, key)) assert.equal(result[key], 0);
  if (Array.isArray(result.unhandledErrors)) assert.equal(result.unhandledErrors.length, 0);
  assert.deepEqual(rows.map(row => row.fullName).sort(), [...names].sort());
  for (let i = 0; i < names.length; i++) {
    const row = rows.find(value => value.fullName === names[i]), failed = cut && i < 2;
    assert.equal(row.status, failed ? 'failed' : 'passed');
    if (failed) {
      const message = row.failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
      assert(/^\s*AssertionError(?::|\s*\[)/.test(message) && message.includes(markers[i]));
      assert(!/\b(?:TypeError|SyntaxError|ReferenceError|uncaughtException|unhandledRejection)\b/.test(message));
    } else assert.deepEqual(row.failureMessages, []);
  }
  assert.deepEqual(fs.readdirSync(rawDir).sort(), files);
  const bytes = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(rawDir, file))]));
  const raw = Object.fromEntries(files.map(file => [file, JSON.parse(bytes[file])]));
  const tape = raw['complete-pool.json'].moduleDraws;
  assert(Array.isArray(tape) && tape.length >= 2 && tape.every(value => Number.isFinite(value) && value >= 0 && value < 1));
  for (const file of files) { assert.equal(raw[file].case, file.slice(0, -5)); assert.deepEqual(raw[file].moduleDraws, tape); }
  const pool = raw['complete-pool.json'].observations.rows, tail = raw['tail-sign.json'].observations.rows;
  assert.deepEqual(pool.map(row => row.basis), ['box-score-proxy', 'prior-only', 'unmeasured-prior']);
  for (const row of pool) {
    assert.equal(row.initial.league.freeAgents.length, 33);
    assert.deepEqual(row.ids, cut ? ids.slice(0, 20) : ids);
    assert.deepEqual(row.evidenceIds, cut ? [] : [ids[32]]); assert.deepEqual(row.markerIds, cut ? [] : [ids[32]]);
    assert.equal(row.afterBytes, row.initialBytes); assert.deepEqual(row.writes, []); assert.deepEqual(row.draws, []);
    assert.equal(row.inputHeld, true); assert.equal(row.unrelated, 'held');
  }
  assert.equal(tail.length, 2); assert.deepEqual(tail.map(row => row.desk), [false, true]);
  for (const row of tail) {
    assert.equal(row.reference.accepted, true); assert.deepEqual(row.reference.draws, []);
    assert.equal(row.reference.bytes, JSON.stringify(row.reference.frame));
    assert.equal(row.reference.frame.league.teams.DEN.players.length, 15); assert.equal(row.reference.frame.league.freeAgents.length, 32);
    assert.equal(row.actual.rowPresent, !cut); assert.equal(row.actual.buttonEnabled, !cut);
    assert.deepEqual(row.actual.frame, cut ? row.initial : row.reference.frame);
    assert.equal(row.actual.bytes, cut ? row.initialBytes : row.reference.bytes);
    assert.deepEqual(row.actual.writes, cut ? [] : [row.actual.bytes]); assert.deepEqual(row.actual.draws, []);
    assert.deepEqual(row.opening, { bytes: row.initialBytes, writes: [], draws: [] });
    assert.deepEqual(row.reloaded, { bytes: row.actual.bytes, frame: row.actual.frame, writes: [], draws: [] });
    assert.equal(row.inputHeld, true); assert.equal(row.unrelated, 'held');
  }
  const held = raw['legacy-guards.json'].observations; assert.equal(held.head.length, 2); assert.equal(held.refusals.length, 3);
  sourceHeld(body); assert(fs.readFileSync(TEST).equals(test));
  const summary = { name, boardBlob: blob(body), typeEvidence, nativeExit: child.status, passed: cut ? 1 : 3, ownedFailures: cut ? 2 : 0,
    raw: files.map(file => ({ file, bytes: bytes[file].length, sha256: sha(bytes[file]) })) };
  fs.writeFileSync(path.join(dir, 'admission.json'), JSON.stringify(summary, null, 2) + '\n');
  const arm = { name, bytes, raw, summary }; arms.push(arm); return arm;
}
let failure = null;
try {
  fs.writeFileSync(BOARD, fixed); run('fixed', fixed, false);
  fs.writeFileSync(BOARD, original); run('whole-original', original, true);
  fs.writeFileSync(BOARD, fixed); sourceHeld(fixed);
  assert(!rowFault.equals(fixed)); fs.writeFileSync(BOARD, rowFault); run('row-fault', rowFault, true);
  fs.writeFileSync(BOARD, fixed); run('restored', fixed, false);
  const fixedArm = arms[0], old = arms[1], fault = arms[2], restored = arms[3];
  const compare = (name, bytes) => {
    assert(bytes['legacy-guards.json'].equals(fixedArm.bytes['legacy-guards.json']), name + ' entire held legacy RAW byte parity');
    for (const file of files) assert.deepEqual(JSON.parse(bytes[file]).moduleDraws, fixedArm.raw[file].moduleDraws, name + ' complete import tape ' + file);
    const children = JSON.parse(bytes['tail-sign.json']).observations.rows;
    assert.equal(children.length, 2); assert.deepEqual(children.map(row => row.desk), [false, true]);
    for (let i = 0; i < 2; i++) {
      const actual = children[i].reference, expected = fixedArm.raw['tail-sign.json'].observations.rows[i].reference;
      assert.deepEqual(actual, expected, name + ' complete tail reference child ' + i);
      assert.equal(JSON.stringify(actual), JSON.stringify(expected), name + ' exact full reference serialization ' + i);
    }
  };
  for (const arm of arms) compare(arm.name, arm.bytes);
  for (const file of files) {
    assert(restored.bytes[file].equals(fixedArm.bytes[file]), file + ' complete fixed/restored RAW byte equality');
    assert(fault.bytes[file].equals(old.bytes[file]), file + ' same physical fault body has the same complete outcomes');
    const recorded = recordedRaw.find(row => row.file === file);
    assert.equal(old.bytes[file].length, recorded.bytes); assert.equal(sha(old.bytes[file]), recorded.sha256, file + ' exact measured original complete RAW');
  }
  assert.notDeepEqual(fixedArm.raw['complete-pool.json'].observations.rows.map(row => row.ids), fault.raw['complete-pool.json'].observations.rows.map(row => row.ids),
    'The one reinstated source cap changed actual rendered choices');
} catch (error) { failure = error; }
finally {
  fs.writeFileSync(BOARD, saved);
  try {
    assert(fs.readFileSync(BOARD).equals(saved)); assert(fs.readFileSync(TEST).equals(test));
    assert.deepEqual(inventory(), before); git('diff', '--exit-code', 'HEAD');
    assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
    assert(fs.readFileSync(casesFile).equals(specBytes));
    assert.equal(fs.statSync(parentReceipt).size, 0, 'Silent caller receipt after source arms');
  } catch (error) { failure ??= error; }
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(inventory(), null, 2) + '\n');
  const admission = { status: failure ? 'failed' : 'selected-outcomes-qualified', verifiedBase: cfg.verifiedBase,
    qaParent: cfg.qaParent, qaParentTree: cfg.qaParentTree, measuredFixedBoardBlob: blob(fixed), finalOriginalBoardBlob: blob(saved), testBlob: TEST_BLOB,
    measuredOriginal: { run: cfg.originalRun, head: cfg.originalHead, tree: cfg.originalTree, fullRawPins: recordedRaw },
    arms: arms.map(arm => arm.summary), distinctProductFaults: 1, originalEqualsRowFault: true,
    sourceHeld: !failure, error: failure ? String(failure.stack || failure) : null,
    scope: 'Three selected outcome cases only. Actual temporary fixed app proper TSC0 before fixed Vitest; identical fixed and measured-original bodies reuse their recorded type proof. Whole original and row-cap replay are the SAME one product fault, not independent controls. Complete measured-original RAW, held legacy RAW, both full tail reference children and import/action tapes are retained and exactly compared. The fixed app exists only temporarily in this isolated CI run; all original source bytes are restored before exit. No permanent app commit, build, cap, browser, public, full-fleet or release claim.' };
  fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(admission, null, 2) + '\n');
}
if (failure) throw failure;
console.log('nbaFoMarketOutcomes: selected three-case fixed/original/same-row-fault/restored admission passed with exact complete RAW and unchanged source. One distinct product fault only.');
