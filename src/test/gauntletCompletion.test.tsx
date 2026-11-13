import './dailyReload/mocks';
import { expect, it, vi } from 'vitest';
import { getTodayET } from '@/lib/dateUtils';
import gauntlet from './dailyReload/gauntlet-draft.driver';
import { button, click } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

function isResultWrite(name: string, value: string, key: string): boolean {
  return name === key && JSON.parse(value).run !== undefined;
}

async function mountOnTestDay() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
  return gauntlet.mount().finally(() => vi.useRealTimers());
}

it('keeps an unsaved Daily recap through modes, then saves the exact run on retry', async () => {
  resetMocks();
  const key = `${gauntlet.keyPrefix}2026-11-11`;
  localStorage.removeItem(key);
  const write = Storage.prototype.setItem;
  const attempted: string[] = [];
  const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
    if (isResultWrite(name, value, key)) {
      attempted.push(value);
      if (attempted.length < 3) throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
    }
    write.call(this, name, value);
  });
  let page = await mountOnTestDay();
  try {
    await gauntlet.enterDaily(page);
    await gauntlet.finish(page);
    const recap = gauntlet.fingerprint(page);
    expect(attempted).toHaveLength(1);
    const partial = localStorage.getItem(key);
    expect(JSON.parse(partial ?? 'null').kept).toHaveLength(10);
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    await click(button(page.container, /^Back to modes$/));
    await gauntlet.enterDaily(page);
    expect(gauntlet.status(page)).toBe('finished');
    expect(gauntlet.fingerprint(page)).toBe(recap);
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    await click(button(page.container, /^Retry save$/));
    expect(localStorage.getItem(key)).toBe(partial);
    await click(button(page.container, /^Retry save$/));
    expect(attempted).toEqual(Array(3).fill(attempted[0]));
    expect(localStorage.getItem(key)).toBe(attempted[0]);
    expect(page.container.textContent).not.toContain('Retry save');
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    const savedRecap = gauntlet.fingerprint(page);
    gauntlet.unmount(page);
    page = await mountOnTestDay();
    await gauntlet.enterDaily(page);
    expect(gauntlet.status(page)).toBe('finished');
    expect(gauntlet.fingerprint(page)).toBe(savedRecap);
    expect(localStorage.getItem(key)).toBe(attempted[0]);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  } finally {
    refused.mockRestore();
    gauntlet.unmount(page);
    localStorage.removeItem(key);
  }
}, 20_000);

it('opens a peer Daily save without overwriting it when retrying a refused save', async () => {
  resetMocks();
  const key = `${gauntlet.keyPrefix}2026-11-11`;
  localStorage.removeItem(key);
  const write = Storage.prototype.setItem;
  const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
    if (isResultWrite(name, value, key)) throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
    write.call(this, name, value);
  });
  const page = await mountOnTestDay();
  try {
    await gauntlet.enterDaily(page);
    await gauntlet.finish(page);
    const retry = button(page.container, /^Retry save$/);
    const pendingBytes = refused.mock.calls.find(([name, value]) => isResultWrite(name, value, key))?.[1];
    expect(pendingBytes).toBeDefined();
    const peer = JSON.parse(pendingBytes!);
    peer.run.rating = peer.run.rating - 1;
    const peerBytes = JSON.stringify(peer);
    write.call(localStorage, key, peerBytes);
    await click(retry);
    expect(localStorage.getItem(key)).toBe(peerBytes);
    expect(refused.mock.calls.filter(([name, value]) => isResultWrite(name, value, key))).toHaveLength(1);
    expect(gauntlet.fingerprint(page)).toContain(`with a ${peer.run.rating} rated XI`);
    expect(page.container.textContent).not.toContain('Retry save');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  } finally {
    refused.mockRestore();
    gauntlet.unmount(page);
    localStorage.removeItem(key);
  }
}, 20_000);

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
