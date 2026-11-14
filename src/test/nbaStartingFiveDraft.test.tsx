import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNbaLineup } from '@/hooks/useNbaLineup';
import type { PlayerEntity } from '@/lib/playerSearch';

const io = vi.hoisted(() => ({ completion: vi.fn(), drawCount: 0, outage: false }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: io.completion }));
vi.mock('@/data/nbaTeams', async (original) => {
  const teams = await original<typeof import('@/data/nbaTeams')>();
  return { ...teams, getRandomNbaTeams: () => {
    io.drawCount++;
    return teams.NBA_TEAMS.slice(0, 5);
  } };
});
vi.mock('@/data/nbaStats', () => ({
  getRandomStatChallenge: () => ({
    stat: 'Career Points Per Game', unit: 'PPG', emoji: '🏀', direction: 'highest',
  }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const sample = [
    ['Focus', 'Forward', 'F', 'Atlanta Hawks', 'ATL'],
    ['Fixture', 'Guard', 'G', 'Boston Celtics', 'BOS'],
    ['Record', 'Center', 'C', 'Brooklyn Nets', 'BRK'],
    ['Archive', 'Forward', 'F', 'Charlotte Hornets', 'CHO'],
    ['Bench', 'Guard', 'G', 'Chicago Bulls', 'CHI'],
  ];
  return {
    supabase: { from: (table: string) => {
      const rows = sample.map(([first, last, position, team, teams], index) =>
        table === 'nba_players_extended_v2'
          ? { first_name: first, last_name: last, position, team, player_id: index + 1 }
          : { player_name: first + ' ' + last, teams, year_from: '2005-06', year_to: '2008-09',
            games: 100, points: 500 + 100 * index });
      const page = {
        select: () => page, or: () => page, order: () => page,
        range: async () => io.outage ? { data: null, error: new Error('Fixture offline') } : { data: rows, error: null },
      };
      return page;
    } },
  };
});

const key = 'dukb-nba-starting-five-draft-v1';
const player = (name: string, position: string) => ({ name, meta: { position } } as PlayerEntity);

function start() {
  const run = renderHook(() => useNbaLineup());
  act(() => run.result.current.finishStatSpin());
  act(() => run.result.current.beginBuilding());
  act(() => run.result.current.finishTeamSpin());
  return run;
}

async function pick(run: ReturnType<typeof start>, index: number, name: string, position: string) {
  act(() => run.result.current.selectPosition(index));
  await act(() => run.result.current.submitPlayer(player(name, position)));
  act(() => run.result.current.finishTeamSpin());
}

beforeEach(() => { localStorage.clear(); io.completion.mockClear(); io.drawCount = 0; io.outage = false; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('NBA Starting 5 draft', () => {
  it('keeps a restored full lineup after a failed score read and retries the same lineup', async () => {
    const saved = JSON.stringify({
      stat: 'Career Points Per Game', direction: 'highest',
      teams: ['atl', 'bos', 'bkn', 'cha', 'chi'],
      picks: [
        { index: 2, name: 'Focus Forward', value: 5 },
        { index: 0, name: 'Fixture Guard', value: 6 },
        { index: 4, name: 'Record Center', value: 7 },
        { index: 3, name: 'Archive Forward', value: 8 },
        { index: 1, name: 'Bench Guard', value: 9 },
      ],
      selectedPosition: null,
    });
    localStorage.setItem(key, saved);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const resumed = renderHook(() => useNbaLineup());
    io.outage = true;
    await act(() => resumed.result.current.evaluateTeam());
    expect(resumed.result.current.evaluationError).toContain('try Submit again');
    expect(resumed.result.current.phase).toBe('reviewing');
    expect(localStorage.getItem(key)).toBe(saved);
    expect(io.completion.mock.calls.some(([, complete]) => complete)).toBe(false);

    io.outage = false;
    await act(() => resumed.result.current.evaluateTeam());
    expect(resumed.result.current.result?.yourTotal).toBe(35);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('keeps the challenge, reroll and accepted pick across a fresh mount', async () => {
    const run = start();
    await pick(run, 2, 'Focus Forward', 'F');
    expect(run.result.current.filledCount).toBe(1);
    const expected = run.result.current.filledSlots.get(2);
    expect(expected?.statValue).toBe(5);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.07);
    act(() => run.result.current.rerollTeam());
    random.mockRestore();
    expect(run.result.current.currentTeam?.name).not.toBe('Boston Celtics');
    act(() => run.result.current.finishTeamSpin());
    act(() => run.result.current.selectPosition(4));
    const { challenge, teamAssignments } = run.result.current;
    run.unmount();

    const resumed = renderHook(() => useNbaLineup());
    expect(resumed.result.current.phase).toBe('building');
    expect(resumed.result.current.challenge).toEqual(challenge);
    expect(resumed.result.current.teamAssignments).toEqual(teamAssignments);
    expect(resumed.result.current.filledSlots.get(2)).toEqual(expected);
    expect(resumed.result.current.selectedPosition).toBe(4);
    expect(resumed.result.current.totalStat).toBe(5);
    expect(resumed.result.current.isTeamSpinning).toBe(false);
    expect(io.drawCount).toBe(1);
    expect(io.completion.mock.calls.some(([, complete]) => complete)).toBe(false);

    vi.useFakeTimers();
    act(() => resumed.result.current.resetGame());
    act(() => vi.advanceTimersByTime(100));
    expect(localStorage.getItem(key)).toBeNull();
    expect(resumed.result.current.phase).toBe('challenge');
    expect(resumed.result.current.filledCount).toBe(0);
  });

  it('reopens a full five for review and clears the draft only on a scored Submit', async () => {
    const run = start();
    await pick(run, 2, 'Focus Forward', 'F');
    await pick(run, 0, 'Fixture Guard', 'G');
    await pick(run, 4, 'Record Center', 'C');
    await pick(run, 3, 'Archive Forward', 'F');
    await pick(run, 1, 'Bench Guard', 'G');
    expect(run.result.current.phase).toBe('reviewing');
    run.unmount();

    const resumed = renderHook(() => useNbaLineup());
    expect(resumed.result.current.phase).toBe('reviewing');
    expect(resumed.result.current.totalStat).toBe(35);
    expect(resumed.result.current.result).toBeNull();
    expect(io.completion.mock.calls.some(([, complete]) => complete)).toBe(false);
    expect(localStorage.getItem(key)).not.toBeNull();
    const secondTab = renderHook(() => useNbaLineup());
    await act(() => resumed.result.current.evaluateTeam());
    expect(resumed.result.current.result?.score).toBe(100);
    expect(resumed.result.current.result?.yourTotal).toBe(35);
    expect(localStorage.getItem(key)).toBeNull();
    expect(io.completion.mock.calls.filter(([, complete]) => complete)).toEqual([['nba-starting-5', true, 500, 1]]);
    resumed.unmount();
    await act(() => secondTab.result.current.evaluateTeam());
    expect(secondTab.result.current.phase).toBe('reviewing');
    expect(secondTab.result.current.result).toBeNull();
    expect(secondTab.result.current.evaluationError).toContain('another tab');
    expect(io.completion.mock.calls.filter(([, complete]) => complete)).toHaveLength(1);
    secondTab.unmount();

    const next = renderHook(() => useNbaLineup());
    expect(next.result.current.phase).toBe('challenge');
    expect(next.result.current.filledCount).toBe(0);
    expect(io.completion.mock.calls.filter(([, complete]) => complete)).toHaveLength(1);
  });

  it('starts fresh from an inconsistent draft and replaces it only after the player starts building', () => {
    const invalid = JSON.stringify({
      stat: 'Career Points Per Game', direction: 'highest', teams: ['atl', 'bos', 'bkn', 'cha', 'chi'],
      picks: [{ index: 0, name: 'Fixture Guard', value: 6 }, { index: 0, name: 'Bench Guard', value: 9 }],
      selectedPosition: null,
    });
    localStorage.setItem(key, invalid);
    const nextRun = renderHook(() => useNbaLineup());
    expect(nextRun.result.current.phase).toBe('challenge');
    expect(nextRun.result.current.filledCount).toBe(0);
    expect(localStorage.getItem(key)).toBe(invalid);
    act(() => nextRun.result.current.finishStatSpin());
    act(() => nextRun.result.current.beginBuilding());
    expect(JSON.parse(localStorage.getItem(key) ?? '').picks).toEqual([]);
  });
});
