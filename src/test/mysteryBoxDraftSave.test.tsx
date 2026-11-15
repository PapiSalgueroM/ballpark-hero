import { act, cleanup, fireEvent, render, renderHook, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MysteryBoxBoard } from '@/components/mystery-box/MysteryBoxBoard';
import { useMysteryBox } from '@/hooks/useMysteryBox';
import type { PackPlayer, PackTier } from '@/lib/fetchPackPool';
import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const fixture = vi.hoisted(() => ({ day: '2026-11-15', pool: [] as PackPlayer[], load: undefined as (() => Promise<PackPlayer[]>) | undefined }));
vi.mock('@/lib/dateUtils', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/dateUtils')>(),
  getTodayET: () => fixture.day,
}));
vi.mock('@/lib/fetchPackPool', () => ({ fetchPackPool: async () => fixture.load ? fixture.load() : fixture.pool }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/FlagImg', () => ({ FlagImg: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

const key = 'mystery-box-' + fixture.day;
const otherDay = 'mystery-box-2026-11-14';
const bytes = (decisions: Array<{ slot: number | null }>, revealedCurrent = false) => JSON.stringify({ decisions, revealedCurrent });
const saved = () => localStorage.getItem(key);
type Draft = ReturnType<typeof renderHook<ReturnType<typeof useMysteryBox>, void>>;

async function mount() {
  const view = renderHook(useMysteryBox);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

function open(view: Draft) {
  act(() => view.result.current.openPack());
  return view.result.current.current;
}

function useFirstSlot(view: Draft) {
  const slot = view.result.current.compatibleSlots[0];
  expect(slot).toBeDefined();
  act(() => view.result.current.place(slot));
  return slot;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  consumeRestoredFinish('mystery-box');
  fixture.load = undefined;
  const tiers: PackTier[] = ['fringe', 'squad', 'quality', 'star', 'superstar'];
  fixture.pool = tiers.flatMap(tier => Array.from({ length: 18 }, (_v, i) => ({
    name: 'Synthetic ' + tier + ' ' + i, club: 'Fixture Club', nationality: 'Fixture Nation', league: 'Other',
    goals: 0, assists: 0, position: 'CM', kitNumber: 0, age: 22, marketValue: 23, difficulty: 'easy', tier, fixedOverall: 80,
  })));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  consumeRestoredFinish('mystery-box');
});

describe('Mystery Box daily draft saves', () => {
  it('blocks a stale Open it in the board and offers to reload the exact newer draft', async () => {
    const winner = await mount();
    const mounted = render(<MemoryRouter><MysteryBoxBoard /></MemoryRouter>);
    const stale = within(mounted.container);
    const oldOpen = await stale.findByRole('button', { name: 'Open it' });

    const first = open(winner);
    expect(first?.name).toBe('Synthetic superstar 10');
    const slot = useFirstSlot(winner);
    expect(slot).toBe(5);
    const winningBytes = bytes([{ slot }]);
    expect(saved()).toBe(winningBytes);
    const control = await mount();
    expect(control.result.current.squad[slot]).toEqual(first);
    control.unmount();

    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(oldOpen);
    expect(saved()).toBe(winningBytes);
    expect(writes).not.toHaveBeenCalled();
    expect(stale.getByRole('alert')).toHaveTextContent('This Mystery Box draft changed in another tab.');
    expect(stale.getByRole('button', { name: 'Reload saved draft' })).toBeEnabled();
    expect(oldOpen).toBeDisabled();
    expect(stale.queryByText(first!.name)).not.toBeInTheDocument();
    expect(recordCompletion).not.toHaveBeenCalled();

    const fresh = await mount();
    expect(fresh.result.current.packIndex).toBe(1);
    expect(fresh.result.current.squad[slot]).toEqual(first);
    expect(open(fresh)?.name).not.toBe(first!.name);
    expect(saved()).toBe(bytes([{ slot }], true));
  });

  it.each(['place', 'discard'] as const)('refuses stale %s on the final pack and reopens once without paying again', async action => {
    const winner = await mount();
    const decisions: Array<{ slot: number | null }> = [];
    for (let i = 0; i < 14; i++) {
      expect(open(winner)).not.toBeNull();
      if (i < 2) decisions.push({ slot: useFirstSlot(winner) });
      else {
        act(() => winner.result.current.discard());
        decisions.push({ slot: null });
      }
    }
    const last = open(winner);
    expect(last).not.toBeNull();
    const outdated = await mount();
    expect(saved()).toBe(bytes(decisions, true));
    expect(outdated.result.current.current).toEqual(last);
    expect(outdated.result.current.packIndex).toBe(14);
    expect(outdated.result.current.compatibleSlots).toHaveLength(1);

    const winnerSlot = winner.result.current.compatibleSlots[0];
    act(() => winner.result.current.discard());
    const final = bytes([...decisions, { slot: null }]);
    expect(saved()).toBe(final);
    expect(winner.result.current.finished).toBe(true);
    expect(winner.result.current.rating).toBe(51);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/mystery-box', 510, 'Fixture Manager', 2);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => action === 'place' ? outdated.result.current.place(winnerSlot) : outdated.result.current.discard());
    expect(saved()).toBe(final);
    expect(writes).not.toHaveBeenCalled();
    expect(outdated.result.current.staleDraft).toBe(true);
    expect(outdated.result.current.finished).toBe(false);
    expect(outdated.result.current.current).toEqual(last);
    expect(outdated.result.current.packIndex).toBe(14);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    const finalReload = await mount();
    expect(finalReload.result.current.finished).toBe(true);
    expect(finalReload.result.current.squad).toEqual(winner.result.current.squad);
    expect(finalReload.result.current.rating).toBe(winner.result.current.rating);
    expect(finalReload.result.current.shareText).toBe(winner.result.current.shareText);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('reads the old save shape and keeps the revealed pack and date-specific keys', async () => {
    localStorage.setItem(otherDay, bytes([{ slot: null }]));
    const raw = '{ "decisions": [ { "slot": 5 }, { "slot": null } ], "revealedCurrent": true }';
    localStorage.setItem(key, raw);
    const view = await mount();
    expect(view.result.current.packIndex).toBe(2);
    expect(view.result.current.filled).toBe(1);
    expect(view.result.current.current).not.toBeNull();
    expect(view.result.current.squad[5]?.name).toBe('Synthetic superstar 10');
    expect(saved()).toBe(raw);
    const slot = useFirstSlot(view);
    expect(view.result.current.current).toBeNull();
    expect(view.result.current.filled).toBe(2);
    expect(saved()).toBe(bytes([{ slot: 5 }, { slot: null }, { slot }]));
    expect(localStorage.getItem(otherDay)).toBe(bytes([{ slot: null }]));
  });

  it('bases restored-completion detection on the mounted draft while the pack pool loads', async () => {
    const decisions = Array.from({ length: 14 }, () => ({ slot: null }));
    localStorage.setItem(key, bytes(decisions, true));
    let resolvePool!: (pool: PackPlayer[]) => void;
    fixture.load = () => new Promise(resolve => { resolvePool = resolve; });
    const stale = renderHook(useMysteryBox);
    expect(stale.result.current.loading).toBe(true);
    const winner = bytes([...decisions, { slot: null }]);
    localStorage.setItem(key, winner);
    await act(async () => resolvePool(fixture.pool));
    expect(stale.result.current.loading).toBe(false);
    expect(stale.result.current.finished).toBe(false);
    expect(consumeRestoredFinish('mystery-box')).toBe(false);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(saved()).toBe(winner);
  });

  it.each([false, true])('keeps playing during storage refusal and saves recovered progress (read refusal %s)', async readRefused => {
    const view = await mount();
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    const denied = readRefused
      ? vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, name) {
        if (name === key) throw new DOMException('Unavailable', 'SecurityError');
        return getItem.call(this, name);
      })
      : vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
        if (name === key) throw new DOMException('Unavailable', 'QuotaExceededError');
        setItem.call(this, name, value);
      });
    expect(open(view)).not.toBeNull();
    const slot = useFirstSlot(view);
    expect(view.result.current.staleDraft).toBe(false);
    expect(view.result.current.filled).toBe(1);
    denied.mockRestore();
    expect(saved()).toBeNull();
    expect(open(view)).not.toBeNull();
    expect(saved()).toBe(bytes([{ slot }], true));
    expect(view.result.current.packIndex).toBe(1);
  });
});
