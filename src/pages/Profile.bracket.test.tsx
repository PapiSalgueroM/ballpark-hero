import { strict as assert } from 'node:assert';
import { Component, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Profile from '@/pages/Profile';

type Fault = { name: string; message: string };
type CrashKind = '' | 'json' | 'null' | 'child';
const boundary = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>, reads: new Map<string, unknown>(), unexpected: [] as string[],
  caught: [] as Fault[], logs: [] as unknown[][], allowed: '' as CrashKind,
  deny(message: string): never { this.unexpected.push(message); throw new Error(message); },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => boundary.auth }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://profile-bracket-fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
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

const DAY = '2026-09-08', KEY = 'dukb-streaks-v1', ID = 'synthetic-bracket-524';
const VIEWED = { id: 'profile-a', user_id: 'account-a', username: 'bracket_fixture', display_name: 'Bracket Fixture', avatar_url: null,
  streak_state: null, created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z' };
// Same fields as WorldCupPredictor.handleSaveBracket, all identities synthetic.
const currentSave = { predictions: { 'A-0': { homeGoals: 1, awayGoals: 0 } }, playoffPicks: {}, selectedThirds: ['A'],
  knockoutPicks: { 'f-0': 'Fixture Decoy' }, awards: { goldenBoot: 'Fixture Scorer' }, champion: 'Fixture North' };
const shape = (error: unknown): Fault => ({ name: String((error as Error)?.name), message: String((error as Error)?.message) });
function known(error: unknown) {
  const { name, message } = shape(error);
  const nullRead = name === 'TypeError' && /^Cannot read properties of null \(reading '(knockoutWinners|awards|champion)'\)$/.test(message);
  // A missing null guard also crashes after the parse catch replaces bad JSON.
  if (boundary.allowed === 'json') return (name === 'SyntaxError' && message === 'Unexpected end of JSON input') || nullRead;
  if (boundary.allowed === 'null') return nullRead;
  if (boundary.allowed === 'child') return (name === 'Error' && message === 'Objects are not valid as a React child (found: object with keys {fixture}). If you meant to render a collection of children, use an array instead.')
    || (name === 'TypeError' && /^[\w.]+\.trim is not a function$/.test(message));
  return false;
}
class BracketErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error: Error) { boundary.caught.push(shape(error)); }
  render() { return this.state.crashed ? <p data-testid="bracket-render-crash">Fixture caught render failure</p> : this.props.children; }
}
const check = (ok: boolean, message: string) => assert.ok(ok, message);
const storage = () => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
let storageBefore: string;
function auditRenderErrors() {
  const knownCrash = boundary.caught.length > 0 && boundary.caught.every(known);
  for (const error of boundary.caught) if (!known(error)) boundary.unexpected.push(`Unexpected caught render error: ${JSON.stringify(error)}`);
  for (const args of boundary.logs) {
    const text = args.map(String).join(' ');
    // React reports a handled component error separately from the error object.
    // Accept that report only alongside this fixture's exact known error.
    if (!(knownCrash && text.startsWith('The above error occurred in the <') && text.includes('Profile (') && text.includes('BracketErrorBoundary'))) {
      boundary.unexpected.push(`Unexpected console error: ${text}`);
    }
  }
  boundary.logs.length = 0;
}
function add(steps: unknown[][], data: unknown = [], count?: number) {
  const key = JSON.stringify(steps);
  if (boundary.reads.has(key)) throw new Error(`Duplicate fixture query: ${key}`);
  boundary.reads.set(key, { data, error: null, count });
}
function seed(payload: unknown) {
  add([['from', 'profiles'], ['select', '*'], ['eq', 'username', VIEWED.username], ['maybeSingle']], VIEWED);
  const query = (table: string, columns: string, ...tail: unknown[][]) => [['from', table], ['select', columns], ['eq', 'user_id', VIEWED.user_id], ...tail];
  add(query('user_best_scores', '*', ['order', 'best_score', { ascending: false }]));
  add(query('user_game_scores', 'game_type, score, created_at', ['order', 'created_at', { ascending: false }], ['limit', 5]));
  add(query('user_scores', 'current_streak, longest_streak, total_points', ['maybeSingle']), null);
  add([['from', 'user_game_scores'], ['select', '*', { count: 'exact', head: true }], ['eq', 'user_id', VIEWED.user_id]], null, 0);
  add(query('user_game_scores', 'game_type'));
  add(query('saved_brackets', 'id, bracket_data', ['limit', 1]), [{ id: ID, bracket_data: payload }]);
  add(query('daily_completions', 'game_slug', ['eq', 'date', DAY]));
  add(query('user_preferences', '*', ['maybeSingle']), null);
}
async function summary(payload: unknown, want: string, message: string, crash: CrashKind = '') {
  boundary.allowed = crash; boundary.caught.length = 0; boundary.logs.length = 0; seed(payload);
  render(<HelmetProvider><MemoryRouter initialEntries={[`/profile/${VIEWED.username}`]}>
    <BracketErrorBoundary><Routes><Route path="/profile/:username" element={<Profile />} /></Routes></BracketErrorBoundary>
  </MemoryRouter></HelmetProvider>);
  await act(async () => { await Promise.resolve(); });
  auditRenderErrors();
  const heading = screen.queryByRole('heading', { level: 1 });
  const card = screen.queryByRole('heading', { name: 'World Cup 2026 Prediction' });
  const actual = { name: heading?.textContent ?? null, points: !!screen.queryByText('Total Points', { exact: true }),
    summary: card?.parentElement?.querySelector('p')?.textContent ?? null, caught: boundary.caught };
  if (actual.name !== 'Bracket Fixture' || !actual.points || actual.summary !== want || actual.caught.length) console.log(`${message}: ${JSON.stringify({ actual, want })}`);
  check(actual.name === 'Bracket Fixture' && actual.points && actual.summary === want && actual.caught.length === 0, message);
  check(screen.queryByRole('link', { name: 'View Bracket' })?.getAttribute('href') === '/world-cup-bracket?bracket=synthetic-bracket-524',
    'LINK: saved card keeps its exact bracket destination');
  check(boundary.reads.size === 0, 'BOUNDARY: fixture reads complete before the next payload');
  cleanup(); auditRenderErrors();
}

beforeEach(() => {
  boundary.reads.clear(); boundary.unexpected.length = 0; boundary.caught.length = 0; boundary.logs.length = 0; boundary.allowed = '';
  boundary.auth = { user: { id: 'account-b', user_metadata: {}, created_at: VIEWED.created_at },
    profile: { ...VIEWED, id: 'profile-b', user_id: 'account-b', username: 'visitor_fixture', display_name: 'Visitor Fixture' },
    loading: false, refreshProfile: () => boundary.deny('Unexpected auth refresh'), updateProfile: () => boundary.deny('Unexpected profile write') };
  localStorage.clear(); localStorage.setItem(KEY, JSON.stringify({ version: 1,
    global: { current: 0, longest: 0, lastDate: null }, perGame: {}, loginDates: [DAY], totalPlays: 0, totalPoints: 0 }));
  storageBefore = storage();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] }); vi.setSystemTime(new Date(`${DAY}T16:00:00Z`));
  vi.stubGlobal('fetch', () => boundary.deny('Unexpected fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => boundary.deny('Unexpected XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { boundary.deny('Unexpected WebSocket'); } });
  vi.spyOn(console, 'error').mockImplementation((...args) => { boundary.logs.push(args); });
  const errors = (event: ErrorEvent) => {
    if (known(event.error)) event.preventDefault();
    else boundary.unexpected.push(`Unexpected window error: ${JSON.stringify(shape(event.error))}`);
  };
  window.addEventListener('error', errors);
  errorCleanup = () => window.removeEventListener('error', errors);
});
let errorCleanup: () => void;
afterEach(() => {
  cleanup(); auditRenderErrors(); errorCleanup();
  const untouched = storage() === storageBefore, unexpected = [...boundary.unexpected], missing = [...boundary.reads.keys()];
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear();
  if (unexpected.length || missing.length) console.log(JSON.stringify({ unexpected, missing }));
  check(!unexpected.length && !missing.length, 'BOUNDARY: only exact fixture reads and recognized render failures occur');
  check(untouched, 'STORAGE: bracket summaries preserve browser totals');
});

describe('Profile summarizes saved brackets safely', () => {
  it('reads the current writer-shaped object champion', async () => {
    await summary(currentSave, 'Champion: Fixture North', 'CURRENT: writer-shaped object shows its top-level champion');
  });
  it('reads a serialized current writer-shaped champion', async () => {
    await summary(JSON.stringify(currentSave), 'Champion: Fixture North', 'SERIALIZED: string payload shows its top-level champion');
  });
  it('prefers the current champion over both legacy fields', async () => {
    await summary({ ...currentSave, awards: { champion: 'Fixture West' }, knockoutWinners: { final: 'Fixture South' } }, 'Champion: Fixture North',
      'CURRENT PRIORITY: top-level champion wins over legacy fields');
  });
  it('preserves legacy awards priority over the knockout final', async () => {
    await summary({ awards: { champion: 'Fixture West' }, knockoutWinners: { final: 'Fixture South' } }, 'Champion: Fixture West',
      'LEGACY PRIORITY: awards champion wins over knockout final');
  });
  it('retains a valid legacy knockout final fallback', async () => {
    await summary({ knockoutWinners: { final: 'Fixture South' } }, 'Champion: Fixture South', 'LEGACY FINAL: valid knockout final remains supported');
  });
  it('skips invalid higher-priority candidates for a valid legacy string', async () => {
    for (const champion of ['', '  ', 17, false, { fixture: 'bad' }, ['Fixture Decoy']]) {
      await summary({ champion, awards: { champion: 'Fixture West' } }, 'Champion: Fixture West', 'CANDIDATES: invalid earlier values cannot mask valid legacy champion', 'child');
    }
    for (const champion of [{ fixture: 'bad' }, ['Fixture Decoy'], 17, false, '  ']) {
      await summary({ champion: null, awards: { champion }, knockoutWinners: { final: 'Fixture South' } }, 'Champion: Fixture South',
        'CANDIDATES: invalid earlier values cannot mask valid legacy champion', 'child');
    }
  });
  it('keeps the saved card without inventing a champion from picks', async () => {
    await summary({ ...currentSave, champion: '', awards: {} }, 'Bracket saved', 'NO CHAMPION: saved card does not infer a winner from picks');
  });
  it('survives malformed serialized bracket JSON', async () => {
    await summary('{"champion":', 'Bracket saved', 'MALFORMED JSON: bad saved text cannot crash Profile', 'json');
  });
  it('survives a serialized null bracket payload', async () => {
    await summary('null', 'Bracket saved', 'PARSED NULL: serialized null cannot crash Profile', 'null');
  });
  it('rejects non-string legacy champions without crashing or rendering them', async () => {
    for (const value of [{ fixture: 'bad' }, ['Fixture Decoy'], 17, true, '  ']) {
      for (const payload of [{ awards: { champion: value } }, { knockoutWinners: { final: value } }]) {
        await summary(payload, 'Bracket saved', 'NONSTRING: unsafe legacy champion values remain a saved card', 'child');
      }
    }
  });
  it('treats primitive and array root payloads as a saved card', async () => {
    for (const payload of [null, 17, true, '17', 'true', '"Fixture Decoy"', [], [{ champion: 'Fixture Decoy' }], '[{"champion":"Fixture Decoy"}]']) {
      await summary(payload, 'Bracket saved', 'ROOT SHAPE: non-object payloads cannot supply a champion', payload === null ? 'null' : '');
    }
  });
  it('ignores malformed legacy containers', async () => {
    for (const value of [null, false, 17, 'Fixture Decoy', ['Fixture Decoy']]) {
      await summary({ awards: value, knockoutWinners: value }, 'Bracket saved', 'LEGACY SHAPE: only object containers supply named champion fields');
    }
  });
  it('trims the selected champion without altering the saved payload', async () => {
    const payload = { ...currentSave, champion: '  Fixture North \n' }, before = JSON.stringify(payload);
    await summary(payload, 'Champion: Fixture North', 'TRIM: chosen valid champion is trimmed');
    check(JSON.stringify(payload) === before, 'IMMUTABLE: summary reading cannot rewrite saved bracket data');
  });
});
