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
const TEST = 'src/test/grandPrixBossStarterBalance.test.ts';
const FIXTURE = 'src/test/fixtures/grandPrixBossV5Starter.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const held = new Map();
for (const file of [ENGINE, TEST, FIXTURE, 'src/test/grandPrixBoss.test.ts', 'scripts/simGrandPrixBoss.mjs', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts']) {
  const bytes = fs.readFileSync(path.join(root, file));
  held.set(file, Buffer.from(bytes));
}
const starterTestSource = fs.readFileSync(path.join(root, TEST), 'utf8').replace(/\r\n?/g, '\n');
const currentLegacyAssertion = "    const oldShape = JSON.parse(JSON.stringify(loaded));\n    for (const key of ['marketOffers', 'nextSeasonPlan', 'history', 'careerTotals']) delete oldShape[key];\n    for (const driver of oldShape.drivers) {\n      delete driver.focus;\n      const original = raw.drivers.find(row => row.id === driver.id)!;\n      if (driver.contract && !Object.prototype.hasOwnProperty.call(original.contract, 'startsSeason')) delete driver.contract.startsSeason;\n    }\n    for (const team of oldShape.teams) delete team.baselineCar;\n    expect(JSON.stringify(oldShape), 'GP_STARTER_NEW_DEFAULT_MUST_NOT_MIGRATE_EXISTING_TEAMS').toBe(before);\n    expect(loaded.drivers.map(driver => driver.focus)).toEqual(Array(26).fill('balanced'));\n    expect(loaded.drivers.filter(driver => driver.contract).map(driver => driver.contract!.startsSeason)).toEqual(Array(20).fill(raw.season));\n    for (const team of loaded.teams) expect(team.baselineCar).toEqual(raw.teams.find(row => row.id === team.id)!.car);\n    expect(loaded.history).toEqual([]);\n    expect(loaded.careerTotals).toEqual({ archivedSeasons: 0, driverTitles: 0, constructorTitles: 0, sinceSeason: raw.season, earlierSeasonsUnknown: false });\n    expect(loaded.nextSeasonPlan).toBeNull();\n    expect(loaded.marketOffers.length).toBeGreaterThan(0);\n    expect(engine.validateSavedCareer(loaded)).toEqual({ ok: true, state: loaded });", priorLegacyAssertion = "    expect(JSON.stringify(loaded), 'GP_STARTER_NEW_DEFAULT_MUST_NOT_MIGRATE_EXISTING_TEAMS').toBe(before);";
const executedTest = starterTestSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
assert.equal(executedTest.split(currentLegacyAssertion).length - 1, 1, 'One executed legacy-shape assertion compatibility span');
assert.equal(starterTestSource.split(currentLegacyAssertion).length - 1, 1, 'One raw legacy-shape assertion compatibility span');
const testOffset = starterTestSource.indexOf(currentLegacyAssertion);
const beforeTestCompatibility = starterTestSource.slice(0, testOffset) + priorLegacyAssertion + starterTestSource.slice(testOffset + currentLegacyAssertion.length);
assert.equal(sha(Buffer.from(beforeTestCompatibility)), 'aa7217b821c7852a1ac71bbc7c9d8e9e30b9754910e2965d3fae464396434bed', 'Exactly the reviewed metadata-only assertion span recovers the qualified seven-case test');
const restoredTestCompatibility = beforeTestCompatibility.slice(0, testOffset) + currentLegacyAssertion + beforeTestCompatibility.slice(testOffset + priorLegacyAssertion.length);
assert.equal(restoredTestCompatibility, starterTestSource, 'Whole test compatibility inverse');
const testCompatibility = { actualSha256: sha(Buffer.from(starterTestSource)), qualifiedBeforeSha256: sha(Buffer.from(beforeTestCompatibility)),
  offset: testOffset, before: priorLegacyAssertion, after: currentLegacyAssertion, restoredSha256: sha(Buffer.from(restoredTestCompatibility)) };
assert.equal(sha(held.get(FIXTURE)), 'cf3b484781dbff04df9033d0e1dfe239e6d9562f5cf026db2e4b1e233162a028');
const original = held.get(ENGINE), source = fs.readFileSync(path.join(root, ENGINE), 'utf8').replace(/\r\n?/g, '\n');
const base = path.resolve(process.env.GP_BOSS_STARTER_OUT || path.join(root, 'tmp'));
fs.mkdirSync(base, { recursive: true });
const out = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-starter-controls-'));
const candidate = path.join(out, 'candidate-grandPrixBoss.ts');
const edits = [
  ['team', 'const teamId = teams[4].id;', 'const teamId = teams[6].id;', 'GP_STARTER_TEAM4_MISSING'],
  ['first-wage', 'drivers[8].contract!.wagePerRace = 180_000;', 'drivers[12].contract!.wagePerRace = 180_000;', 'GP_STARTER_PUBLISHED_WAGES_MUST_FOLLOW_OWNED_SEATS'],
  ['second-wage', 'drivers[9].contract!.wagePerRace = 120_000;', 'drivers[13].contract!.wagePerRace = 120_000;', 'GP_STARTER_PUBLISHED_WAGES_MUST_FOLLOW_OWNED_SEATS'],
];
const cases = new Map([
  ['GP_STARTER_OWNERSHIP:', 'GP_STARTER_TEAM4_MISSING'],
  ['GP_STARTER_NATURAL_FREQUENCY:', 'GP_STARTER_NATURAL_SCORING_FREQUENCY_TOO_LOW'],
  ['GP_STARTER_NATURAL_STRATEGY:', 'GP_STARTER_NATURAL_STRATEGY_POINTS_TOO_WEAK'],
  ['GP_STARTER_SEASON_POINTS:', 'GP_STARTER_SEASON_POINTS_TOO_LOW'],
  ['GP_STARTER_SEASON_STRATEGY:', 'GP_STARTER_SEASON_STRATEGY_POINTS_TOO_WEAK'],
  ['GP_STARTER_SEASON_INVESTMENT:', 'GP_STARTER_SEASON_INVESTMENT_POINTS_TOO_WEAK'],
  ['GP_STARTER_OLD_SAVE:', null],
]);
const receipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
const results = [];
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(receipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-grandPrixBoss.ts'), original);
fs.writeFileSync(path.join(out, 'actual-test.ts'), held.get(TEST));
fs.writeFileSync(path.join(out, 'test-compatibility.json'), JSON.stringify(testCompatibility, null, 2) + '\n');
function changedBy(body, before, after, name) {
  const executed = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  assert.equal(executed.split(before).length - 1, 1, name + ': one executed source anchor');
  assert.equal(body.split(before).length - 1, 1, name + ': one exact source anchor');
  const offset = body.indexOf(before), changed = body.slice(0, offset) + after + body.slice(offset + before.length);
  assert.notEqual(sha(Buffer.from(changed)), sha(Buffer.from(body)), name + ': source changed');
  assert.equal(changed.slice(0, offset) + before + changed.slice(offset + after.length), body, name + ': whole inverse');
  return { changed, edit: { offset, before, after, originalSha256: sha(Buffer.from(body)), changedSha256: sha(Buffer.from(changed)), inverseSha256: sha(Buffer.from(body)) } };
}
function run(name, mode = 'healthy', file = null, marker = null) {
  const reportFile = path.join(out, name + '.vitest.json'), cohortDir = path.join(out, name + '-cohort');
  const env = { ...process.env, GP_BOSS_BALANCE_OUT: cohortDir };
  for (const key of ['GP_BOSS_ENGINE_FILE', 'GP_BOSS_PAGE_FILE', 'GP_BOSS_HOOK_FILE', 'US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP']) delete env[key];
  if (file !== null) env.GP_BOSS_ENGINE_FILE = file;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile=' + reportFile];
  if (mode === 'selected') args.push('--testNamePattern=GP_STARTER_OWNERSHIP:');
  const child = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 480000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(out, name + '.stderr'), child.stderr || '');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, mode === 'healthy' ? 0 : 1);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const expected = mode === 'baseline' ? { passed: 1, failed: 6, skipped: 0 } : mode === 'selected' ? { passed: 0, failed: 1, skipped: 6 } : { passed: 7, failed: 0, skipped: 0 };
  assert.equal(report.success, mode === 'healthy');
  assert.equal(report.testResults.length, 1); assert(report.testResults[0].name.endsWith('/' + TEST));
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, 7); assert.equal(report.numTotalTests, 7);
  assert.equal(report.numPassedTests, expected.passed); assert.equal(report.numFailedTests, expected.failed);
  assert.equal(report.numPendingTests, expected.skipped); assert.equal(report.numTodoTests, 0);
  const seen = new Set();
  for (const row of rows) {
    const matches = [...cases.keys()].filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
    const id = matches[0]; assert(!seen.has(id)); seen.add(id);
    const failed = mode === 'baseline' ? cases.get(id) !== null : mode === 'selected' && id === 'GP_STARTER_OWNERSHIP:';
    const skipped = mode === 'selected' && !failed;
    assert.equal(row.status, failed ? 'failed' : skipped ? 'skipped' : 'passed');
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) { assert.match(row.failureMessages[0], /AssertionError:/); assert(row.failureMessages[0].includes(marker || cases.get(id))); }
  }
  const runtimeCounters = { numUnhandledErrors: report.numUnhandledErrors ?? null, numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites ?? null };
  for (const [key, value] of Object.entries(runtimeCounters)) { if (value === null) continue; assert.equal(typeof value, 'number'); assert.equal(value, 0, key); }
  for (const errors of [report.errors, report.unhandledErrors]) if (Array.isArray(errors)) assert.equal(errors.length, 0);
  const detectedRuntimeError = /(?:Unhandled (?:Errors?|Rejection|Exception)|unhandledRejection|uncaughtException|Vitest caught \d+ unhandled)/i.test((child.stdout || '') + '\n' + (child.stderr || ''));
  assert.equal(detectedRuntimeError, false);
  let cohort = null;
  if (mode === 'selected') assert(!fs.existsSync(cohortDir), 'Selected allocation check does not claim a skipped cohort');
  else {
    const directories = fs.readdirSync(cohortDir).filter(name => name.startsWith('dukb-grand-prix-starter-'));
    assert.equal(directories.length, 1);
    cohort = JSON.parse(fs.readFileSync(path.join(cohortDir, directories[0], 'summary.json'), 'utf8'));
    if (file === null) assert.equal(cohort.sourceSha256, sha(original));
    else {
      const actualBytes = fs.readFileSync(file);
      assert.equal(cohort.sourceSha256, sha(actualBytes));
    }
    assert.equal(cohort.fixtureSha256, sha(held.get(FIXTURE)));
    assert.deepEqual({ ...cohort.counts, admittedStates: 0 }, { naturalPairs: 256, seasons: 96, seasonRaces: 1152, totalRaces: 1664, admittedStates: 0 });
    assert(Number.isSafeInteger(cohort.counts.admittedStates) && cohort.counts.admittedStates > 0);
  }
  const result = { name, mode, rawExit: child.status, passed: expected.passed, ownedFailures: expected.failed, declaredSkips: expected.skipped,
    runtimeCounters, runtimeCounterCompleteness: Object.values(runtimeCounters).some(value => value === null) ? 'UNKNOWN' : 'REPORTED',
    detectedRuntimeError, rawErrors: report.errors ?? null, rawUnhandledErrors: report.unhandledErrors ?? null, cohort };
  results.push(result);
  fs.writeFileSync(path.join(out, name + '.summary.json'), JSON.stringify(result, null, 2));
  for (const [heldFile, bytes] of held) {
    const actualBytes = fs.readFileSync(path.join(root, heldFile));
    assert.equal(sha(actualBytes), sha(bytes), name + ': actual input held');
  }
  console.log(name + ': ' + expected.passed + ' passes, ' + expected.failed + ' owned assertions, ' + expected.skipped + ' declared skips.');
}
try {
  run('current');
  fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original));
  run('healthy-copy', 'healthy', candidate);
  let beforeStarter = source;
  const inverseEdits = [];
  for (const [name, before, after] of edits) { const control = changedBy(beforeStarter, before, after, name); beforeStarter = control.changed; inverseEdits.push(control.edit); }
  assert.equal(sha(Buffer.from(beforeStarter)), '3a3e5652fbf43bfe13e9802521821378cc3221f7942f05f15b7242c98b1fea92', 'All three inverse edits reproduce exact same-C before-starter source');
  let restored = beforeStarter;
  for (const edit of [...inverseEdits].reverse()) restored = restored.slice(0, edit.offset) + edit.before + restored.slice(edit.offset + edit.after.length);
  assert.equal(restored, source, 'Whole same-C startup control restores current source');
  const prior = path.join(out, 'before-starter-grandPrixBoss.ts');
  fs.writeFileSync(prior, beforeStarter);
  fs.writeFileSync(path.join(out, 'whole-baseline.edit.json'), JSON.stringify({ edits: inverseEdits, currentSha256: sha(original), baselineSha256: sha(Buffer.from(beforeStarter)), inverseSha256: sha(Buffer.from(restored)) }, null, 2));
  run('whole-baseline', 'baseline', prior);
  for (const [name, before, after, marker] of edits) {
    const control = changedBy(source, before, after, name);
    fs.writeFileSync(path.join(out, name + '-grandPrixBoss.ts'), control.changed);
    fs.writeFileSync(path.join(out, name + '.edit.json'), JSON.stringify(control.edit, null, 2));
    try { fs.writeFileSync(candidate, control.changed); run(name, 'selected', candidate, marker); }
    finally {
      fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original));
      {
        const actualBytes = fs.readFileSync(path.join(root, ENGINE));
        fs.writeFileSync(path.join(out, name + '-restore.json'), JSON.stringify({ copySha256: sha(fs.readFileSync(candidate)), actualSha256: sha(actualBytes) }, null, 2));
      }
    }
  }
  run('restored-copy', 'healthy', candidate);
  assert.equal(results.length, 7);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.deepEqual(totals, { passed: 22, ownedFailures: 9, declaredSkips: 18 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Measured starter opportunity and actual captured-save preservation only. No market, rollover, hook, route or full-game readiness claim.', childRuns: 7, executed: 31, totals, results }, null, 2));
  console.log('simGrandPrixBossStarterBalance: 22 passes, 9 owned assertions, 18 declared unselected skips; 31 executed outcomes.');
} finally {
  const after = [];
  for (const [file] of held) {
    const bytes = fs.readFileSync(path.join(root, file));
    after.push({ file, bytes: bytes.length, sha256: sha(bytes) });
  }
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, receipts());
  console.log('Grand Prix Boss starter evidence: ' + out);
}
