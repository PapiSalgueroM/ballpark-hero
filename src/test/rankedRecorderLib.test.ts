/**
 * Round 645: what an unranked play writes, and what it never writes.
 *
 * The REAL src/lib/completions.ts against a recording Supabase client and
 * jsdom's real localStorage. recordUnrankedPlay inserts the anonymous
 * game_completions row with no score (a play for Most Played Today, never a
 * row the day board reads) under the name it is handed, records the local
 * streak day and counts in today's games (the one Games Today count the
 * header, the home page and the profile share), and touches nothing ranked:
 * no rpc, no session read. The last case is the ranked recorder beside it,
 * so the client would have seen those calls had they been made.
 *
 * scripts/simRankedRecorder.mjs runs this file and carries the negative
 * controls: RANKED_CONTROL=libleaks (a score on the row), libsaves (the
 * signed in save put back) and libnotoday (the today set dropped) each point
 * RANKED_LIB at a copy of the lib and must turn exactly their own case red.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const S = vi.hoisted(() => ({
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  rpcs: [] as string[],
  sessions: 0,
}));

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://stub.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => { S.inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      upsert: () => Promise.resolve({ error: null }),
    }),
    rpc: (name: string) => { S.rpcs.push(name); return Promise.resolve({ error: null }); },
    auth: { getSession: async () => { S.sessions += 1; return { data: { session: null } }; } },
  },
}));

import { recordCompletion, recordUnrankedPlay, getLocalTodayCount } from '@/lib/completions';
import { getStreakState } from '@/lib/streaks';
import { resetScoreCapsForTests } from '@/lib/scoreCaps';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
  S.inserts.length = 0;
  S.rpcs.length = 0;
  S.sessions = 0;
  localStorage.clear();
});

describe('recordUnrankedPlay, the real lib', () => {
  it('an unranked play inserts the anonymous row with no score', async () => {
    recordUnrankedPlay('/free-kick');
    await flush();
    expect(S.inserts).toHaveLength(1);
    expect(S.inserts[0].table).toBe('game_completions');
    expect(S.inserts[0].row.game).toBe('free-kick');
    expect(S.inserts[0].row).not.toHaveProperty('score');
    expect(typeof S.inserts[0].row.player_name).toBe('string');
  });

  it('an unranked play makes no signed in save and reads no session', async () => {
    recordUnrankedPlay('/free-kick');
    await flush();
    expect(S.rpcs).toEqual([]);
    expect(S.sessions).toBe(0);
  });

  it('an unranked play records the local streak day', () => {
    expect(getStreakState().perGame['free-kick']).toBeUndefined();
    recordUnrankedPlay('/free-kick');
    const state = getStreakState();
    expect(state.perGame['free-kick']?.current).toBe(1);
    expect(state.global.current).toBe(1);
    expect(state.totalPlays).toBe(1);
    expect(state.totalPoints).toBe(0);
  });

  it("an unranked play counts in today's games", () => {
    expect(getLocalTodayCount()).toBe(0);
    recordUnrankedPlay('/free-kick');
    expect(getLocalTodayCount()).toBe(1);
    recordUnrankedPlay('/free-kick');
    expect(getLocalTodayCount()).toBe(1);
  });

  it('an unranked play files under the name it is handed', async () => {
    recordUnrankedPlay('/free-kick', 'Signed In Name');
    await flush();
    expect(S.inserts[0].row.player_name).toBe('Signed In Name');
  });

  it('a ranked finish still reaches the session, the scored row and the today set', async () => {
    /* Round 648: the browser's tally credits a play at its game's cap, and a
       browser with no copy of the caps holds the play until a read lands
       (src/lib/scoreCaps.ts). This client stub answers no caps read, so the
       browser is given its copy first; a 7 is under any Free Kick cap. */
    resetScoreCapsForTests();
    localStorage.setItem('dukb-score-caps-v2', JSON.stringify({ caps: { 'free-kick': 3045 }, fetchedAt: Date.now() }));
    recordCompletion('/free-kick', 7, 'Tester', 3);
    await flush();
    expect(S.inserts).toHaveLength(1);
    expect(S.inserts[0].row.score).toBe(7);
    expect(S.sessions).toBe(1);
    expect(getLocalTodayCount()).toBe(1);
    expect(getStreakState().totalPoints).toBe(7);
  });
});
