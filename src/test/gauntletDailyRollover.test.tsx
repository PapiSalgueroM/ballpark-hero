import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import gauntlet, { cards } from './dailyReload/gauntlet-draft.driver';
import { click } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const previousKey = 'gauntlet-draft-daily-2026-11-11';
const currentKey = 'gauntlet-draft-daily-2026-11-12';

async function keepFirstCards(view: Awaited<ReturnType<typeof gauntlet.mount>>, count: number) {
  for (let pick = 0; pick < count; pick++) {
    const choices = cards(view);
    expect(choices).toHaveLength(5);
    await click(choices[0]);
  }
}

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each([5, 11])('keeps the current Daily at %i picks when an older tab finishes after midnight', async (newerPicks) => {
  vi.setSystemTime(new Date('2026-11-12T04:59:59Z'));
  const previous = await gauntlet.mount();
  await gauntlet.enterDaily(previous);
  await keepFirstCards(previous, 10);

  vi.setSystemTime(new Date('2026-11-12T05:00:00Z'));
  const current = await gauntlet.mount();
  await gauntlet.enterDaily(current);
  await keepFirstCards(current, newerPicks);
  const currentSave = localStorage.getItem(currentKey);
  const currentRecord = JSON.parse(currentSave ?? 'null');
  expect(currentRecord).toMatchObject({ v: 1, date: '2026-11-12' });
  if (newerPicks === 11) expect(currentRecord.run.score).toBe(32);
  else expect(currentRecord.kept).toHaveLength(newerPicks);
  expect(localStorage.getItem(previousKey)).toBeNull();

  await keepFirstCards(previous, 1);
  const previousSave = localStorage.getItem(previousKey);
  expect(JSON.parse(previousSave ?? 'null')).toMatchObject({ v: 1, date: '2026-11-11', run: { score: 48 } });
  expect(localStorage.getItem(currentKey)).toBe(currentSave);

  gauntlet.unmount(previous);
  gauntlet.unmount(current);
  const reopened = await gauntlet.mount();
  await gauntlet.enterDaily(reopened);
  expect(gauntlet.status(reopened)).toBe(newerPicks === 11 ? 'finished' : 'playing');
  if (newerPicks === 11) expect(gauntlet.fingerprint(reopened)).toContain('32');
  else expect(reopened.container.textContent).toContain("Pick " + (newerPicks + 1) + " of 11");
  expect(localStorage.getItem(currentKey)).toBe(currentSave);
  expect(localStorage.getItem(previousKey)).toBe(previousSave);
  expect(recordCompletion.mock.calls.map(([game, score]) => [game, score])).toEqual(
    newerPicks === 11 ? [['/gauntlet-draft', 32], ['/gauntlet-draft', 48]] : [['/gauntlet-draft', 48]],
  );
});
