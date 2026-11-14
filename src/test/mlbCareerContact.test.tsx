import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import { MLB_CAREER_SPORT as sport } from '@/lib/mlbCareerSport';
import {
  MLB_ARCHETYPES, mlbContactAvailable, setMlbContactPlan, simMlbSeason, startMlbCareer,
  type MlbCareerPos, type MlbCareerState, type MlbSeasonLine,
} from '@/lib/mlbMyCareer';
import { mlbHitterTotals } from '@/lib/mlbHitterTotals';
import { MLB_SEASON } from '@/lib/season/mlb';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import { deriveSeasonOrWhy, disagreements } from '@/lib/season/core';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

function fixture(era: 'now' | 'y2004', pos: MlbCareerPos, year: number): MlbCareerState {
  const c = startMlbCareer('Fixture Bat', pos, MLB_ARCHETYPES[pos][0], keyedRng('fixture:' + era + pos), undefined, era);
  simMlbSeason(c, 77, () => 0.78, true);
  c.year = year; c.team = 'DET'; c.role = 'starter'; c.ovr = 88; c.pot = 94; c.health = 100; c.contractYears = 3;
  delete c.pendingRivalryEvent; delete c.pendingRivalryChoice;
  return c;
}

const play = (c: MlbCareerState, rng: () => number) => simMlbSeason(c, 77, rng, true).line;
const option = () => screen.getByRole('combobox', { name: /Batting approach for this season/ });
const mounted = () => render(<MemoryRouter><UsCareerBoard sport={sport} inSeasonRating /></MemoryRouter>);
const read = () => JSON.parse(localStorage.getItem(sport.saveKey)!).c as MlbCareerState;

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('MLB My Career batting approach', () => {
  it.each([
    ['now', 2027, 162, 5], ['y2004', 2005, 162, 5], ['y2004', 2020, 58, 2],
  ] as const)('adds actual hits and trades home runs in %s %d', (era, year, slate, cap) => {
    let pairs = 0, changed = 0;
    for (const pos of ['SS', 'DH'] as const) {
      for (let i = 0; i < 80; i++) {
        const seed = 'matched batting:' + i;
        const c = fixture(era, pos, year);
        const a = keyedRng(seed), b = keyedRng(seed);
        const usual = play(structuredClone(c), a);
        const shorter = play(setMlbContactPlan(structuredClone(c), true), b);
        expect(a()).toBe(b());
        expect(usual.slate ?? 162).toBe(slate);
        expect(shorter.games).toBe(usual.games);
        expect(shorter.seasonRating).toEqual(usual.seasonRating);
        expect(shorter.teamResult).toBe(usual.teamResult);
        expect(shorter.poLine).toBe(usual.poLine);
        if (shorter.contactApproach) {
          const original = mlbHitterTotals(usual.games, usual.avg!, usual.hr! + usual.doubles!, Math.round(usual.games * 3.75))!;
          expect(shorter.ab).toBe(original.ab);
          expect(shorter.hits).toBeGreaterThan(original.h);
          expect(shorter.avg).toBe(Number((shorter.hits! / shorter.ab!).toFixed(3)));
          expect(shorter.avg).toBeGreaterThan(usual.avg!);
          expect(shorter.avg).toBeLessThanOrEqual(0.365);
          expect(shorter.obp).toBeGreaterThan(usual.obp!);
          expect(usual.hr! - shorter.hr!).toBeGreaterThan(0);
          expect(usual.hr! - shorter.hr!).toBeLessThanOrEqual(cap);
          expect(shorter.rbi).toBeLessThan(usual.rbi!);
          changed++;
        }
        pairs++;
      }
    }
    expect(pairs).toBe(160);
    expect(changed).toBeGreaterThan(140);
  });

  it.each([['now', 2027], ['y2004', 2005]] as const)('reconstructs the exact saved hits and at-bats in %s %d', (era, year) => {
    const c = fixture(era, 'SS', year);
    const line = play(setMlbContactPlan(c, true), () => 0.78);
    expect(line.contactApproach).toBe(true);
    const row = line as unknown as UsRow;
    const prep = buildUsSeason(MLB_SEASON, c, row, sport.teamLabelOf);
    if (prep.ok === false) throw new Error(prep.line);
    const rebuilt = deriveSeasonOrWhy(prep.sport, row, prep.ctx);
    if (typeof rebuilt === 'string') throw new Error(rebuilt);
    expect(disagreements(prep.sport, row, prep.ctx, rebuilt)).toEqual([]);
    const sum = (key: string) => rebuilt.games.reduce((total, g) => total + (g.line[key] ?? 0), 0);
    expect([sum('ab'), sum('h'), sum('hr')]).toEqual([line.ab, line.hits, line.hr]);
  });

  it('records the short-season hits while keeping the existing Season Center hold', () => {
    const c = fixture('y2004', 'SS', 2020);
    const line = play(setMlbContactPlan(c, true), () => 0.78);
    expect(line.contactApproach).toBe(true);
    expect(buildUsSeason(MLB_SEASON, c, line as unknown as UsRow, sport.teamLabelOf)).toMatchObject({
      ok: false, line: expect.stringContaining('your club finished on 58 games'),
    });
  });

  it('keeps pitchers, bench players, rookies and unsigned hitters off the plan', () => {
    const c = fixture('now', 'DH', 2027), pitcher = fixture('now', 'RP', 2027);
    for (const status of [pitcher, { ...c, role: 'backup' as const }, { ...c, seasons: [] }, { ...c, contractYears: 0 }]) {
      expect(mlbContactAvailable(status)).toBe(false);
      expect(setMlbContactPlan(status, true)).toBe(status);
    }
    const a = play(structuredClone(pitcher), keyedRng('pitcher'));
    const b = play({ ...pitcher, contactPlan: { year: pitcher.year, team: pitcher.team } }, keyedRng('pitcher'));
    expect(b).toEqual(a);
  });

  it('restores a chosen plan, consumes it once and reports the actual stats', () => {
    const c = fixture('now', 'DH', 2027);
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'season', teamQuality: 77, coach: null }));
    let view = mounted();
    expect(option()).toHaveValue('usual');
    fireEvent.change(option(), { target: { value: 'contact' } });
    expect(read().contactPlan).toEqual({ year: 2027, team: 'DET' });
    const signed = localStorage.getItem(sport.saveKey);
    view.unmount();
    view = mounted();
    expect(option()).toHaveValue('contact');
    expect(localStorage.getItem(sport.saveKey)).toBe(signed);
    vi.spyOn(Math, 'random').mockReturnValue(0.78);
    fireEvent.click(screen.getByRole('button', { name: 'Play the 2027 season' }));
    const career = read(), line = career.seasons.at(-1) as MlbSeasonLine;
    expect(career.contactPlan).toBeUndefined();
    expect(line.contactApproach).toBe(true);
    const review = sport.reviewStats(line, 'DH');
    expect(review.regular).toContainEqual({ label: 'Batting approach', value: 'Shorter swing' });
    expect(review.regular).toContainEqual(expect.objectContaining({ label: 'Hits', value: String(line.hits) }));
    expect(review.regular).toContainEqual(expect.objectContaining({ label: 'At-bats', value: String(line.ab) }));
  });
});
