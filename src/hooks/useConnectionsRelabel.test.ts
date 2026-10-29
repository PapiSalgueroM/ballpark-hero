/**
 * A daily saved before a group was relabelled still shows each group once.
 *
 * Round 1567 dated the club groups in place ("Played for the Steelers" became
 * "Played for the Steelers (as of 2025)"). A daily save holds each solved group
 * by its label, and the hooks used to match a saved group to the board by label
 * only, so a player who solved the club group under the old label and then lost
 * got five rows on the result: the old label and the new one, the same five
 * names twice (review-run-1567 finding 1, walked in a browser on r1567-run-w2).
 * The hooks now share isSameConnectionsGroup (src/lib/connectionsSolvedMatch.ts),
 * which also matches on the five names.
 *
 * Each case plays the real hook, rewrites the saved label to an older one, and
 * reloads. The test first asserts the rewrite really changed the label, so it
 * cannot pass because nothing was relabelled. Negative control, run on a runner:
 * make isSameConnectionsGroup compare labels only, and the lost case goes red in
 * all four rows (fix-1567.md records the run).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/fetchNhlConnectionsPuzzles', () => ({ fetchNhlConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchNbaConnectionsPuzzles', () => ({ fetchNbaConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchNflConnectionsPuzzles', () => ({ fetchNflConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchBaseballConnectionsPuzzles', () => ({ fetchBaseballConnectionsPuzzles: () => Promise.resolve([]) }));

import { useNhlConnections } from '@/hooks/useNhlConnections';
import { useNbaConnections } from '@/hooks/useNbaConnections';
import { useNflConnections } from '@/hooks/useNflConnections';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';

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
  await act(async () => { result.current.deselectAll(); });
  await act(async () => { for (const n of names) result.current.togglePlayer(n); });
  await act(async () => { result.current.submitSelection(); });
}

function wrongSet(puzzle: any) {
  const groups = puzzle.groups.slice(1);
  const size = groups[0].players.length;
  return [...groups[0].players.slice(0, size - 1), groups[1].players[0]];
}

/* The label a save written before the relabel would hold: the dated suffix
   removed when there is one, otherwise a stand in that differs. */
function oldLabel(theme: string): string {
  const cut = theme.replace(/ \(as of [^)]*\)$/, '');
  return cut !== theme ? cut : `${theme} (before)`;
}

function relabelSave(slug: string, boardTheme: string): void {
  const key = Object.keys(localStorage).find(k => k.startsWith(`${slug}-daily-`));
  expect(key).toBeTruthy();
  const saved = JSON.parse(localStorage.getItem(key as string) as string);
  let changed = 0;
  saved.guesses = saved.guesses.map((g: any) => {
    if (g.t !== 'ok' || g.theme !== boardTheme) return g;
    changed += 1;
    return { ...g, theme: oldLabel(g.theme) };
  });
  expect(changed).toBe(1);
  localStorage.setItem(key as string, JSON.stringify(saved));
}

describe.each(HOOKS)('%s Connections: a save from before a relabel', (_label, slug, useHook) => {
  beforeEach(() => { localStorage.clear(); });

  it('lost: the relabelled group is shown once, every name once', async () => {
    const first = renderHook(() => useHook());
    await settle();
    const puzzle = first.result.current.puzzle;
    const solved = puzzle.groups[0];
    await submitPlayers(first.result, solved.players);
    for (let i = 0; i < 4; i += 1) await submitPlayers(first.result, wrongSet(puzzle));
    expect(first.result.current.gameStatus).toBe('complete');
    first.unmount();

    relabelSave(slug, solved.theme);

    const second = renderHook(() => useHook());
    await settle();
    const groups = second.result.current.solvedGroups;
    expect(groups.some((g: any) => g.theme === oldLabel(solved.theme))).toBe(true);
    expect(groups.length).toBe(4);
    const names = groups.flatMap((g: any) => g.players);
    expect(new Set(names).size).toBe(names.length);
    expect(second.result.current.foundGroups).toBe(1);
    second.unmount();
  });

  it('playing: the other three groups still win the board', async () => {
    const first = renderHook(() => useHook());
    await settle();
    const puzzle = first.result.current.puzzle;
    await submitPlayers(first.result, puzzle.groups[0].players);
    first.unmount();

    relabelSave(slug, puzzle.groups[0].theme);

    const second = renderHook(() => useHook());
    await settle();
    expect(second.result.current.remainingPlayers.length).toBe(15);
    for (const g of puzzle.groups.slice(1)) await submitPlayers(second.result, g.players);
    expect(second.result.current.gameStatus).toBe('complete');
    expect(second.result.current.foundGroups).toBe(4);
    expect(second.result.current.solvedGroups.length).toBe(4);
    second.unmount();
  });
});
