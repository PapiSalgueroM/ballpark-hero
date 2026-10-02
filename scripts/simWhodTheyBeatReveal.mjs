/* Round 877: readable finals feedback through the real hook and page.
   WHOD_REVEAL_CONTROL changes executable source in an owned disposable copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.WHOD_REVEAL_CONTROL || '';
assert.ok(['', 'timer', 'invalid', 'sameFrame', 'pending', 'shownScore', 'status', 'focus', 'focusOwner'].includes(control));
const files = ['src/hooks/useWhodTheyBeat.ts', 'src/pages/WhodTheyBeat.tsx', 'src/test/whodTheyBeatReveal.test.tsx', 'src/lib/whodTheyBeat.ts', 'src/hooks/useGameCompletion.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  daily: 'keeps the daily answer and explanation readable until an explicit advance',
  unlimited: 'keeps the unlimited answer and explanation readable until an explicit advance',
  sameFrame: 'same-frame picks accept only the first decided answer',
  mode: 'mode changes discard pending reveal actions without changing the saved daily',
  replay: 'unlimited replay clears pending feedback and keeps the daily save untouched',
  right: 'the actual page keeps true feedback locked and announces earned score before Next final',
  wrong: 'the actual page keeps false feedback locked and announces earned score before Next final',
  results: 'the actual page shows View results after the last pick and keeps the final share and booking exact',
};
const invalidTitles = ['-1', '4', '1.5', 'NaN', 'Infinity', '0', 'null', 'undefined'].map(value => `rejects invalid option ${value} without deciding or saving a round`);
const outsideFocusTitles = ['Daily', 'Unlimited', 'the Record Books'].map(name => `preserves intentional focus on ${name} when answer feedback appears`);
const mutations = {
  timer: [0, '    pendingAnswers.current = next;', '    pendingAnswers.current = next;\n    window.setTimeout(() => {\n      if (pendingAnswers.current !== next) return;\n      pendingAnswers.current = null;\n      setAnswers(next);\n      setShowingResult(false);\n      setPickedIndex(null);\n    }, 2200);', [titles.daily, titles.unlimited, titles.right, titles.wrong]],
  invalid: [0, ' || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= current.options.length', '', invalidTitles],
  sameFrame: [0, 'pendingAnswers.current || ', '', [titles.sameFrame]],
  pending: [0, '  const clearReveal = useCallback(() => {\n    pendingAnswers.current = null;\n  }, []);', '  const clearReveal = useCallback(() => {\n    void pendingAnswers.current;\n  }, []);', [titles.mode, titles.replay]],
  shownScore: [1, '  const shownScore = score + (showingResult && pickedIndex === current?.correctIndex ? 1 : 0);', '  const shownScore = score;', [titles.right, titles.results]],
  status: [1, '<p role="status" className="text-sm text-muted-foreground text-center">', '<p className="text-sm text-muted-foreground text-center">', [titles.right, titles.wrong]],
  focus: [1, 'advanceButton.current?.focus({ preventScroll: true });', 'void advanceButton.current;', [titles.right, titles.wrong]],
  focusOwner: [1, 'if (active === request.opener || active === document.body || !active?.isConnected) ', '', outsideFocusTitles],
};
for (const [index, anchor] of Object.values(mutations)) {
  const crlfBytes = Buffer.from(held[index][1].source.replaceAll('\n', '\r\n'));
  const crlfHeld = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Actual control bindings survive CRLF');
  assert.deepEqual(crlfBytes, crlfHeld);
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/whod-reveal877-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const [index, anchor, replacement] = mutations[control];
    const source = held[index][1].source;
    assert.equal(source.split(anchor).length - 1, 1, 'Control binds actual executable source once');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'Control actually changes its copy');
    const copy = path.join(folder, path.basename(files[index]));
    await writeFile(copy, changed); owned.push(copy);
    const alias = index === 0 ? '@/hooks/useWhodTheyBeat' : '@/pages/WhodTheyBeat';
    env.NO_DOUBLE_SWAP = JSON.stringify({ [alias]: copy });
  }
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/whodTheyBeatReveal.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner errors are not measured behavior');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 24);
  if (control) {
    const intended = mutations[control][3];
    if (report.numFailedTests !== intended.length) console.log(JSON.stringify(rows.filter(row => row.status === 'failed').map(row => ({ title: row.title, failure: row.failureMessages[0].split('\n')[0] }))));
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, intended.length); assert.equal(report.numPassedTests, 24 - intended.length);
    for (const title of intended) assert.equal(rows.filter(row => row.title === title).length, 1);
    for (const row of rows) assert.equal(row.status, intended.includes(row.title) ? 'failed' : 'passed', row.fullName);
    console.log(`simWhodTheyBeatReveal ${control}: real executable source changed once in a disposable hook or page.`);
    console.log(`simWhodTheyBeatReveal ${control}: ${intended.length} exact readable-feedback or answer-ownership outcomes reject the control, ${24 - intended.length} independent cases pass.`);
    console.log(`simWhodTheyBeatReveal ${control}: saved false, early refresh, immediate final booking, mode-toggle recovery and pinned midnight baselines remain green.`);
    console.log(`simWhodTheyBeatReveal ${control}: ${rows.find(row => row.status === 'failed').failureMessages[0].split('\n')[0]}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 24); assert.equal(report.numFailedTests, 0);
    console.log('simWhodTheyBeatReveal: all 24 actual hook and page outcomes pass, zero pending or unhandled cases.');
    console.log('simWhodTheyBeatReveal: Daily and Unlimited reveals remain readable after ten seconds and advance only once on Next final.');
    console.log('simWhodTheyBeatReveal: same-frame picks, invalid option indices, mode changes and replay preserve decided-answer ownership.');
    console.log('simWhodTheyBeatReveal: rendered earned score, locked choices, status announcement and final View results match exact outcomes.');
    console.log('simWhodTheyBeatReveal: focused answers hand off to Next with preventScroll, preserving intentional mode and navigation focus.');
    console.log('simWhodTheyBeatReveal: original builder, stored daily, refresh, immediate final booking, pinned midnight and final share remain exact.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual hook, page, question builder, completion hook and suite bytes held');
  }
}
console.log('simWhodTheyBeatReveal: CRLF bindings proved, raw source bytes held, owned copies cleaned; fictional transport only, no browser or live calls.');
