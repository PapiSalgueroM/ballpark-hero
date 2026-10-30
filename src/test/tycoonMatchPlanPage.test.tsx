import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { deserializeTycoon, newTycoon, playMinute, serializeTycoon, TYCOON_SAVE_KEY, type TickEvent } from '@/lib/stadiumTycoon';

const EPOCH = 1793296800000;
let elapsed = 0;
let frame: FrameRequestCallback | null = null;
let latest: ReturnType<typeof useStadiumTycoon>;
function Probe() { latest = useStadiumTycoon(); return null; }
function fixture(minute: number) {
  const state = newTycoon(EPOCH), events: TickEvent[] = [];
  for (let i = 0; i < minute; i++) playMinute(state, () => 1, events, { pay: true });
  expect(state.minute).toBe(minute);
  const loaded = deserializeTycoon(serializeTycoon(state, EPOCH), EPOCH)!;
  expect(loaded).not.toBeNull();
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(loaded, EPOCH));
  return loaded;
}
function saved() { return JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY)!); }
function planGroup() { return screen.getByRole('group', { name: 'Late-match plan' }); }
beforeEach(() => {
  elapsed = 0; frame = null; localStorage.clear(); resetMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frame = null; });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => { try { cleanup(); } finally { vi.restoreAllMocks(); vi.unstubAllGlobals(); } });

describe('late-match plans on the real Stadium page and hook', () => {
  it('reserves all three disabled controls before60 without changing the save or counting play', () => {
    fixture(59);
    const raw = localStorage.getItem(TYCOON_SAVE_KEY);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const group = within(planGroup());
    for (const name of ['Protect the lead', 'Balanced', 'Chase a goal']) {
      const button = group.getByRole('button', { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(group.getByRole('button', { name: 'Balanced' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(raw);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('persists an explicit Balanced commitment, locks every choice and reloads the same match', () => {
    const before = fixture(60);
    const page = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const group = within(planGroup());
    for (const name of ['Protect the lead', 'Balanced', 'Chase a goal']) expect(group.getByRole('button', { name })).toBeEnabled();
    fireEvent.click(group.getByRole('button', { name: 'Balanced' }));
    const committed = saved();
    expect(committed.matchPlan).toEqual({ rep: before.rep, match: before.totalMatches, choice: 'balanced' });
    const { matchPlan, ...rest } = committed;
    expect(rest).toEqual(JSON.parse(serializeTycoon(before, EPOCH)));
    expect(matchPlan.choice).toBe('balanced');
    for (const name of ['Protect the lead', 'Balanced', 'Chase a goal']) {
      expect(group.getByRole('button', { name })).toBeDisabled();
      fireEvent.click(group.getByRole('button', { name }));
    }
    expect(saved()).toEqual(committed);
    expect(group.getByRole('status')).toHaveTextContent('Balanced locked until full time.');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/stadium-tycoon');
    page.unmount();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    expect(saved()).toEqual(committed);
    expect(within(planGroup()).getByRole('button', { name: 'Balanced' })).toBeDisabled();
    expect(within(planGroup()).getByRole('status')).toHaveTextContent('Balanced locked until full time.');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('a failed durable write commits nothing, then retries once against the latest ref', () => {
    fixture(65);
    render(<Probe />);
    const before = latest.state, raw = localStorage.getItem(TYCOON_SAVE_KEY), writer = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === TYCOON_SAVE_KEY && blocked) throw new DOMException('Full', 'QuotaExceededError');
      return writer.call(this, key, value);
    });
    let refused: boolean | undefined;
    act(() => { refused = latest.doSetMatchPlan('protect'); });
    expect(refused).toBe(false);
    expect(latest.state).toBe(before);
    expect(latest.matchPlanError).toBe('Could not save that plan. Try again.');
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(raw);
    expect(recordCompletion).not.toHaveBeenCalled();
    blocked = false;
    let accepted: boolean | undefined, duplicate: boolean | undefined;
    act(() => {
      accepted = latest.doSetMatchPlan('protect');
      duplicate = latest.doSetMatchPlan('chase');
    });
    expect(accepted).toBe(true); expect(duplicate).toBe(false);
    expect(latest.state.matchPlan?.choice).toBe('protect');
    expect(latest.matchPlanError).toBeNull();
    expect(saved()).toEqual(JSON.parse(serializeTycoon(latest.state, EPOCH)));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('the real page shows a retryable storage error without locking a choice or tapping the pitch', () => {
    const before = fixture(65);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const writer = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === TYCOON_SAVE_KEY && blocked) throw new DOMException('Full', 'QuotaExceededError');
      return writer.call(this, key, value);
    });
    fireEvent.click(within(planGroup()).getByRole('button', { name: 'Chase a goal' }));
    expect(within(planGroup()).getByRole('alert')).toHaveTextContent('Could not save that plan. Try again.');
    expect(within(planGroup()).getByRole('button', { name: 'Chase a goal' })).toBeEnabled();
    expect(saved().matchPlan).toBeUndefined();
    expect(recordCompletion).not.toHaveBeenCalled();
    blocked = false;
    fireEvent.click(within(planGroup()).getByRole('button', { name: 'Chase a goal' }));
    expect(saved().matchPlan.choice).toBe('chase');
    expect(saved().money).toBe(before.money);
    expect(saved().totalTaps).toBe(before.totalTaps);
    expect(within(planGroup()).queryByRole('alert')).toBeNull();
  });

  it('selection uses the live match after the normal clock advances and grants no extra progress', () => {
    fixture(60);
    render(<Probe />);
    elapsed = 1600;
    const callback = frame;
    act(() => { callback?.(elapsed); });
    const before = latest.state;
    expect(before.minute).toBe(61);
    act(() => { expect(latest.doSetMatchPlan('chase')).toBe(true); });
    const { matchPlan, ...rest } = latest.state;
    expect(rest).toEqual(before);
    expect(matchPlan).toEqual({ rep: before.rep, match: before.totalMatches, choice: 'chase' });
    expect(saved()).toEqual(JSON.parse(serializeTycoon(latest.state, EPOCH + elapsed)));
  });

  it('reopenable help explains both costs, reload locking, the default and a worked lead', () => {
    fixture(60);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    const dialog = screen.getByRole('dialog', { name: 'How Stadium Tycoon works' });
    expect(dialog).toHaveTextContent('Protect the lead lowers chances for both sides.');
    expect(dialog).toHaveTextContent('Chase a goal raises both, so your rival gets more chances too.');
    expect(dialog).toHaveTextContent('including after a reload');
    expect(dialog).toHaveTextContent('Doing nothing keeps Balanced.');
    expect(dialog).toHaveTextContent('leading 1-0 at 60 minutes');
    expect(dialog).toHaveTextContent('a clean sheet is never guaranteed');
  });
});
