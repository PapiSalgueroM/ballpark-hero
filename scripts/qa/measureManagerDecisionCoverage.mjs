/* Remote diagnostic only. Actual source and the original harness are never overwritten. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline diagnostic only');
const ROOT = process.cwd(), SOURCE = '6f6b81b0afdb51e5d6f67f845f2312b9e536e469';
const OUT = path.resolve(process.env.CM_DECISION_COVERAGE_OUT || 'manager-decision-coverage-artifacts');
const HARNESS = 'scripts/simClubManagerDecisions.mjs', DESK = 'src/lib/clubManagerDecisions.ts';
const FIXTURE = 'scripts/fixtures/managerAppealIsolation1081';
const FROZEN = '4929c9de26b1fc038cf64c5216e2f46d54c5948611b52c60883fb361f27ee48a';
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.replaceAll('\r\n', '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const text = file => lf(git(['show', SOURCE + ':' + file]));
if (process.env.DECISION_COVERAGE_SOURCE) assert.equal(git(['rev-parse', process.env.DECISION_COVERAGE_SOURCE]).trim(), SOURCE);
assert.equal(git(['rev-parse', SOURCE]).trim(), SOURCE);
git(['diff', '--exit-code', SOURCE, '--', 'src', HARNESS, 'scripts/lib/seedRandom.mjs', FIXTURE]);
await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href);
assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never overwrite a previous diagnostic');
fs.mkdirSync(OUT, { recursive: true });
const report = { diagnosticOnly: true, sourceRef: SOURCE, head: git(['rev-parse', 'HEAD']).trim(), seeds: [979, 1, 2, 3, 4],
  desks: ['current', 'frozen'], forms: ['original3', 'observer3', 'observer9'], copiedTrees: [], runs: [], cells: [], complete: false,
  scope: 'Measured coverage, no source adoption, healthy-headroom or regression-comparator qualification' };
function save() { fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
function receipt(file) { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function write(file, body) {
  const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, body);
  return receipt(target);
}
function hashes(root) {
  const files = {};
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = relative + '/' + entry.name;
      if (entry.isDirectory()) walk(file); else if (entry.isFile()) files[file] = sha(fs.readFileSync(path.join(root, file)));
    }
  }
  walk('src');
  for (const file of [HARNESS, 'scripts/lib/seedRandom.mjs', FIXTURE + '/manifest.json', FIXTURE + '/clubManagerDecisions.historical.ts']) files[file] = sha(fs.readFileSync(path.join(root, file)));
  return files;
}
const before = text(HARNESS), currentDesk = text(DESK), manifest = JSON.parse(text(FIXTURE + '/manifest.json'));
const frozenDesk = text(manifest.frozenSource);
assert.equal(sha(before), '5b3ee496e6e6a0faf3e1a72ad84b3bdc87c477c7874ee2ea4b2eee32236229d8');
assert.equal(sha(frozenDesk), FROZEN); assert.equal(manifest.sha256, FROZEN);
report.sourceBefore = hashes(ROOT);
report.sourceReceipts = [write('sources/harness.original.mjs', before), write('sources/desk.current.ts', currentDesk),
  write('sources/desk.frozen.ts', frozenDesk), write('sources/manifest.original.json', text(FIXTURE + '/manifest.json'))];
save();

const pressEdits = [
  ['press cap', '  const cohort = { careers: 0, entries: 0, promotions: 0, answers: [], boundCareers: 3, boundEntriesPerCareer: 180,',
    '  const cohort = { careers: 0, entries: 0, promotions: 0, answers: [], boundCareers: 15, boundEntriesPerCareer: 180,'],
  ['press label', "    policy: 'browser policy: fixed 979 + clubIndex * 100; action seeds + step * 101 + 1/2/3', skipped: false, state: null };",
    "    policy: 'browser policy: base seeds 979,1,2,3,4 + clubIndex * 100; action seeds + step * 101 + 1/2/3', skipped: false, state: null };"],
  ['press starts', "  for (const [index, club] of ['Arsenal', 'Everton', 'Brighton'].entries()) {\n    const careerSeed = 979 + index * 100;",
    "  const starts = [979, 1, 2, 3, 4].flatMap(seed => ['Arsenal', 'Everton', 'Brighton'].map((club, index) => ({ club, seed: seed + index * 100 })));\n  for (const { club, seed: careerSeed } of starts) {"],
  ['press omitted cap', 'export const P = () => ({ careers: 0, entries: 0, answers: [], boundCareers: 3, boundEntriesPerCareer: 180, skipped: true, state: null });',
    'export const P = () => ({ careers: 0, entries: 0, answers: [], boundCareers: 15, boundEntriesPerCareer: 180, skipped: true, state: null });'],
  ['press failure label', 'actual press cohort found no recorded mood below35 state within 3 careers of 180 entries',
    'actual press cohort found no recorded mood below35 state within 15 careers of 180 entries'],
  ['press report label', 'added pressPressure pairs; bounds 3 careers x 180 entries; skipped=',
    'added pressPressure pairs; bounds 15 careers x 180 entries; skipped='],
];
function edits(source, changes) {
  let value = source;
  for (const [label, from, to] of changes) {
    assert.equal(value.split(from).length - 1, 1, 'One effective copied span: ' + label);
    const previous = value; value = value.replace(from, () => to); assert.notEqual(value, previous);
  }
  let restored = value;
  for (const [label, from, to] of [...changes].reverse()) {
    assert.equal(restored.split(to).length - 1, 1, 'One inverse copied span: ' + label); restored = restored.replace(to, () => from);
  }
  assert.equal(restored, source, 'Complete copied-source inverse'); return value;
}
const press = edits(before, pressEdits);
assert.equal(sha(press), '0e0fed809da6f2fb79413d28d4e0f0f679f0f4c063b8600871459762bb6b2fbb');
write('sources/harness.press15-only.mjs', press);
const loop3 = 'for (let i = 0; i < CLUBS.length; i++) careerOf(A, CLUBS[i], BASE_SEED + 7 + 31 * i, PLAY_SEASONS, playEntry(CLUBS[i]));';
const loop9 = 'for (let i = 0; i < CLUBS.length * 3; i++) careerOf(A, CLUBS[i % CLUBS.length], BASE_SEED + 7 + 31 * i, PLAY_SEASONS, playEntry(CLUBS[i % CLUBS.length]));';
const helpers = `
const __coverageRows = []; let __coveragePhase = 'other';
const __coverageClone = value => JSON.parse(JSON.stringify(value));
const __coverageCounters = () => __coverageClone({ s1, s3, s4: { ...s4, pairs: [...s4.pairs] }, s7 });
function __coverageRetain(row) {
  const file = 'career-' + String(__coverageRows.length).padStart(2, '0') + '.json.gz';
  const bytes = gzipSync(Buffer.from(JSON.stringify(row)));
  fs.writeFileSync(path.join(process.env.CM_DECISION_COVERAGE_RAW, file), bytes);
  __coverageRows.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    phase: row.phase, engine: row.engine, club: row.club, seed: row.seed, draws: row.draws.length,
    countersBefore: row.countersBefore, countersAfter: row.countersAfter });
  fs.writeFileSync(path.join(process.env.CM_DECISION_COVERAGE_RAW, 'careers.json'), JSON.stringify(__coverageRows, null, 2));
}
`;
const observerEdits = [
  ['gzip observer import', "import fs from 'node:fs';", "import fs from 'node:fs';\nimport { gzipSync } from 'node:zlib';"],
  ['observer declarations', 'const CONTROL = process.env.CM_DECISIONS_CONTROL || \'\';', helpers + '\nconst CONTROL = process.env.CM_DECISIONS_CONTROL || \'\';'],
  ['observe real career stream', 'function careerOf(E, club, seed, seasons, onEntry) {\n  reseed(seed);',
    `function careerOf(E, club, seed, seasons, onEntry) {\n  reseed(seed);
  const __draws = [], __random = Math.random;
  const __before = __coveragePhase === 'section1' ? __coverageCounters() : null;
  Math.random = () => { const value = __random(); __draws.push(value); return value; };`],
  ['observe real starting state', '  let s = E.startCareer(club);\n  for (let season = 1; season <= seasons; season++) {',
    '  let s = E.startCareer(club); const __start = __coverageClone(s);\n  for (let season = 1; season <= seasons; season++) {'],
  ['retain final state without changing continuation', '  return s;\n}\n\nconst CLUBS =',
    `  const __row = { phase: __coveragePhase, engine: E === A ? 'A' : 'M', club, seed, seasonsRequested: seasons,
    start: __start, final: __coverageClone(s), draws: __draws, countersBefore: __before,
    countersAfter: __coveragePhase === 'section1' ? __coverageCounters() : null };
  Math.random = __random; __coverageRetain(__row);
  return s;\n}\n\nconst CLUBS =`],
  ['retain actual emitted copies', 'fs.rmSync(TMP, { recursive: true, force: true });',
    'fs.cpSync(TMP, process.env.CM_DECISION_COVERAGE_EMITTED, { recursive: true });\nfs.rmSync(TMP, { recursive: true, force: true });'],
];
const observed3Edits = [...observerEdits, ['mark original section1 prefix', loop3, "__coveragePhase = 'section1';\n" + loop3 + "\n__coveragePhase = 'other';"]];
const observed9Edits = [...observerEdits, ['fixed nine-career prefix', loop3, "__coveragePhase = 'section1';\n" + loop9 + "\n__coveragePhase = 'other';"]];
const observed3 = edits(before, observed3Edits), observed9 = edits(press, observed9Edits);
write('sources/harness.observer3.mjs', observed3); write('sources/harness.observer9.mjs', observed9);
write('sources/inverses.json', JSON.stringify({ pressEdits, observer3Edits: observed3Edits, observer9Edits: observed9Edits,
  inverseOrder: 'Apply each [to,from] span in reverse order; observer9 then press returns the exact original.' }, null, 2));
function retainDiff(name, left, right) {
  const child = spawnSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-ext-diff', '--', path.join(OUT, left), path.join(OUT, right)], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(child.status, 1); assert(!child.error && child.stdout); return write(name, child.stdout);
}
report.copyDiffs = [retainDiff('sources/observer3.diff', 'sources/harness.original.mjs', 'sources/harness.observer3.mjs'),
  retainDiff('sources/observer9.diff', 'sources/harness.original.mjs', 'sources/harness.observer9.mjs')];
report.effectiveCopiedEdits = { press: pressEdits.length, observer3: observed3Edits.length, observer9: observed9Edits.length };
for (const needle of ['const PLAY_SEASONS = 2;', 'const MIN_STRAIGHT_REDS = 6;', 'const S5_CLUBS = 2;',
  'const MIN_SITUATIONS = 200;', 'const ODDS_BAND = 1.5;', 'step < 180 && !state.sacked', 'state.press.mood < 35']) {
  assert(before.includes(needle) && observed3.includes(needle) && observed9.includes(needle), 'Held original rule: ' + needle);
}
save();

const tmpRoot = path.join(ROOT, '.sim-control'); fs.mkdirSync(tmpRoot, { recursive: true });
const temporary = fs.mkdtempSync(path.join(tmpRoot, 'decision-coverage-'));
assert(temporary.startsWith(tmpRoot + path.sep));
const trees = new Map();
function tree(desk, form) {
  const key = desk + '-' + form; if (trees.has(key)) return trees.get(key).root;
  const root = path.join(temporary, key); fs.mkdirSync(root, { recursive: true });
  fs.cpSync(path.join(ROOT, 'src'), path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts/lib'), { recursive: true }); fs.mkdirSync(path.join(root, 'scripts/fixtures'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'scripts/lib/seedRandom.mjs'), path.join(root, 'scripts/lib/seedRandom.mjs'));
  fs.cpSync(path.join(ROOT, FIXTURE), path.join(root, FIXTURE), { recursive: true });
  const desiredDesk = desk === 'frozen' ? frozenDesk : currentDesk;
  const desiredHarness = { original3: before, observer3: observed3, observer9: observed9 }[form];
  fs.writeFileSync(path.join(root, DESK), desiredDesk);
  fs.writeFileSync(path.join(root, HARNESS), desiredHarness);
  assert.equal(lf(fs.readFileSync(path.join(root, DESK), 'utf8')), desk === 'frozen' ? frozenDesk : currentDesk);
  const expected = { ...report.sourceBefore, [HARNESS]: sha(desiredHarness), [DESK]: sha(desiredDesk) };
  const copied = hashes(root);
  assert.deepEqual(Object.keys(copied).sort(), Object.keys(expected).sort(), 'Complete copied tree keys: ' + key);
  assert.deepEqual(copied, expected, 'Copied tree differs only at its declared harness and desk: ' + key);
  const binding = { key, desk, form, before: copied };
  report.copiedTrees.push(binding); trees.set(key, { root, binding }); save(); return root;
}
function run(desk, seed, form, control = '') {
  const name = `${desk}-seed${seed}-${form}${control ? '-' + control : ''}`, root = tree(desk, form);
  const dir = path.join(OUT, 'runs', name); assert(!fs.existsSync(dir)); fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });
  const env = { ...process.env, SIM_SEED: String(seed), SIM_NETWORK: 'offline', TZ: 'UTC',
    NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'),
    CM_DECISION_COVERAGE_RAW: path.join(dir, 'raw'), CM_DECISION_COVERAGE_EMITTED: path.join(dir, 'emitted'),
    SIM_OFFLINE_RECEIPT: path.join(dir, 'transport.log') };
  delete env.CM_DECISIONS_CONTROL; delete env.MANAGER_DECISION_DEPTH_OUT;
  if (control) env.CM_DECISIONS_CONTROL = control;
  const child = spawnSync(process.execPath, [path.join(root, HARNESS)], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  const stdout = child.stdout || '', stderr = child.stderr || '';
  fs.writeFileSync(path.join(dir, 'stdout.log'), stdout); fs.writeFileSync(path.join(dir, 'stderr.log'), stderr);
  const row = { name, desk, seed, form, control: control || null, exit: child.status, signal: child.signal,
    processError: child.error?.message || null, stdout: receipt(path.join(dir, 'stdout.log')), stderr: receipt(path.join(dir, 'stderr.log')),
    failures: stdout.split('\n').filter(line => line.startsWith('FAIL ')), originalBundleRetained: form !== 'original3' };
  report.runs.push(row); save();
  assert(!child.error && !child.signal && Number.isInteger(child.status), 'Complete child process: ' + name);
  assert([0, 1].includes(child.status), 'No setup exit: ' + name);
  assert(!/SyntaxError|ReferenceError|TypeError|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/.test(stderr), 'No setup error: ' + name);
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, 'No transport: ' + name);
  const verdictPrefix = `simClubManagerDecisions${control ? ' (control ' + control + ')' : ''}: `;
  const verdicts = stdout.split(/\r?\n/).filter(line => line.startsWith(verdictPrefix));
  assert.equal(verdicts.length, 1, 'One physical terminal verdict: ' + name);
  const total = verdicts[0].slice(verdictPrefix.length).match(/^(\d+) findings$/); assert(total, 'Actual terminal count: ' + name);
  row.totalFindings = Number(total[1]); row.printedFindings = row.failures.length;
  row.omittedFindings = Math.max(0, row.totalFindings - 40); row.truncated = row.omittedFindings > 0;
  const omitted = [...stdout.matchAll(/^\.\.\. and (\d+) more\r?$/gm)];
  assert.equal(row.printedFindings, Math.min(row.totalFindings, 40), 'Original first40 print cap: ' + name);
  assert.equal(omitted.length, row.truncated ? 1 : 0, 'Original omission line: ' + name);
  if (row.truncated) assert.equal(Number(omitted[0][1]), row.omittedFindings, 'Exact omitted count: ' + name);
  assert.equal(child.status, row.totalFindings ? 1 : 0);
  const match = stdout.match(/^1\. appeals: (\d+) matches, (\d+) straight reds, (\d+) second yellows, (\d+) appeals offered$/m);
  assert(match, 'Actual section1 sums: ' + name); row.section1 = Object.fromEntries(['matches', 'straight', 'secondYellow', 'appeals'].map((key, index) => [key, Number(match[index + 1])]));
  if (form !== 'original3') {
    const manifestFile = path.join(dir, 'raw/careers.json'); row.careersReceipt = receipt(manifestFile);
    const careers = JSON.parse(fs.readFileSync(manifestFile));
    for (const item of careers) {
      const file = path.join(dir, 'raw', item.file), physical = fs.readFileSync(file);
      assert.equal(physical.length, item.bytes); assert.equal(sha(physical), item.sha256);
    }
    row.careers = careers; row.section1Careers = careers.filter(item => item.phase === 'section1');
    assert.equal(row.section1Careers.length, form === 'observer9' ? 9 : 3);
    row.emitted = ['bundle.mjs', 'entry.mjs', 'engineA.ts', 'engineMain.ts', 'clubManagerDecisions.ts'].map(file => receipt(path.join(dir, 'emitted', file)));
  }
  save(); return row;
}
function raw(row, item) { return JSON.parse(gunzipSync(fs.readFileSync(path.join(OUT, 'runs', row.name, 'raw', item.file)))); }
try {
  for (const desk of report.desks) for (const seed of report.seeds) {
    const original = run(desk, seed, 'original3'), three = run(desk, seed, 'observer3');
    assert.equal(three.exit, original.exit, 'Original observer exit');
    assert.equal(three.stdout.sha256, original.stdout.sha256, 'Original observer complete stdout');
    assert.equal(three.stderr.sha256, original.stderr.sha256, 'Original observer complete stderr');
    const nine = run(desk, seed, 'observer9');
    const s5Three = three.careers.filter(item => item.phase !== 'section1'), s5Nine = nine.careers.filter(item => item.phase !== 'section1');
    assert.equal(s5Three.length, 8); assert.equal(s5Nine.length, 8);
    for (let index = 0; index < 8; index++) assert.deepEqual(raw(three, s5Three[index]), raw(nine, s5Nine[index]), 'Original section5 career is exact');
    for (let index = 0; index < 3; index++) assert.deepEqual(raw(three, three.section1Careers[index]), raw(nine, nine.section1Careers[index]), 'Original section1 full state/draw/counter prefix is exact');
    const prefix = raw(nine, nine.section1Careers[2]).countersAfter.s1;
    assert.deepEqual(prefix, original.section1, 'Nine-career prefix reproduces untouched original core sums');
    const cumulative = nine.section1Careers.map((item, index) => ({ careers: index + 1, ...raw(nine, item).countersAfter.s1 }));
    report.cells.push({ desk, seed, observerCalibrated: true, prefixHeld: true, originalExit: original.exit, nineExit: nine.exit,
      originalTotalFindings: original.totalFindings, nineTotalFindings: nine.totalFindings,
      originalPrintedFindings: original.failures, ninePrintedFindings: nine.failures,
      originalTruncated: original.truncated, nineTruncated: nine.truncated, original: original.section1, cumulative }); save();
  }
  const lossFrom = '    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;';
  const lossTo = '    const next = won ? 0 : p.suspendedMatches;';
  assert.equal(currentDesk.split(lossFrom).length - 1, 1);
  assert(before.includes(`desk = swap(desk, '${lossFrom}', '${lossTo}', 'clubManagerDecisions.ts');`));
  write('sources/freeloss.actual-control-reconstruction.ts', currentDesk.replace(lossFrom, lossTo));
  const baseline = report.runs.find(row => row.desk === 'current' && row.seed === 1 && row.form === 'observer9');
  const loss = run('current', 1, 'observer9', 'freeloss');
  const section3 = loss.failures.filter(line => line.startsWith('FAIL [3]'));
  report.lossControl = { name: loss.name, baseline: baseline.name, baselineExit: baseline.exit, baselineHealthy: baseline.exit === 0,
    baselineSection3Failures: baseline.failures.filter(line => line.startsWith('FAIL [3]')),
    actualPrintedSection3Failures: section3, otherPrintedFailures: loss.failures.filter(line => !line.startsWith('FAIL [3]')),
    totalFindings: loss.totalFindings, printedFindings: loss.printedFindings, omittedFindings: loss.omittedFindings,
    scope: 'Executable original copied free-loss control; original stdout prints at most40 findings, with exact terminal and omitted counts retained' }; save();
  assert(loss.exit === 1 && section3.some(line => line.includes('appeal lost')), 'Actual original lost-ban assertion fires');
  assert.equal(report.runs.length, 31); assert.equal(report.cells.length, 10);
  report.complete = true; save();
  console.log('Decision coverage diagnostic: 30 declared normal child runs calibrated, actual free-loss run retained. Every exit and semantic finding remains visible. No harness or comparator adoption claimed.');
} catch (error) { report.error = error?.stack || String(error); save(); throw error; }
finally {
  try {
    for (const { root, binding } of trees.values()) {
      binding.after = hashes(root);
      assert.deepEqual(binding.after, binding.before, 'Complete copied tree held after children: ' + binding.key);
    }
    report.copiedTreeHoldsPassed = true;
    report.sourceAfter = hashes(ROOT); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Actual source and original harness held');
    git(['diff', '--exit-code', SOURCE, '--', 'src', HARNESS, 'scripts/lib/seedRandom.mjs', FIXTURE]); report.finalHoldsPassed = true;
  } catch (error) { report.complete = false; report.finalHoldsPassed = false; report.holdError = error?.stack || String(error); throw error; }
  finally { assert(temporary.startsWith(tmpRoot + path.sep)); fs.rmSync(temporary, { recursive: true, force: true }); save(); }
}
