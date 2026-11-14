import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { simNhlSeason, type NhlCareerState } from '@/lib/nhlMyCareer';
import { nhlHeadlinesFor } from '@/lib/nhlCareerLoop';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const sport = NHL_CAREER_SPORT;
const open = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as NhlCareerState;
const workload = (view: ReturnType<typeof open>) => within(view.container).getByRole('combobox', { name: /Goalie workload for this season/ });
function career() {
  const c = sport.startCareer('Fixture Starter', 'G', sport.create.archetypes.G[0], keyedRng('goalie career'), defaultAppearance(), 'now');
  return { ...c, role: 'starter' as const, year: 2028, team: 'TOR', ovr: 88, pot: 93, health: 100, contractYears: 3 };
}
function install(c: NhlCareerState) {
  const bytes = JSON.stringify({ c, phase: 'season', teamQuality: 76, coach: null });
  localStorage.setItem(sport.saveKey, bytes);
  return bytes;
}
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NHL goalie tandem starts', () => {
  it('restores and plays a starting goalie tandem from the season hub', () => {
    const before = career();
    const initial = install(before);
    const view = open();
    expect(workload(view)).toHaveValue('normal');
    fireEvent.change(workload(view), { target: { value: 'tandem' } });
    const held = localStorage.getItem(sport.saveKey);
    expect(held).not.toBe(initial);
    expect(read().goalieTandem).toEqual({ year: before.year, team: before.team });
    view.unmount();

    const loaded = open();
    expect(workload(loaded)).toHaveValue('tandem');
    expect(localStorage.getItem(sport.saveKey)).toBe(held);
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    fireEvent.click(loaded.getByRole('button', { name: 'Play the 2028 season' }));
    const after = read(), line = after.seasons.at(-1)!;
    expect(line.games).toBeLessThan(58);
    expect(line.tandemStarts).toBe(line.games);
    expect(after.goalieTandem).toBeUndefined();
    expect(after.role).toBe('starter');
    expect(sport.reviewStats(line, 'G').regular).toEqual(expect.arrayContaining([
      { label: 'Goalie workload', value: 'Shared crease' },
      expect.objectContaining({ label: 'Planned starts', value: String(line.games) }),
    ]));
  });

  it('pairs the same season roll and uses lighter injury risk only for a matching starter choice', () => {
    const before = { ...career(), health: 70, archetype: { ...career().archetype, durability: 1 } };
    const roll = (c: NhlCareerState, riskDraw: number) => {
      const rng = [0.9, riskDraw, 0.4];
      return simNhlSeason(structuredClone(c), 76, () => rng.shift() ?? 0.8).line;
    };
    const plan = { year: before.year, team: before.team };
    const normal = roll(before, 0.11);
    const tandem = roll({ ...before, goalieTandem: plan }, 0.11);
    expect(normal.games).toBeLessThan(46);
    expect(tandem.games).toBe(tandem.tandemStarts);
    expect(tandem.games).toBeGreaterThan(normal.games);
    expect(nhlHeadlinesFor(before, tandem).some(line => /injury|injur|missed.*games/i.test(line))).toBe(false);
    const injured = roll({ ...before, goalieTandem: plan }, 0.03);
    expect(injured.games).toBeLessThan(injured.tandemStarts!);
    expect(roll({ ...before, goalieTandem: { ...plan, team: 'BOS' } }, 0.11)).toEqual(normal);
    const backup = { ...before, role: 'backup' as const };
    expect(roll({ ...backup, goalieTandem: plan }, 0.11)).toEqual(roll(backup, 0.11));
  });

  it('carries planned and actual starts to the saved historical slate', () => {
    const before = { ...career(), year: 2012, eraId: 'y2006' };
    const full = simNhlSeason(structuredClone(before), 76, () => 0.8).line;
    const tandem = simNhlSeason({ ...structuredClone(before), goalieTandem: { year: before.year, team: before.team } }, 76, () => 0.8).line;
    expect(full.slate).toBe(48);
    expect(full.games).toBe(39);
    expect(tandem.tandemStarts).toBe(31);
    expect(tandem.games).toBe(31);
    expect(tandem.wins).toBeLessThan(full.wins!);
    expect(tandem.svpct).toBe(full.svpct);
    expect(sport.reviewStats(tandem, 'G').gamesLabel).toBe('Starts');
  });

  it('brings a newer tandem plan into a stale tab before starting the season', () => {
    install(career());
    const first = open(), stale = open();
    fireEvent.change(workload(first), { target: { value: 'tandem' } });
    const held = localStorage.getItem(sport.saveKey);
    fireEvent.click(within(stale.container).getByRole('button', { name: 'Play the 2028 season' }));
    expect(workload(stale)).toHaveValue('tandem');
    expect(localStorage.getItem(sport.saveKey)).toBe(held);
  });
});
