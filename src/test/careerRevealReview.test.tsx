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
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ headline, statLine, children }: { headline: ReactNode; statLine: ReactNode; children?: ReactNode }) => <section aria-label="Fixture result">{headline}{statLine}{children}</section> }));

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


const ORDER = ['2-goals', '1-club', '0-assists', '3-marketValue'];
const expectedMap = (keys: string[], won = true, guesses = 2, boxes = keys.length) => [
  'Career Quiz reveal map', won ? 'Won' : 'Not solved', 'Guesses: ' + guesses, 'Boxes: ' + boxes,
  'Columns: Club | Apps | Goals | Assists | Value',
  ...fixture.player.career.map((_, row) => 'Row ' + (row + 1) + ': ' +
    ['club', 'appearances', 'goals', 'assists', 'marketValue'].map(col => {
      const at = keys.indexOf(row + '-' + col); return at < 0 ? '.' : String(at + 1);
    }).join(' | ')),
].join('\n');
function openReview(view: ReturnType<typeof render>, marker: string) {
  const button = view.queryByRole('button', { name: 'Review your reveals' });
  expect(button, marker + ' postgame review exists').not.toBeNull();
  expect(button, marker + ' native control').toBeInstanceOf(HTMLButtonElement);
  expect(button, marker + ' initial collapsed state').toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(button as HTMLButtonElement);
  expect(button, marker + ' expanded state').toHaveAttribute('aria-expanded', 'true');
  return within(view.getByRole('region', { name: 'Your reveal review' }));
}
async function finished(actions: Action[], outcome: 'won' | 'lost' = 'won') {
  localStorage.setItem(SAVE_KEY, JSON.stringify(exactSave(actions, outcome)));
  const view = render(<MemoryRouter initialEntries={['/career']}><CareerGame /></MemoryRouter>);
  await waitFor(() => expect(view.queryByRole('region', { name: 'Fixture result' })).not.toBeNull());
  return view;
}
const give = (view: ReturnType<typeof render>) => {
  fireEvent.click(view.getByRole('button', { name: 'Give up' }));
  fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' }));
};
describe('Career Quiz first-opening review', () => {
  it('REVIEW_ORDER walks actual first-opening order and never the finished full board', async () => {
    const actions: Action[] = [cell(ORDER[0]), { t: 'wrong' }, cell(ORDER[1]), cell(ORDER[2]), cell(ORDER[0]), cell(ORDER[3]), { t: 'won' }];
    const view = await finished(actions), before = localStorage.getItem(SAVE_KEY), data = JSON.stringify(fixture.player);
    const random = vi.spyOn(Math, 'random'), dom = openReview(view, 'REVIEW_ORDER');
    expect(dom.getByText('Reveal 1 of 4')).toBeVisible();
    expect(dom.getByText(/2001-2002/)).toHaveTextContent('Goals');
    expect(dom.getByRole('button', { name: 'Previous reveal' })).toBeDisabled();
    const expected = [['2055-2056', 'Club'], ['2099-2100', 'Assists'], ['1990-1991', 'Value']];
    for (const [season, column] of expected) {
      fireEvent.click(dom.getByRole('button', { name: 'Next reveal' }));
      expect(dom.getByText(new RegExp(season))).toHaveTextContent(column);
    }
    expect(dom.getByText('Reveal 4 of 4')).toBeVisible();
    expect(dom.getByRole('button', { name: 'Next reveal' })).toBeDisabled();
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(ORDER));
    expect(localStorage.getItem(SAVE_KEY), 'REVIEW_ORDER ledger unchanged').toBe(before);
    expect(JSON.stringify(fixture.player), 'REVIEW_ORDER data unchanged').toBe(data);
    expect(random, 'REVIEW_ORDER no draws').not.toHaveBeenCalled();
    expect(recordCompletion, 'REVIEW_ORDER restored finish quiet').not.toHaveBeenCalled();
  });

  it('REVIEW_FORMAT uses board values for missing assists and an unavailable valuation', async () => {
    fixture.player.career[3].marketValue = 0;
    const view = await finished([cell('0-assists'), cell('3-marketValue'), cell('0-goals'), { t: 'won' }]);
    const dom = openReview(view, 'REVIEW_FORMAT');
    expect(dom.getByText(/2099-2100/)).toHaveTextContent('n/a');
    fireEvent.click(dom.getByRole('button', { name: 'Next reveal' }));
    expect(dom.getByText(/1990-1991/)).toHaveTextContent('n/a');
    fireEvent.click(dom.getByRole('button', { name: 'Next reveal' }));
    expect(dom.getByText(/2099-2100/)).toHaveTextContent(/Goals.*0/);
    expect(dom.queryByText(/null|undefined|\$0M/)).toBeNull();
  });

  it('REVIEW_COPY copies the exact spoiler-free positional sequence without writing progress', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    const view = await finished([cell(ORDER[0]), { t: 'wrong' }, ...ORDER.slice(1).map(cell), { t: 'won' }]);
    const before = localStorage.getItem(SAVE_KEY), dom = openReview(view, 'REVIEW_COPY');
    fireEvent.click(dom.getByRole('button', { name: 'Copy reveal map' }));
    await waitFor(() => expect(dom.getByRole('status')).toHaveTextContent('Reveal map copied.'));
    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith(expectedMap(ORDER));
    const copied = clipboard.writeText.mock.calls[0][0];
    for (const secret of [fixture.player.name, ...fixture.player.career.flatMap(row => [row.season, row.club]).filter(x => x.trim())])
      expect(copied, 'REVIEW_COPY no source identity/season/club').not.toContain(secret);
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('REVIEW_COPY_FAILURE retains selectable map and reports failed native clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const view = await finished([cell('2-goals'), { t: 'won' }]), dom = openReview(view, 'REVIEW_COPY_FAILURE');
    const before = localStorage.getItem(SAVE_KEY);
    fireEvent.click(dom.getByRole('button', { name: 'Copy reveal map' }));
    await waitFor(() => expect(dom.getByRole('status')).toHaveTextContent('Could not copy. Select the map above to copy it.'));
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(['2-goals'], true, 1));
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  });

  it('REVIEW_EMPTY a no-reveal loss has no invented trail or navigation', async () => {
    const view = await finished([{ t: 'give' }], 'lost'), dom = openReview(view, 'REVIEW_EMPTY');
    expect(dom.getByText('No boxes were opened before the game ended.')).toBeVisible();
    expect(dom.queryByRole('button', { name: 'Next reveal' })).toBeNull();
    expect(dom.queryByRole('button', { name: 'Previous reveal' })).toBeNull();
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap([], false, 0));
  });

  it('REVIEW_LIVE mixed manual early and random hints replay exactly after finishing and literal remount', async () => {
    const view = await mount();
    expect(view.queryByRole('button', { name: 'Review your reveals' })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Reveal goals for career row 3' }));
    fireEvent.click(view.getByRole('button', { name: LABEL }));
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.click(view.getByRole('button', { name: 'Give Hint' }));
    const savedKeys = readSave().guesses.filter((a: Action) => a.t === 'cell').map((a: { key: string }) => a.key);
    expect(savedKeys.slice(0, 2)).toEqual(['2-goals', '1-club']);
    expect(savedKeys.length).toBe(6); expect(random).toHaveBeenCalled(); random.mockRestore();
    guess(view, fixture.player.name);
    const before = localStorage.getItem(SAVE_KEY), dom = openReview(view, 'REVIEW_LIVE');
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(savedKeys, true, 1));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/career', 700, 'FixtureBaller', 0);
    fireEvent.click(dom.getByRole('button', { name: 'Next reveal' }));
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    view.unmount(); vi.clearAllMocks();
    const restored = await finished(readSave().guesses);
    const replay = openReview(restored, 'REVIEW_LIVE_RELOAD');
    expect(replay.getByText('Reveal 1 of 6')).toBeVisible();
    expect(replay.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(savedKeys, true, 1));
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('REVIEW_UNLIMITED keeps mode histories separate and clears the next practice trail', async () => {
    const view = await mount();
    fireEvent.click(view.getByRole('button', { name: 'Reveal goals for career row 3' }));
    const daily = localStorage.getItem(SAVE_KEY);
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' }));
    fireEvent.click(view.getByRole('button', { name: 'Reveal club for career row 4' }));
    fireEvent.click(view.getByRole('button', { name: 'Reveal goals for career row 1' }));
    guess(view, fixture.player.name);
    const dom = openReview(view, 'REVIEW_UNLIMITED');
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(['3-club', '0-goals'], true, 1));
    expect(localStorage.getItem(SAVE_KEY)).toBe(daily);
    fireEvent.click(view.getByRole('button', { name: '📅 Daily' }));
    expect(view.queryByRole('button', { name: 'Review your reveals' })).toBeNull();
    counts(view, 1);
    fireEvent.click(view.getByRole('button', { name: '∞ Unlimited' }));
    expect(view.getByRole('button', { name: 'Review your reveals' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(view.getByRole('button', { name: 'easy' }));
    expect(view.queryByRole('button', { name: 'Review your reveals' })).toBeNull();
    give(view);
    const empty = openReview(view, 'REVIEW_UNLIMITED_RESET');
    expect(empty.getByText('No boxes were opened before the game ended.')).toBeVisible();
    expect(localStorage.getItem(SAVE_KEY)).toBe(daily);
  });

  it('REVIEW_LEGACY ignores out-of-board and always-visible season keys without rewriting saved bytes', async () => {
    const actions: Action[] = [cell('1-club'), cell('0-season'), cell('-1-goals'), cell('999-club'), cell('01-club'), cell('1-nope'), cell('0-goals'), { t: 'won' }];
    const view = await finished(actions), before = localStorage.getItem(SAVE_KEY), dom = openReview(view, 'REVIEW_LEGACY');
    expect(dom.getByText('Reveal 1 of 2')).toBeVisible();
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(['1-club', '0-goals'], true, 1, 7));
    expect(localStorage.getItem(SAVE_KEY)).toBe(before);
  });

  it('REVIEW_LOSS keeps opened cells after an eight-wrong finish without crediting final exposed cells', async () => {
    const view = await finished([cell('3-club'), ...Array.from({ length: 8 }, () => ({ t: 'wrong' } as Action))], 'lost');
    const dom = openReview(view, 'REVIEW_LOSS');
    expect(dom.getByLabelText('Spoiler-free reveal map').textContent).toBe(expectedMap(['3-club'], false, 8));
    expect(dom.getByText('Reveal 1 of 1')).toBeVisible();
    expect(dom.getByRole('button', { name: 'Next reveal' })).toBeDisabled();
    expect(dom.getByText(/1990-1991/)).toHaveTextContent('Generated Last');
  });
});
