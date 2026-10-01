/* Actual local Tennis and College Basketball help, with unchanged shared Dialog. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = { tennis: 'src/components/tennis-player/TennisPlayerHowToPlay.tsx', college: 'src/components/cbb-program/CbbProgramHowToPlay.tsx' };
const independent = 'holds independent original instructions clue labels and both full point tiers';
const controls = {};
for (const kind of Object.keys(paths)) {
  controls[kind + 'example'] = { kind, test: kind + ' shows a truthful original-tier worked example and turn rules', edits: [['POINTS_BY_CLUE[1]', 'POINTS_BY_CLUE[2]']] };
  controls[kind + 'focus'] = { kind, test: kind + ' returns Close and Escape to the exact stable opener with preventScroll', edits: [['opener.current?.focus({ preventScroll: true });', 'void opener.current;']] };
  controls[kind + 'target'] = { kind, test: kind + ' binds the owned 44px target and visible keyboard focus', edits: [['min-h-[44px] min-w-[44px]', 'min-h-[32px] min-w-[32px]']] };
  const rules = kind === 'tennis' ? 'Wrong guesses and hints reveal the next clue. Miss on the final clue and the round ends.' : 'A wrong guess opens the next clue. Miss on the final clue and the round ends.';
  controls[kind + 'rules'] = { kind, test: kind + ' shows a truthful original-tier worked example and turn rules', edits: [[rules, kind === 'tennis' ? 'Every wrong guess reveals the next clue.' : 'Guess again.']] };
}
const control = process.env.CLUE_GAME_HELP_CONTROL || '';
assert.ok(!control || control in controls, 'Known local help control');
const held = [];
for (const file of [...Object.values(paths), 'src/types/tennisPlayer.ts', 'src/types/cbbProgram.ts', 'src/hooks/useTennisPlayer.ts', 'src/hooks/useCbbProgram.ts', 'src/components/ui/dialog.tsx']) {
  const bytes = await readFile(path.join(root, file));
  held.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Actual Help and original shared rules and Dialog bytes held')));
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/clue-game-help-'));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/clueGameHelp.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control], file = paths[spec.kind];
    const source = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const [anchor, replacement] of spec.edits) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Executable copied binding occurs exactly once');
      changed = changed.replace(anchor, replacement);
    }
    assert.notEqual(changed, source, 'Control effectively changes the actual component');
    const copy = path.join(folder, path.basename(file)); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + file.slice(4).replace(/\.tsx$/, '')]: copy });
    args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Actual runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner errors earn no outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 7); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 5);
    const intended = rows.filter(row => row.title === controls[control].test); assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    assert.match(intended[0].failureMessages.join('\n'), /AssertionError:|Error: expect\(element\)\.(?:toHaveTextContent|toHaveFocus|toHaveClass)/, 'Actual intended assertion fails');
    assert.equal(rows.find(row => row.title === independent)?.status, 'passed', 'Independent original instructions and both six-tier ladders pass');
    console.log(`simClueGameHelp ${control}: one intended assertion fails, one independent original instructions and tiers case passes, five cases explicitly skipped.`);
    console.log('CLUE_GAME_HELP_RECEIPT: ' + JSON.stringify({ control, intended: controls[control].test, failed: 1, independentPassed: 1, skipped: 5, messages: intended[0].failureMessages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 7); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simClueGameHelp: seven actual Help and shared Dialog outcomes pass.');
    console.log('simClueGameHelp: original tiers, truthful worked examples, original labels and turn rules.');
    console.log('simClueGameHelp: exact stable Close/Escape focus with preventScroll, owned44px/focus bindings and quiet clones.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of held) await verify();
}
console.log('simClueGameHelp: seven runtime inputs held, only owned copies and report removed.');
