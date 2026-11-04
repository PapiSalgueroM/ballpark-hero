import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import * as E from '@/lib/stadiumTycoon';

type Purchase = { state: E.TycoonState; quantity: number; cost: number };
const EPOCH = 1767225600000;
function purchase(state: E.TycoonState, id: string, amount: 1 | 5): Purchase {
  const fn = (E as unknown as { upgradePurchase?: (s: E.TycoonState, id: string, n: 1 | 5) => Purchase }).upgradePurchase;
  if (fn) return fn(state, id, amount);
  // The old control makes exactly the one purchase its button made.
  const next = E.buy(state, id);
  return { state: next, quantity: next === state ? 0 : 1, cost: next === state ? 0 : E.costOf(state, id) };
}
function keep(name: string, value: unknown) {
  if (!process.env.TYCOON_BATCH_RAW) return;
  mkdirSync(process.env.TYCOON_BATCH_RAW, { recursive: true });
  writeFileSync(path.join(process.env.TYCOON_BATCH_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
function initial(money: number) { return { ...E.newTycoon(EPOCH), clubName: 'Your club', money }; }
beforeEach(() => {
  localStorage.clear(); resetMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.spyOn(Date, 'now').mockReturnValue(EPOCH);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Stadium Tycoon upgrade batches', () => {
  it('keeps one-level purchasing and every unrelated state field unchanged', () => {
    const before = initial(1000), held = JSON.stringify(before), draws = vi.mocked(Math.random).mock.calls.length;
    const result = purchase(before, 'stands', 1);
    keep('single', { before, result });
    expect(result).toEqual({ state: { ...before, money: 970, levels: { ...before.levels, stands: 1 } }, quantity: 1, cost: 30 });
    expect(JSON.stringify(before)).toBe(held);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
  });
  it('buys five real levels at their escalating prices without extra rewards or draws', () => {
    const before = initial(1000), held = JSON.stringify(before), draws = vi.mocked(Math.random).mock.calls.length;
    const result = purchase(before, 'stands', 5);
    keep('five', { before, result });
    // Existing Stands levels cost30,35,40,46,52, total203.
    expect(result.quantity, 'TYCOON_BATCH_FIVE').toBe(5);
    expect(result).toEqual({ state: { ...before, money: 797, levels: { ...before.levels, stands: 5 } }, quantity: 5, cost: 203 });
    expect(JSON.stringify(before)).toBe(held);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
  });
  it('buys only the affordable part of a batch and spends no more than the wallet', () => {
    const before = initial(105), result = purchase(before, 'stands', 5);
    keep('partial', { before, result });
    expect(result.quantity, 'TYCOON_BATCH_PARTIAL').toBe(3);
    expect(result).toEqual({ state: { ...before, money: 0, levels: { ...before.levels, stands: 3 } }, quantity: 3, cost: 105 });
  });
  it('stops at the existing track cap instead of charging for unavailable levels', () => {
    const before = initial(Number.MAX_SAFE_INTEGER);
    before.levels.stands = 198;
    const held = JSON.stringify(before), result = purchase(before, 'stands', 5);
    keep('cap', { before, result });
    expect(result.quantity, 'TYCOON_BATCH_CAP').toBe(2);
    expect(result.state.levels.stands).toBe(200);
    expect(result.state.money).toBeGreaterThanOrEqual(0);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.state.league).toEqual(before.league);
    expect(result.state.lifetime).toBe(before.lifetime);
    expect(JSON.stringify(before)).toBe(held);
  });
  it('keeps unaffordable and fully capped purchases as exact no-ops', () => {
    const empty = initial(29), capped = initial(1000);
    capped.levels.stands = 200;
    for (const state of [empty, capped]) {
      const result = purchase(state, 'stands', 5);
      expect(result.state).toBe(state);
      expect(result.quantity).toBe(0);
      expect(result.cost).toBe(0);
    }
  });
  for (const [wallet, quantity, money] of [[1000, 5, 797], [105, 3, 0]] as const) {
    it('the real page previews and saves an affordable batch from wallet' + wallet, () => {
      const before = initial(wallet);
      localStorage.setItem(E.TYCOON_SAVE_KEY, E.serializeTycoon(before, EPOCH));
      localStorage.setItem('batch-unrelated-save', 'held');
      const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
      const toggle = view.queryByRole('button', { name: 'Up to 5 levels' });
      keep('page-' + wallet, { before, togglePresent: toggle !== null });
      expect(toggle, 'TYCOON_BATCH_PAGE_CONTROL').not.toBeNull();
      act(() => { fireEvent.click(toggle!); });
      const stands = view.getByRole('button', { name: /Stands/ });
      expect(stands.textContent).toContain('Buy ' + quantity);
      act(() => { fireEvent.click(stands); });
      expect(view.getByRole('button', { name: /Stands/ }).textContent).toContain('Lv ' + quantity);
      act(() => { window.dispatchEvent(new Event('pagehide')); });
      const saved = JSON.parse(localStorage.getItem(E.TYCOON_SAVE_KEY)!);
      keep('page-result-' + wallet, { before, saved });
      expect(saved.money).toBe(money);
      expect(saved.levels.stands).toBe(quantity);
      expect(saved.lifetime).toBe(before.lifetime);
      expect(saved.totalTaps).toBe(before.totalTaps);
      expect(saved.league).toEqual(before.league);
      expect(localStorage.getItem('batch-unrelated-save')).toBe('held');
    });
  }
});
