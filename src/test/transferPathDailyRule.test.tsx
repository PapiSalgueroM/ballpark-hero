import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import type { CareerPlayer, CareerSeason } from '@/types/career';
import { useTransferPath } from '@/hooks/useTransferPath';
import { dateSeed, getTodayET } from '@/lib/dateUtils';
import { recordCompletion } from '@/lib/completions';

const season = (club: string, year: string): CareerSeason => ({ season: year, club, goals: 0, assists: 0, appearances: 1, marketValue: 1 });
const player = (name: string, career: CareerSeason[]): CareerPlayer => ({ name, nationality: 'Testland', position: 'CM', career });
const players = [
  player('Fixture Start', [season('Arsenal', '2020-2021'), season('Santos', '2019')]),
  player('Fixture Bridge', [season('Arsenal', '2020-2021'), season('Chelsea', '2021-2022'), season('Boca Juniors', '2018')]),
  player('Fixture Closer', [season('Chelsea', '2021-2022'), season('Real Madrid', '2022-2023')]),
  player('Fixture Target', [season('Real Madrid', '2022-2023')]),
  player('Fixture Outside', [season('Boca Juniors', '2018'), season('Real Madrid', '2022-2023')]),
  player('Fixture Shortcut', [season('Santos', '2019'), season('Real Madrid', '2022-2023')]),
];
const special = { minSteps: 3, hint: 'Use Arsenal first, then Chelsea and Real Madrid.' };
const puzzle: TransferPathPuzzle = { id: 'tp-daily-rule', playerA: 'Fixture Start', playerB: 'Fixture Target',
  minSteps: 2, hint: 'Two steps with Santos and Real Madrid.', europe: special, active: special };
const io = vi.hoisted(() => ({ blocked: false }));

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: async () => players }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: async () => {
  if (!io.blocked) return [puzzle];
  const blocked: TransferPathPuzzle = { ...puzzle, europe: null };
  const other: TransferPathPuzzle = { ...puzzle, id: 'tp-another-puzzle' };
  return dateSeed(getTodayET()) % 2 === 0 ? [blocked, other] : [other, blocked];
} }));
vi.mock('@/data/transferPathVerifiedActive', async () => {
  const { transferPathIdentityKey } = await vi.importActual<typeof import('@/lib/transferPathIdentity')>('@/lib/transferPathIdentity');
  const keys = ['Fixture Start', 'Fixture Bridge', 'Fixture Closer', 'Fixture Target'].map(name => transferPathIdentityKey(name, 'Testland'));
  return { VERIFIED_ACTIVE_IDENTITIES: new Set(keys) };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'tester' }));

const key = () => `transfer-path-daily-${getTodayET()}`;
const read = () => localStorage.getItem(key());
const stored = () => JSON.parse(read()!);
const bridge = { t: 'step', player: 'Fixture Bridge', club: 'Arsenal' };

async function mount() {
  const game = renderHook(() => useTransferPath());
  await waitFor(() => expect(game.result.current.isLoadingPool || game.result.current.isLoading).toBe(false));
  await waitFor(() => expect(game.result.current.puzzle.id).toBe(puzzle.id));
  return game;
}

beforeEach(() => {
  io.blocked = false;
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Transfer Path saved Daily rule', () => {
  it.each([['europe', 'outside-europe'], ['active', 'unverified-active']] as const)(
    'restores %s after a step, rejects an otherwise valid link and scores the same Daily', async (rule, refusal) => {
      const first = await mount();
      act(() => first.result.current.setRule(rule));
      expect(first.result.current.ruleLocked).toBe(false);
      act(() => expect(first.result.current.addPlayer('Fixture Bridge').ok).toBe(true));
      const hint = first.result.current.hint;
      const progress = read();
      expect(stored().guesses).toEqual([{ ...bridge, rule }]);
      first.unmount();

      const replay = await mount();
      expect(replay.result.current).toMatchObject({ rule, activeRule: rule, ruleLocked: true, optimal: 3, hint,
        chain: ['Fixture Start', 'Fixture Bridge'] });
      act(() => replay.result.current.setRule('classic'));
      act(() => expect(replay.result.current.addPlayer('Fixture Outside')).toEqual({ ok: false, club: null, reason: refusal }));
      expect(read()).toBe(progress);
      act(() => expect(replay.result.current.addPlayer('Fixture Closer').ok).toBe(true));
      expect(replay.result.current).toMatchObject({ status: 'won', score: 900, rule, chain: players.slice(0, 4).map(p => p.name) });
      expect(stored().guesses).toEqual([{ ...bridge, rule }, { t: 'step', player: 'Fixture Closer', club: 'Chelsea' },
        { t: 'step', player: 'Fixture Target', club: 'Real Madrid' }, { t: 'won' }]);
      expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/transfer-path', 900, 'tester', 1);
      const finished = read();
      replay.unmount();
      const result = await mount();
      expect(result.result.current).toMatchObject({ status: 'won', score: 900, rule, optimal: 3 });
      expect(recordCompletion).toHaveBeenCalledTimes(1);
      expect(read()).toBe(finished);
      act(() => result.result.current.switchToUnlimited());
      expect(result.result.current).toMatchObject({ mode: 'unlimited', rule, activeRule: rule, ruleLocked: false });
      expect(read()).toBe(finished);
    },
  );

  it('stores the effective rule on surrender before a step and restores the same solution', async () => {
    const game = await mount();
    act(() => game.result.current.setRule('europe'));
    act(() => game.result.current.giveUp());
    expect(stored().guesses).toEqual([{ t: 'give', rule: 'europe' }]);
    const solution = game.result.current.revealPath;
    expect(solution?.map(step => step.club)).toEqual([null, 'Arsenal', 'Chelsea', 'Real Madrid']);
    game.unmount();
    const replay = await mount();
    expect(replay.result.current).toMatchObject({ rule: 'europe', status: 'gaveup', score: 0, revealPath: solution });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/transfer-path', 0, 'tester', 0);
  });

  it('keeps a blocked selection and a legacy receipt on the ordinary Daily format', async () => {
    io.blocked = true;
    const game = await mount();
    act(() => game.result.current.setRule('europe'));
    expect(game.result.current).toMatchObject({ dailyRuleBlocked: true, activeRule: 'classic' });
    act(() => game.result.current.addPlayer('Fixture Bridge'));
    expect(game.result.current).toMatchObject({ rule: 'europe', activeRule: 'classic', dailyRuleBlocked: true, ruleLocked: true });
    expect(stored().guesses).toEqual([bridge]);
    const original = read();
    game.unmount();
    const replay = await mount();
    expect(replay.result.current).toMatchObject({ rule: 'classic', activeRule: 'classic', ruleLocked: true,
      chain: ['Fixture Start', 'Fixture Bridge'], optimal: 2 });
    expect(read()).toBe(original);
    act(() => expect(replay.result.current.addPlayer('Fixture Outside').ok).toBe(true));
  });

  it('keeps a prior chain intact if its special rule is no longer available for the pair', async () => {
    const game = await mount();
    act(() => game.result.current.setRule('europe'));
    act(() => game.result.current.addPlayer('Fixture Bridge'));
    const original = read();
    game.unmount();
    io.blocked = true;
    const replay = await mount();
    expect(replay.result.current).toMatchObject({ rule: 'classic', activeRule: 'classic', ruleLocked: true,
      chain: ['Fixture Start', 'Fixture Bridge'], optimal: 2 });
    expect(read()).toBe(original);
  });

  it.each(['corrupt rule', 'late rule', 'different date', 'different puzzle'])('refuses a saved rule with %s', async kind => {
    const date = getTodayET();
    localStorage.setItem(key(), JSON.stringify({ v: 1, date: kind === 'different date' ? '2000-01-01' : date,
      puzzleIndex: 0, puzzleId: kind === 'different puzzle' ? 'another-puzzle' : puzzle.id, gameStatus: 'playing',
      guesses: kind === 'late rule' ? [bridge, { t: 'give', rule: 'europe' }] : [{ ...bridge, rule: kind === 'corrupt rule' ? 'invalid' : 'europe' }] }));
    const game = await mount();
    expect(game.result.current).toMatchObject({ rule: 'classic', ruleLocked: false, chain: ['Fixture Start'] });
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps the date and daily pair from mount if the fetched pool arrives after midnight Eastern', async () => {
    io.blocked = true;
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-11-14T04:59:50Z'));
      const originalDay = getTodayET();
      const game = renderHook(() => useTransferPath());
      vi.setSystemTime(new Date('2026-11-14T05:00:10Z'));
      expect(dateSeed(getTodayET()) % 2).not.toBe(dateSeed(originalDay) % 2);
      await waitFor(() => expect(game.result.current.isLoadingPool || game.result.current.isLoading).toBe(false));
      expect(game.result.current.puzzle.id).toBe(puzzle.id);
      act(() => game.result.current.addPlayer('Fixture Bridge'));
      expect(JSON.parse(localStorage.getItem(`transfer-path-daily-${originalDay}`)!).date).toBe(originalDay);
      expect(localStorage.getItem(key())).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
