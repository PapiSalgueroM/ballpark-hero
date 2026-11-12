import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupKeysOf, BROKEN_SAVE_MARK } from '@/lib/brokenSaveRecovery';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { NRL_SAVE_SLOTS } from '@/lib/nrlSaveSlots';
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

const path = '/nrl-team-manager';
const firstKey = NRL_SAVE_KEY;
const secondKey = NRL_SAVE_SLOTS[1].saveKey;
const pointKey = (key: string) => 'dukb-nrl-checkpoint:' + key;
const raw = (key: string) => localStorage.getItem(key);
const bytes = JSON.stringify;
const put = (key: string, text: string) => localStorage.setItem(key, text);
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const slot = (number: number) => within(screen.getByRole('heading', { name: 'Slot ' + number }).parentElement!);
const slotClick = (number: number, name: string) => fireEvent.click(slot(number).getByRole('button', { name }));
const selectCheckpoint = (number = 1) => slotClick(number, 'Save checkpoint');
const startRestore = (number = 1) => slotClick(number, 'Restore checkpoint');
const confirmRestore = () => click('Restore saved checkpoint');

function open(view = '?view=saves') {
  return render(<MemoryRouter initialEntries={[path + view]}><NrlTeamManager /></MemoryRouter>);
}

function beforeGrandFinal(career: NrlCareerState) {
  while (career.season.round < 31) career = advance(career);
  expect(career.season.phase).toBe('finals');
  return career;
}

function finishDisplayed(view: ReturnType<typeof open>) {
  const next = view.container.querySelector<HTMLButtonElement>('[data-nrl-advance]');
  expect(next).toBeEnabled();
  fireEvent.click(next!);
  expect(button('Review this season')).toBeVisible();
}

beforeEach(() => {
  localStorage.clear();
  recordCompletion.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  NRL_SAVE_SLOTS.forEach(entry => saveFence.release(entry.saveKey));
});

describe('NRL career checkpoints', () => {
  it('copies original v1 bytes and restores a real live half in another slot', () => {
    const v1 = bytes(reduceNrlSeason(createNrlSeason('storm', 17), { type: 'advance' }));
    const live = reduceNrlCareer(createNrlCareer('bears', 19, 2027), { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    put(firstKey, v1);
    put(secondKey, bytes(live));
    put(fenceKeyOf(firstKey), '7');
    const view = open('?slot=2&view=saves');
    selectCheckpoint(1);
    selectCheckpoint(2);
    expect(raw(pointKey(firstKey))).toBe(v1);
    expect(raw(pointKey(secondKey))).toBe(bytes(live));
    expect(raw(firstKey)).toBe(v1);
    expect(raw(fenceKeyOf(firstKey))).toBe('7');
    expect(slot(2).getByText(/Checkpoint.*half time/)).toBeVisible();

    click('Resume slot 2');
    click('Play second half');
    const finished = raw(secondKey);
    expect(finished).not.toBe(bytes(live));
    click('Career saves');
    startRestore(2);
    expect(raw(secondKey)).toBe(finished);
    confirmRestore();
    expect(raw(secondKey)).toBe(bytes(live));
    expect(raw(firstKey)).toBe(v1);
    expect(raw(pointKey(firstKey))).toBe(v1);
    expect(backupKeysOf(NRL_SAVE_SLOTS[1], localStorage).some(key => raw(key) === finished)).toBe(true);
    click('Resume slot 2');
    expect(button('Play second half')).toBeEnabled();

    click('Career saves');
    click('Resume slot 1');
    const next = view.container.querySelector<HTMLButtonElement>('[data-nrl-advance]');
    expect(next).toBeEnabled();
    fireEvent.click(next!);
    expect(raw(firstKey)).not.toBe(v1);
    click('Career saves');
    startRestore(1);
    confirmRestore();
    expect(raw(firstKey)).toBe(v1);
    expect(raw(secondKey)).toBe(bytes(live));
  });

  it('requires confirmation to replace and refuses a changed checkpoint or active save', () => {
    const start = createNrlCareer('storm', 17);
    const first = bytes(start);
    const second = bytes(advance(start));
    const third = bytes(advance(advance(start)));
    put(firstKey, first);
    open();
    selectCheckpoint();
    put(firstKey, second);
    fireEvent.focus(window);
    slotClick(1, 'Replace checkpoint');
    expect(raw(pointKey(firstKey))).toBe(first);
    put(pointKey(firstKey), third);
    click('Replace saved checkpoint');
    expect(raw(pointKey(firstKey))).toBe(third);
    expect(raw(firstKey)).toBe(second);
    expect(screen.getByRole('status')).toHaveTextContent(/changed in another tab/);

    startRestore();
    put(firstKey, first);
    confirmRestore();
    expect(raw(firstKey)).toBe(first);
    expect(raw(pointKey(firstKey))).toBe(third);
    expect(backupKeysOf(NRL_SAVE_SLOTS[0], localStorage)).toHaveLength(0);
  });

  it('keeps current bytes and the checkpoint when recovery or active writes run out of room', () => {
    const start = beforeGrandFinal(createNrlCareer('storm', 4));
    const old = bytes(start);
    const current = bytes(advance(start));
    const replayKey = 'dukb-nrl-checkpoint-replay:' + firstKey;
    put(firstKey, current);
    put(pointKey(firstKey), old);
    open();
    const setItem = Storage.prototype.setItem;
    for (const rejects of [(key: string) => key.includes(BROKEN_SAVE_MARK), (key: string) => key === replayKey, (key: string) => key === firstKey]) {
      startRestore();
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
        if (rejects(key)) throw new DOMException('Quota full', 'QuotaExceededError');
        setItem.call(this, key, value);
      });
      confirmRestore();
      spy.mockRestore();
      expect(screen.getByRole('status')).toHaveTextContent(/could not restore/i);
      expect(raw(firstKey)).toBe(current);
      expect(raw(pointKey(firstKey))).toBe(old);
      expect(raw(replayKey)).toBeNull();
      expect(backupKeysOf(NRL_SAVE_SLOTS[0], localStorage)).toHaveLength(0);
    }
  });

  it('reports the recovery cap and never changes another slot or its write fence', () => {
    const old = createNrlCareer('storm', 4);
    const current = bytes(advance(old));
    put(firstKey, current);
    put(pointKey(firstKey), bytes(old));
    put(secondKey, bytes(createNrlCareer('bears', 2, 2027)));
    const other = raw(secondKey);
    const stale = createSaveFence(localStorage);
    stale.adopt(firstKey);
    for (let day = 1; day <= 3; day++) put(firstKey + BROKEN_SAVE_MARK + '2026-11-0' + day + 'T00-00-00', 'slot one ' + day);
    const otherBackup = secondKey + BROKEN_SAVE_MARK + '2026-11-01T00-00-00';
    put(otherBackup, 'slot two backup');
    open();
    startRestore();
    expect(slot(1).getByText(/three.*recovery copies|3.*recovery copies/i)).toBeVisible();
    confirmRestore();
    expect(raw(firstKey)).toBe(bytes(old));
    expect(raw(pointKey(firstKey))).toBe(bytes(old));
    const backups = backupKeysOf(NRL_SAVE_SLOTS[0], localStorage);
    expect(backups).toHaveLength(3);
    expect(backups.some(key => raw(key) === current)).toBe(true);
    expect(backups.some(key => raw(key) === 'slot one 1')).toBe(false);
    expect(raw(secondKey)).toBe(other);
    expect(raw(otherBackup)).toBe('slot two backup');
    expect(raw(fenceKeyOf(secondKey))).toBeNull();
    expect(stale.write(firstKey, () => true)).toBe('moved');
  });

  it('shows a damaged checkpoint or a checkpoint for a different career without restoring it', () => {
    const active = bytes(createNrlCareer('storm', 10));
    put(firstKey, active);
    put(pointKey(firstKey), '{"broken":true}');
    open();
    expect(slot(1).getByText('Unreadable checkpoint')).toBeVisible();
    expect(slot(1).queryByRole('button', { name: 'Restore checkpoint' })).not.toBeInTheDocument();
    put(pointKey(firstKey), bytes(createNrlCareer('storm', 11)));
    fireEvent.focus(window);
    expect(slot(1).getByText('Checkpoint belongs to another career.')).toBeVisible();
    expect(slot(1).queryByRole('button', { name: 'Restore checkpoint' })).not.toBeInTheDocument();
    expect(raw(firstKey)).toBe(active);
  });

  it('keeps the first credit, suppresses repeated restored finishes, and credits a new season or career', async () => {
    const initial = beforeGrandFinal(createNrlCareer('storm', 4));
    put(firstKey, bytes(initial));
    let view = open();
    selectCheckpoint();
    click('Resume slot 1');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(1));
    for (let attempt = 0; attempt < 2; attempt++) {
      click('Career saves');
      startRestore();
      confirmRestore();
      click('Resume slot 1');
      finishDisplayed(view);
      expect(recordCompletion).toHaveBeenCalledTimes(1);
    }
    const ended = readNrlCareerSave(raw(firstKey))!;
    expect(ended.season.phase).toBe('complete');
    const next = reduceNrlCareer(ended, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(next.season.clubId).toBe('bears');
    const nextFinal = beforeGrandFinal(next);
    view.unmount();
    put(firstKey, bytes(nextFinal));
    view = open('');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(2));

    view.unmount();
    view = open();
    startRestore();
    confirmRestore();
    click('Resume slot 1');
    finishDisplayed(view);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    view.unmount();
    put(firstKey, bytes(nextFinal));
    view = open('');
    finishDisplayed(view);
    expect(recordCompletion).toHaveBeenCalledTimes(2);

    view.unmount();
    const fresh = beforeGrandFinal(createNrlCareer('storm', 1));
    expect(fresh.season.seed).not.toBe(initial.season.seed);
    put(firstKey, bytes(fresh));
    view = open('');
    finishDisplayed(view);
    await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(3));
  });
});
