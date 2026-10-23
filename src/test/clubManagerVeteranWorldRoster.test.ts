import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, CMPlayer } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type World = typeof import('@/lib/clubManagerWorldRoster');
const SOURCE_CLUB = 'Fictional Veteran Origin';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks(); vi.useRealTimers();
  localStorage.clear(); sessionStorage.clear();
});

function currentReview(E: Engine, career: CareerState): CareerState {
  // Synthetic completed-calendar input, followed by the actual review operation.
  // No season of matches, summary fields or world records are fabricated here.
  const input = { ...career, live: null, week: career.calendar.length, pendingSummary: null };
  const result = E.finishSeason(input);
  expect(result.state.pendingSummary, 'CM_VETERAN_WORLD_ACTUAL_REVIEW_FOUNDATION').toEqual(result.summary);
  expect(result.summary.season, 'CM_VETERAN_WORLD_REVIEW_SEASON_FOUNDATION').toBe(result.state.season);
  expect(result.summary.club, 'CM_VETERAN_WORLD_REVIEW_CLUB_FOUNDATION').toBe(result.state.clubName);
  expect(result.state.week).toBe(result.state.calendar.length);
  return result.state;
}

function recordFor(W: World, career: CareerState, key: string) {
  const ledger = W.worldRosterView(career);
  expect(ledger !== null, 'CM_VETERAN_WORLD_VERIFIED_LEDGER_FOUNDATION').toBe(true);
  if (!ledger) throw new Error('The actual world reader did not accept the fixture ledger.');
  const matches = ledger.records.filter(row => row.key === key);
  expect(matches.length, 'CM_VETERAN_WORLD_ONE_STABLE_RECORD').toBe(1);
  if (matches.length !== 1) throw new Error('The actual world identity is absent or duplicated.');
  return matches[0];
}

async function certifiedVeteran() {
  vi.restoreAllMocks(); vi.resetModules();
  let seed = 1457101;
  const draws: number[] = [];
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    draws.push(value); return value;
  });
  // Seed precedes the actual graph and factory, including their ID counters.
  const E = await import('@/lib/clubManager');
  const A = await import('@/lib/clubManagerEras');
  const R = await import('@/lib/clubManagerVeteranRetirement');
  const W = await import('@/lib/clubManagerWorldRoster');
  const base = E.startCareer('Everton');
  const donor = base.squad.find(player => !player.onLoan);
  if (!donor) throw new Error('The actual factory supplied no owned fixture donor.');
  // A fictional full-player fixture, not a claim about the real donor or a real transfer.
  const veteran: CMPlayer = {
    ...donor, id: 'fictional-world-review-veteran', name: 'Fictional World Review Veteran',
    generated: true, worldRosterKey: undefined, worldRosterSince: undefined,
    age: 41, position: 'GK', rating: 85, potential: 85, value: 0.2,
    contractYears: 4, wage: 3, role: 'rotation', lastTen: [1, 0, 1, 0],
    wantsOut: false, onLoan: undefined, injuryWeeks: 0, suspendedMatches: 0,
    isYouth: false, academyGrad: false,
  };
  const input: CareerState = {
    ...base, budget: 500, live: null, pendingMove: null,
    squad: base.squad.map(player => player.id === donor.id ? veteran : player),
  };
  const sourceRaw = JSON.stringify(input);
  // Actual public record builder, as in the existing world-roster tests.
  // The supplied completed transaction is a fictional fixture and has no payment claim.
  const tracked = W.recordWorldRosterTransfer(input, {
    player: veteran, from: SOURCE_CLUB, to: input.clubName, kind: 'permanent', since: 0,
  });
  expect(JSON.stringify(input), 'CM_VETERAN_WORLD_BUILDER_INPUT_HELD').toBe(sourceRaw);
  const owned = tracked.squad.find(player => player.id === veteran.id);
  expect(typeof owned?.worldRosterKey, 'CM_VETERAN_WORLD_BUILDER_KEY_FOUNDATION').toBe('string');
  if (!owned?.worldRosterKey) throw new Error('The real builder did not certify the fictional veteran.');
  const key = owned.worldRosterKey;
  const row = recordFor(W, tracked, key);
  expect(row.owner, 'CM_VETERAN_WORLD_BUILDER_ACTUAL_OWNER').toBe(tracked.clubName);
  expect(row.status).toBe('owned');
  expect(row.year).toBe(E.worldYear(tracked));
  expect(row.origin.club).toBe(SOURCE_CLUB);
  expect(row.origin.name).toBe(veteran.name);
  expect(row.origin.birthYear).toBe(E.worldYear(tracked) - veteran.age);
  expect(JSON.stringify(row.player), 'CM_VETERAN_WORLD_BUILDER_COMPLETE_PLAYER').toBe(JSON.stringify(owned));
  const career = currentReview(E, tracked);
  expect(JSON.stringify(recordFor(W, career, key)), 'CM_VETERAN_WORLD_REVIEW_RETAINS_RECORD')
    .toBe(JSON.stringify(row));
  function reset() { seed = 1457201; draws.length = 0; }
  return { E, A, R, W, career, veteran: owned, key, origin: row.origin, draws, reset };
}

describe('One protected veteran summer in the actual certified world roster', { timeout: 120000 }, () => {
  it('keeps agreed current ownership and payload for one summer, then records the actual next retirement under the same key', async () => {
    const ordinary = await certifiedVeteran();
    expect(ordinary.A.retireChance(42, 85, 'GK'), 'CM_VETERAN_WORLD_OLD_CERTAIN_RETIREMENT_FOUNDATION').toBe(1);
    const ordinaryRaw = JSON.stringify(ordinary.career);
    ordinary.reset();
    const unasked = ordinary.E.startNextSeason(ordinary.career);
    const oldRetired = unasked.retiredLastSummer?.find(player => player.name === ordinary.veteran.name);
    expect(oldRetired !== undefined, 'CM_VETERAN_WORLD_OLD_RETIREMENT_POSITIVE').toBe(true);
    if (!oldRetired) throw new Error('The unasked actual rollover did not record the veteran retirement.');
    expect(oldRetired.age).toBe(42);
    expect(oldRetired.rating, 'CM_VETERAN_WORLD_REAL_DECLINE_FOUNDATION').toBeLessThan(ordinary.veteran.rating);
    expect(unasked.squad.some(player => player.id === ordinary.veteran.id)).toBe(false);
    const ordinaryRecord = recordFor(ordinary.W, unasked, ordinary.key);
    expect(ordinaryRecord.owner, 'CM_VETERAN_WORLD_UNASKED_OWNER_CLEARED').toBeNull();
    expect(ordinaryRecord.status, 'CM_VETERAN_WORLD_UNASKED_RETIRED_STATUS').toBe('retired');
    expect(ordinaryRecord.year).toBe(ordinary.E.worldYear(unasked));
    expect(ordinaryRecord.origin).toEqual(ordinary.origin);
    expect(ordinaryRecord.player.id).toBe(ordinary.veteran.id);
    expect(ordinaryRecord.player.age).toBe(oldRetired.age);
    expect(ordinaryRecord.player.rating).toBe(oldRetired.rating);
    expect(ordinary.W.worldRosterOwner(unasked, ordinary.key)).toBeNull();
    expect(ordinary.W.worldRosterClub(unasked, ordinary.career.clubName, [ordinaryRecord.player])).toEqual([]);
    expect(ordinary.W.worldRosterClub(unasked, SOURCE_CLUB, [ordinaryRecord.player])).toEqual([]);
    expect(JSON.stringify(ordinary.career), 'CM_VETERAN_WORLD_UNASKED_INPUT_HELD').toBe(ordinaryRaw);

    const protectedGraph = await certifiedVeteran();
    expect(protectedGraph.key, 'CM_VETERAN_WORLD_PAIRED_IDENTITY_FOUNDATION').toBe(ordinary.key);
    expect(JSON.stringify(protectedGraph.career), 'CM_VETERAN_WORLD_PAIRED_REVIEW_FOUNDATION').toBe(ordinaryRaw);
    protectedGraph.reset();
    const preview = protectedGraph.R.previewVeteranRetirement(protectedGraph.career, protectedGraph.veteran.id);
    expect(preview.kind, 'CM_VETERAN_WORLD_REAL_OFFER_FOUNDATION').toBe('offer');
    if (preview.kind !== 'offer') throw new Error('The actual review refused the healthy owned veteran.');
    expect(preview.decision).toBe('agreed');
    const agreed = protectedGraph.R.applyVeteranRetirement(protectedGraph.career, protectedGraph.veteran.id);
    expect(agreed !== null, 'CM_VETERAN_WORLD_REAL_AGREEMENT_FOUNDATION').toBe(true);
    if (!agreed) throw new Error('The actual agreement was not applied.');
    expect(protectedGraph.draws, 'CM_VETERAN_WORLD_AGREEMENT_NO_RANDOM_DRAW').toEqual([]);
    expect(JSON.stringify(agreed.worldRoster), 'CM_VETERAN_WORLD_AGREEMENT_DOES_NOT_EDIT_OWNERSHIP')
      .toBe(JSON.stringify(protectedGraph.career.worldRoster));
    const history = JSON.stringify(agreed.veteranReviews);
    protectedGraph.reset();
    const next = protectedGraph.E.startNextSeason(agreed);
    const kept = next.squad.find(player => player.id === protectedGraph.veteran.id);
    expect(kept !== undefined, 'CM_VETERAN_WORLD_AGREED_SQUAD_RETAINED').toBe(true);
    if (!kept) throw new Error('The actual protected rollover lost the veteran.');
    expect(kept.age).toBe(42);
    expect(kept.rating, 'CM_VETERAN_WORLD_DECLINE_MATCHES_UNASKED').toBe(oldRetired.rating);
    expect(kept.worldRosterKey).toBe(protectedGraph.key);
    const keptRecord = recordFor(protectedGraph.W, next, protectedGraph.key);
    expect(keptRecord.status, 'CM_VETERAN_WORLD_AGREED_OWNED_STATUS').toBe('owned');
    expect(keptRecord.owner, 'CM_VETERAN_WORLD_AGREED_ACTUAL_OWNER').toBe(next.clubName);
    expect(keptRecord.year, 'CM_VETERAN_WORLD_AGREED_CURRENT_YEAR').toBe(protectedGraph.E.worldYear(next));
    expect(keptRecord.origin).toEqual(protectedGraph.origin);
    expect(JSON.stringify(keptRecord.player), 'CM_VETERAN_WORLD_AGREED_COMPLETE_ACTUAL_PAYLOAD').toBe(JSON.stringify(kept));
    expect(protectedGraph.W.worldRosterOwner(next, protectedGraph.key)).toBe(next.clubName);
    const ownRoster = protectedGraph.W.worldRosterClub(next, next.clubName, []);
    expect(ownRoster.filter(player => player.worldRosterKey === protectedGraph.key),
      'CM_VETERAN_WORLD_AGREED_ROSTER_VIEW').toEqual([kept]);
    expect(protectedGraph.W.worldRosterClub(next, SOURCE_CLUB, [kept]),
      'CM_VETERAN_WORLD_ORIGIN_CANNOT_RECLAIM').toEqual([]);
    expect(next.retiredLastSummer?.some(player => player.name === kept.name)).toBe(false);
    const nextRaw = JSON.stringify(next);
    const snapshot = protectedGraph.W.snapshotWorldRosterClub(next, next.clubName);
    const refreshed = protectedGraph.E.refreshWorldRoster(snapshot);
    expect(JSON.stringify(recordFor(protectedGraph.W, refreshed, protectedGraph.key)),
      'CM_VETERAN_WORLD_CURRENT_SNAPSHOT_REFRESH_HELD').toBe(JSON.stringify(keptRecord));
    expect(JSON.stringify(next), 'CM_VETERAN_WORLD_REFRESH_INPUT_HELD').toBe(nextRaw);
    expect(JSON.stringify(next.veteranReviews), 'CM_VETERAN_WORLD_AGREED_HISTORY_HELD').toBe(history);

    const nextReview = currentReview(protectedGraph.E, next);
    const final = protectedGraph.E.startNextSeason(nextReview);
    const retired = final.retiredLastSummer?.find(player => player.name === kept.name);
    expect(retired !== undefined, 'CM_VETERAN_WORLD_NEXT_NORMAL_RETIREMENT').toBe(true);
    if (!retired) throw new Error('The following actual summer did not retire the veteran.');
    expect(retired.age).toBe(43);
    expect(final.squad.some(player => player.id === kept.id)).toBe(false);
    const finalRecord = recordFor(protectedGraph.W, final, protectedGraph.key);
    expect(finalRecord.origin).toEqual(protectedGraph.origin);
    expect(finalRecord.status, 'CM_VETERAN_WORLD_NEXT_RETIRED_STATUS').toBe('retired');
    expect(finalRecord.owner, 'CM_VETERAN_WORLD_NEXT_OWNER_CLEARED').toBeNull();
    expect(finalRecord.year, 'CM_VETERAN_WORLD_NEXT_CURRENT_YEAR').toBe(protectedGraph.E.worldYear(final));
    expect(finalRecord.player.id).toBe(kept.id);
    expect(finalRecord.player.age).toBe(retired.age);
    expect(finalRecord.player.rating).toBe(retired.rating);
    expect(finalRecord.player.worldRosterKey).toBe(protectedGraph.key);
    expect(protectedGraph.W.worldRosterOwner(final, protectedGraph.key)).toBeNull();
    expect(protectedGraph.W.worldRosterClub(final, next.clubName, [finalRecord.player])).toEqual([]);
    expect(protectedGraph.W.worldRosterClub(final, SOURCE_CLUB, [finalRecord.player])).toEqual([]);
    expect(JSON.stringify(final.veteranReviews), 'CM_VETERAN_WORLD_SPENT_HISTORY_RETAINED').toBe(history);
  });
});

