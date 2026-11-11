import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import * as E from '@/lib/stadiumTycoon';

type Purchase = { state: E.TycoonState; quantity: number; cost: number };
const EPOCH = 1767225600000;
function purchase(state: E.TycoonState, id: string, amount: 1 | 5): Purchase {
  const fn = (E as unknown as { payrollPurchase?: (s: E.TycoonState, id: string, n: 1 | 5) => Purchase }).payrollPurchase;
  if (fn) return fn(state, id, amount);
  const next = E.hire(state, id);
  return { state: next, quantity: next === state ? 0 : 1, cost: next === state ? 0 : E.staffCostOf(state, id) };
}
function keep(name: string, value: unknown) {
  if (!process.env.TYCOON_PAYROLL_RAW) return;
  mkdirSync(process.env.TYCOON_PAYROLL_RAW, { recursive: true });
  writeFileSync(path.join(process.env.TYCOON_PAYROLL_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
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

describe('Stadium payroll batches', () => {
  it('holds one hire, unrelated fields, input and global draws', () => {
    const before = initial(1000), held = JSON.stringify(before), draws = vi.mocked(Math.random).mock.calls.length;
    const result = purchase(before, 'steward', 1);
    keep('single', { before, result });
    expect(result).toEqual({ state: { ...before, money: 900, staffLevels: { ...before.staffLevels, steward: 1 } }, quantity: 1, cost: 100 });
    expect(JSON.stringify(before)).toBe(held);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
  });
  it('buys five steward levels at their existing escalating prices', () => {
    const before = initial(1000), held = JSON.stringify(before), draws = vi.mocked(Math.random).mock.calls.length;
    const result = purchase(before, 'steward', 5);
    keep('five', { before, result });
    expect(result.quantity, 'PAYROLL_FIVE_REAL_HIRES').toBe(5);
    expect(result).toEqual({ state: { ...before, money: 352, staffLevels: { ...before.staffLevels, steward: 5 } }, quantity: 5, cost: 648 });
    expect(JSON.stringify(before)).toBe(held);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
  });
  it('buys only three affordable steward levels from341', () => {
    const before = initial(341), result = purchase(before, 'steward', 5);
    keep('partial', { before, result });
    expect(result.quantity, 'PAYROLL_AFFORDABLE_HIRES').toBe(3);
    expect(result).toEqual({ state: { ...before, money: 0, staffLevels: { ...before.staffLevels, steward: 3 } }, quantity: 3, cost: 341 });
  });
  it('holds the existing staff cap and exact unaffordable no-ops', () => {
    const capped = initial(1000); capped.staffLevels = { ...capped.staffLevels, steward: 300 };
    const empty = initial(99);
    for (const state of [empty, capped]) expect(purchase(state, 'steward', 5)).toEqual({ state, quantity: 0, cost: 0 });
    const last = initial(0); last.staffLevels = { ...last.staffLevels, steward: 299 };
    const price = E.staffCostOf(last, 'steward'); last.money = price * 2;
    const result = purchase(last, 'steward', 5);
    keep('cap', { before: last, result });
    expect(result.quantity).toBe(1); expect(result.cost).toBe(price);
    expect(result.state).toEqual({ ...last, money: last.money - price, staffLevels: { ...last.staffLevels, steward: 300 } });
  });
  it('shows the cap instead of a price for maxed upgrades in either purchase mode', () => {
    const before = initial(0);
    before.levels.stands = 200;
    localStorage.setItem(E.TYCOON_SAVE_KEY, E.serializeTycoon(before, EPOCH));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');

    const stands = screen.getByRole('button', { name: /Stands Lv 200/ });
    expect(stands).toBeDisabled();
    expect(stands).toHaveTextContent('Max level');
    expect(stands).not.toHaveTextContent(/\$/);

    fireEvent.click(screen.getByRole('button', { name: 'Up to 5 levels' }));
    expect(stands).toBeDisabled();
    expect(stands).toHaveTextContent('Max level');
    expect(stands).not.toHaveTextContent(/\$/);
  });
  it('shows the staff cap without a price or a new income quote in either purchase mode', () => {
    const before = initial(0);
    before.staffLevels = { ...before.staffLevels, steward: 300 };
    localStorage.setItem(E.TYCOON_SAVE_KEY, E.serializeTycoon(before, EPOCH));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    fireEvent.click(screen.getByRole('button', { name: /Payroll/ }));

    const steward = screen.getByRole('button', { name: /Turnstile Steward/ });
    expect(steward).toBeDisabled();
    expect(steward).toHaveTextContent('Max staff');
    expect(steward).not.toHaveTextContent(/\$/);

    fireEvent.click(screen.getByRole('button', { name: 'Up to 5 hires' }));
    expect(steward).toBeDisabled();
    expect(steward).toHaveTextContent('Max staff');
    expect(steward).not.toHaveTextContent(/\$/);
    expect(screen.getByRole('button', { name: /Pie Chef/ })).toHaveTextContent('Save for the next hire');
  });
  for (const [wallet, quantity, money, cost] of [[1000, 5, 352, 648], [341, 3, 0, 341]] as const) {
    it('quotes, hires and persists the affordable payroll batch from' + wallet, () => {
      const before = initial(wallet);
      localStorage.setItem(E.TYCOON_SAVE_KEY, E.serializeTycoon(before, EPOCH));
      localStorage.setItem('payroll-unrelated-save', 'held');
      mountPage(<StadiumTycoon />, '/stadium-tycoon');
      act(() => { fireEvent.click(screen.getByRole('button', { name: /Payroll/ })); });
      const toggle = screen.queryByRole('button', { name: 'Up to 5 hires' });
      keep('page-' + wallet, { before, togglePresent: toggle !== null });
      expect(toggle, 'PAYROLL_REAL_PAGE_CONTROL').not.toBeNull();
      act(() => { fireEvent.click(toggle!); });
      const steward = screen.getByRole('button', { name: /Turnstile Steward/ });
      expect(steward.textContent).toContain('Hire ' + quantity);
      expect(steward.textContent).toContain(String(cost));
      act(() => { fireEvent.click(steward); window.dispatchEvent(new Event('pagehide')); });
      const saved = JSON.parse(localStorage.getItem(E.TYCOON_SAVE_KEY)!);
      keep('page-result-' + wallet, { before, saved });
      expect(saved.money).toBe(money); expect(saved.staffLevels.steward).toBe(quantity);
      expect(saved.levels).toEqual(before.levels); expect(saved.league).toEqual(before.league);
      expect(saved.lifetime).toBe(before.lifetime); expect(saved.totalTaps).toBe(before.totalTaps);
      expect(localStorage.getItem('payroll-unrelated-save')).toBe('held');
    });
  }
});
