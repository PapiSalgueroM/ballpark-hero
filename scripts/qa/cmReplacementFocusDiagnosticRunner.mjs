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
const diagnostic = path.join(root, 'scripts/qa/cmReplacementFocusDiagnostic.mjs');
assert.equal(sha(await fs.readFile(diagnostic)), 'b41b1bca3eb00282926e78b00099327316dc465942a8e3b2b8a72ab1d5476bad');
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
assert.equal(m.schema, 1); assert.equal(Object.keys(m.sourceAfter).length, 5728);
assert.deepEqual(m.sourceBefore, m.sourceAfter);
assert.equal(m.distDigest, '5af9e884c543f1c956669f85959762d2deebf1e40a8c0f5af5ec81107f50f048');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
const source = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
const sourceBefore = await source(), distBefore = await inventory(dist);
for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sourceBefore[file], digest, 'Original source held: ' + file);
assert.deepEqual(distBefore, m.distBefore); assert.equal(sha(JSON.stringify(distBefore)), m.distDigest);
await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
const report = { status: 'incomplete', diagnosticOnly: true, normalCredit: false,
  referenceNormalGit: '58ee6ef68977c1bbaabbd18112be2f5f7aabf3df', inputPins,
  originalSourcePaths: 5728, completeCurrentSourcePaths: tracked.length, distDigest: m.distDigest,
  scope: 'One original desktop completion input on the same compiled payload. Passive attrs/focus/native Tab records only; no normal qualification, source repair or root-cause claim.' };
let failure;
try {
  const childOut = path.join(out, 'browser'), args = [diagnostic, '--out', childOut,
    '--fixtures', fixtures, '--dist', dist, '--base-url', base];
  const child = spawnSync(process.execPath, args, { cwd: root, env: process.env, encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  await fs.writeFile(path.join(out, 'native.stdout.log'), child.stdout ?? '');
  await fs.writeFile(path.join(out, 'native.stderr.log'), child.stderr ?? '');
  await fs.writeFile(path.join(out, 'native-exit.txt'), String(child.status) + '\n');
  report.child = { command: [process.execPath, ...args], exit: child.status, signal: child.signal,
    error: child.error ? String(child.error.stack || child.error) : null };
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert([0, 1].includes(child.status));
  const bytes = await fs.readFile(path.join(childOut, 'report.json')), native = JSON.parse(bytes);
  assert.equal(native.diagnosticOnly, true); assert.equal(native.normalCredit, false);
  assert.equal(native.contexts.length, 1);
  for (const key of ['sourceHeld', 'distHeld', 'fixtureManifestHeld', 'engineBundleHeld']) assert.equal(native[key], true, key);
  const context = native.contexts[0]; assert.equal(context.width, 1280); assert.equal(context.kind, 'completion');
  for (const key of ['pageErrors', 'unexpectedConsole', 'undeclaredAborts', 'httpErrors', 'assetErrors', 'unexpectedFailures']) assert.deepEqual(context[key], [], key);
  assert(context.assetBodies.length > 0);
  assert.equal(typeof context.finalMainSaveRaw, 'string'); assert(JSON.parse(context.finalMainSaveRaw).squad.length > 0);
  const checks = context.focusEvidence.filter(row => row.kind === 'focus-check');
  const keys = context.focusEvidence.filter(row => row.kind === 'native-key'); assert(checks.length > 0);
  if (child.status === 1) {
    assert.equal(native.status, 'failed'); assert.equal(context.status, 'failed');
    assert.match(context.error, /^AssertionError \[ERR_ASSERTION\]: CM_REPLACEMENT_DESKTOP_TAB_TARGET\b/);
    const last = checks.at(-1); assert.equal(last.check, 160); assert.equal(last.matches, false);
    assert.equal(last.target.role, 'tab');
    report.observation = 'Original Tab-target failure reproduced. Raw target, selected state, actual tabstop and native sequence require inspection; no repair or cause inferred.';
    report.lastFocus = last;
  } else {
    assert.equal(native.status, 'passed'); assert.equal(context.status, 'passed'); assert.equal(native.screenshots.length, 1);
    report.observation = 'Original failure did not reproduce in this isolated observation. No normal release credit or root-cause claim.';
  }
  report.evidence = { file: 'browser/report.json', bytes: bytes.length, sha256: sha(bytes),
    focusChecks: checks.length, nativeTabBefore: keys.filter(row => row.phase === 'before').length,
    nativeTabAfter: keys.filter(row => row.phase === 'after').length,
    finalMainSaveSHA256: sha(context.finalMainSaveRaw), finalMainSaveBytes: Buffer.byteLength(context.finalMainSaveRaw) };
  report.status = 'diagnostic-captured';
} catch (error) { failure = error; report.status = 'failed'; report.error = String(error.stack || error); }
finally {
  try {
    assert.deepEqual(await source(), sourceBefore); assert.deepEqual(await inventory(dist), distBefore);
    await checkInputs(); report.sourceHeld = true; report.distHeld = true; report.inputsHeld = true;
  } catch (error) { failure ??= error; report.status = 'failed'; report.holdError = String(error.stack || error); }
  await fs.writeFile(path.join(out, 'admission.json'), JSON.stringify(report, null, 2) + '\n');
}
if (failure) throw failure;
assert.equal(report.status, 'diagnostic-captured');
console.log('cmReplacementFocusDiagnosticRunner: one original desktop input observed; original native exit and passive evidence retained. No normal qualification credit.');
