/**
 * Round 981: the profile is right on a second device.
 *
 * A signed in player opening their profile on a new phone has nothing in
 * this browser and everything on the account. Before this round the page
 * showed the account's points beside Games 0, Streak 0, an average of server
 * points over local plays, and Point Hunter locked. These tests render the
 * real page for exactly that player, with the database mocked (nothing here
 * reaches the network), and check the pure merge underneath it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* ─── the account, as the mocked database holds it ─────────────────────── */

const NOW_ISO = new Date().toISOString();
const SERVER = {
  total_points: 4200,
  current_streak: 9,
  longest_streak: 12,
  last_played_at: NOW_ISO,
  games: 60,
};
let serverOn = true;

type Result = { data?: unknown; count?: number | null; error?: unknown };

/** A chainable stand in for one supabase query: every filter returns the
 *  same builder, and awaiting it answers from the table and the select. */
function query(table: string): Record<string, unknown> {
  let columns = '';
  let head = false;
  let single = false;
  const answer = (): Result => {
    if (!serverOn) return { data: single ? null : [], count: 0 };
    if (table === 'user_scores') {
      if (head) return { count: 3 };
      return { data: { total_points: SERVER.total_points, current_streak: SERVER.current_streak, longest_streak: SERVER.longest_streak, last_played_at: SERVER.last_played_at } };
    }
    if (table === 'user_game_scores') {
      if (head) return { count: SERVER.games };
      if (columns === 'game_type') return { data: Array.from({ length: SERVER.games }, () => ({ game_type: 'soccer-grid' })) };
      return { data: [] };
    }
    if (table === 'user_preferences') return { data: { time_spent_minutes: 30 } };
    return { data: single ? null : [] };
  };
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.select = (cols?: string, opts?: { head?: boolean }) => { columns = cols ?? ''; head = !!opts?.head; return b; };
  for (const m of ['eq', 'gt', 'order', 'limit', 'upsert', 'insert', 'in']) b[m] = chain;
  b.maybeSingle = () => { single = true; return b; };
  b.then = (ok: (r: Result) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(answer()).then(ok, bad);
  return b;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => query(t), rpc: () => Promise.resolve({ data: null, error: null }) },
  SUPABASE_URL: 'http://localhost.test',
  SUPABASE_PUBLISHABLE_KEY: 'test-key',
}));

/* One object for the whole file: the page's load effect depends on `user`
   and `profile`, so a fresh object per render would reload forever. */
const AUTH = vi.hoisted(() => ({
  user: { id: 'u-981', created_at: '2026-01-05T00:00:00Z', user_metadata: {} },
  profile: { user_id: 'u-981', username: 'secondphone', display_name: 'Second Phone', avatar_url: null, created_at: '2026-01-05T00:00:00Z' },
  loading: false,
  refreshProfile: () => Promise.resolve(),
  updateProfile: () => Promise.resolve({ error: null }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => AUTH }));
vi.mock('html2canvas', () => ({ default: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/profile/AchievementCase', () => ({ default: () => null }));
vi.mock('@/components/profile/StreakHistory', () => ({ default: () => null }));

import Profile from '@/pages/Profile';
import {
  BADGE_DEFS, BADGE_RULES, buildBadgeFacts, computeBadges, fullCalendarWeeks, ownTotals,
  serverStreakAlive, viewedTotals, type LocalBadgeInputs,
} from '@/lib/badges';

const EMPTY_LOCAL: LocalBadgeInputs = {
  totalPlays: 0, totalPoints: 0, currentStreak: 0, longestStreak: 0, visitDays: 0, playedSlugs: [], diaryDays: [],
};
const earned = (local: LocalBadgeInputs, server: Parameters<typeof buildBadgeFacts>[2]) =>
  computeBadges(buildBadgeFacts(local, [], server)).filter(b => b.earned).map(b => b.id).sort();

describe('the merge under the profile (pure)', () => {
  const now = new Date('2026-10-03T15:00:00Z');

  it('takes the larger half of every count, and the average from one half', () => {
    const t = ownTotals({ plays: 0, points: 0, currentStreak: 0, longestStreak: 0 },
      { gamesPlayed: 60, totalPoints: 4200, currentStreak: 9, longestStreak: 12, lastPlayedAt: '2026-10-03T01:00:00Z' }, now);
    expect(t).toEqual({ gamesPlayed: 60, totalPoints: 4200, currentStreak: 9, longestStreak: 12, averageScore: 70 });
    // local holds more points: the average is local points over local plays
    const u = ownTotals({ plays: 10, points: 5000, currentStreak: 2, longestStreak: 3 },
      { gamesPlayed: 60, totalPoints: 4200, currentStreak: 0, longestStreak: 1, lastPlayedAt: null }, now);
    expect(u.averageScore).toBe(500);
    expect(u.gamesPlayed).toBe(60);
  });

  it('drops a server streak whose last play is older than yesterday', () => {
    expect(serverStreakAlive('2026-10-03T00:10:00Z', now)).toBe(true);
    expect(serverStreakAlive('2026-10-02T23:59:00Z', now)).toBe(true);
    expect(serverStreakAlive('2026-10-01T23:59:00Z', now)).toBe(false);
    expect(serverStreakAlive(null, now)).toBe(false);
    expect(serverStreakAlive('not a date', now)).toBe(false);
    const stale = viewedTotals({ gamesPlayed: 5, totalPoints: 50, currentStreak: 6, longestStreak: 6, lastPlayedAt: '2026-09-20T12:00:00Z' }, now);
    expect(stale.currentStreak).toBe(0);
    expect(stale.longestStreak).toBe(6);
  });

  it('never trusts a junk number', () => {
    const t = ownTotals({ plays: Number.NaN, points: -40, currentStreak: Infinity, longestStreak: 2.7 },
      { gamesPlayed: -1, totalPoints: null, currentStreak: undefined, longestStreak: Number.NaN }, now);
    expect(t).toEqual({ gamesPlayed: 0, totalPoints: 0, currentStreak: 0, longestStreak: 2, averageScore: 0 });
  });

  it('unlocks the points, games and streak badges from the account alone', () => {
    const ids = earned(EMPTY_LOCAL, { gamesPlayed: 60, totalPoints: 4200, currentStreak: 9, longestStreak: 12, lastPlayedAt: NOW_ISO });
    expect(ids).toEqual(['games-10', 'games-25', 'games-50', 'points-1000', 'streak-3', 'streak-7'].sort());
  });

  it('Perfect Week is a full Monday to Sunday week, not On Fire again', () => {
    // seven days in a row from a Wednesday: On Fire yes, Perfect Week no
    const wedRun = ['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'];
    expect(fullCalendarWeeks(wedRun)).toBe(0);
    const ids = earned({ ...EMPTY_LOCAL, longestStreak: 7, diaryDays: wedRun }, null);
    expect(ids).toContain('streak-7');
    expect(ids).not.toContain('perfect-week');
    // Monday 2026-09-07 to Sunday 2026-09-13
    const week = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
    expect(fullCalendarWeeks(week)).toBe(1);
    expect(fullCalendarWeeks(week.slice(1))).toBe(0);
    expect(fullCalendarWeeks([...week, '2026-02-30', 'junk', 7])).toBe(1);
  });

  it('every badge has exactly one rule', () => {
    expect(Object.keys(BADGE_RULES).sort()).toEqual(BADGE_DEFS.map(d => d.id).sort());
  });
});

/* ─── the rendered page ─────────────────────────────────────────────────── */

/** The number a stat tile prints above its label. */
function tile(label: string): string {
  const el = screen.getByText(label, { selector: 'p' });
  return (el.previousElementSibling?.textContent ?? '').trim();
}
const badgeEarned = (name: string) =>
  (screen.getByText(name, { selector: 'p' }).parentElement?.className ?? '').includes('border-primary/50');

describe('Profile on a second device (server only player)', () => {
  beforeEach(() => { localStorage.clear(); serverOn = true; });
  afterEach(() => { cleanup(); });

  const mount = () => render(<MemoryRouter initialEntries={['/profile']}><Profile /></MemoryRouter>);

  it('shows the account numbers, never a zero beside the points total', async () => {
    mount();
    await waitFor(() => expect(tile('Total Points')).toBe('4,200'));
    expect(tile('Streak 🔥')).toBe('9');
    expect(tile('Best Streak')).toBe('12');
    expect(tile('Avg Score')).toBe('70');
    expect(tile('Days in a Row')).toBe('9');
    // Games Today is the one tile allowed a zero: it counts today only (the
    // owner's call), and this player has not played today.
    expect(tile('Games Today')).toBe('0');
    // the share card carries the lifetime games
    expect(screen.getByText('🎮 60 games')).toBeTruthy();
    expect(screen.getByText('🔥 9 streak')).toBeTruthy();
  });

  it('unlocks the badges the account has earned', async () => {
    mount();
    await waitFor(() => expect(badgeEarned('Point Hunter')).toBe(true));
    for (const name of ['Rookie', 'Getting Serious', 'Veteran', 'Streak Starter', 'On Fire']) {
      expect(badgeEarned(name), name).toBe(true);
    }
    for (const name of ['Century Club', 'Two Weeks Hot', 'Point Master', 'Perfect Week', 'All Rounder']) {
      expect(badgeEarned(name), name).toBe(false);
    }
  });

  it('a player with nothing anywhere sees zeros and every badge locked', async () => {
    serverOn = false;
    mount();
    await waitFor(() => expect(tile('Total Points')).toBe('0'));
    expect(tile('Streak 🔥')).toBe('0');
    expect(tile('Avg Score')).toBe('0');
    expect(BADGE_DEFS.some(d => badgeEarned(d.name))).toBe(false);
  });
});

describe('Your careers on the profile', () => {
  beforeEach(() => { localStorage.clear(); serverOn = true; });
  afterEach(() => { cleanup(); });

  it('lists the careers this browser holds, read from the saves', async () => {
    localStorage.setItem('soccerCareerSave', JSON.stringify({ currentClub: 'Test Town FC', age: 21 }));
    localStorage.setItem('dukb-club-manager-save', JSON.stringify({ clubName: 'Sample United', season: 3 }));
    render(<MemoryRouter initialEntries={['/profile']}><Profile /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Test Town FC, age 21')).toBeTruthy());
    expect(screen.getByText('Sample United, season 3')).toBeTruthy();
    expect(screen.getByText('2 saved')).toBeTruthy();
    const links = [...document.querySelectorAll('[data-profile-career]')].map(a => a.getAttribute('href'));
    expect(links).toEqual(['/soccer-career', '/club-manager']);
  });

  it('says plainly when this browser has none', async () => {
    render(<MemoryRouter initialEntries={['/profile']}><Profile /></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('[data-profile-careers-empty]')).toBeTruthy());
    expect(screen.getByText(/Careers live in the browser you play them in/)).toBeTruthy();
  });
});
