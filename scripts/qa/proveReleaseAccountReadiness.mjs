/* Persistent account-test readiness only. Production measurements belong to the separately reviewed 019 paired run. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Children retain the offline preload');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.ACCOUNT_READINESS_OUT;
assert(OUT && path.isAbsolute(OUT), 'Absolute ACCOUNT_READINESS_OUT required');
const BASE = '0199183dd6da36e2bda7a748eefa08a58b954184', I_BASE = '67ec99568cb67c0d1bf287bef2629b6d35def549';
const QUALIFIED = '27088bc0a618e650858cd6c588eb6d3f763a6e04';
const OLD = 'src/test/authModalFocus.test.tsx', SELF = 'scripts/qa/proveReleaseAccountReadiness.mjs', WORKFLOW = '.github/workflows/release-account-readiness.yml';
const HARNESS = 'scripts/simAuthModalFocus.mjs';
const INSERTED = "  await screen.findByRole('textbox', { name: 'Email' });\n";
const PRODUCTS = ['src/components/layout/Header.tsx', 'src/pages/Index.tsx', 'src/components/game/GameNavbar.tsx', 'src/components/auth/AuthModal.tsx', 'src/components/auth/AccountDialogOnDemand.tsx'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
function git(args) { const result = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd: ROOT, timeout: 30000, maxBuffer: 64 * 1024 * 1024 }); assert(!result.error && !result.signal && result.status === 0, 'Actual Git operation: ' + args.join(' ')); return result.stdout; }
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
function receipt(folder, file) { const bytes = fs.readFileSync(file); return { file: path.relative(folder, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function admission() {
  const head = git(['rev-parse', 'HEAD']).toString().trim();
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Committed clean source');
  git(['merge-base', '--is-ancestor', BASE, head]);
  const changes = git(['diff', '--name-only', BASE, head, '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changes, [OLD, SELF, WORKFLOW].sort(), 'Only the persistent readiness await and two new QA leaves differ from019');
  for (const file of [OLD, SELF, WORKFLOW]) assert.deepEqual(read(file), git(['show', head + ':' + file]), 'Exact committed source: ' + file);
  const original = git(['show', BASE + ':' + OLD]), observed = read(OLD);
  assert.deepEqual(original, git(['show', I_BASE + ':' + OLD]), '019 original test is the exact I test');
  assert.deepEqual(observed, git(['show', QUALIFIED + ':' + OLD]), 'Persistent test is the exact qualified270 one-await body');
  assert.equal(observed.toString().split(INSERTED).length, 2, 'Unique inserted readiness await');
  assert.deepEqual(Buffer.from(observed.toString().replace(INSERTED, '')), original, 'Whole one-span inverse equals019 and67');
  assert.deepEqual(read(HARNESS), git(['show', BASE + ':' + HARNESS]), 'Existing auth method is immutable');
  const patch = git(['diff', '--binary', '--full-index', I_BASE, head, '--', ...PRODUCTS]);
  assert.equal(patch.length, 7555); assert.equal(sha(patch), '12b7af2a081790bbeac7a7e2ad7ce178f8ab9a2035e6a87e41fbd01661d44181', 'Five production leaves remain the exact paired019 product');
  return { head, base: BASE, qualifiedTestRef: QUALIFIED, originalTestSha256: sha(original), persistentTestSha256: sha(observed), exactOneSpanInverse: true, productPatch: { bytes: patch.length, sha256: sha(patch) }, priorPairedMeasurement: { source: BASE, run: '39009004707', job: '117327279351', outcome: 'Not inferred. Actual019 paired artifact must be reviewed separately.' } };
}
const binding = admission();
fs.mkdirSync(OUT, { recursive: true });
if (process.argv[2] === 'admission') { assert.equal(process.argv.length, 3); write(path.join(OUT, 'source-admission.json'), binding); console.log('Exact019 production and persistent qualified270 test admitted. No paired-run outcome inferred.'); }
else {
  assert.equal(process.argv.length, 2);
  const folder = path.join(OUT, 'proof'); assert(!fs.existsSync(folder), 'Never overwrite readiness evidence'); fs.mkdirSync(folder);
  const before = tracked(); write(path.join(folder, 'source.before.json'), before);
  fs.writeFileSync(path.join(folder, 'test.original019.tsx'), git(['show', BASE + ':' + OLD]));
  fs.writeFileSync(path.join(folder, 'test.persistent.tsx'), read(OLD));
  const report = { status: 'running', qualified: false, ready: false, ...binding, persistentTest: true, temporaryTestMutation: false, checks: [], sourceHeld: false, limits: ['Only actual app types and existing eight auth cases with both existing controls are qualified here.', 'Build, served browser and unchanged route-budget evidence belongs only to the actual019 paired run if it passed and is physically reviewed.', 'This is a declared test/method successor, not a docs-only 019 successor or full-suite/live qualification.'] };
  const checkpoint = () => write(path.join(folder, 'report.json'), report); checkpoint();
  try {
    for (const control of ['', 'nofocus', 'accountonly']) {
      const name = control || 'normal', args = [HARNESS], transport = path.join(folder, name + '.transport');
      const run = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, AUTH_MODAL_FOCUS_CONTROL: control, SIM_OFFLINE_RECEIPT: transport, NO_COLOR: '1', FORCE_COLOR: '0' }, encoding: 'utf8', timeout: 150000, maxBuffer: 64 * 1024 * 1024 });
      const stdoutFile = path.join(folder, name + '.stdout.log'), stderrFile = path.join(folder, name + '.stderr.log');
      fs.writeFileSync(stdoutFile, run.stdout || ''); fs.writeFileSync(stderrFile, run.stderr || '');
      const row = { name, args, exit: run.status, signal: run.signal, error: run.error?.message || null, stdout: receipt(folder, stdoutFile), stderr: receipt(folder, stderrFile), qualified: false };
      report.checks.push(row); checkpoint(); process.stdout.write(run.stdout || ''); process.stderr.write(run.stderr || '');
      assert(!run.error && !run.signal && run.status === 0, 'Existing method completed and classified its actual child: ' + name);
      const output = (run.stdout || '') + (run.stderr || '');
      assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Cannot find module|SIM_OFFLINE_BLOCK/i.test(output), 'Setup or transport failures cannot qualify');
      assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No ordinary auth transport intent');
      const expected = control === 'nofocus' ? ['6 failed', '2 passed', 'Expected element with focus', 'simAuthModalFocus: six exact-opener cases rejected removed focus return; form trap and guest copy still passed.'] : control === 'accountonly' ? ['1 failed', '7 passed', 'only count once you have an account', 'simAuthModalFocus: guest scoring disclosure rejected the account-only copy; seven focus and form cases still passed.'] : ['8 passed', 'simAuthModalFocus: eight real-dialog checks passed for login, signup, close, Escape, exact opener, tab switch, form trap and guest disclosure.'];
      for (const text of expected) assert(output.includes(text), 'Actual expected existing auth outcome: ' + name + ':' + text);
      assert(!/\b(?:skipped|todo)\b/i.test(output), 'Every declared auth case completes');
      assert.deepEqual(tracked(), before, 'Every current source body held after ' + name);
      Object.assign(row, { qualified: true, completed: 8, passed: control === 'nofocus' ? 2 : control === 'accountonly' ? 7 : 8, preciseControlledFaults: control === 'nofocus' ? 6 : control === 'accountonly' ? 1 : 0 }); checkpoint();
    }
    report.status = 'complete'; report.qualified = true;
  } catch (error) { report.status = 'failed'; report.qualified = false; report.error = error?.stack || String(error); throw error; }
  finally { const after = tracked(); write(path.join(folder, 'source.after.json'), after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); if (!report.sourceHeld) { report.status = 'failed'; report.qualified = false; } checkpoint(); assert.deepEqual(after, before, 'Persistent test and every other source body remain unchanged'); }
  write(path.join(folder, 'summary.json'), report);
  console.log('Persistent account readiness:8 normal;existing nofocus6 faults+2 preserves;accountonly1 fault+7 preserves;all source held.019 production measurements remain separate.');
}