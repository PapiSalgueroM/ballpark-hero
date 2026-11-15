import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NFL_MISSED_PLAYOFFS, NFL_PLAYOFF_RESULTS, simSeason, type CareerState } from '@/lib/nflMyCareer';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NFL_CAREER_SPORT;
const teamQuality = 75;
const open = () => render(<MemoryRouter><NflMyCareerBoard /></MemoryRouter>);

function fixture(era: string, ovr: number) {
  const c = sport.startCareer('Fixture Quarterback', 'QB', sport.create.archetypes.QB[0], keyedRng(era), null, era);
  const { line } = simSeason(c, teamQuality, () => 0.8);
  sport.progress(c, keyedRng('first winter'), line.seasonRating);
  delete c.rival;
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter' as const, ovr, pot: ovr, health: 100, contractYears: 3, purchased: [] };
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NFL impact on team strength', () => {
  it.each([
    { name: 'modern full schedule', era: 'now', ovr: 96, draws: [0.8], tail: 0.7, games: 17, seasonLen: 17, result: NFL_PLAYOFF_RESULTS[0] },
    { name: 'throwback full schedule', era: 'y2005', ovr: 96, draws: [0.8], tail: 0.7, games: 16, seasonLen: 16, result: NFL_PLAYOFF_RESULTS[0] },
    { name: 'elite starter hurt', era: 'now', ovr: 96, draws: [0.8, 0, 0.6], tail: 0.7, games: 10, seasonLen: 17, result: NFL_MISSED_PLAYOFFS },
    { name: 'below-average player benched', era: 'now', ovr: 68, draws: [0.8, ...Array<number>(8).fill(0.7), 0.3], tail: 0.7, games: 5, seasonLen: 17, result: NFL_PLAYOFF_RESULTS[0] },
    { name: 'backup stays below the roster-only playoff threshold', era: 'now', ovr: 68, draws: [0.8], tail: 0.35, games: 4, seasonLen: 17, result: NFL_MISSED_PLAYOFFS },
  ])('plays the $name fixture through the season hub', ({ era, ovr, draws, tail, games, seasonLen, result }) => {
    const c = fixture(era, ovr);
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality, coach: null }));
    const view = open();
    const rng = vi.spyOn(Math, 'random').mockReturnValue(tail);
    for (const draw of draws) rng.mockReturnValueOnce(draw);
    fireEvent.click(view.getByRole('button', { name: 'Play the ' + c.year + ' season' }));

    const final = localStorage.getItem(sport.saveKey)!;
    const after = JSON.parse(final).c as CareerState;
    expect(after.seasons.at(-1)).toMatchObject({ year: c.year, games, teamResult: result });
    expect(after.seasons.slice(0, -1)).toEqual(c.seasons);
    const note = view.queryByText(`You played ${games} of ${seasonLen} regular-season games. Your rating had ${Math.round(games / seasonLen * 100)}% of its full-season effect on the team.`);
    if (games < seasonLen) expect(note).toBeInTheDocument();
    else expect(note).toBeNull();
    view.unmount();

    open();
    expect(localStorage.getItem(sport.saveKey)).toBe(final);
  });
});
