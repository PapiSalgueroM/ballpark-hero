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
const TEST = 'src/test/grandPrixBossLifecycle.test.ts';
const BASELINE = 'scripts/qa/source-controls/grandPrixBoss.before-lifecycle.ts.txt';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const heldPaths = [ENGINE, TEST, BASELINE, 'src/test/grandPrixBoss.test.ts', 'src/test/grandPrixBossMarket.test.ts', 'src/test/grandPrixBossRollover.test.ts', 'src/test/grandPrixBossHistoryTies.test.ts', 'scripts/simGrandPrixBoss.mjs', 'scripts/simGrandPrixBossMarket.mjs', 'scripts/simGrandPrixBossRollover.mjs', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'vitest.config.ts', 'src/test/setup.ts'];
const held = new Map();
for (const file of heldPaths) {
  const bytes = fs.readFileSync(path.join(root, file));
  held.set(file, Buffer.from(bytes));
}
const original = held.get(ENGINE), source = fs.readFileSync(path.join(root, ENGINE), 'utf8').replace(/\r\n?/g, '\n');
assert.equal(sha(held.get(BASELINE)), 'cae28d2852bfa6f23ffc5afca171486d017809327caded4cbf63f300f3fd8db0', 'Exact qualified B control source');
const outBase = path.resolve(process.env.GP_BOSS_LIFECYCLE_OUT || path.join(root, 'tmp'));
fs.mkdirSync(outBase, { recursive: true });
const out = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-lifecycle-'));
const candidate = path.join(out, 'grandPrixBoss.ts');
const ids = ["GP_LIFECYCLE_METADATA:","GP_LIFECYCLE_FOCUS:","GP_LIFECYCLE_FOCUS_WINDOWS:","GP_LIFECYCLE_YOUTH:","GP_LIFECYCLE_PEAK:","GP_LIFECYCLE_VETERAN:","GP_LIFECYCLE_POTENTIAL:","GP_LIFECYCLE_ONCE:","GP_LIFECYCLE_RETIRE:","GP_LIFECYCLE_PAID:","GP_LIFECYCLE_MARKET:","GP_LIFECYCLE_CARRY:","GP_LIFECYCLE_AI:","GP_LIFECYCLE_SAVE:","GP_LIFECYCLE_PLAN:"];
const missing = {"GP_LIFECYCLE_METADATA:":"GP_LIFECYCLE_FOCUS_METADATA_MISSING","GP_LIFECYCLE_FOCUS:":"GP_FOCUS_ACTION_MISSING","GP_LIFECYCLE_FOCUS_WINDOWS:":"GP_FOCUS_PHASE_GUARD_MISSING","GP_LIFECYCLE_YOUTH:":"GP_FOCUS_ACTION_MISSING","GP_LIFECYCLE_PEAK:":"GP_FOCUS_ACTION_MISSING","GP_LIFECYCLE_VETERAN:":"GP_FOCUS_ACTION_MISSING","GP_LIFECYCLE_POTENTIAL:":"GP_FOCUS_ACTION_MISSING","GP_LIFECYCLE_ONCE:":"GP_LIFECYCLE_AGE_NOT_SETTLED","GP_LIFECYCLE_RETIRE:":"GP_RETIREMENT_PLAN_MISSING","GP_LIFECYCLE_PAID:":"GP_PAID_OLD_CONTRACT_AGE_NOT_ADVANCED","GP_LIFECYCLE_MARKET:":"GP_RETIRING_FREE_AGENT_OFFER_MUST_BE_ABSENT","GP_LIFECYCLE_CARRY:":"GP_PARTIAL_CARRY_MISSING","GP_LIFECYCLE_AI:":"GP_AI_CAR_INVESTMENT_MISSING","GP_LIFECYCLE_SAVE:":"GP_LEGACY_LIFECYCLE_NORMALIZATION_MISSING","GP_LIFECYCLE_PLAN:":"GP_RETIREMENT_PLAN_MISSING"};
const controls = [
  {
    "name": "initial-focus",
    "id": "GP_LIFECYCLE_METADATA:",
    "before": "age: ri(19, 34), potential: clamp(pace + ri(4, 12), pace, 99), focus: 'balanced',",
    "after": "age: ri(19, 34), potential: clamp(pace + ri(4, 12), pace, 99), focus: 'wet',"
  },
  {
    "name": "independent-baseline",
    "id": "GP_LIFECYCLE_METADATA:",
    "before": "return { id: `gp-team-${index}`, name, car, baselineCar: { ...car } };",
    "after": "return { id: `gp-team-${index}`, name, car, baselineCar: car };"
  },
  {
    "name": "focus-write",
    "id": "GP_LIFECYCLE_FOCUS:",
    "before": "    next.drivers.find(held => held.id === driver.id)!.focus = a.focus as GrandPrixFocus;",
    "after": "    next.drivers.find(held => held.id === driver.id)!.focus = 'balanced';"
  },
  {
    "name": "focus-owned-seat",
    "id": "GP_LIFECYCLE_FOCUS_WINDOWS:",
    "before": "    const driver = mine(state).find(held => held.id === a.driverId);",
    "after": "    const driver = state.drivers.find(held => held.id === a.driverId);"
  },
  {
    "name": "focus-window",
    "id": "GP_LIFECYCLE_FOCUS_WINDOWS:",
    "before": "    if (!marketOpen(state)) return { ok: false, reason: 'phase' };",
    "after": "    if (false && !marketOpen(state)) return { ok: false, reason: 'phase' };"
  },
  {
    "name": "focus-noop",
    "id": "GP_LIFECYCLE_FOCUS:",
    "before": " || driver.focus === a.focus",
    "after": ""
  },
  {
    "name": "youth-balanced",
    "id": "GP_LIFECYCLE_YOUTH:",
    "before": "if (driver.focus === 'balanced') for (const skill of SKILLS) grow(skill, 1);",
    "after": "if (driver.focus === 'balanced') for (const skill of SKILLS) grow(skill, 0);"
  },
  {
    "name": "youth-focused",
    "id": "GP_LIFECYCLE_YOUTH:",
    "before": "    else grow(driver.focus, 3);",
    "after": "    else grow(driver.focus, 1);"
  },
  {
    "name": "peak-growth",
    "id": "GP_LIFECYCLE_PEAK:",
    "before": "    grow(driver.focus === 'balanced' ? weakest : driver.focus, 1);",
    "after": "    grow(driver.focus === 'balanced' ? weakest : driver.focus, 0);"
  },
  {
    "name": "veteran-decline",
    "id": "GP_LIFECYCLE_VETERAN:",
    "before": "    if (driver.focus !== 'pace') driver.skills.pace = Math.max(0, driver.skills.pace - 1);",
    "after": "    if (false && driver.focus !== 'pace') driver.skills.pace = Math.max(0, driver.skills.pace - 1);"
  },
  {
    "name": "veteran-pace-preservation",
    "id": "GP_LIFECYCLE_VETERAN:",
    "before": "    if (driver.focus !== 'pace') driver.skills.pace = Math.max(0, driver.skills.pace - 1);",
    "after": "    driver.skills.pace = Math.max(0, driver.skills.pace - 1);"
  },
  {
    "name": "above-potential-hold",
    "id": "GP_LIFECYCLE_POTENTIAL:",
    "before": "if (driver.skills[skill] < driver.potential)",
    "after": "if (true)"
  },
  {
    "name": "once-age",
    "id": "GP_LIFECYCLE_ONCE:",
    "before": "  driver.age += 1;",
    "after": "  driver.age += 2;"
  },
  {
    "name": "next-age-retirement",
    "id": "GP_LIFECYCLE_RETIRE:",
    "before": "return driver.age + 1 >= 40 && (!driver.contract",
    "after": "return driver.age >= 40 && (!driver.contract"
  },
  {
    "name": "replacement-debit",
    "id": "GP_LIFECYCLE_RETIRE:",
    "before": "  const cashAfter = cash + sponsor - totalRenewalFee - totalReplacementFee;",
    "after": "  const cashAfter = cash + sponsor - totalRenewalFee;"
  },
  {
    "name": "no-ai-replacement-debit",
    "id": "GP_LIFECYCLE_RETIRE:",
    "before": "  const totalReplacementFee = seatReplacements.reduce((sum, row) => sum + row.signingFee, 0);",
    "after": "  const totalReplacementFee = seatReplacements.reduce((sum, row) => sum + row.signingFee, 0) + [...rookies.values()].filter(driver => driver.contract && driver.contract.teamId !== state.teamId).reduce((sum, driver) => sum + driver.contract!.wagePerRace * 2, 0);"
  },
  {
    "name": "rookie-no-second-step",
    "id": "GP_LIFECYCLE_RETIRE:",
    "before": "      if (rookie) return clone(rookie);",
    "after": "      if (rookie) { const created = clone(rookie); developDriver(created); return created; }"
  },
  {
    "name": "paid-contract-retention",
    "id": "GP_LIFECYCLE_PAID:",
    "before": "  return driver.age + 1 >= 40 && (!driver.contract\n    || (driver.contract.startsSeason ?? season) <= season && driver.contract.years === 1);",
    "after": "  return driver.age + 1 >= 40;"
  },
  {
    "name": "future-paid-term",
    "id": "GP_LIFECYCLE_PAID:",
    "before": "      if (!contract || (contract.startsSeason ?? state.season) > state.season) continue;",
    "after": "      if (!contract) continue;\n      if ((contract.startsSeason ?? state.season) > state.season) { contract.years += 1; continue; }"
  },
  {
    "name": "retiring-free-agent-offer",
    "id": "GP_LIFECYCLE_MARKET:",
    "before": "!lifecycle || driver.age + (state.phase === 'seasonReview' ? 1 : 0) < 40",
    "after": "true"
  },
  {
    "name": "retiring-renewal-offer",
    "id": "GP_LIFECYCLE_MARKET:",
    "before": " && (!lifecycle || !retiring(outgoing, state.season))",
    "after": ""
  },
  {
    "name": "full-carry",
    "id": "GP_LIFECYCLE_CARRY:",
    "before": "const CAR_CARRY = 0.7;",
    "after": "const CAR_CARRY = 1;"
  },
  {
    "name": "no-carry",
    "id": "GP_LIFECYCLE_CARRY:",
    "before": "const CAR_CARRY = 0.7;",
    "after": "const CAR_CARRY = 0;"
  },
  {
    "name": "ai-investment",
    "id": "GP_LIFECYCLE_AI:",
    "before": "const AI_INVESTMENT = 2;",
    "after": "const AI_INVESTMENT = 0;"
  },
  {
    "name": "ai-clock-consequence",
    "id": "GP_LIFECYCLE_AI:",
    "before": "    const team = state.teams.find(row => row.id === driver.contract!.teamId)!;\n    const car = team.car.power * track.powerWeight + team.car.aero * track.aeroWeight;",
    "after": "    const team = state.teams.find(row => row.id === driver.contract!.teamId)!;\n    const car = team.baselineCar.power * track.powerWeight + team.baselineCar.aero * track.aeroWeight;"
  },
  {
    "name": "legacy-focus-default",
    "id": "GP_LIFECYCLE_SAVE:",
    "before": "  for (const driver of state.drivers) driver.focus = 'balanced';",
    "after": "  for (const driver of state.drivers) driver.focus = 'wet';"
  },
  {
    "name": "all-or-none-metadata",
    "id": "GP_LIFECYCLE_SAVE:",
    "before": "  const absent = state.drivers.every(driver => driver.focus === undefined) && state.teams.every(team => team.baselineCar === undefined);",
    "after": "  const absent = state.drivers.some(driver => driver.focus === undefined) || state.teams.some(team => team.baselineCar === undefined);"
  },
  {
    "name": "present-metadata-ledgers",
    "id": "GP_LIFECYCLE_SAVE:",
    "before": "  if (state.history === undefined || state.careerTotals === undefined) return 'invalid';\n",
    "after": ""
  },
  {
    "name": "no-gifted-baseline",
    "id": "GP_LIFECYCLE_SAVE:",
    "before": "integer(team.baselineCar[area], 0, team.car[area])",
    "after": "integer(team.baselineCar[area], 0, 100)"
  },
  {
    "name": "canonical-rookie-record",
    "id": "GP_LIFECYCLE_PLAN:",
    "before": "replacementMatches(raw.seatReplacements, expected.seatReplacements)",
    "after": "true"
  },
  {
    "name": "canonical-replacement-total",
    "id": "GP_LIFECYCLE_PLAN:",
    "before": "raw.totalReplacementFee === expected.totalReplacementFee && ",
    "after": ""
  },
  {
    "name": "no-revision-rookie-reroll",
    "id": "GP_LIFECYCLE_PLAN:",
    "before": "keyedRng(`grand-prix-rookie|${state.seed}|${state.season + 1}|${index}`)",
    "after": "keyedRng(`grand-prix-rookie|${state.seed}|${state.season + 1}|${index}|${state.revision}`)"
  },
  {
    "name": "pre-growth-renewal-quote",
    "id": "GP_LIFECYCLE_YOUTH:",
    "before": "    const plan = projectedSeason(state);",
    "after": "    const pricing = clone(state);\n    for (const driver of pricing.drivers) developDriver(driver);\n    const plan = projectedSeason(pricing);"
  }
];
const results = [];
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(sourceReceipts(), null, 2));
fs.writeFileSync(path.join(out, 'actual-grandPrixBoss.ts'), original);
function run(name, mode = 'healthy', selectedId = null, file = null) {
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
  const expectedFailures = mode === 'baseline' ? 15 : mode === 'selected' ? 1 : 0;
  const expectedPasses = mode === 'healthy' ? 15 : 0;
  const expectedSkips = mode === 'selected' ? 14 : 0;
  assert.equal(report.success, mode === 'healthy');
  assert.equal(report.testResults.length, 1); assert(report.testResults[0].name.endsWith('/' + TEST));
  const rows = report.testResults[0].assertionResults;
  assert.equal(rows.length, 15); assert.equal(report.numTotalTests, 15);
  assert.equal(report.numPassedTests, expectedPasses); assert.equal(report.numFailedTests, expectedFailures);
  assert.equal(report.numPendingTests, expectedSkips); assert.equal(report.numTodoTests, 0);
  const seen = new Set();
  for (const row of rows) {
    const matches = ids.filter(id => row.title.startsWith(id)); assert.equal(matches.length, 1);
    const id = matches[0]; assert(!seen.has(id)); seen.add(id);
    const failed = mode === 'baseline' || mode === 'selected' && id === selectedId;
    const skipped = mode === 'selected' && !failed;
    assert.equal(row.status, failed ? 'failed' : skipped ? 'skipped' : 'passed');
    assert.equal(row.failureMessages.length, failed ? 1 : 0);
    if (failed) {
      const error = row.failureMessages[0]; assert.match(error, /AssertionError:/);
      if (mode === 'baseline') assert(error.includes(missing[id]));
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
  for (const [filePath, bytes] of held) {
    const actualBytes = fs.readFileSync(path.join(root, filePath));
    assert.deepEqual(actualBytes, bytes, name + ': actual held input changed');
  }
  console.log(name + ': ' + expectedPasses + ' passes, ' + expectedFailures + ' owned assertions, ' + expectedSkips + ' declared skips.');
}
try {
  run('current');
  fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original));
  run('healthy-copy', 'healthy', null, candidate);
  const prior = path.join(out, 'before-lifecycle-grandPrixBoss.ts');
  fs.writeFileSync(prior, held.get(BASELINE)); assert.equal(sha(fs.readFileSync(prior)), sha(held.get(BASELINE)));
  run('whole-baseline', 'baseline', null, prior);
  for (const { name, id, before, after } of controls) {
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
    try { fs.writeFileSync(candidate, changed); run(name, 'selected', id, candidate); }
    finally { fs.writeFileSync(candidate, original); assert.equal(sha(fs.readFileSync(candidate)), sha(original)); }
  }
  run('restored-copy', 'healthy', null, candidate);
  assert.equal(results.length, 37);
  const totals = results.reduce((sum, row) => ({ passed: sum.passed + row.passed, ownedFailures: sum.ownedFailures + row.ownedFailures, declaredSkips: sum.declaredSkips + row.declaredSkips }), { passed: 0, ownedFailures: 0, declaredSkips: 0 });
  assert.deepEqual(totals, { passed: 45, ownedFailures: 48, declaredSkips: 462 });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: 'Candidate lifecycle behavior only. Carry and AI coefficients still await paired measurements. No hook, UI, route or readiness credit.', childRuns: 37, executed: 93, totals, results }, null, 2));
  console.log('simGrandPrixBossLifecycle: 45 passes, 48 owned assertions, 462 declared unselected skips; 93 executed outcomes.');
} finally {
  const after = [];
  for (const [file] of held) {
    const bytes = fs.readFileSync(path.join(root, file));
    after.push({ file, bytes: bytes.length, sha256: sha(bytes) });
  }
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  assert.deepEqual(after, sourceReceipts());
  console.log('Grand Prix Boss lifecycle evidence: ' + out);
}
