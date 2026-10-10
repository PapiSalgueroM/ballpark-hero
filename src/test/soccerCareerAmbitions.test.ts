import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { acceptLoan, acceptOffer, advanceProSeason, FALLBACK_CLUBS, nextSeasonYear, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { ambitionForNextSeason, ambitionOptions, pickCareerAmbition, settleCareerAmbition } from '@/lib/soccerCareerAmbitions';

function career(extra: Partial<CareerState> = {}): CareerState {
  const recorded = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const state = structuredClone(recorded.saves.find((save: { id: string }) => save.id === 'ere').state) as CareerState;
  const club = FALLBACK_CLUBS.find(club => club.name === 'Arsenal')!;
  return { ...state, currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
    currentClubColor: club.color, currentLeague: club.league, phase: 'playing', retired: false, age: 24,
    position: 'ST', overall: 85, loan: null, pendingLoanOffers: null, ...extra };
}
function row(c: CareerState, extra: Partial<SeasonRecord> = {}): SeasonRecord {
  return { ...c.seasons[c.seasons.length - 1]!, year: nextSeasonYear(c), club: c.currentClub, type: 'playing',
    apps: 30, goals: 14, assists: 8, cleanSheets: 11, rating: 7.2, injurySevere: false, ...extra };
}
function seeded(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

describe('Soccer Career preseason ambitions', () => {
  it('uses senior club personal bests and the record book ten-game rating floor', () => {
    const c = career();
    c.seasons = [row(c, { year: 2020 }), row(c, { year: 2021, type: 'youth', goals: 100 }),
      row(c, { year: 2022, apps: 1, goals: 2, assists: 1, rating: 10 }), row(c, { year: 2023, apps: 0, goals: 99 })];
    const before = JSON.stringify(c);
    expect(ambitionOptions(c).map(option => [option.id, option.target, option.rewardStat])).toEqual([
      ['goals', 15, 'shooting'], ['assists', 9, 'passing'], ['rating', 7.3, 'physical'],
    ]);
    expect(JSON.stringify(c)).toBe(before);
    expect(ambitionOptions(career({ seasons: [] })).map(option => option.target)).toEqual([5, 3, 7]);
  });

  it('offers keeper and back-line targets without exceeding the rating ceiling', () => {
    const c = career({ position: 'GK' });
    c.seasons = [row(c, { rating: 9.9 })];
    expect(ambitionOptions(c).map(option => [option.id, option.target, option.rewardStat])).toEqual([
      ['cleanSheets', 12, 'reflexes'], ['rating', 10, 'physical'],
    ]);
    c.seasons[0].rating = 10;
    expect(ambitionOptions(c).map(option => option.id)).toEqual(['cleanSheets']);
    expect(ambitionOptions(career({ position: 'CB', seasons: [] })).find(option => option.id === 'cleanSheets')?.rewardStat).toBe('defending');
  });

  it('picks or cancels only before play, idempotently and without changing the original save', () => {
    const c = career(), before = JSON.stringify(c);
    const chosen = pickCareerAmbition(c, 'goals');
    expect(chosen.seasonAmbition).toMatchObject({ id: 'goals', year: nextSeasonYear(c), club: 'Arsenal' });
    expect(pickCareerAmbition(chosen, 'goals')).toBe(chosen);
    expect(pickCareerAmbition(c, 'unknown')).toBe(c);
    expect(pickCareerAmbition(c, null)).toBe(c);
    expect(pickCareerAmbition(chosen, null).seasonAmbition).toBeUndefined();
    for (const phase of ['season_summary', 'newspaper', 'retirement_suggestion'] as const) {
      const blocked = { ...c, phase };
      expect(pickCareerAmbition(blocked, 'goals')).toBe(blocked);
    }
    expect(JSON.stringify(c)).toBe(before);
  });

  it('holds the chosen target through reload and rejects another club or year', () => {
    const c = pickCareerAmbition(career(), 'assists');
    const loaded = JSON.parse(JSON.stringify(c)) as CareerState;
    expect(ambitionForNextSeason(loaded)).toEqual(c.seasonAmbition);
    expect(ambitionForNextSeason({ ...loaded, currentClub: 'Chelsea' })).toBeNull();
    expect(ambitionForNextSeason({ ...loaded, seasons: [...loaded.seasons, row(loaded)] })).toBeNull();
  });

  it('records exact results and queues one earned attribute point once, without rewriting stats', () => {
    const c = pickCareerAmbition(career(), 'goals'), held = c.seasonAmbition!;
    const season = row(c, { goals: held.target });
    const stats = JSON.stringify(season), shooting = c.shooting;
    c.statBoostNextSeason = { passing: 2 };
    settleCareerAmbition(c, season);
    expect(season.ambition).toEqual({ label: held.label, target: held.target, actual: held.target, outcome: 'achieved', rewardStat: 'shooting' });
    expect(c.statBoostNextSeason).toEqual({ passing: 2, shooting: 1 });
    expect(c.shooting).toBe(shooting);
    expect(c.seasonAmbition).toBeUndefined();
    const { ambition: _result, ...unchanged } = season;
    expect(JSON.stringify(unchanged)).toBe(stats);
    const settled = JSON.stringify({ c, season });
    settleCareerAmbition(c, season);
    expect(JSON.stringify({ c, season })).toBe(settled);
    c.seasonAmbition = held;
    settleCareerAmbition(c, season);
    expect(c.statBoostNextSeason.shooting).toBe(1);
  });

  it('records misses and expires mismatched club or year targets without rewards', () => {
    const c = pickCareerAmbition(career(), 'assists'), held = c.seasonAmbition!;
    const season = row(c, { assists: held.target - 1 });
    const boosts = JSON.stringify(c.statBoostNextSeason);
    settleCareerAmbition(c, season);
    expect(season.ambition).toMatchObject({ actual: held.target - 1, outcome: 'missed' });
    expect(JSON.stringify(c.statBoostNextSeason)).toBe(boosts);
    for (const extra of [{ club: 'Chelsea' }, { year: held.year + 1 }]) {
      const other = { ...c, seasonAmbition: held }, wrong = row(c, extra);
      settleCareerAmbition(other, wrong);
      expect(wrong.ambition).toBeUndefined();
      expect(other.seasonAmbition).toBeUndefined();
      expect(JSON.stringify(other.statBoostNextSeason)).toBe(boosts);
    }
  });

  it.each([
    { injurySevere: true, apps: 25 }, { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 },
    { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 }, { apps: 0 },
  ])('records interrupted seasons without an unearned reward (%j)', extra => {
    const c = pickCareerAmbition(career(), 'goals'), held = c.seasonAmbition!;
    const season = row(c, { goals: held.target, ...extra });
    const boosts = JSON.stringify(c.statBoostNextSeason);
    settleCareerAmbition(c, season);
    expect(season.ambition?.outcome).toBe('interrupted');
    expect(season.ambition?.rewardStat).toBeUndefined();
    expect(c.seasonAmbition).toBeUndefined();
    expect(JSON.stringify(c.statBoostNextSeason)).toBe(boosts);
  });

  it.each([
    { apps: 1, difference: 0, outcome: 'interrupted' }, { apps: 9, difference: 0, outcome: 'interrupted' },
    { apps: 10, difference: 0, outcome: 'achieved' }, { apps: 10, difference: -0.1, outcome: 'missed' },
  ])('settles rating ambitions only over ten or more appearances (%j)', ({ apps, difference, outcome }) => {
    const c = pickCareerAmbition(career(), 'rating'), held = c.seasonAmbition!;
    const season = row(c, { apps, rating: held.target + difference });
    const boosts = { ...c.statBoostNextSeason };
    settleCareerAmbition(c, season);
    expect(season.ambition).toMatchObject({ actual: season.rating, outcome });
    expect(season.ambition?.rewardStat).toBe(outcome === 'achieved' ? 'physical' : undefined);
    if (outcome === 'achieved') boosts.physical = (boosts.physical ?? 0) + 1;
    expect(c.statBoostNextSeason).toEqual(boosts);
    expect(c.seasonAmbition).toBeUndefined();
  });

  it('cancels on real transfers and loans, and a return cannot revive the old goal', () => {
    const c = pickCareerAmbition(career(), 'goals');
    const club = FALLBACK_CLUBS.find(club => club.name === 'Chelsea')!;
    const offer = { club, contractYears: 2, wage: c.weeklyWage, transferFee: 0 };
    const moved = acceptOffer(c, offer);
    expect(moved.seasonAmbition).toBeUndefined();
    expect(ambitionForNextSeason(acceptOffer(moved, { ...offer, club: FALLBACK_CLUBS.find(club => club.name === 'Arsenal')! }))).toBeNull();
    expect(acceptLoan(c, { ...offer, isLoan: true }).seasonAmbition).toBeUndefined();
    expect(acceptOffer(c, { ...offer, club: FALLBACK_CLUBS.find(club => club.name === 'Arsenal')! }).seasonAmbition).toEqual(c.seasonAmbition);
  });

  it('leaves an old save and old season untouched without a choice or random draw', () => {
    const c = career(), season = row(c), before = JSON.stringify({ c, season });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('ambitions must not draw'); });
    try { ambitionOptions(c); ambitionForNextSeason(c); settleCareerAmbition(c, season); }
    finally { random.mockRestore(); }
    expect(JSON.stringify({ c, season })).toBe(before);
  });

  it('the actual engine preserves this season and random draws while recording its chosen ambition', () => {
    const start = career();
    const chosen = pickCareerAmbition(structuredClone(start), 'goals'), held = chosen.seasonAmbition!;
    const draws: number[][] = [[], []], output: CareerState[] = [];
    for (const [i, state] of [structuredClone(start), chosen].entries()) {
      const rng = seeded(1180), random = vi.spyOn(Math, 'random').mockImplementation(() => { const value = rng(); draws[i].push(value); return value; });
      try { output.push(advanceProSeason(state, FALLBACK_CLUBS)); } finally { random.mockRestore(); }
    }
    expect(draws[1]).toEqual(draws[0]);
    const actual = output[1].seasons[output[1].seasons.length - 1]!, expected = output[0].seasons[output[0].seasons.length - 1]!;
    const { ambition: result, ...stats } = actual;
    expect(stats).toEqual(expected);
    expect(result).toMatchObject({ label: held.label, target: held.target, actual: actual.goals,
      outcome: actual.injurySevere || actual.apps === 0 ? 'interrupted' : actual.goals >= held.target ? 'achieved' : 'missed' });
    expect(output[1].seasonAmbition).toBeUndefined();
  });
});
