/**
 * Round 1323: the save fence at unit size. Two instances over one shared fake
 * store are two tabs. What these hold:
 *  1. adopt then write: the generation moves and the writer stays current.
 *  2. Another tab's write makes this one stale: moved, and its write is
 *     refused without touching the save or the fence.
 *  3. A page that never adopted claims: it always writes and never holds.
 *  4. An absent fence key is never a move, before or after a write.
 *  5. An unreadable fence value is never a move either.
 *  6. A fence write the browser refuses never stops the save.
 *  7. A save refused after the fence moved: other tabs stale, this one not.
 *  8. release: the page holds nothing and claims again.
 *  9. The clobber in full: the old tab's leave write never lands.
 */
import { describe, expect, it } from 'vitest';
import { createSaveFence, fenceKeyOf, FENCE_PREFIX, saveFence } from '@/lib/saveFence';

const KEY = 'dukb-club-manager-save';
const FENCE = fenceKeyOf(KEY);

class FakeStore {
  map = new Map<string, string>();
  refuse: (key: string) => boolean = () => false;
  getItem(k: string) { return this.map.has(k) ? (this.map.get(k) as string) : null; }
  setItem(k: string, v: string) {
    if (this.refuse(k)) throw new Error('QuotaExceededError');
    this.map.set(k, String(v));
  }
  removeItem(k: string) { this.map.delete(k); }
}

const saveTo = (store: FakeStore, value: string) => () => { store.setItem(KEY, value); return true; };

describe('saveFence', () => {
  it('names its key apart from every game save', () => {
    expect(FENCE).toBe('dukb-fence:dukb-club-manager-save');
    expect(FENCE.startsWith('dukb-club-manager')).toBe(false);
    expect(FENCE.includes('.broken-')).toBe(false);
    expect(FENCE_PREFIX).toBe('dukb-fence:');
    expect(typeof saveFence.write).toBe('function');
  });

  it('1. adopt then write moves the generation and stays current', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    a.adopt(KEY);
    expect(a.write(KEY, saveTo(s, 'w1'))).toBe('written');
    expect(s.getItem(FENCE)).toBe('1');
    expect(a.write(KEY, saveTo(s, 'w2'))).toBe('written');
    expect(s.getItem(FENCE)).toBe('2');
    expect(a.moved(KEY)).toBe(false);
    expect(s.getItem(KEY)).toBe('w2');
  });

  it('2. another tab writing makes this one stale and its write touches nothing', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    const b = createSaveFence(s);
    a.adopt(KEY);
    b.adopt(KEY);
    expect(b.write(KEY, saveTo(s, 'B'))).toBe('written');
    expect(a.moved(KEY)).toBe(true);
    expect(b.moved(KEY)).toBe(false);
    let ran = 0;
    expect(a.write(KEY, () => { ran++; return saveTo(s, 'A')(); })).toBe('moved');
    expect(ran).toBe(0);
    expect(s.getItem(KEY)).toBe('B');
    expect(s.getItem(FENCE)).toBe('1');
  });

  it('3. a page that never adopted claims: writes always, holds nothing', () => {
    const s = new FakeStore();
    const owner = createSaveFence(s);
    const claimer = createSaveFence(s);
    owner.adopt(KEY);
    expect(owner.write(KEY, saveTo(s, 'O'))).toBe('written');
    s.setItem(FENCE, '7');
    expect(claimer.moved(KEY)).toBe(false);
    expect(claimer.write(KEY, saveTo(s, 'C'))).toBe('written');
    expect(s.getItem(FENCE)).toBe('8');
    expect(claimer.moved(KEY)).toBe(false);
    s.setItem(FENCE, '20');
    expect(claimer.write(KEY, saveTo(s, 'C2'))).toBe('written');
    expect(s.getItem(KEY)).toBe('C2');
    expect(owner.moved(KEY)).toBe(true);
  });

  it('4. an absent fence key is never a move', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    a.adopt(KEY);
    expect(a.moved(KEY)).toBe(false);
    expect(a.write(KEY, saveTo(s, 'x'))).toBe('written');
    expect(a.write(KEY, saveTo(s, 'y'))).toBe('written');
    s.map.clear();
    expect(a.moved(KEY)).toBe(false);
    expect(a.write(KEY, saveTo(s, 'z'))).toBe('written');
    expect(s.getItem(FENCE)).toBe('3');
    expect(a.moved(KEY)).toBe(false);
  });

  it('5. an unreadable fence value is never a move and is written over', () => {
    for (const junk of ['', 'abc', '-4', '1.5', 'NaN', '{}']) {
      const s = new FakeStore();
      const a = createSaveFence(s);
      a.adopt(KEY);
      s.setItem(FENCE, junk);
      expect(a.moved(KEY)).toBe(false);
      expect(a.write(KEY, saveTo(s, 'ok'))).toBe('written');
      expect(s.getItem(FENCE)).toBe('1');
    }
  });

  it('6. a refused fence write never stops the save, and the page stays current', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    const b = createSaveFence(s);
    a.adopt(KEY);
    b.adopt(KEY);
    s.refuse = k => k === FENCE;
    expect(a.write(KEY, saveTo(s, 'A'))).toBe('written');
    expect(s.getItem(KEY)).toBe('A');
    expect(s.getItem(FENCE)).toBe(null);
    expect(a.moved(KEY)).toBe(false);
    expect(b.moved(KEY)).toBe(false);
    const thrower = createSaveFence(() => { throw new Error('blocked'); });
    thrower.adopt(KEY);
    expect(thrower.moved(KEY)).toBe(false);
    expect(thrower.write(KEY, () => true)).toBe('written');
  });

  it('7. a save refused after the fence moved: failed, the fence put back, nobody stale', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    const b = createSaveFence(s);
    a.adopt(KEY);
    b.adopt(KEY);
    s.setItem(KEY, 'before');
    s.refuse = k => k === KEY;
    expect(a.write(KEY, saveTo(s, 'A'))).toBe('failed');
    expect(a.write(KEY, () => { throw new Error('quota'); })).toBe('failed');
    expect(s.getItem(KEY)).toBe('before');
    expect(s.getItem(FENCE)).toBe(null);
    expect(a.moved(KEY)).toBe(false);
    expect(b.moved(KEY)).toBe(false);
    s.refuse = () => false;
    expect(a.write(KEY, saveTo(s, 'A2'))).toBe('written');
    expect(s.getItem(FENCE)).toBe('1');
    s.refuse = k => k === KEY;
    expect(a.write(KEY, saveTo(s, 'A3'))).toBe('failed');
    expect(s.getItem(FENCE)).toBe('1');
    expect(b.moved(KEY)).toBe(true);
    expect(a.moved(KEY)).toBe(false);
  });

  it('7b. a refused save whose fence cannot be put back leaves this page current', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    const b = createSaveFence(s);
    a.adopt(KEY);
    b.adopt(KEY);
    let fenceWrites = 0;
    s.refuse = k => k === KEY || (k === FENCE && ++fenceWrites > 1);
    s.setItem(FENCE, '4');
    fenceWrites = 0;
    a.release(KEY);
    a.adopt(KEY);
    b.release(KEY);
    b.adopt(KEY);
    expect(a.write(KEY, saveTo(s, 'A'))).toBe('failed');
    expect(s.getItem(FENCE)).toBe('5');
    expect(a.moved(KEY)).toBe(false);
    expect(b.moved(KEY)).toBe(true);
  });

  it('8. release: the page holds nothing and claims again', () => {
    const s = new FakeStore();
    const a = createSaveFence(s);
    const b = createSaveFence(s);
    a.adopt(KEY);
    b.adopt(KEY);
    b.write(KEY, saveTo(s, 'B'));
    expect(a.moved(KEY)).toBe(true);
    a.release(KEY);
    expect(a.moved(KEY)).toBe(false);
    expect(a.write(KEY, saveTo(s, 'A'))).toBe('written');
    expect(b.moved(KEY)).toBe(true);
  });

  it('9. the clobber: the old tab never writes its week 5 over week 9', () => {
    const s = new FakeStore();
    const tabA = createSaveFence(s);
    tabA.adopt(KEY);
    tabA.write(KEY, saveTo(s, 'week5'));
    const tabB = createSaveFence(s);
    tabB.adopt(KEY);
    tabB.write(KEY, saveTo(s, 'week5'));
    for (const w of ['week6', 'week7', 'week9']) expect(tabB.write(KEY, saveTo(s, w))).toBe('written');
    expect(tabA.moved(KEY)).toBe(true);
    expect(tabA.write(KEY, saveTo(s, 'week5'))).toBe('moved');
    expect(s.getItem(KEY)).toBe('week9');
    tabA.release(KEY);
    tabA.adopt(KEY);
    expect(tabA.moved(KEY)).toBe(false);
    expect(tabB.moved(KEY)).toBe(false);
  });
});
