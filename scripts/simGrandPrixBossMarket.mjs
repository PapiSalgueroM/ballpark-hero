import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/grandPrixBoss.ts';
const TEST = 'src/test/grandPrixBossMarket.test.ts';
const BASELINE = 'scripts/qa/source-controls/grandPrixBoss.before-market.ts.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const heldPaths = [ENGINE, TEST, BASELINE, 'src/test/grandPrixBoss.test.ts', 'scripts/simGrandPrixBoss.mjs', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map(heldPaths.map(file => [file, fs.readFileSync(path.join(root, file))]));
const original = held.get(ENGINE), source = original.toString('utf8');
assert.equal(sha(held.get(BASELINE)), 'ec793e9cacb47bf770d599b1677f76ac753d2cafde9c1f85e6bb0cf7dc7bc69b', 'Exact qualified v5 control source');
const outBase = path.resolve(process.env.GP_BOSS_MARKET_OUT || os.tmpdir());
fs.mkdirSync(outBase, { recursive: true });
const out = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-market-'));
const candidate = path.join(out, 'grandPrixBoss.ts');
const ids = ['GP_MARKET_PUBLIC_QUOTES:', 'GP_MARKET_SIGN:', 'GP_MARKET_NEW_WAGES:', 'GP_MARKET_BUYOUT:', 'GP_MARKET_FUNDS:', 'GP_MARKET_REROUND:', 'GP_MARKET_RENEW:', 'GP_MARKET_EXCLUSIVITY:', 'GP_MARKET_WINDOWS:', 'GP_MARKET_REPLAY:', 'GP_MARKET_SAVE:', 'GP_MARKET_HOLDS:'];
const timing = "        && (driver.contract.startsSeason === undefined || integer(driver.contract.startsSeason, 1, s.season + (s.phase === 'seasonReview' ? 1 : 0))\n          && (driver.contract.startsSeason <= s.season || driver.contract.years === 1))";
const controls = [
  ['public-offers', 'GP_MARKET_PUBLIC_QUOTES:', '  state.marketOffers = marketOffers(state, lifecycle);', '  state.marketOffers = [];'],
  ['signing-fee', 'GP_MARKET_PUBLIC_QUOTES:', 'const wagePerRace = dealWage(incoming), signingFee = wagePerRace * 2;', 'const wagePerRace = dealWage(incoming), signingFee = wagePerRace;'],
  ['release-seat', 'GP_MARKET_SIGN:', '    if (outgoingId !== incomingId) outgoing.contract = null;', '    if (false && outgoingId !== incomingId) outgoing.contract = null;'],
  ['charge-fee', 'GP_MARKET_SIGN:', '    next.cash -= offer.totalFee;', '    next.cash -= 0;'],
  ['signed-wage', 'GP_MARKET_NEW_WAGES:', 'wagePerRace: offer.wagePerRace };', 'wagePerRace: offer.wagePerRace + 1_000 };'],
  ['buyout', 'GP_MARKET_BUYOUT:', 'const buyout = renewal ? 0 : Math.ceil(unserved * old.wagePerRace / 2)', 'const buyout = 0'],
  ['current-reserve', 'GP_MARKET_FUNDS:', 'state.cash - totalFee >= reserveAfter', 'state.cash >= totalFee'],
  ['review-reserve', 'GP_MARKET_FUNDS:', 'projected ? projected.affordable :', 'projected ? true :'],
  ['default-renewal-fee', 'GP_MARKET_REROUND:', 'automaticRenewals.push({ driverId: driver.id, wagePerRace, signingFee: wagePerRace * 2 });', 'automaticRenewals.push({ driverId: driver.id, wagePerRace, signingFee: wagePerRace });'],
  ['default-renewal-wage', 'GP_MARKET_REROUND:', '      automaticRenewals.push({ driverId: driver.id, wagePerRace, signingFee: wagePerRace * 2 });\n      return sum + wagePerRace;', '      automaticRenewals.push({ driverId: driver.id, wagePerRace, signingFee: wagePerRace * 2 });\n      return sum + contract.wagePerRace;'],
  ['review-term', 'GP_MARKET_REROUND:', "const startsSeason = state.phase === 'seasonReview' ? state.season + 1 : state.season;", 'const startsSeason = state.season;'],
  ['renewal-repeat', 'GP_MARKET_RENEW:', ' && (outgoing.contract!.startsSeason ?? state.season) <= state.season', ''],
  ['foreign-seat', 'GP_MARKET_EXCLUSIVITY:', 'state.drivers.filter(driver => driver.contract === null)', 'state.drivers.filter(driver => driver.contract?.teamId !== state.teamId)'],
  ['window', 'GP_MARKET_WINDOWS:', "state.phase === 'preRace' && state.round === 0 && state.results.length === 0", "['preRace', 'grid', 'race', 'raceResult'].includes(state.phase) && state.round === 0"],
  ['revision', 'GP_MARKET_REPLAY:', 'if (action.expectedRevision !== state.revision)', 'if (false && action.expectedRevision !== state.revision)'],
  ['roundtrip-credit', 'GP_MARKET_REPLAY:', '    next.cash -= offer.totalFee;', '    next.cash += offer.totalFee;'],
  ['legacy-timing', 'GP_MARKET_SAVE:', '  normalizeContractSeasons(normalized);\n', '', 'GP_MARKET_ABSENT_LEGACY_TIMING_MUST_NORMALIZE_TO_ACTIVE_CURRENT_SEASON'],
  ['present-timing', 'GP_MARKET_SAVE:', timing, ''],
  ['saved-offers', 'GP_MARKET_SAVE:', '    || s.marketOffers !== undefined && !rowsMatch(s.marketOffers, normalized.marketOffers, OFFER_KEYS)\n', ''],
  ['saved-plan', 'GP_MARKET_SAVE:', '    || s.nextSeasonPlan !== undefined && !planMatches(s.nextSeasonPlan, normalized.nextSeasonPlan, shape === \'current\')', '', 'GP_MARKET_STORED_PLAN_MUST_MATCH_ACTUAL_OBLIGATIONS'],
  ['race-preservation', 'GP_MARKET_HOLDS:', '      const failure = (100 - team.car.reliability) * 0.000025 * risk;', '      const failure = 0;'],
];
const results = [];
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(sourceReceipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-grandPrixBoss.ts'), original);
function run(name, mode = 'healthy', selectedId = null, file = null, marker = null) {
  const reportFile = path.join(out, name + '.json');
  const env = { ...process.env };
  for (const key of ['GP_BOSS_ENGINE_FILE', 'GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (file !== null) env.GP_BOSS_ENGINE_FILE = file;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (selectedId) args.push('--testNamePattern=' + selectedId);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, mode === 'healthy' ? 0 : 1);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const expectedFailures = mode === 'baseline' ? 11 : mode === 'selected' ? 1 : 0;
  const expectedPasses = mode === 'baseline' ? 1 : mode === 'healthy' ? 12 : 0;
  const expectedSkips = mode === 'selected' ? 11 : 0;
  assert.equal(report.success, mode === 'healthy');
  assert.equal(report.testResults.length, 1); assert(report.testResults[0].name.endsWith('/' + TEST));
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, 12); assert.equal(report.numTotalTests, 12);
  assert.equal(report.numPassedTests, expectedPasses); assert.equal(report.numFailedTests, expectedFailures);
  assert.equal(report.numPendingTests, expectedSkips); assert.equal(report.numTodoTests, 0);
  const seen = new Set();
  for (const row of rows) {
    const matches = ids.filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
    const id = matches[0]; assert(!seen.has(id)); seen.add(id);
    const failed = mode === 'baseline' ? id !== 'GP_MARKET_HOLDS:' : mode === 'selected' && id === selectedId;
    const skipped = mode === 'selected' && !failed;
    assert.equal(row.status, failed ? 'failed' : skipped ? 'skipped' : 'passed');
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) {
      const error = row.failureMessages[0]; assert.match(error, /AssertionError:/);
      if (marker) assert(error.includes(marker));
      if (mode === 'baseline') {
        if (id === 'GP_MARKET_WINDOWS:') { assert.match(error, /phase/); assert.match(error, /invalid/); }
        else assert.match(error, /GP_MARKET_QUOTE_MISSING/);
      }
    }
  }
  const runtimeCounters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const [name, value] of Object.entries(runtimeCounters)) { if (value === null) continue; assert.equal(typeof value, 'number'); assert.equal(value, 0, name); }
  for (const errors of [report.errors, report.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const raw = (child.stdout || '') + '\n' + (child.stderr || '');
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test(raw);
  assert.equal(detectedRuntimeError, false);
  const result = { name, mode, selectedId, rawExit: child.status, passed: expectedPasses, ownedFailures: expectedFailures, declaredSkips: expectedSkips,
    runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED',
    detectedRuntimeError, rawErrors: report.errors ?? null, rawUnhandledErrors: report.unhandledErrors ?? null };
  results.push(result);
  fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(result, null, 2));
  for (const [filePath, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, filePath)), bytes, name + ': actual held input changed');
  console.log(name + ': ' + expectedPasses + ' passes, ' + expectedFailures + ' owned assertions, ' + expectedSkips + ' declared skips.');
}
try {
  run('current');
  fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original));
  run('healthy-copy', 'healthy', null, candidate);
  const prior = path.join(out, 'before-market-grandPrixBoss.ts');
  fs.writeFileSync(prior, held.get(BASELINE)); assert.equal(sha(fs.readFileSync(prior)), sha(held.get(BASELINE)));
  run('whole-baseline', 'baseline', null, prior);
  for (const [name, id, before, after, marker] of controls) {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    assert.equal(code.split(before).length - 1, 1, name + ': one executed source anchor');
    assert.equal(source.split(before).length - 1, 1, name + ': one exact source anchor');
    const offset = source.indexOf(before);
    const changed = source.slice(0, offset) + after + source.slice(offset + before.length);
    assert.notEqual(sha(Buffer.from(changed)), sha(original));
    const inverse = changed.slice(0, offset) + before + changed.slice(offset + after.length);
    assert.equal(inverse, source);
    fs.writeFileSync(path.join(out, name + '-grandPrixBoss.ts'), changed);
    fs.writeFileSync(path.join(out, name + '.edit.json'), JSON.stringify({ offset, before, after,
      originalSha256: sha(original), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(inverse)) }, null, 2));
    try { fs.writeFileSync(candidate, changed); run(name, 'selected', id, candidate, marker); }
    finally { fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original)); }
  }
  run('restored-copy', 'healthy', null, candidate);
  assert.equal(results.length, 25);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.deepEqual(totals, { passed: 37, ownedFailures: 32, declaredSkips: 231 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Finite paid market A only. No rollover, world lifecycle, hook integration or UI qualification.', childRuns: 25, executed: 69, totals, results }, null, 2));
  console.log('simGrandPrixBossMarket: 37 passes, 32 owned assertions, 231 declared unselected skips; 69 executed outcomes.');
} finally {
  const after = [...held].map(([file]) => { const bytes = fs.readFileSync(path.join(root, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; });
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, sourceReceipts());
  console.log('Grand Prix Boss market evidence: ' + out);
}
