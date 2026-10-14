/* Completed AI transfer ownership proof. Compile and run only in remote offline CI. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'AI ownership proof requires remote offline CI.');
assert(process.env.CM_AI_OWN_EXPECT_RED === '1', 'This proof currently qualifies the explicit unchanged-source baseline only.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = '082fc2774c8aa9f919c14efa33bfc3fbfc599597';
const CORE = 'src/lib/clubManager.ts', WORLD = 'src/lib/clubManagerWorldRoster.ts';
const TEST = 'src/test/managerAiOwnership.test.ts';
const HELD = [CORE, WORLD, 'src/lib/clubManagerEras.ts', 'src/hooks/useClubManager.ts',
  'src/components/club-manager/TransferScreen.tsx', 'src/lib/clubManagerWorldRoster.test.ts'];
const FILES = [...HELD, TEST, 'scripts/simManagerAiOwnership.mjs', '.github/workflows/manager-ai-ownership.yml'];
const NAMES = [
  'missing actual makeOffer hijack records its buyer',
  'missing actual walkAway records its rival buyer',
  'missing actual January window records its completed buyers',
  'missing actual fresh constructor records its completed buyers after seed',
  'preservation unclosed rival offer keeps ownership and original news',
  'preservation no-rival walkAway keeps ownership without draws',
  'preservation actual manual purchase keeps complete recorded identity',
  'preservation actual unseeded world keeps legacy ownership behavior',
];
const CAUSES = ['actual makeOffer AI buyer ownership is missing', 'actual walkAway AI buyer ownership is missing',
  'actual January AI buyer ownership is missing', 'actual fresh-constructor AI buyer ownership is missing'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = new Map(FILES.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const OUT = process.env.CM_AI_OWN_OUT ? path.resolve(process.env.CM_AI_OWN_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'manager-ai-ownership-'));
assert(OUT !== ROOT && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep));
fs.mkdirSync(OUT, { recursive: true });
assert(!fs.existsSync(path.join(OUT, 'source.json')), 'Refuse to replace AI ownership evidence.');
for (const [file, bytes] of sources) fs.writeFileSync(path.join(OUT, path.basename(file) + '.before'), bytes);
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Whole parent Git source must finish.');
  return child.stdout;
}
const head = git(['rev-parse', 'HEAD']).toString('utf8').trim();
const bindings = HELD.map(file => {
  const bytes = git(['show', PARENT + ':' + file]);
  fs.writeFileSync(path.join(OUT, path.basename(file) + '.parent'), bytes);
  return { file, parentSha256: sha(bytes), candidateSha256: sha(sources.get(file)) };
});
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/manager-ai-ownership-'));
let outcome = {};
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  fs.writeFileSync(path.join(OUT, 'source.json'), JSON.stringify({
    parentRef: PARENT, head, phase: 'baseline', ...outcome, bindings,
    sources: [...sources].map(([file, bytes]) => ({ file, bytes: bytes.length,
      beforeSha256: sha(bytes), afterSha256: sha(fs.readFileSync(path.join(ROOT, file))) })),
  }, null, 2) + '\n');
}
try {
  receipt();
  for (const row of bindings) assert.equal(row.candidateSha256, row.parentSha256, row.file + ': complete held source differs.');
  const esbuild = await import('esbuild');
  const build = await esbuild.build({ entryPoints: { engine: path.join(ROOT, CORE), world: path.join(ROOT, WORLD) },
    outdir: tmp, bundle: true, splitting: true, format: 'esm', platform: 'node',
    outExtension: { '.js': '.mjs' }, alias: { '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'error' });
  fs.writeFileSync(path.join(OUT, 'metafile.json'), JSON.stringify(build.metafile, null, 2) + '\n');
  const inputs = Object.keys(build.metafile.inputs).sort().map(file => {
    const filename = path.resolve(ROOT, file), relative = path.relative(ROOT, filename);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'Actual graph input must stay in the checkout.');
    const bytes = fs.readFileSync(filename), retained = path.join(OUT, 'inputs', relative);
    fs.mkdirSync(path.dirname(retained), { recursive: true }); fs.writeFileSync(retained, bytes);
    return { file: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) };
  });
  const compiled = fs.readdirSync(tmp).filter(file => file.endsWith('.mjs')).sort();
  assert(compiled.includes('engine.mjs') && compiled.includes('world.mjs'));
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(OUT, file));
  receipt({ inputs, compiled: compiled.map(file => ({ file, bytes: fs.statSync(path.join(tmp, file)).size,
    sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const reportFile = path.join(tmp, 'unit.json');
  const child = spawnSync(process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile],
    { cwd: ROOT, env: { ...process.env, CM_AI_E: path.join(tmp, 'engine.mjs'), CM_AI_W: path.join(tmp, 'world.mjs'),
      FORCE_COLOR: '0', NO_COLOR: '1' }, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const output = (child.stdout || '') + (child.stderr || '');
  fs.writeFileSync(path.join(OUT, 'unit.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(OUT, 'unit.json'));
  receipt({ child: { status: child.status, signal: child.signal, error: child.error?.message || null } });
  const rows = output.split('\n').filter(line => line.startsWith('CM_AI_OWN_RECEIPT:'))
    .map(line => JSON.parse(line.slice('CM_AI_OWN_RECEIPT:'.length)));
  fs.writeFileSync(path.join(OUT, 'actual-api-receipts.json'), JSON.stringify(rows, null, 2) + '\n');
  assert(!child.error && !child.signal && child.status === 1 && fs.existsSync(reportFile), 'Actual baseline child must complete with its owned faults.');
  assert(!/Unhandled (?:Errors?|Rejection)|Uncaught Exception|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError|ReferenceError|TypeError/.test(output),
    'No setup, missing-module or unrelated error credit.');
  const raw = JSON.parse(fs.readFileSync(reportFile, 'utf8')), cases = raw.testResults.flatMap(file => file.assertionResults);
  assert.equal(raw.testResults.length, 1); assert(!raw.testResults[0].message);
  assert.equal(raw.numTotalTests, 8); assert.equal(raw.numPendingTests, 0);
  assert.deepEqual(cases.map(row => row.title).sort(), [...NAMES].sort());
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), NAMES.slice(0, 4).sort());
  for (const row of failed) {
    const cause = CAUSES[NAMES.indexOf(row.title)];
    assert(row.failureMessages.length && row.failureMessages.every(message =>
      message.startsWith('AssertionError: ' + cause + ': expected false to be true')), 'Only the four exact recorded ownership Booleans qualify.');
  }
  assert.equal(raw.numFailedTests, 4); assert.equal(raw.numPassedTests, 4);
  assert(rows.length > 0 && NAMES.every(name => rows.some(row => row.case === name)), 'Every actual case needs its original pre-assertion API receipts.');
  for (const row of rows) {
    assert(NAMES.includes(row.case) && typeof row.label === 'string' && row.clock === '2026-10-14T00:00:00.000Z' && row.error === null);
    assert(Array.isArray(row.draws) && row.consumed === row.draws.length && Number.isSafeInteger(row.provisioned) && row.provisioned >= row.consumed);
    assert(['exact', 'bounded-repeat-0.6'].includes(row.policy));
    assert(row.draws.every((draw, index) => draw.ordinal === index + 1 && Number.isFinite(draw.value) && draw.value >= 0 && draw.value < 1));
    if (row.policy === 'exact') assert.equal(row.consumed, row.provisioned);
    else assert(row.draws.every(draw => draw.value === 0.6));
  }
  for (const [file, bytes] of sources) assert(fs.readFileSync(path.join(ROOT, file)).equals(bytes), 'Original input changed: ' + file);
  for (const row of inputs) assert.equal(sha(fs.readFileSync(path.join(ROOT, row.file))), row.sha256, 'Actual graph input changed: ' + row.file);
  receipt({ status: 'complete', passed: 4, failed: 4, actualApiReceipts: rows.length });
  console.log('Actual AI ownership baseline: eight named cases, four exact owned Boolean faults, four preservation passes, pending0.');
  console.log('Every actual action/read/save receipt and its complete consumed finite inputs is retained before assertions.');
  console.log('Compiled actual Core/world shared graph held; no product change, fixture injection, browser, balance or live claim.');
  console.log('simManagerAiOwnership explicit baseline: green.');
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
