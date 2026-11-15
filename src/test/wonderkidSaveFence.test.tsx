import { recordCompletion } from './dailyReload/mocks';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { mountPage } from './dailyReload/harness';
import { useWonderkidFactory } from '@/hooks/useWonderkidFactory';
import { fenceKeyOf } from '@/lib/saveFence';
import { BOOTS } from '@/lib/soccerCareerAppearance';
import { newTycoon, serializeTycoon, TYCOON_SAVE_KEY } from '@/lib/stadiumTycoon';
import { creditFullTimes, newLedger, REWARDS_KEY } from '@/lib/tycoonRewards';
import { DEADLINE_EVERY, DEADLINE_SEC, deserialize, fmtCash, LEAVE_AGE, makeProspectInBand, newFactory, PACKS, salePrice, SAVE_KEY, serialize, tick, YEAR_SEC } from '@/lib/wonderkidFactory';
import StadiumTycoon from '@/pages/StadiumTycoon';
import WonderkidFactory from '@/pages/WonderkidFactory';

const now = Date.UTC(2026, 10, 11, 5);
const save = () => localStorage.getItem(SAVE_KEY);
const ledger = () => localStorage.getItem(REWARDS_KEY);
const academySavers: (() => void)[] = [];
const academyTicks: (() => void)[] = [];
let prospectId: number;

beforeEach(() => {
  localStorage.clear();
  recordCompletion.mockClear();
  academySavers.length = 0;
  academyTicks.length = 0;
  vi.spyOn(Date, 'now').mockReturnValue(now);
  const setInterval = window.setInterval.bind(window);
  vi.spyOn(window, 'setInterval').mockImplementation((callback, ms, ...args) => {
    if (typeof callback === 'function') {
      if (ms === 5_000) academySavers.push(() => callback(...args));
      if (ms === 250) academyTicks.push(() => callback(...args));
    }
    return setInterval(callback, ms, ...args);
  });
  const academy = newFactory(now, 913);
  academy.awayMs = 0;
  const kid = makeProspectInBand(academy, 72, 81, () => 0.89);
  prospectId = kid.id;
  academy.prospects.push(kid);
  localStorage.setItem(SAVE_KEY, serialize(deserialize(serialize(academy), now)!));
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(newTycoon(now), now));
  localStorage.setItem(REWARDS_KEY, JSON.stringify(creditFullTimes(newLedger(913), [
    { totalMatches: 1, result: 'win', away: false, position: 1, division: 0 },
    { totalMatches: 2, result: 'win', away: false, position: 1, division: 0 },
  ])));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

async function openDoor(stadium: boolean) {
  const view = stadium ? mountPage(<StadiumTycoon />, '/stadium-tycoon') : mountPage(<WonderkidFactory />, '/wonderkid-factory');
  if (stadium) fireEvent.click(within(view.container).getByRole('button', { name: /^🎓 Academy/ }));
  const promote = await within(view.container).findByRole('button', { name: 'Promote to first team' }, { timeout: 4_000 });
  return { ...view, promote };
}

it.each([
  ['promotion', false], ['promotion', true], ['sale', false], ['sale', true],
] as const)('protects the %s from the older academy door (Stadium active: %s)', async (action, stadium) => {
  const active = await openDoor(stadium);
  const older = await openDoor(!stadium);
  expect(academySavers).toHaveLength(2);
  const before = save();
  act(() => academySavers.forEach(write => write()));
  expect(save()).toBe(before);
  expect(localStorage.getItem(fenceKeyOf(SAVE_KEY))).toBeNull();

  fireEvent.click(action === 'promotion' ? active.promote : within(active.container).getByRole('button', { name: /^Sell for / }));
  const committed = save();
  expect(committed).not.toBe(before);
  const state = deserialize(committed, now)!;
  expect(state.prospects).toHaveLength(0);
  if (action === 'promotion') expect(state.firstTeam).toHaveLength(1);
  else expect(state.sold).toBe(1);

  act(academySavers[1]);
  const afterInterval = save();
  fireEvent(window, new Event('pagehide'));
  const afterPagehide = save();
  const notice = within(older.container).queryByRole('button', { name: 'Reload academy' });
  older.unmount();

  expect(afterInterval).toBe(committed);
  expect(afterPagehide).toBe(committed);
  expect(save()).toBe(committed);
  expect(notice).not.toBeNull();
}, 15_000);

it('lets the first changed idle autosave establish the current academy', async () => {
  await openDoor(false);
  const second = await openDoor(true);
  const before = save();
  vi.mocked(Date.now).mockReturnValue(now + 5_000);
  act(academyTicks[0]);
  act(academySavers[0]);
  const committed = save();
  expect(committed).not.toBe(before);
  expect(deserialize(committed, now + 5_000)?.lastSeen).toBe(now + 5_000);
  act(academySavers[1]);
  expect(save()).toBe(committed);
  expect(within(second.container).getByRole('button', { name: 'Reload academy' })).toBeVisible();
}, 15_000);

it.each(['promote', 'pack', 'upgrade'] as const)('refuses a stale %s before it can change either save', (action) => {
  let active: ReturnType<typeof useWonderkidFactory> | undefined;
  let older: ReturnType<typeof useWonderkidFactory> | undefined;
  function Probe({ stale }: { stale: boolean }) {
    const academy = useWonderkidFactory();
    if (stale) older = academy; else active = academy;
    return null;
  }
  render(<Probe stale={false} />);
  render(<Probe stale />);
  act(() => active!.doPromote(prospectId));
  const committed = save();
  const rewards = ledger();
  act(() => {
    if (action === 'promote') older!.doPromote(prospectId);
    else if (action === 'pack') older!.doOpenPack(PACKS[0].id);
    else older!.doUpgradeBoot(BOOTS[0].id);
  });
  expect(ledger()).toBe(rewards);
  expect(save()).toBe(committed);
  expect(older!.state.prospects).toHaveLength(1);
});

it('saves a prospect sale before carrying it into the other door', async () => {
  const view = render(<StadiumTycoon />, { wrapper: ({ children }) => <HelmetProvider><MemoryRouter>{children}</MemoryRouter></HelmetProvider> });
  const stadium = within(view.container);
  fireEvent.click(stadium.getByRole('button', { name: /^🎓 Academy/ }));
  const sell = await stadium.findByRole('button', { name: /^Sell for / }, { timeout: 4_000 });
  const before = save();
  fireEvent.click(sell);
  const sold = save();
  expect(sold).not.toBe(before);
  expect(deserialize(sold, now)?.sold).toBe(1);
  await act(async () => { view.rerender(<WonderkidFactory />); });
  expect(stadium.queryByText(/the beds are empty/)).toBeVisible();
  expect(save()).toBe(sold);
  expect(stadium.queryByRole('button', { name: 'Reload academy' })).toBeNull();
}, 15_000);

it.each([false, true])('holds a prospect and its fee until storage accepts the sale (Stadium: %s)', async stadium => {
  const view = await openDoor(stadium);
  const academy = within(view.container);
  const sell = academy.getByRole('button', { name: /^Sell for / });
  const before = save();
  const state = deserialize(before, now)!;
  const fee = salePrice(state, state.prospects[0]);
  const nativeWrite = Storage.prototype.setItem;
  let refused = 0;
  const fault = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === SAVE_KEY) {
      refused++;
      throw new DOMException('Controlled academy save refusal', 'QuotaExceededError');
    }
    nativeWrite.call(this, key, value);
  });

  fireEvent.click(sell);
  expect(save()).toBe(before);
  expect(refused).toBe(1);
  expect(sell).toBeVisible();
  expect(academy.getByText(/The academy could not save that change/)).toBeVisible();
  expect(recordCompletion).not.toHaveBeenCalled();

  fault.mockRestore();
  fireEvent.click(sell);
  const sold = deserialize(save(), now)!;
  expect(sold.prospects).toHaveLength(0);
  expect(sold.cash).toBe(state.cash + fee);
  expect(sold.soldCareer).toBe(state.soldCareer + 1);
  expect(academy.queryByText(/The academy could not save that change/)).toBeNull();
  expect(recordCompletion.mock.calls).toEqual([['/wonderkid-factory']]);
}, 15_000);

function saleFixture(watchedSeconds: number) {
  const academy = newFactory(now, 216);
  for (let i = 0; i < watchedSeconds * 4; i++) tick(academy, 0.25);
  expect(academy.prospects[0]?.name).toBe('Joris Kortenhorst');
  return academy;
}

async function openQuotedSale(stadium: boolean, fee: number) {
  const view = stadium ? mountPage(<StadiumTycoon />, '/stadium-tycoon') : mountPage(<WonderkidFactory />, '/wonderkid-factory');
  const academy = within(view.container);
  if (stadium) fireEvent.click(academy.getByRole('button', { name: /^🎓 Academy/ }));
  const button = (price: number) => academy.getByRole('button', { name: `Sell for ${fmtCash(price)}` });
  const sell = await academy.findByRole('button', { name: `Sell for ${fmtCash(fee)}` });
  return { academy, button, sell };
}

function touch(button: HTMLElement, event: 'pointerdown' | 'pointerup' | 'pointercancel') {
  fireEvent(button, Object.assign(new Event(event, { bubbles: true }), { button: 0, pointerId: 1, pointerType: 'touch' }));
}

function advanceSaleTick() {
  vi.mocked(Date.now).mockReturnValue(now + 250);
  act(academyTicks[0]);
}

it.each([false, true])('asks for a fresh sale after Deadline Day lowers the held quote (Stadium: %s)', async stadium => {
  const academy = saleFixture(DEADLINE_EVERY + DEADLINE_SEC - 0.25);
  const kid = academy.prospects[0];
  expect(academy.deadlineLeft).toBe(0.25);
  expect(salePrice(academy, kid)).toBe(357);
  localStorage.setItem(SAVE_KEY, serialize(academy));
  const { academy: view, button, sell } = await openQuotedSale(stadium, 357);
  const before = save();

  touch(sell, 'pointerdown');
  advanceSaleTick();
  expect(button(238)).toBe(sell);
  touch(sell, 'pointerup');
  fireEvent.click(sell, { detail: 1 });

  expect(save()).toBe(before);
  expect(recordCompletion).not.toHaveBeenCalled();
  expect(button(238)).toBeVisible();
  expect(view.getByText('The sale price fell to $238. Choose Sell again to accept.')).toBeVisible();

  const retry = button(238);
  touch(retry, 'pointerdown');
  touch(retry, 'pointerup');
  fireEvent.click(retry, { detail: 1 });
  const sold = deserialize(save(), now + 250)!;
  expect(sold.cash).toBe(238);
  expect(sold.sold).toBe(1);
  expect(sold.prospects.some(prospect => prospect.id === kid.id)).toBe(false);
  expect(view.queryByText(/The sale price fell/)).not.toBeInTheDocument();
  expect(recordCompletion.mock.calls).toEqual([['/wonderkid-factory']]);
}, 15_000);

it.each([
  { action: 'immediate touch', beforeDeadline: false, expected: 357 },
  { action: 'a new click after cancellation', beforeDeadline: false, expected: 238 },
  { action: 'keyboard', beforeDeadline: false, expected: 238 },
  { action: 'higher quote', beforeDeadline: true, expected: 351 },
])('accepts the live fee for $action', async ({ action, beforeDeadline, expected }) => {
  const academy = saleFixture((beforeDeadline ? DEADLINE_EVERY : DEADLINE_EVERY + DEADLINE_SEC) - 0.25);
  localStorage.setItem(SAVE_KEY, serialize(academy));
  const { sell } = await openQuotedSale(false, beforeDeadline ? 234 : 357);

  const before = save();
  touch(sell, 'pointerdown');
  if (action === 'a new click after cancellation') {
    touch(sell, 'pointercancel');
    expect(save()).toBe(before);
    expect(recordCompletion).not.toHaveBeenCalled();
  }
  if (action !== 'immediate touch') advanceSaleTick();
  if (action === 'immediate touch' || action === 'higher quote') touch(sell, 'pointerup');
  const detail = action === 'keyboard' ? 0 : 1;
  fireEvent.click(sell, { detail });

  const sold = deserialize(save(), Date.now())!;
  expect(sold.cash).toBe(expected);
  expect(sold.sold).toBe(1);
  expect(recordCompletion.mock.calls).toEqual([['/wonderkid-factory']]);
}, 15_000);

it('does not sell an expired prospect when the held button disappears', async () => {
  const academy = saleFixture(DEADLINE_EVERY + DEADLINE_SEC - 0.25);
  const kid = academy.prospects[0];
  kid.age = LEAVE_AGE - 1;
  kid.ageClock = YEAR_SEC - 0.25;
  localStorage.setItem(SAVE_KEY, serialize(academy));
  const { sell } = await openQuotedSale(false, salePrice(academy, kid));
  const before = save();

  touch(sell, 'pointerdown');
  await act(async () => {
    advanceSaleTick();
    await import('@/components/club-manager/CelebrationStyles');
  });
  expect(sell).not.toBeInTheDocument();
  touch(sell, 'pointerup');
  fireEvent.click(sell, { detail: 1 });

  expect(save()).toBe(before);
  expect(recordCompletion).not.toHaveBeenCalled();
}, 15_000);
