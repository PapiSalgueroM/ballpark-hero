import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { loadNflCareerKit } from '@/components/front-office/nflCareerKitLoad';
import { hasPendingSaves, settlePendingSaves } from '@/lib/safeStorage';
import { keyedRng } from '@/lib/keyedRng';
import raw from '../../../scripts/data/nflLegacyRecapFixture.json?raw';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const saveKey = 'front-office-save-v1';
const peerKey = 'nhl-front-office-save-v1';
const peer = '{ "league": { "round": 5 } }';
const rawSave = () => localStorage.getItem(saveKey);
const read = () => JSON.parse(rawSave()!);
const backupOf = (key: string) => key.startsWith(saveKey + '.broken-');
const backups = () => Object.keys(localStorage).filter(backupOf);
const retry = () => fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
const quota = () => new DOMException('fixture quota', 'QuotaExceededError');

// Exact bytes from the c6c52061 writer. Seattle completed all 17 weeks at
// seed 431. Its recap holds the counted season with no postseason block.
const recap = JSON.parse(raw);

function plant() {
  localStorage.setItem(saveKey, raw);
  localStorage.setItem(peerKey, peer);
  return vi.spyOn(Math, 'random').mockImplementation(keyedRng('NFL legacy recap draft'));
}

function expectDraft() {
  const next = read();
  expect(next).toMatchObject({
    phase: 'draft', myTeam: 'SEA', titles: recap.titles, seasonsPlayed: recap.seasonsPlayed,
    trust: recap.trust, picksLeft: recap.league.teams.SEA.picks.length,
  });
  expect(next.league.season).toBe(2026);
  expect(next.league.week).toBe(17);
  expect(next.league.schedule).toEqual(recap.league.schedule);
  expect(next.league.teams.SEA).toEqual(recap.league.teams.SEA);
  expect(next.league.champions).toEqual(recap.league.champions);
  expect(next.draftClass.length).toBeGreaterThanOrEqual(40);
  expect(screen.getByText('The 2027 Draft')).toBeVisible();
  expect(localStorage.getItem(peerKey)).toBe(peer);
}

beforeAll(async () => { await loadNflCareerKit(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('NFL Front Office recap recovery', () => {
  it('keeps the exact historical recap before acknowledging the draft', () => {
    plant();
    expect(recap).toMatchObject({ phase: 'recap', myTeam: 'SEA', seasonsPlayed: 1, trust: 44 });
    expect(recap).not.toHaveProperty('postseason');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<FrontOfficeBoard />);
    expect(backups()).toHaveLength(1);
    const [backup] = backups();
    expect(localStorage.getItem(backup) === raw).toBe(true);
    expect(writes.mock.calls.findIndex(([key]) => key === backup)).toBeLessThan(
      writes.mock.calls.findIndex(([key]) => key === saveKey),
    );
    expectDraft();
    cleanup();
    const installed = rawSave();
    const before = writes.mock.calls.length;
    render(<FrontOfficeBoard />);
    expect(rawSave() === installed).toBe(true);
    expect(writes.mock.calls).toHaveLength(before);
    expectDraft();
  });

  it.each(['backup quota', 'backup readback', 'draft quota'] as const)(
    'keeps the exact source through %s and retries without drawing again', failure => {
      const random = plant();
      const set = Storage.prototype.setItem;
      const get = Storage.prototype.getItem;
      const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
        if ((failure === 'backup quota' && backupOf(key)) || (failure === 'draft quota' && key === saveKey)) throw quota();
        set.call(this, key, value);
      });
      const suspect = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
        const value = get.call(this, key);
        return failure === 'backup readback' && backupOf(key) && value !== null ? 'wrong backup bytes' : value;
      });
      render(<FrontOfficeBoard />);
      const beforeRetryDraws = random.mock.calls.length;
      const kept = backups();
      expect(beforeRetryDraws).toBeGreaterThan(0);
      expect(rawSave() === raw).toBe(true);
      expect(localStorage.getItem(peerKey)).toBe(peer);
      expect(screen.queryByText('The 2027 Draft')).toBeNull();
      expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
      expect(hasPendingSaves()).toBe(true);
      act(() => expect(settlePendingSaves()).toBe(false));
      refused.mockRestore();
      suspect.mockRestore();
      retry();
      expectDraft();
      expect(random.mock.calls).toHaveLength(beforeRetryDraws);
      expect(hasPendingSaves()).toBe(false);
      expect(backups()).toHaveLength(1);
      if (failure === 'draft quota') expect(backups()).toEqual(kept);
      expect(localStorage.getItem(backups()[0]) === raw).toBe(true);
    },
  );

  it('recognizes a landed draft after a failed exact acknowledgment instead of generating another class', () => {
    const random = plant();
    const get = Storage.prototype.getItem;
    const suspect = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const value = get.call(this, key);
      return key === saveKey && value && value !== raw ? 'wrong active bytes' : value;
    });
    render(<FrontOfficeBoard />);
    const landed = get.call(localStorage, saveKey);
    const beforeRetryDraws = random.mock.calls.length;
    expect(JSON.parse(landed!).phase).toBe('draft');
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    suspect.mockRestore();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    retry();
    expectDraft();
    expect(rawSave() === landed).toBe(true);
    expect(random.mock.calls).toHaveLength(beforeRetryDraws);
    expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem(backups()[0]) === raw).toBe(true);
  });

  it('does not overwrite a newer franchise written while the old recap is copied', () => {
    plant();
    const newer = JSON.stringify({ ...recap, trust: recap.trust + 1 });
    const set = Storage.prototype.setItem;
    let moved = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, value);
      if (!moved && backupOf(key)) {
        moved = true;
        set.call(this, saveKey, newer);
      }
    });
    render(<FrontOfficeBoard />);
    expect(moved).toBe(true);
    expect(rawSave() === newer).toBe(true);
    expect(localStorage.getItem(backups()[0]) === raw).toBe(true);
    expect(screen.getByText(/franchise changed in another tab/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    expect(hasPendingSaves()).toBe(false);
    expect(localStorage.getItem(peerKey)).toBe(peer);
  });
});
