import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_SHIRT_SALES_CONTROL || '';
const OUT = path.resolve(ROOT, process.env.ARTIFACT_DIR || `shirt-sales-sim-artifacts/${CONTROL || 'normal'}`);
const START = performance.now();
const CLOCK = Date.UTC(2026, 9, 21, 12);
const HELD = [
  'src/lib/clubManager.ts', 'src/lib/clubManagerFinances.ts', 'src/lib/clubManagerCalendar.ts',
  'src/lib/clubManagerMeters.ts', 'src/lib/clubManagerHubLines.ts', 'src/hooks/useClubManager.ts',
  'src/lib/worldOneOffs.ts', 'src/lib/worldNights.ts', 'src/data/clubManagerRosters.ts',
  'src/data/clubManagerWorldRosters.ts', 'src/data/playerNationalities.ts',
  'src/data/clubManagerEra2005.ts', 'src/data/clubManagerEra2020.ts', 'package.json', 'package-lock.json',
];
// Each fault changes a copied finance module used by the actual engine bundle.
const FAULTS = {
  'no-credit': {
    from: 'if (sale && sale.cashPence > 0) state.budget = round2(state.budget + sale.cashPence / SHIRT_PENCE_PER_M);',
    to: 'if (sale && sale.cashPence > 0) state.budget = round2(state.budget + 0 / SHIRT_PENCE_PER_M);',
    marker: 'SHIRT_ENGINE_WINDOW_CASH',
  },
  'gross-credit': {
    from: 'if (sale && sale.cashPence > 0) state.budget = round2(state.budget + sale.cashPence / SHIRT_PENCE_PER_M);',
    to: 'if (sale && sale.cashPence > 0) state.budget = round2(state.budget + shirtSalesForWeek(state).grossPence / SHIRT_PENCE_PER_M);',
    marker: 'SHIRT_ENGINE_WINDOW_CASH',
  },
  'drop-pending': {
    from: 'return ledger.openingPence + ledger.grossPence - ledger.costPence - ledger.paidPence;',
    to: 'return 0;', marker: 'SHIRT_PENNY_IDENTITY',
  },
  'double-tick': {
    from: 'weeks: ledger.weeks + weeks, grossPence:',
    to: 'weeks: ledger.weeks + weeks * 2, grossPence:', marker: 'SHIRT_WEEK_COUNT',
  },
  backpay: {
    from: 'if (value === undefined) return emptyShirtSales();',
    to: 'if (value === undefined) return { ...emptyShirtSales(), grossPence: 10_000_000, paidPence: 10_000_000 };',
    marker: 'SHIRT_LEGACY_ZERO',
  },
  'hidden-demand': {
    from: 'fanMeter(state).shown / 100', to: 'booksOf(state).fanMood / 100',
    marker: 'SHIRT_DISPLAYED_DEMAND',
  },
  'night-projection': {
    from: 'state.calendar.slice(state.week).filter(entry => !entry.night).length',
    to: 'state.calendar.slice(state.week).length', marker: 'SHIRT_PROJECTION_CHARGED_ONLY',
  },
  'drop-carry': {
    from: 'season: emptyLedger(shirtPendingPence(readShirtSales(career.books.season.shirts) ?? emptyShirtSales())),',
    to: 'season: emptyLedger(),', marker: 'SHIRT_SAME_CLUB_CARRY',
  },
  'unsafe-forecast': {
    from: 'const retailForecast = retail ? settleShirtSales(retail, quote, retailWeeksLeft) : null;',
    to: 'const retailForecast = retail ? { ledger: { ...retail, paidPence: retail.paidPence + Math.floor((shirtPendingPence(retail) + (quote.grossPence - quote.costPence) * retailWeeksLeft) / SHIRT_CASH_PENCE) * SHIRT_CASH_PENCE } } : null;',
    marker: 'SHIRT_FORECAST_UNAVAILABLE',
  },
};
const report = {
  schema: 1, status: 'running', control: CONTROL || null,
  source: { commit: process.env.SOURCE_SHA || process.env.GITHUB_SHA || null },
  plannedCases: 15, cases: [], prefixes: [], networkAttempts: 0, errors: [],
};
const hash = value => createHash('sha256').update(value).digest('hex');
const held = () => Object.fromEntries(HELD.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const copy = value => JSON.parse(JSON.stringify(value));
const originalRandom = Math.random, originalNow = Date.now, originalFetch = globalThis.fetch;
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const store = new Map();
let cm, fin, meters, hub, retire;
fs.mkdirSync(OUT, { recursive: true });
report.source.before = held();
function deadline() { assert.ok(performance.now() - START < 180_000, 'SHIRT_SETUP_TIME_BUDGET'); }
function stream(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
async function seeded(seed, run) {
  const random = Math.random, now = Date.now, registrations = cm.engineRegistrations();
  Math.random = stream(seed); Date.now = () => CLOCK;
  try { return await run(); } finally {
    cm.restoreEngineRegistrations(registrations); Math.random = random; Date.now = now;
  }
}
async function check(id, run) {
  deadline();
  const row = { id, status: 'running' };
  report.cases.push(row);
  try { await seeded(1519, run); row.status = 'passed'; console.log(`CM_SHIRTS_PASS ${id}`); }
  catch (error) { row.status = 'failed'; row.error = String(error?.message || error); console.error(`CM_SHIRTS_FAIL ${id}: ${row.error}`); }
  assert.equal(Math.random, originalRandom, 'SHIRT_SETUP_RANDOM_RESTORE');
  assert.equal(Date.now, originalNow, 'SHIRT_SETUP_CLOCK_RESTORE');
}
const fresh = () => {
  const state = cm.startCareer('Manchester City');
  assert.ok(state.squad.length > 0 && state.calendar.length > 0, 'SHIRT_PRECONDITION_REAL_CAREER');
  return state;
};
const ledger = state => fin.readShirtSales(fin.booksOf(state).season.shirts);
const line = state => {
  const rows = fin.projectFinances(state).income.filter(row => row.id === 'shirtSales');
  assert.equal(rows.length, 1, 'SHIRT_PRECONDITION_PROJECTION_ROW');
  return rows[0];
};
const custom = () => cm.startCareer('Shirt Penny Fixture', 'now', {
  name: 'Shirt Penny Fixture', leagueId: 'premier', stadium: 'Fixture Ground', budgetTier: 'small', quality: 72,
  crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'SP' }, replacedClub: '',
});

try {
  assert.ok(!CONTROL || Object.hasOwn(FAULTS, CONTROL), 'SHIRT_SETUP_UNKNOWN_CONTROL');
  globalThis.fetch = () => { report.networkAttempts += 1; throw new Error('SHIRT_SETUP_NETWORK_FORBIDDEN'); };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key),
  } });
  let financePath = path.join(ROOT, 'src/lib/clubManagerFinances.ts');
  if (CONTROL) {
    const source = fs.readFileSync(financePath, 'utf8').replaceAll('\r\n', '\n');
    const fault = FAULTS[CONTROL];
    assert.equal(source.split(fault.from).length - 1, 1, 'SHIRT_SETUP_CONTROL_ANCHOR_COUNT');
    const changed = source.replace(fault.from, fault.to);
    assert.notEqual(changed, source, 'SHIRT_SETUP_CONTROL_DID_NOT_CHANGE');
    report.fault = { marker: fault.marker, replacements: 1, originalHash: hash(source), changedHash: hash(changed) };
    financePath = path.join(OUT, `finance-${CONTROL}.ts`);
    fs.writeFileSync(financePath, changed);
  }
  const bundle = path.join(OUT, 'engine.mjs');
  buildSync({
    stdin: { resolveDir: ROOT, sourcefile: 'shirt-sales-proof-entry.mjs', loader: 'js', contents:
      `export const engine = await import('./src/lib/clubManager.ts');
export const finance = await import(${JSON.stringify(financePath.replaceAll('\\', '/'))});
export const meters = await import('./src/lib/clubManagerMeters.ts');
export const hub = await import('./src/lib/clubManagerHubLines.ts');
export const retirement = await import('./src/lib/clubManagerRetire.ts');` },
    bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error',
    alias: { '@/lib/clubManagerFinances': financePath, '@': path.join(ROOT, 'src') },
  });
  report.source.bundleSha256 = hash(fs.readFileSync(bundle));
  const modules = await import(pathToFileURL(bundle).href);
  cm = modules.engine; fin = modules.finance; meters = modules.meters; hub = modules.hub; retire = modules.retirement;
  assert.ok(cm.playableClubs('premier').some(club => club.name === 'Manchester City'), 'SHIRT_PRECONDITION_CLUB');
  await cm.ensureEraRosters('era2005');

  await check('penny-identity', () => {
    const input = fin.emptyShirtSales();
    const tiny = fin.settleShirtSales(input, { grossPence: 900_000, costPence: 400_000 });
    assert.ok(tiny, 'SHIRT_PRECONDITION_SETTLEMENT');
    assert.equal(fin.shirtPendingPence(tiny.ledger), 500_000, 'SHIRT_PENNY_IDENTITY');
    assert.equal(tiny.cashPence, 0, 'SHIRT_TINY_CASH');
    const exact = fin.settleShirtSales(tiny.ledger, { grossPence: 500_001, costPence: 1 });
    assert.equal(exact.cashPence, 1_000_000, 'SHIRT_EXACT_THRESHOLD');
    assert.equal(fin.shirtPendingPence(exact.ledger), 0, 'SHIRT_EXACT_PENDING');
    const multiple = fin.settleShirtSales(fin.emptyShirtSales(999_999), { grossPence: 10_000_005, costPence: 3_000_004 });
    assert.equal(multiple.cashPence, 8_000_000, 'SHIRT_MULTIBATCH_CASH');
    assert.equal(fin.shirtPendingPence(multiple.ledger), 0, 'SHIRT_MULTIBATCH_PENDING');
    assert.equal(fin.settleShirtSales(multiple.ledger, { grossPence: 0, costPence: 0 }).cashPence, 0, 'SHIRT_NO_REPEAT_PAYMENT');
    assert.deepEqual(input, { v: 1, weeks: 0, openingPence: 0, grossPence: 0, costPence: 0, paidPence: 0 }, 'SHIRT_NO_INPUT_ALIAS');
    assert.notEqual(tiny.ledger, input, 'SHIRT_FRESH_SETTLEMENT');
  });
  await check('one-counter-per-charge', () => {
    const state = fresh(), pointer = state.week;
    fin.tickBooks(state); fin.tickBooks(state);
    assert.equal(ledger(state).weeks, 2, 'SHIRT_WEEK_COUNT');
    assert.equal(state.week, pointer, 'SHIRT_PRECONDITION_POINTER_FIXED');
    assert.equal(fin.booksOf(state).season.weeks, 2, 'SHIRT_BASE_WEEK_COUNT');
  });
  await check('malformed-and-overflow', () => {
    const empty = fin.emptyShirtSales();
    for (const value of [null, [], {}, { ...empty, weeks: -1 }, { ...empty, weeks: 0.5 },
      { ...empty, openingPence: 1_000_000 }, { ...empty, costPence: 1 }, { ...empty, paidPence: 1 },
      { ...empty, grossPence: Number.MAX_SAFE_INTEGER + 1 }]) assert.equal(fin.readShirtSales(value), null, 'SHIRT_MALFORMED_REJECTED');
    const large = { ...empty, grossPence: 9_007_199_254_000_000, paidPence: 9_007_199_254_000_000 };
    assert.ok(fin.readShirtSales(large), 'SHIRT_PRECONDITION_LARGE_VALID');
    assert.equal(fin.settleShirtSales(large, { grossPence: 1_000_000, costPence: 0 }), null, 'SHIRT_OVERFLOW_REJECTED');
    assert.equal(fin.settleShirtSales(empty, { grossPence: 1, costPence: 2 }), null, 'SHIRT_NEGATIVE_NET_REJECTED');
    assert.equal(fin.settleShirtSales({ ...empty, weeks: Number.MAX_SAFE_INTEGER }, { grossPence: 0, costPence: 0 }), null, 'SHIRT_WEEK_OVERFLOW_REJECTED');
    const state = fresh(); fin.ensureBooks(state).season.shirts = null;
    fin.ensureBooks(state).season.tickets = 7.25;
    const budget = state.budget; fin.tickBooks(state);
    assert.equal(state.budget, budget, 'SHIRT_UNAVAILABLE_NO_PAYMENT');
    assert.equal(fin.booksOf(state).season.tickets, 7.25, 'SHIRT_UNAVAILABLE_BASE_PRESERVED');
    assert.equal(line(state).unavailable, true, 'SHIRT_UNAVAILABLE_MARKED');
    assert.equal(fin.closeLedger(state).shirts, null, 'SHIRT_UNAVAILABLE_CLOSED');
  });
  await check('legacy-zero-no-backpay', () => {
    const state = fresh(), books = fin.ensureBooks(state);
    books.season.weeks = 25; books.season.tickets = 7.25; delete books.season.shirts;
    const before = JSON.stringify(state);
    assert.equal(line(state).actual, 0, 'SHIRT_LEGACY_ZERO');
    assert.deepEqual(ledger(state), fin.emptyShirtSales(), 'SHIRT_LEGACY_RECORD_ZERO');
    assert.equal(JSON.stringify(state), before, 'SHIRT_LEGACY_READ_PURE');
    fin.tickBooks(state);
    assert.equal(ledger(state).weeks, 1, 'SHIRT_LEGACY_ONE_NEW_WEEK');
    assert.equal(fin.booksOf(state).season.weeks, 26, 'SHIRT_LEGACY_BASE_WEEKS');
    assert.equal(fin.booksOf(state).season.tickets, 7.25, 'SHIRT_LEGACY_BASE_INCOME');
  });
  await check('displayed-demand-and-era-scale', () => {
    const state = fresh(), low = copy(state), high = copy(state);
    fin.ensureBooks(low).fanMood = 0; low.budget = 0;
    fin.ensureBooks(high).fanMood = 100; high.budget = 999;
    assert.deepEqual(fin.shirtSalesForWeek(low), fin.shirtSalesForWeek(high), 'SHIRT_DISPLAYED_DEMAND');
    const shown = meters.fanMeter(state).shown, units = Math.floor(1600 * (0.5 + shown / 100));
    assert.deepEqual(fin.shirtSalesForWeek(state), { grossPence: units * 5000, costPence: units * 2000 }, 'SHIRT_RATE_MODEL');
    const historical = cm.startCareer('AC Milan', 'era2005');
    assert.equal(cm.eraClubDefFor(historical.clubName, historical.eraId).tier, 1, 'SHIRT_PRECONDITION_HISTORIC_TIER');
    const oldUnits = Math.floor(1600 * (0.5 + meters.fanMeter(historical).shown / 100));
    assert.deepEqual(fin.shirtSalesForWeek(historical), { grossPence: Math.round(oldUnits * 3750), costPence: Math.round(oldUnits * 1500) }, 'SHIRT_HISTORIC_SCALE');
  });
  await check('small-club-pennies', () => {
    const state = custom(); state.budget = 12.345;
    assert.equal(cm.clubDefFor(state.clubName).tier, 4, 'SHIRT_PRECONDITION_SMALL_TIER');
    const quote = fin.shirtSalesForWeek(state);
    assert.ok(quote.grossPence - quote.costPence < 1_000_000, 'SHIRT_PRECONDITION_SMALL_QUOTE');
    fin.tickBooks(state);
    assert.equal(state.budget, 12.345, 'SHIRT_NO_ZERO_PAYMENT_ROUNDING');
    assert.equal(ledger(state).paidPence, 0, 'SHIRT_SMALL_NOT_YET_PAID');
    assert.equal(fin.shirtPendingPence(ledger(state)), quote.grossPence - quote.costPence, 'SHIRT_SMALL_PRECISION');
  });
  await check('one-net-income-no-board-cost', () => {
    const state = fresh();
    fin.ensureBooks(state).season.shirts = { v: 1, weeks: 3, openingPence: 500_000, grossPence: 5_000_000, costPence: 2_000_000, paidPence: 3_000_000 };
    const zero = copy(state); fin.ensureBooks(zero).season.shirts = fin.emptyShirtSales();
    const p = fin.projectFinances(state), z = fin.projectFinances(zero);
    assert.equal(line(state).actual, 0.03, 'SHIRT_PAID_NET_ROW');
    assert.equal(line(state).kitty, true, 'SHIRT_PAID_ROW_KITTY');
    assert.deepEqual(p.spend, z.spend, 'SHIRT_PRODUCTION_NOT_BOARD_COST');
    assert.equal(Math.round((p.incomeActual - z.incomeActual) * 100), 3, 'SHIRT_NET_TOTAL_ONCE');
    assert.equal(Math.round((fin.closeLedger(state).income - fin.closeLedger(zero).income) * 100), 3, 'SHIRT_CLOSED_NET_ONCE');
    assert.equal(Math.round((hub.kittyChange(p).actual - hub.kittyChange(z).actual) * 100), 3, 'SHIRT_HUB_NET_ONCE');
  });
  await check('charged-weeks-projection', () => {
    const state = fresh();
    state.calendar = [{ type: 'window', round: 0 }, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 99999 } }, { type: 'window', round: 0 }];
    state.week = 1; fin.ensureBooks(state).season.shirts = fin.emptyShirtSales(999_999);
    const quote = fin.shirtSalesForWeek(state);
    const expected = Math.floor((999_999 + quote.grossPence - quote.costPence) / 1_000_000) / 100;
    assert.equal(line(state).projected, expected, 'SHIRT_PROJECTION_CHARGED_ONLY');
    state.week = state.calendar.length;
    assert.equal(line(state).projected, 0, 'SHIRT_PROJECTION_NO_REMAINING_WEEKS');
  });
  await check('unsafe-future-keeps-known-paid', () => {
    for (const retail of [
      { ...fin.emptyShirtSales(), weeks: 1, grossPence: 9_007_199_254_000_000, paidPence: 9_007_199_254_000_000 },
      { ...fin.emptyShirtSales(), weeks: Number.MAX_SAFE_INTEGER },
    ]) {
      const state = fresh(); state.calendar = [{ type: 'window', round: 0 }]; state.week = 0;
      fin.ensureBooks(state).season.shirts = retail;
      assert.ok(fin.readShirtSales(retail), 'SHIRT_PRECONDITION_EXTREME_VALID');
      assert.equal(line(state).projectionUnavailable, true, 'SHIRT_FORECAST_UNAVAILABLE');
      assert.equal(line(state).actual, retail.paidPence / 100_000_000, 'SHIRT_FORECAST_RETAINS_ACTUAL');
      assert.equal(line(state).projected, line(state).actual, 'SHIRT_FORECAST_NO_PROMISED_UNSAFE_CASH');
      state.week = state.calendar.length;
      assert.equal(line(state).projectionUnavailable, false, 'SHIRT_ZERO_WEEK_FORECAST_VALID');
    }
    const batch = fin.settleShirtSales(fin.emptyShirtSales(), { grossPence: 900_000, costPence: 400_000 }, 3);
    assert.equal(batch.ledger.weeks, 3, 'SHIRT_BATCH_WEEK_COUNT');
    assert.equal(batch.cashPence, 1_000_000, 'SHIRT_BATCH_CASH');
    assert.equal(fin.shirtPendingPence(batch.ledger), 500_000, 'SHIRT_BATCH_PENDING');
  });
  await check('actual-engine-window-cash', () => {
    const state = fresh();
    state.calendar.splice(state.week, 0, { type: 'window', round: 0 });
    const quote = fin.shirtSalesForWeek(state), before = JSON.stringify(state), budget = state.budget;
    const expected = fin.settleShirtSales(fin.emptyShirtSales(), quote);
    assert.ok(expected.cashPence > 0 && expected.cashPence < quote.grossPence, 'SHIRT_PRECONDITION_NET_PAYMENT');
    const result = cm.playNextEntry(state, { skipHalftime: true, noCoach: true, untilWeek: state.week + 1 });
    assert.equal(result.kind, 'window', 'SHIRT_PRECONDITION_ACTUAL_WINDOW');
    assert.equal(result.state.budget, Math.round((budget + expected.cashPence / 100_000_000) * 100) / 100, 'SHIRT_ENGINE_WINDOW_CASH');
    assert.deepEqual(ledger(result.state), expected.ledger, 'SHIRT_ENGINE_WINDOW_LEDGER');
    assert.equal(JSON.stringify(state), before, 'SHIRT_ENGINE_INPUT_PURE');
  });
  await check('actual-skipped-night', () => {
    const state = fresh();
    state.calendar.splice(state.week, 0, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 99999 } });
    const before = JSON.stringify(state), old = copy(ledger(state));
    const result = cm.playNextEntry(state, { skipHalftime: true, noCoach: true, untilWeek: state.week + 1 });
    assert.equal(result.state.week, state.week + 1, 'SHIRT_PRECONDITION_NIGHT_ADVANCED');
    assert.deepEqual(ledger(result.state), old, 'SHIRT_NIGHT_NO_RETAIL');
    assert.equal(fin.booksOf(result.state).season.weeks, fin.booksOf(state).season.weeks, 'SHIRT_NIGHT_NO_CHARGE');
    assert.equal(JSON.stringify(state), before, 'SHIRT_NIGHT_INPUT_PURE');
  });
  await check('save-load-and-pure-reads', () => {
    const state = fresh(); fin.ensureBooks(state).season.shirts = { ...fin.emptyShirtSales(765_432), weeks: 2 };
    store.clear();
    assert.equal(cm.saveCareer(state), true, 'SHIRT_PRECONDITION_SAVE_WRITTEN');
    const stored = store.get(cm.SAVE_KEY), loaded = cm.loadCareer();
    assert.ok(loaded, 'SHIRT_PRECONDITION_SAVE_LOADED');
    assert.deepEqual(ledger(loaded), ledger(state), 'SHIRT_SAVE_PENCE_PRESERVED');
    assert.equal(loaded.budget, state.budget, 'SHIRT_LOAD_NO_PAYMENT');
    const bytes = JSON.stringify(loaded);
    fin.projectFinances(loaded); fin.closeLedger(loaded); fin.shirtSalesForWeek(loaded);
    assert.equal(JSON.stringify(loaded), bytes, 'SHIRT_READS_PURE');
    assert.equal(store.get(cm.SAVE_KEY), stored, 'SHIRT_READS_DONT_SAVE');
  });
  await check('same-club-carry-and-moves', () => {
    const state = fresh();
    fin.ensureBooks(state).season.shirts = { v: 1, weeks: 3, openingPence: 500_000, grossPence: 5_000_000, costPence: 2_000_000, paidPence: 3_000_000 };
    const before = JSON.stringify(state), next = copy(state), budget = next.budget;
    fin.rolloverBooks(next, state, false);
    assert.deepEqual(ledger(next), fin.emptyShirtSales(500_000), 'SHIRT_SAME_CLUB_CARRY');
    assert.equal(next.budget, budget, 'SHIRT_SUMMER_NO_PAYMENT');
    assert.deepEqual(fin.booksOf(next).lastSeason.shirts, ledger(state), 'SHIRT_CLOSED_BREAKDOWN');
    const moved = copy(state); fin.rolloverBooks(moved, state, true);
    assert.deepEqual(ledger(moved), fin.emptyShirtSales(), 'SHIRT_MOVE_NO_OLD_PENDING');
    assert.equal(JSON.stringify(state), before, 'SHIRT_ROLLOVER_INPUT_PURE');
    const broken = copy(state); fin.ensureBooks(broken).season.shirts = null;
    fin.rolloverBooks(next, broken, false);
    assert.equal(fin.booksOf(next).lastSeason.shirts, null, 'SHIRT_CLOSED_UNAVAILABLE_RETAINED');
    assert.deepEqual(ledger(next), fin.emptyShirtSales(), 'SHIRT_NEW_SEASON_RECOVERS');
    // Explicit completed-calendar fixture, not a naturally played full season.
    state.week = state.calendar.length;
    const finished = cm.finishSeason(state).state;
    const summer = cm.startNextSeason(finished);
    assert.deepEqual(ledger(summer), fin.emptyShirtSales(500_000), 'SHIRT_ACTUAL_SUMMER_CARRY');
    const newJob = cm.startNextSeason(finished, 'Arsenal');
    assert.equal(newJob.clubName, 'Arsenal', 'SHIRT_PRECONDITION_JOB_MOVED');
    assert.deepEqual(ledger(newJob), fin.emptyShirtSales(), 'SHIRT_ACTUAL_NEW_JOB_ZERO');
  });
  await check('no-passive-time-or-random-income', () => {
    const state = fresh(), before = JSON.stringify(state);
    const waiting = cm.wildernessWeek({ ...state, sacked: true }, () => 0.6);
    assert.deepEqual(ledger(waiting), ledger(state), 'SHIRT_WAITING_NO_ACCRUAL');
    const retired = retire.retireCareer(state);
    assert.ok(retired, 'SHIRT_PRECONDITION_RETIRED');
    assert.deepEqual(ledger(retired), ledger(state), 'SHIRT_RETIRED_NO_ACCRUAL');
    const random = Math.random, now = Date.now;
    Math.random = () => { throw new Error('SHIRT_UNEXPECTED_RANDOM'); };
    Date.now = () => { throw new Error('SHIRT_UNEXPECTED_CLOCK'); };
    try { fin.shirtSalesForWeek(state); fin.projectFinances(state); fin.closeLedger(state); }
    finally { Math.random = random; Date.now = now; }
    assert.equal(JSON.stringify(state), before, 'SHIRT_NO_TIME_READ_MUTATION');
  });
  await check('real-charged-prefixes', async () => {
    for (const kind of ['modern', 'historical', 'custom']) for (const seed of [0, 8]) {
      await seeded(seed, () => {
        let state = kind === 'historical' ? cm.startCareer('AC Milan', 'era2005') : kind === 'custom' ? custom() : fresh();
        const run = { kind, seed, plannedChargedWeeks: 12, chargedWeeks: 0, entries: 0, immutabilityChecks: 0 };
        const bound = state.calendar.length + 1;
        for (let step = 0; step < bound && run.chargedWeeks < 12; step += 1) {
          deadline();
          assert.ok(!state.sacked && state.week < state.calendar.length, 'SHIRT_PREFIX_EARLY_STOP');
          const before = JSON.stringify(state), old = copy(ledger(state)), charged = fin.booksOf(state).season.weeks;
          const result = cm.playNextEntry(state, { skipHalftime: true, noCoach: true, untilWeek: state.week + 1 });
          assert.ok(result.state.week > state.week, 'SHIRT_PREFIX_PROGRESS');
          assert.equal(JSON.stringify(state), before, 'SHIRT_PREFIX_INPUT_PURE');
          run.immutabilityChecks += 1;
          state = result.state;
          const delta = fin.booksOf(state).season.weeks - charged, sales = ledger(state);
          assert.ok(delta === 0 || delta === 1, 'SHIRT_PREFIX_CHARGE_DOMAIN');
          assert.equal(sales.weeks - old.weeks, delta, 'SHIRT_PREFIX_RETAIL_MATCHES_CHARGES');
          assert.equal(sales.openingPence + sales.grossPence - sales.costPence, sales.paidPence + fin.shirtPendingPence(sales), 'SHIRT_PREFIX_PENNY_IDENTITY');
          assert.equal(sales.paidPence % 1_000_000, 0, 'SHIRT_PREFIX_PAID_QUANTUM');
          assert.ok(fin.shirtPendingPence(sales) >= 0 && fin.shirtPendingPence(sales) < 1_000_000, 'SHIRT_PREFIX_PENDING_RANGE');
          run.entries += 1; run.chargedWeeks += delta;
        }
        assert.equal(run.chargedWeeks, 12, 'SHIRT_PREFIX_COVERAGE');
        run.ledger = copy(ledger(state)); report.prefixes.push(run);
      });
    }
    assert.equal(report.prefixes.length, 6, 'SHIRT_PREFIX_PLANNED_COUNT');
    assert.equal(report.prefixes.reduce((n, run) => n + run.chargedWeeks, 0), 72, 'SHIRT_PREFIX_TOTAL_WEEKS');
  });
  deadline();
  assert.equal(report.cases.length, report.plannedCases, 'SHIRT_SETUP_CASE_COVERAGE');
  assert.equal(report.networkAttempts, 0, 'SHIRT_SETUP_NETWORK_ATTEMPTS');
  if (CONTROL) {
    report.fault.detected = report.cases.some(row => row.status === 'failed' && row.error.includes(FAULTS[CONTROL].marker));
    assert.equal(report.fault.detected, true, 'SHIRT_CONTROL_MISSED_INTENDED_ASSERTION');
  }
  report.status = report.cases.every(row => row.status === 'passed') ? 'passed' : 'failed';
} catch (error) {
  report.status = 'failed'; report.errors.push(String(error?.stack || error));
  console.error(report.errors.at(-1));
} finally {
  Math.random = originalRandom; Date.now = originalNow; globalThis.fetch = originalFetch;
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage;
  report.source.after = held();
  report.source.unchanged = HELD.every(file => report.source.before[file] === report.source.after[file]);
  if (!report.source.unchanged) { report.status = 'failed'; report.errors.push('SHIRT_SOURCE_HOLD_CHANGED'); }
  report.observedCases = report.cases.length;
  report.passedCases = report.cases.filter(row => row.status === 'passed').length;
  report.failedCases = report.cases.filter(row => row.status === 'failed').length;
  report.randomRestored = Math.random === originalRandom; report.clockRestored = Date.now === originalNow;
  report.elapsedSeconds = (performance.now() - START) / 1000;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`CM_SHIRTS_RESULT status=${report.status} cases=${report.observedCases}/${report.plannedCases} passed=${report.passedCases} failed=${report.failedCases} prefixes=${report.prefixes.length}/6 chargedWeeks=${report.prefixes.reduce((n, run) => n + run.chargedWeeks, 0)}/72 sourceHold=${report.source.unchanged} network=${report.networkAttempts}`);
}
if (report.status !== 'passed') process.exitCode = 1;
