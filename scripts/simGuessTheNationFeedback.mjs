/* Actual Nation Board, search and hook outcomes. Only fictional HTTP rows and outward sinks are replaced. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/guess-the-nation/GuessTheNationBoard.tsx';
const css = 'src/components/guess-the-nation/GuessTheNationFeedback.module.css';
const baseline = 'holds independent original full tier table exact save share and completion';
const controls = {
  cue: { file: board, anchor: "setFeedback({ kind: 'hint', state: gameState });", replacement: 'void gameState;', test: 'miss and hint cue only the exact newly opened clue with stable nodes' },
  reduced: { file: css, anchor: '.clue, .reply, .result { animation: none; }', replacement: '.clue, .reply, .result { animation: replyReveal 420ms ease-out 1; }', test: 'owned controls and full guess text bind finite static reduced feedback' },
  targets: { file: board, anchor: 'min-h-[44px] px-2 text-sm text-yellow-500/70', replacement: 'min-h-[32px] px-2 text-sm text-yellow-500/70', test: 'owned controls and full guess text bind finite static reduced feedback' },
};
const control = process.env.NATION_FEEDBACK_CONTROL || '';
assert.ok(!control || control in controls, 'Known Nation feedback control');
const heldFiles = [board, css, 'src/hooks/useGuessTheNation.ts', 'src/types/guessTheNation.ts', 'src/components/guess-the-nation/NationSearch.tsx', 'src/components/guess-the-nation/GuessTheNationHowToPlay.tsx', 'src/hooks/useGameCompletion.ts', 'src/lib/dailyRecord.ts'];
const originals = new Map(await Promise.all(heldFiles.map(async file => [file, await readFile(path.join(root, file))])));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nation-feedback-'));
  const reportPath = path.join(folder, 'report.json'); owned.push(reportPath);
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP; delete env.NATION_FEEDBACK_CSS;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/guessTheNationFeedback.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportPath];
  if (control) {
    const spec = controls[control];
    for (const file of [board, css]) {
      const source = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
      let changed = source;
      if (file === spec.file) {
        assert.equal(source.split(spec.anchor).length - 1, 1, 'Unique executable control binding');
        changed = source.replace(spec.anchor, spec.replacement);
        assert.notEqual(changed, source, 'The copied control changes the binding');
      }
      if (file === board) {
        for (const name of ['NationSearch', 'GuessTheNationHowToPlay']) {
          const relative = `from './${name}';`;
          assert.equal(changed.split(relative).length - 1, 1, 'Original relative helper import occurs once');
          changed = changed.replace(relative, `from '@/components/guess-the-nation/${name}';`);
        }
      }
      const copy = path.join(folder, path.basename(file)); await writeFile(copy, changed); owned.push(copy);
      if (file === board) env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/guess-the-nation/GuessTheNationBoard': copy });
      else env.NATION_FEEDBACK_CSS = copy;
    }
    args.push('--testNamePattern', controls[control].test + '|' + baseline);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner finishes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner faults earn no credit');
  const report = JSON.parse(await readFile(reportPath, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 6); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 4);
    const intended = rows.filter(row => row.title === controls[control].test); assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    assert.match(intended[0].failureMessages.join('\n'), /AssertionError:|Error: expect\(element\)\.(?:toHaveTextContent|toHaveClass)/, 'Intended actual assertion fails');
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Independent original tiers save share and completion pass');
    console.log(`simGuessTheNationFeedback ${control}: one intended assertion fails, one original outcome baseline passes, four cases skipped.`);
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 6); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simGuessTheNationFeedback: six actual Board, search and hook cases pass.');
    console.log('simGuessTheNationFeedback: accepted clue/result cues, stable nodes, quiet typing/restores and cleanup.');
    console.log('simGuessTheNationFeedback: original tiers, saves, shares and completion held; owned touch and finite/static CSS bindings verified.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, bytes] of originals) assert.deepEqual(await readFile(path.join(root, file)), bytes, 'Original runtime input bytes held');
}
console.log('simGuessTheNationFeedback: eight runtime inputs held; only owned copies/report removed.');
