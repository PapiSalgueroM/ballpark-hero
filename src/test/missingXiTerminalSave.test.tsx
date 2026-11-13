import './dailyReload/mocks';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import missingXi from './dailyReload/missing-xi.driver';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const date = '2026-11-11';
const key = `${missingXi.keyPrefix}${date}`;

function seed(gameStatus: 'playing' | 'won' | 'lost', guesses: readonly unknown[]) {
  const bytes = JSON.stringify({ v: 1, date, puzzleIndex: 0, guesses, gameStatus });
  localStorage.setItem(key, bytes);
  return bytes;
}

beforeEach(() => {
  resetMocks();
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${date}T17:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it.each(['won', 'lost'] as const)('makes the Daily playable after a saved %s without a terminal action', async status => {
  const original = seed(status, []);
  let page = await missingXi.mount();
  try {
    expect(missingXi.status(page)).toBe('playing');
    expect(localStorage.getItem(key)).toBe(original);
    expect(recordCompletion).not.toHaveBeenCalled();

    await missingXi.finish(page);
    const result = missingXi.fingerprint(page);
    const saved = localStorage.getItem(key);
    expect(result).toContain('First guess! Perfect recall.');
    expect(saved).toBe(JSON.stringify({
      v: 1, date, puzzleIndex: 0, guesses: [{ t: 'won' }], gameStatus: 'won',
    }));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/missing-xi', 100, expect.anything(), 1);

    missingXi.unmount(page);
    page = await missingXi.mount();
    expect(missingXi.status(page)).toBe('finished');
    expect(missingXi.fingerprint(page)).toBe(result);
    expect(localStorage.getItem(key)).toBe(saved);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  } finally {
    missingXi.unmount(page);
  }
});

it.each([
  ['won', [{ t: 'won' }], 'First guess! Perfect recall.'],
  ['lost', [{ t: 'give' }], 'Missed it this time.'],
  ['lost', [{ t: 'miss', name: 'Fixture A' }, { t: 'miss', name: 'Fixture B' }, { t: 'miss', name: 'Fixture C' }], 'Missed it this time.'],
  ['playing', [{ t: 'won' }], 'First guess! Perfect recall.'],
] as const)('preserves a %s record with a complete action log', async (status, guesses, text) => {
  const bytes = seed(status, guesses);
  const page = await missingXi.mount();
  try {
    expect(missingXi.status(page)).toBe('finished');
    expect(missingXi.fingerprint(page)).toContain(text);
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(recordCompletion).not.toHaveBeenCalled();
  } finally {
    missingXi.unmount(page);
  }
});
