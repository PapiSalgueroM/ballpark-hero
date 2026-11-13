import './dailyReload/mocks';
import { cleanup, fireEvent, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { buyPerk, deserializeTycoon, newTycoon, serializeTycoon, TYCOON_SAVE_KEY } from '@/lib/stadiumTycoon';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('holds the Legacy points and perk until storage accepts the purchase', () => {
  const now = Date.UTC(2026, 10, 11, 22);
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const state = { ...newTycoon(now), legacyPoints: 4, legacySeeded: true };
  const before = serializeTycoon(state, now);
  localStorage.setItem(TYCOON_SAVE_KEY, before);
  const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  fireEvent.click(within(view.container).getByRole('button', { name: /Legacy/ }));
  const perk = within(view.container.querySelector<HTMLElement>('[data-perk="sway"]')!);
  const buy = perk.getByRole('button', { name: 'Buy Boardroom Sway, level 1, 3 pts' });
  const nativeWrite = Storage.prototype.setItem;
  const fault = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === TYCOON_SAVE_KEY) throw new DOMException('Controlled stadium save refusal', 'QuotaExceededError');
    nativeWrite.call(this, key, value);
  });

  fireEvent.click(buy);
  expect(perk.getByText('Lv 0/5')).toBeVisible();
  expect(within(view.container).getByText('4 points')).toBeVisible();
  expect(perk.getByRole('alert')).toHaveTextContent('Could not save this perk. Try again.');
  expect(within(view.container).queryByText(/locked in forever/)).toBeNull();
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(before);

  fault.mockRestore();
  fireEvent.click(buy);
  expect(perk.getByText('Lv 1/5')).toBeVisible();
  expect(within(view.container).getByText('1 point')).toBeVisible();
  expect(perk.queryByRole('alert')).toBeNull();
  const purchased = serializeTycoon(buyPerk(deserializeTycoon(before, now)!, 'sway'), now);
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(purchased);

  view.unmount();
  const restored = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  fireEvent.click(within(restored.container).getByRole('button', { name: /Legacy/ }));
  expect(within(restored.container.querySelector<HTMLElement>('[data-perk="sway"]')!).getByText('Lv 1/5')).toBeVisible();
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(purchased);
});
