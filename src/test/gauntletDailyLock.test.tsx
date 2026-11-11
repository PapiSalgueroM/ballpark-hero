import './dailyReload/mocks';
import { expect, it, vi } from 'vitest';
import { getTodayET } from '@/lib/dateUtils';
import gauntlet from './dailyReload/gauntlet-draft.driver';
import { click } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

it('keeps the first Daily gauntlet result when a second active draft reaches its final pick', async () => {
  resetMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
  const key = `${gauntlet.keyPrefix}${getTodayET()}`;
  localStorage.removeItem(key);
  const first = await gauntlet.mount();
  const second = await gauntlet.mount().finally(() => vi.useRealTimers());

  const pickLastCard = async () => {
    const cards = second.container.querySelectorAll('button.bg-gradient-to-b');
    await click(cards[cards.length - 1]);
  };

  try {
    await gauntlet.enterDaily(first);
    await gauntlet.enterDaily(second);
    for (let pick = 0; pick < 10; pick++) await pickLastCard();
    expect(localStorage.getItem(key)).toBeNull();

    await gauntlet.finish(first);
    const saved = localStorage.getItem(key);
    expect(saved).not.toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    await pickLastCard();
    expect(localStorage.getItem(key)).toBe(saved);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(gauntlet.status(second)).toBe('finished');
    expect(gauntlet.fingerprint(second)).toBe(gauntlet.fingerprint(first));
  } finally {
    gauntlet.unmount(second);
    gauntlet.unmount(first);
    localStorage.removeItem(key);
  }
});
