/* Render the actual three clue-game Boards and hooks over isolated fictional DB replies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CLUE_HINT_POINTS_CONTROL || '';
const paths = { constructor: 'src/components/f1-constructor/F1ConstructorBoard.tsx', tennis: 'src/components/tennis-player/TennisPlayerBoard.tsx', nation: 'src/components/guess-the-nation/GuessTheNationBoard.tsx' };
const count = "{hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used";
const controls = {};
for (const kind of Object.keys(paths)) {
  controls[kind + 'count'] = { kind, test: kind + ' counts mixed misses and hints without a false flat penalty', anchor: count, replacement: count + ' (-{hintsUsed * 100} pts)' };
  if (kind !== 'nation') controls[kind + 'tier'] = { kind, test: kind + ' advertises every original hint transition and exact count', anchor: '💡 Hint ({nextHintPoints} pts next)', replacement: '💡 Hint (-100 pts)' };
}
controls.nationreset = { kind: 'nation', test: 'nation clears the previous round hint count through the existing Back to modes action', anchor: 'onPlayAgain={() => { resetGame(); setHintsUsed(0); }}', replacement: 'onPlayAgain={resetGame}' };
assert.ok(!control || control in controls, 'Known clue-game hint control');
const held = [];
for (const file of [...Object.values(paths), 'src/hooks/useF1Constructor.ts', 'src/hooks/useTennisPlayer.ts', 'src/hooks/useGuessTheNation.ts', 'src/data/f1Constructors.ts', 'src/types/f1Constructor.ts', 'src/types/tennisPlayer.ts', 'src/types/guessTheNation.ts', 'src/components/f1-constructor/ConstructorFeedback.module.css', 'src/lib/dailyRecord.ts', 'src/hooks/useGameCompletion.ts', 'src/components/game/ShareButtons.tsx']) {
  const bytes = await readFile(path.join(root, file));
  held.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Original runtime inputs held')));
}
const sources = {};
for (const [kind, file] of Object.entries(paths)) sources[kind] = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/clue-hint-points-'));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/clueGameHintPoints.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control], source = sources[spec.kind];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Actual copy anchor is unique');
    let changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    changed = changed.replace(/from '\.\/([^']+)'/g, (_match, relative) => "from '@" + '/' + path.posix.dirname(paths[spec.kind]).slice(4) + '/' + relative + "'");
    const copy = path.join(folder, path.basename(paths[spec.kind])); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + paths[spec.kind].slice(4).replace(/\.tsx$/, '')]: copy });
    args.push('--testNamePattern', spec.test + '|holds independent original no-hint payouts');
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner completes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|RPC timeout|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner faults earn no outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 8); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 6);
    const intended = rows.find(row => row.title === controls[control].test); assert.equal(intended.status, 'failed'); assert.match(intended.failureMessages.join('\n'), /AssertionError:|Error: expect\(element\)\.toHaveTextContent\(\)/);
    assert.equal(rows.find(row => row.title.startsWith('holds independent original no-hint payouts')).status, 'passed');
    console.log(`simClueGameHintPoints ${control}: copied old binding fails one intended assertion; independent original three-game payout/save baseline passes; six skipped.`);
  } else { assert.equal(run.status, 0); assert.equal(report.numPassedTests, 8); console.log('simClueGameHintPoints: eight actual Board/hook outcomes pass.'); }
  console.log('simClueGameHintPoints: original next payouts and all hint counts agree with actual accepted progression.');
  console.log('simClueGameHintPoints: Nation variable deltas, Tennis authored labels and max-clue limits stay intact.');
  console.log('simClueGameHintPoints: mixed misses/hints keep original exact scores, daily saves, full clipboard and once completion.');
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of held) await verify();
}
console.log('simClueGameHintPoints: original bytes held and only owned temporary copies removed.');
