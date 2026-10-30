/* Review probe (Round 1565, run lens). Not committed. A soccer Connections daily save written by the BASE bundle on a
   day the live table deals a board the base file does not hold (crafted-* or cx-*): base saved puzzleIndex 0 (findIndex
   -1 falls back to 0). Does the tree under test still restore it? Env: RV_EXPORT (the 05:59 export), RV_DAY, RV_ID (the
   live dealt id that day), RV_INDEX (the index the base bundle saved). Run the same file on base and on head. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useConnections } from '@/hooks/useConnections';

vi.mock('@/integrations/supabase/client', () => ({ SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub', supabase: {} }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/fetchConnectionsPuzzles', async () => {
  const fs = await import('node:fs');
  return {
    fetchConnectionsPuzzles: async () => {
      const rows = JSON.parse(fs.readFileSync(process.env.RV_EXPORT as string, 'utf8')).sort((a: any, b: any) => a.sort_order - b.sort_order);
      return rows
        .map((r: any) => ({ id: r.puzzle_id, groups: typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json }))
        .filter((p: any) => { const all = p.groups.flatMap((g: any) => g.players); return p.groups.length === 4 && p.groups.every((g: any) => g.players.length === 4) && new Set(all).size === 16; });
    },
  };
});

const DAY = process.env.RV_DAY ?? '2026-11-01';
const ID = process.env.RV_ID ?? 'crafted-1028';
const INDEX = Number(process.env.RV_INDEX ?? '0');

afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('soccer Connections daily save across the Round 1565 file change', () => {
  for (const status of ['lost', 'won'] as const) {
    it(`a ${status} daily saved by the base bundle on ${DAY} (${ID}, puzzleIndex ${INDEX}) is still ${status}`, async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(`${DAY}T16:00:00Z`));
      const guesses = status === 'lost' ? [{ t: 'give' }] : [];
      localStorage.setItem(`connections-daily-${DAY}`, JSON.stringify({ v: 1, date: DAY, puzzleIndex: INDEX, puzzleId: ID, guesses, gameStatus: status }));
      const { result } = renderHook(() => useConnections());
      await waitFor(() => { expect(result.current.isLoadingPool).toBe(false); expect(result.current.isLoading).toBe(false); expect(result.current.puzzle?.id).toBe(ID); }, { timeout: 20000 });
      await new Promise(r => setTimeout(r, 300));
      const saved = JSON.parse(localStorage.getItem(`connections-daily-${DAY}`) ?? 'null');
      console.log(`RVSAVE ${status}: dealt ${result.current.puzzle?.id}, hook puzzleIndex ${result.current.puzzleIndex}, gameStatus ${result.current.gameStatus}, stored ${saved ? `${saved.gameStatus} index ${saved.puzzleIndex}` : 'none'}`);
      expect(result.current.gameStatus).toBe(status);
    }, 60000);
  }
});
