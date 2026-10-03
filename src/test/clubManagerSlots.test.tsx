/**
 * Round 928: the manager slots through the REAL hook, wired the way the page
 * wires it. Two managers are created, the page is left and come back to, and
 * both are there; a parked career opens on its hub; leaving the page in the
 * middle of a swap never writes the outgoing career over the incoming one
 * (Round 567's pagehide write reads careerRef, which the swap empties first).
 * scripts/simClubManagerSlots.mjs plays whole careers through the swap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { SAVE_KEY } from '@/lib/clubManager';
import { parkedKey, readSlots, activeSlot } from '@/lib/clubManagerSlots';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const { useClubManager } = await import('@/hooks/useClubManager');

/* eslint-disable @typescript-eslint/no-explicit-any */
let api: any = null;
function Harness() {
  api = useClubManager();
  return null;
}
const clubAt = (key: string): string | null => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw).clubName : null;
};

beforeEach(() => { localStorage.clear(); api = null; });

async function start(club: string) {
  await waitFor(() => expect(api.phase).toBe('clubSelect'));
  act(() => api.chooseClub(club));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
  expect(api.career.clubName).toBe(club);
}

describe('Club Manager: three manager slots', () => {
  it('two managers survive leaving the page, and either one opens', async () => {
    const first = render(<Harness />);
    await start('Everton');
    act(() => api.showSlots());
    expect(api.phase).toBe('resume');
    expect(api.slots.map((v: any) => v.summary?.clubName ?? null)).toEqual(['Everton', null, null]);

    act(() => api.newInSlot(2));
    expect(api.phase).toBe('clubSelect');
    expect(clubAt(parkedKey(1))).toBe('Everton');
    await start('Lincoln City');
    expect(clubAt(SAVE_KEY)).toBe('Lincoln City');

    /* Leave the page and come back. */
    first.unmount();
    expect(readSlots().map(v => v.summary?.clubName ?? null)).toEqual(['Everton', 'Lincoln City', null]);
    const again = render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume'));
    expect(api.slots.map((v: any) => v.summary?.clubName ?? null)).toEqual(['Everton', 'Lincoln City', null]);
    expect(api.slots[1].active).toBe(true);

    /* A parked career opens on its hub, through the boot. */
    act(() => api.openSlot(1));
    await waitFor(() => expect(api.phase).toBe('hub'));
    expect(api.career.clubName).toBe('Everton');
    expect(activeSlot()).toBe(1);
    expect(clubAt(parkedKey(2))).toBe('Lincoln City');
    again.unmount();
  });

  it('leaving in the middle of a swap never writes the outgoing career back', async () => {
    const r = render(<Harness />);
    await start('Everton');
    act(() => api.showSlots());
    act(() => api.newInSlot(2));
    await start('Lincoln City');
    act(() => api.showSlots());
    /* Continue on slot 1, and the page goes before anything else renders. */
    act(() => { api.openSlot(1); r.unmount(); });
    expect(clubAt(SAVE_KEY)).toBe('Everton');
    expect(clubAt(parkedKey(2))).toBe('Lincoln City');
    expect(activeSlot()).toBe(1);
  });

  it('delete takes one career and leaves the other', async () => {
    const r = render(<Harness />);
    await start('Everton');
    act(() => api.showSlots());
    act(() => api.newInSlot(3));
    await start('Lincoln City');
    act(() => api.showSlots());
    act(() => api.removeSlot(1));
    expect(api.slots.map((v: any) => v.summary?.clubName ?? null)).toEqual([null, null, 'Lincoln City']);
    expect(api.phase).toBe('resume');
    /* New manager never starts over a career. */
    act(() => api.newInSlot(3));
    expect(api.phase).toBe('resume');
    expect(clubAt(SAVE_KEY)).toBe('Lincoln City');
    act(() => api.removeSlot(3));
    expect(api.phase).toBe('clubSelect');
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    r.unmount();
  });
});
