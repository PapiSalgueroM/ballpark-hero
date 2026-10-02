/* Round 892: actual practice promotion cap, saved Board and executable controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = 'src/lib/frontOffice.ts', board = 'src/components/front-office/FrontOfficeBoard.tsx';
const test = 'src/components/front-office/FrontOfficePromotion.test.tsx';
const files = [engine, board, test, 'src/components/front-office/FrontOfficeFullRoster.test.tsx', 'scripts/simNflFullRosters.mjs', 'src/lib/frontOfficeCuts.ts', 'src/lib/frontOfficeSave.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
const titles = [
  'holds ordinary free-agent admission as an independent baseline',
  'holds legacy, membership and roster capacity refusals as an independent baseline',
  ...['missing', 'null', 'NaN', 'infinity', 'negative infinity', 'zero', 'negative', 'string', 'object'].map(value => `refuses invalid cap context ${value} without moving a player`),
  'refuses unaffordable promotion with raw team, depth and array identity held',
  'counts dead money before deciding promotion affordability',
  ...[20, 18].map(value => `keeps accepted promotion exact with ${value}M available and rejects replay`),
  'shows the real price and refusal while a rejected Board click leaves the save exact',
  'saves the exact affordable player and depth and restores that promotion once',
  'updates every remaining call-up against the newly committed cap room',
  'shows the dead-money refusal through the actual restored Board',
  ...['null', 'negative', 'string', 'NaN', 'infinity'].map(value => `refuses invalid practice salary ${value} before mutation`),
  'refuses an unpriced practice player from an actual restored save',
  'keeps a valid zero-cost call-up exact instead of inventing a price',
];
const controls = {
  capContext: [engine, "  if (!Number.isFinite(cap) || cap <= 0) return 'The current cap is unavailable.';", '  void cap;', [2, 4, 5, 9, 10]],
  affordability: [engine, '  if (p.salary > room) return `Need $${Math.round((p.salary - room) * 10) / 10}M more cap room to call him up.`;', '  void room;', [11, 12, 15, 17, 18]],
  salary: [engine, "  if (!Number.isFinite(p.salary) || p.salary < 0) return 'His call-up salary is unavailable.';", '  void p.salary;', [19, 20, 21, 22, 24]],
  deadMoney: [engine, '  const room = capRoom(team, cap);', '  const room = Math.round((cap - team.players.reduce((sum, p) => sum + p.salary, 0)) * 10) / 10;', [12, 18]],
  caller: [board, 'man && promoteFromPractice(t, pid, lg.cap)', 'man && promoteFromPractice(t, pid)', [16, 17]],
  price: [board, " · {Number.isFinite(p.salary) && p.salary >= 0 ? `$${p.salary}M` : 'Salary unavailable'}", '', [15, 16, 24]],
  reason: [board, '{refusal && !fullBlock && <span data-practice-refusal className="block text-[10px] text-destructive">{refusal}</span>}', '', [15, 17, 18, 24]],
};
const control = process.env.NFL_PRACTICE_CONTROL || '';
assert.ok(!control || control in controls, 'Known practice promotion control');
for (const [file, anchor] of Object.values(controls)) {
  const source = held.find(([name]) => name === file)[1].source;
  assert.equal(source.split(anchor).length - 1, 1, 'Control binds exactly one executable expression');
  const crlfBytes = Buffer.from(source.replaceAll('\n', '\r\n')), bytes = Buffer.from(crlfBytes);
  assert.equal(holdSource(crlfBytes).source.split(anchor).length - 1, 1, 'Same expression binds with CRLF checkout');
  assert.deepEqual(crlfBytes, bytes, 'CRLF bytes held');
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/nfl-practice892-'));
  const aliases = {};
  for (const file of [engine, board]) {
    let source = held.find(([name]) => name === file)[1].source;
    if (control && controls[control][0] === file) {
      const [, anchor, replacement] = controls[control], changed = source.replace(anchor, replacement);
      assert.notEqual(changed, source, 'Control changes executable production code'); source = changed;
    }
    if (file === engine) source = source.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    const copy = path.join(folder, path.basename(file)); await writeFile(copy, source); owned.push(copy);
    aliases['@/' + file.slice(4).replace(/\.tsx?$/, '')] = copy;
  }
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const env = { ...process.env, FORCE_COLOR: '0', VITEST_MAX_FORKS: '1', VITEST_MIN_FORKS: '1', NO_DOUBLE_SWAP: JSON.stringify(aliases) };
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'One-worker actual Board and engine runner completes');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0); assert.equal(report.numPendingTests, 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 26);
  assert.deepEqual(rows.map(row => row.title), titles, 'All actual outcomes execute without filters');
  assert.ok(rows.every(row => row.status === 'failed' || row.status === 'passed'), 'No skipped or pending cases');
  if (control) {
    const indices = controls[control][3], failed = rows.filter(row => row.status === 'failed');
    console.log('NFL_PRACTICE_MEASURE: ' + JSON.stringify({ control, passed: report.numPassedTests, failed: failed.map(row => row.title) }));
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, indices.length); assert.equal(report.numPassedTests, 26 - indices.length);
    assert.deepEqual(failed.map(row => row.title).sort(), indices.map(i => titles[i]).sort());
    for (const row of failed) assert.match(row.failureMessages.join('\n'), /AssertionError:|TestingLibraryElementError: Unable to find an element with the text:|Error: expect\(element\).toBeDisabled\(\)/);
    for (const index of [0, 1, 13, 14, 25]) assert.equal(rows[index].status, 'passed', 'Independent admission, refusal and exact accepted identity outcomes held');
    console.log(`NFL practice promotion ${control}: ${indices.length} exact intended failures, ${26 - indices.length} independent passes; all26 execute.`);
    console.log('NFL_PRACTICE_CONTROL: ' + JSON.stringify({ control, failed: failed.map(row => ({ title: row.title, messages: row.failureMessages })) }));
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 26); assert.equal(report.numFailedTests, 0);
    console.log('NFL practice promotion:26/26 actual engine and saved Board outcomes pass, no skipped cases.');
    console.log('NFL practice promotion: cap context, selected salary, dead money, exact cap equality and repeated promotion refuse or commit the measured state correctly.');
    console.log('NFL practice promotion: actual Board displays salary and refusal, holds rejected save bytes, persists accepted player identity and depth, restores once and reevaluates remaining cap.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Actual engine, Board, test and existing caller bytes held');
  }
}
console.log('NFL practice promotion: executable CRLF controls bind, raw bytes held and owned copies cleaned. This is offline engine and component evidence, not native or production-data acceptance.');
