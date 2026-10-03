import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Footle from '@/pages/Footle';
import { useGame } from '@/hooks/useGame';
import { compareGuess } from '@/lib/gameLogic';
import { createPracticeRun, FOOTLE_PRACTICE_KEY, type FootlePracticeRun } from '@/lib/footlePracticeRun';
import { getTodayET } from '@/lib/dateUtils';
import { practicePlayers } from '@/test/fixtures/footlePracticePlayers';
import type { GuessResult, Player } from '@/types/game';

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
  localStorage.clear(); localStorage.setItem('footle-rules-seen', '1');
  fixture.pool = practicePlayers.map(player => ({ ...player }));
  Object.assign(fixture.pool[0], { nationality: 'Norway', club: 'Fixture Athletic Association of the Northern Valley', goals: 5, assists: 0, kitNumber: 7, age: 20, marketValue: 50 });
  Object.assign(fixture.pool[5], { nationality: 'France', club: 'Frozen Answer Club', league: 'Other', goals: null, assists: 3, position: 'ST', kitNumber: null, age: 30, marketValue: 40 });
  fixture.pool[1].goals = null; fixture.pool[1].assists = null;
  fixture.fetch.mockReset().mockImplementation(() => Promise.resolve(fixture.pool.map(player => ({ ...player }))));
  fixture.completion.mockClear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function run(complete = false): FootlePracticeRun {
  const value = createPracticeRun(fixture.pool, 'easy', 'outside fixture', () => 0)!;
  value.targets = fixture.pool.slice(5, 10).map(player => player.name);
  if (complete) {
    value.index = 4;
    value.rounds = [
      { guesses: [fixture.pool[0].name, value.targets[0]], status: 'won' },
      { guesses: value.pool.filter(player => player.name !== value.targets[1]).slice(0, 8).map(player => player.name), status: 'lost' },
      { guesses: [fixture.pool[2].name, value.targets[2]], status: 'won' },
      { guesses: [], status: 'lost' },
      { guesses: [value.targets[4]], status: 'won' },
    ];
  }
  localStorage.setItem(FOOTLE_PRACTICE_KEY, JSON.stringify(value));
  return value;
}
async function page() {
  const view = render(<Footle />);
  await waitFor(() => expect(fixture.fetch).toHaveBeenCalled());
  await waitFor(() => expect(view.queryByText('Loading player database...')).toBeNull());
  return view;
}
function submit(view: ReturnType<typeof render>, name: string) {
  const input = view.getByRole('combobox', { name: 'Search for a player' });
  fireEvent.change(input, { target: { value: name } });
  const options = view.getAllByRole('option');
  const index = options.findIndex(option => option.firstElementChild?.textContent === name);
  expect(index).toBeGreaterThanOrEqual(0);
  for (let step = 0; step < index; step++) fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
}
function desk(view: ReturnType<typeof render>) { return view.container.querySelector('[data-footle-clue-desk]') as HTMLElement; }
const labels = { nationality: 'Nation', club: 'Club', goals: 'Goals', assists: 'Assists', position: 'Position', kitNumber: 'Kit number', age: 'Age', marketValue: 'Value' };
const statuses = { correct: 'Exact match', close: 'Close', incorrect: 'Not a match', unknown: 'Not on file' };
function assertClues(element: HTMLElement, expected: GuessResult) {
  expect(within(element).getByRole('heading', { level: 2 })).toHaveTextContent(expected.playerName);
  expect(element.querySelectorAll('[data-clue]')).toHaveLength(8);
  for (const key of Object.keys(labels) as Array<keyof GuessResult['cells']>) {
    const card = element.querySelector(`[data-clue="${key}"]`)!;
    const cell = expected.cells[key];
    expect(card.getAttribute('data-status'), `${key} keeps the actual comparison`).toBe(cell.status);
    expect(card.querySelector('dt')!.textContent).toContain(labels[key]);
    expect(card.querySelector('dd')!.textContent, `${key} keeps the actual guessed value`).toBe(cell.value);
    expect(card.querySelectorAll('dd')[1].textContent).toBe(statuses[cell.status]);
    const directions = [...card.querySelectorAll('dd')].slice(2).map(item => item.textContent);
    expect(directions, `${key} gives the actual direction`).toEqual(cell.arrow && cell.status !== 'unknown' ? [`${cell.arrow === 'up' ? '↑ Answer is higher' : '↓ Answer is lower'}`] : []);
  }
}
const records = () => Object.fromEntries([FOOTLE_PRACTICE_KEY, `footle-daily-${getTodayET()}`, 'dukb-local-completions', 'dukb-streaks-v1'].map(key => [key, localStorage.getItem(key)]));

describe('Footle clue desk outcomes', () => {
  it('renders all eight actual clues with honest unknown zero and opposite directions', async () => {
    const initial = run(); const view = await page(); await view.findByRole('combobox');
    submit(view, initial.pool[0].name);
    const target = initial.pool.find(player => player.name === initial.targets[0])!;
    const result = compareGuess(initial.pool[0], target);
    expect(result.cells.goals).toEqual({ value: '5', status: 'unknown' });
    expect(result.cells.assists).toEqual({ value: '0', status: 'close', arrow: 'up' });
    expect(result.cells.marketValue).toEqual({ value: '$50M', status: 'incorrect', arrow: 'down' });
    assertClues(desk(view), result);
    submit(view, initial.pool[1].name);
    assertClues(desk(view), compareGuess(initial.pool[1], target));
    expect(desk(view).querySelector('[data-clue="goals"] dd')).toHaveTextContent('?');
    expect(view.queryByRole('button', { name: 'Review puzzle 2' })).toBeNull();
    expect(view.container.querySelector('[data-footle-review]')).toBeNull();
  });

  it('revisits revealed guesses selects the next actual guess and returns focus to search', async () => {
    const initial = run(); const view = await page(); await view.findByRole('combobox');
    const target = initial.pool.find(player => player.name === initial.targets[0])!;
    submit(view, initial.pool[0].name); submit(view, initial.pool[1].name);
    fireEvent.click(view.getByRole('button', { name: `View guess 1: ${initial.pool[0].name}` }));
    expect(desk(view).getAttribute('data-clue-guess')).toBe('1');
    assertClues(desk(view), compareGuess(initial.pool[0], target));
    const held = records();
    fireEvent.click(view.getByRole('button', { name: /Back to search/ }));
    expect(view.getByRole('combobox')).toHaveFocus(); expect(records()).toEqual(held);
    submit(view, initial.pool[2].name);
    expect(desk(view).getAttribute('data-clue-guess')).toBe('3');
    assertClues(desk(view), compareGuess(initial.pool[2], target));
    expect(within(desk(view)).getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('resets selected history when mode and puzzle change with equal guess counts', async () => {
    const initial = run(); vi.spyOn(Math, 'random').mockReturnValue(0);
    const view = await page(); await view.findByRole('combobox');
    submit(view, initial.pool[0].name); submit(view, initial.pool[1].name);
    fireEvent.click(view.getByRole('button', { name: `View guess 1: ${initial.pool[0].name}` }));
    fireEvent.click(view.getByRole('button', { name: /Unlimited/ }));
    submit(view, initial.pool[20].name); submit(view, initial.pool[21].name);
    fireEvent.click(view.getByRole('button', { name: `View guess 1: ${initial.pool[20].name}` }));
    fireEvent.click(view.getByRole('button', { name: 'Five-puzzle run' }));
    expect(desk(view).getAttribute('data-clue-guess')).toBe('2');
    expect(within(desk(view)).getByRole('heading', { level: 2 })).toHaveTextContent(initial.pool[1].name);
    expect(view.container.querySelector('[data-footle-review]')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: /Unlimited/ }));
    submit(view, initial.pool[0].name);
    expect(view.getByRole('status')).toHaveTextContent('Correct!');
    fireEvent.click(view.getByRole('button', { name: `View guess 1: ${initial.pool[20].name}` }));
    expect(desk(view).getAttribute('data-clue-guess')).toBe('1');
    fireEvent.click(view.getByRole('button', { name: 'Play Again' }));
    for (const index of [20, 21, 22]) submit(view, initial.pool[index].name);
    expect(desk(view).getAttribute('data-clue-guess'), 'Same-answer replay selects the latest new guess').toBe('3');
    expect(within(desk(view)).getByRole('heading', { level: 2 })).toHaveTextContent(initial.pool[22].name);
    submit(view, initial.pool[0].name);
    expect(view.getByRole('status')).toHaveTextContent('Correct!');
  });

  it('reviews every finished round from frozen clues after reload without saved record writes', async () => {
    const initial = run(true); const bytes = localStorage.getItem(FOOTLE_PRACTICE_KEY);
    fixture.pool = fixture.pool.map(player => ({ ...player, goals: 91, assists: 88, club: 'Fetched later club' }));
    let view = await page(); await view.findByTestId('practice-receipt');
    view.unmount(); view = await page(); await view.findByTestId('practice-receipt');
    const held = records(); const write = vi.spyOn(Storage.prototype, 'setItem');
    for (const index of [1, 0, 2, 4]) {
      fireEvent.click(view.getByRole('button', { name: `Review puzzle ${index + 1}` }));
      const review = view.container.querySelector('[data-footle-review]')!;
      expect(review.getAttribute('data-footle-review')).toBe(String(index + 1));
      expect(review).toHaveTextContent(initial.targets[index]);
      const answer = initial.pool.find(player => player.name === initial.targets[index])!;
      for (const [guessIndex, name] of initial.rounds[index].guesses.entries()) {
        fireEvent.click(view.getByRole('button', { name: `View guess ${guessIndex + 1}: ${name}` }));
        assertClues(desk(view), compareGuess(initial.pool.find(player => player.name === name)!, answer));
      }
    }
    expect(records(), 'Review never writes saved run or completion records').toEqual(held); expect(localStorage.getItem(FOOTLE_PRACTICE_KEY)).toBe(bytes);
    expect(write).not.toHaveBeenCalled();
    expect(fixture.completion.mock.calls.every(([, complete, score]) => !complete && score === 0)).toBe(true);
  });

  it('shows a zero-guess miss honestly and exits review without carrying it into a new run', async () => {
    run(true); const view = await page(); await view.findByTestId('practice-receipt');
    const opener = view.getByRole('button', { name: 'Review puzzle 4' }); fireEvent.click(opener);
    expect(view.queryByText('No guesses were made for this puzzle.')).toBeVisible();
    expect(view.container.querySelectorAll('[data-clue]')).toHaveLength(0);
    const held = records(); fireEvent.click(view.getByRole('button', { name: 'Back to run results' }));
    expect(opener).toHaveFocus(); expect(records()).toEqual(held);
    expect(view.container.querySelector('[data-footle-review]')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Review puzzle 2' }));
    fireEvent.click(view.getByRole('button', { name: 'Play another five' }));
    expect(view.container.querySelector('[data-footle-review]')).toBeNull();
    expect(view.queryByRole('button', { name: 'Review puzzle 2' })).toBeNull();
    expect(view.getByRole('combobox')).toBeEnabled();
  });

  it('reopens clue instructions and restores the help trigger without changing reviewed clues', async () => {
    run(true); const view = await page(); await view.findByTestId('practice-receipt');
    fireEvent.click(view.getByRole('button', { name: 'Review puzzle 2' }));
    const before = desk(view).textContent; const held = records();
    const help = view.getByRole('button', { name: 'How to play' }); fireEvent.click(help);
    const dialog = view.getByRole('dialog');
    expect(dialog).toHaveTextContent('Each guess opens eight cards');
    expect(dialog).toHaveTextContent('These example numbers are hypothetical.');
    expect(dialog).toHaveTextContent('never change your score');
    fireEvent.click(within(dialog).getByRole('button', { name: "Let's Play!" }));
    await waitFor(() => expect(help).toHaveFocus());
    expect(desk(view).textContent).toBe(before); expect(records()).toEqual(held);
  });

  it('retains the original daily result quietly across remount without using the desk', async () => {
    let hook = renderHook(() => useGame()); await waitFor(() => expect(hook.result.current.isLoadingPool).toBe(false));
    act(() => hook.result.current.makeGuess(hook.result.current.targetPlayer!));
    expect(hook.result.current.gameStatus).toBe('won');
    const bytes = localStorage.getItem(`footle-daily-${getTodayET()}`);
    expect(JSON.parse(bytes!).guesses).toHaveLength(1);
    hook.unmount(); hook = renderHook(() => useGame());
    await waitFor(() => expect(hook.result.current.isLoadingPool).toBe(false));
    expect(hook.result.current.gameStatus).toBe('won');
    expect(localStorage.getItem(`footle-daily-${getTodayET()}`)).toBe(bytes);
    expect(localStorage.getItem(FOOTLE_PRACTICE_KEY)).toBeNull();
  });

  it('retains original duplicate guess and next guards independently of presentation', async () => {
    const initial = run(); const hook = renderHook(() => useGame());
    await waitFor(() => expect(hook.result.current.isLoadingPool).toBe(false));
    act(() => { hook.result.current.makeGuess(initial.pool[0]); hook.result.current.makeGuess(initial.pool[0]); });
    expect(hook.result.current.guesses).toHaveLength(1);
    const answer = hook.result.current.targetPlayer!;
    act(() => hook.result.current.makeGuess(answer));
    act(() => { hook.result.current.advancePractice(); hook.result.current.advancePractice(); });
    expect(hook.result.current.practiceRun!.index).toBe(1);
    expect(hook.result.current.guesses).toHaveLength(0);
  });
});
