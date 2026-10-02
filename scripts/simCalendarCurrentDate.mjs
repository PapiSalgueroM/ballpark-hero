/* Round869: current-date navigation changes only the viewed month/selection.
   CALENDAR_CURRENT_DATE_CONTROL=view|selection|today|sim|target proves each
   actual rendered behavior through a temporary component copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = 'src/components/club-manager/CalendarScreen.tsx';
const test = 'src/test/calendarCurrentDate.test.tsx';
const baselines = ['preserves bounded month browsing and day inspection without simulating', 'preserves explicit fast forward and training callbacks'];
const controls = {
  view: { anchor: 'setView({ y: days.today.y, m: days.today.m });', replacement: 'void days.today;', test: 'returns from a distant future month to the actual simulated date without taking a turn' },
  selection: { anchor: 'const returnToCurrentDate = () => {\n    setView({ y: days.today.y, m: days.today.m });\n    setSelectedKey(null);\n  };', replacement: 'const returnToCurrentDate = () => {\n    setView({ y: days.today.y, m: days.today.m });\n  };', test: 'clears an inspected day even when already viewing the current month' },
  today: { anchor: 'setView({ y: days.today.y, m: days.today.m });', replacement: 'setView({ y: days.seasonStart.y, m: days.seasonStart.m });', test: 'uses the advanced career date and year while keeping browsing stable until asked' },
  sim: { anchor: 'const returnToCurrentDate = () => {', replacement: 'const returnToCurrentDate = () => {\n    onSimTo(c.week);', test: 'keeps repeated returns read only for career storage simulation and training' },
  target: { anchor: 'className="min-h-[44px] rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"', replacement: 'className="rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"', test: 'keeps an enabled44px native button and keyboard focus through the return' },
};
const control = process.env.CALENDAR_CURRENT_DATE_CONTROL || '';
assert.ok(!control || control in controls, 'Known Calendar Current date control');
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all([component, test, 'src/lib/clubManager.ts', 'src/lib/clubManagerCalendar.ts'].map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/calendar-current-date-'));
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1000', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' }; delete env.NO_DOUBLE_SWAP;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control], source = held.find(([file]) => file === component)[1].source;
    assert.equal(source.split(spec.anchor).length - 1, 1, 'An actual executable control must bind exactly once');
    const changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, 'CalendarScreen.tsx'); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/CalendarScreen': copy });
    args.push('--testNamePattern', [spec.test, ...baselines].join('|'));
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Focused runner must finish normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 8);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 2); assert.equal(report.numPendingTests, 5);
    const target = rows.find(row => row.title === controls[control].test); assert.equal(target?.status, 'failed');
    for (const title of baselines) assert.equal(rows.find(row => row.title === title)?.status, 'passed');
    assert.match(target.failureMessages.join('\n'), /AssertionError:|expect\(element\)|TestingLibraryElementError: Unable to find an element with the text:/);
    console.log(`Calendar Current date ${control}: one actual executable binding changed in an isolated component copy.`);
    console.log(`Calendar Current date ${control}: one intended outcome failed, both original browsing/callback baselines passed, five explicit skips.`);
    console.log(`CALENDAR_CURRENT_CONTROL: ${JSON.stringify({ control, title: target.title, messages: target.failureMessages })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 8); assert.equal(report.numPendingTests, 0);
    console.log('Calendar Current date:8/8 actual-screen cases passed, none skipped, with the real career/calendar engine.');
    console.log('Calendar Current date: distant past/future months return to the actual simulated day and clear the inspected day.');
    console.log('Calendar Current date: advanced career date/year stays authoritative; browsing remains where the user left it until asked.');
    console.log('Calendar Current date: same-month returns and repeated clicks clear inspection without simulation, training, storage writes or career changes.');
    console.log('Calendar Current date: enabled44px native button, key routing and exact element/focus persist through the return.');
    console.log('Calendar Current date: original bounded month browsing, day inspection, explicit fast forward and training callbacks remain intact.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Production component, focused test, career and calendar engine bytes held');
  }
}
console.log('Calendar Current date: normalized copied controls, original bytes held, owned temporary files cleaned. Native geometry/keyboard acceptance remains pending.');
