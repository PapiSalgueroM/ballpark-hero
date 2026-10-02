/**
 * Two tabs cannot undo a daily, a damaged save resets, and old saves still load.
 *
 * Round 848, from the other lane's audit of the live site.
 *
 * QA847-02. Open today's AFL Higher or Lower daily in two tabs, answer two
 * rounds in the first, answer round one in the second (still showing the
 * first pair), refresh the first: the save went from two decided rounds back
 * to one, because useDailyPuzzle wrote each tab's own log over the shared
 * key. Now a tab whose log is behind the stored one takes the stored state
 * instead of writing (so it jumps to the saved round and the stale answer is
 * dropped), and every tab follows the storage event the browser fires when
 * another tab writes. Section 1 holds the rule on the shared hook itself,
 * section 2 replays the audit's exact steps on all nine Higher or Lower hooks
 * (two instances over one localStorage) and on Shirt Number.
 *
 * QA847-03. Section 3 feeds every Higher or Lower hook, and the shared hook,
 * each damaged form and proves the day starts fresh and the next answer
 * replaces the bad bytes with a good save; the page level version for all 36
 * routes is dailySaveShapes.test.tsx. Section 4 covers the three consumers no
 * route renders today.
 *
 * Old saves. Section 5 restores saves written by the code before this round
 * (src/test/fixtures/dailySavesPre848.json) for six games, each through the
 * new code, and requires the same restored state and untouched bytes.
 * scripts/simDailySaveHardening.mjs regenerates that fixture from the pre 848
 * hook and hooks (git 617b8354) with R848_SAVES_OUT set and fails if a byte
 * differs, and carries the negative control R848_CONTROL=stale, which removes
 * the stale tab guard from a copy of the hook: sections 1 and 2 must go red.
 */
import './dailyReload/mocks';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useAflHL } from '@/hooks/useAflHL';
import { useCfbHL } from '@/hooks/useCfbHL';
import { useF1HL } from '@/hooks/useF1HL';
import { useGolfHL } from '@/hooks/useGolfHL';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import { useMlbHL } from '@/hooks/useMlbHL';
import { useNbaHL } from '@/hooks/useNbaHL';
import { useNflHL } from '@/hooks/useNflHL';
import { useTennisHL } from '@/hooks/useTennisHL';
import { useShirtNumber } from '@/hooks/useShirtNumber';
import { useGame } from '@/hooks/useGame';
import { useUfcGame } from '@/hooks/useUfcGame';
import { useNbaConnections } from '@/hooks/useNbaConnections';
import { useFootballDraft } from '@/hooks/useFootballDraft';
import { useGuessTransferValue } from '@/hooks/useGuessTransferValue';
import { useWorldCup } from '@/hooks/useWorldCup';
import { useTransferPath } from '@/hooks/useTransferPath';
import { useCareerGame } from '@/hooks/useCareerGame';
import { useOlympics } from '@/hooks/useOlympics';
import { toast } from 'sonner';
import { clubSeasonsOf, shareClub } from '@/lib/transferPathGraph';
import { careerPlayers } from '@/data/careerPlayers';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

/* Same pass-through as the page test: which key, index and id a hook reads. */
const seen = vi.hoisted(() => new Map<string, { index: number; id?: string; loaded: boolean }>());
vi.mock('@/hooks/useDailyPuzzle', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/hooks/useDailyPuzzle')>();
  return {
    ...real,
    useDailyPuzzle: ((options: Parameters<typeof real.useDailyPuzzle>[0]) => {
      const state = real.useDailyPuzzle(options);
      const slug = options.storageSlug ?? options.gameSlug;
      const id = state.puzzle != null && options.getPuzzleId ? options.getPuzzleId(state.puzzle as never) : undefined;
      const prior = seen.get(slug);
      seen.set(slug, { index: state.puzzleIndex, id, loaded: (prior?.loaded ?? false) || !state.isLoading });
      return state;
    }) as typeof real.useDailyPuzzle,
  };
});

/* Guess the Transfer Value has no static pool; a made up one so its daily
   lands (the stub answers every table with nothing). */
const VALUE_POOL = vi.hoisted(() => Array.from({ length: 6 }, (_, i) => ({
  name: `Made Up ${i}`, club: `Club ${i}`, position: 'Midfielder', age: 20 + i, nationality: 'England',
  marketValue: (i + 1) * 5_000_000, matches: 10, goals: i, assists: i,
})));
vi.mock('@/lib/fetchTransferValuePool', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/fetchTransferValuePool')>()),
  fetchTransferValuePool: async () => VALUE_POOL,
}));

const TODAY = '2026-10-01';
const raw = (key: string) => localStorage.getItem(key);
const parsed = (key: string) => JSON.parse(raw(key) ?? 'null');
const storage = (key: string | null) => act(() => { window.dispatchEvent(new StorageEvent('storage', { key })); });
const flush = () => act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T16:00:00Z`));
  vi.spyOn(Math, 'random').mockReturnValue(0.01234);
  localStorage.clear();
  resetMocks();
  seen.clear();
  for (const slug of ['r848-probe', 'afl-higher-lower', 'nfl-higher-lower', 'shirt-number']) consumeRestoredFinish(slug);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });

/* ------------------------------------------------------------------ 1 */

type Probe = { n: number };
const PROBE_POOL = [{ id: 'p' }];
const PROBE_KEY = `r848-probe-daily-${TODAY}`;
const probe = () => renderHook(() => useDailyPuzzle<{ id: string }, Probe>({
  gameSlug: 'r848-probe',
  puzzles: PROBE_POOL,
  maxGuesses: 5,
  isWon: (g) => g.some((x) => x.n === 99),
  deserializeGuesses: (r) => r as Probe[],
  isValidGuesses: (g) => g.length <= 5 && g.every((x) => typeof x.n === 'number'),
}));
const good = (guesses: Probe[], gameStatus = 'playing') => ({ v: 1, date: TODAY, puzzleIndex: 0, guesses, gameStatus });

describe('1) the shared hook never writes a stale tab over a newer save', () => {
  it('a tab behind the stored log takes it over instead of writing over it', () => {
    const a = probe(), b = probe();
    act(() => a.result.current.addGuess({ n: 1 }));
    act(() => a.result.current.addGuess({ n: 2 }));
    const before = raw(PROBE_KEY);
    act(() => b.result.current.addGuess({ n: 7 }));
    expect(raw(PROBE_KEY)).toBe(before);
    expect(b.result.current.guesses).toEqual([{ n: 1 }, { n: 2 }]);
    act(() => b.result.current.addGuess({ n: 3 }));
    expect(parsed(PROBE_KEY)).toEqual(good([{ n: 1 }, { n: 2 }, { n: 3 }]));
    const after = raw(PROBE_KEY);
    act(() => a.result.current.addGuess({ n: 9 }));
    expect(raw(PROBE_KEY)).toBe(after);
    expect(a.result.current.guesses).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('an open tab follows another tab through the storage event, and only for its own key', () => {
    const a = probe(), b = probe();
    act(() => a.result.current.addGuess({ n: 1 }));
    expect(b.result.current.guesses).toEqual([]);
    storage('some-other-key');
    storage(null);
    expect(b.result.current.guesses).toEqual([]);
    storage(PROBE_KEY);
    expect(b.result.current.guesses).toEqual([{ n: 1 }]);
    act(() => b.result.current.addGuess({ n: 2 }));
    expect(parsed(PROBE_KEY)).toEqual(good([{ n: 1 }, { n: 2 }]));
  });

  it('a finish taken over from another tab is marked as restored, so it is not recorded twice', () => {
    const a = probe(), b = probe();
    act(() => a.result.current.addGuess({ n: 99 }));
    expect(a.result.current.gameStatus).toBe('won');
    expect(consumeRestoredFinish('r848-probe')).toBe(false);
    const before = raw(PROBE_KEY);
    act(() => b.result.current.addGuess({ n: 5 }));
    expect(b.result.current.gameStatus).toBe('won');
    expect(b.result.current.guesses).toEqual([{ n: 99 }]);
    expect(consumeRestoredFinish('r848-probe')).toBe(true);
    expect(raw(PROBE_KEY)).toBe(before);
  });

  it('a stored log shorter than the tab is never taken over: decided rounds stay decided', () => {
    const a = probe();
    act(() => a.result.current.addGuess({ n: 1 }));
    act(() => a.result.current.addGuess({ n: 2 }));
    localStorage.setItem(PROBE_KEY, JSON.stringify(good([{ n: 1 }])));
    storage(PROBE_KEY);
    expect(a.result.current.guesses).toEqual([{ n: 1 }, { n: 2 }]);
    act(() => a.result.current.addGuess({ n: 3 }));
    expect(parsed(PROBE_KEY)).toEqual(good([{ n: 1 }, { n: 2 }, { n: 3 }]));
  });
});

/* ----------------------------------------------------------------- 1b */

/* Round 848 review. Some handlers give more than one answer in a turn:
   Transfer Path records the step, then the closing step and the win when the
   new man also links to the target; Career Path's hint reveals four cells.
   When the first answer is dropped because another tab is ahead, the rest
   were built on the same stale board and must go with it. Before this, the
   rest were appended to the state just taken over: a stale Transfer Path tab
   recorded a win for a chain that never reached the target. */
describe('1b) a handler whose first answer is dropped drops the rest of its turn', () => {
  it('the shared hook: two answers in one turn from a stale tab change nothing', () => {
    const a = probe(), b = probe();
    act(() => a.result.current.addGuess({ n: 1 }));
    act(() => a.result.current.addGuess({ n: 2 }));
    const before = raw(PROBE_KEY);
    act(() => { b.result.current.addGuess({ n: 7 }); b.result.current.addGuess({ n: 8 }); });
    expect(raw(PROBE_KEY)).toBe(before);
    expect(b.result.current.guesses).toEqual([{ n: 1 }, { n: 2 }]);
    /* The next turn is the player's own answer to the round they now see. */
    act(() => b.result.current.addGuess({ n: 3 }));
    expect(parsed(PROBE_KEY)).toEqual(good([{ n: 1 }, { n: 2 }, { n: 3 }]));
  });

  it('Transfer Path: a stale tab cannot finish a chain another tab already moved', async () => {
    const key = `transfer-path-daily-${TODAY}`;
    const a = renderHook(() => useTransferPath()), b = renderHook(() => useTransferPath());
    await flush();
    const from = a.result.current.puzzle.playerA, target = a.result.current.puzzle.playerB;
    const keys = clubSeasonsOf(careerPlayers);
    const names = careerPlayers.map((p) => p.name).filter((n) => n !== from && n !== target);
    const open = names.find((n) => shareClub(keys, from, n) && !shareClub(keys, n, target));
    const closing = names.find((n) => shareClub(keys, from, n) && shareClub(keys, n, target));
    expect(open, 'a first man who leaves the chain open').toBeDefined();
    expect(closing, 'a first man who closes it on the spot').toBeDefined();
    act(() => { a.result.current.addPlayer(open!); });
    const one = raw(key);
    expect(JSON.parse(one!).guesses).toEqual([{ t: 'step', player: open, club: shareClub(keys, from, open!) }]);
    act(() => { b.result.current.addPlayer(closing!); });
    expect(raw(key)).toBe(one);
    expect(b.result.current.status).toBe('building');
    expect(b.result.current.chain).toEqual([from, open]);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('Career Path: a stale hint reveals nothing over a board another tab moved', async () => {
    const key = `career-path-daily-${TODAY}`;
    const a = renderHook(() => useCareerGame()), b = renderHook(() => useCareerGame());
    await flush();
    act(() => a.result.current.revealCell('0-goals'));
    const one = raw(key);
    expect(JSON.parse(one!).guesses).toEqual([{ t: 'cell', key: '0-goals' }]);
    act(() => b.result.current.giveHint());
    expect(raw(key)).toBe(one);
    expect([...b.result.current.revealedCells]).toEqual(['0-goals']);
  });
});

/* ------------------------------------------------------------------ 2 */

const HL = [
  { name: 'Afl', slug: 'afl-higher-lower', key: 'afl-hl', hook: useAflHL },
  { name: 'Cfb', slug: 'cfb-higher-lower', key: 'cfb-hl', hook: useCfbHL },
  { name: 'F1', slug: 'f1-higher-lower', key: 'f1-hl', hook: useF1HL },
  { name: 'Golf', slug: 'golf-higher-lower', key: 'golf-hl', hook: useGolfHL },
  { name: 'Hockey', slug: 'hockey-higher-lower', key: 'hockey-hl', hook: useHockeyHL },
  { name: 'Mlb', slug: 'mlb-higher-lower', key: 'mlb-hl', hook: useMlbHL },
  { name: 'Nba', slug: 'nba-higher-lower', key: 'nba-hl', hook: useNbaHL },
  { name: 'Nfl', slug: 'nfl-higher-lower', key: 'nfl-hl', hook: useNflHL },
  { name: 'Tennis', slug: 'tennis-higher-lower', key: 'tennis-hl', hook: useTennisHL },
] as const;
type HLGame = { currentRound: number; results: { correct: boolean }[]; makeGuess: (c: 'left' | 'right') => void; gameStatus: string; currentPair: unknown; showingResult: boolean; isLoading: boolean };
const answer = (view: { result: { current: HLGame } }, choice: 'left' | 'right' = 'left') => {
  act(() => view.result.current.makeGuess(choice));
  act(() => { vi.advanceTimersByTime(2000); });
};

describe('2) the audit steps on every Higher or Lower daily, two tabs over one storage', () => {
  for (const row of HL) {
    const key = `${row.key}-daily-${TODAY}`;
    const draw = () => renderHook(() => row.hook() as unknown as HLGame);

    it(`${row.name}: the stale tab cannot drop a decided round, and jumps to the saved one`, () => {
      const a = draw(), b = draw();
      answer(a, 'left');
      answer(a, 'right');
      const two = raw(key);
      expect(JSON.parse(two!).guesses).toHaveLength(2);
      expect(b.result.current.currentRound).toBe(0);
      answer(b, 'left');
      expect(raw(key)).toBe(two);
      expect(b.result.current.currentRound).toBe(2);
      expect(b.result.current.results.map((r) => r.correct)).toEqual(a.result.current.results.map((r) => r.correct));
      a.unmount();
      const refreshed = draw();
      expect(refreshed.result.current.currentRound).toBe(2);
      expect(refreshed.result.current.results).toHaveLength(2);
      answer(refreshed, 'left');
      expect(JSON.parse(raw(key)!).guesses).toHaveLength(3);
    });

    it(`${row.name}: an open tab moves to the saved round when the other tab writes`, () => {
      const a = draw(), b = draw();
      answer(a);
      answer(a);
      storage(key);
      expect(b.result.current.currentRound).toBe(2);
      expect(b.result.current.showingResult).toBe(false);
      answer(b);
      expect(JSON.parse(raw(key)!).guesses).toHaveLength(3);
    });
  }

  it('Shirt Number: a stale tab cannot drop a guess either', async () => {
    const a = renderHook(() => useShirtNumber()), b = renderHook(() => useShirtNumber());
    await flush();
    const kit = a.result.current.puzzle!.kitNumber;
    const miss = (n: number) => ((kit + n - 1) % 99) + 1;
    const key = `shirt-number-daily-${TODAY}`;
    act(() => a.result.current.submitGuess(miss(1)));
    act(() => a.result.current.submitGuess(miss(2)));
    const two = raw(key);
    act(() => b.result.current.submitGuess(miss(3)));
    expect(raw(key)).toBe(two);
    expect(b.result.current.attempts).toEqual([miss(1), miss(2)]);
  });
});

/* ------------------------------------------------------------------ 3 */

function damaged(head: Record<string, unknown>, long: unknown[]): [string, string][] {
  const save = (guesses: unknown, gameStatus: unknown = 'playing') => JSON.stringify({ ...head, guesses, gameStatus });
  const two = save([{ t: 'result', correct: true }, { t: 'result', correct: false }]);
  return [
    ['guesses null', save(null)],
    ['guesses an object', save({ 0: { t: 'result', correct: true } })],
    ['guesses an array holding null', save([{ t: 'result', correct: true }, null])],
    ['guesses a string', save('abc')],
    ['guesses a number', save(3)],
    ['a save cut off inside the guess array', two.slice(0, two.indexOf('},{') + 2)],
    ['a log one past what the game can write', save(long)],
    ['a finished save from tomorrow', JSON.stringify({ ...head, date: '2026-10-02', guesses: [], gameStatus: 'lost' })],
    ['a status the hook never writes', save([], 'finished')],
  ];
}

/* ----------------------------------------------------------------- 2b */

/* Round 848 review. A stale tab's answer is dropped, but a game that shows
   its verdict beside the answer still showed it: Higher or Lower played its
   two second reveal (right or wrong, and a result row) for a round another
   tab had already decided, Olympics said "Correct! You scored N points" and
   logged the score, Career Path said "Not him, N guesses left" off a count
   that was no longer the day's. A dropped answer now shows nothing but the
   jump to the saved round. */
describe('2b) a dropped answer shows no verdict, only the jump to the saved round', () => {
  for (const row of HL) {
    it(`${row.name} Higher or Lower: no reveal for the dropped answer`, () => {
      const key = `${row.key}-daily-${TODAY}`;
      const a = renderHook(() => row.hook() as unknown as HLGame), b = renderHook(() => row.hook() as unknown as HLGame);
      answer(a, 'left');
      answer(a, 'right');
      const two = raw(key);
      act(() => b.result.current.makeGuess('left'));
      expect(raw(key)).toBe(two);
      expect(b.result.current.showingResult).toBe(false);
      expect(b.result.current.currentRound).toBe(2);
      expect(b.result.current.results.map((r) => r.correct)).toEqual(a.result.current.results.map((r) => r.correct));
    });
  }

  it('Olympics: no "correct, you scored" and no logged score for the dropped answer', async () => {
    const said = vi.spyOn(toast, 'success');
    const a = renderHook(() => useOlympics()), b = renderHook(() => useOlympics());
    await flush();
    act(() => a.result.current.giveUp());
    expect(a.result.current.status).toBe('revealed');
    const given = raw(`olympics-daily-${TODAY}`);
    act(() => b.result.current.submitGuess(b.result.current.athlete.name));
    expect(said).not.toHaveBeenCalled();
    expect(raw(`olympics-daily-${TODAY}`)).toBe(given);
    expect(b.result.current.status).toBe('revealed');
  });

  it('Career Path: no "guesses remaining" for the dropped answer', async () => {
    const said = vi.spyOn(toast, 'error');
    const a = renderHook(() => useCareerGame()), b = renderHook(() => useCareerGame());
    await flush();
    act(() => { a.result.current.makeGuess('Nobody Atall'); });
    expect(said).toHaveBeenCalledTimes(1);
    const one = raw(`career-path-daily-${TODAY}`);
    act(() => { b.result.current.makeGuess('Nobody Else'); });
    expect(said).toHaveBeenCalledTimes(1);
    expect(raw(`career-path-daily-${TODAY}`)).toBe(one);
    expect(b.result.current.guessesUsed).toBe(a.result.current.guessesUsed);
  });
});

describe('3) a damaged save starts the day fresh and the next answer replaces it', () => {
  it('the shared hook', () => {
    for (const [name, bytes] of damaged({ v: 1, date: TODAY, puzzleIndex: 0 }, Array.from({ length: 6 }, (_, n) => ({ n })))) {
      localStorage.clear();
      localStorage.setItem(PROBE_KEY, bytes);
      const view = probe();
      expect(view.result.current.guesses, name).toEqual([]);
      expect(view.result.current.gameStatus, name).toBe('playing');
      expect(consumeRestoredFinish('r848-probe'), name).toBe(false);
      act(() => view.result.current.addGuess({ n: 1 }));
      expect(parsed(PROBE_KEY), name).toEqual(good([{ n: 1 }]));
      view.unmount();
    }
  });

  for (const row of HL) {
    it(`${row.name} Higher or Lower`, () => {
      const key = `${row.key}-daily-${TODAY}`;
      const long = Array.from({ length: 11 }, () => ({ t: 'result', correct: true }));
      for (const [name, bytes] of damaged({ v: 1, date: TODAY, puzzleIndex: 0 }, long)) {
        localStorage.clear();
        localStorage.setItem(key, bytes);
        const view = renderHook(() => row.hook() as unknown as HLGame);
        expect(view.result.current.isLoading, name).toBe(false);
        expect(view.result.current.currentRound, name).toBe(0);
        expect(view.result.current.results, name).toEqual([]);
        expect(view.result.current.gameStatus, name).toBe('playing');
        expect(view.result.current.currentPair, name).not.toBeNull();
        act(() => view.result.current.makeGuess('left'));
        const saved = parsed(key);
        expect(saved.guesses, name).toHaveLength(1);
        expect(saved, name).toEqual({ v: 1, date: TODAY, puzzleIndex: 0, guesses: [{ t: 'result', correct: saved.guesses[0].correct }], gameStatus: 'playing' });
        expect(typeof saved.guesses[0].correct, name).toBe('boolean');
        view.unmount();
      }
    });
  }
});

/* ------------------------------------------------------------------ 4 */

/* Everything a hook hands its page, functions left out. */
const snapshot = (value: unknown) => JSON.stringify(value, (_k, v) => (typeof v === 'function' ? undefined : v instanceof Set ? [...v] : v));

describe('4) the consumers no route renders today', () => {
  const rows = [
    { name: 'Football Draft', hook: useFootballDraft },
    { name: 'Guess the Transfer Value', hook: useGuessTransferValue },
    { name: 'World Cup', hook: useWorldCup },
  ];
  for (const row of rows) {
    it(row.name, async () => {
      const fresh = renderHook(() => row.hook());
      await flush();
      const base = [...seen.entries()].find(([, s]) => s.loaded);
      expect(base, 'the daily hook loaded').toBeDefined();
      const [slug, at] = base!;
      const expected = snapshot(fresh.result.current);
      fresh.unmount();
      const head = { v: 1, date: TODAY, puzzleIndex: at.index, ...(at.id !== undefined ? { puzzleId: at.id } : {}) };
      for (const [name, bytes] of damaged(head, []).filter(([n]) => !n.startsWith('a log one past'))) {
        localStorage.clear();
        seen.clear();
        localStorage.setItem(`${slug}-daily-${TODAY}`, bytes);
        const view = renderHook(() => row.hook());
        await flush();
        expect(snapshot(view.result.current), name).toBe(expected);
        view.unmount();
      }
    });
  }
});

/* ------------------------------------------------------------------ 5 */

type Old = {
  key: string;
  draw: () => { result: { current: unknown }; unmount: () => void };
  play: (view: { result: { current: any } }) => Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
  state: (game: any) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const hlState = (g: HLGame & { totalScore: number }) => ({ round: g.currentRound, results: g.results.map((r) => r.correct), status: g.gameStatus, score: g.totalScore });
const OLD: Record<string, Old> = {
  'afl-higher-lower': {
    key: `afl-hl-daily-${TODAY}`, draw: () => renderHook(() => useAflHL()),
    play: async (v) => { for (const c of ['left', 'right', 'left'] as const) answer(v, c); }, state: hlState,
  },
  'nfl-higher-lower': {
    key: `nfl-hl-daily-${TODAY}`, draw: () => renderHook(() => useNflHL()),
    play: async (v) => { for (let i = 0; i < 10; i++) answer(v, i % 3 ? 'left' : 'right'); }, state: hlState,
  },
  'shirt-number': {
    key: `shirt-number-daily-${TODAY}`, draw: () => renderHook(() => useShirtNumber()),
    play: async (v) => {
      await flush();
      const kit = v.result.current.puzzle.kitNumber as number;
      for (const n of [1, 2]) act(() => v.result.current.submitGuess(((kit + n - 1) % 99) + 1));
    },
    state: (g) => ({ attempts: g.attempts, status: g.status, score: g.score }),
  },
  footle: {
    key: `footle-daily-${TODAY}`, draw: () => renderHook(() => useGame()),
    play: async (v) => {
      await flush();
      const picks = v.result.current.availablePlayers.filter((p: { name: string }) => p.name !== v.result.current.targetPlayer.name).slice(0, 2);
      for (const p of picks) act(() => v.result.current.makeGuess(p));
    },
    state: (g) => ({ guesses: g.guesses.map((x: { playerName: string; isCorrect: boolean }) => [x.playerName, x.isCorrect]), status: g.gameStatus }),
  },
  ufc: {
    key: `ufc-game-daily-${TODAY}`, draw: () => renderHook(() => useUfcGame()),
    play: async (v) => {
      await flush();
      const picks = v.result.current.fighters.filter((f: { name: string }) => f.name !== v.result.current.targetFighter.name).slice(0, 2);
      for (const f of picks) act(() => v.result.current.makeGuess(f));
    },
    state: (g) => ({ guesses: g.guesses.map((x: { fighterName: string; isCorrect: boolean }) => [x.fighterName, x.isCorrect]), status: g.gameStatus }),
  },
  'nba-connections': {
    key: `nba-connections-daily-${TODAY}`, draw: () => renderHook(() => useNbaConnections()),
    play: async (v) => {
      await flush();
      const groups = v.result.current.puzzle.groups as { players: string[] }[];
      for (const name of groups[0].players) act(() => v.result.current.togglePlayer(name));
      act(() => v.result.current.submitSelection());
      for (const name of [...groups[1].players.slice(0, 2), ...groups[2].players.slice(0, 3)]) act(() => v.result.current.togglePlayer(name));
      act(() => v.result.current.submitSelection());
    },
    state: (g) => ({ solved: g.solvedGroups.map((s: { theme: string }) => s.theme), lives: g.lives, status: g.gameStatus }),
  },
};
const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/dailySavesPre848.json');
type Saved = { game: string; key: string; bytes: string; restored: unknown };

describe('5) saves written before this round load unchanged', () => {
  it.runIf(!!process.env.R848_SAVES_OUT)('captures saves from the hook under test (the harness points it at the pre 848 code)', async () => {
    const out: Saved[] = [];
    for (const [game, row] of Object.entries(OLD)) {
      localStorage.clear();
      const view = row.draw();
      await row.play(view);
      const bytes = raw(row.key);
      expect(bytes, game).not.toBeNull();
      view.unmount();
      const again = row.draw();
      await flush();
      out.push({ game, key: row.key, bytes: bytes!, restored: row.state(again.result.current) });
      again.unmount();
    }
    fs.writeFileSync(process.env.R848_SAVES_OUT!, JSON.stringify({ date: TODAY, saves: out }, null, 2) + '\n');
  });

  it('restores every one through the new code to the same state, bytes untouched, nothing recorded', async () => {
    const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as { date: string; saves: Saved[] };
    expect(fixture.date).toBe(TODAY);
    expect(fixture.saves.map((s) => s.game).sort()).toEqual(Object.keys(OLD).sort());
    for (const save of fixture.saves) {
      localStorage.clear();
      localStorage.setItem(save.key, save.bytes);
      const view = OLD[save.game].draw();
      await flush();
      expect(OLD[save.game].state(view.result.current), save.game).toEqual(save.restored);
      expect(raw(save.key), save.game).toBe(save.bytes);
      view.unmount();
    }
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
