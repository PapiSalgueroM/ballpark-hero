import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { simNbaSeason, type NbaCareerState } from '@/lib/nbaMyCareer';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NBA_CAREER_SPORT;
const open = () => render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('picks Finals MVP from the playoff performance without moving the title or old results', () => {
  const teamQuality = 88;
  const c = sport.startCareer('Fixture Guard', 'PG', sport.create.archetypes.PG[0], keyedRng('Finals Guard'), null, 'now');
  const { line: prior } = simNbaSeason(c, teamQuality, () => 0.8);
  sport.progress(c, keyedRng('first winter'), prior.seasonRating);
  delete c.rival;
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  Object.assign(c, { ovr: 92, pot: 92, role: 'starter', health: 100, age: 26, morale: 70, contractYears: 3 });
  const initial = JSON.stringify({ c, phase: 'season', teamQuality, coach: null });

  const play = (clutch: number) => {
    localStorage.setItem(sport.saveKey, initial);
    const view = open();
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    // Camp, appearance count, season form and stats, five title rolls, field, record, then playoff form.
    const draws = [0.8, 0.95, 0.8, 0.8, 0.25, 0.5, ...Array<number>(7).fill(0.5),
      ...Array<number>(5).fill(0), 0.5, 0.5, 0.5, 0.02, clutch, 0.5];
    for (const draw of draws) rng.mockReturnValueOnce(draw);
    fireEvent.click(view.getByRole('button', { name: 'Play the ' + c.year + ' season' }));

    const saved = localStorage.getItem(sport.saveKey)!;
    const after = JSON.parse(saved).c as NbaCareerState;
    const line = after.seasons.at(-1)!;
    expect(line.teamResult).toBe('WON THE NBA FINALS');
    expect(after.rings).toBe(c.rings + 1);
    expect(after.seasons.slice(0, -1)).toEqual([prior]);
    const showsAward = view.queryByText('🏆 FINALS MVP.') !== null;
    view.unmount();
    rng.mockRestore();
    const loaded = open();
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    loaded.unmount();
    return { line, showsAward, total: after.finalsMvps };
  };

  const strong = play(0);
  const weak = play(0.5);
  expect(strong.line.ppg).toBe(weak.line.ppg);
  expect(strong.line.poGames).toBe(weak.line.poGames);
  expect(strong.line.poPpg).toBeGreaterThan(weak.line.poPpg! + 12);
  expect(strong.line.awards).toContain('Finals MVP');
  expect(strong.total).toBe(c.finalsMvps + 1);
  expect(strong.showsAward).toBe(true);
  expect(weak.line.awards).not.toContain('Finals MVP');
  expect(weak.total).toBe(c.finalsMvps);
  expect(weak.showsAward).toBe(false);
});
