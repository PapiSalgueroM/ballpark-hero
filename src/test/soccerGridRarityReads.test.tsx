import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { getTodayET } from '@/lib/dateUtils';

const io = vi.hoisted(() => ({ from: vi.fn(), invoke: vi.fn(), insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: io.from, functions: { invoke: io.invoke } } }));
vi.mock('@/lib/fetchSoccerGridPuzzles', () => ({ fetchSoccerGridPuzzles: async () => [] }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

type CountReply = { count: number | null; error: object | null };
const count = (count: number | null): CountReply => ({ count, error: null });
const failed: CountReply = { count: null, error: { message: 'Fixture count failed' } };
const replies: CountReply[] = [];
const events: string[] = [];
const first = 'Grid Fixture First';
const second = 'Grid Fixture Second';

beforeEach(() => {
  localStorage.clear();
  replies.length = 0;
  events.length = 0;
  io.insert.mockReset().mockImplementation(async () => { events.push('insert'); });
  io.invoke.mockReset().mockImplementation(async (_name, { body }) => ({ data: { valid: true, fullName: body.playerName }, error: null }));
  io.from.mockReset().mockImplementation((table: string) => {
    expect(table).toBe('soccer_grid_selections');
    return {
      select: (_columns: string, options: unknown) => {
        expect(options).toEqual({ count: 'exact', head: true });
        let player = false;
        const query = {
          eq: (field: string) => { if (field === 'player_name') player = true; return query; },
          then: (yes: (value: CountReply) => unknown) => {
            events.push(player ? 'player' : 'total');
            const reply = replies.shift();
            if (!reply) throw new Error('No more count fixtures');
            return Promise.resolve(reply).then(yes);
          },
        };
        return query;
      },
      insert: io.insert,
    };
  });
});
afterEach(() => { cleanup(); localStorage.clear(); });

const ready = async () => {
  const view = renderHook(useSoccerGrid);
  await waitFor(() => expect(view.result.current.isLoading || view.result.current.isLoadingPool).toBe(false));
  return view;
};
type Grid = Awaited<ReturnType<typeof ready>>;
async function play(view: Grid, cell: number, name: string) {
  act(() => view.result.current.setActiveCell(cell));
  await act(async () => { await view.result.current.submitGuess(name); });
}

it.each([
  { label: 'total lookup error', total: failed, player: failed, rarity: null },
  { label: 'player lookup error', total: count(9), player: failed, rarity: null },
  { label: 'no exact total count', total: count(null), player: count(0), rarity: null },
  { label: 'no exact player count', total: count(24), player: count(null), rarity: null },
  { label: 'wildcard total count', total: count(Number.NaN), player: count(0), rarity: null },
  { label: 'wildcard player count', total: count(9), player: count(Number.NaN), rarity: null },
  { label: 'real empty crowd', total: count(0), player: count(0), rarity: 101 },
  { label: 'real populated crowd', total: count(9), player: count(1), rarity: 20 },
])('settles the correct answer with the right rarity for $label', async ({ total, player, rarity }) => {
  replies.push(total, player);
  const view = await ready();
  await play(view, 0, first);
  const { mainCells, guessesLeft, correctCount } = view.result.current;
  expect(mainCells[0]).toMatchObject({ playerName: first, status: 'correct', rarity });
  expect(correctCount).toBe(1);
  expect(guessesLeft).toBe(14);
  expect(io.insert).toHaveBeenCalledExactlyOnceWith({ puzzle_id: view.result.current.puzzle.id, cell_index: 0, player_name: first.toLowerCase() });
  expect(events).toEqual(total.count === null || !Number.isFinite(total.count) ? ['total', 'insert'] : ['total', 'player', 'insert']);
});

it('restores both correct picks without publishing a partial rarity average', async () => {
  replies.push(count(9), count(1), count(9), failed);
  const view = await ready();
  await play(view, 0, first);
  expect(view.result.current.rarityScore).toBe(20);
  await play(view, 1, second);
  expect(view.result.current.rarityScore).toBeNull();
  const key = 'soccer-grid-daily-' + getTodayET();
  const saved = localStorage.getItem(key);
  expect(JSON.parse(saved!).guesses.map(({ rarity }: { rarity: number | null }) => rarity)).toEqual([20, null]);

  view.unmount();
  const restored = await ready();
  expect(restored.result.current.mainCells.slice(0, 2).map(cell => cell.rarity)).toEqual([20, null]);
  expect(restored.result.current.correctCount).toBe(2);
  expect(restored.result.current.rarityScore).toBeNull();
  expect(localStorage.getItem(key)).toBe(saved);
  expect(io.insert).toHaveBeenCalledTimes(2);
});
