import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  aiDealPlayer, buildMarket, doorRefusal, engineRegistrations, loadCareer, marketForScreen, playNextEntry, releasePlayer,
  restoreEngineRegistrations, saveCareer, signingRefusal, startCareer, startNextSeason, worldRosterFor,
  type CareerState,
} from '@/lib/clubManager';
import { joinClubNow } from '@/lib/clubManagerCalendar';
import { emptyJobHunt } from '@/lib/clubManagerJobHunt';
import { serializeParkedCareer } from '@/lib/clubManagerParkedSave';
import { SAVE_KEY } from '@/lib/clubManagerSaveKeys';
import { recordWorldRosterTransfer, worldRosterOwner } from '@/lib/clubManagerWorldRoster';
import { withSeed } from '@/lib/managerHotSeat';
import { saveFence } from '@/lib/saveFence';

const player = 'Robert Ljubicic';
const parent = 'AEK Athens';
const borrower = 'LASK';
const id = 'p-robert-ljubicic';
const key = JSON.stringify(['now', parent, player, 'CM', 1999, 0]);
const careerRules = { inSeasonRatings: true, worldRatingTiming: true, opening2026Loans: true } as const;
const registrations = engineRegistrations();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(1791633600000);
  let roll = 116137;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    roll = (Math.imul(1664525, roll) + 1013904223) >>> 0;
    return roll / 0x100000000;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  restoreEngineRegistrations(registrations);
  localStorage.clear();
  saveFence.release(SAVE_KEY);
});

const start = (club: string) => startCareer(club, 'now', undefined, undefined, undefined, undefined, careerRules);
const countAt = (career: CareerState, club: string) => worldRosterFor(career, club).filter(row => row.n === player).length;
const join = (career: CareerState, club: string, league: string) => joinClubNow({
  ...career, jobHunt: { ...emptyJobHunt(career.season), open: {
    club, league, tier: 2, season: career.season, week: career.week, matchesLeft: 0, roll: 0, status: 'accepted',
  } },
});
function play(career: CareerState, seed: number) {
  const untilWeek = career.week + 1;
  const advance = (from: CareerState) => playNextEntry(from, { skipHalftime: true, untilWeek });
  const first = withSeed(seed + untilWeek, () => advance(career));
  return first.kind === 'window' && first.state.week === career.week
    ? withSeed(seed + untilWeek + 0x1000000, () => advance(first.state)) : first;
}

it('opens the same loan for LASK, AEK and a third club', () => {
  const lask = start(borrower);
  expect(lask.squad.filter(row => row.name === player)).toEqual([expect.objectContaining({
    id, onLoan: true, loanFrom: parent, worldRosterKey: key,
  })]);
  expect(lask.squad.find(row => row.id === id)?.loanOptionFee).toBeUndefined();
  expect(lask.squad.find(row => row.id === id)?.loanBreakFee).toBeUndefined();
  const aek = start(parent);
  expect(aek.squad.some(row => row.name === player)).toBe(false);
  expect(aek.loanedOut).toEqual([expect.objectContaining({
    club: borrower, player: expect.objectContaining({ id, contractYears: 3, worldRosterKey: key }),
  })]);
  expect(worldRosterOwner(aek, key)).toBe(parent);

  for (const state of [lask, aek, start('Real Madrid')]) {
    expect(countAt(state, parent)).toBe(0);
    expect(countAt(state, borrower)).toBe(1);
    expect(saveCareer(state)).toBe(true);
    for (const loaded of [loadCareer()!, loadCareer(serializeParkedCareer(state))!]) {
      expect(loaded.squad.filter(row => row.name === player)).toEqual(state.squad.filter(row => row.name === player));
      expect(loaded.loanedOut).toEqual(state.loanedOut);
      expect(countAt(loaded, parent)).toBe(0);
      expect(countAt(loaded, borrower)).toBe(1);
    }
  }
});

it('does not sell or reloan him through a stale card', () => {
  const old = startCareer('Real Madrid');
  const stale = buildMarket(old).find(row => row.name === player)!;
  expect(stale.club).toBe(parent);
  const fresh = start('Real Madrid');
  expect(buildMarket(fresh).some(row => row.name === player)).toBe(false);
  expect(marketForScreen(fresh).some(row => row.name === player)).toBe(false);
  for (const club of [parent, borrower]) {
    const card = { ...stale, club };
    expect(signingRefusal(fresh, card, 1)).toContain('on loan at LASK');
    expect(doorRefusal(fresh, card, 'talk')).toContain('on loan at LASK');
    expect(aiDealPlayer(fresh, card)).toBeNull();
  }
});

it('keeps the registration when changing jobs and returns him at season rollover', () => {
  const loan = start(borrower);
  const aek = start(parent);
  const developed = { ...aek, week: 14, loanedOut: aek.loanedOut!.map(loan => ({
    ...loan, player: { ...loan.player, rating: 74, value: 4.8, contractYears: 4 },
  })) };
  expect(worldRosterFor(developed, borrower).find(row => row.n === player)).toMatchObject({ r: 74, v: 4.8 });
  const joined = join(developed, borrower, 'Austrian Bundesliga')!;
  expect(joined?.squad.filter(row => row.name === player)).toEqual([expect.objectContaining({
    id, onLoan: true, loanFrom: parent, rating: 74, value: 4.8,
  })]);
  expect(joined?.loanedOut).toEqual([]);
  expect(join(joined, parent, 'Super League Greece')?.loanedOut?.[0].player.contractYears).toBe(4);
  const joinedParent = join(loan, parent, 'Super League Greece');
  expect(joinedParent?.squad.some(row => row.name === player)).toBe(false);
  expect(joinedParent?.loanedOut).toEqual([expect.objectContaining({ club: borrower, player: expect.objectContaining({ id }) })]);

  const nextLask = startNextSeason(loan);
  expect(nextLask.squad.some(row => row.name === player)).toBe(false);
  expect(countAt(nextLask, borrower)).toBe(0);
  expect(countAt(nextLask, parent)).toBe(1);
  const nextAek = startNextSeason(aek);
  expect(nextAek.squad.filter(row => row.name === player)).toEqual([expect.objectContaining({ id, contractYears: 2 })]);
  expect(nextAek.loanedOut).toEqual([]);
  expect(countAt(nextAek, borrower)).toBe(0);
  const released = releasePlayer(nextAek, id)!;
  expect(worldRosterOwner(released, key)).toBeNull();
  expect(countAt(released, parent)).toBe(0);
});

it('preserves a prior Porto transfer and leaves the shared daily start stable', () => {
  const base = startCareer('Real Madrid');
  const row = startCareer(parent).squad.find(man => man.name === player)!;
  const legacy = recordWorldRosterTransfer(base, { player: row, from: parent, to: 'Porto', kind: 'permanent', since: 0 });
  for (const state of [legacy, { ...legacy, opening2026Loans: true as const }]) {
    const loaded = loadCareer(serializeParkedCareer(state))!;
    expect(worldRosterOwner(loaded, key)).toBe('Porto');
    expect(worldRosterFor(loaded, 'Porto').filter(man => man.n === player)).toEqual([expect.objectContaining({ worldRosterKey: key })]);
    expect(countAt(loaded, parent)).toBe(0);
    expect(countAt(loaded, borrower)).toBe(0);
  }
  const daily = startCareer(parent, 'now', undefined, undefined, undefined, undefined, { ...careerRules, noWorldComps: true });
  expect(daily.squad.filter(man => man.name === player)).toEqual([expect.objectContaining({ id })]);
  expect(countAt(daily, borrower)).toBe(0);
});

it('credits his LASK goal using the same AEK-origin identity', () => {
  const seed = 116394;
  let career = withSeed(seed, () => start(borrower));
  while (career.week < 5) {
    const next = play(career, seed).state;
    expect(next.week).toBeGreaterThan(career.week);
    career = next;
  }
  const played = play(career, seed);
  expect(played.report).toMatchObject({
    home: 'Villarreal', away: borrower, homeGoals: 0, awayGoals: 3,
    myScorers: expect.arrayContaining([expect.objectContaining({ name: player, minute: 90, plus: 5 })]),
  });
  expect(played.state.uclScorers?.players).toContainEqual([key, player, borrower, 1]);
});
