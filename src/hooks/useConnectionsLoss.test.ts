/**
 * A lost Connections game reports the groups the player found, not the
 * groups the board reveals.
 *
 * Round 425. NHL, NBA and NFL Connections counted solvedGroups.length on the
 * counter, the result line and the share card, and that list is padded with
 * the unsolved groups when the last life goes so the board can reveal them.
 * Every loss therefore read 4/4, which standing alone on a copied score card
 * reads as a perfect game. Part two of the round found the same padding on
 * the unlimited side of all four hooks, Baseball included, and moved it into
 * a separate revealed list, so foundGroups is honest in both modes.
 *
 * This is a hook test because the defect is in what the hook derives: the
 * pages only print foundGroups. It drives the real hooks through a daily loss
 * with one group found, a reload after it, an unlimited loss with one group
 * found, and the next unlimited puzzle.
 *
 * scripts/simConnectionsLoss.mjs runs this file and carries the negative
 * control: CONNECTIONS_HOOK_NHL points the NHL row at a copy of the hook
 * rewritten to count the padded list, and its two tests must then fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Completion tracking reads the auth context and writes to the database.
// Neither is under test here, and neither exists in a bare hook render.
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
// The bundled fallback puzzles are the board under test; the live pool is not.
vi.mock('@/lib/fetchNhlConnectionsPuzzles', () => ({ fetchNhlConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchNbaConnectionsPuzzles', () => ({ fetchNbaConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchNflConnectionsPuzzles', () => ({ fetchNflConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchBaseballConnectionsPuzzles', () => ({ fetchBaseballConnectionsPuzzles: () => Promise.resolve([]) }));

import { useNbaConnections } from '@/hooks/useNbaConnections';
import { useNflConnections } from '@/hooks/useNflConnections';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';

const nhlPath = process.env.CONNECTIONS_HOOK_NHL;
const { useNhlConnections } = nhlPath
  ? await import(/* @vite-ignore */ nhlPath)
  : await import('@/hooks/useNhlConnections');

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyHook = () => any;
const HOOKS: Array<[string, string, AnyHook]> = [
  ['NHL', 'nhl-connections', useNhlConnections],
  ['NBA', 'nba-connections', useNbaConnections],
  ['NFL', 'nfl-connections', useNflConnections],
  ['Baseball', 'baseball-connections', useBaseballConnections],
];

async function settle() {
  await act(async () => { await Promise.resolve(); });
}

async function submitPlayers(result: { current: any }, names: string[]) {
  // The hook leaves `selected` populated after a wrong guess, so toggling the
  // same names again would deselect them. Clear first, as a player would.
  await act(async () => { result.current.deselectAll(); });
  await act(async () => { for (const n of names) result.current.togglePlayer(n); });
  await act(async () => { result.current.submitSelection(); });
}

/* All but one player from one unsolved group plus one from another: never a group. */
function wrongSet(puzzle: any, solvedThemes: Set<string>) {
  const groups = puzzle.groups.filter((g: any) => !solvedThemes.has(g.theme));
  const size = groups[0].players.length;
  return [...groups[0].players.slice(0, size - 1), groups[1].players[0]];
}

async function findOneThenLose(result: { current: any }) {
  const puzzle = result.current.puzzle;
  expect(puzzle).toBeTruthy();
  await submitPlayers(result, puzzle.groups[0].players);
  expect(result.current.foundGroups).toBe(1);
  expect(result.current.solvedGroups.length).toBe(1);
  const solved = new Set<string>([puzzle.groups[0].theme]);
  for (let i = 0; i < 4; i += 1) await submitPlayers(result, wrongSet(puzzle, solved));
  expect(result.current.lives).toBe(0);
  expect(result.current.gameStatus).toBe('complete');
}

describe.each(HOOKS)('%s Connections: a loss counts what the player found', (_label, slug, useHook) => {
  beforeEach(() => { localStorage.clear(); });

  it('daily: one group found, four wrong guesses, then a reload', async () => {
    const first = renderHook(() => useHook());
    await settle();
    await findOneThenLose(first.result);
    // The board list is padded so the missed groups show; the count is not.
    expect(first.result.current.solvedGroups.length).toBe(4);
    expect(first.result.current.foundGroups).toBe(1);

    const key = Object.keys(localStorage).find(k => k.startsWith(`${slug}-daily-`));
    expect(key).toBeTruthy();
    first.unmount();

    const second = renderHook(() => useHook());
    await settle();
    expect(second.result.current.lives).toBe(0);
    expect(second.result.current.gameStatus).toBe('complete');
    expect(second.result.current.solvedGroups.length).toBe(4);
    expect(second.result.current.foundGroups).toBe(1);
    second.unmount();
  });

  it('unlimited: one group found, four wrong guesses, then the next puzzle', async () => {
    const h = renderHook(() => useHook());
    await settle();
    await act(async () => { h.result.current.switchMode('unlimited'); });
    expect(h.result.current.mode).toBe('unlimited');
    await findOneThenLose(h.result);
    expect(h.result.current.solvedGroups.length).toBe(4);
    expect(h.result.current.foundGroups).toBe(1);

    await act(async () => { h.result.current.resetGame(); });
    expect(h.result.current.gameStatus).toBe('playing');
    expect(h.result.current.lives).toBe(4);
    expect(h.result.current.solvedGroups.length).toBe(0);
    expect(h.result.current.foundGroups).toBe(0);
    h.unmount();
  });
});
