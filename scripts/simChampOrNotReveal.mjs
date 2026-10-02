/* Round 882: actual hook/page reveal decisions, with fictional fetch rows only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CHAMP_REVEAL_CONTROL || '';
const files = ['src/hooks/useChampOrNot.ts', 'src/pages/ChampOrNot.tsx', 'src/test/champOrNotReveal.test.tsx', 'src/lib/champOrNot.ts', 'src/hooks/useGameCompletion.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  daily: 'keeps the daily explanation readable until an explicit advance',
  unlimited: 'keeps the unlimited explanation readable until an explicit advance',
  duplicate: 'same-frame answers accept only the first decided pick',
  invalid: 'rejects nonboolean input without deciding or saving a claim',
  mode: 'mode changes discard pending actions and recover the exact saved daily',
  replay: 'unlimited replay clears pending feedback and leaves the daily save intact',
  hard: 'unlimited Hard change clears the pending decision before the fresh run',
  dailyHard: 'Daily Hard toggle preserves the same pending claim and its saved decision',
  finalMode: 'final reveal mode return retains the completed daily and its single booking',
  right: 'the page retains true feedback and shows its earned score before Next claim',
  wrong: 'the page retains false feedback and shows its earned score before Next claim',
  outside: 'preserves deliberate Help Hard mode and Record Books focus during answer feedback',
  results: 'page final View results retains the exact mixed score share and single booking',
};
const mutations = {
  timer: [0, '    pendingAnswers.current = next;', '    pendingAnswers.current = next;\n    window.setTimeout(() => {\n      if (pendingAnswers.current !== next) return;\n      pendingAnswers.current = null;\n      setAnswers(next);\n      setShowingResult(false);\n      setLastPick(null);\n    }, 2200);', [titles.daily, titles.unlimited, titles.right, titles.wrong, titles.results]],
  sameFrame: [0, 'pendingAnswers.current || ', '', [titles.duplicate]],
  invalid: [0, " || typeof saysTrue !== 'boolean'", '', [titles.invalid]],
  pending: [0, '  const clearReveal = useCallback(() => {\n    pendingAnswers.current = null;\n  }, []);', '  const clearReveal = useCallback(() => {\n    void pendingAnswers.current;\n  }, []);', [titles.mode, titles.replay, titles.hard, titles.finalMode]],
  dailyHard: [0, '  const toggleHard = useCallback(() => {\n    setHard(h => !h);', '  const toggleHard = useCallback(() => {\n    clearReveal();\n    setHard(h => !h);', [titles.dailyHard]],
  shownScore: [1, '  const shownScore = score + (lastCorrect ? 1 : 0);', '  const shownScore = score;', [titles.right, titles.results]],
  status: [1, '<p role="status" className="text-muted-foreground">', '<p className="text-muted-foreground">', [titles.right, titles.wrong]],
  focus: [1, 'advanceButton.current?.focus({ preventScroll: true });', 'void advanceButton.current;', [titles.right, titles.wrong]],
  focusOwner: [1, 'if (active === request.opener || active === document.body || !active?.isConnected) ', '', [titles.outside]],
};
assert.ok(control === '' || Object.hasOwn(mutations, control));
for (const [index, anchor] of Object.values(mutations)) {
  const crlfBytes = Buffer.from(held[index][1].source.replaceAll('\n', '\r\n'));
  const crlfHeld = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Executable control binds once under CRLF');
  assert.deepEqual(crlfBytes, crlfHeld);
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/champ-reveal882-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const [index, anchor, replacement] = mutations[control];
    const source = held[index][1].source;
    assert.equal(source.split(anchor).length - 1, 1);
    const changed = source.replace(anchor, replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, path.basename(files[index]));
    await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [index === 0 ? '@/hooks/useChampOrNot' : '@/pages/ChampOrNot']: copy });
  }
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/champOrNotReveal.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused suite finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 18);
  if (control) {
    const intended = mutations[control][3];
    if (report.numFailedTests !== intended.length) console.log(JSON.stringify(rows.filter(row => row.status === 'failed').map(row => ({ title: row.title, failure: row.failureMessages[0].split('\n')[0] }))));
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, intended.length); assert.equal(report.numPassedTests, 18 - intended.length);
    for (const title of intended) assert.equal(rows.filter(row => row.title === title).length, 1);
    for (const row of rows) assert.equal(row.status, intended.includes(row.title) ? 'failed' : 'passed', row.fullName);
    console.log(`simChampOrNotReveal ${control}: executable hook/page source changed once in a disposable copy.`);
    console.log(`simChampOrNotReveal ${control}: ${intended.length} exact decision, readable-feedback or focus outcomes reject the control; ${18 - intended.length} independent cases pass.`);
    console.log(`simChampOrNotReveal ${control}: all 18 cases ran with zero pending or unhandled errors; saved wrong, ordinary advancement, refresh and exact booking baselines pass.`);
    console.log(`simChampOrNotReveal ${control}: ${rows.find(row => row.status === 'failed').failureMessages[0].split('\n')[0]}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 18); assert.equal(report.numFailedTests, 0);
    console.log('simChampOrNotReveal: all 18 real hook/page cases pass, zero pending or unhandled errors.');
    console.log('simChampOrNotReveal: Daily/Unlimited explanations remain readable for ten seconds, Next consumes each accepted decision once.');
    console.log('simChampOrNotReveal: invalid and duplicate picks, mode/replay/Hard ownership and pending earned score have exact outcomes.');
    console.log('simChampOrNotReveal: original builder, wrong saves, normal advancement, early/final restore, pinned day and immediate mixed-score booking remain exact.');
    console.log('simChampOrNotReveal: status feedback and opener-aware Next focus preserve deliberate Help, Hard, mode and Record Books focus.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual source bytes held');
  }
}
console.log('simChampOrNotReveal: CRLF anchors bound, original bytes held and owned copies cleaned; fictional fetch fixtures, no browser or live calls.');
