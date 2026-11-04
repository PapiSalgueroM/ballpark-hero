import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateShareText, getCareerTotals, initCareer,
  type CareerState, type ClubData, type SeasonRecord,
} from '@/lib/soccerCareerEngine';

const ZERO_TOTALS = {
  apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0,
  leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0,
  ballonDors: 0, continentalCups: 0, clubCups: 0,
};

// Explicit fictional club and season receipts, not simulated sporting results.
function career(seasons: SeasonRecord[]): CareerState {
  const club: ClubData = {
    id: 'share-test-club', name: 'Share Test FC', country: 'Share Test Country',
    tier: 2, color: '#123456', league: 'Share Test League',
  };
  const state = initCareer('Share Tester', club.country, 'ST', 'modern', {
    pace: 70, shooting: 70, passing: 70, dribbling: 70,
    defending: 70, physical: 70, reflexes: 70,
  }, 70, 2018, [club], null, 85);
  return { ...state, seasons, age: 34, phase: 'retired', retired: true };
}

function season(year: number, fields: Partial<SeasonRecord> = {}): SeasonRecord {
  return {
    year, age: year - 2002, club: 'Share Test FC', clubCountry: 'Share Test Country', clubTier: 2,
    apps: 20, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 7.5,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0,
    tournament: null, tournamentResult: null,
    ...fields,
  };
}

function observe(name: string, state: CareerState) {
  const before = JSON.stringify(state);
  const random = vi.spyOn(Math, 'random');
  const totals = getCareerTotals(state.seasons);
  const share = generateShareText(state);
  const repeated = generateShareText(state);
  const inputUnchanged = JSON.stringify(state) === before;
  const receipt = {
    case: name, fixture: 'Real initCareer plus explicit fictional season receipts',
    totals, share, repeated, inputUnchanged, randomDraws: random.mock.calls.length,
  };
  const out = process.env.SC_SHARE_TROPHIES_RAW;
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('SC_SHARE_TROPHIES_RAW ' + JSON.stringify(receipt));
  expect(inputUnchanged).toBe(true);
  expect(random).not.toHaveBeenCalled();
  expect(repeated).toBe(share);
  return { totals, share };
}

afterEach(() => vi.restoreAllMocks());

describe('Soccer Career shared trophy totals', () => {
  it('includes a continental international title in the shared trophy count', () => {
    const state = career([season(2028, {
      goals: 7, assists: 4, cleanSheets: 2, yellowCards: 1,
      continentalCup: true, intApps: 6, intGoals: 2, intRating: 8,
      tournament: 'Continental', tournamentResult: 'Winner',
    })]);
    const actual = observe('continental-only', state);
    expect(actual.totals).toMatchObject({
      ...ZERO_TOTALS, apps: 20, goals: 7, assists: 4, cleanSheets: 2, yellowCards: 1,
      continentalCups: 1,
    });
    expect(actual.share, 'SC_SHARE_TROPHY_CONTINENTAL_ONLY').toBe(
      "I finished my Soccer Career as a JOURNEYMAN: 7 goals, 1 trophies, 0 Ballon d'Ors. Can you beat me? douknowball.com/soccer-career",
    );
  });

  it('adds continental titles to every other trophy family across career seasons', () => {
    const state = career([
      season(2026, { goals: 11, assists: 2, cleanSheets: 1, yellowCards: 1,
        leagueTitle: true, domesticCup: true, championsLeague: true, worldCup: true,
        ballonDor: true, ballonDorRank: 1 }),
      season(2028, { goals: 19, assists: 3, yellowCards: 2,
        continentalCup: true, clubCupTitle: 'Fixture Club Cup' }),
      season(2032, { goals: 7, assists: 4, cleanSheets: 2,
        domesticCup: true, continentalCup: true, ballonDor: true, ballonDorRank: 1 }),
    ]);
    const actual = observe('mixed', state);
    expect(actual.totals).toMatchObject({
      ...ZERO_TOTALS, apps: 60, goals: 37, assists: 9, cleanSheets: 3, yellowCards: 3,
      leagueTitles: 1, domesticCups: 2, championsLeagues: 1, worldCups: 1,
      continentalCups: 2, clubCups: 1, ballonDors: 2,
    });
    expect(actual.share, 'SC_SHARE_TROPHY_MIXED_FAMILIES').toBe(
      "I finished my Soccer Career as a JOURNEYMAN: 37 goals, 8 trophies, 2 Ballon d'Ors. Can you beat me? douknowball.com/soccer-career",
    );
  });

  it('keeps an empty career share at zero with the existing fallback tier', () => {
    const actual = observe('zero', career([]));
    expect(actual.totals).toMatchObject(ZERO_TOTALS);
    expect(actual.share).toBe(
      "I finished my Soccer Career as a JOURNEYMAN: 0 goals, 0 trophies, 0 Ballon d'Ors. Can you beat me? douknowball.com/soccer-career",
    );
  });

  it('retains all five existing trophy families when continental receipts are absent', () => {
    const state = career([
      season(2026, { goals: 1, leagueTitle: true }),
      season(2027, { goals: 2, domesticCup: true }),
      season(2028, { goals: 3, championsLeague: true }),
      season(2029, { goals: 4, worldCup: true }),
      season(2030, { goals: 5, clubCupTitle: 'Fixture Club Cup' }),
    ]);
    expect(state.seasons.every(row => !Object.prototype.hasOwnProperty.call(row, 'continentalCup'))).toBe(true);
    const actual = observe('other-families', state);
    expect(actual.totals).toMatchObject({
      ...ZERO_TOTALS, apps: 100, goals: 15,
      leagueTitles: 1, domesticCups: 1, championsLeagues: 1, worldCups: 1, clubCups: 1,
    });
    expect(actual.share).toBe(
      "I finished my Soccer Career as a JOURNEYMAN: 15 goals, 5 trophies, 0 Ballon d'Ors. Can you beat me? douknowball.com/soccer-career",
    );
  });

  it('keeps personal awards separate from team trophies and preserves the earned legacy tier', () => {
    const state = career([
      season(2026, { goals: 9, ballonDor: true, ballonDorRank: 1 }),
      season(2027, { goals: 12, ballonDor: true, ballonDorRank: 1 }),
    ]);
    state.legacy = { score: 85, tier: 'LEGEND', breakdown: [{ label: 'Fixture legacy', points: 85 }] };
    const actual = observe('personal-awards', state);
    expect(actual.totals).toMatchObject({ ...ZERO_TOTALS, apps: 40, goals: 21, ballonDors: 2 });
    expect(actual.share).toBe(
      "I finished my Soccer Career as a LEGEND: 21 goals, 0 trophies, 2 Ballon d'Ors. Can you beat me? douknowball.com/soccer-career",
    );
  });
});
