/* Remote-only actual phone API and complete prior-state preservation proof. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI is required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.env.PHONE_ISOLATION_BASE || 'c40ea5d85734915f7f0d9a5a155615267640eb80';
const PHASE = process.env.PHONE_ISOLATION_PHASE || 'fixed';
const CONTROL = process.env.PHONE_ISOLATION_CONTROL || '';
assert(['baseline', 'fixed'].includes(PHASE)); assert(['', 'original'].includes(CONTROL));
assert(!(PHASE === 'baseline' && CONTROL));
const arm = CONTROL || (PHASE === 'baseline' ? 'baseline' : process.env.PHONE_ISOLATION_RESTORED === '1' ? 'restored' : 'normal');
const OUT = path.resolve(process.env.PHONE_ISOLATION_OUT || 'phone-isolation-artifacts');
const retained = path.join(OUT, 'units', arm); fs.mkdirSync(retained, { recursive: true });
const TEST = 'src/test/soccerPhoneStateIsolation.test.ts';
const PHONE = path.join(ROOT, 'src/lib/soccerPhone.ts');
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const TARGETS = [
  ['reading a legacy thread leaves the complete career unchanged', 'READ'],
  ['a public reply leaves the previous career unchanged', 'REPLY'],
  ['reopening a contact leaves the previous career unchanged', 'OPEN'],
  ['a season tick leaves the previous phone unchanged', 'TICK'],
  ['a world tick leaves the previous clubs map unchanged', 'WORLD'],
].map(([title, tag]) => ({ title: 'phone isolation missing: ' + title, tag: 'PHONE_ISOLATION_' + tag }));
const PRESERVED = [
  'phone isolation preservation: spent allowances survive real replies and JSON reload',
  'phone isolation preservation: invalid public phone actions remain unchanged',
];
const RAW_KEYS = ['read-open', 'read', 'reply-open', 'reply', 'open-open', 'open-reply0', 'open-reply1', 'open-reply2', 'open', 'tick-open', 'tick', 'world', 'budgets-open', 'budgets-reply0', 'budgets-reply1', 'budgets-reply2', 'budgets-reload', 'budgets-open-checkin', 'budgets-reply-checkin', 'invalid-open', 'invalid-contact', 'invalid-thread', 'invalid-choice'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Exact Git source read must complete'); return result.stdout;
}
const sources = new Map([PHONE, ENGINE, SAVE, path.join(ROOT, TEST), fileURLToPath(import.meta.url)]
  .map(file => [file, fs.readFileSync(file, 'utf8')]));
const original = git(['show', `${BASE}:src/lib/soccerPhone.ts`]);
if (PHASE === 'baseline') assert.equal(sources.get(PHONE), original, 'Original application must be exact');
if (CONTROL) assert.notEqual(sources.get(PHONE), original, 'Original control must change executable source');
for (const file of [ENGINE, SAVE]) assert.equal(sources.get(file), git(['show', `${BASE}:${path.relative(ROOT, file).replaceAll('\\', '/')}`]));
for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
fs.writeFileSync(path.join(retained, 'soccerPhone.ts.original'), original);
const tmpRoot = path.join(ROOT, '.sim-control'); fs.mkdirSync(tmpRoot, { recursive: true });
const tmp = fs.mkdtempSync(path.join(tmpRoot, 'phone-isolation-'));
let outcome = {};
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({
    head: git(['rev-parse', 'HEAD']).trim(), base: BASE, phase: PHASE, arm,
    originalPhoneSha256: sha(original), effectivePhoneSha256: sha(CONTROL ? original : sources.get(PHONE)),
    sources: [...sources].map(([file, source]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
      beforeSha256: sha(source), afterSha256: sha(fs.readFileSync(file)) })), ...outcome,
  }, null, 2));
}
function resultsOnly(raw) {
  return Object.fromEntries(Object.entries(raw).map(([key, row]) => {
    const { inputAfter, ...held } = row; return [key, held];
  }));
}
try {
  const reportFile = path.join(retained, 'unit.json');
  assert(!fs.existsSync(reportFile), 'Never overwrite physical evidence'); receipt();
  const { build } = await import('esbuild');
  await build({ entryPoints: { engine: ENGINE, phone: PHONE, save: SAVE }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'original-phone-only', setup(b) {
      if (CONTROL) b.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === PHONE
        ? { contents: original, loader: 'ts', resolveDir: path.dirname(PHONE) } : undefined);
    } }] });
  const compiled = ['engine.mjs', 'phone.mjs', 'save.mjs'].map(file => {
    const bytes = fs.readFileSync(path.join(tmp, file)); fs.writeFileSync(path.join(retained, file), bytes);
    return { file, sha256: sha(bytes) };
  });
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', PHONE_ISOLATION_RAW: path.join(retained, 'raw-states.json'),
    ...Object.fromEntries(['engine', 'phone', 'save'].map(name => ['PHONE_ISOLATION_' + name.toUpperCase(), path.join(tmp, name + '.mjs').replaceAll('\\', '/')])) };
  const child = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST,
    '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile],
  { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (child.stdout || '') + (child.stderr || '');
  fs.writeFileSync(path.join(retained, 'output.log'), output); process.stdout.write(output);
  receipt({ compiled, exit: child.status, signal: child.signal, processError: child.error?.message || null });
  assert(!child.error && !child.signal && child.status !== null, 'Actual runner must complete');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|SIM_OFFLINE_BLOCK/i.test(output), 'Setup or transport failures earn no semantic credit');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1); assert.equal(report.numTotalTests, 7);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message);
  const cases = file.assertionResults, expected = PHASE === 'baseline' || CONTROL ? TARGETS : [];
  assert.deepEqual(cases.map(row => row.title).sort(), [...TARGETS.map(row => row.title), ...PRESERVED].sort());
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), expected.map(row => row.title).sort(), 'Only precise input-mutation faults qualify');
  for (const row of failed) {
    const tag = TARGETS.find(target => target.title === row.title).tag;
    assert.equal(row.failureMessages.length, 1);
    assert(row.failureMessages[0].startsWith('AssertionError: ' + tag) && row.failureMessages[0].includes('expected false to be true'));
  }
  assert.equal(report.numPassedTests, 7 - expected.length); assert.equal(report.numFailedTests, expected.length);
  assert.equal(child.status, expected.length ? 1 : 0); assert.equal(report.success, expected.length === 0);
  const rawFile = path.join(retained, 'raw-states.json'), raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.deepEqual(Object.keys(raw).sort(), [...RAW_KEYS].sort(), 'Every declared actual action must retain raw observations');
  for (const row of Object.values(raw)) assert(row.before && row.after && row.inputAfter && Array.isArray(row.draws));
  if (CONTROL || arm === 'restored') {
    const normal = JSON.parse(fs.readFileSync(path.join(OUT, 'units/normal/raw-states.json'), 'utf8'));
    assert.deepEqual(resultsOnly(raw), resultsOnly(normal), 'Every complete action input/output and RNG must stay identical');
    if (arm === 'restored') assert.deepEqual(raw, normal, 'Every restored raw observation must be exact');
  }
  for (const [file, source] of sources) assert.equal(fs.readFileSync(file, 'utf8'), source);
  receipt({ completed: cases.length, passed: report.numPassedTests, failed: report.numFailedTests,
    observations: Object.keys(raw).length, rawSha256: sha(fs.readFileSync(rawFile)), qualified: true });
  console.log(`Phone isolation ${arm}: 7 completed; ${report.numPassedTests} passed; ${report.numFailedTests} exact input-mutation faults; ${Object.keys(raw).length} full observations; setup faults 0.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error; }
finally { fs.rmSync(tmp, { recursive: true, force: true }); }
