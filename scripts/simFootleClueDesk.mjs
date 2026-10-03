import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/components/footle/FootleClueDesk.tsx', page = 'src/pages/Footle.tsx';
const test = 'src/test/footleClueDesk.test.tsx';
const titles = {
  values: 'renders all eight actual clues with honest unknown zero and opposite directions',
  history: 'revisits revealed guesses selects the next actual guess and returns focus to search',
  identity: 'resets selected history when mode and puzzle change with equal guess counts',
  review: 'reviews every finished round from frozen clues after reload without saved record writes',
  empty: 'shows a zero-guess miss honestly and exits review without carrying it into a new run',
  help: 'reopens clue instructions and restores the help trigger without changing reviewed clues',
};
const baseline = [
  'retains the original daily result quietly across remount without using the desk',
  'retains original duplicate guess and next guards independently of presentation',
];
const controls = {
  arrows: { file: component, from: "cell.arrow === 'up' ? 'Answer is higher' : 'Answer is lower'", to: "cell.arrow === 'up' ? 'Answer is lower' : 'Answer is higher'", title: titles.values, message: /assists gives the actual direction/ },
  unknown: { file: component, from: '>{cell.value}</dd>', to: ">{key === 'goals' && cell.status === 'unknown' ? '?' : cell.value}</dd>", title: titles.values, message: /goals keeps the actual guessed value/ },
  history: { file: component, from: 'setSelection({ index, count: guesses.length })', to: 'setSelection({ index: guesses.length - 1, count: guesses.length })', title: titles.history, message: /expected '2' to be '1'/ },
  focus: { file: page, from: "searchArea.current?.querySelector<HTMLInputElement>('input[role=\"combobox\"]')?.focus({ preventScroll: true });", to: 'void searchArea.current;', title: titles.history, message: /toHaveFocus/ },
  identity: { file: page, from: "key={`${mode}:${targetPlayer?.name ?? ''}`}", to: '', title: titles.identity, message: /expected '1' to be '2'/ },
  round: { file: page, from: 'const answer = practiceRun.pool.find(player => player.name === practiceRun.targets[reviewRound])!;', to: 'const answer = practiceRun.pool.find(player => player.name === practiceRun.targets[0])!;', title: titles.review, message: /keeps the actual comparison|gives the actual direction/ },
  snapshot: { file: page, from: 'compareGuess(practiceRun.pool.find(player => player.name === name)!, answer)', to: 'compareGuess({ ...practiceRun.pool.find(player => player.name === name)!, goals: 91 }, answer)', title: titles.review, message: /goals keeps the actual/ },
  write: { file: page, from: 'reviewOpener.current = event.currentTarget; setReviewRound(index);', to: "reviewOpener.current = event.currentTarget; localStorage.setItem('dukb-local-completions', '[]'); setReviewRound(index);", title: titles.review, message: /dukb-local-completions/ },
  empty: { file: component, from: 'No guesses were made for this puzzle.', to: 'No review is available.', title: titles.empty, message: /toBeVisible/ },
  help: { file: page, from: 'Each guess opens eight cards.', to: 'Each guess opens a table.', title: titles.help, message: /Each guess opens eight cards/ },
};
const mode = process.env.FOOTLE_CLUE_DESK_CONTROL || '';
assert.ok(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known clue desk control');
const output = path.join(root, 'footle-clue-desk-artifacts/mounted'); await mkdir(output, { recursive: true });
const held = [page, component, 'src/components/footle/FootleClueDesk.module.css', 'src/hooks/useGame.ts', 'src/hooks/useDailyPuzzle.ts', 'src/lib/gameLogic.ts', 'src/lib/footlePracticeRun.ts', 'src/components/game/GameBoard.tsx', test];
const verifyBytes = [], hashes = {};
for (const relative of held) {
  const file = path.join(root, relative); const bytes = await readFile(file);
  hashes[relative] = createHash('sha256').update(bytes).digest('hex');
  verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, bytes, `${relative} raw bytes held`)));
}
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'footle-clue-desk-'));
const outcomes = [], problems = [], copies = [];
try {
  for (const name of mode === 'all' ? ['', ...Object.keys(controls)] : [mode]) {
    const spec = controls[name], label = name || 'normal';
    try {
      const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP; delete env.NO_COLOR;
      if (spec) {
        const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
        assert.equal(source.split(spec.from).length - 1, 1, `${label}: exactly one executable anchor`);
        const changed = source.replace(spec.from, spec.to); assert.notEqual(changed, source);
        const copy = path.join(folder, `${label}-${path.basename(spec.file)}`); copies.push(copy); await writeFile(copy, changed);
        await writeFile(path.join(output, `${label}-source.txt`), changed);
        env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + spec.file.slice(4).replace(/\.tsx$/, '')]: copy });
      }
      const reportFile = path.join(output, `${label}.json`);
      const args = ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile];
      if (spec) args.push('--testNamePattern', [spec.title, ...baseline].map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
      const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024, windowsHide: true });
      const log = `${child.stdout || ''}\n${child.stderr || ''}`; await writeFile(path.join(output, `${label}.log`), log);
      assert.ok(!child.error && !child.signal, `${label}: test runner completed`);
      assert.doesNotMatch(log, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Test timed out|Cannot find module|not wrapped in act/, `${label}: no runtime failure credited`);
      const report = JSON.parse(await readFile(reportFile, 'utf8'));
      const rows = report.testResults.flatMap(file => file.assertionResults);
      assert.deepEqual(rows.map(row => row.title).sort(), [...Object.values(titles), ...baseline].sort());
      assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
      assert.equal(child.status, spec ? 1 : 0);
      assert.equal(report.numFailedTests, spec ? 1 : 0); assert.equal(report.numPassedTests, spec ? 2 : 8); assert.equal(report.numPendingTests, spec ? 5 : 0);
      if (spec) {
        const failed = rows.filter(row => row.status === 'failed'); assert.deepEqual(failed.map(row => row.title), [spec.title]);
        const message = failed[0].failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
        assert.match(message, /AssertionError:|Error: expect\(/); assert.match(message, spec.message);
        for (const title of baseline) assert.equal(rows.find(row => row.title === title)?.status, 'passed');
      } else assert.ok(rows.every(row => row.status === 'passed'));
      await Promise.all(verifyBytes.map(verify => verify()));
      outcomes.push({ mode: label, discovered: rows.length, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests, rejected: spec?.title ?? null, heldInputs: held.length });
      console.log(`simFootleClueDesk ${label}: ${report.numPassedTests} passed, ${report.numFailedTests} expected failures, ${report.numPendingTests} intentional skips; ${held.length} raw inputs held.`);
    } catch (error) { problems.push({ mode: label, name: error.name, message: error.message }); console.error(`${label}: ${error.message}`); }
  }
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ outcomes, problems, hashes, scope: 'Eight mounted actual-page/hook cases with fictional fixtures. Ten copied executable controls retain two independent original-engine baselines. No live player-data or browser-layout claim.' }, null, 2));
  assert.deepEqual(problems, []);
} finally {
  for (const file of copies) await rm(file, { force: true });
  await rmdir(folder); await Promise.all(verifyBytes.map(verify => verify()));
}
