/* Round 881: actual court/page selection with explicit offline hook fixtures.
   NBA_COURT_CONTROL mutates only disposable source copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const court = 'src/components/nba/NbaCourtLayout.tsx';
const page = 'src/pages/NbaLineup.tsx';
const test = 'src/test/nbaCourtSelection.test.tsx';
const files = [court, page, test, 'src/hooks/useNbaLineup.ts', 'src/types/nba.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = {
  indices: 'selects every empty court position through the original index callback',
  selected: 'exposes the selected empty court slot and retains native focus',
  locked: 'refuses court callbacks while selection is explicitly locked',
  filled: 'keeps filled court cards inert while empty slots remain selectable',
  static: 'leaves empty court cards static without the optional selection callback',
  page: 'routes court and position-row picks through the same page handler',
  spin: 'locks court and position-row picks during team spin',
  validation: 'locks court and position-row picks during player validation',
  input: 'clears the previous position input through the existing court selection path',
  focus: 'keeps court opener focus while the existing row still autofocuses player input',
};
const controls = {
  callback: [page, 'onSelectPosition={index => { setCourtSelection(true); selectPosition(index); }}', 'onSelectPosition={() => {}}', [titles.page, titles.input, titles.focus]],
  index: [court, 'onClick={isInteractive ? () => onSelectPosition?.(i) : undefined}', 'onClick={isInteractive ? () => onSelectPosition?.(0) : undefined}', [titles.indices, titles.selected, titles.filled, titles.page, titles.input, titles.focus]],
  lock: [court, 'disabled={isInteractive ? selectionDisabled : undefined}', 'disabled={undefined}', [titles.locked, titles.spin, titles.validation]],
  rowvalidation: [page, 'disabled={isFilled || isTeamSpinning || isValidating}', 'disabled={isFilled || isTeamSpinning}', [titles.validation]],
  filled: [court, 'const isInteractive = !!onSelectPosition && !filled;', 'const isInteractive = !!onSelectPosition;', [titles.filled]],
  selected: [court, 'aria-pressed={isInteractive ? isSelected : undefined}', 'aria-pressed={isInteractive ? false : undefined}', [titles.selected, titles.page]],
  static: [court, 'const isInteractive = !!onSelectPosition && !filled;', 'const isInteractive = !filled;', [titles.static]],
  focus: [page, 'autoFocus={!courtSelection}', 'autoFocus', [titles.focus]],
};
const control = process.env.NBA_COURT_CONTROL || '';
assert.ok(!control || control in controls, 'Known court copied control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n')), originalBytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Actual copied controls bind once under CRLF');
  assert.deepEqual(crlfBytes, originalBytes, 'CRLF source bytes held');
}
let folder; const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nba-court881-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  if (control) {
    const [file, anchor, replacement] = controls[control], source = held.find(([name]) => name === file)[1].source;
    assert.equal(source.split(anchor).length - 1, 1, 'Control changes exactly one executable binding');
    const changed = source.replace(anchor, replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, file === court ? 'NbaCourtLayout.tsx' : 'NbaLineup.tsx');
    await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [file === court ? '@/components/nba/NbaCourtLayout' : '@/pages/NbaLineup']: copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile.json=' + reportFile], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(result => result.assertionResults); assert.equal(rows.length, 14);
  if (control) {
    const expected = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, expected.length); assert.equal(report.numPassedTests, 14 - expected.length);
    assert.deepEqual(failed.map(row => row.title), expected);
    assert.equal(rows.find(row => row.title === 'preserves read-only player names stat rounding units and zero values')?.status, 'passed');
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError:/);
    console.log(`NBA court ${control}: one actual binding changed only in an owned source copy.`);
    console.log(`NBA court ${control}: ${expected.length} intended outcomes rejected, ${14 - expected.length} remaining cases passed; all14 ran, none skipped or unhandled.`);
    console.log(`NBA_COURT_CONTROL: ${JSON.stringify({ control, failed: expected, messages: failed.map(row => row.failureMessages) })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 14);
    console.log('NBA court:14/14 actual component/page cases passed, none skipped or unhandled; hook and heavy presentation are explicit offline fixtures.');
    console.log('NBA court: native empty buttons dispatch original position indices, expose selected state and leave filled/read-only cards inert.');
    console.log('NBA court: court and existing row share the original page handler, disable during team spin and player validation, and clear old position input.');
    console.log('NBA court: court selection keeps its opener focus while row selection retains existing player-input autofocus.');
    console.log('NBA court: player names, integer/decimal/string/zero stats and units remain exact; challenge/review/result phases stay free of court controls.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes, 'Production court/page/test/hook/type bytes held'); }
}
console.log('NBA court: CRLF executable controls bind, original bytes held, owned copies cleaned. Native keyboard/touch geometry is verified separately.');
