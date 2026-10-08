/* Round 1079: distinguish unchanged legacy failures from a new regression.
 * Originals stay untouched. Copies add observations without changing an assert.
 * This proves equivalence to one pinned base, not that legacy reds are healthy. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

assert(process.env.CI, 'Paired legacy verification is remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '2fff5e044160b70bd58b64d931793ee4e443cedd';
const OUT = path.join(ROOT, 'manager-match-plans-artifacts/legacy');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-legacy-1079-'));
const CLOCK = path.join(ROOT, 'scripts/qa/managerLegacy1079Clock.cjs');
const GUARD = path.join(ROOT, 'scripts/lib/offlineTransport.cjs');
const CONFIGS = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'vitest.config.ts', 'tailwind.config.ts', 'postcss.config.js', 'eslint.config.js'];
const FILES = ['simClubCaptaincy.mjs', 'simCmShootoutOrder.mjs', 'simClubManagerSlots.mjs'];
const FIXTURE = 'scripts/data/cmShootoutUnset782.json';
const ENGINE = 'src/lib/clubManager.ts';
fs.mkdirSync(OUT, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), typeof value === 'string' ? value : JSON.stringify(value));
const report = { base: BASE, runs: {}, comparisons: [], controls: [], originalAssertionsGreen: false,
  settings: { timezone: 'UTC', frozenDate: '2026-10-01T00:00:00.000Z', initializationSeed: 0x1079, simSeed: 'unset', careers: 300, switches: 20, budgetSeasons: 15 },
  limitations: ['The original legacy assertions remain red and are retained.', 'Equality concerns this pinned base and these seeded finite scenarios.'] };
const save = () => write('report.json', report);
function command(program, args, cwd = ROOT) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert(!result.error && result.status === 0, `${program} ${args[0]} failed: ${result.error || result.stderr}`);
  return result.stdout.trim();
}
function hashes(root) {
  const result = {};
  const walk = relative => {
    const absolute = path.join(root, relative);
    for (const item of fs.readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = `${relative}/${item.name}`;
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) result[file] = hash(fs.readFileSync(path.join(root, file)));
    }
  };
  walk('src'); walk('scripts');
  for (const file of CONFIGS) result[file] = hash(fs.readFileSync(path.join(root, file)));
  return result;
}
const sourceBefore = hashes(ROOT);
write('source-before.json', sourceBefore);
process.on('exit', () => { write('source-after.json', hashes(ROOT)); save(); });

const head = command('git', ['rev-parse', 'HEAD']);
report.head = head;
report.headTree = command('git', ['rev-parse', 'HEAD^{tree}']);
report.baseTree = command('git', ['rev-parse', `${BASE}^{tree}`]);
const trees = {};
for (const [label, ref] of [['base', BASE], ['head', head]]) {
  const tree = path.join(TEMP, label), archive = path.join(TEMP, `${label}.tar`);
  fs.mkdirSync(tree, { recursive: true });
  command('git', ['archive', '--format=tar', `--output=${archive}`, ref, 'src', 'scripts', ...CONFIGS]);
  command('tar', ['-xf', archive, '-C', tree]);
  fs.symlinkSync(fs.realpathSync(path.join(ROOT, 'node_modules')), path.join(tree, 'node_modules'), 'dir');
  trees[label] = tree;
  write(`${label}-archive.json`, { ref, archiveSha256: hash(fs.readFileSync(archive)), sources: hashes(tree) });
}
for (const file of [...FILES.map(name => `scripts/${name}`), FIXTURE, 'scripts/lib/seedRandom.mjs']) {
  assert.equal(hash(read(path.join(trees.base, file))), hash(read(path.join(trees.head, file))), `${file}: paired originals differ`);
}
assert.equal(hash(read(path.join(trees.base, 'package-lock.json'))), hash(read(path.join(trees.head, 'package-lock.json'))), 'Both revisions require the same dependency lock');

const unsetFrom = '  if (!order) return { won: Math.random() < clamp(0.5 + (mine - oppS) * 0.012 + shootoutTakerEdge(taker), 0.2, 0.8) };\n';
const unsetTo = '  if (!order) { Math.random(); return { won: Math.random() < clamp(0.5 + (mine - oppS) * 0.012 + shootoutTakerEdge(taker), 0.2, 0.8) }; }\n';
function replaceOnce(source, from, to, label) {
  assert.equal(source.split(from).length - 1, 1, `${label}: executable anchor is not unique`);
  assert.notEqual(from, to, `${label}: mutation or observation changed nothing`);
  return source.replace(from, () => to);
}
const originalEngine = read(path.join(trees.base, ENGINE));
const currentEngine = read(path.join(trees.head, ENGINE));
const transpile = source => transformSync(source, { loader: 'ts', target: 'es2020', format: 'esm', minifyWhitespace: true, legalComments: 'none' }).code;
const baseRuntime = transpile(originalEngine), headRuntime = transpile(currentEngine);
write('base-runtime.mjs', baseRuntime); write('head-runtime.mjs', headRuntime);
assert.equal(hash(headRuntime), hash(baseRuntime), 'The type-only engine change emitted different executable code');
const brokenEngine = replaceOnce(currentEngine, unsetFrom, unsetTo, 'unsetpath executable fault');
write('unsetpath-engine.ts.txt', brokenEngine);
const brokenRuntime = transpile(brokenEngine);
write('unsetpath-runtime.mjs', brokenRuntime);
assert.notEqual(hash(brokenRuntime), hash(headRuntime), 'Executable source fault must change emitted runtime');
let runtimeRejected = false;
try { assert.equal(hash(brokenRuntime), hash(baseRuntime), 'Executable runtime differs'); }
catch (error) { assert(error instanceof assert.AssertionError); runtimeRejected = true; }
assert(runtimeRejected);
report.runtime = { baseSource: hash(originalEngine), headSource: hash(currentEngine), base: hash(baseRuntime), head: hash(headRuntime), identical: true, controlSource: hash(brokenEngine), controlRuntime: hash(brokenRuntime), controlRejected: true, from: unsetFrom, to: unsetTo };
save();

const preamble = `import { writeFileSync as __legacyWrite } from 'node:fs';
const __legacy = { complete: false, logs: [], failures: [], seasons: [], shootoutRows: [] };
const __legacyLog = console.log;
console.log = (...args) => { __legacy.logs.push(args.map(String).join(' ')); __legacyLog(...args); };
process.on('exit', () => __legacyWrite(process.env.LEGACY_OBSERVATION_FILE, JSON.stringify(__legacy)));
`;
function instrument(file, source) {
  let copy = source;
  const changes = [];
  const insert = (from, to) => {
    copy = replaceOnce(copy, from, to, file);
    changes.push({ from, to });
  };
  if (file === 'simClubCaptaincy.mjs') {
    insert('const fail = m => { failures += 1; console.error("  FAIL: " + m); };', 'const fail = m => { __legacy.failures.push(m); failures += 1; console.error("  FAIL: " + m); };');
    insert('if (failures > 0) {', `__legacy.counters = { CAREERS, everCaptain, seniorityAwards, voteAwards, transferStrips, loanStrips, handovers, multiStint, cabinetLines, awardAgesSum, crashes, failures };
__legacy.oldSaves = { repaired, fixedSave };
__legacy.complete = true;
if (failures > 0) {`);
  } else if (file === 'simCmShootoutOrder.mjs') {
    insert("const fail = m => { failures += 1; console.error('  FAIL: ' + m); };", "const fail = m => { __legacy.failures.push(m); failures += 1; console.error('  FAIL: ' + m); };");
    insert('    const rep = r.report;', '    const rep = r.report;\n    __legacy.lastCup = JSON.parse(JSON.stringify({ seed, report: rep, state: r.state }));');
    insert('    const got = row(out);', '    const got = row(out);\n    __legacy.shootoutRows.push({ got, expected: want, ...__legacy.lastCup });');
    insert('    const got = row(playCup(back, probe.seed));', '    const got = row(playCup(back, probe.seed));\n    __legacy.loadedProbe = { got, expected: probe, ...__legacy.lastCup };');
    insert('if (failures) {', '__legacy.failureCount = failures;\n__legacy.complete = true;\nif (failures) {');
  } else {
    insert("const fail = (m, tag = 'check') => { failures[section] += 1; (tags[section] ??= new Set()).add(tag); console.error('  FAIL: ' + m); };", "const fail = (m, tag = 'check') => { __legacy.failures.push({ section, tag, message: m }); failures[section] += 1; (tags[section] ??= new Set()).add(tag); console.error('  FAIL: ' + m); };");
    insert('async function aloneRun(i, seasons) {', "async function aloneRun(i, seasons) {\n  __legacy.arm = `alone:${i}`;");
    insert('async function switchAndPlay(target, record, keepFinished = false) {', "async function switchAndPlay(target, record, keepFinished = false) {\n  __legacy.arm = `slot:${target}`;");
    insert('reseed(0, 99);', "__legacy.arm = 'old-save';\nreseed(0, 99);");
    insert('  return { fin: r.state, sum: r.summary, next: startNextSeason(r.state) };', `  const __season = { fin: r.state, sum: r.summary, next: startNextSeason(r.state) };
  __legacy.seasons.push(JSON.parse(JSON.stringify({ arm: __legacy.arm, ...__season })));
  return __season;`);
    insert('const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);', 'const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);\n__legacy.budget = { total, BUDGET, BUDGET_SEASON, played: [...played], holdings: cmKeys.map(key => [key, store.get(key)]) };');
    insert('if (red.length) {', '__legacy.sections = { failures, red, same, compared, nudges, alone, switched, refusals };\n__legacy.complete = true;\nif (red.length) {');
  }
  return { copy: preamble + copy, changes };
}
const instrumented = {};
for (const label of ['base', 'head']) {
  instrumented[label] = {};
  for (const file of FILES) {
    const target = path.join(trees[label], 'scripts', file), source = read(target);
    const { copy, changes } = instrument(file, source);
    fs.writeFileSync(target, copy);
    write(`${label}-${file}.original.txt`, source);
    write(`${label}-${file}.instrumented.txt`, copy);
    write(`${label}-${file}.instrumentation.json`, { original: hash(source), copy: hash(copy), preamble, changes });
    instrumented[label][file] = hash(copy);
  }
}
const temporaryBefore = Object.fromEntries(Object.entries(trees).map(([label, tree]) => [label, hashes(tree)]));
write('temporary-before.json', temporaryBefore);

function run(label, file, control = '') {
  const name = `${label}-${file.replace('.mjs', '')}${control ? `-${control}` : ''}`;
  const observation = path.join(OUT, `${name}-observations.json`);
  const temporary = path.join(TEMP, `${name}-tmp`);
  fs.mkdirSync(temporary, { recursive: true });
  const env = { ...process.env, TZ: 'UTC', CI: '1', SIM_NETWORK: 'offline',
    TMPDIR: temporary, TMP: temporary, TEMP: temporary,
    LEGACY_OBSERVATION_FILE: observation, SIM_OFFLINE_RECEIPT: path.join(OUT, `${name}-transport.log`),
    NODE_OPTIONS: `--require=${GUARD} --require=${CLOCK}`,
    SLOTS_SWITCHES: '20', SLOTS_BUDGET_SEASON: '15',
    CM_SHOOTOUT_WRITE_FIXTURE: '', CM_SHOOTOUT_CONTROL: control, SLOTS_CONTROL: '',
    FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.SIM_SEED;
  const args = [`scripts/${file}`, ...(file === 'simClubCaptaincy.mjs' ? ['300'] : [])];
  const result = spawnSync(process.execPath, args, { cwd: trees[label], env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 900_000 });
  write(`${name}.stdout.log`, result.stdout || ''); write(`${name}.stderr.log`, result.stderr || '');
  assert(!result.error && result.signal === null, `${name}: failed to finish ${result.error || result.signal}`);
  assert(fs.existsSync(observation), `${name}: observation missing`);
  const data = JSON.parse(fs.readFileSync(observation, 'utf8'));
  assert.equal(data.complete, true, `${name}: original harness did not reach its verdict`);
  assert.equal(result.status, 1, `${name}: expected existing legacy red is no longer reproduced; inspect it`);
  assert(data.failures.length > 0, `${name}: no original assertion failed`);
  if (file === 'simClubCaptaincy.mjs') {
    assert.equal(data.counters.CAREERS, 300); assert.equal(data.counters.crashes, 0);
    assert.deepEqual(data.failures, ['0 decline handovers, floor 2'], 'Unexpected captaincy legacy failure');
  }
  if (file === 'simCmShootoutOrder.mjs') {
    assert.equal(data.shootoutRows.length, 150); assert(data.loadedProbe?.got);
    if (!control) {
      assert.equal(data.failures.length, 2, 'Unexpected shootout legacy failure count');
      assert(data.failures.includes('150 rows differ from the pre round engine with no order set'));
      assert(data.failures.some(message => message.startsWith('the loaded old save played seed 782109 as ')));
    }
  }
  if (file === 'simClubManagerSlots.mjs') {
    assert.equal(data.sections.compared, 20); assert.equal(data.seasons.length, 69); assert.deepEqual(data.budget.played, [15, 15, 15]);
    assert.equal(data.failures.length, 4, 'Unexpected slots legacy failure count');
    assert.equal(data.failures.filter(failure => failure.section === 1 && failure.message.endsWith('differs from the career played alone, in decisions')).length, 3);
    assert.equal(data.failures.filter(failure => failure.section === 2 && failure.tag === 'budget').length, 1);
  }
  const traffic = env.SIM_OFFLINE_RECEIPT;
  assert(!fs.existsSync(traffic) || fs.readFileSync(traffic, 'utf8').trim() === '', `${name}: unexpected attempted network access`);
  const receipt = { name, exit: result.status, observationSha256: hash(JSON.stringify(data)), failures: data.failures, sourceCopySha256: instrumented[label][file], originalAssertionsGreen: false };
  report.runs[name] = receipt; save();
  console.log(`OBSERVED ${name}: original exit ${result.status}, ${data.failures.length} assertion failures retained`);
  return { receipt, data };
}
function compare(base, head) {
  assert.equal(head.receipt.exit, base.receipt.exit, 'Original harness statuses differ');
  assert.deepEqual(head.data.failures, base.data.failures, 'Original failing assertions differ');
  assert.equal(head.receipt.observationSha256, base.receipt.observationSha256, 'Complete observed outcomes differ');
}
const baselineRuns = {};
for (const file of FILES) {
  const base = run('base', file), current = run('head', file);
  compare(base, current);
  baselineRuns[file] = base;
  report.comparisons.push({ file, identical: true, base: base.receipt, head: current.receipt }); save();
  console.log(`EQUIVALENT ${file}: original assertions remain red, complete outcomes match pinned base`);
}
const baseHashesBeforeControl = hashes(trees.base);
const control = run('head', 'simCmShootoutOrder.mjs', 'unsetpath');
assert.notEqual(hash(JSON.stringify(control.data.shootoutRows)), hash(JSON.stringify(baselineRuns['simCmShootoutOrder.mjs'].data.shootoutRows)), 'unsetpath did not change actual shootout outcomes');
let rejected = false;
try { compare(baselineRuns['simCmShootoutOrder.mjs'], control); }
catch (error) { assert(error instanceof assert.AssertionError); rejected = true; }
assert(rejected, 'unsetpath fault was not rejected even though both original harness runs are red');
assert.deepEqual(hashes(trees.base), baseHashesBeforeControl, 'Fault run changed the independent baseline');
report.controls.push({ control: 'unsetpath', copiedSourceSha256: hash(brokenEngine), baseExit: baselineRuns['simCmShootoutOrder.mjs'].receipt.exit, headFaultExit: control.receipt.exit, comparatorRejected: true, unchangedBaseline: true });
const temporaryAfter = Object.fromEntries(Object.entries(trees).map(([label, tree]) => [label, hashes(tree)]));
write('temporary-after.json', temporaryAfter);
assert.deepEqual(temporaryAfter, temporaryBefore, 'Harness execution changed archived sources or fixtures');
assert.deepEqual(hashes(ROOT), sourceBefore, 'Paired verification changed checkout source');
report.passed = true; save();
console.log('PASS paired legacy comparison: 3 unchanged legacy reds, complete retained observations, effective unsetpath and executable-runtime controls.');
