import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { CareerPlayer, CareerSeason } from '@/types/career';

const fixture = vi.hoisted(() => ({
  player: { name: 'Generated Career Target', nationality: 'Generated Nation', position: 'Generated Position', career: [] as CareerSeason[] } as CareerPlayer,
}));
vi.mock('@/data/careerPlayers', () => ({ careerPlayers: [fixture.player] }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: async () => [fixture.player] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: async () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ headline, statLine }: { headline: ReactNode; statLine: ReactNode }) => <section aria-label="Fixture result">{headline}{statLine}</section> }));

import CareerGame from '@/pages/CareerGame';
import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const DATE = '2026-11-05';
const SAVE_KEY = 'career-path-daily-' + DATE;
const LABEL = 'Reveal an early club';
type Action = { t: 'cell'; key: string } | { t: 'wrong' } | { t: 'won' } | { t: 'give' };
function rows(): CareerSeason[] {
  // Deliberately nonchronological season labels. Existing board order is authoritative.
  return [
    { season: '2099-2100', club: '   ', appearances: 0, goals: 0, assists: null, marketValue: 0 },
    { season: '2055-2056', club: 'Generated Early / Generated Loan', appearances: 12, goals: 2, assists: 1, marketValue: 3 },
    { season: '2001-2002', club: 'Generated Middle', appearances: 13, goals: 3, assists: 2, marketValue: 4 },
    { season: '1990-1991', club: 'Generated Last', appearances: 14, goals: 4, assists: 3, marketValue: 5 },
  ];
}
function exactSave(guesses: Action[], gameStatus: 'playing' | 'won' | 'lost' = 'playing') {
  return { v: 1, date: DATE, puzzleIndex: 0, puzzleId: fixture.player.name, guesses, gameStatus };
}
const readSave = () => JSON.parse(localStorage.getItem(SAVE_KEY)!);
const cell = (key: string): Action => ({ t: 'cell', key });
async function mount() {
  const view = render(<MemoryRouter initialEntries={['/career']}><CareerGame /></MemoryRouter>);
  await waitFor(() => expect(view.queryByRole('textbox', { name: 'Guess the player by name' })).not.toBeNull());
  return view;
}
function early(view: ReturnType<typeof render>, marker: string): HTMLButtonElement {
  const button = view.queryByRole('button', { name: LABEL });
  expect(button, marker + ' native named control exists').not.toBeNull();
  return button as HTMLButtonElement;
}
function counts(view: ReturnType<typeof render>, boxes: number, guesses = 0, marker = 'EARLY_CLUB_COUNTS') {
  expect(view.getByText('Boxes:').textContent, marker).toBe('Boxes: ' + boxes);
  expect(view.getByText('Guesses:').textContent, marker).toBe('Guesses: ' + guesses + '/8');
}
function guess(view: ReturnType<typeof render>, answer: string) {
  const input = view.getByRole('textbox', { name: 'Guess the player by name' });
  fireEvent.change(input, { target: { value: answer } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('rules-gate-seen:/career', '1');
  fixture.player.career = rows();
  consumeRestoredFinish('career');
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(DATE + 'T17:00:00Z'));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Career Quiz deliberate early club assistance', () => {
  it('EARLY_CLUB_NATIVE explains the ordinary one-box action beside the existing random hint', async () => {
    const view = await mount(), button = early(view, 'EARLY_CLUB_NATIVE');
    expect(button, 'EARLY_CLUB_NATIVE native button').toBeInstanceOf(HTMLButtonElement);
    expect(button, 'EARLY_CLUB_NATIVE initially enabled').toBeEnabled();
    expect(button, 'EARLY_CLUB_NATIVE touch target class').toHaveClass('min-h-[44px]');
    const random = view.getByRole('button', { name: 'Give Hint' });
    expect(random, 'EARLY_CLUB_NATIVE random choice retained').toBeEnabled();
    expect(view.queryByText(/earliest club box still hidden on this board/i), 'EARLY_CLUB_NATIVE visible policy').toBeVisible();
    expect(view.container, 'EARLY_CLUB_NATIVE visible ordinary box cost').toHaveTextContent(/\b1 (?:ordinary )?box\b/);
    expect(view.container, 'EARLY_CLUB_NATIVE visible random box cost').toHaveTextContent(/4 random (?:hidden )?boxes/);
    fireEvent.click(view.getByRole('button', { name: 'How to play' }));
    const help = view.getByRole('dialog', { name: 'How to Play: Career Quiz' });
    expect(help, 'EARLY_CLUB_NATIVE help names assistance').toHaveTextContent(LABEL);
    expect(help, 'EARLY_CLUB_NATIVE help explains one box').toHaveTextContent(/\b1 (?:ordinary )?box\b/);
    expect(help, 'EARLY_CLUB_NATIVE old four random policy').toHaveTextContent('4 random boxes');
    expect(recordCompletion, 'EARLY_CLUB_NATIVE help is quiet').not.toHaveBeenCalled();
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_NATIVE help does not add an action').toBeNull();
  });

  it('EARLY_CLUB_ORDER reveals one nonempty club in board order without drawing or editing data', async () => {
    const before = JSON.stringify(fixture.player), view = await mount(), button = early(view, 'EARLY_CLUB_ORDER');
    const random = vi.spyOn(Math, 'random');
    fireEvent.click(button);
    expect(readSave(), 'EARLY_CLUB_ORDER exact ordinary action').toEqual(exactSave([cell('1-club')]));
    counts(view, 1, 0, 'EARLY_CLUB_ORDER');
    expect(view.getByText('Generated Early / Generated Loan', { exact: true }), 'EARLY_CLUB_ORDER combined source cell is intact').toBeVisible();
    expect(view.queryByRole('button', { name: 'Reveal club for career row 2' }), 'EARLY_CLUB_ORDER selected cell is uncovered').toBeNull();
    expect(view.getByRole('button', { name: 'Reveal club for career row 4' }), 'EARLY_CLUB_ORDER does not sort season labels').toBeEnabled();
    expect(random, 'EARLY_CLUB_ORDER consumes no random draws').not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.player), 'EARLY_CLUB_ORDER input unchanged').toBe(before);
    expect(recordCompletion, 'EARLY_CLUB_ORDER no completion').not.toHaveBeenCalled();
  });

  it('EARLY_CLUB_SKIP skips manually revealed clubs and preserves other revealed cells', async () => {
    const view = await mount(); early(view, 'EARLY_CLUB_SKIP');
    fireEvent.click(view.getByRole('button', { name: 'Reveal goals for career row 1' }));
    fireEvent.click(view.getByRole('button', { name: 'Reveal club for career row 2' }));
    fireEvent.click(early(view, 'EARLY_CLUB_SKIP'));
    expect(readSave(), 'EARLY_CLUB_SKIP old cells and exactly one new club').toEqual(exactSave([cell('0-goals'), cell('1-club'), cell('2-club')]));
    counts(view, 3, 0, 'EARLY_CLUB_SKIP');
    expect(view.getByText('Generated Middle', { exact: true }), 'EARLY_CLUB_SKIP next club visible').toBeVisible();
  });

  it('EARLY_CLUB_EXHAUST progresses once per eligible row then disables while random boxes remain', async () => {
    const view = await mount(); early(view, 'EARLY_CLUB_EXHAUST');
    for (const [index, club] of ['Generated Early / Generated Loan', 'Generated Middle', 'Generated Last'].entries()) {
      fireEvent.click(early(view, 'EARLY_CLUB_EXHAUST'));
      expect(readSave(), 'EARLY_CLUB_EXHAUST ordered ledger step ' + index).toEqual(exactSave(Array.from({ length: index + 1 }, (_, i) => cell((i + 1) + '-club'))));
      expect(view.getByText(club, { exact: true }), 'EARLY_CLUB_EXHAUST new information').toBeVisible();
      counts(view, index + 1, 0, 'EARLY_CLUB_EXHAUST');
    }
    const button = early(view, 'EARLY_CLUB_EXHAUST');
    expect(button, 'EARLY_CLUB_EXHAUST no eligible club').toBeDisabled();
    expect(view.getByRole('button', { name: 'Give Hint' }), 'EARLY_CLUB_EXHAUST other hidden cells remain').toBeEnabled();
    const before = localStorage.getItem(SAVE_KEY); fireEvent.click(button);
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_EXHAUST disabled action is quiet').toBe(before);
  });

  it('EARLY_CLUB_EMPTY refuses blank club information on an otherwise hidden board', async () => {
    fixture.player.career = rows().map((row, i) => ({ ...row, club: i % 2 ? '' : ' \t ' }));
    const view = await mount(), button = early(view, 'EARLY_CLUB_EMPTY');
    expect(button, 'EARLY_CLUB_EMPTY empty and whitespace clubs excluded').toBeDisabled();
    fireEvent.click(button);
    counts(view, 0, 0, 'EARLY_CLUB_EMPTY');
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_EMPTY no ledger write').toBeNull();
    expect(view.getByRole('button', { name: 'Give Hint' }), 'EARLY_CLUB_EMPTY classic hint retained').toBeEnabled();
  });

  it('EARLY_CLUB_RELOAD resumes the exact ordinary daily action ledger', async () => {
    const prior: Action[] = [cell('1-club'), { t: 'wrong' }, cell('0-goals')];
    localStorage.setItem(SAVE_KEY, JSON.stringify(exactSave(prior)));
    let view = await mount(); fireEvent.click(early(view, 'EARLY_CLUB_RELOAD'));
    const afterFirst = JSON.stringify(exactSave([...prior, cell('2-club')]));
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_RELOAD first append exact bytes').toBe(afterFirst);
    counts(view, 3, 1, 'EARLY_CLUB_RELOAD'); view.unmount();
    view = await mount(); counts(view, 3, 1, 'EARLY_CLUB_RELOAD');
    expect(view.getByText('Generated Middle', { exact: true }), 'EARLY_CLUB_RELOAD visible save replay').toBeVisible();
    fireEvent.click(early(view, 'EARLY_CLUB_RELOAD'));
    expect(readSave(), 'EARLY_CLUB_RELOAD picks the next remaining club').toEqual(exactSave([...prior, cell('2-club'), cell('3-club')]));
    counts(view, 4, 1, 'EARLY_CLUB_RELOAD');
    expect(recordCompletion, 'EARLY_CLUB_RELOAD in-progress reload is quiet').not.toHaveBeenCalled();
  });

  it('EARLY_CLUB_UNLIMITED counts ordinary boxes and preserves daily progress through mode switches and reset', async () => {
    const view = await mount(); fireEvent.click(early(view, 'EARLY_CLUB_UNLIMITED'));
    const daily = localStorage.getItem(SAVE_KEY);
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' }));
    counts(view, 0, 0, 'EARLY_CLUB_UNLIMITED');
    fireEvent.click(early(view, 'EARLY_CLUB_UNLIMITED')); fireEvent.click(early(view, 'EARLY_CLUB_UNLIMITED'));
    counts(view, 2, 0, 'EARLY_CLUB_UNLIMITED');
    expect(view.queryByText('Generated Middle', { exact: true }), 'EARLY_CLUB_UNLIMITED correct second club exists').not.toBeNull();
    expect(view.getByText('Generated Middle', { exact: true }), 'EARLY_CLUB_UNLIMITED two clubs revealed').toBeVisible();
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_UNLIMITED daily bytes held').toBe(daily);
    fireEvent.click(view.getByRole('button', { name: '📅 Daily' })); counts(view, 1, 0, 'EARLY_CLUB_UNLIMITED');
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' })); counts(view, 2, 0, 'EARLY_CLUB_UNLIMITED');
    fireEvent.click(view.getByRole('button', { name: 'easy' })); counts(view, 0, 0, 'EARLY_CLUB_UNLIMITED');
    fireEvent.click(early(view, 'EARLY_CLUB_UNLIMITED'));
    expect(view.queryByRole('button', { name: 'Reveal club for career row 2' }), 'EARLY_CLUB_UNLIMITED reset restarts earliest club').toBeNull();
    counts(view, 1, 0, 'EARLY_CLUB_UNLIMITED');
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_UNLIMITED reset daily bytes held').toBe(daily);
    expect(recordCompletion, 'EARLY_CLUB_UNLIMITED no premature completion').not.toHaveBeenCalled();
  });

  it('EARLY_CLUB_MANUAL matches a manual row-zero reveal in save bytes guesses and completion score', async () => {
    fixture.player.career = rows().slice(1);
    let view = await mount();
    fireEvent.click(view.getByRole('button', { name: 'Reveal club for career row 1' }));
    guess(view, fixture.player.name);
    const manual = localStorage.getItem(SAVE_KEY);
    expect(readSave(), 'EARLY_CLUB_MANUAL baseline exact record').toEqual(exactSave([cell('0-club'), { t: 'won' }], 'won'));
    expect(recordCompletion, 'EARLY_CLUB_MANUAL baseline payout').toHaveBeenCalledExactlyOnceWith('/career', 700, 'FixtureBaller', 0);
    view.unmount(); localStorage.removeItem(SAVE_KEY); vi.clearAllMocks();
    view = await mount(); fireEvent.click(early(view, 'EARLY_CLUB_MANUAL')); guess(view, fixture.player.name);
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_MANUAL byte-identical ordinary save').toBe(manual);
    expect(recordCompletion, 'EARLY_CLUB_MANUAL unchanged payout once').toHaveBeenCalledExactlyOnceWith('/career', 700, 'FixtureBaller', 0);
    expect(view.getByRole('region', { name: 'Fixture result' }), 'EARLY_CLUB_MANUAL result still counts one box').toHaveTextContent('1 guess with 1 box uncovered!');
    expect(view.queryByRole('button', { name: LABEL }), 'EARLY_CLUB_MANUAL won controls hidden').toBeNull();
  });

  it('EARLY_CLUB_FINISHED hides assistance after either finish and never appends on finished reload', async () => {
    for (const outcome of ['won', 'lost'] as const) {
      localStorage.removeItem(SAVE_KEY); vi.clearAllMocks();
      let view = await mount(); fireEvent.click(early(view, 'EARLY_CLUB_FINISHED'));
      if (outcome === 'won') guess(view, fixture.player.name);
      else { fireEvent.click(view.getByRole('button', { name: 'Give up' })); fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' })); }
      const finished = localStorage.getItem(SAVE_KEY);
      expect(readSave(), 'EARLY_CLUB_FINISHED exact finish record').toEqual(exactSave([cell('1-club'), outcome === 'won' ? { t: 'won' } : { t: 'give' }], outcome));
      expect(view.queryByRole('button', { name: LABEL }), 'EARLY_CLUB_FINISHED no named control').toBeNull();
      expect(view.queryByRole('button', { name: 'Give Hint' }), 'EARLY_CLUB_FINISHED no random control').toBeNull();
      expect(recordCompletion, 'EARLY_CLUB_FINISHED single existing payout').toHaveBeenCalledExactlyOnceWith('/career', outcome === 'won' ? 700 : 0, 'FixtureBaller', 0);
      view.unmount(); vi.clearAllMocks(); view = await mountFinished();
      expect(view.queryByRole('button', { name: LABEL }), 'EARLY_CLUB_FINISHED restored finish has no hint').toBeNull();
      expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_FINISHED reload bytes held').toBe(finished);
      expect(recordCompletion, 'EARLY_CLUB_FINISHED reload never pays again').not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('EARLY_CLUB_STALE adopts another tab before spending the next ordinary club box', async () => {
    const first = await mount(), firstDom = within(first.container);
    const stale = render(<MemoryRouter initialEntries={['/career']}><CareerGame /></MemoryRouter>);
    const staleDom = within(stale.container);
    await waitFor(() => expect(staleDom.queryByRole('textbox', { name: 'Guess the player by name' })).not.toBeNull());
    const initialHint = staleDom.queryByRole('button', { name: LABEL });
    expect(initialHint, 'EARLY_CLUB_STALE native named control exists').not.toBeNull();
    expect(staleDom.getByText('Boxes:').textContent, 'EARLY_CLUB_STALE starts with no boxes').toBe('Boxes: 0');

    fireEvent.click(firstDom.getByRole('button', { name: 'Reveal club for career row 2' }));
    const newer = localStorage.getItem(SAVE_KEY);
    expect(readSave(), 'EARLY_CLUB_STALE other tab recorded one ordinary club').toEqual(exactSave([cell('1-club')]));
    // No storage event is sent: this root must still show its old board at the click.
    expect(staleDom.getByRole('button', { name: 'Reveal club for career row 2' }), 'EARLY_CLUB_STALE fixture is actually stale').toBeEnabled();
    expect(staleDom.getByText('Boxes:').textContent, 'EARLY_CLUB_STALE stale count remains zero').toBe('Boxes: 0');

    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(initialHint as HTMLButtonElement);
    expect(writes, 'EARLY_CLUB_STALE adoption makes no storage write').not.toHaveBeenCalled();
    expect(localStorage.getItem(SAVE_KEY), 'EARLY_CLUB_STALE adoption preserves exact saved bytes').toBe(newer);
    expect(staleDom.queryByRole('button', { name: 'Reveal club for career row 2' }), 'EARLY_CLUB_STALE adopts the other tab club').toBeNull();
    expect(staleDom.getByText('Generated Early / Generated Loan', { exact: true }), 'EARLY_CLUB_STALE adopted source cell visible').toBeVisible();
    expect(staleDom.getByRole('button', { name: 'Reveal club for career row 3' }), 'EARLY_CLUB_STALE adoption reveals no extra club').toBeEnabled();
    expect(staleDom.getByText('Boxes:').textContent, 'EARLY_CLUB_STALE adoption counts only the saved box').toBe('Boxes: 1');

    const nextHint = staleDom.queryByRole('button', { name: LABEL });
    expect(nextHint, 'EARLY_CLUB_STALE native action remains available after adoption').not.toBeNull();
    fireEvent.click(nextHint as HTMLButtonElement);
    const next = exactSave([cell('1-club'), cell('2-club')]);
    expect(writes, 'EARLY_CLUB_STALE next activation writes exactly once').toHaveBeenCalledExactlyOnceWith(SAVE_KEY, JSON.stringify(next));
    expect(readSave(), 'EARLY_CLUB_STALE next activation appends exactly one next club').toEqual(next);
    expect(staleDom.getByText('Generated Middle', { exact: true }), 'EARLY_CLUB_STALE next club visible').toBeVisible();
    expect(staleDom.getByText('Boxes:').textContent, 'EARLY_CLUB_STALE next activation spends one box').toBe('Boxes: 2');
    expect(staleDom.getByText('Guesses:').textContent, 'EARLY_CLUB_STALE never spends a guess').toBe('Guesses: 0/8');
    expect(recordCompletion, 'EARLY_CLUB_STALE in-progress tabs never complete').not.toHaveBeenCalled();
  });

  it('keeps the original four-random-cell hint and final short batch without duplicate actions', async () => {
    fixture.player.career = rows().slice(1, 2);
    const view = await mount();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(view.getByRole('button', { name: 'Give Hint' }));
    expect(readSave()).toEqual(exactSave([cell('0-club'), cell('0-appearances'), cell('0-goals'), cell('0-assists')]));
    counts(view, 4); expect(random).toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'Give Hint' }));
    expect(readSave()).toEqual(exactSave([cell('0-club'), cell('0-appearances'), cell('0-goals'), cell('0-assists'), cell('0-marketValue')]));
    counts(view, 5);
    expect(view.getByRole('button', { name: 'Give Hint' })).toBeDisabled();
    const completed = localStorage.getItem(SAVE_KEY); fireEvent.click(view.getByRole('button', { name: 'Give Hint' }));
    expect(localStorage.getItem(SAVE_KEY)).toBe(completed);
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});

async function mountFinished() {
  const view = render(<MemoryRouter initialEntries={['/career']}><CareerGame /></MemoryRouter>);
  await waitFor(() => expect(view.queryByRole('region', { name: 'Fixture result' })).not.toBeNull());
  return view;
}
