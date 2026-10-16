/* Actual criterion outcomes only. All application runtime belongs on the remote CI runner. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.env.PLAYER_BINGO_RODRI_PHASE || 'fixed';
assert.ok(['baseline', 'fixed'].includes(phase));
const base = '5b630266d261b39128e4fb4544783d8e22214ce3';
const sourceFile = 'src/lib/playerBingo.ts';
const testFile = 'src/test/playerBingoRodriHonour.test.ts';
const owned = 'accepts verified Rodri with sparse history and both listed age conventions';
const titles = [owned, 'refuses similar names instead of broad Rodrigo aliases', 'refuses a wrong or missing nationality',
  'refuses unknown or different positions', 'refuses other birth cohorts including the retained Rodri namesakes',
  'refuses missing or invalid listed age and year', 'keeps historical title evidence available to an unrelated player',
  'keeps non-winning club seasons rejected for unrelated players', 'preserves PSG 2025 and 2026 titles and the late arrival exclusion',
  'adds no fabricated club season history or statistics', 'does not turn the verified title into other honours or club matches'];
const files = [sourceFile, testFile, 'src/pages/PlayerBingo.tsx', 'src/lib/whoAmI.ts', 'src/lib/playerSearch.ts',
  'src/test/playerBingoHonours.test.ts', 'scripts/simPlayerBingoHonours.mjs', 'scripts/simPlayerBingoRodriHonour.mjs',
  'vitest.config.ts', 'package.json', 'package-lock.json', 'bun.lock'];
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipts = () => held.map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: hash(bytes) }));
const original = execFileSync('git', ['show', `${base}:${sourceFile}`], { cwd: root, encoding: 'utf8' }).replaceAll('\r\n', '\n');
const source = held[0][1].toString('utf8').replaceAll('\r\n', '\n');
const out = path.resolve(process.env.PLAYER_BINGO_RODRI_OUT || path.join(root, '.sim-artifacts/player-bingo-rodri'));
assert.ok(out.startsWith(root + path.sep));
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
await writeFile(path.join(out, 'original-playerBingo.ts'), original);
await writeFile(path.join(out, 'actual-playerBingo.ts'), source);
let temp;
const results = [];
async function run(id, copy, expectedFailures) {
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
  const args = ['node_modules/vitest/vitest.mjs', 'run', testFile, '--reporter=default', '--reporter=json',
    '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;
  await writeFile(path.join(folder, 'output.log'), output);
  assert.ok(!child.error && !child.signal, 'Runner must complete');
  assert.doesNotMatch(output, /Unhandled (?:Errors?|Rejections?)|Uncaught Exception|Failed to (?:resolve import|load)|Cannot find (?:module|package)|SyntaxError|Transform failed|Test timed out|SIM_OFFLINE_BLOCK/i);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.testResults.length, 1);
  assert.equal(report.testResults[0].message || '', '');
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.equal(rows.length, titles.length); assert.equal(report.numTotalTests, titles.length);
  assert.deepEqual(rows.map(row => row.title).sort(), [...titles].sort());
  assert.equal(new Set(rows.map(row => row.title)).size, titles.length);
  assert.equal(child.status, expectedFailures.length ? 1 : 0);
  assert.equal(report.numFailedTests, expectedFailures.length);
  assert.equal(report.numPassedTests, titles.length - expectedFailures.length);
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.title).sort(), [...expectedFailures].sort());
  for (const row of rows) {
    assert.equal(row.status, expectedFailures.includes(row.title) ? 'failed' : 'passed', row.title);
    assert.equal(row.failureMessages.length, expectedFailures.includes(row.title) ? 1 : 0);
    if (expectedFailures.includes(row.title)) assert.match(row.failureMessages[0], row.title === owned
      ? /the verified Rodri title must survive sparse history[\s\S]*expected false to be true/
      : /an unverified identity must not inherit Rodri title[\s\S]*expected true to be false/);
  }
  const result = { id, runnerExit: child.status, cases: rows.length, failed: expectedFailures, preserved: titles.length - expectedFailures.length, copySha256: copy === null ? null : hash(Buffer.from(copy)) };
  results.push(result);
  await writeFile(path.join(folder, 'verdict.json'), JSON.stringify(result, null, 2));
  console.log(`${id}: actual criterion ${rows.length} cases, ${expectedFailures.length} exact intended failures, ${result.preserved} preservation passes.`);
}
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  temp = await mkdtemp(path.join(root, '.sim-control/bingo-rodri-'));
  if (phase === 'baseline') {
    assert.equal(source, original, 'Baseline uses the complete original product source');
    await run('baseline', null, [owned]);
  } else {
    assert.notEqual(source, original, 'Fixed phase must include a real application change');
    await run('normal', null, []);
    await run('original-control', original, [owned]);
    const controls = [
      ['name', 'normalizeName(p.name) === fact.name', 'true', titles[1]],
      ['country', 'primaryNationality(p.nationality) === fact.nationality', 'true', titles[2]],
      ['role', 'normalizeName(p.position) === fact.position', 'true', titles[3]],
      ['cohort', 'p.year - p.age >= fact.birthYear && p.year - p.age <= fact.birthYear + 1', 'true', titles[4]],
      ['listed-age', 'Number.isInteger(p.age) && p.age > 0 && Number.isInteger(p.year) && p.year > 0', 'true', titles[5]],
    ];
    let restored;
    for (const [id, anchor, replacement, title] of controls) {
      const executable = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(executable.split(anchor).length - 1, 1, 'Control binds one executable guard');
      assert.equal(source.split(anchor).length - 1, 1);
      const changed = source.replace(anchor, replacement);
      assert.notEqual(hash(Buffer.from(changed)), hash(Buffer.from(source)));
      const offset = source.indexOf(anchor);
      restored = changed.slice(0, offset) + anchor + changed.slice(offset + replacement.length);
      assert.equal(restored, source, 'The complete mutation is reversible');
      await writeFile(path.join(out, `control-${id}.undo.ts`), restored);
      await writeFile(path.join(out, `control-${id}.json`), JSON.stringify({ anchor, replacement, originalSha256: hash(Buffer.from(source)), changedSha256: hash(Buffer.from(changed)) }, null, 2));
      await run(`control-${id}`, changed, [title]);
    }
    await run('restored', restored, []);
  }
  await writeFile(path.join(out, 'verdict.json'), JSON.stringify({ status: 'passed', phase, base, results,
    scope: 'Actual local criterion on constructed inputs; no production database, AI validator, browser or live-fix claim.' }, null, 2));
} finally {
  const after = await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); return { file, bytes: bytes.length, sha256: hash(bytes) }; }));
  await writeFile(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts(), 'Application, tests, harnesses and packages must remain held');
  if (temp) await rm(temp, { recursive: true, force: true });
}
console.log(`simPlayerBingoRodriHonour: ${phase} proof passed; complete raw reports and changed-copy receipts retained. Offline only.`);
