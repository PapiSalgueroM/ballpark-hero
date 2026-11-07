import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

const fixture = vi.hoisted(() => ({
  puzzle: {
    id: 'fixture-selection-ownership',
    rows: [0, 1, 2].map(i => ({ type: 'club' as const, label: 'Fixture Row ' + i })),
    cols: [0, 1, 2].map(i => ({ type: 'club' as const, label: 'Fixture Column ' + i })),
  },
  fallback: {
    id: 'fixture-fallback-only',
    rows: [0, 1, 2].map(i => ({ type: 'club' as const, label: 'Fixture Fallback Row ' + i })),
    cols: [0, 1, 2].map(i => ({ type: 'club' as const, label: 'Fixture Fallback Column ' + i })),
  },
  players: [{ id: 'fixture-player-aster', player_name: 'Fixture Aster', nationality: 'Fixture Nation', position: 'Forward' }],
  seasons: [{ player_id: 'fixture-player-aster', season: 'Fixture Season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 1, market_value: 1, sort_order: 0 }],
  from: vi.fn(), invoke: vi.fn(), record: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/data/soccerGridPuzzles', () => ({ soccerGridPuzzles: [fixture.fallback] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fixture.from, functions: { invoke: fixture.invoke } } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => 'Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { error: fixture.toast, success: vi.fn() } }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra: ReactNode; children: ReactNode }) => <main>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

import SoccerGrid from '@/pages/SoccerGrid';

const NOW = Date.parse('2026-11-05T17:00:00Z');
const DAY = '2026-11-05';
const DAILY = 'soccer-grid-daily-' + DAY;
const A = 0, B = 4, PLAYER = 'Fixture Aster';
const A_PROMPT = ['Fixture Row 0', 'Fixture Column 0'];
const B_PROMPT = ['Fixture Row 1', 'Fixture Column 1'];
const RETRY = "Couldn't verify that answer, please try again.";
const CASES = [
  { key: 'aOnly', title: 'clears the only selected cell after an ordinary valid guess', verdict: 'valid', switchToB: false, marker: null },
  { key: 'valid', title: 'keeps a newer empty cell selected after the submitted cell is filled', verdict: 'valid', switchToB: true, marker: 'SG_SELECTION_VALID' },
  { key: 'unverified', title: 'keeps a newer empty cell selected after a free unverified answer', verdict: 'unverified', switchToB: true, marker: 'SG_SELECTION_UNVERIFIED' },
  { key: 'invalid', title: 'keeps a newer empty cell selected through a wrong guess and flash cleanup', verdict: 'invalid', switchToB: true, marker: 'SG_SELECTION_INVALID' },
] as const;
type Case = typeof CASES[number];
type Reply = { data: unknown; error: null; count?: number };
type Call = { method: string; args: unknown[] };
type Request = { key: string; at: number; calls: Call[]; settledAt: number | null; reply: Reply | null };
type View = ReturnType<typeof render>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const ok = (data: unknown): Reply => ({ data, error: null });
const replies = {
  valid: ok({ valid: true, fullName: PLAYER }),
  unverified: ok({ valid: false, unverified: true }),
  invalid: ok({ valid: false }),
};
const ordered = { ascending: true };
const call = (method: string, ...args: unknown[]): Call => ({ method, args });
const puzzleRows = [{ puzzle_id: fixture.puzzle.id, rows_json: fixture.puzzle.rows, cols_json: fixture.puzzle.cols }];
const readSpecs = {
  soccer_grid_puzzles: [call('select', 'puzzle_id, rows_json, cols_json'), call('order', 'sort_order', ordered)],
  career_players: [call('select', 'id, player_name, nationality, position'), call('order', 'player_name', ordered)],
  career_seasons: [call('select', 'player_id, season, club, goals, assists, appearances, market_value, sort_order'), call('order', 'player_id', ordered), call('order', 'sort_order', ordered), call('range', 0, 999)],
};
const rarityFilters = [call('eq', 'puzzle_id', fixture.puzzle.id), call('eq', 'cell_index', A)];
const raritySelect = call('select', '*', { count: 'exact', head: true });
const insertBody = { puzzle_id: fixture.puzzle.id, cell_index: A, player_name: PLAYER.toLowerCase() };
const validatorBody = { playerName: PLAYER, rowAttribute: A_PROMPT[0], colAttribute: A_PROMPT[1] };

let requests: Request[], unexpected: string[], writes: { at: number; area: string; key: string; value: string }[];
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
function reject(label: string): never {
  unexpected.push(label);
  throw new Error('SG_SELECTION_SETUP unexpected transport: ' + label);
}
function transport(key: string, calls: Call[], expected: Call[], reply: Promise<Reply> | Reply) {
  if (JSON.stringify(calls) !== JSON.stringify(expected) || requests.some(row => row.key === key)) reject(key + ' ' + JSON.stringify(calls));
  const row: Request = { key, at: Date.now(), calls: copy(calls), settledAt: null, reply: null };
  requests.push(row);
  return Promise.resolve(reply).then(value => {
    row.settledAt = Date.now();
    row.reply = copy(value);
    return copy(value);
  });
}
function installTransport(held: Promise<Reply>, test: Case) {
  fixture.invoke.mockImplementation((name: string, options: unknown) =>
    transport('validator', [call('invoke', name, options)], [call('invoke', 'soccer-grid-validate', { body: validatorBody })], held));
  fixture.from.mockImplementation((table: string) => {
    if (!Object.prototype.hasOwnProperty.call(readSpecs, table) && table !== 'soccer_grid_selections') reject(table);
    const from = call('from', table), calls: Call[] = [from];
    const query = {
      select: (...args: unknown[]) => { calls.push(call('select', ...args)); return query; },
      order: (...args: unknown[]) => { calls.push(call('order', ...args)); return query; },
      range: (...args: unknown[]) => { calls.push(call('range', ...args)); return query; },
      eq: (...args: unknown[]) => { calls.push(call('eq', ...args)); return query; },
      insert: (...args: unknown[]) => {
        if (table !== 'soccer_grid_selections' || test.verdict !== 'valid') reject('insert:' + table);
        return transport('insert', [...calls, call('insert', ...args)], [from, call('insert', insertBody)], ok(null));
      },
      then: (yes: (value: Reply) => unknown, no: (error: unknown) => unknown) => {
        if (table === 'soccer_grid_selections') {
          if (test.verdict !== 'valid') reject('rarity:' + test.verdict);
          const player = calls.some(step => step.args[0] === 'player_name');
          const expected = [from, raritySelect, ...rarityFilters, ...(player ? [call('eq', 'player_name', PLAYER.toLowerCase())] : [])];
          return transport(player ? 'rarityPlayer' : 'rarityTotal', calls, expected, { ...ok(null), count: 0 }).then(yes, no);
        }
        const data = table === 'soccer_grid_puzzles' ? puzzleRows : table === 'career_players' ? fixture.players : fixture.seasons;
        const spec = readSpecs[table as keyof typeof readSpecs];
        return transport(table, calls, [from, ...spec], ok(data)).then(yes, no);
      },
    };
    return query;
  });
}

const snapshot = (area: Storage) => Object.fromEntries(Object.keys(area).sort().map(key => [key, area.getItem(key)]));
const searchBox = (view: View) => view.queryByRole('combobox', { name: 'Search for a player' }) as HTMLInputElement | null;
const boardButtons = (view: View) => Array.from(view.container.querySelectorAll<HTMLButtonElement>('button[data-grid-cell-status]'));
function state(view: View | null) {
  const root = view?.container.querySelector('main') ?? null;
  const box = view ? searchBox(view) : null;
  const submit = box?.form?.querySelector<HTMLButtonElement>('button[type="submit"]') ?? null;
  const prompt = Array.from(root?.querySelectorAll('p') ?? []).find(node => node.textContent?.trim().startsWith('Find a player who:')) ?? null;
  const numberText = (prefix: string) => Array.from(root?.querySelectorAll('span') ?? []).find(node => node.textContent?.trim().startsWith(prefix))?.textContent?.trim() ?? null;
  const cells = view ? boardButtons(view).map((button, index) => ({
    index, status: button.dataset.gridCellStatus ?? null, selected: button.classList.contains('ring-2'), disabled: button.disabled,
    player: button.querySelector('[title]')?.getAttribute('title') ?? null, text: button.textContent, html: button.outerHTML,
  })) : [];
  return {
    at: Date.now(), timers: vi.getTimerCount(), mounted: root !== null, html: root?.outerHTML ?? null, cells,
    selected: cells.filter(cell => cell.selected).map(cell => cell.index),
    prompt: prompt ? { labels: Array.from(prompt.querySelectorAll('span'), node => node.textContent), text: prompt.textContent, html: prompt.outerHTML } : null,
    search: box ? { value: box.value, disabled: box.disabled, focused: document.activeElement === box, submitDisabled: submit?.disabled ?? null,
      options: Array.from(root?.querySelectorAll('[role="option"]') ?? [], node => ({ text: node.textContent, html: node.outerHTML })), html: box.form?.outerHTML ?? null } : null,
    correct: numberText('Correct:'), guessesLeft: numberText('Guesses left:'),
    storage: { local: snapshot(localStorage), session: snapshot(sessionStorage) },
    daily: localStorage.getItem(DAILY), writes: copy(writes), requests: copy(requests),
    toasts: copy(fixture.toast.mock.calls), completions: copy(fixture.record.mock.calls), unexpected: copy(unexpected),
  };
}
type Frame = ReturnType<typeof state> & { label: string };
type Action = { name: string; at: number; details: unknown };
type Capture = { key: Case['key']; title: string; verdict: Case['verdict']; switchToB: boolean; complete: boolean; error: string | null; frames: Frame[]; actions: Action[] };
const cases: Capture[] = [];
async function flush() { await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); }); }
async function tick(ms: number) { await act(async () => { vi.advanceTimersByTime(ms); }); }

beforeAll(() => {
  // JSDOM cannot scroll an option into view. Browser geometry is outside this unit run.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(async () => {
  await act(async () => {});
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(NOW);
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('sg-rules-seen', '1');
  localStorage.setItem('fixture-unrelated-local', 'held');
  sessionStorage.setItem('fixture-unrelated-session', 'held');
  await tick(0);
  requests = []; unexpected = []; writes = [];
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    writes.push({ at: Date.now(), area: this === localStorage ? 'local' : this === sessionStorage ? 'session' : 'other', key, value });
    setItem.call(this, key, value);
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
  const destination = process.env.SOCCER_GRID_SELECTION_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SOCCER_GRID_SELECTION_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify({ version: 1, fixture: { puzzle: fixture.puzzle, players: fixture.players, seasons: fixture.seasons },
    scope: 'Real Page, Board, Search, hook, Daily storage and read adapters. Fictional SDK replies and isolated shell. JSDOM events and fake unit time.', cases }) + '\n', { flag: 'wx' });
});

async function runCase(test: Case) {
  const evidence: Capture = { key: test.key, title: test.title, verdict: test.verdict, switchToB: test.switchToB, complete: false, error: null, frames: [], actions: [] };
  cases.push(evidence);
  let view: View | null = null;
  let release!: (reply: Reply) => void;
  const held = new Promise<Reply>(resolve => { release = resolve; });
  installTransport(held, test);
  const record = (name: string, details: unknown = null) => { evidence.actions.push({ name, at: Date.now(), details }); };
  const capture = (label: string) => {
    const frame = { label, ...state(view) };
    evidence.frames.push(frame);
    return frame;
  };
  let ready!: Frame, pendingA!: Frame, pendingB: Frame | null = null, settled!: Frame, flashCleared: Frame | null = null, closed!: Frame;
  try {
    capture('before-mount');
    record('mount');
    view = render(<SoccerGrid />);
    await flush();
    ready = capture('ready');
    expect(ready.cells.map(cell => cell.status), 'SG_SELECTION_SETUP actual fixture Board ready').toEqual(Array(9).fill('empty'));
    expect(ready.selected, 'SG_SELECTION_SETUP no selected cell at entry').toEqual([]);
    for (const attribute of [...fixture.puzzle.rows, ...fixture.puzzle.cols]) {
      expect(view.getByText(attribute.label, { exact: true }), 'SG_SELECTION_SETUP fetched Board criterion').toBeInTheDocument();
    }

    const buttonA = boardButtons(view)[A];
    record('select-a', { index: A, disabled: buttonA.disabled });
    fireEvent.click(buttonA);
    const selectedA = capture('a-selected');
    expect(selectedA.prompt?.labels, 'SG_SELECTION_SETUP actual A prompt').toEqual(A_PROMPT);
    const box = searchBox(view);
    expect(box, 'SG_SELECTION_SETUP actual A Search').not.toBeNull();
    record('type-a', { value: PLAYER });
    fireEvent.change(box!, { target: { value: PLAYER } });
    const queried = capture('a-query');
    const option = within(box!.form!).getByRole('option');
    expect(within(option).getByText(PLAYER, { exact: true }), 'SG_SELECTION_SETUP actual canonical fixture suggestion').toBeInTheDocument();
    expect(queried.search?.submitDisabled, 'SG_SELECTION_SETUP actual A submit available').toBe(false);

    record('submit-a', { name: PLAYER });
    fireEvent.submit(box!.form!);
    await flush();
    pendingA = capture('a-pending');
    if (test.switchToB) {
      const buttonB = boardButtons(view)[B];
      record('select-empty-b', { index: B, disabled: buttonB.disabled, status: buttonB.dataset.gridCellStatus });
      fireEvent.click(buttonB);
      pendingB = capture('b-selected-pending');
    }

    record('release-a', { verdict: test.verdict });
    await act(async () => { release(replies[test.verdict]); });
    await tick(0);
    settled = capture('a-settled');
    if (test.verdict === 'invalid') {
      record('advance-flash-timer', { milliseconds: 1500 });
      await tick(1500);
      flashCleared = capture('a-flash-cleared');
    }

    record('unmount');
    await act(async () => { view!.unmount(); });
    view = null;
    await tick(0);
    closed = capture('after-teardown');
    evidence.complete = true;
  } catch (error) {
    evidence.error = error instanceof Error ? error.name + ': ' + error.message : String(error);
    if (requests.some(row => row.key === 'validator' && row.settledAt === null)) {
      await act(async () => { release(replies.unverified); });
    }
    capture('setup-error');
    throw error;
  }

  expect(ready.requests.map(row => row.key).sort(), 'SG_SELECTION_SETUP actual puzzle and both career reads').toEqual(['career_players', 'career_seasons', 'soccer_grid_puzzles']);
  expect(ready.search).toBeNull();
  expect(ready.correct).toBe('Correct: 0/9');
  expect(ready.guessesLeft).toBe('Guesses left: 15');
  expect(pendingA.selected).toEqual([A]);
  expect(pendingA.prompt?.labels).toEqual(A_PROMPT);
  expect([pendingA.search?.disabled, pendingA.search?.submitDisabled, pendingA.search?.value]).toEqual([true, true, '']);
  expect(pendingA.requests.filter(row => row.settledAt === null).map(row => row.key)).toEqual(['validator']);
  if (pendingB) {
    expect([pendingB.cells[B].status, pendingB.cells[B].disabled]).toEqual(['empty', false]);
    expect(pendingB.selected).toEqual([B]);
    expect(pendingB.prompt?.labels).toEqual(B_PROMPT);
    expect([pendingB.search?.disabled, pendingB.search?.submitDisabled, pendingB.search?.value]).toEqual([true, true, '']);
    expect(pendingB.requests).toEqual(pendingA.requests);
  }

  const valid = test.verdict === 'valid';
  const wrong = test.verdict === 'invalid';
  const free = test.verdict === 'unverified';
  expect(settled.cells.map(cell => cell.status)).toEqual([valid ? 'correct' : wrong ? 'wrong' : 'empty', ...Array(8).fill('empty')]);
  expect(settled.cells[A].player).toBe(valid ? PLAYER : null);
  expect(settled.cells[A].disabled).toBe(valid);
  if (valid) expect(settled.cells[A].text).toContain('Only you!');
  expect(settled.correct).toBe(valid ? 'Correct: 1/9' : 'Correct: 0/9');
  expect(settled.guessesLeft).toBe(free ? 'Guesses left: 15' : 'Guesses left: 14');
  expect(settled.toasts).toEqual(free ? [[RETRY]] : []);
  expect(settled.requests.slice(3).map(row => row.key)).toEqual(valid ? ['validator', 'rarityTotal', 'rarityPlayer', 'insert'] : ['validator']);
  const expectedSave = free ? null : {
    v: 1, date: DAY, puzzleIndex: 0, puzzleId: fixture.puzzle.id, gameStatus: 'playing',
    guesses: valid ? [{ t: 'ok', cellIndex: A, playerName: PLAYER, rarity: 101 }] : [{ t: 'x' }],
  };
  expect(settled.daily === null ? null : JSON.parse(settled.daily)).toEqual(expectedSave);
  expect(settled.writes).toEqual(free ? [] : [{ at: NOW, area: 'local', key: DAILY, value: settled.daily }]);
  expect(settled.storage.session).toEqual(ready.storage.session);
  const heldLocal = { ...settled.storage.local };
  delete heldLocal[DAILY];
  expect(heldLocal).toEqual(ready.storage.local);
  if (flashCleared) {
    expect(flashCleared.cells.map(cell => cell.status)).toEqual(Array(9).fill('empty'));
    expect(flashCleared.guessesLeft).toBe('Guesses left: 14');
    expect(flashCleared.daily).toBe(settled.daily);
  }
  expect(closed.mounted).toBe(false);
  expect(closed.search).toBeNull();
  expect(closed.timers, 'SG_SELECTION_SETUP all work settled before fallback cleanup').toBe(0);
  expect(closed.requests.every(row => row.settledAt !== null)).toBe(true);
  expect(closed.requests).toEqual(settled.requests);
  expect(closed.storage).toEqual(settled.storage);
  expect(closed.completions).toEqual([]);
  expect(closed.unexpected, 'SG_SELECTION_SETUP no undeclared transport').toEqual([]);

  const selection = (frame: Frame) => ({
    selected: frame.selected, prompt: frame.prompt?.labels ?? null, searchEnabled: frame.search ? !frame.search.disabled : null,
  });
  if (test.marker) {
    const observed = [settled, ...(flashCleared ? [flashCleared] : [])].map(selection);
    const newerB = { selected: [B], prompt: B_PROMPT, searchEnabled: true };
    expect(observed, test.marker).toEqual(wrong ? [newerB, newerB] : [newerB]);
  } else {
    expect(selection(settled)).toEqual({ selected: [], prompt: null, searchEnabled: null });
  }
}

describe('Soccer Grid newer empty cell selection ownership', () => {
  for (const test of CASES) it(test.title, async () => { await runCase(test); });
});
