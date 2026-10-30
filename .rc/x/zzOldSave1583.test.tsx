/**
 * Review-run 1583 (runner only, never committed): a daily save written on the BASE boards (b4a331a9c, the live rows
 * today) is reloaded (1) on the same base boards, the default path while the migration is unapplied, which must be
 * byte identical, and (2) on the decided boards, as if the migration landed on the day the save was written. The
 * runner writes src/data/zzBaseNbaPuzzles.ts from git show b4a331a9c before this runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const pool = vi.hoisted(() => ({ current: [] as any[] }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/fetchNbaConnectionsPuzzles', () => ({ fetchNbaConnectionsPuzzles: () => Promise.resolve(pool.current) }));

import { useNbaConnections } from '@/hooks/useNbaConnections';
import { nbaConnectionsPuzzles as HEAD } from '@/data/nbaConnectionsPuzzles';
import { nbaConnectionsPuzzles as BASE } from '@/data/zzBaseNbaPuzzles';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function settle() { for (let i = 0; i < 4; i += 1) await act(async () => { await Promise.resolve(); }); }
async function submit(result: { current: any }, names: string[]) {
  await act(async () => { result.current.deselectAll(); });
  await act(async () => { for (const n of names) result.current.togglePlayer(n); });
  await act(async () => { result.current.submitSelection(); });
}
const clone = (b: any) => JSON.parse(JSON.stringify(b));
function wrong(board: any, g: number) {
  const others = board.groups.filter((_: any, i: number) => i !== g);
  return [...others[0].players.slice(0, 4), others[1].players[0]];
}
const key = () => Object.keys(localStorage).find(k => k.startsWith('nba-connections-daily-')) as string;
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
function state(r: any) {
  const rows = r.current.solvedGroups;
  const names = rows.flatMap((g: any) => g.players);
  return { status: r.current.gameStatus, lives: r.current.lives, found: r.current.foundGroups, rows: rows.length, names: names.length, unique: new Set(names).size, remaining: r.current.remainingPlayers.length, labels: rows.map((g: any) => g.theme) };
}
async function play(board: any, solve: number[], misses: number) {
  pool.current = [clone(board)];
  const h = renderHook(() => useNbaConnections());
  await settle();
  expect(h.result.current.puzzle?.id).toBe(board.id);
  for (const g of solve) await submit(h.result, board.groups[g].players);
  for (let i = 0; i < misses; i += 1) await submit(h.result, wrong(board, solve[0] ?? 0));
  const s = state(h.result);
  h.unmount();
  return s;
}
async function reload(board: any) {
  pool.current = [clone(board)];
  const h = renderHook(() => useNbaConnections());
  await settle();
  const s = state(h.result);
  h.unmount();
  return s;
}

const IDS = ['nbaconn-001', 'nbaconn-002', 'nbaconn-003', 'nbaconn-004'];
const PATTERNS: Array<[string, number[], number]> = [
  ['mid g0', [0], 1], ['mid g1', [1], 1], ['mid g2', [2], 1], ['mid g3', [3], 1],
  ['lost g0', [0], 4], ['lost g2', [2], 4], ['lost g3', [3], 4], ['lost none', [], 4],
  ['won', [3, 2, 1, 0], 0], ['mid g1g3', [1, 3], 2],
];

describe.each(IDS)('%s: a save from the base boards', (id) => {
  const base = BASE.find((b: any) => b.id === id);
  const head = HEAD.find((b: any) => b.id === id);
  beforeEach(() => { localStorage.clear(); });

  it.each(PATTERNS)('%s: default path (base boards, head code) is byte identical', async (_n, solve, misses) => {
    const before = await play(base, solve, misses);
    const bytes = localStorage.getItem(key());
    const after = await reload(base);
    expect(localStorage.getItem(key())).toBe(bytes);
    expect(after).toEqual(before);
  });

  it.each(PATTERNS)('%s: reloaded on the decided boards', async (n, solve, misses) => {
    const before = await play(base, solve, misses);
    const after = await reload(head);
    const changed = solve.some(g => !sameSet(base.groups[g].players, head.groups[g].players));
    console.log(`OLDSAVE ${id} ${n} membersChanged=${changed} before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
    expect(after.status).toBe(before.status);
    expect(after.found).toBe(before.found);
    expect(after.lives).toBe(before.lives);
    if (!changed) {
      expect(after.rows).toBe(before.rows);
      expect(after.unique).toBe(after.names);
      if (after.status === 'complete') expect(after.unique).toBe(20);
      expect(after.remaining).toBe(before.remaining);
    }
  });
});
