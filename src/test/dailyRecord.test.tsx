/**
 * Round 495: a daily is recorded AS IT GOES, and the record replays the exact
 * run. Driven through scripts/simDailyRecord.mjs.
 *
 * THE BUG. src/hooks/useDailyPuzzle.ts addGuess closed over the `guesses`
 * state array. A handler that added more than one guess in a single tick had
 * every call rebuild [...guesses, guess] from the SAME base, so only the last
 * one survived, and the synchronous write went out from that same stale array.
 *
 * Measured on the live site on 2026-09-06: the Transfer Path daily was
 * Antoine Griezmann to Moises Caicedo, optimal 2. A player typed two names,
 * the second of which also linked to the target, so the chain auto closed at
 * three steps. The board said "1 step" and paid 1000. The stored record held
 * one step and the win; the second name typed and the auto added target were
 * both gone. The true chain was three steps and scores 900.
 *
 * WHAT THIS SUITE MEASURES, and why each section is here:
 *   (1) the engine itself: three addGuess calls in one tick, and a loop of
 *       four, must all reach the record. No game in it, so it holds for a
 *       game written tomorrow.
 *   (2) Transfer Path through the REAL hook, played to a win the way the
 *       reproduction did it. The record must replay the exact chain and the
 *       score on screen must be the exact score that chain earns.
 *   (3) Career Path through the REAL hook. giveHint reveals four cells with
 *       a forEach over addDailyAction, which is the same defect wearing a
 *       loop instead of a sequence. Found by the Round 495 caller sweep.
 *
 * The oracle in (2) is the game's own scoring rule, printed in its own hook:
 * 1000 points less 100 for every step past the optimum. So the suite plays a
 * chain whose length it knows, and requires the paid score to be the score
 * that chain is worth, rather than trusting whatever the board says.
 *
 * NEGATIVE CONTROL: DAILY_RECORD_CONTROL=stale points @/hooks/useDailyPuzzle
 * at a copy carrying the pre 495 closure reads (see vitest.config.ts and
 * scripts/simDailyRecord.mjs). Every section must go RED on it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { CareerPlayer } from '@/types/career';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';

// ---------------------------------------------------------------------------
// Fixtures. A four man chain with exactly one link per hop, so the path the
// test walks is the only path there is and nothing here depends on real data.
// ---------------------------------------------------------------------------

const season = (s: string, club: string) => ({
  season: s,
  club,
  goals: 1,
  assists: 1,
  appearances: 10,
  marketValue: 1_000_000,
});

/** START -mid1- MID1 -mid2- MID2 -mid3- TARGET. Three hops, no shortcuts. */
const CHAIN_PLAYERS: CareerPlayer[] = [
  { name: 'Start Man', nationality: 'Brazil', position: 'FW', career: [season('2020-2021', 'Alpha FC')] },
  { name: 'Mid One', nationality: 'Brazil', position: 'MF', career: [season('2020-2021', 'Alpha FC'), season('2021-2022', 'Beta FC')] },
  { name: 'Mid Two', nationality: 'Brazil', position: 'MF', career: [season('2021-2022', 'Beta FC'), season('2022-2023', 'Gamma FC')] },
  { name: 'Target Man', nationality: 'Brazil', position: 'DF', career: [season('2022-2023', 'Gamma FC')] },
];

/* minSteps 2 against a chain the test walks in 3, so a dropped step and a
   correct one score differently (900 versus 1000) and the assertion on the
   score cannot pass by accident. */
const CHAIN_PUZZLE: TransferPathPuzzle = {
  id: 'tp-fixture-495',
  playerA: 'Start Man',
  playerB: 'Target Man',
  minSteps: 2,
  hint: 'Fixture pair.',
  active: null,
  europe: null,
};

/** Career Path's daily target: two seasons, so 10 cells and a 4 cell hint. */
const CAREER_PLAYER: CareerPlayer = {
  name: 'Hint Target',
  nationality: 'Brazil',
  position: 'FW',
  career: [season('2020-2021', 'Alpha FC'), season('2021-2022', 'Beta FC')],
};

// ---------------------------------------------------------------------------
// Mocks: the network and the recorder only. The hooks under test, the daily
// engine, dateUtils and jsdom's localStorage all stay real.
// ---------------------------------------------------------------------------

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: async () => undefined }),
}));

vi.mock('sonner', () => ({ toast: { success: () => undefined, error: () => undefined, info: () => undefined } }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

vi.mock('@/lib/fetchTransferPathPuzzles', () => ({
  fetchTransferPathPuzzles: async () => [CHAIN_PUZZLE],
}));
vi.mock('@/lib/fetchCareerPlayers', () => ({
  fetchCareerPlayers: async () => [...CHAIN_PLAYERS, CAREER_PLAYER],
}));

import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useTransferPath } from '@/hooks/useTransferPath';
import { useCareerGame } from '@/hooks/useCareerGame';
import { getTodayET } from '@/lib/dateUtils';

const note = (msg: string) => console.log('RECORD| ' + msg);

/** The stored daily record for a slug, or null. Read as a player's browser holds it. */
function storedRecord(slug: string): { guesses: unknown[]; gameStatus: string } | null {
  const raw = localStorage.getItem(`${slug}-daily-${getTodayET()}`);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------

describe('daily record', () => {
  it('(1) the engine keeps every guess a handler adds in one tick', async () => {
    type G = { n: number };
    const { result } = renderHook(() =>
      useDailyPuzzle<{ id: string }, G>({
        gameSlug: 'record-probe',
        puzzles: [{ id: 'p1' }],
        maxGuesses: 99,
        isWon: (g) => g.some((x) => x.n === 99),
        deserializeGuesses: (raw) => raw as G[],
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // A sequence, the Transfer Path shape: three calls from one handler.
    act(() => {
      result.current.addGuess({ n: 1 });
      result.current.addGuess({ n: 2 });
      result.current.addGuess({ n: 3 });
    });

    const afterSequence = storedRecord('record-probe');
    note(`sequence of 3: state holds ${result.current.guesses.length}, record holds ${afterSequence?.guesses.length}`);
    expect(result.current.guesses).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(afterSequence?.guesses).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);

    // A loop, the Career Path shape: four calls from one forEach.
    act(() => {
      [4, 5, 6, 7].forEach((n) => result.current.addGuess({ n }));
    });

    const afterLoop = storedRecord('record-probe');
    note(`loop of 4: record now holds ${afterLoop?.guesses.length}`);
    expect(afterLoop?.guesses).toHaveLength(7);
    expect((afterLoop?.guesses as G[]).map((g) => g.n)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // The status the LAST call produces is the status that is stored, and a
    // call after the win is refused rather than appended.
    act(() => {
      result.current.addGuess({ n: 8 });
      result.current.addGuess({ n: 99 });
      result.current.addGuess({ n: 100 });
    });
    const afterWin = storedRecord('record-probe');
    note(`win mid-tick: status ${afterWin?.gameStatus}, record holds ${afterWin?.guesses.length}`);
    expect(afterWin?.gameStatus).toBe('won');
    expect((afterWin?.guesses as G[]).map((g) => g.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 99]);
  });

  it('(2) Transfer Path: the record replays the exact chain and pays the exact score', async () => {
    const { result } = renderHook(() => useTransferPath());
    await waitFor(() => expect(result.current.isLoadingPool).toBe(false));
    await waitFor(() => expect(result.current.puzzle.id).toBe(CHAIN_PUZZLE.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.chain).toEqual(['Start Man']);
    expect(result.current.optimal).toBe(2);

    // The reproduction: one accepted name, then a second that also links to
    // the target, so the hook closes the chain itself inside the same handler.
    act(() => {
      const first = result.current.addPlayer('Mid One');
      expect(first.ok).toBe(true);
    });
    act(() => {
      const second = result.current.addPlayer('Mid Two');
      expect(second.ok).toBe(true);
    });

    const played = ['Start Man', 'Mid One', 'Mid Two', 'Target Man'];
    const steps = played.length - 1;
    const owed = Math.max(0, 1000 - Math.max(0, steps - CHAIN_PUZZLE.minSteps) * 100);

    note(`on screen: chain ${result.current.chain.join(' -> ')}, ${result.current.chain.length - 1} step(s), score ${result.current.score}`);

    expect(result.current.status).toBe('won');
    expect(result.current.chain).toEqual(played);
    expect(result.current.score).toBe(owed);
    expect(owed).toBe(900);

    // The record is the half that was lying. It has to replay the same run.
    const stored = storedRecord('transfer-path');
    const actions = (stored?.guesses ?? []) as { t: string; player?: string; club?: string }[];
    note(`recorded: ${JSON.stringify(actions)}`);

    expect(stored?.gameStatus).toBe('won');
    expect(actions.filter((a) => a.t === 'step').map((a) => a.player)).toEqual(['Mid One', 'Mid Two', 'Target Man']);
    expect(actions.filter((a) => a.t === 'step').map((a) => a.club)).toEqual(['Alpha FC', 'Beta FC', 'Gamma FC']);
    expect(actions[actions.length - 1].t).toBe('won');

    // Replaying the record the way the page does must give back the same
    // chain and the same score, which is the whole point of storing it.
    const replayChain = ['Start Man', ...actions.filter((a) => a.t === 'step').map((a) => a.player)];
    const replayScore = Math.max(0, 1000 - Math.max(0, replayChain.length - 1 - CHAIN_PUZZLE.minSteps) * 100);
    note(`replayed from the record: ${replayChain.join(' -> ')}, score ${replayScore}`);
    expect(replayChain).toEqual(played);
    expect(replayScore).toBe(owed);
  });

  it('(3) Career Path: a four cell hint records four cells', async () => {
    const { result } = renderHook(() => useCareerGame());
    await waitFor(() => expect(result.current.isLoadingPool).toBe(false));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe('daily');

    const before = result.current.revealedCells.size;
    act(() => { result.current.giveHint(); });

    const stored = storedRecord('career-path');
    const cells = ((stored?.guesses ?? []) as { t: string; key?: string }[]).filter((a) => a.t === 'cell');
    note(`hint: ${before} cell(s) before, ${result.current.revealedCells.size} on screen, ${cells.length} recorded, boxesUsed ${result.current.boxesUsed}`);

    // giveHint reveals min(4, unrevealed). The fixture player has 10 cells,
    // so a healthy hint is four distinct cells, on screen and on the record.
    expect(result.current.revealedCells.size).toBe(before + 4);
    expect(cells).toHaveLength(4);
    expect(new Set(cells.map((c) => c.key)).size).toBe(4);
    expect(result.current.boxesUsed).toBe(4);
  });
});
