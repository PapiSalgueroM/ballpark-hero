import './dailyReload/mocks';
import { cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { players } from '@/data/players';
import GauntletDraft from '@/pages/GauntletDraft';
import { click, mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture } from './dailyReload/mocks';

beforeEach(() => {
  localStorage.clear();
  resetMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it.each(['Daily gauntlet', 'Unlimited'])('offers retry when %s receives too few players for a slot', async mode => {
  const pool = players.filter(player => player.position !== 'GK');
  expect(pool.length).toBeGreaterThan(100);
  setPoolFixture('squad', pool);
  const { container } = mountPage(<GauntletDraft />, '/gauntlet-draft');
  const board = within(container);
  const start = await board.findByRole('button', { name: new RegExp('^' + mode) });
  const errors: string[] = [];
  const capture = (event: ErrorEvent) => {
    errors.push(event.message);
    event.preventDefault();
  };
  window.addEventListener('error', capture);
  try {
    await click(start);
  } finally {
    window.removeEventListener('error', capture);
  }

  expect(errors).toEqual([]);
  expect(board.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(board.queryByText(/^Pick 1 of 11/)).toBeNull();
  expect(Object.keys(localStorage).some(key => key.startsWith('gauntlet-draft-daily-'))).toBe(false);
  expect(recordCompletion).not.toHaveBeenCalled();
});
