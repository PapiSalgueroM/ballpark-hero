import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.ARTIFACT_DIR || 'shirt-sales-artifacts');
const MODE = process.env.MEASURE_MODE || 'full';
const START = performance.now();
const BUDGET_MS = MODE === 'pilot' ? 90_000 : 480_000;
const WEEK_LIMIT = 12;
const QUANTUM = 1_000_000;
const PENCE_PER_M = 100_000_000;
const CLOCK = Date.UTC(2026, 9, 21, 12);
const HELD = [
  'src/lib/clubManager.ts', 'src/lib/clubManagerFinances.ts',
  'src/lib/clubManagerCalendar.ts', 'src/lib/clubManagerMeters.ts',
  'src/hooks/useClubManager.ts', 'src/lib/worldOneOffs.ts', 'src/lib/worldNights.ts',
  'src/data/clubManagerRosters.ts', 'src/data/clubManagerWorldRosters.ts', 'src/data/playerNationalities.ts',
  'src/data/clubManagerEra2005.ts', 'src/data/clubManagerEra2020.ts',
  'package.json', 'package-lock.json',
];
// Trial models are fictional diagnostics, never selected product rates.
const MODELS = [
  { id: 'trial-low', quantities: [1600, 600, 240, 80] },
  { id: 'trial-middle', quantities: [3200, 1200, 480, 160] },
  { id: 'trial-high', quantities: [6400, 2400, 960, 320] },
].map(model => ({ ...model, unitPricePence: 5000, unitCostPence: 2000 }));
const report = {
  schema: 1, mode: MODE, status: 'running', budgetMs: BUDGET_MS,
  source: { commit: process.env.SOURCE_SHA || process.env.GITHUB_SHA || null },
  plan: { fixtureCount: MODE === 'pilot' ? 3 : 8, seeds: MODE === 'pilot' ? [0] : Array.from({ length: 16 }, (_, i) => i), chargedWeeksPerRun: WEEK_LIMIT },
  strata: [], fixtures: [], runs: [], models: MODELS, candidateResults: [], groups: [],
  networkAttempts: 0, errors: [],
  candidateInput: 'Post-entry displayed fanMeter.shown. These dry estimates do not claim the exact internal weekly quote.',
};
report.plan.runCount = report.plan.fixtureCount * report.plan.seeds.length;
report.plan.maximumChargedWeeks = report.plan.runCount * WEEK_LIMIT;
fs.mkdirSync(OUT, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const heldBefore = Object.fromEntries(HELD.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const originalRandom = Math.random;
const originalNow = Date.now;
const originalFetch = globalThis.fetch;
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let cm;
let fin;
let meters;

function deadline() {
  assert.ok(performance.now() - START < BUDGET_MS, `MEASURE_TIME_BUDGET_EXCEEDED after ${report.runs.length} started runs`);
}
function stream(seed, trace) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    const number = ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    trace.calls += 1;
    trace.digest.update(String(number));
    return number;
  };
}
function representative(pool, tier, label) {
  const rows = pool.filter(row => row.tier === tier).sort((a, b) => a.budget - b.budget || a.name.localeCompare(b.name, 'en'));
  report.strata.push({ source: label, tier, available: rows.length, selection: 'median starting budget, name breaks ties' });
  assert.ok(rows.length > 0, `MISSING_STRATUM ${label} tier ${tier}`);
  return rows[Math.floor(rows.length / 2)];
}
async function fixtures() {
  const modern = [...new Map(cm.REAL_LEAGUES.flatMap(league => cm.playableClubs(league.id)
    .map(club => [club.name, { ...club, leagueId: league.id }]))).values()];
  assert.ok(modern.length > 0, 'No real playable modern clubs were loaded');
  const rows = [1, 2, 3, 4].map(tier => {
    const club = representative(modern, tier, 'modern');
    return { id: `modern-tier-${tier}`, kind: 'modern', era: 'now', club: club.name, leagueId: club.leagueId, tier, statureBudgetM: club.budget };
  });
  for (const [era, tier] of [['era2005', 1], ['era2020', 4]]) {
    deadline();
    await cm.ensureEraRosters(era);
    const pool = cm.eraLeaguesFor(era).flatMap(league => cm.eraPlayableClubs(era, league.id)
      .map(club => ({ ...club, leagueId: league.id })));
    const club = representative(pool, tier, era);
    rows.push({ id: `${era}-tier-${tier}`, kind: 'historical', era, club: club.name, leagueId: club.leagueId, tier, statureBudgetM: club.budget });
  }
  assert.ok(cm.REAL_LEAGUES.some(league => league.id === 'premier'), 'Custom fixture league is unavailable');
  for (const backing of ['small', 'big']) {
    rows.push({
      id: `custom-${backing}`, kind: 'custom', era: 'now', leagueId: 'premier',
      club: `Shirt Fixture ${backing === 'small' ? 'Small' : 'Big'}`,
      custom: {
        name: `Shirt Fixture ${backing === 'small' ? 'Small' : 'Big'}`, leagueId: 'premier',
        stadium: 'Fixture Ground', budgetTier: backing, quality: 72, replacedClub: '',
        crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'SF' },
      },
    });
  }
  assert.equal(rows.length, 8);
  assert.equal(new Set(rows.map(row => row.id)).size, 8);
  return MODE === 'pilot' ? [rows[0], rows[4], rows[6]] : rows;
}
function snapshot(state) {
  const ledger = fin.booksOf(state).season;
  const fan = meters.fanMeter(state);
  const numbers = [state.budget, ledger.weeks, ledger.tickets, ledger.concessions, ledger.sponsor, fan.value, fan.shown];
  assert.ok(numbers.every(Number.isFinite), 'Snapshot contains a non-finite engine value');
  assert.ok(Number.isInteger(fan.shown) && fan.shown >= 0 && fan.shown <= 100, 'Displayed fan value is outside its domain');
  return {
    pointer: state.week, chargedWeeks: ledger.weeks, budgetM: state.budget,
    fanValue: fan.value, fanShown: fan.shown,
    ticketsM: ledger.tickets, concessionsM: ledger.concessions, sponsorM: ledger.sponsor,
    playerWagesM: ledger.playerWages, staffWagesM: ledger.staffWages, travelM: ledger.travel,
  };
}
function runFixture(fixture, seed) {
  deadline();
  const registrations = cm.engineRegistrations();
  const random = Math.random;
  const now = Date.now;
  const trace = { calls: 0, digest: createHash('sha256') };
  const run = { fixture: fixture.id, seed, arm: seed < 8 ? 'calibration' : 'holdout', status: 'running', steps: [], samples: [], inputImmutabilityChecks: 0 };
  report.runs.push(run);
  Math.random = stream(1519 + seed * 7919, trace);
  Date.now = () => CLOCK;
  const runStart = performance.now();
  try {
    let state = cm.startCareer(fixture.club, fixture.era, fixture.custom);
    assert.equal(state.clubName, fixture.club, 'Constructor chose a different club');
    assert.ok(state.squad.length > 0 && state.calendar.length > 0, 'Empty constructor fixture');
    assert.ok(cm.careerLeagueOf(state).clubs.includes(state.clubName), 'Fixture club is absent from its active league');
    const def = cm.eraClubDefFor(state.clubName, fixture.era);
    assert.ok([1, 2, 3, 4].includes(def.tier), 'Fixture has no usable supplied club tier');
    run.tier = def.tier;
    run.era = fixture.era;
    run.kind = fixture.kind;
    run.initial = snapshot(state);
    run.openingBoardBudgetM = state.budget;
    run.openingBudgetBasis = 'startCareer budget before optional sponsor or manager deals';
    run.calendarChargedWeeks = state.calendar.filter(entry => !entry.night).length;
    run.safeSponsorQuoteM = cm.sponsorOffers(state).find(offer => offer.shape === 'safe')?.perSeason ?? null;
    assert.ok(Number.isFinite(run.safeSponsorQuoteM) && run.safeSponsorQuoteM > 0, 'No nonempty safe-sponsor benchmark');
    const bound = state.calendar.length + WEEK_LIMIT + 1;
    for (let attempt = 0; attempt < bound; attempt += 1) {
      deadline();
      if (state.sacked || state.week >= state.calendar.length || run.samples.length >= WEEK_LIMIT) break;
      const input = JSON.stringify(state);
      const before = snapshot(state);
      const result = cm.playNextEntry(state, { skipHalftime: true, noCoach: true, untilWeek: state.week + 1 });
      assert.equal(JSON.stringify(state), input, 'playNextEntry mutated its supplied career');
      run.inputImmutabilityChecks += 1;
      assert.ok(result.state.week > state.week, 'Manager advancement made no calendar progress');
      assert.notEqual(result.kind, 'halftime', 'The measurement unexpectedly stopped inside a match');
      const after = snapshot(result.state);
      const consumed = state.calendar.slice(state.week, result.state.week);
      const expectedCharges = consumed.filter(entry => !entry.night).length;
      const charged = after.chargedWeeks - before.chargedWeeks;
      assert.equal(charged, expectedCharges, 'Charged weeks differ from consumed non-night entries');
      assert.ok(charged === 0 || charged === 1, 'untilWeek advanced more than one charged week');
      const step = { kind: result.kind, charged, nights: consumed.filter(entry => entry.night).length, before, after };
      run.steps.push(step);
      if (charged === 1) run.samples.push({ chargedIndex: run.samples.length + 1, before, after });
      state = result.state;
    }
    run.final = snapshot(state);
    run.stop = state.sacked ? 'sacked' : state.week >= state.calendar.length ? 'seasonOver' : run.samples.length === WEEK_LIMIT ? 'prefixLimit' : 'boundExceeded';
    assert.notEqual(run.stop, 'boundExceeded', 'The bounded prefix did not reach a declared stopping point');
    assert.ok(run.samples.length > 0, 'A planned run has no actual charged-week samples');
    assert.equal(run.final.chargedWeeks - run.initial.chargedWeeks, run.samples.length);
    run.status = 'complete';
  } finally {
    cm.restoreEngineRegistrations(registrations);
    Math.random = random;
    Date.now = now;
    run.rngCalls = trace.calls;
    run.rngTraceSha256 = trace.digest.digest('hex');
    run.elapsedMs = Math.round(performance.now() - runStart);
    run.rngRestored = Math.random === random;
    run.clockRestored = Date.now === now;
    assert.ok(run.rngRestored && run.clockRestored, 'Measurement failed to restore globals');
  }
  console.log(`CM_SHIRTS_MEASURE_RUN ${fixture.id} seed=${seed} arm=${run.arm} weeks=${run.samples.length} stop=${run.stop} ms=${run.elapsedMs}`);
}
const ratio = (number, denominator) => denominator > 0 ? number / denominator : null;
function evaluate(model, run) {
  let grossPence = 0;
  let costPence = 0;
  let paidPence = 0;
  let pendingPence = 0;
  let firstPaymentWeek = null;
  const receipts = [];
  for (const sample of run.samples) {
    const demand = 0.5 + sample.after.fanShown / 100;
    const units = Math.floor(model.quantities[run.tier - 1] * demand);
    const eraMoney = run.era === 'now' ? 1 : 0.75;
    const gross = Math.round(units * model.unitPricePence * eraMoney);
    const cost = Math.round(units * model.unitCostPence * eraMoney);
    grossPence += gross;
    costPence += cost;
    const cash = Math.floor((pendingPence + gross - cost) / QUANTUM) * QUANTUM;
    paidPence += cash;
    pendingPence += gross - cost - cash;
    assert.ok([grossPence, costPence, paidPence, pendingPence].every(Number.isSafeInteger));
    assert.equal(grossPence - costPence, paidPence + pendingPence);
    assert.ok(pendingPence >= 0 && pendingPence < QUANTUM);
    if (cash > 0 && firstPaymentWeek === null) firstPaymentWeek = sample.chargedIndex;
    receipts.push({ week: sample.chargedIndex, shown: sample.after.fanShown, units, grossPence: gross, costPence: cost, cashPence: cash, pendingPence });
  }
  const gateM = run.final.ticketsM + run.final.concessionsM - run.initial.ticketsM - run.initial.concessionsM;
  const netM = (grossPence - costPence) / PENCE_PER_M;
  const annualizedNetM = netM * run.calendarChargedWeeks / run.samples.length;
  const denominators = { gateM, safeAnnualSponsorQuoteM: run.safeSponsorQuoteM, openingBoardBudgetM: run.openingBoardBudgetM };
  return {
    model: model.id, fixture: run.fixture, arm: run.arm, seed: run.seed, tier: run.tier, era: run.era, kind: run.kind,
    observedWeeks: run.samples.length, grossPence, costPence, netPence: grossPence - costPence, paidPence, pendingPence,
    firstPaymentWeek, delayCensored: firstPaymentWeek === null, censorWeek: run.samples.length,
    netToObservedGate: ratio(netM, gateM), paidToObservedGate: ratio(paidPence / PENCE_PER_M, gateM),
    estimatedAnnualNetToSafeSponsorQuote: ratio(annualizedNetM, run.safeSponsorQuoteM),
    estimatedAnnualNetToOpeningBoardBudget: ratio(annualizedNetM, run.openingBoardBudgetM),
    annualizedNetM, denominators, zeroDenominators: Object.entries(denominators).filter(([, n]) => !(n > 0)).map(([key]) => key), receipts,
  };
}
function distribution(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const at = q => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))] : null;
  return { count: sorted.length, p10: at(0.1), median: at(0.5), p90: at(0.9) };
}
try {
  assert.ok(MODE === 'full' || MODE === 'pilot', `Unsupported MEASURE_MODE=${MODE}`);
  assert.match(report.source.commit ?? '', /^[0-9a-f]{40}$/i, 'A source commit must be supplied by the workflow');
  globalThis.fetch = () => { report.networkAttempts += 1; throw new Error('Network is forbidden in shirt-sales measurement'); };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {}, removeItem: () => {} } });
  const bundle = path.join(OUT, 'measurement-engine.mjs');
  buildSync({
    stdin: {
      contents: "export const engine = await import('./src/lib/clubManager.ts');\nexport const finance = await import('./src/lib/clubManagerFinances.ts');\nexport const meters = await import('./src/lib/clubManagerMeters.ts');\n",
      resolveDir: ROOT, sourcefile: 'shirt-sales-measurement-entry.mjs', loader: 'js',
    },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle,
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  });
  report.source.bundleSha256 = hash(fs.readFileSync(bundle));
  const modules = await import(pathToFileURL(bundle).href);
  cm = modules.engine;
  fin = modules.finance;
  meters = modules.meters;
  report.fixtures = await fixtures();
  assert.equal(report.fixtures.length, report.plan.fixtureCount);
  console.log(`CM_SHIRTS_MEASURE_START mode=${MODE} fixtures=${report.fixtures.length} runs=${report.plan.runCount} maxWeeks=${report.plan.maximumChargedWeeks}`);
  for (const fixture of report.fixtures) for (const seed of report.plan.seeds) runFixture(fixture, seed);
  deadline();
  assert.equal(report.runs.length, report.plan.runCount);
  assert.ok(report.runs.every(run => run.status === 'complete' && run.samples.length > 0));
  for (const run of report.runs) for (const model of MODELS) report.candidateResults.push(evaluate(model, run));
  for (const model of MODELS) for (const arm of MODE === 'pilot' ? ['calibration'] : ['calibration', 'holdout']) {
    const rows = report.candidateResults.filter(row => row.model === model.id && row.arm === arm);
    assert.ok(rows.length > 0, `Empty candidate group ${model.id}/${arm}`);
    report.groups.push({
      model: model.id, arm, runs: rows.length,
      netPence: distribution(rows.map(row => row.netPence)), paidPence: distribution(rows.map(row => row.paidPence)),
      pendingPence: distribution(rows.map(row => row.pendingPence)),
      netToObservedGate: distribution(rows.map(row => row.netToObservedGate)),
      estimatedAnnualNetToSponsor: distribution(rows.map(row => row.estimatedAnnualNetToSafeSponsorQuote)),
      firstPaymentWeek: distribution(rows.map(row => row.firstPaymentWeek)),
      delayCensored: rows.filter(row => row.delayCensored).length,
      zeroDenominatorRuns: rows.filter(row => row.zeroDenominators.length > 0).length,
    });
  }
  deadline();
  assert.equal(report.networkAttempts, 0);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
} finally {
  Math.random = originalRandom;
  Date.now = originalNow;
  globalThis.fetch = originalFetch;
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
  else delete globalThis.localStorage;
  report.holds = HELD.map(file => ({ path: file, before: heldBefore[file], after: hash(fs.readFileSync(path.join(ROOT, file))) }));
  if (report.holds.some(hold => hold.before !== hold.after)) { report.status = 'failed'; report.errors.push('SOURCE_HOLD_CHANGED'); process.exitCode = 1; }
  report.actual = {
    fixtureCount: new Set(report.runs.map(run => run.fixture)).size, startedRuns: report.runs.length,
    completeRuns: report.runs.filter(run => run.status === 'complete').length,
    chargedWeeks: report.runs.reduce((n, run) => n + run.samples.length, 0),
    prefixRuns: report.runs.filter(run => run.stop === 'prefixLimit').length,
    sackedRuns: report.runs.filter(run => run.stop === 'sacked').length,
    seasonOverRuns: report.runs.filter(run => run.stop === 'seasonOver').length,
    inputImmutabilityChecks: report.runs.reduce((n, run) => n + run.inputImmutabilityChecks, 0),
    elapsedMs: Math.round(performance.now() - START), networkAttempts: report.networkAttempts,
    rngRestored: Math.random === originalRandom, clockRestored: Date.now === originalNow,
  };
  fs.writeFileSync(path.join(OUT, 'cm-shirt-sales-baseline.json'), JSON.stringify(report, null, 2) + '\n');
  const lines = [
    '# Shirt sales baseline measurement', '',
    `Status: ${report.status}. Mode: ${MODE}. Source: ${report.source.commit}.`,
    `Planned ${report.plan.runCount} runs, at most ${report.plan.maximumChargedWeeks} charged weeks. Actual ${report.actual.completeRuns} complete runs, ${report.actual.chargedWeeks} charged weeks.`,
    `Stopped: ${report.actual.sackedRuns} sacked, ${report.actual.seasonOverRuns} season ends, ${report.actual.prefixRuns} prefix limits.`,
    `Elapsed ${report.actual.elapsedMs}ms. Network attempts ${report.networkAttempts}. Source holds unchanged: ${report.holds.every(hold => hold.before === hold.after)}.`,
    '', 'Rates below are unselected fictional candidates. Prefix ratios are observed; annualized comparisons and first-payment delays are dry estimates from post-entry displayed demand.', '',
    ...report.groups.map(group => `- ${group.model}/${group.arm}: ${group.runs} runs; net/gate median ${group.netToObservedGate.median}; annualized net/sponsor median ${group.estimatedAnnualNetToSponsor.median}; first-payment median ${group.firstPaymentWeek.median}; ${group.delayCensored} censored delays; ${group.zeroDenominatorRuns} zero-denominator runs.`),
    ...report.errors.map(error => `\nFailure: ${error}`),
  ];
  fs.writeFileSync(path.join(OUT, 'cm-shirt-sales-baseline.md'), lines.join('\n') + '\n');
  console.log(`CM_SHIRTS_MEASURE_${report.status.toUpperCase()} ${JSON.stringify(report.actual)}`);
}
