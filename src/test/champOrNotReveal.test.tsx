// Fictional competition rows exercise the real builder, hook, page and daily save.
import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import ChampOrNot from '@/pages/ChampOrNot';
import { COMPETITIONS, buildRounds, type CompetitionDef, type ChampRow } from '@/lib/champOrNot';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

vi.mock('@/lib/champOrNot', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async (comp: CompetitionDef) => fixtureRows(comp),
}));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => <button>Help fixture</button> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <div data-fixture-share={score} /> }));

function fixtureRows(comp: CompetitionDef): ChampRow[] {
  return Array.from({ length: 12 }, (_, i) => ({ year: 2000 + i, team: `Fictional ${comp.key} Champion ${i}`, ...(comp.finals ? { beat: `the Fictional ${comp.key} Finalist ${i} 4-2` } : {}) }));
}
const boardFor = (day: string) => buildRounds(new Map(COMPETITIONS.map(comp => [comp.key, fixtureRows(comp)])), `champ-or-not:${day}`, 10, false);
const key = (day = getTodayET()) => `champ-or-not-daily-${day}`;
const saved = (day = getTodayET()) => JSON.parse(localStorage.getItem(key(day))!);
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
  localStorage.clear(); resetMocks(); consumeRestoredFinish('champ-or-not');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-10-02T16:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); consumeRestoredFinish('champ-or-not'); });
async function start(mode: 'daily' | 'unlimited' = 'daily') {
  const view = renderHook(useChampOrNot); await flush();
  expect(view.result.current.loadState).toBe('ready'); expect(view.result.current.rounds).toHaveLength(10);
  if (mode === 'unlimited') act(() => view.result.current.switchMode(mode));
  return view;
}
type View = Awaited<ReturnType<typeof start>>;
function pick(view: View, correct = true) { act(() => view.result.current.answer(correct ? view.result.current.current!.isTrue : !view.result.current.current!.isTrue)); }
function next(view: View) { act(() => view.result.current.advanceReveal()); }
// The old timed action and current explicit action share the same scoring baseline.
function settleBaseline(view: View) {
  act(() => vi.advanceTimersByTime(2300));
  if (view.result.current.showingResult) next(view);
}
function toLast(view: View, wrongAt = -1) {
  for (let i = 0; i < 9; i++) { pick(view, i !== wrongAt); settleBaseline(view); }
  expect(view.result.current.roundIdx).toBe(9);
}
async function page() {
  const view = render(<HelmetProvider><MemoryRouter><ChampOrNot /></MemoryRouter></HelmetProvider>); await flush();
  expect(view.getByRole('button', { name: '🏆 CHAMP' })).toBeEnabled();
  return view;
}
function pagePick(view: Awaited<ReturnType<typeof page>>, truth: boolean) {
  fireEvent.click(view.getByRole('button', { name: truth ? '🏆 CHAMP' : '🚫 NOT' }));
}

describe('Champ or Not readable reveal', () => {
  it.each(['daily', 'unlimited'] as const)('keeps the %s explanation readable until an explicit advance', async mode => {
    const view = await start(mode), round = view.result.current.current;
    pick(view); act(() => vi.advanceTimersByTime(10_000));
    expect(view.result.current.current).toEqual(round); expect(view.result.current.showingResult).toBe(true);
    expect(view.result.current.lastPick).toBe(round!.isTrue); expect(view.result.current.answers).toEqual([]);
    next(view); expect(view.result.current.roundIdx).toBe(1); expect(view.result.current.score).toBe(1);
    expect(view.result.current.showingResult).toBe(false);
    next(view); expect(view.result.current.answers).toEqual([true]);
  });

  it('preserves ordinary advancement and exact accepted score as an independent baseline', async () => {
    const view = await start(); pick(view); expect(saved()).toEqual({ answers: [true] });
    settleBaseline(view); expect(view.result.current.answers).toEqual([true]); expect(view.result.current.score).toBe(1);
    expect(view.result.current.roundIdx).toBe(1); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves a wrong answer as one saved false with no earned point', async () => {
    const view = await start(); pick(view, false); expect(saved()).toEqual({ answers: [false] });
    settleBaseline(view); expect(view.result.current.answers).toEqual([false]); expect(view.result.current.score).toBe(0);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('same-frame answers accept only the first decided pick', async () => {
    const view = await start(), answer = view.result.current.answer, truth = view.result.current.current!.isTrue;
    act(() => { answer(truth); answer(!truth); });
    expect(view.result.current.lastPick).toBe(truth); expect(saved()).toEqual({ answers: [true] });
    next(view); expect(view.result.current.answers).toEqual([true]); expect(view.result.current.score).toBe(1);
  });

  it('rejects nonboolean input without deciding or saving a claim', async () => {
    const view = await start();
    for (const invalid of [0, 1, 'true', null, undefined, NaN]) {
      act(() => view.result.current.answer(invalid as unknown as boolean));
      expect(view.result.current.showingResult).toBe(false); expect(view.result.current.lastPick).toBeNull();
      expect(view.result.current.answers).toEqual([]); expect(localStorage.getItem(key())).toBeNull();
    }
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('mode changes discard pending actions and recover the exact saved daily', async () => {
    const view = await start(); pick(view); const raw = localStorage.getItem(key());
    act(() => view.result.current.switchMode('unlimited')); next(view);
    expect(view.result.current.answers).toEqual([]); expect(view.result.current.showingResult).toBe(false);
    pick(view); next(view); expect(view.result.current.answers).toEqual([true]);
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.answers).toEqual([true]); expect(view.result.current.showingResult).toBe(false);
    expect(localStorage.getItem(key())).toBe(raw); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('unlimited replay clears pending feedback and leaves the daily save intact', async () => {
    const view = await start(); pick(view); settleBaseline(view); const raw = localStorage.getItem(key());
    act(() => view.result.current.switchMode('unlimited')); pick(view);
    act(() => view.result.current.playAgain()); next(view);
    expect(view.result.current.answers).toEqual([]); expect(view.result.current.showingResult).toBe(false);
    pick(view); next(view); expect(view.result.current.answers).toEqual([true]);
    expect(localStorage.getItem(key())).toBe(raw); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('unlimited Hard change clears the pending decision before the fresh run', async () => {
    const view = await start('unlimited'); pick(view);
    act(() => view.result.current.toggleHard()); next(view);
    expect(view.result.current.hardActive).toBe(true); expect(view.result.current.answers).toEqual([]);
    expect(view.result.current.showingResult).toBe(false); pick(view); next(view);
    expect(view.result.current.answers).toEqual([true]); expect(localStorage.getItem(key())).toBeNull();
  });

  it('Daily Hard toggle preserves the same pending claim and its saved decision', async () => {
    const view = await start(), round = view.result.current.current; pick(view); const raw = localStorage.getItem(key());
    act(() => view.result.current.toggleHard());
    expect(view.result.current.hardActive).toBe(false); expect(view.result.current.current).toEqual(round);
    expect(view.result.current.showingResult).toBe(true); next(view);
    expect(view.result.current.answers).toEqual([true]); expect(localStorage.getItem(key())).toBe(raw);
  });

  it('early reveal refresh resumes after the already saved answer', async () => {
    const first = await start(); pick(first); first.unmount(); const again = await start();
    expect(again.result.current.roundIdx).toBe(1); expect(again.result.current.answers).toEqual([true]);
    expect(again.result.current.showingResult).toBe(false); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('final pick saves and books the mixed score before results and refresh never books twice', async () => {
    const first = await start(); toLast(first, 2); pick(first);
    expect(first.result.current.done).toBe(false); expect(saved().answers).toEqual([true, true, false, true, true, true, true, true, true, true]);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/champ-or-not', 9, 'Tester', 1);
    first.unmount(); const again = await start();
    expect(again.result.current.done).toBe(true); expect(again.result.current.score).toBe(9);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('final reveal mode return retains the completed daily and its single booking', async () => {
    const view = await start(); toLast(view); pick(view);
    act(() => view.result.current.switchMode('unlimited')); next(view);
    expect(view.result.current.answers).toEqual([]); act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.done).toBe(true); expect(view.result.current.score).toBe(10);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/champ-or-not', 10, 'Tester', 1);
  });

  it('overnight final pick belongs to the pinned day that dealt the claims', async () => {
    vi.setSystemTime(new Date('2026-10-03T03:59:00Z')); const view = await start(); toLast(view);
    vi.setSystemTime(new Date('2026-10-03T04:01:00Z')); pick(view); settleBaseline(view);
    expect(saved('2026-10-02').answers).toHaveLength(10); expect(localStorage.getItem(key('2026-10-03'))).toBeNull();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/champ-or-not', 10, 'Tester', 1);
  });

  it.each([true, false])('the page retains %s feedback and shows its earned score before Next claim', async correct => {
    const view = await page(), round = boardFor(getTodayET())[0];
    const choice = view.getByRole('button', { name: (correct ? round.isTrue : !round.isTrue) ? '🏆 CHAMP' : '🚫 NOT' });
    const focus = vi.spyOn(HTMLElement.prototype, 'focus'); choice.focus(); focus.mockClear(); fireEvent.click(choice);
    expect(view.getByText('Right:', { exact: false })).toHaveTextContent(`Right: ${correct ? 1 : 0}`);
    act(() => vi.advanceTimersByTime(10_000)); const feedback = view.getByRole('status');
    expect(feedback).toHaveTextContent(round.isTrue ? 'That one really happened.' : `Nope. ${round.year} went to ${round.realTeams.join(' and ')}.`);
    if (round.beatLine) expect(feedback).toHaveTextContent(`They beat ${round.beatLine}.`);
    expect(view.getByText(correct ? 'Right!' : 'Wrong!')).toBeVisible();
    expect(view.queryByRole('button', { name: '🏆 CHAMP' })).toBeNull(); expect(view.queryByRole('button', { name: '🚫 NOT' })).toBeNull();
    const advance = view.getByRole('button', { name: 'Next claim' }); expect(advance).toBeEnabled(); expect(advance).toHaveFocus();
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true }); fireEvent.click(advance);
    expect(view.queryByRole('status')).toBeNull(); expect(view.getByText('Claim:', { exact: false })).toHaveTextContent('Claim: 2/10');
  });

  it('preserves deliberate Help Hard mode and Record Books focus during answer feedback', async () => {
    for (const name of ['Help fixture', '😈 Hard', 'Daily', 'Unlimited', 'Browse the Record Books']) {
      const view = await page(), round = boardFor(getTodayET())[0];
      const outside = name === 'Browse the Record Books' ? view.getByRole('link', { name }) : view.getByRole('button', { name });
      outside.focus(); pagePick(view, round.isTrue);
      expect(view.getByRole('button', { name: 'Next claim' })).toBeEnabled(); expect(outside).toHaveFocus();
      expect(saved()).toEqual({ answers: [true] }); view.unmount(); localStorage.removeItem(key());
    }
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('page final View results retains the exact mixed score share and single booking', async () => {
    const view = await page(), rounds = boardFor(getTodayET());
    for (let i = 0; i < rounds.length; i++) {
      pagePick(view, i === 2 ? !rounds[i].isTrue : rounds[i].isTrue);
      expect(view.getByText('Right:', { exact: false })).toHaveTextContent(`Right: ${i < 2 ? i + 1 : i}`);
      const advance = view.getByRole('button', { name: i === 9 ? 'View results' : 'Next claim' }); expect(advance).toBeEnabled();
      if (i === 9) {
        expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/champ-or-not', 9, 'Tester', 1);
        act(() => vi.advanceTimersByTime(10_000)); expect(advance).toBeVisible(); expect(saved().answers).toHaveLength(10);
      }
      fireEvent.click(advance);
    }
    expect(within(view.getByRole('status')).getByRole('heading', { name: '9/10 Called Right!' })).toBeVisible();
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', "9/10 on today's Champ or Not");
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
