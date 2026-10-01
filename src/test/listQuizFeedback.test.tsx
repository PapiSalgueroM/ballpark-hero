import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ListQuiz from '@/pages/ListQuiz';
import { buildAliasMap, cleanAnswers, loadPuzzleAnswers, listQuizTier, normalize, LIST_PUZZLES, OFFLINE_PUZZLE } from '@/lib/listQuiz';
import { recordCompletion } from '@/lib/completions';
import { ALL_GAMES } from '@/data/gameRegistry';
import feedback from '@/pages/ListQuizFeedback.module.css';

const fixture = vi.hoisted(() => ({
  names: ['Fíxture Áster', 'Fixture Caldermere Shared', 'Fixture Tresswick Shared', 'Fixture' + 'UnbrokenAnswer'.repeat(6), 'Fixture Bexley', 'Fixture Renwick', 'Fixture Mosswick', 'Fixture Westmere', 'Fixture Kelworth', 'Fixture Valehurst'],
  fetch: vi.fn<() => Promise<string[]>>(), offline: vi.fn<() => Promise<string[]>>(), clipboard: vi.fn(async (_text: string) => {}),
}));
vi.mock('@/lib/listQuiz', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/listQuiz')>();
  return { ...actual, LIST_PUZZLES: [{ id: 'fixture-list', title: 'Fictional name list', blurb: 'Ten generated fixture answers.', sport: 'Fixture sport', emoji: '🧩', minAnswers: 10, fetch: fixture.fetch }],
    OFFLINE_PUZZLE: { id: 'fixture-offline', title: 'Fictional fallback list', blurb: 'Generated offline fixture answers.', sport: 'Fixture sport', emoji: '🧩', minAnswers: 10, fetch: fixture.offline } };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const element = () => <MemoryRouter initialEntries={['/list-quiz']}><HelmetProvider><ListQuiz /></HelmetProvider></MemoryRouter>;
const mount = async () => { const view = render(element()); await act(async () => {}); return view; };
const start = async (view: ReturnType<typeof render>, timed = false) => {
  const button = view.getByRole('button', { name: timed ? '3:00' : 'Relaxed' }); button.focus();
  await act(async () => { fireEvent.click(button); });
};
const field = (view: ReturnType<typeof render>) => view.getByRole('textbox', { name: 'Type a name from the list' });
const guess = (view: ReturnType<typeof render>, value: string) => {
  const input = field(view); input.focus(); fireEvent.change(input, { target: { value } }); fireEvent.submit(input.closest('form')!);
};
const tiles = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-list-answer]')];
const sameTiles = (view: ReturnType<typeof render>, nodes: HTMLElement[]) => { expect(tiles(view)).toHaveLength(nodes.length); tiles(view).forEach((node, i) => expect(node).toBe(nodes[i])); };
const giveUp = (view: ReturnType<typeof render>) => { const button = view.getByRole('button', { name: 'Give up and reveal' }); button.focus(); fireEvent.click(button); };
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); vi.clearAllMocks(); localStorage.clear();
  fixture.fetch.mockResolvedValue([' ', ' Fíxture Áster ', ...fixture.names.slice(1), 'fixture aster']);
  fixture.offline.mockResolvedValue(Array.from({ length: 10 }, (_, i) => 'Offline Fixture ' + i));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('actual ListQuiz committed feedback', () => {
  it('announces actual hits while keeping original answer nodes and focus', async () => {
    const view = await mount(); await start(view); const nodes = tiles(view), input = field(view), focus = vi.spyOn(input, 'focus');
    guess(view, 'aster');
    expect(nodes[0]).toHaveTextContent(fixture.names[0]); expect(nodes[0]).toHaveAttribute('data-list-found', 'true');
    expect(nodes[0]).toHaveAttribute('data-list-cue', 'hit'); expect(nodes[0]).toHaveClass(feedback.hit);
    expect(view.container.querySelector('[data-list-feedback="hit"]')).toHaveTextContent('Found: ' + fixture.names[0]);
    expect(input).toHaveValue(''); expect(input).toHaveFocus(); expect(focus).toHaveBeenCalledWith({ preventScroll: true }); sameTiles(view, nodes);
    view.rerender(element()); sameTiles(view, nodes); expect(nodes[0]).toHaveAttribute('data-list-cue', 'hit');
    tick(700); expect(view.container.querySelector('[data-list-cue]')).toBeNull(); expect(view.container.querySelector('[data-list-feedback]')).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
  });

  it('keeps blank short typing clone ticks miss and duplicate outcomes honest', async () => {
    const view = await mount(); await start(view, true); const nodes = tiles(view);
    guess(view, '  '); guess(view, 'as'); expect(view.container.querySelector('[data-list-feedback]')).toBeNull();
    fireEvent.change(field(view), { target: { value: 'shared' } }); view.rerender(element()); tick(1000);
    expect(view.getByText('2:59')).toBeInTheDocument(); expect(view.container.querySelector('[data-list-cue]')).toBeNull();
    guess(view, 'shared'); expect(view.container.querySelector('[data-list-feedback="miss"]')).toHaveTextContent('Not on the list (or needs the full name)');
    expect(field(view)).toHaveValue('shared'); expect(nodes.every(node => node.dataset.listFound === 'false')).toBe(true);
    guess(view, 'aster'); guess(view, 'fixture aster');
    expect(view.container.querySelector('[data-list-feedback="dupe"]')).toHaveTextContent('Already found that one');
    expect(field(view)).toHaveValue(''); expect(tiles(view).filter(node => node.dataset.listFound === 'true')).toHaveLength(1);
    expect(view.container.querySelector('[data-list-cue]')).toBeNull(); sameTiles(view, nodes); tick(700); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('focuses accepted starts and final action without taking connected external focus', async () => {
    const view = await mount(); const focus = vi.spyOn(HTMLElement.prototype, 'focus'); await start(view);
    expect(field(view)).toHaveFocus(); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    const repeated = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }); field(view).dispatchEvent(repeated); expect(repeated.defaultPrevented).toBe(true);
    giveUp(view); expect(view.getByRole('button', { name: 'More lists' })).toHaveFocus();
    const repeatButton = new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true }); view.getByRole('button', { name: 'Retry' }).dispatchEvent(repeatButton); expect(repeatButton.defaultPrevented).toBe(true);
    const external = document.createElement('button'); document.body.append(external); external.focus();
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Retry' })); }); expect(external).toHaveFocus();
    fireEvent.change(field(view), { target: { value: 'aster' } }); fireEvent.submit(field(view).closest('form')!); expect(external).toHaveFocus();
    external.remove();
  });

  it('matches original full-list score share and one completion baseline', async () => {
    const view = await mount(); await start(view); fixture.names.forEach(name => guess(view, name));
    expect(view.getByRole('heading', { name: '🥇 Gold: 10 of 10 (100%)' })).toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/list-quiz', 10, 'FixtureBaller');
    await act(async () => { fireEvent.click(view.getByRole('button', { name: '📋 Copy Score Card' })); });
    const emoji = ALL_GAMES.find(game => game.path === '/list-quiz')!.emoji;
    expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`${emoji} Name Them All: Oct 1, 2026\n🧩 Fictional name list\n📝 10/10 (100%) 🥇 Gold\nScore: 10/10 (Gold)\ndouknowball.com/list-quiz`);
    view.rerender(element()); tick(2000); expect(recordCompletion).toHaveBeenCalledTimes(1); expect(localStorage.length).toBe(0);
  });

  it('keeps original silver bronze and lower-tier give-up scores', async () => {
    for (const [count, tier] of [[8, '🥈 Silver'], [6, '🥉 Bronze'], [2, null]] as const) {
      const view = await mount(); await start(view); fixture.names.slice(0, count).forEach(name => guess(view, name)); giveUp(view);
      expect(view.getByRole('heading', { name: tier ? `${tier}: ${count} of 10 (${count * 10}%)` : `You named ${count} of 10 (${count * 10}%)` })).toBeInTheDocument();
      expect(recordCompletion).toHaveBeenLastCalledWith('/list-quiz', count, 'FixtureBaller');
      expect(tiles(view).filter(node => node.dataset.listFound === 'true')).toHaveLength(count);
      expect(tiles(view).map(node => node.textContent)).toEqual(fixture.names); view.unmount();
    }
    expect(recordCompletion).toHaveBeenCalledTimes(3);
  });

  it('expires at original 180 seconds and reveals only missed answers', async () => {
    const view = await mount(); await start(view, true); const nodes = tiles(view); guess(view, 'aster');
    for (let i = 0; i < 179; i++) tick(1000);
    expect(view.getByText('0:01')).toBeInTheDocument(); expect(recordCompletion).not.toHaveBeenCalled();
    tick(1000); expect(view.getByRole('heading', { name: 'You named 1 of 10 (10%)' })).toBeInTheDocument();
    expect(view.getByText('Time! The rest are shown above. Every list gets easier with practice.')).toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/list-quiz', 1, 'FixtureBaller'); sameTiles(view, nodes);
    expect(nodes[0]).not.toHaveAttribute('data-list-cue'); nodes.slice(1).forEach(node => { expect(node).toHaveAttribute('data-list-cue', 'reveal'); expect(node).toHaveClass(feedback.reveal); });
    view.rerender(element()); sameTiles(view, nodes); tick(600); expect(view.container.querySelector('[data-list-cue]')).toBeNull(); tick(5000); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('retries and changes lists without leaking prior feedback or timers', async () => {
    const view = await mount(); await start(view); const timeout = vi.spyOn(globalThis, 'setTimeout'), clear = vi.spyOn(globalThis, 'clearTimeout');
    guess(view, 'aster'); giveUp(view);
    const owned = timeout.mock.calls.flatMap((args, i) => args[1] === 700 || args[1] === 600 ? [timeout.mock.results[i].value] : []);
    expect(owned).toHaveLength(2); expect(recordCompletion).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Retry' })); });
    expect(tiles(view).every(node => node.dataset.listFound === 'false')).toBe(true); expect(view.container.querySelector('[data-list-cue]')).toBeNull();
    expect(field(view)).toHaveValue(''); expect(field(view)).toHaveFocus(); owned.forEach(id => expect(clear).toHaveBeenCalledWith(id));
    guess(view, fixture.names[3]); giveUp(view);
    const currentOwned = timeout.mock.calls.flatMap((args, i) => args[1] === 700 || args[1] === 600 ? [timeout.mock.results[i].value] : []).slice(-2);
    fireEvent.click(view.getByRole('button', { name: 'More lists' }));
    expect(view.getByRole('button', { name: 'Relaxed' })).toBeInTheDocument(); expect(view.container.querySelector('[data-list-answer]')).toBeNull();
    view.unmount(); currentOwned.forEach(id => expect(clear).toHaveBeenCalledWith(id));
    tick(1000); expect(recordCompletion).toHaveBeenCalledTimes(2);
  });

  it('retains actual load cleaning aliases and failure fallback behavior', async () => {
    expect(await loadPuzzleAnswers(LIST_PUZZLES[0])).toEqual(fixture.names); expect(cleanAnswers([' Fíxture Áster ', 'fixture aster', '', null])).toEqual([fixture.names[0]]);
    const aliases = buildAliasMap(fixture.names); expect(aliases.get('aster')).toBe(0); expect(aliases.has('shared')).toBe(false); expect(aliases.get(normalize(fixture.names[1]))).toBe(1);
    expect([59, 60, 79, 80, 99, 100].map(listQuizTier)).toEqual([null, 'bronze', 'bronze', 'silver', 'silver', 'gold']);
    fixture.fetch.mockRejectedValue(new Error('Fixture outage')); const view = await mount(); await start(view);
    expect(view.getByRole('heading', { name: '🧩 Fictional fallback list' })).toBeInTheDocument(); expect(tiles(view)).toHaveLength(10); expect(fixture.offline).toHaveBeenCalledTimes(1);
    giveUp(view); expect(recordCompletion).toHaveBeenLastCalledWith('/list-quiz', 0, 'FixtureBaller'); view.unmount();
    fixture.offline.mockResolvedValue([]); const failed = await mount(); await start(failed); expect(failed.getByText("Couldn't load this list right now.")).toBeInTheDocument(); expect(failed.queryByRole('textbox')).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(OFFLINE_PUZZLE.id).toBe('fixture-offline');
  });

  it('binds full names 44px controls and finite static styles', async () => {
    const view = await mount(); expect(view.getByRole('button', { name: 'Relaxed' })).toHaveClass(feedback.action); expect(view.getByRole('button', { name: '3:00' })).toHaveClass(feedback.action);
    await start(view); guess(view, fixture.names[3]); expect(tiles(view)[3]).toHaveClass(feedback.fullName); expect(tiles(view)[3]).not.toHaveClass('truncate');
    expect(view.container.querySelector('[data-list-feedback="hit"]')).toHaveClass(feedback.fullName); expect(view.getByRole('button', { name: 'Guess' })).toHaveClass(feedback.action); expect(view.getByRole('button', { name: 'Give up and reveal' })).toHaveClass(feedback.action);
    giveUp(view); expect(view.getByRole('button', { name: 'More lists' })).toHaveClass(feedback.action);
    const css = readFileSync(process.env.LIST_QUIZ_CSS || path.join(process.cwd(), 'src/pages/ListQuizFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/overflow-wrap:\s*anywhere/); expect(css).toMatch(/min-height:\s*44px/); expect(css).toMatch(/animation:\s*answerFound 420ms ease-out 1/); expect(css).toMatch(/animation:\s*answerReveal 360ms ease-out 1/); expect(css).not.toMatch(/infinite/); expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/);
  });
});
