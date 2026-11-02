import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/grandPrixBoss.ts';
const TEST = 'src/test/grandPrixBossRollover.test.ts';
const TIES = 'src/test/grandPrixBossHistoryTies.test.ts';
const BASELINE = 'scripts/qa/source-controls/grandPrixBoss.before-rollover.ts.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const heldPaths = [ENGINE, TEST, TIES, BASELINE, 'src/test/grandPrixBoss.test.ts', 'src/test/grandPrixBossMarket.test.ts', 'scripts/simGrandPrixBoss.mjs', 'scripts/simGrandPrixBossMarket.mjs', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map(heldPaths.map(file => [file, fs.readFileSync(path.join(root, file))]));
const original = held.get(ENGINE), source = original.toString('utf8');
assert.equal(sha(held.get(BASELINE)), '6d0e754c28f631ea590472b9ea2a1647206db67ec7dc1580bcf054cede74364f', 'Exact qualified market A control source');
const outBase = path.resolve(process.env.GP_BOSS_ROLLOVER_OUT || path.join(root, 'tmp'));
fs.mkdirSync(outBase, { recursive: true });
const out = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-rollover-'));
const candidate = path.join(out, 'grandPrixBoss.ts');
const ids = ['GP_ROLLOVER_COMMIT:', 'GP_ROLLOVER_CONTRACTS:', 'GP_ROLLOVER_PREPAID:', 'GP_ROLLOVER_CHAMPIONS:', 'GP_ROLLOVER_CALENDAR:', 'GP_ROLLOVER_YEAR_TWO:', 'GP_ROLLOVER_TAIL:', 'GP_ROLLOVER_REPLAY:', 'GP_ROLLOVER_PHASE:', 'GP_ROLLOVER_FUNDS:', 'GP_ROLLOVER_LEGACY:', 'GP_ROLLOVER_BAD_LEDGER:', 'GP_ROLLOVER_ARCHIVED_IDENTITIES:'];
const tieIds = ['GP_HISTORY_DRIVER_TIE:', 'GP_HISTORY_TEAM_TIE:'];
const control = (name, id, before, after, marker = null) => ({ name, id, patches: [[before, after]], marker });
const cash = '    next.cash = plan.cashAfter;';
const phase = "    if (state.phase !== 'seasonReview' || state.results.length !== state.calendar.length || state.round !== state.calendar.length - 1) return { ok: false, reason: 'phase' };";
const renewalWage = 'wagePerRace: contract.teamId === next.teamId ? renewal!.wagePerRace : dealWage(driver)';
const controls = [
  control('quoted-cash', 'GP_ROLLOVER_COMMIT:', cash, '    next.cash = plan.cashAfter - 1;'),
  control('once-renewal-fee', 'GP_ROLLOVER_COMMIT:', cash, '    next.cash = plan.cashAfter - plan.totalRenewalFee;'),
  control('cash-receipt', 'GP_ROLLOVER_COMMIT:', 'cashDelta: plan.cashAfter - state.cash', 'cashDelta: 0'),
  control('remaining-contract-term', 'GP_ROLLOVER_CONTRACTS:', '      if (contract.years > 1) { contract.years -= 1; continue; }', '      if (contract.years > 1) { continue; }'),
  control('prepaid-term', 'GP_ROLLOVER_PREPAID:', '      if (!contract || (contract.startsSeason ?? state.season) > state.season) continue;', '      if (!contract) continue;\n      if ((contract.startsSeason ?? state.season) > state.season) { contract.years += 1; continue; }'),
  control('renewal-wage', 'GP_ROLLOVER_CONTRACTS:', renewalWage, 'wagePerRace: contract.wagePerRace'),
  control('historic-employer', 'GP_ROLLOVER_CHAMPIONS:', '  const winnerTeam = state.results.flatMap(result => result.classification).find(row => row.driverId === winner.driverId)!.teamId;', "  const winnerTeam = state.drivers.find(driver => driver.id === winner.driverId)?.contract?.teamId ?? 'old-team';"),
  control('historic-cash', 'GP_ROLLOVER_CHAMPIONS:', 'endCash: state.cash,', 'endCash: state.cash + 1,'),
  control('snapshot-car-alias', 'GP_ROLLOVER_CHAMPIONS:', 'finalCar: { ...state.teams.find(team => team.id === state.teamId)!.car }', 'finalCar: state.teams.find(team => team.id === state.teamId)!.car'),
  control('new-calendar-ids', 'GP_ROLLOVER_CALENDAR:', 'id: `gp-season-${next.season}-round-${index}`', 'id: track.id'),
  control('standings-reset', 'GP_ROLLOVER_CALENDAR:', '    next.driverStandings = next.drivers.map(driver => ({ driverId: driver.id, points: 0, wins: 0, podiums: 0 }));\n', ''),
  control('next-year-operating-cost', 'GP_ROLLOVER_YEAR_TWO:', renewalWage, 'wagePerRace: contract.wagePerRace'),
  control('lifetime-driver-titles', 'GP_ROLLOVER_TAIL:', '    if (summary.driverChampion.teamId === next.teamId) next.careerTotals.driverTitles += 1;', '    next.careerTotals.driverTitles = next.history.filter(row => row.driverChampion.teamId === next.teamId).length;'),
  control('lifetime-constructor-titles', 'GP_ROLLOVER_TAIL:', '    if (summary.constructorChampion.teamId === next.teamId) next.careerTotals.constructorTitles += 1;', '    next.careerTotals.constructorTitles = next.history.filter(row => row.constructorChampion.teamId === next.teamId).length;'),
  control('stale-rollover', 'GP_ROLLOVER_REPLAY:', 'if (action.expectedRevision !== state.revision)', 'if (false && action.expectedRevision !== state.revision)'),
  control('complete-season-only', 'GP_ROLLOVER_PHASE:', phase, "    if (!['seasonReview', 'raceResult'].includes(state.phase)) return { ok: false, reason: 'phase' };"),
  control('next-year-reserve', 'GP_ROLLOVER_FUNDS:', "    if (!plan.affordable) return { ok: false, reason: 'funds' };", "    if (false && !plan.affordable) return { ok: false, reason: 'funds' };"),
  control('unknown-earlier-seasons', 'GP_ROLLOVER_LEGACY:', 'earlierSeasonsUnknown: state.season > 1', 'earlierSeasonsUnknown: false'),
  control('tracking-start', 'GP_ROLLOVER_LEGACY:', 'sinceSeason: state.season', 'sinceSeason: 1'),
  { name: 'partial-ledger', id: 'GP_ROLLOVER_BAD_LEDGER:', patches: [
    ["  if (state.history === undefined || state.careerTotals === undefined) return 'invalid';\n", ''],
    ['if (state.history === undefined && state.careerTotals === undefined)', 'if (state.history === undefined || state.careerTotals === undefined)'],
  ] },
  control('contiguous-years', 'GP_ROLLOVER_BAD_LEDGER:', ' && row.season === state.season - state.history.length + index', ''),
  { name: 'archive-count-coherence', id: 'GP_ROLLOVER_BAD_LEDGER:', patches: [
    ['totals.archivedSeasons !== state.season - totals.sinceSeason || ', ''],
    ['    || state.history.length !== Math.min(totals.archivedSeasons, 12)\n', ''],
  ] },
  { name: 'aggregate-title-coherence', id: 'GP_ROLLOVER_BAD_LEDGER:', patches: [
    ['integer(totals.constructorTitles, 0, totals.archivedSeasons)', 'integer(totals.constructorTitles)'],
    ['  return totals.driverTitles >= retainedDriverTitles && totals.driverTitles <= retainedDriverTitles + omitted\n    && totals.constructorTitles >= retainedTeamTitles && totals.constructorTitles <= retainedTeamTitles + omitted;', '  return true;'],
  ] },
  control('saved-cash-validity', 'GP_ROLLOVER_BAD_LEDGER:', '!integer(row.endCash)', 'false'),
  control('saved-champion-name', 'GP_ROLLOVER_BAD_LEDGER:', '!text(row.driverChampion.name)', 'false'),
  control('saved-race-finance', 'GP_ROLLOVER_BAD_LEDGER:', "    if (race.points !== race.drivers.reduce((sum, driver) => sum + driver.points, 0)\n      || race.teamPrize !== race.points * 30_000 + race.drivers.filter(driver => driver.status === 'finished').length * 50_000) return false;\n", ''),
  control('historic-identity-independence', 'GP_ROLLOVER_ARCHIVED_IDENTITIES:', 'validSummary(row, state.teamId) && row.season ===', 'validSummary(row, state.teamId) && state.drivers.some(driver => driver.id === row.driverChampion.driverId) && row.season ==='),
  control('driver-id-tie', 'GP_HISTORY_DRIVER_TIE:', '  return !row.team.drivers.some(driver => (honorsOrder(driver, row.driverChampion) || driver.driverId.localeCompare(row.driverChampion.driverId)) < 0);', '  return !row.team.drivers.some(driver => honorsOrder(driver, row.driverChampion) < 0);', 'GP_HISTORY_DRIVER_ID_TIE_ACCEPTED'),
  control('constructor-id-tie', 'GP_HISTORY_TEAM_TIE:', '  } else if ((honorsOrder(row.constructorChampion, row.team) || row.constructorChampion.teamId.localeCompare(row.team.teamId)) > 0) return false;', '  } else if (honorsOrder(row.constructorChampion, row.team) > 0) return false;', 'GP_HISTORY_TEAM_ID_TIE_ACCEPTED'),
];
assert.equal(controls.length, 29);
const results = [];
const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-grandPrixBoss.ts'), original);
function run(name, mode = 'healthy', selectedId = null, file = null, marker = null) {
  const reportFile = path.join(out, name + '.json');
  const env = { ...process.env };
  for (const key of ['GP_BOSS_ENGINE_FILE', 'GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (file !== null) env.GP_BOSS_ENGINE_FILE = file;
  const isTie = selectedId !== null && tieIds.includes(selectedId);
  const files = mode === 'healthy' ? [TEST, TIES] : [isTie ? TIES : TEST];
  const caseCount = mode === 'healthy' ? 15 : isTie ? 2 : 13;
  const failures = mode === 'baseline' ? 13 : mode === 'selected' ? 1 : 0;
  const passed = mode === 'healthy' ? 15 : 0, skipped = mode === 'selected' ? caseCount - 1 : 0;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (selectedId) args.push('--testNamePattern=' + selectedId);
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, failures ? 1 : 0);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.success, failures === 0); assert.equal(report.testResults.length, files.length);
  assert.equal(report.numTotalTests, caseCount); assert.equal(report.numPassedTests, passed); assert.equal(report.numFailedTests, failures);
  assert.equal(report.numPendingTests, skipped); assert.equal(report.numTodoTests, 0);
  const fileSeen = new Set();
  for (const result of report.testResults) {
    const testFile = files.find(expected => result.name.endsWith('/' + expected)); assert(testFile); assert(!fileSeen.has(testFile)); fileSeen.add(testFile);
    const expectedIds = testFile === TIES ? tieIds : ids, seen = new Set();
    assert.equal(result.assertionResults.length, expectedIds.length);
    for (const row of result.assertionResults) {
      const matches = expectedIds.filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
      const id = matches[0]; assert(!seen.has(id)); seen.add(id);
      const failed = mode === 'baseline' || mode === 'selected' && id === selectedId;
      const skip = mode === 'selected' && !failed;
      assert.equal(row.status, failed ? 'failed' : skip ? 'skipped' : 'passed');
      assert.equal(row.failureMessages.length, failed ? 1 : 0);
      if (failed) {
        const error = row.failureMessages[0]; assert.match(error, /AssertionError:/);
        if (marker) assert(error.includes(marker));
        if (mode === 'baseline' && !['GP_ROLLOVER_PHASE:', 'GP_ROLLOVER_FUNDS:', 'GP_ROLLOVER_LEGACY:', 'GP_ROLLOVER_BAD_LEDGER:'].includes(id)) assert(error.includes('GP_NEXT_SEASON_ACTION_MISSING'));
      }
    }
  }
  const runtimeCounters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const [key, value] of Object.entries(runtimeCounters)) { if (value === null) continue; assert.equal(typeof value, 'number'); assert.equal(value, 0, key); }
  for (const errors of [report.errors, report.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const raw = (child.stdout || '') + '\n' + (child.stderr || '');
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test(raw);
  assert.equal(detectedRuntimeError, false);
  const result = { name, mode, selectedId, files, rawExit: child.status, passed, ownedFailures: failures, declaredSkips: skipped, runtimeCounters,
    runtimeCounterCompleteness: Object.values(runtimeCounters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED', detectedRuntimeError,
    rawErrors: report.errors ?? null, rawUnhandledErrors: report.unhandledErrors ?? null };
  results.push(result);
  fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(result, null, 2));
  for (const [filePath, bytes] of held) assert.deepEqual(fs.readFileSync(path.join(root, filePath)), bytes, name + ': held input changed');
  console.log(name + ': ' + passed + ' passes, ' + failures + ' owned assertions, ' + skipped + ' declared skips.');
}
try {
  run('current');
  fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original));
  run('healthy-copy', 'healthy', null, candidate);
  const prior = path.join(out, 'before-rollover-grandPrixBoss.ts');
  fs.writeFileSync(prior, held.get(BASELINE)); assert.equal(sha(fs.readFileSync(prior)), sha(held.get(BASELINE)));
  run('whole-before-rollover', 'baseline', null, prior);
  for (const { name, id, patches, marker } of controls) {
    let changed = source;
    const edits = [];
    for (const [before, after] of patches) {
      const code = changed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(code.split(before).length - 1, 1, name + ': one executed anchor');
      assert.equal(changed.split(before).length - 1, 1, name + ': one exact anchor');
      const offset = changed.indexOf(before);
      changed = changed.slice(0, offset) + after + changed.slice(offset + before.length);
      edits.push({ offset, before, after });
    }
    assert.notEqual(sha(Buffer.from(changed)), sha(original));
    let inverse = changed;
    for (const { offset, before, after } of edits.slice().reverse()) inverse = inverse.slice(0, offset) + before + inverse.slice(offset + after.length);
    assert.equal(inverse, source);
    fs.writeFileSync(path.join(out, name + '-grandPrixBoss.ts'), changed);
    fs.writeFileSync(path.join(out, name + '.edit.json'), JSON.stringify({ edits, originalSha256: sha(original), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(inverse)) }, null, 2));
    try { fs.writeFileSync(candidate, changed); run(name, 'selected', id, candidate, marker); }
    finally { fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original)); }
  }
  run('restored-copy', 'healthy', null, candidate);
  assert.equal(results.length, 33);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.deepEqual(totals, { passed: 45, ownedFailures: 42, declaredSkips: 326 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Atomic season rollover and bounded tracked history only. No lifecycle, hook integration or UI qualification.', childRuns: 33, executed: 87, totals, results }, null, 2));
  console.log('simGrandPrixBossRollover: 45 passes, 42 owned assertions, 326 declared unselected skips; 87 executed outcomes.');
} finally {
  const after = [...held].map(([file]) => { const bytes = fs.readFileSync(path.join(root, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; });
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts());
  console.log('Grand Prix Boss rollover evidence: ' + out);
}
