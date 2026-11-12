import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARM_MS } from '@/components/club-manager/RetireDoor';
import { describeSave } from '@/data/continueSaves';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { NRL_SAVE_ENTRY, NRL_SAVE_SLOTS, nrlCheckpointKey } from '@/lib/nrlSaveSlots';
import { createSaveFence, fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

const { recordCompletion } = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion, getCurrentPlayerName: () => 'Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const first = NRL_SAVE_KEY;
const second = NRL_SAVE_SLOTS[1].saveKey;
const raw = (key = first) => localStorage.getItem(key);
const put = (key: string, value: string) => localStorage.setItem(key, value);
const bytes = JSON.stringify;
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const retire = (career: NrlCareerState) => reduceNrlCareer(career, {
  type: 'retireCareer', year: career.season.year, clubId: career.season.clubId,
});

function beforeFinal(career: NrlCareerState) {
  for (let tick = 0; tick < 40 && career.season.round < 31; tick++) career = advance(career);
  expect(career.season.phase).toBe('finals');
  return career;
}

function open(query = '') {
  return render(<MemoryRouter initialEntries={['/nrl-team-manager' + query]}><NrlTeamManager /></MemoryRouter>);
}

function arm() {
  act(() => vi.advanceTimersByTime(ARM_MS));
}

function confirmRetirement() {
  click('Retire from management');
  arm();
  click('Yes, retire');
}

beforeEach(() => {
  localStorage.clear();
  recordCompletion.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  NRL_SAVE_SLOTS.forEach(entry => saveFence.release(entry.saveKey));
});

describe('NRL voluntary manager retirement', () => {
  it('adds only the terminal flag to a completed career and rejects further mutations', () => {
    const start = createNrlCareer('storm', 4);
    const completed = advance(beforeFinal(start));
    const original = bytes(completed);
    expect(readNrlCareerSave(original)).toEqual(completed);
    expect(original).not.toContain('"retired"');

    const retired = retire(completed);
    expect(retired).toEqual({ ...completed, retired: true });
    expect(retired.season).toBe(completed.season);
    expect(retired.history).toBe(completed.history);
    expect(retired.finance).toBe(completed.finance);
    expect(bytes(readNrlCareerSave(bytes(retired)))).toBe(bytes(retired));
    expect(retire(retired)).toBe(retired);
    expect(advance(retired)).toBe(retired);
    expect(reduceNrlCareer(retired, { type: 'startNextSeason' })).toBe(retired);
    expect(reduceNrlCareer(retired, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } })).toBe(retired);
    expect(reduceNrlCareer(retired, { type: 'setDevelopmentFocus', focus: 'youth' })).toBe(retired);
    expect(reduceNrlCareer(completed, { type: 'startNextSeason' }).season.year).toBe(2027);
  });

  it('rejects regular/live, unfinished forged retirement, and stale season or club identity', () => {
    const start = createNrlCareer('storm', 4);
    const live = reduceNrlCareer(start, { type: 'startLive' });
    const completed = advance(beforeFinal(start));
    expect(live.season.live).toBeDefined();
    expect(retire(start)).toBe(start);
    expect(retire(live)).toBe(live);
    expect(readNrlCareerSave(bytes({ ...start, retired: true }))).toBeNull();
    expect(readNrlCareerSave(bytes({ ...completed, retired: false }))).toBeNull();
    expect(reduceNrlCareer(completed, { type: 'retireCareer', year: 2027, clubId: 'storm' })).toBe(completed);
    expect(reduceNrlCareer(completed, { type: 'retireCareer', year: 2026, clubId: 'titans' })).toBe(completed);

    put(first, bytes(start));
    open();
    click('Club office');
    click('Season review');
    expect(screen.queryByRole('button', { name: 'Retire from management' })).not.toBeInTheDocument();
  });

  it('guards rapid confirmation, cancels safely, and reopens the exact retired record', () => {
    const completed = advance(beforeFinal(createNrlCareer('storm', 4)));
    const original = bytes(completed);
    put(first, original);
    const view = open();
    click('Review this season');
    expect(raw()).toBe(original);
    click('Retire from management');
    expect(button('Keep managing')).toHaveFocus();
    const confirm = button('Yes, retire');
    fireEvent.pointerDown(confirm);
    arm();
    fireEvent.click(confirm);
    expect(raw()).toBe(original);
    fireEvent.keyDown(button('Keep managing'), { key: 'Escape' });
    expect(button('Retire from management')).toHaveFocus();
    expect(raw()).toBe(original);

    confirmRetirement();
    const retired = bytes(retire(completed));
    expect(raw()).toBe(retired);
    expect(screen.getByText('Retired after the 2026 season.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Start 2027' })).not.toBeInTheDocument();
    expect(screen.queryByText('Change clubs for 2027')).not.toBeInTheDocument();
    expect(describeSave(NRL_SAVE_ENTRY, retired)).toBe('retired');
    expect(recordCompletion).not.toHaveBeenCalled();

    view.unmount();
    open();
    expect(screen.getByRole('heading', { name: 'Season review' })).toBeVisible();
    fireEvent.click(screen.getByText('Career record', { exact: true }));
    expect(screen.getByText('Completed seasons')).toBeVisible();
    click('Ladder');
    expect(screen.getByRole('table')).toBeVisible();
    click('Career saves');
    expect(screen.getByText(/2026 season · Retired/)).toBeVisible();
    click('Save checkpoint');
    expect(screen.getByText(/Checkpoint.*Retired/)).toBeVisible();
    expect(raw(nrlCheckpointKey(first))).toBe(retired);
    click('View slot 1');
    expect(screen.getByRole('heading', { name: 'Season review' })).toBeVisible();
    expect(raw()).toBe(retired);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps a completed v1 save exact until retirement is explicitly confirmed', () => {
    let legacy = createNrlSeason('storm', 4);
    for (let tick = 0; tick < 40 && legacy.phase !== 'complete'; tick++) legacy = reduceNrlSeason(legacy, { type: 'advance' });
    expect(legacy.phase).toBe('complete');
    const original = bytes(legacy);
    put(first, original);
    put(fenceKeyOf(first), '3');
    open();
    click('Review this season');
    click('Retire from management');
    click('Keep managing');
    expect(raw()).toBe(original);
    expect(raw(fenceKeyOf(first))).toBe('3');

    confirmRetirement();
    const retired = readNrlCareerSave(raw())!;
    expect(retired.retired).toBe(true);
    expect(retired.legacySeason).toBe(true);
    expect(retired.season.results).toEqual(legacy.results);
    expect(retired.history).toEqual(readNrlCareerSave(original)!.history);
  });

  it('rejects a stale confirmation and retries a quota refusal only in its own slot', () => {
    const other = bytes(createNrlCareer('storm', 3));
    const completed = advance(beforeFinal(createNrlCareer('bears', 4, 2027)));
    const original = bytes(completed);
    put(first, other);
    put(second, original);
    const view = open('?slot=2');
    click('Review this season');
    click('Retire from management');
    arm();
    const newer = bytes(reduceNrlCareer(completed, { type: 'startNextSeason' }));
    put(second, newer);
    click('Yes, retire');
    expect(raw(second)).toBe(newer);
    expect(button('Reload your season')).toBeVisible();
    expect(raw()).toBe(other);

    view.unmount();
    put(second, original);
    open('?slot=2');
    click('Review this season');
    const setItem = Storage.prototype.setItem;
    const full = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === second) throw new DOMException('Quota full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    confirmRetirement();
    expect(raw(second)).toBe(original);
    expect(button('Retry save')).toBeVisible();
    full.mockRestore();
    click('Retry save');
    expect(raw(second)).toBe(bytes(retire(completed)));
    expect(raw()).toBe(other);
  });

  it('can restore an earlier checkpoint and replay the finished season without another credit', () => {
    const pending = beforeFinal(createNrlCareer('storm', 4));
    put(first, bytes(pending));
    const view = open();
    put(nrlCheckpointKey(first), bytes(pending));
    fireEvent.click(view.container.querySelector('[data-nrl-advance]')!);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    click('Review this season');
    confirmRetirement();
    expect(readNrlCareerSave(raw())?.retired).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    const stale = createSaveFence(localStorage);
    stale.adopt(first);
    click('Career saves');
    click('Restore checkpoint');
    click('Restore saved checkpoint');
    expect(raw()).toBe(bytes(pending));
    expect(stale.write(first, () => true)).toBe('moved');
    click('Resume slot 1');
    fireEvent.click(view.container.querySelector('[data-nrl-advance]')!);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(readNrlCareerSave(raw())?.retired).toBeUndefined();
    expect(button('Review this season')).toBeVisible();
  });
});
