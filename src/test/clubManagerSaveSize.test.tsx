/**
 * Round 634: the Club Manager hook writes when the page goes, and it says so
 * when the write is refused.
 *
 * The first live report of 2026-09-13 ("Manager career doesnt save if you
 * leave the website") has two honest causes on a phone: the page going away
 * without beforeunload (which iOS does not reliably fire, so the hook listens
 * to pagehide and to the tab going hidden instead), and a browser refusing
 * the write outright (the origin's storage spent, or blocked in a private
 * window), which saveCareer used to swallow without a word.
 *
 * This file renders the REAL hook, wired as src/pages/ClubManager.tsx wires
 * it, and measures both: the disk after a pagehide with nothing else able to
 * write, the disk after the tab goes hidden, the bytes of two writes of one
 * career, and the saveFailed flag under a store that throws and after one
 * that works again.
 *
 * scripts/simClubManagerSaveSize.mjs runs this file and carries the negative
 * control: CM_HOOK points it at a copy of the hook with the pagehide listener
 * removed, and the pagehide test must go red while the others stay green.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const hookPath = process.env.CM_HOOK;
const { useClubManager } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useClubManager');

const KEY = 'dukb-club-manager-save';
const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];
/* eslint-disable @typescript-eslint/no-explicit-any */

let api: any = null;

function Harness() {
  const g = useClubManager();
  api = g;
  return <div data-testid="cm-harness" data-save-failed={g.saveFailed ? '1' : '0'} />;
}

const disk = (): string | null => localStorage.getItem(KEY);
const realSetItem = Storage.prototype.setItem;

beforeEach(() => { localStorage.clear(); api = null; });
afterEach(() => { Storage.prototype.setItem = realSetItem; });

async function booted(club = CLUB) {
  const r = render(<Harness />);
  await act(async () => {});
  expect(api.phase).toBe('clubSelect');
  act(() => api.chooseClub(club));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
  return r;
}

describe('Club Manager: the write when the page goes', () => {
  it('pagehide writes the career held in memory, with nothing else able to', async () => {
    const r = await booted();
    act(() => api.setMentality('attacking'));
    const mem = JSON.stringify(api.career);
    expect(disk()).toBe(mem);
    /* The effect has already written and will not run again without a state
       change, so from here only the pagehide listener can put it back. */
    localStorage.removeItem(KEY);
    expect(disk()).toBeNull();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    console.log(`  after pagehide the disk holds ${disk()?.length ?? 0} bytes, memory ${mem.length}`);
    expect(disk()).toBe(mem);
    r.unmount();
  }, 120000);

  it('the tab going hidden writes it too', async () => {
    const r = await booted();
    act(() => api.setMentality('defensive'));
    const mem = JSON.stringify(api.career);
    localStorage.removeItem(KEY);
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    } finally {
      if (desc) Object.defineProperty(document, 'visibilityState', desc);
      else delete (document as any).visibilityState;
    }
    console.log(`  after the tab went hidden the disk holds ${disk()?.length ?? 0} bytes, memory ${mem.length}`);
    expect(disk()).toBe(mem);
    r.unmount();
  }, 120000);

  it('two writes of one career are the same bytes', async () => {
    const r = await booted();
    act(() => api.setMentality('attacking'));
    const first = disk();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    const second = disk();
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    const third = disk();
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(third).toBe(first);
    console.log(`  three writes, ${first?.length} bytes each, identical`);
    r.unmount();
  }, 120000);
});

describe('Club Manager: a refused write is said out loud', () => {
  it('saveFailed goes up when the store throws and comes down when a write lands', async () => {
    const r = await booted();
    expect(api.saveFailed).toBe(false);
    expect(r.container.querySelector('[data-save-failed="1"]')).toBeNull();
    Storage.prototype.setItem = function () { throw new Error('QuotaExceededError (stubbed)'); };
    act(() => api.setMentality('attacking'));
    console.log(`  with a throwing store, saveFailed is ${api.saveFailed}`);
    expect(api.saveFailed).toBe(true);
    expect(r.container.querySelector('[data-save-failed="1"]')).not.toBeNull();
    /* And it is not stuck: the next successful write clears it. */
    Storage.prototype.setItem = realSetItem;
    act(() => api.setMentality('balanced'));
    console.log(`  with the store back, saveFailed is ${api.saveFailed} and the disk matches memory: ${disk() === JSON.stringify(api.career)}`);
    expect(api.saveFailed).toBe(false);
    expect(disk()).toBe(JSON.stringify(api.career));
    r.unmount();
  }, 120000);

  it('a pagehide under a throwing store reports too, and never throws out of the listener', async () => {
    const r = await booted();
    Storage.prototype.setItem = function () { throw new Error('QuotaExceededError (stubbed)'); };
    expect(() => { act(() => { window.dispatchEvent(new Event('pagehide')); }); }).not.toThrow();
    expect(api.saveFailed).toBe(true);
    r.unmount();
  }, 120000);
});
