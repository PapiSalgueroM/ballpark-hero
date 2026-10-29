'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = fs.realpathSync(process.cwd());
assert.equal(root, fs.realpathSync(process.env.QUALIFICATION_ROOT), 'Use the actual qualification copy as cwd');
assert.ok(process.env.PLACEMENT_OUT, 'PLACEMENT_OUT is required');
assert.ok(process.env.SIM_OFFLINE_RECEIPT, 'The inherited offline guard receipt is required');
const out = path.resolve(process.env.PLACEMENT_OUT, 'gates/seo-old-description-control');
assert.ok(!fs.existsSync(out), 'Preserve every previous control output');
fs.mkdirSync(out, { recursive: true });
const sha = body => crypto.createHash('sha256').update(body).digest('hex');
const writeJSON = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const occurrences = (text, needle) => text.split(needle).length - 1;
const route = '/aussie-rules-manager';
const current = 'Run an AFL club through 23 rounds, the finals and the draft. Pick your 23, call the quarters, chase a flag. Free footy manager.';
const stale = 'Run a fictional Aussie rules club through 23 rounds, the finals and the draft. Pick your 23, call the quarters, chase a flag. Free footy manager.';
assert.equal(current.length, 127);
assert.equal(stale.length, 145);
const classifier = path.join(root, 'scripts/simSeoMetaSplit.mjs');
assert.equal(sha(fs.readFileSync(classifier)), 'dacea44bab7a0cfef90e6364ffce724a6942142f718aca93f068f43a5969d792');
const assets = path.join(root, 'dist/assets');
const candidates = fs.readdirSync(assets, { withFileTypes: true }).filter(entry => entry.isFile() && /^seoMetaPart00-[^.]+\.js$/.test(entry.name));
assert.equal(candidates.length, 1, 'Exactly one actual built part 00 is required');
const targets = [
  { level: 'committed', file: path.join(root, 'src/data/seoMetaParts/seoMetaPart00.ts') },
  { level: 'built', file: path.join(assets, candidates[0].name) },
].map(target => {
  assert.equal(fs.realpathSync(target.file), target.file, 'Control only regular physical files in this copy');
  assert.ok(fs.lstatSync(target.file).isFile());
  const before = fs.readFileSync(target.file);
  const text = before.toString('utf8');
  assert.deepEqual(Buffer.from(text), before, 'The exact UTF-8 body must round trip');
  assert.equal(occurrences(text, route), 1);
  assert.equal(occurrences(text, current), 1, 'Current Manager description must occur once');
  assert.equal(occurrences(text, stale), 0, 'No old Manager description may already be present');
  if (target.level === 'committed') assert.equal(sha(before), 'da371f4a803b91a23f2a893ce099d0e4c8457d11173b8c0711d945725d8a14a2');
  const changed = Buffer.from(text.replace(current, stale));
  assert.notDeepEqual(changed, before, 'The physical mutation must change bytes');
  assert.notEqual(sha(changed), sha(before));
  fs.writeFileSync(path.join(out, `${target.level}.before.bin`), before);
  return { ...target, before, changed, beforeSHA256: sha(before), changedSHA256: sha(changed) };
});
const runs = [];
function runClassifier(label, expectedRaw, disagrees) {
  const args = ['scripts/simSeoMetaSplit.mjs'];
  const child = spawnSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, SEO_SPLIT_BASE_REF: 'HEAD', SEO_SPLIT_STATIC: '1', SEO_SPLIT_CONTROL: '' },
  });
  const stdout = child.stdout || '';
  const stderr = child.stderr || '';
  const record = { label, executable: process.execPath, args, cwd: root, baseRef: 'HEAD', static: '1', control: '', rawExit: child.status, signal: child.signal, error: child.error ? { name: child.error.name, code: child.error.code, message: child.error.message } : null };
  fs.writeFileSync(path.join(out, `${label}.stdout.txt`), stdout);
  fs.writeFileSync(path.join(out, `${label}.stderr.txt`), stderr);
  fs.writeFileSync(path.join(out, `${label}.exit.txt`), String(child.status) + '\n');
  writeJSON(`${label}.process.json`, record);
  runs.push(record);
  assert.equal(child.error, undefined, 'No infrastructure error earns control credit');
  assert.equal(child.signal, null);
  assert.equal(child.status, expectedRaw);
  const summary = stdout.split(/\r?\n/).filter(line => /^   (?:RED|ok ) \d+ routes in HEAD's table;/.test(line));
  assert.equal(summary.length, 1);
  const match = summary[0].match(/^   (RED|ok ) (\d+) routes in HEAD's table; routes the split serves: committed (\d+), built (\d+); (\d+) route\(s\) disagree$/);
  assert.ok(match, 'Retain the actual complete section 4 accounting');
  assert.ok(Number(match[2]) >= 100);
  assert.equal(match[2], match[3]);
  assert.equal(match[2], match[4]);
  assert.equal(Number(match[5]), disagrees);
  assert.equal(match[1], disagrees ? 'RED' : 'ok ');
  assert.ok(!/FAIL:/.test(stdout), 'Failures belong to the actual classifier stderr');
  if (disagrees) {
    const expected = targets.map(target => `  FAIL: ${route}: ${target.level} description: the split serves ${JSON.stringify(stale)}, HEAD says ${JSON.stringify(current)}`);
    assert.deepEqual(stderr.trimEnd().split(/\r?\n/), expected, 'Only two exact Manager-description findings may fire');
  } else assert.equal(stderr.trim(), '', 'Healthy HEAD static baseline must have no errors or findings');
  const receipt = fs.existsSync(process.env.SIM_OFFLINE_RECEIPT) ? fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8') : '';
  assert.equal(receipt.trim(), '', 'All three actual classifier calls remain offline');
  return { ...record, summary: summary[0], stdoutSHA256: sha(Buffer.from(stdout)), stderrSHA256: sha(Buffer.from(stderr)) };
}

let failure = null;
let beforeRun = null;
let refusedRun = null;
let restoredRun = null;
try {
  beforeRun = runClassifier('healthy-before', 0, 0);
  for (const target of targets) {
    fs.writeFileSync(target.file, target.changed);
    assert.deepEqual(fs.readFileSync(target.file), target.changed);
    fs.writeFileSync(path.join(out, `${target.level}.changed.bin`), fs.readFileSync(target.file));
  }
  refusedRun = runClassifier('changed', 1, 1);
} catch (error) {
  failure = error;
} finally {
  try {
    for (const target of targets) {
      fs.writeFileSync(target.file, target.before);
      const restored = fs.readFileSync(target.file);
      assert.deepEqual(restored, target.before, 'Restore the same two physical files');
      assert.equal(sha(restored), target.beforeSHA256);
      fs.writeFileSync(path.join(out, `${target.level}.restored.bin`), restored);
    }
    restoredRun = runClassifier('healthy-restored', 0, 0);
  } catch (restoreError) {
    failure = failure ? new AggregateError([failure, restoreError], 'Control or same-copy healthy restoration failed') : restoreError;
  }
  writeJSON('control.json', {
    schema: 1, marker: !failure && beforeRun && refusedRun && restoredRun ? 'AFL1572_SEO_OLD_DESCRIPTION_CONTROL' : null, qualified: !failure && Boolean(beforeRun && refusedRun && restoredRun),
    route, newDescription: current, oldDescription: stale, sourceUnsplitTableChanged: false,
    targets: targets.map(({ level, file, before, changed, beforeSHA256, changedSHA256 }) => ({ level, file, beforeBytes: before.length, changedBytes: changed.length, beforeSHA256, changedSHA256, restoredSHA256: sha(fs.readFileSync(file)) })),
    beforeRun, refusedRun, restoredRun, runs, failure: failure ? String(failure.stack || failure) : null,
  });
}
if (failure) throw failure;
assert.ok(beforeRun && refusedRun && restoredRun);
console.log('AFL1572_SEO_OLD_DESCRIPTION_CONTROL: actual committed and built Manager descriptions refused alone; same physical files restored and healthy HEAD static raw0.');
