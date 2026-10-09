/**
 * Round 1144 review: a store that is REALLY full, the way a browser is.
 *
 * Every other check of the storage seam models full as "every write throws".
 * A real browser is kinder than that and it matters: with no room left it
 * still takes a write that needs none (the same key at the same size, which
 * is what a page does when it saves what it loaded), and with a little room
 * it takes a small write while a save still does not fit. The first cut of
 * this round took "Storage is full" back on any write the browser took, so in
 * a real Chromium the line left while saves were still being refused (seen
 * by the review on the bracket page and on a US career).
 *
 * The store here has room for a fixed number of characters, keys and values
 * together, and counts an overwrite by how much it grows. What is held:
 *   - an overwrite the full store takes does not take "full" back
 *   - asking again needs as much NEW room as the refused write needed
 *   - nothing takes it back while a game still holds a refused save
 *   - what the seam kept for the visit is written once there is room, and
 *     "full" stays while any of it still does not fit
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Seam = typeof import('@/lib/safeStorage');
const load = async (): Promise<Seam> => { vi.resetModules(); return import('@/lib/safeStorage'); };
const PROBE = '__dukb_storage_probe__';

const used = (s: Storage): number => {
  let n = 0;
  for (let i = 0; i < s.length; i += 1) { const k = s.key(i) as string; n += k.length + (s.getItem(k) ?? '').length; }
  return n;
};
/** From here on localStorage has room for `spare` more characters and no more. */
function leaveRoom(spare: number) {
  const set = Storage.prototype.setItem;
  const limit = used(window.localStorage) + spare;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(this: Storage, key: string, value: string) {
    const k = String(key);
    const v = String(value);
    const held = this.getItem(k);
    const next = used(this) - (held === null ? 0 : k.length + held.length) + k.length + v.length;
    if (this === window.localStorage && next > limit) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    set.call(this, k, v);
  });
}
/** A returning player's keys, and fillers of known sizes to free later. */
function returningPlayer() {
  window.localStorage.setItem('cookie-consent', 'essential');
  window.localStorage.setItem('wc2026-predictions', '{}');
  window.localStorage.setItem('filler-100', 'x'.repeat(90));
  window.localStorage.setItem('filler-400', 'x'.repeat(390));
  window.localStorage.setItem('filler-999', 'x'.repeat(989));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.__DUKB_RAW_STORAGE__;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('safeStorage: a store that is really full takes some writes and not others', () => {
  it('the model itself: a full store takes a same size overwrite and refuses anything that needs room', () => {
    returningPlayer();
    leaveRoom(0);
    expect(() => window.localStorage.setItem('wc2026-predictions', '{}')).not.toThrow();
    expect(() => window.localStorage.setItem('wc2026-predictions', '{"a":1}')).toThrow(/quota/i);
    expect(() => window.localStorage.setItem(PROBE, '1')).toThrow(/quota/i);
  });

  it('an overwrite the full store takes does not take full back', async () => {
    returningPlayer();
    leaveRoom(0);
    const seam = await load();
    expect(seam.probeStorageWrites()).toBe('full');
    /* what the bracket page does as it opens: it saves what it loaded */
    expect(seam.safeSetItem('wc2026-predictions', '{}')).toBe(true);
    expect(seam.getStorageTrouble()).toBe('full');
    seam.safeLocalStorage.setItem('cookie-consent', 'essential');
    expect(seam.getStorageTrouble()).toBe('full');
    expect(seam.recheckStorageWrites()).toBe('full');
    /* and a write that needs room is still refused, which is what the line says */
    expect(seam.safeSetItem('nba-rules-seen', '1')).toBe(false);
  });

  it('asking again needs as much new room as the refused write needed, not just room for a probe', async () => {
    returningPlayer();
    leaveRoom(0);
    const seam = await load();
    const save = JSON.stringify({ picks: 'y'.repeat(300) });
    expect(seam.safeSetItem('wc2026-predictions', save)).toBe(false);
    expect(seam.getStorageTrouble()).toBe('full');
    /* a little room: a probe of one character would fit, the save would not */
    window.localStorage.removeItem('filler-100');
    expect(() => window.localStorage.setItem(PROBE, '1')).not.toThrow();
    window.localStorage.removeItem(PROBE);
    expect(seam.recheckStorageWrites()).toBe('full');
    expect(seam.safeSetItem('wc2026-predictions', save)).toBe(false);
    /* enough room for it */
    window.localStorage.removeItem('filler-400');
    expect(seam.recheckStorageWrites()).toBeNull();
    expect(window.localStorage.getItem(PROBE)).toBeNull();
    expect(seam.safeSetItem('wc2026-predictions', save)).toBe(true);
  });

  it('nothing takes full back while a game still holds a save the browser refused', async () => {
    returningPlayer();
    const room = leaveRoom(0);
    const seam = await load();
    expect(seam.probeStorageWrites()).toBe('full');
    const release = seam.holdPendingSave(() => false);
    /* room for a probe, and the game's save is still waiting */
    window.localStorage.removeItem('filler-100');
    room.mockClear();
    expect(seam.recheckStorageWrites()).toBe('full');
    /* it did not even ask: nothing was written */
    expect(room).not.toHaveBeenCalled();
    release();
    expect(seam.recheckStorageWrites()).toBeNull();
  });
});

describe('safeStorage: what the seam kept while the store was full is written once there is room', () => {
  it('a choice made under the line is on the device after the line leaves', async () => {
    window.localStorage.setItem('filler-100', 'x'.repeat(90));
    leaveRoom(0);
    const seam = await load();
    seam.safeLocalStorage.setItem('cookie-consent', 'essential');
    expect(seam.getStorageTrouble()).toBe('full');
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('essential');
    expect(window.localStorage.getItem('cookie-consent')).toBeNull();
    window.localStorage.removeItem('filler-100');
    expect(seam.recheckStorageWrites()).toBeNull();
    expect(window.localStorage.getItem('cookie-consent')).toBe('essential');
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('essential');
  });

  it('full stays while any of it still does not fit, and what did fit is kept on the device', async () => {
    window.localStorage.setItem('filler-100', 'x'.repeat(90));
    window.localStorage.setItem('filler-400', 'x'.repeat(390));
    leaveRoom(0);
    const seam = await load();
    seam.safeLocalStorage.setItem('first', 'a'.repeat(75));
    seam.safeLocalStorage.setItem('second', 'b'.repeat(74));
    /* room for one of the two (each is 80 characters with its key) */
    window.localStorage.removeItem('filler-100');
    expect(seam.recheckStorageWrites()).toBe('full');
    expect(window.localStorage.getItem('first')).toBe('a'.repeat(75));
    expect(window.localStorage.getItem('second')).toBeNull();
    expect(seam.safeLocalStorage.getItem('second')).toBe('b'.repeat(74));
    window.localStorage.removeItem('filler-400');
    expect(seam.recheckStorageWrites()).toBeNull();
    expect(window.localStorage.getItem('second')).toBe('b'.repeat(74));
  });
});
