import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import MissingNine from '@/pages/MissingNine';
import { ALL_NINE_NAMES, NINE_LINEUPS, NINE_SCORES, isCorrectNineGuess, nineHintForLevel } from '@/lib/missingNine';
import { recordCompletion } from '@/lib/completions';
import styles from '@/pages/MissingNineFeedback.module.css';

const fixture = vi.hoisted(() => {
  const name = 'Fixture Caldermere';
  const candidate = { name, slotIndex: 3, nationality: 'Generated nation', fact: 'Generated test fact.' };
  const lineup = { id: 'generated-nine', dateLabel: 'Fictional lineup', competition: 'Generated series', matchDate: '2000-01-01', team: 'Generated club', opponent: 'Generated opponent', scoreLine: 'Generated score', venue: 'Generated park', slots: Array.from({ length: 9 }, (_, i) => ({ name: i === 3 ? name : 'Fixture Starter ' + i, position: i === 3 ? 'LF' : 'P' })), blankCandidates: [candidate], source: 'Fictional test fixture only.' };
  return { puzzle: { lineup, candidate }, names: [name, 'Fixture Other', 'Fixture' + 'UnbrokenStarter'.repeat(6)], clipboard: vi.fn(async (_text: string) => {}) };
});
vi.mock('@/lib/missingNine', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/missingNine')>(), getDailyNinePuzzle: () => fixture.puzzle, getRandomNinePuzzle: () => ({ ...fixture.puzzle }), ALL_NINE_NAMES: fixture.names }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

const element = () => <MemoryRouter initialEntries={['/missing-nine']}><HelmetProvider><MissingNine /></HelmetProvider></MemoryRouter>;
const mount = async () => { const view = render(element()); await act(async () => {}); return view; };
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const field = (view: ReturnType<typeof render>) => view.getByRole('textbox', { name: 'Who was the missing starter' });
const guess = (view: ReturnType<typeof render>, value: string) => { fireEvent.change(field(view), { target: { value } }); fireEvent.submit(field(view).closest('form')!); };
const cue = (view: ReturnType<typeof render>) => view.container.querySelector('[data-nine-cue]');
const slots = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll('[data-nine-slot]')];
const sameSlots = (view: ReturnType<typeof render>, nodes: Element[]) => { expect(slots(view)).toHaveLength(9); slots(view).forEach((node, i) => expect(node).toBe(nodes[i])); };
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const rawKey = 'missing-nine-daily-2026-10-01';
const save = (guesses: { t: string }[], gameStatus: string) => ({ v: 1, date: '2026-10-01', puzzleIndex: 0, guesses, gameStatus });

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z')); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } }); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('actual Missing Nine committed feedback', () => {
  it('cues every accepted miss with stable rows and only newly unlocked hints', async () => {
    const view = await mount(), nodes = slots(view), input = field(view), focus = vi.spyOn(input, 'focus');
    guess(view, 'Fixture Wrong'); const first = cue(view), reply = view.container.querySelector('[data-nine-feedback]');
    expect(first).toHaveAttribute('data-nine-cue', 'miss'); expect(first).toHaveClass(styles.miss); expect(reply).toHaveTextContent('Not that night. Try again!'); expect(input).toHaveFocus(); expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(view.container.querySelector('[data-nine-hint="0"]')).toHaveClass(styles.hint); tick(100); guess(view, 'Fixture Wrong');
    expect(cue(view)).not.toBe(first); expect(view.container.querySelector('[data-nine-feedback]')).not.toBe(reply); expect(view.container.querySelector('[data-nine-hint="0"]')).not.toHaveClass(styles.hint);
    for (const i of [1, 2]) expect(view.container.querySelector(`[data-nine-hint="${i}"]`)).toHaveClass(styles.hint);
    expect(JSON.parse(localStorage.getItem(rawKey)!)).toEqual(save([{ t: 'miss' }, { t: 'miss' }], 'playing')); sameSlots(view, nodes);
    guess(view, fixture.puzzle.candidate.name); expect(cue(view)).toHaveAttribute('data-nine-cue', 'won'); expect(cue(view)).toHaveClass(styles.found); expect(view.queryByText('Not that night. Try again!')).toBeNull(); sameSlots(view, nodes);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/missing-nine', 40, 'FixtureBaller', 0); tick(600); expect(cue(view)).toBeNull();
  });

  it('clears old wrong feedback immediately on mode changes and new lineups', async () => {
    const view = await mount(); guess(view, 'Fixture Wrong'); click(view, /Unlimited/);
    expect(cue(view)).toBeNull(); expect(view.queryByText('Not that night. Try again!')).toBeNull(); expect(field(view)).not.toHaveClass('border-destructive'); tick(1200); expect(cue(view)).toBeNull();
    guess(view, 'Fixture Wrong'); guess(view, fixture.puzzle.candidate.name); click(view, 'New lineup'); expect(cue(view)).toBeNull(); expect(field(view)).toHaveFocus(); expect(view.queryByText('Not that night. Try again!')).toBeNull(); tick(1200);
    expect(JSON.parse(localStorage.getItem(rawKey)!)).toEqual(save([{ t: 'miss' }], 'playing')); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps restored hints and finishes quiet without writing or booking again', async () => {
    localStorage.setItem(rawKey, JSON.stringify(save([{ t: 'miss' }, { t: 'miss' }], 'playing'))); const before = localStorage.getItem(rawKey), view = await mount();
    expect(cue(view)).toBeNull(); for (const hint of view.container.querySelectorAll('[data-nine-hint]')) expect(hint).not.toHaveClass(styles.hint); expect(localStorage.getItem(rawKey)).toBe(before); view.unmount();
    localStorage.setItem(rawKey, JSON.stringify(save([{ t: 'miss' }, { t: 'won' }], 'won'))); const finished = localStorage.getItem(rawKey), restored = await mount(); tick(1200);
    expect(cue(restored)).toBeNull(); expect(restored.getByText('70')).toBeInTheDocument(); expect(localStorage.getItem(rawKey)).toBe(finished); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('isolates Give up and cleans the owned timer on unmount', async () => {
    const view = await mount(); guess(view, 'Fixture Wrong'); click(view, 'Give up');
    expect(cue(view)).toBeNull(); expect(view.queryByText('Not that night. Try again!')).toBeNull(); expect(JSON.parse(localStorage.getItem(rawKey)!)).toEqual(save([{ t: 'miss' }, { t: 'give' }], 'lost')); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/missing-nine', 0, 'FixtureBaller', 0); view.unmount();
    localStorage.clear(); const next = await mount(), schedule = vi.spyOn(window, 'setTimeout'), clear = vi.spyOn(window, 'clearTimeout'); guess(next, 'Fixture Wrong');
    const scheduled = schedule.mock.calls.findIndex(args => args[1] === 600); expect(scheduled).toBeGreaterThanOrEqual(0); const timer = schedule.mock.results[scheduled].value;
    next.unmount(); expect(clear).toHaveBeenCalledWith(timer);
  });

  it('keeps blank typing clones and Hard mode quiet without extending the cue', async () => {
    const view = await mount(), nodes = slots(view); guess(view, '  '); fireEvent.change(field(view), { target: { value: 'Fixture' } }); view.rerender(element()); expect(cue(view)).toBeNull(); expect(localStorage.getItem(rawKey)).toBeNull();
    guess(view, 'Fixture Wrong'); const current = cue(view); tick(300); view.rerender(element()); expect(cue(view)).toBe(current); sameSlots(view, nodes); tick(300); expect(cue(view)).toBeNull();
    guess(view, 'Fixture Wrong'); click(view, /Hard mode/); expect(cue(view)).toBeNull(); expect(view.container.querySelector('[data-nine-hint]')).toBeNull(); click(view, /Hard mode/); for (const hint of view.container.querySelectorAll('[data-nine-hint]')) expect(hint).not.toHaveClass(styles.hint);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('binds finite static-motion cues full names and owned44px actions', async () => {
    const css = readFileSync(process.env.MISSING_NINE_FEEDBACK_CSS || path.resolve('src/pages/MissingNineFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/nineMiss 420ms ease-out 1;/); expect(css).toMatch(/nineFound 420ms ease-out 1;/); expect(css).toMatch(/nineReply 420ms ease-out 1;/); expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none;/); expect(css).toMatch(/\.fullName\s*\{\s*min-width:\s*0;\s*max-width:\s*100%;\s*overflow-wrap:\s*anywhere;/); expect(css).toMatch(/\.action\s*\{\s*min-height:\s*44px;\s*min-width:\s*44px;/);
    const view = await mount(); expect(slots(view)[3].querySelector('.animate-pulse')).toBeNull(); expect(slots(view)[0].querySelector('.' + styles.fullName)).toHaveTextContent('Fixture Starter 0');
    fireEvent.change(field(view), { target: { value: 'Fixture' } }); const suggestion = view.getByRole('button', { name: ALL_NINE_NAMES[2] }); expect(suggestion).toHaveClass(styles.fullName, styles.action);
    for (const name of [/Daily/, /Unlimited/, /Hard mode/, 'Guess', 'Give up']) expect(view.getByRole('button', { name })).toHaveClass(styles.action);
    suggestion.focus(); fireEvent.click(suggestion); expect(cue(view)).toHaveClass(styles.miss); expect(field(view)).toHaveFocus();
  });

  it('holds independent original payouts aliases hints saves shares and once completion', async () => {
    expect(NINE_SCORES).toEqual([100, 70, 40]); expect(NINE_LINEUPS.every(lineup => lineup.slots.length === 9 && lineup.blankCandidates.every(candidate => lineup.slots[candidate.slotIndex].name === candidate.name))).toBe(true);
    expect(isCorrectNineGuess('caldermere', fixture.puzzle.candidate)).toBe(true); expect(isCorrectNineGuess('Fixture Wrong', fixture.puzzle.candidate)).toBe(false);
    for (let misses = 0; misses < 3; misses++) {
      localStorage.clear(); vi.mocked(recordCompletion).mockClear(); fixture.clipboard.mockClear(); const view = await mount();
      for (let i = 0; i < misses; i++) guess(view, 'Fixture Wrong');
      for (let i = 1; i <= (misses === 2 ? 3 : misses); i++) expect(view.getByText(nineHintForLevel(i as 1 | 2 | 3, fixture.puzzle.candidate)!)).toBeVisible();
      guess(view, 'caldermere'); const score = [100, 70, 40][misses]; expect(JSON.parse(localStorage.getItem(rawKey)!)).toEqual(save([...Array(misses).fill({ t: 'miss' }), { t: 'won' }], 'won')); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/missing-nine', score, 'FixtureBaller', 0);
      await act(async () => click(view, '📋 Copy Score Card')); expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith(`🕵️ Missing Nine: Oct 1, 2026\n⚾ Missing Nine: ${score} pts\nScore: ${score} points on today's Missing Nine\ndouknowball.com/missing-nine`);
      view.rerender(element()); tick(1200); expect(recordCompletion).toHaveBeenCalledTimes(1); click(view, /Unlimited/); guess(view, fixture.puzzle.candidate.name); click(view, /Daily/); expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    }
    localStorage.clear(); vi.mocked(recordCompletion).mockClear(); const lost = await mount(); for (let i = 0; i < 3; i++) guess(lost, 'Fixture Wrong'); expect(JSON.parse(localStorage.getItem(rawKey)!)).toEqual(save(Array(3).fill({ t: 'miss' }), 'lost')); expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/missing-nine', 0, 'FixtureBaller', 0);
  });
});
