import './dailyReload/mocks';
import { within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { guessKey, isCorrectGuess, LINEUPS, pickDailyPuzzle } from '@/lib/missingXi';
import missingXi from './dailyReload/missing-xi.driver';
import { click, typeInto, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setTableFixture } from './dailyReload/mocks';

const KEY = 'missing-xi-daily-2026-11-11';
const CANONICAL = 'Park Ji-sung';
const ALIAS = 'Ji-sung Park';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T17:00:00Z'));
  localStorage.clear();
  resetMocks();
  setTableFixture('player_market_values', [{
    player_name: ALIAS, club: 'Manchester United', nationality: 'Korea, South',
    position: 'Left Midfield', year: 2010, age: 28,
  }]);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

async function submit(page: MountedPage, name: string) {
  const board = within(page.container);
  await typeInto(board.getByRole('combobox'), name);
  const option = await waitFor(() => {
    const match = board.getAllByRole('option')
      .find(row => row.firstElementChild?.textContent?.toLowerCase() === name.toLowerCase());
    expect(match).toBeDefined();
    return match!;
  });
  await click(option);
  await click(board.getByRole('button', { name: 'Lock in guess' }));
}

it.each([[CANONICAL, ALIAS], [ALIAS, CANONICAL]])('keeps one miss after trying %s and then %s across a reload', async (first, second) => {
  let page = await missingXi.mount();
  try {
    expect(pickDailyPuzzle().candidate.name).toBe('Gennaro Gattuso');
    await submit(page, first);
    expect(within(page.container).getByText('Guess 2 of 3')).toBeVisible();
    const saved = localStorage.getItem(KEY);
    expect(saved).not.toBeNull();
    missingXi.unmount(page);
    page = await missingXi.mount();

    await submit(page, second);
    const board = within(page.container);
    expect(localStorage.getItem(KEY)).toBe(saved);
    expect(board.getByText('Guess 2 of 3')).toBeVisible();
    expect(board.getByText('You already tried that name.')).toBeVisible();
    await submit(page, 'Gennaro Gattuso');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/missing-xi', 70, 'Tester', 1);
  } finally {
    missingXi.unmount(page);
  }
});

it('spends a guess for each of two different players', async () => {
  const page = await missingXi.mount();
  try {
    await submit(page, ALIAS);
    await submit(page, 'Paolo Maldini');
    expect(within(page.container).getByText('Guess 3 of 3')).toBeVisible();
  } finally {
    missingXi.unmount(page);
  }
});

it('keeps lineup answer aliases and leaves ambiguous short aliases distinct elsewhere', () => {
  const daily = pickDailyPuzzle().lineup;
  const candidate = LINEUPS.flatMap(lineup => lineup.blankCandidates).find(player => player.name === 'Everton Soares')!;
  expect(isCorrectGuess('Everton', candidate)).toBe(true);
  expect(guessKey('Everton', daily)).not.toBe(guessKey('Everton Soares', daily));
  expect(guessKey('Nacho Fernández', daily)).not.toBe(guessKey('Nacho', daily));
});
