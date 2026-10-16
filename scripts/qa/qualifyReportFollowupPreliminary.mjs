/* Remote preliminary source/ref/type/unit evidence. No built-page or release claim. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline proof only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.REPORT_PRELIM_OUT || '');
assert(process.env.REPORT_PRELIM_OUT && path.isAbsolute(process.env.REPORT_PRELIM_OUT));
assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never overwrite a previous proof');
fs.mkdirSync(OUT, { recursive: true });
const BASE = '402fa4562fec28c38c42130036c65e884a25a5fb';
const PREPARED = '204f97ce467f427e8b4c4f1e56bcc6a2da85d36a';
const LIFE = 'src/lib/soccerCareerLife.ts', PHONE = 'src/lib/soccerPhone.ts';
const TRANSFER = 'src/components/club-manager/TransferScreen.tsx';
const SELF = 'scripts/qa/qualifyReportFollowupPreliminary.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const save = (file, value) => { const target = path.join(OUT, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const json = (file, value) => save(file, JSON.stringify(value, null, 2) + '\n');
function git(args, extra = {}) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 64 * 1024 * 1024, ...extra });
  assert(!child.error && !child.signal && child.status === 0, 'Source Git operation: ' + args.join(' '));
  return child.stdout;
}
const HEAD = git(['rev-parse', 'HEAD']).trim();
const report = { head: HEAD, baseline: BASE, prepared: PREPARED, scope: 'source/reference/type/unit only; actual BIH rebind pending', refs: [], runs: [], qualified: false };
const checkpoint = () => json('report.json', report);
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(); json('tracked.before.json', before); checkpoint();
const specs = [
  { id: '284', file: TRANSFER, from: 'a758fcec4392c57c639aa54cda840810c8e44663', to: '96ad681bd81e6eeb88cdea46f69051cd8db37dad', hunks: 5 },
  { id: '296', file: TRANSFER, from: '7c4838670253f2ca95af2adf14c2397d66b4f7c9', to: 'e74deacfc1987fffa6894d74bfd8123bebb4c2fa', hunks: 4 },
  { id: '286', file: LIFE, from: '44fb161111c722d028f0c9e46771d008b74ca742', to: '320cd84554207b840c85543a190eaeaa8c10c2eb', hunks: 11 },
  { id: '302', file: LIFE, from: '75abee825b73c34b4a7a6d6852de1417a20cc8aa', to: '616ddc0b44666799676a60405181fdeb33112fa4', hunks: 4 },
  { id: '303', file: LIFE, from: '63573c16abf61b31bbdb9c0117631e99e4538c01', to: '719aace3a414fe6fe01d34528cb26c88221789a8', hunks: 2 },
  { id: '289', file: PHONE, from: 'd4f2c6f688d656205722ba52bbdb33f03490966a', to: '09604883d13b59bb718d0c6a5a8cb8cae85b6894', hunks: 1 },
  { id: '297', file: PHONE, from: 'c40ea5d85734915f7f0d9a5a155615267640eb80', to: '1c4d27d66092091aee0c2086616545d44725e81a', hunks: 1 },
];
function hunks(patch) {
  const out = []; let row;
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@ ')) { row = { old: '', next: '' }; out.push(row); continue; }
    if (!row) continue;
    if (line.startsWith(' ')) { row.old += line.slice(1) + '\n'; row.next += line.slice(1) + '\n'; }
    else if (line.startsWith('-')) row.old += line.slice(1) + '\n';
    else if (line.startsWith('+')) row.next += line.slice(1) + '\n';
    else assert(line === '', 'Unsupported patch syntax');
  }
  return out;
}
function replaceOnce(text, from, to) {
  assert(from.length > 0 && text.split(from).length === 2, 'Every complete hunk anchor must occur exactly once');
  return text.replace(from, () => to);
}
function inverse(spec, source) {
  return spec.anchors.reduce((text, anchor) => replaceOnce(text, anchor.next, anchor.old), source);
}
function synthetic(spec, candidate) {
  const index = path.join(OUT, 'indexes', spec.id); fs.mkdirSync(path.dirname(index), { recursive: true });
  const env = { ...process.env, GIT_INDEX_FILE: index, GIT_AUTHOR_NAME: 'Preliminary source proof', GIT_AUTHOR_EMAIL: 'proof@localhost', GIT_COMMITTER_NAME: 'Preliminary source proof', GIT_COMMITTER_EMAIL: 'proof@localhost', GIT_AUTHOR_DATE: '2026-10-16T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-16T00:00:00Z' };
  const blob = git(['hash-object', '-w', '--stdin'], { input: candidate }).trim();
  git(['read-tree', HEAD], { env }); git(['update-index', '--cacheinfo', '100644', blob, spec.file], { env });
  const tree = git(['write-tree'], { env }).trim();
  const ref = git(['commit-tree', tree, '-p', HEAD, '-m', 'Proof-only final-tree inverse ' + spec.id], { env }).trim();
  assert.deepEqual(git(['diff', '--name-only', HEAD, ref]).trim().split('\n'), [spec.file]);
  assert.equal(git(['show', ref + ':' + spec.file]), candidate);
  save(`refs/${spec.id}/commit.txt`, git(['cat-file', 'commit', ref]));
  save(`refs/${spec.id}/tree.txt`, git(['ls-tree', '-r', ref]));
  return { ref, tree, blob };
}
const prefixes = ['SC_PENDING_POPULARITY', 'SC_PENDING_MONEY', 'SC_PENDING_OVERALL', 'PHONE_BUDGET', 'PHONE_ISOLATION'];
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !prefixes.some(prefix => key.startsWith(prefix))));
function run(id, args, extraEnv = {}) {
  const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...cleanEnv(), FORCE_COLOR: '0', NO_COLOR: '1', ...extraEnv }, encoding: 'utf8', timeout: 360000, maxBuffer: 64 * 1024 * 1024 });
  const stdout = child.stdout || '', stderr = child.stderr || '';
  save(`runs/${id}.stdout.log`, stdout); save(`runs/${id}.stderr.log`, stderr);
  const row = { id, args, exit: child.status, signal: child.signal, error: child.error?.message || null, stdoutSha256: sha(stdout), stderrSha256: sha(stderr) };
  report.runs.push(row); checkpoint(); process.stdout.write(stdout); process.stderr.write(stderr);
  assert(!child.error && !child.signal && child.status !== null, 'Child must complete: ' + id);
  return row;
}
const transferTargets = [
  'own history shows saved buys sales loans and exact counterparties', 'own history filters before the fifty-row limit',
  'own history keeps both sorts and returns to all clubs', 'own history follows the current club when the same log is rerendered',
  'own history explains an empty recorded list without claiming a complete history', 'history explains that older moves may no longer be recorded',
];
const transferPreserves = ['all clubs preserves the existing newest-first default', 'all clubs preserves biggest-fee ordering and saved gross fees',
  'all clubs keeps its empty-state wording when no transfers are recorded', 'browsing preserves the net season ledger saved log callbacks and random stream'];
function transferUnits(arm) {
  const unitFile = path.join(OUT, 'transfer', arm + '.json');
  const files = ['src/test/managerOwnTransferLog.test.tsx'];
  if (arm === 'restored') files.push('src/test/clubManagerDealMoment.test.tsx');
  const row = run('transfer-' + arm, ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile]);
  const data = JSON.parse(fs.readFileSync(unitFile)), own = data.testResults.find(file => file.name.replaceAll('\\', '/').endsWith('/' + files[0]));
  assert(own && !own.message); assert.equal(data.testResults.length, files.length);
  assert.deepEqual(own.assertionResults.map(test => test.title).sort(), [...transferTargets, ...transferPreserves].sort());
  const failed = own.assertionResults.filter(test => test.status === 'failed');
  assert.deepEqual(failed.map(test => test.title).sort(), arm === 'original' ? [...transferTargets].sort() : []);
  for (const test of failed) assert(test.failureMessages.length === 1 && /^AssertionError: expected false to be true/.test(test.failureMessages[0]), 'Only actual missing-action/explanation Boolean faults');
  assert.equal(data.numTotalTests, arm === 'restored' ? 15 : 10); assert.equal(data.numPendingTests, 0); assert.equal(data.numTodoTests, 0);
  assert(data.testResults.every(file => !file.message && file.assertionResults.every(test => ['passed', 'failed'].includes(test.status))));
  assert.equal(data.numFailedTests, failed.length); assert.equal(data.numPassedTests, data.numTotalTests - failed.length);
  assert.equal(row.exit, arm === 'original' ? 1 : 0); assert.equal(data.success, arm !== 'original');
  const log = fs.readFileSync(path.join(OUT, 'runs', row.id + '.stdout.log'), 'utf8') + fs.readFileSync(path.join(OUT, 'runs', row.id + '.stderr.log'), 'utf8');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to (?:load|resolve import)|SIM_OFFLINE_BLOCK/i.test(log));
  row.completed = data.numTotalTests; row.passed = data.numPassedTests; row.exactFaults = failed.length; checkpoint();
}
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Actual tracked source starts clean');
  git(['merge-base', '--is-ancestor', BASE, HEAD]);
  git(['diff', '--exit-code', PREPARED, HEAD, '--', 'src', 'public', 'scripts', 'package.json', 'package-lock.json', 'bun.lock', ':!' + SELF]);
  for (const spec of specs) {
    const current = read(spec.file).toString('utf8'); assert.equal(current, git(['show', HEAD + ':' + spec.file]));
    const patch = git(['diff', '--no-ext-diff', '--unified=3', spec.from, spec.to, '--', spec.file]);
    spec.anchors = hunks(patch); assert.equal(spec.anchors.length, spec.hunks);
    const candidate = inverse(spec, current);
    const restored = spec.anchors.reduce((text, anchor) => replaceOnce(text, anchor.old, anchor.next), candidate);
    assert.notEqual(candidate, current); assert.equal(restored, current, 'Exact whole-file forward reconstruction');
    spec.candidate = candidate; spec.synthetic = synthetic(spec, candidate);
    save(`refs/${spec.id}/product.patch`, patch); save(`refs/${spec.id}/current.txt`, current); save(`refs/${spec.id}/inverse.txt`, candidate); save(`refs/${spec.id}/restored.txt`, restored);
    report.refs.push({ id: spec.id, file: spec.file, from: spec.from, to: spec.to, anchors: spec.anchors, patchSha256: sha(patch), currentSha256: sha(current), inverseSha256: sha(candidate), ...spec.synthetic, sourceOnly: spec.id === '296' }); checkpoint();
  }
  // These whole-file equalities hold all captions and the independent shared-file features.
  for (const [file, ids] of [[LIFE, ['286', '302', '303']], [PHONE, ['289', '297']], [TRANSFER, ['284', '296']]]) {
    const stripped = ids.reduce((source, id) => inverse(specs.find(spec => spec.id === id), source), read(file).toString('utf8'));
    assert.equal(stripped, git(['show', BASE + ':' + file]), 'Only selected features differ from exact402: ' + file);
  }
  report.sharedFileCompositionPassed = true; checkpoint();
  const currentTypes = run('types-joined', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']);
  assert.equal(currentTypes.exit, 0, 'Actual joined application types');
  const controlRoot = path.join(ROOT, '.sim-control'); fs.mkdirSync(controlRoot, { recursive: true });
  const baselineTree = fs.mkdtempSync(path.join(controlRoot, 'report-preliminary-base-'));
  assert.equal(path.dirname(baselineTree), controlRoot);
  git(['worktree', 'add', '--detach', baselineTree, BASE]);
  try {
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(baselineTree, 'node_modules'), 'dir');
    const baselineTypes = run('types-baseline402', ['node_modules/typescript/bin/tsc', '--noEmit', '-p', path.join(baselineTree, 'tsconfig.app.json')]);
    assert.equal(baselineTypes.exit, 0, 'Exact402 application types');
    git(['-C', baselineTree, 'diff', '--exit-code']);
    assert.equal(git(['-C', baselineTree, 'rev-parse', 'HEAD']).trim(), BASE);
    report.baselineTypes = { source: BASE, ownConfig: true, sharedLockedDependencies: true, passed: true }; checkpoint();
  } finally { git(['worktree', 'remove', '--force', baselineTree]); }
  const families = [
    { id: '286', helper: 'scripts/simCareerPendingPopularityGates.mjs', prefix: 'SC_PENDING_POPULARITY', total: 15, faults: 11 },
    { id: '302', helper: 'scripts/simCareerPendingMoneyGates.mjs', prefix: 'SC_PENDING_MONEY', total: 8, faults: 4, raw: 'raw.json' },
    { id: '303', helper: 'scripts/simCareerPendingOverallGates.mjs', prefix: 'SC_PENDING_OVERALL', total: 6, faults: 2, raw: 'raw.json' },
    { id: '289', helper: 'scripts/simPhoneSeasonBudget.mjs', prefix: 'PHONE_BUDGET', total: 12, faults: 7, raw: 'raw-states.json' },
    { id: '297', helper: 'scripts/qa/proveSoccerPhoneIsolation.mjs', prefix: 'PHONE_ISOLATION', total: 7, faults: 5, raw: 'raw-states.json' },
  ];
  for (const family of families) {
    const out = path.join(OUT, 'families', family.id), spec = specs.find(item => item.id === family.id);
    for (const arm of ['normal', 'original', 'restored']) {
      const env = { [family.prefix + '_BASE']: spec.synthetic.ref, [family.prefix + '_PHASE']: 'fixed', [family.prefix + '_OUT']: out,
        ...(arm === 'original' ? { [family.prefix + '_CONTROL']: 'original' } : arm === 'restored' ? { [family.prefix + '_RESTORED']: '1' } : {}) };
      const result = run(family.id + '-' + arm, [family.helper], env); assert.equal(result.exit, 0, 'Frozen strict helper must qualify its actual causal arm');
      const receipt = JSON.parse(fs.readFileSync(path.join(out, 'units', arm, 'source.json'), 'utf8'));
      assert(receipt.qualified && receipt.head === HEAD && receipt.base === spec.synthetic.ref && receipt.arm === arm);
      assert.equal(receipt.completed, family.total); assert.equal(receipt.failed, arm === 'original' ? family.faults : 0); assert.equal(receipt.passed, family.total - receipt.failed);
      result.completed = receipt.completed; result.passed = receipt.passed; result.exactFaults = receipt.failed; checkpoint();
    }
    if (family.raw) {
      const normal = fs.readFileSync(path.join(out, 'units/normal', family.raw)), restored = fs.readFileSync(path.join(out, 'units/restored', family.raw));
      assert.deepEqual(restored, normal, 'Exact physical normal/restored raw bytes: ' + family.id);
      report.runs.find(row => row.id === family.id + '-restored').rawByteRestoration = true;
      if (family.id === '302' || family.id === '303') {
        const healthy = JSON.parse(normal).observations;
        const original = JSON.parse(fs.readFileSync(path.join(out, 'units/original', family.raw))).observations;
        assert.equal(original.length, healthy.length);
        for (let index = 0; index < healthy.length; index++) {
          const fixedRow = structuredClone(healthy[index]), oldRow = structuredClone(original[index]);
          if (fixedRow.kind === 'target' && fixedRow.scenario === 'below') {
            for (const key of ['callbackAvailable', 'reloadedAfter', 'reloadDraws']) { delete fixedRow[key]; delete oldRow[key]; }
          }
          assert.deepEqual(oldRow, fixedRow, 'Complete paired rows outside the precise queued callback consequence');
        }
      }
    }
    for (const bundle of family.id === '286' ? ['engine.mjs', 'life.mjs', 'save.mjs'] : [])
      assert.deepEqual(fs.readFileSync(path.join(out, 'units/normal', bundle)), fs.readFileSync(path.join(out, 'units/restored', bundle)), 'Popularity compiled restoration');
    checkpoint();
  }
  fs.mkdirSync(path.join(OUT, 'transfer'), { recursive: true }); transferUnits('normal');
  const originalTransfer = read(TRANSFER);
  try { fs.writeFileSync(path.join(ROOT, TRANSFER), specs.find(spec => spec.id === '284').candidate); transferUnits('original'); }
  finally { fs.writeFileSync(path.join(ROOT, TRANSFER), originalTransfer); }
  assert.deepEqual(read(TRANSFER), originalTransfer); transferUnits('restored');
  const relatedFile = path.join(OUT, 'related.json');
  const related = run('related-62', ['node_modules/vitest/vitest.mjs', 'run', 'src/test/soccerCareerPendingLife.test.ts', 'src/test/soccerCareerLifeReviews.test.ts', 'src/test/soccerLifeChainPackedSave.test.ts', '--maxWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + relatedFile]);
  const old = JSON.parse(fs.readFileSync(relatedFile, 'utf8')); assert.equal(related.exit, 0); assert.equal(old.numTotalTests, 62); assert.equal(old.numPassedTests, 62); assert.equal(old.numFailedTests, 0); assert.equal(old.numPendingTests, 0); assert.equal(old.numTodoTests, 0);
  assert.equal(old.testResults.length, 3); assert(old.success && old.testResults.every(file => !file.message && file.assertionResults.every(test => test.status === 'passed')));
} catch (error) { report.error = error?.stack || String(error); throw error; }
finally {
  const after = tracked(); json('tracked.after.json', after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Every tracked file held, including all frozen tests, helpers, public and package files');
}
assert.equal(report.refs.length, 7); assert.equal(report.runs.length, 21);
assert(report.sourceHeld && report.sharedFileCompositionPassed && report.baselineTypes?.passed);
report.qualified = true; checkpoint();
console.log('Preliminary report proof: 7 isolated final-tree refs; 5 frozen helper families x3; transfer10/6+4/15; related62; all tracked bytes held.');
console.log('Source/ref/type/unit scope only. No build, browser, weights, historical-Life or actual BIH qualification.');
