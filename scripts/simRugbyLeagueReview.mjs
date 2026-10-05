/* Mounted review/retry outcomes. Every copied-source control keeps an original Daily baseline. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '..');
const component = 'src/components/champ-or-not/RugbyLeagueChallenge.tsx';
const testFile = 'src/test/rugbyLeagueReview.test.tsx';
const titles = {
  review: 'reviews all ten original choices truths and shared winners in one card',
  score: 'retries only the original misses and reports a separate corrected total',
  resume: 'resumes the same pending and revealed retry after returning or hiding rugby',
  rapid: 'accepts one retry answer and one advance from same-frame repeated inputs',
  perfect: 'offers review without an empty retry after a perfect original run',
  reset: 'starts an explicit fresh retry and clears review state for another ten',
  help: 'explains separate retry scores before play and blocks actions behind reopened rules',
  early: 'keeps future claims unavailable before the original ten are complete',
  isolation: 'keeps every saved byte and completion unchanged through review and retry',
  baseline: 'preserves the original Daily score save and one completion across reload',
};
const controls = {
  selection: { from: "if (active && !helpOpen && phaseRef.current === 'review') setReviewIndex(at);", to: "if (active && !helpOpen && phaseRef.current === 'review') setReviewIndex(0);", test: titles.review, message: /aria-pressed/ },
  pick: { from: 'const reviewedPick = reviewed ? answers[reviewIndex] ? reviewed.isTrue : !reviewed.isTrue : null;', to: 'const reviewedPick = reviewed ? reviewed.isTrue : null;', test: titles.review, message: /Review shows the original choice/ },
  truth: { from: "The claim is {reviewed.isTrue ? 'true' : 'false'}.", to: "The claim is {reviewed.isTrue ? 'false' : 'true'}.", test: titles.review, message: /Review keeps the original truth/ },
  winners: { from: "reviewed.realTeams.join(' and ')", to: "reviewed.realTeams.slice(0, 1).join(' and ')", test: titles.review, message: /Review retains every shared winner/ },
  original: { from: 'const score = answers.filter(Boolean).length;', to: 'const score = answers.filter(Boolean).length + retryAnswers.filter(Boolean).length;', test: titles.score, message: /Practice corrections never increase the original total/ },
  queue: { from: 'answers.flatMap((correct, at) => correct ? [] : [at])', to: 'answers.flatMap((correct, at) => correct ? [at] : [])', test: titles.score, message: /Retry queue size equals the original misses/ },
  tally: { from: 'const corrected = retryAnswers.filter(Boolean).length;', to: 'const corrected = retryAnswers.length;', test: titles.score, message: /Only correct retry choices enter the corrected tally/ },
  resume: { from: "retryAnswers.length > retryIndex ? 'retry-reveal' : 'retry-question'", to: "'retry-question'", test: titles.resume, message: /Resume retains an already revealed retry/ },
  answer: { from: "phaseRef.current !== 'retry-question' || !retryCurrent", to: "phase !== 'retry-question' || !retryCurrent", test: titles.rapid, message: /Expected element to have text content:[\s\S]*Corrected|Repeated answers cannot inflate/ },
  advance: { from: "if (!active || helpOpen || phaseRef.current !== 'retry-reveal') return;", to: "if (!active || helpOpen || phase !== 'retry-reveal') return;", test: titles.rapid, message: /Repeated advance moves to exactly the next original miss/ },
  perfect: { from: '{missed.length > 0 && <button data-rugby-open-retry=""', to: '{missed.length >= 0 && <button data-rugby-open-retry=""', test: titles.perfect, message: /A perfect original run has no empty retry/ },
  restart: { from: '          setRetryAnswers([]);', to: '', test: titles.reset, message: /Expected element to have text content:[\s\S]*Still one to learn|An explicit new retry clears/ },
  replay: { from: '    setRetryStarted(false);', to: '    if (runNumber.current === 1) setRetryStarted(false);', test: titles.reset, message: /A new original run clears the old retry session/ },
  help_answer: { from: "if (!active || helpOpen || phaseRef.current !== 'retry-question' || !retryCurrent) return;", to: "if (!active || phaseRef.current !== 'retry-question' || !retryCurrent) return;", test: titles.help, message: /Open rules block the background retry choice/ },
  help_advance: { from: "if (!active || helpOpen || phaseRef.current !== 'retry-reveal') return;", to: "if (!active || phaseRef.current !== 'retry-reveal') return;", test: titles.help, message: /Open rules block the background retry advance/ },
  early: { from: "{phase === 'done' && <div ref={actionArea} data-rugby-result=", to: "{['question', 'done'].includes(phase) && <div ref={actionArea} data-rugby-result=", test: titles.early, message: /Review cannot expose unfinished original claims/ },
  storage: { from: 'setRetryAnswers(previous => [...previous, pick === retryCurrent.isTrue]);', to: "setRetryAnswers(previous => [...previous, pick === retryCurrent.isTrue]); localStorage.setItem('rugby-review-control', 'changed');", test: titles.isolation, message: /Review and retry never alter saved records/ },
  completion: { mutations: [
    { from: "import { useRevealScroll } from '@/hooks/useRevealScroll';", to: "import { useRevealScroll } from '@/hooks/useRevealScroll';\nimport { useGameCompletion } from '@/hooks/useGameCompletion';" },
    { from: 'const corrected = retryAnswers.filter(Boolean).length;', to: "const corrected = retryAnswers.filter(Boolean).length;\n  useGameCompletion('champ-or-not', phase === 'retry-done', corrected, 1);" },
  ], test: titles.isolation, message: /Review and retry never (?:alter|transiently save|book)/ },
  entry_focus: { from: 'ref={at === reviewIndex ? actionButton : null}', to: '', test: titles.review, message: /Review opens on its selected claim tile/ },
  return_focus: { from: "returnFocus.current = phaseRef.current === 'review' ? 'review' : 'retry';", to: 'returnFocus.current = null;', test: titles.review, message: /Review returns focus to its original opener/ },
};
const control = process.env.RUGBY_LEAGUE_REVIEW_CONTROL || '';
assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known Rugby League review control');
const outputDir = path.resolve(process.env.RUGBY_LEAGUE_REVIEW_ARTIFACTS || path.join(root, 'rugby-league-review-artifacts/mounted'));
await mkdir(outputDir, { recursive: true });
if (control === 'all') {
  const outcomes = [];
  for (const mode of ['', ...Object.keys(controls)]) {
    const child = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, RUGBY_LEAGUE_REVIEW_CONTROL: mode, RUGBY_LEAGUE_REVIEW_ARTIFACTS: outputDir }, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`;
    await writeFile(path.join(outputDir, `${mode || 'normal'}-runner.log`), output);
    const passed = child.status === 0 && !child.error && !child.signal;
    outcomes.push({ mode: mode || 'normal', passed, exit: child.status, error: String(child.error || ''), signal: child.signal });
    console.log(`${passed ? 'PASS' : 'FAIL'} Rugby League review ${mode || 'normal'}`);
    process.stdout.write(passed ? output.split('\n').filter(line => line.startsWith('simRugbyLeagueReview')).join('\n') + '\n' : output.slice(-16000));
  }
  await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({ outcomes, cases: Object.values(titles), controls: Object.keys(controls) }, null, 2));
  assert.ok(outcomes.every(row => row.passed), 'All normal and control outcomes must pass; every mode was attempted');
  console.log(`simRugbyLeagueReview: ${Object.keys(titles).length} mounted outcomes and ${Object.keys(controls).length} effective controls passed.`);
} else {
  const held = new Map();
  for (const file of [component, testFile, 'src/pages/ChampOrNot.tsx', 'src/hooks/useChampOrNot.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/champOrNot.ts', 'src/lib/rugbyLeagueChallenge.ts', 'src/test/fixtures/rugbyLeagueRecords.json']) held.set(file, await readFile(path.join(root, file)));
  const verify = async () => { for (const [file, bytes] of held) assert.deepEqual(await readFile(path.join(root, file)), bytes, `${file}: source bytes held`); };
  const label = control || 'normal', spec = controls[control], parent = path.join(root, '.sim-control');
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_COLOR; delete env.NO_DOUBLE_SWAP;
  let folder, copy;
  try {
    if (spec) {
      const source = held.get(component).toString('utf8').replaceAll('\r\n', '\n');
      let changed = source;
      for (const mutation of spec.mutations ?? [spec]) {
        assert.equal(changed.split(mutation.from).length - 1, 1, `${label}: one exact executable anchor`);
        const next = changed.replace(mutation.from, mutation.to); assert.notEqual(next, changed, `${label}: each mutation changes executable code`); changed = next;
      }
      await mkdir(parent, { recursive: true }); folder = await mkdtemp(path.join(parent, 'rugby-review-'));
      copy = path.join(folder, 'RugbyLeagueChallenge.tsx'); await writeFile(copy, changed);
      await writeFile(path.join(outputDir, `${label}-source.txt`), changed);
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/champ-or-not/RugbyLeagueChallenge': copy });
    }
    const reportFile = path.join(outputDir, `${label}-report.json`);
    const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`];
    if (spec) args.push('--testNamePattern', [spec.test, titles.baseline].map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const output = `${child.stdout || ''}\n${child.stderr || ''}`; await writeFile(path.join(outputDir, `${label}-vitest.log`), output);
    assert.ok(!child.error && !child.signal, `${label}: runner completes normally`);
    assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|Test timed out|No test files found|SyntaxError|TypeError|ReferenceError|Transform failed|Failed to (?:resolve import|load)|Cannot find module|not wrapped in act/, `${label}: infrastructure failures earn no credit`);
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const rows = report.testResults.flatMap(file => file.assertionResults);
    assert.deepEqual(rows.map(row => row.title).sort(), Object.values(titles).sort()); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
    const failed = rows.filter(row => row.status === 'failed'), passed = rows.filter(row => row.status === 'passed'), skipped = rows.filter(row => ['pending', 'skipped'].includes(row.status));
    assert.equal(rows.length, failed.length + passed.length + skipped.length);
    if (spec) {
      assert.equal(child.status, 1); assert.deepEqual(failed.map(row => row.title), [spec.test]); assert.deepEqual(passed.map(row => row.title), [titles.baseline]); assert.equal(skipped.length, 8);
      const failure = failed[0].failureMessages.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
      assert.match(failure, /AssertionError|Error: expect\(/); assert.match(failure, spec.message);
      assert.doesNotMatch(failure, /TypeError|ReferenceError|SyntaxError|TestingLibraryElementError|[Tt]imed out|Unable to find|Found multiple/, 'Only the intended assertion earns control credit');
    } else { assert.equal(child.status, 0); assert.equal(failed.length, 0); assert.equal(passed.length, 10); assert.equal(skipped.length, 0); }
    await verify();
    await writeFile(path.join(outputDir, `${label}-verified.json`), JSON.stringify({ mode: label, passed: passed.map(row => row.title), rejected: failed.map(row => row.title), skipped: skipped.map(row => row.title), sourceSha256: Object.fromEntries([...held].map(([file, bytes]) => [file, createHash('sha256').update(bytes).digest('hex')])), scope: 'Mounted actual review/retry UI with accepted-record fixtures and unchanged original Daily baseline. No native-layout or live-database claim.' }, null, 2));
    console.log(`simRugbyLeagueReview ${label}: ${passed.length} passed, ${failed.length} intended failures, ${skipped.length} intentional skips; ${held.size} source inputs held.`);
  } finally {
    if (folder) { assert.equal(path.dirname(folder), parent); assert.ok(path.basename(folder).startsWith('rugby-review-')); await rm(copy, { force: true }); await rmdir(folder); }
    await verify();
  }
}
