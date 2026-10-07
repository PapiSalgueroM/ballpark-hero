import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CareerStatsCard } from '@/pages/SoccerCareer';
import { getCareerTotals, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';
import { soccerRatingRows } from '@/lib/careerSeasonRatings';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));

const season = (year: number, overrides: Partial<SeasonRecord> = {}): SeasonRecord => ({
  year, age: 20, club: 'Arsenal', clubCountry: 'England', clubTier: 1,
  apps: 30, goals: 12, assists: 8, cleanSheets: 5, yellowCards: 4, redCards: 1,
  rating: 7.4, ovr: 75, leagueTitle: false, domesticCup: false, championsLeague: false,
  worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
  intApps: 7, intGoals: 3, intAssists: 2, intRating: 7, tournament: null, tournamentResult: null,
  ...overrides,
});
const savedRows = () => [
  season(2027, { leagueTitle: true, championsLeague: true, ballonDor: true }),
  season(2028, { apps: 32, goals: 19, assists: 11, cleanSheets: 12, yellowCards: 5, redCards: 0, domesticCup: true, worldCup: true, continentalCup: true, clubCupTitle: 'Copa Libertadores' }),
];
const restore = (position: string, seasons = savedRows()): Pick<CareerState, 'position' | 'seasons'> => JSON.parse(JSON.stringify({ position, seasons }));
const draw = (career: Pick<CareerState, 'position' | 'seasons'>) => <CareerStatsCard career={career} totals={getCareerTotals(career.seasons)} />;
const cells = (root: HTMLElement) => Object.fromEntries([...root.querySelectorAll('[data-career-stat]')].map(node => [node.getAttribute('data-career-stat')!, node.firstElementChild?.textContent]));
const absentEstimates = (root: HTMLElement) => {
  for (const name of ['Saves', 'Pens Saved', 'Tackles', 'Interceptions', 'Key Passes', 'Hat Tricks']) {
    expect(root.querySelector(`[data-career-stat="${name}"]`), `${name} has no recorded career counter and must not be fabricated`).toBeNull();
  }
};

beforeEach(() => { vi.spyOn(Math, 'random'); vi.spyOn(Storage.prototype, 'setItem'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('recorded Soccer career stats', () => {
  it('shows only the keepers saved appearances clean sheets and actual trophies', () => {
    const career = restore('GK'), before = JSON.stringify(career), v = render(draw(career));
    expect(cells(v.container)).toEqual({ Apps: '62', 'Clean Sheets': '17', Trophies: '6' }); absentEstimates(v.container);
    expect(v.queryByText('Only stats kept in your season records are shown.')).toBeInTheDocument();
    expect(JSON.stringify(career)).toBe(before); expect(Math.random).not.toHaveBeenCalled(); expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it('shows the defenders saved appearances goals clean sheets and trophies without invented defensive actions', () => {
    for (const position of ['CB', 'LB', 'RB']) {
      const career = restore(position), before = JSON.stringify(career), v = render(draw(career));
      expect(cells(v.container)).toEqual({ Apps: '62', Goals: '31', 'Clean Sheets': '17', Trophies: '6' }); absentEstimates(v.container);
      expect(JSON.stringify(career)).toBe(before); v.unmount();
    }
    expect(Math.random).not.toHaveBeenCalled(); expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it('shows midfielders saved goals and assists without estimating key passes', () => {
    for (const position of ['CDM', 'CM', 'CAM']) {
      const career = restore(position), before = JSON.stringify(career), v = render(draw(career));
      expect(cells(v.container)).toEqual({ Apps: '62', Goals: '31', Assists: '19', Trophies: '6' }); absentEstimates(v.container);
      expect(JSON.stringify(career)).toBe(before); v.unmount();
    }
  });

  it('shows forwards saved goals and assists without inferring hat tricks from total goals', () => {
    for (const position of ['ST', 'LW', 'RW']) {
      const career = restore(position), before = JSON.stringify(career), v = render(draw(career));
      expect(cells(v.container)).toEqual({ Apps: '62', Goals: '31', Assists: '19', Trophies: '6' }); absentEstimates(v.container);
      expect(JSON.stringify(career)).toBe(before); v.unmount();
    }
  });

  it('keeps an incomplete old defender clean sheet history unknown instead of claiming a lifetime zero or partial total', () => {
    for (const position of ['CB', 'LB', 'RB']) for (const tracked of [0, 12]) {
      const career = restore(position, [season(2027, { ovr: undefined, cleanSheets: 0 }), season(2028, { cleanSheets: tracked })]);
      const before = JSON.stringify(career), v = render(draw(career));
      expect(cells(v.container)['Clean Sheets'], 'unknown historical clean sheets must not become a numeric lifetime claim').toBe('-');
      expect(v.getByLabelText('may not have been counted')).toBeInTheDocument();
      expect(v.getByText('Clean sheets may not have been counted in older seasons.')).toBeInTheDocument();
      expect(cells(v.container).Apps).toBe('60'); expect(JSON.stringify(career)).toBe(before); v.unmount();
    }
  });

  it('preserves recorded zero positive legacy and no appearance clean sheets under the existing reader convention', () => {
    for (const [position, rows, expected] of [
      ['CB', [season(2027, { cleanSheets: 0 })], '0'],
      ['CB', [season(2027, { ovr: undefined, cleanSheets: 2 })], '2'],
      ['CB', [season(2027, { ovr: undefined, apps: 0, cleanSheets: 0 })], '0'],
      ['GK', [season(2027, { ovr: undefined, cleanSheets: 0 })], '0'],
    ] as const) {
      const career = restore(position, [...rows]), v = render(draw(career));
      expect(cells(v.container)['Clean Sheets'], 'recorded zero and known legacy counts remain actual numbers').toBe(expected);
      expect(v.queryByLabelText('may not have been counted')).toBeNull(); v.unmount();
    }
  });

  it('updates the actual card from new saved rows without changing its earned derby record or writing a save', () => {
    const career = restore('ST', [season(2027, { derbies: [{ rival: 'Tottenham', name: 'North London derby', kind: 'derby', meetings: [{ home: true, gf: 2, ga: 1, played: true, goals: 1 }, { home: false, gf: 0, ga: 0, played: true, goals: 0 }] }] })]);
    const before = JSON.stringify(career), v = render(draw(career));
    expect(v.container.querySelector('[data-career-derbies]')).toHaveTextContent('Derbies: 2 played, 1 W 1 D 0 L, 1 goal');
    const next = restore('ST', [...career.seasons, season(2028, { apps: 8, goals: 3, assists: 2, leagueTitle: true })]);
    v.rerender(draw(next));
    expect(cells(v.container)).toEqual({ Apps: '38', Goals: '15', Assists: '10', Trophies: '1' }); absentEstimates(v.container);
    expect(v.container.querySelector('[data-career-derbies]')).toHaveTextContent('Derbies: 2 played, 1 W 1 D 0 L, 1 goal');
    expect(JSON.stringify(career)).toBe(before); expect(Storage.prototype.setItem).not.toHaveBeenCalled(); expect(Math.random).not.toHaveBeenCalled();
  });

  it('retains the independent saved totals and unknown season baseline without the career card', () => {
    const career = restore('CB'), before = JSON.stringify(career);
    expect(getCareerTotals(career.seasons)).toEqual({ apps: 62, goals: 31, assists: 19, cleanSheets: 17, yellowCards: 9, redCards: 1,
      leagueTitles: 1, domesticCups: 1, championsLeagues: 1, worldCups: 1, ballonDors: 1, continentalCups: 1, clubCups: 1 });
    const legacy = restore('CB', [season(2027, { ovr: undefined, cleanSheets: 0 }), season(2028)]);
    expect(soccerRatingRows(legacy.seasons, 'CB').map(row => row.stats.find(stat => stat.short === 'CS')?.value)).toEqual([null, 5]);
    expect(JSON.stringify(career)).toBe(before); expect(Math.random).not.toHaveBeenCalled(); expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });
});
