import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const root = process.cwd(), mode = process.argv[2] || 'units';
assert(['units', 'browser'].includes(mode), 'Choose units or browser');
const out = path.join(root, 'training-copy-artifacts', mode);
assert(!fs.existsSync(out), 'Use a fresh evidence directory');
fs.mkdirSync(out, { recursive: true });
const base = '1acb33005073be70ba5aae0285ece5537f390f9a';
const unit = 'src/test/soccerScreenTruths.test.tsx';
const panel = 'src/components/soccer-career/TrainingPanel.tsx';
const walk = 'scripts/playSoccerScreenTruths.mjs';
const tests = [unit, 'src/test/trainingClassicPractice.test.tsx', 'src/test/soccerPracticeLifecycle.test.tsx'];
const files = [...tests, panel, walk];
const held = new Map(files.map(file => [file, fs.readFileSync(file)]));
const hash = body => crypto.createHash('sha256').update(body).digest('hex');
const source = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const initialSource = source(), arms = [];
const oldTitles = [
  'holds only the bank rule with its example on the menu, and ? shows all three',
  'keeps the ? during a drill as it was: three paragraphs, the drill paused (passes on the base too)',
];
const newTitles = [
  'holds the bank rule with its example and free practice on the menu, and ? shows all four',
  'keeps all four rules paragraphs behind the ? during a drill, with the drill paused',
];
const paragraph = '<p>Keep practising after you bank. Extra runs are just for a score and do not change your career.</p>';
function restore() { for (const [file, body] of held) fs.writeFileSync(file, body); }
function original(file) { return execFileSync('git', ['show', base + ':' + file]); }
function prepare(name) {
  const dir = path.join(out, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) {
    const dest = path.join(dir, 'source', file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  return dir;
}
function childResult(name, dir, args, env = {}) {
  const before = source();
  const child = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024, timeout: 180000, env: { ...process.env, ...env } });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout ?? '');
  fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr ?? '');
  assert.equal(child.error, undefined, name + ' spawned and completed');
  assert.deepEqual(source(), before, name + ' child preserved all five source files');
  return child;
}
function units(name, expectedTitles) {
  const dir = prepare(name);
  const child = childResult(name, dir, ['node_modules/vitest/vitest.mjs', 'run', ...tests,
    '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json',
    '--outputFile=' + path.join(dir, 'report.json')]);
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json')));
  assert.equal(report.testResults.length, 3, name + ' all three test files');
  const counts = tests.map(file => report.testResults.find(row => row.name.replaceAll('\\', '/').endsWith(file))?.assertionResults.length);
  assert.deepEqual(counts, [11, 6, 15], name + ' unchanged case census');
  const cases = report.testResults.flatMap(row => row.assertionResults), failed = cases.filter(row => row.status === 'failed');
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)), name + ' no skipped or pending cases');
  for (const row of failed) assert(row.failureMessages.some(message => message.includes('AssertionError')), name + ' assertion failure, not setup');
  assert.deepEqual(failed.map(row => row.title).sort(), [...expectedTitles].sort(), name + ' exact failed titles');
  assert.equal(child.status, expectedTitles.length ? 1 : 0, name + ' exit');
  if (report.numRuntimeErrorTestSuites !== undefined) assert.equal(report.numRuntimeErrorTestSuites, 0, name + ' runtime error suites');
  const row = { name, exit: child.status, counts, passed: cases.length - failed.length,
    failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })),
    runtimeErrorSuites: report.numRuntimeErrorTestSuites ?? null, source: source() };
  arms.push(row); fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(row, null, 2) + '\n');
  console.log(name + ': ' + row.passed + ' passed, ' + failed.length + ' exact failures');
}
function distReceipt() {
  return fs.readdirSync('dist', { recursive: true }).filter(file => fs.statSync(path.join('dist', file)).isFile())
    .sort().map(file => ({ file: file.replaceAll('\\', '/'), sha256: hash(fs.readFileSync(path.join('dist', file))) }));
}
function browser(name, stale) {
  const dir = prepare(name);
  const child = childResult(name, dir, [walk], { SECTIONS: 'W7', SHOTS: path.join(dir, 'shots'),
    SCREEN_TRUTHS_BASE_DIST: '', BASE: '', SWEEP_BASE: '' });
  const lines = child.stdout.split(/\r?\n/), failures = lines.filter(line => line.startsWith('FAIL [head] W7 '));
  const expected = stale ? [390, 1280].flatMap(width => [
    'FAIL [head] W7 ' + width + ": the menu's rules block is one paragraph with its worked example (2 paragraphs)",
    'FAIL [head] W7 ' + width + ': ? shows all three paragraphs, the bank rule last (4)',
  ]) : [];
  assert.deepEqual([...failures].sort(), expected.sort(), name + ' only the two stale copy assertions per width');
  assert.equal(lines.filter(line => /^(ok  |FAIL) \[head\] W7 /.test(line)).length, 12, name + ' all twelve W7 checks');
  assert.equal(child.status, stale ? 1 : 0, name + ' exit');
  const shots = fs.readdirSync(path.join(dir, 'shots')).filter(file => file.endsWith('.png')).sort();
  assert.equal(shots.length, 4, name + ' both widths and help states');
  const row = { name, exit: child.status, failed: failures, source: source(),
    screenshots: shots.map(file => { const body = fs.readFileSync(path.join(dir, 'shots', file)); return { file, bytes: body.length, sha256: hash(body) }; }) };
  arms.push(row); fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(row, null, 2) + '\n');
  console.log(name + ': all twelve W7 checks reached; ' + failures.length + ' exact stale-copy failures');
}
try {
  assert(held.get(panel).equals(original(panel)), 'The complete production TrainingPanel equals the published main source');
  if (mode === 'units') {
    fs.writeFileSync(unit, original(unit));
    units('original', oldTitles); restore();
    units('fixed', []);
    const text = fs.readFileSync(panel, 'utf8');
    assert.equal(text.split(paragraph).length, 2, 'Exactly one real practice paragraph');
    const changed = text.replace(paragraph, '');
    assert.notEqual(changed, text, 'The copy control changed production text');
    fs.writeFileSync(panel, changed);
    fs.writeFileSync(path.join(out, 'paragraph-control.json'), JSON.stringify({ file: panel, from: paragraph,
      before: hash(text), after: hash(changed) }, null, 2) + '\n');
    units('omit-practice-copy', newTitles); restore();
    units('restored', []);
  } else {
    const before = distReceipt();
    fs.writeFileSync(path.join(out, 'dist-before.json'), JSON.stringify(before, null, 2) + '\n');
    browser('fixed', false);
    fs.writeFileSync(walk, original(walk));
    browser('original-oracle', true); restore();
    browser('restored', false);
    const after = distReceipt();
    fs.writeFileSync(path.join(out, 'dist-after.json'), JSON.stringify(after, null, 2) + '\n');
    assert.deepEqual(after, before, 'Every served dist file digest remains unchanged');
  }
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ passed: true, mode, initialSource, arms }, null, 2) + '\n');
} finally {
  restore();
  assert.deepEqual(source(), initialSource, 'Every held source file restored byte for byte');
}
