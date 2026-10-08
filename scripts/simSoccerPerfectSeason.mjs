// Pure outcome proof. Copied source controls never change the actual engine.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.resolve(root, process.env.QA_OUT || '.sim-control/soccer-perfect-season-evidence', 'soccer-perfect-season');
const testFile = 'src/test/soccerPerfectSeason.test.ts', engineFile = 'src/lib/soccerPerfectSeason.ts';
const total = 12, baseline = 'keeps an independent win and loss points ledger';
const controls = {
  reserve: { test: 'reserves a basic card for every remaining slot on every reachable draft', from: '+ 3 * remainingSlots', to: '+ 0 * remainingSlots' },
  ceiling: { test: 'matches an exhaustive affordable ceiling and keeps its legal witness', from: 'const weightedStrength = state.weightedStrength + card.rating * SOCCER_PS_SLOTS[slot].weight;', to: 'const weightedStrength = state.weightedStrength + card.rating;' },
  draw: { test: 'scores the worked draw fixture as 112 points and 98', from: 'const points = 3 * wins + draws;', to: 'const points = 3 * wins;' },
  perfect: { test: 'requires 38 wins for perfect and no losses for unbeaten', from: 'perfect: games.length === SOCCER_PS_GAMES && wins === SOCCER_PS_GAMES', to: 'perfect: games.length === SOCCER_PS_GAMES && losses === 0' },
  version: { test: 'changes actual deal and season streams across dates modes and versions', from: 'return Math.floor(keyedRng(`${version}|soccer-perfect-season|daily|${date}`)() * 2 ** 32);', to: 'return Math.floor(keyedRng(`${SOCCER_PS_VERSION}|soccer-perfect-season|daily|${date}`)() * 2 ** 32);' },
  advantage: { test: 'measures paired strongest versus cheapest daily outcomes', from: 'const win = Math.min(1, Math.max(0, weightedStrength / bestStrength) ** SOCCER_PS_ALPHA);', to: 'const win = 1;' },
};
const requested = process.env.SOCCER_SEASON_CONTROL || '';
assert.ok(requested === '' || requested === 'all' || Object.hasOwn(controls, requested), 'Known Soccer Perfect Season control');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asError = error => ({ name: error?.name, message: error?.message || String(error), code: error?.code, stack: error?.stack });
const heldFiles = [engineFile, testFile, 'scripts/simSoccerPerfectSeason.mjs', 'src/lib/keyedRng.ts', 'src/lib/perfectSeason.ts', 'src/lib/dateUtils.ts', 'vitest.config.ts', 'package.json', 'package-lock.json'];
const held = new Map();
await mkdir(evidence, { recursive: true });
for (const file of heldFiles) {
  const bytes = await readFile(path.join(root, file));
  held.set(file, bytes);
  await mkdir(path.dirname(path.join(evidence, 'source', file)), { recursive: true });
  await writeFile(path.join(evidence, 'source', file), bytes);
}
const source = held.get(engineFile).toString('utf8').replace(/\r\n/g, '\n');
const summary = { run: process.env.GITHUB_RUN_ID || null, attempt: process.env.GITHUB_RUN_ATTEMPT || null,
  head: process.env.GITHUB_SHA || null, totalTests: total, baseline, cases: [],
  sourceBefore: Object.fromEntries([...held].map(([file, bytes]) => [file, hash(bytes)])),
  sourceAfter: null, status: 'running', limits: ['Pure finite engine evidence; no UI, browser, database or production claim.',
    'Alpha5 is a provisional game rule. A first direction measurement does not accept a fixed margin.',
    'Each copied source control runs its intended outcome test plus the unrelated win/loss ledger.'] };
const saveSummary = () => writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

async function runCase(name) {
  const spec = controls[name], folder = path.join(evidence, name);
  const row = { name, intended: spec?.test || null, status: 'running', mutation: null, process: null, hashes: {} };
  summary.cases.push(row);
  await mkdir(folder, { recursive: true });
  await saveSummary();
  try {
    const env = { ...process.env, FORCE_COLOR: '0', SOCCER_SEASON_MEASURE_OUT: path.join(folder, 'measurement.json'), SOCCER_SEASON_OUTCOME_OUT: path.join(folder, 'outcomes.json') };
    delete env.NO_DOUBLE_SWAP; delete env.NO_COLOR;
    const reportFile = path.join(folder, 'vitest.json');
    const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile, '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
    if (spec) {
      assert.equal(source.split(spec.from).length - 1, 1, `${name}: one executable mutation anchor`);
      assert.equal(source.split(spec.to).length - 1, 0, `${name}: replacement is absent from original`);
      const changed = source.replace(spec.from, spec.to);
      assert.notEqual(changed, source, `${name}: actual copied bytes changed`);
      assert.equal(changed.split(spec.to).length - 1, 1, `${name}: exactly one replacement`);
      assert.equal(changed.replace(spec.to, spec.from), source, `${name}: exact source inverse`);
      const copy = path.join(folder, 'soccerPerfectSeason.ts');
      await writeFile(copy, changed);
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/soccerPerfectSeason': copy.replaceAll('\\', '/') });
      args.push('--testNamePattern', `(?:${escape(spec.test)}|${escape(baseline)})$`);
      row.mutation = { file: engineFile, from: spec.from, to: spec.to, intended: spec.test, baseline,
        originalSha256: hash(held.get(engineFile)), normalizedSha256: hash(source), copiedSha256: hash(changed), copy: path.relative(evidence, copy).replaceAll('\\', '/') };
      await writeFile(path.join(folder, 'mutation.json'), JSON.stringify(row.mutation, null, 2) + '\n');
    }
    await writeFile(path.join(folder, 'invocation.json'), JSON.stringify({ executable: process.execPath, args, alias: env.NO_DOUBLE_SWAP || null, measuredMargin: env.SOCCER_SEASON_MIN_POINTS_GAP ?? null }, null, 2) + '\n');
    const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
    const stdout = child.stdout || '', stderr = child.stderr || '', output = stdout + '\n' + stderr;
    row.process = { status: child.status, signal: child.signal, error: child.error ? asError(child.error) : null };
    await writeFile(path.join(folder, 'process.json'), JSON.stringify(row.process, null, 2) + '\n');
    await writeFile(path.join(folder, 'stdout.log'), stdout);
    await writeFile(path.join(folder, 'stderr.log'), stderr);
    process.stdout.write(output);
    assert.ok(!child.error && !child.signal, `${name}: runner finished normally`);
    assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|\bRPC\b/, `${name}: infrastructure faults earn no credit`);
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const assertions = report.testResults.flatMap(file => file.assertionResults);
    assert.equal(report.testResults.length, 1, `${name}: exactly the actual test file`);
    assert.ok(report.testResults[0].name.replaceAll('\\', '/').endsWith('/' + testFile), `${name}: actual named test file`);
    assert.equal(assertions.length, total, `${name}: all named assertions present`);
    assert.equal(new Set(assertions.map(test => test.title)).size, total, `${name}: distinct named assertions`);
    assert.equal(Number(report.numUnhandledErrors ?? 0), 0, `${name}: no unhandled errors`);
    row.passed = report.numPassedTests; row.failed = report.numFailedTests; row.pending = report.numPendingTests;
    await writeFile(path.join(folder, 'assertions.json'), JSON.stringify(assertions, null, 2) + '\n');
    const outcomes = JSON.parse(await readFile(path.join(folder, 'outcomes.json'), 'utf8'));
    assert.deepEqual([outcomes.independentLedger.played, outcomes.independentLedger.wins, outcomes.independentLedger.losses, outcomes.independentLedger.points, outcomes.independentLedger.score], [38, 20, 18, 60, 53], `${name}: raw independent ledger retained`);
    if (!spec) {
      assert.equal(child.status, 0, 'Baseline child succeeds');
      assert.deepEqual([report.numPassedTests, report.numFailedTests, report.numPendingTests], [total, 0, 0], 'All baseline outcomes run and pass');
      assert.ok(assertions.every(test => test.status === 'passed'), 'Every baseline named assertion passed');
      const measurement = JSON.parse(await readFile(path.join(folder, 'measurement.json'), 'utf8'));
      assert.equal(measurement.seedCount, 128, 'All measured daily seeds present');
      assert.equal(measurement.pairs.length, 128, 'All paired raw outcomes retained');
      assert.ok(measurement.meanPointsGap > 0 && measurement.meanWinsGap > 0, 'Positive measured baseline direction');
      row.measurement = { seedCount: measurement.seedCount, alpha: measurement.alpha, meanPointsGap: measurement.meanPointsGap, meanWinsGap: measurement.meanWinsGap, requiredMeanPointsGap: measurement.requiredMeanPointsGap, acceptance: measurement.acceptance };
    } else {
      assert.equal(child.status, 1, `${name}: only an actual assertion failure earns control credit`);
      assert.deepEqual([report.numPassedTests, report.numFailedTests, report.numPendingTests], [1, 1, total - 2], `${name}: exact scoped counts`);
      const failed = assertions.filter(test => test.status === 'failed');
      assert.deepEqual(failed.map(test => test.title), [spec.test], `${name}: exactly the intended assertion fails`);
      assert.match(failed[0].failureMessages.join('\n'), /AssertionError:|Error: expect\(/, `${name}: real outcome assertion, not a crash`);
      assert.equal(assertions.find(test => test.title === baseline)?.status, 'passed', `${name}: unaffected independent ledger passes`);
      assert.ok(assertions.every(test => test.title === spec.test || test.title === baseline || test.status === 'pending'), `${name}: unrelated cases are explicitly skipped`);
      row.failure = { title: failed[0].title, messages: failed[0].failureMessages };
      if (name === 'reserve') assert.ok(outcomes.reserveEnumeration.mismatches.some(item => item.expected === false && item.actual === true), 'Reserve control actually permits a pick that cannot fill the XI');
      if (name === 'ceiling') assert.notEqual(outcomes.exhaustiveCeilings[0].best.weightedStrength, outcomes.exhaustiveCeilings[0].oracle.bestStrength, 'Ceiling control actually disagrees with independent exhaustive outcomes');
      if (name === 'draw') assert.equal(outcomes.workedDraw.points, 111, 'Draw control actually drops the draw point');
      if (name === 'perfect') assert.equal(outcomes.verdicts[1].perfect, true, 'Perfect control actually credits a draw as perfect');
      if (name === 'version') assert.equal(outcomes.streamIsolation.seed, outcomes.streamIsolation.otherVersionSeed, 'Version control actually collapses the daily version stream');
      if (name === 'advantage') {
        const measurement = JSON.parse(await readFile(path.join(folder, 'measurement.json'), 'utf8'));
        assert.equal(measurement.pairs.length, 128, 'Flattened strength control retains all measured pairs');
        assert.equal(measurement.meanPointsGap, 0, 'Flattened strength actually removes paired points advantage');
        row.measurement = { seedCount: measurement.seedCount, meanPointsGap: measurement.meanPointsGap, meanWinsGap: measurement.meanWinsGap };
      }
    }
    row.status = 'accepted';
    console.log(`simSoccerPerfectSeason ${name}: ${spec ? 'one intended outcome fails and independent ledger passes' : `${total} actual pure outcome checks passed`}.`);
  } catch (error) {
    row.status = 'rejected'; row.error = asError(error);
    console.error(`simSoccerPerfectSeason ${name}: rejected, ${error.message}`);
  } finally {
    for (const file of ['vitest.json', 'process.json', 'stdout.log', 'stderr.log', 'assertions.json', 'invocation.json', 'mutation.json', 'soccerPerfectSeason.ts', 'outcomes.json', 'measurement.json']) {
      try { row.hashes[file] = hash(await readFile(path.join(folder, file))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await saveSummary();
  }
}

try {
  const names = requested === 'all' ? ['baseline', ...Object.keys(controls)] : requested ? [requested] : ['baseline'];
  for (const name of names) await runCase(name);
  summary.sourceAfter = {};
  for (const [file, before] of held) {
    const current = await readFile(path.join(root, file));
    summary.sourceAfter[file] = hash(current);
    assert.deepEqual(current, before, `Actual held source remains unchanged: ${file}`);
  }
  summary.status = summary.cases.every(row => row.status === 'accepted') ? 'passed' : 'failed';
  await saveSummary();
  assert.equal(summary.status, 'passed', 'Every requested actual baseline/control contract must pass');
} catch (error) {
  summary.status = 'failed'; summary.error = asError(error); await saveSummary(); throw error;
}
console.log(`simSoccerPerfectSeason: ${summary.cases.length} exact baseline/control receipts accepted.`);
console.log('simSoccerPerfectSeason: exhaustive legal draft, independent affordable ceiling, 38-game witness, W/D/L and score outcomes bound.');
console.log('simSoccerPerfectSeason: pinned save/day/version isolation and raw paired daily headroom retained; alpha5 remains a provisional game rule.');
console.log(`simSoccerPerfectSeason: source bytes held and all raw reports/copies retained at ${evidence}.`);
