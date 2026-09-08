import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Profile from '@/pages/Profile';

// Only authentication and the backend boundary are mocked. Profile, badges,
// useStreaks and its storage/date logic remain real.
const boundary = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
  reads: new Map<string, unknown>(),
  unexpected: [] as string[],
  deny(message: string): never { this.unexpected.push(message); throw new Error(message); },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => boundary.auth }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://profile-fixture.invalid',
  SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, {
    get(_target, member) {
      if (member !== 'from') return boundary.deny(`Unexpected backend member: ${String(member)}`);
      return (table: string) => {
        const steps: unknown[][] = [['from', table]];
        const chain: object = new Proxy({}, {
          get(_query, operation) {
            if (operation === 'then') return (resolve: (value: unknown) => void) => {
              const key = JSON.stringify(steps);
              if (!boundary.reads.has(key)) return boundary.deny(`Unexpected backend query: ${key}`);
              const response = boundary.reads.get(key);
              boundary.reads.delete(key);
              resolve(response);
            };
            if (!['select', 'eq', 'order', 'limit', 'maybeSingle', 'gt'].includes(String(operation))) {
              return boundary.deny(`Unexpected backend write/operation: ${String(operation)}`);
            }
            return (...args: unknown[]) => { steps.push([operation, ...args]); return chain; };
          },
        });
        return chain;
      };
    },
  }),
}));

const DAY = '2026-09-08';
const KEY = 'dukb-streaks-v1';
const own = { id: 'profile-self', user_id: 'account-self', username: 'fixture_self', display_name: 'Fixture Owner',
  avatar_url: null, streak_state: null, created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z' };
const other = { ...own, id: 'profile-other', user_id: 'account-other', username: 'fixture_other', display_name: 'Fixture Other' };
let savedStorage: string;
const storageSnapshot = () => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const check = (ok: boolean, message: string) => assert.ok(ok, message);
const visible = (element: HTMLElement | null) => {
  for (let node = element; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.hidden || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.opacity === '0') return false;
  }
  return !!element;
};

function seed(localPoints: number, localPlays: number, accountPoints: number | null = 550, accountPlays = 11, username = '') {
  localStorage.setItem(KEY, JSON.stringify({ version: 1,
    global: { current: 1, longest: 3, lastDate: DAY },
    perGame: { footle: { current: 1, longest: 3, lastDate: DAY } },
    loginDates: ['2026-09-07', DAY], totalPlays: localPlays, totalPoints: localPoints,
  }));
  localStorage.setItem('dukb-local-completions', JSON.stringify({ date: DAY, slugs: localPlays ? ['footle'] : [] }));
  savedStorage = storageSnapshot();
  boundary.auth = { user: { id: own.user_id, user_metadata: {}, created_at: own.created_at }, profile: own,
    loading: false, refreshProfile: () => boundary.deny('Unexpected auth refresh'), updateProfile: () => boundary.deny('Unexpected profile write') };
  const target = username === other.username ? other : own;
  const add = (steps: unknown[][], data: unknown = [], count?: number) => boundary.reads.set(JSON.stringify(steps), { data, error: null, count });
  const query = (table: string, columns: string, ...tail: unknown[][]) => [['from', table], ['select', columns], ['eq', 'user_id', target.user_id], ...tail];
  if (username) add([['from', 'profiles'], ['select', '*'], ['eq', 'username', username], ['maybeSingle']], target);
  add(query('user_best_scores', '*', ['order', 'best_score', { ascending: false }]));
  add(query('user_game_scores', 'game_type, score, created_at', ['order', 'created_at', { ascending: false }], ['limit', 5]));
  add(query('user_scores', 'current_streak, longest_streak, total_points', ['maybeSingle']),
    accountPoints === null ? null : { current_streak: 2, longest_streak: 4, total_points: accountPoints });
  add([['from', 'user_game_scores'], ['select', '*', { count: 'exact', head: true }], ['eq', 'user_id', target.user_id]], null, accountPlays);
  add(query('user_game_scores', 'game_type'));
  add(query('saved_brackets', 'id, bracket_data', ['limit', 1]));
  add(query('daily_completions', 'game_slug', ['eq', 'date', DAY]));
  add(query('user_preferences', '*', ['maybeSingle']), null);
  if (accountPoints !== null) add([['from', 'user_scores'], ['select', '*', { count: 'exact', head: true }], ['gt', 'total_points', accountPoints]], null, 3);
  if (target === own) add([['from', 'game_completions'], ['select', 'game, completed_on'], ['eq', 'player_name', own.display_name], ['order', 'completed_on', { ascending: false }], ['limit', 500]]);
  render(<HelmetProvider><MemoryRouter initialEntries={[username ? `/profile/${username}` : '/profile']}>
    <Routes><Route path="/profile/:username?" element={<Profile />} /></Routes>
  </MemoryRouter></HelmetProvider>);
}

async function stats() {
  const label = await screen.findByText('Avg Score', { exact: true });
  const card = label.parentElement!;
  const points = screen.getByText('Total Points', { exact: true }).parentElement!;
  return { card, average: card.querySelector('p')?.textContent, points: points.querySelector('p')?.textContent };
}

beforeEach(() => {
  localStorage.clear();
  boundary.reads.clear(); boundary.unexpected.length = 0;
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(`${DAY}T16:00:00Z`));
  vi.stubGlobal('fetch', () => boundary.deny('Unexpected fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => boundary.deny('Unexpected XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('Unexpected WebSocket'); } });
  vi.spyOn(console, 'error').mockImplementation((...args) => { boundary.unexpected.push(`Console error: ${args.join(' ')}`); });
});
afterEach(() => {
  cleanup();
  const unchanged = storageSnapshot() === savedStorage;
  const unexpected = [...boundary.unexpected];
  const remaining = [...boundary.reads.keys()];
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  localStorage.clear();
  if (unexpected.length) console.log(`Unexpected boundary operations: ${unexpected.join(' | ')}`);
  check(unexpected.length === 0, 'BOUNDARY: no unexpected backend or transport operations');
  check(remaining.length === 0, `BOUNDARY: unconsumed expected queries: ${remaining.join(' | ')}`);
  check(unchanged, 'STORAGE: rendering preserves all seeded storage and totals');
});

describe('Profile average uses matching populations', () => {
  it('uses browser points and plays while retaining the account points floor', async () => {
    seed(50, 1);
    const value = await stats();
    check(value.average === '50', 'AVERAGE: own browser 50/1 is 50, not account 550/browser 1');
    check(value.points === '550', 'POINTS: own total keeps the account floor of 550');
  });
  it('visibly labels the own average as this browser', async () => {
    seed(50, 1);
    const { card } = await stats();
    const caption = within(card).queryByText('This browser', { exact: true });
    check(visible(caption), 'CAPTION: own average visibly says This browser');
  });
  it('shows Not yet when this browser has no completed plays', async () => {
    seed(0, 0);
    const value = await stats();
    check(value.average === 'Not yet', 'EMPTY: own browser without plays is Not yet');
    check(value.points === '550', 'POINTS: empty browser keeps the account floor of 550');
  });
  it('keeps a genuine zero average distinct from no browser plays', async () => {
    seed(0, 2);
    check((await stats()).average === '0', 'ZERO: two browser plays with zero points average zero');
  });
  it('uses account points and counted plays for another profile', async () => {
    seed(9999, 1, 550, 11, other.username);
    const value = await stats();
    check(value.average === '50' && value.points === '550', 'OTHER: viewed account uses 550/11 and ignores visitor totals');
    check(!within(value.card).queryByText('This browser', { exact: true }), 'OTHER CAPTION: viewed account has no browser caption');
  });
  it('keeps the existing empty-account average for another profile', async () => {
    seed(9999, 1, null, 0, other.username);
    const value = await stats();
    check(value.average === '0', 'OTHER EMPTY: viewed account with no plays keeps zero');
    check(!within(value.card).queryByText('This browser', { exact: true }), 'OTHER CAPTION: viewed account has no browser caption');
  });
  it('rounds the local-only average without account score data', async () => {
    seed(125, 2, null, 0);
    const value = await stats();
    check(value.average === '63' && value.points === '125', 'LOCAL: browser 125/2 rounds to 63 with total 125');
  });
  it('treats the signed-in username route as this browser too', async () => {
    seed(50, 1, 550, 11, own.username);
    const value = await stats();
    check(value.average === '50', 'OWN ROUTE: own username uses the browser average of 50');
    check(!!within(value.card).queryByText('This browser', { exact: true }), 'OWN ROUTE CAPTION: own username says This browser');
  });
});
