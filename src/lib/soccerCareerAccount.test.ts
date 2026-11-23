import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SOCCER_CAREER_SAVE } from '@/data/continueSaves';
import { backupKeysOf } from '@/lib/brokenSaveRecovery';
import { initCareer, FALLBACK_CLUBS } from '@/lib/soccerCareerEngine';
import { fenceKeyOf } from '@/lib/saveFence';
import { parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import {
  deleteSoccerCareerAccountSave, readSoccerCareerAccountLocal, readSoccerCareerAccountSaves,
  restoreSoccerCareerAccountSave, writeSoccerCareerAccountSave,
} from './soccerCareerAccount';

const { from, getSession } = vi.hoisted(() => ({ from: vi.fn(), getSession: vi.fn() }));
vi.mock('@/integrations/supabase/loadClient', () => ({ loadSupabase: async () => ({ from, auth: { getSession } }) }));

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const revision = 'a3dd2308-aacd-4f0f-bb44-c44a7359be9b';
const next = 'b4dd2308-aacd-4f0f-bb44-c44a7359be9b';
const slot = SOCCER_CAREER_SAVE.saveKey;
const savedAt = '2026-11-23T07:35:00.000Z';

function raw(playerName = 'Device Tester'): string {
  const state = initCareer(playerName, 'England', 'CM', '2020-24',
    { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 }, 70, 2020, FALLBACK_CLUBS, null, 88);
  return serializeSoccerCareerSave(state, 1);
}

function session(id: string, anonymous = false) {
  getSession.mockResolvedValue({ data: { session: { user: { id, is_anonymous: anonymous } } }, error: null });
}

function mutation(result: { data?: { revision: string } | null; error?: object | null }) {
  const query = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(result) };
  const table = { insert: vi.fn(() => query), update: vi.fn(() => query), delete: vi.fn(() => query) };
  from.mockReturnValue(table);
  return { query, table };
}

beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); session(owner); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('Soccer Career account copy transport', () => {
  it('loads only the signed-in owner’s three slots without hiding corrupt copies', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({
      data: [{ slot: 2, revision, save_text: 'unreadable raw', saved_at: savedAt }], error: null,
    }) };
    from.mockReturnValue(query);
    expect(await readSoccerCareerAccountSaves(owner)).toEqual([{ slot: 2, revision, raw: 'unreadable raw', savedAt }]);
    expect(from).toHaveBeenCalledWith('soccer_career_account_saves');
    expect(query.eq).toHaveBeenCalledWith('user_id', owner);
    expect(query.order).toHaveBeenCalledWith('slot');
  });

  it('fails before contacting the table after sign-out, an account switch, or anonymous auth', async () => {
    for (const [id, anonymous] of [[other, false], [owner, true]] as const) {
      session(id, anonymous);
      await expect(readSoccerCareerAccountSaves(owner)).rejects.toThrow();
      expect(await writeSoccerCareerAccountSave(owner, 1, null, raw())).toBe('failed');
      expect(await deleteSoccerCareerAccountSave(owner, 1, revision)).toBe('failed');
    }
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(readSoccerCareerAccountSaves(owner)).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it('uses an insert for an empty cloud slot and reports a competing insert', async () => {
    const source = raw();
    const { table } = mutation({ data: null, error: { code: '23505' } });
    expect(await writeSoccerCareerAccountSave(owner, 2, null, source)).toBe('changed');
    expect(table.insert).toHaveBeenCalledWith({ user_id: owner, slot: 2, save_text: source });
    expect(table.update).not.toHaveBeenCalled();
  });

  it('binds updates and removal to the exact owner, slot and reviewed revision', async () => {
    const source = raw();
    const { query, table } = mutation({ data: null, error: null });
    expect(await writeSoccerCareerAccountSave(owner, 2, revision, source)).toBe('changed');
    expect(table.update).toHaveBeenCalledWith({ save_text: source });
    expect(query.eq.mock.calls).toEqual([['user_id', owner], ['slot', 2], ['revision', revision]]);
    query.eq.mockClear();
    query.maybeSingle.mockResolvedValue({ data: { revision }, error: null });
    expect(await deleteSoccerCareerAccountSave(owner, 2, revision)).toBe('removed');
    expect(query.eq.mock.calls).toEqual([['user_id', owner], ['slot', 2], ['revision', revision]]);
    query.maybeSingle.mockResolvedValue({ data: { revision: next }, error: null });
    expect(await writeSoccerCareerAccountSave(owner, 2, revision, source)).toBe('saved');
  });

  it('leaves the local career byte-identical when an upload is rejected or the connection drops', async () => {
    const source = raw();
    localStorage.setItem(slot, source);
    const { query } = mutation({ data: null, error: { message: 'refused' } });
    expect(await writeSoccerCareerAccountSave(owner, 1, revision, source)).toBe('failed');
    query.maybeSingle.mockRejectedValue(new Error('offline'));
    expect(await writeSoccerCareerAccountSave(owner, 1, revision, source)).toBe('failed');
    expect(localStorage.getItem(slot)).toBe(source);
  });

  it('rejects nonexistent slots, unsupported data and oversized UTF-8 before any request', async () => {
    const source = raw();
    expect(await writeSoccerCareerAccountSave(owner, 4, null, source)).toBe('failed');
    expect(await writeSoccerCareerAccountSave(owner, 1, null, source.replace('"saveVersion":1', '"saveVersion":7'))).toBe('failed');
    const long = JSON.stringify({ ...JSON.parse(source), note: '🌟'.repeat(500001) });
    expect(await writeSoccerCareerAccountSave(owner, 1, null, long)).toBe('failed');
    expect(from).not.toHaveBeenCalled();
  });
});

describe('Soccer Career account restore', () => {
  it('retains a checked before-image and marks the restored copy as unranked', () => {
    const local = raw('Local career'), backup = raw('Account career');
    localStorage.setItem(slot, local);
    expect(readSoccerCareerAccountLocal(slot)?.summary?.playerName).toBe('Local career');
    expect(restoreSoccerCareerAccountSave(slot, local, backup)).toBe('restored');
    expect(parseSoccerCareerSave(localStorage.getItem(slot)!)).toMatchObject({
      ...(parseSoccerCareerSave(backup) as object), restoredFromAccount: true,
    });
    expect(backupKeysOf(SOCCER_CAREER_SAVE, localStorage).map(key => localStorage.getItem(key))).toContain(local);
  });

  it('refuses a changed destination even when a newer write arrives during its copy', () => {
    const local = raw('Local career'), newer = raw('Newer career');
    localStorage.setItem(slot, local);
    const realWrite = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      realWrite.call(this, key, value);
      if (key.startsWith(slot + '.broken-')) realWrite.call(this, slot, newer);
    });
    expect(restoreSoccerCareerAccountSave(slot, local, raw())).toBe('changed');
    expect(localStorage.getItem(slot)).toBe(newer);
  });

  it('does not replace the playable save when the browser refuses the recovery copy', () => {
    const local = raw('Local career');
    localStorage.setItem(slot, local);
    const realWrite = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith(slot + '.broken-')) throw new Error('quota');
      realWrite.call(this, key, value);
    });
    expect(restoreSoccerCareerAccountSave(slot, local, raw())).toBe('failed');
    expect(localStorage.getItem(slot)).toBe(local);
    expect(localStorage.getItem(fenceKeyOf(slot))).toBeNull();
  });
});
