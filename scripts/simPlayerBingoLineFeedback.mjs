/* Round 870: real page placements and scoring with fictional boundary data.
   PLAYER_BINGO_LINE_CONTROL corrupts one earned-feedback behavior in a copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.PLAYER_BINGO_LINE_CONTROL || '';
assert.ok(['', 'constant', 'delta', 'status', 'motion'].includes(control));
const files = [
  'src/pages/PlayerBingo.tsx', 'src/components/player-bingo/LineBanner.tsx',
  'src/lib/playerBingo.ts', 'src/components/game/ResultScreen.tsx',
  'src/test/playerBingoLineFeedback.test.tsx',
];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const oneLine = 'announces one added line as 100 while the actual total moves 100 to 200';
const twoLines = 'announces two intersection lines as 200 while the actual total moves 100 to 300';
const accessible = 'announces earned feedback then clears after 1800ms with static reduced-motion binding';
const mutations = {
  constant: [1, '+{points} bonus', '+100 bonus', [twoLines]],
  delta: [0, 'points: (linesNow - linesCompleted) * 100', 'points: linesNow * 100', [oneLine, twoLines]],
  status: [1, 'role="status"', '', [accessible]],
  motion: [1, 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300', 'animate-in fade-in slide-in-from-top-2 duration-300', [accessible]],
};
// Each actual replacement survives CRLF without using normalized bytes as a hold check.
for (const [index, anchor] of Object.values(mutations)) {
  const source = held[index][1].source;
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n'));
  const crlfHeld = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1);
  assert.deepEqual(crlfBytes, crlfHeld);
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/player-bingo-line870-'));
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const [index, anchor, replacement] = mutations[control];
    const source = held[index][1].source;
    assert.equal(source.split(anchor).length - 1, 1, 'Control binds one real rendered or earned-points behavior');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'Disposable source actually changes');
    const copy = path.join(folder, path.basename(files[index]));
    await writeFile(copy, changed); owned.push(copy);
    const alias = index === 0 ? '@/pages/PlayerBingo' : '@/components/player-bingo/LineBanner';
    env.NO_DOUBLE_SWAP = JSON.stringify({ [alias]: copy });
  }
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/playerBingoLineFeedback.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner completes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner errors do not count as outcome failures');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 7);
  if (control) {
    const intended = mutations[control][3];
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, intended.length);
    assert.equal(report.numPassedTests, 7 - intended.length);
    for (const title of intended) assert.equal(rows.filter(row => row.title === title).length, 1);
    for (const row of rows) {
      assert.equal(row.status, intended.includes(row.title) ? 'failed' : 'passed', row.fullName);
      if (row.status === 'failed') assert.match(row.failureMessages.join('\n'), /expect\(element\)\.toHave(?:TextContent|Attribute|Class)/);
    }
    console.log(`simPlayerBingoLineFeedback ${control}: one executable behavior changed in a disposable component or page.`);
    console.log(`simPlayerBingoLineFeedback ${control}: ${intended.length} exact earned-feedback assertions reject the control, ${7 - intended.length} independent cases pass.`);
    console.log(`simPlayerBingoLineFeedback ${control}: first-line bank, full blackout, wrong guess, skip and deck exhaustion accounting remain green.`);
    console.log(`simPlayerBingoLineFeedback ${control}: ${rows.find(row => row.status === 'failed').failureMessages[0].split('\n')[0]}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 7); assert.equal(report.numFailedTests, 0);
    console.log('simPlayerBingoLineFeedback: seven actual page placement and completion cases pass, none skipped.');
    console.log('simPlayerBingoLineFeedback: real line counting earns 100 for one added line and 200 for an intersection, matching displayed totals.');
    console.log('simPlayerBingoLineFeedback: first-line bank is 100, blackout is 1700, shares and once-only result booking stay exact.');
    console.log('simPlayerBingoLineFeedback: status feedback keeps its 1800ms lifetime and uses motion-safe animation classes.');
    console.log('simPlayerBingoLineFeedback: wrong placement, skip, exhaustion, replay and unmount preserve accounting.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual page, component, line counting, results and test bytes held');
  }
}
console.log('simPlayerBingoLineFeedback: CRLF bindings proved, original bytes held and owned copies cleaned; fictional fixtures, no browser or backend calls.');
