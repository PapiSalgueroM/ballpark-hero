import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlStarterOptions, nrlStarterSwaps, nrlUnavailable, NRL_ROLES, NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const bytes = JSON.stringify;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const roles = ['Five-eighth', 'Halfback', 'Prop 8', 'Prop 10'] as const;
const fresh = () => createNrlCareer('storm', 1, 2026);
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const timing = ({ season }: NrlCareerState) => ({ year: season.year, clubId: season.clubId, round: season.round });

function qualified() {
  const initial = fresh();
  const players = roles.map(role => initial.season.lineup[role]);
  let state = initial;
  players.forEach((playerId, index) => {
    state = reduceNrlCareer(state, { type: 'startPositionTraining', ...timing(state), playerId, role: roles[index ^ 1] });
    for (let round = 0; round < 4; round++) state = advance(state);
    expect(state.season.squad.find(player => player.id === playerId)?.secondaryRole).toBe(roles[index ^ 1]);
  });
  players.forEach((playerId, index) => {
    state = reduceNrlCareer(state, { type: 'selectStarter', role: roles[index], playerId });
    expect(state.season.lineup[roles[index]]).toBe(playerId);
  });
  const [kicker, backup, captain, vice] = players;
  state = reduceNrlCareer(state, { type: 'setKicker', playerId: kicker });
  state = reduceNrlCareer(state, { type: 'setBackupKicker', ...timing(state), playerId: backup });
  state = reduceNrlCareer(state, { type: 'setCaptain', ...timing(state), playerId: captain });
  return reduceNrlCareer(state, { type: 'setViceCaptain', ...timing(state), playerId: vice });
}

function open() {
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
  return view;
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL starter swaps', () => {
  it('offers both reciprocal pairs, applies only the named positions, and carries their duties into Quick and Live matches', () => {
    expect(nrlStarterSwaps(fresh().season)).toEqual([]);
    const initial = qualified();
    const { season } = initial;
    const pairs = nrlStarterSwaps(season);
    expect(pairs.map(({ fromRole, toRole }) => [fromRole, toRole])).toEqual([
      ['Five-eighth', 'Halfback'], ['Prop 8', 'Prop 10'],
    ]);
    const [swap, leadershipSwap] = pairs;
    const { fromRole, toRole, fromPlayerId, toPlayerId } = swap;
    expect(nrlStarterOptions(season, fromRole).map(player => player.id)).not.toContain(toPlayerId);
    expect(nrlStarterOptions(season, toRole).map(player => player.id)).not.toContain(fromPlayerId);
    const changed = reduceNrlCareer(initial, swap);
    expect(changed).toEqual({ ...initial, season: { ...season, lineup: { ...season.lineup, [fromRole]: toPlayerId, [toRole]: fromPlayerId } } });
    expect(changed.season.bench).toBe(season.bench);
    expect(changed.season.kickerId).toBe(fromPlayerId);
    expect(changed.season.backupKickerId).toBe(toPlayerId);
    expect(bytes(readNrlCareerSave(bytes(changed)))).toBe(bytes(changed));
    const leadership = reduceNrlCareer(changed, leadershipSwap);
    expect(leadership.season.lineup[leadershipSwap.toRole]).toBe(season.captainId);
    expect(leadership.season.lineup[leadershipSwap.fromRole]).toBe(season.viceCaptainId);
    expect(leadership.season.captainId).toBe(season.captainId);
    expect(leadership.season.viceCaptainId).toBe(season.viceCaptainId);

    const quick = advance(leadership);
    const live = reduceNrlCareer(leadership, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    const liveResult = reduceNrlCareer(live, { type: 'finishLive', year: season.year, round: season.round, tactic: season.tactic });
    for (const state of [quick, liveResult]) {
      const result = state.season.results.find(match => match.round === season.round && match.playerScoring)!;
      expect(result.playerScoring?.starters).toEqual(NRL_ROLES.map(role => leadership.season.lineup[role]));
      expect(result.playerScoring?.kickerId).toBe(fromPlayerId);
      expect(result.captainId).toBe(season.captainId);
    }
  });

  it('rejects expired fixtures, stale selections, missing reciprocal cover, and unavailable or locked players', () => {
    const initial = qualified();
    const [swap] = nrlStarterSwaps(initial.season);
    const changed = reduceNrlCareer(initial, swap);
    expect(reduceNrlCareer(changed, swap)).toBe(changed);
    const nextRound = advance(initial);
    expect(reduceNrlCareer(nextRound, swap)).toBe(nextRound);
    expect(reduceNrlCareer(initial, { ...swap, clubId: 'broncos' })).toBe(initial);
    expect(reduceNrlCareer(initial, { ...swap, year: 2027 })).toBe(initial);
    const unqualified = {
      ...initial,
      season: { ...initial.season, squad: initial.season.squad.map(player =>
        player.id === swap.toPlayerId ? { ...player, secondaryRole: undefined } : player) },
    };
    expect(nrlStarterSwaps(unqualified.season)).toHaveLength(1);
    expect(reduceNrlCareer(unqualified, swap)).toBe(unqualified);

    const unavailable = { ...initial, season: { ...initial.season, results: initial.season.results.map(result =>
      result.round === initial.season.round - 1
        ? { ...result, injury: { playerId: swap.toPlayerId, rounds: 2 } } : result) } };
    expect(nrlUnavailable(unavailable.season).has(swap.toPlayerId)).toBe(true);
    expect(nrlStarterSwaps(unavailable.season)).toHaveLength(1);
    expect(reduceNrlCareer(unavailable, swap)).toBe(unavailable);
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    const complete = { ...initial, season: { ...initial.season, phase: 'complete' as const } };
    for (const locked of [live, complete]) {
      expect(nrlStarterSwaps(locked.season)).toEqual([]);
      expect(reduceNrlCareer(locked, swap)).toBe(locked);
    }
  });

  it('lists both swaps on Squad, commits one save, and preserves position and duties on reload', () => {
    const initial = qualified();
    const [swap] = nrlStarterSwaps(initial.season);
    const playerName = (id: string) => initial.season.squad.find(player => player.id === id)!.name;
    const name = (fromPlayerId: string, toPlayerId: string) =>
      'Swap ' + playerName(fromPlayerId) + ' (Five-eighth) and ' + playerName(toPlayerId) + ' (Halfback)';
    localStorage.setItem(NRL_SAVE_KEY, bytes(initial));
    localStorage.setItem(fence, '4');
    const view = open();
    fireEvent.click(screen.getByText('Swap starters', { exact: true }));
    expect(screen.getAllByRole('button', { name: /^Swap .* and / })).toHaveLength(2);
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes(initial));
    expect(localStorage.getItem(fence)).toBe('4');
    fireEvent.click(screen.getByRole('button', { name: name(swap.fromPlayerId, swap.toPlayerId) }));
    const expected = reduceNrlCareer(initial, swap);
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes(expected));
    expect(localStorage.getItem(fence)).toBe('5');
    view.unmount();

    open();
    expect(screen.getByLabelText('Five-eighth')).toHaveValue(swap.toPlayerId);
    expect(screen.getByLabelText('Halfback')).toHaveValue(swap.fromPlayerId);
    expect(screen.getByLabelText('Goal kicker', { exact: true })).toHaveValue(initial.season.kickerId);
    expect(screen.getByLabelText('Club captain', { exact: true })).toHaveValue(initial.season.captainId);
    expect(localStorage.getItem(fence)).toBe('5');
  });
});
