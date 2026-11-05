import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerPlayer } from '@/types/career';

const fixture = vi.hoisted(() => ({
  fallback: [] as CareerPlayer[],
  pending: [] as ((pool: CareerPlayer[]) => void)[],
}));
vi.mock('@/data/careerPlayers', () => ({ careerPlayers: fixture.fallback }));
vi.mock('@/lib/fetchCareerPlayers', () => ({
  fetchCareerPlayers: () => new Promise<CareerPlayer[]>(resolve => fixture.pending.push(resolve)),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: async () => {} }),
}));
vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  getCurrentPlayerName: () => 'FixtureBaller',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

import { useCareerGame } from '@/hooks/useCareerGame';
import { recordCompletion } from '@/lib/completions';

const SAVE_KEY = 'career-path-daily-2026-11-05';
const DIFFICULTY_KEY = 'career-quiz-difficulty';
function player(letter: string, peak: number): CareerPlayer {
  return {
    name: 'Generated ' + letter, nationality: 'Generated Nation', position: 'Generated Position',
    career: [{ season: 'Generated Season', club: 'Generated Club ' + letter, appearances: 1, goals: 0, assists: null, marketValue: peak }],
  };
}
function fallbackPool() {
  return [player('A', 90), player('B', 80), player('C', 70), player('D', 60), player('E', 50), player('F', 40), player('G', 30), player('H', 20), player('I', 10)];
}
function livePool() {
  // A/G are absent. B moves out of Easy; H moves out of Hard. Input order is intentional.
  return [player('B', 25), player('H', 120), player('C', 70), player('D', 60), player('E', 50), player('F', 40), player('I', 10), player('J', 110), player('K', 100)];
}
const FALLBACK_NAMES = ['Generated A', 'Generated B', 'Generated C', 'Generated D', 'Generated E', 'Generated F', 'Generated G', 'Generated H', 'Generated I'];
const LIVE_NAMES = ['Generated B', 'Generated H', 'Generated C', 'Generated D', 'Generated E', 'Generated F', 'Generated I', 'Generated J', 'Generated K'];
async function mountGame(unlimited = true) {
  const view = renderHook(useCareerGame);
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  if (unlimited) act(() => view.result.current.switchMode('unlimited'));
  return view;
}
async function deliver(pool: CareerPlayer[]) {
  const pending = fixture.pending.splice(0);
  expect(pending.length, 'CAREER_SEARCH_SETUP delayed fetch exists').toBeGreaterThan(0);
  await act(async () => { pending.forEach(resolve => resolve(pool)); });
}

beforeEach(() => {
  localStorage.clear();
  fixture.fallback.splice(0, fixture.fallback.length, ...fallbackPool());
  fixture.pending.length = 0;
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-05T17:00:00Z'));
});
afterEach(() => { cleanup(); fixture.pending.length = 0; vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Career Quiz public autocomplete fairness', () => {
  it('CAREER_SEARCH_NORMAL uses one literal public union for different missing fallback targets', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = await mountGame();
    random.mockReturnValue(0.7);
    const second = await mountGame();
    expect(first.result.current.targetPlayer.name, 'CAREER_SEARCH_NORMAL first actual target').toBe('Generated A');
    expect(second.result.current.targetPlayer.name, 'CAREER_SEARCH_NORMAL different actual target').toBe('Generated G');
    const live = livePool();
    expect(live.some(p => p.name === 'Generated A' || p.name === 'Generated G'), 'CAREER_SEARCH_NORMAL both targets really absent').toBe(false);
    await deliver(live);
    const expected = ['Generated B', 'Generated H', 'Generated C', 'Generated D', 'Generated E', 'Generated F', 'Generated I', 'Generated J', 'Generated K', 'Generated A', 'Generated G'];
    expect(first.result.current.playerNames, 'CAREER_SEARCH_NORMAL entire public union in fixed order').toEqual(expected);
    expect(second.result.current.playerNames, 'CAREER_SEARCH_NORMAL same options for another hidden target').toEqual(expected);
    expect(first.result.current.playerNames, 'CAREER_SEARCH_NORMAL candidate order independent of answer').toEqual(second.result.current.playerNames);
    expect(random, 'CAREER_SEARCH_NORMAL only the two initial draws').toHaveBeenCalledTimes(2);
  });

  it('CAREER_SEARCH_EASY covers both a missing target and a target displaced from the fetched Easy third', async () => {
    localStorage.setItem(DIFFICULTY_KEY, 'easy');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = await mountGame();
    random.mockReturnValue(0.4);
    const second = await mountGame();
    expect(first.result.current.targetPlayer.name, 'CAREER_SEARCH_EASY missing target selected').toBe('Generated A');
    expect(second.result.current.targetPlayer.name, 'CAREER_SEARCH_EASY displaced target selected').toBe('Generated B');
    const live = livePool();
    expect(live.some(p => p.name === 'Generated B'), 'CAREER_SEARCH_EASY displaced name still in full fetched pool').toBe(true);
    await deliver(live);
    const expected = ['Generated H', 'Generated J', 'Generated K', 'Generated A', 'Generated B', 'Generated C'];
    expect(first.result.current.playerNames, 'CAREER_SEARCH_EASY exact current-first public tier union').toEqual(expected);
    expect(second.result.current.playerNames, 'CAREER_SEARCH_EASY same public options for displaced target').toEqual(expected);
    expect(random, 'CAREER_SEARCH_EASY no draws from option construction or fetch').toHaveBeenCalledTimes(2);
  });

  it('CAREER_SEARCH_HARD covers both a missing target and a target displaced from the fetched Hard third', async () => {
    localStorage.setItem(DIFFICULTY_KEY, 'hard');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = await mountGame();
    random.mockReturnValue(0.4);
    const second = await mountGame();
    expect(first.result.current.targetPlayer.name, 'CAREER_SEARCH_HARD missing target selected').toBe('Generated G');
    expect(second.result.current.targetPlayer.name, 'CAREER_SEARCH_HARD displaced target selected').toBe('Generated H');
    const live = livePool();
    expect(live.some(p => p.name === 'Generated H'), 'CAREER_SEARCH_HARD displaced name still in full fetched pool').toBe(true);
    await deliver(live);
    const expected = ['Generated F', 'Generated B', 'Generated I', 'Generated G', 'Generated H'];
    expect(first.result.current.playerNames, 'CAREER_SEARCH_HARD exact current-first public tier union').toEqual(expected);
    expect(second.result.current.playerNames, 'CAREER_SEARCH_HARD same public options for displaced target').toEqual(expected);
    expect(random, 'CAREER_SEARCH_HARD no draws from option construction or fetch').toHaveBeenCalledTimes(2);
  });

  it('CAREER_SEARCH_PROGRESS keeps the active fallback puzzle progress saved bytes and random tape through fetch', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = await mountGame(false);
    act(() => view.result.current.revealCell('0-goals'));
    const daily = localStorage.getItem(SAVE_KEY);
    expect(JSON.parse(daily!), 'CAREER_SEARCH_PROGRESS original daily codec').toEqual({
      v: 1, date: '2026-11-05', puzzleIndex: 8, puzzleId: 'Generated I',
      guesses: [{ t: 'cell', key: '0-goals' }], gameStatus: 'playing',
    });
    act(() => view.result.current.switchMode('unlimited'));
    act(() => { view.result.current.revealCell('0-assists'); view.result.current.makeGuess('Generated Wrong'); });
    const target = view.result.current.targetPlayer;
    const active = {
      target: JSON.stringify(target), cells: [...view.result.current.revealedCells],
      boxes: view.result.current.boxesUsed, guesses: view.result.current.guessesUsed,
      status: view.result.current.gameStatus,
    };
    expect(active, 'CAREER_SEARCH_PROGRESS actual in-progress fallback round').toEqual({
      target: JSON.stringify(fixture.fallback[0]), cells: ['0-assists'], boxes: 1, guesses: 1, status: 'playing',
    });
    const live = livePool(), data = JSON.stringify([fixture.fallback, live]), draws = random.mock.calls.length;
    await deliver(live);
    expect(view.result.current.targetPlayer, 'CAREER_SEARCH_PROGRESS target object held').toBe(target);
    expect({
      target: JSON.stringify(view.result.current.targetPlayer), cells: [...view.result.current.revealedCells],
      boxes: view.result.current.boxesUsed, guesses: view.result.current.guessesUsed,
      status: view.result.current.gameStatus,
    }, 'CAREER_SEARCH_PROGRESS active round held through fetch').toEqual(active);
    for (let i = 0; i < 3; i++) void view.result.current.playerNames.slice();
    expect(localStorage.getItem(SAVE_KEY), 'CAREER_SEARCH_PROGRESS daily save bytes held').toBe(daily);
    expect(JSON.stringify([fixture.fallback, live]), 'CAREER_SEARCH_PROGRESS source fixtures held').toBe(data);
    expect(random.mock.calls.length, 'CAREER_SEARCH_PROGRESS fetch and option reads draw nothing').toBe(draws);
    expect(recordCompletion, 'CAREER_SEARCH_PROGRESS no completion').not.toHaveBeenCalled();
  });

  it('CAREER_SEARCH_DAILY preserves the fetched daily option order and ignores unlimited difficulty changes', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = await mountGame(false);
    expect(view.result.current.playerNames, 'CAREER_SEARCH_DAILY original fallback list').toEqual(FALLBACK_NAMES);
    act(() => view.result.current.changeDifficulty('easy'));
    expect(view.result.current.difficulty, 'CAREER_SEARCH_DAILY difficulty ignored in daily').toBe('normal');
    await deliver(livePool());
    expect(view.result.current.playerNames, 'CAREER_SEARCH_DAILY fetched list remains exact without fallback additions').toEqual(LIVE_NAMES);
    expect(view.result.current.targetPlayer.name, 'CAREER_SEARCH_DAILY existing daily selector').toBe('Generated K');
    act(() => view.result.current.changeDifficulty('hard'));
    expect(view.result.current.playerNames, 'CAREER_SEARCH_DAILY options still unchanged').toEqual(LIVE_NAMES);
    expect(localStorage.getItem(SAVE_KEY), 'CAREER_SEARCH_DAILY no action write').toBeNull();
    expect(random, 'CAREER_SEARCH_DAILY only existing initial unlimited draw').toHaveBeenCalledTimes(1);
    expect(recordCompletion, 'CAREER_SEARCH_DAILY no completion').not.toHaveBeenCalled();
  });

  it('CAREER_SEARCH_SAME_EMPTY preserves identical and empty-fetch fallback lists without extra draws', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.4);
    for (const pool of [fallbackPool(), []]) {
      const beforeDraws = random.mock.calls.length;
      const view = await mountGame();
      const target = view.result.current.targetPlayer;
      await deliver(pool);
      expect(view.result.current.isLoadingPool, 'CAREER_SEARCH_SAME_EMPTY fetch settled').toBe(false);
      expect(view.result.current.playerNames, 'CAREER_SEARCH_SAME_EMPTY exact existing fallback names').toEqual(FALLBACK_NAMES);
      expect(view.result.current.targetPlayer, 'CAREER_SEARCH_SAME_EMPTY target held').toBe(target);
      expect(view.result.current.targetPlayer.name, 'CAREER_SEARCH_SAME_EMPTY original draw target').toBe('Generated D');
      expect(random.mock.calls.length, 'CAREER_SEARCH_SAME_EMPTY no option/fetch draw').toBe(beforeDraws + 1);
      expect(localStorage.getItem(SAVE_KEY), 'CAREER_SEARCH_SAME_EMPTY no daily write').toBeNull();
      view.unmount();
    }
    expect(recordCompletion, 'CAREER_SEARCH_SAME_EMPTY no completion').not.toHaveBeenCalled();
  });

  it('CAREER_SEARCH_SMALL preserves the below-nine tier rule and normalized deduplication in public order', async () => {
    fixture.fallback.splice(4);
    localStorage.setItem(DIFFICULTY_KEY, 'hard');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = await mountGame();
    const normalizedB = { ...player('B', 25), name: ' generated b ' };
    await deliver([player('C', 70), player('J', 110), normalizedB]);
    expect(view.result.current.targetPlayer.name, 'CAREER_SEARCH_SMALL existing fallback draw held').toBe('Generated A');
    expect(view.result.current.playerNames, 'CAREER_SEARCH_SMALL full small cohorts with existing display name and fixed append order').toEqual([
      'Generated C', 'Generated J', ' generated b ', 'Generated A', 'Generated D',
    ]);
    expect(random, 'CAREER_SEARCH_SMALL only the original draw').toHaveBeenCalledTimes(1);
  });

  it('CAREER_SEARCH_DRAWS preserves current fetched reset and difficulty draw pools and resets', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = await mountGame(), live = livePool();
    await deliver(live);
    act(() => { view.result.current.revealCell('0-goals'); view.result.current.makeGuess('Generated Wrong'); });
    random.mockReturnValue(0.6);
    act(() => view.result.current.resetGame());
    expect(view.result.current.targetPlayer, 'CAREER_SEARCH_DRAWS reset draws the current fetched normal index').toBe(live[5]);
    expect(view.result.current.targetPlayer.name, 'CAREER_SEARCH_DRAWS unchanged normal target').toBe('Generated F');
    expect([...view.result.current.revealedCells], 'CAREER_SEARCH_DRAWS reset clears cells').toEqual([]);
    expect([view.result.current.boxesUsed, view.result.current.guessesUsed, view.result.current.gameStatus], 'CAREER_SEARCH_DRAWS reset clears counts').toEqual([0, 0, 'playing']);
    act(() => { view.result.current.revealCell('0-club'); view.result.current.makeGuess('Generated Wrong'); });
    random.mockReturnValue(0.9);
    act(() => view.result.current.changeDifficulty('easy'));
    expect(view.result.current.targetPlayer, 'CAREER_SEARCH_DRAWS existing Easy third target').toBe(live[8]);
    expect(view.result.current.targetPlayer.name, 'CAREER_SEARCH_DRAWS unchanged Easy target').toBe('Generated K');
    expect([view.result.current.boxesUsed, view.result.current.guessesUsed], 'CAREER_SEARCH_DRAWS Easy resets progress').toEqual([0, 0]);
    const draws = random.mock.calls.length, target = view.result.current.targetPlayer;
    act(() => view.result.current.changeDifficulty('easy'));
    expect(random.mock.calls.length, 'CAREER_SEARCH_DRAWS unchanged difficulty draws nothing').toBe(draws);
    expect(view.result.current.targetPlayer, 'CAREER_SEARCH_DRAWS unchanged difficulty keeps target').toBe(target);
    act(() => view.result.current.changeDifficulty('hard'));
    expect(view.result.current.targetPlayer, 'CAREER_SEARCH_DRAWS existing Hard third target').toBe(live[6]);
    expect(view.result.current.targetPlayer.name, 'CAREER_SEARCH_DRAWS unchanged Hard target').toBe('Generated I');
    expect(localStorage.getItem(DIFFICULTY_KEY), 'CAREER_SEARCH_DRAWS existing preference codec').toBe('hard');
    expect(localStorage.getItem(SAVE_KEY), 'CAREER_SEARCH_DRAWS unlimited never writes daily').toBeNull();
    expect(random, 'CAREER_SEARCH_DRAWS initial reset Easy Hard tape unchanged').toHaveBeenCalledTimes(4);
    expect(recordCompletion, 'CAREER_SEARCH_DRAWS no completion').not.toHaveBeenCalled();
  });
});
