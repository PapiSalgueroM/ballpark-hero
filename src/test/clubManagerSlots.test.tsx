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

  it('the screen asks before it deletes, and every tile says what it holds', async () => {
    const { default: ManagerSlotsScreen } = await import('@/components/club-manager/ManagerSlotsScreen');
    const onDelete = vi.fn(), onContinue = vi.fn(), onNew = vi.fn();
    const summary = { managerName: null, clubName: 'Everton', season: 4, worldSeason: '2029-30', trophies: 2, eraId: 'now', eraLabel: '2026-27', historic: false, sacked: false };
    const slots = [
      { slot: 1, active: true, summary, damaged: false },
      { slot: 2, active: false, summary: null, damaged: false },
      { slot: 3, active: false, summary: null, damaged: true },
    ];
    const r = render(<ManagerSlotsScreen slots={slots} onContinue={onContinue} onNew={onNew} onDelete={onDelete} />);
    const tile = (n: number) => r.getByTestId(`cm-slot-${n}`);
    expect(tile(1).textContent).toContain('Everton');
    expect(tile(1).textContent).toContain('2 trophies');
    expect(tile(2).textContent).toContain('Empty slot');
    expect(tile(3).textContent).toContain('could not be read');
    act(() => { r.getByRole('button', { name: 'Delete' }).click(); });
    expect(onDelete).not.toHaveBeenCalled();
    expect(tile(1).textContent).toContain('for good');
    act(() => { r.getByRole('button', { name: 'Keep' }).click(); });
    expect(onDelete).not.toHaveBeenCalled();
    act(() => { r.getByRole('button', { name: 'Delete' }).click(); });
    act(() => { r.getAllByRole('button', { name: 'Delete' })[0].click(); });
    expect(onDelete).toHaveBeenCalledWith(1);
    act(() => { r.getByRole('button', { name: 'New manager' }).click(); });
    expect(onNew).toHaveBeenCalledWith(2);
    /* Review: clearing an unreadable save asks first too. */
    onNew.mockClear();
    act(() => { r.getByRole('button', { name: 'Clear it, new manager' }).click(); });
    expect(onNew).not.toHaveBeenCalled();
    expect(tile(3).textContent).toContain('no undo');
    act(() => { r.getByRole('button', { name: 'Clear it' }).click(); });
    expect(onNew).toHaveBeenCalledWith(3);
    r.unmount();
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

/* Round 928 review: two tabs on one store. Tab A holds Everton (slot 1);
   tab B switches to Lincoln City (slot 2), which moves Lincoln to SAVE_KEY
   and drops its parked copy. Before the fix, A's next write (closing it, or
   any change) put Everton over Lincoln, and Lincoln was gone for good. */
let tabA: any = null;
let tabB: any = null;
function TabA() { tabA = useClubManager(); return null; }
function TabB() { tabB = useClubManager(); return null; }
const names = () => readSlots().map(v => v.summary?.clubName ?? null);

async function twoCareersOnSlotOne(beforeB?: () => void) {
  const a = render(<TabA />);
  await waitFor(() => expect(tabA.phase).toBe('clubSelect'));
  act(() => tabA.chooseClub('Everton'));
  act(() => tabA.confirmClub());
  act(() => tabA.showSlots());
  act(() => tabA.newInSlot(2));
  act(() => tabA.chooseClub('Lincoln City'));
  act(() => tabA.confirmClub());
  act(() => tabA.showSlots());
  act(() => tabA.openSlot(1));
  await waitFor(() => expect(tabA.phase).toBe('hub'));
  expect(tabA.career.clubName).toBe('Everton');
  expect(activeSlot()).toBe(1);
  expect(names()).toEqual(['Everton', 'Lincoln City', null]);
  beforeB?.();
  const b = render(<TabB />);
  await waitFor(() => expect(tabB.phase).toBe('resume'));
  act(() => tabB.openSlot(2));
  await waitFor(() => expect(tabB.phase).toBe('hub'));
  expect(tabB.career.clubName).toBe('Lincoln City');
  expect(activeSlot()).toBe(2);
  expect(clubAt(SAVE_KEY)).toBe('Lincoln City');
  expect(clubAt(parkedKey(1))).toBe('Everton');
  return { a, b };
}

describe('Club Manager slots: two tabs on one device', () => {
  beforeEach(() => { tabA = null; tabB = null; });

  it('closing the old tab after a switch in another never wipes the career switched in', async () => {
    const { a, b } = await twoCareersOnSlotOne();
    b.unmount();
    a.unmount();
    expect(clubAt(SAVE_KEY)).toBe('Lincoln City');
    expect(names()).toEqual(['Everton', 'Lincoln City', null]);
  });

  it('a change in the old tab writes nothing over the other career and goes back to the managers', async () => {
    const { a, b } = await twoCareersOnSlotOne();
    act(() => tabA.setMentality('attacking'));
    await waitFor(() => expect(tabA.phase).toBe('resume'));
    expect(tabA.slotNote).toContain('another tab');
    expect(clubAt(SAVE_KEY)).toBe('Lincoln City');
    /* The old tab can still open Everton, which parks Lincoln where it belongs. */
    act(() => tabA.openSlot(1));
    await waitFor(() => expect(tabA.phase).toBe('hub'));
    expect(tabA.career.clubName).toBe('Everton');
    expect(clubAt(parkedKey(2))).toBe('Lincoln City');
    a.unmount();
    b.unmount();
    expect(names()).toEqual(['Everton', 'Lincoln City', null]);
  });

  /* Second review: the live match viewer marks the clock at half time, when
     the tab is hidden and at pagehide, and markMinute wrote straight to
     SAVE_KEY. A match left on screen in the old tab put Everton over Lincoln. */
  it('the old tab live clock writes nothing over the career switched in', async () => {
    let m0 = 0;
    const { a, b } = await twoCareersOnSlotOne(() => {
      let guard = 0;
      while (tabA.phase !== 'halftime' && guard++ < 20) act(() => tabA.play());
      expect(tabA.career.live).toBeTruthy();
      m0 = tabA.career.live.minute ?? 0;
    });
    b.unmount();
    act(() => tabA.markMinute(m0 + 10));
    expect(clubAt(SAVE_KEY)).toBe('Lincoln City');
    expect(names()).toEqual(['Everton', 'Lincoln City', null]);
    a.unmount();
    expect(names()).toEqual(['Everton', 'Lincoln City', null]);
  }, 60000);

  it('Managers tapped on the old tab hub writes nothing over the other career', async () => {
    const { a, b } = await twoCareersOnSlotOne();
    b.unmount();
    act(() => tabA.showSlots());
    expect(tabA.phase).toBe('resume');
    /* The old career is let go, so its week is not shown on Lincoln's tile. */
    expect(tabA.career).toBeNull();
    a.unmount();
    expect(names()).toEqual(['Everton', 'Lincoln City', null]);
  });

  it('a new manager from the old tab managers screen parks the other career where it belongs', async () => {
    const { a, b } = await twoCareersOnSlotOne(() => {
      act(() => tabA.showSlots());
      expect(tabA.phase).toBe('resume');
    });
    b.unmount();
    act(() => tabA.newInSlot(3));
    expect(tabA.phase).toBe('clubSelect');
    expect(clubAt(parkedKey(2))).toBe('Lincoln City');
    a.unmount();
    expect(names()).toEqual(['Everton', 'Lincoln City', null]);
  });

  it('the old tab managers screen follows the other tab, and a stale New manager says why it did nothing', async () => {
    const { a, b } = await twoCareersOnSlotOne(() => { act(() => tabA.showSlots()); });
    b.unmount();
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY })); });
    expect(tabA.slots.map((v: any) => v.active)).toEqual([false, true, false]);
    expect(tabA.career).toBeNull();
    /* A tile drawn before the other tab filled slot 3 (simulated by filling it
       under the screen) gets a note, never a silent dead button. */
    localStorage.setItem(parkedKey(3), localStorage.getItem(parkedKey(1)) as string);
    act(() => tabA.newInSlot(3));
    expect(tabA.phase).toBe('resume');
    expect(tabA.slotNote).toContain('holds a career now');
    a.unmount();
  });
});

describe('Club Manager slots: Retire and Start New Career keep the career', () => {
  it('parks the career and starts the new one in an empty slot, and with every slot full deletes nothing', async () => {
    const r = render(<Harness />);
    await start('Everton');
    act(() => api.startNew());
    expect(api.phase).toBe('clubSelect');
    expect(clubAt(parkedKey(1))).toBe('Everton');
    await start('Lincoln City');
    act(() => api.startNew());
    await start('Millwall');
    expect(names()).toEqual(['Everton', 'Lincoln City', 'Millwall']);
    act(() => api.startNew());
    expect(api.phase).toBe('resume');
    expect(api.slotNote).toContain('All three slots');
    expect(names()).toEqual(['Everton', 'Lincoln City', 'Millwall']);
    r.unmount();
  });
});

/* Round 928 review: opening a parked era slot must wait for that era's
   squads. The squads are taken away again after the save is made, so the
   hook has to fetch them itself; a slot that loads straight from SAVE_KEY
   without them never reaches its hub. */
describe('Club Manager slots: a parked era career', () => {
  it('opens through the era boot, squads first', async () => {
    const eras = await import('@/lib/clubManagerEras');
    const { startCareer, trimCareer, leanCareer } = await import('@/lib/clubManager');
    await eras.ensureEraRosters('era2010');
    const barca = startCareer('Barcelona', 'era2010');
    localStorage.setItem(SAVE_KEY, JSON.stringify(trimCareer(startCareer('Everton'))));
    localStorage.setItem(parkedKey(2), JSON.stringify(leanCareer(barca)));
    delete eras.HISTORIC_ROSTERS.era2010;
    delete eras.HISTORIC_PARTIAL.era2010;
    expect(eras.eraRostersLoaded('era2010')).toBe(false);

    const r = render(<Harness />);
    await waitFor(() => expect(api.phase).toBe('resume'));
    expect(api.slots[1].summary?.eraId).toBe('era2010');
    act(() => api.openSlot(2));
    await waitFor(() => expect(api.phase).toBe('hub'), { timeout: 15000 });
    expect(api.career.clubName).toBe('Barcelona');
    expect(api.career.eraId).toBe('era2010');
    expect(eras.eraRostersLoaded('era2010')).toBe(true);
    expect(activeSlot()).toBe(2);
    expect(clubAt(parkedKey(1))).toBe('Everton');
    r.unmount();
  }, 30000);
});
