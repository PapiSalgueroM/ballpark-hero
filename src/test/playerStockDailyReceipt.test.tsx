import './dailyReload/mocks';
import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import driver from './dailyReload/player-stock-market.driver';
import { button, click, findButton, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { getTodayET } from '@/lib/dateUtils';
import { dailyCampaignSeed, startYearFor } from '@/lib/playerStockMarket';

const finalButton = /^Turn the cards over$/;
const nextYear = /^On to \d{4}$/;
const dailyKey = () => `player-stock-market-daily-${getTodayET()}`;
const bytes = () => localStorage.getItem(dailyKey());
const completions = () => recordCompletion.mock.calls.filter(([route]) => route === '/player-stock-market').length;
const cards = (m: MountedPage) => Array.from(m.container.querySelectorAll('button'))
  .filter(b => /age (\d+|\?)/.test(b.textContent ?? '') && !b.disabled);

async function buyXI(m: MountedPage, firstPick = 0) {
  for (let i = 0; i < 11; i++) {
    const choices = cards(m);
    const index = i === 0 ? firstPick : 0;
    expect(choices.length).toBeGreaterThan(index);
    await click(choices[index]);
  }
  await waitFor(() => { expect(findButton(m.container, nextYear)).not.toBeNull(); });
  for (let i = 0; i < 12; i++) {
    const advance = findButton(m.container, nextYear);
    if (!advance) break;
    await click(advance);
  }
  expect(findButton(m.container, finalButton)).not.toBeNull();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T22:00:00Z'));
  localStorage.clear();
  resetMocks();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetMocks();
  vi.useRealTimers();
});

describe('Player Stock Market Daily receipts across tabs', () => {
  it('preserves the first completed XI when a second tab reveals different buys', async () => {
    const first = await driver.mount();
    const late = await driver.mount();
    await driver.enterDaily(first);
    await driver.enterDaily(late);
    await buyXI(first);
    await buyXI(late, 1);
    await click(button(first.container, finalButton));
    const before = bytes();
    const result = driver.fingerprint(first);
    expect(before).not.toBeNull();
    expect(completions()).toBe(1);

    await click(button(late.container, finalButton));
    expect({
      sameBytes: bytes() === before,
      sameResult: driver.fingerprint(late) === result,
      completions: completions(),
    }).toEqual({ sameBytes: true, sameResult: true, completions: 1 });

    const reloaded = await driver.mount();
    expect(driver.fingerprint(reloaded)).toBe(result);
    expect(completions()).toBe(1);
  });

  it('opens the existing result from a Daily menu that was left open', async () => {
    const first = await driver.mount();
    const staleMenu = await driver.mount();
    await driver.enterDaily(first);
    await buyXI(first);
    await click(button(first.container, finalButton));
    const before = bytes();
    await driver.enterDaily(staleMenu);
    expect({
      cards: cards(staleMenu).length,
      sameResult: driver.fingerprint(staleMenu) === driver.fingerprint(first),
      sameBytes: bytes() === before,
      completions: completions(),
    }).toEqual({ cards: 0, sameResult: true, sameBytes: true, completions: 1 });
  });

  it('keeps the Daily receipt through a fresh Unlimited finish and later Daily reopen', async () => {
    const tab = await driver.mount();
    await driver.enterDaily(tab);
    await buyXI(tab);
    await click(button(tab.container, finalButton));
    const daily = driver.fingerprint(tab);
    const before = bytes();
    await click(button(tab.container, /^Open another season$/));
    const year = startYearFor(dailyCampaignSeed(getTodayET()));
    await click(button(tab.container, new RegExp(`^${year}$`)));
    await waitFor(() => { expect(cards(tab).length).toBeGreaterThan(0); });
    await buyXI(tab, 1);
    await click(button(tab.container, finalButton));
    expect(completions()).toBe(2);
    expect(bytes()).toBe(before);

    await click(button(tab.container, /^New market$/));
    await driver.enterDaily(tab);
    expect(driver.fingerprint(tab)).toBe(daily);
    expect(bytes()).toBe(before);
    expect(completions()).toBe(2);
  });
});
