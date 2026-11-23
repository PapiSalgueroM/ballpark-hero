import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRebuild } from '@/hooks/useRebuild';
import { backupKeysOf, BROKEN_SAVE_MARK, routeSaveEntry } from '@/lib/brokenSaveRecovery';
import { fetchClubSquad, fetchRebuildClubs, type RebuildClub } from '@/lib/fetchRebuild';
import { applyMove, REBUILD_SAVE_KEY, toSave, type RebuildMove } from '@/lib/rebuildSave';
import { createTable, openWindow, pickClub, updateRun } from '@/lib/rebuildTable';
import { saveFence } from '@/lib/saveFence';
import { runSaveKeeper, takeCopyTrouble } from '@/lib/saveKeeper';
import type { Player } from '@/types/game';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/fetchRebuild', () => ({
  fetchRebuildClubs: vi.fn(), fetchClubSquad: vi.fn(), fetchMarketRows: async () => [], marketFromRows: () => [],
}));

const key = REBUILD_SAVE_KEY;
const entry = routeSaveEntry('/rebuild')!;
const club: RebuildClub = { club: 'Fixture Club', tier: 'mid', squadSize: 0, squadValueM: 0 };
const clubData = { squads: new Map([[club.club, []]]), markets: new Map([[club.club, []]]), preset: 'none' as const, deck: 1 as const };

function saveFixture(salt: number) {
  const chosen = pickClub(createTable(['human'], salt), club, [club]);
  const opened = openWindow(chosen, clubData, [club]);
  const move: RebuildMove = { k: 'finance', i: 0 };
  const played = updateRun(opened, run => applyMove(run, move));
  const next = toSave({ table: played, moves: [[move]] }, 'none')!;
  const old = { ...next, v: 1, seats: next.seats.map(({ deck: _deck, ...seat }) => seat) };
  return { old: JSON.stringify(old), next: JSON.stringify(next), played };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchRebuildClubs).mockResolvedValue([club]);
  vi.mocked(fetchClubSquad).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(key);
});

describe('Rebuild save migration', () => {
  it.each(['quota refusal', 'mismatched readback'])('needs a verified v1 copy after %s and retries without replay changes', async failure => {
    const { old, next, played } = saveFixture(17);
    localStorage.setItem(key, old);
    const set = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name.startsWith(key + BROKEN_SAVE_MARK)) {
        if (failure === 'quota refusal') throw new DOMException('Storage full', 'QuotaExceededError');
        return set.call(this, name, value + ' ');
      }
      set.call(this, name, value);
    });
    runSaveKeeper();
    expect(takeCopyTrouble(entry.path)).toBe(true);
    const { result } = renderHook(useRebuild);
    await waitFor(() => expect(result.current.run?.deck).toBe(1));
    expect(localStorage.getItem(key)).toBe(old);
    expect(backupKeysOf(entry, localStorage)).toEqual([]);
    const original = played.seats[0].run!;
    expect(result.current.run).toMatchObject({
      financeDeck: original.financeDeck, financeIndex: original.financeIndex, order: original.order, signed: original.signed,
    });
    expect(result.current.saveIssue).toBe('failed');

    quota.mockRestore();
    act(() => result.current.retrySave());
    expect(localStorage.getItem(key)).toBe(next);
    expect(backupKeysOf(entry, localStorage).map(name => localStorage.getItem(name))).toEqual([old]);
  });

  it.each(['future version', 'fingerprint mismatch', 'fetch failure'])('leaves the previous bytes intact after %s', async failure => {
    const { old } = saveFixture(17);
    const value = JSON.parse(old);
    if (failure === 'future version') value.v = 99;
    if (failure === 'fingerprint mismatch') value.seats[0].fp = 'old market';
    if (failure === 'fetch failure') vi.mocked(fetchClubSquad).mockRejectedValueOnce(new Error('offline'));
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    const { result } = renderHook(useRebuild);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.run).toBeNull();
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('leaves newer bytes intact when another tab saves during the club fetch', async () => {
    const { old } = saveFixture(17);
    const { next: newer } = saveFixture(18);
    let finish: (players: Player[]) => void;
    const load = new Promise<Player[]>(resolve => { finish = resolve; });
    vi.mocked(fetchClubSquad).mockReturnValueOnce(load);
    localStorage.setItem(key, old);
    const { result } = renderHook(useRebuild);
    await waitFor(() => expect(fetchClubSquad).toHaveBeenCalledWith(club.club));
    localStorage.setItem(key, newer);
    await act(async () => { finish([]); await load; });
    expect(result.current.loading).toBe(false);
    expect(localStorage.getItem(key)).toBe(newer);
  });

  it('leaves newer bytes intact when another tab saves during backup creation', async () => {
    const { old } = saveFixture(17);
    const { next: newer } = saveFixture(18);
    localStorage.setItem(key, old);
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      set.call(this, name, value);
      if (name.startsWith(key + BROKEN_SAVE_MARK)) set.call(this, key, newer);
    });
    const { result } = renderHook(useRebuild);
    await waitFor(() => expect(result.current.run?.deck).toBe(1));
    expect(localStorage.getItem(key)).toBe(newer);
    expect(backupKeysOf(entry, localStorage).map(name => localStorage.getItem(name))).toEqual([old]);
  });
});
