/* Remote-only Manager inbox deadline proof. Complete source copies and raw
   outcomes are retained before a baseline or copied fault can qualify. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Use remote offline CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARENT = '1ed26406', TEST = 'src/test/clubManagerDecisionDeadline.test.ts';
const ENGINE = path.join(ROOT, 'src/lib/clubManager.ts');
const DECISIONS = path.join(ROOT, 'src/lib/clubManagerDecisions.ts');
const CONTROL = process.env.CM_DEADLINE_CONTROL || '';
const RED = process.env.CM_DEADLINE_EXPECT_RED === '1';
const PHASE = process.env.MANAGER_DEADLINE_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match baseline or fixed');
assert(['', 'late'].includes(CONTROL) && !(RED && CONTROL), 'Only the separate fixed late-source control is allowed');
const NAMES = [
  ...['board', 'press', 'morale', 'budget', 'decline'].map(meter => `manager deadline missing: saved ${meter} reply closes after actual kickoff`),
  ...['board', 'press', 'morale', 'budget', 'decline'].map(meter => `manager deadline preservation: ${meter} reply keeps its exact before-kickoff effect`),
  'manager deadline preservation: live appeal keeps its original expired outcome',
  'manager deadline preservation: live acceptBan keeps its original accepted outcome',
  'manager deadline preservation: before-kickoff appeal keeps its deterministic verdict',
  'manager deadline preservation: before-kickoff acceptBan keeps its original accepted outcome',
  'manager deadline preservation: missing card returns the same object',
  'manager deadline preservation: resolved card returns the same object',
  'manager deadline preservation: invalid before-kickoff choice returns the same object',
  'manager deadline preservation: invalid live choice returns the same object',
  'manager deadline preservation: real whistle expires the unanswered card without a desk benefit',
  'manager deadline preservation: a previously answered card stays consumed across actual kickoff and reloads',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const app = [ENGINE, DECISIONS, ...['src/lib/clubManagerMeters.ts', 'src/hooks/useClubManager.ts',
  'src/pages/ClubManager.tsx', 'src/components/club-manager/InboxCard.tsx'].map(file => path.join(ROOT, file))];
const files = [...app, path.join(ROOT, TEST), fileURLToPath(import.meta.url),
  path.join(ROOT, 'scripts/playClubManagerDecisionDeadline.mjs'), path.join(ROOT, '.github/workflows/manager-decision-deadline.yml')];
const sources = new Map(files.map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.MANAGER_DEADLINE_OUT ? path.resolve(process.env.MANAGER_DEADLINE_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'manager-decision-deadline-'));
const arm = CONTROL || PHASE, retained = path.join(OUT, arm);
fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace an existing proof arm');
for (const [file, contents] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), contents);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-decision-deadline-compiled-'));
const changed = new Map(sources), edits = [];
let outcome = {};
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Actual source Git receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim();
const parentAppHashes = app.map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  const row = { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)) };
  if (RED || file !== DECISIONS) assert.equal(row.candidateSha256, row.parentSha256, 'Only fixed Decisions may differ from the held parent app');
  return row;
});
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({
    file: path.relative(ROOT, file).replaceAll('\\', '/'), beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file)),
  }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({
    arm, sourceHead, parentAppRef: PARENT, parentAppHashes, sourceReceipts, actualSourceEdits: edits, ...outcome,
  }, null, 2) + '\n');
}
try {
  if (CONTROL) {
    const anchor = "  if (item.kind === 'situation' && career.live) {\n    return close('The next match has already kicked off, so the reply window closed. Nothing changed.');\n  }\n";
    const before = changed.get(DECISIONS);
    assert.equal(before.split(anchor).length - 1, 1, 'One actual deadline guard must exist before its control');
    const after = before.replace(anchor, '');
    assert.notEqual(after, before, 'Copied old-behavior source control must be effective');
    assert.equal(after.split(anchor).length - 1, 0, 'The copied fault must remove exactly the deadline guard');
    assert.equal(after.replace('  const effect = opt.effect;\n', anchor + '  const effect = opt.effect;\n'), before, 'Reinserting the guard must restore the complete source');
    changed.set(DECISIONS, after);
    edits.push({ kind: CONTROL, file: 'src/lib/clubManagerDecisions.ts', anchor, replacement: '',
      beforeSha256: sha(before), afterSha256: sha(after) });
    fs.writeFileSync(path.join(retained, 'clubManagerDecisions.ts.control'), after);
  }
  receipt();
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: ENGINE, decisions: DECISIONS }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'manager-deadline-actual-source', setup(build) {
      build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === DECISIONS && CONTROL
        ? { contents: changed.get(DECISIONS), loader: 'ts', resolveDir: path.dirname(DECISIONS) } : undefined);
    } }] });
  const compiled = ['engine.mjs', 'decisions.mjs'];
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1',
    CM_DEADLINE_ENGINE: path.join(tmp, 'engine.mjs').replaceAll('\\', '/'),
    CM_DEADLINE_DECISIONS: path.join(tmp, 'decisions.mjs').replaceAll('\\', '/') };
  const reportFile = path.join(tmp, 'unit.json'), runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
  assert(fs.existsSync(runner), 'Locked remote unit runner must be installed');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose',
    '--reporter=json', `--outputFile.json=${reportFile}`], { cwd: ROOT, env, encoding: 'utf8',
    timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  receipt({ exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null });
  assert(!result.error && result.status !== null && !result.signal, 'The actual unit child must finish inside its bound');
  assert(!SETUP.test(output), 'Setup and unhandled errors cannot earn outcome credit');
  assert(fs.existsSync(reportFile), 'Complete actual unit report must exist');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'The exact unit file must load without a file error');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(row => row.title).sort(), [...NAMES].sort(), 'All twenty exact outcome names must complete');
  assert.equal(report.numTotalTests, 20); assert.equal(report.numPendingTests, 0);
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)), 'Skipped and todo cases cannot earn credit');
  const expected = RED || CONTROL ? NAMES.slice(0, 5) : [];
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort(), 'Only exact intended late-answer failures may qualify');
  for (const row of failed) assert(row.failureMessages.length > 0 && row.failureMessages.every(message =>
    /^AssertionError:.*manager situation deadline allowed a reply after kickoff.*expected false to be true/s.test(message)),
    'Every intended failure must have the exact Boolean deadline cause');
  assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 20 - expected.length);
  assert.equal(result.status, expected.length ? 1 : 0, 'Actual child exit must match the complete outcome count');
  for (const [file, before] of sources) assert.equal(fs.readFileSync(file, 'utf8'), before, 'Actual app and proof source bytes must stay held');
  assert.equal(edits.length, CONTROL ? 1 : 0);
  receipt({ completedNames: cases.map(row => row.title), passed: report.numPassedTests, intendedFailures: expected.length });
  console.log(`Manager deadline: one actual unit file, all20 named outcomes, ${report.numPassedTests} passes and ${expected.length} exact intended faults; childexit${result.status}.`);
  console.log(`Complete raw outcomes/log/source retained; ${files.length} source holds, ${app.length} parent bindings and two compiled leaves; source edits${edits.length}.`);
  if (CONTROL) console.log(`Effective actual-source late control: ${edits[0].beforeSha256} -> ${edits[0].afterSha256}; complete inverse held.`);
  console.log(`simClubManagerDecisionDeadline ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

