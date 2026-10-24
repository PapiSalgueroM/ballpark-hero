import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, CMPlayer } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type ReviewCarrier = CareerState & { veteranReviews?: unknown };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const raw = (career: CareerState) => (career as ReviewCarrier).veteranReviews;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks(); vi.useRealTimers();
  localStorage.clear(); sessionStorage.clear();
});

async function fresh(age = 41, contractYears = 4) {
  vi.restoreAllMocks(); vi.resetModules();
  let seed = 1457101;
  const draws: number[] = [];
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    draws.push(value); return value;
  });
  // Seed starts before the actual module graph and factory, including its counters.
  const E = await import('@/lib/clubManager');
  const A = await import('@/lib/clubManagerEras');
  const R = await import('@/lib/clubManagerVeteranRetirement');
  const L = await import('@/lib/clubManagerVeteranLedger');
  const { saveFence } = await import('@/lib/saveFence');
  saveFence.release(E.SAVE_KEY);
  const base = E.startCareer('Everton');
  const donor = base.squad.find(p => !p.onLoan);
  if (!donor) throw new Error('CM_VETERAN_FIXTURE: actual owned donor missing');
  // Explicitly fictional policy fixture, not a claim about the donor or real players.
  const veteran: CMPlayer = {
    ...donor, id: 'fictional-review-veteran', name: 'Fictional Review Veteran', generated: true,
    worldRosterKey: undefined, worldRosterSince: undefined,
    age, position: 'GK', rating: 40, potential: 40, value: 0.2,
    contractYears, wage: 3, role: 'rotation', lastTen: [1, 0, 1, 0],
    wantsOut: false, onLoan: undefined, injuryWeeks: 0, suspendedMatches: 0,
    isYouth: false, academyGrad: false,
  };
  const initialCareer: CareerState = {
    ...base, budget: 500, live: null, pendingMove: null,
    squad: base.squad.map(p => p.id === donor.id ? veteran : p),
  };
  const career = review(E, initialCareer);
  function reset(nextSeed = 1457201) { seed = nextSeed; draws.length = 0; }
  return { E, A, R, L, saveFence, initialCareer, career, veteran, draws, reset };
}
type Graph = Awaited<ReturnType<typeof fresh>>;
function own(career: CareerState, player: CMPlayer): CareerState {
  return { ...career, squad: career.squad.map(p => p.id === player.id ? player : p) };
}
function review(E: Engine, career: CareerState): CareerState {
  // Synthetic completed-calendar input, followed by the real summary operation.
  // This does not represent playing a full season or invent summary fields.
  const input = { ...career, live: null, week: career.calendar.length, pendingSummary: null };
  const result = E.finishSeason(input);
  expect(result.state.pendingSummary, 'CM_VETERAN_ACTUAL_REVIEW_FOUNDATION').toEqual(result.summary);
  expect(result.summary.season, 'CM_VETERAN_CURRENT_REVIEW_SEASON_FOUNDATION').toBe(result.state.season);
  expect(result.summary.club, 'CM_VETERAN_CURRENT_REVIEW_CLUB_FOUNDATION').toBe(result.state.clubName);
  expect(result.state.week, 'CM_VETERAN_COMPLETED_CALENDAR_FOUNDATION').toBe(result.state.calendar.length);
  return result.state;
}
function actualLive(g: Graph) {
  let current = clone(g.initialCareer);
  for (let i = 0; i < 24; i++) {
    const result = g.E.playNextEntry(current, { noCoach: true });
    current = result.state;
    if (result.kind === 'halftime' && current.live) return current.live;
  }
  throw new Error('CM_VETERAN_FIXTURE: bounded real advance found no live match');
}
function identity(E: Engine, career: CareerState, player: CMPlayer) {
  if (!career.eraId) throw new Error('CM_VETERAN_FIXTURE: factory era missing');
  return [career.eraId, player.name, E.worldYear(career) - player.age];
}
function offer(g: Graph, career = g.career, playerId = g.veteran.id) {
  const result = g.R.previewVeteranRetirement(career, playerId);
  expect(result.kind, 'CM_VETERAN_REAL_OFFER_FOUNDATION').toBe('offer');
  if (result.kind !== 'offer') throw new Error('CM_VETERAN_FIXTURE: expected a review offer');
  return result;
}
function agreed(g: Graph, career = g.career, playerId = g.veteran.id) {
  expect(offer(g, career, playerId).decision, 'CM_VETERAN_AGREEMENT_FOUNDATION').toBe('agreed');
  const next = g.R.applyVeteranRetirement(career, playerId);
  expect(next, 'CM_VETERAN_REAL_APPLY_FOUNDATION').not.toBeNull();
  if (!next) throw new Error('CM_VETERAN_FIXTURE: actual agreement refused');
  return next;
}
function watchRetirement(g: Graph) {
  const actual = g.A.retireChance;
  const visits: { age: number; rating: number; position: string; draw: number }[] = [];
  vi.spyOn(g.A, 'retireChance').mockImplementation((age, rating, position) => {
    visits.push({ age, rating, position, draw: g.draws.length });
    return actual(age, rating, position);
  });
  return visits;
}
function targetVisit(visits: ReturnType<typeof watchRetirement>) {
  const target = visits.filter(row => row.age === 42 && row.rating === 40 && row.position === 'GK');
  expect(target.length, 'CM_VETERAN_UNIQUE_OLD_RETIREMENT_DRAW_FOUNDATION').toBe(1);
  return target[0];
}

describe('Club Manager one protected veteran summer', { timeout: 120000 }, () => {
  it('keeps the actual age42 veteran for one summer, consumes his old draw, then retires him at43', async () => {
    const ordinary = await fresh();
    expect(ordinary.A.retireChance(42, 40, 'GK'), 'CM_VETERAN_CERTAIN_OLD_RETIREMENT_FOUNDATION').toBe(1);
    const oldVisits = watchRetirement(ordinary);
    ordinary.reset();
    const oldNext = ordinary.E.startNextSeason(ordinary.career);
    expect(oldNext.squad.some(p => p.id === ordinary.veteran.id),
      'CM_VETERAN_UNASKED_42_RETIRES').toBe(false);
    expect(oldNext.retiredLastSummer?.some(p => p.name === ordinary.veteran.name)).toBe(true);
    const oldDraw = targetVisit(oldVisits).draw;

    const protectedGraph = await fresh();
    const input = JSON.stringify(protectedGraph.career);
    protectedGraph.reset();
    const reviewed = agreed(protectedGraph);
    expect(protectedGraph.draws, 'CM_VETERAN_REVIEW_NO_RANDOM_DRAW').toEqual([]);
    expect(JSON.stringify(protectedGraph.career)).toBe(input);
    const visits = watchRetirement(protectedGraph);
    protectedGraph.reset();
    const next = protectedGraph.E.startNextSeason(reviewed);
    const kept = next.squad.find(p => p.id === protectedGraph.veteran.id);
    expect(kept?.age, 'CM_VETERAN_AGREED_42_STAYS').toBe(42);
    expect(kept?.rating).toBe(40);
    expect(kept?.contractYears).toBe(3);
    expect(next.retiredLastSummer?.some(p => p.name === protectedGraph.veteran.name)).toBe(false);
    expect(targetVisit(visits).draw, 'CM_VETERAN_OLD_RETIREMENT_DRAW_CONSUMED').toBe(oldDraw);
    expect(raw(next)).toEqual(raw(reviewed));
    const seasonAfter = protectedGraph.E.startNextSeason(next);
    expect(seasonAfter.squad.some(p => p.id === protectedGraph.veteran.id),
      'CM_VETERAN_NEXT_43_NORMAL_RETIREMENT').toBe(false);
    expect(seasonAfter.retiredLastSummer?.some(p => p.name === protectedGraph.veteran.name)).toBe(true);
    expect(raw(seasonAfter), 'CM_VETERAN_AGREED_HISTORY_PERMANENT').toEqual(raw(reviewed));
  });

  it('uses the actual plain renewal once and retains its fee, wage, clause and role outcomes', async () => {
    const g = await fresh(38, 1);
    const player = { ...g.veteran, releaseClause: 7.5 };
    const career = own(g.career, player), before = JSON.stringify(career);
    const terms = g.E.renewalTerms(player);
    const expected = g.E.renewContract(career, player.id);
    expect(expected, 'CM_VETERAN_REAL_RENEWAL_FOUNDATION').not.toBeNull();
    if (!expected) throw new Error('CM_VETERAN_FIXTURE: affordable actual renewal missing');
    g.reset();
    const preview = offer(g, career);
    expect(preview.renewal, 'CM_VETERAN_ACTUAL_TERMS_DISPLAYED').toEqual(terms);
    expect(preview.role).toBe(g.E.roleOf(player));
    const next = agreed(g, career);
    const { veteranReviews: ignored, ...withoutReview } = next as ReviewCarrier;
    expect(JSON.stringify(withoutReview), 'CM_VETERAN_EXACT_REAL_RENEWAL_CANDIDATE').toBe(JSON.stringify(expected));
    expect(next.squad.find(p => p.id === player.id)?.releaseClause).toBeUndefined();
    expect(raw(next)).toEqual({ v: 1, reviews: [{
      identity: identity(g.E, career, player), club: career.clubName,
      season: career.season, decision: 'agreed',
    }] });
    expect(g.draws, 'CM_VETERAN_RENEWAL_NO_RANDOM_DRAW').toEqual([]);
    expect(g.R.applyVeteranRetirement(next, player.id), 'CM_VETERAN_NO_SECOND_RENEWAL').toBeNull();
    expect(JSON.stringify(career)).toBe(before);
    expect(ignored).toEqual(raw(next));
  });

  it('does not renew or charge a covered existing contract', async () => {
    const g = await fresh(35, 2), before = JSON.stringify(g.career);
    g.reset();
    expect(offer(g).renewal, 'CM_VETERAN_COVERED_TERMS_ARE_NULL').toBeNull();
    const next = agreed(g);
    const { veteranReviews: ignored, ...held } = next as ReviewCarrier;
    expect(JSON.stringify(held), 'CM_VETERAN_COVERED_CAREER_HELD').toBe(before);
    expect(next.budget).toBe(g.career.budget);
    expect(g.draws).toEqual([]);
    expect(ignored).toEqual(raw(next));
  });

  it.each(['wants-out', 'broken-promise'] as const)('records a deterministic %s decline without charging or renewing', async reason => {
    const g = await fresh(37, 1);
    const player: CMPlayer = reason === 'wants-out'
      ? { ...g.veteran, wantsOut: true }
      : { ...g.veteran, role: 'star', lastTen: Array(10).fill(0) };
    const career = own(g.career, player), before = JSON.stringify(career);
    if (reason === 'broken-promise') {
      expect(g.E.promiseMood(player).tone, 'CM_VETERAN_REAL_BAD_PROMISE_FOUNDATION').toBe('bad');
    }
    g.reset();
    const preview = offer(g, career);
    expect(preview.decision, 'CM_VETERAN_DETERMINISTIC_DECLINE').toBe('declined');
    expect(preview.renewal, 'CM_VETERAN_DECLINE_NO_RENEWAL').toBeNull();
    const next = g.R.applyVeteranRetirement(career, player.id);
    expect(next).not.toBeNull();
    if (!next) throw new Error('CM_VETERAN_FIXTURE: decline was not recorded');
    const { veteranReviews: ignored, ...held } = next as ReviewCarrier;
    expect(JSON.stringify(held), 'CM_VETERAN_DECLINE_NO_CHARGE_OR_ROLE_CHANGE').toBe(before);
    expect(raw(next)).toEqual({ v: 1, reviews: [{
      identity: identity(g.E, career, player), club: career.clubName,
      season: career.season, decision: 'declined',
    }] });
    expect(g.R.applyVeteranRetirement(next, player.id), 'CM_VETERAN_DECLINE_FINAL_THIS_SEASON').toBeNull();
    expect(g.draws).toEqual([]);
    expect(JSON.stringify(career)).toBe(before);
    expect(ignored).toEqual(raw(next));
  });

  it('allows a later-season review after decline but never another agreement for the same identity', async () => {
    const g = await fresh(35, 3);
    const wanting = own(g.career, { ...g.veteran, wantsOut: true });
    const declined = g.R.applyVeteranRetirement(wanting, g.veteran.id);
    expect(declined, 'CM_VETERAN_DECLINED_HISTORY_FOUNDATION').not.toBeNull();
    if (!declined) throw new Error('CM_VETERAN_FIXTURE: decline missing');
    // Explicit later-season input, with a real newly generated current review.
    // This does not claim an intervening season was played.
    const laterPlayer = { ...g.veteran, age: 36, wantsOut: false };
    const later = review(g.E, own({ ...declined, season: declined.season + 1 }, laterPlayer));
    const accepted = agreed(g, later);
    const reviews = raw(accepted);
    expect(reviews, 'CM_VETERAN_APPEND_ONLY_LATER_AGREEMENT').toEqual({
      v: 1, reviews: [
        { identity: identity(g.E, wanting, g.veteran), club: wanting.clubName, season: wanting.season, decision: 'declined' },
        { identity: identity(g.E, later, laterPlayer), club: later.clubName, season: later.season, decision: 'agreed' },
      ],
    });
    const another = review(g.E, own({ ...accepted, season: later.season + 1 }, { ...laterPlayer, age: 37, id: g.veteran.id }));
    expect(g.L.veteranReviewOpen(another), 'CM_VETERAN_SPENT_LATER_CURRENT_REVIEW_FOUNDATION').toBe(true);
    expect(identity(g.E, another, another.squad.find(p => p.id === g.veteran.id)!),
      'CM_VETERAN_SPENT_LATER_SAME_IDENTITY_FOUNDATION').toEqual(identity(g.E, later, laterPlayer));
    expect(g.R.previewVeteranRetirement(another, g.veteran.id).kind,
      'CM_VETERAN_ONE_AGREEMENT_PER_IDENTITY').toBe('blocked');
    expect(g.R.applyVeteranRetirement(another, g.veteran.id)).toBeNull();
    expect(raw(another)).toEqual(reviews);
  });

  it('refuses ambiguous current identities and does not protect two rows after an agreement', async () => {
    const g = await fresh(), reviewed = agreed(g);
    const duplicate = { ...g.veteran, id: 'fictional-review-duplicate' };
    const ambiguous = { ...g.career, squad: [...g.career.squad, duplicate] };
    const before = JSON.stringify(ambiguous);
    expect(g.R.previewVeteranRetirement(ambiguous, g.veteran.id).kind,
      'CM_VETERAN_DUPLICATE_IDENTITY_REFUSED').toBe('blocked');
    expect(g.R.applyVeteranRetirement(ambiguous, g.veteran.id)).toBeNull();
    expect(JSON.stringify(ambiguous)).toBe(before);
    const afterAgreement = { ...reviewed, squad: [...reviewed.squad, duplicate] };
    g.reset();
    const next = g.E.startNextSeason(afterAgreement);
    expect(next.squad.some(p => [g.veteran.id, duplicate.id].includes(p.id)),
      'CM_VETERAN_AMBIGUOUS_AGREEMENT_PROTECTS_NEITHER').toBe(false);
    expect(next.retiredLastSummer?.filter(p => p.name === duplicate.name)).toHaveLength(2);
    expect(raw(next), 'CM_VETERAN_AMBIGUOUS_HISTORY_HELD').toEqual(raw(reviewed));
  });

  it('protects the agreed veteran from ordinary surplus trimming as well as retirement and expiry', async () => {
    const g = await fresh(41, 1);
    const extras: CMPlayer[] = Array.from({ length: g.E.SQUAD_LIMIT + 2 }, (_, i) => ({
      ...g.veteran, id: 'fictional-surplus-' + i, name: 'Fictional Surplus ' + i,
      age: 24, rating: 70, potential: 70, position: 'CM',
      contractYears: 4, role: 'backup', lastTen: [], academyGrad: false,
    }));
    const crowded = { ...g.career, squad: [...g.career.squad, ...extras] };
    const reviewed = agreed(g, crowded);
    expect(reviewed.squad.length > g.E.SQUAD_LIMIT, 'CM_VETERAN_REAL_SURPLUS_FOUNDATION').toBe(true);
    g.reset();
    const next = g.E.startNextSeason(reviewed), kept = next.squad.find(p => p.id === g.veteran.id);
    expect(kept?.age, 'CM_VETERAN_PROTECTED_FROM_SURPLUS').toBe(42);
    expect(kept?.contractYears, 'CM_VETERAN_REAL_RENEWAL_PREVENTS_EXPIRY').toBe(1);
    expect(next.freeAgents?.some(p => p.name === g.veteran.name)).toBe(false);
    expect(next.squad.length < reviewed.squad.length, 'CM_VETERAN_OTHER_SURPLUS_ACTUALLY_REMOVED').toBe(true);
  });

  it.each([null, { v: 2, reviews: [], future: 'kept' }])('preserves unknown review data and keeps ordinary rollover available: %j', async value => {
    const g = await fresh();
    expect(offer(g).decision, 'CM_VETERAN_HEALTHY_BEFORE_UNKNOWN').toBe('agreed');
    const career: ReviewCarrier = { ...g.career, veteranReviews: value };
    const before = JSON.stringify(career);
    expect(g.R.previewVeteranRetirement(career, g.veteran.id).kind,
      'CM_VETERAN_UNKNOWN_LEDGER_BLOCKS_TALK').toBe('blocked');
    expect(g.R.applyVeteranRetirement(career, g.veteran.id)).toBeNull();
    expect(JSON.stringify(career)).toBe(before);
    g.reset();
    const next = g.E.startNextSeason(career);
    expect(next.squad.some(p => p.id === g.veteran.id), 'CM_VETERAN_UNKNOWN_LEDGER_NO_OVERRIDE').toBe(false);
    expect(raw(next), 'CM_VETERAN_UNKNOWN_RAW_ROLLOVER_HELD').toEqual(value);
  });

  it('blocks age, loan, absent and booked-job contexts without editing the player or ledger', async () => {
    const g = await fresh(35);
    expect(offer(g).decision).toBe('agreed');
    const loan = g.E.loanOutPlayer(g.initialCareer, g.veteran.id, 'Arsenal');
    expect(loan?.loanedOut?.some(row => row.player.id === g.veteran.id),
      'CM_VETERAN_ACTUAL_LOAN_OUT_FOUNDATION').toBe(true);
    if (!loan) throw new Error('CM_VETERAN_FIXTURE: actual loan out refused');
    const live = actualLive(g);
    const stale = g.career.pendingSummary;
    if (!stale) throw new Error('CM_VETERAN_FIXTURE: actual current review missing');
    const cases: [string, CareerState, string][] = [
      ['no-review', g.initialCareer, g.veteran.id],
      ['stale-season-review', { ...g.career, pendingSummary: { ...stale, season: stale.season + 1 } }, g.veteran.id],
      ['stale-club-review', { ...g.career, pendingSummary: { ...stale, club: 'Arsenal' } }, g.veteran.id],
      ['unfinished-calendar', { ...g.career, week: 0 }, g.veteran.id],
      ['live', { ...g.career, live }, g.veteran.id],
      ['young', own(g.career, { ...g.veteran, age: 30 }), g.veteran.id],
      ['old', own(g.career, { ...g.veteran, age: 42 }), g.veteran.id],
      ['loan-in', own(g.career, { ...g.veteran, onLoan: true }), g.veteran.id],
      ['loan-out', review(g.E, loan), g.veteran.id],
      ['absent', { ...g.career, squad: g.career.squad.filter(p => p.id !== g.veteran.id) }, g.veteran.id],
      ['job-booked', { ...g.career, pendingMove: { club: 'Arsenal', blurb: 'Fictional booked job fixture' } }, g.veteran.id],
    ];
    for (const [label, career, id] of cases) {
      const before = JSON.stringify(career);
      expect(g.R.previewVeteranRetirement(career, id).kind, 'CM_VETERAN_CONTEXT_REFUSED_' + label).toBe('blocked');
      expect(g.R.applyVeteranRetirement(career, id)).toBeNull();
      expect(JSON.stringify(career)).toBe(before);
    }
  });

  it('refuses an unaffordable needed renewal atomically after a real affordable positive witness', async () => {
    const g = await fresh(38, 1), terms = g.E.renewalTerms(g.veteran);
    expect(terms.fee > 0, 'CM_VETERAN_REAL_POSITIVE_RENEWAL_FEE').toBe(true);
    expect(offer(g).decision).toBe('agreed');
    const career = { ...g.career, budget: 0 }, before = JSON.stringify(career);
    expect(g.R.previewVeteranRetirement(career, g.veteran.id).kind,
      'CM_VETERAN_UNAFFORDABLE_REVIEW_REFUSED').toBe('blocked');
    expect(g.R.applyVeteranRetirement(career, g.veteran.id), 'CM_VETERAN_NO_PARTIAL_FEE_OR_REVIEW').toBeNull();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('keeps spent history across actual raw save/load and release, including a different later squad id', async () => {
    const g = await fresh(36, 4), reviewed = agreed(g);
    expect(g.E.saveCareer(reviewed), 'CM_VETERAN_REAL_SAVE_FOUNDATION').toBe(true);
    const saved = localStorage.getItem(g.E.SAVE_KEY);
    expect(saved).not.toBeNull();
    const loaded = g.E.loadCareer();
    expect(loaded, 'CM_VETERAN_REAL_LOAD_FOUNDATION').not.toBeNull();
    if (!loaded) throw new Error('CM_VETERAN_FIXTURE: actual load missing');
    expect(raw(loaded), 'CM_VETERAN_RAW_HISTORY_RELOAD').toEqual(raw(reviewed));
    const released = g.E.releasePlayer(loaded, g.veteran.id);
    expect(released, 'CM_VETERAN_REAL_RELEASE_FOUNDATION').not.toBeNull();
    if (!released) throw new Error('CM_VETERAN_FIXTURE: actual release refused');
    expect(raw(released), 'CM_VETERAN_RELEASE_CANNOT_REFUND_AGREEMENT').toEqual(raw(reviewed));
    // A fictional later roster fixture changes only the mutable squad id, not identity.
    const reappeared = { ...g.veteran, id: 'fictional-returning-id' };
    const career = { ...released, squad: [...released.squad, reappeared] };
    expect(g.R.previewVeteranRetirement(career, reappeared.id).kind,
      'CM_VETERAN_CHANGED_SQUAD_ID_STILL_SPENT').toBe('blocked');
    expect(g.R.applyVeteranRetirement(career, reappeared.id)).toBeNull();
    expect(raw(career)).toEqual(raw(reviewed));
    expect(localStorage.getItem(g.E.SAVE_KEY), 'CM_VETERAN_PURE_ACTIONS_DO_NOT_WRITE').toBe(saved);
  });

  it('refuses a retired-name ghost and never overrides its ordinary retirement draw', async () => {
    const g = await fresh();
    expect(offer(g).decision, 'CM_VETERAN_HEALTHY_BEFORE_RETIRED_NAME').toBe('agreed');
    const retiredNames = [...(g.career.retiredNames ?? []), g.veteran.name];
    const ghost = { ...g.career, retiredNames }, before = JSON.stringify(ghost);
    expect(ghost.squad.some(p => p.id === g.veteran.id),
      'CM_VETERAN_GHOST_STILL_PRESENT_FOUNDATION').toBe(true);
    expect(g.R.previewVeteranRetirement(ghost, g.veteran.id).kind,
      'CM_VETERAN_RETIRED_NAME_TALK_REFUSED').toBe('blocked');
    expect(g.R.applyVeteranRetirement(ghost, g.veteran.id),
      'CM_VETERAN_RETIRED_NAME_APPLY_REFUSED').toBeNull();
    expect(JSON.stringify(ghost)).toBe(before);
    const reviewed = agreed(g);
    const inconsistent = { ...reviewed, retiredNames };
    g.reset();
    const next = g.E.startNextSeason(inconsistent);
    expect(next.squad.some(p => p.id === g.veteran.id),
      'CM_VETERAN_RETIRED_NAME_AGREEMENT_INACTIVE').toBe(false);
    expect(next.retiredLastSummer?.some(p => p.name === g.veteran.name)).toBe(true);
    expect(raw(next), 'CM_VETERAN_RETIRED_NAME_RAW_HISTORY_HELD').toEqual(raw(reviewed));
  });

  it('accepts the actual appended ledger and refuses malformed histories without repairing them', async () => {
    const g = await fresh(), reviewed = agreed(g);
    const actual = raw(reviewed);
    expect(g.L.readVeteranReviews(actual), 'CM_VETERAN_ACTUAL_LEDGER_READER_FOUNDATION').toBe(actual);
    const held = clone(actual) as { v: number; reviews: {
      identity: [string, string, number]; club: string; season: number; decision: string;
    }[] };
    const row = held.reviews[0];
    expect(row.identity, 'CM_VETERAN_ACTUAL_LEDGER_IDENTITY_FOUNDATION')
      .toEqual(identity(g.E, g.career, g.veteran));
    const sparse = [clone(row), clone(row)]; delete sparse[0];
    const faults: [string, unknown][] = [
      ['root-extra', { ...held, extra: true }],
      ['future', { ...held, v: 2 }],
      ['row-extra', { v: 1, reviews: [{ ...row, extra: true }] }],
      ['short-identity', { v: 1, reviews: [{ ...row, identity: row.identity.slice(0, 2) }] }],
      ['unsafe-birth', { v: 1, reviews: [{ ...row, identity: [row.identity[0], row.identity[1], Number.MAX_SAFE_INTEGER + 1] }] }],
      ['blank-name', { v: 1, reviews: [{ ...row, identity: [row.identity[0], ' ', row.identity[2]] }] }],
      ['zero-season', { v: 1, reviews: [{ ...row, season: 0 }] }],
      ['fractional-season', { v: 1, reviews: [{ ...row, season: 1.5 }] }],
      ['unknown-decision', { v: 1, reviews: [{ ...row, decision: 'pending' }] }],
      ['duplicate-attempt', { v: 1, reviews: [row, clone(row)] }],
      ['second-agreement', { v: 1, reviews: [row, { ...row, season: row.season + 1 }] }],
      ['sparse-reviews', { v: 1, reviews: sparse }],
    ];
    for (const [label, value] of faults) {
      const before = JSON.stringify(value);
      expect(g.L.readVeteranReviews(value), 'CM_VETERAN_INVALID_LEDGER_' + label).toBeNull();
      expect(JSON.stringify(value), 'CM_VETERAN_INVALID_RAW_NOT_REPAIRED_' + label).toBe(before);
    }
    const empty = { ...g.career, veteranReviews: { v: 1, reviews: [] } };
    expect(offer(g, empty).decision, 'CM_VETERAN_VALID_EMPTY_LEDGER_OFFER_FOUNDATION').toBe('agreed');
    const bad = { ...g.career, veteranReviews: faults[0][1] }, before = JSON.stringify(bad);
    expect(g.R.previewVeteranRetirement(bad, g.veteran.id).kind,
      'CM_VETERAN_MALFORMED_LEDGER_TALK_CLOSED').toBe('blocked');
    expect(g.R.applyVeteranRetirement(bad, g.veteran.id)).toBeNull();
    expect(JSON.stringify(bad)).toBe(before);
  });

  it('does not read accessors or foreign array methods while refusing non-JSON ledger boundaries', async () => {
    const g = await fresh(), reviewed = agreed(g), held = raw(reviewed);
    expect(g.L.readVeteranReviews(held), 'CM_VETERAN_READER_ACCESSOR_HEALTHY_FOUNDATION').toBe(held);
    let reads = 0;
    const accessor = { v: 1 };
    Object.defineProperty(accessor, 'reviews', { enumerable: true, get() { reads++; return []; } });
    expect(g.L.readVeteranReviews(accessor), 'CM_VETERAN_LEDGER_ACCESSOR_REFUSED').toBeNull();
    expect(reads, 'CM_VETERAN_LEDGER_ACCESSOR_NEVER_READ').toBe(0);
    const reviews: unknown[] = [];
    const foreign = Object.create(Array.prototype);
    Object.defineProperty(foreign, Symbol.iterator, { get() { reads++; return Array.prototype[Symbol.iterator]; } });
    Object.setPrototypeOf(reviews, foreign);
    expect(g.L.readVeteranReviews({ v: 1, reviews }),
      'CM_VETERAN_LEDGER_FOREIGN_ARRAY_REFUSED').toBeNull();
    expect(reads, 'CM_VETERAN_LEDGER_FOREIGN_METHOD_NEVER_READ').toBe(0);
  });

  it.each(['agreed', 'future'] as const)('carries %s raw review history through the actual calendar job join without discarding it', async kind => {
    const g = await fresh();
    const reviewed = agreed(g);
    const source: ReviewCarrier = kind === 'agreed' ? reviewed
      : { ...g.career, veteranReviews: { v: 2, reviews: [], future: { keep: 'exact raw body' } } };
    // Real rollover gives a genuine next-season/week0 source before the job fixture.
    const next = g.E.startNextSeason(source);
    expect(next.season, 'CM_VETERAN_CALENDAR_REAL_ROLLOVER_FOUNDATION').toBe(source.season + 1);
    expect(next.week).toBe(0);
    const held = JSON.stringify(raw(next));
    expect(held, 'CM_VETERAN_CALENDAR_RAW_PRESENT_FOUNDATION').toBe(JSON.stringify(raw(source)));
    const J = await import('@/lib/clubManagerJobHunt');
    const Calendar = await import('@/lib/clubManagerCalendar');
    const target = g.E.applyTargets(next).find(row => row.club === 'Arsenal');
    expect(target, 'CM_VETERAN_CALENDAR_REAL_TARGET_FOUNDATION').toBeTruthy();
    if (!target) throw new Error('CM_VETERAN_FIXTURE: actual target missing');
    const pending = J.openApplication(next, { club: target.club, league: target.league, tier: target.tier },
      () => 0.25, g.E.myLeagueMatchesLeft(next));
    expect(pending, 'CM_VETERAN_CALENDAR_REAL_APPLICATION_FOUNDATION').not.toBeNull();
    if (!pending) throw new Error('CM_VETERAN_FIXTURE: actual application refused');
    // Accepted-job carrier fixture uses the real constructor/decision helpers.
    // It does not claim this club accepted a simulated application.
    const hunt = J.recordDecision(pending, true, next.week, 1);
    const moving = { ...next, jobHunt: hunt };
    const joined = Calendar.joinClubNow(moving);
    expect(joined, 'CM_VETERAN_CALENDAR_ACTUAL_JOIN_FOUNDATION').not.toBeNull();
    if (!joined) throw new Error('CM_VETERAN_FIXTURE: actual calendar join refused');
    expect(joined.clubName, 'CM_VETERAN_CALENDAR_REAL_NEW_CLUB').toBe(target.club);
    expect(JSON.stringify(raw(joined)), 'CM_VETERAN_CALENDAR_RAW_HISTORY_CARRIED').toBe(held);
    expect(JSON.stringify(raw(moving)), 'CM_VETERAN_CALENDAR_SOURCE_RAW_HELD').toBe(held);
    expect(joined.pendingSummary).toBeNull();
  });

  it('keeps actual veteran decline and attained age identical to the old retired-row outcome', async () => {
    const ordinary = await fresh(41, 4);
    const ordinaryPlayer = { ...ordinary.veteran, rating: 85, potential: 85 };
    const ordinaryCareer = own(ordinary.career, ordinaryPlayer);
    ordinary.reset();
    const retired = ordinary.E.startNextSeason(ordinaryCareer);
    const row = retired.retiredLastSummer?.find(p => p.name === ordinaryPlayer.name);
    expect(row, 'CM_VETERAN_REAL_HIGH_RATING_RETIREMENT_FOUNDATION').toBeTruthy();
    if (!row) throw new Error('CM_VETERAN_FIXTURE: actual attained42 retirement row missing');
    expect(row.age).toBe(42);
    expect(row.rating, 'CM_VETERAN_REAL_DECLINE_POSITIVE_WITNESS').toBeLessThan(ordinaryPlayer.rating);
    expect(row.rating, 'CM_VETERAN_REAL_DECLINE_ABOVE_FLOOR_FOUNDATION').toBeGreaterThan(40);
    expect(retired.squad.some(p => p.id === ordinaryPlayer.id)).toBe(false);

    const protectedGraph = await fresh(41, 4);
    const player = { ...protectedGraph.veteran, rating: 85, potential: 85 };
    const career = own(protectedGraph.career, player);
    const reviewed = agreed(protectedGraph, career);
    protectedGraph.reset();
    const keptState = protectedGraph.E.startNextSeason(reviewed);
    const kept = keptState.squad.find(p => p.id === player.id);
    expect(kept?.age, 'CM_VETERAN_PROTECTED_AGE_MATCHES_REAL_RETIRED_ROW').toBe(row.age);
    expect(kept?.rating, 'CM_VETERAN_PROTECTED_DECLINE_MATCHES_REAL_RETIRED_ROW').toBe(row.rating);
    expect(keptState.retiredLastSummer?.some(p => p.name === player.name)).toBe(false);
  });
});
