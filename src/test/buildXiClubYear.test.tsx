import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AIVerdict, DraftChoice, Formation, PickMeta, PositionRole } from '@/types/lineupBuilder';

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
    for (const method of ['select', 'ilike', 'eq', 'in', 'or', 'order', 'limit', 'range', 'abortSignal']) {
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
import { clubTableNames, clubs, clubEraClubs, clubYearClubs, CLUB_YEAR_WITHHELD, nations } from '@/data/lineupTeams';

type DraftHook = Omit<ReturnType<typeof useLineupBuilder>, 'selectFormation'> & {
  selectFormation: (formation: Formation, choice?: DraftChoice) => void;
  draftChoice?: DraftChoice;
  completeRecordedYearDraft?: (verdict: AIVerdict) => void;
};
const RAW: Record<PositionRole, string> = {
  GK: 'Goalkeeper', CB: 'Centre-Back', LB: 'Left-Back', RB: 'Right-Back',
  LWB: 'Left-Back', RWB: 'Right-Back', CDM: 'Defensive Midfield', CM: 'Central Midfield',
  CAM: 'Attacking Midfield', LM: 'Left Midfield', RM: 'Right Midfield',
  LW: 'Left Winger', RW: 'Right Winger', ST: 'Centre-Forward', CF: 'Second Striker',
};
const VERDICT: AIVerdict = { rating: 'Fixture recorded-year result', headline: 'Fixture summary', analysis: 'Fictional selected-record simulation.' };
const draftKey = 'dukb-build-your-xi-draft-v1';
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
  expect(io.queries.length, 'XI_CLUB_YEAR_SEARCH: a filtered query must run').toBeGreaterThanOrEqual(1);
  for (const query of io.queries) {
    expect(query.table).toBe('player_market_values');
    expect(operation(query, 'eq', 'year'), 'XI_CLUB_YEAR_SEARCH: numeric year before dedupe').toBe(year);
    expect(Array.isArray(operation(query, 'in', 'club')), 'XI_CLUB_YEAR_SEARCH: exact assigned aliases').toBe(true);
    expect(operation(query, 'eq', 'nationality')).toBeUndefined();
  }
  const browsing = io.queries.filter(query => query.operations.some(([name]) => name === 'range'));
  const typed = io.queries.filter(query => !browsing.includes(query));
  for (const page of browsing) expect(operation(page, 'order', 'id')).toEqual({ ascending: true });
  if (typed.length) {
    expect(typed.some(query => operation(query, 'ilike', 'name_folded') !== undefined)).toBe(true);
    expect(typed.some(query => operation(query, 'ilike', 'name_folded') === undefined)).toBe(true);
  }
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
function playerOptions() {
  const list = screen.queryByRole('listbox');
  return list ? within(list).queryAllByRole('option') : [];
}
function field() { return screen.getByRole('combobox', { name: /search/i }) as HTMLInputElement; }
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
  const found = playerOptions().find(node => within(node).queryByText(displayName(name), { exact: true }));
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
    const era = operation(query, 'in', 'year');
    const years = typeof requested === 'number' ? [requested] : Array.isArray(era) ? era.map(Number) : [2010, 2026];
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

describe('Build Your XI historical club picks', () => {
  it('issues one mixed evaluation and ignores stale submissions after the result is saved', async () => {
    const source = await startHook(2010);
    await fillHook(source, 2010);
    source.unmount();
    const picks = JSON.parse(localStorage.getItem(draftKey)!);
    picks.draftChoice = { mode: 'mixed' };
    localStorage.setItem(draftKey, JSON.stringify(picks));
    const view = renderHook(() => useLineupBuilder());
    act(() => view.result.current.chooseSeasonApproach('attack'));
    let reply!: (r: Response) => void;
    const transport = vi.fn(() => new Promise<Response>(resolve => { reply = resolve; }));
    vi.stubGlobal('fetch', transport);
    const submit = view.result.current.evaluateTeam;
    let first!: Promise<void>, double!: Promise<void>;
    act(() => { first = submit(); double = submit(); });
    expect(transport).toHaveBeenCalledTimes(1);
    act(() => view.result.current.chooseSeasonApproach('protect'));
    expect(view.result.current.seasonApproach).toBe('attack');
    await act(async () => { reply(new Response(JSON.stringify(VERDICT), { status: 200 })); await Promise.all([first, double]); });
    const finished = localStorage.getItem(draftKey)!;
    expect(view.result.current.phase).toBe('result');
    expect(view.result.current.verdict).toEqual(VERDICT);
    await act(async () => { await submit(); });
    expect(localStorage.getItem(draftKey)).toBe(finished);
    view.unmount();
    const restored = renderHook(() => useLineupBuilder());
    expect(restored.result.current.seasonApproach).toBe('attack');
    await act(async () => { await restored.result.current.evaluateTeam(); });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(io.fallbackCalls).toBe(0);
  });
  it('saves the league approach before submission, then restores the exact submitted season', async () => {
    const draft = await startHook(2010);
    await fillHook(draft, 2010);
    draft.unmount();
    const legacy = JSON.parse(localStorage.getItem(draftKey)!);
    expect(legacy.seasonApproach).toBeUndefined();
    const page = () => render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    const pick = () => screen.getByRole('combobox', { name: 'League approach' });
    const first = page();
    expect(pick()).toHaveValue('balanced');
    fireEvent.change(pick(), { target: { value: 'protect' } });
    expect(JSON.parse(localStorage.getItem(draftKey)!)).toEqual({ ...legacy, seasonApproach: 'protect' });
    const protectedReport = io.simulate.mock.results.at(-1)!.value;
    first.unmount();
    const again = page();
    expect(pick()).toHaveValue('protect');
    expect(io.simulate.mock.results.at(-1)!.value).toEqual(protectedReport);
    fireEvent.change(pick(), { target: { value: 'attack' } });
    expect(io.simulate.mock.lastCall?.[3]).toBe('attack');
    const attack = io.simulate.mock.results.at(-1)!.value;
    expect(attack.squadRating).toBe(protectedReport.squadRating);
    expect(attack.record.draws).toBeLessThan(protectedReport.record.draws);
    fireEvent.click(screen.getByRole('button', { name: 'Submit Team' }));
    const finished = localStorage.getItem(draftKey)!;
    expect(JSON.parse(finished)).toMatchObject({ version: 2, draft: { ...legacy, seasonApproach: 'attack' }, result: { season: attack } });
    again.unmount();
    io.simulate.mockClear();
    page();
    expect(screen.getByText('League approach: Go for the win', { exact: true })).toBeVisible();
    expect(screen.getByText(`Home points: ${attack.venuePoints!.home} · Away points: ${attack.venuePoints!.away}`)).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'League approach' })).toBeNull();
    const restored = renderHook(() => useLineupBuilder());
    expect(restored.result.current.savedSeason).toEqual(JSON.parse(finished).result.season);
    expect(io.simulate).not.toHaveBeenCalled();
    expect(localStorage.getItem(draftKey)).toBe(finished);
    legacyQuiet();
  });
  function openSavedDraft(draftChoice: DraftChoice, finalClubs: string[], openPositions = [5, 6]) {
    const formation = '4-2-3-1';
    const teams = clubYearClubs.filter(club => !finalClubs.includes(club)).slice(0, 11 - openPositions.length).concat(finalClubs);
    const teamAssignments = teams.map(name => ({ name, isNation: false }));
    const positions = FORMATIONS[formation].map((slot, index) => ({ slot, index })).filter(({ index }) => !openPositions.includes(index));
    const slots = positions.map(({ slot, index }, pickIndex) => {
      const team = teams[pickIndex];
      const name = `Fixture historical draft ${index}`;
      const year = draftChoice.mode === 'mixed' ? 2026 : draftChoice.year;
      return [index, { ...slot, playerName: name, assignedTeam: team, isNation: false, pick: meta(team, year, slot.role, name) }];
    });
    const priorFetch = fetch;
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('evaluate-lineup')) {
        return Promise.resolve(new Response(JSON.stringify(VERDICT), { status: 200 }));
      }
      return priorFetch(input, init);
    }));
    localStorage.setItem(draftKey, JSON.stringify({ formation, draftChoice, teamAssignments, slots }));
    return render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
  }

  async function searchClubPick(query: string, role: PositionRole = 'CDM') {
    await chooseSlot(role);
    fireEvent.change(field(), { target: { value: query } });
    await advance(230); await flush();
  }

  it.each([
    ['Benfica', 'Richard Ríos', 'SL Benfica', 27_000_000],
    ['Manchester United', 'Casemiro', 'Manchester United', 8_640_000],
  ] as const)('offers the same sourced %s midfielder when browsing a completed Mixed XI replacement', async (club, name, recordedClub, value) => {
    const formation = '4-2-3-1';
    const position = 5;
    const assigned = clubs.filter(team => team !== club).slice(0, 10);
    assigned.splice(position, 0, club);
    const teamAssignments = assigned.map(name => ({ name, isNation: false }));
    const slots = FORMATIONS[formation].map((slot, i) => {
      const playerName = `Fixture starter ${i}`;
      return [i, { ...slot, playerName, assignedTeam: assigned[i], isNation: false, pick: meta(assigned[i], 2026, slot.role, playerName) }];
    });
    io.market = 'empty';
    localStorage.setItem(draftKey, JSON.stringify({ formation, draftChoice: { mode: 'mixed' }, teamAssignments, slots }));
    const open = () => render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    const first = open();
    fireEvent.click(screen.getByRole('button', { name: `Replace Fixture starter ${position} at ${FORMATIONS[formation][position].label}` }));
    await flush(); await browse();
    expect(playerOptions()).toHaveLength(1);
    fireEvent.click(option(name)); await flush();
    const saved = localStorage.getItem(draftKey)!;
    const finalSlots = JSON.parse(saved).slots;
    expect(finalSlots).toHaveLength(11);
    expect(finalSlots.find(([i]: [number]) => i === position)[1]).toMatchObject({ playerName: name, assignedTeam: club, pick: { rawName: name, club: recordedClub, value } });
    first.unmount(); open();
    expect(screen.getByRole('button', { name: `Replace ${name} at ${FORMATIONS[formation][position].label}` })).toBeVisible();
    expect(localStorage.getItem(draftKey)).toBe(saved);
    expect(io.fetches.some(url => url.includes('/functions/v1/'))).toBe(false);
  });

  it('carries both sourced club picks through submission and the season rating', async () => {
    openSavedDraft({ mode: 'mixed' }, ['Benfica', 'Manchester United']);
    await searchClubPick('richard rios');
    fireEvent.click(option('Richard Ríos')); await flush();
    await searchClubPick('casemiro');
    fireEvent.click(option('Casemiro')); await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Team' })); await flush();
    expect(io.simulate).toHaveBeenCalledTimes(1);
    expect(io.simulate.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Richard Ríos', club: 'SL Benfica', age: 25, value: 27_000_000 }),
      expect.objectContaining({ name: 'Casemiro', club: 'Manchester United', age: 34, value: 8_640_000 }),
    ]));
    expect(io.fetches.some(url => url.includes('validate-player'))).toBe(false);
  });

  it.each([
    ['the wrong Mixed club', { mode: 'mixed' }, ['Chelsea', 'Manchester United']],
    ['a recorded year at Benfica', { mode: 'club-year', year: 2026 }, ['Benfica', 'Manchester United']],
  ] as const)('does not add an all-time result for %s', async (_, draftChoice, teams) => {
    openSavedDraft(draftChoice, [...teams]);
    await searchClubPick('richard rios');
    expect(screen.queryByRole('option', { name: /Richard Ríos/ })).toBeNull();
    expect(io.queries.length).toBeGreaterThan(0);
  });

  const splitPicks = [
    ['Chelsea', 'Andrey Santos', 163068, 'andrey santos', 'RC Strasbourg Alsace / Chelsea FC', 'Brazil', 'Central Midfield', 2025, 20, 43_000_000],
    ['Juventus', 'João Cancelo', 49328, 'joao cancelo', 'Juventus FC / Manchester City', 'Portugal', 'Right-Back', 2019, 24, 59_000_000],
    ['Benfica', 'Sébastien Corchia', 49525, 'sebastien corchia', 'SL Benfica / RCD Espanyol Barcelona', 'France', 'Right-Back', 2019, 28, 3_000_000],
    ['Celtic', 'Jeremy Toljan', 49458, 'jeremy toljan', 'Celtic FC / US Sassuolo', 'Germany', 'Right-Back', 2019, 24, 5_000_000],
    ['Galatasaray', 'Şener Özbayraklı', 49713, 'sener ozbayrakli', 'Fenerbahce / Galatasaray', 'Türkiye', 'Right-Back', 2019, 28, 2_000_000],
    ['Inter Milan', 'Cédric Soares', 49384, 'cedric soares', 'Southampton FC / Inter Milan', 'Portugal', 'Right-Back', 2019, 27, 13_000_000],
    ['Inter Milan', 'Sime Vrsaljko', 50341, 'sime vrsaljko', 'Atlético de Madrid / Inter Milan', 'Croatia', 'Right-Back', 2018, 25, 27_000_000],
    ['Sporting CP', 'Bruno Gaspar', 49454, 'bruno gaspar', 'Sporting CP / Olympiacos Piraeus', 'Angola', 'Right-Back', 2019, 25, 5_000_000],
    ['Sporting CP', 'Thierry Correia', 49423, 'thierry correia', 'Sporting CP / Valencia CF', 'Portugal', 'Right-Back', 2019, 19, 6_000_000],
  ] as const;

  const splitRows = [
    ...splitPicks.map(([, name, id, foldedName, club, nationality, position, year, age, value]) => ({
      id, player_name: name, name_folded: foldedName, club, nationality, position, year, age, market_value_usd: value,
    })),
    { id: 49664, player_name: 'Luke Bolton', name_folded: 'luke bolton', club: 'Wycombe Wanderers / Manchester City / Luton Town', nationality: 'England', position: 'Right-Back', year: 2019 },
  ];

  function useSplitRows() {
    io.rest = async query => {
      io.queries.push(query);
      const clubNames = operation(query, 'in', 'club') as string[] | undefined;
      const group = String(query.operations.find(([method]) => method === 'or')?.[1][0] ?? '');
      const includedClubs = clubNames ?? (group.match(/^club\.in\.\(([^)]*)\)/)?.[1]
        .split(',').map(alias => alias.replace(/^"|"$/g, '')) ?? []);
      const year = operation(query, 'eq', 'year');
      const needle = String(operation(query, 'ilike', 'name_folded') ?? '').replace(/^%|%$/g, '');
      return { data: splitRows.filter(row => row.name_folded.includes(needle) && (year === undefined || row.year === year)
        && (includedClubs.includes(row.club) || group.includes(`and(id.eq.${row.id},name_folded.eq."${row.name_folded}",club.eq."${row.club}")`))), error: null };
    };
  }

  it.each(splitPicks)('finds and accepts the verified canonical split record for %s, %s', async (team, name, id, foldedName, club, nationality, position, year, age, value) => {
    useSplitRows();
    const [role, index] = position === 'Right-Back' ? ['RB', 4] as const : ['CDM', 5] as const;
    openSavedDraft({ mode: 'mixed' }, [team], [index]);
    await searchClubPick(foldedName, role);
    fireEvent.click(option(name)); await flush();
    expect(screen.getByRole('button', { name: 'Submit Team' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem(draftKey)!).slots.at(-1)[1]).toMatchObject({
      playerName: name, assignedTeam: team, pick: { age, club, nationality, rawPosition: position, value, year },
    });
    const proof = `and(id.eq.${id},name_folded.eq.${JSON.stringify(foldedName)},club.eq.${JSON.stringify(club)})`;
    expect(io.queries).toHaveLength(2);
    expect(io.queries.every(query => query.operations.some(([method, args]) => method === 'or' && String(args[0]).includes(proof)))).toBe(true);
    expect(io.fetches.some(url => url.includes('validate-player'))).toBe(false);
  });

  it.each([
    ['Liverpool', 'Andrey Santos', { mode: 'mixed' }],
    ['Manchester City', 'Luke Bolton', { mode: 'mixed' }],
    ['Chelsea', 'Andrey Santos', { mode: 'club-year', year: 2025 }],
  ] as const)('does not surface %s’s unadmitted split record for %s', async (team, name, choice) => {
    useSplitRows();
    openSavedDraft(choice, [team], [5]);
    await searchClubPick(name);
    expect(playerOptions()).toHaveLength(0);
    expect(io.queries.length).toBeGreaterThan(0);
  });
});

describe('Build Your XI recorded year admissions', () => {
  it('deals the expanded era pool, validates each source year and completes a mixed-year XI', async () => {
    const era = { mode: 'club-era', year: 2010 } as const;
    const reached = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      vi.mocked(Math.random).mockImplementation(mulberry32(seed));
      const view = renderHook(useLineupBuilder);
      act(() => api(view).selectFormation('4-4-2', era));
      const teams = api(view).teamAssignments;
      expect(new Set(teams.map(team => team.name)).size).toBe(11);
      expect(teams.every(team => !team.isNation && clubEraClubs.includes(team.name))).toBe(true);
      teams.forEach(team => reached.add(team.name));
      const initial = api(view).currentTeam;
      act(() => api(view).rerollTeam());
      expect(api(view).currentTeam?.name).not.toBe(initial?.name);
      expect(api(view).draftChoice).toEqual(era);
      view.unmount();
    }
    for (const club of ['Boca Juniors', 'River Plate', 'Flamengo', 'Grêmio', 'Santos']) expect(reached).toContain(club);
    const view = renderHook(useLineupBuilder);
    act(() => api(view).selectFormation('4-4-2', era));
    act(() => api(view).selectPosition(0));
    const club = api(view).currentTeam!.name;
    await act(async () => { await api(view).submitPlayer('Earlier', meta(club, 2009, 'GK', 'Earlier')); });
    await act(async () => { await api(view).submitPlayer('Later', meta(club, 2015, 'GK', 'Later')); });
    expect(api(view).filledCount).toBe(0);
    for (let i = 0; i < 11; i++) {
      const current = api(view);
      act(() => { current.finishSpin(); current.selectPosition(i); });
      const name = 'Era pick ' + i;
      await act(async () => { await api(view).submitPlayer(name, meta(current.currentTeam!.name, 2010 + i % 5, current.positions[i].role, name)); });
    }
    act(() => api(view).completeRecordedYearDraft?.(VERDICT));
    expect(api(view).phase).toBe('result');
    expect(api(view).filledSlotsArray.map(slot => slot.pick?.year)).toEqual(Array.from({ length: 11 }, (_, i) => 2010 + i % 5));
    legacyQuiet();
  });

  it('sends the exact five-year filter to name search and Browse players', async () => {
    render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Club era draft' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Five-year era' }), { target: { value: '2010' } });
    fireEvent.click(screen.getByRole('button', { name: /^4-4-2\s*11 players$/ }));
    await chooseSlot('GK');
    await browse();
    fireEvent.change(field(), { target: { value: 'Fixture Keeper' } });
    await advance(230); await flush();
    expect(io.queries.length).toBeGreaterThanOrEqual(2);
    for (const query of io.queries) {
      expect(operation(query, 'in', 'year')).toEqual([2010, 2011, 2012, 2013, 2014]);
      expect(operation(query, 'in', 'club')).toEqual(['Real Madrid']);
      expect(operation(query, 'eq', 'year')).toBeUndefined();
    }
    const target = playerOptions().find(node => within(node).queryByText(/Record: 2014$/));
    expect(target).toBeDefined();
    expect(target).toHaveTextContent('Record: 2014');
    fireEvent.click(target!);
    await flush();
    expect(screen.getByText('1/11', { exact: true })).toBeVisible();
    legacyQuiet();
  });
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

describe('Build Your XI unfinished draft', () => {

  it('reopens only the last accepted club year pick from review with the same assigned club', async () => {
    const view = await startHook(2010);
    await fillHook(view, 2010);
    const firstDraft = JSON.parse(localStorage.getItem(draftKey)!);
    const [slotIndex, last] = firstDraft.slots.at(-1);
    act(() => api(view).undoLastPick());
    expect(api(view).phase).toBe('building');
    expect(api(view).currentTeam?.name).toBe(last.assignedTeam);
    expect(api(view).selectedPositionIndex).toBe(slotIndex);
    expect(JSON.parse(localStorage.getItem(draftKey)!)).toEqual({ ...firstDraft, slots: firstDraft.slots.slice(0, 10) });
    const existing = firstDraft.slots[8][1].playerName;
    await act(async () => { await api(view).submitPlayer(existing, meta(last.assignedTeam, 2010, last.role, existing)); });
    expect(api(view).filledCount).toBe(10);
    const replacement = 'Fixture last replacement';
    await act(async () => { await api(view).submitPlayer(replacement, meta(last.assignedTeam, 2010, last.role, replacement)); });
    expect(api(view).phase).toBe('reviewing');
    expect(api(view).filledSlots.get(slotIndex)?.playerName).toBe(replacement);
    const edited = JSON.parse(localStorage.getItem(draftKey)!);
    expect(edited.teamAssignments).toEqual(firstDraft.teamAssignments);
    expect(edited.slots.slice(0, 10)).toEqual(firstDraft.slots.slice(0, 10));
    legacyQuiet();
  });

  it.each<DraftChoice>([
    { mode: 'mixed' }, { mode: 'club-year', year: 2010 }, { mode: 'club-era', year: 2008 },
  ])('restores the accepted pick and the rerolled teams in $mode', async choice => {
    const view = renderHook(() => useLineupBuilder());
    act(() => api(view).selectFormation('4-4-2', choice));
    const club = api(view).currentTeam!.name;
    act(() => api(view).selectPosition(0));
    await act(async () => {
      await api(view).submitPlayer('Fixture Keeper', meta(club, 2010));
    });
    expect(api(view).filledCount).toBe(1);
    act(() => { api(view).finishSpin(); api(view).rerollTeam(); });
    const teams = [...api(view).teamAssignments];
    const slots = [...api(view).filledSlots];
    const raw = localStorage.getItem(draftKey);
    view.unmount();

    const reopened = renderHook(() => useLineupBuilder());
    expect(api(reopened).formation).toBe('4-4-2');
    expect(api(reopened).phase).toBe('building');
    expect(api(reopened).draftChoice).toEqual(choice);
    expect(api(reopened).teamAssignments).toEqual(teams);
    expect(api(reopened).filledCount).toBe(1);
    expect([...api(reopened).filledSlots]).toEqual(slots);
    expect(api(reopened).currentTeam).toEqual(teams[1]);
    expect(api(reopened).isSpinning).toBe(false);
    expect(api(reopened).isValidating).toBe(false);
    expect(raw).not.toBeNull();
    expect(localStorage.getItem(draftKey)).toBe(raw);
    legacyQuiet();
    act(() => api(reopened).resetGame());
    reopened.unmount();
    const fresh = renderHook(() => useLineupBuilder());
    expect(api(fresh).phase).toBe('formation');
    expect(api(fresh).filledCount).toBe(0);
  });

  it('ignores a damaged draft and replaces it after a real selection', () => {
    localStorage.setItem(draftKey, '{"formation":"toString"}');
    const fresh = renderHook(() => useLineupBuilder());
    expect(api(fresh).phase).toBe('formation');
    act(() => api(fresh).selectFormation('4-4-2'));
    expect(api(fresh).phase).toBe('building');
    expect(localStorage.getItem(draftKey)).toContain('"formation":"4-4-2"');
  });

  it('discards a recorded pick with a year outside its saved draft', async () => {
    const view = await startHook(2010);
    const club = api(view).currentTeam!.name;
    act(() => api(view).selectPosition(0));
    await act(async () => { await api(view).submitPlayer('Fixture Keeper', meta(club, 2010)); });
    const draft = JSON.parse(localStorage.getItem(draftKey)!);
    expect(draft.slots[0][1].pick.year).toBe(2010);
    draft.slots[0][1].pick.year = 2009;
    localStorage.setItem(draftKey, JSON.stringify(draft));
    view.unmount();
    const fresh = renderHook(() => useLineupBuilder());
    expect(api(fresh).phase).toBe('formation');
  });

  it('does not overwrite progress saved by a second instance', async () => {
    const first = await startHook(2010);
    await fillHook(first, 2010);
    const older = renderHook(() => useLineupBuilder());
    act(() => api(first).completeRecordedYearDraft!(VERDICT));
    act(() => api(first).selectFormation('3-5-2', { mode: 'club-era', year: 2020 }));
    const newer = localStorage.getItem(draftKey);
    act(() => api(older).completeRecordedYearDraft!(VERDICT));
    expect(api(older).phase).toBe('reviewing');
    expect(newer).toContain('"year":2020');
    act(() => { expect(api(older).undoLastPick()).toBe(false); });
    expect(api(older).filledCount).toBe(11);
    expect(api(older).phase).toBe('reviewing');
    expect(api(older).validationError).toContain('changed in another tab');
    expect(localStorage.getItem(draftKey)).toBe(newer);
    act(() => api(older).resetGame());
    expect(localStorage.getItem(draftKey)).toBe(newer);
  });

  it.each([
    'before validation', 'during validation', 'in the same update batch',
  ] as const)('refuses an ordinary pick when another tab saves %s', async timing => {
    const current = renderHook(() => useLineupBuilder());
    act(() => api(current).selectFormation('4-4-2'));
    const older = renderHook(() => useLineupBuilder());
    const club = api(current).currentTeam!.name;
    const pick = (view: typeof current, name: string, role: PositionRole) =>
      api(view).submitPlayer(name, meta(club, 2010, role, name));
    act(() => api(older).selectPosition(1));
    io.historyHeld = true;
    const losingName = 'Fixture Other Tab Back';
    let checking: Promise<void> | undefined;
    if (timing === 'during validation') {
      act(() => { checking = pick(older, losingName, 'RWB'); });
      await flush();
      expect(io.histories).toHaveLength(1);
      expect(api(older).isValidating).toBe(true);
    }

    const winningName = 'Fixture Saved Back';
    act(() => api(current).selectPosition(1));
    await act(async () => {
      const winning = pick(current, winningName, 'LB');
      if (timing === 'in the same update batch') await pick(older, losingName, 'LB');
      await winning;
    });
    expect(api(current).filledSlots.get(1)?.playerName).toBe(winningName);
    const winningDraft = localStorage.getItem(draftKey);
    expect(winningDraft).toContain(winningName);

    if (checking) {
      await act(async () => { io.histories[0].release(); await checking; });
    } else if (timing === 'before validation') {
      await act(async () => pick(older, losingName, 'LB'));
    }
    expect(api(older).filledCount).toBe(0);
    expect(api(older).selectedPositionIndex).toBe(1);
    expect(api(older).isValidating).toBe(false);
    expect(api(older).isSpinning).toBe(false);
    expect(api(older).validationError).toContain('changed in another tab');
    expect(localStorage.getItem(draftKey)).toBe(winningDraft);
    const reopened = renderHook(() => useLineupBuilder());
    expect(api(reopened).filledSlots.get(1)?.playerName).toBe(winningName);
    legacyQuiet();
  });

  it('shows why a stale Mixed reroll is refused with the picker closed', async () => {
    const current = renderHook(() => useLineupBuilder());
    act(() => api(current).selectFormation('4-4-2'));
    const older = render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    const reroll = within(older.container).getByTitle('Reroll: get a different team');
    expect(within(older.container).queryByRole('combobox', { name: /search/i })).toBeNull();
    const club = api(current).currentTeam!.name;
    act(() => api(current).selectPosition(0));
    await act(async () => api(current).submitPlayer('Fixture Saved Keeper', meta(club, 2010, 'GK', 'Fixture Saved Keeper')));
    expect(api(current).filledSlots.get(0)?.playerName).toBe('Fixture Saved Keeper');
    const winningDraft = localStorage.getItem(draftKey);
    const rng = vi.mocked(Math.random);
    rng.mockClear();

    fireEvent.click(reroll);
    expect(within(older.container).getByRole('alert')).toHaveTextContent('changed in another tab');
    expect(reroll).toBeVisible();
    expect(within(older.container).getByText('0/11')).toBeVisible();
    expect(rng).not.toHaveBeenCalled();
    expect(localStorage.getItem(draftKey)).toBe(winningDraft);
    legacyQuiet();
  });

  it('restores the submitted XI and its verdict until Play Again', async () => {
    const view = await startHook(2010);
    await fillHook(view, 2010);
    const slots = api(view).filledSlotsArray;
    view.unmount();

    const reopened = renderHook(() => useLineupBuilder());
    expect(api(reopened).phase).toBe('reviewing');
    expect(api(reopened).filledSlotsArray).toEqual(slots);
    expect(api(reopened).verdict).toBeNull();
    act(() => api(reopened).completeRecordedYearDraft!(VERDICT));
    expect(api(reopened).phase).toBe('result');
    reopened.unmount();
    const fresh = renderHook(() => useLineupBuilder());
    expect(api(fresh).phase).toBe('result');
    expect(api(fresh).verdict).toEqual(VERDICT);
    expect(api(fresh).filledSlotsArray).toEqual(slots);
    act(() => api(fresh).resetGame());
    expect(localStorage.getItem(draftKey)).toBeNull();
    expect(api(fresh).phase).toBe('formation');
    legacyQuiet();
  });

  it('holds the completed XI in review if saving fails, then settles on retry', async () => {
    const view = await startHook(2010);
    await fillHook(view, 2010);
    const draft = localStorage.getItem(draftKey);
    const setItem = Storage.prototype.setItem;
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === draftKey) throw new DOMException('Full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    act(() => api(view).completeRecordedYearDraft!(VERDICT));
    expect(api(view).phase).toBe('reviewing');
    expect(api(view).validationError).toMatch(/storage/);
    expect(localStorage.getItem(draftKey)).toBe(draft);
    failure.mockRestore();
    act(() => api(view).completeRecordedYearDraft!(VERDICT));
    expect(api(view).phase).toBe('result');
    const settled = JSON.parse(localStorage.getItem(draftKey)!);
    expect(settled.result.verdict).toEqual(VERDICT);
    view.unmount();
    localStorage.setItem(draftKey, JSON.stringify({ ...settled, result: { ...settled.result, season: { narrative: {} } } }));
    const damaged = renderHook(() => useLineupBuilder());
    expect(api(damaged).phase).toBe('formation');
  });

  it('replaces an early starter under the original draw without losing the other ten picks', async () => {
    const view = await startHook(2010);
    await fillHook(view, 2010);
    const original = api(view).filledSlots.get(0)!;
    const old = JSON.parse(localStorage.getItem(draftKey)!);
    act(() => { expect(api(view).replacePick(0)).toBe(true); });
    expect(api(view).currentTeam).toEqual({ name: original.assignedTeam, isNation: false });
    expect(api(view).filledCount).toBe(11);
    act(() => api(view).completeRecordedYearDraft!(VERDICT));
    expect(api(view).phase).toBe('reviewing');
    const candidate = 'Fixture replacement keeper';
    await act(async () => api(view).submitPlayer(candidate, meta(original.assignedTeam, 2009, 'GK', candidate)));
    expect(api(view).validationError).toContain('2010');
    expect(api(view).filledSlots.get(0)).toEqual(original);
    const duplicate = api(view).filledSlots.get(8)!.playerName;
    await act(async () => api(view).submitPlayer(duplicate, meta(original.assignedTeam, 2010, 'GK', duplicate)));
    expect(api(view).validationError).toContain('already in your lineup');
    expect(JSON.parse(localStorage.getItem(draftKey)!)).toEqual(old);
    await act(async () => api(view).submitPlayer(candidate, meta(original.assignedTeam, 2010, 'GK', candidate)));
    const edited = JSON.parse(localStorage.getItem(draftKey)!);
    expect(edited.slots[0][0]).toBe(0);
    expect(edited.slots[0][1].playerName).toBe(candidate);
    expect(edited.slots.slice(1)).toEqual(old.slots.slice(1));
    expect(edited.teamAssignments).toEqual(old.teamAssignments);
    expect(api(view).replacingSlot).toBeUndefined();
    expect(api(view).phase).toBe('reviewing');
    view.unmount();
    const reopened = renderHook(() => useLineupBuilder());
    expect(api(reopened).filledSlots.get(0)?.playerName).toBe(candidate);
    expect(api(reopened).filledCount).toBe(11);
    act(() => api(reopened).completeRecordedYearDraft!(VERDICT));
    expect(api(reopened).phase).toBe('result');
    expect(JSON.parse(localStorage.getItem(draftKey)!).draft.slots[0][1].playerName).toBe(candidate);
    legacyQuiet();
  });

  it('does not overwrite the selected starter when validation is canceled or another tab changes the draft', async () => {
    const view = await startHook(2010);
    await fillHook(view, 2010);
    const old = localStorage.getItem(draftKey);
    const starter = api(view).filledSlots.get(1)!;
    io.historyHeld = true;
    const name = 'Fixture replacement wingback';
    const row = meta(starter.assignedTeam, 2010, 'RWB', name);
    const tryReplace = async () => {
      act(() => { api(view).replacePick(1); });
      let pending: Promise<void> | undefined;
      await act(async () => { pending = api(view).submitPlayer(name, row); });
      return { pending: pending! };
    };
    let { pending } = await tryReplace();
    expect(io.histories).toHaveLength(1);
    act(() => api(view).cancelReplacement());
    await act(async () => { io.histories[0].release(); await pending; });
    expect(api(view).filledSlots.get(1)).toBe(starter);
    expect(localStorage.getItem(draftKey)).toBe(old);
    ({ pending } = await tryReplace());
    const newer = JSON.stringify({ ...JSON.parse(old!), extra: true });
    localStorage.setItem(draftKey, newer);
    await act(async () => { io.histories[1].release(); await pending; });
    expect(api(view).filledSlots.get(1)).toBe(starter);
    expect(api(view).validationError).toContain('changed in another tab');
    expect(localStorage.getItem(draftKey)).toBe(newer);
  });

  it('verifies a Mixed replacement against the original nation before committing', async () => {
    const positions = FORMATIONS['4-4-2'];
    const teamAssignments = [{ name: nations[0], isNation: true }, ...clubs.slice(0, 10).map(name => ({ name, isNation: false }))];
    localStorage.setItem(draftKey, JSON.stringify({
      formation: '4-4-2', draftChoice: { mode: 'mixed' }, teamAssignments,
      slots: positions.map((slot, i) => [i, { ...slot, playerName: 'Mixed Fixture ' + i, assignedTeam: teamAssignments[i].name, isNation: teamAssignments[i].isNation }]),
    }));
    const view = renderHook(() => useLineupBuilder());
    const expectedBody = { playerName: 'Mixed New Keeper', teamName: nations[0], isNation: true, position: 'GK' };
    const original = api(view).filledSlots.get(0);
    const validator = vi.mocked(fetch);
    validator.mockRejectedValueOnce(new Error('fixture offline'));
    act(() => { expect(api(view).replacePick(0)).toBe(true); });
    await act(async () => api(view).submitPlayer(expectedBody.playerName, { rawPosition: 'Goalkeeper' }));
    expect(api(view).filledSlots.get(0)).toBe(original);
    expect(api(view).filledCount).toBe(11);
    validator.mockResolvedValueOnce(new Response(JSON.stringify({ valid: true, fullName: expectedBody.playerName }), { status: 200 }));
    await act(async () => api(view).submitPlayer(expectedBody.playerName, { rawPosition: 'Goalkeeper' }));
    expect(JSON.parse(String(validator.mock.calls.at(-1)?.[1]?.body))).toEqual(expectedBody);
    expect(api(view).filledSlots.get(0)).toMatchObject({ playerName: expectedBody.playerName, assignedTeam: nations[0], isNation: true });
    expect(api(view).filledCount).toBe(11);
  });

  it('replaces an era starter using a different season inside the same five-year range', async () => {
    const positions = FORMATIONS['4-4-2'];
    const teamAssignments = clubEraClubs.slice(0, 11).map(name => ({ name, isNation: false }));
    localStorage.setItem(draftKey, JSON.stringify({
      formation: '4-4-2', draftChoice: { mode: 'club-era', year: 2008 }, teamAssignments,
      slots: positions.map((slot, i) => {
        const name = 'Era Fixture ' + i;
        return [i, { ...slot, playerName: name, assignedTeam: teamAssignments[i].name, isNation: false, pick: meta(teamAssignments[i].name, 2009, slot.role, name) }];
      }),
    }));
    const view = renderHook(() => useLineupBuilder());
    const original = api(view).filledSlots.get(0);
    act(() => { expect(api(view).replacePick(0)).toBe(true); });
    const name = 'Era New Keeper';
    await act(async () => api(view).submitPlayer(name, meta(teamAssignments[0].name, 2013, 'GK', name)));
    expect(api(view).filledSlots.get(0)).toBe(original);
    await act(async () => api(view).submitPlayer(name, meta(teamAssignments[0].name, 2012, 'GK', name)));
    expect(api(view).filledSlots.get(0)).toMatchObject({ playerName: name, pick: { year: 2012 } });
    expect(api(view).filledCount).toBe(11);
    legacyQuiet();
  });
});

describe('Build Your XI verified namesakes', () => {
  // Exact rows from scripts/data/bingoPoolHistory-2026-10-29.json.
  const psg = {
    id: 177617, player_name: 'Vitinha', name_folded: 'vitinha', club: 'Paris Saint-Germain', nationality: 'Portugal',
    position: 'Defensive Midfield', age: 25, year: 2026, market_value_usd: 151_200_000,
  };
  const marseille = {
    id: 166895, player_name: 'Vitinha', name_folded: 'vitinha', club: 'Olympique Marseille', nationality: 'Portugal',
    position: 'Centre-Forward', age: 23, year: 2024, market_value_usd: 15_000_000,
  };
  const porto = {
    id: 167401, player_name: 'Vitinha', name_folded: 'vitinha', club: 'FC Porto', nationality: 'Portugal',
    position: 'Defensive Midfield', age: 21, year: 2022, market_value_usd: 49_000_000,
  };
  const asPick = (row: typeof psg, position: PositionRole): PickMeta => ({
    rawName: row.player_name, rawPosition: row.position, position, club: row.club, nationality: row.nationality,
    value: row.market_value_usd, age: row.age, year: row.year, recordId: row.id,
  });
  const formation = '4-2-3-1';
  const positions = FORMATIONS[formation];
  const clubEra = { mode: 'club-era', year: 2022 } as const;
  function lineup(nextTeam = 'Marseille') {
    return ['PSG', nextTeam, ...clubYearClubs.filter(club => club !== 'PSG' && club !== nextTeam).slice(0, 9)]
      .map(name => ({ name, isNation: false }));
  }
  const firstPick = {
    ...positions[5], playerName: 'Vitinha', assignedTeam: 'PSG', isNation: false,
    pick: { ...asPick(psg, 'CDM'), recordId: undefined },
  };

  it.each([
    { mode: 'mixed' } as const, clubEra,
  ])('offers and saves the second Vitinha in $mode with the first already picked', async draftChoice => {
    localStorage.setItem(draftKey, JSON.stringify({ formation, draftChoice, teamAssignments: lineup(), slots: [[5, firstPick]] }));
    io.rest = async () => ({ data: [marseille], error: null });
    const open = () => render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    const view = open();
    await chooseSlot('ST');
    fireEvent.change(field(), { target: { value: 'Vitinha' } });
    await advance(230); await flush();
    fireEvent.click(screen.getByRole('option', { name: /Vitinha.*Olympique Marseille/i }));
    await flush();
    const raw = localStorage.getItem(draftKey)!;
    expect(JSON.parse(raw).slots).toMatchObject([
      [5, { playerName: 'Vitinha', pick: { club: psg.club, value: psg.market_value_usd } }],
      [10, { playerName: 'Vitinha', pick: { club: marseille.club, value: marseille.market_value_usd, recordId: marseille.id } }],
    ]);
    view.unmount();
    open();
    expect(screen.getAllByText('Vitinha')).toHaveLength(2);
    expect(localStorage.getItem(draftKey)).toBe(raw);
  });

  it('rejects a different verified record of the same person across club and year', async () => {
    const raw = JSON.stringify({ formation, draftChoice: clubEra, teamAssignments: lineup('Porto'), slots: [[5, firstPick]] });
    localStorage.setItem(draftKey, raw);
    const view = renderHook(useLineupBuilder);
    act(() => { api(view).finishSpin(); api(view).selectPosition(6); });
    await act(async () => api(view).submitPlayer('Vitinha', asPick(porto, 'CDM')));
    expect(api(view).validationError).toMatch(/already in your lineup/);
    expect(api(view).filledCount).toBe(1);
    expect(localStorage.getItem(draftKey)).toBe(raw);
  });

  it('checks the exact selected Vitinha for a nation and holds a mismatched full name', async () => {
    const teamAssignments = lineup('Portugal');
    teamAssignments[1].isNation = true;
    const raw = JSON.stringify({ formation, draftChoice: { mode: 'mixed' }, teamAssignments, slots: [[5, firstPick]] });
    localStorage.setItem(draftKey, raw);
    const validate = vi.fn((_url: RequestInfo | URL, _options?: RequestInit) => Promise.resolve(
      new Response(JSON.stringify({ valid: true, fullName: 'Vítor Machado Ferreira' }), { status: 200 }),
    ));
    vi.stubGlobal('fetch', validate);
    const view = renderHook(useLineupBuilder);
    act(() => { api(view).finishSpin(); api(view).selectPosition(10); });
    await act(async () => api(view).submitPlayer('Vitinha', asPick(marseille, 'ST')));
    expect(JSON.parse(String(validate.mock.calls[0][1]?.body))).toMatchObject({
      playerName: 'Vítor Manuel Carvalho Oliveira', teamName: 'Portugal', isNation: true, position: 'ST',
    });
    expect(api(view).filledCount).toBe(1);
    expect(localStorage.getItem(draftKey)).toBe(raw);
  });

  it('finishes a full recorded draft without merging the two players in the season report', async () => {
    const teamAssignments = lineup();
    const slots = [[5, firstPick], [10, {
      ...positions[10], playerName: 'Vitinha', assignedTeam: 'Marseille', isNation: false, pick: asPick(marseille, 'ST'),
    }], ...positions.flatMap((slot, index) => {
      if (index === 5 || index === 10) return [];
      const assignedTeam = teamAssignments[2 + (index < 5 ? index : index - 1)].name;
      const playerName = 'Recorded Fixture ' + index;
      return [[index, { ...slot, playerName, assignedTeam, isNation: false, pick: meta(assignedTeam, 2024, slot.role, playerName) }]];
    })];
    localStorage.setItem(draftKey, JSON.stringify({ formation, draftChoice: clubEra, teamAssignments, slots }));
    render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    expect(io.simulate.mock.lastCall?.[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Vítor Machado Ferreira', value: psg.market_value_usd }),
      expect.objectContaining({ name: 'Vítor Manuel Carvalho Oliveira', value: marseille.market_value_usd }),
    ]));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Team' }));
    await flush();
    expect(screen.getByText(/Your XI finished/)).toBeVisible();
  });
});

describe('Build Your XI Club year Browse on the real page', () => {
  it('shows separate Club era records and can switch the existing keeper to a lower-value season', async () => {
    const teamAssignments = clubEraClubs.slice(0, 11).map(name => ({ name, isNation: false }));
    const keeper = 'Era Keeper';
    const slots = FORMATIONS['4-4-2'].map((slot, index) => {
      const name = index === 0 ? keeper : `Era Draft Pick ${index}`;
      const club = teamAssignments[index].name;
      return [index, { ...slot, playerName: name, assignedTeam: club, isNation: false,
        pick: { ...meta(club, 2012, slot.role, name), recordId: 501 + index, value: index === 0 ? 9_000_000 : 2_000_000 } }] as const;
    });
    localStorage.setItem(draftKey, JSON.stringify({ formation: '4-4-2', draftChoice: { mode: 'club-era', year: 2008 }, teamAssignments, slots }));
    const club = clubTableNames(teamAssignments[0].name)[0];
    const row = (id: number, name: string, year: number, age: number, value: number) => ({
      id, player_name: name, name_folded: name.toLowerCase(), club, nationality: 'Fixture Nation',
      position: 'Goalkeeper', year, age, market_value_usd: value,
    });
    const records = [
      row(501, keeper, 2012, 26, 9_000_000),
      ...Array.from({ length: 50 }, (_, index) => row(index + 1, `Era Prospect ${index}`, 2010, 25, 4_000_000)),
      row(601, keeper, 2009, 23, 1_000_000),
      row(602, slots[1][1].playerName, 2009, 23, 1_000_000),
    ];
    io.rest = async query => {
      io.queries.push(query);
      const needle = operation(query, 'ilike', 'name_folded');
      const range = query.operations.find(([name]) => name === 'range')?.[1] as [number, number] | undefined;
      const limit = query.operations.find(([name]) => name === 'limit')?.[1][0] as number | undefined;
      const matching = typeof needle === 'string' ? records.filter(record => record.name_folded.includes(needle.replace(/%/g, ''))) : records;
      return { data: range ? matching.slice(range[0], range[1] + 1) : matching.slice(0, limit), error: null };
    };
    const open = () => render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    const view = open();
    fireEvent.click(screen.getByRole('button', { name: 'Replace Era Keeper at GK' }));
    fireEvent.change(field(), { target: { value: keeper } });
    await advance(230); await flush();
    expect(screen.getByRole('option', { name: /Era Keeper.*Record: 2012/ })).toBeVisible();
    expect(screen.getByRole('option', { name: /Era Keeper.*Record: 2009/ })).toBeVisible();
    await browse();
    expect(screen.getByText('1 to 50 of 52')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next players' }));
    expect(screen.getByText('51 to 52 of 52')).toBeVisible();
    expect(screen.queryByRole('option', { name: /Era Draft Pick 1/ })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: /Era Keeper.*Record: 2009/ }));
    await flush();

    const saved = JSON.parse(localStorage.getItem(draftKey)!);
    expect(saved.slots[0][1]).toMatchObject({ playerName: keeper, pick: { recordId: 601, year: 2009, age: 23, value: 1_000_000 } });
    expect(saved.slots.slice(1)).toEqual(slots.slice(1));
    view.unmount();
    open();
    const replace = screen.getByRole('button', { name: 'Replace Era Keeper at GK' });
    expect(within(replace.parentElement!).getByText('Record: 2009')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(draftKey)!)).toEqual(saved);
    for (const query of io.queries) {
      expect(String(query.operations.find(([name]) => name === 'select')?.[1][0]).split(', ')).toContain('id');
    }
    expect(io.queries.map(query => operation(query, 'in', 'year'))).toEqual(io.queries.map(() => [2008, 2009, 2010, 2011, 2012]));
    legacyQuiet();
  });

  it('pages through the full assigned pool when replacing a starter', async () => {
    io.pool = 'complete'; await openPage(2026); await fillPage();
    const before = io.simulate.mock.calls[0][0] as { name: string; value: number }[];
    const oldQuery = io.rest!;
    const startingReads = io.queries.length;
    io.rest = async query => {
      if (query.table !== 'player_market_values') return oldQuery(query);
      io.queries.push({ ...query, operations: query.operations.map(([method, args]) => [method, [...args]]) });
      const aliases = operation(query, 'in', 'club') as string[];
      const records = Array.from({ length: 1055 }, (_, index) => {
        const name = 'Browse Keeper ' + String(index + 1).padStart(4, '0');
        return {
          id: index + 1, club: aliases[0], nationality: 'Fixture Nation', year: 2026, age: 25, position: 'Goalkeeper',
          market_value_usd: 2_000_000 - index, name_folded: name.toLowerCase(), player_name: name,
        };
      });
      const range = query.operations.find(([name]) => name === 'range')?.[1] as [number, number] | undefined;
      const limit = query.operations.find(([name]) => name === 'limit')?.[1][0] as number | undefined;
      return { data: range ? records.slice(range[0], range[1] + 1) : records.slice(0, limit), error: null };
    };
    fireEvent.click(screen.getByRole('button', { name: 'Replace ' + before[0].name + ' at GK' })); await flush();
    await browse();
    const reads = io.queries.slice(startingReads);
    expect(reads.map(query => query.operations.find(([name]) => name === 'range')?.[1])).toEqual([[0, 999], [1000, 1999]]);
    expect(screen.getByText('1 to 50 of 1,055')).toBeVisible();
    expect(screen.queryByText('Browse Keeper 0051', { exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next players' }));
    expect(screen.getByText('51 to 100 of 1,055')).toBeVisible();
    fireEvent.click(option('Browse Keeper 0051'));
    await flush();
    expect(screen.queryByRole('region', { name: 'Replace a starter' })).toBeNull();
    const after = io.simulate.mock.calls[1][0] as typeof before;
    expect(after[0].name).toBe('Browse Keeper 0051');
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(io.queries.slice(startingReads)).toEqual(reads);
  }, 20000);

  it('browses past eight records and reopens after Escape and outside focus', async () => {
    await openPage(2010); await chooseSlot('GK');
    expect(playerOptions()).toHaveLength(0);
    let input = await browse();
    expect(input).toHaveValue(''); expect(input).toHaveFocus(); assertYearQueries(2010);
    expect(playerOptions(), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    expect(option('Fixture Keeper 2010')).toBeVisible(); assertYearQueries(2010);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    input = await browse(); expect(input).toHaveFocus(); expect(playerOptions(), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    fireEvent.blur(input, { relatedTarget: document.body });
    expect(screen.queryByRole('listbox')).toBeNull();
    input = await browse(); expect(input).toHaveFocus(); expect(playerOptions(), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    expect(screen.getByText('0/11', { exact: true })).toBeVisible(); legacyQuiet();
  });

  it('keeps typed search at eight and admits the keyboard-selected matching keeper once', async () => {
    await openPage(2010); await chooseSlot('GK'); await browse();
    fireEvent.change(field(), { target: { value: 'Fixture' } }); await advance(220); await flush();
    expect(playerOptions(), 'XI_CLUB_YEAR_TYPED: original typed cap stays eight').toHaveLength(8);
    expect(screen.queryByText('Fixture Keeper 2010', { exact: true })).toBeNull();
    const input = await browse(); expect(playerOptions(), 'XI_CLUB_YEAR_BROWSE: fifteen matching records').toHaveLength(15);
    fireEvent.keyDown(input, { key: 'ArrowUp' }); fireEvent.keyDown(input, { key: 'Enter' }); await flush();
    expect(screen.getByText('1/11', { exact: true })).toBeVisible();
    expect(screen.getAllByText('Fixture Keeper 2010', { exact: true })).toHaveLength(1);
    expect(io.fetches).toEqual([]); assertYearQueries(2010); legacyQuiet();
  });

  it('distinguishes an empty matching record list from a failed read', async () => {
    await openPage(2010); await chooseSlot('GK'); io.market = 'empty'; await browse();
    expect(screen.getByText('No matching records. Try another name or reroll the club.', { exact: true })).toBeVisible();
    expect(playerOptions()).toHaveLength(0);
    io.market = 'error'; await browse(); await advance(1250); await flush();
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
    const completed = localStorage.getItem(draftKey)!;
    cleanup();
    io.simulate.mockImplementation(() => { throw new Error('A completed season was simulated again'); });
    render(<MemoryRouter><LineupBuilder /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Play Again/i })).toBeVisible();
    expect(screen.getByText('Season Report', { exact: true })).toBeVisible();
    expect(screen.getAllByText(/2026 value/)).toHaveLength(11);
    expect(io.simulate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(draftKey)).toBe(completed);
    fireEvent.click(screen.getByRole('button', { name: /Play Again/i })); await flush();
    expect(screen.getByRole('combobox', { name: 'Recorded year' })).toHaveValue('2026');
    expect(screen.getByRole('heading', { name: 'Choose Your Formation' })).toBeVisible();
    expect(screen.queryByText('Season Report', { exact: true })).toBeNull();
  }, 15000);

  it('uses the same recorded player picker to replace a starter and refresh the settled XI', async () => {
    io.pool = 'complete'; await openPage(2026); await fillPage();
    const before = io.simulate.mock.calls[0][0] as { name: string; value: number }[];
    const originalName = before[0].name;
    const oldQuery = io.rest!;
    io.rest = async query => {
      const response = await oldQuery(query) as { data: Record<string, unknown>[] | null; error: unknown };
      if (!response.data) return response;
      const aliases = operation(query, 'in', 'club') as string[];
      const typed = operation(query, 'ilike', 'name_folded');
      return { ...response, data: [
        ...response.data,
        ...(typed === undefined || String(typed).toLowerCase().includes('target') ? [{
          club: aliases[0], nationality: 'Fixture Nation', year: 2026, age: 25,
          position: 'Goalkeeper', market_value_usd: 125_000_000, name_folded: 'fixture target keeper', player_name: 'Fixture Target Keeper',
        }] : []),
      ] };
    };
    fireEvent.click(screen.getByRole('button', { name: 'Replace ' + originalName + ' at GK' })); await flush();
    const edit = screen.getByRole('region', { name: 'Replace a starter' });
    expect(within(edit).getByRole('combobox')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Submit Team' })).toBeDisabled();
    fireEvent.change(within(edit).getByRole('combobox'), { target: { value: 'Target' } });
    await advance(220); await flush();
    const offered = playerOptions();
    const target = offered.find(node => node.textContent?.includes('Target Keeper'));
    expect(target, offered.map(node => node.textContent).join(' | ')).toBeDefined();
    fireEvent.click(target!); await flush();
    expect(screen.queryByRole('region', { name: 'Replace a starter' })).toBeNull();
    expect(io.simulate).toHaveBeenCalledTimes(2);
    const after = io.simulate.mock.calls[1][0] as { name: string; value: number }[];
    expect(after[0]).toMatchObject({ name: 'Fixture Target Keeper', value: 125_000_000 });
    expect(after.slice(1)).toEqual(before.slice(1));
    expect(io.simulate.mock.results[1].value.squadRating).toBeGreaterThan(io.simulate.mock.results[0].value.squadRating);
    fireEvent.click(screen.getByRole('button', { name: 'Submit Team' })); await flush();
    expect(screen.getByRole('button', { name: /Play Again/i })).toBeVisible();
    expect(io.simulate).toHaveBeenCalledTimes(2);
    legacyQuiet();
  }, 30000);

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
      fireEvent.click(screen.getByRole('button', { name: /Play Again/i }));
      cleanup();
    }
  }, 30000);
});

