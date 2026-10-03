import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import RankEm from '@/pages/RankEm';
import { RANK_ROUNDS, getDailyRankRound, scoreRankGuess, RANK_POINTS_PER_SLOT } from '@/lib/orderTheList';
import { CIRCUIT_SAVE_KEY, createCircuit, parseCircuit, startCircuit, editCircuit, lockCircuit, advanceCircuit, circuitRound, circuitRoundById, circuitScore, loadCircuit, saveCircuit, type CircuitState } from '@/lib/rankEmCircuit';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const allowed = ['nba-pts', 'nba-reb', 'nba-blk', 'nba-gp', 'nhl-pts', 'nhl-ast', 'nhl-gp', 'mlb-hr', 'mlb-sb-circuit'];
const dailyKey = () => `rank-em-daily-${getTodayET()}`;
const fresh = () => createCircuit(getDailyRankRound().id, 123)!;
const names = (state: CircuitState) => circuitRound(state).items.map(item => item.name);
const orderFor = (state: CircuitState, correct: 0 | 3 | 5) => {
  const all = names(state);
  return correct === 5 ? all : correct === 3 ? [...all.slice(0, 3), all[4], all[3]] : [...all.slice(1), all[0]];
};
const answer = (state: CircuitState, count: 0 | 3 | 5) => lockCircuit(editCircuit(state, orderFor(state, count)));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const flush = async () => { await act(async () => {}); };
const saved = () => {
  const value = parseCircuit(localStorage.getItem(CIRCUIT_SAVE_KEY));
  expect(value).not.toBeNull();
  return value!;
};
async function mount() {
  const view = render(<HelmetProvider><MemoryRouter initialEntries={['/rank-em']}><RankEm /></MemoryRouter></HelmetProvider>);
  await flush(); return view;
}
type Page = Awaited<ReturnType<typeof mount>>;
const click = (view: Page, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
async function enter(view: Page, start = true) {
  click(view, 'Legends circuit'); await flush();
  if (start && view.queryByRole('button', { name: 'Start circuit' })) click(view, 'Start circuit');
  await flush();
}
function fill(view: Page, order: string[]) {
  for (const name of order) {
    const button = [...view.container.querySelectorAll<HTMLButtonElement>('[data-rank-player]')].find(element => element.dataset.rankPlayer === name);
    expect(button).toBeDefined(); fireEvent.click(button!);
  }
}
function next(view: Page) { click(view, saved().index === 2 ? 'View circuit results' : 'Next sport'); }

beforeEach(() => {
  localStorage.clear(); resetMocks(); consumeRestoredFinish('rank-em');
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-03T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Rank Em Legends circuit', () => {
  it('deals one completed-career board per sport without exposing the pinned daily', () => {
    const before = JSON.stringify(RANK_ROUNDS), seen = new Set<string>();
    for (const daily of RANK_ROUNDS) for (let seed = 0; seed < 30; seed++) {
      const state = createCircuit(daily.id, seed)!;
      expect(state.roundIds).toHaveLength(3);
      expect(state.roundIds).not.toContain(daily.id);
      expect(state.roundIds.map((_, index) => circuitRound(state, index).sport)).toEqual(['NBA', 'NHL', 'MLB']);
      if (daily.id === 'mlb-sb') expect(state.roundIds).not.toContain('mlb-sb-circuit');
      state.roundIds.forEach(id => { expect(allowed).toContain(id); seen.add(id); });
      expect(createCircuit(daily.id, seed)).toEqual(state);
      expect(parseCircuit(state)).toEqual(state);
    }
    expect([...seen].sort()).toEqual([...allowed].sort());
    expect(circuitRoundById('mlb-sb-circuit')!.items).toEqual([
      { name: 'Rickey Henderson', value: 1406 }, { name: 'Lou Brock', value: 938 },
      { name: 'Tim Raines', value: 808 }, { name: 'Vince Coleman', value: 752 }, { name: 'Kenny Lofton', value: 622 },
    ]);
    expect(JSON.stringify(RANK_ROUNDS)).toBe(before);
    expect(createCircuit('not-a-round', 1)).toBeNull();
    expect(createCircuit('nba-pts', -1)).toBeNull();
  });

  it('keeps editing quiet and locks exactly one valid permutation', () => {
    const intro = fresh(), state = startCircuit(intro), all = names(state);
    expect(lockCircuit(intro)).toBe(intro);
    expect(editCircuit(intro, all)).toBe(intro);
    expect(lockCircuit(state)).toBe(state);
    for (const draft of [[all[0], all[0]], ['invented player'], [...all, all[0]]]) expect(editCircuit(state, draft)).toBe(state);
    const edited = editCircuit(state, all);
    expect(edited.orders).toEqual([null, null, null]);
    expect(circuitScore(edited)).toBe(0);
    const locked = lockCircuit(edited);
    expect(locked.phase).toBe('reveal'); expect(locked.orders[0]).toEqual(all);
    expect(lockCircuit(locked)).toBe(locked);
    expect(editCircuit(locked, [...all].reverse())).toBe(locked);
    expect(state.drafts).toEqual([[], [], []]);
  });

  it('scores actual placements across three explicit reveals with finite advancement', () => {
    let state = startCircuit(fresh());
    expect(advanceCircuit(state)).toBe(state);
    for (const [index, count] of ([5, 3, 0] as const).entries()) {
      state = answer(state, count);
      expect(state.index).toBe(index); expect(state.phase).toBe('reveal');
      expect(circuitScore(state)).toBe(index === 0 ? 5 : 8);
      state = advanceCircuit(state);
      expect(state.phase).toBe(index === 2 ? 'done' : 'playing');
      expect(advanceCircuit(state)).toBe(state);
    }
    expect(circuitScore(state)).toBe(8);
    expect(parseCircuit(state)).toEqual(state);
  });

  it('rejects unreachable phases tampered orders invalid seeds and foreign names', () => {
    const base = fresh(), playing = startCircuit(base), reveal = answer(playing, 5);
    const invalid: unknown[] = [null, 'broken', [], {}, { ...base, v: 2 }, { ...base, score: 15 }, { ...base, index: 3 },
      { ...base, phase: 'done' }, { ...base, phase: 'reveal' }, { ...base, excludedDailyId: base.roundIds[0] },
      { ...base, seeds: [0, -1, 2] }, { ...base, seeds: [0, 1.5, 2] }, { ...base, seeds: [0, 1, Infinity] },
      { ...base, roundIds: [base.roundIds[1], base.roundIds[0], base.roundIds[2]] },
      { ...base, roundIds: ['nba-3pm', ...base.roundIds.slice(1)] },
      { ...playing, drafts: [['not in this board'], [], []] }, { ...playing, drafts: [[names(playing)[0], names(playing)[0]], [], []] },
      { ...playing, orders: [names(playing), null, null] }, { ...reveal, orders: [[...names(playing)].reverse(), null, null] },
      { ...playing, drafts: [[], ['future board guess'], []] }];
    for (const value of invalid) expect(parseCircuit(value)).toBeNull();
    const parsed = parseCircuit(reveal)!;
    parsed.drafts[0].reverse(); expect(reveal.drafts[0]).toEqual(names(playing));
  });

  it('round trips every reached phase without changing the saved deal at midnight', () => {
    let state = fresh(); const pinnedDaily = state.excludedDailyId;
    const check = () => { expect(saveCircuit(state)).toBe(true); expect(loadCircuit()).toEqual(state); expect(parseCircuit(JSON.stringify(state))).toEqual(state); };
    check(); state = startCircuit(state); state = editCircuit(state, names(state).slice(0, 2)); check();
    for (const count of [5, 3, 0] as const) { state = answer(state, count); check(); state = advanceCircuit(state); check(); }
    vi.setSystemTime(new Date('2026-10-04T16:00:00Z')); check();
    expect(state.excludedDailyId).toBe(pinnedDaily);
    expect(circuitScore(loadCircuit()!)).toBe(8);
  });

  it('handles unavailable storage without writing partial or invalid state', () => {
    const state = fresh();
    expect(saveCircuit({ ...state, phase: 'done' })).toBe(false);
    expect(localStorage.getItem(CIRCUIT_SAVE_KEY)).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveCircuit(state)).toBe(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
    expect(loadCircuit()).toBeNull();
  });

  it('shows worked instructions before play and safely reopens circuit rules', async () => {
    const view = await mount(); await enter(view, false);
    expect(view.getByRole('button', { name: 'Start circuit' })).toBeVisible();
    expect(view.container.querySelector('[data-circuit-phase="intro"]')).not.toBeNull();
    expect(view.queryByRole('button', { name: 'Lock order' })).toBeNull();
    click(view, 'Start circuit');
    fill(view, names(saved()));
    const lock = view.getByRole('button', { name: 'Lock order' });
    const before = clone(saved());
    click(view, 'Legends circuit rules');
    expect(view.getByRole('dialog')).toBeVisible();
    expect(view.getByRole('dialog').textContent).toMatch(/example/i);
    fireEvent.click(lock);
    expect(saved()).toEqual(before);
    fireEvent.keyDown(view.getByRole('dialog'), { key: 'Escape' }); await flush();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('retains factual reveals and earns eight of fifteen through the actual page', async () => {
    const view = await mount(); await enter(view);
    for (const [index, count] of ([5, 3, 0] as const).entries()) {
      const before = saved(), round = circuitRound(before);
      fill(view, orderFor(before, count)); click(view, 'Lock order');
      expect(saved().phase).toBe('reveal'); expect(saved().index).toBe(index);
      const panel = view.container.querySelector<HTMLElement>('[data-rank-circuit]')!;
      expect(panel).not.toBeNull();
      for (const item of round.items) { expect(panel.textContent).toContain(item.name); expect(panel.textContent).toContain(item.value.toLocaleString()); }
      expect(circuitScore(saved())).toBe(index === 0 ? 5 : 8);
      expect(view.queryByRole('button', { name: 'Lock order' })).toBeNull();
      next(view);
    }
    expect(saved().phase).toBe('done');
    expect(view.container.querySelector('[data-circuit-result]')?.textContent).toMatch(/8\s*\/\s*15/);
    expect(recordCompletion).not.toHaveBeenCalled(); expect(localStorage.getItem(dailyKey())).toBeNull();
  });

  it('restores a partial draft a reveal and a finished result through real remounts', async () => {
    let view = await mount(); await enter(view);
    const first = names(saved()); fill(view, first.slice(0, 2));
    const draft = clone(saved()); view.unmount(); view = await mount(); await enter(view);
    expect(saved()).toEqual(draft);
    expect([...view.container.querySelectorAll('[data-rank-name]')].slice(0, 2).map(node => node.textContent)).toEqual(first.slice(0, 2));
    fill(view, first.slice(2)); click(view, 'Lock order');
    const reveal = clone(saved()); view.unmount(); view = await mount(); await enter(view);
    expect(saved()).toEqual(reveal); expect(view.getByRole('button', { name: 'Next sport' })).toBeVisible();
    next(view);
    for (let index = 1; index < 3; index++) { fill(view, names(saved())); click(view, 'Lock order'); next(view); }
    const done = clone(saved()); view.unmount(); view = await mount(); await enter(view);
    expect(saved()).toEqual(done); expect(circuitScore(saved())).toBe(15);
    expect(view.getByRole('button', { name: 'Play another circuit' })).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves Daily bytes Unlimited play and circuit drafts when switching modes', async () => {
    const view = await mount(), daily = getDailyRankRound();
    fill(view, daily.items.map(item => item.name)); click(view, 'Lock order');
    const dailyBytes = localStorage.getItem(dailyKey()); expect(dailyBytes).not.toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    click(view, /Unlimited/); const choice = view.container.querySelector<HTMLButtonElement>('[data-rank-player]')!;
    const unlimitedPick = choice.getAttribute('data-rank-player');
    fireEvent.click(choice); click(view, 'Lock order'); expect(localStorage.getItem(dailyKey())).toBe(dailyBytes);
    await enter(view); fill(view, names(saved()).slice(0, 2)); const draft = clone(saved());
    click(view, /Unlimited/); expect(view.container.querySelector('[data-rank-name]')?.textContent).toBe(unlimitedPick);
    await enter(view); expect(saved()).toEqual(draft);
    click(view, /Daily/); expect(localStorage.getItem(dailyKey())).toBe(dailyBytes);
    await enter(view); expect(saved()).toEqual(draft);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('accepts one lock and one advance from same-frame repeated actions', async () => {
    const view = await mount(); await enter(view); fill(view, names(saved()));
    const lock = view.getByRole('button', { name: 'Lock order' });
    act(() => { fireEvent.click(lock); fireEvent.click(lock); });
    expect(saved().orders.filter(Boolean)).toHaveLength(1); expect(saved().phase).toBe('reveal');
    const advance = view.getByRole('button', { name: 'Next sport' });
    act(() => { fireEvent.click(advance); fireEvent.click(advance); });
    expect(saved().index).toBe(1); expect(saved().phase).toBe('playing');
    expect(saved().orders.filter(Boolean)).toHaveLength(1);
  });

  it('reviews completed sports and replays without inheriting points or answers', async () => {
    let state = startCircuit(fresh());
    for (const count of [5, 3, 0] as const) state = advanceCircuit(answer(state, count));
    saveCircuit(state);
    const view = await mount(); await enter(view);
    const before = localStorage.getItem(CIRCUIT_SAVE_KEY);
    click(view, 'Review NBA'); expect(view.container.textContent).toContain(circuitRound(state, 0).items[0].name);
    expect(localStorage.getItem(CIRCUIT_SAVE_KEY)).toBe(before);
    click(view, 'Back to circuit results');
    click(view, 'Play another circuit');
    expect(circuitScore(saved())).toBe(0); expect(saved().orders).toEqual([null, null, null]);
    expect(saved().drafts).toEqual([[], [], []]); expect(saved().index).toBe(0);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('recovers from a corrupt circuit without erasing unrelated or daily saves', async () => {
    localStorage.setItem(CIRCUIT_SAVE_KEY, '{"v":1,"score":999999}');
    localStorage.setItem('unrelated-game', 'held');
    const dailyBytes = JSON.stringify({ v: 1, date: getTodayET(), puzzleIndex: 0, guesses: [{ order: getDailyRankRound().items.map(item => item.name) }], gameStatus: 'won' });
    localStorage.setItem(dailyKey(), dailyBytes);
    const view = await mount(); await enter(view, false);
    expect(view.getByRole('button', { name: 'Start circuit' })).toBeVisible();
    expect(localStorage.getItem('unrelated-game')).toBe('held');
    expect(localStorage.getItem(dailyKey())).toBe(dailyBytes);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves the original daily score save and single completion independently', async () => {
    const round = getDailyRankRound(), order = round.items.map(item => item.name);
    const hook = renderHook(() => {
      const state = useDailyPuzzle<{ id: string }, { order: string[] }>({ gameSlug: 'rank-em', puzzles: [{ id: 'rank-em-daily' }], maxGuesses: 1,
        isWon: guesses => guesses.length > 0 && scoreRankGuess(guesses[0].order, round) === 5,
        isLost: guesses => guesses.length > 0 && scoreRankGuess(guesses[0].order, round) < 5,
        deserializeGuesses: raw => raw as { order: string[] }[] });
      useGameCompletion('rank-em', state.gameStatus !== 'playing', state.guesses.length ? scoreRankGuess(state.guesses[0].order, round) * RANK_POINTS_PER_SLOT : 0);
      return state;
    });
    await flush(); act(() => hook.result.current.addGuess({ order }));
    const expected = { v: 1, date: getTodayET(), puzzleIndex: 0, guesses: [{ order }], gameStatus: 'won' };
    expect(JSON.parse(localStorage.getItem(dailyKey())!)).toEqual(expected);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/rank-em', 1000, 'Tester', 0);
    act(() => hook.result.current.addGuess({ order: [...order].reverse() }));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(dailyKey())!)).toEqual(expected);
    expect(localStorage.getItem(CIRCUIT_SAVE_KEY)).toBeNull();
  });
});
