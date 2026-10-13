/* Offline actual loader/criteria regression. Run only in the remote CI job.
   PLAYER_BINGO_WC_CONTROL=alias|country changes a disposable executable copy. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'This proof runs on the remote CI runner only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport must be active');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.env.PLAYER_BINGO_WC_PHASE || 'fixed';
const control = process.env.PLAYER_BINGO_WC_CONTROL || '';
assert.ok(['baseline', 'fixed'].includes(phase));
assert.ok(['', 'alias', 'country'].includes(control));
assert.ok(!control || phase === 'fixed', 'Source controls require the fixed phase');
const test = 'src/test/playerBingoWorldCupAlias.test.ts';
const loader = 'src/lib/playerBingo.ts';
const files = [loader, test, 'src/lib/whoAmI.ts', 'src/lib/playerSearch.ts',
  'supabase/migrations/20260901_round_389_world_cup_2026_squads.sql', 'scripts/simPlayerBingoWorldCupAlias.mjs',
  'package.json', 'package-lock.json', 'bun.lock'];
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipts = () => held.map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: hash(bytes) }));
const ownedTitle = 'world cup alias: accepts Andrew Robertson from the recorded Andy Scotland 2026 row';
const countryTitle = 'refuses the Scottish alias for a wrong or absent squad country';
const titles = [ownedTitle, 'preserves canonical names and unrelated World Cup buckets',
  'does not turn the 2026 Scotland row into a 2022 appearance', 'does not turn the Scotland row into a winning squad',
  'refuses unknown similar names instead of matching a surname', countryTitle,
  'retains exact World Cup query predicates and a later canonical page',
  'keeps a failed World Cup read closed and aborts its owned siblings',
  'keeps an abandoned caller closed before issuing any reads'];
const expectedRed = phase === 'baseline' || control === 'alias' ? ownedTitle : control === 'country' ? countryTitle : '';
const out = process.env.PLAYER_BINGO_WC_OUT
  ? path.resolve(process.env.PLAYER_BINGO_WC_OUT, 'units', control || phase) : null;
let temp;
let changedSource;
let mutation;
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  temp = await mkdtemp(path.join(root, '.sim-control/player-bingo-wc-'));
  if (out) {
    await mkdir(out, { recursive: true });
    await writeFile(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
    await writeFile(path.join(out, 'playerBingo.ts.before'), held[0][1]);
  }
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = held[0][1].toString('utf8').replaceAll('\r\n', '\n');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    const anchor = control === 'alias' ? "keys.push('andrew robertson');" : "key === 'andy robertson' && normalizeName(r.nationality ?? '') === 'scotland'";
    const replacement = control === 'alias' ? 'void keys;' : "key === 'andy robertson'";
    assert.equal(code.split(anchor).length - 1, 1, 'Control binds one actual executable alias or country guard');
    assert.equal(source.split(anchor).length - 1, 1, 'Copy mutation is unique');
    changedSource = source.replace(anchor, replacement);
    assert.notEqual(changedSource, source, 'The control changes actual loader code');
    mutation = { control, anchor, replacement, originalSha256: hash(Buffer.from(source)), changedSha256: hash(Buffer.from(changedSource)) };
    const copy = path.join(temp, 'playerBingo.ts');
    await writeFile(copy, changedSource);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/playerBingo': copy });
    if (out) {
      await writeFile(path.join(out, 'playerBingo.ts.control'), changedSource);
      await writeFile(path.join(out, 'mutation.json'), JSON.stringify(mutation, null, 2));
    }
  }
  const reportFile = path.join(temp, 'unit.json');
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', test,
    '--reporter=default', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'],
  { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  let rawReport;
  try { rawReport = await readFile(reportFile); } catch { /* Retain raw output before a missing-report failure. */ }
  if (out) {
    await writeFile(path.join(out, 'output.log'), output);
    if (rawReport) await writeFile(path.join(out, 'unit.json'), rawReport);
  }
  assert.ok(!run.error && !run.signal, 'Runner must finish without setup failure');
  assert.doesNotMatch(output, /Unhandled (?:Errors?|Rejections?)|Uncaught Exception|Failed to (?:resolve import|load)|Cannot find (?:module|package)|SyntaxError|Transform failed|Test timed out|SIM_OFFLINE_BLOCK/i, 'No runtime, import, transport or unhandled error earns causal credit');
  assert.ok(rawReport, 'The actual unit report must exist');
  const report = JSON.parse(rawReport.toString('utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0, 'No reported unhandled error');
  assert.equal(report.testResults.length, 1, 'Exactly one physical unit file');
  assert.equal(report.testResults[0].message || '', '', 'No file-level runner error');
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 9); assert.equal(report.numTotalTests, 9);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.deepEqual(rows.map(row => row.title).sort(), [...titles].sort(), 'All nine named causal/preservation cases ran');
  assert.equal(new Set(rows.map(row => row.title)).size, 9);
  assert.equal(run.status, expectedRed ? 1 : 0);
  assert.equal(report.numFailedTests, expectedRed ? 1 : 0);
  assert.equal(report.numPassedTests, expectedRed ? 8 : 9);
  for (const row of rows) {
    assert.equal(row.status, row.title === expectedRed ? 'failed' : 'passed', row.title);
    if (row.title === expectedRed) {
      assert.equal(row.failureMessages.length, 1);
      const cause = expectedRed === ownedTitle
        ? /the recorded Scotland World Cup row should match Andrew Robertson[\s\S]*expected false to be true/
        : /an unverified country must not acquire the Scottish alias[\s\S]*expected true to be false/;
      assert.match(row.failureMessages[0], cause, 'Only the exact wrong identity outcome earns credit');
    } else assert.equal(row.failureMessages.length, 0);
  }
  if (out) await writeFile(path.join(out, 'verdict.json'), JSON.stringify({ status: 'passed', phase, control,
    physicalFiles: 1, cases: 9, intendedFailures: expectedRed ? 1 : 0, preservationPasses: expectedRed ? 8 : 9,
    expectedRed, runnerExit: run.status, mutation, limits: ['Mocked transport only; actual loader and criteria.', 'No production, browser, migration or real-value/stat credit.'] }, null, 2));
  console.log(`Player Bingo World Cup proof: ${phase}/${control || 'normal'}, one physical file and nine actual cases.`);
  console.log(`Identity outcome: ${expectedRed ? 'one exact intended rejection detected' : 'all nine outcomes passed'}.`);
  console.log(`Preservation: ${expectedRed ? 8 : 9} passed; no pending, file, setup or unhandled errors.`);
  console.log(`Transport: actual paged query predicates, failure cancellation and abandoned caller are held.`);
  console.log(`Source control: ${control ? 'one unique executable mutation changed the disposable loader' : 'actual unmutated loader used'}.`);
} finally {
  const after = await Promise.all(files.map(async file => {
    const bytes = await readFile(path.join(root, file));
    return { file, bytes: bytes.length, sha256: hash(bytes) };
  }));
  if (out) await writeFile(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts(), 'Actual loader, shared helpers, squad source, tests, harness and packages remain held');
  if (temp) await rm(temp, { recursive: true, force: true });
}
console.log('Source bytes held; raw unit/output/control receipts retained when OUT is set. Offline proof only.');
