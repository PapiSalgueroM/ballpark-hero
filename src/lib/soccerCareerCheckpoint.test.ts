import { describe, expect, it } from 'vitest';
import { BROKEN_SAVE_MARK, type ListableStorage } from './brokenSaveRecovery';
import { createSaveFence, fenceKeyOf } from './saveFence';
import { advancePunditSeason, advanceYouthYear, choosePostRetirement, FALLBACK_CLUBS, initCareer } from './soccerCareerEngine';
import { decodeSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from './soccerCareerSave';
import { readSoccerCareerSavedAt } from './soccerCareerSaveReceipt';
import {
  keepSoccerCareerCheckpoint, readSoccerCareerCheckpoint, restoreSoccerCareerCheckpoint, soccerCareerCheckpointKey,
} from './soccerCareerCheckpoint';

const slot = 'soccerCareerSave-slot-2';
const other = 'soccerCareerSave';
const checkpointKey = soccerCareerCheckpointKey(slot);
const backupPrefix = `${slot}${BROKEN_SAVE_MARK}`;

function store(seed: Record<string, string>) {
  const values = new Map(Object.entries(seed));
  const faults = { beforeWrite: (_key: string) => {}, ignoreWrite: '' };
  const storage: ListableStorage = {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      faults.beforeWrite(key);
      if (key !== faults.ignoreWrite) values.set(key, value);
    },
    removeItem: key => { values.delete(key); },
  };
  const backups = () => [...values].filter(([key]) => key.startsWith(backupPrefix)).map(([, value]) => value);
  return { storage, values, faults, backups };
}

function fixture() {
  const start = initCareer('Checkpoint Tester', 'Spain', 'ST', '2020s',
    { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 },
    62, 2020, FALLBACK_CLUBS, null, 92);
  const first = advanceYouthYear(start, FALLBACK_CLUBS);
  const second = advanceYouthYear(first, FALLBACK_CLUBS);
  const write = (state: typeof start) => serializeSoccerCareerSave(state, SOCCER_CAREER_SAVE_VERSION);
  return { start, first, second, early: write(start), latest: write(first), future: write(second), write };
}

describe('Soccer Career season checkpoints', () => {
  it('keeps one exact previous save per slot after the active write is verified', () => {
    const { early, latest, future, start } = fixture();
    const { storage, values } = store({ [slot]: latest, [other]: future, [fenceKeyOf(slot)]: '8' });
    expect(keepSoccerCareerCheckpoint(storage, slot, early, latest)).toBe('written');
    expect(readSoccerCareerCheckpoint(storage, slot)).toEqual({
      raw: early, playerName: start.playerName, year: start.seasons.at(-1)!.year,
    });
    storage.setItem(slot, future);
    expect(keepSoccerCareerCheckpoint(storage, slot, latest, future)).toBe('written');
    expect(storage.getItem(checkpointKey)).toBe(latest);
    expect(storage.getItem(slot)).toBe(future);
    expect(storage.getItem(other)).toBe(future);
    expect(storage.getItem(fenceKeyOf(slot))).toBe('8');
    expect([...values.keys()]).toHaveLength(4);
  });

  it('leaves the older copy intact if the active write moved or the earlier career is unreadable', () => {
    const { early, latest, future } = fixture();
    const { storage } = store({ [slot]: future, [checkpointKey]: early });
    expect(keepSoccerCareerCheckpoint(storage, slot, early, latest)).toBe('moved');
    expect(keepSoccerCareerCheckpoint(storage, slot, '{}', future)).toBe('failed');
    expect(keepSoccerCareerCheckpoint(storage, slot, future, future)).toBe('failed');
    expect(storage.getItem(checkpointKey)).toBe(early);
    storage.setItem(checkpointKey, '{}');
    expect(readSoccerCareerCheckpoint(storage, slot)).toBeNull();
  });

  it('leaves normal saved progress and the older checkpoint intact when checkpoint storage refuses', () => {
    const { early, latest, future } = fixture();
    const { storage, faults } = store({ [slot]: future, [checkpointKey]: early });
    faults.beforeWrite = key => { if (key === checkpointKey) throw new DOMException('full', 'QuotaExceededError'); };
    expect(keepSoccerCareerCheckpoint(storage, slot, latest, future)).toBe('failed');
    expect(storage.getItem(checkpointKey)).toBe(early);
    expect(storage.getItem(slot)).toBe(future);
  });

  it('reports the latest calendar season recorded during a post-playing role', () => {
    const { start, write } = fixture();
    const began = choosePostRetirement({ ...start, retired: true }, 'pundit', FALLBACK_CLUBS);
    const played = advancePunditSeason(advancePunditSeason(began, 'praise_player'), 'praise_player');
    const raw = write(played);
    const { storage } = store({ [checkpointKey]: raw });
    expect(readSoccerCareerCheckpoint(storage, slot)).toEqual({
      raw, playerName: start.playerName, year: start.seasons.at(-1)!.year + 2,
    });
  });

  it('rejects an unregistered destination even when its values look like Soccer Career', () => {
    const key = 'nrl-manager-save-v1';
    const { early, latest } = fixture();
    const { storage, values } = store({ [key]: latest, [soccerCareerCheckpointKey(key)]: early });
    expect(readSoccerCareerCheckpoint(storage, key)).toBeNull();
    expect(keepSoccerCareerCheckpoint(storage, key, early, latest)).toBe('failed');
    expect(restoreSoccerCareerCheckpoint(storage, key, latest, early)).toBe('failed');
    expect(values.size).toBe(2);
  });

  it('retains all packed history, marks the installed save, and keeps the original checkpoint and displaced slot', () => {
    const { start, latest, future, write } = fixture();
    start.events = Array.from({ length: 2000 }, (_, index) => `Saved event ${index} keeps the full history intact.`);
    const packed = write(start);
    expect(JSON.parse(packed).seasons.format).toBe('lz-string-utf16-career');
    const { storage, backups } = store({ [slot]: latest, [other]: future, [checkpointKey]: packed });
    const oldTab = createSaveFence(storage);
    oldTab.adopt(slot);

    expect(restoreSoccerCareerCheckpoint(storage, slot, latest, packed)).toBe('restored');
    const installed = storage.getItem(slot)!;
    expect(JSON.parse(installed)).toEqual({ ...JSON.parse(packed), restoredFromCheckpoint: true });
    expect(decodeSoccerCareerSave(installed)).toEqual({
      version: SOCCER_CAREER_SAVE_VERSION, value: { ...(parseSoccerCareerSave(packed) as object), restoredFromCheckpoint: true },
    });
    expect(backups()).toEqual([latest]);
    expect(storage.getItem(checkpointKey)).toBe(packed);
    expect(storage.getItem(other)).toBe(future);
    expect(readSoccerCareerSavedAt(storage, slot, installed)).not.toBeNull();
    expect(oldTab.moved(slot)).toBe(true);
    expect(restoreSoccerCareerCheckpoint(storage, slot, installed, packed)).toBe('current');
    expect(backups()).toEqual([latest]);
  });

  it('can reopen a checkpoint in its genuinely empty slot without making a blank backup', () => {
    const { early } = fixture();
    const { storage, backups } = store({ [checkpointKey]: early });
    expect(restoreSoccerCareerCheckpoint(storage, slot, null, early)).toBe('restored');
    expect(JSON.parse(storage.getItem(slot)!)).toEqual({ ...JSON.parse(early), restoredFromCheckpoint: true });
    expect(backups()).toEqual([]);
  });

  it('recognizes the same checkpoint after the career page serializes the restored save', () => {
    const { start, early, latest, write } = fixture();
    const { storage, backups } = store({ [slot]: latest, [checkpointKey]: early });
    expect(restoreSoccerCareerCheckpoint(storage, slot, latest, early)).toBe('restored');
    const installed = storage.getItem(slot)!;
    const canonical = write(parseSoccerCareerSave(installed) as typeof start);
    expect(canonical).not.toBe(installed);
    storage.setItem(slot, canonical);
    const generation = storage.getItem(fenceKeyOf(slot));

    expect(restoreSoccerCareerCheckpoint(storage, slot, canonical, early)).toBe('current');
    expect(storage.getItem(slot)).toBe(canonical);
    expect(storage.getItem(checkpointKey)).toBe(early);
    expect(storage.getItem(fenceKeyOf(slot))).toBe(generation);
    expect(backups()).toEqual([latest]);
  });

  it.each(['{unreadable', '{"saveVersion":44}'])('preserves opaque displaced bytes during a recoverable restore: %s', current => {
    const { early } = fixture();
    const { storage, backups } = store({ [slot]: current, [checkpointKey]: early });
    expect(restoreSoccerCareerCheckpoint(storage, slot, current, early)).toBe('restored');
    expect(JSON.parse(storage.getItem(slot)!)).toEqual({ ...JSON.parse(early), restoredFromCheckpoint: true });
    expect(storage.getItem(checkpointKey)).toBe(early);
    expect(backups()).toEqual([current]);
  });

  it('refuses a restore if either expected save changed before confirmation', () => {
    const { early, latest, future } = fixture();
    const { storage, backups } = store({ [slot]: future, [checkpointKey]: latest });
    expect(restoreSoccerCareerCheckpoint(storage, slot, latest, latest)).toBe('moved');
    expect(restoreSoccerCareerCheckpoint(storage, slot, future, early)).toBe('moved');
    expect(storage.getItem(slot)).toBe(future);
    expect(storage.getItem(checkpointKey)).toBe(latest);
    expect(backups()).toEqual([]);
  });

  it('rechecks the active slot and checkpoint after claiming the strict fence', () => {
    const { early, latest, future } = fixture();
    for (const key of [slot, checkpointKey]) {
      const { storage, values, faults, backups } = store({ [slot]: latest, [checkpointKey]: early });
      faults.beforeWrite = changed => { if (changed === fenceKeyOf(slot)) values.set(key, future); };
      expect(restoreSoccerCareerCheckpoint(storage, slot, latest, early)).toBe('moved');
      expect(storage.getItem(key)).toBe(future);
      expect(storage.getItem(key === slot ? checkpointKey : slot)).toBe(key === slot ? early : latest);
      expect(backups()).toEqual([latest]);
    }
  });

  it('refuses to replace the active career when its exact backup cannot be written or vanishes', () => {
    const { early, latest } = fixture();
    for (const fault of ['quota', 'lost']) {
      const { storage, values, faults } = store({ [slot]: latest, [checkpointKey]: early });
      faults.beforeWrite = key => {
        if (fault === 'quota' && key.startsWith(backupPrefix)) throw new DOMException('full', 'QuotaExceededError');
        if (fault === 'lost' && key === fenceKeyOf(slot)) {
          for (const stored of values.keys()) if (stored.startsWith(backupPrefix)) values.delete(stored);
        }
      };
      expect(restoreSoccerCareerCheckpoint(storage, slot, latest, early)).toBe('failed');
      expect(storage.getItem(slot)).toBe(latest);
      expect(storage.getItem(checkpointKey)).toBe(early);
    }
  });

  it('requires a writable fence and checks the installed save readback', () => {
    const { early, latest } = fixture();
    const { storage, faults } = store({ [slot]: latest, [checkpointKey]: early, [fenceKeyOf(slot)]: '6' });
    faults.beforeWrite = key => { if (key === fenceKeyOf(slot)) throw new DOMException('full', 'QuotaExceededError'); };
    expect(restoreSoccerCareerCheckpoint(storage, slot, latest, early)).toBe('failed');
    faults.beforeWrite = () => {};
    faults.ignoreWrite = fenceKeyOf(slot);
    expect(restoreSoccerCareerCheckpoint(storage, slot, latest, early)).toBe('failed');
    expect(storage.getItem(slot)).toBe(latest);
    faults.ignoreWrite = slot;
    expect(restoreSoccerCareerCheckpoint(storage, slot, latest, early)).toBe('failed');
    expect(storage.getItem(slot)).toBe(latest);
    expect(storage.getItem(checkpointKey)).toBe(early);
    expect(storage.getItem(fenceKeyOf(slot))).toBe('6');
  });
});
