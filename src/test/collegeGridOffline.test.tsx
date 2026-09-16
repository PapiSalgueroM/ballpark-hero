/**
 * Round 611: every College Grid board can be won AND lost with the network
 * gone, through the REAL hook. Driven by scripts/simCollegeGridKey.mjs
 * section 4, which also runs the nocount control below and grades it.
 *
 * THE BUG THIS ROUND FIXED. The page sent every guess to an AI validator
 * that runs out of its free allowance for most of the US day, and a guess it
 * could not confirm was never counted. A board ends only at 9 correct or 15
 * counted guesses, so from 2026-07-31 no College Grid board recorded a
 * finish at all. Now the key is judged in memory and only a definite no
 * costs a turn.
 *
 * WHAT THIS SUITE DOES, for each of the 75 boards in
 * src/data/collegeGridPuzzles.ts:
 *   (4a) a win bot finds nine different players, one yes per cell, with the
 *        real judge over the committed key, and submits them through
 *        useCollegeGrid. The board must end won after exactly 9 counted
 *        guesses and record a finish worth 900.
 *   (4b) a loss bot submits a player the real judge calls a definite no, 15
 *        times. The board must end lost at 15 counted guesses and record a
 *        finish worth 0.
 *
 * THE NETWORK IS STUBBED TO THROW. The supabase client serves one table,
 * college_grid_players, straight out of scripts/data/collegeGridPlayers.json
 * (the file the table is loaded from), and throws on every other table, on
 * functions.invoke and on fetch. So the rarity count and the selection
 * insert both throw on every correct pick, and a board still has to finish.
 * The suite asserts the stub was actually hit.
 *
 * NEGATIVE CONTROL: CG_OFFLINE_CONTROL=nocount wraps judgeCollegeCell as the
 * hook sees it so every verdict that is not yes comes back unknown, the world
 * before this round. It counts the no verdicts it turned into unknown, so the
 * harness can see it changed something, and (4b) must fail: no board ends.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import type { GridPuzzle } from '@/types/footballGrid';

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  boards: [] as unknown[],
  networkThrows: 0,
  keyPages: 0,
  flipped: 0,
}));

const KEY_FILE = path.resolve(process.cwd(), 'scripts/data/collegeGridPlayers.json');
const TABLE_COLUMNS = ['id', 'display_name', 'name_norm', 'colleges', 'colleges_agreed', 'groups', 'best_pick', 'first_round', 'undrafted', 'heisman_year', 'first_season', 'seasons', 'dup'];

/** The key as the table holds it: the committed file's rows, table columns only, ordered on id. */
function loadTableRows(): Record<string, unknown>[] {
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')) as { columns: string[]; rows: unknown[][] };
  const at = TABLE_COLUMNS.map((c) => file.columns.indexOf(c));
  if (at.some((i) => i < 0)) throw new Error('collegeGridPlayers.json is missing a table column');
  return file.rows
    .map((r) => Object.fromEntries(TABLE_COLUMNS.map((c, k) => [c, r[at[k]]])))
    .sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
}

vi.mock('@/integrations/supabase/client', () => {
  const refuse = (what: string) => {
    state.networkThrows += 1;
    throw new Error(`network stubbed to throw: ${what}`);
  };
  const from = (table: string) => {
    if (table !== 'college_grid_players') return refuse(table);
    const q = {
      select: () => q,
      not: () => q,
      order: () => q,
      range: async (lo: number, hi: number) => {
        state.keyPages += 1;
        return { data: state.rows.slice(lo, hi + 1), error: null };
      },
    };
    return q;
  };
  return {
    SUPABASE_URL: 'https://offline.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'offline',
    supabase: { from, functions: { invoke: () => refuse('functions.invoke') }, rpc: () => refuse('rpc') },
  };
});

vi.mock('@/data/collegeGridPuzzles', () => ({ collegeGridPuzzles: state.boards }));

vi.mock('@/lib/collegeGrid', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/collegeGrid')>();
  const control = process.env.CG_OFFLINE_CONTROL || '';
  if (control && control !== 'nocount') throw new Error(`CG_OFFLINE_CONTROL=${control} is not a control this suite knows (nocount)`);
  /* The key is paged through the stub once and the result reused, so 150
     boards do not index 35,000 rows 150 times. */
  let cached: ReturnType<typeof actual.fetchCollegeGridData> | null = null;
  const fetchCollegeGridData = () => (cached ??= actual.fetchCollegeGridData());
  const judgeCollegeCell: typeof actual.judgeCollegeCell = control === 'nocount'
    ? (entry, row, col) => {
      const v = actual.judgeCollegeCell(entry, row, col);
      if (v === 'no') state.flipped += 1;
      return v === 'yes' ? 'yes' : 'unknown';
    }
    : actual.judgeCollegeCell;
  return { ...actual, fetchCollegeGridData, judgeCollegeCell };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: async () => undefined }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'offline bot' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import { recordCompletion } from '@/lib/completions';

const note = (msg: string) => console.log('CGOFFLINE| ' + msg);
const GUESS_LIMIT = 15;

type Real = typeof import('@/lib/collegeGrid');
type Entry = import('@/lib/collegeGrid').CollegeGridEntry;
let real: Real;
let boards: GridPuzzle[];
let entries: Entry[];
let bySchool: Map<string, Entry[]>;

beforeAll(async () => {
  state.rows = loadTableRows();
  real = await vi.importActual<Real>('@/lib/collegeGrid');
  boards = (await vi.importActual<{ collegeGridPuzzles: GridPuzzle[] }>('@/data/collegeGridPuzzles')).collegeGridPuzzles;
  entries = real.indexCollegeEntries(state.rows);
  bySchool = new Map();
  for (const e of entries) for (const c of e.colleges) bySchool.set(c, [...(bySchool.get(c) ?? []), e]);
  vi.stubGlobal('fetch', () => {
    state.networkThrows += 1;
    throw new Error('network stubbed to throw: fetch');
  });
}, 120_000);

afterEach(() => { cleanup(); vi.useRealTimers(); });
afterAll(() => { vi.unstubAllGlobals(); });

const cellAttrs = (board: GridPuzzle, i: number) => [board.rows[Math.floor(i / 3)], board.cols[i % 3]] as const;

/** Nine cells to nine different players who each judge yes, by augmenting paths; null when no such set exists. */
function winningNames(board: GridPuzzle): string[] | null {
  const answers = Array.from({ length: 9 }, (_, i) => {
    const [row, col] = cellAttrs(board, i);
    return [...new Set((bySchool.get(row.label) ?? []).filter((e) => real.judgeCollegeCell(e, row, col) === 'yes').map((e) => e.name))];
  });
  const owner = new Map<string, number>();
  const place = (i: number, seen: Set<string>): boolean => {
    for (const name of answers[i]) {
      if (seen.has(name)) continue;
      seen.add(name);
      if (!owner.has(name) || place(owner.get(name) as number, seen)) {
        owner.set(name, i);
        return true;
      }
    }
    return false;
  };
  if (!answers.every((_, i) => place(i, new Set()))) return null;
  const out: string[] = [];
  for (const [name, i] of owner) out[i] = name;
  return out;
}

/** For each guess, a cell and a player the real judge calls a definite no there. */
function losingMoves(board: GridPuzzle): { cell: number; name: string }[] | null {
  const moves: { cell: number; name: string }[] = [];
  for (let k = 0; k < GUESS_LIMIT; k += 1) {
    const cell = k % 9;
    const [row, col] = cellAttrs(board, cell);
    const skip = Math.floor(k / 9);
    let seen = 0;
    const hit = entries.find((e) => real.judgeCollegeCell(e, row, col) === 'no' && seen++ === skip);
    if (!hit) return null;
    moves.push({ cell, name: hit.name });
  }
  return moves;
}

async function play(board: GridPuzzle, moves: { cell: number; name: string }[]) {
  localStorage.clear();
  state.boards.length = 0;
  state.boards.push(board);
  vi.mocked(recordCompletion).mockClear();
  const { result, unmount } = renderHook(() => useCollegeGrid());
  await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 60_000 });
  if (result.current.dataError) throw new Error('the key did not load through the stub');
  if (result.current.puzzle.id !== board.id) throw new Error(`the hook served ${result.current.puzzle.id}, not ${board.id}`);
  // Keep the real key load asynchronous, then own the wrong-answer flash timers.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  let counted = 0;
  for (const m of moves) {
    if (result.current.gameStatus !== 'playing') break;
    act(() => result.current.setActiveCell(m.cell));
    const left = result.current.guessesLeft;
    await act(async () => { await result.current.submitGuess(m.name); });
    if (result.current.guessesLeft < left) counted += 1;
  }
  const out = {
    status: result.current.gameStatus,
    correct: result.current.correctCount,
    left: result.current.guessesLeft,
    counted,
    names: result.current.cells.map((c) => c.playerName),
    recorded: vi.mocked(recordCompletion).mock.calls.map((c) => [c[0], c[1]]),
  };
  // Run the hook's flash callbacks while jsdom and its mounted React tree still exist.
  await act(async () => { await vi.runOnlyPendingTimersAsync(); });
  expect(vi.getTimerCount(), 'Every flash timer must settle before the board unmounts').toBe(0);
  unmount();
  vi.useRealTimers();
  return out;
}

describe('College Grid offline', () => {
  it('(4a) a win bot fills 9 of 9 in 9 counted guesses on every board', async () => {
    expect(boards.length).toBe(75);
    const bad: string[] = [];
    let won = 0;
    const throwsBefore = state.networkThrows;
    for (const board of boards) {
      const names = winningNames(board);
      if (!names) { bad.push(`${board.id}: no nine different players judge yes, so the bot has nothing to submit`); continue; }
      const r = await play(board, names.map((name, cell) => ({ cell, name })));
      const ok = r.status === 'complete' && r.correct === 9 && r.counted === 9 && r.left === GUESS_LIMIT - 9
        && names.every((n, i) => r.names[i] === n)
        && r.recorded.length === 1 && r.recorded[0][0] === '/college-grid' && r.recorded[0][1] === 900;
      if (ok) won += 1;
      else bad.push(`${board.id}: ${r.status}, ${r.correct} correct, ${r.counted} counted, ${r.left} left, recorded ${JSON.stringify(r.recorded)}`);
    }
    const refused = state.networkThrows - throwsBefore;
    note(`win: ${won} of ${boards.length} boards won in 9 counted guesses, each recorded once at 900; ${refused} network calls refused by the stub along the way; key pages served ${state.keyPages}`);
    if (bad.length) note(`win failures: ${bad.slice(0, 3).join(' | ')}`);
    expect(refused).toBeGreaterThan(0);
    expect(bad).toEqual([]);
    expect(won).toBe(75);
  }, 900_000);

  it('(4b) a loss bot that submits a definite no each time ends every board lost at 15', async () => {
    expect(boards.length).toBe(75);
    const bad: string[] = [];
    let lost = 0;
    let stillPlaying = 0;
    for (const board of boards) {
      const moves = losingMoves(board);
      if (!moves) { bad.push(`${board.id}: some cell has too few definite no answers for the bot`); continue; }
      const r = await play(board, moves);
      if (r.status === 'playing') stillPlaying += 1;
      const ok = r.status === 'complete' && r.correct === 0 && r.counted === GUESS_LIMIT && r.left === 0
        && r.recorded.length === 1 && r.recorded[0][0] === '/college-grid' && r.recorded[0][1] === 0;
      if (ok) lost += 1;
      else bad.push(`${board.id}: ${r.status}, ${r.correct} correct, ${r.counted} counted, ${r.left} left, recorded ${JSON.stringify(r.recorded)}`);
    }
    note(`loss: ${lost} of ${boards.length} boards ended lost at 15 counted guesses, each recorded once at 0; ${stillPlaying} still playing after 15 submissions`);
    if (process.env.CG_OFFLINE_CONTROL === 'nocount') note(`control nocount: ${state.flipped} no verdicts turned into unknown as the hook saw them`);
    if (bad.length) note(`loss failures: ${bad.slice(0, 3).join(' | ')}`);
    expect(bad).toEqual([]);
    expect(lost).toBe(75);
  }, 900_000);
});
