import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { inventory } from './cmReplacementFixtures.mjs';

const arg = name => { const at = process.argv.indexOf(name); assert(at >= 0, name); return process.argv[at + 1]; };
const root = process.cwd(), out = path.resolve(arg('--out')), fixtures = path.resolve(arg('--fixtures')),
  dist = path.resolve(arg('--dist')), base = arg('--base-url');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const replay = path.join(root, 'scripts/qa/cmReplacementCompletionReplay.mjs');
assert.equal(sha(await fs.readFile(replay)), '2a4ea210bd45a6565f5bce2eefb1827ccaea490ae4f453ffd2892a7d18af0043');
assert.equal(sha(await fs.readFile(path.join(root, 'scripts/qa/cmReplacementBrowser.mjs'))),
  '8172c0d59451a1e4ab82122b08a717830de96b4054b87b4ca87d20db8313471d');
const inputPins = {
  'manifest.json': '247823bf993a076b48144cb5ad4d9d8318a565219508990f4681cef834a13347',
  'completion.json': 'c367a045835eeb9de5e1786cb23825dd2f407875fdd75749b4472c90ed2af502',
  'choice.json': 'cf6be3a40132593bb50f6db2b36a4ec328905efc4a010e96f416c6047aa799de',
  'cm-replacement-engine.mjs': 'ba6f9777695abe939eb19208da420622f4fd6f687622a6623f5a1459511820ba',
};
const checkInputs = async () => { for (const [file, digest] of Object.entries(inputPins)) assert.equal(sha(await fs.readFile(path.join(fixtures, file))), digest, file); };
await checkInputs();
const m = JSON.parse(await fs.readFile(path.join(fixtures, 'manifest.json')));
assert.equal(m.schema, 1); assert.equal(Object.keys(m.sourceAfter).length, 5728); assert.deepEqual(m.sourceBefore, m.sourceAfter);
assert.equal(m.distDigest, '5af9e884c543f1c956669f85959762d2deebf1e40a8c0f5af5ec81107f50f048');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
const source = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
const sourceBefore = await source(), distBefore = await inventory(dist);
for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sourceBefore[file], digest, 'Original source held: ' + file);
assert.deepEqual(distBefore, m.distBefore); assert.equal(sha(JSON.stringify(distBefore)), m.distDigest);
await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
const report = { status: 'incomplete', isolatedReplay: true, normalMatrixCredit: false,
  referenceRepairGit: 'caee4d279bdf4c7abd9cef60e72828cdadc2affb', inputPins,
  originalSourcePaths: 5728, completeCurrentSourcePaths: tracked.length, distDigest: m.distDigest,
  scope: 'One exact original desktop input, native repaired Home navigation and all original outcome/save/scroll assertions. No observers, RNG override or full matrix credit. Native paid world/headlines may vary between runs.' };
let failure;
try {
  const childOut = path.join(out, 'browser'), args = [replay, '--out', childOut,
    '--fixtures', fixtures, '--dist', dist, '--base-url', base];
  const child = spawnSync(process.execPath, args, { cwd: root, env: process.env, encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  await fs.writeFile(path.join(out, 'native.stdout.log'), child.stdout ?? '');
  await fs.writeFile(path.join(out, 'native.stderr.log'), child.stderr ?? '');
  await fs.writeFile(path.join(out, 'native-exit.txt'), String(child.status) + '\n');
  report.child = { command: [process.execPath, ...args], exit: child.status, signal: child.signal,
    error: child.error ? String(child.error.stack || child.error) : null };
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.status, 0);
  const bytes = await fs.readFile(path.join(childOut, 'report.json')), native = JSON.parse(bytes);
  assert.equal(native.isolatedReplay, true); assert.equal(native.normalMatrixCredit, false);
  assert.equal(native.referenceRepairGit, report.referenceRepairGit); assert.equal(native.status, 'passed');
  assert.equal(native.contexts.length, 1); assert.equal(native.screenshots.length, 1);
  for (const key of ['sourceHeld', 'distHeld', 'fixtureManifestHeld', 'engineBundleHeld']) assert.equal(native[key], true, key);
  const c = native.contexts[0]; assert.equal(c.width, 1280); assert.equal(c.kind, 'completion'); assert.equal(c.status, 'passed');
  for (const key of ['pageErrors', 'unexpectedConsole', 'undeclaredAborts', 'httpErrors', 'assetErrors', 'unexpectedFailures']) assert.deepEqual(c[key], [], key);
  assert(c.assetBodies.length > 0); assert.equal(typeof c.finalMainSaveRaw, 'string');
  const final = JSON.parse(c.finalMainSaveRaw), observed = c.observed, x = m.fixtures.completion.expected;
  assert.equal(observed.status, 'passed'); assert.equal(observed.kind, 'completion');
  assert.equal(final.week, x.week + 1); assert.equal(final.season, x.season);
  assert.deepEqual(final.squad, observed.paidPlayers); assert.deepEqual(final.xiIds, x.xiIds); assert.deepEqual(final.training, x.basePlan);
  const target = final.squad.find(p => p.id === x.target.id); assert(target);
  assert.deepEqual(target.secondaryPositions, ['RW', 'ST']); assert.equal(target.retraining, undefined);
  assert.equal(observed.rwFitPenalty, 0);
  for (const key of ['xiHeld', 'basePlanHeld', 'reloadBytesHeld']) assert.equal(observed[key], true, key);
  assert.equal(sha(c.finalMainSaveRaw), observed.paidSaveSHA256, 'Exact same-run paid bytes survive navigation and reload');
  assert.equal(Buffer.byteLength(c.finalMainSaveRaw), observed.paidSaveBytes);
  report.finalMainSave = { bytes: observed.paidSaveBytes, sha256: observed.paidSaveSHA256,
    sameRunPaidBytesHeld: true, historicalNegativeSHA256: '765156bda0c67e56bff64227ecb2a8eb5eec4b6eecc454c1febfe59a6f72950a',
    crossRunMatches: observed.paidSaveSHA256 === '765156bda0c67e56bff64227ecb2a8eb5eec4b6eecc454c1febfe59a6f72950a',
    crossRunParityCredit: false, rawRetainedAt: 'browser/report.json:contexts[0].finalMainSaveRaw' };
  report.evidence = { file: 'browser/report.json', bytes: bytes.length, sha256: sha(bytes), contexts: 1, photos: 1 };
  report.status = 'isolated-replay-passed';
} catch (error) { failure = error; report.status = 'failed'; report.error = String(error.stack || error); }
finally {
  try {
    assert.deepEqual(await source(), sourceBefore); assert.deepEqual(await inventory(dist), distBefore);
    await checkInputs(); report.sourceHeld = true; report.distHeld = true; report.inputsHeld = true;
  } catch (error) { failure ??= error; report.status = 'failed'; report.holdError = String(error.stack || error); }
  await fs.writeFile(path.join(out, 'admission.json'), JSON.stringify(report, null, 2) + '\n');
}
if (failure) throw failure;
assert.equal(report.status, 'isolated-replay-passed');
console.log('cmReplacementCompletionReplayRunner: original desktop input passed native repaired navigation and all unchanged outcomes/holds. No full matrix or cross-run world parity credit.');
