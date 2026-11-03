import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import * as Eras from '@/lib/careerEras';
import { clubKeyOf } from '@/lib/soccerCareerLeagueWorld';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import {
  communityShieldAnnualStats, communityShieldSeasonStats, readCommunityShield,
} from '@/lib/soccerCareerExtraCups';

const E = (process.env.SC_EXTRA_CUPS_ENGINE
  ? await import(/* @vite-ignore */ process.env.SC_EXTRA_CUPS_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const CLOCK = 1793448000000;
const STATS = ['apps', 'goals', 'assists', 'cleanSheets', 'rating'] as const;
const same = (a: string, b: string): boolean => clubKeyOf(a) === clubKeyOf(b);
afterEach(() => vi.restoreAllMocks());

function run(input: CareerState, action: (state: CareerState) => CareerState) {
  const working = copy(input), draws: number[] = [];
  let state = 0;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const value = state / 4294967296; draws.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(CLOCK);
  try {
    const after = action(working);
    expect(isSoccerCareerSave(after), 'existing core save admission').toBe(true);
    return { after, draws, finalLcgState: state };
  } finally { random.mockRestore(); clock.mockRestore(); }
}

function openingFixture(): CareerState {
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')) as
    { saves: { id: string; state: CareerState }[] };
  const original = saved.saves.find(row => row.id === 'ere')?.state;
  const arsenal = E.FALLBACK_CLUBS.find(club => same(club.name, 'Arsenal'));
  expect(original, 'held existing ere career').toBeDefined();
  expect(arsenal, 'actual Arsenal club-table foundation').toBeDefined();
  // Same disclosed arsenal:0 profile as the retained severe fixture, not a transfer or skill-development claim.
  const lab: CareerState = { ...copy(original!), playerName: 'Shield annual witness', phase: 'playing',
    currentClub: arsenal!.name, currentClubCountry: arsenal!.country, currentClubTier: arsenal!.tier,
    currentClubColor: arsenal!.color, currentLeague: arsenal!.league,
    pace: 85, shooting: 85, passing: 85, dribbling: 85, defending: 85, physical: 85, reflexes: 85 };
  lab.overall = E.calcOverall(lab, lab.position);
  const repaired = run(lab, state => E.repairCareer(state));
  const closed = run(repaired.after, state => E.advanceProSeason(state, E.FALLBACK_CLUBS)).after;
  const closeRow = closed.seasons[closed.seasons.length - 1]!;
  expect(closed.phase).toBe('newspaper'); expect(closeRow.year).toBe(2029); expect(closeRow.injurySevere).toBe(false);
  const receipt = closed.extraCupQualification;
  expect(receipt?.status).toBe('ready');
  if (!receipt || receipt.status !== 'ready') throw new Error('The actual prospective close must provide the ready fixture');
  expect(receipt.qualifyingYear).toBe(2029); expect(receipt.eventYear).toBe(2030); expect(receipt.seed).toBe(4272396692);
  expect(receipt.entrants).toEqual([{ club: 'Man City', via: 'league-winner' }, { club: 'Brighton', via: 'league-runner-up' }]);
  const represented = E.FALLBACK_CLUBS.find(club => same(club.name, receipt.entrants[0].club));
  expect(represented, 'actual qualifier club-table binding').toBeDefined();
  // Existing labelled after-window club and consumer-phase copy. No offer, loan or signing payment is claimed.
  return { ...copy(closed), phase: 'playing', currentClub: represented!.name,
    currentClubCountry: represented!.country, currentClubTier: represented!.tier,
    currentClubColor: represented!.color, currentLeague: represented!.league };
}

function pair(severe: boolean) {
  const opening = openingFixture(), absent = copy(opening); delete absent.extraCupQualification;
  const openingBytes = JSON.stringify(opening), absentBytes = JSON.stringify(absent);
  const injury = severe ? vi.spyOn(Eras, 'rollSeasonInjury').mockReturnValue({ name: 'ACL rupture', weeks: 20, severe: true }) : null;
  let present: ReturnType<typeof run>, annual: ReturnType<typeof run>;
  try {
    present = run(opening, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
    if (injury) { expect(injury.mock.calls).toHaveLength(1); injury.mockClear(); }
    annual = run(absent, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
    if (injury) expect(injury.mock.calls).toHaveLength(1);
  } finally { injury?.mockRestore(); }
  const row = present.after.seasons[present.after.seasons.length - 1]!;
  const annualRow = annual.after.seasons[annual.after.seasons.length - 1]!;
  for (const value of [row, annualRow]) { expect(value.type).toBe('playing'); expect(value.year).toBe(2030); }
  expect(present.after.phase).toBe(severe ? 'rehab_choice' : 'newspaper');
  expect(annual.after.phase).toBe(present.after.phase);
  expect(row.injurySevere).toBe(severe); expect(annualRow.injurySevere).toBe(severe);
  if (severe) for (const value of [row, annualRow]) { expect(value.injury).toBe('ACL rupture'); expect(value.injuryWeeks).toBe(20); }
  expect(annualRow.apps, 'positive annual capacity in the retained fixture').toBeGreaterThan(0);
  expect(row.extraCups).toHaveLength(1); expect(annualRow.extraCups).toBeUndefined();
  expect(row.extraCups![0].player.apps, 'actual selected opening foundation').toBe(1);
  expect(row.extraCups![0].qualification).toEqual(opening.extraCupQualification);
  expect(present.draws).toEqual(annual.draws); expect(present.finalLcgState).toBe(annual.finalLcgState);
  expect(present.after.phone).toEqual(annual.after.phone); expect(present.after.leagueWorld).toEqual(annual.after.leagueWorld);
  expect(present.after.seasons.slice(0, -1)).toEqual(annual.after.seasons.slice(0, -1));
  expect(present.after.seasons.slice(0, -1)).toEqual(opening.seasons);
  if (severe) {
    expect(present.after.pendingRehab).toEqual(annual.after.pendingRehab);
    expect(present.after.pendingSummary).toEqual(annual.after.pendingSummary);
    expect(present.after.pendingSummary).toEqual(opening.pendingSummary);
  }
  expect(JSON.stringify(opening), 'fixture bytes held, not a whole-engine input immutability claim').toBe(openingBytes);
  expect(JSON.stringify(absent), 'receipt-absent fixture bytes held').toBe(absentBytes);
  return { row, annualRow };
}

function verifyLateMerge(row: SeasonRecord, annualRow: SeasonRecord) {
  const result = readCommunityShield(row);
  expect(result).not.toBeNull(); expect(readCommunityShield(annualRow)).toBeNull();
  const annual = { apps: annualRow.apps, goals: annualRow.goals, assists: annualRow.assists,
    cleanSheets: annualRow.cleanSheets, rating: annualRow.rating };
  expect(communityShieldAnnualStats(row)).toEqual(annual);
  expect(communityShieldSeasonStats(annual, result)).toEqual({ apps: row.apps, goals: row.goals,
    assists: row.assists, cleanSheets: row.cleanSheets, rating: row.rating });
  const normalized = copy(row); delete normalized.extraCups;
  for (const key of STATS) normalized[key] = annualRow[key];
  expect(normalized, 'every unrelated annual field remains exact').toEqual(annualRow);
}

describe('Soccer Career Community Shield annual rating capture', () => {
  it('SC_SHIELD_ANNUAL_RATING_NORMAL: records the exact annual grade before the normal opening merge', () => {
    const { row, annualRow } = pair(false);
    expect(row.extraCups![0].annualRating, 'SC_SHIELD_ANNUAL_RATING_NORMAL_MISSING: capture the pre-merge annual grade').toBe(annualRow.rating);
    verifyLateMerge(row, annualRow);
  });

  it('SC_SHIELD_ANNUAL_RATING_SEVERE: records the exact annual grade before the severe opening merge', () => {
    const { row, annualRow } = pair(true);
    expect(row.extraCups![0].annualRating, 'SC_SHIELD_ANNUAL_RATING_SEVERE_MISSING: capture the pre-merge annual grade').toBe(annualRow.rating);
    verifyLateMerge(row, annualRow);
  });
});
