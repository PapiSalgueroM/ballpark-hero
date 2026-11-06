import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import Connections from '@/pages/Connections';
import type { ConnectionDifficulty, ConnectionsPuzzle } from '@/types/connections';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const io = vi.hoisted(() => ({
  current: null as ReturnType<typeof import('@/hooks/useConnections').useConnections> | null,
  rows: [] as Record<string, unknown>[], transport: [] as any[], pending: [] as (() => void)[], unexpected: [] as unknown[],
  draws: [] as number[], renders: [] as unknown[], storageOps: [] as unknown[], actions: [] as unknown[],
  completion: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/hooks/useConnections', async original => {
  const actual = await original<typeof import('@/hooks/useConnections')>();
  return { ...actual, useConnections: () => {
    const value = actual.useConnections(); io.current = value; io.renders.push(stateOf(value)); return value;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key',
  supabase: { from: (table: string) => {
    if (table !== 'connections_puzzles') { io.unexpected.push({ table }); throw Error('Unexpected Connections fixture table: ' + table); }
    const row = { table, steps: [] as unknown[], startedAt: Date.now(), consumed: false, settledAt: null as number | null, response: null as unknown };
    io.transport.push(row);
    let resolve!: (value: unknown) => void;
    const response = new Promise<unknown>(yes => { resolve = yes; });
    const query: any = {};
    for (const method of ['select', 'order', 'range']) query[method] = (...args: unknown[]) => { row.steps.push({ method, args }); return query; };
    query.then = (yes: (value: unknown) => unknown, no?: (error: unknown) => unknown) => {
      const exact = [{ method: 'select', args: ['puzzle_id, groups_json'] }, { method: 'order', args: ['sort_order', { ascending: true }] }, { method: 'range', args: [0, 999] }];
      if (JSON.stringify(row.steps) !== JSON.stringify(exact)) { io.unexpected.push({ table, steps: row.steps }); throw Error('Unexpected Connections fixture query'); }
      if (row.consumed) throw Error('Connections fixture query consumed twice'); row.consumed = true;
      io.pending.push(() => { row.response = { data: JSON.parse(JSON.stringify(io.rows)), error: null }; row.settledAt = Date.now(); resolve(row.response); });
      return response.then(yes, no);
    };
    return query;
  } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.completion, getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: React.ReactNode; headerExtra?: React.ReactNode }) => <div>{headerExtra}{children}</div> }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ headline, statLine, children, onPlayAgain, playAgainLabel, playNext }: {
  headline: React.ReactNode; statLine?: React.ReactNode; children?: React.ReactNode; onPlayAgain?: () => void; playAgainLabel?: string; playNext?: React.ReactNode;
}) => <section aria-label="Round result"><h2>{headline}</h2><p>{statLine}</p>{children}{onPlayAgain && <button type="button" onClick={onPlayAgain}>{playAgainLabel}</button>}{playNext}</section> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/connections/ConnectionsHowToPlay', () => ({ ConnectionsHowToPlay: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const POOL: ConnectionsPuzzle[] = ['A', 'B'].map(letter => ({
  id: 'fixture-streak-' + letter.toLowerCase(),
  groups: (['easy', 'medium', 'hard', 'insane'] as ConnectionDifficulty[]).map((difficulty, group) => ({
    category: 'Fixture Streak ' + letter + ' group ' + (group + 1), difficulty,
    players: Array.from({ length: 4 }, (_, player) => 'Fixture Streak ' + letter + String(group + 1) + String(player + 1)),
  })) as ConnectionsPuzzle['groups'],
}));
const TITLES = {
  current: 'CONN_STREAK_CURRENT preserves genuine settlements and a legitimate Unlimited retry',
  restore: 'CONN_STREAK_RESTORE preserves a nonterminal save same-mode views and unfinished round trips',
  unlimitedLost: 'CONN_STREAK_UNLIMITED_LOSS_PRESERVE keeps a later Daily win on a direct old Unlimited loss revisit',
  dailyWon: 'CONN_STREAK_DAILY_WIN_VIEW refuses extra streak credit from viewing a finished Daily win',
  unlimitedWon: 'CONN_STREAK_UNLIMITED_WIN_VIEW refuses extra streak credit from viewing a finished Unlimited win',
  dailyLost: 'CONN_STREAK_DAILY_LOSS_VIEW keeps an earned streak when an old Daily loss is viewed after Retry',
} as const;
type Key = keyof typeof TITLES;
const raw = { version: 1, unitClock: '2026-11-06T12:00:00Z',
  scope: 'Actual Connections hook, Page, Board, GiveUpButton, fetchConnectionsPuzzles/fetchAllRows, shared daily persistence, game completion hook and safeStorage. Only exact fictional query transport and external auth/completion/badge/shell/result/help/SEO boundaries are mocked. Result helper preserves Page-provided Retry callback and actual Next Puzzle child. Unit Date and global RNG/storage instrumentation only; no native, real-player, provider or backend-write claim. Initial baked fallback/loading observations remain explicit before the fictional pool resolves.',
  fictionalPool: POOL, cases: {} as Record<string, { title: string; frames: unknown[] }> };
let view: RenderResult | null = null, activeCase: Key | null = null, closed = false;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const flush = async () => { await act(async () => {}); };
const current = () => { if (!io.current) throw Error('Connections fixture hook not mounted'); return io.current; };
function stateOf(h: NonNullable<typeof io.current>) {
  return clone({ mode: h.mode, puzzle: h.puzzle, puzzleIndex: h.puzzleIndex, totalPuzzles: h.totalPuzzles, streak: h.streak,
    selected: h.selected, solvedGroups: h.solvedGroups, lives: h.lives, gameStatus: h.gameStatus, remainingPlayers: h.remainingPlayers,
    hintsUsed: h.hintsUsed, hintCategories: h.hintCategories, lastIncorrect: h.lastIncorrect, oneAway: h.oneAway,
    isLoading: h.isLoading, isLoadingPool: h.isLoadingPool });
}
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const dailyKey = () => 'connections-daily-' + getTodayET();
const dailyLog = () => { const bytes = localStorage.getItem(dailyKey()); return bytes ? JSON.parse(bytes).guesses as unknown[] : []; };
function capture(label: string) {
  if (!activeCase) throw Error('Connections streak capture case missing');
  const h = io.current, submit = view ? within(view.container).queryByRole('button', { name: 'Submit', exact: true }) as HTMLButtonElement | null : null;
  const active = document.activeElement as HTMLElement | null;
  const value = clone({ label, at: Date.now(), state: h ? stateOf(h) : null, storage: storage(), dailyLog: dailyLog(),
    storageOps: io.storageOps, draws: io.draws, transport: io.transport, unexpectedTransport: io.unexpected,
    pendingResponses: io.pending.length, renders: io.renders, actions: io.actions, completions: io.completion.mock.calls,
    page: view ? { html: view.container.innerHTML, text: view.container.textContent, submitDisabled: submit?.disabled ?? null,
      oneAwayVisible: view.container.textContent?.includes('One away!') ?? false,
      selectedVisible: h ? h.remainingPlayers.filter(name => within(view!.container).queryByRole('button', { name, exact: true })?.classList.contains('bg-primary')) : [],
      playerButtons: h ? h.remainingPlayers.filter(name => !!within(view!.container).queryByRole('button', { name, exact: true })) : [],
      resultHeadings: [...view.container.querySelectorAll('[aria-label="Round result"] h2')].map(node => node.textContent),
      buttons: [...view.container.querySelectorAll('button')].map(button => ({ text: button.textContent?.trim(), disabled: button.disabled })) } : null,
    focus: { tag: active?.tagName ?? null, id: active?.id ?? null, label: active?.getAttribute('aria-label') ?? null,
      text: active?.textContent ?? null, insidePage: !!view && !!active && view.container.contains(active) },
  });
  (raw.cases[activeCase] ??= { title: TITLES[activeCase], frames: [] }).frames.push(value); return value;
}
const observed = (frame: ReturnType<typeof capture>) => ({ state: frame.state, storage: frame.storage, dailyLog: frame.dailyLog,
  storageOps: frame.storageOps, draws: frame.draws, transport: frame.transport, unexpectedTransport: frame.unexpectedTransport,
  pendingResponses: frame.pendingResponses, completions: frame.completions, page: frame.page, focus: frame.focus });
async function click(name: string) {
  const before = stateOf(current()); fireEvent.click(within(view!.container).getByRole('button', { name, exact: true })); await flush();
  io.actions.push({ name, at: Date.now(), before, after: stateOf(current()) });
}
async function mode(value: 'daily' | 'unlimited') { await click(value === 'daily' ? '📅 Daily' : '∞ Unlimited'); }
async function choose(names: readonly string[]) { for (const name of names) await click(name); }
async function guess(names: readonly string[]) { await choose(names); await click('Submit'); }
async function solve(prefix: string) {
  const groups = [...current().puzzle.groups];
  const frames: ReturnType<typeof capture>[] = [];
  for (let index = 0; index < groups.length; index++) { await guess(groups[index].players); frames.push(capture(prefix + '-ok-' + (index + 1))); }
  return frames;
}
async function lose(prefix: string) {
  const groups = current().puzzle.groups, names = [...groups[0].players.slice(0, 2), ...groups[1].players.slice(0, 2)];
  const frames: ReturnType<typeof capture>[] = [];
  for (let index = 0; index < 4; index++) { await guess(names); frames.push(capture(prefix + '-x-' + (index + 1))); }
  return frames;
}
async function mount(prefix: string) {
  capture(prefix + '-before-mount'); view = render(<Connections />); await flush(); capture(prefix + '-pool-pending');
  const releases = io.pending.splice(0); await act(async () => { for (const release of releases) release(); }); await flush();
  const settled = capture(prefix + '-pool-settled');
  expect([current().isLoading, current().isLoadingPool, current().totalPuzzles], 'Connections fixture setup: actual pool settles').toEqual([false, false, 2]);
  expect(POOL.some(puzzle => puzzle.id === current().puzzle.id), 'Connections fixture setup: active puzzle is fetched fictional data').toBe(true);
  return settled;
}
async function unmount() { cleanup(); await flush(); view = null; io.current = null; }
async function closeCase() { await flush(); capture('teardown-before'); await unmount(); capture('teardown-after'); closed = true; }
const counterWrites = (frame: ReturnType<typeof capture>) => frame.storageOps.filter((op: any) => op.method === 'setItem' && op.key === 'connections-streak').map((op: any) => op.value);
const progress = (frame: ReturnType<typeof capture>) => {
  if (!frame.state) throw Error('Connections progress requires actual mounted state');
  const h = frame.state;
  return { mode: h.mode, puzzle: h.puzzle, solvedGroups: h.solvedGroups, lives: h.lives, gameStatus: h.gameStatus, hintsUsed: h.hintsUsed, hintCategories: h.hintCategories };
};

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  view = null; activeCase = null; closed = false; io.current = null; io.transport = []; io.pending = []; io.unexpected = [];
  io.draws = []; io.renders = []; io.storageOps = []; io.actions = [];
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem, clear = Storage.prototype.clear;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key: string, value: string) {
    io.storageOps.push({ method: 'setItem', key: String(key), value: String(value), at: Date.now() }); return set.call(this, key, value);
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (key: string) {
    io.storageOps.push({ method: 'removeItem', key: String(key), at: Date.now() }); return remove.call(this, key);
  });
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(function () { io.storageOps.push({ method: 'clear', at: Date.now() }); return clear.call(this); });
  localStorage.clear(); localStorage.setItem('connections-unrelated', 'held'); localStorage.setItem('connections-rules-seen', '1'); localStorage.setItem('connections-streak', '2');
  consumeRestoredFinish('connections'); io.rows = POOL.map(puzzle => ({ puzzle_id: puzzle.id, groups_json: clone(puzzle.groups) }));
  vi.spyOn(Math, 'random').mockImplementation(() => { io.draws.push(0); return 0; });
  vi.stubGlobal('fetch', vi.fn((...args: unknown[]) => { io.unexpected.push({ fetch: args.map(String) }); throw Error('Unexpected unbounded Connections fetch'); }));
});
afterEach(async () => {
  if (activeCase && !closed) await closeCase();
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.CONNECTIONS_STREAK_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw Error('CONNECTIONS_STREAK_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Connections owns streak settlements by the run that finished', () => {
  it(TITLES.current, async () => {
    activeCase = 'current'; const initial = await mount('current');
    await click('Hint (4)'); const hinted = capture('current-daily-hint');
    const daily = clone(current().puzzle), wrong = [...daily.groups[0].players.slice(0, 3), daily.groups[1].players[0]];
    await guess(wrong); const missed = capture('current-daily-miss');
    const dailyWins = await solve('current-daily'), won = dailyWins[3];
    await mode('daily'); const sameDaily = capture('current-daily-won-same-mode');
    await mode('unlimited'); const fresh = capture('current-unlimited-fresh');
    const losses = await lose('current-unlimited'), lost = losses[3];
    await click('Retry'); const retry = capture('current-unlimited-retry');
    const retryWins = await solve('current-retry'), retryWon = retryWins[3];
    await click('Next Puzzle'); const next = capture('current-unlimited-next');
    await mode('unlimited'); const sameNext = capture('current-next-same-mode');
    await closeCase();
    expect(initial.state!.streak, TITLES.current).toBe(2);
    expect([hinted.state!.hintsUsed, hinted.state!.hintCategories], TITLES.current).toEqual([1, [daily.groups[0].category]]);
    expect({ lives: missed.state!.lives, selected: missed.state!.selected, lastIncorrect: missed.state!.lastIncorrect, oneAway: missed.state!.oneAway }, TITLES.current)
      .toEqual({ lives: 3, selected: [], lastIncorrect: wrong, oneAway: true });
    expect(missed.page!.oneAwayVisible, TITLES.current).toBe(true);
    expect([won.state!.gameStatus, won.state!.streak, won.state!.lives, won.state!.solvedGroups, won.state!.hintsUsed], TITLES.current)
      .toEqual(['won', 3, 3, daily.groups, 1]);
    expect(observed(sameDaily), TITLES.current + ' same-mode result is a public no-op').toEqual(observed(won));
    expect([fresh.state!.gameStatus, fresh.state!.streak, fresh.state!.lives, fresh.state!.solvedGroups, fresh.state!.hintsUsed], TITLES.current)
      .toEqual(['playing', 3, 4, [], 0]);
    expect(losses.map(frame => [frame.state!.lives, frame.state!.gameStatus, frame.state!.streak]), TITLES.current)
      .toEqual([[3, 'playing', 3], [2, 'playing', 3], [1, 'playing', 3], [0, 'lost', 0]]);
    expect([retry.state!.puzzle, retry.state!.gameStatus, retry.state!.streak, retry.state!.lives, retry.state!.solvedGroups, retry.state!.selected, retry.state!.lastIncorrect, retry.state!.oneAway], TITLES.current)
      .toEqual([lost.state!.puzzle, 'playing', 0, 4, [], [], null, false]);
    expect([retryWon.state!.gameStatus, retryWon.state!.streak, retryWon.state!.solvedGroups, retryWon.state!.lives], TITLES.current)
      .toEqual(['won', 1, retry.state!.puzzle.groups, 4]);
    expect([next.state!.gameStatus, next.state!.streak, next.state!.lives, next.state!.solvedGroups, next.state!.hintsUsed, next.state!.puzzleIndex], TITLES.current)
      .toEqual(['playing', 1, 4, [], 0, retry.state!.puzzleIndex + 1]);
    expect(next.state!.puzzle.id, TITLES.current).not.toBe(retry.state!.puzzle.id);
    expect(observed(sameNext), TITLES.current + ' same-mode next board is a public no-op').toEqual(observed(next));
    expect(sameNext.draws, TITLES.current + ' retry and next do not invent global draws').toEqual(initial.draws);
    expect(counterWrites(sameNext), TITLES.current).toEqual(['2', '3', '0', '1']);
    expect(sameNext.completions, TITLES.current + ' actual Daily-only completion policy').toEqual([['/connections', 750, 'Fixture Manager', 0]]);
    expect(sameNext.dailyLog, TITLES.current).toEqual([{ t: 'hint', cat: daily.groups[0].category }, { t: 'x' }, ...daily.groups.map(group => ({ t: 'ok', cat: group.category }))]);
  });

  it(TITLES.restore, async () => {
    activeCase = 'restore'; const initial = await mount('restore');
    const daily = clone(current().puzzle);
    await click('Hint (4)'); const dailyHint = capture('restore-daily-hint');
    await guess(daily.groups[0].players); const dailyGroup = capture('restore-daily-group');
    const dailyWrong = [...daily.groups[1].players.slice(0, 3), daily.groups[2].players[0]];
    await guess(dailyWrong); const dailyMiss = capture('restore-daily-miss');
    await click('Shuffle'); const shuffled = capture('restore-daily-shuffled');
    await choose(daily.groups[1].players.slice(0, 2)); const selected = capture('restore-daily-selection');
    await mode('daily'); const same = capture('restore-daily-same-mode');
    await mode('unlimited'); const unlimitedStart = capture('restore-unlimited-start'), unlimited = clone(current().puzzle);
    await click('Hint (4)'); const unlimitedHint = capture('restore-unlimited-hint');
    await guess(unlimited.groups[0].players); const unlimitedGroup = capture('restore-unlimited-group');
    const unlimitedWrong = [...unlimited.groups[1].players.slice(0, 2), ...unlimited.groups[2].players.slice(0, 2)];
    await guess(unlimitedWrong); const unlimitedMiss = capture('restore-unlimited-miss');
    await mode('daily'); const dailyReturn = capture('restore-daily-return');
    await mode('unlimited'); const unlimitedReturn = capture('restore-unlimited-return');
    await mode('daily'); const beforeRemount = capture('restore-daily-before-remount');
    await unmount(); const restored = await mount('restore-remount');
    await mode('daily'); const restoredSame = capture('restore-remount-same-mode');
    await mode('unlimited'); const remountedUnlimited = capture('restore-remount-unlimited-fresh');
    await mode('daily'); const restoredReturn = capture('restore-remount-daily-return');
    await closeCase();
    expect([dailyHint.state!.hintsUsed, dailyGroup.state!.solvedGroups, dailyMiss.state!.lives, dailyMiss.state!.oneAway], TITLES.restore)
      .toEqual([1, [daily.groups[0]], 3, true]);
    expect(shuffled.state!.remainingPlayers, TITLES.restore).not.toEqual(dailyMiss.state!.remainingPlayers);
    expect([...shuffled.state!.remainingPlayers].sort(), TITLES.restore).toEqual([...dailyMiss.state!.remainingPlayers].sort());
    expect(selected.state!.selected, TITLES.restore).toEqual(daily.groups[1].players.slice(0, 2));
    expect(observed(same), TITLES.restore + ' same-mode selection is retained').toEqual(observed(selected));
    expect(progress(dailyReturn), TITLES.restore + ' current Daily board progress survives mode view').toEqual(progress(same));
    expect(dailyReturn.state!.remainingPlayers, TITLES.restore).toEqual(same.state!.remainingPlayers);
    expect({ selected: dailyReturn.state!.selected, lastIncorrect: dailyReturn.state!.lastIncorrect, oneAway: dailyReturn.state!.oneAway }, TITLES.restore)
      .toEqual({ selected: [], lastIncorrect: null, oneAway: false });
    expect([unlimitedStart.state!.gameStatus, unlimitedHint.state!.hintsUsed, unlimitedGroup.state!.solvedGroups, unlimitedMiss.state!.lives, unlimitedMiss.state!.oneAway], TITLES.restore)
      .toEqual(['playing', 1, [unlimited.groups[0]], 3, false]);
    expect(progress(unlimitedReturn), TITLES.restore + ' current Unlimited board progress survives mode view').toEqual(progress(unlimitedMiss));
    expect(unlimitedReturn.state!.remainingPlayers, TITLES.restore).toEqual(unlimitedMiss.state!.remainingPlayers);
    expect(progress(restored), TITLES.restore + ' actual saved nonterminal Daily progress reloads').toEqual(progress(beforeRemount));
    expect(restored.storage, TITLES.restore + ' restore does not rewrite any saved bytes').toEqual(beforeRemount.storage);
    expect(restored.storageOps, TITLES.restore + ' loading and restore do not add storage operations').toEqual(beforeRemount.storageOps);
    expect(observed(restoredSame), TITLES.restore + ' same-mode restored board is retained').toEqual(observed(restored));
    expect([remountedUnlimited.state!.gameStatus, remountedUnlimited.state!.lives, remountedUnlimited.state!.solvedGroups, remountedUnlimited.state!.hintsUsed], TITLES.restore)
      .toEqual(['playing', 4, [], 0]);
    expect(progress(restoredReturn), TITLES.restore).toEqual(progress(restored));
    expect(restoredReturn.state!.remainingPlayers, TITLES.restore).toEqual(restored.state!.remainingPlayers);
    const log = [{ t: 'hint', cat: daily.groups[0].category }, { t: 'ok', cat: daily.groups[0].category }, { t: 'x' }];
    expect(restoredReturn.dailyLog, TITLES.restore).toEqual(log);
    expect(JSON.parse(restoredReturn.storage[dailyKey()]!), TITLES.restore + ' actual shared daily codec').toEqual({ v: 1, date: '2026-11-06', puzzleIndex: 0, puzzleId: daily.id, guesses: log, gameStatus: 'playing' });
    expect(restoredReturn.storage, TITLES.restore).toEqual(dailyMiss.storage);
    expect(restoredReturn.state!.streak, TITLES.restore).toBe(initial.state!.streak);
    expect(counterWrites(restoredReturn), TITLES.restore).toEqual(['2']);
    expect(restoredReturn.completions, TITLES.restore).toEqual([]);
    expect(unlimitedReturn.draws, TITLES.restore + ' mode views do not add global RNG calls').toEqual(initial.draws);
    expect(restoredReturn.draws, TITLES.restore + ' mode views after remount keep the complete new tape').toEqual(restored.draws);
  });

  it(TITLES.unlimitedLost, async () => {
    activeCase = 'unlimitedLost'; await mount('uloss-preserve');
    await mode('unlimited'); const start = capture('uloss-preserve-unlimited-start');
    const losses = await lose('uloss-preserve'), lost = losses[3];
    await mode('unlimited'); const sameLost = capture('uloss-preserve-lost-same-mode');
    await mode('daily'); const dailyStart = capture('uloss-preserve-daily-start');
    const wins = await solve('uloss-preserve-daily'), won = wins[3];
    await mode('unlimited'); const returned = capture('uloss-preserve-direct-loss-return');
    await mode('unlimited'); const sameReturn = capture('uloss-preserve-return-same-mode');
    await mode('daily'); const dailyReturn = capture('uloss-preserve-daily-won-return');
    await mode('unlimited'); const returnedAgain = capture('uloss-preserve-loss-return-again');
    await closeCase();
    expect([start.state!.streak, lost.state!.gameStatus, lost.state!.streak, dailyStart.state!.gameStatus, won.state!.gameStatus, won.state!.streak], TITLES.unlimitedLost)
      .toEqual([2, 'lost', 0, 'playing', 'won', 1]);
    expect(observed(sameLost), TITLES.unlimitedLost + ' same-mode old loss is a no-op').toEqual(observed(lost));
    expect([returned.state!.streak, sameReturn.state!.streak, dailyReturn.state!.streak, returnedAgain.state!.streak], TITLES.unlimitedLost).toEqual([1, 1, 1, 1]);
    expect(progress(returned), TITLES.unlimitedLost + ' old loss is unchanged').toEqual(progress(lost));
    expect(progress(returnedAgain), TITLES.unlimitedLost).toEqual(progress(lost));
    expect(progress(dailyReturn), TITLES.unlimitedLost).toEqual(progress(won));
    expect(observed(sameReturn), TITLES.unlimitedLost + ' same-mode returned loss is a no-op').toEqual(observed(returned));
    expect(returnedAgain.storage, TITLES.unlimitedLost + ' all storage bytes hold after genuine Daily win').toEqual(won.storage);
    expect(returnedAgain.storageOps, TITLES.unlimitedLost).toEqual(won.storageOps);
    expect(returnedAgain.dailyLog, TITLES.unlimitedLost).toEqual(won.dailyLog);
    expect(counterWrites(returnedAgain), TITLES.unlimitedLost).toEqual(['2', '0', '1']);
    expect(returnedAgain.completions, TITLES.unlimitedLost + ' actual Daily-only completion policy').toEqual([['/connections', 1000, 'Fixture Manager', 0]]);
    expect(returnedAgain.draws, TITLES.unlimitedLost).toEqual(start.draws);
  });

  it(TITLES.dailyWon, async () => {
    activeCase = 'dailyWon'; await mount('daily-won');
    const wins = await solve('daily-won'), earned = wins[3];
    await mode('daily'); const same = capture('daily-won-same-mode');
    await mode('unlimited'); const other = capture('daily-won-other-playing');
    await mode('daily'); const returned = capture('daily-won-revisit');
    await mode('unlimited'); const otherAgain = capture('daily-won-other-playing-again');
    await mode('daily'); const returnedAgain = capture('daily-won-revisit-again');
    await closeCase();
    expect(returned.state!.streak, TITLES.dailyWon + ' first result view keeps the genuinely earned streak').toBe(earned.state!.streak);
    expect(returnedAgain.state!.streak, TITLES.dailyWon + ' repeated result views cannot farm streak credit').toBe(earned.state!.streak);
    expect([earned.state!.streak, earned.state!.gameStatus, earned.state!.solvedGroups.length, other.state!.gameStatus, otherAgain.state!.gameStatus], TITLES.dailyWon).toEqual([3, 'won', 4, 'playing', 'playing']);
    expect(observed(same), TITLES.dailyWon + ' same-mode result stays held').toEqual(observed(earned));
    expect(progress(returned), TITLES.dailyWon).toEqual(progress(earned));
    expect(progress(returnedAgain), TITLES.dailyWon).toEqual(progress(earned));
    expect(returnedAgain.dailyLog, TITLES.dailyWon + ' no new guesses were made').toEqual(earned.dailyLog);
    expect(returnedAgain.storage, TITLES.dailyWon + ' full saved bytes hold').toEqual(earned.storage);
    expect(returnedAgain.storageOps, TITLES.dailyWon + ' a view does not write a new settlement').toEqual(earned.storageOps);
    expect(counterWrites(returnedAgain), TITLES.dailyWon).toEqual(['2', '3']);
    expect(returnedAgain.completions, TITLES.dailyWon + ' actual Daily completion stays once').toEqual([['/connections', 1000, 'Fixture Manager', 0]]);
    expect(returnedAgain.draws, TITLES.dailyWon).toEqual(earned.draws);
  });

  it(TITLES.unlimitedWon, async () => {
    activeCase = 'unlimitedWon'; await mount('unlimited-won');
    await mode('unlimited'); const start = capture('unlimited-won-start');
    const wins = await solve('unlimited-won'), earned = wins[3];
    await mode('unlimited'); const same = capture('unlimited-won-same-mode');
    await mode('daily'); const other = capture('unlimited-won-other-playing');
    await mode('unlimited'); const returned = capture('unlimited-won-revisit');
    await mode('daily'); const otherAgain = capture('unlimited-won-other-playing-again');
    await mode('unlimited'); const returnedAgain = capture('unlimited-won-revisit-again');
    await closeCase();
    expect(returned.state!.streak, TITLES.unlimitedWon + ' first result view keeps the genuinely earned streak').toBe(earned.state!.streak);
    expect(returnedAgain.state!.streak, TITLES.unlimitedWon + ' repeated result views cannot farm streak credit').toBe(earned.state!.streak);
    expect([start.state!.streak, earned.state!.streak, earned.state!.gameStatus, earned.state!.solvedGroups.length, other.state!.gameStatus, otherAgain.state!.gameStatus], TITLES.unlimitedWon).toEqual([2, 3, 'won', 4, 'playing', 'playing']);
    expect(observed(same), TITLES.unlimitedWon + ' same-mode result stays held').toEqual(observed(earned));
    expect(progress(returned), TITLES.unlimitedWon).toEqual(progress(earned));
    expect(progress(returnedAgain), TITLES.unlimitedWon).toEqual(progress(earned));
    expect(returnedAgain.storage, TITLES.unlimitedWon + ' full saved bytes hold').toEqual(earned.storage);
    expect(returnedAgain.storageOps, TITLES.unlimitedWon + ' a view does not write a new settlement').toEqual(earned.storageOps);
    expect(counterWrites(returnedAgain), TITLES.unlimitedWon).toEqual(['2', '3']);
    expect(returnedAgain.dailyLog, TITLES.unlimitedWon).toEqual([]);
    expect(returnedAgain.completions, TITLES.unlimitedWon + ' unchanged Daily-only completion policy does not record Unlimited').toEqual([]);
    expect(returnedAgain.draws, TITLES.unlimitedWon).toEqual(earned.draws);
  });

  it(TITLES.dailyLost, async () => {
    activeCase = 'dailyLost'; await mount('daily-lost');
    const losses = await lose('daily-lost'), lost = losses[3];
    await mode('daily'); const sameLost = capture('daily-lost-same-mode');
    await mode('unlimited'); const other = capture('daily-lost-other-start');
    const wins = await solve('daily-lost-other'), earned = wins[3];
    await click('Retry'); const retry = capture('daily-lost-other-retry');
    await mode('daily'); const returned = capture('daily-lost-revisit');
    await mode('unlimited'); const otherAgain = capture('daily-lost-other-playing-again');
    await mode('daily'); const returnedAgain = capture('daily-lost-revisit-again');
    await closeCase();
    expect(returned.state!.streak, TITLES.dailyLost + ' old loss view keeps the later genuinely earned positive streak').toBe(earned.state!.streak);
    expect(returnedAgain.state!.streak, TITLES.dailyLost + ' repeated old loss views do not erase earned streak').toBe(earned.state!.streak);
    expect([lost.state!.gameStatus, lost.state!.streak, other.state!.gameStatus, earned.state!.gameStatus, earned.state!.streak], TITLES.dailyLost).toEqual(['lost', 0, 'playing', 'won', 1]);
    expect(observed(sameLost), TITLES.dailyLost + ' same-mode loss stays held').toEqual(observed(lost));
    expect([retry.state!.gameStatus, retry.state!.streak, retry.state!.puzzle, retry.state!.solvedGroups, retry.state!.lives, otherAgain.state!.gameStatus], TITLES.dailyLost)
      .toEqual(['playing', 1, earned.state!.puzzle, [], 4, 'playing']);
    expect(progress(returned), TITLES.dailyLost).toEqual(progress(lost));
    expect(progress(returnedAgain), TITLES.dailyLost).toEqual(progress(lost));
    expect(returnedAgain.dailyLog, TITLES.dailyLost + ' old loss log stays complete and unchanged').toEqual(lost.dailyLog);
    expect(returnedAgain.storage, TITLES.dailyLost + ' full saved bytes hold after genuine Unlimited win').toEqual(earned.storage);
    expect(returnedAgain.storageOps, TITLES.dailyLost + ' viewing an old loss does not resettle it').toEqual(earned.storageOps);
    expect(counterWrites(returnedAgain), TITLES.dailyLost).toEqual(['2', '0', '1']);
    expect(returnedAgain.completions, TITLES.dailyLost + ' actual Daily-only loss completion stays once').toEqual([['/connections', 0, 'Fixture Manager', 0]]);
    expect(returnedAgain.draws, TITLES.dailyLost).toEqual(earned.draws);
  });
});
