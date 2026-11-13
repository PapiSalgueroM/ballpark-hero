import './dailyReload/mocks';
import { expect, it, vi } from 'vitest';
import { getTodayET } from '@/lib/dateUtils';
import gauntlet, { cards } from './dailyReload/gauntlet-draft.driver';
import { click } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

it.each([
  { picks: 4, legacy: false },
  { picks: 10, legacy: false },
  { picks: 4, legacy: true },
])('opens the first Daily result after $picks picks in the stale tab (legacy: $legacy)', async ({ picks, legacy }) => {
  resetMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
  const key = `${gauntlet.keyPrefix}${getTodayET()}`;
  localStorage.removeItem(key);
  const first = await gauntlet.mount();
  const second = await gauntlet.mount().finally(() => vi.useRealTimers());

  const pickLastCard = (page: typeof first) => {
    const choices = cards(page);
    expect(choices).toHaveLength(5);
    return click(choices[choices.length - 1]);
  };

  try {
    await gauntlet.enterDaily(first);
    for (let pick = 0; pick < picks; pick++) await pickLastCard(first);
    const partial = localStorage.getItem(key);
    expect(JSON.parse(partial ?? 'null').kept).toHaveLength(picks);
    await gauntlet.enterDaily(second);
    expect(cards(second).map(card => card.textContent)).toEqual(cards(first).map(card => card.textContent));
    expect(localStorage.getItem(key)).toBe(partial);

    await gauntlet.finish(first);
    let saved = localStorage.getItem(key);
    expect(saved).not.toBeNull();
    let expectedRecap = gauntlet.fingerprint(first);
    if (legacy) {
      const record = JSON.parse(saved!) as { run: { matches: { decidedIn?: string }[] } };
      expect(record.run.matches.every(match => match.decidedIn !== undefined)).toBe(true);
      for (const match of record.run.matches) delete match.decidedIn;
      saved = JSON.stringify(record);
      localStorage.setItem(key, saved);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
      const review = await gauntlet.mount().finally(() => vi.useRealTimers());
      try {
        await gauntlet.enterDaily(review);
        expect(gauntlet.status(review)).toBe('finished');
        expectedRecap = gauntlet.fingerprint(review);
      } finally {
        gauntlet.unmount(review);
      }
    }
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    const writes = vi.spyOn(Storage.prototype, 'setItem');
    try {
      await pickLastCard(second);
      expect(writes.mock.calls.filter(([name]) => name === key)).toHaveLength(0);
    } finally {
      writes.mockRestore();
    }
    expect(localStorage.getItem(key)).toBe(saved);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(gauntlet.status(second)).toBe('finished');
    expect(gauntlet.fingerprint(second)).toBe(expectedRecap);
  } finally {
    gauntlet.unmount(second);
    gauntlet.unmount(first);
    localStorage.removeItem(key);
  }
});
