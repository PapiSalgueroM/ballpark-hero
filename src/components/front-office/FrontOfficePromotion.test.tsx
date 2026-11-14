import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { capRoom, capUsed, cleanPracticeElevations, DEEP_GROUP_TARGET, initLeague, promoteFromPractice, runOffseason, setPracticeElevation, signPlayer, starterIds, withPracticeElevations, type GmPlayer, type GmTeamState, type LeagueState } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const seeded = (seed: number) => { let n = seed; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; };
const promote = (team: GmTeamState, id: string, cap?: unknown) =>
  (promoteFromPractice as unknown as (team: GmTeamState, id: string, cap?: unknown) => boolean)(team, id, cap);

function player(id: string, pos: GmPlayer['pos'], salary: number): GmPlayer {
  return { id, name: `Simulated promotion person ${id}`, pos, salary, years: 3, age: 26, ovr: 70, pot: 70, out: 0 };
}

function fixture(room = 0.1, dead = 0, count = 52) {
  const lg = initLeague(seeded(892), { depth: FO_DEPTH, userTeam: 'KC' });
  const positions = [...Object.entries(DEEP_GROUP_TARGET).flatMap(([pos, count]) => Array(count).fill(pos) as GmPlayer['pos'][]), 'QB' as const, 'DB' as const].slice(0, count);
  const salary = Math.floor((lg.cap - room) / positions.length * 10) / 10;
  const players = positions.map((pos, i) => player(`promotion-KC-${i}`, pos, salary));
  players[players.length - 1].salary = Math.round((lg.cap - room - salary * (players.length - 1)) * 10) / 10;
  const practice = [player('promotion-practice-1', 'QB', 18), player('promotion-practice-2', 'WR', 6)];
  practice[0].ovr = 95; practice[0].pot = 95;
  const t: GmTeamState = { abbr: 'KC', players, practice, rosterDepth: 2, defense: 70, wins: 0, losses: 0, picks: [1, 2, 3] };
  t.depth = Object.fromEntries(Object.keys(DEEP_GROUP_TARGET).map(pos => [pos, players.filter(p => p.pos === pos).map(p => p.id)]));
  if (dead) {
    t.players[0].salary -= dead;
    t.deadCap = [{ playerId: 'promotion-cut', name: 'Simulated departed person', amount: dead, seasonsLeft: 2 }];
  }
  lg.teams.KC = t;
  return { lg, t };
}

function save(lg: LeagueState) {
  localStorage.setItem(KEY, JSON.stringify({ league: lg, myTeam: 'KC', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
}
const read = () => JSON.parse(localStorage.getItem(KEY)!) as { league: LeagueState; myTeam: string; titles: number; seasonsPlayed: number };
function openPractice(lg: LeagueState) {
  save(lg); render(<FrontOfficeBoard />); fireEvent.click(screen.getByText('Roster'));
  fireEvent.click(document.querySelector('[data-roster-group="practice"]')!);
}
function row(id: string) { return document.querySelector(`[data-practice-row="${id}"]`) as HTMLElement; }

beforeEach(() => { localStorage.clear(); localStorage.setItem('promotion-sentinel', 'held'); vi.spyOn(Math, 'random').mockImplementation(seeded(42)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL practice promotion cap outcomes', () => {
  it('holds ordinary free-agent admission as an independent baseline', () => {
    const { lg, t } = fixture(), pool = [player('promotion-free-agent', 'QB', 18)], before = JSON.stringify({ t, pool });
    expect(signPlayer(t, pool, pool[0].id, lg.cap)).toBe(false); expect(JSON.stringify({ t, pool })).toBe(before);
    expect(capRoom(t, lg.cap)).toBe(0.1);
  });

  it('holds legacy, membership and roster capacity refusals as an independent baseline', () => {
    for (const mode of ['legacy', 'membership', 'full']) {
      const { lg, t } = fixture(40);
      if (mode === 'legacy') delete t.rosterDepth;
      if (mode === 'full') t.players.push(player('promotion-full', 'DB', 1));
      const before = JSON.stringify(t), id = mode === 'membership' ? 'foreign' : t.practice![0].id;
      expect(promote(t, id, lg.cap)).toBe(false); expect(JSON.stringify(t)).toBe(before);
    }
  });

  it.each([
    ['missing', undefined], ['null', null], ['NaN', NaN], ['infinity', Infinity], ['negative infinity', -Infinity],
    ['zero', 0], ['negative', -1], ['string', '301.2'], ['object', {}],
  ])('refuses invalid cap context %s without moving a player', (_label, cap) => {
    const { t } = fixture(40), before = JSON.stringify(t);
    expect(promote(t, t.practice![0].id, cap)).toBe(false); expect(JSON.stringify(t)).toBe(before);
  });

  it('refuses unaffordable promotion with raw team, depth and array identity held', () => {
    const { lg, t } = fixture(), before = JSON.stringify(t), active = t.players, practice = t.practice;
    expect(promote(t, t.practice![0].id, lg.cap)).toBe(false); expect(JSON.stringify(t)).toBe(before);
    expect(t.players).toBe(active); expect(t.practice).toBe(practice); expect(capUsed(t)).toBe(301.1);
  });

  it('counts dead money before deciding promotion affordability', () => {
    const { lg, t } = fixture(17, 2.5), before = JSON.stringify(t);
    expect(t.players.reduce((sum, p) => sum + p.salary, 0) + 18).toBeLessThan(lg.cap);
    expect(capRoom(t, lg.cap)).toBe(17); expect(promote(t, t.practice![0].id, lg.cap)).toBe(false);
    expect(JSON.stringify(t)).toBe(before);
  });

  it.each([20, 18])('keeps accepted promotion exact with %sM available and rejects replay', room => {
    const { lg, t } = fixture(room), before = clone(t), target = t.practice![0], random = vi.spyOn(Math, 'random');
    const expected = { ...before, players: [...before.players, clone(target)], practice: before.practice!.slice(1) };
    expect(promote(t, target.id, lg.cap)).toBe(true); expect(t).toEqual(expected); expect(t.players[t.players.length - 1]).toBe(target);
    expect(capRoom(t, lg.cap)).toBe(room - 18); expect(random).not.toHaveBeenCalled();
    const saved = JSON.stringify(t); expect(promote(t, target.id, lg.cap)).toBe(false); expect(JSON.stringify(t)).toBe(saved);
  });

  it('shows the real price and refusal while a rejected Board click leaves the save exact', () => {
    const { lg, t } = fixture(); openPractice(lg); const target = t.practice![0], item = row(target.id), button = within(item).getByRole('button', { name: 'Call up' });
    const before = localStorage.getItem(KEY); fireEvent.click(button); expect(localStorage.getItem(KEY)).toBe(before);
    expect(button).toBeDisabled(); expect(within(item).getByText(/\$18M/)).toBeVisible();
    expect(within(item).getByText('Need $17.9M more cap room to call him up.')).toBeVisible();
    expect(localStorage.getItem('promotion-sentinel')).toBe('held');
  });

  it('saves the exact affordable player and depth and restores that promotion once', () => {
    const { lg, t } = fixture(20), target = clone(t.practice![0]), expected = clone(lg);
    expected.teams.KC.players.push(clone(target)); expected.teams.KC.practice = expected.teams.KC.practice!.slice(1);
    openPractice(lg); const item = row(target.id), button = within(item).getByRole('button', { name: 'Call up' });
    expect(button).toBeEnabled(); expect(within(item).getByText(/\$18M/)).toBeVisible(); fireEvent.click(button);
    expect(read().league).toEqual(expected); expect(read().myTeam).toBe('KC'); expect(read().titles).toBe(0); expect(read().seasonsPlayed).toBe(0);
    const saved = localStorage.getItem(KEY); cleanup(); render(<FrontOfficeBoard />); expect(localStorage.getItem(KEY)).toBe(saved);
    fireEvent.click(screen.getByText('Roster')); fireEvent.click(document.querySelector('[data-roster-group="practice"]')!);
    expect(row(target.id)).toBeNull(); expect(read().league.teams.KC.players.filter(p => p.id === target.id)).toHaveLength(1);
    expect(read().league.teams.KC.depth).toEqual(t.depth); expect(localStorage.getItem('promotion-sentinel')).toBe('held');
  });

  it('updates every remaining call-up against the newly committed cap room', () => {
    const { lg, t } = fixture(20, 0, 51), first = t.practice![0], next = t.practice![1]; openPractice(lg);
    fireEvent.click(within(row(first.id)).getByRole('button', { name: 'Call up' }));
    const item = row(next.id), button = within(item).getByRole('button', { name: 'Call up' }), before = localStorage.getItem(KEY);
    fireEvent.click(button); expect(localStorage.getItem(KEY)).toBe(before); expect(button).toBeDisabled();
    expect(within(item).getByText('Need $4M more cap room to call him up.')).toBeVisible(); expect(capRoom(read().league.teams.KC, read().league.cap)).toBe(2);
  });

  it('shows the dead-money refusal through the actual restored Board', () => {
    const { lg, t } = fixture(17, 2.5); openPractice(lg); const item = row(t.practice![0].id), button = within(item).getByRole('button', { name: 'Call up' }), before = localStorage.getItem(KEY);
    fireEvent.click(button); expect(localStorage.getItem(KEY)).toBe(before); expect(button).toBeDisabled();
    expect(within(item).getByText('Need $1M more cap room to call him up.')).toBeVisible();
  });

  it.each([['null', null], ['negative', -1], ['string', '18'], ['NaN', NaN], ['infinity', Infinity]])('refuses invalid practice salary %s before mutation', (_label, salary) => {
    const { lg, t } = fixture(40); t.practice![0].salary = salary as number;
    const before = JSON.stringify(t), active = t.players, practice = t.practice;
    expect(promote(t, t.practice![0].id, lg.cap)).toBe(false); expect(JSON.stringify(t)).toBe(before);
    expect(t.players).toBe(active); expect(t.practice).toBe(practice);
  });

  it('refuses an unpriced practice player from an actual restored save', () => {
    const { lg, t } = fixture(40); t.practice![0].salary = null as unknown as number; openPractice(lg);
    const item = row(t.practice![0].id), button = within(item).getByRole('button', { name: 'Call up' }), before = localStorage.getItem(KEY);
    fireEvent.click(button); expect(localStorage.getItem(KEY)).toBe(before); expect(button).toBeDisabled();
    expect(within(item).getByText('His call-up salary is unavailable.')).toBeVisible();
    expect(within(item).getByText(/Salary unavailable/)).toBeVisible(); expect(within(item).queryByText(/\$nullM/)).toBeNull();
  });

  it('keeps a valid zero-cost call-up exact instead of inventing a price', () => {
    const { lg, t } = fixture(); t.practice![0].salary = 0;
    const before = clone(t), target = t.practice![0];
    expect(promote(t, target.id, lg.cap)).toBe(true);
    expect(t).toEqual({ ...before, players: [...before.players, clone(target)], practice: before.practice!.slice(1) });
    expect(capRoom(t, lg.cap)).toBe(0.1); expect(t.players[t.players.length - 1]).toBe(target);
  });

  it('plays a full-roster elevation for one week and keeps just the weekly charge', () => {
    const { lg, t } = fixture(20, 0, 53), target = t.practice![0];
    openPractice(lg);
    const item = row(target.id);
    expect(within(item).getByRole('button', { name: 'Call up' })).toBeDisabled();
    fireEvent.click(within(item).getByRole('button', { name: 'Elevate for Week 1' }));
    expect(read().league.teams.KC.players).toHaveLength(53);
    expect(capRoom(read().league.teams.KC, lg.cap)).toBe(18.9);
    cleanup();
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(document.querySelector('[data-roster-group="practice"]')!);
    expect(within(row(target.id)).getByRole('button', { name: 'Cancel elevation' })).toBeEnabled();
    fireEvent.click(screen.getByText('Hub'));
    fireEvent.click(screen.getByText('This week'));
    fireEvent.click(screen.getByRole('button', { name: 'Play Week 1' }));
    const next = read().league;
    expect(next.week).toBe(2);
    expect(next.teams.KC.players).toHaveLength(53);
    expect(next.teams.KC.practice?.find(p => p.id === target.id)).toMatchObject({ salary: 18, years: 3 });
    expect(capRoom(next.teams.KC, next.cap)).toBe(18.9);
    expect(next.stats?.lines.KC?.[target.id]?.[0]).toBe(target.name);
    fireEvent.click(screen.getByRole('button', { name: 'Play Week 2' }));
    expect(read().league.stats?.lines.KC?.[target.id]).toEqual(next.stats?.lines.KC?.[target.id]);
    expect(capRoom(read().league.teams.KC, lg.cap)).toBe(18.9);
  });

  it('limits two players per game and three games per player, and resets in the offseason', () => {
    const { lg, t } = fixture(40, 0, 53);
    const [target, second] = t.practice!;
    const third = player('promotion-practice-3', 'RB', 1.7);
    t.practice!.push(third);
    expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(true);
    expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(false);
    expect(setPracticeElevation(lg, 'KC', second.id, true)).toBe(true);
    expect(setPracticeElevation(lg, 'KC', third.id, true)).toBe(false);
    expect(setPracticeElevation(lg, 'KC', second.id, false)).toBe(true);
    expect(setPracticeElevation(lg, 'KC', third.id, true)).toBe(true);
    expect(starterIds(t).has(target.id)).toBe(false);
    withPracticeElevations(lg, 'KC', () => {
      expect(t.players).toHaveLength(55);
      expect(starterIds(t).has(target.id)).toBe(true);
    });
    for (lg.week = 2; lg.week <= 3; lg.week++) {
      expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(true);
      withPracticeElevations(lg, 'KC', () => expect(t.players).toHaveLength(54));
    }
    expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(false);
    expect(t.players).toHaveLength(53);
    expect(capRoom(t, lg.cap)).toBe(36.6);
    lg.week = 18;
    expect(setPracticeElevation(lg, 'KC', second.id, true)).toBe(false);
    runOffseason(lg, seeded(102), 'KC');
    expect(t.practiceElevations).toBeUndefined();
  });

  it('releases a canceled reservation and preserves a permanent promotion', () => {
    const { lg, t } = fixture(20, 0, 52), target = t.practice![0];
    expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(true);
    expect(promoteFromPractice(t, target.id, lg.cap)).toBe(false);
    expect(setPracticeElevation(lg, 'KC', target.id, false)).toBe(true);
    expect(capRoom(t, lg.cap)).toBe(20);
    expect(t.practiceElevations).toBeUndefined();
    expect(promoteFromPractice(t, target.id, lg.cap)).toBe(true);
    expect(t.players).toContain(target);
    expect(capRoom(t, lg.cap)).toBe(2);
  });

  it('refuses unaffordable or injured players and cancels an elevation if cap room is spent before kickoff', () => {
    const { lg, t } = fixture(1.1, 0, 53), [target, second] = t.practice!;
    second.out = 2;
    expect(setPracticeElevation(lg, 'KC', second.id, true)).toBe(false);
    expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(true);
    second.out = 0;
    expect(setPracticeElevation(lg, 'KC', second.id, true)).toBe(false);
    t.players[0].salary += 0.1;
    withPracticeElevations(lg, 'KC', () => expect(t.players).toHaveLength(53));
    expect(t.practiceElevations).toBeUndefined();
    expect(capRoom(t, lg.cap)).toBe(1);
  });

  it('holds an older save byte for byte and drops a mismatched reservation safely', () => {
    const { lg, t } = fixture(20, 0, 53), target = t.practice![0];
    const bytes = JSON.stringify(lg);
    cleanPracticeElevations(lg);
    expect(withPracticeElevations(lg, 'KC', () => t.players.length)).toBe(53);
    expect(JSON.stringify(lg)).toBe(bytes);
    expect(setPracticeElevation(lg, 'KC', target.id, true)).toBe(true);
    lg.week += 1;
    cleanPracticeElevations(lg);
    expect(t.practiceElevations).toBeUndefined();
    expect(capRoom(t, lg.cap)).toBe(20);
  });
});
