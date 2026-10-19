/* Reviewer probe (Round 1515, read lens), never committed: the kept aside cap is game wide while the offer is per
   slot. A copy kept aside in slot 1 is hidden in slot 2, and slot 2's own fresh starts and put backs can drop it.
   The test PASSES when the drop happens (it records the behaviour), and prints each step. */
import { describe, expect, it } from 'vitest';
import { CONTINUE_SAVES, type ContinueSave } from '@/data/continueSaves';
import { BROKEN_SAVE_MARK, copyAside, offeredBackup, setAsideSave, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { SLOTS_INDEX_KEY } from '@/lib/clubManagerSlots';

const CM = CONTINUE_SAVES.find(e => e.path === '/club-manager') as ContinueSave;

function memStore(): ListableStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
  };
}
const at = (s: number) => new Date(Date.UTC(2026, 9, 19, 10, 0, s));

describe('probe: the cap of three is game wide, the offer is per slot', () => {
  it('slot 2 drops slot 1 kept aside career that slot 2 never offered', () => {
    const st = memStore();
    st.map.set(CM.saveKey, '{"career":"slot one"}');
    const a = copyAside(CM, st, at(1));
    const A = a.ok ? (a.backupKey as string) : '';
    st.map.set(CM.saveKey, '{"career":"slot one, point put back"}');
    console.log(`PROBE slot 1 offer: ${offeredBackup(CM, st)}`);
    expect(offeredBackup(CM, st)).toBe(A);
    st.map.set(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 2 }));
    for (let i = 0; i < 3; i += 1) {
      st.map.set(CM.saveKey, `{"career":"slot two ${i}"}`);
      console.log(`PROBE slot 2 before fresh start ${i + 1}: offer ${offeredBackup(CM, st)}, A held ${st.map.has(A)}`);
      setAsideSave(CM, st, at(10 + i));
    }
    console.log(`PROBE after three slot 2 fresh starts: A held ${st.map.has(A)}, backups ${[...st.map.keys()].filter(k => k.includes(BROKEN_SAVE_MARK)).length}`);
    st.map.set(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 1 }));
    st.map.set(CM.saveKey, '{"career":"slot one, point put back"}');
    console.log(`PROBE back in slot 1: offer ${offeredBackup(CM, st)}`);
    expect(st.map.has(A)).toBe(false);
  });
});
