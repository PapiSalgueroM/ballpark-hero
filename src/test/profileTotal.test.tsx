/* Round 648: the profile's all time total clamps each record at its game's
   cap, with the caps the World Leaderboard uses. Run through
   scripts/simProfileTotal.mjs, which also runs each negative control against
   a broken copy of one module and requires exactly the right cases to go red.

   The planted record set is one absurd row (a Pack Battle pack recording its
   banked value, 8,800,000) beside ordinary plays, one play over its cap, one
   play of a game with no cap row, and 1,003 small plays so the read has to
   page past the 1,000 row response cap. The expected total is computed here
   with the test's own arithmetic, never by the module under test. */
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ScoreRow { id: string; user_id: string; game_type: string; score: number | null; created_at: string }

const db = vi.hoisted(() => ({
  caps: [] as Array<{ game: string; max_score: number }>,
  scores: [] as ScoreRow[],
  capsError: null as unknown,
  scoresError: null as unknown,
}));

vi.mock('@/integrations/supabase/client', () => {
  function query(table: string) {
    const filters: Array<[string, unknown]> = [];
    const q: any = {
      select: () => q,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return q; },
      order: () => q,
      range: (from: number, to: number) => {
        if (db.scoresError) return Promise.resolve({ data: null, error: db.scoresError });
        const rows = db.scores.filter(r => filters.every(([k, v]) => (r as any)[k] === v));
        return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
      },
      insert: () => Promise.resolve({ error: null }),
      then: (res: any, rej: any) => {
        const out = table === 'game_denominators'
          ? (db.capsError ? { data: null, error: db.capsError } : { data: db.caps.map(c => ({ ...c })), error: null })
          : { data: [], error: null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return q;
  }
  return {
    SUPABASE_URL: 'stub',
    SUPABASE_PUBLISHABLE_KEY: 'stub',
    supabase: {
      from: (table: string) => query(table),
      rpc: async () => ({ data: null, error: { code: 'PGRST202' } }),
      auth: { getSession: async () => ({ data: { session: null } }) },
    },
  };
});

import { clampScore, fetchScoreCaps, knownCap, resetScoreCapsForTests, sumClampedRecords, type ScoreRecord } from '@/lib/scoreCaps';
import { getStreakState, recordGameCompletion, settlePendingPoints } from '@/lib/streaks';
import { recordCompletion } from '@/lib/completions';
import { useProfileTotal } from '@/hooks/useProfileTotal';

/* The planted caps: what the board's view would answer for these games. */
const CAPS: Record<string, number> = {
  'pack-battle': 1000,
  'soccer-grid': 100,
  'missing-xi': 100,
  'club-manager': 130,
  'soccer-career': 100,
  'nba-grid': 100,
  'footle': 10,
};
const ABSURD: ScoreRecord = { game: 'pack-battle', score: 8_800_000 };
const PLANTED: ScoreRecord[] = [
  ABSURD,
  { game: 'soccer-grid', score: 40 },
  { game: 'missing-xi', score: 100 },
  { game: 'club-manager', score: 130 },
  { game: 'soccer-career', score: 100 },
  /* over its cap */
  { game: 'nba-grid', score: 120 },
  /* no cap row: the board scores it at nothing */
  { game: 'mystery-game', score: 50 },
  /* past the 1,000 row response cap */
  ...Array.from({ length: 1003 }, () => ({ game: 'footle', score: 10 })),
];

/* The test's own arithmetic. */
const rawSum = PLANTED.reduce((s, r) => s + Number(r.score), 0);
const expectedClamped = PLANTED.reduce((s, r) => {
  const cap = CAPS[r.game];
  if (cap === undefined) return s;
  return s + Math.min(Math.max(0, Math.round(Number(r.score))), cap);
}, 0);

function plantScores(): void {
  db.scores = PLANTED.map((r, i) => ({ id: `row-${i}`, user_id: 'user-1', game_type: r.game, score: Number(r.score), created_at: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}T00:00:00Z` }));
  /* Another account's rows, which the user filter must leave out. */
  db.scores.push({ id: 'other-1', user_id: 'user-2', game_type: 'pack-battle', score: 8_800_000, created_at: '2026-09-01T00:00:00Z' });
  db.scores.push({ id: 'other-2', user_id: 'user-2', game_type: 'soccer-grid', score: 100, created_at: '2026-09-02T00:00:00Z' });
}

function plantCaps(): void {
  db.caps = Object.entries(CAPS).map(([game, max_score]) => ({ game, max_score }));
}

beforeEach(() => {
  localStorage.clear();
  resetScoreCapsForTests();
  db.caps = [];
  db.scores = [];
  db.capsError = null;
  db.scoresError = null;
});
afterEach(() => { cleanup(); });

describe('Round 648: the profile total clamps each record at its cap', () => {
  it('1 the pure sum: each record at most its cap, the absurd row at exactly its cap', () => {
    expect(rawSum).toBeGreaterThan(8_800_000);
    expect(sumClampedRecords(PLANTED, CAPS)).toBe(expectedClamped);
    expect(sumClampedRecords([ABSURD], CAPS)).toBe(CAPS['pack-battle']);
    expect(clampScore(8_800_000, 1000)).toBe(1000);
    expect(clampScore(-5, 100)).toBe(0);
    expect(clampScore(Number.NaN, 100)).toBe(0);
    expect(clampScore(99.6, 100)).toBe(100);
    console.log('PROFILE_TOTAL_MEASURE ' + JSON.stringify({
      records: PLANTED.length,
      before: rawSum,
      absurdBefore: Number(ABSURD.score),
      absurdShareBefore: Number(ABSURD.score) / rawSum,
      after: expectedClamped,
      absurdAfter: Math.min(Number(ABSURD.score), CAPS['pack-battle']),
      absurdShareAfter: Math.min(Number(ABSURD.score), CAPS['pack-battle']) / expectedClamped,
    }));
  });

  it('2 the profile hook: the planted records, paged past 1,000 rows, sum to the clamped total', async () => {
    plantCaps();
    plantScores();
    const { result } = renderHook(() => useProfileTotal('user-1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(expectedClamped);
  });

  it('3 the profile hook: no user is no total, and a failed read is no total rather than a zero', async () => {
    plantCaps();
    plantScores();
    const none = renderHook(() => useProfileTotal(null));
    expect(none.result.current).toEqual({ total: null, loading: false });

    /* fetchAllRows retries a failed page twice with a 400 and an 800 ms
       backoff before it gives up, so this read takes over a second to fail. */
    db.scoresError = { message: 'statement timeout' };
    const failed = renderHook(() => useProfileTotal('user-1'));
    await waitFor(() => expect(failed.result.current.loading).toBe(false), { timeout: 5000 });
    expect(failed.result.current.total).toBeNull();

    /* A browser that has never read the caps view and cannot read it now:
       the fresh copy the read above cached would otherwise serve. */
    db.scoresError = null;
    db.capsError = { message: 'view unavailable' };
    localStorage.clear();
    resetScoreCapsForTests();
    const noCaps = renderHook(() => useProfileTotal('user-1'));
    await waitFor(() => expect(noCaps.result.current.loading).toBe(false), { timeout: 5000 });
    expect(noCaps.result.current.total).toBeNull();
  });

  it('4 the browser tally: a play adds at most its cap, a play with no cap waits for one, and a zero is never held', () => {
    recordGameCompletion('pack-battle', new Date(), 8_800_000, 1000);
    expect(getStreakState().totalPoints).toBe(1000);
    recordGameCompletion('soccer-grid', new Date(), 40, 100);
    expect(getStreakState().totalPoints).toBe(1040);

    recordGameCompletion('missing-xi', new Date(), 150);
    recordGameCompletion('mystery-game', new Date(), 50);
    expect(getStreakState().totalPoints).toBe(1040);
    expect(getStreakState().pendingPoints).toEqual([{ game: 'missing-xi', score: 150 }, { game: 'mystery-game', score: 50 }]);

    recordGameCompletion('footle', new Date(), 0);
    expect(getStreakState().pendingPoints).toHaveLength(2);

    /* A fresh allowlist without mystery-game: it settles at nothing, as on the board. */
    settlePendingPoints({ 'missing-xi': 100 });
    expect(getStreakState().totalPoints).toBe(1140);
    expect(getStreakState().pendingPoints).toEqual([]);
    expect(getStreakState().totalPlays).toBe(5);
  });

  it('5 the recorder: the first play in a fresh browser settles when the caps land, the next clamps in place', async () => {
    plantCaps();
    recordCompletion('/pack-battle', 8_800_000, 'Tester');
    expect(getStreakState().totalPoints).toBe(0);
    expect(getStreakState().pendingPoints).toEqual([{ game: 'pack-battle', score: 8_800_000 }]);
    await waitFor(() => expect(getStreakState().totalPoints).toBe(1000));
    expect(getStreakState().pendingPoints).toEqual([]);
    expect(knownCap('nba-grid')).toBe(100);

    recordCompletion('/nba-grid', 120, 'Tester');
    expect(getStreakState().totalPoints).toBe(1100);
    expect(getStreakState().pendingPoints).toEqual([]);
  });

  it('6 an empty read of the caps view is a failed read: nothing held is dropped', async () => {
    recordGameCompletion('pack-battle', new Date(), 8_800_000);
    expect(getStreakState().pendingPoints).toHaveLength(1);
    db.caps = [];
    expect(await fetchScoreCaps()).toBeNull();
    expect(getStreakState().pendingPoints).toHaveLength(1);
    expect(getStreakState().totalPoints).toBe(0);
    plantCaps();
    expect(await fetchScoreCaps()).toMatchObject(CAPS);
    expect(getStreakState().pendingPoints).toEqual([]);
    expect(getStreakState().totalPoints).toBe(1000);
  });
});
