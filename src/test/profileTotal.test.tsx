/* Round 648: the profile's all time total is the owner's recompute rule of
   2026-09-19, one row per game per day at the day's best, capped, on the page
   and in the browser's own tally. Run through scripts/simProfileTotal.mjs,
   which also runs each negative control against a broken copy of one module
   and requires exactly the right cases to go red.

   THE PLANTED RECORDS ARE THE REAL SHAPE. A stored record cannot hold more
   than 100,000 (the insert policy on user_game_scores refuses it, and with it
   the whole signed in save), so the 8.8 million the owner saw never lived on
   the server; it lived in the browser's tally, which case 7 plants. What the
   server does hold are the two leaks the 2026-09-19 recompute took out: a
   Club Manager season recorded once per match at its running season score
   (Round 392), and a daily recorded again on every reload (Round 399). Beside
   them, a front office title on the pre Round 647 cumulative scale, a Budget
   Builder build on its old scale, a Sign the Player auction on its old scale,
   a Pack Battle pack at the most a record can hold, a list with no ceiling on
   record, a game with no row at all, and 1,003 one day plays so the read has
   to page past the 1,000 row response cap.

   THE CAPS ARE THE REAL ONES: public.game_score_caps as it stands once Round
   644 and Round 646 are applied, read from Round 646's committed snapshot
   (scripts/data/gameScoreCaps.mjs on r646-caps-real-ceiling, read on
   2026-09-28). Pack Battle keeps 54,000,000 there, so a pack is NOT clamped by
   its cap and this file says so rather than planting a cap that does not
   exist.

   Every expected number is written out here by hand, never computed by the
   module under test. */
import { cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, any>;

const db = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  errors: {} as Record<string, unknown>,
}));

const auth = vi.hoisted(() => ({
  value: { user: null as any, profile: null as any, loading: false, refreshProfile: async () => {}, updateProfile: async () => ({}) },
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

vi.mock('@/integrations/supabase/client', () => {
  function query(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let head = false;
    let counted = false;
    let limit: number | null = null;
    let range: [number, number] | null = null;
    const matching = () => (db.tables[table] || []).filter(r => filters.every(f => f(r)));
    const result = () => {
      if (db.errors[table]) return { data: null, error: db.errors[table], count: null };
      let out = matching();
      if (range) out = out.slice(range[0], range[1] + 1);
      if (limit !== null) out = out.slice(0, limit);
      return { data: head ? null : out.map(r => ({ ...r })), error: null, count: counted ? matching().length : null };
    };
    const q: any = {
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count) counted = true;
        if (opts?.head) head = true;
        return q;
      },
      eq: (k: string, v: unknown) => { filters.push(r => r[k] === v); return q; },
      gt: (k: string, v: any) => { filters.push(r => r[k] > v); return q; },
      order: () => q,
      limit: (n: number) => { limit = n; return q; },
      range: (from: number, to: number) => { range = [from, to]; return Promise.resolve(result()); },
      maybeSingle: () => { const r = result(); return Promise.resolve({ ...r, data: r.data ? (r.data[0] ?? null) : null }); },
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => q,
      then: (res: any, rej: any) => Promise.resolve(result()).then(res, rej),
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

import { profileTotal, type PointsRecord, type ScoreCaps } from '@/lib/pointsRule';
import { fetchScoreCaps, resetScoreCapsForTests } from '@/lib/scoreCaps';
import { getStreakState, recordGameCompletion, settlePendingPoints } from '@/lib/streaks';
import { recordCompletion } from '@/lib/completions';
import { getBadgeState } from '@/lib/badges';
import { useProfileTotal } from '@/hooks/useProfileTotal';
import Profile from '@/pages/Profile';

/* game_score_caps after Round 644 and Round 646, from Round 646's snapshot. */
const CAPS: ScoreCaps = {
  'club-manager': 130,
  'soccer-grid': 900,
  'nba-grid': 900,
  'front-office': 100,
  'budget-builder': 126,
  'sign-the-player': 697,
  'pack-battle': 54_000_000,
  'missing-xi': 100,
  'footle': 700,
  'list-quiz': null,
};

const rec = (game: string, day: string | null, score: number): PointsRecord => ({ game, day, score });
const FOOTLE_DAYS = 1003;
const footleDay = (i: number) => new Date(Date.UTC(2023, 5, 1) + i * 86_400_000).toISOString().slice(0, 10);

/* Each group with its worth under the rule, written by hand. */
const GROUPS: Array<{ what: string; leak: boolean; records: PointsRecord[]; worth: number; perRecordClamp: number }> = [
  { what: 'a Club Manager season recorded per match, 10 to 120', leak: true,
    records: Array.from({ length: 12 }, (_, i) => rec('club-manager', '2026-09-10', 10 * (i + 1))), worth: 120, perRecordClamp: 780 },
  { what: 'two Club Manager seasons closed on one day', leak: true,
    records: [rec('club-manager', '2026-09-11', 130), rec('club-manager', '2026-09-11', 95)], worth: 130, perRecordClamp: 225 },
  { what: 'a Soccer Grid daily saved again on two reloads', leak: true,
    records: [rec('soccer-grid', '2026-09-10', 700), rec('soccer-grid', '2026-09-10', 700), rec('soccer-grid', '2026-09-10', 700)], worth: 700, perRecordClamp: 2100 },
  { what: 'Club Manager rows with no puzzle date, one group as GROUP BY makes them', leak: true,
    records: [rec('club-manager', null, 60), rec('club-manager', null, 100)], worth: 100, perRecordClamp: 160 },
  { what: 'a front office title on the cumulative scale', leak: false,
    records: [rec('front-office', '2026-09-12', 305)], worth: 100, perRecordClamp: 100 },
  { what: 'a Budget Builder build on its old scale', leak: false,
    records: [rec('budget-builder', '2026-09-12', 900)], worth: 126, perRecordClamp: 126 },
  { what: 'a Sign the Player auction on its old scale', leak: false,
    records: [rec('sign-the-player', '2026-09-13', 45_000)], worth: 697, perRecordClamp: 697 },
  { what: 'a Pack Battle pack at the most a record can hold (its cap is not a ceiling)', leak: false,
    records: [rec('pack-battle', '2026-09-13', 95_000)], worth: 95_000, perRecordClamp: 95_000 },
  { what: 'a list with no ceiling on record, two tries', leak: false,
    records: [rec('list-quiz', '2026-09-14', 31), rec('list-quiz', '2026-09-14', 12)], worth: 31, perRecordClamp: 43 },
  { what: 'a game with no row in game_score_caps', leak: false,
    records: [rec('retired-mystery', '2026-09-14', 500)], worth: 0, perRecordClamp: 0 },
  { what: '1,003 Footle days, one play each', leak: false,
    records: Array.from({ length: FOOTLE_DAYS }, (_, i) => rec('footle', footleDay(i), 10)), worth: 10 * FOOTLE_DAYS, perRecordClamp: 10 * FOOTLE_DAYS },
];
const PLANTED = GROUPS.flatMap(g => g.records);
const EXPECTED = GROUPS.reduce((s, g) => s + g.worth, 0);
const RAW = PLANTED.reduce((s, r) => s + Number(r.score), 0);
const PER_RECORD = GROUPS.reduce((s, g) => s + g.perRecordClamp, 0);

function plantRecords(): void {
  db.tables.user_game_scores = PLANTED.map((r, i) => ({
    id: `row-${String(i).padStart(5, '0')}`, user_id: 'user-1', game_type: r.game, score: r.score, puzzle_date: r.day,
    created_at: `2026-09-0${1 + (i % 9)}T00:00:00Z`,
  }));
  /* Another account's rows, which the user filter must leave out. */
  db.tables.user_game_scores.unshift(
    { id: 'other-1', user_id: 'user-2', game_type: 'club-manager', score: 130, puzzle_date: '2026-09-15', created_at: '2026-09-01T00:00:00Z' },
    { id: 'other-2', user_id: 'user-2', game_type: 'soccer-grid', score: 900, puzzle_date: '2026-09-15', created_at: '2026-09-01T00:00:00Z' },
  );
}

function plantCaps(): void {
  db.tables.game_score_caps = Object.entries(CAPS).map(([game, max_score]) => ({ game, max_score }));
}

const at = (day: string) => new Date(`${day}T15:00:00Z`);

beforeEach(() => {
  localStorage.clear();
  resetScoreCapsForTests();
  db.tables = {};
  db.errors = {};
  auth.value = { ...auth.value, user: null, profile: null, loading: false };
});
afterEach(() => { cleanup(); });

describe('Round 648: the profile total is one row per game per day, the day\'s best, capped', () => {
  it('1 the rule on the real record shape, with the real caps', () => {
    expect(PLANTED.length).toBeGreaterThan(1000);
    expect(profileTotal(PLANTED, CAPS)).toBe(EXPECTED);
    for (const g of GROUPS) expect(profileTotal(g.records, CAPS), g.what).toBe(g.worth);
    const leakRaw = GROUPS.filter(g => g.leak).reduce((s, g) => s + g.records.reduce((t, r) => t + Number(r.score), 0), 0);
    const leakRule = GROUPS.filter(g => g.leak).reduce((s, g) => s + g.worth, 0);
    const leakPerRecord = GROUPS.filter(g => g.leak).reduce((s, g) => s + g.perRecordClamp, 0);
    console.log('PROFILE_TOTAL_MEASURE ' + JSON.stringify({
      records: PLANTED.length, raw: RAW, perRecordClamp: PER_RECORD, rule: EXPECTED,
      leakRaw, leakPerRecord, leakRule, packBattle: 95_000, packBattleCap: CAPS['pack-battle'],
    }));
  });

  it('2 the profile hook: the planted records, paged past 1,000 rows and grouped by puzzle date, sum by the rule', async () => {
    plantCaps();
    plantRecords();
    const { result } = renderHook(() => useProfileTotal('user-1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(EXPECTED);
  });

  it('3 the profile hook: no user is no total, and a failed read is no total rather than a zero', async () => {
    plantCaps();
    plantRecords();
    const none = renderHook(() => useProfileTotal(null));
    expect(none.result.current).toEqual({ total: null, loading: false });

    /* fetchAllRows retries a failed page twice with a 400 and an 800 ms
       backoff before it gives up, so this read takes over a second to fail. */
    db.errors.user_game_scores = { message: 'statement timeout' };
    const failed = renderHook(() => useProfileTotal('user-1'));
    await waitFor(() => expect(failed.result.current.loading).toBe(false), { timeout: 5000 });
    expect(failed.result.current.total).toBeNull();

    /* A browser that has never read the caps and cannot read them now. */
    delete db.errors.user_game_scores;
    db.errors.game_score_caps = { message: 'table unavailable' };
    localStorage.clear();
    resetScoreCapsForTests();
    const noCaps = renderHook(() => useProfileTotal('user-1'));
    await waitFor(() => expect(noCaps.result.current.loading).toBe(false), { timeout: 5000 });
    expect(noCaps.result.current.total).toBeNull();
  });

  it('4 the browser tally: one row per game per day at the best, capped, nothing a record cannot hold, and held plays settle by the same rule', () => {
    for (let i = 1; i <= 12; i += 1) recordGameCompletion('club-manager', at('2026-09-10'), 10 * i, 130);
    expect(getStreakState().totalPoints).toBe(120);
    recordGameCompletion('club-manager', at('2026-09-11'), 130, 130);
    expect(getStreakState().totalPoints).toBe(250);
    for (let i = 0; i < 3; i += 1) recordGameCompletion('soccer-grid', at('2026-09-10'), 700, 900);
    expect(getStreakState().totalPoints).toBe(950);

    /* A pack's banked dollars: the server refuses the save whole, so the
       tally adds nothing either, and nothing is held. */
    recordGameCompletion('pack-battle', at('2026-09-12'), 8_800_000, 54_000_000);
    expect(getStreakState().totalPoints).toBe(950);
    recordGameCompletion('list-quiz', at('2026-09-12'), 31, null);
    expect(getStreakState().totalPoints).toBe(981);
    recordGameCompletion('front-office', at('2026-09-12'), 305, 100);
    expect(getStreakState().totalPoints).toBe(1081);

    recordGameCompletion('missing-xi', at('2026-09-13'), 150);
    recordGameCompletion('mystery-game', at('2026-09-13'), 50);
    recordGameCompletion('missing-xi', at('2026-09-13'), 90);
    recordGameCompletion('footle', at('2026-09-13'), 0);
    expect(getStreakState().totalPoints).toBe(1081);
    expect(getStreakState().pendingPoints).toEqual([
      { game: 'missing-xi', day: '2026-09-13', score: 150 },
      { game: 'mystery-game', day: '2026-09-13', score: 50 },
      { game: 'missing-xi', day: '2026-09-13', score: 90 },
    ]);

    /* A fresh allowlist without mystery-game: it settles at nothing, as on
       the board, and the two held Missing XI plays are one day, at its cap. */
    settlePendingPoints({ 'missing-xi': 100 });
    expect(getStreakState().totalPoints).toBe(1181);
    expect(getStreakState().pendingPoints).toEqual([]);
    expect(getStreakState().totalPlays).toBe(23);
  });

  it('5 the recorder: a fresh browser holds the first play and settles it at its cap, then credits in place by the day\'s best', async () => {
    plantCaps();
    recordCompletion('/nba-grid', 950, 'Tester');
    expect(getStreakState().totalPoints).toBe(0);
    expect(getStreakState().pendingPoints).toHaveLength(1);
    await waitFor(() => expect(getStreakState().totalPoints).toBe(900));
    expect(getStreakState().pendingPoints).toEqual([]);

    recordCompletion('/soccer-grid', 400, 'Tester');
    expect(getStreakState().totalPoints).toBe(1300);
    recordCompletion('/soccer-grid', 650, 'Tester');
    expect(getStreakState().totalPoints).toBe(1550);
    recordCompletion('/soccer-grid', 300, 'Tester');
    expect(getStreakState().totalPoints).toBe(1550);
    recordCompletion('/pack-battle', 8_800_000, 'Tester');
    expect(getStreakState().totalPoints).toBe(1550);
    expect(getStreakState().pendingPoints).toEqual([]);
  });

  it('6 an empty read of the caps is a failed read: nothing held is dropped', async () => {
    recordGameCompletion('nba-grid', at('2026-09-13'), 950);
    expect(getStreakState().pendingPoints).toHaveLength(1);
    db.tables.game_score_caps = [];
    expect(await fetchScoreCaps()).toBeNull();
    expect(getStreakState().pendingPoints).toHaveLength(1);
    expect(getStreakState().totalPoints).toBe(0);
    plantCaps();
    expect(await fetchScoreCaps()).toMatchObject({ 'nba-grid': 900, 'list-quiz': null });
    expect(getStreakState().pendingPoints).toEqual([]);
    expect(getStreakState().totalPoints).toBe(900);
  });

  it('7 an inflated browser tally from before this round is repaired once on read, and the badges read the repaired number', async () => {
    localStorage.setItem('dukb-streaks-v1', JSON.stringify({
      version: 1,
      global: { current: 3, longest: 9, lastDate: '2026-09-20' },
      perGame: { 'pack-battle': { current: 1, longest: 2, lastDate: '2026-09-20' } },
      loginDates: ['2026-09-18', '2026-09-19', '2026-09-20'],
      totalPlays: 41,
      totalPoints: 8_810_000,
    }));
    const repaired = getStreakState();
    expect(repaired.totalPoints).toBe(0);
    expect(repaired.retiredPoints).toBe(8_810_000);
    expect(repaired.global.longest).toBe(9);
    expect(repaired.totalPlays).toBe(41);
    expect(repaired.loginDates).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem('dukb-streaks-v1') as string).pointsRule).toBe(648);

    const badges = await getBadgeState(null);
    const earned = (id: string) => badges.find(b => b.id === id)?.earned;
    expect(earned('points-1000')).toBe(false);
    expect(earned('points-10000')).toBe(false);
    expect(earned('streak-7')).toBe(true);

    /* Once: a play after the repair stays, and the next read repairs nothing. */
    recordGameCompletion('soccer-grid', at('2026-09-21'), 700, 900);
    expect(getStreakState().totalPoints).toBe(700);
    expect(getStreakState().retiredPoints).toBe(8_810_000);
  });

  it('8 the profile page shows the rule total, not the stored running sum', async () => {
    plantCaps();
    db.tables.user_scores = [{ user_id: 'user-1', total_points: 1_234_567, current_streak: 1, longest_streak: 2 }];
    db.tables.user_game_scores = [
      ...Array.from({ length: 12 }, (_, i) => ({ id: `cm-${i}`, user_id: 'user-1', game_type: 'club-manager', score: 10 * (i + 1), puzzle_date: '2026-09-10', created_at: '2026-09-10T12:00:00Z' })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `sg-${i}`, user_id: 'user-1', game_type: 'soccer-grid', score: 700, puzzle_date: '2026-09-10', created_at: '2026-09-10T13:00:00Z' })),
      { id: 'fo-1', user_id: 'user-1', game_type: 'front-office', score: 305, puzzle_date: '2026-09-12', created_at: '2026-09-12T13:00:00Z' },
    ];
    const profile = { user_id: 'user-1', username: 'tester', display_name: 'Tester', created_at: '2026-01-01T00:00:00Z' };
    auth.value = { ...auth.value, user: { id: 'user-1', created_at: '2026-01-01T00:00:00Z', user_metadata: {} }, profile, loading: false };

    const page = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <Routes><Route path="/profile" element={<Profile />} /></Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    const label = await page.findByText('Total Points', {}, { timeout: 5000 });
    /* 120 for the season's best match row, 700 for the grid once, 100 for the title at its cap. */
    expect(label.previousElementSibling?.textContent).toBe((920).toLocaleString());
  });
});
