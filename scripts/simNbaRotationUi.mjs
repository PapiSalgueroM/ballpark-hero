/* Round 887: real board persistence and local rotation feedback with executable isolated controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const panel = 'src/components/nba-front-office/NbaRotationPanel.tsx';
const test = 'src/components/nba-front-office/NbaRotationPanel.test.tsx';
const files = [board, panel, test, 'src/lib/nbaRotation.ts', 'src/lib/nbaFrontOffice.ts', 'src/lib/nbaSeasonStats.ts', 'src/lib/foSeasonStats.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  swap: 'swaps a bench player into the starting five and saves the actual changed strength',
  batched: 'preserves two distinct selections without overwriting the first saved choice',
  same: 'rejects the same selection without writing a save or claiming an earned update',
  injured: 'disables injured options and rejects a forced injured selection without changing the save',
  auto: 'restores automatic selection by removing its saved preference and announces only that action',
  reload: 'reloads saved manual choices quietly with identical persisted bytes',
  stats: 'gives a chosen bench prospect real simulated games and points while automatic leaves him outside the eight',
  focus: 'moves opening and return focus to the exact controls with preventScroll',
  motion: 'shows earned update feedback once with finite motion reduced motion and native sized controls',
};
const baselines = [
  'preserves an old automatic save and exact original strength as an independent baseline',
  'preserves exact callback indices and all contract values as an independent baseline',
];
const controls = {
  save: [board, '    persist({}, next, myTeam);', '    void next;', [titles.swap, titles.batched, titles.reload]],
  slot: [board, 'onPick={(slot, id) => updateRotation(slot, id)}', 'onPick={(_slot, id) => updateRotation(0, id)}', [titles.batched, titles.stats]],
  auto: [board, 'onAuto={() => updateRotation()}', 'onAuto={() => false}', [titles.auto]],
  accepted: [panel, '    if (!player || !onPick(slot, id)) return;', '    if (!player) return;\n    onPick(slot, id);', [titles.same, titles.injured]],
  focus: [panel, 'useEffect(() => { back.current?.focus({ preventScroll: true }); }, []);', 'useEffect(() => { void back.current; }, []);', [titles.focus]],
  return: [board, '      rotationOpener.current?.focus({ preventScroll: true });', '      void rotationOpener.current;', [titles.focus]],
  finite: [panel, 'animation: nba-rotation-change 400ms ease-out 1;', 'animation: nba-rotation-change 1400ms ease-out 1;', [titles.motion]],
  reduced: [panel, '.nba-rotation-change { animation: none; }', '.nba-rotation-change { animation: nba-rotation-change 400ms ease-out 1; }', [titles.motion]],
};
const control = process.env.NBA_ROTATION_UI_CONTROL || '';
assert.ok(!control || control in controls, 'Known NBA rotation UI control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  assert.equal(source.split(anchor).length - 1, 1, 'Control binds exactly one actual runtime expression');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const originalBytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'The executable control also binds CRLF source');
  assert.deepEqual(crlfBytes, originalBytes, 'Synthetic CRLF raw bytes remain held');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nba-rotation-ui887-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP; delete env.NBA_ROTATION_UI_SWAP; delete env.NBA_ROTATION_UI_PANEL_SOURCE;
  const config = path.join(folder, 'vitest.config.ts'); owned.push(config);
  await writeFile(config, "import base from '../../vitest.config';\nconst swaps = JSON.parse(process.env.NBA_ROTATION_UI_SWAP || '{}');\nexport default { ...base, resolve: { ...base.resolve, alias: { ...swaps, ...base.resolve.alias } } };\n");
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--config', config, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const [target, anchor, replacement] = controls[control];
    const original = held.find(([file]) => file === target)[1].source;
    let changed = original.replace(anchor, replacement);
    assert.notEqual(changed, original, 'The control actually changes runtime source');
    if (target === board) {
      const relative = "from './NbaRotationPanel'";
      assert.equal(changed.split(relative).length - 1, 1, 'Owned board copy has one local panel binding');
      changed = changed.replace(relative, "from '@/components/nba-front-office/NbaRotationPanel'");
    }
    const copy = path.join(folder, path.basename(target)); owned.push(copy); await writeFile(copy, changed);
    const swaps = { ['@/' + target.slice(4).replace(/\.tsx$/, '')]: copy };
    if (target === panel) {
      const boardSource = held.find(([file]) => file === board)[1].source;
      const relative = "from './NbaRotationPanel'";
      assert.equal(boardSource.split(relative).length - 1, 1, 'The actual board uses exactly one controlled local panel import');
      const boardCopy = path.join(folder, path.basename(board)); owned.push(boardCopy);
      await writeFile(boardCopy, boardSource.replace(relative, "from '@/components/nba-front-office/NbaRotationPanel'"));
      swaps['@/components/nba-front-office/NbaFrontOfficeBoard'] = boardCopy;
      env.NBA_ROTATION_UI_PANEL_SOURCE = copy;
    }
    env.NBA_ROTATION_UI_SWAP = JSON.stringify(swaps);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 15, 'All fifteen scoped UI cases are discovered');
  assert.ok(rows.every(row => row.status === 'passed' || row.status === 'failed'), 'Every discovered case executes');
  for (const baseline of baselines) assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Original save, strength, callbacks and contracts baseline remains held');
  if (control) {
    const expected = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 15 - expected.length);
    assert.deepEqual(failed.map(row => row.title).sort(), [...expected].sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError: Unable to find (?:an accessible element with the role|an element with the text:)/);
    console.log(`NBA rotation UI ${control}: one executable expression changed in its isolated source copy.`);
    console.log(`NBA rotation UI ${control}: ${expected.length} intended failures, ${15 - expected.length} independent passes, zero skipped cases.`);
    console.log(`NBA_ROTATION_UI_CONTROL: ${JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })) })}`);
  } else {
    if (run.status !== 0) {
      process.stdout.write(output);
      console.log(JSON.stringify(rows.filter(row => row.status === 'failed').map(row => ({ title: row.title, messages: row.failureMessages }))));
    }
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 15); assert.equal(report.numFailedTests, 0);
    console.log('NBA rotation UI:15/15 real board and panel cases passed, zero skipped cases.');
    console.log('NBA rotation UI: exact slot swaps, changed strength, distinct selections, save reload and automatic removal held.');
    console.log('NBA rotation UI: old automatic save stays byte-identical, rejected choices stay quiet, injuries retain preferences and thin bench roles remain in place.');
    console.log('NBA rotation UI: an explicitly fictional selected bench prospect earns actual simulated games and points against the unchanged automatic baseline.');
    console.log('NBA rotation UI: exact opener focus uses preventScroll, controls retain native semantics and 44px sizing, earned motion is finite with static reduced motion.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original panel, board, test and simulation engine bytes remain held');
  }
}
