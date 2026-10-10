/**
 * Round 1219: a put back that survives, and a copy before a version step.
 *
 * src/lib/saveKeeper.ts at unit size. The browser's half (a game in memory,
 * its leaving write, a real load) is scripts/playSaveKeeper.mjs; the real
 * saves of all 21 games are scripts/simSaveKeeper.mjs. What these hold:
 *  1. Staging writes one journal record and never the game's key.
 *  2. The apply copies the old save aside, writes the key over (never empty),
 *     keeps the backup it came from, and drops nothing at the cap.
 *  3. A copy or a write the browser refuses changes nothing.
 *  4. A journal that waited, or is junk, is removed and nothing changes.
 *  5. THE CRASH LOOP: the store dies at every storage call in turn, a healthy
 *     store then boots over the same map, and the old save is never lost, the
 *     key is never empty, no copy is stacked twice, and every put back that
 *     was staged ends applied.
 *  6. The copy before a version step: once, never pruning, never on a game
 *     that ignores its version, and an ordinary boot writes nothing.
 *  7. restoreNow retries a waiting save first and only ever stages.
 *  8. Round 1219 review: a put back and its undo leave the other save on
 *     offer for ever; the outcome says when the cap dropped a save; a put
 *     back that already landed is done however late the load; the few
 *     minutes a journal is good for are written out; a save with no version
 *     number gets its copy; a copy that will not fit is remembered for the
 *     card; restoreNow refuses under blocked storage; the load is a replace.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Round 1219 review: what the seam says about the browser's storage can be
   set for one case (a browser that blocks site data). Left at null the real
   answer goes through, so every other case runs on the real seam. */
const seam = vi.hoisted(() => ({ trouble: null as null | 'blocked' | 'full' }));
vi.mock('@/lib/safeStorage', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/safeStorage')>();
  return { ...real, getStorageTrouble: () => seam.trouble ?? real.getStorageTrouble() };
});

import { CONTINUE_SAVES } from '@/data/continueSaves';
import { BROKEN_SAVE_MARK, SET_ASIDE_SEEN_KEY, backupKeysOf, offeredBackup, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { holdPendingSave } from '@/lib/safeStorage';
import {
  PENDING_RESTORE_KEY, SAVE_VERSIONS, STAGED_FOR_MS, applyPending, keepUpdateCopies, reopenGame, restoreNow, runSaveKeeper,
  stageRestore, sumOf, takeCopyTrouble, takeOutcome, versionIn,
} from '@/lib/saveKeeper';

const gym = CONTINUE_SAVES.find(e => e.path === '/fight-gym')!;
const cm = CONTINUE_SAVES.find(e => e.path === '/club-manager')!;
const bk = (saveKey: string, stamp: string) => `${saveKey}${BROKEN_SAVE_MARK}${stamp}`;
const T0 = new Date('2026-10-10T08:00:00Z');
const later = (ms: number) => new Date(T0.getTime() + ms);
const A = '{"g":{"name":"Old Gym","week":40,"version":1}}';
const B = '{"g":{"name":"New Gym","week":1,"version":1}}';

/** A Map backed storage that counts its calls, records the keys it was read at, and can die at call N. */
function store(seed: Record<string, string> = {}, m = new Map<string, string>(Object.entries(seed))) {
  const s = { calls: 0, dieAt: Infinity, sets: 0, removes: 0, read: new Set<string>(), refuse: (_k: string) => false };
  const tick = () => { s.calls += 1; if (s.calls >= s.dieAt) throw new Error('the store died'); };
  const api: ListableStorage = {
    get length() { tick(); return m.size; },
    key: (i: number) => { tick(); return [...m.keys()][i] ?? null; },
    getItem: (k: string) => { tick(); s.read.add(k); return m.has(k) ? (m.get(k) as string) : null; },
    setItem: (k: string, v: string) => { tick(); if (s.refuse(k)) throw new DOMException('full', 'QuotaExceededError'); s.sets += 1; m.set(k, v); },
    removeItem: (k: string) => { tick(); s.removes += 1; m.delete(k); },
  };
  return { m, s, api };
}
const backups = (m: Map<string, string>, saveKey: string) => [...m.keys()].filter(k => k.startsWith(`${saveKey}${BROKEN_SAVE_MARK}`));

describe('staging a put back (Round 1219)', () => {
  it('writes one journal record and never touches the game\'s key or the backup', () => {
    const { m, s, api } = store({ [gym.saveKey]: B, [bk(gym.saveKey, '2026-10-04T09-00-00')]: A });
    expect(stageRestore(gym, bk(gym.saveKey, '2026-10-04T09-00-00'), api, T0)).toEqual({ ok: true });
    expect(m.get(gym.saveKey)).toBe(B);
    expect(m.get(bk(gym.saveKey, '2026-10-04T09-00-00'))).toBe(A);
    expect(JSON.parse(m.get(PENDING_RESTORE_KEY)!)).toEqual({
      v: 1, path: '/fight-gym', backupKey: bk(gym.saveKey, '2026-10-04T09-00-00'), at: T0.getTime(), len: A.length, sum: sumOf(A),
    });
    expect(s.sets).toBe(1);
    expect(s.removes).toBe(0);
  });

  it('refuses a key that is not this game\'s backup, a backup that is gone, and a store that will not take the record', () => {
    const { m, s, api } = store({ 'cfb-dynasty-save-v1': 'someone else', [bk(gym.saveKey, '2026-10-04T09-00-00')]: A });
    const before = [...m.entries()];
    expect(stageRestore(gym, 'cfb-dynasty-save-v1', api, T0)).toEqual({ ok: false, why: 'gone' });
    expect(stageRestore(gym, bk(gym.saveKey, '2026-10-01T00-00-00'), api, T0)).toEqual({ ok: false, why: 'gone' });
    s.refuse = () => true;
    expect(stageRestore(gym, bk(gym.saveKey, '2026-10-04T09-00-00'), api, T0)).toEqual({ ok: false, why: 'no-room' });
    expect(stageRestore(gym, bk(gym.saveKey, '2026-10-04T09-00-00'), null, T0)).toEqual({ ok: false, why: 'blocked' });
    expect([...m.entries()]).toEqual(before);
  });
});

describe('the apply, before any game is in memory (Round 1219)', () => {
  const src = bk(gym.saveKey, '2026-10-04T09-00-00');
  const staged = (seed: Record<string, string>) => {
    const st = store({ ...seed, [src]: A });
    expect(stageRestore(gym, src, st.api, T0)).toEqual({ ok: true });
    st.s.sets = 0; st.s.removes = 0;
    return st;
  };

  it('does nothing and writes nothing when nothing is staged', () => {
    const { m, s, api } = store({ [gym.saveKey]: B, [src]: A });
    expect(applyPending(api, T0)).toBeNull();
    expect(applyPending(null, T0)).toBeNull();
    expect(s.sets + s.removes).toBe(0);
    expect(m.size).toBe(2);
  });

  it('keeps the save it replaces aside, keeps the backup it came from, and leaves no journal', () => {
    const { m, api } = staged({ [gym.saveKey]: B });
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: true, kept: true });
    expect(m.get(gym.saveKey)).toBe(A);
    expect(m.get(src)).toBe(A);
    const copies = backups(m, gym.saveKey).filter(k => m.get(k) === B);
    expect(copies).toHaveLength(1);
    expect(m.has(PENDING_RESTORE_KEY)).toBe(false);
    /* The card then offers the game that was replaced, as it always did after a swap. */
    expect(offeredBackup(gym, api)).toBe(copies[0]);
  });

  /* Round 1219 review, the major: put a save back, then put the other one
     back again without playing, and the first career was kept in storage with
     no screen that offered it. Round 958's swap offered the other save after
     every press, for ever. */
  it('after a put back and its undo the card still offers the other save, however often the two are swapped', () => {
    const { m, api } = staged({ [gym.saveKey]: B });
    expect(applyPending(api, later(2000))).toMatchObject({ ok: true, kept: true });
    let offered = offeredBackup(gym, api);
    for (let press = 2; press <= 6; press += 1) {
      expect(offered, `before press ${press}`).not.toBeNull();
      const asked = m.get(offered!)!;
      expect(asked, `before press ${press}`).toBe(press % 2 === 0 ? B : A);
      expect(stageRestore(gym, offered!, api, later(press * 10000))).toEqual({ ok: true });
      expect(applyPending(api, later(press * 10000 + 2000))).toEqual({ path: '/fight-gym', ok: true, kept: true });
      expect(m.get(gym.saveKey), `after press ${press}`).toBe(asked);
      /* Nothing was played between, so no second copy is stacked: one backup of each save. */
      expect(backups(m, gym.saveKey).map(k => m.get(k)).sort(), `after press ${press}`).toEqual([A, B].sort());
      offered = offeredBackup(gym, api);
    }
    expect(offered).not.toBeNull();
    /* A put back answers nothing on the player's behalf. */
    expect(m.has(SET_ASIDE_SEEN_KEY)).toBe(false);
  });

  it('with play between the presses the card offers the game just put down, and both careers stay in a key', () => {
    const { m, api } = staged({ [gym.saveKey]: B });
    expect(applyPending(api, later(2000))).toMatchObject({ ok: true, kept: true });
    m.set(gym.saveKey, 'A, played on');
    const copyOfB = offeredBackup(gym, api)!;
    expect(m.get(copyOfB)).toBe(B);
    expect(stageRestore(gym, copyOfB, api, later(60000))).toEqual({ ok: true });
    expect(applyPending(api, later(62000))).toEqual({ path: '/fight-gym', ok: true, kept: true });
    expect(m.get(gym.saveKey)).toBe(B);
    expect(m.get(offeredBackup(gym, api)!)).toBe('A, played on');
    expect(backups(m, gym.saveKey).map(k => m.get(k)).sort()).toEqual([A, B, 'A, played on'].sort());
  });

  it('with no save at the key, the backup stays and the card stops offering the game already being played', () => {
    const { m, api } = staged({});
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: true, kept: false });
    expect(m.get(gym.saveKey)).toBe(A);
    expect(backups(m, gym.saveKey)).toEqual([src]);
    expect(offeredBackup(gym, api)).toBeNull();
  });

  it('a put back at the cap drops nothing', () => {
    const { m, api } = staged({
      [gym.saveKey]: B, [bk(gym.saveKey, '2026-10-01T09-00-00')]: 'kept 1', [bk(gym.saveKey, '2026-10-02T09-00-00')]: 'kept 2',
    });
    /* toEqual: no `dropped` is reported when nothing was dropped. */
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: true, kept: true });
    expect(backups(m, gym.saveKey).map(k => m.get(k)).sort()).toEqual([A, B, 'kept 1', 'kept 2'].sort());
  });

  /* Round 1219 review: the card said "nothing was deleted" over a put back
     that dropped the oldest kept aside save. The outcome now carries the count. */
  it('says how many kept aside saves the cap dropped, on the second put back with play between', () => {
    const { m, api } = staged({
      [gym.saveKey]: B, [bk(gym.saveKey, '2026-10-01T09-00-00')]: 'kept 1', [bk(gym.saveKey, '2026-10-02T09-00-00')]: 'kept 2',
    });
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: true, kept: true });
    m.set(gym.saveKey, 'A, played on');
    const copyOfB = backups(m, gym.saveKey).find(k => m.get(k) === B)!;
    expect(stageRestore(gym, copyOfB, api, later(60000))).toEqual({ ok: true });
    expect(applyPending(api, later(62000))).toEqual({ path: '/fight-gym', ok: true, kept: true, dropped: 1 });
    expect(backups(m, gym.saveKey).map(k => m.get(k)).sort()).toEqual([A, B, 'A, played on', 'kept 2'].sort());
  });

  it('past the cap it drops the oldest, never the copy it just made and never the save now being played', () => {
    const { m, api } = staged({
      [gym.saveKey]: B, [bk(gym.saveKey, '2026-10-01T09-00-00')]: 'kept 1', [bk(gym.saveKey, '2026-10-02T09-00-00')]: 'kept 2',
      [bk(gym.saveKey, '2026-10-03T09-00-00')]: 'kept 3',
    });
    /* A clock set back: the copy's stamp is the oldest of all, and it still stays. */
    const early = new Date('2026-09-01T00:00:00Z');
    expect(stageRestore(gym, src, api, early)).toEqual({ ok: true });
    expect(applyPending(api, early)).toEqual({ path: '/fight-gym', ok: true, kept: true, dropped: 1 });
    expect(backups(m, gym.saveKey).map(k => m.get(k)).sort()).toEqual([A, B, 'kept 2', 'kept 3'].sort());
  });

  it('changes nothing when the copy aside will not fit', () => {
    const { m, s, api } = staged({ [gym.saveKey]: B });
    s.refuse = k => k.startsWith(`${gym.saveKey}${BROKEN_SAVE_MARK}`);
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: false, why: 'no-room' });
    expect([...m.entries()].sort()).toEqual([[gym.saveKey, B], [src, A]].sort());
  });

  it('changes nothing when the key will not take the save, and takes its own copy back out', () => {
    const { m, s, api } = staged({ [gym.saveKey]: B });
    s.refuse = k => k === gym.saveKey;
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: false, why: 'no-room' });
    expect([...m.entries()].sort()).toEqual([[gym.saveKey, B], [src, A]].sort());
  });

  it('never applies a journal that waited, or one stamped in the future', () => {
    for (const when of [later(STAGED_FOR_MS + 1), later(-2 * 60 * 1000)]) {
      const { m, api } = staged({ [gym.saveKey]: B });
      expect(applyPending(api, when)).toEqual({ path: '/fight-gym', ok: false, why: 'stale' });
      expect([...m.entries()].sort()).toEqual([[gym.saveKey, B], [src, A]].sort());
    }
    const { m, api } = staged({ [gym.saveKey]: B });
    expect(applyPending(api, later(STAGED_FOR_MS))).toMatchObject({ ok: true });
    expect(m.get(gym.saveKey)).toBe(A);
  });

  /* Round 1219 review: the case above builds its times from the constant, so
     a constant of five hours passed it. The numbers here are written out. */
  it('a staged put back is good for a few minutes and no longer, in minutes written out', () => {
    const soon = staged({ [gym.saveKey]: B });
    expect(applyPending(soon.api, later(60 * 1000))).toMatchObject({ ok: true });
    expect(soon.m.get(gym.saveKey)).toBe(A);
    const waited = staged({ [gym.saveKey]: B });
    expect(applyPending(waited.api, later(10 * 60 * 1000))).toEqual({ path: '/fight-gym', ok: false, why: 'stale' });
    expect(waited.m.get(gym.saveKey)).toBe(B);
    const days = staged({ [gym.saveKey]: B });
    expect(applyPending(days.api, later(3 * 24 * 60 * 60 * 1000))).toEqual({ path: '/fight-gym', ok: false, why: 'stale' });
    expect(days.m.get(gym.saveKey)).toBe(B);
  });

  /* Round 1219 review: the age used to be asked first, so a crash after the
     key was written, met by a load that came late, said the save was not put
     back while the key held it. */
  it('a put back that already landed is answered as done however late the next load comes', () => {
    const { m, api } = staged({ [gym.saveKey]: A });
    expect(applyPending(api, later(60 * 60 * 1000))).toEqual({ path: '/fight-gym', ok: true });
    expect(m.get(gym.saveKey)).toBe(A);
    expect(m.get(src)).toBe(A);
    expect(m.has(PENDING_RESTORE_KEY)).toBe(false);
  });

  it('removes a journal it cannot read and changes nothing', () => {
    for (const junk of ['not json', '[]', 'null', '{"v":2}', JSON.stringify({ v: 1, path: '/footle', backupKey: 'x', at: 1, len: 1, sum: 1 }),
      JSON.stringify({ v: 1, path: '/fight-gym', backupKey: 'cfb-dynasty-save-v1', at: T0.getTime(), len: 1, sum: 1 })]) {
      const { m, api } = store({ [gym.saveKey]: B, [src]: A, [PENDING_RESTORE_KEY]: junk, 'cfb-dynasty-save-v1': 'x' });
      expect(applyPending(api, T0)).toBeNull();
      expect([...m.entries()].sort()).toEqual([[gym.saveKey, B], [src, A], ['cfb-dynasty-save-v1', 'x']].sort());
    }
  });

  it('says the backup is gone when it is, or when it is no longer the save that was staged', () => {
    for (const change of [(m: Map<string, string>) => m.delete(src), (m: Map<string, string>) => m.set(src, 'another save')]) {
      const { m, api } = staged({ [gym.saveKey]: B });
      change(m);
      expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: false, why: 'gone' });
      expect(m.get(gym.saveKey)).toBe(B);
      expect(m.has(PENDING_RESTORE_KEY)).toBe(false);
    }
  });

  it('answers "already done" from the journal alone, even with the backup gone', () => {
    const { m, api } = staged({ [gym.saveKey]: A });
    m.delete(src);
    expect(applyPending(api, later(2000))).toEqual({ path: '/fight-gym', ok: true });
    expect([...m.entries()]).toEqual([[gym.saveKey, A]]);
  });
});

describe('the crash loop: the store dies at every storage call in turn (Round 1219)', () => {
  const src = bk(gym.saveKey, '2026-10-04T09-00-00');
  /* With a save at the key, with none, and at the cap. */
  const starts: Record<string, Record<string, string>> = {
    'a game at the key': { [gym.saveKey]: B, [src]: A },
    'no game at the key': { [src]: A },
    'at the cap': { [gym.saveKey]: B, [src]: A, [bk(gym.saveKey, '2026-10-01T09-00-00')]: 'kept 1', [bk(gym.saveKey, '2026-10-02T09-00-00')]: 'kept 2' },
  };

  for (const [name, seed] of Object.entries(starts)) {
    it(`${name}: nothing is lost at any crash point, and every staged put back ends applied`, () => {
      /* How many storage calls a whole stage and apply makes. */
      const whole = store(seed);
      expect(stageRestore(gym, src, whole.api, T0)).toEqual({ ok: true });
      expect(applyPending(whole.api, later(1000))).toMatchObject({ ok: true });
      const total = whole.s.calls;
      expect(total).toBeGreaterThan(8);

      let applied = 0;
      let untouched = 0;
      const refusedYetLanded: number[] = [];
      for (let n = 1; n <= total + 1; n += 1) {
        const dying = store(seed);
        dying.s.dieAt = n;
        const answeredOk = stageRestore(gym, src, dying.api, T0).ok;
        /* The journal is what the next load goes by, whatever the dead store let the stage answer. */
        const wasStaged = dying.m.has(PENDING_RESTORE_KEY);
        if (wasStaged && !answeredOk) refusedYetLanded.push(n);
        if (answeredOk) applyPending(dying.api, later(1000));
        /* The next load: a healthy store over the very same map. */
        const healthy = store({}, dying.m);
        const outcome = applyPending(healthy.api, later(3000));
        const m = dying.m;
        const held = m.get(gym.saveKey);
        const where = `died at call ${n} of ${total}`;
        expect(m.has(PENDING_RESTORE_KEY), where).toBe(false);
        /* SAFETY: the old save and the one asked for are each still somewhere, the key is never empty once it held a game. */
        if (seed[gym.saveKey]) {
          expect(held === A || held === B, where).toBe(true);
          expect([...m.values()].includes(B), where).toBe(true);
        }
        expect([...m.values()].includes(A), where).toBe(true);
        for (const [k, v] of Object.entries(seed)) if (k !== gym.saveKey) expect(m.get(k), where).toBe(v);
        const texts = backups(m, gym.saveKey).map(k => m.get(k));
        expect(new Set(texts).size, where).toBe(texts.length);
        /* The outcome says ok exactly when the key holds the save that was asked for. */
        if (outcome) expect(outcome.ok, where).toBe(held === A);
        /* LIVENESS: once the journal read back, the put back happens; before that, nothing at all changed. */
        if (wasStaged) { expect(held, where).toBe(A); applied += 1; }
        else { expect([...m.entries()].sort(), where).toEqual(Object.entries(seed).sort()); untouched += 1; }
      }
      expect(untouched).toBeGreaterThan(0);
      expect(applied).toBeGreaterThan(untouched);
      /* One crash point answers "nothing changed" and is applied by the next
         load anyway: the store died between the journal's write and its read
         back, so the record could not be taken back out. Nothing is lost
         there (the assertions above ran for it too). */
      expect(refusedYetLanded).toEqual([3]);
    });
  }
});

describe('the copy before a version step (Round 1219)', () => {
  const cmSave = (v: number) => JSON.stringify({ saveVersion: v, clubName: 'Brentford', season: 4 });
  const current: Record<string, string> = {
    'dukb-club-manager-save': cmSave(3), 'rebuild-table': '{"v":2}', stadiumTycoonSaveV1: '{"v":1}', wonderkidFactoryV1: '{"v":1}',
    hallOfChampionsV1: '{"v":1}', 'aussie-rules-manager-save-v2': '{"version":2}', 'dukb-idle-arena-v1': '{"v":1}',
    'fight-gym-save-v1': A, soccerCareerSave: '{"currentClub":"x"}',
  };

  it('every row of the table is a long game, and reads a whole number where it says', () => {
    for (const [path, row] of Object.entries(SAVE_VERSIONS)) {
      expect(CONTINUE_SAVES.some(e => e.path === path), path).toBe(true);
      expect(row.oldest).toBeLessThanOrEqual(row.current);
    }
    expect(versionIn(cmSave(3), ['saveVersion'])).toBe(3);
    expect(versionIn(A, ['g', 'version'])).toBe(1);
    for (const bad of ['not json', '[]', 'null', '{"saveVersion":"3"}', '{"saveVersion":3.5}', '{"g":[1]}']) expect(versionIn(bad, ['saveVersion'])).toBeNull();
  });

  it('an ordinary boot writes nothing and reads exactly the journal and the games that act on a version', () => {
    const { s, api } = store(current);
    expect(applyPending(api, T0)).toBeNull();
    expect(keepUpdateCopies(api, T0)).toBe(0);
    expect(s.sets + s.removes).toBe(0);
    const acting = CONTINUE_SAVES.filter(e => SAVE_VERSIONS[e.path] && SAVE_VERSIONS[e.path].other !== 'ignores').map(e => e.saveKey);
    expect(acting).toHaveLength(6);
    expect([...s.read].sort()).toEqual([PENDING_RESTORE_KEY, ...acting].sort());
  });

  it('copies an older save aside once, byte for byte, quietly, and a second boot writes nothing more', () => {
    const { m, s, api } = store({ ...current, [cm.saveKey]: cmSave(2) });
    expect(keepUpdateCopies(api, T0)).toBe(1);
    const kept = backups(m, cm.saveKey);
    expect(kept).toHaveLength(1);
    expect(m.get(kept[0])).toBe(cmSave(2));
    expect(m.get(cm.saveKey)).toBe(cmSave(2));
    expect(offeredBackup(cm, api)).toBeNull();
    s.sets = 0; s.removes = 0;
    expect(keepUpdateCopies(api, later(60000))).toBe(0);
    expect(s.sets + s.removes).toBe(0);
  });

  it('copies a NEWER save too (an older cached build would refuse it and start over)', () => {
    const { m, api } = store({ [cm.saveKey]: cmSave(4) });
    expect(keepUpdateCopies(api, T0)).toBe(1);
    expect(backups(m, cm.saveKey).map(k => m.get(k))).toEqual([cmSave(4)]);
  });

  it('never prunes: three backups held, an older save, and all three are still there beside the copy', () => {
    const three = { [bk(cm.saveKey, '2026-10-01T09-00-00')]: 'one', [bk(cm.saveKey, '2026-10-02T09-00-00')]: 'two', [bk(cm.saveKey, '2026-10-03T09-00-00')]: 'three' };
    const { m, s, api } = store({ ...three, [cm.saveKey]: cmSave(2) });
    expect(keepUpdateCopies(api, T0)).toBe(1);
    expect(s.removes).toBe(0);
    expect(backups(m, cm.saveKey).map(k => m.get(k)).sort()).toEqual(['one', 'two', 'three', cmSave(2)].sort());
  });

  it('leaves alone a game that ignores its version, and does not even read its save', () => {
    const { m, s, api } = store({ 'dukb-idle-arena-v1': '{"v":0}', 'fight-gym-save-v1': '{"g":{"version":0}}' });
    expect(keepUpdateCopies(api, T0)).toBe(0);
    expect(s.sets + s.removes).toBe(0);
    expect(m.size).toBe(2);
    expect(s.read.has('dukb-idle-arena-v1')).toBe(false);
    expect(s.read.has('fight-gym-save-v1')).toBe(false);
  });

  /* Round 1219 review: these got no copy, and every one of the six games
     refuses a save with no whole number there just as it refuses another
     number (three of them then write a fresh game over it with no press). */
  it('copies a save with no number, a text number, and one that does not parse, once each', () => {
    const seed = { [cm.saveKey]: '{"clubName":"x"}', stadiumTycoonSaveV1: 'not json', hallOfChampionsV1: '{"v":"1"}' };
    const { m, s, api } = store(seed);
    expect(keepUpdateCopies(api, T0)).toBe(3);
    for (const [key, text] of Object.entries(seed)) {
      expect(m.get(key), key).toBe(text);
      expect(backups(m, key).map(k => m.get(k)), key).toEqual([text]);
    }
    /* Quiet: none of them is offered back, and a second boot writes nothing. */
    expect(offeredBackup(cm, api)).toBeNull();
    s.sets = 0; s.removes = 0;
    expect(keepUpdateCopies(api, later(60000))).toBe(0);
    expect(s.sets + s.removes).toBe(0);
  });

  it('changes nothing when the copy will not fit, and remembers it for that game\'s page, once', () => {
    const { m, s, api } = store({ [cm.saveKey]: cmSave(2) });
    s.refuse = () => true;
    expect(keepUpdateCopies(api, T0)).toBe(0);
    expect([...m.entries()]).toEqual([[cm.saveKey, cmSave(2)]]);
    /* Round 1219 review: this used to fail in silence. */
    expect(takeCopyTrouble('/fight-gym')).toBe(false);
    expect(takeCopyTrouble('/club-manager/')).toBe(true);
    expect(takeCopyTrouble('/club-manager')).toBe(false);
  });

  it('a copy that fits is no trouble to report', () => {
    const { api } = store({ [cm.saveKey]: cmSave(2) });
    expect(keepUpdateCopies(api, T0)).toBe(1);
    expect(takeCopyTrouble('/club-manager')).toBe(false);
  });
});

describe('restoreNow and the boot call, in the browser\'s own storage (Round 1219)', () => {
  const src = bk(gym.saveKey, '2026-10-04T09-00-00');
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { seam.trouble = null; vi.unstubAllGlobals(); localStorage.clear(); });

  /* Round 1219 review: this refusal could be deleted with every check green.
     Under blocked storage the store dies with the page, so a put back staged
     there would reload into nothing. */
  it('refuses under blocked storage before anything is staged, and a boot there applies nothing', () => {
    localStorage.setItem(src, A);
    localStorage.setItem(gym.saveKey, B);
    seam.trouble = 'blocked';
    expect(restoreNow(gym, src)).toEqual({ ok: false, why: 'blocked' });
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).toBeNull();
    /* The same press with the seam's own answer stages, so the refusal above was the guard's. */
    seam.trouble = null;
    expect(restoreNow(gym, src)).toEqual({ ok: true });
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).not.toBeNull();
    seam.trouble = 'blocked';
    runSaveKeeper();
    expect(localStorage.getItem(gym.saveKey)).toBe(B);
    expect(takeOutcome('/fight-gym')).toBeNull();
  });

  /* Round 1219 review: replace, not assign, was held by reading alone. With
     assign the page that held the old game is one Back press away. */
  it('reopens the game with location.replace, never assign, so no way back into the old page is left', () => {
    const replace = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace, assign });
    reopenGame('/fight-gym');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/fight-gym');
    expect(assign).not.toHaveBeenCalled();
  });

  it('only ever stages: the key is untouched until the next load applies it', () => {
    localStorage.setItem(src, A);
    localStorage.setItem(gym.saveKey, B);
    expect(restoreNow(gym, src)).toEqual({ ok: true });
    expect(localStorage.getItem(gym.saveKey)).toBe(B);
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).not.toBeNull();
    expect(takeOutcome('/fight-gym')).toBeNull();
    runSaveKeeper();
    expect(localStorage.getItem(gym.saveKey)).toBe(A);
    expect(localStorage.getItem(src)).toBe(A);
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).toBeNull();
    expect(backupKeysOf(gym, localStorage).map(k => localStorage.getItem(k)).sort()).toEqual([A, B].sort());
    /* The outcome is for that game's page, once. */
    expect(takeOutcome('/cfb-dynasty')).toBeNull();
    expect(takeOutcome('/fight-gym/')).toEqual({ path: '/fight-gym', ok: true, kept: true });
    expect(takeOutcome('/fight-gym')).toBeNull();
  });

  it('retries a save the game is still holding BEFORE it stages, and stays when that save is still refused', () => {
    localStorage.setItem(src, A);
    localStorage.setItem(gym.saveKey, B);
    const order: string[] = [];
    const release = holdPendingSave(() => { order.push(localStorage.getItem(PENDING_RESTORE_KEY) === null ? 'retried first' : 'retried late'); return false; });
    expect(restoreNow(gym, src)).toEqual({ ok: false, why: 'no-room' });
    expect(localStorage.getItem(PENDING_RESTORE_KEY)).toBeNull();
    release();
    const done = holdPendingSave(() => { order.push('retried first'); localStorage.setItem(gym.saveKey, 'as last played'); return true; });
    expect(restoreNow(gym, src)).toEqual({ ok: true });
    done();
    expect(order).toEqual(['retried first', 'retried first']);
    runSaveKeeper();
    expect(backupKeysOf(gym, localStorage).map(k => localStorage.getItem(k))).toContain('as last played');
    expect(takeOutcome('/fight-gym')).toMatchObject({ ok: true });
  });

  it('an ordinary boot leaves the storage exactly as it was', () => {
    localStorage.setItem(gym.saveKey, B);
    localStorage.setItem(cm.saveKey, JSON.stringify({ saveVersion: 3, clubName: 'Brentford' }));
    const before = JSON.stringify(Object.entries({ ...localStorage }).sort());
    runSaveKeeper();
    expect(JSON.stringify(Object.entries({ ...localStorage }).sort())).toBe(before);
    expect(localStorage.getItem(SET_ASIDE_SEEN_KEY)).toBeNull();
  });
});
