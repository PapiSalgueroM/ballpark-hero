import './dailyReload/mocks';
import { cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { players } from '@/data/players';
import { getTodayET } from '@/lib/dateUtils';
import { buildDraft, dailyDraftSeed, runGauntlet, saveDailyRun } from '@/lib/gauntletDraft';
import GauntletDraft from '@/pages/GauntletDraft';
import { click, mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture } from './dailyReload/mocks';

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  setPoolFixture('squad', players.slice(0, 72));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it('opens a saved Daily recap when the archive cannot supply a new draft', async () => {
  const date = getTodayET();
  const draft = buildDraft(players, dailyDraftSeed(date));
  const run = runGauntlet(draft.picks.map(pick => pick.choices[0]));
  saveDailyRun(date, run);
  const key = `gauntlet-draft-daily-${date}`;
  const original = localStorage.getItem(key);
  const board = within(mountPage(<GauntletDraft />, '/gauntlet-draft').container);

  await board.findByRole('button', { name: 'Try again' });
  await click(board.getByRole('button', { name: "See today's result" }));
  expect(board.getByRole('status')).toHaveTextContent(`${run.roundsCleared} of 5 rounds survived`);
  expect(localStorage.getItem(key)).toBe(original);
  expect(recordCompletion).not.toHaveBeenCalled();

  await click(board.getByRole('button', { name: 'Back to modes' }));
  expect(board.getByRole('button', { name: "See today's result" })).toBeVisible();
  expect(board.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(board.queryByRole('button', { name: /^Unlimited/ })).toBeNull();
  expect(localStorage.getItem(key)).toBe(original);
});

it('offers retry alone when the archive is short and there is no saved result', async () => {
  const board = within(mountPage(<GauntletDraft />, '/gauntlet-draft').container);
  expect(await board.findByRole('button', { name: 'Try again' })).toBeVisible();
  expect(board.queryByRole('button', { name: "See today's result" })).toBeNull();
  expect(board.queryByRole('button', { name: /^Unlimited/ })).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();
});
