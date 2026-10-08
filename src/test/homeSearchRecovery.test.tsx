import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as Search from '@/lib/siteSearch';

const mock = vi.hoisted(() => ({ reload: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Search fixture', getLocalTodayCount: () => 0 }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc, from: mock.from } }));
vi.mock('@/lib/freshBuild', () => ({ reloadToRetryChunk: mock.reload }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const BASELINE = 'unchanged search engine retains complete catalog and exact ranked results';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const stored = (store: Storage) => Object.fromEntries(Object.keys(store).sort().map(key => [key, store.getItem(key)]));
const environment = () => ({ local: stored(localStorage), session: stored(sessionStorage),
  writes: clone(vi.mocked(Storage.prototype.setItem).mock.calls), removes: clone(vi.mocked(Storage.prototype.removeItem).mock.calls),
  clears: clone(vi.mocked(Storage.prototype.clear).mock.calls), draws: vi.mocked(Math.random).mock.calls.length, now: Date.now() });
function check(id: string, actual: unknown, expected: unknown, evidence: unknown = {}) {
  console.log('HOME_SEARCH_RECOVERY_RECORD|' + JSON.stringify({ id, actual, expected, evidence }));
  expect(actual, id).toEqual(expected);
}

let engine: typeof Search;
let loadCalls: number, importCalls: number;
let resolveImport: (value: typeof Search) => void, rejectImport: (error: Error) => void;
let promise: Promise<typeof Search>;
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
async function mount() {
  const Index = (await import('@/pages/Index')).default;
  const view = render(<MemoryRouter><Index /></MemoryRouter>);
  await flush(); return view;
}
const input = () => screen.getByRole('textbox', { name: 'Search games' }) as HTMLInputElement;
const type = (query: string) => fireEvent.change(input(), { target: { value: query } });
const cards = () => [...document.querySelectorAll('[data-home-game-card]')].map(node => ({
  path: node.querySelector('a')?.getAttribute('href'), label: node.querySelector('h3')?.textContent,
}));
const results = (query: string) => engine.searchSite(query).map(row => ({ path: row.game.path, label: row.game.label }));
const state = () => ({ query: input().value, busy: document.querySelector('#dukb-main div[aria-busy="true"]') !== null,
  failure: !!screen.queryByRole('alert'), heading: !!screen.queryByRole('heading', { name: 'Search could not load' }),
  noResults: document.body.textContent?.includes('No games found for') ?? false,
  main: !!screen.queryByRole('heading', { name: 'Main event' }), reloads: mock.reload.mock.calls.length });
async function succeed() { await act(async () => { resolveImport(engine); await promise; }); }
async function fail() { await act(async () => { rejectImport(new Error('Controlled unavailable search chunk')); await promise.catch(() => undefined); }); }
async function failedPage() { await mount(); input().focus(); type('soccer'); await fail(); }

beforeEach(async () => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('soccerCareerSave', '{"fixture":"opaque saved bytes"}');
  localStorage.setItem('dukb-game-picks-v1', '["/soccer-career"]'); sessionStorage.setItem('search-unrelated', 'held');
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(1791406800000);
  vi.spyOn(Math, 'random').mockReturnValue(.37); vi.spyOn(Storage.prototype, 'setItem');
  vi.spyOn(Storage.prototype, 'removeItem'); vi.spyOn(Storage.prototype, 'clear');
  mock.reload.mockReset().mockReturnValue(true); mock.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  mock.from.mockReset().mockImplementation(() => { throw new Error('Guest search must not read personal data'); });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Mounted Home search must stay offline'); }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  engine = await import('@/lib/siteSearch'); loadCalls = 0; importCalls = 0;
  promise = new Promise((resolve, reject) => { resolveImport = resolve; rejectImport = reject; });
  // The wrapper changes only the import boundary in a retained copy of Index.
  // Resolution returns this unchanged actual engine, never manufactured results.
  vi.stubGlobal('__HOME_SEARCH_LOAD__', () => { loadCalls++; });
  vi.stubGlobal('__HOME_SEARCH_IMPORT__', () => { importCalls++; return promise; });
});
afterEach(() => { cleanup(); expect(globalThis.fetch).not.toHaveBeenCalled(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

/* Release AM: every case here counts calls through two globals that exist only
   in the copy of the page scripts/simHomeSearchRecovery.mjs builds and puts in
   place of the real one. Under a plain vitest run the real page never calls
   them, and 8 of the 10 failed by construction, so any whole suite run was red
   by 8. The harness says it is there; without it these are reported as
   skipped, never as passed. Run them with node scripts/simHomeSearchRecovery.mjs. */
const viaHarness = process.env.HOME_SEARCH_RECOVERY_BOUNDARY === '1';
const harnessCase = it.skipIf(!viaHarness);

harnessCase(BASELINE, async () => {
  const { CATEGORIES } = await import('@/data/gameRegistry'); const held = environment();
  const queries = ['Soccer Career', 'Club Manager', 'NBA My Career', 'nba grid', '*('];
  const original = queries.map(query => ({ query, results: clone(engine.searchSite(query)) }));
  check(BASELINE, {
    catalog: engine.browseAll().map(row => ({ category: row.category, game: row.game })),
    repeated: queries.map(query => ({ query, results: engine.searchSite(query) })),
    exact: queries.slice(0, 3).map(query => engine.searchSite(query)[0]?.game.path),
    unreadable: engine.searchSite('*('), environment: environment(),
  }, {
    catalog: CATEGORIES.flatMap(category => category.games.map(game => ({ category: category.title, game }))),
    repeated: original, exact: ['/soccer-career', '/club-manager', '/nba-my-career'], unreadable: [], environment: held,
  }, { queries, original });
});

harnessCase('pending import keeps honest busy state without false empty results or writes', async () => {
  await mount(); const held = environment(); check('no eager search import', { loadCalls, importCalls }, { loadCalls: 0, importCalls: 0 });
  fireEvent.focus(input()); type('soccer'); type('nba'); fireEvent.pointerEnter(input());
  check('pending actual page', state(), { query: 'nba', busy: true, failure: false, heading: false, noResults: false, main: false, reloads: 0 });
  check('one pending import is reused', { imports: importCalls, called: loadCalls > 1 }, { imports: 1, called: true });
  check('pending holds all saved bytes and draws', environment(), held);
});

harnessCase('resolved import renders the latest query in unchanged engine rank order', async () => {
  await mount(); const held = environment(); type('soccer'); type('NBA My Career'); await succeed();
  const expected = results('NBA My Career');
  check('latest actual ranked tiles', cards(), expected, { query: input().value, fullEngineResults: engine.searchSite(input().value) });
  check('resolved actual page', state(), { query: 'NBA My Career', busy: false, failure: false, heading: false, noResults: false, main: false, reloads: 0 });
  const calls = loadCalls; fireEvent.focus(input()); fireEvent.pointerEnter(input());
  check('loaded engine is reused', { loadCalls, importCalls }, { loadCalls: calls, importCalls: 1 });
  check('successful search is read only', environment(), held);
});

harnessCase('rejected import clears busy and offers recovery without pretending no games exist', async () => {
  await mount(); const held = environment(); type('soccer'); await fail();
  check('failed actual page', state(), { query: 'soccer', busy: false, failure: true, heading: true, noResults: false, main: false, reloads: 0 });
  check('both recovery actions are real buttons', ['Back to games', 'Reload page'].map(name => !!screen.queryByRole('button', { name })), [true, true]);
  check('failure does not change saved state or consume randomness', environment(), held);
});

harnessCase('Back clears the query and restores browse and input focus without scrolling', async () => {
  await failedPage(); const held = environment(), field = input(), focus = vi.spyOn(field, 'focus');
  const button = screen.getByRole('button', { name: 'Back to games' }); button.focus(); fireEvent.click(button);
  check('Back restores actual browse', { ...state(), focused: document.activeElement === field,
    focusCalls: clone(focus.mock.calls), pinned: !!document.querySelector('a[href="/soccer-career"]') },
  { query: '', busy: false, failure: false, heading: false, noResults: false, main: true, reloads: 0,
    focused: true, focusCalls: [[{ preventScroll: true }]], pinned: true });
  check('Back preserves every byte', environment(), held);
});

harnessCase('failed search remains terminal through Back reentry focus and hover', async () => {
  await failedPage(); fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
  const held = environment(), calls = loadCalls, imports = importCalls;
  type('basketball'); fireEvent.focus(input()); fireEvent.pointerEnter(input()); await flush();
  check('terminal failure stays actionable', state(), { query: 'basketball', busy: false, failure: true, heading: true, noResults: false, main: false, reloads: 0 });
  check('terminal failure does not call the rejected loader again', { loadCalls, importCalls }, { loadCalls: calls, importCalls: imports });
  check('reentry preserves every byte', environment(), held);
});

harnessCase('only explicit Reload invokes the existing reload boundary once', async () => {
  await failedPage(); const held = environment();
  check('failure never automatically reloads', mock.reload.mock.calls, []);
  fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
  check('one actual reload action', mock.reload.mock.calls, [[]]);
  check('reload boundary does not rewrite saves', environment(), held);
});

harnessCase('clearing a pending query keeps browse after late resolution and reuses the engine', async () => {
  await mount(); type('soccer'); const held = environment(); fireEvent.click(screen.getByRole('button', { name: 'Clear search' })); await succeed();
  check('late resolution keeps query clear', state(), { query: '', busy: false, failure: false, heading: false, noResults: false, main: true, reloads: 0 });
  const calls = loadCalls; type('Club Manager');
  check('later actual ranked tiles', cards(), results('Club Manager'));
  check('resolved import reused after clear', { loadCalls, importCalls }, { loadCalls: calls, importCalls: 1 });
  check('clear and late resolve hold saves', environment(), held);
});

harnessCase('a real zero-result query shows existing fallback games only after resolution', async () => {
  await mount(); type('*('); const held = environment(); await succeed();
  check('genuine no-match state', state(), { query: '*(', busy: false, failure: false, heading: false, noResults: true, main: false, reloads: 0 });
  check('actual fallback paths', cards().map(row => row.path), ['/soccer-grid', '/footle', '/squad-deal']);
  check('no-match search is read only', environment(), held);
});

harnessCase('a failed focus prewarm keeps browsing until a query asks for recovery', async () => {
  await mount(); const held = environment(); fireEvent.focus(input()); await fail();
  check('prewarm failure keeps browse', state(), { query: '', busy: false, failure: false, heading: false, noResults: false, main: true, reloads: 0 });
  const calls = loadCalls; type('soccer');
  check('typed query shows retained failure', state(), { query: 'soccer', busy: false, failure: true, heading: true, noResults: false, main: false, reloads: 0 });
  check('prewarm failure is terminal', loadCalls, calls); check('prewarm preserves saved bytes', environment(), held);
});
