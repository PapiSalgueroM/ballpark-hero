import './dailyReload/mocks';
import { within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LINEUPS, pickUnlimitedPuzzle } from '@/lib/missingXi';
import missingXi from './dailyReload/missing-xi.driver';
import { button, click } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

it('deals a different Unlimited lineup from New Lineup and preserves the Daily result', async () => {
  resetMocks();
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
  const page = await missingXi.mount();
  const view = within(page.container);
  try {
    await missingXi.finish(page);
    const dailyResult = missingXi.fingerprint(page);
    const key = 'missing-xi-daily-2026-11-11';
    const savedDaily = localStorage.getItem(key);
    expect(savedDaily).not.toBeNull();

    vi.spyOn(Math, 'random').mockReturnValue(0);
    await click(button(page.container, /^Play Unlimited$/));
    expect(view.getByText('2011 Champions League Final', { exact: true })).toBeVisible();
    await click(button(page.container, /^Give up$/i));
    await click(button(page.container, /^Yes, reveal it$/));
    expect(missingXi.fingerprint(page)).toContain('Javier Mascherano');

    await click(button(page.container, /^New Lineup$/));
    expect(view.getByText('2012 Champions League Final', { exact: true })).toBeVisible();
    expect(view.getByText('Guess 1 of 3', { exact: true })).toBeVisible();
    await missingXi.enterDaily(page);
    expect(missingXi.fingerprint(page)).toBe(dailyResult);
    expect(localStorage.getItem(key)).toBe(savedDaily);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  } finally {
    missingXi.unmount(page);
  }
});

it('uses two draws whether the current lineup can be excluded or is the only one', () => {
  const [first, second] = LINEUPS;
  const random = vi.spyOn(Math, 'random').mockReturnValue(0);
  const alternative = pickUnlimitedPuzzle([first, second], first.id);
  expect(alternative).toEqual({ lineup: second, candidate: second.blankCandidates[0] });
  expect(random).toHaveBeenCalledTimes(2);
  random.mockClear();

  const only = pickUnlimitedPuzzle([first], first.id);
  expect(only).toEqual({ lineup: first, candidate: first.blankCandidates[0] });
  expect(random).toHaveBeenCalledTimes(2);
});
