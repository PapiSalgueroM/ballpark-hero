import type { ReactNode } from 'react';
import type { useLineupBuilder } from '@/hooks/useLineupBuilder';
import type { FilledSlot, PickMeta } from '@/types/lineupBuilder';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

type Snapshot = ReturnType<typeof useLineupBuilder>;
type Row = Record<string, unknown>;
type Query = { table: string; operations: [string, unknown[]][]; signal?: AbortSignal };
const io = vi.hoisted(() => ({
  state: null as unknown as Snapshot, rows: [] as Row[], queries: [] as Record<string, unknown>[], other: [] as unknown[],
  submit: vi.fn(), evaluate: vi.fn(), complete: vi.fn(), reset: vi.fn(), select: vi.fn(), reroll: vi.fn(), formation: vi.fn(),
  season: vi.fn(), record: vi.fn(), finish: vi.fn(), spin: vi.fn(), cancel: vi.fn(),
}));
vi.mock('@/hooks/useLineupBuilder', () => ({ useLineupBuilder: () => io.state }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  supabase: { from(table: string) {
    const q: Query = { table, operations: [] };
    const builder: Record<string, unknown> = {
      then(yes: (reply: unknown) => unknown, no: (error: unknown) => unknown) {
        io.queries.push({ table, operations: q.operations, aborted: !!q.signal?.aborted });
        if (table !== 'player_market_values') {
          io.other.push({ table }); return Promise.reject(new Error('Undeclared fixture table')).then(yes, no);
        }
        return Promise.resolve({ data: q.signal?.aborted ? [] : io.rows, error: null }).then(yes, no);
      },
    };
    for (const method of ['select', 'ilike', 'eq', 'in', 'order', 'limit', 'abortSignal']) builder[method] = (...args: unknown[]) => {
      if (method === 'abortSignal') q.signal = args[0] as AbortSignal; else q.operations.push([method, args]); return builder;
    };
    return builder;
  } },
}));
vi.mock('@/lib/worldXi', async original => ({ ...await original<typeof import('@/lib/worldXi')>(), simulateWorldXiSeason: (...args: unknown[]) => io.season(...args) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Generated Warning Guest' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ title, headerExtra, children }: { title: string; headerExtra?: ReactNode; children: ReactNode }) => <main><h1>{title}</h1>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
import LineupBuilder from '@/pages/LineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';
import { displayName } from '@/lib/playerSearch';

const TITLE = 'This record is missing rating inputs', KEEP = 'Keep searching', USE = 'Use this unrated record';
const NAME = 'Generated Unrated Keeper', CLUB = 'Generated Club', YEAR = 2010;
const TITLES = {
  value: 'XI_RECORD_WARNING_VALUE names every unusable value before admission',
  age: 'XI_RECORD_WARNING_AGE names every unusable age before admission',
  both: 'XI_RECORD_WARNING_BOTH names both missing inputs and the unrated consequence',
  cancel: 'XI_RECORD_WARNING_CANCEL returns to the live input without admitting the record',
  escape: 'XI_RECORD_WARNING_ESCAPE discards the choice and restores search focus',
  confirm: 'XI_RECORD_WARNING_CONFIRM_ONCE forwards exact original metadata once',
  complete: 'XI_RECORD_WARNING_COMPLETE preserves immediate complete picks including finite age zero and negative age',
  mixed: 'XI_RECORD_WARNING_MIXED preserves immediate Mixed selection without numeric inputs',
  slot: 'XI_RECORD_WARNING_SLOT discards a candidate when the selected slot changes',
  team: 'XI_RECORD_WARNING_TEAM discards a candidate when the assigned club changes',
  year: 'XI_RECORD_WARNING_YEAR discards a candidate when the recorded year changes',
  reset: 'XI_RECORD_WARNING_RESET does not revive a candidate after reset and return to an equal origin',
  input: 'XI_RECORD_WARNING_INPUT does not confirm a choice after the input revision changes',
  help: 'XI_RECORD_WARNING_HELP reopens the warning choices and a fictional worked example',
} as const;
type Key = keyof typeof TITLES;
const raw = { version: 1, scope: 'Page-routing proof only: actual LineupBuilder, PlayerAutocomplete/search conversion, rating UI, pitch and native dialogs; controlled useLineupBuilder snapshots and fictional query rows. No hook admission, real sports eligibility, natural draft, RNG or full-result credit.',
  caseTitles: Object.values(TITLES), cases: {} as Record<string, { title: string; frames: unknown[] }> };
function copy<T>(value: T): T {
  if (value instanceof Map) return [...value].map(([k, v]) => [k, copy(v)]) as T;
  if (value instanceof Set) return [...value] as T;
  if (Array.isArray(value)) return value.map(copy) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)])) as T;
  return value;
}
function snapshot(): Snapshot {
  const held: FilledSlot = { ...FORMATIONS['4-4-2'][4], playerName: 'Generated Existing Back', assignedTeam: CLUB, isNation: false,
    pick: { rawName: 'Generated Existing Back', rawPosition: 'Right-Back', position: 'RB', club: CLUB, nationality: 'Generated Nation', year: YEAR, age: 27, value: 3000000 } };
  return { formation: '4-4-2', phase: 'building', draftChoice: { mode: 'club-year', year: YEAR }, selectedPositionIndex: 0,
    currentTeam: { name: CLUB, isNation: false }, positions: FORMATIONS['4-4-2'], filledSlots: new Map([[4, held]]),
    filledSlotsArray: [held], filledCount: 1, verdict: null, isEvaluating: false, isValidating: false, validationError: null,
    isSpinning: false, spinTeamIndex: 0, setSpinTeamIndex: vi.fn(), checkingDown: false,
    selectFormation: io.formation, selectPosition: io.select, submitPlayer: io.submit, evaluateTeam: io.evaluate,
    completeRecordedYearDraft: io.complete, resetGame: io.reset, startSpin: io.spin, finishSpin: io.finish,
    rerollTeam: io.reroll, teamAssignments: Array.from({ length: 11 }, () => ({ name: CLUB, isNation: false })), cancelValidation: io.cancel };
}
function record(value?: unknown, age?: unknown): Row {
  if (arguments.length === 0) { value = 2000000; age = 26; }
  return Object.freeze({ player_name: NAME, name_folded: NAME.toLowerCase(), club: CLUB, nationality: 'Generated Nation',
    position: 'Goalkeeper', year: YEAR, market_value_usd: value, age });
}
function projected(row: Row): PickMeta {
  return { rawName: String(row.player_name), rawPosition: String(row.position), position: 'GK',
    club: String(row.club), nationality: String(row.nationality), value: typeof row.market_value_usd === 'number' ? row.market_value_usd : undefined,
    age: typeof row.age === 'number' ? row.age : undefined, year: typeof row.year === 'number' ? row.year : undefined };
}
function capture(key: Key, label: string) {
  const s = io.state, active = document.activeElement as HTMLElement | null;
  const frame = copy({ label, rows: io.rows, origin: { formation: s.formation, phase: s.phase, choice: s.draftChoice, slot: s.selectedPositionIndex, team: s.currentTeam },
    filled: s.filledSlots, filledCount: s.filledCount, body: document.body.textContent, html: document.body.innerHTML,
    dialogs: [...document.querySelectorAll('[role="alertdialog"],[role="dialog"]')].map(d => ({ role: d.getAttribute('role'), text: d.textContent })),
    inputs: [...document.querySelectorAll('input')].map(i => ({ value: i.value, disabled: i.disabled, connected: i.isConnected })),
    focus: { tag: active?.tagName, label: active?.getAttribute('aria-label'), text: active?.textContent, connected: active?.isConnected },
    scroll: { x: window.scrollX, y: window.scrollY }, calls: { submit: io.submit.mock.calls, evaluate: io.evaluate.mock.calls, complete: io.complete.mock.calls, season: io.season.mock.calls, completion: io.record.mock.calls },
    transport: { search: io.queries, other: io.other }, storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])) });
  (raw.cases[key] ??= { title: TITLES[key], frames: [] }).frames.push(frame); return frame;
}
async function flush() { await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); }); }
async function settleSearch() { await act(async () => { await vi.advanceTimersByTimeAsync(240); }); await flush(); }
function resetView() { cleanup(); io.state = snapshot(); io.rows = []; io.queries = []; io.other = []; vi.clearAllMocks(); io.submit.mockResolvedValue(undefined); }
async function mount(row: Row, mixed = false) {
  resetView(); io.rows = [row]; if (mixed) io.state = { ...io.state, draftChoice: { mode: 'mixed' } };
  const view = render(<MemoryRouter><LineupBuilder /></MemoryRouter>); await flush();
  const input = screen.getByRole('combobox') as HTMLInputElement;
  expect(input.disabled, 'XI_RECORD_WARNING_SETUP real search enabled').toBe(false);
  return { view, input };
}
async function pick(input: HTMLInputElement) {
  fireEvent.change(input, { target: { value: NAME } }); await settleSearch();
  const options = screen.queryAllByRole('option'), chosen = options.find(o => within(o).queryByText(displayName(NAME), { exact: true }));
  expect(chosen, 'XI_RECORD_WARNING_SETUP actual shared search offers fictional row').toBeDefined();
  fireEvent.click(chosen!); await flush();
}
function admissionQuiet(key: Key) {
  expect([io.submit.mock.calls.length, io.evaluate.mock.calls.length, io.complete.mock.calls.length, io.season.mock.calls.length, io.record.mock.calls.length, io.other.length], TITLES[key] + ' no admission/history/validator/simulation/completion').toEqual([0,0,0,0,0,0]);
}
function warning(key: Key) {
  const dialog = screen.queryByRole('alertdialog', { name: TITLE });
  capture(key, 'selected-before-owned-warning-assertion');
  expect(!!dialog, TITLES[key] + ' accessible warning before admission').toBe(true);
  admissionQuiet(key); return dialog!;
}
function storage() { return Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])); }
beforeEach(async () => {
  await act(async () => {});
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(Date.UTC(2026, 10, 5, 17));
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem('warning-unrelated', 'held');
  vi.stubGlobal('fetch', vi.fn((url: unknown) => { io.other.push({ fetch: String(url) }); return Promise.reject(new Error('Undeclared fixture fetch')); }));
  resetView();
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(() => {
  const destination = process.env.XI_RECORD_WARNING_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('XI_RECORD_WARNING_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(raw, (_key, v) => v === undefined ? { kind: 'undefined' } : typeof v === 'number' && !Number.isFinite(v) ? { kind: 'nonfinite', value: String(v) } : v, 2) + '\n', { flag: 'wx' });
});

describe('Build Your XI pre-commit incomplete-record warning', () => {
  for (const key of ['value', 'age'] as const) it(TITLES[key], async () => {
    const edges: [string, unknown][] = key === 'value' ? [['null', null], ['absent', undefined], ['zero', 0], ['negative', -1], ['NaN', NaN], ['infinite', Infinity], ['numeric string', '2000000']]
      : [['null', null], ['absent', undefined], ['NaN', NaN], ['infinite', Infinity], ['numeric string', '26']];
    const observed: unknown[] = [];
    for (const [edge, v] of edges) {
      const row = key === 'value' ? record(v, 26) : record(2000000, v), { input } = await mount(row); capture(key, edge + '-before');
      await pick(input); const dialog = screen.queryByRole('alertdialog', { name: TITLE }); capture(key, edge + '-selected');
      const text = dialog?.textContent ?? '';
      observed.push({ edge, warning: !!dialog, field: key === 'value' ? /market value/i.test(text) && !/market value and age/i.test(text) : /usable age/i.test(text) && !/market value/i.test(text),
        consequence: /unrated/i.test(text), name: text.includes(displayName(NAME)), year: text.includes(String(YEAR)), submits: io.submit.mock.calls.length });
      if (dialog) { fireEvent.click(within(dialog).getByRole('button', { name: KEEP })); await settleSearch(); }
    }
    expect(observed, TITLES[key]).toEqual(edges.map(([edge]) => ({ edge, warning: true, field: true, consequence: true, name: true, year: true, submits: 0 })));
  });
  it(TITLES.both, async () => {
    const { input } = await mount(record(null, null)); await pick(input); const dialog = warning('both');
    expect(dialog, TITLES.both).toHaveTextContent(/market value and age/i); expect(dialog).toHaveTextContent(/unrated/i);
    expect(within(dialog).getByRole('button', { name: KEEP })).toHaveFocus();
    for (const name of [KEEP, USE]) expect(within(dialog).getByRole('button', { name }).className, TITLES.both + ' 44px action').toMatch(/min-h-(?:11|\[44px\])/);
    capture('both', 'warning-fields-and-default-focus');
  });
  for (const key of ['cancel', 'escape'] as const) it(TITLES[key], async () => {
    const { input } = await mount(record(2000000, null)), beforeStorage = storage(), beforeFilled = copy(io.state.filledSlots);
    await pick(input); const dialog = warning(key);
    if (key === 'cancel') fireEvent.click(within(dialog).getByRole('button', { name: KEEP }));
    else fireEvent.keyDown(dialog, { key: 'Escape' });
    await settleSearch(); capture(key, 'dismissed-and-search-refocused');
    expect(screen.queryByRole('alertdialog'), TITLES[key] + ' dismissed').toBeNull();
    expect(input.isConnected && document.activeElement === input, TITLES[key] + ' connected live input focused').toBe(true);
    admissionQuiet(key); expect(copy(io.state.filledSlots)).toEqual(beforeFilled); expect(storage()).toEqual(beforeStorage);
  });
  it(TITLES.confirm, async () => {
    const row = record(0, undefined), original = copy(row), { input } = await mount(row); await pick(input); const dialog = warning('confirm');
    const button = within(dialog).getByRole('button', { name: USE });
    act(() => { fireEvent.click(button); fireEvent.click(button); }); await flush(); capture('confirm', 'confirmed-twice-in-one-batch');
    expect(io.submit.mock.calls, TITLES.confirm).toEqual([[displayName(NAME), projected(row)]]);
    expect(row).toEqual(original); expect(screen.queryByRole('alertdialog')).toBeNull();
    expect([io.season.mock.calls.length, io.record.mock.calls.length, io.other.length]).toEqual([0,0,0]);
  });
  it(TITLES.complete, async () => {
    const observed: unknown[] = [];
    for (const age of [26, 0, -2]) {
      const row = record(2000000, age), { input } = await mount(row); await pick(input); capture('complete', 'finite-age-' + age);
      observed.push({ age, dialog: !!screen.queryByRole('alertdialog'), calls: copy(io.submit.mock.calls) });
    }
    expect(observed, TITLES.complete).toEqual([26, 0, -2].map(age => ({ age, dialog: false, calls: [[displayName(NAME), projected(record(2000000, age))]] })));
  });
  it(TITLES.mixed, async () => {
    const row = record(null, null), { input } = await mount(row, true); await pick(input); capture('mixed', 'ordinary-mixed-selected');
    expect(screen.queryByRole('alertdialog'), TITLES.mixed).toBeNull(); expect(io.submit.mock.calls, TITLES.mixed).toEqual([[displayName(NAME), projected(row)]]);
  });
  for (const key of ['slot', 'team', 'year'] as const) it(TITLES[key], async () => {
    const { view, input } = await mount(record(null, 26)); await pick(input); warning(key);
    if (key === 'slot') io.state = { ...io.state, selectedPositionIndex: 1 };
    if (key === 'team') io.state = { ...io.state, currentTeam: { name: 'Generated Other Club', isNation: false } };
    if (key === 'year') io.state = { ...io.state, draftChoice: { mode: 'club-year', year: YEAR + 1 } };
    view.rerender(<MemoryRouter><LineupBuilder /></MemoryRouter>); await flush(); capture(key, 'controlled-origin-changed');
    expect(screen.queryByRole('alertdialog'), TITLES[key] + ' stale choice removed').toBeNull(); admissionQuiet(key);
    expect(io.state.filledSlots.size).toBe(1);
  });
  it(TITLES.reset, async () => {
    const { view, input } = await mount(record(null, 26)); await pick(input); warning('reset'); const original = io.state;
    io.state = { ...snapshot(), phase: 'formation', formation: null, selectedPositionIndex: null, currentTeam: null,
      filledSlots: new Map(), filledSlotsArray: [], filledCount: 0, teamAssignments: [] };
    view.rerender(<MemoryRouter><LineupBuilder /></MemoryRouter>); await flush(); capture('reset', 'controlled-reset-formation-snapshot');
    expect(screen.queryByRole('alertdialog'), TITLES.reset + ' reset drops choice').toBeNull();
    io.state = original; view.rerender(<MemoryRouter><LineupBuilder /></MemoryRouter>); await flush(); capture('reset', 'equal-origin-returned');
    expect(screen.queryByRole('alertdialog'), TITLES.reset + ' no revival').toBeNull(); admissionQuiet('reset');
  });
  it(TITLES.input, async () => {
    const { input } = await mount(record(null, 26)); await pick(input); warning('input');
    fireEvent.change(input, { target: { value: 'Generated Replacement Query' } }); await settleSearch(); capture('input', 'input-revision-changed');
    expect(screen.queryByRole('alertdialog'), TITLES.input + ' old candidate discarded').toBeNull(); admissionQuiet('input');
    expect(input.value).toBe('Generated Replacement Query');
  });
  it(TITLES.help, async () => {
    await mount(record()); const trigger = screen.getByRole('button', { name: 'How to play' });
    for (let n = 0; n < 2; n++) {
      fireEvent.click(trigger); await flush(); const dialog = screen.getByRole('dialog', { name: 'How to Play: Build Your XI' }); capture('help', 'help-open-' + n);
      const rule = within(dialog).queryByText(/Club year draft warns before you use a record with no usable value or age/);
      expect(rule, TITLES.help + ' choices before commitment').not.toBeNull(); expect(rule).toHaveTextContent(/Keep searching.*Use this unrated record/);
      expect(within(dialog).getByText(/Example: a matching record with a value but no age needs your confirmation/), TITLES.help + ' fictional worked example').toHaveTextContent(/Keep searching leaves the slot open.*original record.*XI stays unrated/);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Got it!' })); await flush();
    }
    admissionQuiet('help');
  });
});
