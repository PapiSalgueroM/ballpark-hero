/* Remote-only outcome proof for existing queued Life choices. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Popularity proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const TEST = 'src/test/careerPendingPopularityGates.test.ts';
const LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const SELF = fileURLToPath(import.meta.url);
const PHASE = process.env.SC_PENDING_POPULARITY_PHASE || 'fixed';
const CONTROL = process.env.SC_PENDING_POPULARITY_CONTROL || '';
assert(['baseline', 'fixed'].includes(PHASE), 'Unknown popularity phase');
assert(['', 'original'].includes(CONTROL), 'Unknown actual-source control');
assert(!(PHASE === 'baseline' && CONTROL), 'Baseline and original control are separate');
const IDS = [225, 234, 241, 243, 244, 248, 253, 256, 257, 268, 269];
const OWNED = IDS.map(id => `pending popularity missing: ${id} keeps offered choices after a popularity drop and reload`);
const PRESERVED = [
  'pending popularity preservation: fresh offers keep every original threshold',
  'pending popularity preservation: an unrelated pending card never unlocks a fresh offer',
  'pending popularity preservation: queued cards retain age relationship and story guards',
  'pending popularity preservation: existing wax statue queue still resolves both choices',
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
const arm = CONTROL || (PHASE === 'baseline' ? 'baseline' : process.env.SC_PENDING_POPULARITY_RESTORED === '1' ? 'restored' : 'normal');
const OUT = process.env.SC_PENDING_POPULARITY_OUT ? path.resolve(process.env.SC_PENDING_POPULARITY_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'pending-popularity-proof-'));
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pending-popularity-compiled-'));
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
    plugins: [{ name: 'actual-popularity-source', setup(build) {
      if (CONTROL) build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === LIFE
        ? { contents: original, loader: 'ts', resolveDir: path.dirname(LIFE) } : undefined);
    } }] });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1',
    SC_POPULARITY_ENGINE: path.join(tmp, 'engine.mjs').replaceAll('\\', '/'),
    SC_POPULARITY_LIFE: path.join(tmp, 'life.mjs').replaceAll('\\', '/'),
    SC_POPULARITY_SAVE: path.join(tmp, 'save.mjs').replaceAll('\\', '/') };
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
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...PRESERVED].sort(), 'All fifteen exact cases must run');
  assert.equal(report.numTotalTests, 15); assert.equal(report.numPendingTests, 0);
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'Skipped cases cannot earn credit');
  const expected = PHASE === 'baseline' || CONTROL ? OWNED : [], failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), [...expected].sort(), 'Only exact missing callbacks may qualify');
  for (const test of failed) {
    const id = IDS[OWNED.indexOf(test.title)];
    const cause = new RegExp(`^AssertionError:.*pending popularity ${id} callback missing after reload.*expected false to be true`, 's');
    assert(test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message)), 'Every intended failure must have its exact callback cause');
  }
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 15 - expected.length);
  assert.equal(result.status, expected.length ? 1 : 0, 'Child exit must match exact completed outcomes');
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual source bytes must remain held');
  receipt({ completed: cases.length, passed: report.numPassedTests, failed: report.numFailedTests, qualified: true });
  console.log(`Popularity ${arm}: ${cases.length} completed; ${report.numPassedTests} passed; ${report.numFailedTests} exact missing-callback failures; setup faults 0.`);
  console.log(`Source held: ${sources.size} exact leaves; app base ${BASE}; complete reports and source copies retained.`);
} catch (error) {
  receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
