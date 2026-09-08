import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConquestDailyResult, ConquestDailyRun, ConquestSport } from '@/lib/conquestDaily';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/components/conquest/ConquestRegionMap', () => ({ default: () => null, useOwnerTakeover: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

import ImperialismBoardShared from '@/components/conquest/ImperialismBoardShared';
import { NFL_CONQUEST_GAME, NFL_IMPERIALISM } from '@/data/conquestSports';
import { NFL_CONQUEST_MAP } from '@/data/conquestData';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import {
  dailyConquestRng,
  commitDailyRun,
  loadDailyRun,
  loadDailyStreak,
  saveDailyResult,
  saveDailyRun,
} from '@/lib/conquestDaily';
import { continueRun, dailyRunRecord, featuredPairing, playRound, startRun } from '@/lib/conquestRun';
import { writeDailyRecord } from '@/lib/dailyRecord';
import { recordCompletion } from '@/lib/completions';

const OLD_DATE = '2026-09-06';
const NEW_DATE = '2026-09-07';
const NEXT_DATE = '2026-09-08';
const SKIPPED_DATE = '2026-09-10';
const PUZZLES = [{ id: 'first' }, { id: 'second' }];
const GET_PUZZLE_ID = (puzzle: { id: string }) => puzzle.id;
const NEVER_WON = () => false;
const DESERIALIZE_GUESSES = (raw: unknown) => raw as string[];
const SPORTS: ConquestSport[] = ['nfl', 'nba', 'mlb', 'nhl', 'soccer'];

const resultFor = (sport: ConquestSport, date: string): ConquestDailyResult => ({
  date,
  team: `${sport}-team`,
  score: 125,
  empire: 4,
  calls: 3,
  callsTotal: 5,
  champion: `${sport}-champion`,
  championWasYou: false,
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${OLD_DATE}T16:00:00Z`));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('daily record cleanup', () => {
  it('an older write preserves the newer record byte for byte', () => {
    writeDailyRecord('midnight-probe', OLD_DATE, { guesses: ['old'] });
    writeDailyRecord('midnight-probe', NEW_DATE, { guesses: ['new', 'progress'] });
    const newer = localStorage.getItem('midnight-probe-daily-2026-09-07');

    writeDailyRecord('midnight-probe', OLD_DATE, { guesses: ['old', 'late'] });

    expect(localStorage.getItem('midnight-probe-daily-2026-09-07')).toBe(newer);
    expect(JSON.parse(newer!).guesses).toEqual(['new', 'progress']);
    expect(JSON.parse(localStorage.getItem('midnight-probe-daily-2026-09-06')!).guesses).toEqual(['old', 'late']);
  });

  it('prunes only older canonical dates for the exact slug', () => {
    const keep = new Map<string, string>([
      ['midnight-probe-daily-2026-09-08', 'future'],
      ['other-midnight-probe-daily-2026-09-05', 'unrelated'],
      ['midnight-probe-extra-daily-2026-09-05', 'nested prefix'],
      ['midnight-probe-daily-extra-daily-2026-09-05', 'nested suffix'],
      ['midnight-probe-daily-2026-9-05', 'malformed width'],
      ['midnight-probe-daily-2026-02-31', 'invalid day'],
      ['midnight-probe-daily-note', 'malformed suffix'],
    ]);
    localStorage.setItem('midnight-probe-daily-2025-12-31', 'prior year');
    localStorage.setItem('midnight-probe-daily-2026-08-31', 'prior month');
    for (const [key, value] of keep) localStorage.setItem(key, value);

    writeDailyRecord('midnight-probe', NEW_DATE, { guesses: ['same date replacement'] });

    expect(localStorage.getItem('midnight-probe-daily-2025-12-31')).toBeNull();
    expect(localStorage.getItem('midnight-probe-daily-2026-08-31')).toBeNull();
    for (const [key, value] of keep) expect(localStorage.getItem(key), key).toBe(value);
  });

  it('an invalid cutoff leaves every record untouched', () => {
    localStorage.setItem('midnight-probe-daily-2026-09-05', 'older');
    localStorage.setItem('midnight-probe-daily-2026-09-07', 'newer');

    writeDailyRecord('midnight-probe', '2026-02-31', { guesses: ['invalid cutoff'] });

    expect(localStorage.getItem('midnight-probe-daily-2026-09-05')).toBe('older');
    expect(localStorage.getItem('midnight-probe-daily-2026-09-07')).toBe('newer');
  });

  it('replaces the same date and prunes an older month only after the write succeeds', () => {
    localStorage.setItem('midnight-probe-daily-2026-08-31', 'older');
    writeDailyRecord('midnight-probe', NEW_DATE, { guesses: ['first'] });
    writeDailyRecord('midnight-probe', NEW_DATE, { guesses: ['replacement'] });
    expect(JSON.parse(localStorage.getItem('midnight-probe-daily-2026-09-07')!).guesses).toEqual(['replacement']);
    expect(localStorage.getItem('midnight-probe-daily-2026-08-31')).toBeNull();

    localStorage.setItem('midnight-probe-daily-2026-09-06', 'must survive failed write');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage full'); });
    writeDailyRecord('midnight-probe', NEXT_DATE, { guesses: ['not saved'] });
    expect(localStorage.getItem('midnight-probe-daily-2026-09-06')).toBe('must survive failed write');
  });
});

describe('useDailyPuzzle stays pinned across midnight', () => {
  const useProbe = (supabasePuzzle: { id: string }) => useDailyPuzzle<{ id: string }, string>({
    gameSlug: 'midnight-hook',
    puzzles: PUZZLES,
    supabasePuzzle,
    getPuzzleId: GET_PUZZLE_ID,
    maxGuesses: 10,
    isWon: NEVER_WON,
    deserializeGuesses: DESERIALIZE_GUESSES,
  });

  it('an old hook reload cannot clean up a newer hook record', async () => {
    const old = renderHook(({ puzzle }) => useProbe(puzzle), { initialProps: { puzzle: PUZZLES[0] } });
    await waitFor(() => expect(old.result.current.isLoading).toBe(false));
    act(() => old.result.current.addGuess('old progress'));

    vi.setSystemTime(new Date(`${NEW_DATE}T16:00:00Z`));
    const newer = renderHook(() => useProbe(PUZZLES[0]));
    await waitFor(() => expect(newer.result.current.isLoading).toBe(false));
    act(() => {
      newer.result.current.addGuess('new');
      newer.result.current.addGuess('progress');
    });
    const newerRaw = localStorage.getItem('midnight-hook-daily-2026-09-07');

    old.rerender({ puzzle: PUZZLES[1] });
    await waitFor(() => expect(old.result.current.puzzleIndex).toBe(1));
    await waitFor(() => expect(old.result.current.guesses).toEqual([]));

    expect(old.result.current.todayStr).toBe(OLD_DATE);
    expect(localStorage.getItem('midnight-hook-daily-2026-09-07')).toBe(newerRaw);
  });

  it('an ordinary older addGuess already preserves a newer hook record', async () => {
    const old = renderHook(() => useProbe(PUZZLES[0]));
    await waitFor(() => expect(old.result.current.isLoading).toBe(false));
    vi.setSystemTime(new Date(`${NEW_DATE}T16:00:00Z`));
    const newer = renderHook(() => useProbe(PUZZLES[0]));
    await waitFor(() => expect(newer.result.current.isLoading).toBe(false));
    act(() => newer.result.current.addGuess('new progress'));
    const newerRaw = localStorage.getItem('midnight-hook-daily-2026-09-07');

    act(() => old.result.current.addGuess('old late guess'));

    expect(localStorage.getItem('midnight-hook-daily-2026-09-07')).toBe(newerRaw);
    expect(JSON.parse(localStorage.getItem('midnight-hook-daily-2026-09-06')!).guesses).toEqual(['old late guess']);
  });
});

describe.each(SPORTS)('%s Conquest streaks stay monotonic', (sport) => {
  it('preserves a newer result and streak when an older result arrives late', () => {
    expect(saveDailyResult(sport, resultFor(sport, OLD_DATE), OLD_DATE, ['old'])).toBe(1);
    expect(saveDailyResult(sport, resultFor(sport, NEW_DATE), NEW_DATE, ['new'])).toBe(2);
    expect(JSON.parse(localStorage.getItem(`conquest-daily-streak-${sport}`)!)).toEqual({ count: 2, lastDate: NEW_DATE });
    const newerStreak = localStorage.getItem(`conquest-daily-streak-${sport}`);
    const newerResult = localStorage.getItem(`conquest-${sport}-daily-${NEW_DATE}`);

    expect(saveDailyResult(sport, resultFor(sport, OLD_DATE), OLD_DATE, ['old', 'late'])).toBe(0);

    expect(localStorage.getItem(`conquest-daily-streak-${sport}`)).toBe(newerStreak);
    expect(localStorage.getItem(`conquest-${sport}-daily-${NEW_DATE}`)).toBe(newerResult);
    expect(localStorage.getItem(`conquest-${sport}-daily-${OLD_DATE}`)).not.toBeNull();
  });

  it('is idempotent on one day, increments consecutively, resets after a gap and hides future streaks', () => {
    expect(saveDailyResult(sport, resultFor(sport, OLD_DATE), OLD_DATE)).toBe(1);
    expect(saveDailyResult(sport, resultFor(sport, OLD_DATE), OLD_DATE)).toBe(1);
    expect(saveDailyResult(sport, resultFor(sport, NEW_DATE), NEW_DATE)).toBe(2);
    expect(saveDailyResult(sport, resultFor(sport, NEXT_DATE), NEXT_DATE)).toBe(3);
    expect(loadDailyStreak(sport, OLD_DATE)).toBe(0);
    expect(saveDailyResult(sport, resultFor(sport, SKIPPED_DATE), SKIPPED_DATE)).toBe(1);
    expect(loadDailyStreak(sport, SKIPPED_DATE)).toBe(1);
  });
});

describe('Conquest streak serialization', () => {
  it('serializes different dates and updates each final streak before releasing the sport lock', async () => {
    const sport: ConquestSport = 'nfl';
    const pending = (date: string): ConquestDailyRun => ({
      team: `team-${date}`,
      picks: ['pick'],
      done: false,
      result: null,
    });
    const finished = (date: string): ConquestDailyRun => ({
      team: `team-${date}`,
      picks: ['pick', 'final'],
      done: true,
      result: resultFor(sport, date),
    });
    for (const date of [OLD_DATE, NEW_DATE]) {
      localStorage.setItem(`conquest-nfl-daily-${date}`, JSON.stringify({
        ...pending(date),
        v: 1,
        date,
      }));
    }

    let signalFirstEntered!: () => void;
    const firstEntered = new Promise<void>((resolve) => { signalFirstEntered = resolve; });
    let releaseFirst!: () => void;
    const firstReleased = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const tails = new Map<string, Promise<unknown>>();
    const streakInsideCallback: Array<string | null> = [];
    let activeCallbacks = 0;
    let overlap = false;
    let requestNumber = 0;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: (key: string, callback: () => unknown) => {
        const thisRequest = requestNumber;
        requestNumber += 1;
        const task = (tails.get(key) ?? Promise.resolve()).then(async () => {
          activeCallbacks += 1;
          if (activeCallbacks > 1) overlap = true;
          if (thisRequest === 0) {
            signalFirstEntered();
            await firstReleased;
          }
          const outcome = await callback();
          streakInsideCallback.push(localStorage.getItem('conquest-daily-streak-nfl'));
          activeCallbacks -= 1;
          return outcome;
        });
        tails.set(key, task.catch(() => undefined));
        return task;
      } },
    });

    const olderCommit = commitDailyRun(sport, pending(OLD_DATE), finished(OLD_DATE), OLD_DATE);
    await firstEntered;
    const newerCommit = commitDailyRun(sport, pending(NEW_DATE), finished(NEW_DATE), NEW_DATE);
    await Promise.resolve();
    await Promise.resolve();
    const newerWhileOlderHeld = loadDailyRun(sport, NEW_DATE);
    const overlappedWhileHeld = overlap;
    releaseFirst();
    const outcomes = await Promise.all([olderCommit, newerCommit]);

    expect(overlappedWhileHeld).toBe(false);
    expect(newerWhileOlderHeld).toEqual(pending(NEW_DATE));
    expect(outcomes).toEqual(['saved', 'saved']);
    expect(streakInsideCallback.map((raw) => raw && JSON.parse(raw))).toEqual([
      { count: 1, lastDate: OLD_DATE },
      { count: 2, lastDate: NEW_DATE },
    ]);
    expect(JSON.parse(localStorage.getItem('conquest-daily-streak-nfl')!)).toEqual({
      count: 2,
      lastDate: NEW_DATE,
    });
    expect(loadDailyRun(sport, NEW_DATE)).toEqual(finished(NEW_DATE));
  });
});

const boardSport = NFL_IMPERIALISM;
type Tab = ReturnType<typeof within>;

function openTab(): Tab {
  return within(render(
    <ImperialismBoardShared sport={boardSport} map={NFL_CONQUEST_MAP} game={NFL_CONQUEST_GAME} />,
  ).container);
}

async function tap(button: HTMLElement) {
  await act(async () => { fireEvent.click(button); });
}

async function play(tab: Tab, away = false) {
  const calls = tab.getAllByRole('button', { name: /% to win$/ });
  await tap(calls[away ? 1 : 0]);
  await tap(tab.getByRole('button', { name: /^Play / }));
}

async function pickTeam(tab: Tab, index = 3) {
  const team = boardSport.teams[index];
  await tap(tab.getByRole('button', { name: new RegExp(`^${team.city} ${team.name} `) }));
}

async function finish(tab: Tab) {
  for (let round = 0; round <= boardSport.regularRounds + 3; round += 1) {
    const final = tab.queryByRole('button', { name: 'See the final map' });
    if (final) { await tap(final); return; }
    const next = tab.queryByRole('button', { name: 'Continue' });
    if (next) await tap(next);
    await play(tab);
  }
  throw new Error('The real Conquest season did not reach its final map');
}

function seedFinalRecap(date: string) {
  const rng = dailyConquestRng(boardSport.key, date);
  let run = startRun(boardSport, boardSport.teams[3].id, rng);
  while (!run.champion) {
    if (run.phase === 'recap') run = continueRun(boardSport, run, rng);
    run = playRound(boardSport, run, featuredPairing(boardSport, run)![0], rng);
  }
  saveDailyRun(boardSport.key, dailyRunRecord(run), date);
}

describe('Conquest board completion across midnight', () => {
  it('keeps the newer finished board after the older completion request resolves', async () => {
    seedFinalRecap(OLD_DATE);
    let signalOldSaved!: () => void;
    const oldSaved = new Promise<void>((resolve) => { signalOldSaved = resolve; });
    let releaseOld!: () => void;
    const released = new Promise<void>((resolve) => { releaseOld = resolve; });
    let oldRequest: Promise<unknown> | null = null;
    const tails = new Map<string, Promise<unknown>>();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: (key: string, callback: () => unknown) => {
        const deferDelivery = oldRequest === null;
        const callbackTask = (tails.get(key) ?? Promise.resolve()).then(callback);
        tails.set(key, callbackTask.catch(() => undefined));
        const delivery = callbackTask.then(async (outcome) => {
          if (outcome === 'saved' && deferDelivery) {
            signalOldSaved();
            await released;
          }
          return outcome;
        });
        if (deferDelivery) oldRequest = delivery;
        return delivery;
      } },
    });

    const old = openTab();
    fireEvent.click(old.getByRole('button', { name: 'See the final map' }));
    await oldSaved;

    vi.setSystemTime(new Date(`${NEW_DATE}T16:00:00Z`));
    seedFinalRecap(NEW_DATE);
    const newer = openTab();
    await tap(newer.getByRole('button', { name: 'See the final map' }));
    const newerResult = localStorage.getItem(`conquest-nfl-daily-${NEW_DATE}`);
    const newerStreak = localStorage.getItem('conquest-daily-streak-nfl');
    expect(newerResult).not.toBeNull();
    expect(newerStreak).not.toBeNull();

    await act(async () => {
      releaseOld();
      await oldRequest;
    });

    expect(localStorage.getItem(`conquest-nfl-daily-${NEW_DATE}`)).toBe(newerResult);
    expect(localStorage.getItem('conquest-daily-streak-nfl')).toBe(newerStreak);
    expect(old.getByText(/rule the map$/)).toBeInTheDocument();
  });

  it('a same-day stale commit shows saved progress and never reaches a second finish', async () => {
    let tail: Promise<unknown> = Promise.resolve();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: (_key: string, callback: () => unknown) => {
        const task = tail.then(callback);
        tail = task.catch(() => undefined);
        return task;
      } },
    });
    const first = openTab();
    await pickTeam(first);
    const stale = openTab();
    await finish(first);
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    await play(stale, true);

    expect(stale.getByText("Today's Conquest is in the books")).toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 15_000);
});
