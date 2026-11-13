import './dailyReload/mocks';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import driver from './dailyReload/sports-bingo.driver';
import { button, click, findButton } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { getTodayET } from '@/lib/dateUtils';
import { players } from '@/data/players';
import { buildGame, CARD_SIZE, claimableSquares, dailySeed, PACK_COUNT, PACK_SECONDS, scoreGame } from '@/lib/sportsBingo';

const advance = /^Done with this pack|^Finish$/;
const key = () => `sports-bingo-daily-${getTodayET()}`;
const bytes = () => localStorage.getItem(key());
const score = () => scoreGame(JSON.parse(bytes()!).marked);
const completions = () => recordCompletion.mock.calls.filter(([route]) => route === '/sports-bingo').length;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-11T22:00:00Z'));
  localStorage.clear();
  resetMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Sports Bingo Daily receipts across tabs', () => {
  it.each(['button', 'clock'])('keeps the first marked card when a stale tab closes its final pack by %s', async (via) => {
    const first = await driver.mount();
    const late = await driver.mount();
    await driver.enterDaily(first);
    await driver.enterDaily(late);
    for (let i = 0; i < PACK_COUNT - 1; i++) await click(button(late.container, advance));
    await driver.finish(first);
    const before = bytes();
    const firstScore = score();
    const result = driver.fingerprint(first);
    expect(firstScore).toBeGreaterThan(0);
    expect(completions()).toBe(1);

    if (via === 'button') await click(button(late.container, /^Finish$/));
    else act(() => { vi.advanceTimersByTime(PACK_SECONDS * 1000); });
    expect({
      sameBytes: bytes() === before,
      score: score(),
      sameResult: driver.fingerprint(late) === result,
      completions: completions(),
    }).toEqual({ sameBytes: true, score: firstScore, sameResult: true, completions: 1 });

    const reload = await driver.mount();
    expect(driver.fingerprint(reload)).toBe(result);
    expect(completions()).toBe(1);
  });

  it('opens the saved card from a stale mode menu', async () => {
    const first = await driver.mount();
    const staleMenu = await driver.mount();
    await driver.enterDaily(first);
    await driver.finish(first);
    const before = bytes();
    await driver.enterDaily(staleMenu);
    expect({
      playing: findButton(staleMenu.container, advance) !== null,
      sameResult: driver.fingerprint(staleMenu) === driver.fingerprint(first),
      sameBytes: bytes() === before,
      completions: completions(),
    }).toEqual({ playing: false, sameResult: true, sameBytes: true, completions: 1 });
  });

  it('keeps same-tab Daily reopen and refresh as read-only', async () => {
    const tab = await driver.mount();
    await driver.enterDaily(tab);
    await driver.finish(tab);
    const before = bytes();
    const result = driver.fingerprint(tab);
    await driver.replay(tab);
    expect(bytes()).toBe(before);
    expect(driver.fingerprint(tab)).toBe(result);
    const reload = await driver.mount();
    expect(driver.fingerprint(reload)).toBe(result);
    expect(completions()).toBe(1);
  });

  it('keeps the last claim and records one result when Finish is pressed twice', async () => {
    const tab = await driver.mount();
    await driver.enterDaily(tab);
    for (let i = 0; i < PACK_COUNT - 1; i++) await click(button(tab.container, advance));

    const game = buildGame(players, dailySeed(getTodayET()));
    const [sq] = claimableSquares(game, game.packs[PACK_COUNT - 1], new Array(CARD_SIZE).fill(false));
    expect(sq).toBeDefined();
    const claim = tab.container.querySelectorAll('div.grid-cols-5 button')[sq];
    const finish = button(tab.container, /^Finish$/);
    act(() => {
      fireEvent.click(claim);
      fireEvent.click(finish);
      fireEvent.click(finish);
    });

    expect(JSON.parse(bytes()!).marked[sq]).toBe(true);
    expect(score()).toBe(3);
    expect(completions()).toBe(1);
  });

  it.each(['getItem', 'setItem'] as const)('keeps the result usable after storage refuses %s', async (method) => {
    const tab = await driver.mount();
    await driver.enterDaily(tab);
    const dailyKey = key();
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    const refuse = (k: string) => {
      if (k === dailyKey) throw new DOMException('Controlled Daily storage refusal', 'QuotaExceededError');
    };
    const fault = method === 'getItem'
      ? vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k) {
        refuse(k);
        return get.call(this, k);
      })
      : vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k, v) {
        refuse(k);
        return set.call(this, k, v);
      });

    await driver.finish(tab);
    const result = driver.fingerprint(tab);
    expect(result).not.toBe('no result card');
    await driver.replay(tab);
    expect(driver.fingerprint(tab)).toBe(result);
    expect(completions()).toBe(1);
    if (method === 'getItem') {
      const fresh = await driver.mount();
      expect(findButton(fresh.container, /^Daily card/)).not.toBeNull();
    }
    expect(fault.mock.calls.some(([k]) => k === dailyKey)).toBe(true);
    fault.mockRestore();
    if (method === 'setItem') expect(bytes()).toBeNull();
    else expect(score()).toBe(100);
  });
});
