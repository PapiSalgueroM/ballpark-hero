import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { nflSeasonScore } from '@/lib/careerAwards';
import { keyedRng } from '@/lib/keyedRng';
import { NFL_CAREER_SPORT as sport } from '@/lib/nflCareerSport';
import { ARCHETYPES, nflQbRunAvailable, nflQbRunActive, nflSeasonLength, nflStatLineFor, setNflQbRun, simSeason, type CareerState } from '@/lib/nflMyCareer';
import { deriveSeasonOrWhy, disagreements, soFar } from '@/lib/season/core';
import { NFL_SEASON } from '@/lib/season/nfl';
import { buildUsSeason, type UsRow } from '@/lib/season/us';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

function fixture(era = 'now') {
  const c = sport.startCareer('Fixture Dual Threat', 'QB', sport.create.archetypes.QB[2], keyedRng(era), null, era);
  const { line } = simSeason(c, 76, () => 0.8);
  sport.progress(c, keyedRng('first winter'), line.seasonRating);
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
  return { ...c, role: 'starter' as const, ovr: 89, pot: 94, health: 100, contractYears: 3 };
}

const mount = () => render(<MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter>);
const option = (view: ReturnType<typeof mount>) => within(view.container).getByRole('combobox', { name: /Quarterback plan for this season/ });
const install = (c: CareerState) => localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality: 76, coach: null }));
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as CareerState;

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NFL designed quarterback runs', () => {
  it('moves yards and touchdowns to rushing without increasing total production or draws', () => {
    const play = (games: number, form: number, seed: number, designedRuns: boolean) => {
      const random = keyedRng(`quarterback workload ${seed}`);
      let draws = 0;
      const line = nflStatLineFor({ pos: 'QB', form, games, designedRuns }, () => { draws++; return random(); });
      return { line, draws };
    };
    let shifted = 0, fewerInts = 0;
    for (const games of [4, 8, 16, 17]) for (let seed = 0; seed < 120; seed++) {
      const form = 61 + seed % 44;
      const pocket = play(games, form, seed, false), runner = play(games, form, seed, true);
      expect(pocket.draws).toBe(3);
      expect(runner.draws).toBe(pocket.draws);
      expect(runner.line.rushYds ?? 0).toBeGreaterThan(0);
      expect(runner.line.rushYds).toBeLessThanOrEqual(35 * games);
      expect(runner.line.rushTd).toBeLessThanOrEqual(Math.floor(0.45 * games));
      expect(runner.line.passYds! + runner.line.rushYds!).toBe(pocket.line.passYds);
      expect(runner.line.passTd! + runner.line.rushTd!).toBe(pocket.line.passTd);
      expect(runner.line.ints).toBeLessThanOrEqual(pocket.line.ints!);
      expect(nflSeasonScore('QB', { games, ...runner.line }) - nflSeasonScore('QB', { games, ...pocket.line })).toBeCloseTo(pocket.line.ints! - runner.line.ints!);
      shifted += Number(runner.line.rushTd! > 0);
      fewerInts += Number(runner.line.ints! < pocket.line.ints!);
    }
    expect(shifted).toBeGreaterThan(390);
    expect(fewerInts).toBeGreaterThan(310);
  });

  it('applies exact wear, consumes the season plan and retains the team and playoff simulation', () => {
    const c = fixture();
    const planned = setNflQbRun(c, true);
    expect(nflQbRunActive(planned)).toBe(true);
    expect(setNflQbRun(planned, false)).toEqual(c);
    const a = structuredClone(c), b = structuredClone(planned);
    const healthyA = simSeason(a, 86, () => .3, true);
    const healthyB = simSeason(b, 86, () => .3, true);
    expect(healthyB.line.qbRunPackage).toEqual({ healthCost: 4 });
    expect(b.health).toBe(a.health - 4);
    expect(b.qbRunPlan).toBeUndefined();
    expect(healthyB.line).toMatchObject({
      teamResult: healthyA.line.teamResult, poLine: healthyA.line.poLine,
      games: healthyA.line.games, seasonRating: healthyA.line.seasonRating,
    });
    expect(a.seasons[0]).toEqual(b.seasons[0]);
    expect(healthyB.notes.join(' ')).toMatch(/designed runs.*lost 4 health points/i);
    const run = (state: CareerState) => simSeason(structuredClone(state), 76, () => 0.8, true);
    expect(run({ ...c, qbRunPlan: { year: c.year + 1, team: c.team } })).toEqual(run(c));
    expect(run({ ...c, qbRunPlan: { year: c.year, team: 'different' } })).toEqual(run(c));
    const backup = { ...planned, role: 'backup' as const };
    const regularBackup = run({ ...backup, qbRunPlan: undefined });
    expect(run(backup)).toEqual({
      line: { ...regularBackup.line, qbRunPackage: { unavailable: true } },
      notes: ['Camp put you in the backup role, so designed runs did not apply.', ...regularBackup.notes],
    });
    for (const unavailable of [backup, { ...c, pos: 'RB' as const }, { ...c, archetype: ARCHETYPES.QB[0] },
      { ...c, retired: true }, { ...c, suspendedSeasons: 1 }, { ...c, contractYears: 0 }, { ...c, seasons: [] }]) {
      expect(nflQbRunAvailable(unavailable)).toBe(false);
      expect(setNflQbRun(unavailable, true)).toBe(unavailable);
    }
  });

  it('reads the precise rushing production in the saved game reports and running totals', () => {
    const c = setNflQbRun(fixture(), true);
    const { line } = simSeason(c, 83, () => 0.8, true);
    const row = line as unknown as UsRow;
    const prepared = buildUsSeason(NFL_SEASON, c, row, sport.teamLabelOf);
    if (prepared.ok === false) throw new Error(prepared.line);
    const rebuilt = deriveSeasonOrWhy(prepared.sport, row, prepared.ctx);
    if (typeof rebuilt === 'string') throw new Error(rebuilt);
    expect(disagreements(prepared.sport, row, prepared.ctx, rebuilt)).toEqual([]);
    expect(soFar(rebuilt, rebuilt.games.length)).toMatchObject({ rushYds: line.rushYds, rushTd: line.rushTd });
    for (const game of rebuilt.games) {
      const own = game.events.filter(e => e.mine && (e.kind === 'td-rush' || e.kind === 'td-pass'));
      expect(own.filter(e => e.kind === 'td-rush')).toHaveLength(game.line.rushTd ?? 0);
      expect(own.reduce((pts, e) => pts + e.pts!, 0)).toBeLessThanOrEqual(game.us);
    }
    const scoredOnFoot = rebuilt.games.find(g => (g.line.rushTd ?? 0) > 0)!;
    expect(NFL_SEASON.view.lineOf(scoredOnFoot, 'QB')).toContain(`${scoredOnFoot.line.rushTd} RUSH TD`);
    expect(NFL_SEASON.view.soFar(soFar(rebuilt, rebuilt.games.length), 'QB')).toContainEqual(['Rush TD', String(line.rushTd)]);
    const old = c.seasons[0];
    expect(old.rushYds).toBeUndefined();
    expect(sport.reviewStats(old, 'QB').regular.map(s => s.label)).not.toContain('Rushing yards');
  });

  it('keeps the chosen plan through reload and records it once on the saved 16-game season', () => {
    const c = fixture('y2005');
    install(c);
    let view = mount();
    expect(option(view)).toHaveValue('usual');
    fireEvent.change(option(view), { target: { value: 'runs' } });
    const booked = localStorage.getItem(sport.saveKey);
    expect(read().qbRunPlan).toEqual({ year: c.year, team: c.team });
    view.unmount();
    view = mount();
    expect(option(view)).toHaveValue('runs');
    expect(localStorage.getItem(sport.saveKey)).toBe(booked);
    vi.spyOn(Math, 'random').mockReturnValue(.8);
    fireEvent.click(view.getByRole('button', { name: `Play the ${c.year} season` }));
    const saved = read(), line = saved.seasons.at(-1)!;
    expect(line).toMatchObject({ games: nflSeasonLength(c.year), qbRunPackage: { healthCost: 4 } });
    expect(line.games).toBe(16);
    expect(saved.qbRunPlan).toBeUndefined();
    expect(saved.seasons.slice(0, -1)).toEqual(c.seasons);
    expect(sport.reviewStats(line, 'QB').regular).toContainEqual({ label: 'Quarterback plan', value: 'Designed runs' });
  });

  it('protects the pending and completed decision across two tabs', () => {
    const c = fixture();
    install(c);
    const first = mount(), stale = mount();
    const play = (view: ReturnType<typeof mount>) => within(view.container).getByRole('button', { name: `Play the ${c.year} season` });
    fireEvent.change(option(first), { target: { value: 'runs' } });
    const booked = localStorage.getItem(sport.saveKey);
    fireEvent.click(play(stale));
    expect(option(stale)).toHaveValue('runs');
    expect(localStorage.getItem(sport.saveKey)).toBe(booked);
    vi.spyOn(Math, 'random').mockReturnValue(.8);
    fireEvent.click(play(first));
    const finished = localStorage.getItem(sport.saveKey);
    expect(read().seasons.at(-1)).toMatchObject({ year: c.year, qbRunPackage: { healthCost: 4 } });
    fireEvent.click(play(stale));
    expect(play(stale)).toBeDisabled();
    expect(localStorage.getItem(sport.saveKey)).toBe(finished);
  });
});
