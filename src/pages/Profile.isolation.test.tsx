import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { toast } from 'sonner';
import Profile from '@/pages/Profile';

type Read = { reply: unknown; calls: number; optional: boolean; gate?: Promise<void>; release?: () => void };
const boundary = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>, reads: new Map<string, Read>(), unexpected: [] as string[],
  writes: [] as Array<{ user_id: string; time_spent_minutes: number; updated_at: string }>, allowMinutes: false,
  preferenceWrites: [] as Array<{ user_id: string; favourite_team: string; updated_at: string }>, allowPreferenceCapture: false,
  deny(message: string): never { this.unexpected.push(message); throw new Error(message); },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => boundary.auth }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://profile-isolation-fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
  supabase: new Proxy({}, { get(_target, member) {
    if (member !== 'from') return boundary.deny(`Unexpected backend member: ${String(member)}`);
    return (table: string) => {
      const steps: unknown[][] = [['from', table]];
      const chain: object = new Proxy({}, { get(_query, operation) {
        if (operation === 'then') return async (resolve: (reply: unknown) => void) => {
          const key = JSON.stringify(steps), read = boundary.reads.get(key);
          if (!read || read.calls++) return boundary.deny(`Unexpected backend query: ${key}`);
          if (read.gate) await read.gate;
          resolve(read.reply);
        };
        if (operation === 'upsert') return (row: { user_id: string; time_spent_minutes: number; updated_at: string; favourite_team?: string }, options: unknown) => {
          if (boundary.allowPreferenceCapture && table === 'user_preferences' && row.user_id === 'account-b'
            && Object.keys(row).sort().join() === 'favourite_team,updated_at,user_id' && row.favourite_team === ''
            && typeof row.updated_at === 'string' && JSON.stringify(options) === '{"onConflict":"user_id"}') {
            boundary.preferenceWrites.push({ user_id: row.user_id, favourite_team: row.favourite_team, updated_at: row.updated_at });
            return Promise.resolve({ data: null, error: null });
          }
          if (!boundary.allowMinutes || table !== 'user_preferences' || row.user_id !== 'account-b'
            || Object.keys(row).sort().join() !== 'time_spent_minutes,updated_at,user_id'
            || !Number.isInteger(row.time_spent_minutes) || row.time_spent_minutes < 1
            || typeof row.updated_at !== 'string' || JSON.stringify(options) !== '{"onConflict":"user_id"}') {
            return boundary.deny(`Unexpected backend write: ${table} ${JSON.stringify(row)}`);
          }
          boundary.writes.push({ ...row });
          return Promise.resolve({ data: null, error: null });
        };
        if (!['select', 'eq', 'order', 'limit', 'maybeSingle', 'gt'].includes(String(operation))) return boundary.deny(`Unexpected operation: ${String(operation)}`);
        return (...args: unknown[]) => { steps.push([operation, ...args]); return chain; };
      } });
      return chain;
    };
  } }),
}));

const DAY = '2026-09-08', KEY = 'dukb-streaks-v1';
const B = { id: 'profile-b', user_id: 'account-b', username: 'fixture_b', display_name: 'Fixture B', avatar_url: null,
  streak_state: null, created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z' };
const A = { ...B, id: 'profile-a', user_id: 'account-a', username: 'fixture_a', display_name: 'Fixture A' };
const check = (ok: boolean, message: string) => assert.ok(ok, message);
let storageBefore: string;
const storage = () => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));

function add(steps: unknown[][], data: unknown = [], count?: number, optional = false, deferred = false): Read {
  const read: Read = { reply: { data, error: null, count }, calls: 0, optional };
  if (deferred) read.gate = new Promise<void>(resolve => { read.release = resolve; });
  const key = JSON.stringify(steps);
  if (boundary.reads.has(key)) throw new Error(`Duplicate fixture query: ${key}`);
  boundary.reads.set(key, read);
  return read;
}
function lookup(who = A, deferred = false, missing = false, fallback = false) {
  return add([['from', 'profiles'], ['select', '*'], ['eq', fallback ? 'user_id' : 'username', fallback ? who.user_id : who.username], ['maybeSingle']], missing ? null : who, undefined, false, deferred);
}
function details(who = B, { optional = false, delay = '', minutes = who === A ? 777 : 0 } = {}) {
  const rich = who === A;
  const query = (table: string, columns: string, ...tail: unknown[][]) => [['from', table], ['select', columns], ['eq', 'user_id', who.user_id], ...tail];
  add(query('user_best_scores', '*', ['order', 'best_score', { ascending: false }]), rich ? [{ game_type: 'footle', best_score: 321, achieved_at: `${DAY}T12:00:00Z` }] : [], undefined, optional);
  add(query('user_game_scores', 'game_type, score, created_at', ['order', 'created_at', { ascending: false }], ['limit', 5]), rich ? [{ game_type: 'footle', score: 321, created_at: `${DAY}T12:00:00Z` }] : [], undefined, optional);
  add(query('user_scores', 'current_streak, longest_streak, total_points', ['maybeSingle']), rich ? { current_streak: 6, longest_streak: 8, total_points: 900 } : null, undefined, optional);
  add([['from', 'user_game_scores'], ['select', '*', { count: 'exact', head: true }], ['eq', 'user_id', who.user_id]], null, rich ? 3 : 0, optional);
  add(query('user_game_scores', 'game_type'), rich ? [{ game_type: 'footle' }] : [], undefined, optional);
  add(query('saved_brackets', 'id, bracket_data', ['limit', 1]), rich ? [{ id: 'fixture-bracket-a', bracket_data: { awards: { champion: 'A Champion Fixture' } } }] : [], undefined, optional);
  add(query('daily_completions', 'game_slug', ['eq', 'date', DAY]), rich ? [{ game_slug: 'footle' }] : [], undefined, optional);
  const prefs = add(query('user_preferences', '*', ['maybeSingle']), rich || minutes ? {
    favourite_game: rich ? 'footle' : '', favourite_team: rich ? 'A Team Fixture' : '',
    favourite_player: rich ? 'A Player Fixture' : '', time_spent_minutes: minutes,
  } : null, undefined, optional, delay === 'details');
  const rank = rich ? add([['from', 'user_scores'], ['select', '*', { count: 'exact', head: true }], ['gt', 'total_points', 900]], null, 8, optional || delay === 'details', delay === 'rank') : undefined;
  return delay === 'rank' ? rank! : prefs;
}
function badge(name = B.display_name, optional = false) {
  return add([['from', 'game_completions'], ['select', 'game, completed_on'], ['eq', 'player_name', name], ['order', 'completed_on', { ascending: false }], ['limit', 500]], [], undefined, optional);
}
function Harness() {
  const location = useLocation();
  return <><nav><Link to="/profile">My Profile</Link><Link to={`/profile/${A.username}`}>View A</Link></nav>
    <output data-testid="route">{location.pathname}</output>
    <Routes><Route path="/profile/:username?" element={<Profile />} /><Route path="/" element={<p>Fixture home</p>} /></Routes></>;
}
function mount(route = `/profile/${A.username}`, profile: typeof B | null = B) {
  boundary.auth = { user: { id: B.user_id, user_metadata: { name: B.display_name }, created_at: B.created_at }, profile, loading: false,
    refreshProfile: () => boundary.deny('Unexpected auth refresh'), updateProfile: () => boundary.deny('Unexpected profile edit write') };
  const content = <HelmetProvider><MemoryRouter initialEntries={[route]}><Harness /></MemoryRouter></HelmetProvider>;
  const view = render(content);
  return (profile: typeof B) => {
    boundary.auth = { ...boundary.auth, profile };
    view.rerender(<HelmetProvider><MemoryRouter initialEntries={[route]}><Harness /></MemoryRouter></HelmetProvider>);
  };
}
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const loaded = async (name: string) => { await screen.findByRole('heading', { level: 1, name }); await screen.findByText('Total Points', { exact: true }); await flush(); };
const used = async (read: Read) => { await flush(); assert.equal(read.calls, 1, 'SETUP: deferred query was reached'); };
const release = async (read: Read) => { await act(async () => { read.release!(); await Promise.resolve(); }); await flush(); };
const go = async (name: string) => { fireEvent.click(screen.getByRole('link', { name })); await flush(); };
const minute = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(60000); }); };
const stat = (label: string) => screen.queryByText(label, { exact: true })?.parentElement?.querySelector('p')?.textContent ?? null;
const current = () => ({ route: screen.getByTestId('route').textContent, heading: screen.queryByRole('heading', { level: 1 })?.textContent ?? null,
  points: stat('Total Points'), minutes: stat('Time on profile'), rank: screen.queryByText(/All-time rank #/)?.textContent ?? null,
  bracket: !!screen.queryByText('A Champion Fixture', { exact: true }),
  team: (screen.queryByPlaceholderText('e.g. Real Madrid') as HTMLInputElement | null)?.value ?? null,
  player: (screen.queryByPlaceholderText('e.g. Messi') as HTMLInputElement | null)?.value ?? null,
  game: screen.queryByRole('combobox')?.textContent ?? null,
});
const emptyB = { route: '/profile', heading: 'Fixture B', points: '0', minutes: '0m', rank: null, bracket: false, team: '', player: '', game: 'Pick a game...' };
const same = (actual: unknown, expected: unknown, message: string) => {
  const equal = JSON.stringify(actual) === JSON.stringify(expected);
  if (!equal) console.log(`${message}: ${JSON.stringify({ actual, expected })}`);
  check(equal, message);
};

beforeEach(() => {
  boundary.reads.clear(); boundary.unexpected.length = 0; boundary.writes.length = 0; boundary.allowMinutes = false;
  boundary.preferenceWrites.length = 0; boundary.allowPreferenceCapture = false;
  localStorage.clear();
  localStorage.setItem(KEY, JSON.stringify({ version: 1, global: { current: 0, longest: 0, lastDate: null }, perGame: {}, loginDates: [DAY], totalPlays: 0, totalPoints: 0 }));
  localStorage.setItem('dukb-display-name', B.display_name);
  storageBefore = storage();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] }); vi.setSystemTime(new Date(`${DAY}T16:00:00Z`));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('fetch', () => boundary.deny('Unexpected fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => boundary.deny('Unexpected XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('Unexpected WebSocket'); } });
  vi.spyOn(console, 'error').mockImplementation((...args) => { boundary.unexpected.push(`Console error: ${args.join(' ')}`); });
  vi.spyOn(toast, 'error');
});
afterEach(() => {
  cleanup();
  const untouched = storage() === storageBefore;
  const unexpected = [...boundary.unexpected];
  const missing = [...boundary.reads.entries()].filter(([, read]) => !read.optional && read.calls !== 1).map(([key]) => key);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear();
  if (unexpected.length || missing.length) console.log(JSON.stringify({ unexpected, missing }));
  check(!unexpected.length && !missing.length, 'BOUNDARY: only exact fixture queries and allowed local minute captures occur');
  check(untouched, 'STORAGE: profile navigation preserves seeded browser totals');
});

describe('Profile loads stay with their current identity', () => {
  it('clears populated A data when My Profile opens empty B without remounting', async () => {
    lookup(); details(A); details(); badge(); mount(); await loaded(A.display_name);
    check(stat('Time on profile') === '12h 57m' && stat('Total Points') === '900' && current().bracket, 'SETUP: A populated fixture rendered');
    await go('My Profile'); await loaded(B.display_name);
    same(current(), emptyB, 'RESET: empty B cannot retain A scores, bracket, preferences or minutes');
  });
  it('writes B minute one rather than retained A minute 778', async () => {
    lookup(); details(A); details(); badge(); mount(); await loaded(A.display_name);
    await go('My Profile'); await loaded(B.display_name); boundary.allowMinutes = true; await minute();
    same(boundary.writes.map(row => [row.user_id, row.time_spent_minutes]), [[B.user_id, 1]], 'MINUTES: B first minute is one, never A 778');
  });
  it('waits for own preferences before starting the minute writer', async () => {
    const pending = details(B, { delay: 'details' }); badge(); boundary.allowMinutes = true; mount('/profile'); await used(pending);
    await minute(); const whileLoading = [...boundary.writes];
    await release(pending); await loaded(B.display_name); await minute();
    same({ loading: whileLoading.length, writes: boundary.writes.map(row => row.time_spent_minutes) }, { loading: 0, writes: [1] }, 'READY: no minute write before own preferences settle');
  });
  it('ignores a late A username lookup after B settles', async () => {
    const pending = lookup(A, true); details(A, { optional: true }); details(); badge(); mount(); await used(pending);
    await go('My Profile'); await loaded(B.display_name); await release(pending);
    same(current(), emptyB, 'LOOKUP: obsolete A identity cannot replace settled B');
  });
  it('ignores an obsolete missing-profile redirect and toast', async () => {
    const pending = lookup(A, true, true); details(); badge(); mount(); await used(pending);
    await go('My Profile'); await loaded(B.display_name); await release(pending);
    check(screen.getByTestId('route').textContent === '/profile' && vi.mocked(toast.error).mock.calls.length === 0, 'MISSING: obsolete lookup cannot redirect or toast over B');
  });
  it('ignores late A detail results after B settles', async () => {
    lookup(); const pending = details(A, { delay: 'details' }); details(); badge(); mount(); await used(pending);
    await go('My Profile'); await loaded(B.display_name); await release(pending);
    same(current(), emptyB, 'DETAILS: obsolete A batch cannot populate B');
  });
  it('ignores a late A leaderboard rank after B settles', async () => {
    lookup(); const pending = details(A, { delay: 'rank' }); details(); badge(); mount(); await used(pending);
    await go('My Profile'); await loaded(B.display_name); await release(pending);
    check(screen.queryByText(/All-time rank #/) === null, 'RANK: obsolete A rank cannot appear on B');
  });
  for (const missing of [false, true]) it(`ignores obsolete own fallback lookup returning ${missing ? 'no row' : 'a row'}`, async () => {
    const pending = lookup(B, true, missing, true); details(B, { optional: true }); badge(B.display_name, true); lookup(); details(A);
    mount('/profile', null); await used(pending); await go('View A'); await loaded(A.display_name); await release(pending);
    check(screen.queryByRole('heading', { level: 1 })?.textContent === A.display_name && stat('Total Points') === '900', 'FALLBACK: obsolete own lookup cannot replace viewed A');
  });
  it('closes the own-profile editor when navigating to A', async () => {
    details(); badge(); lookup(); details(A); mount('/profile'); await loaded(B.display_name);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByPlaceholderText('Display name'), { target: { value: 'Draft belonging to B' } });
    await go('View A'); await screen.findByText('Games Played', { exact: true }); await flush();
    check(!screen.queryByPlaceholderText('Display name') && screen.queryByRole('heading', { level: 1 })?.textContent === A.display_name, 'EDITOR: B draft cannot remain on A profile');
  });
  it('increments the settled current account stored minutes', async () => {
    details(B, { minutes: 17 }); badge(); boundary.allowMinutes = true; mount('/profile'); await loaded(B.display_name); await minute();
    same(boundary.writes.map(row => [row.user_id, row.time_spent_minutes]), [[B.user_id, 18]], 'CURRENT: settled B minute seventeen advances to eighteen');
  });
  it('loads B identity and badges when auth temporarily retains cached profile A', async () => {
    const fallback = lookup(B, false, false, true); fallback.optional = true;
    details(); const aBadge = badge(A.display_name, true), bBadge = badge(B.display_name, true);
    mount('/profile', A); await screen.findByText('Total Points', { exact: true }); await flush();
    check(screen.queryByRole('heading', { level: 1 })?.textContent === B.display_name && fallback.calls === 1 && aBadge.calls === 0 && bBadge.calls === 1,
      'AUTH IDENTITY: B cannot reuse cached A profile or A badge handle');
  });
  it('does not treat cached A username as owned by signed-in B', async () => {
    lookup(); details(A); badge(A.display_name, true); mount(`/profile/${A.username}`, A); await loaded(A.display_name);
    check(!screen.queryByRole('button', { name: 'Edit' }) && !screen.queryByText('This browser', { exact: true }) && stat('Avg Score') === '300',
      'AUTH OWNERSHIP: signed-in B must view cached A as another account');
  });
  it('seeds the own username-route editor from its loaded identity', async () => {
    lookup(B); details(); badge(); mount(`/profile/${B.username}`); await loaded(B.display_name);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    check((screen.getByPlaceholderText('Display name') as HTMLInputElement).value === B.display_name
      && (screen.getByPlaceholderText('username') as HTMLInputElement).value === B.username, 'EDIT IDENTITY: own named editor starts with loaded B fields');
  });
  it('clears A editor fields when own B falls back to account metadata', async () => {
    lookup(); details(A); lookup(B, false, true, true); details(); badge(); mount(`/profile/${A.username}`, null); await loaded(A.display_name);
    await go('My Profile'); await loaded(B.display_name); fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    check((screen.getByPlaceholderText('Display name') as HTMLInputElement).value === B.display_name
      && (screen.getByPlaceholderText('username') as HTMLInputElement).value === '', 'EDIT FALLBACK: metadata B cannot inherit A editor fields');
  });
  it('does not turn a failed same-account preferences refresh into minute one', async () => {
    details(B, { minutes: 17 }); badge(); boundary.allowMinutes = true;
    const refresh = mount('/profile'); await loaded(B.display_name);
    check(stat('Time on profile') === '17m' && [...boundary.reads.values()].every(read => read.calls === 1), 'SETUP: B seventeen-minute profile fully loaded');
    boundary.reads.clear();
    const prefs = details(); prefs.reply = { data: null, error: { message: 'Synthetic preference read failed' } };
    badge(B.display_name, true);
    refresh({ ...B, updated_at: `${DAY}T16:01:00Z` }); await flush(); await loaded(B.display_name); await minute();
    same(boundary.writes, [], 'PREFS ERROR: failed B refresh must not write invented minute one');
    check(stat('Time on profile') === 'Unavailable' && !!screen.queryByText("Couldn't load your info. Refresh to try again.", { exact: true })
      && (screen.getByPlaceholderText('e.g. Real Madrid') as HTMLInputElement).disabled
      && (screen.getByPlaceholderText('e.g. Messi') as HTMLInputElement).disabled
      && screen.getByRole('combobox').getAttribute('disabled') !== null,
    'PREFS UNAVAILABLE: failed preferences are visibly unavailable and not editable');
    boundary.allowPreferenceCapture = true;
    fireEvent.blur(screen.getByPlaceholderText('e.g. Real Madrid')); await flush();
    same(boundary.preferenceWrites, [], 'PREFS SAVE: failed preferences reject even a programmatic blur');
    check([...boundary.reads.values()].every(read => read.optional || read.calls === 1), 'SETUP: failed refresh fixture queries completed');
    boundary.reads.clear(); details(B, { minutes: 17 }); badge();
    refresh({ ...B, updated_at: `${DAY}T16:02:00Z` }); await flush(); await loaded(B.display_name);
    const enabled = !(screen.getByPlaceholderText('e.g. Real Madrid') as HTMLInputElement).disabled
      && !(screen.getByPlaceholderText('e.g. Messi') as HTMLInputElement).disabled
      && screen.getByRole('combobox').getAttribute('disabled') === null && stat('Time on profile') === '17m'
      && !screen.queryByText("Couldn't load your info. Refresh to try again.", { exact: true });
    await minute();
    check(enabled && boundary.writes.length === 1 && boundary.writes[0].user_id === B.user_id && boundary.writes[0].time_spent_minutes === 18,
      'PREFS RETRY: successful B retry restores editable data and advances seventeen to eighteen');
  });
});
