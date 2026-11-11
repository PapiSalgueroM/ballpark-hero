import './dailyReload/mocks';
import { expect, it, vi } from 'vitest';
import { getTodayET } from '@/lib/dateUtils';
import gauntlet from './dailyReload/gauntlet-draft.driver';
import { button, click } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

it('records a fresh Unlimited gauntlet after reviewing a Daily result on the same page', async () => {
  resetMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
  const key = `${gauntlet.keyPrefix}${getTodayET()}`;
  localStorage.removeItem(key);
  const page = await gauntlet.mount().finally(() => vi.useRealTimers());
  try {
    await gauntlet.enterDaily(page);
    await gauntlet.finish(page);
    const dailyResult = gauntlet.fingerprint(page);
    const savedDaily = localStorage.getItem(key);
    expect(savedDaily).not.toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    await click(button(page.container, /^Back to modes$/));

    // Keep the next finish inside the restore mark's time window.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    await gauntlet.enterDaily(page);
    expect(gauntlet.fingerprint(page)).toBe(dailyResult);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    await click(button(page.container, /^Back to modes$/));

    await click(button(page.container, /^Unlimited/));
    await gauntlet.finish(page);
    expect(recordCompletion.mock.calls.map(([path]) => path)).toEqual(['/gauntlet-draft', '/gauntlet-draft']);
    expect(localStorage.getItem(key)).toBe(savedDaily);
  } finally {
    vi.restoreAllMocks();
    gauntlet.unmount(page);
    localStorage.removeItem(key);
  }
});
