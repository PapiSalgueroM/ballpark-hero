/**
 * Review probe, Round 1105 (never committed). Runs on MAIN's tree: plays today's College Grid board through main's
 * real hook (the table stubbed from main's committed key) and dumps what main writes to localStorage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import type { GridPuzzle } from '@/types/footballGrid';

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], keyPages: 0 }));
const KEY_FILE = path.resolve(process.cwd(), 'scripts/data/collegeGridPlayers.json');
const TABLE_COLUMNS = ['id', 'display_name', 'name_norm', 'colleges', 'colleges_agreed', 'groups', 'best_pick', 'first_round', 'undrafted', 'heisman_year', 'first_season', 'seasons', 'dup'];

function loadTableRows(): Record<string, unknown>[] {
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')) as { columns: string[]; rows: unknown[][] };
  const at = TABLE_COLUMNS.map((c) => file.columns.indexOf(c));
  return file.rows
    .map((r) => Object.fromEntries(TABLE_COLUMNS.map((c, k) => [c, r[at[k]]])))
    .sort((a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
}

vi.mock('@/integrations/supabase/client', () => {
  const refuse = (what: string) => { throw new Error(`network stubbed to throw: ${what}`); };
  const from = (table: string) => {
    if (table !== 'college_grid_players') return refuse(table);
    const q = {
      select: () => q,
      not: () => q,
      order: () => q,
      range: async (lo: number, hi: number) => { state.keyPages += 1; return { data: state.rows.slice(lo, hi + 1), error: null }; },
    };
    return q;
  };
  return {
    SUPABASE_URL: 'https://offline.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'offline',
    supabase: { from, functions: { invoke: () => refuse('functions.invoke') }, rpc: () => refuse('rpc') },
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: async () => undefined }) }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'review bot' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import * as real from '@/lib/collegeGrid';

type Entry = real.CollegeGridEntry;
let entries: Entry[];
const saves: unknown[] = [];
const cellAttrs = (board: GridPuzzle, i: number) => [board.rows[Math.floor(i / 3)], board.cols[i % 3]] as const;

function winningNames(board: GridPuzzle): string[] {
  const answers = Array.from({ length: 9 }, (_, i) => {
    const [row, col] = cellAttrs(board, i);
    return [...new Set(entries.filter((e) => real.judgeCollegeCell(e, row, col) === 'yes').map((e) => e.name))];
  });
  const owner = new Map<string, number>();
  const place = (i: number, seen: Set<string>): boolean => {
    for (const name of answers[i]) {
      if (seen.has(name)) continue;
      seen.add(name);
      if (!owner.has(name) || place(owner.get(name) as number, seen)) { owner.set(name, i); return true; }
    }
    return false;
  };
  if (!answers.every((_, i) => place(i, new Set()))) throw new Error('no winning set');
  const out: string[] = [];
  for (const [name, i] of owner) out[i] = name;
  return out;
}
function noName(board: GridPuzzle, cell: number, skip: number): string {
  const [row, col] = cellAttrs(board, cell);
  let seen = 0;
  const hit = entries.find((e) => real.judgeCollegeCell(e, row, col) === 'no' && seen++ === skip);
  if (!hit) throw new Error('no losing name');
  return hit.name;
}

beforeAll(() => {
  state.rows = loadTableRows();
  entries = real.indexCollegeEntries(state.rows);
  vi.stubGlobal('fetch', () => { throw new Error('network stubbed to throw: fetch'); });
}, 120_000);
afterEach(() => { cleanup(); vi.useRealTimers(); });
afterAll(() => {
  vi.unstubAllGlobals();
  fs.writeFileSync(process.env.RV_SAVE_OUT as string, JSON.stringify(saves));
  console.log(`RVSAVE| wrote ${saves.length} saves to ${process.env.RV_SAVE_OUT}; key pages read ${state.keyPages}`);
});

async function play(kind: string, plan: (board: GridPuzzle) => { cell: number; name: string }[]) {
  localStorage.clear();
  const { result, unmount } = renderHook(() => useCollegeGrid());
  await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 60_000 });
  const board = result.current.puzzle;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  for (const m of plan(board)) {
    if (result.current.gameStatus !== 'playing') break;
    act(() => result.current.setActiveCell(m.cell));
    await act(async () => { await result.current.submitGuess(m.name); });
    await act(async () => { vi.advanceTimersByTime(2000); });
  }
  const storage: [string, string | null][] = [];
  for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i) as string; storage.push([k, localStorage.getItem(k)]); }
  const expectState = {
    correct: result.current.correctCount,
    guessesLeft: result.current.guessesLeft,
    status: result.current.gameStatus,
    names: result.current.cells.map((c) => (c.status === 'correct' ? c.playerName : null)),
  };
  saves.push({ kind, board: board.id, storage, expect: expectState });
  console.log(`RVSAVE| ${kind}: board ${board.id}, ${JSON.stringify(expectState)}, keys ${storage.map(([k]) => k).join(', ')}`);
  unmount();
  vi.useRealTimers();
  return expectState;
}

describe('main writes saves the branch must load', () => {
  it('in progress: three yes and two no', async () => {
    const s = await play('inprogress', (b) => {
      const w = winningNames(b);
      return [{ cell: 0, name: w[0] }, { cell: 1, name: noName(b, 1, 0) }, { cell: 4, name: w[4] }, { cell: 2, name: noName(b, 2, 0) }, { cell: 8, name: w[8] }];
    });
    expect(s.correct).toBe(3);
    expect(s.guessesLeft).toBe(10);
  }, 120_000);
  it('won', async () => {
    const s = await play('won', (b) => winningNames(b).map((name, cell) => ({ cell, name })));
    expect(s.correct).toBe(9);
  }, 120_000);
  it('lost', async () => {
    const s = await play('lost', (b) => Array.from({ length: 15 }, (_, k) => ({ cell: k % 9, name: noName(b, k % 9, Math.floor(k / 9)) })));
    expect(s.guessesLeft).toBe(0);
  }, 120_000);
});
