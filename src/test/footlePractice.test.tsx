import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@/types/game';
import Footle from '@/pages/Footle';
import { useGame } from '@/hooks/useGame';
import { createPracticeRun, FOOTLE_PRACTICE_KEY, parsePracticeRun } from '@/lib/footlePracticeRun';
import { dailyIndex, getDailyTier, getTodayET } from '@/lib/dateUtils';
import { practicePlayers } from '@/test/fixtures/footlePracticePlayers';

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
vi.mock('@/components/seo/GameSeoContent', () => ({ default: ({ examples }: { examples: string[] }) => <div data-testid="pool-examples">{examples.join(' ')}</div> }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('footle-rules-seen', '1');
  fixture.pool = practicePlayers.map(player => ({ ...player }));
  fixture.fetch.mockReset().mockImplementation(() => Promise.resolve(fixture.pool));
  fixture.completion.mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const savedRun = () => parsePracticeRun(localStorage.getItem(FOOTLE_PRACTICE_KEY))!;
const dailyTarget = () => {
  const today = getTodayET();
  const pool = fixture.pool.filter(player => player.difficulty === getDailyTier(today));
  return pool[dailyIndex(today, pool.length)];
};
async function page() {
  const view = render(<Footle />);
  await waitFor(() => expect(fixture.fetch).toHaveBeenCalled());
  return view;
}
function submit(view: ReturnType<typeof render>, name: string) {
  const search = view.getByRole('combobox', { name: 'Search for a player' });
  fireEvent.change(search, { target: { value: name } });
  expect(view.getAllByRole('option')[0]).toHaveTextContent(name);
  fireEvent.keyDown(search, { key: 'Enter' });
}
async function start(view: ReturnType<typeof render>) {
  await view.findByRole('combobox');
  fireEvent.click(view.getByRole('button', { name: 'Five-puzzle run', exact: true }));
  await waitFor(() => expect(view.getByRole('button', { name: 'Start run' })).toBeEnabled());
  fireEvent.click(view.getByRole('button', { name: 'Start run' }));
  expect(view.getByTestId('practice-progress')).toHaveTextContent('Puzzle 1 of 5');
}

describe('Footle practice mounted outcomes', () => {
  it('finishes five puzzles with the exact receipt and untouched daily record', async () => {
    let view = await page();
    await view.findByRole('combobox');
    const daily = dailyTarget();
    submit(view, fixture.pool.find(player => player.name !== daily.name)!.name);
    const dailyKey = `footle-daily-${getTodayET()}`;
    const dailyBytes = localStorage.getItem(dailyKey);
    expect(JSON.parse(dailyBytes!).guesses).toHaveLength(1);
    await start(view);
    const initial = savedRun();
    expect(initial.targets).toHaveLength(5);
    expect(new Set(initial.targets).size).toBe(5);
    expect(initial.targets).not.toContain(daily.name);
    expect(initial.targets.every(name => initial.pool.find(player => player.name === name)?.difficulty === 'easy')).toBe(true);
    expect(view.queryByRole('button', { name: 'Next puzzle' })).toBeNull();

    const wrong = initial.pool.find(player => player.name !== initial.targets[0])!;
    submit(view, wrong.name);
    expect(savedRun().rounds[0].guesses).toEqual([wrong.name]);
    const snapshot = JSON.stringify(savedRun().pool);
    view.unmount();
    fixture.pool = fixture.pool.map(player => ({ ...player, club: 'Changed after the run', goals: 77 }));
    view = await page();
    await view.findByTestId('practice-progress');
    expect(savedRun().index).toBe(0);
    expect(JSON.stringify(savedRun().pool)).toBe(snapshot);
    expect(view.getByRole('combobox')).toBeVisible();
    fireEvent.change(view.getByRole('combobox'), { target: { value: wrong.name } });
    expect(view.queryAllByRole('option')).toHaveLength(0);
    submit(view, initial.targets[0]);
    expect(view.getByTestId('practice-feedback')).toHaveTextContent('Solved!');
    expect(view.getByTestId('practice-feedback')).not.toHaveTextContent('Changed after the run');
    fireEvent.click(view.getByRole('button', { name: 'Next puzzle' }));
    expect(view.getByTestId('practice-progress')).toHaveTextContent('Puzzle 2 of 5');
    expect(view.getByTestId('footle-practice')).toHaveFocus();

    const misses = initial.pool.filter(player => player.name !== initial.targets[1]).slice(0, 8);
    for (const player of misses) submit(view, player.name);
    expect(savedRun().rounds[1].status).toBe('lost');
    expect(view.getByTestId('practice-feedback')).toHaveTextContent(initial.targets[1]);
    fireEvent.click(view.getByRole('button', { name: 'Next puzzle' }));
    submit(view, initial.targets[2]);
    fireEvent.click(view.getByRole('button', { name: 'Next puzzle' }));
    fireEvent.click(view.getByRole('button', { name: 'Give up', exact: true }));
    fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' }));
    expect(savedRun().rounds[3]).toEqual({ guesses: [], status: 'lost' });
    fireEvent.click(view.getByRole('button', { name: 'Next puzzle' }));
    submit(view, initial.targets[4]);

    const receipt = view.getByTestId('practice-receipt');
    expect(receipt).toHaveTextContent('Run complete');
    expect(receipt).toHaveTextContent('3 of 5 solved');
    expect(receipt).toHaveTextContent('12 total guesses');
    for (const name of initial.targets) expect(receipt).toHaveTextContent(name);
    expect(within(receipt).getAllByText('View player details')).toHaveLength(5);
    expect(view.queryByRole('combobox')).toBeNull();
    expect(view.queryByRole('button', { name: 'Next puzzle' })).toBeNull();
    expect(localStorage.getItem(dailyKey)).toBe(dailyBytes);
    expect(fixture.completion.mock.calls.every(([, completed, score]) => completed === false && score === 0)).toBe(true);
    view.unmount();
    view = await page();
    expect(await view.findByTestId('practice-receipt')).toHaveTextContent('3 of 5 solved');
    expect(view.getByTestId('practice-receipt')).toHaveTextContent('12 total guesses');
    fireEvent.click(view.getByRole('button', { name: /Daily/ }));
    await view.findByRole('combobox');
    expect(localStorage.getItem(dailyKey)).toBe(dailyBytes);
  });

  it('starts the first Unlimited puzzle from the resolved pool', async () => {
    let resolve: (pool: Player[]) => void;
    fixture.fetch.mockImplementation(() => new Promise<Player[]>(done => { resolve = done; }));
    const hook = renderHook(() => useGame());
    act(() => hook.result.current.switchMode('unlimited'));
    expect(hook.result.current.targetPlayer).toBeNull();
    expect(hook.result.current.isLoadingPool).toBe(true);
    await act(async () => { resolve(fixture.pool); });
    await waitFor(() => expect(hook.result.current.targetPlayer).not.toBeNull());
    expect(fixture.pool.map(player => player.name)).toContain(hook.result.current.targetPlayer!.name);
    const target = hook.result.current.targetPlayer!;
    act(() => hook.result.current.makeGuess(target));
    expect(hook.result.current.gameStatus).toBe('won');
    act(() => hook.result.current.resetGame());
    expect(hook.result.current.gameStatus).toBe('playing');
    expect(hook.result.current.guesses).toHaveLength(0);
    expect(fixture.completion.mock.calls.every(([, completed]) => completed === false)).toBe(true);
  });

  it('ignores duplicate guesses and double next inputs at the hook boundary', async () => {
    const hook = renderHook(() => useGame());
    await waitFor(() => expect(hook.result.current.isLoadingPool).toBe(false));
    act(() => hook.result.current.switchMode('practice'));
    act(() => { hook.result.current.startPractice(); hook.result.current.startPractice(); });
    const target = hook.result.current.targetPlayer!;
    const wrong = fixture.pool.find(player => player.name !== target.name)!;
    act(() => { hook.result.current.makeGuess(wrong); hook.result.current.makeGuess(wrong); });
    expect(hook.result.current.guesses).toHaveLength(1);
    act(() => { hook.result.current.makeGuess(target); hook.result.current.makeGuess(wrong); });
    expect(hook.result.current.guesses).toHaveLength(2);
    expect(hook.result.current.gameStatus).toBe('won');
    act(() => { hook.result.current.advancePractice(); hook.result.current.advancePractice(); });
    expect(hook.result.current.practiceRun!.index).toBe(1);
    expect(hook.result.current.guesses).toHaveLength(0);
    expect(savedRun().index).toBe(1);
  });

  it('offers practice from the daily result without resetting that result', async () => {
    const view = await page();
    await view.findByRole('combobox');
    fireEvent.click(view.getByRole('button', { name: 'Give up', exact: true }));
    fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' }));
    const bytes = localStorage.getItem(`footle-daily-${getTodayET()}`);
    expect(JSON.parse(bytes!).gameStatus).toBe('lost');
    fireEvent.click(view.getByRole('button', { name: 'Play five more' }));
    expect(view.getByRole('button', { name: 'Start run' })).toBeEnabled();
    expect(view.getByTestId('footle-practice')).toHaveFocus();
    fireEvent.click(view.getByRole('button', { name: /Daily/ }));
    expect(view.getByRole('status')).toHaveTextContent('Game Over');
    expect(localStorage.getItem(`footle-daily-${getTodayET()}`)).toBe(bytes);
  });

  it('shows worked rules and derives examples from a loaded non-answer player', async () => {
    const view = await page();
    await view.findByRole('combobox');
    const example = view.getByTestId('pool-examples');
    expect(example).toHaveTextContent('Fixture');
    expect(example).not.toHaveTextContent(dailyTarget().name);
    expect(example).not.toHaveTextContent('Florian Wirtz');
    fireEvent.click(view.getByRole('button', { name: 'How to play' }));
    const help = view.getByRole('dialog');
    expect(help).toHaveTextContent('five different players');
    expect(help).toHaveTextContent('example numbers are hypothetical');
    expect(help).toHaveTextContent('not live totals');
    expect(help).toHaveTextContent('From this puzzle pool: Fixture');
  });

  it('rejects a corrupt saved run and permits a clean replacement', async () => {
    const broken = createPracticeRun(fixture.pool, 'easy', dailyTarget().name, () => 0)!;
    broken.rounds[0].guesses = ['missing player'];
    localStorage.setItem(FOOTLE_PRACTICE_KEY, JSON.stringify(broken));
    const view = await page();
    await start(view);
    expect(savedRun().rounds[0].guesses).toEqual([]);
    expect(savedRun().targets).toHaveLength(5);
  });

  it('reports a failed save while keeping the current run playable', async () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === FOOTLE_PRACTICE_KEY) throw new DOMException('Quota exceeded');
      original.call(this, key, value);
    });
    const view = await page();
    await start(view);
    expect(view.queryByRole('alert')).not.toBeNull();
    expect(view.queryByRole('alert')).toHaveTextContent('could not save your run');
    expect(view.getByRole('combobox')).toBeEnabled();
    expect(localStorage.getItem(FOOTLE_PRACTICE_KEY)).toBeNull();
  });

  it('disables a short practice tier rather than starting fewer puzzles', async () => {
    fixture.pool = fixture.pool.filter(player => player.difficulty !== 'easy').concat(fixture.pool.slice(0, 4));
    const view = await page();
    await view.findByRole('combobox');
    fireEvent.click(view.getByRole('button', { name: 'Five-puzzle run', exact: true }));
    expect(view.getByRole('button', { name: 'Start run' })).toBeDisabled();
    expect(view.getByRole('status')).toHaveTextContent('needs five available players');
    expect(localStorage.getItem(FOOTLE_PRACTICE_KEY)).toBeNull();
  });
});
