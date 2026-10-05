import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Footle from '@/pages/Footle';
import { useGame } from '@/hooks/useGame';
import { compareGuess } from '@/lib/gameLogic';
import { dailyIndex, getDailyTier, getTodayET } from '@/lib/dateUtils';
import { normalizeName } from '@/lib/playerSearch';
import { createPracticeRun, FOOTLE_PRACTICE_KEY } from '@/lib/footlePracticeRun';
import { createUnlimitedSession, FOOTLE_UNLIMITED_KEY, parseUnlimitedSession, selectUnlimitedTier } from '@/lib/footleUnlimitedSession';
import { practicePlayers } from '@/test/fixtures/footlePracticePlayers';
import type { Difficulty, GuessResult, Player } from '@/types/game';

const fixture = vi.hoisted(() => ({ pool: [] as Player[], fetch: vi.fn(), completion: vi.fn() }));
vi.mock('@/lib/fetchFootlePlayerPool', () => ({ fetchFootlePlayerPool: () => fixture.fetch() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: (...args: unknown[]) => fixture.completion(...args) }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ headerExtra, children }: { headerExtra: ReactNode; children: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('footle-rules-seen', '1');
  fixture.pool = practicePlayers.map(player => ({ ...player }));
  fixture.fetch.mockReset().mockImplementation(() => Promise.resolve(fixture.pool.map(player => ({ ...player }))));
  fixture.completion.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const dailyKey = () => `footle-daily-${getTodayET()}`;
const dailyTarget = () => {
  const pure = fixture.pool.filter(player => player.difficulty === getDailyTier(getTodayET()));
  return pure[dailyIndex(getTodayET(), pure.length)];
};
const saved = () => {
  const session = parseUnlimitedSession(localStorage.getItem(FOOTLE_UNLIMITED_KEY));
  expect(session, 'A real validated Unlimited session was saved').not.toBeNull();
  return session!;
};
const protectedRecords = () => Object.fromEntries([dailyKey(), FOOTLE_PRACTICE_KEY, 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'].map(key => [key, localStorage.getItem(key)]));
const currentPuzzle = (game: ReturnType<typeof useGame>) => ({ target: game.targetPlayer, guesses: game.guesses, tier: game.difficulty, status: game.gameStatus });
const quietCompletion = () => expect(fixture.completion.mock.calls.every(([, completed, score]) => completed === false && score === 0)).toBe(true);

async function hook() {
  const view = renderHook(() => useGame());
  await waitFor(() => expect(view.result.current.isLoadingPool).toBe(false));
  return view;
}
async function enterUnlimited(view: Awaited<ReturnType<typeof hook>>) {
  act(() => view.result.current.switchMode('unlimited'));
  await waitFor(() => expect(view.result.current.targetPlayer).not.toBeNull());
}
async function page() {
  const view = render(<Footle />);
  await waitFor(() => expect(fixture.fetch).toHaveBeenCalled());
  await waitFor(() => expect(view.queryByText('Loading player database...')).toBeNull());
  await waitFor(() => expect(view.container.querySelector('[data-unlimited-state="loading"]')).toBeNull());
  return view;
}
async function openUnlimited(view: ReturnType<typeof render>) {
  await view.findByRole('combobox');
  fireEvent.click(view.getByRole('button', { name: /Unlimited/ }));
  await waitFor(() => expect(view.container.querySelector('[data-footle-unlimited]')).not.toBeNull());
}
function submit(view: ReturnType<typeof render>, name: string) {
  const input = view.getByRole('combobox', { name: 'Search for a player' });
  fireEvent.change(input, { target: { value: name } });
  const options = view.getAllByRole('option');
  const index = options.findIndex(option => option.firstElementChild?.textContent === name);
  expect(index, `The exact frozen player ${name} remains guessable`).toBeGreaterThanOrEqual(0);
  for (let step = 0; step < index; step++) fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
}
function clueValues(view: ReturnType<typeof render>) {
  return [...view.container.querySelectorAll('[data-footle-clue-desk] [data-clue]')].map(card => ({
    key: card.getAttribute('data-clue'), status: card.getAttribute('data-status'), values: [...card.querySelectorAll('dd')].map(value => value.textContent),
  }));
}
function assertClues(view: ReturnType<typeof render>, expected: GuessResult) {
  const states = { correct: 'Exact match', close: 'Close', incorrect: 'Not a match', unknown: 'Not on file' };
  expect(clueValues(view)).toEqual(Object.entries(expected.cells).map(([key, cell]) => ({
    key, status: cell.status, values: [cell.value, states[cell.status], ...(cell.arrow && cell.status !== 'unknown' ? [`${cell.arrow === 'up' ? '↑ Answer is higher' : '↓ Answer is lower'}`] : [])],
  })));
}

describe('Footle Unlimited session outcomes', () => {
  it('draws fresh resolved-pool answers until explicit deck exhaustion', async () => {
    // Even an exclusion control draws a non-Daily first target, so the
    // remaining-answer assertion catches it before the pause safeguard does.
    vi.spyOn(Math, 'random').mockReturnValue(dailyIndex(getTodayET(), 10) === 0 ? 0.5 : 0);
    let resolve!: (pool: Player[]) => void;
    fixture.fetch.mockImplementation(() => new Promise<Player[]>(done => { resolve = done; }));
    const view = renderHook(() => useGame());
    act(() => view.result.current.switchMode('unlimited'));
    expect(view.result.current.isLoadingPool).toBe(true);
    expect(view.result.current.targetPlayer).toBeNull();
    expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY)).toBeNull();
    await act(async () => resolve(fixture.pool));
    await waitFor(() => expect(view.result.current.targetPlayer).not.toBeNull());
    const tier = getDailyTier(getTodayET());
    act(() => view.result.current.changeDifficulty(tier));
    const expected = fixture.pool.filter(player => player.difficulty === tier && player.name !== dailyTarget().name).map(player => player.name);
    const seen: string[] = [];
    const held = protectedRecords();
    for (let index = 0; index < expected.length; index++) {
      const target = view.result.current.targetPlayer!;
      expect(target.difficulty).toBe(tier);
      expect(expected).toContain(target.name);
      expect(seen).not.toContain(target.name);
      seen.push(target.name);
      const before = localStorage.getItem(FOOTLE_UNLIMITED_KEY);
      act(() => view.result.current.reshuffleUnlimited());
      expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY), 'An unfinished puzzle cannot be replaced by reshuffling').toBe(before);
      act(() => view.result.current.giveUp());
      expect(view.result.current.gameStatus).toBe('lost');
      expect(view.result.current.unlimitedRemaining).toBe(expected.length - index - 1);
      if (index < expected.length - 1) {
        const ended = localStorage.getItem(FOOTLE_UNLIMITED_KEY);
        act(() => view.result.current.reshuffleUnlimited());
        expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY), 'A deck with unseen answers cannot be reshuffled').toBe(ended);
      }
      act(() => view.result.current.resetGame());
      if (index === expected.length - 1) {
        expect(view.result.current.targetPlayer).toEqual(target);
        expect(view.result.current.gameStatus).toBe('lost');
      } else expect(view.result.current.gameStatus).toBe('playing');
    }
    expect([...seen].sort()).toEqual([...expected].sort());
    const exhausted = localStorage.getItem(FOOTLE_UNLIMITED_KEY);
    view.rerender();
    expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY)).toBe(exhausted);
    act(() => view.result.current.reshuffleUnlimited());
    expect(view.result.current.gameStatus).toBe('playing');
    expect(view.result.current.guesses).toEqual([]);
    expect(view.result.current.unlimitedSession!.decks[tier]!.seen).toHaveLength(1);
    expect(view.result.current.targetPlayer!.name).not.toBe(dailyTarget().name);
    expect(protectedRecords()).toEqual(held);
    quietCompletion();
  });

  it('deduplicates identities and handles one or zero eligible answers', async () => {
    const dailyTier = getDailyTier(getTodayET());
    const tier: Difficulty = dailyTier === 'easy' ? 'hard' : 'easy';
    const absent = (['easy', 'hard', 'insane'] as Difficulty[]).find(value => value !== dailyTier && value !== tier)!;
    const player = { ...fixture.pool.find(value => value.difficulty === tier)!, name: 'Fixture Élite Runner' };
    fixture.pool = fixture.pool.filter(value => value.difficulty === dailyTier).concat(player, { ...player, name: 'fixture elite runner' });
    const excluded = selectUnlimitedTier(createUnlimitedSession(), tier, fixture.pool, 'FIXTURE ELITE RUNNER', () => 0);
    expect(excluded.decks[tier], 'A case or accent alias cannot expose the Daily identity').toBeUndefined();
    const view = await hook();
    await enterUnlimited(view);
    act(() => view.result.current.changeDifficulty(tier));
    expect(view.result.current.targetPlayer?.name).toBe(player.name);
    expect(view.result.current.unlimitedRemaining).toBe(0);
    const deck = view.result.current.unlimitedSession!.decks[tier]!;
    expect(deck.pool.filter(value => normalizeName(value.name) === 'fixture elite runner')).toHaveLength(1);
    act(() => view.result.current.giveUp());
    act(() => view.result.current.resetGame());
    expect(view.result.current.targetPlayer?.name).toBe(player.name);
    expect(view.result.current.gameStatus).toBe('lost');
    act(() => view.result.current.changeDifficulty(absent));
    expect(view.result.current.targetPlayer).toBeNull();
    expect(view.result.current.unlimitedSession!.decks[absent]).toBeUndefined();
    act(() => view.result.current.resetGame());
    expect(view.result.current.targetPlayer).toBeNull();
    act(() => view.result.current.changeDifficulty(tier));
    expect(view.result.current.gameStatus).toBe('lost');
    act(() => view.result.current.reshuffleUnlimited());
    expect(view.result.current.targetPlayer?.name).toBe(player.name);
    expect(view.result.current.gameStatus).toBe('playing');
  });

  it('restores exact unfinished clues after the fetched pool changes', async () => {
    let view = await page();
    await openUnlimited(view);
    const first = saved();
    const target = first.decks.easy!.pool.find(player => player.name === first.decks.easy!.current.target)!;
    const wrong = first.decks.easy!.pool.find(player => player.difficulty === 'insane')!;
    submit(view, wrong.name);
    const expected = compareGuess(wrong, target);
    assertClues(view, expected);
    const bytes = localStorage.getItem(FOOTLE_UNLIMITED_KEY);
    const held = protectedRecords();
    view.unmount();
    fixture.pool = fixture.pool.map(player => ({ ...player, club: 'Changed Fixture Club', goals: 88, assists: 44, age: 39, marketValue: 1 }));
    view = await page();
    expect(view.container.querySelector('[data-footle-unlimited]'), 'The saved Unlimited mode resumes after the pool resolves').not.toBeNull();
    expect(view.container.querySelector('[data-footle-clue-desk]'), 'The unfinished saved clues resume').not.toBeNull();
    assertClues(view, expected);
    expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY)).toBe(bytes);
    expect(protectedRecords()).toEqual(held);
    submit(view, target.name);
    expect(saved().decks.easy!.current.status).toBe('won');
    expect(saved().decks.easy!.pool.find(player => player.name === target.name)).toEqual(target);
    quietCompletion();
  });

  it('ignores repeated guesses and repeated next inputs in one frame', async () => {
    const view = await hook(); await enterUnlimited(view);
    const target = view.result.current.targetPlayer!;
    const wrong = fixture.pool.find(player => player.name !== target.name)!;
    act(() => { view.result.current.makeGuess(wrong); view.result.current.makeGuess(wrong); });
    expect(view.result.current.guesses.map(guess => guess.playerName)).toEqual([wrong.name]);
    act(() => { view.result.current.makeGuess(target); view.result.current.makeGuess(wrong); });
    expect(view.result.current.guesses.map(guess => guess.playerName)).toEqual([wrong.name, target.name]);
    expect(view.result.current.gameStatus).toBe('won');
    act(() => { view.result.current.resetGame(); view.result.current.resetGame(); });
    expect(view.result.current.unlimitedSession!.decks.easy!.seen).toHaveLength(2);
    expect(view.result.current.targetPlayer?.name).not.toBe(target.name);
    expect(view.result.current.guesses).toEqual([]);
    const next = view.result.current.targetPlayer!;
    const misses = fixture.pool.filter(player => player.name !== next.name).slice(0, 8);
    act(() => { for (const player of misses) view.result.current.makeGuess(player); view.result.current.makeGuess(next); });
    expect(view.result.current.gameStatus).toBe('lost');
    expect(view.result.current.guesses.map(guess => guess.playerName)).toEqual(misses.map(player => player.name));
  });

  it('preserves each tier puzzle across tier and mode switches', async () => {
    const view = await hook(); await enterUnlimited(view);
    const snapshots = new Map<Difficulty, ReturnType<typeof currentPuzzle>>();
    for (const tier of ['easy', 'hard', 'insane'] as const) {
      act(() => view.result.current.changeDifficulty(tier));
      expect(view.result.current.targetPlayer?.difficulty).toBe(tier);
      const wrong = fixture.pool.find(player => player.name !== view.result.current.targetPlayer?.name)!;
      act(() => view.result.current.makeGuess(wrong));
      snapshots.set(tier, currentPuzzle(view.result.current));
    }
    for (const tier of ['easy', 'hard', 'insane'] as const) {
      act(() => view.result.current.changeDifficulty(tier));
      expect(currentPuzzle(view.result.current)).toEqual(snapshots.get(tier));
      act(() => view.result.current.switchMode('daily'));
      expect(view.result.current.targetPlayer).toEqual(dailyTarget());
      act(() => view.result.current.switchMode('unlimited'));
      expect(currentPuzzle(view.result.current)).toEqual(snapshots.get(tier));
    }
  });

  it('reveals a given-up answer before advancing without touching protected records', async () => {
    const run = createPracticeRun(fixture.pool, 'easy', dailyTarget().name, () => 0)!;
    run.active = false;
    localStorage.setItem(FOOTLE_PRACTICE_KEY, JSON.stringify(run));
    const view = await page(); await view.findByRole('combobox');
    submit(view, fixture.pool.find(player => player.name !== dailyTarget().name)!.name);
    const held = protectedRecords();
    fireEvent.click(view.getByRole('button', { name: /Unlimited/ }));
    await waitFor(() => expect(view.container.querySelector('[data-footle-unlimited]')).not.toBeNull());
    const target = saved().decks.easy!.current.target;
    const input = view.getByRole('combobox');
    fireEvent.change(input, { target: { value: target } });
    expect(saved().decks.easy!.current.guesses).toEqual([]);
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.click(view.getByRole('button', { name: 'Give up' }));
    expect(saved().decks.easy!.current.status).toBe('playing');
    fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' }));
    expect(view.container.querySelector('[data-unlimited-state="result"]')).not.toBeNull();
    expect(view.container.querySelector('[data-footle-unlimited]')).toHaveTextContent(target);
    expect(view.queryByRole('button', { name: 'Next puzzle' })).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Next puzzle' }));
    expect(view.container.querySelector('[data-footle-unlimited]')).toHaveTextContent('Puzzle 2');
    expect(saved().decks.easy!.current.target).not.toBe(target);
    expect(saved().decks.easy!.current.guesses).toEqual([]);
    expect(protectedRecords()).toEqual(held);
    quietCompletion();
  });

  it('pauses a saved current Daily answer without exposing or replacing it', async () => {
    const target = dailyTarget();
    const session = selectUnlimitedTier(createUnlimitedSession(), target.difficulty, fixture.pool, '', () => 0);
    session.active = true;
    session.decks[target.difficulty]!.seen = [normalizeName(target.name)];
    session.decks[target.difficulty]!.current = { target: target.name, guesses: [], status: 'playing' };
    const bytes = JSON.stringify(session);
    localStorage.setItem(FOOTLE_UNLIMITED_KEY, bytes);
    const view = await page();
    expect(view.container.querySelector('[data-unlimited-state="paused"]'), 'The saved Daily answer stays behind the pause screen').not.toBeNull();
    expect(view.queryByRole('combobox')).toBeNull();
    expect(view.container.querySelector('[data-footle-clue-desk]')).toBeNull();
    expect(view.container.querySelector('[data-footle-unlimited]')).not.toHaveTextContent(target.name);
    expect(view.queryByRole('button', { name: 'Next puzzle' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Reshuffle deck' })).toBeNull();
    expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY)).toBe(bytes);
    fireEvent.click(view.getByRole('button', { name: /Daily/ }));
    await view.findByRole('combobox'); submit(view, target.name);
    fireEvent.click(view.getByRole('button', { name: /Unlimited/ }));
    expect(view.queryByRole('combobox')).not.toBeNull();
    expect(view.container.querySelector('[data-unlimited-state="paused"]')).toBeNull();
    expect(saved().decks[target.difficulty]!.current).toEqual(session.decks[target.difficulty]!.current);
  });

  it('ignores invalid saved sessions and starts a clean deck', async () => {
    const valid = selectUnlimitedTier(createUnlimitedSession(), 'easy', fixture.pool, dailyTarget().name, () => 0);
    const malformed: unknown[] = [null, [], { ...valid, v: 9 }, { ...valid, tier: 'missing' }, { ...valid, decks: [] }];
    for (const change of [
      (deck: typeof valid.decks.easy) => { deck!.current.guesses = ['Missing Fixture']; },
      (deck: typeof valid.decks.easy) => { deck!.current.status = 'won'; },
      (deck: typeof valid.decks.easy) => { deck!.seen.push(deck!.seen[0]); },
      (deck: typeof valid.decks.easy) => { deck!.pool[0].marketValue = -10; },
    ]) {
      const altered = structuredClone(valid); change(altered.decks.easy); malformed.push(altered);
    }
    for (const value of malformed) expect(parseUnlimitedSession(JSON.stringify(value))).toBeNull();
    expect(parseUnlimitedSession('{broken')).toBeNull();
    localStorage.setItem(FOOTLE_UNLIMITED_KEY, JSON.stringify(malformed[5]));
    const view = await hook();
    expect(view.result.current.mode).toBe('daily');
    await enterUnlimited(view);
    expect(view.result.current.guesses).toEqual([]);
    expect(view.result.current.targetPlayer?.difficulty).toBe('easy');
    expect(saved().decks.easy!.current.guesses).toEqual([]);
  });

  it('reports blocked storage while keeping Unlimited playable', async () => {
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === FOOTLE_UNLIMITED_KEY) throw new DOMException('Blocked fixture storage');
      return set.call(this, key, value);
    });
    const view = await page(); await openUnlimited(view);
    expect(view.container.querySelector('[data-footle-unlimited]')).toHaveTextContent(/could not save/i);
    expect(view.queryByRole('combobox')).not.toBeNull();
    const input = view.getByRole('combobox');
    fireEvent.change(input, { target: { value: fixture.pool[20].name } });
    expect(view.queryAllByRole('option').length).toBeGreaterThan(0);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(view.container.querySelectorAll('[data-footle-clue-desk] [data-clue]')).toHaveLength(8);
    expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY)).toBeNull();
    quietCompletion();
  });

  it('restores existing Daily and completed five-run records quietly', async () => {
    let view = await hook();
    const daily = view.result.current.targetPlayer!;
    act(() => view.result.current.makeGuess(daily));
    expect(view.result.current.gameStatus).toBe('won');
    view.unmount();
    const run = createPracticeRun(fixture.pool, 'easy', daily.name, () => 0)!;
    run.index = 4;
    run.rounds = run.targets.map(target => ({ guesses: [target], status: 'won' }));
    localStorage.setItem(FOOTLE_PRACTICE_KEY, JSON.stringify(run));
    const held = protectedRecords();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fixture.completion.mockClear();
    view = await hook();
    expect(view.result.current.mode).toBe('practice');
    expect(view.result.current.practiceComplete).toBe(true);
    expect(view.result.current.practiceRun).toEqual(run);
    expect(protectedRecords()).toEqual(held);
    expect(localStorage.getItem(FOOTLE_UNLIMITED_KEY)).toBeNull();
    expect(writes.mock.calls).toEqual([]);
    expect(fixture.completion.mock.calls.some(([slug, completed, score]) => slug === 'footle' && completed === true && score === 700)).toBe(true);
    expect(fixture.completion.mock.calls.every(([slug, , score]) => slug === 'footle' && (score === 0 || score === 700))).toBe(true);
  });
});
