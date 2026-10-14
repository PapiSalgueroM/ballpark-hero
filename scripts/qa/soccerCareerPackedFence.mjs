/* Actual mounted codec/fence seam, with a synthetic unknown field and copied controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Packed fence execution runs only in remote CI');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(process.env.SC_PACKED_FENCE_OUT || path.join(root, 'career-save-artifacts/packed-fence'));
const suite = 'src/test/soccerCareerPackedFence.test.tsx', page = 'src/pages/SoccerCareer.tsx', fence = 'src/lib/saveFence.ts';
const sha = value => createHash('sha256').update(value).digest('hex');
const held = [page, fence, suite, 'src/lib/soccerCareerSave.ts', 'src/lib/soccerCareerEngine.ts', 'src/hooks/useSaveFenceWatch.ts',
  'src/components/soccer-career/careerMoments.ts', 'src/components/SaveMovedNotice.tsx', 'src/test/soccerCareerSaveFence.test.tsx',
  'src/test/soccerCareerSaveRetry.test.tsx', 'vitest.config.ts', 'src/test/setup.ts', 'package.json', 'package-lock.json', 'scripts/qa/soccerCareerPackedFence.mjs'];
const hashes = () => Object.fromEntries(held.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const before = hashes(), pageSource = fs.readFileSync(path.join(root, page), 'utf8'), fenceSource = fs.readFileSync(path.join(root, fence), 'utf8');
assert(!/^(?:<<<<<<<|=======|>>>>>>>)/m.test(pageSource), 'Resolve the owned page merge before executing');
const pageCases = [
  'restores a complete packed synthetic edge and persists one actual academy action under the cap',
  'a refused packed action rolls the fence back and retries the exact earned state without replay',
  'a stale Retry cannot replace another complete packed save or consume any RNG',
];
const independent = 'retains an independent real legacy restore and generation fence baseline';
const controls = [
  { id: 'old-reader', module: '@/pages/SoccerCareer', file: page, source: pageSource,
    from: 'const parsed: unknown = parseSoccerCareerSave(saved);', to: 'const parsed: unknown = JSON.parse(saved);',
    failures: pageCases, predicate: /packed reader keeps actual career mounted/ },
  { id: 'old-writer', module: '@/pages/SoccerCareer', file: page, source: pageSource,
    from: 'localStorage.setItem(SAVE_KEY, serializeSoccerCareerSave(career));', to: 'localStorage.setItem(SAVE_KEY, JSON.stringify(career));',
    failures: pageCases, predicate: /packed writer accepts encoded initial save under the store limit/ },
  { id: 'blind-fence', module: '@/lib/saveFence', file: fence, source: fenceSource,
    from: '    return now !== null && now !== mine;', to: '    return false;',
    failures: [pageCases[2]], predicate: /stale Retry keeps complete winning packed bytes/ },
].map(control => {
  assert.equal(control.source.split(control.from).length - 1, 1, control.id + ': exactly one actual source anchor');
  const fault = control.source.replace(control.from, control.to);
  assert.notEqual(fault, control.source, control.id + ': source actually changes');
  assert.equal(fault.split(control.to).length - control.source.split(control.to).length, 1, control.id + ': one introduced fault');
  const undo = fault.replace(control.to, control.from); assert.equal(undo, control.source, control.id + ': complete inverse source');
  return { ...control, fault, undo };
});
fs.mkdirSync(output, { recursive: true });
const parent = path.join(root, '.sim-control'); fs.mkdirSync(parent, { recursive: true });
const temporary = fs.mkdtempSync(path.join(parent, 'soccer-packed-fence-'));
const report = { scope: 'Actual page in jsdom over real initCareer, one synthetic unknown field and an explicitly size-limited test store. No genuine long-history or browser-layout claim.',
  sourceBefore: before, controls: controls.map(({ id, file, from, to, failures }) => ({ id, file, from, to, anchorCount: 1, expectedFailures: failures })), runs: [] };
const save = () => fs.writeFileSync(path.join(output, 'receipt.json'), JSON.stringify(report, null, 2));
try {
  const healthyPage = path.join(temporary, 'healthy-page.tsx'), healthyFence = path.join(temporary, 'healthy-fence.ts');
  fs.writeFileSync(healthyPage, pageSource); fs.writeFileSync(healthyFence, fenceSource);
  fs.writeFileSync(path.join(output, 'healthy-page.tsx'), pageSource); fs.writeFileSync(path.join(output, 'healthy-fence.ts'), fenceSource);
  const arms = [{ id: 'healthy', aliases: { '@/pages/SoccerCareer': healthyPage, '@/lib/saveFence': healthyFence } }];
  for (const control of controls) {
    const extension = control.file.endsWith('.tsx') ? '.tsx' : '.ts', copy = path.join(temporary, control.id + extension);
    fs.writeFileSync(copy, control.fault); fs.writeFileSync(path.join(output, control.id + extension), control.fault);
    fs.writeFileSync(path.join(output, control.id + '-undo' + extension), control.undo);
    arms.push({ id: control.id, aliases: { '@/pages/SoccerCareer': healthyPage, '@/lib/saveFence': healthyFence, [control.module]: copy }, control, copy });
  }
  const undoPage = path.join(temporary, 'undo-page.tsx'), undoFence = path.join(temporary, 'undo-fence.ts');
  fs.writeFileSync(undoPage, controls[1].undo); fs.writeFileSync(undoFence, controls[2].undo);
  arms.push({ id: 'undo', aliases: { '@/pages/SoccerCareer': undoPage, '@/lib/saveFence': undoFence } });
  for (const arm of arms) {
    const directory = path.join(output, arm.id), reportFile = path.join(directory, 'unit.json'); fs.mkdirSync(directory, { recursive: true });
    const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', suite,
      '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${reportFile}`], {
      cwd: root, env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify(arm.aliases), SC_PACKED_FENCE_CASE_OUT: directory },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    });
    const outputText = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
    fs.writeFileSync(path.join(directory, 'unit.log'), outputText);
    assert.doesNotMatch(outputText, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|No test files found|SyntaxError|Transform failed/, arm.id + ': runtime failures earn no fault credit');
    assert.equal(run.error, undefined, arm.id + ': actual runner setup'); assert.equal(run.signal, null);
    const result = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(Number(result.numUnhandledErrors ?? 0), 0, arm.id + ': no unhandled runtime errors');
    const assertions = result.testResults.flatMap(row => row.assertionResults), failures = assertions.filter(row => row.status !== 'passed');
    const row = { id: arm.id, status: run.status, total: result.numTotalTests, passed: result.numPassedTests, failed: result.numFailedTests,
      assertions: assertions.map(item => ({ name: item.fullName, title: item.title, status: item.status, failureMessages: item.failureMessages })) };
    report.runs.push(row); save();
    for (const id of ['cold-action', 'refused-retry', 'stale-retry', 'independent-legacy']) {
      assert(fs.existsSync(path.join(directory, id + '-final-body-storage.json')), arm.id + ': every actual body/storage receipt is retained');
    }
    assert.equal(result.numTotalTests, 4); assert.equal(assertions.length, 4); assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests ?? 0, 0);
    assert.deepEqual(assertions.map(item => item.title).sort(), [...pageCases, independent].sort(), arm.id + ': every mapped test actually executes');
    assert.equal(assertions.find(item => item.title === independent)?.status, 'passed', arm.id + ': independent legacy codec and original fence survive');
    if (arm.control) {
      assert.equal(run.status, 1); assert.equal(result.success, false); assert.equal(result.numFailedTests, arm.control.failures.length);
      assert.deepEqual(failures.map(item => item.title).sort(), [...arm.control.failures].sort(), arm.id + ': exact causal assertion failures');
      for (const failure of failures) assert(failure.failureMessages.some(message => arm.control.predicate.test(message)), arm.id + ': mapped actual predicate, not setup failure');
      assert.equal(sha(fs.readFileSync(arm.copy)), sha(arm.control.fault));
    } else { assert.equal(run.status, 0); assert.equal(result.success, true); assert.equal(failures.length, 0); }
    for (const [module, copy] of Object.entries(arm.aliases)) {
      const expected = arm.control?.module === module ? arm.control.fault : module === '@/pages/SoccerCareer' ? pageSource : fenceSource;
      assert.equal(sha(fs.readFileSync(copy)), sha(expected), arm.id + ': every copied actual source stays held');
    }
  }
  assert.deepEqual(report.runs[0].assertions, report.runs[4].assertions, 'Complete undo restores all named healthy outcomes');
  report.sourceAfter = hashes(); assert.deepEqual(report.sourceAfter, before); report.effective = true; save();
  console.log('PASS packed fence seam: 4 healthy cases, 3 exact effective copied controls, 4 complete undo cases, source held.');
} finally {
  report.sourceAfter = hashes(); report.sourceHeld = JSON.stringify(report.sourceAfter) === JSON.stringify(before); save();
  assert.deepEqual(report.sourceAfter, before, 'App, original tests and proof sources held in every arm');
  assert.equal(path.dirname(fs.realpathSync(temporary)), fs.realpathSync(parent)); assert(path.basename(temporary).startsWith('soccer-packed-fence-'));
  fs.rmSync(temporary, { recursive: true, force: true });
}
