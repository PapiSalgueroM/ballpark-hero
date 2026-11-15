import { act, cleanup, fireEvent, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { bookStandsConstruction, newTycoon, serializeTycoon, TYCOON_SAVE_KEY } from '@/lib/stadiumTycoon';
import { newLedger, REWARDS_KEY } from '@/lib/tycoonRewards';
import { SAVE_KEY as ACADEMY_SAVE_KEY } from '@/lib/wonderkidFactory';
import StadiumTycoon from '@/pages/StadiumTycoon';

const now = 1794085200000;
const initial = { ...newTycoon(now), minute: 89, goalsFor: 1, fanbase: 140 };
let frame: FrameRequestCallback;

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(Math, 'random').mockReturnValue(0.9999);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => { frame = run; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(initial, now));
  localStorage.setItem(REWARDS_KEY, JSON.stringify(newLedger(61)));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  resetMocks();
});

function saveBookingInOtherTab(start = initial) {
  const booked = bookStandsConstruction(start, 0, 2, 24);
  expect(booked).toMatchObject({ money: start.money - 24, standsOpenAfterMatch: 2 });
  const bytes = serializeTycoon(booked, now);
  localStorage.setItem(TYCOON_SAVE_KEY, bytes);
  return bytes;
}

describe('Stadium Tycoon stale tabs', () => {
  it('preserves a newer construction booking through an older tab pagehide and reopens it on reload', () => {
    const older = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    expect(screen.getByRole('button', { name: 'Schedule construction for $24' })).toBeVisible();
    const newer = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    fireEvent.click(within(newer.container).getByRole('button', { name: 'Schedule construction for $24' }));
    const booked = localStorage.getItem(TYCOON_SAVE_KEY)!;
    expect(JSON.parse(booked)).toMatchObject({ money: 16, standsOpenAfterMatch: 2 });
    newer.unmount();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(booked);
    expect(screen.getByRole('button', { name: 'Reload latest save' })).toBeVisible();

    older.unmount();
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(booked);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    expect(screen.getByText('40 seats open after 2 matches.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reload latest save' })).toBeNull();
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(booked);
  });

  it('parks stale purchases, manual writers, and the next watched full time', () => {
    const start = { ...initial, money: 200 };
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(start, now));
    const { result } = renderHook(() => useStadiumTycoon());
    const before = result.current.state;
    const booked = saveBookingInOtherTab(start);
    const ledger = localStorage.getItem(REWARDS_KEY);
    const draws = vi.mocked(Math.random).mock.calls.length;
    act(() => {
      result.current.doBuy('tickets');
      result.current.doHire('steward');
      result.current.doTap(30, 25);
      result.current.doSetTicketPolicy('premium');
      frame(2000);
    });
    expect(result.current.state).toBe(before);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(Math.random).toHaveBeenCalledTimes(draws);
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(booked);
    expect(localStorage.getItem(REWARDS_KEY)).toBe(ledger);
  });

  it('refuses stale offline earnings and away matches before they can credit the separate ledger', () => {
    const { result } = renderHook(() => useStadiumTycoon());
    const before = result.current.state;
    const booked = saveBookingInOtherTab();
    const ledger = localStorage.getItem(REWARDS_KEY);
    vi.mocked(Date.now).mockReturnValue(now + 60 * 60 * 1000);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(booked);
    expect(localStorage.getItem(REWARDS_KEY)).toBe(ledger);
    expect(result.current.state).toBe(before);
    expect(result.current.awayTrip).toBeNull();
  });

  it('keeps other save keys independent and warns when the stadium key changes', () => {
    const { result } = renderHook(() => useStadiumTycoon());
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: ACADEMY_SAVE_KEY })); });
    expect(result.current.saveMoved).toBe(false);
    const booked = saveBookingInOtherTab();
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: TYCOON_SAVE_KEY, newValue: booked })); });
    expect(result.current.saveMoved).toBe(true);
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(booked);
  });
});
