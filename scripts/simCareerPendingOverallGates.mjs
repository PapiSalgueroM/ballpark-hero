/* Remote-only outcome proof for existing queued Life choices. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Overall proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SC_PENDING_OVERALL_BASE || '63573c16abf61b31bbdb9c0117631e99e4538c01';
const TEST = 'src/test/careerPendingOverallGates.test.ts';
const LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const SELF = fileURLToPath(import.meta.url);
const PHASE = process.env.SC_PENDING_OVERALL_PHASE || 'fixed';
const CONTROL = process.env.SC_PENDING_OVERALL_CONTROL || '';
assert(['baseline', 'fixed'].includes(PHASE), 'Unknown overall phase');
assert(['', 'original'].includes(CONTROL), 'Unknown actual-source control');
assert(!(PHASE === 'baseline' && CONTROL), 'Baseline and original control are separate');
const IDS = [232, 249];
const OWNED = IDS.map(id => `pending overall missing: ${id} keeps offered choices after a stat loss and reload`);
const PRESERVED = [
  'pending overall preservation: fresh offers keep both original thresholds',
  'pending overall preservation: unrelated queued cards never unlock a fresh offer',
  'pending overall preservation: original age guards still hold with pending metadata',
  'pending overall preservation: saved choices at the threshold keep all five original outcomes',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const files = [ENGINE, LIFE, SAVE, path.join(ROOT, 'src/lib/careerChanceWheel.ts'),
  path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts'), path.join(ROOT, TEST), SELF];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Source Git receipt must finish'); return result.stdout;
}
const head = git(['rev-parse', 'HEAD']).trim(), original = git(['show', `${BASE}:src/lib/soccerCareerLife.ts`]);
const arm = CONTROL || (PHASE === 'baseline' ? 'baseline' : process.env.SC_PENDING_OVERALL_RESTORED === '1' ? 'restored' : 'normal');
const OUT = process.env.SC_PENDING_OVERALL_OUT ? path.resolve(process.env.SC_PENDING_OVERALL_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'pending-overall-proof-'));
const retained = path.join(OUT, 'units', arm);
fs.mkdirSync(retained, { recursive: true });
for (const [file, source] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), source);
fs.writeFileSync(path.join(retained, 'soccerCareerLife.ts.original'), original);
const appBindings = [ENGINE, SAVE, files[3], files[4]].map(file => {
  const relative = path.relative(ROOT, file).replaceAll('\\', '/'), parent = git(['show', `${BASE}:${relative}`]);
  assert.equal(sha(sources.get(file)), sha(parent), `Unchanged app source must match base: ${relative}`);
  return { file: relative, sha256: sha(parent) };
});
if (PHASE === 'baseline') assert.equal(sources.get(LIFE), original, 'Baseline Life must be unchanged');
if (CONTROL) assert.notEqual(sources.get(LIFE), original, 'Original control must actually replace changed product source');
const tmpRoot = path.join(ROOT, '.sim-control');
fs.mkdirSync(tmpRoot, { recursive: true });
const tmp = fs.mkdtempSync(path.join(tmpRoot, 'pending-overall-compiled-'));
assert.equal(path.dirname(tmpRoot), ROOT, 'Compiled parent must stay inside the actual project');
assert.equal(path.dirname(tmp), tmpRoot, 'Compiled cleanup target must stay inside its project parent');
let outcome = {};
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file, 'utf8')) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ head, base: BASE, phase: PHASE, arm,
    appBindings, sourceReceipts, currentLifeSha256: sha(sources.get(LIFE)), originalLifeSha256: sha(original),
    effectiveLifeSha256: sha(CONTROL ? original : sources.get(LIFE)), ...outcome }, null, 2) + '\n');
}
try {
  receipt();
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, save: SAVE }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'actual-overall-source', setup(build) {
      if (CONTROL) build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === LIFE
        ? { contents: original, loader: 'ts', resolveDir: path.dirname(LIFE) } : undefined);
    } }] });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1',
    SC_OVERALL_ENGINE: path.join(tmp, 'engine.mjs').replaceAll('\\', '/'),
    SC_OVERALL_LIFE: path.join(tmp, 'life.mjs').replaceAll('\\', '/'),
    SC_OVERALL_SAVE: path.join(tmp, 'save.mjs').replaceAll('\\', '/'), SC_OVERALL_RAW: path.join(retained, 'raw.json') };
  const compiled = ['engine.mjs', 'life.mjs', 'save.mjs'].map(file => {
    const bytes = fs.readFileSync(path.join(tmp, file)); fs.writeFileSync(path.join(retained, file), bytes);
    return { file, sha256: sha(bytes) };
  });
  const reportFile = path.join(retained, 'unit.json');
  const result = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST,
    '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
  { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(retained, 'output.log'), output); process.stdout.write(output);
  receipt({ compiled, exitCode: result.status, processError: result.error?.message || null });
  assert(!result.error && result.status !== null, 'Actual test runner must finish');
  assert(!SETUP.test(output), 'Setup faults cannot qualify as expected failures');
  assert(fs.existsSync(reportFile), 'Physical completed test report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Exact test file must load without file errors');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...PRESERVED].sort(), 'All six exact cases must run');
  assert.equal(report.numTotalTests, 6); assert.equal(report.numPendingTests, 0);
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'Skipped cases cannot earn credit');
  const expected = PHASE === 'baseline' || CONTROL ? OWNED : [], failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), [...expected].sort(), 'Only exact missing callbacks may qualify');
  for (const test of failed) {
    const id = IDS[OWNED.indexOf(test.title)];
    const cause = new RegExp(`^AssertionError:.*pending overall ${id} callback missing after reload.*expected false to be true`, 's');
    assert(test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message)), 'Every intended failure must have its exact callback cause');
  }
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 6 - expected.length);
  assert.equal(result.status, expected.length ? 1 : 0, 'Child exit must match exact completed outcomes');
  const rawFile = path.join(retained, 'raw.json'), rawBytes = fs.readFileSync(rawFile);
  const raw = JSON.parse(rawBytes).observations;
  assert.equal(raw.length, 24, 'All full physical observations completed before qualification');
  for (const [kind, count] of Object.entries({ predecessor: 4, target: 10, fresh: 4, unrelated: 2, age: 4 }))
    assert.equal(raw.filter(row => row.kind === kind).length, count, 'Exact raw group: ' + kind);
  for (const row of raw) {
    assert.deepEqual(row.inputAfter, row.before, 'Complete previous input is held');
    if (row.kind !== 'target') continue;
    assert.deepEqual(row.savedInputAfter, row.savedBefore, 'Complete saved previous input is held');
    const missing = expected.length > 0 && row.scenario === 'below';
    assert.equal(row.callbackAvailable, !missing, 'Actual callback availability matches causal arm');
    if (!missing) {
      assert.deepEqual(row.reloadedAfter, row.liveAfter, 'Full live/reloaded outcome parity');
      assert.deepEqual(row.reloadDraws, row.liveDraws, 'Full live/reloaded RNG parity');
    } else {
      const skipped = structuredClone(row.savedBefore);
      skipped.lastEventId = row.id; skipped.pendingEvents = skipped.pendingEvents.slice(1); skipped.phase = 'random_events';
      const card = row.savedBefore.pendingEvents[0];
      assert(card, 'The skipped target metadata must exist');
      delete skipped.eventLastFired[card.story ? `story:${card.story}` : String(row.id)];
      assert.deepEqual(row.reloadedAfter, skipped, 'Baseline is exactly the existing skipped-card behavior');
    }
  }
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual source bytes must remain held');
  receipt({ completed: cases.length, passed: report.numPassedTests, failed: report.numFailedTests,
    raw: { file: 'raw.json', bytes: rawBytes.length, sha256: sha(rawBytes), observations: raw.length }, qualified: true });
  console.log(`Overall ${arm}: ${cases.length} completed; ${report.numPassedTests} passed; ${report.numFailedTests} exact missing-callback failures; setup faults 0.`);
  console.log(`Source held: ${sources.size} exact leaves; app base ${BASE}; complete reports and source copies retained.`);
} catch (error) {
  receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
