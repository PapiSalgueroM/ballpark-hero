import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { nbaSeasonGames, setNbaRestPlan, simNbaSeason, type NbaCareerState } from '@/lib/nbaMyCareer';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NBA_CAREER_SPORT;
const open = () => render(<MemoryRouter><NbaMyCareerBoard /></MemoryRouter>);
const restSelect = (view: ReturnType<typeof open>) => within(view.container).getByRole('combobox', { name: /Rest plan for this season/ });
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as NbaCareerState;
const play = (view: ReturnType<typeof open>, year: number) => within(view.container).getByRole('button', { name: 'Play the ' + year + ' season' });

function career(era = 'now', year?: number): NbaCareerState {
  const c = sport.startCareer('Fixture Guard', 'PG', sport.create.archetypes.PG[0], keyedRng(era), null, era);
  if (year != null) c.year = year - 1;
  const { line } = simNbaSeason(c, 76, () => 0.8);
  sport.progress(c, keyedRng('first winter'), line.seasonRating);
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter', ovr: 89, pot: 94, health: 100, contractYears: 3 };
}

function install(c: NbaCareerState) {
  const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 76, coach: null });
  localStorage.setItem(sport.saveKey, bytes);
  return bytes;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NBA scheduled rest', () => {
  it.each([['now', undefined, 8], ['y2004', 2011, 6]] as const)('plays the saved plan on the %s slate', (era, year, count) => {
    const c = career(era, year);
    const original = install(c);
    const view = open();
    expect(restSelect(view)).toHaveValue('usual');
    fireEvent.change(restSelect(view), { target: { value: 'rest' } });
    const saved = localStorage.getItem(sport.saveKey);
    expect(saved).not.toBe(original);
    expect(read()).toMatchObject({ restPlan: { year: c.year, team: c.team } });
    view.unmount();

    const loaded = open();
    expect(restSelect(loaded)).toHaveValue('rest');
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    fireEvent.click(play(loaded, c.year));
    const after = read(), line = after.seasons.at(-1)!;
    expect(line).toMatchObject({ restGames: count, games: nbaSeasonGames(c.year) - count });
    expect(after).toMatchObject({ seasons: [c.seasons[0], line] });
    expect('restPlan' in after).toBe(false);
    expect(after.archetype).toEqual(c.archetype);
    expect(sport.reviewStats(line, 'PG').regular).toContainEqual({ label: 'Rest plan', value: count + ' planned games' });
  });

  it('lowers the injury threshold and also subtracts planned absences when hurt', () => {
    const first = career();
    const c = { ...first, purchased: [], archetype: { ...first.archetype, durability: 0.6 } };
    const playWith = (draw: number, rest: boolean) => {
      const state = setNbaRestPlan(structuredClone(c), rest);
      const result = simNbaSeason(state, 76, () => draw);
      return { ...result, health: state.health };
    };
    const slate = nbaSeasonGames(c.year);
    const usual = playWith(0.15, false);
    const rested = playWith(0.15, true);
    expect(usual.line.games).toBe(slate - 13);
    expect(usual.health).toBe(93);
    expect(rested.line).toMatchObject({ games: slate - 4 - 8, restGames: 8 });
    expect(rested.health).toBe(100);

    const hurt = playWith(0.139, true);
    expect(hurt.line).toMatchObject({ games: slate - 12 - 8, restGames: 8 });
    expect(hurt.health).toBe(93);
  });

  it.each([false, true])('protects a plan and its completed season from a stale tab (benched: %s)', benched => {
    const firstCareer = career();
    const c = benched ? { ...firstCareer, ovr: 63 } : firstCareer;
    install(c);
    const first = open(), stale = open(), later = open();
    fireEvent.change(restSelect(first), { target: { value: 'rest' } });
    const saved = localStorage.getItem(sport.saveKey);
    fireEvent.click(play(stale, c.year));
    expect(restSelect(stale)).toHaveValue('rest');
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);

    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    fireEvent.click(play(first, c.year));
    const finished = localStorage.getItem(sport.saveKey);
    const line = read().seasons.at(-1);
    expect(line?.year).toBe(c.year);
    expect(line?.restGames).toBe(benched ? undefined : 8);
    expect('restPlan' in read()).toBe(false);
    fireEvent.click(play(later, c.year));
    expect(within(later.container).getByText(/Your career changed in another tab/)).toBeVisible();
    expect(play(later, c.year)).toBeDisabled();
    expect(localStorage.getItem(sport.saveKey)).toBe(finished);
  });
});
