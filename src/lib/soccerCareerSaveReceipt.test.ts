import { describe, expect, it } from 'vitest';
import {
  readSoccerCareerSavedAt, recordSoccerCareerSavedAt, soccerCareerReceiptKey,
} from './soccerCareerSaveReceipt';

const key = 'soccerCareerSave-slot-2';
const raw = '{"playerName":"Jose"}';
const savedAt = new Date('2026-11-23T05:45:00.000Z');

function store() {
  const data = new Map([[key, raw]]);
  return {
    getItem: (name: string) => data.get(name) ?? null,
    setItem: (name: string, value: string) => { data.set(name, value); },
  };
}

describe('Soccer Career save time', () => {
  it('records a time for a verified copy and leaves other slots alone', () => {
    const storage = store();
    expect(readSoccerCareerSavedAt(storage, key, raw)).toBeNull();
    recordSoccerCareerSavedAt(storage, key, raw, savedAt);
    expect(readSoccerCareerSavedAt(storage, key, raw)).toBe(savedAt.toISOString());
    expect(readSoccerCareerSavedAt(storage, 'soccerCareerSave', raw)).toBeNull();
  });

  it('drops the old time if the slot bytes change at the same length', () => {
    const storage = store();
    recordSoccerCareerSavedAt(storage, key, raw, savedAt);
    const newer = raw.replace('Jose', 'Rosa');
    storage.setItem(key, newer);
    expect(readSoccerCareerSavedAt(storage, key, newer)).toBeNull();
    recordSoccerCareerSavedAt(storage, key, raw, new Date('2026-11-24'));
    expect(readSoccerCareerSavedAt(storage, key, raw)).toBe(savedAt.toISOString());
  });

  it('does not endanger the career when the receipt is unwritable or unreadable', () => {
    const storage = store();
    storage.setItem(soccerCareerReceiptKey(key), '{ invalid');
    const blocked = { ...storage, setItem: () => { throw new Error('quota'); } };
    expect(() => recordSoccerCareerSavedAt(blocked, key, raw, savedAt)).not.toThrow();
    expect(readSoccerCareerSavedAt(storage, key, raw)).toBeNull();
    expect(storage.getItem(key)).toBe(raw);
  });
});
