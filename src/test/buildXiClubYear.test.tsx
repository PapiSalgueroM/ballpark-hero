import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AIVerdict, Formation, PickMeta, PositionRole } from '@/types/lineupBuilder';

/* Real page, hook, picker, search ranking, pitch, fit and season engine.
 * Fictional rows replace transport only. No real roster or native-input claim. */
type Query = { table: string; operations: [string, unknown[]][]; signal?: AbortSignal };
type FixtureRow = Record<string, unknown>;
const io = vi.hoisted(() => ({
  queries: [] as Query[], fetches: [] as string[], fallbackCalls: 0,
  pool: 'browse' as 'browse' | 'complete', market: 'normal' as 'normal' | 'empty' | 'error',
  missingAge: false, missingValue: false, historyHeld: false,
  histories: [] as { aborted: boolean; settled: boolean; release: () => void }[],
  rest: null as null | ((query: Query) => Promise<unknown>),
  simulate: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://offline.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  supabase: { from(table: string) {
    const query: Query = { table, operations: [] };
    const builder: Record<string, unknown> = {
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        if (!io.rest) throw new Error('Fixture transport is not initialized');
        return io.rest(query).then(resolve, reject);
      },
    };
    for (const method of ['select', 'ilike', 'eq', 'in', 'order', 'limit', 'abortSignal']) {
      builder[method] = (...args: unknown[]) => {
        if (method === 'abortSignal') query.signal = args[0] as AbortSignal;
        else query.operations.push([method, args]);
        return builder;
      };
    }
    return builder;
  } },
}));
vi.mock('@/lib/localLineupEval', () => ({
  localEvaluateSoccerXI: async () => { io.fallbackCalls++; throw new Error('All-time fallback is forbidden in the recorded-year fixture'); },
}));
vi.mock('@/lib/worldXi', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/worldXi')>(),
  simulateWorldXiSeason: (...args: Parameters<typeof import('@/lib/worldXi')['simulateWorldXiSeason']>) => io.simulate(...args),
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ title, headerExtra, children }: { title: string; headerExtra?: ReactNode; children: ReactNode }) =>
    <main><h1>{title}</h1>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

import LineupBuilder from '@/pages/LineupBuilder';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';
import { displayName } from '@/lib/playerSearch';
import { clubTableNames, clubs, clubYearClubs, CLUB_YEAR_WITHHELD } from '@/data/lineupTeams';

type Choice = { mode: 'mixed' } | { mode: 'club-year'; year: number };
type DraftHook = Omit<ReturnType<typeof useLineupBuilder>, 'selectFormation'> & {
  selectFormation: (formation: Formation, choice?: Choice) => void;
  draftChoice?: Choice;
  completeRecordedYearDraft?: (verdict: AIVerdict) => void;
};
const RAW: Record<PositionRole, string> = {
  GK: 'Goalkeeper', CB: 'Centre-Back', LB: 'Left-Back', RB: 'Right-Back',
  LWB: 'Left-Back', RWB: 'Right-Back', CDM: 'Defensive Midfield', CM: 'Central Midfield',
  CAM: 'Attacking Midfield', LM: 'Left Midfield', RM: 'Right Midfield',
  LW: 'Left Winger', RW: 'Right Winger', ST: 'Centre-Forward', CF: 'Second Striker',
};
const VERDICT: AIVerdict = { rating: 'Fixture recorded-year result', headline: 'Fixture summary', analysis: 'Fictional selected-record simulation.' };
const api = (view: { result: { current: ReturnType<typeof useLineupBuilder> } }) =>
  view.result.current as unknown as DraftHook;

async function flush() { await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); }); }
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function meta(club: string, year: number, role: PositionRole = 'GK', name = 'Fixture Keeper'): PickMeta {
  return { rawName: name, rawPosition: RAW[role], position: role, club: clubTableNames(club)[0],
    nationality: 'Fixture Nation', year, age: 26, value: 2_000_000 };
}
function rows(club: string, year: number): FixtureRow[] {
  const common = { club, nationality: 'Fixture Nation', year, age: io.missingAge ? null : 26 };
  const one = (name: string, raw: string, value: number) => ({
    ...common, player_name: name, name_folded: name.toLowerCase(), position: raw,
    market_value_usd: io.missingValue ? null : value,
  });
  if (io.pool === 'complete') return FORMATIONS['4-4-2'].map((slot, index) =>
    one('Fixture ' + club + ' ' + year + ' Pick ' + String(index).padStart(2, '0'), RAW[slot.role], 2_000_000 + index * 100_000));
  return [
    ...Array.from({ length: 14 }, (_, index) => one('Fixture Forward ' + String(index).padStart(2, '0') + ' ' + year,
      'Centre-Forward', 20_000_000 - index * 100_000)),
    one('Fixture Keeper ' + year, 'Goalkeeper', 100_000),
  ];
}
function operation(query: Query, method: string, column: string) {
  return query.operations.find(([name, args]) => name === method && args[0] === column)?.[1][1];
}
function assertYearQueries(year: number) {
  expect(io.queries.length, 'XI_CLUB_YEAR_SEARCH: both real query legs must run').toBeGreaterThanOrEqual(2);
  for (const query of io.queries) {
    expect(query.table).toBe('player_market_values');
    expect(operation(query, 'eq', 'year'), 'XI_CLUB_YEAR_SEARCH: numeric year before dedupe').toBe(year);
    expect(Array.isArray(operation(query, 'in', 'club')), 'XI_CLUB_YEAR_SEARCH: exact assigned aliases').toBe(true);
    expect(operation(query, 'eq', 'nationality')).toBeUndefined();
  }
  expect(io.queries.some(query => operation(query, 'ilike', 'name_folded') !== undefined)).toBe(true);
  expect(io.queries.some(query => operation(query, 'ilike', 'name_folded') === undefined)).toBe(true);
}
function legacyQuiet() {
  expect(io.fetches.filter(url => url.includes('/functions/v1/'))).toEqual([]);
  expect(io.fallbackCalls).toBe(0);
}
async function startHook(year: number) {
  const view = renderHook(() => useLineupBuilder());
  act(() => api(view).selectFormation('4-4-2', { mode: 'club-year', year }));
  expect(api(view).draftChoice, 'XI_CLUB_YEAR_HOOK: selected round snapshot').toEqual({ mode: 'club-year', year });
  return view;
}
async function fillHook(view: Awaited<ReturnType<typeof startHook>>, year: number) {
  for (let index = 0; index < 11; index++) {
    const current = api(view), club = current.currentTeam!.name, role = current.positions[index].role;
    act(() => { api(view).finishSpin(); api(view).selectPosition(index); });
    const name = 'Fixture Hook Pick ' + index;
    await act(async () => { await api(view).submitPlayer(name, meta(club, year, role, name)); });
    expect(api(view).filledCount, 'XI_CLUB_YEAR_ADMIT: each actual selected row counts once').toBe(index + 1);
  }
}
async function openPage(year: number) {
  render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Club year draft' }));
  const select = screen.getByRole('combobox', { name: 'Recorded year' });
  fireEvent.change(select, { target: { value: String(year) } });
  fireEvent.click(screen.getByRole('button', { name: /^4-4-2\s*11 players$/ }));
  await flush();
}
function field() { return screen.getByRole('combobox') as HTMLInputElement; }
async function chooseSlot(role: PositionRole) {
  await advance(3100);
  const slot = screen.getAllByRole('button', { name: new RegExp('^' + role + '$') })
    .find(button => !button.hasAttribute('disabled'));
  expect(slot, 'Actual empty pitch role is required').toBeDefined();
  fireEvent.click(slot!); await flush();
}
async function browse() {
  fireEvent.click(screen.getByRole('button', { name: 'Browse players' }));
  await advance(220); await flush();
  return field();
}
function option(name: string) {
  const found = screen.getAllByRole('option').find(node => within(node).queryByText(displayName(name), { exact: true }));
  expect(found, 'Actual shared picker must offer the exact fixture record').toBeDefined();
  return found!;
}
async function fillPage() {
  for (let index = 0; index < 11; index++) {
    await chooseSlot(FORMATIONS['4-4-2'][index].role); await browse();
    const query = io.queries.at(-1)!;
    const club = (operation(query, 'in', 'club') as string[])[0], year = operation(query, 'eq', 'year') as number;
    fireEvent.click(option('Fixture ' + club + ' ' + year + ' Pick ' + String(index).padStart(2, '0')));
    await flush();
  }
  expect(screen.getByRole('button', { name: 'Submit Team' })).toBeVisible();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(Date.UTC(2026, 9, 26, 12));
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lineup-rules-seen', '1');
  localStorage.setItem('cookie-consent', 'essential');
  io.queries.length = 0; io.fetches.length = 0; io.histories.length = 0; io.fallbackCalls = 0;
  io.pool = 'browse'; io.market = 'normal'; io.missingAge = false; io.missingValue = false; io.historyHeld = false;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  const real = await vi.importActual<typeof import('@/lib/worldXi')>('@/lib/worldXi');
  io.simulate.mockReset().mockImplementation(real.simulateWorldXiSeason);
  io.rest = async query => {
    io.queries.push({ ...query, operations: query.operations.map(([method, args]) => [method, [...args]] as [string, unknown[]]) });
    if (query.table !== 'player_market_values') throw new Error('Unexpected table: ' + query.table);
    if (io.market === 'error') return { data: null, error: { message: 'Fixture read unavailable' } };
    if (io.market === 'empty') return { data: [], error: null };
    const aliases = operation(query, 'in', 'club');
    const club = Array.isArray(aliases) ? String(aliases[0]) : 'Fixture Unscoped';
    const requested = operation(query, 'eq', 'year');
    const years = typeof requested === 'number' ? [requested] : [2010, 2026];
    let result = years.flatMap(year => rows(club, year));
    const needle = operation(query, 'ilike', 'name_folded');
    if (typeof needle === 'string') result = result.filter(row =>
      String(row.name_folded).includes(needle.replace(/^%|%$/g, '').toLowerCase()));
    return { data: query.signal?.aborted ? [] : result, error: null };
  };
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); io.fetches.push(url);
    if (!url.includes('/rest/v1/player_verified_positions?')) return Promise.reject(new Error('Unexpected provider: ' + url));
    if (!io.historyHeld) return Promise.resolve(new Response('[]', { status: 200 }));
    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      const row = { aborted: false, settled: false, release() { if (!settled) { settled = true; row.settled = true; resolve(new Response('[]', { status: 200 })); } } };
      io.histories.push(row);
      const abort = () => { row.aborted = true; if (!settled) { settled = true; row.settled = true; reject(new DOMException('Fixture history aborted', 'AbortError')); } };
      if (init?.signal?.aborted) abort(); else init?.signal?.addEventListener('abort', abort, { once: true });
    });
  }));
});
afterEach(() => {
  cleanup(); io.rest = null; vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

/* Release BT: a seeded generator for the draw tests. With Math.random pinned
 * at 0.5 the shuffle comparator calls every pair equal, so the draw returns
 * the list in order (eleven clubs first) and a reroll always takes the middle
 * of what is left: a nations draw or a same club reroll could not be seen. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = 25;
const REROLLS = 12;

describe('Build Your XI draws under a seeded generator', () => {
  it('a Club year draft deals clubs only, never a withheld club, and every reroll moves to another club', async () => {
    expect(CLUB_YEAR_WITHHELD.has('Arsenal'),
      'XI_CLUB_YEAR_ARSENAL: the stored "Arsenal FC" also holds Arsenal de Sarandi, so a Club year never deals Arsenal').toBe(true);
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      vi.mocked(Math.random).mockImplementation(mulberry32(seed));
      const view = await startHook(2010);
      for (let roll = 0; ; roll++) {
        const teams = api(view).teamAssignments;
        expect(teams, 'XI_CLUB_YEAR_CLUBS_ONLY: eleven teams, seed ' + seed).toHaveLength(11);
        expect(teams.filter(team => team.isNation || !clubs.includes(team.name)).map(team => team.name),
          'XI_CLUB_YEAR_CLUBS_ONLY: no nation, seed ' + seed + ' roll ' + roll).toEqual([]);
        expect(teams.filter(team => CLUB_YEAR_WITHHELD.has(team.name)).map(team => team.name),
          'XI_CLUB_YEAR_WITHHELD: seed ' + seed + ' roll ' + roll).toEqual([]);
        expect(new Set(teams.map(team => team.name)).size, 'XI_CLUB_YEAR_UNIQUE: seed ' + seed).toBe(11);
        teams.forEach(team => seen.add(team.name));
        if (roll === REROLLS) break;
        const before = api(view).currentTeam!.name;
        act(() => api(view).rerollTeam());
        expect(api(view).currentTeam?.name, 'XI_CLUB_YEAR_REROLL_MOVES: seed ' + seed + ' roll ' + roll).not.toBe(before);
      }
      view.unmount();
    }
    expect([...seen].sort(), 'XI_CLUB_YEAR_REACH: the seeded draws reach every club the Club year deals')
      .toEqual([...clubYearClubs].sort());
    legacyQuiet();
  });

  it('Mixed, the default, still deals clubs and nations', async () => {
    let nations = 0, clubsDealt = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      vi.mocked(Math.random).mockImplementation(mulberry32(seed));
      const view = renderHook(() => useLineupBuilder());
      act(() => api(view).selectFormation('4-4-2'));
      expect(api(view).draftChoice, 'XI_MIXED_DEFAULT: no choice means Mixed').toEqual({ mode: 'mixed' });
      const teams = api(view).teamAssignments;
      expect(teams).toHaveLength(11);
      nations += teams.filter(team => team.isNation).length;
      clubsDealt += teams.filter(team => !team.isNation).length;
      view.unmount();
    }
    expect(nations, 'XI_MIXED_NATIONS: Mixed deals nations').toBeGreaterThan(0);
    expect(clubsDealt, 'XI_MIXED_CLUBS: Mixed deals clubs').toBeGreaterThan(0);
    legacyQuiet();
  });
});

describe('Build Your XI recorded year admissions', () => {
  it('keeps club-only assignments and rerolls on the chosen recorded year', async () => {
    const view = await startHook(2010);
    const initial = api(view).teamAssignments;
    expect(initial).toHaveLength(11);
    expect(new Set(initial.map(team => team.name)).size).toBe(11);
    expect(initial.every(team => !team.isNation && clubs.includes(team.name))).toBe(true);
    const before = initial[0].name;
    act(() => api(view).rerollTeam());
    expect(api(view).draftChoice).toEqual({ mode: 'club-year', year: 2010 });
    expect(api(view).teamAssignments.every(team => !team.isNation && clubs.includes(team.name))).toBe(true);
    expect(new Set(api(view).teamAssignments.map(team => team.name)).size).toBe(11);
    expect(api(view).currentTeam?.name).not.toBe(before);
    legacyQuiet();
  });

  it('refuses nonmatching year club and position evidence before any provider or history request', async () => {
    const view = await startHook(2010);
    const club = api(view).currentTeam!.name, good = meta(club, 2010);
    const bad: [string, PickMeta][] = [
      ['missing year', { ...good, year: undefined }], ['other year', { ...good, year: 2026 }],
      ['string year', { ...good, year: '2010' as unknown as number }],
      ['nonfinite year', { ...good, year: Number.NaN }], ['missing club', { ...good, club: undefined }],
      ['other club', { ...good, club: 'Fixture Unrelated Club' }],
      ['missing raw identity', { ...good, rawName: undefined }],
      ['unknown raw position', { ...good, rawPosition: 'Fixture Unknown', position: 'GK' }],
    ];
    for (const [label, pick] of bad) {
      act(() => api(view).selectPosition(0));
      await act(async () => { await api(view).submitPlayer('Fixture Bad ' + label, pick); });
      expect(api(view).filledCount, 'XI_CLUB_YEAR_REFUSE: ' + label).toBe(0);
      expect(api(view).validationError, 'XI_CLUB_YEAR_REFUSE: visible reason for ' + label).toBeTruthy();
      expect(io.fetches, 'XI_CLUB_YEAR_REFUSE: no history or all-time provider for ' + label).toEqual([]);
    }
    legacyQuiet();
  });

  it('retains exact chosen metadata while preserving position and duplicate guards', async () => {
    const view = await startHook(2010), club = api(view).currentTeam!.name;
    const chosen = meta(club, 2010), before = JSON.stringify(chosen);
    act(() => api(view).selectPosition(0));
    await act(async () => { await api(view).submitPlayer('Fixture Keeper', chosen); });
    expect(api(view).filledSlots.get(0)?.pick).toEqual(chosen);
    expect(JSON.stringify(chosen)).toBe(before);
    expect(api(view).filledCount).toBe(1);
    act(() => { api(view).finishSpin(); api(view).selectPosition(1); });
    await act(async () => { await api(view).submitPlayer('Fixture Keeper', meta(api(view).currentTeam!.name, 2010, 'LB')); });
    expect(api(view).filledCount, 'XI_CLUB_YEAR_DUPLICATE: a duplicate cannot fill another role').toBe(1);
    act(() => api(view).selectPosition(1));
    await act(async () => { await api(view).submitPlayer('Fixture Other Keeper', meta(api(view).currentTeam!.name, 2010, 'GK', 'Fixture Other Keeper')); });
    expect(api(view).filledCount, 'XI_CLUB_YEAR_POSITION: a keeper cannot fill left back').toBe(1);
    legacyQuiet();
  });

  it('completes an exact eleven-record draft without either all-time evaluator', async () => {
    const view = await startHook(2026);
    expect(typeof api(view).completeRecordedYearDraft, 'XI_CLUB_YEAR_RESULT: dedicated completion entry').toBe('function');
    act(() => api(view).completeRecordedYearDraft!(VERDICT));
    expect(api(view).phase).toBe('building');
    await fillHook(view, 2026);
    expect(api(view).phase).toBe('reviewing');
    expect(api(view).filledSlotsArray.every(slot => !slot.isNation && slot.pick?.year === 2026)).toBe(true);
    await act(async () => { await api(view).evaluateTeam(); });
    expect(api(view).phase, 'XI_CLUB_YEAR_RESULT: old evaluator must not complete this mode').toBe('reviewing');
    legacyQuiet();
    act(() => api(view).completeRecordedYearDraft!(VERDICT));
    expect(api(view).phase).toBe('result'); expect(api(view).verdict).toEqual(VERDICT);
    legacyQuiet();
    act(() => api(view).resetGame());
    act(() => api(view).completeRecordedYearDraft!(VERDICT));
    expect(api(view).phase).toBe('formation'); expect(api(view).verdict).toBeNull();
  });

  it('ignores a late history response after reset into another recorded year', async () => {
    io.historyHeld = true;
    const view = await startHook(2010), club = api(view).currentTeam!.name;
    act(() => api(view).selectPosition(1));
    let pending: Promise<void> | undefined;
    act(() => { pending = api(view).submitPlayer('Fixture History Back', meta(club, 2010, 'RB', 'Fixture History Back')); });
    await flush(); expect(io.histories).toHaveLength(1); expect(api(view).isValidating).toBe(true);
    expect(io.histories[0].settled).toBe(false);
    act(() => { api(view).resetGame(); api(view).selectFormation('4-4-2', { mode: 'club-year', year: 2026 }); });
    expect(io.histories[0].aborted).toBe(false);
    expect(io.histories[0].settled, 'Existing history keeps its own four-second timeout').toBe(false);
    expect(api(view).filledCount).toBe(0);
    expect(api(view).draftChoice).toEqual({ mode: 'club-year', year: 2026 });
    await act(async () => { io.histories[0].release(); await pending; });
    expect(io.histories[0].settled).toBe(true);
    expect(io.histories[0].aborted).toBe(false);
    expect(api(view).draftChoice, 'XI_CLUB_YEAR_OWNER: late history cannot change the new round').toEqual({ mode: 'club-year', year: 2026 });
    expect(api(view).phase).toBe('building'); expect(api(view).filledCount).toBe(0);
    expect(api(view).validationError).toBeNull(); expect(api(view).isValidating).toBe(false); legacyQuiet();
  });
});

describe('Build Your XI Club year Browse on the real page', () => {
  it('browses past eight records and reopens after Escape and outside focus', async () => {
    await openPage(2010); await chooseSlot('GK');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    let input = await browse();
    expect(input).toHaveValue(''); expect(input).toHaveFocus(); assertYearQueries(2010);
    expect(screen.queryAllByRole('option'), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    expect(option('Fixture Keeper 2010')).toBeVisible(); assertYearQueries(2010);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    input = await browse(); expect(input).toHaveFocus(); expect(screen.queryAllByRole('option'), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    fireEvent.blur(input, { relatedTarget: document.body });
    expect(screen.queryByRole('listbox')).toBeNull();
    input = await browse(); expect(input).toHaveFocus(); expect(screen.queryAllByRole('option'), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    expect(screen.getByText('0/11', { exact: true })).toBeVisible(); legacyQuiet();
  });

  it('keeps typed search at eight and admits the keyboard-selected matching keeper once', async () => {
    await openPage(2010); await chooseSlot('GK'); await browse();
    fireEvent.change(field(), { target: { value: 'Fixture' } }); await advance(220); await flush();
    expect(screen.getAllByRole('option'), 'XI_CLUB_YEAR_TYPED: original typed cap stays eight').toHaveLength(8);
    expect(screen.queryByText('Fixture Keeper 2010', { exact: true })).toBeNull();
    const input = await browse(); expect(screen.queryAllByRole('option'), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    fireEvent.keyDown(input, { key: 'ArrowUp' }); fireEvent.keyDown(input, { key: 'Enter' }); await flush();
    expect(screen.getByText('1/11', { exact: true })).toBeVisible();
    expect(screen.getAllByText('Fixture Keeper 2010', { exact: true })).toHaveLength(1);
    expect(io.fetches).toEqual([]); assertYearQueries(2010); legacyQuiet();
  });

  it('distinguishes an empty matching record list from a failed read', async () => {
    await openPage(2010); await chooseSlot('GK'); io.market = 'empty'; await browse();
    expect(screen.getByText('No matching records. Try another name or reroll the club.', { exact: true })).toBeVisible();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    io.market = 'error'; await browse();
    expect(screen.getByText('Could not load players', { exact: false })).toBeVisible();
    expect(screen.queryByText('No matching records. Try another name or reroll the club.', { exact: true })).toBeNull();
    expect(screen.getByText('0/11', { exact: true })).toBeVisible(); legacyQuiet();
  });

  it('uses the selected-row report once through review result and replay without a pundit call', async () => {
    io.pool = 'complete'; await openPage(2026); await fillPage();
    expect(io.simulate, 'XI_CLUB_YEAR_SIM: one selected-row review calculation').toHaveBeenCalledTimes(1);
    const selected = io.simulate.mock.calls[0][0] as { name: string; value: number; age: number }[];
    expect(selected).toHaveLength(11); expect(new Set(selected.map(player => player.name)).size).toBe(11);
    expect(selected.every(player => Number.isFinite(player.value) && player.age === 26)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Submit Team' })); await flush();
    expect(screen.getByRole('button', { name: /Play Again/i })).toBeVisible();
    expect(screen.getByText('Season Report', { exact: true })).toBeVisible();
    expect(io.simulate, 'XI_CLUB_YEAR_SIM: moving to result cannot resimulate').toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/2026 value/)).toHaveLength(11); assertYearQueries(2026); legacyQuiet();
    fireEvent.click(screen.getByRole('button', { name: /Play Again/i })); await flush();
    expect(screen.getByRole('combobox', { name: 'Recorded year' })).toHaveValue('2026');
    expect(screen.getByRole('heading', { name: 'Choose Your Formation' })).toBeVisible();
    expect(screen.queryByText('Season Report', { exact: true })).toBeNull();
  }, 15000);

  it('shows an unrated completed draft when the selected rows lack numeric inputs', async () => {
    for (const missing of ['age', 'value', 'both'] as const) {
      io.pool = 'complete'; io.missingAge = missing !== 'value'; io.missingValue = missing !== 'age';
      const witness = rows('Fixture Witness', 2026);
      expect(witness).toHaveLength(11);
      expect(witness.every(row => row.age === (io.missingAge ? null : 26)), 'Fixture age arm is explicit').toBe(true);
      expect(witness.every(row => io.missingValue ? row.market_value_usd === null
        : typeof row.market_value_usd === 'number' && row.market_value_usd > 0), 'Fixture value arm is explicit').toBe(true);
      await openPage(2026); await fillPage();
      expect(io.simulate, 'XI_CLUB_YEAR_UNRATED: missing ' + missing + ' cannot earn invented ratings').not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Submit Team' })); await flush();
      expect(screen.getByRole('button', { name: /Play Again/i })).toBeVisible();
      expect(screen.queryByRole('heading', { name: /unrated/i }), 'XI_CLUB_YEAR_UNRATED: missing ' + missing + ' stays unrated').not.toBeNull();
      expect(screen.queryByText('Season Report', { exact: true })).toBeNull();
      expect(io.simulate).not.toHaveBeenCalled(); legacyQuiet();
      cleanup();
    }
  }, 30000);
});

