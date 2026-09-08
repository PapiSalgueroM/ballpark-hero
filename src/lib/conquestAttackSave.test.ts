import { beforeEach, describe, expect, it } from 'vitest';
import { advanceAttack, createAttack, type AttackSetup } from './conquestAttack';
import {
  ATTACK_SAVE_KEY,
  commitAttackSave,
  loadAttackSave,
  type AttackLockManager,
  type AttackStorage,
} from './conquestAttackSave';

function setup(seed = 7): AttackSetup {
  return {
    dataVersion: 'fictional-v1', seed, bounds: { width: 30, height: 10 },
    teams: ['A', 'B'].map((id, i) => ({
      id,
      name: ['Amber Vale', 'Birch Town'][i],
      color: ['#ff8800', '#228844'][i],
      overall: 70,
      homeRegion: ['west', 'east'][i],
      players: [{ id: `${id}1`, name: `Fictional ${id}`, rating: 75, originTeam: id }],
    })),
    regions: ['west', 'middle', 'east'].map((id, i) => ({
      id,
      name: id,
      rings: [[[i * 10, 0], [i * 10 + 10, 0], [i * 10 + 10, 10], [i * 10, 10]]],
      anchor: [i * 10 + 5, 5],
      initialOwner: i === 0 ? 'A' : i === 2 ? 'B' : null,
    })),
  };
}

const locks: AttackLockManager = {
  request: async (_name, work) => work(),
};

beforeEach(() => localStorage.clear());

describe('Attack save slot', () => {
  it('keeps damaged records visible to recovery without deleting them', () => {
    localStorage.setItem(ATTACK_SAVE_KEY, '{broken');
    expect(loadAttackSave('fictional-v1')).toEqual({ kind: 'damaged', raw: '{broken' });
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBe('{broken');
  });

  it('resumes a valid embedded snapshot after the generated map version changes', () => {
    const stale = createAttack({ ...setup(), dataVersion: 'fictional-old' });
    const raw = JSON.stringify(stale);
    localStorage.setItem(ATTACK_SAVE_KEY, raw);
    expect(loadAttackSave('fictional-v1')).toEqual({ kind: 'saved', raw, state: stale });
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBe(raw);
  });

  it('commits an exact direct AttackState only while the expected record is current', async () => {
    const opened = createAttack(setup());
    const first = await commitAttackSave(null, opened, { storage: localStorage, locks });
    expect(first).toEqual({ status: 'saved', raw: JSON.stringify(opened) });
    expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!)).toEqual(opened);

    const pending = advanceAttack(opened);
    const newer = advanceAttack(pending);
    localStorage.setItem(ATTACK_SAVE_KEY, JSON.stringify(newer));
    const staleWrite = await commitAttackSave(first.raw, pending, { storage: localStorage, locks });
    expect(staleWrite.status).toBe('conflict');
    expect(JSON.parse(localStorage.getItem(ATTACK_SAVE_KEY)!)).toEqual(newer);
  });

  it('does not write when locking or storage is unavailable', async () => {
    const opened = createAttack(setup());
    expect((await commitAttackSave(null, opened, { storage: localStorage, locks: null })).status).toBe('unavailable');
    expect(localStorage.getItem(ATTACK_SAVE_KEY)).toBeNull();

    const blocked: AttackStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); },
    };
    expect((await commitAttackSave(null, opened, { storage: blocked, locks })).status).toBe('unavailable');
  });
});
