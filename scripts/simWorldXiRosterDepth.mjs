/* Actual recent-snapshot loader outcomes with effective copied-source controls. Remote offline CI only. */
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
const originalFile = 'scripts/qa/source-controls/worldXi.before-roster-depth.ts.txt';
const sourceFile = 'src/lib/worldXi.ts';
const testFile = 'src/test/worldXiRosterDepth.test.ts';
const titles = [
  'finds a prior-year country player below the old top-1000 value cutoff',
  'keeps a tied-value prior-year player outside the first thousand returned rows',
  'keeps the newer snapshot even when its prior-year value is higher',
  'preserves same-year namesakes at different clubs',
  'rejects a failed current-snapshot page instead of silently using the other pages',
  'rejects a failed prior-snapshot page even when the current pool clears its floor',
  'rejects a null current-snapshot page without a transport error',
  'rejects a null prior-snapshot page without a transport error',
  'rejects an unproven complete current snapshot when its last supported page is full',
  'rejects an unproven complete prior snapshot when its last supported page is full',
  'keeps optional verified-position failure from blocking primary position play',
  'preserves source row fields and does not manufacture a later club or value',
];
const oldFailures = [titles[0], titles[1], ...titles.slice(4, 10)];
const files = [sourceFile, testFile, originalFile, 'scripts/simWorldXiRosterDepth.mjs', 'src/lib/positionFit.ts',
  'src/lib/squadShape.ts', 'src/lib/playerSearch.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'bun.lock'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
const receipts = () => held.map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: hash(bytes) }));
const source = held[0][1].toString('utf8').replaceAll('\r\n', '\n');
const originalBytes = held.find(([file]) => file === originalFile)[1];
assert.equal(originalBytes.length, 67_740, 'Exact acquired original control size');
assert.equal(hash(originalBytes), '2f8d2bce7ca13ff998217005066e3c68e6c4bf7bf24e63da750378badba2fd23', 'Exact original control from qualified artifact41394488957');
const original = originalBytes.toString('utf8');
assert.notEqual(source, original, 'Fixed proof requires an actual loader change');
const previousPages = `    const prevRequests = Array.from({ length: PREV_PAGES }, (_, i) =>
      supabase
        .from('player_market_values')
        .select(cols)
        .eq('year', PREV_YEAR)
        .gt('market_value_usd', 0)
        .order('id', { ascending: true })
        .range(i * PAGE, i * PAGE + PAGE - 1),
    );`;
const boundedPrevious = `    const prevRequests = [supabase
      .from('player_market_values')
      .select(cols)
      .eq('year', PREV_YEAR)
      .gt('market_value_usd', 0)
      .order('market_value_usd', { ascending: false })
      .limit(1000)];`;
const integrity = '      if (r.error || !Array.isArray(r.data)) return null;';
const controls = [
  ['coverage', previousPages, boundedPrevious, titles.slice(0, 2)],
  ['error', integrity, '      if (r.error) continue;\n      if (!Array.isArray(r.data)) return null;', titles.slice(4, 6)],
  ['null', integrity, '      if (r.error) return null;\n      if (!Array.isArray(r.data)) continue;', titles.slice(6, 8)],
  ['tail', '      if ((i === CURRENT_PAGES - 1 || i === results.length - 1) && r.data.length === PAGE) return null;\n', '', titles.slice(8, 10)],
];
const out = path.resolve(process.env.WORLD_XI_ROSTER_OUT || path.join(root, '.sim-artifacts/world-xi-roster-depth'));
assert.ok(out.startsWith(root + path.sep), 'Evidence stays inside the runner checkout');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
await writeFile(path.join(out, 'actual-worldXi.ts'), source);
await writeFile(path.join(out, 'original-worldXi.ts'), original);
let temp;
const results = [];
async function run(id, copy, expectedFailures = []) {
  const folder = path.join(out, id);
  await mkdir(folder, { recursive: true });
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (copy !== null) {
    const copiedFile = path.join(temp, `${id}.ts`);
    await writeFile(copiedFile, copy);
    await writeFile(path.join(folder, 'source-copy.ts'), copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/worldXi': copiedFile });
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
  assert.equal(child.status, expectedFailures.length ? 1 : 0);
  assert.equal(report.numFailedTests, expectedFailures.length);
  assert.equal(report.numPassedTests, titles.length - expectedFailures.length);
  for (const row of rows) {
    const failed = expectedFailures.includes(row.title);
    assert.equal(row.status, failed ? 'failed' : 'passed', row.title);
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (!failed) continue;
    assert.match(row.failureMessages[0], /AssertionError:/, 'Only an actual failed assertion earns causal credit');
    if (id === 'control-coverage') assert.match(row.failureMessages[0], /expected null not to be null/);
    else if (row.title === titles[0]) assert.match(row.failureMessages[0], /a known older-snapshot player must remain guessable[\s\S]*to include/);
    else if (row.title === titles[1]) assert.match(row.failureMessages[0], /expected \[\] to deeply equal/);
    else assert.match(row.failureMessages[0], /expected[\s\S]*to be null/);
  }
  const result = { id, runnerExit: child.status, cases: rows.length, intendedFailures: expectedFailures,
    preserved: titles.length - expectedFailures.length, copySha256: copy === null ? null : hash(Buffer.from(copy)),
    runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(count => count === null) ? 'UNKNOWN' : 'REPORTED',
    rawErrorFields: { errors: report.errors ?? null, unhandledErrors: report.unhandledErrors ?? null,
      testResults: report.testResults.map(file => ({ name: file.name, message: file.message ?? null, status: file.status })) } };
  results.push(result);
  await writeFile(path.join(folder, 'verdict.json'), JSON.stringify(result, null, 2));
  console.log(`${id}: ${rows.length} actual loader cases, ${expectedFailures.length} exact intended failures, ${result.preserved} preservation passes.`);
}
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  temp = await mkdtemp(path.join(root, '.sim-control/world-xi-depth-'));
  await run('normal', null);
  await run('original-control', original, oldFailures);
  let restored = source;
  for (const [id, anchor, replacement, failed] of controls) {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    assert.equal(code.split(anchor).length - 1, 1, 'The control binds one unique executable predicate');
    assert.equal(source.split(anchor).length - 1, 1);
    const changed = source.replace(anchor, replacement);
    assert.notEqual(hash(Buffer.from(changed)), hash(Buffer.from(source)), 'The source control changed actual code');
    const offset = source.indexOf(anchor);
    restored = changed.slice(0, offset) + anchor + changed.slice(offset + replacement.length);
    assert.equal(restored, source, 'The complete source copy is restored');
    await writeFile(path.join(out, `control-${id}.json`), JSON.stringify({ anchor, replacement,
      originalSha256: hash(Buffer.from(source)), changedSha256: hash(Buffer.from(changed)), restoredSha256: hash(Buffer.from(restored)) }, null, 2));
    await run(`control-${id}`, changed, failed);
  }
  await run('restored', restored);
  await writeFile(path.join(out, 'verdict.json'), JSON.stringify({ status: 'passed', base, results,
    scope: 'Actual loader on fictional rows; no production writes, current club claims, nation-mode adoption or live-fix credit.' }, null, 2));
} finally {
  const after = await Promise.all(files.map(async file => { const bytes = await readFile(path.join(root, file)); return { file, bytes: bytes.length, sha256: hash(bytes) }; }));
  await writeFile(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts(), 'Application, test, controls, shared rules and dependencies stay held');
  if (temp) await rm(temp, { recursive: true, force: true });
}
console.log('simWorldXiRosterDepth: normal, complete original, four effective guard controls and exact restored proof passed offline.');
