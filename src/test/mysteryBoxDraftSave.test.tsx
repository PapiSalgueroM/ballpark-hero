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
const bytes = (decisions: Array<{ slot: number | null; replace?: true }>, revealedCurrent = false) => JSON.stringify({ decisions, revealedCurrent });
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
  fixture.day = '2026-11-15';
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

const firstSwapDay = '2026-11-21';
const previousDay = '2026-11-20';
const startingDecisions = Array.from({ length: 11 }, (_, slot) => ({ slot }));
const positions: PackPlayer['position'][] = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
const packNames = [...positions.map((position, slot) => `Starter ${position} ${slot + 1}`), 'Early CB', 'Level CB', 'Level GK', 'Late CB'];

function setSwapDeck(today = firstSwapDay) {
  // Pool order per tier produces the named packs in 1–15 order under the real daily draw.
  const buckets: Partial<Record<PackTier, number[]>> = today === firstSwapDay
    ? { superstar: [4], quality: [3, 6, 15, 12, 14, 1, 8, 11], squad: [13, 10, 9, 5], fringe: [7, 2] }
    : { superstar: [4], star: [5, 10], quality: [13], squad: [1, 11, 3, 2, 8, 14, 9], fringe: [12, 7, 6, 15] };
  fixture.day = today;
  fixture.pool = Object.entries(buckets).flatMap(([tier, packs]) => packs.map(pack => ({
    name: packNames[pack - 1], club: 'Fixture Club', nationality: 'Fixture Nation', league: 'Other',
    goals: 0, assists: 0, position: positions[pack - 1] ?? (pack === 14 ? 'GK' : 'CB'),
    kitNumber: 0, age: 22, marketValue: pack === 12 ? 26 : pack === 15 ? 230 : pack === 4 ? 5 : 4.3,
    difficulty: 'easy', tier: tier as PackTier,
  })));
  return `mystery-box-${today}`;
}

describe('Mystery Box Daily swap', () => {
  it.each([
    { choice: 'bin', score: 700, replacement: null, starter: 'Starter CB 3' },
    { choice: 'early', score: 710, replacement: 12, starter: 'Early CB' },
    { choice: 'late', score: 720, replacement: 15, starter: 'Late CB' },
  ])('keeps the same 15 reveals and settles $score points when the choice is $choice', async ({ choice, score, replacement, starter }) => {
    const swapKey = setSwapDeck();
    let view = await mount();
    const revealed = [];
    const finalDecisions = [...startingDecisions] as Array<{ slot: number | null; replace?: true }>;
    for (let pack = 1; pack <= 15; pack++) {
      revealed.push(open(view)?.name);
      if (pack <= 11) {
        expect(view.result.current.compatibleSlots).toContain(pack - 1);
        act(() => view.result.current.place(pack - 1));
      } else if (pack === replacement) {
        expect(view.result.current.swapSlots).toEqual([1, 2, 3, 4]);
        const { swap, discard } = view.result.current;
        act(() => {
          swap(2);
          swap(3);
          discard();
        });
        finalDecisions.push({ slot: 2, replace: true });
        if (pack === 12) {
          view.unmount();
          view = await mount();
          expect(view.result.current.packIndex).toBe(12);
          expect(view.result.current.squad[2]?.name).toBe('Early CB');
        }
      } else {
        expect(view.result.current.swapSlots).toEqual(
          pack === 12 || (pack === 15 && choice === 'bin') ? [1, 2, 3, 4] : [],
        );
        act(() => view.result.current.discard());
        finalDecisions.push({ slot: null });
      }
    }
    expect(revealed).toEqual(packNames);
    expect(view.result.current.finished).toBe(true);
    expect(view.result.current.filled).toBe(11);
    expect(view.result.current.squad[2]?.name).toBe(starter);
    expect(view.result.current.rating).toBe(score / 10);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/mystery-box', score, 'Fixture Manager', 11);
    expect(localStorage.getItem(swapKey)).toBe(bytes(finalDecisions));

    const settled = await mount();
    expect(settled.result.current.squad).toEqual(view.result.current.squad);
    expect(settled.result.current.shareText).toBe(view.result.current.shareText);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps a valid empty slot available and rejects a direct incompatible swap request', async () => {
    const swapKey = setSwapDeck();
    const decisions = startingDecisions.map(({ slot }) => ({ slot: slot === 4 ? null : slot }));
    const raw = bytes(decisions, true);
    localStorage.setItem(swapKey, raw);
    const view = await mount();
    expect(view.result.current.current?.name).toBe('Early CB');
    expect(view.result.current.compatibleSlots).toEqual([4]);
    expect(view.result.current.swapSlots).toEqual([]);
    act(() => view.result.current.swap(2));
    expect(localStorage.getItem(swapKey)).toBe(raw);
    act(() => view.result.current.place(4));
    expect(view.result.current.squad[4]?.name).toBe('Early CB');
    expect(localStorage.getItem(swapKey)).toBe(bytes([...decisions, { slot: 4 }]));
    const blocked = bytes(startingDecisions, true);
    view.unmount();
    localStorage.setItem(swapKey, blocked);
    const full = await mount();
    expect(full.result.current.swapSlots).toEqual([1, 2, 3, 4]);
    act(() => full.result.current.swap(9));
    expect(localStorage.getItem(swapKey)).toBe(blocked);
  });

  it('holds a refused final swap on the board and saves the same upgrade on retry', async () => {
    const swapKey = setSwapDeck();
    const decisions = [...startingDecisions, { slot: null }, { slot: null }, { slot: null }];
    const raw = bytes(decisions, true);
    localStorage.setItem(swapKey, raw);
    const board = within(render(<MemoryRouter><MysteryBoxBoard /></MemoryRouter>).container);
    const swap = await board.findByRole('button', { name: /Swap in.*Starter CB 3.*\+22 OVR/ });
    const setItem = Storage.prototype.setItem;
    const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name === swapKey) throw new DOMException('Unavailable', 'QuotaExceededError');
      setItem.call(this, name, value);
    });
    fireEvent.click(swap);
    expect(localStorage.getItem(swapKey)).toBe(raw);
    expect(board.getByRole('alert')).toHaveTextContent('The swap could not be saved. Try again.');
    expect(swap).toBeEnabled();
    expect(board.queryByText('Final squad')).not.toBeInTheDocument();
    expect(recordCompletion).not.toHaveBeenCalled();
    refused.mockRestore();

    fireEvent.click(swap);
    expect(board.getByText('Final squad')).toBeInTheDocument();
    expect(localStorage.getItem(swapKey)).toBe(bytes([...decisions, { slot: 2, replace: true }]));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/mystery-box', 720, 'Fixture Manager', 11);
  });

  it('blocks a stale swap after another board finishes and only reopens the winning lineup', async () => {
    const swapKey = setSwapDeck();
    const decisions = [...startingDecisions, { slot: null }, { slot: null }, { slot: null }];
    localStorage.setItem(swapKey, bytes(decisions, true));
    const winner = await mount();
    const old = within(render(<MemoryRouter><MysteryBoxBoard /></MemoryRouter>).container);
    const oldSwap = await old.findByRole('button', { name: /Swap in.*Starter CB 3.*\+22 OVR/ });
    act(() => winner.result.current.discard());
    const final = bytes([...decisions, { slot: null }]);
    const writes = vi.spyOn(Storage.prototype, 'setItem');

    fireEvent.click(oldSwap);
    expect(localStorage.getItem(swapKey)).toBe(final);
    expect(writes).not.toHaveBeenCalled();
    expect(old.getByRole('button', { name: 'Reload saved draft' })).toBeEnabled();
    expect(oldSwap).toBeDisabled();
    expect(old.queryByText('Final squad')).not.toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/mystery-box', 700, 'Fixture Manager', 11);

    const settled = await mount();
    expect(settled.result.current.finished).toBe(true);
    expect(settled.result.current.squad[2]?.name).toBe('Starter CB 3');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('replays the previous Eastern board with the original bytes and score', async () => {
    const oldKey = setSwapDeck(previousDay);
    const decisions = [...startingDecisions, { slot: null }, { slot: null }, { slot: null }];
    const raw = bytes(decisions, true);
    localStorage.setItem(oldKey, raw);
    const view = await mount();
    expect(view.result.current.current?.name).toBe('Late CB');
    expect(view.result.current.swapSlots).toEqual([]);
    expect(view.result.current.compatibleSlots).toEqual([]);
    act(() => view.result.current.swap(2));
    expect(localStorage.getItem(oldKey)).toBe(raw);
    act(() => view.result.current.discard());
    const final = bytes([...decisions, { slot: null }]);
    expect(localStorage.getItem(oldKey)).toBe(final);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/mystery-box', 700, 'Fixture Manager', 11);
    const settled = await mount();
    expect(localStorage.getItem(oldKey)).toBe(final);
    expect(settled.result.current.squad[2]?.name).toBe('Starter CB 3');
    expect(settled.result.current.rating).toBe(70);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
