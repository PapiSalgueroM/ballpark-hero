import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { nflPassingDownActive, nflPassingDownAvailable, nflSeasonLength, nflStatLineFor, setNflPassingDown, simSeason, type CareerState, type SeasonLine } from '@/lib/nflMyCareer';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NFL_CAREER_SPORT;
const open = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const selectRole = (view: ReturnType<typeof open>) => within(view.container).getByRole('combobox', { name: /Backfield role for this season/ });
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as CareerState;
const yards = (line: Pick<SeasonLine, 'rushYds' | 'recYds'>) => (line.rushYds ?? 0) + (line.recYds ?? 0);

function career(era = 'now') {
  const c = sport.startCareer('Fixture Running Back', 'RB', sport.create.archetypes.RB[1], keyedRng(era), null, era);
  const { line } = simSeason(c, 76, () => 0.8);
  sport.progress(c, keyedRng('first winter'), line.seasonRating);
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter' as const, ovr: 89, pot: 94, health: 100, contractYears: 3 };
}

function install(c: CareerState) {
  const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 76, coach: null });
  localStorage.setItem(sport.saveKey, bytes);
  return bytes;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NFL passing-down role', () => {
  it.each(['now', 'y2005'])('plays the saved passing-down role on the %s slate', era => {
    const c = career(era);
    const initial = install(c);
    const view = open();
    expect(selectRole(view)).toHaveValue('usual');
    fireEvent.change(selectRole(view), { target: { value: 'passing' } });
    const saved = localStorage.getItem(sport.saveKey);
    expect(saved).not.toBe(initial);
    expect(read().passingDownPlan).toEqual({ year: c.year, team: c.team });
    view.unmount();

    const loaded = open();
    expect(selectRole(loaded)).toHaveValue('passing');
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    fireEvent.click(loaded.getByRole('button', { name: 'Play the ' + c.year + ' season' }));
    const after = read(), line = after.seasons.at(-1)!;
    expect(line).toMatchObject({ passingDownRole: true, games: nflSeasonLength(c.year) });
    expect(after.passingDownPlan).toBeUndefined();
    expect(after.seasons.slice(0, -1)).toEqual(c.seasons);
    expect(after.archetype).toEqual(c.archetype);
    expect(sport.reviewStats(line, 'RB').regular).toContainEqual({ label: 'Backfield role', value: 'Passing downs' });
  });

  it('converts bounded rushing production into receiving on identical four-draw lines', () => {
    let pairs = 0, shifted = 0;
    for (const games of [4, 8, 16, 17]) {
      for (let seed = 0; seed < 120; seed++) {
        const form = 58 + seed % 45;
        const make = (passingDown: boolean) => {
          const rng = keyedRng(`paired running back ${seed}`);
          let draws = 0;
          const line = nflStatLineFor({ form, pos: 'RB', games, passingDown }, () => { draws++; return rng(); });
          expect(draws).toBe(4);
          return line;
        };
        const normal = make(false), passing = make(true);
        const converted = normal.rushYds! - passing.rushYds!;
        expect(yards(passing)).toBe(yards(normal));
        expect(converted).toBeGreaterThanOrEqual(0);
        expect(converted).toBeLessThanOrEqual(Math.ceil(normal.rushYds! * 0.2));
        expect(passing.rec! - normal.rec!).toBeLessThanOrEqual(Math.floor(20 * games / 17));
        expect(passing.rushTd).toBeLessThanOrEqual(normal.rushTd!);
        if (converted) { shifted++; expect(passing.rec).toBeGreaterThan(normal.rec!); }
        pairs++;
      }
    }
    expect(pairs).toBe(480);
    expect(shifted).toBeGreaterThan(400);
  });

  it('lets only established signed starting backs select the role and refuses stale assignments', () => {
    const c = career();
    const plan = setNflPassingDown(c, true);
    const run = (state: CareerState) => simSeason(structuredClone(state), 76, keyedRng('paired season'), true);
    const baseline = run(c);
    expect(nflPassingDownActive(plan)).toBe(true);
    expect(setNflPassingDown(plan, false)).toEqual(c);
    expect(run(plan).line.rec).toBeGreaterThan(baseline.line.rec!);
    expect(run(plan).line.teamResult).toBe(baseline.line.teamResult);
    expect(run(plan).line.poLine).toBe(baseline.line.poLine);
    expect(run({ ...c, passingDownPlan: { year: c.year + 1, team: c.team } })).toEqual(baseline);
    expect(run({ ...c, passingDownPlan: { year: c.year, team: 'different' } })).toEqual(baseline);
    const backup = { ...plan, role: 'backup' as const };
    const benched = run(backup);
    expect(benched.line).toEqual(run({ ...backup, passingDownPlan: undefined }).line);
    expect(benched.notes).toContain('Camp put you in the backup role, so the passing-down plan did not apply.');
    for (const patch of [
      { pos: 'WR' as const }, { role: 'backup' as const }, { retired: true }, { suspendedSeasons: 1 },
      { contractYears: 0 }, { seasons: [] }, { seasons: [{ ...c.seasons[0], games: 0 }] },
    ]) {
      const unavailable = { ...c, ...patch };
      expect(nflPassingDownAvailable(unavailable)).toBe(false);
      expect(setNflPassingDown(unavailable, true)).toBe(unavailable);
    }
  });

  it('brings a newer role into a stale tab before it can play', () => {
    const c = career();
    install(c);
    const first = open(), stale = open();
    fireEvent.change(selectRole(first), { target: { value: 'passing' } });
    const saved = localStorage.getItem(sport.saveKey);
    fireEvent.click(within(stale.container).getByRole('button', { name: 'Play the ' + c.year + ' season' }));
    expect(selectRole(stale)).toHaveValue('passing');
    expect(localStorage.getItem(sport.saveKey)).toBe(saved);
    expect(read().seasons).toHaveLength(c.seasons.length);
  });
});
