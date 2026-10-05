import './dailyReload/mocks';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ChampOrNot from '@/pages/ChampOrNot';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import { COMPETITIONS, type ChampRound, type CompetitionDef } from '@/lib/champOrNot';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import records from './fixtures/rugbyLeagueRecords.json';

const fixture = vi.hoisted(() => ({ rounds: [] as ChampRound[], builds: 0 }));
vi.mock('@/lib/champOrNot', async original => ({
  ...(await original<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async (def: CompetitionDef) => records[def.key as keyof typeof records] ?? [],
}));
vi.mock('@/lib/rugbyLeagueChallenge', async original => ({
  ...(await original<typeof import('@/lib/rugbyLeagueChallenge')>()),
  buildRugbyLeagueRun: () => { fixture.builds++; return fixture.rounds.map(round => ({ ...round, realTeams: [...round.realTeams] })); },
}));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const mixed = [true, false, true, true, false, true, true, false, true, true];
const misses = [1, 4, 7];
const dailyKey = () => `champ-or-not-daily-${getTodayET()}`;
const stored = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
  localStorage.clear(); resetMocks(); consumeRestoredFinish('champ-or-not');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-10-03T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  Element.prototype.scrollIntoView = vi.fn();
  fixture.builds = 0;
  // Fixed inputs isolate review state; the unchanged real generator stays covered in Round998.
  const years = { nrl: [1997, 1998, 1999, 2000, 2001], dallym: [2014, 2016, 2015, 2011, 2012] };
  fixture.rounds = Array.from({ length: 10 }, (_, index) => {
    const key = index % 2 ? 'dallym' : 'nrl';
    const def = COMPETITIONS.find(value => value.key === key)!;
    const year = years[key][Math.floor(index / 2)];
    const realTeams = records[key].filter(row => row.year === year).map(row => row.team);
    const isTrue = index % 3 !== 0;
    const shownTeam = isTrue ? realTeams[0] : records[key].find(row => !realTeams.includes(row.team))!.team;
    return { compKey: key, emoji: def.emoji, sourceLabel: def.label, statement: def.phrase(shownTeam, year), isTrue, year, shownTeam, realTeams };
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); consumeRestoredFinish('champ-or-not'); });

async function page(start = true) {
  localStorage.setItem(dailyKey(), JSON.stringify({ answers: [true, false, true] }));
  const view = render(<HelmetProvider><MemoryRouter><ChampOrNot /></MemoryRouter></HelmetProvider>);
  await flush();
  fireEvent.click(view.getByRole('button', { name: 'Rugby League' })); await flush();
  const panel = view.container.querySelector<HTMLElement>('[data-rugby-challenge]')!;
  expect(panel).toHaveAttribute('data-rugby-phase', 'intro');
  if (start) click(panel, 'Start ten questions');
  return { view, panel };
}
const button = (panel: HTMLElement, name: string) => within(panel).getByRole('button', { name });
const click = (panel: HTMLElement, name: string) => fireEvent.click(button(panel, name));
function finish(panel: HTMLElement, correct = mixed) {
  correct.forEach((earned, index) => {
    const round = fixture.rounds[index];
    expect(panel.querySelector('[data-rugby-statement]')).toHaveTextContent(round.statement);
    click(panel, (earned ? round.isTrue : !round.isTrue) ? 'CHAMP' : 'NOT');
    click(panel, index === 9 ? 'View results' : 'Next claim');
  });
  expect(panel).toHaveAttribute('data-rugby-phase', 'done');
}
function originalScore(panel: HTMLElement, total = 7) {
  expect(panel.querySelector('[data-rugby-score="total"]'), 'Original total stays fixed').toHaveTextContent(`${total} / 10`);
  expect(panel.querySelector('[data-rugby-score="nrl"]')).toHaveTextContent(total === 10 ? '5 / 5' : '4 / 5');
  expect(panel.querySelector('[data-rugby-score="dallym"]')).toHaveTextContent(total === 10 ? '5 / 5' : '3 / 5');
}
function retry(panel: HTMLElement, index: number, correct = true) {
  const round = fixture.rounds[misses[index]];
  expect(panel.querySelector('[data-rugby-retry]'), 'Retry contains only original misses in their original order').toHaveAttribute('data-rugby-retry-original', String(misses[index] + 1));
  expect(panel.querySelector('[data-rugby-retry-statement]')).toHaveTextContent(round.statement);
  expect(panel.querySelector('[data-rugby-retry-feedback]')).toBeNull();
  click(panel, (correct ? round.isTrue : !round.isTrue) ? 'CHAMP' : 'NOT');
  expect(panel.querySelector('[data-rugby-retry-feedback]')).toHaveTextContent(correct ? 'Corrected!' : 'Still one to learn.');
  expect(panel.querySelector('[data-rugby-retry-winners]')).toHaveTextContent(round.realTeams.join(' and '));
  expect(panel.querySelector('[data-rugby-original-score]'), 'Practice corrections never increase the original total').toHaveTextContent('Original: 7 / 10');
  click(panel, index === misses.length - 1 ? 'View retry result' : 'Next missed call');
}

describe('Rugby League completed-call review', () => {
  it('reviews all ten original choices truths and shared winners in one card', async () => {
    const { panel } = await page(); finish(panel); originalScore(panel);
    click(panel, 'Review ten calls');
    expect(button(panel, 'Review claim 1: correct'), 'Review opens on its selected claim tile').toHaveFocus();
    expect(within(panel).getAllByRole('button', { name: /^Review claim / })).toHaveLength(10);
    fixture.rounds.forEach((round, index) => {
      const tile = button(panel, `Review claim ${index + 1}: ${mixed[index] ? 'correct' : 'incorrect'}`);
      tile.focus(); fireEvent.click(tile);
      expect(tile, 'Review selection keeps focus on the chosen tile').toHaveFocus();
      expect(tile).toHaveAttribute('aria-pressed', 'true');
      expect(panel.querySelector('[data-rugby-review]')).toHaveAttribute('data-rugby-review-index', String(index + 1));
      expect(panel.querySelectorAll('[data-rugby-review-statement]')).toHaveLength(1);
      expect(panel.querySelector('[data-rugby-review-statement]')).toHaveTextContent(round.statement);
      const pick = mixed[index] ? round.isTrue : !round.isTrue;
      expect(panel.querySelector('[data-rugby-review-pick]')?.textContent?.replace(/\s+/g, ' ').trim(), 'Review shows the original choice, including wrong choices').toContain(`Your original call: ${pick ? 'CHAMP' : 'NOT'}`);
      expect(panel.querySelector('[data-rugby-review-truth]')?.textContent?.trim(), 'Review keeps the original truth').toBe(`The claim is ${round.isTrue ? 'true' : 'false'}.`);
      expect(panel.querySelector('[data-rugby-review-winners]')?.textContent?.replace(/\s+/g, ' ').trim(), 'Review retains every shared winner').toContain(round.realTeams.join(' and '));
      expect(panel.querySelector('[data-rugby-original-score]')).toHaveTextContent('Original: 7 / 10');
    });
    click(panel, 'Back to original results'); originalScore(panel);
    expect(button(panel, 'Review ten calls'), 'Review returns focus to its original opener').toHaveFocus();
  });

  it('retries only the original misses and reports a separate corrected total', async () => {
    const { panel } = await page(); finish(panel);
    expect(panel.querySelector('[data-rugby-open-retry]'), 'Retry queue size equals the original misses').toHaveTextContent('Retry 3 missed calls');
    click(panel, 'Retry 3 missed calls');
    [true, false, true].forEach((correct, index) => retry(panel, index, correct));
    expect(panel).toHaveAttribute('data-rugby-phase', 'retry-done');
    expect(panel.querySelector('[data-rugby-retry-score]'), 'Only correct retry choices enter the corrected tally').toHaveTextContent('2 / 3 corrected');
    expect(panel.querySelector('[data-rugby-original-score]')).toHaveTextContent('Original: 7 / 10, unchanged.');
    click(panel, 'Back to original results'); originalScore(panel);
    expect(button(panel, 'View retry result')).toHaveFocus(); click(panel, 'View retry result');
    expect(panel.querySelector('[data-rugby-retry-score]')).toHaveTextContent('2 / 3 corrected');
  });

  it('resumes the same pending and revealed retry after returning or hiding rugby', async () => {
    const { view, panel } = await page(); finish(panel); click(panel, 'Retry 3 missed calls');
    click(panel, 'Back to original results'); click(panel, 'Resume missed calls');
    expect(panel).toHaveAttribute('data-rugby-phase', 'retry-question');
    const round = fixture.rounds[misses[0]];
    click(panel, round.isTrue ? 'CHAMP' : 'NOT');
    const reveal = panel.querySelector('[data-rugby-retry-feedback]')!.textContent;
    click(panel, 'Back to original results'); originalScore(panel);
    expect(button(panel, 'Resume missed calls')).toHaveFocus(); click(panel, 'Resume missed calls');
    expect(panel, 'Resume retains an already revealed retry').toHaveAttribute('data-rugby-phase', 'retry-reveal');
    expect(panel.querySelector('[data-rugby-retry-feedback]')).toHaveTextContent(reveal!);
    fireEvent.click(view.getByRole('button', { name: 'Daily' })); expect(panel).not.toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Rugby League' })); expect(panel).toBeVisible();
    expect(panel.querySelector('[data-rugby-retry-feedback]')).toHaveTextContent(reveal!);
    click(panel, 'Next missed call'); retry(panel, 1); retry(panel, 2);
    expect(panel.querySelector('[data-rugby-retry-score]')).toHaveTextContent('3 / 3 corrected');
  });

  it('accepts one retry answer and one advance from same-frame repeated inputs', async () => {
    const { panel } = await page(); finish(panel);
    const start = button(panel, 'Retry 3 missed calls');
    act(() => { start.click(); start.click(); });
    const truth = fixture.rounds[misses[0]].isTrue;
    const yes = button(panel, truth ? 'CHAMP' : 'NOT'), no = button(panel, truth ? 'NOT' : 'CHAMP');
    act(() => { yes.click(); no.click(); });
    expect(panel.querySelector('[data-rugby-retry-feedback]')).toHaveTextContent('Corrected!');
    const next = button(panel, 'Next missed call'); act(() => { next.click(); next.click(); });
    expect(panel.querySelector('[data-rugby-retry]'), 'Repeated advance moves to exactly the next original miss').toHaveAttribute('data-rugby-retry-original', '5');
    retry(panel, 1); retry(panel, 2);
    expect(panel.querySelector('[data-rugby-retry-score]'), 'Repeated answers cannot inflate or shift the retry tally').toHaveTextContent('3 / 3 corrected');
  });

  it('offers review without an empty retry after a perfect original run', async () => {
    const { panel } = await page(); finish(panel, Array(10).fill(true)); originalScore(panel, 10);
    expect(panel.querySelector('[data-rugby-open-retry]'), 'A perfect original run has no empty retry').toBeNull();
    click(panel, 'Review ten calls');
    expect(within(panel).getAllByRole('button', { name: /^Review claim \d+: correct$/ })).toHaveLength(10);
    click(panel, 'Back to original results'); originalScore(panel, 10);
  });

  it('starts an explicit fresh retry and clears review state for another ten', async () => {
    const { panel } = await page(); finish(panel); click(panel, 'Retry 3 missed calls');
    misses.forEach((_, index) => retry(panel, index));
    expect(panel.querySelector('[data-rugby-retry-score]')).toHaveTextContent('3 / 3 corrected');
    click(panel, 'Try missed calls again');
    expect(panel).toHaveAttribute('data-rugby-phase', 'retry-question');
    misses.forEach((_, index) => retry(panel, index, false));
    expect(panel.querySelector('[data-rugby-retry-score]'), 'An explicit new retry clears its prior answers').toHaveTextContent('0 / 3 corrected');
    click(panel, 'Back to original results'); click(panel, 'Review ten calls');
    click(panel, 'Review claim 8: incorrect'); click(panel, 'Back to original results');
    const builds = fixture.builds; click(panel, 'Play another ten');
    expect(fixture.builds).toBe(builds + 1);
    expect(panel).toHaveAttribute('data-rugby-phase', 'question');
    expect(panel.querySelector('[data-rugby-review]')).toBeNull(); expect(panel.querySelector('[data-rugby-retry]')).toBeNull();
    finish(panel); originalScore(panel);
    expect(panel.querySelector('[data-rugby-open-retry]'), 'A new original run clears the old retry session').toHaveTextContent('Retry 3 missed calls');
    click(panel, 'Review ten calls'); expect(panel.querySelector('[data-rugby-review]')).toHaveAttribute('data-rugby-review-index', '1');
    click(panel, 'Back to original results'); click(panel, 'Retry 3 missed calls'); retry(panel, 0);
  });

  it('explains separate retry scores before play and blocks actions behind reopened rules', async () => {
    const { view, panel } = await page(false);
    click(panel, 'Rugby League rules');
    let dialog = view.getByRole('dialog');
    expect(dialog, 'Rules explain the separate original and corrected scores').toHaveTextContent('7/10 original run stays 7/10');
    click(dialog, "Let's Play!"); act(() => vi.advanceTimersByTime(0));
    click(panel, 'Start ten questions'); finish(panel); click(panel, 'Retry 3 missed calls');
    const answer = button(panel, 'CHAMP'); click(panel, 'Rugby League rules'); dialog = view.getByRole('dialog');
    fireEvent.click(answer);
    expect(panel, 'Open rules block the background retry choice').toHaveAttribute('data-rugby-phase', 'retry-question');
    click(dialog, "Let's Play!"); act(() => vi.advanceTimersByTime(0));
    expect(button(panel, 'Rugby League rules')).toHaveFocus();
    click(panel, fixture.rounds[misses[0]].isTrue ? 'CHAMP' : 'NOT');
    const next = button(panel, 'Next missed call'); click(panel, 'Rugby League rules'); dialog = view.getByRole('dialog');
    fireEvent.click(next);
    expect(panel, 'Open rules block the background retry advance').toHaveAttribute('data-rugby-phase', 'retry-reveal');
    click(dialog, "Let's Play!"); act(() => vi.advanceTimersByTime(0));
    expect(panel.querySelector('[data-rugby-retry]')).toHaveAttribute('data-rugby-retry-original', '2');
  });

  it('keeps future claims unavailable before the original ten are complete', async () => {
    const { panel } = await page();
    for (let index = 0; index < 10; index++) {
      expect(within(panel).queryByRole('button', { name: 'Review ten calls' }), 'Review cannot expose unfinished original claims').toBeNull();
      expect(panel.querySelector('[data-rugby-open-retry]')).toBeNull();
      expect(panel.querySelector('[data-rugby-review]')).toBeNull();
      click(panel, fixture.rounds[index].isTrue ? 'CHAMP' : 'NOT');
      expect(within(panel).queryByRole('button', { name: 'Review ten calls' })).toBeNull();
      click(panel, index === 9 ? 'View results' : 'Next claim');
    }
    expect(within(panel).queryByRole('button', { name: 'Review ten calls' })).not.toBeNull();
  });

  it('keeps every saved byte and completion unchanged through review and retry', async () => {
    const { view, panel } = await page();
    localStorage.setItem('rugby-review-unrelated', 'held');
    const held = stored(); const set = vi.spyOn(Storage.prototype, 'setItem'), remove = vi.spyOn(Storage.prototype, 'removeItem');
    finish(panel); click(panel, 'Review ten calls'); click(panel, 'Review claim 4: correct'); click(panel, 'Back to original results');
    click(panel, 'Retry 3 missed calls'); misses.forEach((_, index) => retry(panel, index));
    click(panel, 'Back to original results'); click(panel, 'Play another ten');
    fireEvent.click(view.getByRole('button', { name: 'Daily' }));
    expect(stored(), 'Review and retry never alter saved records').toEqual(held);
    expect(set, 'Review and retry never transiently save records').not.toHaveBeenCalled();
    expect(remove, 'Review and retry never remove saved records').not.toHaveBeenCalled();
    expect(recordCompletion, 'Review and retry never book a completion').not.toHaveBeenCalled();
  });

  it('preserves the original Daily score save and one completion across reload', async () => {
    const view = renderHook(useChampOrNot); await flush();
    expect(view.result.current.loadState).toBe('ready');
    for (const earned of mixed) {
      const truth = view.result.current.current!.isTrue;
      act(() => view.result.current.answer(earned ? truth : !truth));
      act(() => view.result.current.advanceReveal());
    }
    expect(view.result.current.score).toBe(7); expect(view.result.current.done).toBe(true);
    const bytes = JSON.stringify({ answers: mixed }); expect(localStorage.getItem(dailyKey())).toBe(bytes);
    expect(recordCompletion).toHaveBeenCalledTimes(1); view.unmount();
    const restored = renderHook(useChampOrNot); await flush();
    expect(restored.result.current.score).toBe(7); expect(restored.result.current.done).toBe(true);
    expect(localStorage.getItem(dailyKey())).toBe(bytes); expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(fixture.builds).toBe(0);
  });
});
