import './dailyReload/mocks';
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
import { deserialize, makeProspectInBand, newFactory, PACKS, salePrice, SAVE_KEY, serialize } from '@/lib/wonderkidFactory';
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

it.each([false, true])('protects the promotion from the older academy door (Stadium active: %s)', async (stadium) => {
  const active = await openDoor(stadium);
  const older = await openDoor(!stadium);
  expect(academySavers).toHaveLength(2);
  const before = save();
  act(() => academySavers.forEach(write => write()));
  expect(save()).toBe(before);
  expect(localStorage.getItem(fenceKeyOf(SAVE_KEY))).toBeNull();

  fireEvent.click(active.promote);
  const committed = save();
  expect(committed).not.toBe(before);
  expect(deserialize(committed, now)?.firstTeam).toHaveLength(1);

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

  fault.mockRestore();
  fireEvent.click(sell);
  const sold = deserialize(save(), now)!;
  expect(sold.prospects).toHaveLength(0);
  expect(sold.cash).toBe(state.cash + fee);
  expect(sold.soldCareer).toBe(state.soldCareer + 1);
  expect(academy.queryByText(/The academy could not save that change/)).toBeNull();
}, 15_000);


it.each([false, true])('keeps a facility purchase pending until the academy can save it (Stadium: %s)', async stadium => {
  const state = deserialize(save(), now)!;
  state.cash = 100;
  localStorage.setItem(SAVE_KEY, serialize(state));
  const before = save();
  const view = await openDoor(stadium);
  const academy = within(view.container);
  fireEvent.click(academy.getByRole('button', { name: /Coaching staff/ }));
  const upgrade = await academy.findByRole('button', { name: 'Upgrade for $45' }, { timeout: 5_000 });
  const nativeWrite = Storage.prototype.setItem;
  const fault = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key === SAVE_KEY) throw new DOMException('Controlled academy save refusal', 'QuotaExceededError');
    nativeWrite.call(this, key, value);
  });

  fireEvent.click(upgrade);
  expect(upgrade).toHaveAccessibleName('Upgrade for $45');
  expect(academy.getByText('Level 0')).toBeVisible();
  expect(academy.getByText('$100')).toBeVisible();
  expect(academy.getByText(/The academy could not save that change/)).toBeVisible();
  expect(save()).toBe(before);

  fault.mockRestore();
  fireEvent.click(upgrade);
  expect(academy.getByText('Level 1')).toBeVisible();
  expect(academy.getByText('$55')).toBeVisible();
  expect(academy.queryByText(/The academy could not save that change/)).toBeNull();
  const upgraded = deserialize(save(), now)!;
  expect(upgraded).toEqual({ ...state, cash: 55, levels: { ...state.levels, coaching: 1 } });
  const committed = save();
  view.unmount();

  const restored = await openDoor(!stadium);
  const restoredAcademy = within(restored.container);
  fireEvent.click(restoredAcademy.getByRole('button', { name: /Coaching staff/ }));
  expect(await restoredAcademy.findByText('Level 1', {}, { timeout: 5_000 })).toBeVisible();
  expect(restoredAcademy.getByText('$55')).toBeVisible();
  expect(save()).toBe(committed);
}, 25_000);
