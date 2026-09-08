import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Profile from '@/pages/Profile';

const boundary = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>, reads: new Map<string, unknown>(), unexpected: [] as string[],
  shareMode: '' as '' | 'card' | 'clipboard', captured: null as HTMLElement | null,
  shared: [] as ShareData[], copied: [] as string[],
  deny(message: string): never { this.unexpected.push(message); throw new Error(message); },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => boundary.auth }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://profile-avatar-fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, member) {
    if (member !== 'from') return boundary.deny(`Unexpected backend member: ${String(member)}`);
    return (table: string) => {
      const steps: unknown[][] = [['from', table]];
      const chain: object = new Proxy({}, { get(_query, operation) {
        if (operation === 'then') return (resolve: (reply: unknown) => void) => {
          const key = JSON.stringify(steps);
          if (!boundary.reads.has(key)) return boundary.deny(`Unexpected backend query: ${key}`);
          const reply = boundary.reads.get(key); boundary.reads.delete(key); resolve(reply);
        };
        if (!['select', 'eq', 'order', 'limit', 'maybeSingle'].includes(String(operation))) return boundary.deny(`Unexpected backend write/operation: ${String(operation)}`);
        return (...args: unknown[]) => { steps.push([operation, ...args]); return chain; };
      } });
      return chain;
    };
  } }),
}));
// Rasterization and delivery are external boundaries. The captured DOM and
// strings are produced by the real Profile share handlers, not by this mock.
vi.mock('html2canvas', () => ({ default: async (element: HTMLElement, options: unknown) => {
  if (!boundary.shareMode || boundary.captured || JSON.stringify(options) !== '{"backgroundColor":null,"scale":2}') return boundary.deny('Unexpected canvas capture');
  boundary.captured = element;
  if (boundary.shareMode === 'clipboard') throw new Error('Synthetic rasterization failure');
  return { toBlob: (callback: BlobCallback) => callback(new Blob(['synthetic image bytes'], { type: 'image/png' })) };
} }));

type FixtureProfile = { id: string; user_id: string; username: string | null; display_name: string | null; avatar_url: string | null;
  streak_state: null; created_at: string; updated_at: string };
const DAY = '2026-09-08', KEY = 'dukb-streaks-v1';
const svg = (fill: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${fill}"/></svg>`)}`;
const META_AVATAR = svg('red'), SAVED_AVATAR = svg('blue');
const B: FixtureProfile = { id: 'profile-b', user_id: 'account-b', username: 'bravo_fixture', display_name: 'Visitor Fixture', avatar_url: null,
  streak_state: null, created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z' };
const A: FixtureProfile = { ...B, id: 'profile-a', user_id: 'account-a', username: 'charlie_fixture', display_name: 'Alpha Fixture' };
const check = (ok: boolean, message: string) => assert.ok(ok, message);
const storage = () => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
let storageBefore: string;

function add(steps: unknown[][], data: unknown = [], count?: number) {
  const key = JSON.stringify(steps);
  if (boundary.reads.has(key)) throw new Error(`Duplicate fixture query: ${key}`);
  boundary.reads.set(key, { data, error: null, count });
}
function details(who: FixtureProfile, own = false, named = false) {
  if (named) add([['from', 'profiles'], ['select', '*'], ['eq', 'username', who.username], ['maybeSingle']], who);
  const query = (table: string, columns: string, ...tail: unknown[][]) => [['from', table], ['select', columns], ['eq', 'user_id', who.user_id], ...tail];
  add(query('user_best_scores', '*', ['order', 'best_score', { ascending: false }]));
  add(query('user_game_scores', 'game_type, score, created_at', ['order', 'created_at', { ascending: false }], ['limit', 5]));
  add(query('user_scores', 'current_streak, longest_streak, total_points', ['maybeSingle']), null);
  add([['from', 'user_game_scores'], ['select', '*', { count: 'exact', head: true }], ['eq', 'user_id', who.user_id]], null, 0);
  add(query('user_game_scores', 'game_type'));
  add(query('saved_brackets', 'id, bracket_data', ['limit', 1]));
  add(query('daily_completions', 'game_slug', ['eq', 'date', DAY]));
  add(query('user_preferences', '*', ['maybeSingle']), null);
  if (own) add([['from', 'game_completions'], ['select', 'game, completed_on'], ['eq', 'player_name', who.display_name || who.username || B.display_name], ['order', 'completed_on', { ascending: false }], ['limit', 500]]);
}
function mount(who = A, { profile = B, metadataAvatar = META_AVATAR as string | null, email = 'zulu@fixture.invalid' as string | null, signedIn = true } = {}) {
  const own = who.user_id === B.user_id;
  details(who, own, !own);
  boundary.auth = { user: signedIn ? { id: B.user_id, email, user_metadata: { avatar_url: metadataAvatar }, created_at: B.created_at } : null,
    profile: signedIn ? profile : null, loading: false, refreshProfile: () => boundary.deny('Unexpected auth refresh'), updateProfile: () => boundary.deny('Unexpected profile write') };
  render(<HelmetProvider><MemoryRouter initialEntries={[own ? '/profile' : `/profile/${who.username}`]}>
    <nav><Link to={`/profile/${A.username}`}>View A</Link></nav>
    <Routes><Route path="/profile/:username?" element={<Profile />} /></Routes>
  </MemoryRouter></HelmetProvider>);
}
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const loaded = async () => { await screen.findByText('Total Points', { exact: true }); await flush(); };
const avatar = () => {
  const element = screen.getByRole('heading', { level: 1 }).parentElement?.previousElementSibling;
  assert.ok(element instanceof HTMLElement, 'SETUP: rendered profile avatar exists');
  return { image: element.tagName === 'IMG' ? element.getAttribute('src') : null, initial: element.tagName === 'IMG' ? null : element.textContent };
};
const same = (actual: unknown, expected: unknown, message: string) => {
  const equal = JSON.stringify(actual) === JSON.stringify(expected);
  if (!equal) console.log(`${message}: ${JSON.stringify({ actual, expected })}`);
  check(equal, message);
};

beforeEach(() => {
  boundary.reads.clear(); boundary.unexpected.length = 0; boundary.shared.length = 0; boundary.copied.length = 0;
  boundary.shareMode = ''; boundary.captured = null;
  localStorage.clear();
  localStorage.setItem(KEY, JSON.stringify({ version: 1, global: { current: 0, longest: 0, lastDate: null }, perGame: {}, loginDates: [DAY], totalPlays: 0, totalPoints: 0 }));
  localStorage.setItem('dukb-display-name', B.display_name!); storageBefore = storage();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] }); vi.setSystemTime(new Date(`${DAY}T16:00:00Z`));
  vi.stubGlobal('fetch', () => boundary.deny('Unexpected fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => boundary.deny('Unexpected XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('Unexpected WebSocket'); } });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => boundary.deny('Unexpected download'));
  vi.spyOn(console, 'error').mockImplementation((...args) => { boundary.unexpected.push(`Console error: ${args.join(' ')}`); });
  vi.stubGlobal('navigator', { userAgent: 'Profile avatar fixture',
    clipboard: { writeText: async (text: string) => {
      if (boundary.shareMode !== 'clipboard') return boundary.deny('Unexpected clipboard write');
      boundary.copied.push(text);
    } },
    canShare: ({ files }: ShareData) => boundary.shareMode === 'card' && files?.length === 1,
    share: async (payload: ShareData) => {
      if (boundary.shareMode !== 'card' || payload.files?.length !== 1) return boundary.deny('Unexpected native share');
      boundary.shared.push(payload);
    },
  });
});
afterEach(() => {
  cleanup();
  const untouched = storage() === storageBefore, unexpected = [...boundary.unexpected], missing = [...boundary.reads.keys()];
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear();
  if (unexpected.length || missing.length) console.log(JSON.stringify({ unexpected, missing }));
  check(!unexpected.length && !missing.length, 'BOUNDARY: exact fixture reads and local share captures only');
  check(untouched, 'STORAGE: avatar rendering preserves browser totals');
});

describe('Profile avatar identity belongs to the viewed player', () => {
  it('does not show visitor metadata avatar on another named player', async () => {
    mount(); await loaded();
    same(avatar(), { image: null, initial: 'A' }, 'OTHER AVATAR: Alpha without a photo cannot show visitor metadata');
  });
  it('uses the viewed username instead of the visitor email initial', async () => {
    mount({ ...A, display_name: null }, { metadataAvatar: null }); await loaded();
    same(avatar(), { image: null, initial: 'C' }, 'OTHER INITIAL: charlie username wins over visitor email Z');
  });
  it('uses an own username before the matching account email', async () => {
    const own = { ...B, display_name: null }; mount(own, { profile: own, metadataAvatar: null }); await loaded();
    same(avatar(), { image: null, initial: 'B' }, 'OWN USERNAME: bravo username wins over own email Z');
  });
  it('preserves the matching owners metadata avatar fallback', async () => {
    mount(B); await loaded();
    same(avatar(), { image: META_AVATAR, initial: null }, 'OWN AVATAR: matching owner keeps metadata photo fallback');
  });
  it('preserves own email initial when both profile names are absent', async () => {
    const own = { ...B, display_name: null, username: null }; mount(own, { profile: own, metadataAvatar: null }); await loaded();
    same(avatar(), { image: null, initial: 'Z' }, 'OWN EMAIL: matching nameless owner keeps email initial Z');
  });
  it('uses neutral U when no profile name or own email is available', async () => {
    const own = { ...B, display_name: null, username: null }; mount(own, { profile: own, metadataAvatar: null, email: null }); await loaded();
    same(avatar(), { image: null, initial: 'U' }, 'NEUTRAL: missing identity fields produce U');
  });
  for (const own of [true, false]) it(`keeps the saved ${own ? 'own' : 'other'} avatar ahead of metadata`, async () => {
    const who = { ...(own ? B : A), avatar_url: SAVED_AVATAR }; mount(who, { profile: own ? who : B }); await loaded();
    same(avatar(), { image: SAVED_AVATAR, initial: null }, 'SAVED AVATAR: viewed saved image takes precedence');
  });
  it('removes the owners photo when navigating to another profile without remounting', async () => {
    mount(B); await loaded();
    const before = avatar();
    details(A, false, true); fireEvent.click(screen.getByRole('link', { name: 'View A' })); await flush(); await loaded();
    same({ before, ...avatar(), name: screen.getByRole('heading', { level: 1 }).textContent },
      { before: { image: META_AVATAR, initial: null }, image: null, initial: 'A', name: 'Alpha Fixture' },
      'NAVIGATION: other profile cannot retain owner photo');
  });
  it('uses the viewed username for signed-out readers too', async () => {
    mount({ ...A, display_name: null }, { signedIn: false }); await loaded();
    same(avatar(), { image: null, initial: 'C' }, 'SIGNED OUT: viewed username supplies initial without an auth user');
  });
  it('shares the existing viewed-player card without visitor identity or avatar', async () => {
    mount(); await loaded(); boundary.shareMode = 'card';
    fireEvent.click(screen.getByRole('button', { name: '📸 Share Card' })); await flush();
    const text = boundary.captured?.textContent || '';
    check(text.includes('Alpha Fixture') && text.includes('@charlie_fixture') && !text.includes('Visitor Fixture') && !text.includes('zulu@fixture.invalid')
      && boundary.captured?.querySelector('img') === null && boundary.shared.length === 1 && boundary.copied.length === 0
      && boundary.shared[0].files?.[0].name === 'douknowball-card.png', 'SHARE CARD: captured card keeps Alpha identity and no visitor photo');
  });
  it('keeps viewed-player identity in the clipboard fallback', async () => {
    mount(); await loaded(); boundary.shareMode = 'clipboard';
    fireEvent.click(screen.getByRole('button', { name: '📸 Share Card' })); await flush();
    check(boundary.copied.length === 1 && boundary.copied[0].startsWith('🏆 Alpha Fixture on DoUKnowBall\n')
      && !boundary.copied[0].includes('Visitor Fixture') && !boundary.copied[0].includes('zulu@fixture.invalid') && boundary.shared.length === 0,
      'SHARE FALLBACK: clipboard text stays with Alpha instead of visitor');
  });
});
