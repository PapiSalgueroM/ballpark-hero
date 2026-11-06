import { act, cleanup, fireEvent, render, renderHook, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { useConnections } from '@/hooks/useConnections';
import Connections from '@/pages/Connections';
import type { ConnectionDifficulty, ConnectionsPuzzle } from '@/types/connections';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const io = vi.hoisted(() => ({
  current: null as ReturnType<typeof import('@/hooks/useConnections').useConnections> | null,
  rows: [] as Record<string, unknown>[], transport: [] as unknown[], draws: [] as number[], completion: vi.fn(),
}));
vi.mock('@/hooks/useConnections', async original => {
  const actual = await original<typeof import('@/hooks/useConnections')>();
  return { ...actual, useConnections: () => { const value = actual.useConnections(); io.current = value; return value; } };
});
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key',
  supabase: { from: (table: string) => {
    if (table !== 'connections_puzzles') throw Error('Unexpected puzzle fixture table: ' + table);
    const steps: unknown[] = [];
    const query: any = { then: (yes: (value: unknown) => unknown, no?: (error: unknown) => unknown) => {
      const response = { data: JSON.parse(JSON.stringify(io.rows)), error: null };
      io.transport.push({ table, steps: JSON.parse(JSON.stringify(steps)), response });
      return Promise.resolve(response).then(yes, no);
    } };
    for (const method of ['select', 'order', 'range']) query[method] = (...args: unknown[]) => {
      steps.push({ method, args }); return query;
    };
    return query;
  } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.completion, getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: React.ReactNode; headerExtra?: React.ReactNode }) => <div>{headerExtra}{children}</div> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/connections/ConnectionsHowToPlay', () => ({ ConnectionsHowToPlay: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const POOL: ConnectionsPuzzle[] = ['A', 'B'].map(letter => ({
  id: 'fixture-connections-' + letter.toLowerCase(),
  groups: (['easy', 'medium', 'hard', 'insane'] as ConnectionDifficulty[]).map((difficulty, group) => ({
    category: 'Fixture ' + letter + ' group ' + (group + 1), difficulty,
    players: Array.from({ length: 4 }, (_, player) => 'Fixture ' + letter + String(group + 1) + String(player + 1)),
  })) as ConnectionsPuzzle['groups'],
}));
const TITLES = {
  forward: 'CONN_MODE_FORWARD clears the daily page selection before Unlimited can submit invisible names',
  reverse: 'CONN_MODE_REVERSE clears Unlimited selection before Daily can charge an invisible guess',
  forwardFeedback: 'CONN_MODE_FORWARD_FEEDBACK removes the abandoned daily refusal and one-away banner',
  reverseFeedback: 'CONN_MODE_REVERSE_FEEDBACK removes the abandoned Unlimited refusal on Daily',
  same: 'CONN_MODE_SAME keeps selection and feedback on an unchanged mode',
  progress: 'CONN_MODE_PROGRESS keeps both boards progress hints lives order storage and draw tape',
  daily: 'CONN_MODE_DAILY keeps a current daily match and genuine wrong guess',
  unlimited: 'CONN_MODE_UNLIMITED keeps a current Unlimited match and genuine wrong guess',
} as const;
type Key = keyof typeof TITLES;
let activeCase: Key | null = null, view: RenderResult | null = null;
const raw = { version: 1, unitClock: '2026-11-06T12:00:00Z',
  scope: 'Actual Soccer Connections hook, page/board, fetchConnectionsPuzzles/fetchAllRows and shared daily persistence. Only fictional Supabase transport and external shell/auth/completion boundaries are mocked. The two supplied boards have32 distinct fictional names. Daily selection and initial Unlimited draw remain real.',
  fictionalPool: POOL, cases: {} as Record<string, { title: string; frames: unknown[] }> };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const flush = async () => { await act(async () => {}); };
const current = () => { if (!io.current) throw Error('Connections fixture hook not mounted'); return io.current; };
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const dailyKey = () => 'connections-daily-' + getTodayET();
const dailyLog = (): unknown[] => { const bytes = localStorage.getItem(dailyKey()); return bytes ? JSON.parse(bytes).guesses : []; };
function capture(label: string) {
  const h = current(), submit = view ? within(view.container).queryByRole('button', { name: 'Submit' }) as HTMLButtonElement | null : null;
  const value = clone({
    label, state: { mode: h.mode, puzzle: h.puzzle, puzzleIndex: h.puzzleIndex, totalPuzzles: h.totalPuzzles, streak: h.streak,
      selected: h.selected, solvedGroups: h.solvedGroups, lives: h.lives, gameStatus: h.gameStatus, remainingPlayers: h.remainingPlayers,
      hintsUsed: h.hintsUsed, hintCategories: h.hintCategories, lastIncorrect: h.lastIncorrect, oneAway: h.oneAway,
      isLoading: h.isLoading, isLoadingPool: h.isLoadingPool },
    storage: storage(), dailyLog: dailyLog(), draws: io.draws, transport: io.transport, completions: io.completion.mock.calls,
    page: view ? { html: view.container.innerHTML, text: view.container.textContent, submitDisabled: submit?.disabled ?? null,
      oneAwayVisible: view.container.textContent?.includes('One away!') ?? false,
      selectedVisible: h.remainingPlayers.filter(name => within(view!.container).queryByRole('button', { name })?.classList.contains('bg-primary')) } : null,
  });
  if (!activeCase) throw Error('Connections capture case missing');
  (raw.cases[activeCase] ??= { title: TITLES[activeCase], frames: [] }).frames.push(value); return value;
}
const withoutLabel = (value: ReturnType<typeof capture>) => ({ ...value, label: null });
function mode(value: 'daily' | 'unlimited') {
  if (view) fireEvent.click(within(view.container).getByRole('button', { name: value === 'daily' ? '📅 Daily' : '∞ Unlimited' }));
  else act(() => current().switchMode(value));
}
function choose(names: string[]) {
  if (view) for (const name of names) fireEvent.click(within(view.container).getByRole('button', { name }));
  else act(() => { for (const name of names) current().togglePlayer(name); });
}
function submit() {
  if (view) fireEvent.click(within(view.container).getByRole('button', { name: 'Submit' }));
  else act(() => current().submitGuess());
}
async function mount(page = false) {
  if (page) view = render(<Connections />); else renderHook(() => useConnections());
  await flush();
  expect([current().isLoading, current().isLoadingPool], 'Real pool and daily state settle').toEqual([false, false]);
  expect(current().totalPuzzles, 'Real fetch parser receives the two fictional rows').toBe(2);
  const daily = POOL.find(p => p.id === current().puzzle.id);
  expect(daily, 'Daily uses a fetched fictional board').toBeDefined();
  // Deal the other supplied board through the existing Unlimited next-puzzle API.
  mode('unlimited'); if (current().puzzle.id === daily!.id) act(() => current().nextPuzzle());
  const unlimited = POOL.find(p => p.id === current().puzzle.id)!;
  expect(unlimited.id, 'The two actual active boards are disjoint').not.toBe(daily!.id);
  expect(new Set([...daily!.groups.flatMap(g => g.players), ...unlimited.groups.flatMap(g => g.players)]).size).toBe(32);
  mode('daily'); await flush(); capture('mounted-disjoint-boards');
  return { daily: daily!, unlimited };
}
const oneAwayNames = (puzzle: ConnectionsPuzzle) => [...puzzle.groups[0].players.slice(0, 3), puzzle.groups[1].players[0]];
function makeProgress(puzzle: ConnectionsPuzzle) {
  act(() => current().useHint()); choose(puzzle.groups[0].players); submit();
  choose([...puzzle.groups[1].players.slice(0, 2), ...puzzle.groups[2].players.slice(0, 2)]); submit();
  choose([puzzle.groups[1].players[0]]); choose([puzzle.groups[1].players[0]]);
  expect([current().solvedGroups.length, current().lives, current().hintsUsed], TITLES.progress).toEqual([1, 3, 1]);
  expect({ selected: current().selected, lastIncorrect: current().lastIncorrect, oneAway: current().oneAway }, TITLES.progress)
    .toEqual({ selected: [], lastIncorrect: null, oneAway: false });
}
beforeEach(async () => {
  await flush(); vi.clearAllMocks(); localStorage.clear();
  localStorage.setItem('connections-unrelated', 'held'); localStorage.setItem('connections-rules-seen', '1'); localStorage.setItem('connections-streak', '2');
  consumeRestoredFinish('connections'); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  io.current = null; io.transport = []; io.draws = []; view = null; activeCase = null;
  io.rows = POOL.map(p => ({ puzzle_id: p.id, groups_json: clone(p.groups) }));
  vi.spyOn(Math, 'random').mockImplementation(() => { io.draws.push(0); return 0; });
});
afterEach(() => {
  if (activeCase && io.current) capture('teardown-settled');
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.CONNECTIONS_MODE_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw Error('CONNECTIONS_MODE_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Connections board-owned mode transients', () => {
  it(TITLES.forward, async () => {
    activeCase = 'forward'; const boards = await mount(true); choose(boards.daily.groups[0].players); capture('daily-four-selected');
    mode('unlimited'); const before = capture('unlimited-before-submit'); submit(); const after = capture('unlimited-after-submit');
    expect(before.state.selected, TITLES.forward).toEqual([]); expect(before.page!.selectedVisible, TITLES.forward).toEqual([]);
    expect(before.page!.submitDisabled, TITLES.forward).toBe(true);
    expect(after.state.lives, TITLES.forward + ' no invisible-name penalty').toBe(4); expect(after.storage, TITLES.forward).toEqual(before.storage);
    expect(after.state.solvedGroups, TITLES.forward).toEqual([]); expect(after.draws, TITLES.forward).toEqual(before.draws);
  });
  it(TITLES.reverse, async () => {
    activeCase = 'reverse'; const boards = await mount(); mode('unlimited'); choose(boards.unlimited.groups[0].players); capture('unlimited-four-selected');
    mode('daily'); const before = capture('daily-before-submit'); submit(); const after = capture('daily-after-submit');
    expect(before.state.selected, TITLES.reverse).toEqual([]); expect(after.state.lives, TITLES.reverse + ' no invisible-name penalty').toBe(4);
    expect(after.storage, TITLES.reverse + ' full daily bytes held').toEqual(before.storage); expect(after.dailyLog, TITLES.reverse).toEqual([]);
    expect(after.state.solvedGroups, TITLES.reverse).toEqual([]); expect(after.draws, TITLES.reverse).toEqual(before.draws);
  });
  for (const direction of ['forwardFeedback', 'reverseFeedback'] as const) it(TITLES[direction], async () => {
    activeCase = direction; const boards = await mount(direction === 'forwardFeedback'), origin = direction === 'forwardFeedback' ? 'daily' : 'unlimited';
    mode(origin); const names = oneAwayNames(boards[origin]); choose(names); submit(); const refused = capture('origin-one-away-refusal');
    expect({ lives: refused.state.lives, selected: refused.state.selected, lastIncorrect: refused.state.lastIncorrect, oneAway: refused.state.oneAway }, 'Genuine current three-of-four refusal')
      .toEqual({ lives: 3, selected: [], lastIncorrect: names, oneAway: true });
    mode(origin === 'daily' ? 'unlimited' : 'daily'); const switched = capture('destination-after-feedback-switch');
    expect({ selected: switched.state.selected, lastIncorrect: switched.state.lastIncorrect, oneAway: switched.state.oneAway }, TITLES[direction])
      .toEqual({ selected: [], lastIncorrect: null, oneAway: false });
    if (switched.page) expect(switched.page.oneAwayVisible, TITLES[direction]).toBe(false);
    expect(switched.state.lives, TITLES[direction] + ' destination progress untouched').toBe(4);
    expect(switched.storage, TITLES[direction]).toEqual(refused.storage); expect(switched.draws, TITLES[direction]).toEqual(refused.draws);
  });
  it(TITLES.same, async () => {
    activeCase = 'same'; const boards = await mount();
    for (const origin of ['daily', 'unlimited'] as const) {
      mode(origin); choose(oneAwayNames(boards[origin])); submit(); const feedback = capture(origin + '-same-feedback-before');
      mode(origin); const feedbackAfter = capture(origin + '-same-feedback-after');
      expect(withoutLabel(feedbackAfter), TITLES.same + ' refusal state is a full no-op').toEqual(withoutLabel(feedback));
      choose(boards[origin].groups[1].players); const selection = capture(origin + '-same-selection-before');
      mode(origin); const selectionAfter = capture(origin + '-same-selection-after');
      expect(withoutLabel(selectionAfter), TITLES.same + ' four-name selection is a full no-op').toEqual(withoutLabel(selection));
      choose([...current().selected]);
    }
  });
  it(TITLES.progress, async () => {
    activeCase = 'progress'; const boards = await mount(); act(() => current().shufflePlayers()); makeProgress(boards.daily);
    const daily = capture('daily-progress'); mode('unlimited'); makeProgress(boards.unlimited); const unlimited = capture('unlimited-progress');
    mode('daily'); const dailyReturn = capture('daily-progress-return'); mode('unlimited'); const unlimitedReturn = capture('unlimited-progress-return');
    expect(withoutLabel(dailyReturn), TITLES.progress + ' full daily state and bytes survive').toEqual(withoutLabel(daily));
    expect(withoutLabel(unlimitedReturn), TITLES.progress + ' full Unlimited state and bytes survive').toEqual(withoutLabel(unlimited));
    const actions = [{ t: 'hint', cat: boards.daily.groups[0].category }, { t: 'ok', cat: boards.daily.groups[0].category }, { t: 'x' }];
    expect(daily.dailyLog, TITLES.progress).toEqual(actions);
    expect(JSON.parse(daily.storage[dailyKey()]!), TITLES.progress + ' actual daily codec remains unchanged')
      .toEqual({ v: 1, date: '2026-11-06', puzzleIndex: 0, puzzleId: boards.daily.id, guesses: actions, gameStatus: 'playing' });
    expect(io.completion, TITLES.progress).not.toHaveBeenCalled();
  });
  for (const origin of ['daily', 'unlimited'] as const) it(TITLES[origin], async () => {
    activeCase = origin; const boards = await mount(); mode(origin); const saved = storage(), draws = [...io.draws];
    choose(boards[origin].groups[0].players); submit(); const valid = capture('current-valid-match');
    const wrong = [...boards[origin].groups[1].players.slice(0, 3), boards[origin].groups[2].players[0]];
    choose(wrong); submit(); const invalid = capture('current-invalid-one-away');
    expect(valid.state.solvedGroups, TITLES[origin]).toEqual([boards[origin].groups[0]]); expect(valid.state.lives, TITLES[origin]).toBe(4);
    expect(valid.state.remainingPlayers, TITLES[origin]).toHaveLength(12);
    expect({ lives: invalid.state.lives, selected: invalid.state.selected, lastIncorrect: invalid.state.lastIncorrect, oneAway: invalid.state.oneAway }, TITLES[origin])
      .toEqual({ lives: 3, selected: [], lastIncorrect: wrong, oneAway: true });
    expect(invalid.state.solvedGroups, TITLES[origin]).toEqual([boards[origin].groups[0]]); expect(invalid.draws, TITLES[origin]).toEqual(draws);
    if (origin === 'daily') expect(invalid.dailyLog, TITLES.daily).toEqual([{ t: 'ok', cat: boards.daily.groups[0].category }, { t: 'x' }]);
    else expect(invalid.storage, TITLES.unlimited + ' full daily storage untouched').toEqual(saved);
    expect(io.completion, TITLES[origin]).not.toHaveBeenCalled();
  });
});
