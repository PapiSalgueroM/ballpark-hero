import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// This file is authored locally and executed only by the remote workflow.
const clone = value => JSON.parse(JSON.stringify(value));
export const CHECK = {
  terms: 'Preview terms equal actual signing',
  current: 'Current contract remains the existing contract',
  unavailable: 'Unavailable current contracts are not stay options',
  delta: 'Wage difference compares signed and existing pay',
  depth: 'Squad comparison uses actual club season data',
  input: 'Review leaves both inputs unchanged',
  rng: 'Review consumes no simulation randomness',
  storage: 'Review performs no persistence',
  signing: 'Review leaves the complete signing outcome unchanged',
};
const control = (name, assertion, from, to) => ({ name, assertion, file: 'src/lib/soccerOfferReview.ts', from, to });
export const SOCCER_OFFER_REVIEW_CONTROLS = [
  control('wage', CHECK.terms, 'offer.wage * agentWageMult(career.agentId)', 'offer.wage'),
  control('rounding', CHECK.terms, 'Math.round(offer.wage * agentWageMult(career.agentId))', 'Math.floor(offer.wage * agentWageMult(career.agentId))'),
  control('years', CHECK.terms, 'years: offer.contractYears,', 'years: offer.contractYears + 1,'),
  control('currentWage', CHECK.current, 'wage: career.weeklyWage,', 'wage: Math.round(career.weeklyWage * agentWageMult(career.agentId)),'),
  control('currentYears', CHECK.current, 'years: career.contractYearsLeft,', 'years: offer.contractYears,'),
  control('loanParent', CHECK.current, 'club: career.loan?.parentClub ?? career.currentClub,', 'club: career.currentClub,'),
  control('first', CHECK.unavailable, "const firstContract = career.phase === 'contract_offer';", 'const firstContract = false;'),
  control('released', CHECK.unavailable, "const released = career.transferSituation?.type === 'frozen_out' && career.transferSituation.mode === 'released';", 'const released = false;'),
  control('expired', CHECK.unavailable, 'career.contractYearsLeft <= 0', 'career.contractYearsLeft < 0'),
  control('delta', CHECK.delta, 'signedWage - current.wage', 'current.wage - signedWage'),
  control('season', CHECK.depth, 'const season = nextSeasonYear(career);', 'const season = nextSeasonYear(career) - 1;'),
  control('rank', CHECK.depth, 'rank: chart.ahead + 1', 'rank: chart.ahead'),
  control('total', CHECK.depth, 'total: chart.men.length', 'total: chart.men.length - 1'),
  control('missing', CHECK.depth, 'group: GROUP_LABEL[chart.group] } : null,', "group: GROUP_LABEL[chart.group] } : { rank: 1, total: 1, group: 'attackers' },"),
  control('careerInput', CHECK.input, '  const signedWage =', '  career.weeklyWage += 1;\n  const signedWage ='),
  control('offerInput', CHECK.input, '  const signedWage =', '  offer.wage += 1;\n  const signedWage ='),
  control('rng', CHECK.rng, '  const signedWage =', '  Math.random();\n  const signedWage ='),
  control('storage', CHECK.storage, '  const signedWage =', "  localStorage.setItem('soccerCareerSave', JSON.stringify(career));\n  const signedWage ="),
  control('signing', CHECK.signing, '  const signedWage =', "  career.events.push('Review changed the career');\n  const signedWage ="),
];

/** Actual engine creation/generation first; every later planted field is labeled. */
export function makeSoccerOfferFixtures({ E, D, reset }) {
  const fixtures = [], origins = [];
  const add = (id, career, offer, currentKind, planted = []) => {
    assert.ok(offer && !offer.isLoan, `Fixture ${id} must be a permanent offer`);
    fixtures.push({ id, career: clone(career), offer: clone(offer), currentKind, planted });
  };
  for (const [index, position, year, era] of [[0, 'ST', 2020, '2020-24'], [1, 'GK', 2000, '2000-04'], [2, 'CM', 2025, '2025']]) {
    reset(108200 + index);
    const stats = { pace: 72, shooting: 72, passing: 72, dribbling: 72, defending: 72, physical: 72, reflexes: 72 };
    const created = E.initCareer(`Offer Review ${position}`, 'England', position, era, stats, 72, year, E.FALLBACK_CLUBS, null, 88);
    const career = E.advanceYouthYear(clone(created), E.FALLBACK_CLUBS);
    assert.equal(career.phase, 'contract_offer', 'Actual youth generation must reach its first contract');
    assert.ok(career.pendingOffers.length > 0, 'Actual youth generation must produce offers');
    origins.push({ position, created: clone(created), generated: clone(career) });
    career.pendingOffers.forEach((offer, i) => add(`generated-${position}-${i}`, career, offer, 'first'));
  }
  const first = clone(origins[0].generated), generatedOffer = clone(first.pendingOffers[0]);
  const base = E.acceptOffer({ ...clone(first), agentId: 'self' }, generatedOffer);
  base.phase = 'transfer_window';
  const offer = { ...clone(generatedOffer), wage: 10003, contractYears: 5, transferFee: 12.34, isHomegrown: false };
  for (const agent of ['cousin', 'shark', 'super', 'self', null, undefined, 'legacy-unknown']) {
    const career = { ...clone(base), agentId: agent, weeklyWage: 9001, contractYearsLeft: 2 };
    if (agent === undefined) delete career.agentId;
    add(`agent-${String(agent)}`, career, offer, 'active', ['agentId', 'weeklyWage=9001', 'contractYearsLeft=2', 'offer.wage=10003', 'offer.years=5', 'offer.fee=12.34']);
  }
  for (const [id, wage] of [['raise', 10004], ['equal', 10003], ['paycut', 10002]]) {
    add(id, { ...clone(base), agentId: 'self', weeklyWage: 10003, contractYearsLeft: 2 }, { ...offer, wage, transferFee: 0 }, 'active', ['self-represented current wage 10003', `offer.wage=${wage}`, 'zero transfer fee']);
  }
  add('released', { ...clone(base), transferSituation: { type: 'frozen_out', mode: 'released', reasons: ['Explicit release fixture'], offers: [offer] } }, { ...offer, transferFee: 0 }, 'released', ['released verdict; old wage and years deliberately retained', 'free transfer']);
  add('expired', { ...clone(base), contractYearsLeft: 0 }, offer, 'expired', ['expired contract; old wage deliberately retained']);
  const legacyFirst = clone(first);
  legacyFirst.seasons.push({ ...clone(first.seasons.at(-1)), type: 'playing' });
  add('first-stale-history', legacyFirst, offer, 'first', ['stale legacy playing row planted; contract_offer phase remains authoritative']);
  const loanClub = E.FALLBACK_CLUBS.find(c => c.name !== base.currentClub);
  assert.ok(loanClub, 'Actual club pool must contain a loan destination');
  const onLoan = E.acceptLoan(clone(base), { club: clone(loanClub), contractYears: 1, wage: base.weeklyWage, transferFee: 0, isLoan: true });
  add('active-loan-contract', onLoan, offer, 'active', ['actual acceptLoan from an explicitly staged valid loan offer; permanent offer reviewed against parent contract']);
  const knownClub = E.FALLBACK_CLUBS.find(c => D.depthChart(c.name, 2024, base.position, base.overall, base.playerName));
  assert.ok(knownClub, 'Known baked squad fixture must exist');
  const known = clone(base);
  known.seasons.at(-1).year = 2023;
  add('known-depth', known, { ...offer, club: clone(knownClub) }, 'active', ['existing pool club selected by actual depthChart', 'last recorded year=2023']);
  const missing = clone(known); missing.seasons.at(-1).year = 2098;
  add('missing-depth', missing, { ...offer, club: clone(knownClub) }, 'active', ['same actual club; explicitly out-of-window future season 2099']);
  return { fixtures, origins, acceptedBase: clone(base) };
}

export function runSoccerOfferReviewOutcomes({ E, R, D, fixtures, reset, snapshot, storageSnapshot, only = null }) {
  const checks = [], records = [];
  const equal = (actual, expected, name, record) => {
    records.push({ ...record, actual: clone(actual), expected: clone(expected) });
    assert.deepEqual(actual, expected, name);
  };
  const check = (name, fn) => {
    if (only && only !== name) return;
    const start = records.length;
    try { fn(); checks.push({ name, status: 'passed', records: records.length - start }); }
    catch (error) {
      if (error.name !== 'AssertionError') throw error;
      checks.push({ name, status: 'assertion-failed', records: records.length - start, errorName: error.name, error: error.message, stack: error.stack });
    }
  };
  const observe = (fixture, index) => {
    reset(910000 + index);
    const career = clone(fixture.career), offer = clone(fixture.offer);
    const before = { career: clone(career), offer: clone(offer) }, rngBefore = snapshot(), storageBefore = storageSnapshot();
    const review = R.buildSoccerOfferReview(career, offer);
    const observation = { id: fixture.id, planted: fixture.planted, before, inputAfter: { career: clone(career), offer: clone(offer) }, review: clone(review), rngBefore, rngAfter: snapshot(), storageBefore, storageAfter: storageSnapshot() };
    return { career, offer, review, observation };
  };
  const currentOf = fixture => fixture.currentKind === 'active' ? {
    club: fixture.career.loan?.parentClub ?? fixture.career.currentClub,
    wage: fixture.career.weeklyWage, years: fixture.career.contractYearsLeft,
  } : null;
  const actualSigning = fixture => {
    reset(710000);
    const before = { career: clone(fixture.career), offer: clone(fixture.offer) }, input = clone(before), rngBefore = snapshot();
    const after = E.acceptOffer(input.career, input.offer);
    return { before, inputAfter: clone(input), after: clone(after), rngBefore, rngAfter: snapshot() };
  };
  check(CHECK.terms, () => fixtures.forEach((fixture, index) => {
    const signed = actualSigning(fixture), { review, observation } = observe(fixture, index);
    equal({ wage: review.signedWage, years: review.years }, { wage: signed.after.weeklyWage, years: signed.after.contractYearsLeft }, CHECK.terms, { ...observation, signing: signed });
  }));
  check(CHECK.current, () => fixtures.filter(f => f.currentKind === 'active').forEach((fixture, index) => {
    const { review, observation } = observe(fixture, index);
    equal(review.current, currentOf(fixture), CHECK.current, observation);
    equal(review.currentReason, null, CHECK.current, observation);
  }));
  check(CHECK.unavailable, () => fixtures.filter(f => f.currentKind !== 'active').forEach((fixture, index) => {
    const { review, observation } = observe(fixture, index);
    const reason = { first: 'First senior contract. No current senior deal to compare.', released: 'Released. Your previous club is not an option to stay.', expired: 'Your previous contract has expired.' }[fixture.currentKind];
    equal({ current: review.current, delta: review.wageDelta, reason: review.currentReason }, { current: null, delta: null, reason }, CHECK.unavailable, observation);
  }));
  check(CHECK.delta, () => fixtures.forEach((fixture, index) => {
    const signed = actualSigning(fixture), { review, observation } = observe(fixture, index);
    equal(review.wageDelta, fixture.currentKind === 'active' ? signed.after.weeklyWage - fixture.career.weeklyWage : null, CHECK.delta, { ...observation, signing: signed });
  }));
  check(CHECK.depth, () => fixtures.forEach((fixture, index) => {
    const season = E.nextSeasonYear(fixture.career);
    const chart = D.depthChart(fixture.offer.club.name, season, fixture.career.position, fixture.career.overall, fixture.career.playerName);
    const expected = { season, depth: chart ? { rank: chart.ahead + 1, total: chart.men.length, group: D.GROUP_LABEL[chart.group] } : null };
    const { review, observation } = observe(fixture, index);
    equal({ season: review.season, depth: review.depth }, expected, CHECK.depth, { ...observation, originalChart: clone(chart) });
  }));
  check(CHECK.input, () => fixtures.forEach((fixture, index) => {
    const { observation } = observe(fixture, index);
    equal(observation.inputAfter, observation.before, CHECK.input, observation);
  }));
  check(CHECK.rng, () => fixtures.forEach((fixture, index) => {
    const { observation } = observe(fixture, index);
    equal(observation.rngAfter, observation.rngBefore, CHECK.rng, observation);
  }));
  check(CHECK.storage, () => fixtures.forEach((fixture, index) => {
    const { observation } = observe(fixture, index);
    equal(observation.storageAfter, observation.storageBefore, CHECK.storage, observation);
  }));
  check(CHECK.signing, () => fixtures.forEach((fixture, index) => {
    reset(910000 + index);
    const directInput = { career: clone(fixture.career), offer: clone(fixture.offer) };
    const directRngBefore = snapshot(), expected = E.acceptOffer(directInput.career, directInput.offer), directRngAfter = snapshot();
    const { career, offer, observation } = observe(fixture, index);
    const actual = E.acceptOffer(career, offer);
    equal({ career: actual, rng: snapshot() }, { career: expected, rng: directRngAfter }, CHECK.signing, { ...observation, directInput, directRngBefore, directRngAfter, signedActual: clone(actual), signedExpected: clone(expected) });
  }));

  // This oracle never imports or calls the copied review module.
  reset(810800);
  const fixture = fixtures.find(f => f.id === 'equal');
  assert.ok(fixture, 'Independent baseline needs its explicit self-represented contract');
  const before = { career: clone(fixture.career), offer: clone(fixture.offer) }, input = clone(before), rngBefore = snapshot();
  const after = E.acceptOffer(input.career, input.offer), rngAfter = snapshot();
  const baseline = { name: 'Unchanged self-represented signing baseline', before, inputAfter: clone(input), after: clone(after), rngBefore, rngAfter, passed: false };
  assert.deepEqual(input, before, baseline.name);
  assert.deepEqual(rngAfter, rngBefore, baseline.name);
  assert.equal(after.weeklyWage, before.offer.wage, baseline.name);
  assert.equal(after.contractYearsLeft, before.offer.contractYears, baseline.name);
  assert.equal(after.currentClub, before.offer.club.name, baseline.name);
  assert.equal(after.phase, 'playing', baseline.name);
  assert.deepEqual(after.pendingOffers, [], baseline.name);
  assert.deepEqual(after.money, before.career.money, baseline.name);
  assert.equal(after.netWorth, before.career.netWorth, baseline.name);
  baseline.passed = true;
  return { complete: true, checks, records, baseline };
}

function installRuntime() {
  const NativeDate = Date, fixed = Date.UTC(2026, 9, 7, 12);
  globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
  let state = 1082, draws = 0;
  const next = value => {
    let x = value >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0;
  };
  const reset = seed => { state = seed >>> 0 || 1; draws = 0; };
  Math.random = () => { state = next(state); draws++; return state / 4294967296; };
  const snapshot = () => { let held = state; return { state, draws, next: Array.from({ length: 8 }, () => { held = next(held); return held / 4294967296; }) }; };
  const values = new Map([['protected-save', 'unchanged']]), writes = [], networkAttempts = [];
  globalThis.localStorage = {
    getItem: key => values.get(String(key)) ?? null,
    setItem: (key, value) => { writes.push({ method: 'setItem', key: String(key), value: String(value) }); values.set(String(key), String(value)); },
    removeItem: key => { writes.push({ method: 'removeItem', key: String(key) }); values.delete(String(key)); },
    clear: () => { writes.push({ method: 'clear' }); values.clear(); },
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.fetch = async input => { networkAttempts.push(String(input)); throw new Error('No network is permitted in offer review outcomes'); };
  return { reset, snapshot, storageSnapshot: () => ({ values: Object.fromEntries(values), writes: clone(writes) }), networkAttempts };
}

async function worker(bundleFile, outputFile, only) {
  assert.ok(process.env.CI, 'Soccer offer review outcome workers run only in remote CI');
  const runtime = installRuntime();
  let result;
  try {
    const importRngBefore = runtime.snapshot();
    const { E, R, D } = await import(pathToFileURL(path.resolve(bundleFile)).href);
    const importRngAfter = runtime.snapshot();
    const fixtureSet = makeSoccerOfferFixtures({ E, D, reset: runtime.reset });
    result = { ...runSoccerOfferReviewOutcomes({ E, R, D, ...runtime, fixtures: fixtureSet.fixtures, only: only || null }), fixtureSet, importRngBefore, importRngAfter, networkAttempts: runtime.networkAttempts };
  } catch (error) {
    result = { complete: false, runtimeFailure: { name: error.name, message: error.message, stack: error.stack }, networkAttempts: runtime.networkAttempts };
    process.exitCode = 2;
  }
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ complete: result.complete, checks: result.checks?.map(c => ({ name: c.name, status: c.status, records: c.records })), records: result.records?.length, baseline: result.baseline?.passed, failure: result.runtimeFailure }));
}
if (process.argv[2] === '--worker') await worker(process.argv[3], process.argv[4], process.argv[5]);
