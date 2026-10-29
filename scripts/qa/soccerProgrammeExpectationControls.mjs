/* Remote-only controls for the exact programme expectation test successor. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert(process.env.CI, 'Remote CI only');
const ROOT = process.cwd();
const OUT = path.resolve(process.env.SC_PROGRAMME_CONTROL_OUT || 'programme-control-artifacts');
fs.mkdirSync(OUT, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex');
const put = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2));
const manifestPath = 'qa/soccer-career-loyalty-v2.1/SOURCE-READY.json';
const manifestBody = fs.readFileSync(path.join(ROOT, manifestPath));
assert.equal(hash(manifestBody), '573c56d21177fa3a2b62a5ff74ef7e5f626f8fae3f2d47b577f1506a0f160bee');
const app = JSON.parse(manifestBody).files;
assert.equal(app.length, 11);
const tests = [
  { path: 'src/lib/soccerCareerProgramme.test.ts', sha256: '0aa83c6371c847812662c61551a9e9365f65f6aed174c6333713cff1b9e50cef', cases: 66 },
  { path: 'src/test/soccerCareerProgrammeUi.test.tsx', sha256: '844de8eefb431ab62123f7db1557df4a7019f0d4d2d0d744d0463716a26b5037', cases: 34 },
];
const targets = [
  'reading absent old saves preserves every field and consumes no random draws',
  'reading never accesses hidden awards or changes the saved primary season identity',
  'shows rules and a worked example before any choices and can reopen them',
];
const independent = 'tactics finisher changes expected goals and assists with a recorded choice';
const pattern = '(?:' + [...targets, independent].join('|') + ')$';
const programme = 'src/lib/soccerCareerProgramme.ts';
const controls = [
  { name: 'omit-loyalty', from: '  return views;', to: "  return views.filter(view => view.id !== 'loyalty');", failed: targets },
  { name: 'omit-legacy', from: '  return views;', to: "  return views.filter(view => view.id !== 'tactics');", failed: targets },
  { name: 'reorder', from: '  return views;', to: '  return [...views].reverse();', failed: targets },
  { name: 'wrong-label', from: "id: 'loyalty', title: 'Loyalty contract',", to: "id: 'loyalty', title: 'Loyalty terms',", failed: [targets[2]] },
];
const report = { complete: false, coverage: 'Temporary actual module, corrected actual tests. No application change, full suite, build or browser credit.',
  appPins: app, testPins: tests, controls: [], canonicalRoot: ROOT };
const save = () => put('summary.json', report);
save();
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, maxBuffer: 512 * 1024 * 1024, windowsHide: true });
  assert(!child.error && !child.signal && child.status === 0, 'Actual Git source read finishes: ' + args[0]);
  return child.stdout;
}
const files = git(['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
function bodies(root) {
  return Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
}
function pinned(root) {
  for (const file of [...app, ...tests])
    assert.equal(hash(fs.readFileSync(path.join(root, file.path))), file.sha256, 'Exact held source: ' + file.path);
}
function readRows(jsonFile, logFile) {
  const parsed = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  assert.equal(parsed.testResults.length, 2, 'Both actual files collected');
  for (const suite of parsed.testResults) {
    assert.equal(typeof suite.message, 'string', 'Observed suite diagnostic field exists');
    assert.equal(suite.message.trim(), '', 'Collection/setup/teardown errors are not control credit');
    const found = tests.find(file => suite.name.replaceAll('\\', '/').endsWith('/' + file.path));
    assert(found, 'Only actual selected files collected');
    assert.equal(suite.assertionResults.length, found.cases, 'Exact unchanged per-file denominator');
  }
  const cli = fs.readFileSync(logFile, 'utf8').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled|Unhandled Rejection|Uncaught Exception|Failed Suites\b/i.test(cli)
    && !/^\s*Errors\s+[1-9]\d*\s+errors?\b/im.test(cli), 'Unhandled or failed-suite errors are not control credit');
  const rows = parsed.testResults.flatMap(suite => suite.assertionResults.map(row => ({
    title: row.title, status: row.status, failure: (row.failureMessages || []).join('\n'),
  })));
  assert.equal(rows.length, 100, 'All actual assertion rows retained');
  assert.equal(new Set(rows.map(row => row.title)).size, 100, 'Actual case identities unique');
  return rows;
}
function run(root, name, selected = false, failed = []) {
  const jsonFile = path.join(OUT, name + '.json'), logFile = path.join(OUT, name + '.log');
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...tests.map(file => file.path),
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile.json=' + jsonFile];
  if (selected) args.push('--testNamePattern=' + pattern);
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 120000,
    maxBuffer: 32 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, CI: '1', SIM_NETWORK: 'offline', NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs') } });
  fs.writeFileSync(logFile, (child.stdout || '') + '\n' + (child.stderr || ''));
  put(name + '.exit.json', { status: child.status, signal: child.signal, error: child.error?.message });
  assert(!child.error && !child.signal, name + ': child actually completes');
  assert.equal(child.status, failed.length ? 1 : 0, name + ': exact actual exit');
  const rows = readRows(jsonFile, logFile), active = rows.filter(row => row.status !== 'skipped');
  assert.equal(active.length, selected ? 4 : 100, name + ': exact executed count');
  assert.equal(rows.filter(row => row.status === 'skipped').length, selected ? 96 : 0, name + ': exact unselected count');
  for (const row of active) {
    assert.equal(row.status, failed.includes(row.title) ? 'failed' : 'passed', name + ': exact status: ' + row.title);
    if (row.status === 'failed') {
      assert(failed.includes(row.title), 'Only intended assertion fails');
      assert(!/SyntaxError|ReferenceError|TypeError|Failed to resolve import|Cannot find module|does not provide an export|is not a function/.test(row.failure), 'Method failure is not assertion credit');
      assert(name.includes('wrong-label') ? /toHaveAccessibleName|accessible name/i.test(row.failure) && /Loyalty contract/.test(row.failure)
        : /deeply equal|toEqual/.test(row.failure), 'Actual owned identity or accessible-label assertion catches fault');
    }
  }
  if (selected) for (const title of [...targets, independent]) assert.equal(active.filter(row => row.title === title).length, 1);
  for (const title of failed) assert.equal(active.find(row => row.title === title)?.status, 'failed');
  assert.equal(active.find(row => row.title === independent)?.status, 'passed', 'Independent preservation really executes');
  return { report: path.basename(jsonFile), log: path.basename(logFile), actualRows: rows.length,
    executed: active.length, failed: failed.length, passed: active.length - failed.length, unselected: selected ? 96 : 0,
    rows: active.map(row => ({ title: row.title, status: row.status })) };
}
pinned(ROOT);
const before = bodies(ROOT); put('canonical-before.json', before);
fs.writeFileSync(path.join(OUT, 'source-head.txt'), git(['rev-parse', 'HEAD']));
fs.writeFileSync(path.join(OUT, 'source-tree.txt'), git(['rev-parse', 'HEAD^{tree}']));
fs.writeFileSync(path.join(OUT, 'source.tar'), git(['archive', '--format=tar', 'HEAD']));
const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-programme-expectations-'));
report.temporaryRoot = copy; save();
try {
  const unpack = spawnSync('tar', ['-xf', path.join(OUT, 'source.tar'), '-C', copy], { encoding: 'utf8', windowsHide: true });
  put('extract.exit.json', { status: unpack.status, error: unpack.error?.message, stderr: unpack.stderr });
  assert(!unpack.error && !unpack.signal && unpack.status === 0, 'Fresh HEAD TAR actually extracts');
  assert.deepEqual(bodies(copy), before, 'Every temporary source body initially equals canonical HEAD');
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(copy, 'node_modules'), 'dir');
  pinned(copy); put('temporary-before.json', bodies(copy));
  report.healthy = run(copy, 'healthy'); save();
  console.log('Programme controls healthy: actual 100 passed (66 logic,34 UI), exact source pins held.');
  const file = path.join(copy, programme), original = fs.readFileSync(file), text = original.toString('utf8');
  fs.writeFileSync(path.join(OUT, 'programme-original.ts'), original);
  for (const control of controls) {
    assert.equal(text.split(control.from).length - 1, 1, 'Unique physical fault anchor: ' + control.name);
    const changed = Buffer.from(text.replace(control.from, () => control.to));
    assert.notEqual(hash(changed), hash(original), 'Actual module body changes');
    const folder = path.join(OUT, control.name); fs.mkdirSync(folder);
    fs.writeFileSync(path.join(folder, 'before.ts'), original); fs.writeFileSync(path.join(folder, 'changed.ts'), changed);
    const row = { name: control.name, temporaryFile: file, original: hash(original), changed: hash(changed), from: control.from, to: control.to };
    report.controls.push(row); save(); let cause;
    try {
      fs.writeFileSync(file, changed); assert.equal(hash(fs.readFileSync(file)), row.changed);
      const changedBodies = bodies(copy);
      assert.deepEqual(changedBodies, { ...before, [programme]: row.changed }, 'Only the one physical module body differs');
      put(control.name + '/temporary-changed.json', changedBodies);
      row.actual = run(copy, control.name, true, control.failed);
      assert.deepEqual(bodies(copy), changedBodies, 'Actual fault run holds every changed-copy source body'); save();
    } catch (error) { cause = error; row.failure = String(error.stack || error); save(); }
    finally {
      fs.writeFileSync(file, original); row.restored = hash(fs.readFileSync(file));
      fs.writeFileSync(path.join(folder, 'restored.ts'), fs.readFileSync(file));
      assert.equal(row.restored, row.original, 'Same physical module restored exactly'); save();
    }
    row.healthyRestoration = run(copy, 'restored-' + control.name); pinned(copy);
    assert.deepEqual(bodies(copy), before, 'Every source body held after same-copy restoration'); save();
    if (cause) throw cause;
    console.log('Programme control ' + control.name + ': actual ' + control.failed.length + ' owned FAIL/' + (4 - control.failed.length)
      + ' PASS/96 unselected, independent PASS, same-copy restored 100 PASS.');
  }
  put('temporary-after.json', bodies(copy));
  assert.equal(report.controls.length, 4); report.complete = true; save();
  console.log('Programme controls complete: four physical faults and four full 100-case restorations, no product mutation.');
} catch (error) { report.failure = String(error.stack || error); save(); throw error; }
finally {
  const after = bodies(ROOT); put('canonical-after.json', after); pinned(ROOT);
  assert.deepEqual(after, before, 'Every canonical tracked source body held');
  report.canonicalHeld = true; save();
}