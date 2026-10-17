/* Fixed/original/restored proof for the retired Manager Continue label. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Children retain the offline preload');
assert(process.env.RETIRED_MANAGER_CONTINUE_OUT && path.isAbsolute(process.env.RETIRED_MANAGER_CONTINUE_OUT), 'Absolute evidence folder required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'd8aaa4cb654e1b59f783625e63b73ce85adf2681';
const BASELINE = '64b5a6cee99fd388f87c4269c3deea450acd99b6';
const BASELINE_RAW_SHA = 'f67f053db08221b4ec357a7ee63e16d34cf5458bfdd27d4d2d8a39e6689aa606';
const TEST = 'src/test/retiredManagerContinue.test.tsx';
const SELF = 'scripts/qa/proveRetiredSaveSize.mjs';
const BASELINE_HELPER = 'scripts/qa/proveRetiredManagerContinueBaseline.mjs';
const READER = 'src/data/continueSaves.ts', HOME = 'src/data/homeFront.ts', HARNESS = 'scripts/simHomeFront.mjs';
const TEST_SHA = 'e3e005eacd784b3601575109f0e4ffff9b1dd8bec56faf57490966142047b2bf';
const CAUSE = 'The actual retirement object must replace the legacy season or sacked label';
const TITLES = {
  targetMidSeason: 'target: an actual mid-season retirement says retired in metadata and the mounted Continue row',
  targetOutOfWork: 'target: an actual out-of-work retirement takes precedence over sacked in metadata and the mounted Continue row',
  preserveLegacy: 'preserve: legacy active and sacked Club Manager saves keep their existing labels',
  preserveInvalid: 'preserve: invalid Club Manager retirement markers keep the legacy fallback',
  preserveOtherGames: 'preserve: all other 20 games ignore an object retirement marker and keep strict boolean endings',
  preserveCorruptOwn: 'preserve: corrupt saves and inherited fields stay unusable without changing storage',
};
const KEYS = Object.keys(TITLES), TARGETS = KEYS.slice(0, 2);
const CONTROLS = ['continuekey', 'continuefield', 'continueguard', 'continuecold', 'cmretired'];
const SETUP = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const OUT = path.join(process.env.RETIRED_MANAGER_CONTINUE_OUT, 'fixed-proof');
assert(!fs.existsSync(OUT), 'Never overwrite evidence'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Actual Git read: ' + args.join(' ')); return child.stdout;
}
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(); write('tracked.before.json', before);
const report = { head: git(['rev-parse', 'HEAD']).trim(), base: BASE, baseline: BASELINE, baselineRawSha256: BASELINE_RAW_SHA,
  status: 'running', arms: [], homeFront: [], sourceHeld: false, qualified: false,
  limits: ['Actual startCareer/retireCareer fixtures and mounted ContinueRow, not natural season play.',
    'No fresh browser, retirement destination, physical Apple device, complete RNG trace or live-site qualification.',
    'JSON receipts retain saved bytes but cannot represent undefined keys or reference identity.'] };
const checkpoint = () => write('report.json', report);
const receipt = file => { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
function run(name, args, extra, timeout) {
  const transport = path.join(OUT, name + '.transport');
  const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1',
    ...extra, SIM_OFFLINE_RECEIPT: transport }, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(OUT, name + '.stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(OUT, name + '.stderr.log'), child.stderr || '');
  const row = { name, exit: child.status, signal: child.signal, error: child.error?.message || null,
    stdout: receipt(path.join(OUT, name + '.stdout.log')), stderr: receipt(path.join(OUT, name + '.stderr.log')), qualified: false };
  (name.startsWith('units-') ? report.arms : report.homeFront).push(row); checkpoint();
  process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
  assert(!child.error && !child.signal && child.status !== null, 'Actual child completes: ' + name);
  const output = (child.stdout || '') + (child.stderr || '');
  assert(!SETUP.test(output), 'Setup and transport failures cannot qualify: ' + name);
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No external transport attempt: ' + name);
  return { row, output, stdout: child.stdout || '' };
}
function units(arm, original = false) {
  const unitPath = path.join(OUT, arm + '.unit.json'), rawPath = path.join(OUT, arm + '.raw.json');
  const child = run('units-' + arm, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitPath], { HOME_FRONT_CONTROL: '', RETIRED_MANAGER_CONTINUE_RAW: rawPath }, 300000);
  assert(fs.existsSync(unitPath) && fs.existsSync(rawPath), 'Actual completed unit and raw files');
  child.row.units = receipt(unitPath); child.row.raw = receipt(rawPath); checkpoint();
  const unit = JSON.parse(fs.readFileSync(unitPath)), raw = JSON.parse(fs.readFileSync(rawPath));
  assert.equal(child.row.exit, original ? 1 : 0); assert.equal(unit.success, !original);
  assert.equal(unit.numTotalTests, 6); assert.equal(unit.numFailedTests, original ? 2 : 0); assert.equal(unit.numPassedTests, original ? 4 : 6);
  assert.equal(unit.numPendingTests, 0); assert.equal(unit.numTodoTests, 0); assert.equal(unit.testResults.length, 1);
  const file = unit.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message);
  assert.equal(file.status, original ? 'failed' : 'passed'); assert.equal(file.assertionResults.length, 6);
  assert.deepEqual(file.assertionResults.map(test => test.title).sort(), Object.values(TITLES).sort());
  for (const test of file.assertionResults) {
    const key = KEYS.find(key => TITLES[key] === test.title), fails = original && TARGETS.includes(key);
    assert.equal(test.status, fails ? 'failed' : 'passed');
    if (!fails) assert.deepEqual(test.failureMessages, []);
    else {
      assert.equal(test.failureMessages.length, 1); const message = test.failureMessages[0];
      const legacy = key === 'targetMidSeason' ? 'Everton, season 1' : 'Everton, sacked';
      assert(message.startsWith('AssertionError: ' + CAUSE));
      assert(message.includes("expected '" + legacy + "' to be 'Everton, retired'") && message.includes('Object.is equality'));
    }
  }
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseKeys, KEYS); assert.deepEqual(raw.caseTitles, TITLES);
  assert.deepEqual(Object.keys(raw.cases).sort(), [...KEYS].sort()); for (const key of KEYS) assert(raw.cases[key] !== null);
  if (original) assert.equal(child.row.raw.sha256, BASELINE_RAW_SHA, 'Complete original raw equals the physically retained qualified baseline');
  child.row.completed = 6; child.row.passed = original ? 4 : 6; child.row.failed = original ? 2 : 0; child.row.qualified = true; checkpoint();
  return { raw, bytes: fs.readFileSync(rawPath) };
}
const originalReader = Buffer.from(git(['show', BASE + ':' + READER])), originalHome = Buffer.from(git(['show', BASE + ':' + HOME]));
const fixedReader = read(READER), fixedHome = read(HOME);
const oldBranch = '  if (entry.ended && walk(save, entry.ended.at) === true) {';
const newBranch = "  const retired = entry.path === '/club-manager' && walk(save, ['retired']);\n  if (retired && typeof retired === 'object' && !Array.isArray(retired)) {\n    parts.push('retired');\n  } else if (entry.ended && walk(save, entry.ended.at) === true) {";
function one(source, from, to) { assert.equal(source.split(from).length, 2, 'Unique effective source span'); const next = source.replace(from, to); assert.notEqual(next, source); return next; }
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Committed clean source');
  git(['merge-base', '--is-ancestor', BASELINE, report.head]);
  const exceptions = [READER, HOME, HARNESS, TEST, BASELINE_HELPER, SELF, 'scripts/qa/playAccountDialogFocusReturn.mjs'].map(file => ':!' + file);
  git(['diff', '--exit-code', '074cfac4b3bbb2622b5daddce66907fdd8e855f5', 'HEAD', '--', 'src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ...exceptions]);
  assert.equal(sha(read(TEST)), TEST_SHA); assert.deepEqual(read(TEST), Buffer.from(git(['show', BASELINE + ':' + TEST])));
  assert.deepEqual(read(BASELINE_HELPER), Buffer.from(git(['show', BASELINE + ':' + BASELINE_HELPER])));
  assert.deepEqual(read(SELF), Buffer.from(git(['show', report.head + ':' + SELF])));
  assert.deepEqual(fixedReader, Buffer.from(one(originalReader.toString(), oldBranch, newBranch)), 'Only the explicit CM retirement branch changes');
  assert.deepEqual(fixedHome, Buffer.from(one(originalHome.toString(), "continueCta: 'Back to the dugout'", "continueCta: 'Open your career'")), 'Only the CM saved CTA changes');
  report.product = [READER, HOME].map(file => ({ file, bytes: read(file).length, sha256: sha(read(file)) })); checkpoint();
  const normal = units('normal');
  assert.equal(sha(normal.bytes), 'bfcb59589666188d5a616ba8b57cd028137f2813def36caf653a44ee211e4a75', 'Complete normal raw equals the physically retained 1396 normal raw');
  let original;
  try { fs.writeFileSync(path.join(ROOT, READER), originalReader); fs.writeFileSync(path.join(ROOT, HOME), originalHome); original = units('original', true); }
  finally { fs.writeFileSync(path.join(ROOT, READER), fixedReader); fs.writeFileSync(path.join(ROOT, HOME), fixedHome); }
  const restored = units('restored'); assert.deepEqual(restored.bytes, normal.bytes, 'Complete restored raw bytes equal normal');
  for (const key of KEYS.slice(2)) assert.deepEqual(normal.raw.cases[key], original.raw.cases[key], 'Entire preservation case held: ' + key);
  for (const key of TARGETS) {
    const expected = structuredClone(original.raw.cases[key]), oldLine = expected.metadata.line, newLine = expected.expected.line;
    assert.equal(expected.stageDescriptor.continueCta, 'Back to the dugout'); expected.stageDescriptor.continueCta = 'Open your career';
    assert.notEqual(oldLine, newLine); expected.metadata.line = newLine;
    const replaceLine = value => { assert(value.includes(oldLine)); return value.replaceAll(oldLine, newLine); };
    for (const card of expected.cards) { assert.equal(card.line, oldLine); card.line = newLine; card.text = replaceLine(card.text); card.html = replaceLine(card.html); }
    expected.dom.document = replaceLine(expected.dom.document); expected.dom.container = replaceLine(expected.dom.container);
    assert.deepEqual(normal.raw.cases[key], expected, 'Complete target differs only in the label/DOM and declared CTA: ' + key);
  }
  report.completeRawRestored = true; report.preservedCases = 4; report.exactTargetDeltas = 2; checkpoint();
  for (const control of ['', ...CONTROLS]) {
    const child = run('home-front-' + (control || 'normal'), ['scripts/simHomeFront.mjs'], { HOME_FRONT_CONTROL: control, RETIRED_MANAGER_CONTINUE_RAW: '' }, 600000);
    assert.equal(child.row.exit, 0); const faults = [...child.output.matchAll(/^\s*FAIL \[(\d+)\]: (.+)$/gm)].map(match => ({ section: Number(match[1]), message: match[2] }));
    if (!control) {
      assert.equal(faults.length, 0); assert.deepEqual([...child.stdout.matchAll(/^([1-8])\) /gm)].map(match => Number(match[1])), [1, 2, 3, 4, 5, 6, 7, 8]);
      assert(child.stdout.trimEnd().endsWith('simHomeFront: green. The home front shows real games, real saves and a sport you can tell apart without colour.'));
    } else {
      assert.equal(child.stdout.split('NEGATIVE CONTROL ' + control + ' ON:').length, 2);
      assert(faults.length > 0 && faults.every(fault => fault.section === 7));
      if (control === 'cmretired') assert.equal(faults.length, 2, 'Both new object retirement samples detect the removed lookup');
      assert(child.stdout.trimEnd().endsWith('simHomeFront control ' + control + ': green. Section 7 went red and nothing else did.'));
    }
    child.row.control = control || null; child.row.faults = faults; child.row.qualified = true; checkpoint();
  }
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
finally {
  fs.writeFileSync(path.join(ROOT, READER), fixedReader); fs.writeFileSync(path.join(ROOT, HOME), fixedHome);
  const after = tracked(); write('tracked.after.json', after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Complete tracked source restored');
}
assert(report.arms.length === 3 && report.arms.every(row => row.qualified) && report.homeFront.length === 6 && report.homeFront.every(row => row.qualified) && report.sourceHeld);
report.status = 'complete'; report.qualified = true; checkpoint(); write('summary.json', report);
console.log('Retired Manager Continue:6 fixed,2 exact original faults and4 preserves,6 restored;complete baseline and restored raw held;home front normal and5 effective controls.');
