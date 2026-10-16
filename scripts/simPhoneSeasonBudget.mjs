/* Remote-only actual phone API proof. Full raw state and RNG observations are retained. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Phone budget proof requires remote offline CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.PHONE_BUDGET_BASE || 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const PHASE = process.env.PHONE_BUDGET_PHASE || 'fixed';
const CONTROL = process.env.PHONE_BUDGET_CONTROL || '';
assert(['baseline', 'fixed'].includes(PHASE)); assert(['', 'original'].includes(CONTROL));
assert(!(PHASE === 'baseline' && CONTROL), 'Baseline and original-source arms stay separate');
const PHONE = path.join(ROOT, 'src/lib/soccerPhone.ts'), ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts'), SELF = fileURLToPath(import.meta.url);
const TEST = 'src/test/soccerPhoneSeasonBudget.test.ts';
const TARGETS = [
  ['repair retains every valid optional counter', 'REPAIR: valid saved budget fields were lost'],
  ['repeated actual replies share the four point karma allowance', 'KARMA: repeated replies exceeded the saved season allowance'],
  ['repeated actual replies share the six point direct morale allowance', 'MORALE: repeated replies exceeded the saved season allowance'],
  ['repeated actual replies share the one point popularity allowance', 'POPULARITY: repeated replies exceeded the saved season allowance'],
  ['opening another contact retains already spent allowances', 'CONTACT: opening a contact erased the saved season allowance'],
  ['actual save reload retains the remaining reply allowances', 'RELOAD: reloaded replies exceeded the saved season allowance'],
  ['real replies honor zero fractional exhausted and excess spent values', 'REMAINING: real replies ignored already spent or signed allowance'],
].map(([title, cause]) => ({ title: 'phone budget missing: ' + title, cause: 'PHONE_BUDGET_' + cause }));
const PRESERVED = [
  'missing and malformed fields stay undefined without coercion',
  'a new saved season resets the original first reply allowance',
  'a save without budget fields keeps its original first conversation reply',
  'reading leaves the complete input and global RNG untouched',
  'invalid public contact thread and reply remain no ops',
].map(title => 'phone budget preservation: ' + title);
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(child.status, 0, 'Exact source Git read must finish'); return child.stdout;
};
const files = [PHONE, ENGINE, SAVE, path.join(ROOT, TEST), SELF];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const original = git(['show', `${BASE}:src/lib/soccerPhone.ts`]);
const arm = CONTROL || (PHASE === 'baseline' ? 'baseline' : process.env.PHONE_BUDGET_RESTORED === '1' ? 'restored' : 'normal');
const OUT = path.resolve(process.env.PHONE_BUDGET_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'phone-budget-proof-')));
const retained = path.join(OUT, 'units', arm); fs.mkdirSync(retained, { recursive: true });
const reportFile = path.join(retained, 'unit.json'); assert(!fs.existsSync(reportFile), 'Do not replace existing physical evidence');
for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
fs.writeFileSync(path.join(retained, 'soccerPhone.ts.original'), original);
const appBindings = [ENGINE, SAVE].map(file => {
  const relative = path.relative(ROOT, file).replaceAll('\\', '/'), parent = git(['show', `${BASE}:${relative}`]);
  assert.equal(sources.get(file), parent, 'Unchanged app source must match the exact incoming base: ' + relative);
  return { file: relative, sha256: sha(parent) };
});
if (PHASE === 'baseline') assert.equal(sources.get(PHONE), original, 'Baseline phone source remains unchanged');
if (CONTROL) assert.notEqual(sources.get(PHONE), original, 'Original control must change executable source');
const tmpRoot = path.join(ROOT, '.sim-control'); fs.mkdirSync(tmpRoot, { recursive: true });
const tmp = fs.mkdtempSync(path.join(tmpRoot, 'phone-season-budget-'));
assert.equal(path.dirname(tmpRoot), ROOT); assert.equal(path.dirname(tmp), tmpRoot);
let outcome = {};
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ head: git(['rev-parse', 'HEAD']).trim(), base: BASE, phase: PHASE, arm,
    appBindings, originalPhoneSha256: sha(original), effectivePhoneSha256: sha(CONTROL ? original : sources.get(PHONE)),
    sources: [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
      beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) })), ...outcome }, null, 2));
}
function stripBudgetObservation(value) {
  const copy = structuredClone(value);
  for (const record of Object.values(copy)) for (const side of ['before', 'after']) {
    const state = record[side]; if (!state) continue;
    delete state.karma; delete state.morale; delete state.popularity;
    if (state.phone) for (const field of ['bYear', 'bK', 'bP', 'bM']) delete state.phone[field];
  }
  return copy;
}
try {
  receipt();
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: ENGINE, phone: PHONE, save: SAVE }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'actual-phone-budget-source', setup(build) {
      if (CONTROL) build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === PHONE
        ? { contents: original, loader: 'ts', resolveDir: path.dirname(PHONE) } : undefined);
    } }] });
  const compiled = ['engine.mjs', 'phone.mjs', 'save.mjs'].map(file => {
    const bytes = fs.readFileSync(path.join(tmp, file)); fs.writeFileSync(path.join(retained, file), bytes);
    return { file, sha256: sha(bytes) };
  });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', PHONE_BUDGET_RAW: path.join(retained, 'raw-states.json'),
    PHONE_BUDGET_ENGINE: path.join(tmp, 'engine.mjs').replaceAll('\\', '/'),
    PHONE_BUDGET_PHONE: path.join(tmp, 'phone.mjs').replaceAll('\\', '/'), PHONE_BUDGET_SAVE: path.join(tmp, 'save.mjs').replaceAll('\\', '/') };
  const child = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile],
  { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (child.stdout || '') + (child.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output); process.stdout.write(output);
  receipt({ compiled, exit: child.status, signal: child.signal, processError: child.error?.message || null });
  assert(!child.error && !child.signal && child.status !== null, 'Actual test runner must complete');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|SIM_OFFLINE_BLOCK/i.test(output), 'No setup, transport or unhandled fault credit');
  assert(fs.existsSync(reportFile), 'Actual physical unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1); assert.equal(report.numTotalTests, 12);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message);
  const cases = file.assertionResults, titles = [...TARGETS.map(row => row.title), ...PRESERVED];
  assert.deepEqual(cases.map(row => row.title).sort(), titles.sort(), 'All twelve unique named cases must complete');
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const expected = PHASE === 'baseline' || CONTROL ? TARGETS : [], failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), expected.map(row => row.title).sort(), 'Only exact saved-budget faults may qualify');
  for (const row of failed) {
    const cause = TARGETS.find(item => item.title === row.title).cause;
    assert.equal(row.failureMessages.length, 1);
    assert(row.failureMessages[0].startsWith('AssertionError: ' + cause) && row.failureMessages[0].includes('expected false to be true'), 'Exact saved-budget Boolean cause required');
  }
  assert.equal(report.numPassedTests, 12 - expected.length); assert.equal(report.numFailedTests, expected.length);
  assert.equal(child.status, expected.length ? 1 : 0); assert.equal(report.success, expected.length === 0);
  const rawFile = path.join(retained, 'raw-states.json'); assert(fs.existsSync(rawFile), 'Full raw observations must exist before qualification');
  const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.equal(Object.keys(raw).length, 84, 'All exact full-state observations must be captured before qualification');
  assert(Object.values(raw).every(row => row.before && row.after && Array.isArray(row.draws)));
  assert(Object.values(raw).every(row => row.draws.length === 0), 'Phone operations consume no ambient RNG');
  const comparisons = [];
  if (CONTROL || arm === 'restored') {
    const normal = JSON.parse(fs.readFileSync(path.join(OUT, 'units/normal/raw-states.json'), 'utf8'));
    assert.deepEqual(Object.keys(raw).sort(), Object.keys(normal).sort(), 'Every actual observation must be paired');
    assert.deepEqual(stripBudgetObservation(raw), stripBudgetObservation(normal), 'Every non-budget/non-direct-meter field and RNG draw remains identical');
    comparisons.push({ kind: 'complete-non-budget-state-and-RNG', observations: Object.keys(raw).length, held: true });
    if (arm === 'restored') {
      assert.deepEqual(raw, normal, 'Restoration returns every full raw observation exactly');
      comparisons.push({ kind: 'complete-restored-state', held: true });
    }
  }
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Tracked source bytes remain held');
  receipt({ completed: cases.length, passed: report.numPassedTests, failed: report.numFailedTests,
    observations: Object.keys(raw).length, rawSha256: sha(fs.readFileSync(rawFile)), comparisons, qualified: true });
  console.log(`Phone budget ${arm}: 12 completed; ${report.numPassedTests} passed; ${report.numFailedTests} exact saved-budget faults; ${Object.keys(raw).length} full observations; setup faults 0.`);
  console.log('Actual API source, complete state/RNG observations, physical reports and unchanged source receipts retained.');
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error; }
finally { fs.rmSync(tmp, { recursive: true, force: true }); }
