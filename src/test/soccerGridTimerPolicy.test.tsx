import './dailyReload/mocks';
import { cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { resetMocks } from './dailyReload/mocks';
import { mountPage } from './dailyReload/harness';

const fixture = vi.hoisted(() => ({
  puzzle: { id: 'generated-timer-policy', rows: ['A', 'B', 'C'].map(label => ({ label: 'Generated Row ' + label, type: 'misc' as const })),
    cols: ['A', 'B', 'C'].map(label => ({ label: 'Generated Column ' + label, type: 'misc' as const })) },
  setActiveCell: vi.fn(), submitGuess: vi.fn(), setDifficulty: vi.fn(), setTimerMode: vi.fn(), startOvertime: vi.fn(),
}));
vi.mock('@/hooks/useSoccerGrid', () => ({ useSoccerGrid: () => {
  const cells = Array.from({ length: 9 }, (_, index) => ({ index, playerName: null, status: 'empty' as const, rarity: null }));
  return { puzzle: fixture.puzzle, cells, mainCells: cells, activeCell: null, setActiveCell: fixture.setActiveCell,
    submitGuess: fixture.submitGuess, validating: false, gameStatus: 'playing', guessesLeft: 15, correctCount: 0,
    rarityScore: null, isLoading: false, isLoadingPool: false, settings: { difficulty: 'normal', timerMode: 0 },
    setDifficulty: fixture.setDifficulty, setTimerMode: fixture.setTimerMode, timeLeft: null, timeUp: false,
    isOvertime: false, overtimeActive: false, startOvertime: fixture.startOvertime, overtimeCorrectCount: 0, checkingDown: false };
} }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: async () => [] }));
import SoccerGrid from '@/pages/SoccerGrid';

const POLICY = 'Timed rounds keep counting while answers are checked and while you are away. Reloading keeps the same deadline. A late answer does not count. Unlimited has no clock.';
const EXAMPLE = /checking finishes after.*0.*does not change.*ended main round/i;
const TITLES = { preplay: 'SG_TIMER_POLICY_PREPLAY states the deadline policy before the first guess',
  help: 'SG_TIMER_POLICY_HELP reopens the same policy and a worked late-answer example' };
const raw = { scope: 'Actual SoccerGrid page and help dialog. The game hook is a fixed pre-play view solely for policy copy; no submission or deadline behavior is credited.',
  fixture: fixture.puzzle, caseTitles: Object.values(TITLES), frames: {} as Record<string, unknown[]> };
function capture(key: keyof typeof TITLES, label: string) {
  (raw.frames[key] ??= []).push({ label, bodyText: document.body.textContent, html: document.body.innerHTML,
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(name => [name, localStorage.getItem(name)])) });
}
async function mount() {
  const view = mountPage(<SoccerGrid />, '/soccer-grid');
  await waitFor(() => expect(within(view.container).queryByRole('button', { name: '40s', exact: true }), 'SG_TIMER_POLICY_SETUP real pre-play controls loaded').not.toBeNull());
  return view;
}
beforeEach(() => { cleanup(); resetMocks(); localStorage.clear(); localStorage.setItem('sg-rules-seen', '1');
  localStorage.setItem('policy-unrelated', 'held'); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
afterAll(() => {
  const destination = process.env.SC_GRID_POLICY_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SC_GRID_POLICY_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});
describe('Soccer Grid explicit clock policy', () => {
  it(TITLES.preplay, async () => {
    const view = await mount(); capture('preplay', 'before-first-guess');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    const policy = within(view.container).queryByText(POLICY, { exact: true });
    expect(policy, TITLES.preplay).not.toBeNull(); expect(policy).toBeVisible();
    expect(within(view.container).getByRole('button', { name: 'Unlimited', exact: true })).toBeEnabled();
    expect(within(view.container).getByRole('button', { name: '40s', exact: true })).toBeEnabled();
    expect(fixture.submitGuess).not.toHaveBeenCalled(); expect(localStorage.getItem('policy-unrelated')).toBe('held');
  });
  it(TITLES.help, async () => {
    const view = await mount(), before = localStorage.getItem('policy-unrelated');
    const trigger = within(view.container).getByRole('button', { name: 'How to play', exact: true });
    for (let opening = 0; opening < 2; opening++) {
      fireEvent.click(trigger);
      const dialog = await within(document.body).findByRole('dialog', { name: 'How to Play Soccer Grid' });
      capture('help', 'help-open-' + opening);
      const policy = within(dialog).queryByText(POLICY, { exact: true });
      expect(policy, TITLES.help).not.toBeNull(); expect(policy).toBeVisible();
      expect(within(dialog).getByText(EXAMPLE), 'SG_TIMER_POLICY_HELP worked example').toBeVisible();
      expect(within(dialog).getByText(/The clock starts on your first guess/)).toBeVisible();
      fireEvent.click(within(dialog).getByRole('button', { name: "Let's Play!", exact: true }));
      await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
      capture('help', 'help-closed-' + opening);
    }
    expect(localStorage.getItem('policy-unrelated')).toBe(before);
    expect(fixture.submitGuess).not.toHaveBeenCalled(); expect(fixture.setTimerMode).not.toHaveBeenCalled();
  });
});
