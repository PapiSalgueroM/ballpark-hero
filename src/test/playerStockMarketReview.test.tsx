import './dailyReload/mocks';
import { afterEach, expect, it } from 'vitest';
import {
  buildHoldings, finishCampaign, loadDailyResult, saveDailyResult, scoreCampaign, STOCK_BUDGET, STOCK_FORMATION,
  type Campaign, type StockCard,
} from '@/lib/playerStockMarket';
import PlayerStockMarket from '@/pages/PlayerStockMarket';
import { click, mountPage } from './dailyReload/harness';
import { recordCompletion } from './dailyReload/mocks';
import { getTodayET } from '@/lib/dateUtils';

afterEach(() => localStorage.removeItem(`player-stock-market-daily-${getTodayET()}`));

function fixture() {
  const identities: Record<string, string> = {};
  const slots = STOCK_FORMATION.slots.map((slot, index) => {
    const candidates = [5, 35].map((millions, tier): StockCard => {
      const id = `s${index}c${tier}`;
      identities[id] = `Fixture ${slot.label} ${index} option ${tier}`;
      return { id, position: slot.allowed[0], age: 21, matches: 26, goals: 0, assists: 0, yellowCards: 0, redCards: 0,
        price: millions * 1_000_000, final: (5 + tier * (index + 3)) * 1_000_000 };
    });
    return { slot, candidates };
  });
  const campaign: Campaign = { startYear: 2022, finalYear: 2026, budget: STOCK_BUDGET, slots, identities };
  const picks = slots.map(slot => slot.candidates[0]);
  return { campaign, picks, holdings: buildHoldings(campaign, picks, []) };
}

it('uses the same budget-constrained optimum for the review and the score', () => {
  const { campaign, picks, holdings } = fixture();
  const finish = finishCampaign(campaign, picks, holdings);
  const rows = finish.bestXI!;
  const expected = campaign.slots.map((slot, i) => slot.candidates[i >= 7 ? 1 : 0]);
  expect(rows).toHaveLength(11);
  expect(rows).toEqual(expected.map(c => ({ name: campaign.identities[c.id], position: c.position, price: c.price, final: c.final })));
  expect(rows.reduce((n, row) => n + row.price, 0)).toBe(175_000_000);
  expect(rows.reduce((n, row) => n + row.final, 0)).toBe(101_000_000);
  expect(finish.bestValue).toBe(101_000_000);
  expect(finish.score).toBe(0);
  expect(scoreCampaign(campaign, expected).score).toBe(100);
});

it('restores the optional Daily review and preserves the legacy result when the add-on is absent or corrupt', async () => {
  const { campaign, picks, holdings } = fixture();
  const date = getTodayET();
  const key = `player-stock-market-daily-${date}`;
  const fresh = finishCampaign(campaign, picks, holdings);
  const writesBefore = recordCompletion.mock.calls.length;
  saveDailyResult(date, fresh);
  const original = localStorage.getItem(key)!;
  expect(loadDailyResult(date)).toMatchObject(fresh);
  const mounted = mountPage(<PlayerStockMarket />, '/player-stock-market');
  try {
    const review = Array.from(mounted.container.querySelectorAll('summary')).find(node => node.textContent === 'Review the best affordable XI');
    expect(review).toBeDefined();
    await click(review!);
    const rows = Array.from(mounted.container.querySelectorAll('details[open] li')).filter(row => row.textContent?.includes('Fixture'));
    expect(rows).toHaveLength(11);
    expect(rows[10]).toHaveTextContent('Fixture LW 10 option 1');
    expect(rows[10]).toHaveTextContent('$13M more at the end in this slot');
    expect(localStorage.getItem(key)).toBe(original);
    expect(recordCompletion).toHaveBeenCalledTimes(writesBefore);
  } finally {
    mounted.unmount();
  }

  const { bestXI, ...legacy } = fresh;
  saveDailyResult(date, legacy);
  const legacyBytes = localStorage.getItem(key);
  const oldPage = mountPage(<PlayerStockMarket />, '/player-stock-market');
  try {
    expect(oldPage.container).not.toHaveTextContent('Review the best affordable XI');
    expect(oldPage.container).toHaveTextContent('The market bit back');
    expect(localStorage.getItem(key)).toBe(legacyBytes);
  } finally {
    oldPage.unmount();
  }
  for (const bad of [
    bestXI!.slice(1),
    [{ ...bestXI![0], price: STOCK_BUDGET }, ...bestXI!.slice(1)],
    [{ ...bestXI![0], position: 'ST' }, ...bestXI!.slice(1)],
    [{ ...bestXI![0], final: bestXI![0].final + 1_000_000 }, ...bestXI!.slice(1)],
    [{ ...bestXI![0], name: bestXI![1].name }, ...bestXI!.slice(1)],
  ]) {
    const broken = JSON.stringify({ ...fresh, bestXI: bad, v: 1, date });
    localStorage.setItem(key, broken);
    expect(loadDailyResult(date)?.bestXI).toBeUndefined();
    expect(loadDailyResult(date)).toMatchObject(legacy);
    expect(localStorage.getItem(key)).toBe(broken);
  }
});
