/* Actual criterion outcomes and effective copied-source controls. Remote offline CI only. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = 'src/lib/playerBingo.ts';
const testFile = 'src/test/playerBingoPalmerRed.test.ts';
const titles = [
  'accepts verified Palmer and includes him in tile support despite stale zero-red rows',
  'refuses related or extended names', 'refuses a wrong or missing nationality',
  'refuses an unknown or different role', 'refuses other birth cohorts',
  'refuses missing or invalid listed age and year',
  'keeps a historical dismissal available to an unrelated fictional player',
  'keeps zero and missing historical reds rejected for unrelated players',
  'does not infer same-season disciplinary combinations or rewrite other season facts',
  'adds no fabricated season statistics, club history or player fields',
];
const files = [sourceFile, testFile, 'scripts/simPlayerBingoPalmerRed.mjs', 'src/lib/whoAmI.ts',
  'src/lib/playerSearch.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'bun.lock'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
const receipts = () => held.map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: hash(bytes) }));
const source = held[0][1].toString('utf8').replaceAll('\r\n', '\n');
const executable = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
const helperStart = 'function hasVerifiedDismissal(p: BingoPlayer): boolean {';
assert.equal(executable.split(helperStart).length - 1, 1, 'The actual dismissal helper exists once');
const helper = source.slice(source.indexOf(helperStart), source.indexOf('\n}', source.indexOf(helperStart)) + 2);
const controls = [
  ['omission', 'hasVerifiedDismissal(p) || ', '', titles[0]],
  ['name', "normalizeName(p.name) === 'cole palmer'", 'true', titles[1]],
  ['country', "primaryNationality(p.nationality) === 'england'", 'true', titles[2]],
  ['role', "normalizeName(p.position) === 'attacking midfield'", 'true', titles[3]],
  ['cohort', 'p.year - p.age >= 2002 && p.year - p.age <= 2003', 'true', titles[4]],
  ['integer', 'Number.isInteger(p.age) && p.age > 0 && Number.isInteger(p.year) && p.year > 0', 'true', titles[5]],
];
const out = path.resolve(process.env.PLAYER_BINGO_PALMER_OUT || path.join(root, '.sim-artifacts/player-bingo-palmer-red'));
assert.ok(out.startsWith(root + path.sep), 'Evidence stays inside the runner checkout');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
await writeFile(path.join(out, 'actual-playerBingo.ts'), source);
let temp;
const results = [];
async function run(id, copy, expectedRed = '') {
  const folder = path.join(out, id);
  await mkdir(folder, { recursive: true });
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (copy !== null) {
    const copiedFile = path.join(temp, `${id}.ts`);
    await writeFile(copiedFile, copy);
    await writeFile(path.join(folder, 'source-copy.ts'), copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/playerBingo': copiedFile });
  }
  const reportFile = path.join(folder, 'unit.json');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', testFile,
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'],
  { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  await writeFile(path.join(folder, 'output.log'), output);
  assert.ok(!child.error && !child.signal, 'The runner completes without setup failure');
  assert.doesNotMatch(output, /Unhandled (?:Errors?|Rejections?)|Uncaught Exception|Failed to (?:resolve import|load)|Cannot find (?:module|package)|SyntaxError|Transform failed|Test timed out|SIM_OFFLINE_BLOCK/i);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.testResults.length, 1);
  assert.equal(report.testResults[0].message || '', '');
  const runtimeCounters = {
    numUnhandledErrors: report.numUnhandledErrors ?? null,
    numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null,
  };
  for (const [field, count] of Object.entries(runtimeCounters)) {
    if (count === null) continue;
    assert.equal(typeof count, 'number', `Reported ${field} is numeric`);
    assert.equal(count, 0, `Known positive ${field} rejects the proof`);
  }
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.equal(rows.length, titles.length); assert.equal(report.numTotalTests, titles.length);
  assert.equal(new Set(rows.map(row => row.title)).size, titles.length);
  assert.deepEqual(rows.map(row => row.title).sort(), [...titles].sort());
  assert.equal(child.status, expectedRed ? 1 : 0);
  assert.equal(report.numFailedTests, expectedRed ? 1 : 0);
  assert.equal(report.numPassedTests, expectedRed ? titles.length - 1 : titles.length);
  for (const row of rows) {
    assert.equal(row.status, row.title === expectedRed ? 'failed' : 'passed', row.title);
    assert.equal(row.failureMessages.length, row.title === expectedRed ? 1 : 0);
    if (row.title === expectedRed) assert.match(row.failureMessages[0], row.title === titles[0]
      ? /the verified 24 October 2026 dismissal must survive stale history[\s\S]*expected false to be true/
      : /an unverified identity must not inherit the dismissal[\s\S]*expected true to be false/);
  }
  const result = { id, runnerExit: child.status, cases: rows.length, intendedFailure: expectedRed || null, preserved: titles.length - (expectedRed ? 1 : 0), copySha256: copy === null ? null : hash(Buffer.from(copy)), runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(count => count === null) ? 'UNKNOWN' : 'REPORTED', rawErrorFields: { testResults: report.testResults.map(file => ({ name: file.name, message: file.message ?? null, status: file.status })) } };
  results.push(result);
  await writeFile(path.join(folder, 'verdict.json'), JSON.stringify(result, null, 2));
  console.log(`${id}: ${rows.length} actual criterion cases, ${expectedRed ? 1 : 0} exact intended failures, ${result.preserved} preservation passes.`);
}
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  temp = await mkdtemp(path.join(root, '.sim-control/bingo-palmer-'));
  await run('normal', null);
  let restored = source;
  for (const [id, anchor, replacement, title] of controls) {
    const target = id === 'omission' ? source : helper;
    const code = target.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    assert.equal(code.split(anchor).length - 1, 1, 'The control binds one executable predicate in its owned scope');
    assert.equal(target.split(anchor).length - 1, 1);
    const altered = target.replace(anchor, replacement);
    const changed = id === 'omission' ? altered : source.replace(helper, altered);
    assert.notEqual(hash(Buffer.from(changed)), hash(Buffer.from(source)), 'The source control changed actual code');
    const offset = target.indexOf(anchor);
    const undo = altered.slice(0, offset) + anchor + altered.slice(offset + replacement.length);
    restored = id === 'omission' ? undo : changed.replace(altered, undo);
    assert.equal(restored, source, 'The complete executable copy is restored');
    await writeFile(path.join(out, `control-${id}.json`), JSON.stringify({ anchor, replacement, originalSha256: hash(Buffer.from(source)), changedSha256: hash(Buffer.from(changed)), restoredSha256: hash(Buffer.from(restored)) }, null, 2));
    await run(`control-${id}`, changed, title);
  }
  await run('restored', restored);
  await writeFile(path.join(out, 'verdict.json'), JSON.stringify({ status: 'passed', results,
    scope: 'Actual criterion on retained and constructed inputs; no production, browser or live-fix claim.' }, null, 2));
} finally {
  const after = await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); return { file, bytes: bytes.length, sha256: hash(bytes) }; }));
  await writeFile(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts(), 'Application, tests, controls, helpers and packages stay held');
  if (temp) await rm(temp, { recursive: true, force: true });
}
console.log('simPlayerBingoPalmerRed: normal, six effective source controls and exact restored proof passed offline.');

