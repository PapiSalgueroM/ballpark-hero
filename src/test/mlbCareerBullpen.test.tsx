import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { mlbBullpenAssignment, mlbBullpenChoices, setMlbBullpenAssignment, simMlbSeason, type MlbCareerState } from '@/lib/mlbMyCareer';
import { keyedRng } from '@/lib/keyedRng';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = MLB_CAREER_SPORT;
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!);
const open = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
function career(era = 'now', closer = false) {
  const build = sport.create.archetypes.RP.find(a => (a.id === 'closer') === closer)!;
  const c = sport.startCareer('Fixture Reliever', 'RP', build, keyedRng(era), defaultAppearance(), era);
  const { line } = simMlbSeason(c, 75, keyedRng('first baseball season'));
  sport.progress(c, keyedRng('first winter'), line.seasonRating);
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, ovr: 82, pot: 92, contractYears: 3, morale: 72 };
}
function install(c: MlbCareerState) {
  const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 75, coach: null });
  localStorage.setItem(sport.saveKey, bytes);
  return bytes;
}
const selectRole = (view: ReturnType<typeof open>) => within(view.container).getByRole('combobox', { name: /Bullpen role for this season/ });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('MLB bullpen assignments', () => {
  it.each([['now', false, 'closer'], ['y2004', true, 'setup']] as const)('saves and plays the %s bullpen choice', (era, closer, role) => {
    const before = career(era, closer);
    const initial = install(before);
    const view = open();
    expect(selectRole(view)).toHaveValue('usual');
    fireEvent.change(selectRole(view), { target: { value: role } });
    const selected = localStorage.getItem(sport.saveKey);
    const saved = read().c as MlbCareerState;
    expect(selected).not.toBe(initial);
    expect(saved.bullpenAssignment).toEqual({ year: before.year, team: before.team, role });
    expect(saved.archetype).toEqual(before.archetype);
    view.unmount();

    const loaded = open();
    expect(selectRole(loaded)).toHaveValue(role);
    expect(localStorage.getItem(sport.saveKey)).toBe(selected);
    const rng = keyedRng('final bullpen season');
    vi.spyOn(Math, 'random').mockImplementation(rng);
    fireEvent.click(loaded.getByRole('button', { name: 'Play the ' + before.year + ' season' }));
    const after = read().c as MlbCareerState;
    const line = after.seasons.at(-1)!;
    expect(line.bullpenRole).toBe(role);
    if (role === 'closer') expect(line.saves).toBeGreaterThan(line.holds!);
    else expect(line.holds).toBeGreaterThan(line.saves!);
    expect(after.bullpenAssignment).toBeUndefined();
    expect(after.archetype).toEqual(before.archetype);
    expect(after.seasons.slice(0, -1)).toEqual(before.seasons);
  });

  it('keeps existing stats and draw order unless this exact team and season hold the choice', () => {
    const source = career();
    const seeded = (c: MlbCareerState) => {
      const copy = structuredClone(c);
      let draws = 0;
      const rng = keyedRng('paired bullpen runs');
      const result = simMlbSeason(copy, 75, () => { draws++; return rng(); }, true);
      return { ...result, draws };
    };
    for (const candidate of [{ year: source.year + 1, team: source.team }, { year: source.year, team: 'other' }]) {
      expect(seeded({ ...source, bullpenAssignment: { ...candidate, role: 'closer' } })).toEqual(seeded(source));
    }
    const assigned = setMlbBullpenAssignment(source, 'closer');
    const changed = seeded(assigned);
    const baseline = seeded(source);
    expect(changed.line).toMatchObject({ bullpenRole: 'closer', era: baseline.line.era, so: baseline.line.so, games: baseline.line.games });
    expect(changed.line.saves).toBeGreaterThan(baseline.line.saves!);
    expect(changed.line.holds).toBeLessThan(baseline.line.holds!);
    expect(mlbBullpenAssignment(setMlbBullpenAssignment(assigned, 'usual'))).toBeNull();
    expect(mlbBullpenChoices({ ...source, ovr: 79 })).not.toContain('closer');
    expect(mlbBullpenChoices({ ...source, pos: 'SP' })).toEqual([]);
    expect(mlbBullpenChoices({ ...source, seasons: [] })).toEqual([]);
  });

  it('refuses to play a stale tab over a newly saved assignment', () => {
    const before = career();
    install(before);
    const first = open(), stale = open();
    fireEvent.change(selectRole(first), { target: { value: 'closer' } });
    const held = localStorage.getItem(sport.saveKey);
    fireEvent.click(within(stale.container).getByRole('button', { name: 'Play the ' + before.year + ' season' }));
    expect(selectRole(stale)).toHaveValue('closer');
    expect(localStorage.getItem(sport.saveKey)).toBe(held);
  });
});
